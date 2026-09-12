import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { colors } from "../theme/theme";

// Selector de pestañas compartido.
// - variant "light" (por defecto): pista gris con píldora blanca en el
//   segmento activo — usado en Patrimonio neto (Composición/Evolución,
//   Ver por Cartera/Tipo).
// - variant "solid": pista gris muy sutil con píldora azul brand + texto
//   blanco en el activo — usado en las pestañas principales de Estadísticas.
// `compact` la reduce y la deja de ancho ajustado al contenido.
export default function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  compact = false,
  variant = "light",
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  compact?: boolean;
  variant?: "light" | "solid";
}) {
  const trackBg = variant === "solid" ? "#F1F3F6" : "#E5E7EB";
  const activeBg = variant === "solid" ? colors.primary : "white";
  const activeText = variant === "solid" ? "white" : "#0F172A";
  const inactiveText = variant === "solid" ? "#5B6472" : "#6B7280";

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: trackBg,
        borderRadius: compact ? 10 : 13,
        padding: 2,
        alignSelf: compact ? "flex-start" : "stretch",
      }}
    >
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.8}
            style={{
              flex: compact ? undefined : 1,
              paddingHorizontal: compact ? 12 : 0,
              paddingVertical: compact ? 5 : 10,
              borderRadius: compact ? 7 : 11,
              backgroundColor: active ? activeBg : "transparent",
              alignItems: "center",
              ...(active && variant === "light"
                ? { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }
                : {}),
            }}
          >
            <Text style={{ fontSize: compact ? 12 : 14.5, fontWeight: active ? "700" : "600", color: active ? activeText : inactiveText }}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
