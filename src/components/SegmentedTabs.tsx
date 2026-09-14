import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { colors } from "../theme/theme";

// Selector de pestañas compartido — 3 variantes registradas:
// - "light" (por defecto): pista gris con píldora blanca en el segmento
//   activo — usado en Patrimonio neto (Composición/Evolución, Ver por
//   Cartera/Tipo).
// - "solid": pista gris muy sutil con píldora azul brand + texto blanco en
//   el activo — usado en las pestañas principales de Estadísticas (Resumen/
//   Gastos/Ingresos).
// - "underline": sin píldora ni pista — cada pestaña se marca con texto azul
//   en negrita + una línea inferior azul cuando está activa; el resto queda
//   en gris sobre una línea inferior tenue compartida. Pensado para tabs de
//   sección dentro de una pantalla de detalle (p.ej. Cartera/Distribución/
//   Rentabilidad/Operaciones).
// Todos los selectores usan por defecto la altura compacta de Patrimonio neto.
// `compact` reduce además el ancho (se ajusta al contenido en vez de ocupar
// todo el espacio disponible).
export default function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  compact = false,
  dense = true,
  variant = "light",
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  compact?: boolean;
  dense?: boolean;
  variant?: "light" | "solid" | "underline";
}) {
  if (variant === "underline") {
    return (
      <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" }}>
        {options.map((opt) => {
          const active = opt.key === value;
          return (
            <TouchableOpacity
              key={opt.key}
              onPress={() => onChange(opt.key)}
              activeOpacity={0.8}
              style={{
                flex: compact ? undefined : 1,
                paddingHorizontal: compact ? 14 : 0,
                alignItems: "center",
                paddingVertical: dense ? 8 : 10,
                borderBottomWidth: 2,
                borderBottomColor: active ? colors.primary : "transparent",
                marginBottom: -1,
              }}
            >
              <Text style={{ fontSize: dense ? 12.5 : 13.5, fontWeight: active ? "700" : "600", color: active ? colors.primary : "#94A3B8" }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  const trackBg = variant === "solid" ? "#F1F3F6" : "#E5E7EB";
  const activeBg = variant === "solid" ? colors.primary : "white";
  const activeText = variant === "solid" ? "white" : "#0F172A";
  const inactiveText = variant === "solid" ? "#5B6472" : "#6B7280";

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: trackBg,
        borderRadius: compact ? 10 : dense ? 11 : 12,
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
              paddingVertical: compact ? 5 : dense ? 7 : 9,
              borderRadius: compact ? 7 : dense ? 9 : 10,
              backgroundColor: active ? activeBg : "transparent",
              alignItems: "center",
              ...(active && variant === "light"
                ? { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }
                : {}),
            }}
          >
            <Text style={{ fontSize: compact ? 12 : dense ? 13.5 : 14, fontWeight: active ? "700" : "600", color: active ? activeText : inactiveText }}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
