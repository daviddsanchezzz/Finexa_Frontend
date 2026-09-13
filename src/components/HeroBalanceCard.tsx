import React from "react";
import { View, Text, TouchableOpacity, ViewStyle, StyleProp } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii } from "../theme/theme";

interface Props {
  label: string;
  value: string;
  align?: "center" | "left";
  gradientColors?: string[];
  backgroundColor?: string;
  onPress?: () => void;
  topRight?: React.ReactNode;
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

// Tarjeta "hero" de cifra grande — el mismo lenguaje visual que el Patrimonio
// neto de Inicio, reutilizado también en Inversiones y Viajes: etiqueta
// pequeña translúcida, cifra grande en blanco, y un `footer` libre para la
// línea de detalle (delta, badge, info secundaria...) que cada pantalla
// necesite. Acepta `gradientColors` para las pantallas que mantienen su
// propia identidad de color (p.ej. Viajes) en vez del azul de marca plano.
export default function HeroBalanceCard({
  label,
  value,
  align = "center",
  gradientColors,
  backgroundColor = colors.primary,
  onPress,
  topRight,
  footer,
  style,
}: Props) {
  const centered = align === "center";

  const content = (
    <>
      {topRight && !centered && <View style={{ alignSelf: "flex-end", marginBottom: 6 }}>{topRight}</View>}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.85)" }}>{label}</Text>
        {onPress && centered && <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.6)" style={{ marginLeft: 2 }} />}
      </View>
      <Text
        style={{
          fontSize: 27,
          fontWeight: "800",
          color: "white",
          marginTop: 3,
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
      </Text>
      {footer}
    </>
  );

  const containerStyle: ViewStyle = {
    borderRadius: radii.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: centered ? "center" : "flex-start",
  };

  if (gradientColors) {
    return (
      <TouchableOpacity activeOpacity={onPress ? 0.85 : 1} onPress={onPress} disabled={!onPress}>
        <LinearGradient colors={gradientColors as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[containerStyle, style]}>
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress}
      disabled={!onPress}
      style={[containerStyle, { backgroundColor }, style]}
    >
      {content}
    </TouchableOpacity>
  );
}
