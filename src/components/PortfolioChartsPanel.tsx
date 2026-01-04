import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  Platform,
} from "react-native";
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { textStyles } from "../theme/typography";
import { colors } from "../theme/theme";

export type RangeKey = "1M" | "3M" | "6M" | "1Y" | "ALL";

export type PortfolioTimelinePoint = {
  date: string; // YYYY-MM-DD
  totalCurrentValue?: number; // compat
  equity: number;
  netContributions: number;
};

type TabKey = "value" | "perf" | "contrib" | "dd";

/* -----------------------------
   Formatting (serio)
----------------------------- */
const formatCurrency = (v: number, currency = "EUR") =>
  Number(v || 0).toLocaleString("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatPct = (v: number) =>
  `${Number(v || 0).toFixed(2).replace(".", ",")}%`;

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  // inequívoco, estilo finanzas
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function formatAxisShort(iso: string, range: RangeKey) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (range === "1M") {
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
  }
  return d
    .toLocaleDateString("es-ES", { month: "short" })
    .replace(".", "")
    .toUpperCase();
}

/* -----------------------------
   Range selector (más pro)
----------------------------- */
function SegmentedRange({
  value,
  onChange,
  px,
  fs,
}: {
  value: RangeKey;
  onChange: (v: RangeKey) => void;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  const items: Array<{ key: RangeKey; label: string }> = [
    { key: "1M", label: "1M" },
    { key: "3M", label: "3M" },
    { key: "6M", label: "6M" },
    { key: "1Y", label: "1Y" },
    { key: "ALL", label: "Todo" },
  ];

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: "rgba(15,23,42,0.06)",
        padding: px(3),
        borderRadius: px(10),
        height: px(36),
      }}
    >
      {items.map((x) => {
        const active = value === x.key;
        return (
          <TouchableOpacity
            key={x.key}
            activeOpacity={0.9}
            onPress={() => onChange(x.key)}
            style={{
              paddingHorizontal: px(12),
              alignItems: "center",
              justifyContent: "center",
              borderRadius: px(8),
              backgroundColor: active ? "white" : "transparent",
              borderWidth: active ? 1 : 0,
              borderColor: active ? "rgba(15,23,42,0.12)" : "transparent",
            }}
          >
            <Text
              style={[
                textStyles.label,
                {
                  fontSize: fs(12),
                  fontWeight: active ? "900" : "800",
                  color: active ? "#0F172A" : "#64748B",
                },
              ]}
            >
              {x.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* -----------------------------
   Tabs (enterprise)
   - underline style
----------------------------- */
function ProTabs({
  value,
  onChange,
  px,
  fs,
}: {
  value: TabKey;
  onChange: (v: TabKey) => void;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  const items: Array<{ key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { key: "value", label: "Valor", icon: "stats-chart-outline" },
    { key: "perf", label: "Rentabilidad", icon: "trending-up-outline" },
    { key: "contrib", label: "Aportaciones", icon: "add-circle-outline" },
    { key: "dd", label: "Drawdown", icon: "pulse-outline" },
  ];

  return (
    <View style={{ flexDirection: "row", gap: px(18), flexWrap: "wrap" }}>
      {items.map((it) => {
        const active = value === it.key;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: px(8),
              paddingVertical: px(8),
              borderBottomWidth: px(2),
              borderBottomColor: active ? colors.primary : "transparent",
              opacity: active ? 1 : 0.75,
            }}
          >
            <Ionicons
              name={it.icon}
              size={px(16)}
              color={active ? colors.primary : "#64748B"}
            />
            <Text
              style={[
                textStyles.button,
                {
                  fontSize: fs(12),
                  fontWeight: active ? "900" : "800",
                  color: active ? "#0F172A" : "#64748B",
                },
              ]}
            >
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* -----------------------------
   Chart helpers
----------------------------- */
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

function buildPath(points: number[], xAt: (i: number) => number, yAt: (v: number) => number) {
  return points
    .map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(2)} ${yAt(v).toFixed(2)}`)
    .join(" ");
}

/* -----------------------------
   Multi-line interactive chart (serio)
   - Equity + Contributions
   - Tooltip con 2 valores + Profit
----------------------------- */
function InteractiveDualLineChart({
  points,
  height,
  accent = colors.primary,
  secondary = "#64748B",
  currency = "EUR",
}: {
  points: Array<{ date: string; equity: number; netContributions: number }>;
  height: number;
  accent?: string;
  secondary?: string;
  currency?: string;
}) {
  const W = 1000;
  const H = 300;
  const PAD_X = 28;
  const PAD_Y = 22;

  const equityVals = points.map((p) => Number(p.equity || 0));
  const contribVals = points.map((p) => Number(p.netContributions || 0));
  const allVals = [...equityVals, ...contribVals];

  const minY = Math.min(...allVals);
  const maxY = Math.max(...allVals);
  const denom = maxY - minY || 1;

  const xAt = (i: number) => {
    if (points.length <= 1) return PAD_X;
    const w = W - PAD_X * 2;
    return PAD_X + (i / (points.length - 1)) * w;
  };

  const yAt = (v: number) => {
    const h = H - PAD_Y * 2;
    const t = (v - minY) / denom;
    return PAD_Y + (1 - t) * h;
  };

  const dEquity = buildPath(equityVals, xAt, yAt);
  const dContrib = buildPath(contribVals, xAt, yAt);

  // Hover state
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ left: number; top: number } | null>(null);
  const [layoutW, setLayoutW] = useState<number>(0);

  const indexFromClientX = (clientX: number) => {
    if (!layoutW || points.length <= 1) return 0;
    const xSvg = (clientX / layoutW) * W;
    const minX = PAD_X;
    const maxX = W - PAD_X;
    const t = clamp((xSvg - minX) / (maxX - minX), 0, 1);
    return clamp(Math.round(t * (points.length - 1)), 0, points.length - 1);
  };

  const onMove = (clientX: number, clientY: number) => {
    const idx = indexFromClientX(clientX);
    setActiveIdx(idx);
    setTooltip({ left: clientX, top: clientY });
  };

  const clear = () => {
    setActiveIdx(null);
    setTooltip(null);
  };

  const active = activeIdx != null ? points[activeIdx] : null;
  const activeX = activeIdx != null ? xAt(activeIdx) : null;
  const activeYE = active ? yAt(active.equity) : null;
  const activeYC = active ? yAt(active.netContributions) : null;

  // Tooltip layout: flip izquierdo si se va del borde
  const TIP_W = 220;
  const TIP_H = 74;

  const tooltipLeft = tooltip
    ? (() => {
        const preferRight = tooltip.left + 14;
        const flipLeft = tooltip.left - TIP_W - 14;
        const left = preferRight + TIP_W > (layoutW || 0) ? flipLeft : preferRight;
        return clamp(left, 8, Math.max(8, (layoutW || 0) - TIP_W - 8));
      })()
    : 0;

  const tooltipTop = tooltip ? clamp(tooltip.top - TIP_H - 10, 8, Math.max(8, height - TIP_H - 8)) : 0;

  const profit = active ? active.equity - active.netContributions : 0;

  return (
    <View
      style={{ width: "100%", height, position: "relative" }}
      onLayout={(e) => setLayoutW(e.nativeEvent.layout.width)}
      {...(Platform.OS === "web"
        ? ({
            onMouseMove: (e: any) => {
              const rect = e.currentTarget.getBoundingClientRect();
              onMove(e.clientX - rect.left, e.clientY - rect.top);
            },
            onMouseLeave: clear,
          } as any)
        : ({
            onStartShouldSetResponder: () => true,
            onMoveShouldSetResponder: () => true,
            onResponderGrant: (e: any) => onMove(e.nativeEvent.locationX, e.nativeEvent.locationY),
            onResponderMove: (e: any) => onMove(e.nativeEvent.locationX, e.nativeEvent.locationY),
            onResponderRelease: clear,
          } as any))} 
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={accent} stopOpacity="0.16" />
            <Stop offset="100%" stopColor={accent} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* subtle grid (solo 2 líneas) */}
        <Path d={`M ${PAD_X} ${PAD_Y} L ${W - PAD_X} ${PAD_Y}`} stroke="#EEF2F7" strokeWidth="2" />
        <Path d={`M ${PAD_X} ${H - PAD_Y} L ${W - PAD_X} ${H - PAD_Y}`} stroke="#EEF2F7" strokeWidth="2" />

        {/* area equity */}
        {points.length >= 2 && (
          <Path
            d={`${dEquity} L ${xAt(points.length - 1).toFixed(2)} ${(H - PAD_Y).toFixed(2)} L ${PAD_X} ${(H - PAD_Y).toFixed(2)} Z`}
            fill="url(#equityFill)"
          />
        )}

        {/* contributions (secondary) */}
        <Path
          d={dContrib}
          fill="none"
          stroke={secondary}
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.75"
        />

        {/* equity (primary) */}
        <Path
          d={dEquity}
          fill="none"
          stroke={accent}
          strokeWidth="5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* hover marker */}
        {activeIdx != null && activeX != null && activeYE != null && (
          <>
            {/* crosshair */}
            <Path
              d={`M ${activeX.toFixed(2)} ${PAD_Y} L ${activeX.toFixed(2)} ${(H - PAD_Y).toFixed(2)}`}
              stroke="rgba(15,23,42,0.18)"
              strokeWidth="2"
            />

            {/* equity point */}
            <Circle cx={activeX} cy={activeYE} r="5.5" fill={accent} />
            <Circle cx={activeX} cy={activeYE} r="10" fill={accent} opacity="0.10" />

            {/* contrib point (más discreto) */}
            {activeYC != null && (
              <>
                <Circle cx={activeX} cy={activeYC} r="4" fill={secondary} opacity="0.95" />
              </>
            )}
          </>
        )}
      </Svg>

      {/* Tooltip (enterprise) */}
      {activeIdx != null && tooltip && active && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: tooltipLeft,
            top: tooltipTop,
            width: TIP_W,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "rgba(15,23,42,0.10)",
            backgroundColor: "white",
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 },
          }}
        >
          <Text
            style={[
              textStyles.caption,
              { fontSize: 11, fontWeight: "900", color: "#64748B", letterSpacing: 0.2 },
            ]}
            numberOfLines={1}
          >
            {formatDateLabel(active.date)}
          </Text>

          <View style={{ marginTop: 8, gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={[textStyles.caption, { fontSize: 11, fontWeight: "800", color: "#64748B" }]}>
                Equity
              </Text>
              <Text style={[textStyles.number, { fontSize: 12, fontWeight: "900", color: "#0F172A" }]}>
                {formatCurrency(active.equity, currency)}
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={[textStyles.caption, { fontSize: 11, fontWeight: "800", color: "#64748B" }]}>
                Aportado
              </Text>
              <Text style={[textStyles.number, { fontSize: 12, fontWeight: "900", color: "#0F172A" }]}>
                {formatCurrency(active.netContributions, currency)}
              </Text>
            </View>

            <View style={{ height: 1, backgroundColor: "rgba(15,23,42,0.06)", marginTop: 2 }} />

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={[textStyles.caption, { fontSize: 11, fontWeight: "900", color: "#0F172A" }]}>
                Profit
              </Text>
              <Text
                style={[
                  textStyles.number,
                  {
                    fontSize: 12,
                    fontWeight: "900",
                    color: profit >= 0 ? "#16A34A" : "#DC2626",
                  },
                ]}
              >
                {formatCurrency(profit, currency)}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

/* -----------------------------
   Single-line interactive chart (perf, contrib, dd)
   - Tooltip serio
----------------------------- */
function InteractiveSingleLineChart({
  points,
  height,
  accent,
  formatValue,
}: {
  points: Array<{ date: string; value: number }>;
  height: number;
  accent: string;
  formatValue: (v: number) => string;
}) {
  const W = 1000;
  const H = 300;
  const PAD_X = 28;
  const PAD_Y = 22;

  const vals = points.map((p) => Number(p.value || 0));
  const minY = Math.min(...vals);
  const maxY = Math.max(...vals);
  const denom = maxY - minY || 1;

  const xAt = (i: number) => {
    if (points.length <= 1) return PAD_X;
    const w = W - PAD_X * 2;
    return PAD_X + (i / (points.length - 1)) * w;
  };

  const yAt = (v: number) => {
    const h = H - PAD_Y * 2;
    const t = (v - minY) / denom;
    return PAD_Y + (1 - t) * h;
  };

  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(2)} ${yAt(Number(p.value || 0)).toFixed(2)}`)
    .join(" ");

  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ left: number; top: number } | null>(null);
  const [layoutW, setLayoutW] = useState<number>(0);

  const indexFromClientX = (clientX: number) => {
    if (!layoutW || points.length <= 1) return 0;
    const xSvg = (clientX / layoutW) * W;
    const minX = PAD_X;
    const maxX = W - PAD_X;
    const t = clamp((xSvg - minX) / (maxX - minX), 0, 1);
    return clamp(Math.round(t * (points.length - 1)), 0, points.length - 1);
  };

  const onMove = (clientX: number, clientY: number) => {
    const idx = indexFromClientX(clientX);
    setActiveIdx(idx);
    setTooltip({ left: clientX, top: clientY });
  };

  const clear = () => {
    setActiveIdx(null);
    setTooltip(null);
  };

  const active = activeIdx != null ? points[activeIdx] : null;
  const activeX = activeIdx != null ? xAt(activeIdx) : null;
  const activeY = active ? yAt(active.value) : null;

  const TIP_W = 170;
  const TIP_H = 48;

  const tooltipLeft = tooltip
    ? (() => {
        const preferRight = tooltip.left + 14;
        const flipLeft = tooltip.left - TIP_W - 14;
        const left = preferRight + TIP_W > (layoutW || 0) ? flipLeft : preferRight;
        return clamp(left, 8, Math.max(8, (layoutW || 0) - TIP_W - 8));
      })()
    : 0;

  const tooltipTop = tooltip ? clamp(tooltip.top - TIP_H - 10, 8, Math.max(8, height - TIP_H - 8)) : 0;

  return (
    <View
      style={{ width: "100%", height, position: "relative" }}
      onLayout={(e) => setLayoutW(e.nativeEvent.layout.width)}
      {...(Platform.OS === "web"
        ? ({
            onMouseMove: (e: any) => {
              const rect = e.currentTarget.getBoundingClientRect();
              onMove(e.clientX - rect.left, e.clientY - rect.top);
            },
            onMouseLeave: clear,
          } as any)
        : ({
            onStartShouldSetResponder: () => true,
            onMoveShouldSetResponder: () => true,
            onResponderGrant: (e: any) => onMove(e.nativeEvent.locationX, e.nativeEvent.locationY),
            onResponderMove: (e: any) => onMove(e.nativeEvent.locationX, e.nativeEvent.locationY),
            onResponderRelease: clear,
          } as any))}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
        <Path d={`M ${PAD_X} ${PAD_Y} L ${W - PAD_X} ${PAD_Y}`} stroke="#EEF2F7" strokeWidth="2" />
        <Path d={`M ${PAD_X} ${H - PAD_Y} L ${W - PAD_X} ${H - PAD_Y}`} stroke="#EEF2F7" strokeWidth="2" />

        <Path d={d} fill="none" stroke={accent} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />

        {activeIdx != null && activeX != null && activeY != null && (
          <>
            <Path
              d={`M ${activeX.toFixed(2)} ${PAD_Y} L ${activeX.toFixed(2)} ${(H - PAD_Y).toFixed(2)}`}
              stroke="rgba(15,23,42,0.18)"
              strokeWidth="2"
            />
            <Circle cx={activeX} cy={activeY} r="5.5" fill={accent} />
            <Circle cx={activeX} cy={activeY} r="10" fill={accent} opacity="0.10" />
          </>
        )}
      </Svg>

      {activeIdx != null && tooltip && active && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: tooltipLeft,
            top: tooltipTop,
            width: TIP_W,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "rgba(15,23,42,0.10)",
            backgroundColor: "white",
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 },
          }}
        >
          <Text style={[textStyles.caption, { fontSize: 11, fontWeight: "900", color: "#64748B" }]} numberOfLines={1}>
            {formatDateLabel(active.date)}
          </Text>
          <Text style={[textStyles.number, { marginTop: 6, fontSize: 12, fontWeight: "900", color: "#0F172A" }]} numberOfLines={1}>
            {formatValue(active.value)}
          </Text>
        </View>
      )}
    </View>
  );
}

/* -----------------------------
   Panel
----------------------------- */
export default function PortfolioChartsPanel({
  points,
  loading,
  range,
  onRangeChange,
  px,
  fs,
  chartHeight,
}: {
  points: PortfolioTimelinePoint[];
  loading: boolean;
  range: RangeKey;
  onRangeChange: (rk: RangeKey) => void;
  px: (n: number) => number;
  fs: (n: number) => number;
  chartHeight: number;
}) {
  const [tab, setTab] = useState<TabKey>("value");

  const safe = useMemo(() => {
    return (points || []).map((p) => ({
      date: p.date,
      equity: Number(p.equity ?? p.totalCurrentValue ?? 0),
      netContributions: Number(p.netContributions ?? 0),
    }));
  }, [points]);

  const labels = useMemo(() => safe.map((p) => formatAxisShort(p.date, range)), [safe, range]);

  // KPI header values (último punto)
  const last = safe[safe.length - 1];
  const lastProfit = last ? last.equity - last.netContributions : 0;

  // Perf (simple robusta): profit relativo al baseline
  const perfSeries = useMemo(() => {
    if (safe.length === 0) return [];
    const profit = safe.map((p) => p.equity - p.netContributions);
    const p0 = profit[0] ?? 0;
    const baseline = Math.max(1, Math.abs(p0), safe[0]?.equity || 0);
    return safe.map((p, i) => ({ date: p.date, value: ((profit[i] - p0) / baseline) * 100 }));
  }, [safe]);

  const contribSeries = useMemo(() => safe.map((p) => ({ date: p.date, value: p.netContributions })), [safe]);

  const drawdownSeries = useMemo(() => {
    let peak = -Infinity;
    return safe.map((p) => {
      peak = Math.max(peak, p.equity);
      const dd = peak > 0 ? ((p.equity - peak) / peak) * 100 : 0; // <= 0
      return { date: p.date, value: dd };
    });
  }, [safe]);

  const canDraw = !loading && safe.length >= 2;

  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: px(14),
        borderWidth: 1,
        borderColor: "rgba(15,23,42,0.08)",
        padding: px(16),
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowRadius: px(12),
        shadowOffset: { width: 0, height: px(8) },
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: px(14), flexWrap: "wrap" }}>
        <View style={{ flex: 1, minWidth: px(320) }}>
          <Text style={[textStyles.labelMuted, { fontSize: fs(12), letterSpacing: 0.2 }]}>
            Evolución del portfolio
          </Text>

          {/* KPI strip (serio, discreto) */}
          {last && (
            <View style={{ marginTop: px(8), flexDirection: "row", gap: px(14), flexWrap: "wrap" }}>
              <View>
                <Text style={[textStyles.caption, { fontSize: fs(11), fontWeight: "800", color: "#64748B" }]}>Equity</Text>
                <Text style={[textStyles.number, { fontSize: fs(13), fontWeight: "900", color: "#0F172A", marginTop: 2 }]}>
                  {formatCurrency(last.equity)}
                </Text>
              </View>
              <View>
                <Text style={[textStyles.caption, { fontSize: fs(11), fontWeight: "800", color: "#64748B" }]}>Aportado</Text>
                <Text style={[textStyles.number, { fontSize: fs(13), fontWeight: "900", color: "#0F172A", marginTop: 2 }]}>
                  {formatCurrency(last.netContributions)}
                </Text>
              </View>
              <View>
                <Text style={[textStyles.caption, { fontSize: fs(11), fontWeight: "800", color: "#64748B" }]}>Profit</Text>
                <Text style={[textStyles.number, { fontSize: fs(13), fontWeight: "900", color: lastProfit >= 0 ? "#16A34A" : "#DC2626", marginTop: 2 }]}>
                  {formatCurrency(lastProfit)}
                </Text>
              </View>
            </View>
          )}

          <View style={{ marginTop: px(10) }}>
            <ProTabs value={tab} onChange={setTab} px={px} fs={fs} />
          </View>
        </View>

        <SegmentedRange value={range} onChange={onRangeChange} px={px} fs={fs} />
      </View>

      {/* Chart */}
      <View style={{ marginTop: px(14), height: chartHeight, justifyContent: "center" }}>
        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : safe.length < 2 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={[textStyles.bodyMuted, { fontSize: fs(12), fontWeight: "800", color: "#94A3B8" }]}>
              Añade valoraciones y operaciones para ver la evolución.
            </Text>
          </View>
        ) : (
          <>
            {tab === "value" && (
              <InteractiveDualLineChart
                points={safe}
                height={chartHeight}
                accent={colors.primary}
                secondary="#64748B"
                currency="EUR"
              />
            )}

            {tab === "perf" && (
              <InteractiveSingleLineChart
                points={perfSeries}
                height={chartHeight}
                accent={colors.primary}
                formatValue={(v) => formatPct(v)}
              />
            )}

            {tab === "contrib" && (
              <InteractiveSingleLineChart
                points={contribSeries}
                height={chartHeight}
                accent="#64748B"
                formatValue={(v) => formatCurrency(v)}
              />
            )}

            {tab === "dd" && (
              <InteractiveSingleLineChart
                points={drawdownSeries}
                height={chartHeight}
                accent="#DC2626"
                formatValue={(v) => formatPct(v)}
              />
            )}
          </>
        )}
      </View>

      {/* Axis extremes */}
      {canDraw && labels.length > 0 && (
        <View style={{ marginTop: px(10), flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={[textStyles.caption, { fontSize: fs(11), color: "#94A3B8", fontWeight: "800" }]}>
            {labels[0]}
          </Text>
          <Text style={[textStyles.caption, { fontSize: fs(11), color: "#94A3B8", fontWeight: "800" }]}>
            {labels[labels.length - 1]}
          </Text>
        </View>
      )}
    </View>
  );
}
