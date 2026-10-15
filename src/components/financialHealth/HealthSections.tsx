import React, { useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Line, Rect } from "react-native-svg";
import { useTheme } from "../../context/ThemeContext";
import { radii } from "../../theme/theme";
import { formatEuro } from "../../utils/currency";
import { MONTH_NAMES_SHORT_ES } from "../../utils/wealthSeries";
import { useSimulateHealth } from "../../hooks/useFinancialHealth";
import { parseScenarioForm } from "../../utils/financialProfileForm";
import {
  STATUS_LABEL,
  formatDecimal,
  formatMetricValue,
  formatMonths,
  formatPercent,
  formatYears,
  formatYearsDelta,
  severityStyle,
  statusColor,
} from "../../utils/financialHealthFormat";
import type { FiProjection, HealthHistoryPoint, HealthInsight, HealthLever, HealthMetric, HealthPillar, HealthReport, ScenarioResult } from "../../types/financialHealth";

function useCard() {
  const { colors } = useTheme();
  return {
    colors,
    card: { backgroundColor: colors.surface, borderRadius: radii.card, borderWidth: 1, borderColor: colors.border, padding: 14 } as const,
  };
}

export function SectionTitle({ children, hint }: { children: string; hint?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: 22, marginBottom: 8 }}>
      <Text style={{ fontSize: 15, fontWeight: "800", color: colors.text }}>{children}</Text>
      {hint ? <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{hint}</Text> : null}
    </View>
  );
}

function Bar({ value, color, height = 6 }: { value: number | null; color: string; height?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: colors.border, overflow: "hidden" }}>
      <View style={{ width: `${Math.min(Math.max(value ?? 0, 0), 100)}%`, height, backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

// --- Pilares -----------------------------------------------------------------

export function PillarsRow({ pillars }: { pillars: HealthPillar[] }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {pillars.map((p) => {
        const st = p.score == null ? "na" : p.score >= 85 ? "good" : p.score >= 60 ? "ok" : "attention";
        return (
          <View key={p.key} style={{ flex: 1 }}>
            <Bar value={p.score} color={statusColor(st)} height={5} />
            <Text style={{ fontSize: 15, fontWeight: "800", color: p.score == null ? colors.textMuted : colors.text, marginTop: 6 }}>{p.score ?? "—"}</Text>
            <Text numberOfLines={1} style={{ fontSize: 9.5, color: colors.textSecondary }}>{p.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

// --- Foco y avisos -----------------------------------------------------------

export function FocusCard({ focus }: { focus: HealthReport["focus"] }) {
  const { colors, card } = useCard();
  if (!focus) {
    return (
      <View style={[card, { flexDirection: "row", alignItems: "center" }]}>
        <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
        <Text style={{ flex: 1, marginLeft: 10, fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
          Nada urgente que mejorar: ninguna métrica puede aportar un salto relevante ahora mismo.
        </Text>
      </View>
    );
  }
  return (
    <View style={[card, { borderColor: "#D97706", borderWidth: 1.5 }]}>
      <Text style={{ fontSize: 11, fontWeight: "700", color: "#D97706", letterSpacing: 0.6 }}>MEJORAR PRIMERO</Text>
      <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text, marginTop: 3 }}>{focus.label}</Text>
      <Text style={{ fontSize: 12.5, color: colors.textSecondary, marginTop: 4, lineHeight: 18 }}>{focus.reason}</Text>
    </View>
  );
}

export function InsightCard({ insight }: { insight: HealthInsight }) {
  const { colors } = useTheme();
  const s = severityStyle(insight.severity);
  return (
    <View style={{ flexDirection: "row", backgroundColor: s.color + "14", borderRadius: radii.card, padding: 12, marginBottom: 8 }}>
      <Ionicons name={s.icon} size={20} color={s.color} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={{ fontSize: 13.5, fontWeight: "700", color: colors.text }}>{insight.title}</Text>
        <Text style={{ fontSize: 12.5, color: colors.textSecondary, marginTop: 3, lineHeight: 18 }}>{insight.body}</Text>
      </View>
    </View>
  );
}

// --- Independencia financiera y palancas ---------------------------------------

export function FiCard({ fi, levers }: { fi: FiProjection | null; levers: HealthLever[] }) {
  const { colors, card } = useCard();
  if (!fi) {
    return (
      <View style={card}>
        <Text style={{ fontSize: 12.5, color: colors.textSecondary }}>Aún no hay suficientes meses para proyectar tu camino.</Text>
      </View>
    );
  }
  return (
    <View style={card}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>{fi.reached ? "Alcanzada" : formatYears(fi.yearsToFi)}</Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>{formatPercent(fi.progressPct / 100, 1)} del objetivo</Text>
      </View>
      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, marginBottom: 8 }}>
        {fi.yearsToFi == null && !fi.reached ? "Con tu ritmo actual no se alcanza" : "hasta tu independencia financiera, a este ritmo"}
      </Text>
      <Bar value={fi.progressPct} color="#2563EB" height={8} />
      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 8, lineHeight: 17 }}>
        Objetivo: {formatEuro(fi.target)} € ({fi.targetMultiple} veces tu gasto anual de {formatEuro(fi.annualExpense)} €). Hoy cuentas con {formatEuro(fi.capital)} €
        {fi.monthsCovered != null ? `, que cubren ${formatMonths(fi.monthsCovered)} de gasto` : ""}. Ahorras unos {formatEuro(fi.monthlySavings)} €/mes y se supone una rentabilidad real del {formatDecimal(fi.realReturnPct, 1)} % anual.
      </Text>

      {levers.length > 0 && (
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.6, marginBottom: 6 }}>QUÉ MÁS TE ACERCA</Text>
          {levers.map((l) => (
            <View key={l.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 5 }}>
              <Ionicons name="flash" size={15} color="#16A34A" />
              <Text style={{ flex: 1, marginLeft: 8, fontSize: 13, color: colors.text }}>{l.label}</Text>
              <Text style={{ fontSize: 13, fontWeight: "800", color: "#16A34A" }}>{formatYears(l.yearsSooner)} antes</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// --- Métricas ----------------------------------------------------------------

export function MetricCard({ metric }: { metric: HealthMetric }) {
  const { colors, card } = useCard();
  const [open, setOpen] = useState(false);
  const color = statusColor(metric.status);
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => setOpen((v) => !v)} style={[card, { marginBottom: 8 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: colors.text }}>{metric.label}</Text>
        <View style={{ backgroundColor: color + "1F", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color }}>{metric.score == null ? STATUS_LABEL.na : `${metric.score} · ${STATUS_LABEL[metric.status]}`}</Text>
        </View>
      </View>
      <View style={{ marginTop: 8 }}><Bar value={metric.score} color={color} /></View>
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
        <Text style={{ flex: 1, fontSize: 12.5, color: colors.textSecondary, lineHeight: 18 }}>{metric.summary}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={14} color={colors.textMuted} style={{ marginLeft: 6 }} />
      </View>
      {open && (
        <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            Valor: <Text style={{ fontWeight: "700", color: colors.text }}>{formatMetricValue(metric)}</Text>
            {"  ·  "}Peso en la nota: <Text style={{ fontWeight: "700", color: colors.text }}>{metric.weight} %</Text>
          </Text>
          {metric.assumption ? <Text style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 5, lineHeight: 16, fontStyle: "italic" }}>{metric.assumption}</Text> : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

// --- Evolución ----------------------------------------------------------------

export function HistoryChart({ history }: { history: HealthHistoryPoint[] }) {
  const { colors, card } = useCard();
  const [width, setWidth] = useState(0);
  const points = history.slice(-12);
  if (points.length < 2) return null;
  const H = 96;
  const rates = points.map((p) => p.savingsRate ?? 0);
  const max = Math.max(0.5, ...rates);
  const min = Math.min(0, ...rates);
  const span = max - min || 1;
  const gap = 6;
  const bw = width > 0 ? (width - gap * (points.length - 1)) / points.length : 0;
  const y = (v: number) => ((max - v) / span) * H;
  const zeroY = y(0);
  const avg = rates.filter((_, i) => points[i].savingsRate != null && !points[i].partial);
  const avgRate = avg.length ? avg.reduce((a, b) => a + b, 0) / avg.length : null;

  return (
    <View style={card}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Svg width={width} height={H + 4}>
            <Line x1={0} x2={width} y1={zeroY} y2={zeroY} stroke={colors.border} strokeWidth={1} />
            {points.map((p, i) => {
              const v = p.savingsRate ?? 0;
              const top = Math.min(y(v), zeroY);
              const h = Math.max(Math.abs(y(v) - zeroY), 1.5);
              return (
                <Rect
                  key={p.key}
                  x={i * (bw + gap)}
                  y={top}
                  width={bw}
                  height={h}
                  rx={3}
                  fill={v < 0 ? "#DC2626" : "#16A34A"}
                  opacity={p.partial ? 0.35 : 1}
                />
              );
            })}
          </Svg>
        )}
      </View>
      <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
        {points.map((p) => (
          <Text key={p.key} style={{ flex: 1, fontSize: 9, textAlign: "center", color: colors.textMuted }}>
            {MONTH_NAMES_SHORT_ES[Number(p.key.slice(5, 7)) - 1]?.slice(0, 3)}
          </Text>
        ))}
      </View>
      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 8 }}>
        Tasa de ahorro mensual{avgRate != null ? ` · media ${formatPercent(avgRate)}` : ""}. El mes en curso (tenue) aún está incompleto.
      </Text>
    </View>
  );
}

// --- Simulador ------------------------------------------------------------------

function Row({ label, before, after, good }: { label: string; before: string; after: string; good: boolean | null }) {
  const { colors } = useTheme();
  // Dos líneas (etiqueta arriba, antes → después debajo): no depende del ancho disponible.
  return (
    <View style={{ paddingVertical: 6 }}>
      <Text style={{ fontSize: 12, color: colors.textSecondary }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2, flexWrap: "wrap" }}>
        <Text style={{ fontSize: 13, color: colors.textMuted }}>{before}</Text>
        <Ionicons name="arrow-forward" size={12} color={colors.textMuted} style={{ marginHorizontal: 8 }} />
        <Text style={{ fontSize: 14, fontWeight: "800", color: good == null ? colors.text : good ? "#16A34A" : "#DC2626" }}>{after}</Text>
      </View>
    </View>
  );
}

export function SimulatorCard() {
  const { colors, card } = useCard();
  const sim = useSimulateHealth();
  const [save, setSave] = useState("");
  const [oneOff, setOneOff] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    const parsed = parseScenarioForm(save, oneOff);
    setError(parsed.error);
    if (!parsed.error) sim.mutate(parsed.body);
  };
  const r: ScenarioResult | undefined = sim.data;
  const input = {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.background,
  } as const;

  return (
    <View style={card}>
      <Text style={{ fontSize: 12.5, color: colors.textSecondary, marginBottom: 10, lineHeight: 18 }}>
        Prueba un cambio y mira cómo se mueve tu situación. No guarda nada.
      </Text>
      <Text style={{ fontSize: 12, fontWeight: "700", color: colors.text, marginBottom: 4 }}>Gastar menos cada mes (€)</Text>
      <TextInput value={save} onChangeText={setSave} placeholder="p. ej. 150" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" style={input} />
      <Text style={{ fontSize: 12, fontWeight: "700", color: colors.text, marginTop: 10, marginBottom: 4 }}>Gasto puntual que saldría de tu dinero líquido (€)</Text>
      <TextInput value={oneOff} onChangeText={setOneOff} placeholder="p. ej. 3000" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" style={input} />
      {error ? <Text style={{ fontSize: 12, color: "#DC2626", marginTop: 8 }}>{error}</Text> : null}
      {sim.isError ? <Text style={{ fontSize: 12, color: "#DC2626", marginTop: 8 }}>No se pudo simular. Inténtalo de nuevo.</Text> : null}
      <TouchableOpacity
        onPress={run}
        disabled={sim.isPending}
        activeOpacity={0.85}
        style={{ marginTop: 12, backgroundColor: colors.primary, borderRadius: radii.input, paddingVertical: 11, alignItems: "center", opacity: sim.isPending ? 0.7 : 1 }}
      >
        {sim.isPending ? <ActivityIndicator color="white" /> : <Text style={{ color: "white", fontWeight: "700", fontSize: 14 }}>Simular</Text>}
      </TouchableOpacity>

      {r && (
        <View style={{ marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Row label="Nota" before={String(r.baseline.score ?? "—")} after={String(r.scenario.score ?? "—")} good={r.delta.score == null || r.delta.score === 0 ? null : r.delta.score > 0} />
          <Row label="Colchón" before={formatMonths(r.baseline.runwayMonths)} after={formatMonths(r.scenario.runwayMonths)} good={r.delta.runwayMonths == null || r.delta.runwayMonths === 0 ? null : r.delta.runwayMonths > 0} />
          <Row label="Independencia financiera" before={formatYears(r.baseline.yearsToFi)} after={formatYears(r.scenario.yearsToFi)} good={r.delta.yearsToFi == null || Math.abs(r.delta.yearsToFi) < 1 / 24 ? null : r.delta.yearsToFi < 0} />
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 6 }}>
            {r.delta.yearsToFi == null || Math.abs(r.delta.yearsToFi) < 1 / 24
              ? "Esto no cambia el plazo de tu independencia financiera."
              : `Llegarías ${formatYearsDelta(r.delta.yearsToFi)} a tu independencia financiera.`}
          </Text>
        </View>
      )}
    </View>
  );
}
