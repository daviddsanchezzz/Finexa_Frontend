import React from "react";
import { View, Text } from "react-native";
import { formatEuro as formatEuroBase } from "../utils/currency";

const formatEuro = (n: number) => `${formatEuroBase(n)} €`;

export interface ChartTooltipRow {
  label: string;
  color: string;
  value: number;
}

// Tooltip flotante compartido por GroupedBarChart y TrendChart — mismo
// aspecto en todas las gráficas de Estadísticas al tocar un punto/barra.
// No fija su propio posicionamiento: cada gráfico decide si lo coloca en
// flujo normal (reservando espacio al seleccionar) o de forma absoluta.
// Es una excepción deliberada a "sin sombras": al ser un overlay flotante
// (no una superficie estática de la pantalla) necesita despegarse del
// gráfico, como los tooltips nativos de iOS.
export default function ChartTooltip({ title, rows, style }: { title: string; rows: ChartTooltipRow[]; style?: any }) {
  return (
    <View
      style={[
        {
          backgroundColor: "white",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#EEF0F3",
          paddingVertical: 8,
          paddingHorizontal: 12,
          minWidth: 172,
          shadowColor: "#0F172A",
          shadowOpacity: 0.1,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 11.5, fontWeight: "600", color: "#8A8F98", marginBottom: 4 }} numberOfLines={1}>
        {title}
      </Text>
      {rows.map((r) => (
        <View key={r.label} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flexShrink: 1 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: r.color }} />
            <Text style={{ fontSize: 12.5, color: "#5B6472", fontWeight: "500" }} numberOfLines={1}>
              {r.label}
            </Text>
          </View>
          <Text
            style={{ fontSize: 12.5, fontWeight: "700", color: "#0F172A", fontVariant: ["tabular-nums"], flexShrink: 0 }}
            numberOfLines={1}
          >
            {formatEuro(Math.abs(r.value))}
          </Text>
        </View>
      ))}
    </View>
  );
}
