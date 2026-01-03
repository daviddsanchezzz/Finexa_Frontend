// src/components/LayoutModeToggle.tsx
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useLayoutMode } from "../hooks/useLayoutMode";

export default function LayoutModeToggle() {
  const { mode, isAuto, forceMobile, forceDesktop, setAuto } = useLayoutMode();

  const Chip = ({ active, label, onPress }: any) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? "#111827" : "#E5E7EB",
        backgroundColor: active ? "#111827" : "#FFFFFF",
        marginRight: 8,
      }}
    >
      <Text style={{ color: active ? "#FFFFFF" : "#111827", fontSize: 12, fontWeight: "700" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ padding: 12 }}>
      <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 8, fontWeight: "700" }}>
        Vista (actual: {mode})
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        <Chip active={isAuto} label="Auto" onPress={setAuto} />
        <Chip active={!isAuto && mode === "mobile"} label="Móvil" onPress={forceMobile} />
        <Chip active={!isAuto && mode === "desktop"} label="Escritorio" onPress={forceDesktop} />
      </View>

      <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 8 }}>
        Auto decide por ancho. Móvil/Escritorio se guarda como preferencia.
      </Text>
    </View>
  );
}
