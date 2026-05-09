import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../../../components/AppHeader";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../api/api";
import { colors } from "../../../theme/theme";

export default function AccountScreen() {
  const { user, updateUser, refreshUser } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
    setAvatar(user?.avatar || "");
  }, [user?.name, user?.avatar]);

  const hasChanges = useMemo(() => {
    const currentName = (user?.name || "").trim();
    const currentAvatar = (user?.avatar || "").trim();
    return name.trim() !== currentName || avatar.trim() !== currentAvatar;
  }, [name, avatar, user?.name, user?.avatar]);

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
      <View className="px-5 pb-2">
        <AppHeader title="Cuenta" showProfile={false} showDatePicker={false} showBack={true} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <View className="items-center mb-4">
            <View className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 mb-3">
              <Image
                source={{
                  uri:
                    avatar ||
                    user?.avatar ||
                    "https://cdn-icons-png.flaticon.com/512/847/847969.png",
                }}
                className="w-full h-full"
              />
            </View>
            <Text className="text-[18px] font-bold text-text">{name.trim() || "Usuario"}</Text>
            <Text className="text-gray-500 text-[14px] mt-1">{user?.email || "-"}</Text>
          </View>

          <Field label="Nombre" value={name} onChangeText={setName} placeholder="Tu nombre" />
          <Field
            label="Avatar URL"
            value={avatar}
            onChangeText={setAvatar}
            placeholder="https://..."
            autoCapitalize="none"
          />

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
      </ScrollView>
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
