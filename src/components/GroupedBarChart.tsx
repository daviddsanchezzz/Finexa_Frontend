import React, { useMemo, useRef, useState } from "react";
import { View, Text, PanResponder, Dimensions } from "react-native";
import * as Haptics from "expo-haptics";
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
  height?: number; // alto del área de trazado (barras), sin contar labels
}

const TOOLTIP_WIDTH = 172;
const LABEL_HEIGHT = 24;

// Gráfica de barras agrupadas (1-3 series por mes/periodo). Estilo sobrio:
// columnas de ancho igual, grid casi invisible, sin bordes ni sombras. El
// periodo más reciente siempre se ve a plena intensidad; los anteriores se
// atenúan ligeramente. Tocar o arrastrar por las columnas las selecciona
// (con un pequeño golpe háptico en cada cambio de mes) y superpone un
// tooltip flotante con sus valores exactos — el tooltip nunca desplaza el
// contenido de alrededor.
export default function GroupedBarChart({ series, xLabels, tooltipLabels, height = 100 }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const screenWidth = Dimensions.get("window").width - 80;
  const seriesCount = series.length;
  const n = xLabels.length;
  const labels = tooltipLabels ?? xLabels;
  const highlightIndex = selectedIndex ?? n - 1;
  const plotHeight = height;

  const allValues = series.flatMap((s) => s.values.map((v) => Math.abs(v)));
  const rawMax = Math.max(...allValues, 1);
  const niceMax = Math.ceil(rawMax / 25) * 25 || 1;

  const barWidth = seriesCount >= 3 ? 5 : seriesCount === 2 ? 9 : n > 8 ? 12 : 18;
  const groupGap = seriesCount > 1 ? 3 : 0;

  const gridLeft = 42;
  const colWidth = n > 0 ? (screenWidth - gridLeft) / n : 0;

  // Tap y arrastre comparten el mismo cálculo de columna tocada, con un
  // golpe háptico ligero cada vez que el dedo cruza a un mes distinto.
  const draggingIndexRef = useRef<number | null>(null);
  const touchStartIndexRef = useRef<number | null>(null);

  const indexFromX = (x: number) => Math.min(n - 1, Math.max(0, Math.floor(x / colWidth)));

  const handleTouch = (x: number) => {
    const idx = indexFromX(x);
    if (draggingIndexRef.current !== idx) {
      draggingIndexRef.current = idx;
      setSelectedIndex(idx);
      Haptics.selectionAsync();
    }
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          draggingIndexRef.current = null;
          touchStartIndexRef.current = selectedIndex;
          handleTouch(evt.nativeEvent.locationX);
        },
        onPanResponderMove: (evt) => handleTouch(evt.nativeEvent.locationX),
        onPanResponderRelease: (_evt, gestureState) => {
          const moved = Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6;
          if (!moved && draggingIndexRef.current === touchStartIndexRef.current) {
            setSelectedIndex(null);
          }
        },
      }),
    [n, colWidth, selectedIndex]
  );

  const barCenterX = gridLeft + highlightIndex * colWidth + colWidth / 2;
  const tooltipLeft = Math.min(Math.max(barCenterX - TOOLTIP_WIDTH / 2, 0), screenWidth - TOOLTIP_WIDTH);
  const pointerLeft = Math.min(Math.max(barCenterX - tooltipLeft, 12), TOOLTIP_WIDTH - 12);

  // Altura de la barra más alta de la columna seleccionada, para anclar el
  // tooltip justo encima de su punta (con margen para la puntita) en vez de
  // taparla.
  const maxBarHeight = plotHeight - 4;
  const selectedBarTopY = selectedIndex != null
    ? plotHeight - Math.max(
        (Math.max(...series.map((s) => Math.abs(s.values[selectedIndex] ?? 0))) / niceMax) * maxBarHeight,
        3
      )
    : 0;
  const estTooltipHeight = 24 + seriesCount * 19;
  const tooltipTop = selectedBarTopY - estTooltipHeight - 14;

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

      <View style={{ width: screenWidth, alignSelf: "center", position: "relative" }}>
        {/* GRID Y EJE Y — solo cubre el área de trazado, no las etiquetas */}
        <View style={{ height: plotHeight, position: "absolute", left: 0, right: 0, top: 0, justifyContent: "space-between" }}>
          {[niceMax, niceMax / 2, 0].map((v, idx) => (
            <View key={idx} style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ width: 34, textAlign: "right", marginRight: 8, fontSize: 9.5, color: "#C1C5CC", fontWeight: "500" }}>
                {formatEuroInt(v)}
              </Text>
              <View style={{ height: 1, backgroundColor: "#F4F5F7", flex: 1 }} />
            </View>
          ))}
        </View>

        {/* BARRAS + ETIQUETAS — alturas separadas para que el texto nunca
            empuje las barras a desbordar el área de trazado hacia arriba */}
        <View
          style={{ flexDirection: "row", alignItems: "flex-start", marginLeft: gridLeft, height: plotHeight + LABEL_HEIGHT }}
          {...panResponder.panHandlers}
        >
          {xLabels.map((label, i) => {
            const isHighlighted = i === highlightIndex;
            return (
              <View key={i} style={{ flex: 1, height: plotHeight + LABEL_HEIGHT, alignItems: "center" }}>
                {isHighlighted && (
                  <View style={{ position: "absolute", top: 0, height: plotHeight, left: 1, right: 1, backgroundColor: `${colors.primary}0D`, borderRadius: 8 }} />
                )}
                <View style={{ height: plotHeight, width: "100%", justifyContent: "flex-end", alignItems: "center" }}>
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
                </View>

                <Text style={{ marginTop: 7, fontSize: 10.5, fontWeight: isHighlighted ? "700" : "500", color: isHighlighted ? "#0F172A" : "#B0B4BA" }}>
                  {label}
                </Text>
              </View>
            );
          })}
        </View>

        {selectedIndex != null && (
          <ChartTooltip
            title={labels[selectedIndex]}
            style={{ position: "absolute", left: tooltipLeft, top: tooltipTop, zIndex: 20, elevation: 6 }}
            pointerLeft={pointerLeft}
            rows={series.map((s) => ({ label: s.label, color: s.color, value: s.values[selectedIndex] ?? 0 }))}
          />
        )}
      </View>
    </View>
  );
}
