import React from "react";
import { TouchableOpacity, ViewStyle, StyleProp } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  color?: string;
  backgroundColor?: string;
  size?: number;
  iconSize?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Botón circular de icono — el patrón de "volver"/perfil/notificaciones que
// AppHeader ya usaba inline, extraído para que las pantallas con header
// propio dejen de reimplementarlo cada una a su manera (tamaño, variante de
// icono y color distintos entre sí).
export default function IconCircleButton({
  icon,
  onPress,
  color,
  backgroundColor,
  size = 36,
  iconSize = 18,
  disabled = false,
  style,
}: Props) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.text;
  const resolvedBackgroundColor = backgroundColor ?? colors.card;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: resolvedBackgroundColor, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.5 : 1 },
        style,
      ]}
    >
      <Ionicons name={icon} size={iconSize} color={resolvedColor} />
    </TouchableOpacity>
  );
}
