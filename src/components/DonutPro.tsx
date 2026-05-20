import React from "react";
import { View, Text } from "react-native";
import Svg, { G, Path, Circle } from "react-native-svg";

export type DonutSlice = {
  id: number;
  label: string;
  value: number;
  pct: number;
  color: string;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const deg2rad = (d: number) => (d * Math.PI) / 180;

const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
  const a = deg2rad(angleDeg);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
};

type Props = {
  slices: DonutSlice[];
  size: number;
  strokeWidth: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
  centerValueText: string;
};

export default function DonutPro({ slices, size, strokeWidth, selectedId, onSelect, centerValueText }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;
  const startAt = -90;
  let accDeg = 0;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke="#E2E8F0" strokeWidth={strokeWidth} fill="transparent" />
        <G>
          {slices.map((s) => {
            const pct = clamp01(s.pct);
            const sweep = Math.max(0, pct * 360);
            if (sweep <= 0.2) { accDeg += sweep; return null; }
            const segStart = startAt + accDeg;
            const segEnd = startAt + accDeg + sweep;
            accDeg += sweep;
            const isSelected = selectedId != null ? s.id === selectedId : false;
            const dimOthers = selectedId != null;
            const d = describeArc(cx, cy, r, segStart, segEnd);
            return (
              <Path
                key={s.id}
                d={d}
                stroke={s.color}
                strokeWidth={isSelected ? strokeWidth + 2 : strokeWidth}
                strokeLinecap="butt"
                fill="none"
                opacity={dimOthers ? (isSelected ? 1 : 0.28) : 1}
                onPress={() => onSelect(s.id)}
              />
            );
          })}
        </G>
      </Svg>
      <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 }}>
        <Text
          style={{ fontSize: 16, fontWeight: "900", color: "#0F172A", textAlign: "center" }}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {centerValueText}
        </Text>
      </View>
    </View>
  );
}
