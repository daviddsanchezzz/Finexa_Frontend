import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Svg, { Path, Circle, Line } from "react-native-svg";
import { formatEuro, formatEuroInt } from "../utils/currency";

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
  height?: number;
}

function buildPath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
}

// Gráfica de líneas multi-serie (con relleno opcional de área para una
// serie, ej. Ahorro) — mucho más legible que barras agrupadas cuando hay
// muchos puntos (rangos largos en Evolución). Escoge como mucho ~6 labels
// del eje X, siempre repartidos, para que nunca se amontonen. Cada punto es
// tocable (columna invisible) — al tocar muestra sus valores exactos.
export default function TrendChart({ series, xLabels, height = 150 }: Props) {
  const [width, setWidth] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const padY = 10;

  const allValues = series.flatMap((s) => s.values);
  const minV = Math.min(0, ...allValues);
  const maxV = Math.max(...allValues, 1);
  const span = maxV - minV || 1;

  const n = xLabels.length;
  const mapX = (i: number) => (n > 1 ? (i * width) / (n - 1) : width / 2);
  const mapY = (v: number) => padY + (1 - (v - minV) / span) * (height - padY * 2);

  const zeroY = mapY(0);

  const maxLabels = Math.min(6, n);
  const labelStep = n > 1 ? (n - 1) / Math.max(1, maxLabels - 1) : 1;
  const labelIdxs = new Set(Array.from({ length: maxLabels }, (_, i) => Math.round(i * labelStep)));

  return (
    <View style={{ width: "100%" }}>
      {series.length > 1 && (
        <View style={{ flexDirection: "row", gap: 16, marginBottom: 10 }}>
          {series.map((s) => (
            <View key={s.key} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
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
            <Text key={s.key} style={{ color: s.color, fontWeight: "700" }}>
              {s.label} {formatEuro(s.values[selectedIndex] ?? 0)} €{i < series.length - 1 ? "   " : ""}
            </Text>
          ))}
        </Text>
      )}

      <View style={{ flexDirection: "row" }}>
        <View style={{ justifyContent: "space-between", marginRight: 8, height, paddingVertical: padY }}>
          <Text style={{ fontSize: 10, color: "#B0B4BA", fontWeight: "500" }}>{formatEuroInt(maxV)}</Text>
          <Text style={{ fontSize: 10, color: "#B0B4BA", fontWeight: "500" }}>{formatEuroInt(minV)}</Text>
        </View>

        <View style={{ flex: 1 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {width > 0 && n > 0 && (
            <>
              <Svg width={width} height={height}>
                {minV < 0 && (
                  <Path d={`M 0 ${zeroY.toFixed(1)} L ${width} ${zeroY.toFixed(1)}`} stroke="#F1F2F4" strokeWidth={1} />
                )}
                {series.map((s) => {
                  const points = s.values.map((v, i) => ({ x: mapX(i), y: mapY(v) }));
                  const linePath = buildPath(points);
                  const areaPath = s.area
                    ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${zeroY.toFixed(1)} L ${points[0].x.toFixed(1)} ${zeroY.toFixed(1)} Z`
                    : null;
                  const last = points[points.length - 1];
                  return (
                    <React.Fragment key={s.key}>
                      {areaPath && <Path d={areaPath} fill={s.color} opacity={0.1} />}
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
                      stroke="#D1D5DB"
                      strokeWidth={1}
                      strokeDasharray="3,3"
                    />
                    {series.map((s) => (
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

              {/* Columnas invisibles tocables, una por punto del eje X */}
              <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, flexDirection: "row" }}>
                {xLabels.map((_, i) => (
                  <TouchableOpacity
                    key={i}
                    style={{ flex: 1 }}
                    activeOpacity={1}
                    onPress={() => setSelectedIndex(selectedIndex === i ? null : i)}
                  />
                ))}
              </View>
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
