import React from "react"; // eslint-disable-line @typescript-eslint/no-unused-vars
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
  const bg      = isD ? "#0F172A" : "#F9FAFB";
  const surface = isD ? "#1E293B" : "#FFFFFF";
  const text    = isD ? "#F1F5F9" : "#1A1A1A";
  const textSub = isD ? "#64748B"  : "#9CA3AF";
  const accent  = isD ? "#4B8EF5"  : "#003cc5";
  const bar     = isD ? "#263348"  : "#E5E7EB";

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
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 5 }}>
        <View style={{ width: 18, height: 4, borderRadius: 3, backgroundColor: accent }} />
        <View style={{ flex: 1 }} />
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: bar }} />
      </View>
      <View style={{ backgroundColor: surface, borderRadius: 6, padding: 4, marginBottom: 3 }}>
        <View style={{ width: "70%", height: 3, borderRadius: 2, backgroundColor: text, opacity: 0.8, marginBottom: 3 }} />
        <View style={{ width: "45%", height: 3, borderRadius: 2, backgroundColor: textSub, opacity: 0.6 }} />
      </View>
      <View style={{ width: "55%", height: 3, borderRadius: 2, backgroundColor: bar }} />
    </View>
  );
}

export default function AppearanceScreen({ navigation }: any) {
  const { mode, setMode, isDark, colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header inline — siempre usa colores del tema */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: 14,
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={{ marginRight: 10 }}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>
          Apariencia
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}
      >
        <Text
          style={{
            fontSize: 12,
            color: colors.textSecondary,
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: 0.6,
            marginBottom: 12,
          }}
        >
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
                  backgroundColor: colors.surface,
                  borderRadius: 18,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? colors.primary : colors.border,
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <ModePreview mode={opt.mode} />

                <View style={{ flex: 1, marginLeft: 14 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
                    <Ionicons
                      name={opt.icon as any}
                      size={16}
                      color={selected ? colors.primary : colors.textSecondary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>
                      {opt.label}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    {opt.description}
                  </Text>
                </View>

                {/* Radio */}
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: selected ? 6 : 2,
                    borderColor: selected ? colors.primary : colors.border,
                    marginLeft: 12,
                  }}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        <View
          style={{
            marginTop: 24,
            backgroundColor: isDark ? colors.surface : "#EFF6FF",
            borderRadius: 14,
            padding: 14,
            flexDirection: "row",
            alignItems: "flex-start",
            borderWidth: 1,
            borderColor: isDark ? colors.border : "#BFDBFE",
          }}
        >
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={colors.primary}
            style={{ marginRight: 8, marginTop: 1 }}
          />
          <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1, lineHeight: 17 }}>
            El tema se aplica en toda la aplicación y se guarda automáticamente.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
