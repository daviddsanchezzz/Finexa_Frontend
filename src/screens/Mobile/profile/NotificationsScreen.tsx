import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { colors } from "../../../theme/theme";
import AppHeader from "../../../components/AppHeader";
import {
  getNotificationPermissionStatus,
  checkWebPushRegistered,
  registerPushToken,
  fetchNotificationPreferences,
  updateNotificationPreferences,
  NotificationPreferences,
} from "../../../services/notificationService";

type PermissionState = "granted" | "denied" | "undetermined";

export default function NotificationsScreen(_: any) {
  const [permissionStatus, setPermissionStatus] = useState<PermissionState>("undetermined");
  const [isRegistered, setIsRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    recurringTransactions: false,
  });
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof NotificationPreferences | null>(null);

  const isWeb = Platform.OS === "web";

  const checkPermission = async () => {
    const status = await getNotificationPermissionStatus();
    setPermissionStatus(status as PermissionState);
    if (isWeb) {
      const webReg = await checkWebPushRegistered();
      setIsRegistered(webReg);
    }
  };

  const loadPreferences = async () => {
    try {
      setLoadingPrefs(true);
      const prefs = await fetchNotificationPreferences();
      setPreferences(prefs);
    } catch {
      // usa defaults si el endpoint no responde aún
    } finally {
      setLoadingPrefs(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      checkPermission();
      loadPreferences();
    }, [])
  );

  // ── Registro del dispositivo ────────────────

  const handleRegister = async () => {
    setRegistering(true);
    try {
      await registerPushToken();
      await checkPermission();
      if (isWeb) setIsRegistered(true);
      Alert.alert("✅ Dispositivo registrado", "Ahora recibirás notificaciones en este dispositivo.");
    } catch (err: any) {
      Alert.alert("Error al registrar", err?.message ?? String(err));
    } finally {
      setRegistering(false);
    }
  };

  // ── Toggle de preferencia ───────────────────

  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    if (value) {
      // Siempre intentamos registrar el token antes de activar
      // (en nativo pide permiso, en web subscribe al push)
      setRegistering(true);
      try {
        await registerPushToken();
        await checkPermission();
        if (isWeb) setIsRegistered(true);
      } catch (err: any) {
        Alert.alert("No se pudo activar", err?.message ?? String(err));
        setRegistering(false);
        return;
      }
      setRegistering(false);
    }

    setSavingKey(key);
    setPreferences((prev) => ({ ...prev, [key]: value }));
    try {
      await updateNotificationPreferences({ [key]: value });
    } catch {
      setPreferences((prev) => ({ ...prev, [key]: !value }));
    } finally {
      setSavingKey(null);
    }
  };

  const permissionGranted = permissionStatus === "granted";
  const deviceReady = permissionGranted || isRegistered;
  const showPermissionBanner = !isWeb && !permissionGranted;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pb-2">
        <AppHeader
          title="Notificaciones"
          showProfile={false}
          showDatePicker={false}
          showBack={true}
        />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner permiso nativo denegado */}
        {showPermissionBanner && permissionStatus === "denied" && (
          <View
            style={{
              backgroundColor: "#FFF7ED",
              borderRadius: 18,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20,
              borderWidth: 1,
              borderColor: "#FED7AA",
            }}
          >
            <Ionicons name="warning-outline" size={20} color="#EA580C" style={{ marginRight: 10 }} />
            <Text style={{ fontSize: 13, color: "#9A3412", flex: 1, lineHeight: 18 }}>
              Las notificaciones están bloqueadas en los ajustes del sistema. Ve a{" "}
              <Text style={{ fontWeight: "700" }}>Ajustes → Finexa → Notificaciones</Text> y actívalas.
            </Text>
          </View>
        )}

        {/* Banner PWA / info web */}
        {isWeb && (
          <View
            style={{
              backgroundColor: "#EFF6FF",
              borderRadius: 18,
              padding: 14,
              flexDirection: "row",
              alignItems: "flex-start",
              marginBottom: 20,
              borderWidth: 1,
              borderColor: "#BFDBFE",
            }}
          >
            <Ionicons
              name="phone-portrait-outline"
              size={20}
              color={colors.primary}
              style={{ marginRight: 10, marginTop: 1 }}
            />
            <Text style={{ fontSize: 13, color: "#1D4ED8", flex: 1, lineHeight: 18 }}>
              En iOS debes abrir la app desde el icono del{" "}
              <Text style={{ fontWeight: "700" }}>Home Screen</Text> (no desde Safari) para recibir push.
              En Chrome/Android funciona directamente.
            </Text>
          </View>
        )}

        {/* Botón registrar dispositivo */}
        <TouchableOpacity
          onPress={handleRegister}
          activeOpacity={0.8}
          disabled={registering}
          style={{
            backgroundColor: deviceReady ? "#F0FDF4" : colors.primary,
            borderRadius: 16,
            paddingVertical: 14,
            paddingHorizontal: 18,
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 24,
            borderWidth: 1,
            borderColor: deviceReady ? "#BBF7D0" : colors.primary,
          }}
        >
          {registering ? (
            <ActivityIndicator
              size={18}
              color={deviceReady ? "#16A34A" : "white"}
              style={{ marginRight: 10 }}
            />
          ) : (
            <Ionicons
              name={permissionGranted ? "checkmark-circle" : "notifications-outline"}
              size={20}
              color={deviceReady ? "#16A34A" : "white"}
              style={{ marginRight: 10 }}
            />
          )}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: deviceReady ? "#15803D" : "white",
              }}
            >
              {permissionGranted
                ? "Dispositivo registrado"
                : registering
                ? "Registrando…"
                : "Registrar este dispositivo"}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: deviceReady ? "#16A34A" : "rgba(255,255,255,0.8)",
                marginTop: 2,
              }}
            >
              {permissionGranted
                ? "Las notificaciones están activas"
                : "Toca aquí para activar las notificaciones"}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Sección preferencias */}
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: "#9CA3AF",
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginBottom: 10,
          }}
        >
          Alertas de actividad
        </Text>

        <View
          style={{
            backgroundColor: "white",
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#F3F4F6",
            overflow: "hidden",
            marginBottom: 24,
          }}
        >
          {loadingPrefs ? (
            <ActivityIndicator color={colors.primary} style={{ margin: 20 }} />
          ) : (
            <NotificationRow
              icon="repeat-outline"
              iconBg="#F3E8FF"
              iconColor="#A855F7"
              title="Transacciones recurrentes"
              description="Aviso cuando el cron ejecuta un pago o ingreso programado"
              value={preferences.recurringTransactions}
              saving={savingKey === "recurringTransactions"}
              onToggle={(v) => handleToggle("recurringTransactions", v)}
              isLast
            />
          )}
        </View>

        <View
          style={{
            backgroundColor: "#F9FAFB",
            borderRadius: 14,
            padding: 14,
            flexDirection: "row",
            alignItems: "flex-start",
          }}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={18}
            color="#9CA3AF"
            style={{ marginRight: 10, marginTop: 1 }}
          />
          <Text style={{ fontSize: 12, color: "#6B7280", flex: 1, lineHeight: 18 }}>
            Solo te enviaremos notificaciones relacionadas con tu actividad financiera. Puedes
            cambiar estas preferencias en cualquier momento.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface NotificationRowProps {
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  value: boolean;
  saving: boolean;
  onToggle: (value: boolean) => void;
  isLast?: boolean;
}

function NotificationRow({
  icon,
  iconBg,
  iconColor,
  title,
  description,
  value,
  saving,
  onToggle,
  isLast,
}: NotificationRowProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: "#F3F4F6",
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          backgroundColor: iconBg,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Ionicons name={icon as any} size={19} color={iconColor} />
      </View>

      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#1F2937" }}>{title}</Text>
        <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2, lineHeight: 16 }}>
          {description}
        </Text>
      </View>

      {saving ? (
        <ActivityIndicator size={20} color={colors.primary} />
      ) : (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: "#E5E7EB", true: colors.primary }}
          thumbColor="white"
        />
      )}
    </View>
  );
}
