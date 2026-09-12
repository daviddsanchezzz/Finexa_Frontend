import React from "react";
import { View, Text, Dimensions } from "react-native";
import { formatEuroInt } from "../utils/currency";

export interface BarSeries {
  label: string;
  color: string;
  values: number[];
}

interface Props {
  series: BarSeries[]; // 1 a 3 series, mismo nº de valores que xLabels
  xLabels: string[];
  height?: number;
  // Modo "evolución de una sola serie": la última barra se resalta con
  // highlightColor y muestra su valor en una etiqueta flotante encima.
  highlightLast?: boolean;
  highlightColor?: string;
}

// Gráfica de barras agrupadas (1-3 series por mes/periodo), en el mismo
// estilo visual (Views, no SVG) que PeriodChart, para que ambas se vean
// coherentes dentro de la app.
export default function GroupedBarChart({
  series,
  xLabels,
  height = 130,
  highlightLast = false,
  highlightColor = "#DC2626",
}: Props) {
  const screenWidth = Dimensions.get("window").width - 72;
  const seriesCount = series.length;

  const allValues = series.flatMap((s) => s.values.map((v) => Math.abs(v)));
  const rawMax = Math.max(...allValues, 1);
  const niceMax = Math.ceil(rawMax / 25) * 25 || 1;

  const barWidth = seriesCount >= 3 ? 6 : seriesCount === 2 ? 10 : xLabels.length > 8 ? 14 : 22;
  const groupGap = seriesCount > 1 ? 2 : 0;

  return (
    <View style={{ width: "100%" }}>
      {seriesCount > 1 && (
        <View style={{ flexDirection: "row", gap: 14, marginBottom: 14 }}>
          {series.map((s) => (
            <View key={s.label} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.color }} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#6B7280" }}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ width: screenWidth, alignSelf: "center" }}>
        {/* GRID Y EJE Y */}
        <View style={{ height, position: "absolute", left: 0, right: 0, top: 0, justifyContent: "space-between" }}>
          {[niceMax, niceMax / 2, 0].map((v, idx) => (
            <View key={idx} style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ width: 40, textAlign: "right", marginRight: 8, fontSize: 10.5, color: "#9CA3AF", fontWeight: "600" }}>
                {formatEuroInt(v)}
              </Text>
              <View style={{ height: 1, backgroundColor: "#E5E7EB", opacity: 0.7, flex: 1 }} />
            </View>
          ))}
        </View>

        {/* BARRAS */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginLeft: 48,
            height,
          }}
        >
          {xLabels.map((label, i) => {
            const maxBarHeight = height - 6;
            const isLastIdx = i === xLabels.length - 1;
            return (
              <View key={i} style={{ alignItems: "center", justifyContent: "flex-end" }}>
                {highlightLast && isLastIdx && seriesCount === 1 && (
                  <View
                    style={{
                      marginBottom: 4,
                      paddingHorizontal: 7,
                      paddingVertical: 3,
                      borderRadius: 999,
                      backgroundColor: highlightColor,
                    }}
                  >
                    <Text style={{ fontSize: 10.5, fontWeight: "800", color: "white" }}>
                      {formatEuroInt(series[0].values[i])}
                    </Text>
                  </View>
                )}

                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: groupGap }}>
                  {series.map((s) => {
                    const v = Math.abs(s.values[i] ?? 0);
                    const barHeight = Math.max((v / niceMax) * maxBarHeight, v === 0 ? 0 : 4);
                    const isHighlighted = highlightLast && isLastIdx && seriesCount === 1;
                    return (
                      <View
                        key={s.label}
                        style={{
                          width: barWidth,
                          height: barHeight,
                          borderRadius: 5,
                          backgroundColor: isHighlighted ? highlightColor : s.color,
                          opacity: isHighlighted ? 1 : v === 0 ? 0.25 : 0.85,
                        }}
                      />
                    );
                  })}
                </View>

                <Text style={{ marginTop: 6, fontSize: 11.5, fontWeight: "600", color: "#9CA3AF" }}>{label}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
