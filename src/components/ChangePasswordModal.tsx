// src/components/ChangePasswordModal.tsx
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../api/api";
import { colors } from "../theme/theme";
import { FormTextField } from "./creation";

export default function ChangePasswordModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setShowErrors(false);
  };

  const close = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const newPasswordError = newPassword && newPassword.length < 6 ? "Debe tener al menos 6 caracteres." : null;
  const confirmError = confirmPassword && confirmPassword !== newPassword ? "Las contraseñas no coinciden." : null;
  const canSave = !!currentPassword && !!newPassword && !newPasswordError && confirmPassword === newPassword;

  const handleSave = async () => {
    if (!canSave) {
      setShowErrors(true);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await api.patch("/users/me/password", { currentPassword, newPassword });
      reset();
      onClose();
      Alert.alert("Contraseña actualizada", "Tu contraseña se ha cambiado correctamente.");
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg || "No se pudo cambiar la contraseña.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <Pressable onPress={close} style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" }}>
        <Pressable
            onPress={() => {}}
            style={{
              width: "100%",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              backgroundColor: "#FFFFFF",
              paddingHorizontal: 20,
              paddingTop: 10,
              paddingBottom: Math.max(insets.bottom, 20),
            }}
          >
            <View style={{ alignItems: "center", paddingBottom: 12 }}>
              <View style={{ width: 36, height: 4, borderRadius: 999, backgroundColor: "#E2E8F0" }} />
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <Text style={{ fontSize: 17, fontWeight: "700", color: "#0F172A" }}>Cambiar contraseña</Text>
              <TouchableOpacity onPress={close} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ fontSize: 15, color: "#64748B", fontWeight: "600" }}>Cancelar</Text>
              </TouchableOpacity>
            </View>

            <View style={{ gap: 14 }}>
              <FormTextField
                label="Contraseña actual"
                required
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                autoCapitalize="none"
                error={showErrors && !currentPassword ? "Introduce tu contraseña actual." : null}
                showError={showErrors}
              />
              <FormTextField
                label="Nueva contraseña"
                required
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
                error={showErrors ? (!newPassword ? "Introduce una nueva contraseña." : newPasswordError) : null}
                showError={showErrors}
              />
              <FormTextField
                label="Confirmar nueva contraseña"
                required
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                error={showErrors ? (!confirmPassword ? "Confirma la nueva contraseña." : confirmError) : null}
                showError={showErrors}
              />
            </View>

            {error ? (
              <View style={{ marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: "#FEF2F2" }}>
                <Text style={{ color: colors.error, fontSize: 13, lineHeight: 18, fontWeight: "600" }}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
              style={{
                marginTop: 18,
                height: 50,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: canSave ? colors.primary : "#E2E8F0",
              }}
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ fontSize: 15, fontWeight: "700", color: canSave ? "white" : "#94A3B8" }}>
                  Guardar contraseña
                </Text>
              )}
            </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
