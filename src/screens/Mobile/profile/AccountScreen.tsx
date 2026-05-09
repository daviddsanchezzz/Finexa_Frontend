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
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppHeader from "../../../components/AppHeader";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../api/api";
import { colors } from "../../../theme/theme";

const ACCOUNT_PREFS_KEY = "account.preferences";

type AccountPrefs = {
  compactMode: boolean;
  weeklySummary: boolean;
};

const defaultPrefs: AccountPrefs = {
  compactMode: false,
  weeklySummary: true,
};

export default function AccountScreen({ navigation }: any) {
  const { user, updateUser, refreshUser, logout } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<AccountPrefs>(defaultPrefs);
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  useEffect(() => {
    setName(user?.name || "");
    setAvatar(user?.avatar || "");
  }, [user?.name, user?.avatar]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(ACCOUNT_PREFS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setPrefs({
            compactMode: !!parsed.compactMode,
            weeklySummary: parsed.weeklySummary !== false,
          });
        }
      } finally {
        setLoadingPrefs(false);
      }
    })();
  }, []);

  const hasChanges = useMemo(() => {
    const currentName = (user?.name || "").trim();
    const currentAvatar = (user?.avatar || "").trim();
    return name.trim() !== currentName || avatar.trim() !== currentAvatar;
  }, [name, avatar, user?.name, user?.avatar]);

  const savePrefs = async (next: AccountPrefs) => {
    setPrefs(next);
    await AsyncStorage.setItem(ACCOUNT_PREFS_KEY, JSON.stringify(next));
  };

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

        <Text className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">
          Preferencias
        </Text>
        <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
          {loadingPrefs ? (
            <ActivityIndicator color={colors.primary} style={{ margin: 18 }} />
          ) : (
            <>
              <ToggleRow
                icon="apps-outline"
                title="Modo compacto"
                subtitle="Muestra listas más densas"
                value={prefs.compactMode}
                onChange={(v) => savePrefs({ ...prefs, compactMode: v })}
              />
              <ToggleRow
                icon="calendar-outline"
                title="Resumen semanal"
                subtitle="Recibir sugerencias y resumen de actividad"
                value={prefs.weeklySummary}
                onChange={(v) => savePrefs({ ...prefs, weeklySummary: v })}
                isLast
              />
            </>
          )}
        </View>

        <Text className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">
          Acciones
        </Text>
        <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <ActionRow
            icon="lock-closed-outline"
            title="Seguridad"
            subtitle="Biometría y desbloqueo"
            onPress={() => navigation.navigate("BiometricSetup")}
          />
          <ActionRow
            icon="color-palette-outline"
            title="Apariencia"
            subtitle="Tema claro u oscuro"
            onPress={() => navigation.navigate("Appearance")}
          />
          <ActionRow
            icon="log-out-outline"
            title="Cerrar sesión"
            subtitle="Salir de esta cuenta"
            destructive
            onPress={logout}
            isLast
          />
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

function ToggleRow({
  icon,
  title,
  subtitle,
  value,
  onChange,
  isLast,
}: {
  icon: any;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
  isLast?: boolean;
}) {
  return (
    <View
      className="px-4 py-3 flex-row items-center"
      style={{ borderBottomWidth: isLast ? 0 : 1, borderBottomColor: "#F3F4F6" }}
    >
      <View className="w-9 h-9 rounded-lg bg-blue-50 items-center justify-center mr-3">
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View className="flex-1 mr-3">
        <Text className="text-[14px] font-semibold text-text">{title}</Text>
        <Text className="text-[12px] text-gray-400 mt-0.5">{subtitle}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: "#E5E7EB", true: colors.primary }} thumbColor="white" />
    </View>
  );
}

function ActionRow({
  icon,
  title,
  subtitle,
  onPress,
  destructive,
  isLast,
}: {
  icon: any;
  title: string;
  subtitle: string;
  onPress: () => void;
  destructive?: boolean;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className="px-4 py-3 flex-row items-center"
      style={{ borderBottomWidth: isLast ? 0 : 1, borderBottomColor: "#F3F4F6" }}
    >
      <View className="w-9 h-9 rounded-lg bg-gray-100 items-center justify-center mr-3">
        <Ionicons name={icon} size={18} color={destructive ? "#DC2626" : "#334155"} />
      </View>
      <View className="flex-1">
        <Text className="text-[14px] font-semibold" style={{ color: destructive ? "#DC2626" : "#111827" }}>
          {title}
        </Text>
        <Text className="text-[12px] text-gray-400 mt-0.5">{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward-outline" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );
}
