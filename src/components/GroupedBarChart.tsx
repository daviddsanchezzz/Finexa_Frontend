import React, { useState } from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { formatEuro, formatEuroInt } from "../utils/currency";

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
// barras finas, grid casi invisible, sin bordes ni sombras. Cada columna es
// tocable — al tocarla muestra sus valores exactos en una leyenda superior.
export default function GroupedBarChart({
  series,
  xLabels,
  height = 120,
  highlightLast = false,
  highlightColor = "#0F172A",
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
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
        <View style={{ flexDirection: "row", gap: 16, marginBottom: 10, flexWrap: "wrap" }}>
          {series.map((s) => (
            <View key={s.label} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: s.color }} />
              <Text style={{ fontSize: 11.5, fontWeight: "500", color: "#8A8F98" }}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      {selectedIndex != null && (
        <Text style={{ fontSize: 12, fontWeight: "600", color: "#0F172A", marginBottom: 10 }}>
          {xLabels[selectedIndex]} ·{" "}
          {series.map((s, i) => (
            <Text key={s.label} style={{ color: s.color, fontWeight: "700" }}>
              {s.label} {formatEuro(Math.abs(s.values[selectedIndex] ?? 0))} €{i < series.length - 1 ? "   " : ""}
            </Text>
          ))}
        </Text>
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
            const isSelected = selectedIndex === i;
            return (
              <TouchableOpacity
                key={i}
                activeOpacity={0.7}
                onPress={() => setSelectedIndex(isSelected ? null : i)}
                style={{ alignItems: "center", justifyContent: "flex-end", paddingHorizontal: 2 }}
              >
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

                <Text style={{ marginTop: 8, fontSize: 11, fontWeight: isHighlighted || isSelected ? "700" : "500", color: isHighlighted || isSelected ? "#0F172A" : "#B0B4BA" }}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}
