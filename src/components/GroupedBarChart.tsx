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
  // Modo "evolución de una sola serie": la última barra se resalta con un
  // tono más intenso (sin badge flotante) para señalar el mes en curso.
  highlightLast?: boolean;
  highlightColor?: string;
}

// Gráfica de barras agrupadas (1-3 series por mes/periodo). Estilo sobrio:
// barras finas, grid casi invisible, sin bordes ni sombras.
export default function GroupedBarChart({
  series,
  xLabels,
  height = 120,
  highlightLast = false,
  highlightColor = "#0F172A",
}: Props) {
  const screenWidth = Dimensions.get("window").width - 80;
  const seriesCount = series.length;

  const allValues = series.flatMap((s) => s.values.map((v) => Math.abs(v)));
  const rawMax = Math.max(...allValues, 1);
  const niceMax = Math.ceil(rawMax / 25) * 25 || 1;

  const barWidth = seriesCount >= 3 ? 5 : seriesCount === 2 ? 9 : xLabels.length > 8 ? 12 : 18;
  const groupGap = seriesCount > 1 ? 3 : 0;

  return (
    <View style={{ width: "100%" }}>
      {seriesCount > 1 && (
        <View style={{ flexDirection: "row", gap: 16, marginBottom: 16 }}>
          {series.map((s) => (
            <View key={s.label} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: s.color }} />
              <Text style={{ fontSize: 11.5, fontWeight: "500", color: "#8A8F98" }}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ width: screenWidth, alignSelf: "center" }}>
        {/* GRID Y EJE Y */}
        <View style={{ height, position: "absolute", left: 0, right: 0, top: 0, justifyContent: "space-between" }}>
          {[niceMax, niceMax / 2, 0].map((v, idx) => (
            <View key={idx} style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ width: 38, textAlign: "right", marginRight: 8, fontSize: 10, color: "#B0B4BA", fontWeight: "500" }}>
                {formatEuroInt(v)}
              </Text>
              <View style={{ height: 1, backgroundColor: "#F1F2F4", flex: 1 }} />
            </View>
          ))}
        </View>

        {/* BARRAS */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginLeft: 46,
            height,
          }}
        >
          {xLabels.map((label, i) => {
            const maxBarHeight = height - 4;
            const isLastIdx = i === xLabels.length - 1;
            const isHighlighted = highlightLast && isLastIdx && seriesCount === 1;
            return (
              <View key={i} style={{ alignItems: "center", justifyContent: "flex-end" }}>
                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: groupGap }}>
                  {series.map((s) => {
                    const v = Math.abs(s.values[i] ?? 0);
                    const barHeight = Math.max((v / niceMax) * maxBarHeight, v === 0 ? 0 : 3);
                    return (
                      <View
                        key={s.label}
                        style={{
                          width: barWidth,
                          height: barHeight,
                          borderRadius: 3,
                          backgroundColor: isHighlighted ? highlightColor : s.color,
                          opacity: isHighlighted ? 1 : v === 0 ? 0.25 : 1,
                        }}
                      />
                    );
                  })}
                </View>

                <Text style={{ marginTop: 8, fontSize: 11, fontWeight: isHighlighted ? "700" : "500", color: isHighlighted ? "#0F172A" : "#B0B4BA" }}>
                  {label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
