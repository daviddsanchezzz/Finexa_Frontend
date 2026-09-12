import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Comparison } from "../utils/comparison";

// Mismos verdes/rojos desaturados usados en el resto de Estadísticas.
const GREEN = "#2F9E6E";
const RED = "#D6534A";
const NEUTRAL = "#9CA3AF";

// La flecha y el signo (dentro de `comparison`) representan la variación
// MATEMÁTICA; el color representa si ese cambio es FAVORABLE o no — son dos
// señales independientes que vienen ya resueltas por getComparison().
export function MetricDelta({ comparison, compareLabel }: { comparison: Comparison; compareLabel?: string }) {
  const { direction, isPositiveForUser, formattedPercentage } = comparison;
  const color = direction === "neutral" ? NEUTRAL : isPositiveForUser ? GREEN : RED;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 }}>
      {direction !== "neutral" && <Ionicons name={direction === "up" ? "arrow-up" : "arrow-down"} size={10.5} color={color} />}
      <Text style={{ fontSize: 11.5, fontWeight: "600", color }}>{formattedPercentage}</Text>
      {compareLabel ? (
        <Text style={{ fontSize: 11.5, color: "#9CA3AF" }} numberOfLines={1}>
          {compareLabel}
        </Text>
      ) : null}
    </View>
  );
}

interface MetricProps {
  label: string;
  value: string;
  comparison: Comparison;
  compareLabel?: string;
}

// Card neutra para un KPI aislado — se mantiene por si hace falta en algún
// otro contexto, aunque en Resumen ahora se usa MetricColumn (bloque único
// de 3 columnas en vez de 3 cards independientes).
export function MetricCard({ label, value, comparison, compareLabel }: MetricProps) {
  return (
    <View style={{ flex: 1, backgroundColor: "white", borderRadius: 14, borderWidth: 1, borderColor: "#EEF0F3", paddingVertical: 10, paddingHorizontal: 12 }}>
      <Text style={{ fontSize: 12, color: "#8A8F98", fontWeight: "500" }}>{label}</Text>
      <Text
        style={{ fontSize: 16, fontWeight: "700", color: "#0F172A", marginTop: 4, fontVariant: ["tabular-nums"] }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Text>
      <MetricDelta comparison={comparison} compareLabel={compareLabel} />
    </View>
  );
}

// Una columna dentro del bloque horizontal de 3 KPIs (Ingresos/Gastos/
// Ahorro), separadas por hairlines en vez de ser 3 cards independientes.
// `muted` (usado en Ahorro) reduce ligeramente el peso visual del valor
// para que no compita con Ingresos/Gastos.
export function MetricColumn({ label, value, comparison, compareLabel, muted, first }: MetricProps & { muted?: boolean; first?: boolean }) {
  return (
    <View style={{ flex: 1, paddingLeft: first ? 0 : 14, borderLeftWidth: first ? 0 : 1, borderLeftColor: "#EEF0F3" }}>
      <Text style={{ fontSize: 12, color: "#8A8F98", fontWeight: "500" }}>{label}</Text>
      <Text
        style={{ fontSize: muted ? 15 : 16, fontWeight: muted ? "600" : "700", color: muted ? "#334155" : "#0F172A", marginTop: 4, fontVariant: ["tabular-nums"] }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Text>
      <MetricDelta comparison={comparison} compareLabel={compareLabel} />
    </View>
  );
}
