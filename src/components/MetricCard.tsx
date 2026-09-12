import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Delta de una métrica: el signo de `value`/`pct` ya debe representar si el
// cambio es FAVORABLE (positivo = verde) o no (negativo = rojo) — quien
// llama es responsable de invertir el signo cuando "menos" es lo bueno
// (p.ej. gastar menos que el mes anterior).
export function MetricDelta({ value, pct, compareLabel }: { value: number; pct: number | null; compareLabel?: string }) {
  const favorable = value >= 0;
  const color = favorable ? "#16A34A" : "#DC2626";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3, flexWrap: "wrap" }}>
      <Ionicons name={favorable ? "arrow-up" : "arrow-down"} size={11} color={color} />
      <Text style={{ fontSize: 12, fontWeight: "600", color }}>
        {pct != null ? `${Math.abs(pct).toFixed(0)}%` : `${favorable ? "+" : "−"}${Math.abs(value).toFixed(0)} €`}
      </Text>
      {compareLabel ? <Text style={{ fontSize: 12, color: "#9CA3AF" }}>{compareLabel}</Text> : null}
    </View>
  );
}

// Card neutra para un KPI (Ingresos/Gastos/Ahorro): sin fondos de color, el
// valor en tinta oscura, semántica de color reservada solo a la variación.
export function MetricCard({
  label,
  value,
  deltaValue,
  deltaPct,
  compareLabel,
}: {
  label: string;
  value: string;
  deltaValue: number;
  deltaPct: number | null;
  compareLabel?: string;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#EEF0F3", paddingVertical: 12, paddingHorizontal: 12 }}>
      <Text style={{ fontSize: 12.5, color: "#8A8F98", fontWeight: "500" }}>{label}</Text>
      <Text
        style={{ fontSize: 17, fontWeight: "700", color: "#0F172A", marginTop: 6, fontVariant: ["tabular-nums"] }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {value}
      </Text>
      <MetricDelta value={deltaValue} pct={deltaPct} compareLabel={compareLabel} />
    </View>
  );
}
