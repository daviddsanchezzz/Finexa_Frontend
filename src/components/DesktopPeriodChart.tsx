// src/components/DesktopPeriodChart.tsx
import React, { useMemo, useState } from "react";
import { View, Text, Pressable, LayoutChangeEvent, Platform } from "react-native";
import { colors } from "../theme/theme";

interface DataPoint {
  display: number; // >= 0
  real: number;
}

interface Props {
  data: DataPoint[];
  labels: (string | number)[];
  height?: number;
  accentColor?: string;
}

function niceCeilMax(rawMax: number) {
  const max = Math.max(rawMax, 1);
  const exp = Math.floor(Math.log10(max));
  const base = Math.pow(10, exp);
  const f = max / base;
  const niceF = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return niceF * base;
}

function formatCurrency(value: number) {
  const v = Number.isFinite(value) ? value : 0;
  return v.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatAxisNumber(v: number) {
  const n = Math.round(v);
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (abs >= 10_000) return `${Math.round(n / 1000)}k`;
  if (abs >= 1_000) return `${(n / 1000).toFixed(1).replace(".", ",")}k`;
  return `${n}`;
}

export default function DesktopPeriodChart({
  data,
  labels,
  height = 260,
  accentColor,
}: Props) {
  const primary = accentColor ?? colors.primary;

  const [containerW, setContainerW] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const activeIndex = hovered ?? selected;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w && w !== containerW) setContainerW(w);
  };

  const n = Math.max(labels.length, data.length);

  const absData = useMemo(
    () => Array.from({ length: n }).map((_, i) => Math.max(0, Math.abs(data[i]?.display ?? 0))),
    [data, n]
  );

  const rawMax = useMemo(() => Math.max(...absData, 1), [absData]);
  const maxY = useMemo(() => niceCeilMax(rawMax), [rawMax]);

  // Layout constants
  const PAD_TOP = 14;
  const PAD_RIGHT = 12;
  const GUTTER_LEFT = 54;
  const LABEL_ROW_H = 26;
  const PAD_BOTTOM = 12;

  const plotH = Math.max(140, height - PAD_TOP - LABEL_ROW_H - PAD_BOTTOM);
  const plotW = Math.max(0, containerW - GUTTER_LEFT - PAD_RIGHT);

  // IMPORTANT: baseline INSIDE plot (avoid drawing exactly on border)
  const BASELINE_Y = Math.max(0, plotH - 1);

  const barLayout = useMemo(() => {
    if (plotW <= 0 || n <= 0) return { step: 28, barW: 14 };
    const step = plotW / n;

    const maxBarW = n >= 18 ? 14 : n >= 12 ? 16 : n >= 8 ? 20 : 24;
    const minBarW = n >= 18 ? 10 : 12;

    let barW = step * 0.58;
    barW = Math.min(maxBarW, Math.max(minBarW, barW));
    return { step, barW };
  }, [plotW, n]);

  // ticks: use values and map value->y so 0 is exactly BASELINE_Y
  const ticks = useMemo(() => [maxY, (2 * maxY) / 3, maxY / 3, 0], [maxY]);
  const yForValue = (v: number) => {
    // maxY -> y=0, 0 -> y=BASELINE_Y
    if (maxY <= 0) return BASELINE_Y;
    const ratio = v / maxY;
    return Math.round(BASELINE_Y - ratio * BASELINE_Y);
  };

  const tooltip = useMemo(() => {
    if (activeIndex === null || containerW <= 0 || plotW <= 0) return null;

    const item = data[activeIndex] ?? { display: 0, real: 0 };
    const label = labels[activeIndex] ?? "";

    const valueForHeight = Math.max(0, Math.abs(item.display));
    const ratio = maxY > 0 ? valueForHeight / maxY : 0;

    const maxBarHeight = Math.max(0, BASELINE_Y - 8);
    const barH = Math.max(3, Math.round(ratio * maxBarHeight));

    const step = barLayout.step;
    const cx = GUTTER_LEFT + activeIndex * step + step / 2;

    const TIP_W = 180;
    const TIP_H = 44;

    const leftMin = 10;
    const leftMax = containerW - TIP_W - 10;
    const left = Math.max(leftMin, Math.min(leftMax, cx - TIP_W / 2));

    // Place tooltip above the bar
    const top = Math.max(8, PAD_TOP + (BASELINE_Y - barH) - TIP_H - 10);
    const pointerX = Math.max(10, Math.min(TIP_W - 10, cx - left));

    return {
      left,
      top,
      pointerX,
      value: formatCurrency(item.real),
      label: String(label),
    };
  }, [activeIndex, containerW, plotW, data, labels, maxY, BASELINE_Y, barLayout.step]);

  return (
    <View onLayout={onLayout} style={{ width: "100%" }}>
      <View
        style={{
          height,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: "white",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Tooltip */}
        {tooltip && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: tooltip.left,
              top: tooltip.top,
              width: 180,
              borderRadius: 14,
              backgroundColor: "rgba(15,23,42,0.95)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
              paddingHorizontal: 12,
              paddingVertical: 10,
              shadowColor: "#000",
              shadowOpacity: 0.18,
              shadowRadius: 12,
              elevation: 8,
              zIndex: 50,
            }}
          >
            <Text style={{ color: "white", fontSize: 12, fontWeight: "800" }}>{tooltip.value}</Text>
            <Text style={{ marginTop: 2, color: "rgba(255,255,255,0.70)", fontSize: 10, fontWeight: "700" }}>
              {tooltip.label}
            </Text>

            <View
              style={{
                position: "absolute",
                bottom: -6,
                left: tooltip.pointerX - 6,
                width: 12,
                height: 12,
                backgroundColor: "rgba(15,23,42,0.95)",
                transform: [{ rotate: "45deg" }],
                borderRightWidth: 1,
                borderBottomWidth: 1,
                borderColor: "rgba(255,255,255,0.10)",
              }}
            />
          </View>
        )}

        {/* Grid + Y axis */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: PAD_TOP,
            height: plotH,
          }}
        >
          {ticks.map((t, idx) => {
            const y = yForValue(t);
            const isZeroLine = t === 0;

            return (
              <View
                key={`tick-${idx}`}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: y,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    width: GUTTER_LEFT - 10,
                    textAlign: "right",
                    paddingRight: 10,
                    fontSize: 11,
                    fontWeight: "900",
                    color: "#94A3B8",
                  }}
                >
                  {formatAxisNumber(t)}
                </Text>

                <View
                  style={{
                    flex: 1,
                    height: 1,
                    backgroundColor: "#E5E7EB",
                    opacity: isZeroLine ? 1 : 0.75,
                  }}
                />
              </View>
            );
          })}
        </View>

        {/* Bars: baseline is BASELINE_Y */}
        <View
          style={{
            position: "absolute",
            left: GUTTER_LEFT,
            right: PAD_RIGHT,
            top: PAD_TOP,
            height: BASELINE_Y + 7, // so baseline is inside the container
            flexDirection: "row",
            alignItems: "flex-end",
          }}
        >
          {Array.from({ length: n }).map((_, i) => {
            const item = data[i] ?? { display: 0, real: 0 };
            const valueForHeight = Math.max(0, Math.abs(item.display));
            const ratio = maxY > 0 ? valueForHeight / maxY : 0;

            const maxBarHeight = Math.max(0, BASELINE_Y - 8);
            const barH = Math.max(3, Math.round(ratio * maxBarHeight));

            const isActive = activeIndex === i;
            const isZero = valueForHeight === 0;

            return (
              <View
                key={`barwrap-${i}`}
                style={{
                  width: barLayout.step,
                  alignItems: "center",
                  justifyContent: "flex-end",
                }}
              >
                <Pressable
                  onPress={() => setSelected((prev) => (prev === i ? null : i))}
                  onHoverIn={Platform.OS === "web" ? () => setHovered(i) : undefined}
                  onHoverOut={Platform.OS === "web" ? () => setHovered(null) : undefined}
                  style={{
                    width: barLayout.barW,
                    height: barH,
                    backgroundColor: primary,
                    opacity: isZero ? 0.18 : isActive ? 1 : 0.85,

                    // rectangular but nice: round only top corners
                    borderTopLeftRadius: 6,
                    borderTopRightRadius: 6,
                    borderBottomLeftRadius: 0,
                    borderBottomRightRadius: 0,

                    // selection
                    borderWidth: isActive ? 2 : 0,
                    borderColor: isActive ? "rgba(15,23,42,0.35)" : "transparent",
                  }}
                />
              </View>
            );
          })}
        </View>

        {/* X labels BELOW baseline */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: GUTTER_LEFT,
            right: PAD_RIGHT,
            top: PAD_TOP + BASELINE_Y + 1, // 1px below 0 line
            height: LABEL_ROW_H,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          {Array.from({ length: n }).map((_, i) => {
            const label = labels[i] ?? "";
            const isActive = activeIndex === i;

            return (
              <View key={`xlabel-${i}`} style={{ width: barLayout.step, alignItems: "center" }}>
                <Text
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    fontWeight: "900",
                    color: isActive ? "#0F172A" : "#94A3B8",
                  }}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </View>
            );
          })}
        </View>

        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: PAD_BOTTOM,
            backgroundColor: "white",
          }}
        />
      </View>

    </View>
  );
}
