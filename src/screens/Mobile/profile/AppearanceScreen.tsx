import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, ThemeMode } from "../../../context/ThemeContext";
import { colors } from "../../../theme/theme";
import AppHeader from "../../../components/AppHeader";

const OPTIONS: { mode: ThemeMode; label: string; description: string; icon: string }[] = [
  {
    mode: "light",
    label: "Claro",
    description: "Fondo blanco, texto oscuro",
    icon: "sunny-outline",
  },
  {
    mode: "dark",
    label: "Oscuro",
    description: "Fondo oscuro, texto claro",
    icon: "moon-outline",
  },
];

function ModePreview({ mode }: { mode: ThemeMode }) {
  const isD = mode === "dark";
  const bg = isD ? "#0F172A" : "#F9FAFB";
  const surface = isD ? "#1E293B" : "#FFFFFF";
  const text = isD ? "#F1F5F9" : "#1A1A1A";
  const textSub = isD ? "#64748B" : "#9CA3AF";
  const accent = isD ? "#4B8EF5" : "#003cc5";
  const bar = isD ? "#263348" : "#E5E7EB";

  return (
    <View
      style={{
        width: 88,
        height: 60,
        borderRadius: 12,
        backgroundColor: bg,
        overflow: "hidden",
        padding: 7,
        borderWidth: 1,
        borderColor: isD ? "#334155" : "#E5E7EB",
      }}
    >
      {/* Fake header */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 5 }}>
        <View style={{ width: 18, height: 4, borderRadius: 3, backgroundColor: accent }} />
        <View style={{ flex: 1 }} />
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: bar }} />
      </View>
      {/* Fake card */}
      <View style={{ backgroundColor: surface, borderRadius: 6, padding: 4, marginBottom: 3 }}>
        <View style={{ width: "70%", height: 3, borderRadius: 2, backgroundColor: text, opacity: 0.8, marginBottom: 3 }} />
        <View style={{ width: "45%", height: 3, borderRadius: 2, backgroundColor: textSub, opacity: 0.6 }} />
      </View>
      <View style={{ width: "55%", height: 3, borderRadius: 2, backgroundColor: bar }} />
    </View>
  );
}

export default function AppearanceScreen({ navigation }: any) {
  const { mode, setMode, isDark } = useTheme();

  const bg = isDark ? "#0F172A" : "#F9FAFB";
  const surface = isDark ? "#1E293B" : "#FFFFFF";
  const text = isDark ? "#F1F5F9" : "#1A1A1A";
  const textSub = isDark ? "#94A3B8" : "#6B7280";
  const border = isDark ? "#334155" : "#E5E7EB";
  const accent = isDark ? "#4B8EF5" : colors.primary;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={{ paddingHorizontal: 20, paddingBottom: 4 }}>
        <AppHeader
          title="Apariencia"
          showBack={true}
          showProfile={false}
          showDatePicker={false}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}
      >
        <Text style={{ fontSize: 12, color: textSub, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 }}>
          Tema de la aplicación
        </Text>

        <View style={{ gap: 10 }}>
          {OPTIONS.map((opt) => {
            const selected = mode === opt.mode;
            return (
              <TouchableOpacity
                key={opt.mode}
                onPress={() => setMode(opt.mode)}
                activeOpacity={0.8}
                style={{
                  backgroundColor: surface,
                  borderRadius: 18,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? accent : border,
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                {/* Preview miniatura */}
                <ModePreview mode={opt.mode} />

                {/* Info */}
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
                    <Ionicons
                      name={opt.icon as any}
                      size={16}
                      color={selected ? accent : textSub}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={{ fontSize: 15, fontWeight: "700", color: text }}>
                      {opt.label}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: textSub }}>{opt.description}</Text>
                </View>

                {/* Radio */}
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: selected ? 6 : 2,
                    borderColor: selected ? accent : border,
                    marginLeft: 12,
                  }}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Info footer */}
        <View
          style={{
            marginTop: 24,
            backgroundColor: isDark ? "#1E293B" : "#EFF6FF",
            borderRadius: 14,
            padding: 14,
            flexDirection: "row",
            alignItems: "flex-start",
            borderWidth: 1,
            borderColor: isDark ? "#334155" : "#BFDBFE",
          }}
        >
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={accent}
            style={{ marginRight: 8, marginTop: 1 }}
          />
          <Text style={{ fontSize: 12, color: textSub, flex: 1, lineHeight: 17 }}>
            El tema se aplica en toda la aplicación y se guarda automáticamente.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
