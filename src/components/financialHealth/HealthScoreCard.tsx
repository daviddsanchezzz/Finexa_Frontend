import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { useFinancialHealth } from "../../hooks/useFinancialHealth";
import { GRADE_LABEL, gradeColor, healthHeadline } from "../../utils/financialHealthFormat";
import HealthScoreRing from "./HealthScoreRing";

interface Props {
  onPress: () => void;
}

// Fila fina de Inicio (secundaria a propósito: el protagonista es el patrimonio).
// El detalle y la frase útil viven en la pantalla de Salud financiera. Nunca
// estorba: si falla la carga (p. ej. el backend aún no tiene el endpoint) no se
// muestra nada.
export default function HealthScoreCard({ onPress }: Props) {
  const { colors } = useTheme();
  const q = useFinancialHealth();

  if (q.isError) return null;
  if (q.isLoading || !q.data) {
    return <View style={{ height: 40, borderRadius: 12, backgroundColor: colors.card, opacity: 0.5 }} />;
  }

  const r = q.data;
  const color = gradeColor(r.grade);
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Salud financiera, ver detalle"
      accessibilityHint={healthHeadline(r)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        borderRadius: 12,
        paddingVertical: 7,
        paddingHorizontal: 12,
      }}
    >
      <HealthScoreRing score={r.score} color={color} size={26} stroke={3.5} fontSize={10} />
      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text, marginLeft: 10 }}>Salud financiera</Text>
      {r.grade && <Text style={{ fontSize: 13, fontWeight: "700", color, marginLeft: 6 }}>· {GRADE_LABEL[r.grade]}</Text>}
      <View style={{ flex: 1 }} />
      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
    </TouchableOpacity>
  );
}
