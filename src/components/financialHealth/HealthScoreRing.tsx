import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../../context/ThemeContext";

interface Props {
  score: number | null;
  color: string;
  size?: number;
  stroke?: number;
  fontSize?: number;
}

// Anillo de progreso 0-100 con la nota en el centro.
export default function HealthScoreRing({ score, color, size = 56, stroke = 6, fontSize = 17 }: Props) {
  const { colors } = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = score == null ? 0 : Math.min(Math.max(score, 0), 100) / 100;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.border} strokeWidth={stroke} fill="none" />
        {score != null && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${c * pct} ${c}`}
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        )}
      </Svg>
      <Text style={{ fontSize, fontWeight: "800", color: score == null ? colors.textMuted : colors.text, fontVariant: ["tabular-nums"] }}>
        {score == null ? "—" : score}
      </Text>
    </View>
  );
}
