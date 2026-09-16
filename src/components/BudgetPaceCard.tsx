import React, { useId, useState } from "react";
import { View, Text } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Path, Line, Circle, Rect, Text as SvgText } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/theme";
import { formatEuro } from "../utils/currency";
import { buildBudgetPace } from "../utils/budgetPace";

export default function BudgetPaceCard({ from, to, limit, transactions }: {
  from: string; to: string; limit: number; transactions: Parameters<typeof buildBudgetPace>[3];
}) {
  const [width, setWidth] = useState(320);
  const gradientId = `pace${useId().replace(/:/g, "")}`;
  const now = new Date();
  const pace = buildBudgetPace(from, to, limit, transactions, now);
  if (!pace) return <Text style={{ color: colors.textSecondary, paddingVertical: 24 }}>Define un límite de presupuesto para ver el ritmo de gasto.</Text>;
  const money = (value: number) => `${formatEuro(value)} €`;
  const date = (value: Date) => value.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  const left = 40, right = Math.max(left + 80, width - 8), top = 18, bottom = 174;
  const rawStep = Math.max(limit, pace.spent, 1) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 2.5, 5, 10].find(value => value * magnitude >= rawStep)! * magnitude;
  const max = step * 4;
  const x = (fraction: number) => left + fraction * (right - left);
  const y = (value: number) => bottom - value / max * (bottom - top);
  const path = pace.points.map((point, i) => `${i ? "L" : "M"} ${x(point.fraction)} ${y(point.spent)}`).join(" ");
  const last = pace.points[pace.points.length - 1];
  const todayLabel = `Hoy · ${date(now)}`;
  const todayWidth = Math.min(right - left, Math.max(106, todayLabel.length * 6.5 + 20));
  const todayLeft = Math.max(left, Math.min(right - todayWidth, x(last.fraction) - todayWidth / 2));
  const over = pace.difference > 0.005;
  const neutral = Math.abs(pace.difference) < 0.005 || pace.future;
  const tint = neutral ? "#F1F5F9" : over ? "#FEF2F2" : "#F0FDF4";
  const color = neutral ? colors.textSecondary : over ? colors.danger : colors.success;
  const message = pace.future ? "El periodo todavía no ha comenzado." : neutral ? "El gasto está en el ritmo ideal." :
    `${pace.ended ? "Terminaste" : "Vas"} ${money(Math.abs(pace.difference))} ${over ? "por encima" : "por debajo"} ${pace.ended ? "del presupuesto" : "del ritmo ideal"}.`;

  return (
    <View style={{ backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#E2E8F0", padding: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <Ionicons name="trending-up-outline" size={16} color={colors.primary} />
        <Text style={{ fontSize: 14, fontWeight: "800", color: colors.ink }}>Ritmo del presupuesto</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: "600", color: "#94A3B8", marginBottom: 3 }}>GASTO REAL</Text>
          <Text style={{ fontSize: 21, fontWeight: "900", color: colors.ink, fontVariant: ["tabular-nums"] }}>{money(pace.spent)}</Text>
        </View>
        <View style={{ flex: 1, alignItems: "flex-end", borderLeftWidth: 1, borderLeftColor: "#EEF2F7", paddingLeft: 12 }}>
          <Text style={{ fontSize: 11, fontWeight: "600", color: "#94A3B8", marginBottom: 3 }}>RITMO IDEAL</Text>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#64748B", fontVariant: ["tabular-nums"] }}>{money(pace.expected)}</Text>
        </View>
      </View>
      <View onLayout={event => setWidth(event.nativeEvent.layout.width)} accessible accessibilityLabel={`Gasto real: ${money(pace.spent)}. Previsto: ${money(pace.expected)}. ${message}`}>
        <Svg width="100%" height={230} viewBox={`0 0 ${width} 230`}>
          <Defs><LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={colors.primary} stopOpacity={0.2} /><Stop offset="1" stopColor={colors.primary} stopOpacity={0.015} /></LinearGradient></Defs>
          {[0, 1, 2, 3, 4].map(i => {
            const value = step * i;
            return <React.Fragment key={i}>
              <Line x1={left} x2={right} y1={y(value)} y2={y(value)} stroke="#EEF2F7" />
              <SvgText x={left - 5} y={y(value) + 4} textAnchor="end" fontSize={11} fill="#94A3B8">{new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 1 }).format(value)} €</SvgText>
            </React.Fragment>;
          })}
          <Path d={`M ${left} ${bottom} L ${right} ${y(limit)}`} stroke="#94A3B8" strokeWidth={2} strokeDasharray="5 5" fill="none" />
          {!pace.future && <>
            <Path d={`${path} L ${x(last.fraction)} ${bottom} Z`} fill={`url(#${gradientId})`} />
            <Path d={path} fill="none" stroke={colors.primary} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
            <Line x1={x(last.fraction)} x2={x(last.fraction)} y1={top} y2={bottom} stroke="#CBD5E1" strokeDasharray="3 3" />
            <Circle cx={x(last.fraction)} cy={y(last.spent)} r={8} fill={colors.primary} opacity={0.1} />
            <Circle cx={x(last.fraction)} cy={y(last.spent)} r={4} fill="white" stroke={colors.primary} strokeWidth={3} />
          </>}
          <SvgText x={left} y={195} fontSize={11} fontWeight="600" fill="#94A3B8">{date(pace.start)}</SvgText>
          <SvgText x={right} y={195} textAnchor="end" fontSize={11} fontWeight="600" fill="#94A3B8">{date(pace.end)}</SvgText>
          {!pace.future && !pace.ended && <>
            <Rect x={todayLeft} y={206} width={todayWidth} height={20} rx={10} fill="#EEF3FF" />
            <SvgText x={todayLeft + todayWidth / 2} y={220} textAnchor="middle" fontSize={11} fontWeight="700" fill={colors.primary}>{todayLabel}</SvgText>
          </>}
        </Svg>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 8, marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><View style={{ width: 16, height: 3, borderRadius: 2, backgroundColor: colors.primary }} /><Text style={{ fontSize: 11.5, fontWeight: "600", color: "#64748B" }}>Gasto real</Text></View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Svg width={20} height={4}><Line x1={0} y1={2} x2={20} y2={2} stroke="#94A3B8" strokeWidth={2} strokeDasharray="4 3" /></Svg><Text style={{ fontSize: 11.5, fontWeight: "600", color: "#64748B" }}>Ritmo ideal</Text></View>
      </View>
      <View style={{ backgroundColor: tint, borderRadius: 10, padding: 10, flexDirection: "row", gap: 8, alignItems: "center" }}>
        <Ionicons name={over ? "alert-circle-outline" : "information-circle-outline"} size={16} color={color} />
        <Text style={{ flex: 1, fontSize: 11.5, lineHeight: 16, fontWeight: "600", color }}>{message}</Text>
      </View>
      <Text style={{ fontSize: 10.5, lineHeight: 15, color: "#94A3B8", marginTop: 8 }}>El ritmo ideal reparte el presupuesto por igual entre los días del periodo.</Text>
    </View>
  );
}
