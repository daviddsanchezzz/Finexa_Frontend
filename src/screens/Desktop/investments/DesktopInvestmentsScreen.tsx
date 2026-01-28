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

import api from "../../../api/api";
import { colors } from "../../../theme/theme";
import { textStyles, typography } from "../../../theme/typography";

import PieChartComponent from "../../../components/PieChart";
import PortfolioChartsPanel from "../../../components/PortfolioChartsPanel";
import DesktopInvestmentFormModal from "../../../components/DesktopInvestmentFormModal";
import DesktopInvestmentOperationModal, { InvestmentAssetLite } from "../../../components/DesktopInvestmentOperationModal";
import DesktopInvestmentValuationModal2, { ValuationAssetLite } from "../../../components/DesktopInvestmentValuationModal2";
import { KpiCard } from "../../../components/KpiCard";

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

// ✅ Añade esto en tu DesktopInvestmentsScreen.tsx (mismo archivo)
// - Incluye fetch de /investments/snapshots
// - Renderiza la tabla "Rendimiento mensual" con estilo Dashboard
// - Usa los campos: monthStart, startValue, endValue, cashflowNet, profit, returnPct

type PortfolioSnapshotRow = {
  monthStart: string; // ISO
  currency: string;
  startValue: number | null;
  endValue: number;
  cashflowNet: number;
  profit: number;
  returnPct: number | null; // ratio (0.05 => 5%)
};

function formatMonthYear(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  // "ENE 2026"
  const m = d
    .toLocaleDateString("es-ES", { month: "short" })
    .replace(".", "")
    .toUpperCase();
  const y = d.getFullYear();
  return `${m} ${y}`;
}

function toneColor(value: number) {
  if (value > 0) return "#16A34A";
  if (value < 0) return "#DC2626";
  return "#64748B";
}

function formatPctRatio(p: number | null | undefined) {
  if (p == null || !Number.isFinite(p)) return "—";
  return `${(p * 100).toFixed(2).replace(".", ",")}%`;
}

function PerformanceRow({
  row,
  idx,
  px,
  fs,
  currency,
}: {
  row: PortfolioSnapshotRow;
  idx: number;
  px: (n: number) => number;
  fs: (n: number) => number;
  currency: string;
}) {
  const profitColor = toneColor(Number(row.profit || 0));
  const pctColor = toneColor(Number(row.returnPct || 0));

  return (
    <View
      style={{
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "rgba(148,163,184,0.16)",
        backgroundColor: idx % 2 === 0 ? "white" : "rgba(2,6,23,0.01)",
      }}
    >
      <Td flex={1.2} px={px}>
        <Text style={[textStyles.body, { fontSize: fs(12), fontWeight: "800", color: "#0F172A" }]} numberOfLines={1}>
          {formatMonthYear(row.monthStart)}
        </Text>
      </Td>

      <Td flex={1.3} align="right" px={px}>
        <Text style={[textStyles.number, { fontSize: fs(12), fontWeight: "800", color: "#0F172A" }]}>
          {formatMoney(Number(row.startValue ?? 0), currency)}
        </Text>
      </Td>

      <Td flex={1.3} align="right" px={px}>
        <Text style={[textStyles.number, { fontSize: fs(12), fontWeight: "800", color: "#0F172A" }]}>
          {formatMoney(Number(row.endValue ?? 0), currency)}
        </Text>
      </Td>

      <Td flex={1.1} align="right" px={px}>
        <Text style={[textStyles.number, { fontSize: fs(12), fontWeight: "800", color: toneColor(Number(row.cashflowNet || 0)) }]}>
          {formatMoney(Number(row.cashflowNet ?? 0), currency)}
        </Text>
      </Td>

      <Td flex={1.1} align="right" px={px}>
        <Text style={[textStyles.number, { fontSize: fs(12), fontWeight: "900", color: profitColor }]}>
          {formatMoney(Number(row.profit ?? 0), currency)}
        </Text>
      </Td>

      <Td flex={0.9} align="right" px={px}>
        <Text style={[textStyles.number, { fontSize: fs(12), fontWeight: "900", color: pctColor }]}>
          {formatPctRatio(row.returnPct)}
        </Text>
      </Td>
    </View>
  );
}


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
  if (!invested) return "0,00%";
  return `${((pnl / invested) * 100).toFixed(2).replace(".", ",")}%`;
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

/** Encabezado sección (sin cajita) — igual que Dashboard */
function SectionTitle({
  title,
  right,
  px,
  fs,
}: {
  title: string;
  right?: React.ReactNode;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: px(12) }}>
      <Text style={[textStyles.labelMuted, { fontSize: fs(12), color: "#64748B", letterSpacing: 0.4 }]}>{title}</Text>
      {!!right && <View>{right}</View>}
    </View>
  );
}

/** Top toolbar button — igual vibe Dashboard */
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
      onHoverIn={Platform.OS === "web" ? () => setHover(true) : undefined}
      onHoverOut={Platform.OS === "web" ? () => setHover(false) : undefined}
      style={{
        height: px(40),
        paddingHorizontal: label ? px(12) : 0,
        width: label ? undefined : px(40),
        borderRadius: px(12),
        backgroundColor: hover ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.90)",
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.25)",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: label ? px(8) : 0,
      }}
    >
      <Ionicons name={icon} size={px(18)} color="#475569" />
      {!!label && <Text style={[textStyles.button, { fontSize: fs(12), fontWeight: "600", color: "#475569" }]}>{label}</Text>}
    </Pressable>
  );
}

/** Card soft (Dashboard style) */
function SoftCard({
  children,
  px,
  pad = 16,
}: {
  children: React.ReactNode;
  px: (n: number) => number;
  pad?: number;
}) {
  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: px(16),
        padding: px(pad),
        shadowColor: "#0B1220",
        shadowOpacity: 0.06,
        shadowRadius: px(18),
        shadowOffset: { width: 0, height: px(10) },
      }}
    >
      {children}
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
      <Text style={[textStyles.labelMuted, { fontSize: fs(11), textAlign: align, color: "#64748B" }]} numberOfLines={1}>
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

  // modals
  const [formOpen, setFormOpen] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<number | undefined>(undefined);

  const [opsOpen, setOpsOpen] = useState(false);
  const [valuationOpen, setValuationOpen] = useState(false);

  // ✅ Dentro de DesktopInvestmentsScreen component (arriba, con el resto de states)
const [snapshots, setSnapshots] = useState<PortfolioSnapshotRow[]>([]);
const [snapshotsLoading, setSnapshotsLoading] = useState(false);

// Sugerencia: últimos 24 meses (puedes cambiarlo)
const fetchSnapshots = async () => {
  setSnapshotsLoading(true);
  try {
    const to = new Date();
    const from = new Date(to);
    from.setMonth(from.getMonth() - 24);

    // API: /investments/snapshots?from=...&to=...
    const res = await api.get(
      `/investments/snapshots?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`
    );

    const rows = (res.data || []) as any[];
    // asegúrate que el backend devuelve monthStart, startValue, endValue, cashflowNet, profit, returnPct, currency
    const mapped: PortfolioSnapshotRow[] = rows.map((r) => ({
      monthStart: String(r.monthStart),
      currency: String(r.currency || "EUR"),
      startValue: r.startValue == null ? null : Number(r.startValue),
      endValue: Number(r.endValue ?? 0),
      cashflowNet: Number(r.cashflowNet ?? 0),
      profit: Number(r.profit ?? 0),
      returnPct: r.returnPct == null ? null : Number(r.returnPct),
    }));

    // orden asc por monthStart para tabla
    mapped.sort((a, b) => new Date(a.monthStart).getTime() - new Date(b.monthStart).getTime());
    setSnapshots(mapped);
  } catch (e) {
    console.error("❌ Error cargando snapshots:", e);
    setSnapshots([]);
  } finally {
    setSnapshotsLoading(false);
  }
};

  const openOps = useCallback(() => setOpsOpen(true), []);
  const closeOps = useCallback(() => setOpsOpen(false), []);
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
  const WIDE = width >= 1120;

  const CHART_H = px(280);

  const fetchSummary = async () => {
    const res = await api.get("/investments/summary");
    setSummary(res.data || null);
  };

  const fetchTimeline = async (rk: RangeKey) => {
    const days = rangeToDays[rk];
    const res = await api.get(`/investments/timeline?days=${days}`);
    const pts = (res.data?.points || []) as any[];

    setTimeline(
      pts.map((p) => ({
        date: p.date,
        totalCurrentValue: p.totalCurrentValue,
        equity: Number(p.equity ?? p.totalCurrentValue ?? 0),
        netContributions: Number(p.netContributions ?? 0),
      }))
    );
  };

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setTimelineLoading(true);
        setSnapshotsLoading(true);

      await Promise.all([fetchSummary(), fetchTimeline(range)]);
    } catch (e) {
      console.error("❌ Error cargando investments desktop:", e);
      setSummary(null);
      setTimeline([]);
          setSnapshots([]);

    } finally {
      setLoading(false);
      setTimelineLoading(false);
        setSnapshotsLoading(false);
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
    <View style={{ flex: 1, backgroundColor: "#F6F8FC" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: px(22),
          paddingTop: px(18),
          paddingBottom: px(90),
          maxWidth: px(1400),
          width: "100%",
          alignSelf: "center",
        }}
      >
        {/* ===== Top toolbar (Dashboard style) ===== */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: px(14), marginBottom: px(14) }}>
          <View style={{ flex: 1 }}>
            <Text style={[textStyles.h1, { fontSize: fs(22), color: "#0F172A", fontWeight: "900" }]}>Inversiones</Text>
            <Text style={[textStyles.bodyMuted, { marginTop: px(4), fontSize: fs(12), color: "#64748B", fontWeight: "700" }]} numberOfLines={1}>
              Controla todas tus inversiones desde un solo lugar
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: px(10) }}>
            <TopButton icon="add-outline" label="Nueva" onPress={openCreate} px={px} fs={fs} />
            <TopButton icon="swap-horizontal-outline" label="Operación" onPress={openOps} px={px} fs={fs} />
            <TopButton icon="calendar-outline" label="Valorar" onPress={openValuation} px={px} fs={fs} />
            <TopButton icon="refresh-outline" onPress={fetchAll} px={px} fs={fs} />
          </View>

          {/* Search (web) — como Dashboard */}
          {Platform.OS === "web" && (
            <View
              style={{
                height: px(40),
                width: px(360),
                borderRadius: px(14),
                borderWidth: 1,
                borderColor: "rgba(148,163,184,0.25)",
                backgroundColor: "rgba(255,255,255,0.90)",
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: px(12),
                gap: px(8),
              }}
            >
              <Ionicons name="search-outline" size={px(16)} color="#64748B" />
              {/* @ts-ignore */}
              <input
                value={query}
                onChange={(e: any) => setQuery(e?.target?.value ?? "")}
                placeholder="Buscar activos..."
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  fontSize: fs(13),
                  fontFamily: typography.family.base,
                  fontWeight: 600,
                  background: "transparent",
                  color: "#0F172A",
                }}
              />
              {!!query && (
                <TouchableOpacity activeOpacity={0.9} onPress={() => setQuery("")}>
                  <Ionicons name="close-circle" size={px(16)} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* ===== KPI row ===== */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: px(14) }}>
          <KpiCard
            title="VALOR TOTAL"
            value={loading ? "—" : formatMoney(hero.totalCurrentValue, currency)}
            subtitle={<Text style={[textStyles.caption, { fontSize: fs(12), color: "#94A3B8" }]} numberOfLines={1}>Valor actual del portfolio</Text>}
            icon="wallet-outline"
            variant="premium"
            px={px}
            fs={fs}
          />

          <KpiCard
            title="VALOR INVERTIDO"
            value={loading ? "—" : formatMoney(hero.totalInvested, currency)}
            subtitle={<Text style={[textStyles.caption, { fontSize: fs(12), color: "#94A3B8" }]} numberOfLines={1}>Capital aportado</Text>}
            icon="add-circle-outline"
            tone="info"
            px={px}
            fs={fs}
          />

          <KpiCard
            title="P/L"
            value={loading ? "—" : formatMoney(hero.totalPnL, currency)}
            subtitle={
              loading ? null : (
                <Text style={[textStyles.caption, { fontSize: fs(12), color: "#94A3B8" }]} numberOfLines={1}>
                  {hero.totalPnL >= 0 ? "Ganancia" : "Pérdida"} total
                </Text>
              )
            }
            icon="stats-chart-outline"
            tone={pnlTone(hero.totalPnL) as any}
            px={px}
            fs={fs}
          />

          <KpiCard
            title="% P/L"
            value={loading ? "—" : formatPct(hero.totalPnL, hero.totalInvested)}
            subtitle={<Text style={[textStyles.caption, { fontSize: fs(12), color: "#94A3B8" }]} numberOfLines={1}>Rentabilidad sobre invertido</Text>}
            icon="trending-up-outline"
            tone={pnlTone(hero.totalPnL) as any}
            px={px}
            fs={fs}
          />
        </View>

        {/* ===== Charts row (Dashboard style: 2 cards) ===== */}
        <View style={{ marginTop: px(12), flexDirection: WIDE ? "row" : "column", gap: px(12) }}>
          <View style={{ flex: 1, minWidth: WIDE ? px(680) : undefined }}>
              <View>
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
          </View>

          <View style={{ width: WIDE ? px(420) : "100%" }}>
            <SoftCard px={px} pad={16}>
              <SectionTitle title="Distribución por activo" px={px} fs={fs} />
              <View style={{ marginTop: px(10), height: CHART_H, alignItems: "center", justifyContent: "center" }}>
                {loading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : pieData.length === 0 ? (
                  <Text style={[textStyles.bodyMuted, { fontSize: fs(12), fontWeight: "700", color: "#94A3B8" }]}>Sin datos de distribución.</Text>
                ) : (
                  <PieChartComponent mode={"expense" as any} data={pieData as any} incomes={hero.totalCurrentValue} expenses={hero.totalCurrentValue} />
                )}
              </View>
            </SoftCard>
          </View>
        </View>

        {/* ===== Assets table (soft card) ===== */}
        <View style={{ marginTop: px(16) }}>
          <SoftCard px={px} pad={0}>
            <View style={{ padding: px(16) }}>
              <SectionTitle
                title="Mis activos"
                right={
                  Platform.OS !== "web" ? (
                    <View
                      style={{
                        height: px(40),
                        width: px(320),
                        borderRadius: px(14),
                        borderWidth: 1,
                        borderColor: "rgba(148,163,184,0.25)",
                        backgroundColor: "rgba(255,255,255,0.90)",
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: px(12),
                        gap: px(8),
                      }}
                    >
                      <Ionicons name="search-outline" size={px(16)} color="#64748B" />
                      <TextInput
                        value={query}
                        onChangeText={setQuery}
                        placeholder="Buscar activos..."
                        placeholderTextColor="#94A3B8"
                        style={{ flex: 1, fontSize: fs(13), fontWeight: "600", color: "#0F172A" }}
                      />
                      {!!query && (
                        <TouchableOpacity activeOpacity={0.9} onPress={() => setQuery("")}>
                          <Ionicons name="close-circle" size={px(16)} color="#94A3B8" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : null
                }
                px={px}
                fs={fs}
              />
            </View>

            {loading ? (
              <View style={{ paddingVertical: px(22), alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : assets.length === 0 ? (
              <View style={{ padding: px(16) }}>
                <Text style={[textStyles.bodyMuted, { fontSize: fs(12), fontWeight: "700", color: "#94A3B8" }]}>No hay assets todavía.</Text>
              </View>
            ) : (
              <>
                {/* Header */}
                <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: "rgba(148,163,184,0.20)", borderBottomWidth: 1, borderBottomColor: "rgba(148,163,184,0.20)", backgroundColor: "rgba(15,23,42,0.03)" }}>
                  <Th label="ACTIVO" flex={GRID.asset} px={px} fs={fs} />
                  <Th label="TIPO" align="right" flex={GRID.type} px={px} fs={fs} />
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
                      style={({ pressed, hovered }: any) => {
                        const isHovered = Platform.OS === "web" ? !!hovered : false;
                        return {
                          flexDirection: "row",
                          borderBottomWidth: 1,
                          borderBottomColor: "rgba(148,163,184,0.16)",
                          backgroundColor: pressed
                            ? "rgba(15,23,42,0.04)"
                            : isHovered
                            ? "rgba(37,99,235,0.06)"
                            : idx % 2 === 0
                            ? "white"
                            : "rgba(2,6,23,0.01)",
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
                              borderColor: "rgba(148,163,184,0.20)",
                            }}
                          >
                            <Ionicons name={typeIcon(a.type)} size={px(16)} color="#64748B" />
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text style={[textStyles.body, { fontSize: fs(13), fontWeight: "700", color: "#0F172A" }]} numberOfLines={1}>
                              {a.name}
                            </Text>
                            {!!a.symbol && (
                              <Text style={[textStyles.caption, { fontSize: fs(12), fontWeight: "600", color: "#94A3B8", marginTop: px(1) }]} numberOfLines={1}>
                                {a.symbol}
                              </Text>
                            )}
                          </View>
                        </View>
                      </Td>

                      <Td flex={GRID.type} align="right" px={px}>
                        <Text style={[textStyles.caption, { fontSize: fs(12), fontWeight: "700", color: "#0F172A" }]} numberOfLines={1}>
                          {typeLabel(a.type)}
                        </Text>
                      </Td>

                      <Td flex={GRID.cur} align="right" px={px}>
                        <Text style={[textStyles.number, { fontSize: fs(12), fontWeight: "700", color: "#0F172A" }]}>
                          {formatMoney(a.currentValue || 0, currency)}
                        </Text>
                      </Td>

                      <Td flex={GRID.inv} align="right" px={px}>
                        <Text style={[textStyles.number, { fontSize: fs(12), fontWeight: "700", color: "#0F172A" }]}>
                          {formatMoney(a.invested || 0, currency)}
                        </Text>
                      </Td>

                      <Td flex={GRID.pnl} align="right" px={px}>
                        <Text style={[textStyles.number, { fontSize: fs(12), fontWeight: "700", color: pnlColor }]}>
                          {formatMoney(a.pnl || 0, currency)}
                        </Text>
                      </Td>

                      <Td flex={GRID.pct} align="right" px={px}>
                        <Text style={[textStyles.number, { fontSize: fs(12), fontWeight: "700", color: pnlColor }]}>
                          {formatPct(a.pnl || 0, a.invested || 0)}
                        </Text>
                      </Td>

                      <Td flex={GRID.w} align="right" px={px}>
                        <Text style={[textStyles.number, { fontSize: fs(12), fontWeight: "700", color: "#0F172A" }]}>
                          {weight.toFixed(1).replace(".", ",")}%
                        </Text>
                      </Td>
                    </Pressable>
                  );
                })}
              </>
            )}
          </SoftCard>

          <View style={{ marginTop: px(12) }}>
            <SoftCard px={px} pad={16}>
              <SectionTitle title="Rendimiento mensual" px={px} fs={fs} />
<View style={{ marginTop: px(10) }}>
  {snapshotsLoading ? (
    <View style={{ paddingVertical: px(18), alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  ) : snapshots.length === 0 ? (
    <View style={{ paddingVertical: px(10) }}>
      <Text style={[textStyles.bodyMuted, { fontSize: fs(12), fontWeight: "600", color: "#94A3B8" }]}>
        Aún no hay cierres mensuales (snapshots).
      </Text>
    </View>
  ) : (
    <View style={{ marginTop: px(10), borderRadius: px(14), overflow: "hidden", borderWidth: 1, borderColor: "rgba(148,163,184,0.20)" }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          borderBottomWidth: 1,
          borderBottomColor: "rgba(148,163,184,0.20)",
          backgroundColor: "rgba(15,23,42,0.03)",
        }}
      >
        <Th label="MES" flex={1.2} px={px} fs={fs} />
        <Th label="INICIO" align="right" flex={1.3} px={px} fs={fs} />
        <Th label="FIN" align="right" flex={1.3} px={px} fs={fs} />
        <Th label="CASHFLOW" align="right" flex={1.1} px={px} fs={fs} />
        <Th label="RENTAB. (€)" align="right" flex={1.1} px={px} fs={fs} />
        <Th label="RENTAB. (%)" align="right" flex={0.9} px={px} fs={fs} />
      </View>

      {/* Rows */}
      {snapshots.map((row, idx) => (
        <PerformanceRow key={row.monthStart} row={row} idx={idx} px={px} fs={fs} currency={currency} />
      ))}
    </View>
  )}
</View>

            </SoftCard>
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <DesktopInvestmentFormModal visible={formOpen} assetId={editingAssetId} onClose={closeForm} onSaved={fetchAll} />

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
