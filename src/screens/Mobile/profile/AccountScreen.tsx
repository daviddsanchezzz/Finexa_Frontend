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
import SegmentedTabs from "../../../components/SegmentedTabs";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../api/api";
import { useTheme } from "../../../context/ThemeContext";
import AppSwitch from "../../../components/AppSwitch";
import { useHomePreferences } from "../../../hooks/useHomePreferences";
import { pickAndUploadAvatar } from "../../../utils/uploadTripCover";
import { MyDocumentsContent } from "./MyDocumentsScreen";
import { QuickAddSettingsContent } from "./QuickAddSettingsScreen";

type AccountTab = "preferences" | "documents" | "nfc";

export default function AccountScreen() {
  const { user, updateUser, refreshUser } = useAuth();
  const { isDark, setMode, colors } = useTheme();
  const { showInvestmentReturn, setShowInvestmentReturn, isLoading: preferencesLoading, isSaving: preferencesSaving, error: preferencesError } = useHomePreferences();

  const [name, setName] = useState(user?.name || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [tab, setTab] = useState<AccountTab>("preferences");

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

      <View style={{ paddingHorizontal: 20 }}>
        <View
          className="rounded-2xl border"
          style={{ backgroundColor: colors.surface, borderColor: colors.border, padding: 12 }}
        >
        <View
          className="flex-row items-center"
          style={{ gap: 12 }}
        >
          <View style={{ position: "relative" }}>
            <UserAvatar user={user ? { ...user, avatar } : user} size={56} fontSize={20} />
            <TouchableOpacity
              onPress={handlePickAvatar}
              disabled={uploadingAvatar}
              activeOpacity={0.85}
              style={{
                position: "absolute",
                bottom: -2,
                right: -2,
                width: 22,
                height: 22,
                borderRadius: 11,
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
                <Ionicons name="camera" size={11} color="white" />
              )}
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }}>
            <Text className="text-[15px] font-bold text-text" numberOfLines={1}>{name.trim() || "Usuario"}</Text>
            <Text className="text-gray-500 text-[12px] mt-0.5" numberOfLines={1}>{user?.email || "-"}</Text>
            {avatar ? (
              <TouchableOpacity onPress={handleRemoveAvatar} activeOpacity={0.7} style={{ marginTop: 4, alignSelf: "flex-start" }}>
                <Text style={{ color: colors.error, fontSize: 11, fontWeight: "700" }}>Quitar foto</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={handleSaveProfile}
            disabled={!hasChanges || saving}
            activeOpacity={0.8}
            style={{
              paddingHorizontal: 14,
              height: 34,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: !hasChanges || saving ? "#CBD5E1" : colors.primary,
            }}
          >
            {saving ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text className="text-white font-semibold text-[12.5px]">Guardar</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 10 }}>
          <Field label="Nombre" value={name} onChangeText={setName} placeholder="Tu nombre" />
        </View>

        <TouchableOpacity
          onPress={() => setPasswordModalVisible(true)}
          activeOpacity={0.7}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 10,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} />
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text }}>Cambiar contraseña</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
        </View>
      </View>

      <View style={{ marginTop: 4 }}>
        <SegmentedTabs<AccountTab>
          variant="underline"
          options={[
            { key: "preferences", label: "Preferencias" },
            { key: "documents", label: "Documentos" },
            { key: "nfc", label: "Atajo NFC" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {tab === "preferences" && (
          <View>
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
          </View>
        )}

        {tab === "documents" && <MyDocumentsContent />}

        {tab === "nfc" && <QuickAddSettingsContent />}
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
