import React, { useState } from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { formatEuroInt } from "../utils/currency";
import { colors } from "../theme/theme";
import ChartTooltip from "./ChartTooltip";

export interface BarSeries {
  label: string;
  color: string;
  values: number[];
}

interface Props {
  series: BarSeries[]; // 1 a 3 series, mismo nº de valores que xLabels
  xLabels: string[];
  // Etiquetas completas para el tooltip (ej. "Abril 2026"); si se omite se
  // reutiliza xLabels (ej. "Abr").
  tooltipLabels?: string[];
  height?: number;
}

const TOOLTIP_WIDTH = 158;

// Gráfica de barras agrupadas (1-3 series por mes/periodo). Estilo sobrio:
// columnas de ancho igual, grid casi invisible, sin bordes ni sombras. El
// periodo más reciente siempre se ve a plena intensidad; los anteriores se
// atenúan ligeramente. Tocar una columna la selecciona en su lugar (misma
// intensidad) y abre un tooltip flotante con sus valores exactos.
export default function GroupedBarChart({ series, xLabels, tooltipLabels, height = 100 }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const screenWidth = Dimensions.get("window").width - 80;
  const seriesCount = series.length;
  const n = xLabels.length;
  const labels = tooltipLabels ?? xLabels;
  const highlightIndex = selectedIndex ?? n - 1;

  const allValues = series.flatMap((s) => s.values.map((v) => Math.abs(v)));
  const rawMax = Math.max(...allValues, 1);
  const niceMax = Math.ceil(rawMax / 25) * 25 || 1;

  const barWidth = seriesCount >= 3 ? 5 : seriesCount === 2 ? 9 : n > 8 ? 12 : 18;
  const groupGap = seriesCount > 1 ? 3 : 0;

  const gridLeft = 42;
  const colWidth = n > 0 ? (screenWidth - gridLeft) / n : 0;
  const tooltipLeft = Math.min(Math.max(gridLeft + highlightIndex * colWidth + colWidth / 2 - TOOLTIP_WIDTH / 2, 0), screenWidth - TOOLTIP_WIDTH);

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
        <View style={{ width: screenWidth, alignSelf: "center", marginBottom: 8 }}>
          <ChartTooltip
            title={labels[selectedIndex]}
            style={{ marginLeft: tooltipLeft, alignSelf: "flex-start" }}
            rows={series.map((s) => ({ label: s.label, color: s.color, value: s.values[selectedIndex] ?? 0 }))}
          />
        </View>
      )}

      <View style={{ width: screenWidth, alignSelf: "center", position: "relative" }}>
        {/* GRID Y EJE Y */}
        <View style={{ height, position: "absolute", left: 0, right: 0, top: 0, justifyContent: "space-between" }}>
          {[niceMax, niceMax / 2, 0].map((v, idx) => (
            <View key={idx} style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ width: 34, textAlign: "right", marginRight: 8, fontSize: 9.5, color: "#C1C5CC", fontWeight: "500" }}>
                {formatEuroInt(v)}
              </Text>
              <View style={{ height: 1, backgroundColor: "#F4F5F7", flex: 1 }} />
            </View>
          ))}
        </View>

        {/* BARRAS */}
        <View style={{ flexDirection: "row", alignItems: "flex-end", marginLeft: gridLeft, height }}>
          {xLabels.map((label, i) => {
            const maxBarHeight = height - 4;
            const isHighlighted = i === highlightIndex;
            return (
              <TouchableOpacity
                key={i}
                activeOpacity={0.7}
                onPress={() => setSelectedIndex(selectedIndex === i ? null : i)}
                style={{ flex: 1, height, alignItems: "center", justifyContent: "flex-end" }}
              >
                {isHighlighted && (
                  <View style={{ position: "absolute", top: 0, bottom: 0, left: 1, right: 1, backgroundColor: `${colors.primary}0D`, borderRadius: 8 }} />
                )}
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
                          backgroundColor: s.color,
                          opacity: v === 0 ? 0.18 : isHighlighted ? 1 : 0.4,
                        }}
                      />
                    );
                  })}
                </View>

                <Text style={{ marginTop: 7, fontSize: 10.5, fontWeight: isHighlighted ? "700" : "500", color: isHighlighted ? "#0F172A" : "#B0B4BA" }}>
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
