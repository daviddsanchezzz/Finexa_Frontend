import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// La flecha representa la variación MATEMÁTICA (sube/baja el valor real);
// el color representa si ese cambio es FAVORABLE o no. Son dos señales
// independientes: gastar más sube (flecha arriba) pero es desfavorable
// (rojo); gastar menos baja (flecha abajo) y es favorable (verde).
export function MetricDelta({ changeValue, changePct, favorable, compareLabel }: { changeValue: number; changePct: number | null; favorable: boolean; compareLabel?: string }) {
  const up = changeValue >= 0;
  const color = favorable ? "#16A34A" : "#DC2626";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 }}>
      <Ionicons name={up ? "arrow-up" : "arrow-down"} size={10.5} color={color} />
      <Text style={{ fontSize: 11.5, fontWeight: "600", color }}>
        {changePct != null ? `${Math.abs(changePct).toFixed(0)}%` : `${up ? "+" : "−"}${Math.abs(changeValue).toFixed(0)} €`}
      </Text>
      {compareLabel ? (
        <Text style={{ fontSize: 11.5, color: "#9CA3AF" }} numberOfLines={1}>
          {compareLabel}
        </Text>
      ) : null}
    </View>
  );
}

// Card neutra para un KPI (Ingresos/Gastos/Ahorro): sin fondos de color, el
// valor en tinta oscura, semántica de color reservada solo a la variación.
export function MetricCard({
  label,
  value,
  changeValue,
  changePct,
  favorable,
  compareLabel,
}: {
  label: string;
  value: string;
  changeValue: number;
  changePct: number | null;
  favorable: boolean;
  compareLabel?: string;
}) {
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
      <MetricDelta changeValue={changeValue} changePct={changePct} favorable={favorable} compareLabel={compareLabel} />
    </View>
  );
}
