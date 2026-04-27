import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { colors } from "../../../theme/theme";
import AppHeader from "../../../components/AppHeader";
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  registerPushToken,
  fetchNotificationPreferences,
  updateNotificationPreferences,
  NotificationPreferences,
} from "../../../services/notificationService";

type PermissionState = "granted" | "denied" | "undetermined";

export default function NotificationsScreen({ navigation }: any) {
  const [permissionStatus, setPermissionStatus] = useState<PermissionState>("undetermined");
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    recurringTransactions: true,
  });
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof NotificationPreferences | null>(null);

  const isWeb = Platform.OS === "web";

  const checkPermission = async () => {
    const status = await getNotificationPermissionStatus();
    setPermissionStatus(status as PermissionState);
  };

  const loadPreferences = async () => {
    try {
      setLoadingPrefs(true);
      const prefs = await fetchNotificationPreferences();
      setPreferences(prefs);
    } catch {
      // Si el backend aún no tiene el endpoint, usa los defaults
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

  const handleRequestPermission = async () => {
    setRequestingPermission(true);
    try {
      await registerPushToken();
      await checkPermission();
    } finally {
      setRequestingPermission(false);
    }
  };

  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    setSavingKey(key);
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    try {
      await updateNotificationPreferences({ [key]: value });
    } catch {
      // Revertir si falla
      setPreferences((prev) => ({ ...prev, [key]: !value }));
    } finally {
      setSavingKey(null);
    }
  };

  const permissionGranted = permissionStatus === "granted";

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
        {/* Bloque estado de permisos */}
        {!isWeb && (
          <View
            style={{
              backgroundColor: permissionGranted ? "#F0FDF4" : "#FFF7ED",
              borderRadius: 18,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 24,
              borderWidth: 1,
              borderColor: permissionGranted ? "#BBF7D0" : "#FED7AA",
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                backgroundColor: permissionGranted ? "#DCFCE7" : "#FFEDD5",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Ionicons
                name={permissionGranted ? "checkmark-circle" : "notifications-off-outline"}
                size={22}
                color={permissionGranted ? "#16A34A" : "#EA580C"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#1F2937", marginBottom: 2 }}>
                {permissionGranted ? "Notificaciones activadas" : "Notificaciones desactivadas"}
              </Text>
              <Text style={{ fontSize: 12, color: "#6B7280" }}>
                {permissionGranted
                  ? "Recibirás alertas de Spendly en tu dispositivo."
                  : "Activa los permisos para recibir alertas."}
              </Text>
            </View>
            {!permissionGranted && (
              <TouchableOpacity
                onPress={handleRequestPermission}
                activeOpacity={0.8}
                disabled={requestingPermission}
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: 10,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  marginLeft: 10,
                }}
              >
                {requestingPermission ? (
                  <ActivityIndicator size={14} color="white" />
                ) : (
                  <Text style={{ color: "white", fontWeight: "600", fontSize: 13 }}>
                    Activar
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {isWeb && (
          <View
            style={{
              backgroundColor: "#EFF6FF",
              borderRadius: 18,
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 24,
              borderWidth: 1,
              borderColor: "#BFDBFE",
            }}
          >
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} style={{ marginRight: 10 }} />
            <Text style={{ fontSize: 13, color: "#1D4ED8", flex: 1 }}>
              Las notificaciones push están disponibles en la app móvil (iOS y Android).
            </Text>
          </View>
        )}

        {/* Sección transacciones recurrentes */}
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
          <NotificationRow
            icon="repeat-outline"
            iconBg="#F3E8FF"
            iconColor="#A855F7"
            title="Transacciones recurrentes"
            description="Aviso cuando el cron ejecuta un pago o ingreso programado"
            value={preferences.recurringTransactions}
            saving={savingKey === "recurringTransactions"}
            disabled={!permissionGranted && !isWeb}
            onToggle={(v) => handleToggle("recurringTransactions", v)}
            isLast
          />
        </View>

        {/* Info */}
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
            Solo te enviaremos notificaciones relacionadas con tu actividad financiera. Puedes cambiar estas preferencias en cualquier momento.
          </Text>
        </View>

        {loadingPrefs && (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        )}
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
  disabled: boolean;
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
  disabled,
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
        opacity: disabled ? 0.45 : 1,
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
          disabled={disabled}
          trackColor={{ false: "#E5E7EB", true: colors.primary }}
          thumbColor="white"
        />
      )}
    </View>
  );
}
