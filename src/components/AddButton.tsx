import React from "react";
import { Text, TouchableOpacity, ViewStyle, StyleProp } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii } from "../theme/theme";

interface Props {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Botón "añadir nuevo" único de toda la app — botón azul de marca con
// icono + texto y el mismo radio de esquina que HeroBalanceCard.
// Sustituye a los ~5 patrones distintos que había (círculo bg-primary/10,
// pill gris sin color de marca, FAB en #0F172A, enlace de texto suelto...).
export default function AddButton({ label, onPress, icon = "add", disabled = false, style }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          backgroundColor: colors.primary,
          paddingVertical: 9,
          paddingHorizontal: 16,
          opacity: disabled ? 0.5 : 1,
        },
        style,
        // Es una regla visual común: ni siquiera un `style` puntual debe
        // convertir de nuevo estos botones en píldoras.
        { borderRadius: radii.card },
      ]}
    >
      <Ionicons name={icon} size={15} color="white" />
      <Text style={{ fontSize: 13, fontWeight: "800", color: "white" }}>{label}</Text>
    </TouchableOpacity>
  );
}
