// src/components/KpiCard.tsx
import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Tone = "neutral" | "success" | "danger" | "info";
type Variant = "default" | "premium";

type KpiCardProps = {
  title: string;
  value: string;
  subtitle?: React.ReactNode;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
  variant?: Variant;

  // Opcionales para mantener tu sistema actual (desktop)
  px?: (n: number) => number;
  fs?: (n: number) => number;

  // Opcional: para ajustar ancho mínimo si algún layout lo pide
  minWidth?: number;
};

export function KpiCard({
  title,
  value,
  subtitle,
  icon,
  tone = "neutral",
  variant = "default",
  px,
  fs,
  minWidth,
}: KpiCardProps) {
  const _px = px ?? ((n: number) => n);
  const _fs = fs ?? ((n: number) => n);

  const palette = {
    neutral: { accent: "#0F172A", iconBg: "rgba(15,23,42,0.06)", iconFg: "#0F172A" },
    info: { accent: "#2563EB", iconBg: "rgba(37,99,235,0.10)", iconFg: "#2563EB" },
    success: { accent: "#16A34A", iconBg: "rgba(22,163,74,0.10)", iconFg: "#16A34A" },
    danger: { accent: "#DC2626", iconBg: "rgba(220,38,38,0.10)", iconFg: "#DC2626" },
  }[tone];

  const isPremium = variant === "premium";

  const premium = {
    bg: "#0B1220",
    border: "rgba(255,255,255,0.10)",
    title: "rgba(226,232,240,0.85)",
    value: "#FFFFFF",
    iconBg: "rgba(255,255,255,0.10)",
    iconFg: "rgba(255,255,255,0.92)",
  };

  return (
    <View
      style={{
        flex: 1,
        minWidth: _px(minWidth ?? 230),

        backgroundColor: isPremium ? premium.bg : "white",
        borderRadius: _px(16),
        padding: _px(16),

        borderWidth: isPremium ? 1 : 0,
        borderColor: isPremium ? premium.border : "transparent",

        shadowColor: "#0B1220",
        shadowOpacity: isPremium ? 0.22 : 0.06,
        shadowRadius: _px(isPremium ? 26 : 18),
        shadowOffset: { width: 0, height: _px(isPremium ? 14 : 10) },
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: _px(10) }}>
        <Text
          style={{
            fontSize: _fs(12),
            color: isPremium ? premium.title : "#94A3B8",
            letterSpacing: 0.6,
            fontWeight: "700",
          }}
          numberOfLines={1}
        >
          {title}
        </Text>

        <View
          style={{
            width: _px(34),
            height: _px(34),
            borderRadius: _px(12),
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isPremium ? premium.iconBg : palette.iconBg,
          }}
        >
          <Ionicons name={icon} size={_px(18)} color={isPremium ? premium.iconFg : palette.iconFg} />
        </View>
      </View>

      <Text
        style={{
          marginTop: _px(10),
          fontSize: _fs(24),
          fontWeight: "800",
          color: isPremium ? premium.value : "#0F172A",
        }}
        numberOfLines={1}
      >
        {value}
      </Text>

      {!!subtitle && (
        <View style={{ marginTop: _px(6) }}>
          {React.isValidElement(subtitle)
            ? React.cloneElement(subtitle as React.ReactElement<any>, {
                style: [(subtitle as React.ReactElement<any>).props.style, { fontWeight: "600" }],
              })
            : subtitle}
        </View>
      )}
    </View>
  );
}
