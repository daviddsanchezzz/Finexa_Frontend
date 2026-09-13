import React from "react";
import { View, ViewStyle, StyleProp } from "react-native";
import { colors, radii } from "../theme/theme";

// Tarjeta contenedora estándar de toda la app: borde fino, sin sombra.
// La sombra queda reservada para overlays flotantes (tooltips, hojas
// modales), nunca para tarjetas de contenido en línea.
export default function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        { backgroundColor: "white", borderRadius: radii.card, borderWidth: 1, borderColor: colors.border, padding: 14 },
        style,
      ]}
    >
      {children}
    </View>
  );
}
