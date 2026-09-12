import React, { useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, PanResponder } from "react-native";
import Svg, { Path, Circle, Line } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { formatEuroInt } from "../utils/currency";
import ChartTooltip from "./ChartTooltip";

export interface TrendSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
  area?: boolean; // si true, rellena el área bajo la línea (ej. Ahorro)
}

interface Props {
  series: TrendSeries[]; // 1-3 series, mismo nº de valores que xLabels
  xLabels: string[];
  // Etiquetas completas para el tooltip (ej. "Septiembre 2026"); si se omite
  // se reutiliza xLabels.
  tooltipLabels?: string[];
  height?: number;
}

const TOOLTIP_WIDTH = 172;

function buildPath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
}

// Gráfica de líneas multi-serie (con relleno opcional de área muy sutil
// para una serie, ej. Ahorro) — mucho más legible que barras agrupadas
// cuando hay muchos puntos (rangos largos en Evolución). Escoge como mucho
// ~6 labels del eje X, siempre repartidos. Tocar la leyenda muestra/oculta
// esa serie. Tocar o arrastrar por el trazado selecciona un punto (con un
// golpe háptico ligero por cada mes) y muestra un tooltip flotante.
export default function TrendChart({ series, xLabels, tooltipLabels, height = 130 }: Props) {
  const [width, setWidth] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const padY = 10;
  const labels = tooltipLabels ?? xLabels;
  const n = xLabels.length;

  const visibleSeries = series.filter((s) => !hidden[s.key]);

  const allValues = visibleSeries.flatMap((s) => s.values);
  const minV = Math.min(0, ...allValues);
  const maxV = Math.max(...allValues, 1);
  const span = maxV - minV || 1;

  const mapX = (i: number) => (n > 1 ? (i * width) / (n - 1) : width / 2);
  const mapY = (v: number) => padY + (1 - (v - minV) / span) * (height - padY * 2);

  const zeroY = mapY(0);

  const maxLabels = Math.min(6, n);
  const labelStep = n > 1 ? (n - 1) / Math.max(1, maxLabels - 1) : 1;
  const labelIdxs = new Set(Array.from({ length: maxLabels }, (_, i) => Math.round(i * labelStep)));

  const tooltipLeft = selectedIndex != null && width > 0
    ? Math.min(Math.max(mapX(selectedIndex) - TOOLTIP_WIDTH / 2, 0), width - TOOLTIP_WIDTH)
    : 0;
  const pointerLeft = selectedIndex != null && width > 0
    ? Math.min(Math.max(mapX(selectedIndex) - tooltipLeft, 12), TOOLTIP_WIDTH - 12)
    : undefined;

  // Ancla el tooltip justo encima del punto más alto de la selección (con
  // margen para la puntita) en vez de taparlo.
  const selectedTopY = selectedIndex != null && visibleSeries.length > 0
    ? Math.min(...visibleSeries.map((s) => mapY(s.values[selectedIndex] ?? 0)))
    : 0;
  const estTooltipHeight = 24 + Math.max(visibleSeries.length, 1) * 19;
  const tooltipTop = selectedTopY - estTooltipHeight - 14;

  // Tap y arrastre comparten el mismo cálculo de punto tocado, con un golpe
  // háptico ligero cada vez que el dedo cruza a un mes distinto.
  const draggingIndexRef = useRef<number | null>(null);
  const touchStartIndexRef = useRef<number | null>(null);

  const indexFromX = (x: number) => (n > 1 ? Math.min(n - 1, Math.max(0, Math.round((x / width) * (n - 1)))) : 0);

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
    [n, width, selectedIndex]
  );

  return (
    <View style={{ width: "100%" }}>
      {series.length > 1 && (
        <View style={{ flexDirection: "row", gap: 16, marginBottom: 10, flexWrap: "wrap" }}>
          {series.map((s) => {
            const isHidden = !!hidden[s.key];
            return (
              <TouchableOpacity
                key={s.key}
                activeOpacity={0.6}
                onPress={() => setHidden((h) => ({ ...h, [s.key]: !h[s.key] }))}
                style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
              >
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isHidden ? "#D1D5DB" : s.color }} />
                <Text style={{ fontSize: 11.5, fontWeight: "500", color: isHidden ? "#C1C5CC" : "#8A8F98", textDecorationLine: isHidden ? "line-through" : "none" }}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={{ flexDirection: "row" }}>
        <View style={{ justifyContent: "space-between", marginRight: 8, height, paddingVertical: padY }}>
          <Text style={{ fontSize: 9.5, color: "#C1C5CC", fontWeight: "500" }}>{formatEuroInt(maxV)}</Text>
          <Text style={{ fontSize: 9.5, color: "#C1C5CC", fontWeight: "500" }}>{formatEuroInt(minV)}</Text>
        </View>

        <View style={{ flex: 1, position: "relative" }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {width > 0 && n > 0 && (
            <>
              <Svg width={width} height={height}>
                {minV < 0 && (
                  <Path d={`M 0 ${zeroY.toFixed(1)} L ${width} ${zeroY.toFixed(1)}`} stroke="#F4F5F7" strokeWidth={1} />
                )}
                {visibleSeries.map((s) => {
                  const points = s.values.map((v, i) => ({ x: mapX(i), y: mapY(v) }));
                  const linePath = buildPath(points);
                  const areaPath = s.area
                    ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${zeroY.toFixed(1)} L ${points[0].x.toFixed(1)} ${zeroY.toFixed(1)} Z`
                    : null;
                  const last = points[points.length - 1];
                  return (
                    <React.Fragment key={s.key}>
                      {areaPath && <Path d={areaPath} fill={s.color} opacity={0.04} />}
                      <Path d={linePath} stroke={s.color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
                      {last && <Circle cx={last.x} cy={last.y} r={3} fill={s.color} />}
                    </React.Fragment>
                  );
                })}
                {selectedIndex != null && (
                  <>
                    <Line
                      x1={mapX(selectedIndex)}
                      y1={0}
                      x2={mapX(selectedIndex)}
                      y2={height}
                      stroke="#E5E7EB"
                      strokeWidth={1}
                      strokeDasharray="3,3"
                    />
                    {visibleSeries.map((s) => (
                      <Circle
                        key={`${s.key}-sel`}
                        cx={mapX(selectedIndex)}
                        cy={mapY(s.values[selectedIndex] ?? 0)}
                        r={5}
                        fill="white"
                        stroke={s.color}
                        strokeWidth={2}
                      />
                    ))}
                  </>
                )}
              </Svg>

              {/* Superficie tocable/arrastrable sobre todo el trazado */}
              <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} {...panResponder.panHandlers} />

              {selectedIndex != null && visibleSeries.length > 0 && (
                <ChartTooltip
                  title={labels[selectedIndex]}
                  style={{ position: "absolute", left: tooltipLeft, top: tooltipTop, zIndex: 20, elevation: 6 }}
                  pointerLeft={pointerLeft}
                  rows={visibleSeries.map((s) => ({ label: s.label, color: s.color, value: s.values[selectedIndex] ?? 0 }))}
                />
              )}
            </>
          )}
        </View>
      </View>

      <View style={{ flexDirection: "row", marginLeft: 38 }}>
        {xLabels.map((label, i) =>
          labelIdxs.has(i) ? (
            <Text
              key={i}
              style={{
                position: "absolute",
                left: width > 0 ? Math.min(Math.max(mapX(i) - 14, 0), width - 28) : 0,
                fontSize: 11,
                fontWeight: selectedIndex === i ? "700" : "500",
                color: selectedIndex === i ? "#0F172A" : "#B0B4BA",
                marginTop: 8,
                width: 28,
                textAlign: "center",
              }}
            >
              {label}
            </Text>
          ) : null
        )}
      </View>
      <View style={{ height: 20 }} />
    </View>
  );
}
