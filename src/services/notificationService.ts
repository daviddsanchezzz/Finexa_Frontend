import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import api from "../api/api";

// Comportamiento cuando llega una notificación con la app en primer plano
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
// PERMISOS (solo nativo)
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
// REGISTRO NATIVO (Expo Push Token → iOS/Android)
// ────────────────────────────────────────────

export async function registerPushToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    // En web usamos el flujo Web Push
    return registerWebPush();
  }

  try {
    const granted = await requestNotificationPermission();
    if (!granted) return null;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    await api.post("/notifications/token", {
      token,
      platform: Platform.OS,
    });

    return token;
  } catch (err) {
    console.warn("No se pudo registrar el push token nativo:", err);
    return null;
  }
}

// ────────────────────────────────────────────
// REGISTRO WEB PUSH (Safari PWA / Chrome)
// ────────────────────────────────────────────

async function registerWebPush(): Promise<string | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return null;
  }

  try {
    // 1) Registrar el service worker
    const registration = await navigator.serviceWorker.register("/service-worker.js");

    // 2) Obtener la VAPID public key del backend
    const { data } = await api.get("/notifications/vapid-public-key");
    const vapidPublicKey: string = data.key;

    // 3) Suscribirse al push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    // 4) Serializar la suscripción y enviarla al backend
    const subscriptionJson = JSON.stringify(subscription);

    await api.post("/notifications/token", {
      token: subscriptionJson,
      platform: "web",
    });

    return subscriptionJson;
  } catch (err) {
    console.warn("No se pudo registrar web push:", err);
    return null;
  }
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
