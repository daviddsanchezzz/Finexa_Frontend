import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import api from "../api/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ────────────────────────────────────────────
// PERMISOS
// ────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function getNotificationPermissionStatus(): Promise<Notifications.PermissionStatus> {
  if (Platform.OS === "web") return "undetermined" as Notifications.PermissionStatus;
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

// ────────────────────────────────────────────
// REGISTRO — lanza error en vez de devolver null
// Úsalo desde la pantalla para mostrar el error al usuario
// ────────────────────────────────────────────

export async function registerPushToken(): Promise<string> {
  if (Platform.OS === "web") {
    return registerWebPush();
  }
  return registerNativeToken();
}

async function registerNativeToken(): Promise<string> {
  const granted = await requestNotificationPermission();
  if (!granted) throw new Error("Permiso de notificaciones denegado");

  // Expo SDK 50+ requiere projectId para push en producción
  const projectId: string | undefined =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any).easConfig?.projectId;

  const tokenData = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();

  const token = tokenData.data;

  await api.post("/notifications/token", {
    token,
    platform: Platform.OS,
  });

  return token;
}

async function registerWebPush(): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("No disponible fuera del navegador");
  }
  if (!("serviceWorker" in navigator)) {
    throw new Error("Este navegador no soporta Service Workers");
  }
  if (!("PushManager" in window)) {
    throw new Error(
      "Este navegador no soporta Web Push.\n" +
        "En iOS asegúrate de abrir la app desde el icono del Home Screen (no desde Safari)."
    );
  }

  const registration = await navigator.serviceWorker.register("/service-worker.js");

  // Esperar a que el SW esté activo
  await navigator.serviceWorker.ready;

  const { data } = await api.get("/notifications/vapid-public-key");
  const vapidPublicKey: string = data.key;

  if (!vapidPublicKey) {
    throw new Error("El servidor no tiene configuradas las VAPID keys");
  }

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }));

  const subscriptionJson = JSON.stringify(subscription);

  await api.post("/notifications/token", {
    token: subscriptionJson,
    platform: "web",
  });

  return subscriptionJson;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

// ────────────────────────────────────────────
// PREFERENCIAS
// ────────────────────────────────────────────

export interface NotificationPreferences {
  recurringTransactions: boolean;
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  const res = await api.get("/notifications/preferences");
  return res.data;
}

export async function updateNotificationPreferences(
  prefs: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const res = await api.put("/notifications/preferences", prefs);
  return res.data;
}
