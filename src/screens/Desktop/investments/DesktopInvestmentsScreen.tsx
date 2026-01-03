// src/screens/Investments/DesktopInvestmentsScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { G, Path, Circle, Polyline, Rect } from "react-native-svg";
import { colors } from "../../../theme/theme";
import api from "../../../api/api";

type InvestmentAssetType = "crypto" | "etf" | "stock" | "fund" | "custom";

interface SummaryAssetFromApi {
  id: number;
  name: string;
  symbol?: string | null;
  type: InvestmentAssetType;
  currency: string;
  invested: number;
  currentValue: number;
  pnl: number;
  lastValuationDate: string | null;
}

interface SummaryFromApi {
  totalInvested: number;
  totalCurrentValue: number;
  totalPnL: number;
  assets: SummaryAssetFromApi[];
}

type PortfolioTimelinePoint = {
  date: string; // YYYY-MM-DD
  totalCurrentValue: number;
};

type RangeKey = "1M" | "3M" | "6M" | "1Y" | "ALL";

const rangeToDays: Record<RangeKey, number> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  ALL: 365,
};

const palette = [
  "#2563EB",
  "#16A34A",
  "#F59E0B",
  "#DC2626",
  "#7C3AED",
  "#0EA5E9",
  "#10B981",
  "#F97316",
  "#EC4899",
  "#64748B",
];

const formatMoney = (n: number, currency = "EUR") =>
  (Number.isFinite(n) ? n : 0).toLocaleString("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatPct = (pnl: number, invested: number) => {
  if (!invested) return "0,0%";
  return `${((pnl / invested) * 100).toFixed(1).replace(".", ",")}%`;
};

const formatShortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const typeLabel = (t: InvestmentAssetType) => {
  switch (t) {
    case "crypto":
      return "Crypto";
    case "etf":
      return "ETF";
    case "stock":
      return "Acción";
    case "fund":
      return "Fondo";
    default:
      return "Custom";
  }
};

const assetTypeIcon = (type: InvestmentAssetType) => {
  switch (type) {
    case "crypto":
      return "logo-bitcoin";
    case "stock":
      return "trending-up-outline";
    case "etf":
      return "layers-outline";
    case "fund":
      return "pie-chart-outline";
    default:
      return "briefcase-outline";
  }
};

const pnlTone = (pnl: number) => {
  if (pnl > 0) return "success";
  if (pnl < 0) return "danger";
  return "neutral";
};

// --------------------
// Dashboard-like UI pieces
// --------------------
function StatCard({
  title,
  value,
  icon,
  tone = "neutral",
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: "neutral" | "success" | "danger" | "info";
}) {
  const paletteTone = {
    neutral: { accent: colors.primary, icon: "#0F172A" },
    success: { accent: "#22C55E", icon: "#16A34A" },
    danger: { accent: "#EF4444", icon: "#DC2626" },
    info: { accent: "#3B82F6", icon: "#2563EB" },
  }[tone];

  return (
    <View
      style={{
        flex: 1,
        minWidth: 230,
        backgroundColor: "white",
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        overflow: "hidden",
      }}
    >
      <View style={{ height: 6, backgroundColor: paletteTone.accent }} />
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 11, fontWeight: "900", color: "#94A3B8" }}>{title}</Text>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(15,23,42,0.04)",
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            <Ionicons name={icon} size={18} color={paletteTone.icon} />
          </View>
        </View>

        <Text style={{ marginTop: 10, fontSize: 18, fontWeight: "900", color: "#0F172A" }} numberOfLines={1}>
          {value}
        </Text>

        {!!subtitle && (
          <Text style={{ marginTop: 4, fontSize: 11, fontWeight: "700", color: "#64748B" }} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
}

function SectionCard({
  title,
  right,
  children,
  noPadding,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: noPadding ? 0 : 16,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          paddingHorizontal: noPadding ? 16 : 0,
          paddingTop: noPadding ? 16 : 0,
          paddingBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: "900", color: "#94A3B8" }}>{title}</Text>
        {!!right && <View>{right}</View>}
      </View>
      <View style={{ paddingHorizontal: noPadding ? 16 : 0, paddingBottom: noPadding ? 16 : 0 }}>{children}</View>
    </View>
  );
}

function SegmentedRange({ value, onChange }: { value: RangeKey; onChange: (v: RangeKey) => void }) {
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
        padding: 4,
        borderRadius: 18,
        height: 44,
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
              paddingHorizontal: 12,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              backgroundColor: active ? "rgba(15,23,42,0.10)" : "transparent",
            }}
          >
            <Text style={{ fontWeight: "900", fontSize: 12, color: active ? "#0F172A" : "#64748B" }}>{x.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// --------------------
// Simple line chart
// --------------------
function MiniLineChart({
  points,
  width,
  height,
}: {
  points: PortfolioTimelinePoint[];
  width: number;
  height: number;
}) {
  const PAD = 12;
  const w = Math.max(1, width - PAD * 2);
  const h = Math.max(1, height - PAD * 2);

  const ys = points.map((p) => Number(p.totalCurrentValue || 0));
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const denom = maxY - minY || 1;

  const xAt = (i: number) => PAD + (points.length <= 1 ? 0 : (i / (points.length - 1)) * w);
  const yAt = (v: number) => PAD + (1 - (v - minY) / denom) * h;

  const poly = points
    .map((p, i) => `${xAt(i).toFixed(2)},${yAt(Number(p.totalCurrentValue || 0)).toFixed(2)}`)
    .join(" ");

  const last = points[points.length - 1];

  return (
    <Svg width={width} height={height}>
      <Rect x={0} y={0} width={width} height={height} rx={18} ry={18} fill="#FFFFFF" />
      <Path
        d={`M ${PAD} ${(PAD + h * 0.33).toFixed(2)} L ${(PAD + w).toFixed(2)} ${(PAD + h * 0.33).toFixed(2)}`}
        stroke="#F1F5F9"
        strokeWidth={1}
      />
      <Path
        d={`M ${PAD} ${(PAD + h * 0.66).toFixed(2)} L ${(PAD + w).toFixed(2)} ${(PAD + h * 0.66).toFixed(2)}`}
        stroke="#F1F5F9"
        strokeWidth={1}
      />
      <Polyline
        points={poly}
        fill="none"
        stroke={colors.primary}
        strokeWidth={3}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Circle cx={xAt(points.length - 1)} cy={yAt(Number(last.totalCurrentValue || 0))} r={5} fill={colors.primary} />
    </Svg>
  );
}

// --------------------
// Simple donut (allocation)
// --------------------
type DonutSlice = { id: number; label: string; value: number; pct: number; color: string };

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
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(
    2
  )} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
};

function DonutSimple({
  slices,
  size,
  strokeWidth,
}: {
  slices: DonutSlice[];
  size: number;
  strokeWidth: number;
}) {
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

            if (sweep <= 0.2) {
              accDeg += sweep;
              return null;
            }

            const segStart = startAt + accDeg;
            const segEnd = startAt + accDeg + sweep;
            accDeg += sweep;

            const d = describeArc(cx, cy, r, segStart, segEnd);

            return <Path key={s.id} d={d} stroke={s.color} strokeWidth={strokeWidth} strokeLinecap="butt" fill="none" />;
          })}
        </G>
      </Svg>
    </View>
  );
}

// --------------------
// Table helpers
// --------------------
function Th({
  label,
  align = "left",
  width,
  minWidth,
}: {
  label: string;
  align?: "left" | "right" | "center";
  width?: number | string;
  minWidth?: number;
}) {
  return (
    <View
      style={{
        width,
        minWidth,
        justifyContent: "center",
        paddingVertical: 10,
        paddingHorizontal: 12,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "900", color: "#94A3B8", textAlign: align }}>{label}</Text>
    </View>
  );
}

function Td({
  children,
  align = "left",
  width,
  minWidth,
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
  width?: number | string;
  minWidth?: number;
}) {
  return (
    <View
      style={{
        width,
        minWidth,
        justifyContent: "center",
        paddingVertical: 12,
        paddingHorizontal: 12,
      }}
    >
      <View style={{ alignItems: align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start" }}>
        {children}
      </View>
    </View>
  );
}

export default function DesktopInvestmentsScreen({ navigation }: any) {
  const [summary, setSummary] = useState<SummaryFromApi | null>(null);
  const [loading, setLoading] = useState(true);

  const [timeline, setTimeline] = useState<PortfolioTimelinePoint[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(true);

  const [range, setRange] = useState<RangeKey>("ALL");
  const [query, setQuery] = useState("");

  const currency = "EUR";

  const fetchSummary = async () => {
    const res = await api.get("/investments/summary");
    setSummary(res.data || null);
  };

  const fetchTimeline = async (rk: RangeKey) => {
    const days = rangeToDays[rk];
    const res = await api.get(`/investments/timeline?days=${days}`);
    setTimeline(res.data?.points || []);
  };

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setTimelineLoading(true);
      await Promise.all([fetchSummary(), fetchTimeline(range)]);
    } catch (e) {
      console.error("❌ Error cargando investments desktop:", e);
      setSummary(null);
      setTimeline([]);
    } finally {
      setLoading(false);
      setTimelineLoading(false);
    }
  }, [range]);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll])
  );

  useEffect(() => {
    fetchAll();
  }, [range, fetchAll]);

  const hero = useMemo(() => {
    const totalInvested = summary?.totalInvested || 0;
    const totalCurrentValue = summary?.totalCurrentValue || 0;
    const totalPnL = summary?.totalPnL || 0;

    const lastGlobal =
      (summary?.assets || [])
        .map((a) => a.lastValuationDate)
        .filter(Boolean)
        .sort((a: any, b: any) => new Date(b).getTime() - new Date(a).getTime())[0] || null;

    return { totalInvested, totalCurrentValue, totalPnL, lastGlobal };
  }, [summary]);

  const assets = useMemo(() => {
    const list = summary?.assets || [];
    const q = query.trim().toLowerCase();
    const filtered = !q ? list : list.filter((a) => `${a.name} ${a.symbol || ""}`.toLowerCase().includes(q));
    return [...filtered].sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0));
  }, [summary, query]);

  const allocation = useMemo(() => {
    const list = summary?.assets || [];
    const total = list.reduce((s, a) => s + (a.currentValue || 0), 0);
    if (!total) return { total: 0, slices: [] as DonutSlice[] };

    const slices = list
      .map((a, idx) => ({
        id: a.id,
        label: a.name,
        value: a.currentValue || 0,
        pct: (a.currentValue || 0) / total,
        color: palette[idx % palette.length],
      }))
      .filter((s) => s.pct > 0)
      .sort((a, b) => b.value - a.value);

    return { total, slices: slices.slice(0, 8) };
  }, [summary]);

  // Layout
  const { width } = Dimensions.get("window");
  const WIDE = width >= 1100;

  // Make the top row breathe; chart uses all available width on left.
  const leftW = WIDE ? Math.min(900, width - 18 * 2 - 420 - 12) : Math.max(320, width - 36);
  const chartW = leftW;
  const chartH = 240;

  const donutSize = 180;
  const donutStroke = 16;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background ?? "#F8FAFC" }}>
      {/* TOP (fixed) */}
      <View style={{ padding: 18, paddingBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <View>
            <Text style={{ fontSize: 18, fontWeight: "900", color: "#0F172A" }}>Controla todas tus inversiones</Text>
            <Text style={{ marginTop: 3, fontSize: 12, fontWeight: "700", color: "#64748B" }}>
              {hero.lastGlobal ? `Última valoración: ${formatShortDate(hero.lastGlobal)}` : "—"}
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => navigation.navigate("InvestmentForm")}
              style={{
                height: 40,
                paddingHorizontal: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                backgroundColor: "white",
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ionicons name="add-outline" size={18} color={colors.primary} />
              <Text style={{ fontSize: 12, fontWeight: "900", color: "#0F172A" }}>Nueva</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => navigation.navigate("InvestmentValuation")}
              style={{
                height: 40,
                paddingHorizontal: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                backgroundColor: "white",
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={{ fontSize: 12, fontWeight: "900", color: "#0F172A" }}>Valorar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={fetchAll}
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                backgroundColor: "white",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="refresh-outline" size={18} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <StatCard
            title="VALOR ACTUAL"
            value={loading ? "—" : formatMoney(hero.totalCurrentValue, currency)}
            subtitle="Total del portfolio"
            icon="wallet-outline"
            tone="neutral"
          />
          <StatCard
            title="INVERTIDO"
            value={loading ? "—" : formatMoney(hero.totalInvested, currency)}
            subtitle="Capital aportado"
            icon="add-circle-outline"
            tone="info"
          />
          <StatCard
            title="RESULTADO"
            value={loading ? "—" : formatMoney(hero.totalPnL, currency)}
            subtitle={loading ? "" : `Rentabilidad: ${formatPct(hero.totalPnL, hero.totalInvested)}`}
            icon="stats-chart-outline"
            tone={pnlTone(hero.totalPnL) as any}
          />
          <StatCard
            title="ASSETS"
            value={loading ? "—" : String(summary?.assets?.length || 0)}
            subtitle="Número de posiciones"
            icon="briefcase-outline"
            tone="neutral"
          />
        </View>
      </View>

      {/* SCROLL */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 90 }}>
        {/* TOP ROW: chart + donut */}
        <View style={{ flexDirection: WIDE ? "row" : "column", gap: 12 }}>
          <View style={{ flex: 1, minWidth: WIDE ? 720 : undefined, gap: 12 }}>
            <SectionCard title="Evolución del portfolio" right={<SegmentedRange value={range} onChange={setRange} />}>
              {timelineLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : timeline.length < 2 ? (
                <Text style={{ fontSize: 12, fontWeight: "800", color: "#94A3B8" }}>Añade valoraciones para ver la evolución.</Text>
              ) : (
                <View style={{ borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "#E5E7EB" }}>
                  <MiniLineChart points={timeline} width={chartW} height={chartH} />
                </View>
              )}

              {timeline.length > 0 && (
                <View style={{ marginTop: 10, flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: "#94A3B8" }}>{timeline[0]?.date}</Text>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: "#94A3B8" }}>{timeline[timeline.length - 1]?.date}</Text>
                </View>
              )}
            </SectionCard>
          </View>

          <View style={{ width: WIDE ? 420 : "100%", gap: 12 }}>
            <SectionCard title="Distribución (top 8)">
              {loading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : allocation.slices.length === 0 ? (
                <Text style={{ fontSize: 12, fontWeight: "800", color: "#94A3B8" }}>Sin datos.</Text>
              ) : (
                <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
                  <DonutSimple slices={allocation.slices} size={donutSize} strokeWidth={donutStroke} />
                  <View style={{ flex: 1 }}>
                    {allocation.slices.map((s, idx) => (
                      <View
                        key={s.id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingVertical: 10,
                          borderTopWidth: idx === 0 ? 0 : 1,
                          borderTopColor: "#E5E7EB",
                          gap: 10,
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                          <View style={{ width: 10, height: 10, borderRadius: 6, backgroundColor: s.color }} />
                          <Text style={{ fontSize: 12, fontWeight: "900", color: "#0F172A", flex: 1 }} numberOfLines={1}>
                            {s.label}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 12, fontWeight: "900", color: "#0F172A" }}>{(s.pct * 100).toFixed(1)}%</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </SectionCard>
          </View>
        </View>

        {/* FULL-WIDTH ASSETS TABLE (below, spans all width) */}
        <View style={{ marginTop: 12 }}>
          <SectionCard
            title="Assets"
            right={
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View
                  style={{
                    height: 34,
                    width: 320,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    backgroundColor: "white",
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 10,
                    gap: 8,
                  }}
                >
                  <Ionicons name="search-outline" size={16} color="#64748B" />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Buscar por nombre o símbolo..."
                    placeholderTextColor="#94A3B8"
                    style={{ flex: 1, fontSize: 13, fontWeight: "700", color: "#0F172A" }}
                  />
                  {!!query && (
                    <TouchableOpacity activeOpacity={0.9} onPress={() => setQuery("")}>
                      <Ionicons name="close-circle" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate("InvestmentForm")}
                  style={{
                    height: 34,
                    paddingHorizontal: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    backgroundColor: "#F8FAFC",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Ionicons name="add-outline" size={16} color={colors.primary} />
                  <Text style={{ fontSize: 12, fontWeight: "900", color: colors.primary }}>Añadir</Text>
                </TouchableOpacity>
              </View>
            }
            noPadding
          >
            {loading ? (
              <View style={{ paddingVertical: 18 }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : assets.length === 0 ? (
              <View style={{ padding: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: "#94A3B8" }}>No hay assets todavía.</Text>
              </View>
            ) : (
              <>
                {/* Horizontal scroll for many columns */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ minWidth: 1100 }}>
                    {/* Header */}
                    <View
                      style={{
                        flexDirection: "row",
                        borderTopWidth: 1,
                        borderTopColor: "#E5E7EB",
                        borderBottomWidth: 1,
                        borderBottomColor: "#E5E7EB",
                        backgroundColor: "#F8FAFC",
                      }}
                    >
                      <Th label="ASSET" width={340} />
                      <Th label="VALOR ACTUAL" align="right" width={160} />
                      <Th label="INVERTIDO" align="right" width={150} />
                      <Th label="P/L" align="right" width={150} />
                      <Th label="% P/L" align="right" width={110} />
                      <Th label="PESO" align="right" width={90} />
                    </View>

                    {/* Rows */}
                    {assets.map((a, idx) => {
                      const tone = pnlTone(a.pnl || 0);
                      const color = tone === "success" ? "#16A34A" : tone === "danger" ? "#DC2626" : "#64748B";

                      const total = summary?.totalCurrentValue || 0;
                      const weight = total > 0 ? (Number(a.currentValue || 0) / total) * 100 : 0;

                      return (
                        <TouchableOpacity
                          key={a.id}
                          activeOpacity={0.9}
                          onPress={() => navigation.navigate("InvestmentDetail", { assetId: a.id })}
                          style={{
                            flexDirection: "row",
                            borderBottomWidth: 1,
                            borderBottomColor: "#E5E7EB",
                            backgroundColor: idx % 2 === 0 ? "white" : "#FCFCFD",
                          }}
                        >
                          <Td width={340}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                              <View
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 12,
                                  alignItems: "center",
                                  justifyContent: "center",
                                  backgroundColor: "rgba(15,23,42,0.04)",
                                  borderWidth: 1,
                                  borderColor: "#E5E7EB",
                                }}
                              >
                                <Ionicons name={assetTypeIcon(a.type)} size={16} color="#64748B" />
                              </View>

                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, fontWeight: "900", color: "#0F172A" }} numberOfLines={1}>
                                  {a.name}
                                </Text>
                                <Text style={{ marginTop: 2, fontSize: 11, fontWeight: "700", color: "#64748B" }} numberOfLines={1}>
                                  {formatMoney(a.currentValue || 0, currency)}
                                </Text>
                              </View>
                            </View>
                          </Td>

                          <Td width={160} align="right">
                            <Text style={{ fontSize: 12, fontWeight: "900", color: "#0F172A" }}>
                              {formatMoney(a.currentValue || 0, currency)}
                            </Text>
                          </Td>

                          <Td width={150} align="right">
                            <Text style={{ fontSize: 12, fontWeight: "900", color: "#0F172A" }}>
                              {formatMoney(a.invested || 0, currency)}
                            </Text>
                          </Td>

                          <Td width={150} align="right">
                            <Text style={{ fontSize: 12, fontWeight: "900", color }}>{formatMoney(a.pnl || 0, currency)}</Text>
                          </Td>

                          <Td width={110} align="right">
                            <Text style={{ fontSize: 12, fontWeight: "900", color }}>{formatPct(a.pnl || 0, a.invested || 0)}</Text>
                          </Td>

                          <Td width={90} align="right">
                            <Text style={{ fontSize: 12, fontWeight: "900", color: "#0F172A" }}>
                              {weight.toFixed(1).replace(".", ",")}%
                            </Text>
                          </Td>

                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* Footer hint */}
                <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: "#94A3B8" }}>
                    Consejo: haz clic en una fila para ver detalle. Desliza horizontalmente para ver todas las columnas.
                  </Text>
                </View>
              </>
            )}
          </SectionCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
