import React from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { UI } from "./ui";

export type TripSection = "summary" | "stays" | "transport" | "daily" | "budget";

const TABS: Array<{ key: TripSection; label: string }> = [
  { key: "summary", label: "Resumen" },
  { key: "stays", label: "Alojamientos" },
  { key: "transport", label: "Transporte" },
  { key: "daily", label: "Planificación Diaria" },
  { key: "budget", label: "Presupuesto" },
];

export function TripDetailTabs({
  value,
  onChange,
  px,
  fs,
}: {
  value: TripSection;
  onChange: (v: TripSection) => void;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: px(22) }}>
      {TABS.map((t) => {
        const active = value === t.key;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={({ hovered, pressed }) => [
              {
                paddingVertical: px(10),
                borderBottomWidth: active ? 2 : 2,
                borderBottomColor: active ? UI.text : "transparent",
                opacity: pressed ? 0.92 : 1,
              },
              Platform.OS === "web" && hovered && !active ? { opacity: 0.9 } : null,
            ]}
          >
            <Text style={{ fontSize: fs(14), fontWeight: active ? "700" : "600", color: active ? UI.text : UI.muted }}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
