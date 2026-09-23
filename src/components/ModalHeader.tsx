import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

interface Props {
  title: string;
  onClose: () => void;
  closeLabel?: string; // si se indica, muestra texto ("Cancelar") en vez del icono de volver
  rightLabel?: string;
  onRightPress?: () => void;
  rightDisabled?: boolean;
  rightLoading?: boolean;
}

// Cabecera para pantallas de formulario a pantalla completa (crear/editar
// presupuesto, deuda, operación de inversión, transacción...): título
// centrado + acción izquierda (volver/cancelar) + acción derecha (guardar).
// Distinta de AppHeader a propósito: AppHeader está pensado para pantallas
// de pestaña con selector de fecha, no para un flujo de Cancelar/Guardar.
export default function ModalHeader({ title, onClose, closeLabel, rightLabel, onRightPress, rightDisabled = false, rightLoading = false }: Props) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 }}>
      <TouchableOpacity onPress={onClose} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ minWidth: 60 }}>
        {closeLabel ? (
          <Text style={{ fontSize: 15, color: colors.textSecondary, fontWeight: "500" }}>{closeLabel}</Text>
        ) : (
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        )}
      </TouchableOpacity>

      <Text style={{ fontSize: 17, fontWeight: "600", color: colors.text, flex: 1, textAlign: "center" }} numberOfLines={1}>
        {title}
      </Text>

      <TouchableOpacity
        onPress={onRightPress}
        disabled={rightDisabled || rightLoading || !onRightPress}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{ minWidth: 60, alignItems: "flex-end" }}
      >
        {rightLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : rightLabel ? (
          <Text style={{ fontSize: 15, fontWeight: "700", color: rightDisabled ? colors.textMuted : colors.primary }}>{rightLabel}</Text>
        ) : null}
      </TouchableOpacity>
    </View>
  );
}
