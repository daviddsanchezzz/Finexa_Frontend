import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { radii } from "../../theme/theme";
import { useFinancialHealth } from "../../hooks/useFinancialHealth";
import { GRADE_LABEL, gradeColor, healthHeadline } from "../../utils/financialHealthFormat";
import HealthScoreRing from "./HealthScoreRing";

interface Props {
  onPress: () => void;
}

// Tarjeta compacta de Inicio. Nunca estorba: si falla la carga (p. ej. el
// backend aún no tiene el endpoint) no se muestra nada.
export default function HealthScoreCard({ onPress }: Props) {
  const { colors } = useTheme();
  const q = useFinancialHealth();

  if (q.isError) return null;
  if (q.isLoading || !q.data) {
    return <View style={{ height: 78, borderRadius: radii.card, backgroundColor: colors.card, opacity: 0.6 }} />;
  }

  const r = q.data;
  const color = gradeColor(r.grade);
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Salud financiera, ver detalle"
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.surface,
        borderRadius: radii.card,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: 12,
        paddingHorizontal: 14,
      }}
    >
      <HealthScoreRing score={r.score} color={color} />
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={{ fontSize: 10.5, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.6 }}>SALUD FINANCIERA</Text>
        {r.grade && <Text style={{ fontSize: 15, fontWeight: "800", color, marginTop: 1 }}>{GRADE_LABEL[r.grade]}</Text>}
        <Text numberOfLines={2} style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 16 }}>
          {healthHeadline(r)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}
