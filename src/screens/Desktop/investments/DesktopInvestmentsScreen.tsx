// src/screens/Investments/DesktopInvestmentsScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  TextInput,
  Pressable,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";

import api from "../../../api/api";
import { colors } from "../../../theme/theme";
import PieChartComponent from "../../../components/PieChart";
import { textStyles, typography } from "../../../theme/typography";

// ✅ NUEVO: modal embebido
import DesktopInvestmentFormModal from "../../../components/DesktopInvestmentFormModal";
import DesktopInvestmentOperationModal, {
  InvestmentAssetLite,
} from "../../../components/DesktopInvestmentOperationModal";
import DesktopInvestmentValuationModal2, {
  ValuationAssetLite,
} from "../../../components/DesktopInvestmentValuationModal2";
import PortfolioChartsPanel from "../../../components/PortfolioChartsPanel";


type InvestmentAssetType = "crypto" | "etf" | "stock" | "fund" | "custom" | "cash";

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
  date: string;
  totalCurrentValue?: number; // compat
  equity: number;
  netContributions: number;
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

function formatMoney(n: number, currency = "EUR") {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPct(pnl: number, invested: number) {
  if (!invested) return "0,0%";
  return `${((pnl / invested) * 100).toFixed(1).replace(".", ",")}%`;
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMonthShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { month: "short" }).replace(".", "").toUpperCase();
}

function formatDayShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
}

function pnlTone(pnl: number) {
  if (pnl > 0) return "success";
  if (pnl < 0) return "danger";
  return "neutral";
}

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
    case "custom":
      return "Personalizado";
    case "cash":
      return "Efectivo";
    default:
      return "Otro";
  }
};

const typeIcon = (t: InvestmentAssetType) => {
  switch (t) {
    case "crypto":
      return "logo-bitcoin";
    case "stock":
      return "trending-up-outline";
    case "etf":
      return "layers-outline";
    case "fund":
      return "pie-chart-outline";
    case "custom":
      return "construct-outline";
    case "cash":
      return "cash-outline";
    default:
      return "briefcase-outline";
  }
};

/** Escalado responsive (laptop vs monitor) — mismo que Dashboard */
function useUiScale() {
  const { width } = Dimensions.get("window");

  const s = useMemo(() => {
    const raw = width / 1440;
    return Math.max(0.86, Math.min(1.08, raw));
  }, [width]);

  const px = useCallback((n: number) => Math.round(n * s), [s]);
  const fs = useCallback((n: number) => Math.round(n * s), [s]);

  return { s, px, fs, width };
}

/** ======= KPI CARD ======= */
function StatCard({
  title,
  value,
  icon,
  tone = "neutral",
  subtitle,
  px,
  fs,
}: {
  title: string;
  value: string;
  subtitle?: React.ReactNode;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: "neutral" | "success" | "danger" | "info";
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  const paletteTone = {
    neutral: { accent: "#000000", iconBg: "#F1F5F9", iconFg: "#000000", title: "#94A3B8" },
    info: { accent: "#3B82F6", iconBg: "rgba(59,130,246,0.12)", iconFg: "#2563EB", title: "#94A3B8" },
    success: { accent: "#22C55E", iconBg: "rgba(34,197,94,0.12)", iconFg: "#16A34A", title: "#94A3B8" },
    danger: { accent: "#EF4444", iconBg: "rgba(239,68,68,0.12)", iconFg: "#DC2626", title: "#94A3B8" },
  }[tone];

  return (
    <View
      style={{
        flex: 1,
        minWidth: px(230),
        backgroundColor: "white",
        borderRadius: px(12),
        borderWidth: 1,
        borderColor: "#E5E7EB",
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: px(12),
        shadowOffset: { width: 0, height: px(6) },
      }}
    >
      <View style={{ flexDirection: "row", flex: 1 }}>
        <View style={{ width: px(4), backgroundColor: paletteTone.accent }} />
        <View style={{ flex: 1, padding: px(16) }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: px(10) }}>
            <Text style={[textStyles.labelMuted, { fontSize: fs(11), color: paletteTone.title, letterSpacing: 0.6 }]} numberOfLines={1}>
              {title}
            </Text>

            <View
              style={{
                width: px(34),
                height: px(34),
                borderRadius: px(10),
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: paletteTone.iconBg,
              }}
            >
              <Ionicons name={icon} size={px(18)} color={paletteTone.iconFg} />
            </View>
          </View>

          <Text style={[textStyles.numberLG, { marginTop: px(12), fontSize: fs(22), fontWeight: "900", color: "#0F172A" }]} numberOfLines={1}>
            {value}
          </Text>

          {!!subtitle && <View style={{ marginTop: px(6) }}>{subtitle}</View>}
        </View>
      </View>
    </View>
  );
}

/** UI reusable card */
function SectionCard({
  title,
  right,
  children,
  noPadding,
  px,
  fs,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: px(12),
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: noPadding ? 0 : px(16),
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowRadius: px(10),
        shadowOffset: { width: 0, height: px(6) },
      }}
    >
      <View
        style={{
          paddingHorizontal: noPadding ? px(16) : 0,
          paddingTop: noPadding ? px(16) : 0,
          paddingBottom: px(10),
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: px(10),
        }}
      >
        <Text style={[textStyles.labelMuted, { fontSize: fs(12) }]}>{title}</Text>
        {!!right && <View>{right}</View>}
      </View>

      <View style={{ paddingHorizontal: noPadding ? px(16) : 0, paddingBottom: noPadding ? px(16) : 0 }}>{children}</View>
    </View>
  );
}

/** Segmented */
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
    <View style={{ flexDirection: "row", backgroundColor: "rgba(15,23,42,0.06)", padding: px(4), borderRadius: px(12), height: px(44) }}>
      {items.map((x) => {
        const active = value === x.key;
        return (
          <TouchableOpacity
            key={x.key}
            activeOpacity={0.9}
            onPress={() => onChange(x.key)}
            style={{
              paddingHorizontal: px(14),
              alignItems: "center",
              justifyContent: "center",
              borderRadius: px(10),
              backgroundColor: active ? "rgba(15,23,42,0.10)" : "transparent",
            }}
          >
            <Text style={[textStyles.label, { fontSize: fs(12), fontWeight: active ? "900" : "800", color: active ? "#0F172A" : "#64748B" }]}>{x.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** TopButton */
function TopButton({
  icon,
  label,
  onPress,
  px,
  fs,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label?: string;
  onPress: () => void;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  const [hover, setHover] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      // ✅ FIX: onHoverIn/out solo existen en web. En nativo crashean.
      onHoverIn={Platform.OS === "web" ? () => setHover(true) : undefined}
      onHoverOut={Platform.OS === "web" ? () => setHover(false) : undefined}
      style={{
        height: px(38),
        paddingHorizontal: label ? px(12) : 0,
        width: label ? undefined : px(38),
        borderRadius: px(10),
        borderWidth: 1,
        borderColor: "#E5E7EB",
        backgroundColor: hover ? "#F8FAFC" : "white",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: label ? px(8) : 0,
      }}
    >
      <Ionicons name={icon} size={px(18)} color="#64748B" />
      {!!label && <Text style={[textStyles.button, { fontSize: fs(12), fontWeight: "800", color: "#64748B" }]}>{label}</Text>}
    </Pressable>
  );
}

// --------------------
// Line chart (responsive) — simple y serio
// --------------------
function PortfolioLineChart({ points, height }: { points: PortfolioTimelinePoint[]; height: number }) {
  const W = 1000;
  const H = 300;
  const PAD_X = 28;
  const PAD_Y = 22;

  const vals = points.map((p) => Number(p.totalCurrentValue || 0));
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
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(2)} ${yAt(Number(p.totalCurrentValue || 0)).toFixed(2)}`)
    .join(" ");

  const last = points[points.length - 1];
  const lastX = xAt(points.length - 1);
  const lastY = yAt(Number(last?.totalCurrentValue || 0));

  return (
    <View style={{ width: "100%", height }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.18" />
            <Stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        <Path d={`M ${PAD_X} ${PAD_Y} L ${W - PAD_X} ${PAD_Y}`} stroke="#EEF2F7" strokeWidth="2" />
        <Path
          d={`M ${PAD_X} ${(PAD_Y + (H - PAD_Y * 2) * 0.5).toFixed(2)} L ${W - PAD_X} ${(PAD_Y + (H - PAD_Y * 2) * 0.5).toFixed(2)}`}
          stroke="#EEF2F7"
          strokeWidth="2"
        />
        <Path d={`M ${PAD_X} ${H - PAD_Y} L ${W - PAD_X} ${H - PAD_Y}`} stroke="#EEF2F7" strokeWidth="2" />

        {points.length >= 2 && (
          <Path d={`${d} L ${lastX.toFixed(2)} ${(H - PAD_Y).toFixed(2)} L ${PAD_X} ${(H - PAD_Y).toFixed(2)} Z`} fill="url(#lineFill)" />
        )}

        <Path d={d} fill="none" stroke={colors.primary} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={lastX} cy={lastY} r="7" fill={colors.primary} />
        <Circle cx={lastX} cy={lastY} r="12" fill={colors.primary} opacity="0.12" />
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
  flex = 1,
  px,
  fs,
}: {
  label: string;
  align?: "left" | "right" | "center";
  flex?: number;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  return (
    <View style={{ flex, justifyContent: "center", paddingVertical: px(10), paddingHorizontal: px(12) }}>
      <Text style={[textStyles.labelMuted, { fontSize: fs(11), textAlign: align }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function Td({
  children,
  align = "left",
  flex = 1,
  px,
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
  flex?: number;
  px: (n: number) => number;
}) {
  return (
    <View style={{ flex, justifyContent: "center", paddingVertical: px(12), paddingHorizontal: px(12) }}>
      <View style={{ alignItems: align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start" }}>{children}</View>
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

  // ✅ NUEVO: modal create/edit
  const [formOpen, setFormOpen] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<number | undefined>(undefined);

    const [opsOpen, setOpsOpen] = useState(false);

  const openOps = useCallback(() => setOpsOpen(true), []);
  const closeOps = useCallback(() => setOpsOpen(false), []);


  const [valuationOpen, setValuationOpen] = useState(false);

const openValuation = useCallback(() => setValuationOpen(true), []);
const closeValuation = useCallback(() => setValuationOpen(false), []);

  const openCreate = useCallback(() => {
    setEditingAssetId(undefined);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((id: number) => {
    setEditingAssetId(id);
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingAssetId(undefined);
  }, []);

  const currency = "EUR";
  const { px, fs, width } = useUiScale();
  const WIDE = width >= 1100;

  const CHART_H = px(280);

  const fetchSummary = async () => {
    const res = await api.get("/investments/summary");
    setSummary(res.data || null);
  };

  const assetsLite: InvestmentAssetLite[] = useMemo(() => {
    const list = summary?.assets || [];
    return list.map((a) => ({ id: a.id, name: a.name, type: a.type }));
  }, [summary]);

const valuationAssets: ValuationAssetLite[] = useMemo(() => {
  const list = summary?.assets || [];
  return list.map((a) => ({
    id: a.id,
    name: a.name,
    symbol: a.symbol,
    type: a.type,
    currency: a.currency,
    currentValue: a.currentValue,
    lastValuationDate: a.lastValuationDate,
  }));
}, [summary]);


const fetchTimeline = async (rk: RangeKey) => {
  const days = rangeToDays[rk];
  const res = await api.get(`/investments/timeline?days=${days}`);
  const pts = (res.data?.points || []) as any[];

  setTimeline(
    pts.map((p) => ({
      date: p.date,
      totalCurrentValue: p.totalCurrentValue, // compat
      equity: Number(p.equity ?? p.totalCurrentValue ?? 0),
      netContributions: Number(p.netContributions ?? 0),
    }))
  );
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
    const q = (query || "").trim().toLowerCase();
    const filtered = !q ? list : list.filter((a) => `${a.name} ${a.symbol || ""}`.toLowerCase().includes(q));
    return [...filtered].sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0));
  }, [summary, query]);

  const labels = useMemo(() => {
    if (timeline.length === 0) return [];
    if (range === "1M") return timeline.map((p) => formatDayShort(p.date));
    return timeline.map((p) => formatMonthShort(p.date));
  }, [timeline, range]);

  const pieData = useMemo(() => {
    const list = (summary?.assets || [])
      .filter((a) => (a.currentValue || 0) > 0)
      .sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0));

    const total = summary?.totalCurrentValue || 0;
    if (!total || list.length === 0) return [];

    const TOP = 8;
    const top = list.slice(0, TOP);
    const rest = list.slice(TOP);

    const mapped = top.map((a, idx) => ({
      value: Number(a.currentValue || 0),
      realValue: Number(a.currentValue || 0),
      color: palette[idx % palette.length],
      label: a.symbol ? `${a.name} (${a.symbol})` : a.name,
      percent: (Number(a.currentValue || 0) / total) * 100,
    }));

    const restValue = rest.reduce((s, a) => s + Number(a.currentValue || 0), 0);
    if (restValue > 0) {
      mapped.push({
        value: restValue,
        realValue: restValue,
        color: "#CBD5E1",
        label: "Otros",
        percent: (restValue / total) * 100,
      });
    }

    return mapped;
  }, [summary]);

  const GRID = useMemo(
    () => ({
      asset: 3.2,
      type: 1.1,
      cur: 1.4,
      inv: 1.3,
      pnl: 1.1,
      pct: 0.9,
      w: 0.8,
    }),
    []
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background ?? "#F8FAFC" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: px(22),
          paddingTop: px(18),
          paddingBottom: px(90),
        }}
      >
        {/* ===== Header ===== */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: px(14) }}>
          <View style={{ flex: 1, paddingRight: px(12) }}>
            <Text style={[textStyles.h1, { fontSize: fs(22), fontWeight: "900", color: "#0F172A" }]}>Visión general de tu portfolio y rendimiento</Text>
            <Text style={[textStyles.bodyMuted, { marginTop: px(4), fontSize: fs(12), color: "#94A3B8", fontWeight: "700" }]} numberOfLines={2}>
              {hero.lastGlobal ? `Última valoración: ${formatShortDate(hero.lastGlobal)}` : ""}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: px(10) }}>
            {/* ✅ CAMBIO: abre modal */}
            <TopButton icon="add-outline" label="Nueva" onPress={openCreate} px={px} fs={fs} />
              <TopButton icon="swap-horizontal-outline" label="Operación" onPress={openOps} px={px} fs={fs} />
<TopButton icon="calendar-outline" label="Valorar" onPress={openValuation} px={px} fs={fs} />
            <TopButton icon="refresh-outline" onPress={fetchAll} px={px} fs={fs} />
          </View>
        </View>

        {/* ===== KPI row ===== */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: px(14) }}>
          <StatCard
            title="VALOR TOTAL"
            value={loading ? "—" : formatMoney(hero.totalCurrentValue, currency)}
            subtitle={
              <Text style={[textStyles.caption, { fontSize: fs(12), color: "#94A3B8", fontWeight: "700" }]} numberOfLines={1}>
                Valor actual del portfolio
              </Text>
            }
            icon="wallet-outline"
            tone="neutral"
            px={px}
            fs={fs}
          />

          <StatCard
            title="VALOR INVERTIDO"
            value={loading ? "—" : formatMoney(hero.totalInvested, currency)}
            subtitle={
              <Text style={[textStyles.caption, { fontSize: fs(12), color: "#94A3B8", fontWeight: "700" }]} numberOfLines={1}>
                Capital aportado
              </Text>
            }
            icon="add-circle-outline"
            tone="info"
            px={px}
            fs={fs}
          />

          <StatCard
            title="P/L"
            value={loading ? "—" : formatMoney(hero.totalPnL, currency)}
            subtitle={
              loading ? null : (
                <Text style={[textStyles.caption, { fontSize: fs(12), color: "#94A3B8", fontWeight: "700" }]} numberOfLines={1}>
                  {hero.totalPnL >= 0 ? "Ganancia" : "Pérdida"} total
                </Text>
              )
            }
            icon="stats-chart-outline"
            tone={pnlTone(hero.totalPnL) as any}
            px={px}
            fs={fs}
          />

          <StatCard
            title="% P/L"
            value={loading ? "—" : formatPct(hero.totalPnL, hero.totalInvested)}
            subtitle={
              <Text style={[textStyles.caption, { fontSize: fs(12), color: "#94A3B8", fontWeight: "700" }]} numberOfLines={1}>
                Rentabilidad sobre invertido
              </Text>
            }
            icon="trending-up-outline"
            tone={pnlTone(hero.totalPnL) as any}
            px={px}
            fs={fs}
          />
        </View>

        {/* ===== Charts ===== */}
        <View style={{ marginTop: px(16), gap: px(12) }}>
          <View style={{ flexDirection: WIDE ? "row" : "column", gap: px(12) }}>
            <View style={{ flex: 1, minWidth: WIDE ? px(680) : undefined }}>
<PortfolioChartsPanel
  points={timeline}
  loading={timelineLoading}
  range={range}
  onRangeChange={setRange}
  px={px}
  fs={fs}
  chartHeight={CHART_H}
/>
            </View>

            <View style={{ width: WIDE ? px(420) : "100%" }}>
              <SectionCard title="Distribución por activo" px={px} fs={fs}>
                <View style={{ height: CHART_H, justifyContent: "center" }}>
                  {loading ? (
                    <View style={{ alignItems: "center", justifyContent: "center" }}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  ) : pieData.length === 0 ? (
                    <Text style={[textStyles.bodyMuted, { fontSize: fs(12), fontWeight: "800", color: "#94A3B8" }]}>Sin datos de distribución.</Text>
                  ) : (
                    <PieChartComponent mode={"expense" as any} data={pieData as any} incomes={hero.totalCurrentValue} expenses={hero.totalCurrentValue} />
                  )}
                </View>
              </SectionCard>
            </View>
          </View>

          {/* ===== Tabla ===== */}
          <SectionCard
            title="Mis activos"
            right={
              <View style={{ flexDirection: "row", alignItems: "center", gap: px(8) }}>
                <View
                  style={{
                    height: px(34),
                    width: px(340),
                    borderRadius: px(12),
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    backgroundColor: "white",
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: px(10),
                    gap: px(8),
                  }}
                >
                  <Ionicons name="search-outline" size={px(16)} color="#64748B" />
                  {Platform.OS === "web" ? (
                    // @ts-ignore
                    <input
                      value={query}
                      onChange={(e: any) => setQuery(e?.target?.value ?? "")}
                      placeholder="Buscar por nombre o símbolo..."
                      style={{
                        flex: 1,
                        border: "none",
                        outline: "none",
                        fontSize: fs(13),
                        fontFamily: typography.family.base,
                        fontWeight: 800,
                        background: "transparent",
                        color: "#0F172A",
                      }}
                    />
                  ) : (
                    <TextInput
                      value={query}
                      onChangeText={setQuery}
                      placeholder="Buscar por nombre o símbolo..."
                      placeholderTextColor="#94A3B8"
                      style={{ flex: 1, fontSize: fs(13), fontWeight: "800", color: "#0F172A" }}
                    />
                  )}

                  {!!query && (
                    <TouchableOpacity activeOpacity={0.9} onPress={() => setQuery("")}>
                      <Ionicons name="close-circle" size={px(16)} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* ✅ CAMBIO: abre modal */}
                <Pressable
                  onPress={openCreate}
                  style={{
                    height: px(34),
                    paddingHorizontal: px(10),
                    borderRadius: px(12),
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    backgroundColor: "#F8FAFC",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: px(6),
                  }}
                >
                  <Ionicons name="add-outline" size={px(16)} color={colors.primary} />
                  <Text style={[textStyles.button, { fontSize: fs(12), fontWeight: "900", color: colors.primary }]}>Añadir</Text>
                </Pressable>
              </View>
            }
            noPadding
            px={px}
            fs={fs}
          >
            {loading ? (
              <View style={{ paddingVertical: px(18) }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : assets.length === 0 ? (
              <View style={{ padding: px(16) }}>
                <Text style={[textStyles.bodyMuted, { fontSize: fs(12), fontWeight: "800", color: "#94A3B8" }]}>No hay assets todavía.</Text>
              </View>
            ) : (
              <>
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
                  <Th label="ACTIVO" flex={GRID.asset} px={px} fs={fs} />
                  <Th label="TIPO" flex={GRID.type} px={px} fs={fs} />
                  <Th label="VALOR ACTUAL" align="right" flex={GRID.cur} px={px} fs={fs} />
                  <Th label="INVERTIDO" align="right" flex={GRID.inv} px={px} fs={fs} />
                  <Th label="P/L" align="right" flex={GRID.pnl} px={px} fs={fs} />
                  <Th label="% P/L" align="right" flex={GRID.pct} px={px} fs={fs} />
                  <Th label="PESO" align="right" flex={GRID.w} px={px} fs={fs} />
                </View>

                {/* Rows */}
                {assets.map((a, idx) => {
                  const tone = pnlTone(a.pnl || 0);
                  const pnlColor = tone === "success" ? "#16A34A" : tone === "danger" ? "#DC2626" : "#64748B";

                  const total = summary?.totalCurrentValue || 0;
                  const weight = total > 0 ? (Number(a.currentValue || 0) / total) * 100 : 0;

                  return (
                    <Pressable
                      key={a.id}
                      onPress={() => navigation.navigate("DesktopInvestmentDetail", { assetId: a.id })}
                      // ✅ FIX hovered: en algunas versiones/targets no existe y rompe.
                      // Usamos hovered solo en web (y con fallback).
                      style={({ pressed, hovered }: any) => {
                        const isHovered = Platform.OS === "web" ? !!hovered : false;
                        return {
                          flexDirection: "row",
                          borderBottomWidth: 1,
                          borderBottomColor: "#E5E7EB",
                          backgroundColor: pressed
                            ? "rgba(15,23,42,0.04)"
                            : isHovered
                            ? "rgba(37,99,235,0.06)"
                            : idx % 2 === 0
                            ? "white"
                            : "#FCFCFD",
                        };
                      }}
                    >
                      <Td flex={GRID.asset} px={px}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: px(10) }}>
                          <View
                            style={{
                              width: px(36),
                              height: px(36),
                              borderRadius: px(12),
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: "rgba(15,23,42,0.04)",
                              borderWidth: 1,
                              borderColor: "#E5E7EB",
                            }}
                          >
                            <Ionicons name={typeIcon(a.type)} size={px(16)} color="#64748B" />
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text style={[textStyles.body, { fontSize: fs(13), fontWeight: "700", color: "#0F172A" }]} numberOfLines={1}>
                              {a.name}
                            </Text>
                          </View>

                        </View>
                      </Td>

                      <Td flex={GRID.type} px={px}>
                        <Text style={[textStyles.caption, { fontSize: fs(12), fontWeight: "700", color: "#0F172A" }]} numberOfLines={1}>
                          {typeLabel(a.type)}
                        </Text>
                      </Td>

                      <Td flex={GRID.cur} align="right" px={px}>
                        <Text style={[textStyles.number, { fontSize: fs(12), fontWeight: "700", color: "#0F172A" }]}>{formatMoney(a.currentValue || 0, currency)}</Text>
                      </Td>

                      <Td flex={GRID.inv} align="right" px={px}>
                        <Text style={[textStyles.number, { fontSize: fs(12), fontWeight: "700", color: "#0F172A" }]}>{formatMoney(a.invested || 0, currency)}</Text>
                      </Td>

                      <Td flex={GRID.pnl} align="right" px={px}>
                        <Text style={[textStyles.number, { fontSize: fs(12), fontWeight: "700", color: pnlColor }]}>{formatMoney(a.pnl || 0, currency)}</Text>
                      </Td>

                      <Td flex={GRID.pct} align="right" px={px}>
                        <Text style={[textStyles.number, { fontSize: fs(12), fontWeight: "700", color: pnlColor }]}>{formatPct(a.pnl || 0, a.invested || 0)}</Text>
                      </Td>

                      <Td flex={GRID.w} align="right" px={px}>
                        <Text style={[textStyles.number, { fontSize: fs(12), fontWeight: "700", color: "#0F172A" }]}>{weight.toFixed(1).replace(".", ",")}%</Text>
                      </Td>
                    </Pressable>
                  );
                })}
              </>
            )}
          </SectionCard>
        </View>
      </ScrollView>

      {/* ✅ MODAL embebido en pantalla */}
      <DesktopInvestmentFormModal
        visible={formOpen}
        assetId={editingAssetId}
        onClose={closeForm}
        onSaved={fetchAll}
      />

      <DesktopInvestmentOperationModal
        visible={opsOpen}
        onClose={closeOps}
        onSaved={fetchAll}
        assets={assetsLite}
        px={px}
        fs={fs}
      />

      <DesktopInvestmentValuationModal2
      visible={valuationOpen}
      onClose={closeValuation}
      onSaved={fetchAll}
      assets={valuationAssets}
      currencyFallback={currency}
    />


    </View>
  );
}
