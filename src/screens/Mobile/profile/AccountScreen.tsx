import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../../components/AppHeader";
import UserAvatar from "../../../components/UserAvatar";
import ChangePasswordModal from "../../../components/ChangePasswordModal";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../api/api";
import { useTheme } from "../../../context/ThemeContext";
import AppSwitch from "../../../components/AppSwitch";
import { useHomePreferences } from "../../../hooks/useHomePreferences";
import { pickAndUploadAvatar } from "../../../utils/uploadTripCover";

export default function AccountScreen() {
  const { user, updateUser, refreshUser } = useAuth();
  const { isDark, setMode, colors } = useTheme();
  const { showInvestmentReturn, setShowInvestmentReturn, isLoading: preferencesLoading, isSaving: preferencesSaving, error: preferencesError } = useHomePreferences();

  const [name, setName] = useState(user?.name || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
    setAvatar(user?.avatar || "");
  }, [user?.name, user?.avatar]);

  const hasChanges = useMemo(() => {
    const currentName = (user?.name || "").trim();
    const currentAvatar = (user?.avatar || "").trim();
    return name.trim() !== currentName || avatar.trim() !== currentAvatar;
  }, [name, avatar, user?.name, user?.avatar]);

  const handlePickAvatar = async () => {
    if (uploadingAvatar) return;
    setUploadingAvatar(true);
    try {
      const url = await pickAndUploadAvatar();
      if (url) setAvatar(url);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = () => setAvatar("");

  const handleSaveProfile = async () => {
    const nextName = name.trim();
    const nextAvatar = avatar.trim();

    if (!nextName) {
      Alert.alert("Nombre requerido", "Introduce un nombre para tu cuenta.");
      return;
    }

    setSaving(true);
    try {
      const payload = { name: nextName, avatar: nextAvatar || null };

      let persisted = false;
      for (const endpoint of ["/users/me", "/auth/me", "/auth/profile"]) {
        try {
          await api.patch(endpoint, payload);
          persisted = true;
          break;
        } catch {
          // Intentamos el siguiente endpoint
        }
      }

      updateUser({ name: nextName, avatar: nextAvatar || undefined });

      try {
        await refreshUser();
      } catch {
        // Si /auth/me falla, mantenemos al menos actualización local
      }

      if (!persisted) {
        Alert.alert(
          "Guardado local",
          "Se actualizó en la app, pero el backend no confirmó guardado permanente todavía."
        );
      } else {
        Alert.alert("Perfil actualizado", "Tus cambios se guardaron correctamente.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View className="px-5 pb-2">
        <AppHeader title="Cuenta" showProfile={false} showDatePicker={false} showBack={true} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="rounded-2xl border p-4 mb-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
          <View className="items-center mb-4">
            <View style={{ position: "relative" }}>
              <UserAvatar user={user ? { ...user, avatar } : user} size={96} fontSize={32} />
              <TouchableOpacity
                onPress={handlePickAvatar}
                disabled={uploadingAvatar}
                activeOpacity={0.85}
                style={{
                  position: "absolute",
                  bottom: -2,
                  right: -2,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: colors.surface,
                }}
              >
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="camera" size={15} color="white" />
                )}
              </TouchableOpacity>
            </View>

            {avatar ? (
              <TouchableOpacity onPress={handleRemoveAvatar} activeOpacity={0.7} style={{ marginTop: 10 }}>
                <Text style={{ color: colors.error, fontSize: 13, fontWeight: "700" }}>Quitar foto</Text>
              </TouchableOpacity>
            ) : null}

            <Text className="text-[18px] font-bold text-text mt-2">{name.trim() || "Usuario"}</Text>
            <Text className="text-gray-500 text-[14px] mt-1">{user?.email || "-"}</Text>
          </View>

          <Field label="Nombre" value={name} onChangeText={setName} placeholder="Tu nombre" />

          <TouchableOpacity
            onPress={handleSaveProfile}
            disabled={!hasChanges || saving}
            activeOpacity={0.8}
            className="mt-2 rounded-xl py-3 items-center"
            style={{ backgroundColor: !hasChanges || saving ? "#CBD5E1" : colors.primary }}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-[15px]">Guardar cambios</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textSecondary, marginBottom: 8 }}>PREFERENCIAS</Text>
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ padding: 16, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>Modo oscuro</Text>
              <Text style={{ fontSize: 12, lineHeight: 18, color: colors.textSecondary, marginTop: 4 }}>
                El tema se aplica a toda la aplicación y se guarda automáticamente.
              </Text>
            </View>
            <AppSwitch
              accessibilityLabel="Activar modo oscuro"
              value={isDark}
              onValueChange={(enabled) => setMode(enabled ? "dark" : "light")}
            />
          </View>

          <View style={{ padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>Rentabilidad de inversiones en Inicio</Text>
              <Text style={{ fontSize: 12, lineHeight: 18, color: colors.textSecondary, marginTop: 4 }}>
                Al ocultarla, Balance ocupa su lugar en Inicio, siempre en negro.
              </Text>
            </View>
            {preferencesLoading ? <ActivityIndicator color={colors.primary} /> : (
              <AppSwitch
                accessibilityLabel="Mostrar rentabilidad de inversiones en Inicio"
                value={showInvestmentReturn}
                onValueChange={setShowInvestmentReturn}
                disabled={preferencesSaving}
              />
            )}
          </View>
        </View>
        {preferencesError ? <Text accessibilityRole="alert" style={{ color: colors.error, fontSize: 12, marginTop: 12 }}>No se pudo cargar o guardar la preferencia. Vuelve a intentarlo.</Text> : null}

        <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textSecondary, marginBottom: 8, marginTop: 20 }}>SEGURIDAD</Text>
        <TouchableOpacity
          onPress={() => setPasswordModalVisible(true)}
          activeOpacity={0.75}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>Cambiar contraseña</Text>
            <Text style={{ fontSize: 12, lineHeight: 18, color: colors.textSecondary, marginTop: 4 }}>
              Actualiza la contraseña de acceso a tu cuenta.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </ScrollView>

      <ChangePasswordModal visible={passwordModalVisible} onClose={() => setPasswordModalVisible(false)} />
    </SafeAreaView>
  );
}

function Field({ label, ...props }: any) {
  return (
    <View className="mb-3">
      <Text className="text-[12px] text-gray-400 mb-1">{label}</Text>
      <TextInput
        {...props}
        className="border border-gray-200 rounded-xl px-3 py-3 text-[15px] text-text"
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
}
