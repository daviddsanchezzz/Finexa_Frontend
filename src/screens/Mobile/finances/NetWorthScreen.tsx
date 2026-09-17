import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, Circle } from "react-native-svg";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../../api/api";
import AppHeader from "../../../components/AppHeader";
import SkeletonBox from "../../../components/SkeletonBox";
import SegmentedTabs from "../../../components/SegmentedTabs";
import HeroBalanceCard from "../../../components/HeroBalanceCard";
import WalletIcon from "../../../components/WalletIcon";
import { colors } from "../../../theme/theme";
import { useTheme } from "../../../context/ThemeContext";
import { formatEuro } from "../../../utils/currency";
import { getTransactionsDataVersion } from "../../../utils/transactionsInvalidation";
import { getNetWorthCache, setNetWorthCache } from "../../../utils/netWorthCache";
import { useNetWorthTrend } from "../../../hooks/useNetWorthTrend";
import { useInvestmentPeriodProfit } from "../../../hooks/useInvestmentPeriodProfit";
import NetWorthBreakdownModal from "../../../components/NetWorthBreakdownModal";
import WalletGoalReservationsModal from "../../../components/WalletGoalReservationsModal";
import { useGoalWalletsQuery } from "../../../hooks/useGoalsQuery";
import { money } from "./goals/goalShared";

type WalletKind = "cash" | "savings" | "investment";

interface WalletItem {
  id: number;
  name: string;
  emoji: string;
  balance: number;
  currency: string;
  kind: WalletKind;
}

interface DebtItem {
  id: number;
  name: string;
  emoji?: string;
  remainingAmount: number;
  status: string;
}

interface InvestmentAsset {
  id: number;
  name: string;
  abbreviation?: string | null;
  symbol?: string | null;
  ticker?: string | null;
  type: string;
  currentValue: number;
  pnl: number;
}

interface NetWorthData {
  wallets: WalletItem[];
  investments: {
    totalCurrentValue: number;
    totalPnL: number;
    totalInvested: number;
    assets: InvestmentAsset[];
  };
  debts: DebtItem[];
}

// ── Colors per kind ──────────────────────────────────
const KIND = {
  cash:       { color: "#3B82F6", bg: "#EFF6FF", label: "Liquidez",  icon: "card-outline"         },
  savings:    { color: "#10B981", bg: "#ECFDF5", label: "Ahorro",    icon: "wallet-outline"        },
  investment: { color: "#8B5CF6", bg: "#F5F3FF", label: "Inversión", icon: "trending-up-outline"   },
  debt:       { color: "#EF4444", bg: "#FEF2F2", label: "Deudas",    icon: "card-outline"          },
};

function fmt(n: number, showSign = false) {
  const s = formatEuro(Math.abs(n));
  if (showSign && n !== 0) return (n >= 0 ? "+" : "−") + s + " €";
  return (n < 0 ? "−" : "") + s + " €";
}

// Igual que fmt pero sin el sufijo " €" — para columnas estrechas (tablas de
// resumen) donde el símbolo de moneda desperdicia sitio con números grandes.
function fmtNum(n: number, showSign = false) {
  const s = formatEuro(Math.abs(n));
  if (showSign && n !== 0) return (n >= 0 ? "+" : "−") + s;
  return (n < 0 ? "−" : "") + s;
}


// ── Collapsible section ───────────────────────────────
interface SectionProps {
  kindKey: keyof typeof KIND;
  total: number;
  children?: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  defaultOpen?: boolean;
}

function Section({ kindKey, total, children, badge, badgeColor, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const { colors: t } = useTheme();
  const k = KIND[kindKey];
  const isNeg = kindKey === "debt";

  return (
    <View
      style={{
        backgroundColor: t.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: t.border,
        marginBottom: 8,
        overflow: "hidden",
      }}
    >
      {/* Header row */}
      <TouchableOpacity
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            backgroundColor: k.bg,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <Ionicons name={k.icon as any} size={16} color={k.color} />
        </View>

        <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: "#111827" }}>
          {k.label}
        </Text>

        {badge && (
          <View
            style={{
              backgroundColor: badgeColor ? badgeColor + "20" : k.bg,
              borderRadius: 8,
              paddingHorizontal: 7,
              paddingVertical: 2,
              marginRight: 8,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "700", color: badgeColor || k.color }}>
              {badge}
            </Text>
          </View>
        )}

        <Text style={{ fontSize: 15, fontWeight: "800", color: isNeg ? "#EF4444" : "#111827", marginRight: 8 }}>
          {fmt(total)}
        </Text>

        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color="#9CA3AF"
        />
      </TouchableOpacity>

      {/* Rows */}
      {open && children && (
        <View style={{ borderTopWidth: 1, borderTopColor: "#F3F4F6" }}>
          {children}
        </View>
      )}
    </View>
  );
}

function Row({ emoji, name, amount, amountColor, allocatedAmount = 0, currency = 'EUR', onPress }: { emoji?: string; name: string; amount: number; amountColor?: string; allocatedAmount?: number; currency?: string; onPress?: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.75}
      accessibilityRole={onPress ? 'button' : undefined}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#F9FAFB",
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {emoji ? (
          <View style={{ marginRight: 8, width: 24, alignItems: "center" }}>
            <WalletIcon emoji={emoji} size={16} />
          </View>
        ) : (
          <View style={{ width: 24, marginRight: 8 }} />
        )}
        <Text style={{ flex: 1, fontSize: 13, color: "#374151" }}>{name}</Text>
        <Text style={{ fontSize: 13, fontWeight: "600", color: amountColor || "#111827" }}>
          {fmt(amount)}
        </Text>
      </View>
      {allocatedAmount > 0 && <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4, marginLeft: 32 }}>🎯 {money(allocatedAmount, currency)} destinados a objetivos</Text>}
    </TouchableOpacity>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <View style={{ padding: 16, alignItems: "center" }}>
      <Text style={{ fontSize: 13, color: "#9CA3AF" }}>{label}</Text>
    </View>
  );
}

// ── Fila de cartera (vista "Ver por Cartera") ──────────
function WalletRow({ wallet, allocatedAmount = 0, onPress }: { wallet: WalletItem; allocatedAmount?: number; onPress: () => void }) {
  const { colors: t } = useTheme();
  const kindMeta = KIND[wallet.kind] ?? KIND.cash;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      style={{
        backgroundColor: t.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: t.border,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            backgroundColor: kindMeta.bg,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <WalletIcon emoji={wallet.emoji} size={16} />
        </View>
        <Text style={{ flex: 1, fontSize: 13, fontWeight: "700", color: "#111827" }} numberOfLines={1}>
          {wallet.name}
        </Text>
        <Text style={{ fontSize: 14, fontWeight: "800", color: "#111827" }}>
          {fmt(wallet.balance)}
        </Text>
      </View>
      {allocatedAmount > 0 && <Text style={{ fontSize: 11, color: t.textSecondary, marginTop: 4, textAlign: 'right' }}>🎯 {money(allocatedAmount, wallet.currency)} destinados a objetivos</Text>}
    </TouchableOpacity>
  );
}

// ── Fila con desplegable de las tablas mensual/anual ──
// 4 columnas visibles (Mes/Año, Ingresos, Gastos, Ahorro); al tocar la fila
// se despliega Rentabilidad (antes "Inversión") y Patrimonio Neto Final
// (antes "Saldo final").
function BreakdownRow({
  label,
  income,
  expense,
  saving,
  investment,
  finalAmount,
  finished,
  expanded,
  highlighted,
  onPress,
}: {
  label: string;
  income: number;
  expense: number;
  saving: number;
  investment: number | null;
  finalAmount: number;
  finished: boolean;
  expanded: boolean;
  highlighted?: boolean;
  onPress: () => void;
}) {
  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: "#F1F5F9", backgroundColor: highlighted ? "rgba(0,60,197,0.04)" : "transparent" }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, opacity: finished ? 1 : 0.55 }}
      >
        <Text style={{ flex: 0.9, fontSize: 13, fontWeight: "700", color: "#0F172A" }} numberOfLines={1}>
          {label}
        </Text>
        <Text style={{ flex: 1.15, fontSize: 12, textAlign: "center", color: "#374151" }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {finished ? fmtNum(income) : "–"}
        </Text>
        <Text style={{ flex: 1.15, fontSize: 12, textAlign: "center", color: "#374151" }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {finished ? fmtNum(expense) : "–"}
        </Text>
        <View style={{ flex: 1.3, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 2 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: !finished ? "#9CA3AF" : saving >= 0 ? "#16A34A" : "#DC2626",
            }}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {finished ? fmtNum(saving, true) : "–"}
          </Text>
          {finished && <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={13} color="#9CA3AF" />}
        </View>
      </TouchableOpacity>

      {expanded && finished && (
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingBottom: 12, paddingHorizontal: 2 }}>
          <View>
            <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "600" }}>Rentabilidad</Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                marginTop: 1,
                color: investment == null ? "#9CA3AF" : investment >= 0 ? "#16A34A" : "#DC2626",
              }}
            >
              {investment != null ? fmt(investment) : "—"}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "600" }}>Patrimonio Neto Final</Text>
            <Text style={{ fontSize: 13, fontWeight: "800", marginTop: 1, color: "#0F172A" }}>{fmt(finalAmount)}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ── Card de variación (Este mes / Este año) ────────────
function StatCard({ label, delta, pct }: { label: string; delta: number; pct: number }) {
  const positive = delta >= 0;
  return (
    <View style={{ flex: 1, backgroundColor: "white", borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", padding: 10 }}>
      <Text style={{ fontSize: 12, color: "#6B7280", fontWeight: "600", marginBottom: 4 }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: "800", color: positive ? "#16A34A" : "#DC2626" }}>
        {positive ? "+" : "−"}{fmt(Math.abs(delta))}
      </Text>
      {Math.abs(pct) > 0.05 && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "flex-start",
            backgroundColor: positive ? "#DCFCE7" : "#FEE2E2",
            borderRadius: 999,
            paddingHorizontal: 7,
            paddingVertical: 2,
            marginTop: 5,
            gap: 3,
          }}
        >
          <Ionicons name={positive ? "arrow-up" : "arrow-down"} size={10} color={positive ? "#16A34A" : "#DC2626"} />
          <Text style={{ fontSize: 11, fontWeight: "700", color: positive ? "#16A34A" : "#DC2626" }}>
            {Math.abs(pct).toFixed(1)}%
          </Text>
        </View>
      )}
    </View>
  );
}

// Formato corto para el eje Y (32k € en vez de 32.000,00 €).
function shortEuro(n: number) {
  if (Math.abs(n) >= 1000) return `${Math.round(n / 1000)}k €`;
  return `${fmt(n)}`;
}

// ── Gráfica de evolución (solo cierres mensuales reales + "Hoy") ──
function EvolutionChart({ points }: { points: { label: string; value: number }[] }) {
  const [width, setWidth] = useState(0);
  const H = 140;
  const padY = 12;

  if (points.length < 2) {
    return (
      <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", padding: 18, alignItems: "center", marginBottom: 12 }}>
        <Text style={{ color: "#94A3B8", fontSize: 13, textAlign: "center" }}>
          No hay suficiente histórico todavía para este rango.
        </Text>
      </View>
    );
  }

  const values = points.map((p) => p.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const span = maxV - minV || 1;

  const mapped = width > 0
    ? points.map((p, i) => ({
        ...p,
        x: (i * width) / (points.length - 1),
        y: padY + (1 - (p.value - minV) / span) * (H - padY * 2),
      }))
    : [];

  const linePath = mapped.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const areaPath = mapped.length
    ? `${linePath} L ${mapped[mapped.length - 1].x.toFixed(2)} ${H} L ${mapped[0].x.toFixed(2)} ${H} Z`
    : "";
  const last = mapped[mapped.length - 1];

  const maxLabels = Math.min(5, points.length);
  const labelStep = (points.length - 1) / Math.max(1, maxLabels - 1);
  const labelIdxs = Array.from({ length: maxLabels }, (_, i) => Math.round(i * labelStep));

  return (
    <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", padding: 12, marginBottom: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "flex-end", marginBottom: 4 }}>
        <Text style={{ fontSize: 14, fontWeight: "800", color: "#0F172A" }}>{fmt(values[values.length - 1])}</Text>
      </View>

      <View style={{ flexDirection: "row" }}>
        <View style={{ justifyContent: "space-between", marginRight: 6, height: H, paddingVertical: padY }}>
          <Text style={{ fontSize: 10, color: "#94A3B8", fontWeight: "600" }}>{shortEuro(maxV)}</Text>
          <Text style={{ fontSize: 10, color: "#94A3B8", fontWeight: "600" }}>{shortEuro(minV)}</Text>
        </View>
        <View style={{ flex: 1 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {width > 0 && (
            <Svg width={width} height={H}>
              <Path d={areaPath} fill={colors.primary} opacity={0.12} />
              <Path d={linePath} stroke={colors.primary} strokeWidth={2.5} fill="none" />
              <Circle cx={last.x} cy={last.y} r={4} fill={colors.primary} />
            </Svg>
          )}
        </View>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingLeft: 46 }}>
        {labelIdxs.map((i) => (
          <Text key={i} style={{ fontSize: 10, color: "#94A3B8", fontWeight: "600" }}>
            {points[i].label}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ── Distribution bar ──────────────────────────────────
function DistributionBar({ cash, savings, invest, debt }: { cash: number; savings: number; invest: number; debt: number }) {
  const total = cash + savings + invest + debt;
  if (total <= 0) return null;

  const segments = [
    { value: cash,    color: KIND.cash.color },
    { value: savings, color: KIND.savings.color },
    { value: invest,  color: KIND.investment.color },
    { value: debt,    color: KIND.debt.color },
  ].filter((s) => s.value > 0);

  return (
    <View style={{ flexDirection: "row", height: 5, borderRadius: 5, overflow: "hidden", marginTop: 12, marginBottom: 12 }}>
      {segments.map((s, i) => (
        <View
          key={i}
          style={{
            flex: s.value / total,
            backgroundColor: s.color,
            marginLeft: i > 0 ? 2 : 0,
            borderRadius: 6,
          }}
        />
      ))}
    </View>
  );
}

const ASSET_TYPE_EMOJI: Record<string, string> = {
  crypto: "₿",
  etf:    "📦",
  stock:  "📊",
  fund:   "🏦",
  custom: "💼",
  cash:   "💵",
};

type MainTab = "composicion" | "evolucion";
type ViewBy = "cartera" | "tipo";
type EvoRange = "6M" | "YTD" | "1A" | "Todo";

const EVO_RANGES: { key: EvoRange; label: string }[] = [
  { key: "6M", label: "6M" },
  { key: "YTD", label: "YTD" },
  { key: "1A", label: "1A" },
  { key: "Todo", label: "Todo" },
];

// ── Screen ────────────────────────────────────────────
export default function NetWorthScreen({ navigation, isPinnedModuleTab = false }: any) {
  const { isDark, colors: t } = useTheme();
  const initialCache = getNetWorthCache<NetWorthData>();
  const [data, setData] = useState<NetWorthData | null>(initialCache.data);
  const [loading, setLoading] = useState(initialCache.data === null);
  const [refreshing, setRefreshing] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>("composicion");
  const [viewBy, setViewBy] = useState<ViewBy>("cartera");
  const [evoRange, setEvoRange] = useState<EvoRange>("Todo");
  const currentYearNow = new Date().getFullYear();
  const [selectedTableYear, setSelectedTableYear] = useState(currentYearNow);
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);
  const [expandedGlobalYear, setExpandedGlobalYear] = useState<number | null>(null);
  const [breakdownVisible, setBreakdownVisible] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<WalletItem | null>(null);
  const goalWallets = useGoalWalletsQuery();

  const netTrend = useNetWorthTrend();
  const netTrendYear = useNetWorthTrend("year");
  const now = new Date();
  const currentMonthFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const currentMonthTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
  const { profit: currentInvestmentResult } = useInvestmentPeriodProfit(currentMonthFrom, currentMonthTo);
  const rawCurrentAdjustments = netTrend.periodDelta - netTrend.periodSavings - currentInvestmentResult;
  const currentAdjustments = Math.abs(rawCurrentAdjustments) < 0.005 ? 0 : rawCurrentAdjustments;

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [walletsRes, investRes, debtsRes] = await Promise.allSettled([
        api.get("/wallets"),
        api.get("/investments/summary"),
        api.get("/debts"),
      ]);

      const result: NetWorthData = {
        wallets: walletsRes.status === "fulfilled" ? walletsRes.value.data || [] : [],
        investments:
          investRes.status === "fulfilled"
            ? {
                totalCurrentValue: investRes.value.data?.totalCurrentValue ?? 0,
                totalPnL: investRes.value.data?.totalPnL ?? 0,
                totalInvested: investRes.value.data?.totalInvested ?? 0,
                assets: investRes.value.data?.assets ?? [],
              }
            : { totalCurrentValue: 0, totalPnL: 0, totalInvested: 0, assets: [] },
        debts: debtsRes.status === "fulfilled" ? debtsRes.value.data || [] : [],
      };

      setNetWorthCache(result, getTransactionsDataVersion());
      setData(result);
    } catch (e) {
      console.error("❌ NetWorth fetch error", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void goalWallets.refetch();
      // Ya hay datos en caché y ninguna transacción los ha podido dejar
      // obsoletos desde que se guardaron: no vuelvas a pedirlos al backend.
      const cache = getNetWorthCache<NetWorthData>();
      if (cache.data && cache.version === getTransactionsDataVersion()) {
        setData(cache.data);
        setLoading(false);
        return;
      }
      fetchData();
    }, [goalWallets.refetch])
  );

  // ── Derived values ──
  const wallets         = data?.wallets ?? [];
  const cashWallets     = wallets.filter((w) => w.kind === "cash");
  const savingsWallets  = wallets.filter((w) => w.kind === "savings");
  const activeDebts     = (data?.debts ?? []).filter((d) => d.status === "active");

  const cashTotal    = cashWallets.reduce((s, w) => s + w.balance, 0);
  const savingsTotal = savingsWallets.reduce((s, w) => s + w.balance, 0);
  const investTotal  = data?.investments.totalCurrentValue ?? 0;
  const debtTotal    = activeDebts.reduce((s, d) => s + d.remainingAmount, 0);
  const walletsTotal  = wallets.reduce((s, w) => s + w.balance, 0);

  const totalAssets      = cashTotal + savingsTotal + investTotal;
  const totalLiabilities = debtTotal;
  const netWorth          = totalAssets - totalLiabilities;

  // Denominador de la barra/leyenda: incluye la deuda como un bloque más del
  // mismo ancho total, igual que en el diseño (5%+58%+32%+5% = 100%).
  const distributionTotal = totalAssets + debtTotal;

  const sortedAssets = [...(data?.investments.assets ?? [])].sort(
    (a, b) => b.currentValue - a.currentValue
  );

  const legendItems = [
    { label: "Liquidez",  value: cashTotal,    color: KIND.cash.color,       textColor: "white" },
    { label: "Ahorro",    value: savingsTotal, color: KIND.savings.color,    textColor: "white" },
    { label: "Inversión", value: investTotal,  color: KIND.investment.color, textColor: "white" },
    ...(debtTotal > 0 ? [{ label: "Deudas", value: debtTotal, color: KIND.debt.color, textColor: "#FCA5A5" }] : []),
  ];

  // Puntos de la gráfica de Evolución según el rango elegido, usando solo
  // cierres mensuales reales (computeWealthSeries) + el punto "Hoy" en vivo.
  const evoPoints = (() => {
    const series = netTrend.series;
    const currentYear = new Date().getFullYear();
    let sliced;
    if (evoRange === "6M") sliced = series.slice(-6);
    else if (evoRange === "YTD") sliced = series.filter((p) => p.year === currentYear);
    else if (evoRange === "1A") sliced = series.slice(-12);
    else sliced = series;

    const points = sliced.map((p) => ({ label: p.label, value: p.finalAmount }));
    points.push({ label: "Hoy", value: netTrend.current });
    return points;
  })();

  // Tablas mensual/anual (movidas desde Estadísticas avanzadas), usando la
  // misma serie compartida de cierres mensuales.
  const monthsByYear = netTrend.monthsByYear;
  const globalSummaryList = netTrend.globalSummaryList;
  const currentMonthNow = new Date().getMonth();
  const isPastSelectedYear = selectedTableYear < currentYearNow;
  const isCurrentSelectedYear = selectedTableYear === currentYearNow;

  const yearSummaryList = monthsByYear[selectedTableYear] || [];
  const finishedMonths = yearSummaryList.filter(
    (_, i) => isPastSelectedYear || (isCurrentSelectedYear && i < currentMonthNow)
  );
  const totalYearIncome = finishedMonths.reduce((s, m) => s + m.income, 0);
  const totalYearExpense = finishedMonths.reduce((s, m) => s + m.expense, 0);
  const totalYearSaving = finishedMonths.reduce((s, m) => s + m.saving, 0);

  const finishedYears = globalSummaryList.filter((y) => y.year < currentYearNow);
  const totalGlobalIncome = finishedYears.reduce((s, y) => s + y.income, 0);
  const totalGlobalExpense = finishedYears.reduce((s, y) => s + y.expense, 0);
  const totalGlobalSaving = finishedYears.reduce((s, y) => s + y.saving, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? t.background : "#F3F4F6" }}>
      {/* AppHeader */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 4 }}>
        <AppHeader
          title="Patrimonio neto"
          showBack={!isPinnedModuleTab}
          showProfile={false}
          showDatePicker={false}
        />
      </View>

      <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
        <SegmentedTabs<MainTab>
          dense
          options={[
            { key: "composicion", label: "Composición" },
            { key: "evolucion", label: "Evolución" },
          ]}
          value={mainTab}
          onChange={setMainTab}
        />
      </View>

      {loading ? (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <SkeletonBox height={210} borderRadius={24} />
          </View>
          <View style={{ paddingHorizontal: 20, gap: 12 }}>
            <SkeletonBox height={62} borderRadius={18} />
            <SkeletonBox height={62} borderRadius={18} />
            <SkeletonBox height={62} borderRadius={18} />
            <SkeletonBox height={62} borderRadius={18} />
          </View>
        </View>
      ) : (
        <>
          {/* ── Hero fijo (no scrollea) — mismo lenguaje visual que Inicio/Inversiones/Viajes ── */}
          <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <HeroBalanceCard
              label="Patrimonio neto"
              value={fmt(netWorth)}
              onPress={() => setBreakdownVisible(true)}
              footer={
                <>
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 6 }}>
                    <Text style={{ fontSize: 11.5, fontWeight: "600", color: netTrend.periodDelta >= 0 ? "#86EFAC" : "#FCA5A5" }}>
                      {netTrend.periodDelta >= 0 ? "+" : "−"}{fmt(Math.abs(netTrend.periodDelta))} este mes
                    </Text>
                    {Math.abs(netTrend.pctChange) > 0.05 && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: "rgba(255,255,255,0.10)",
                          borderRadius: 999,
                          paddingHorizontal: 6,
                          paddingVertical: 1.5,
                          gap: 2,
                        }}
                      >
                        <Ionicons
                          name={netTrend.pctChange >= 0 ? "arrow-up" : "arrow-down"}
                          size={8}
                          color={netTrend.pctChange >= 0 ? "rgba(134,239,172,0.85)" : "rgba(252,165,165,0.85)"}
                        />
                        <Text style={{ fontSize: 9.5, fontWeight: "700", color: netTrend.pctChange >= 0 ? "rgba(134,239,172,0.85)" : "rgba(252,165,165,0.85)" }}>
                          {Math.abs(netTrend.pctChange).toFixed(1)}%
                        </Text>
                      </View>
                    )}
                  </View>

                  {mainTab === "composicion" && (
                    <View style={{ alignSelf: "stretch" }}>
                      <DistributionBar cash={cashTotal} savings={savingsTotal} invest={investTotal} debt={debtTotal} />

                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        {legendItems.map((s) => (
                          <View key={s.label} style={{ alignItems: "center" }}>
                            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: s.color, marginBottom: 3 }} />
                            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 9.5 }}>{s.label}</Text>
                            <Text style={{ color: s.textColor, fontSize: 12, fontWeight: "700", marginTop: 1 }}>{fmt(s.value)}</Text>
                            <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 9.5, marginTop: 1 }}>
                              {distributionTotal > 0 ? ((s.value / distributionTotal) * 100).toFixed(0) + "%" : "—"}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </>
              }
            />
          </View>

          {mainTab === "composicion" ? (
            <>
              {/* ── Cartera / Tipo ── */}
              <View style={{ marginBottom: 10 }}>
                <SegmentedTabs<ViewBy>
                  variant="underline"
                  options={[
                    { key: "cartera", label: "Cartera" },
                    { key: "tipo", label: "Tipo" },
                  ]}
                  value={viewBy}
                  onChange={setViewBy}
                />
              </View>

              {/* ── Secciones con scroll ── */}
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => { setRefreshing(true); fetchData(true); void goalWallets.refetch(); }}
                  />
                }
              >
                {viewBy === "cartera" ? (
                  <>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
                      Carteras — {fmt(walletsTotal)}
                    </Text>

                    {wallets.length === 0 ? (
                      <EmptyRow label="Sin carteras" />
                    ) : (
                      wallets.map((w) => <WalletRow key={w.id} wallet={w} allocatedAmount={goalWallets.data?.find((item) => item.id === w.id)?.allocatedAmount}
                        onPress={() => { setSelectedWallet(w); void goalWallets.refetch(); }} />)
                    )}
                  </>
                ) : (
                  <>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
                      Activos — {fmt(totalAssets)}
                    </Text>

                    <Section kindKey="cash" total={cashTotal}>
                      {cashWallets.length === 0 ? (
                        <EmptyRow label="Sin carteras de gastos" />
                      ) : (
                        cashWallets.map((w) => (
                          <Row key={w.id} emoji={w.emoji} name={w.name} amount={w.balance}
                            currency={w.currency} allocatedAmount={goalWallets.data?.find((item) => item.id === w.id)?.allocatedAmount}
                            onPress={() => { setSelectedWallet(w); void goalWallets.refetch(); }}
                            amountColor={w.balance >= 0 ? "#16A34A" : "#DC2626"} />
                        ))
                      )}
                    </Section>

                    <Section kindKey="savings" total={savingsTotal}>
                      {savingsWallets.length === 0 ? (
                        <EmptyRow label="Sin carteras de ahorro" />
                      ) : (
                        savingsWallets.map((w) => (
                          <Row key={w.id} emoji={w.emoji} name={w.name} amount={w.balance}
                            currency={w.currency} allocatedAmount={goalWallets.data?.find((item) => item.id === w.id)?.allocatedAmount}
                            onPress={() => { setSelectedWallet(w); void goalWallets.refetch(); }}
                            amountColor="#16A34A" />
                        ))
                      )}
                    </Section>

                    <Section kindKey="investment" total={investTotal}>
                      {sortedAssets.length === 0 ? (
                        <EmptyRow label="Sin activos de inversión" />
                      ) : (
                        sortedAssets.map((a) => (
                          <Row
                            key={a.id}
                            emoji={ASSET_TYPE_EMOJI[a.type] ?? "💼"}
                            name={a.abbreviation?.trim() || a.name}
                            amount={a.currentValue}
                            amountColor="#16A34A"
                          />
                        ))
                      )}
                    </Section>

                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10, marginTop: 4 }}>
                      Pasivos — {fmt(totalLiabilities)}
                    </Text>

                    <Section kindKey="debt" total={totalLiabilities} defaultOpen={activeDebts.length > 0}>
                      {activeDebts.length === 0 ? (
                        <EmptyRow label="Sin deudas activas" />
                      ) : (
                        activeDebts.map((d) => (
                          <Row key={d.id} emoji={d.emoji || "💸"} name={d.name}
                            amount={d.remainingAmount} amountColor="#EF4444" />
                        ))
                      )}
                    </Section>
                  </>
                )}
              </ScrollView>
            </>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => { setRefreshing(true); fetchData(true); }}
                />
              }
            >
              <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
                {EVO_RANGES.map((r) => {
                  const active = evoRange === r.key;
                  return (
                    <TouchableOpacity
                      key={r.key}
                      onPress={() => setEvoRange(r.key)}
                      activeOpacity={0.8}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 999,
                        backgroundColor: active ? "#DBEAFE" : "#F1F5F9",
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "700", color: active ? colors.primary : "#6B7280" }}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <EvolutionChart points={evoPoints} />

              <View style={{ flexDirection: "row", gap: 10 }}>
                <StatCard label="Este mes" delta={netTrend.periodDelta} pct={netTrend.pctChange} />
                <StatCard label="Este año" delta={netTrendYear.periodDelta} pct={netTrendYear.pctChange} />
              </View>

              {/* ── Resumen {año} ── */}
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A", marginTop: 20, marginBottom: 8 }}>
                Resumen {selectedTableYear}
              </Text>
              <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: 12 }}>
                <View style={{ flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" }}>
                  <Text style={{ flex: 0.9, fontSize: 11, fontWeight: "700", color: "#9CA3AF" }}>Mes</Text>
                  <Text style={{ flex: 1.15, fontSize: 11, fontWeight: "700", color: "#9CA3AF", textAlign: "center" }}>Ingresos</Text>
                  <Text style={{ flex: 1.15, fontSize: 11, fontWeight: "700", color: "#9CA3AF", textAlign: "center" }}>Gastos</Text>
                  <Text style={{ flex: 1.3, fontSize: 11, fontWeight: "700", color: "#9CA3AF", textAlign: "right" }}>Ahorro</Text>
                </View>

                {yearSummaryList.map((m, i) => {
                  const finished = isPastSelectedYear || (isCurrentSelectedYear && i < currentMonthNow);
                  return (
                    <BreakdownRow
                      key={i}
                      label={m.monthName}
                      income={m.income}
                      expense={m.expense}
                      saving={m.saving}
                      investment={m.investment}
                      finalAmount={m.finalAmount}
                      finished={finished}
                      expanded={expandedMonth === i}
                      onPress={() => finished && setExpandedMonth(expandedMonth === i ? null : i)}
                    />
                  );
                })}

                <View style={{ flexDirection: "row", paddingVertical: 10 }}>
                  <Text style={{ flex: 0.9, fontSize: 13, fontWeight: "800", color: "#0F172A" }} numberOfLines={1}>TOTAL</Text>
                  <Text style={{ flex: 1.15, fontSize: 12, fontWeight: "800", textAlign: "center", color: "#0F172A" }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{fmtNum(totalYearIncome)}</Text>
                  <Text style={{ flex: 1.15, fontSize: 12, fontWeight: "800", textAlign: "center", color: "#0F172A" }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{fmtNum(totalYearExpense)}</Text>
                  <Text
                    style={{
                      flex: 1.3,
                      fontSize: 12,
                      fontWeight: "800",
                      textAlign: "right",
                      color: totalYearSaving >= 0 ? "#16A34A" : "#DC2626",
                    }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {fmtNum(totalYearSaving, true)}
                  </Text>
                </View>
              </View>

              {/* ── Resumen global ── */}
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A", marginTop: 20, marginBottom: 8 }}>
                Resumen global
              </Text>
              <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: 12 }}>
                <View style={{ flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" }}>
                  <Text style={{ flex: 0.9, fontSize: 11, fontWeight: "700", color: "#9CA3AF" }}>Año</Text>
                  <Text style={{ flex: 1.15, fontSize: 11, fontWeight: "700", color: "#9CA3AF", textAlign: "center" }}>Ingresos</Text>
                  <Text style={{ flex: 1.15, fontSize: 11, fontWeight: "700", color: "#9CA3AF", textAlign: "center" }}>Gastos</Text>
                  <Text style={{ flex: 1.3, fontSize: 11, fontWeight: "700", color: "#9CA3AF", textAlign: "right" }}>Ahorro</Text>
                </View>

                {globalSummaryList.map((y) => {
                  const finished = y.year < currentYearNow;
                  return (
                    <BreakdownRow
                      key={y.year}
                      label={String(y.year)}
                      income={y.income}
                      expense={y.expense}
                      saving={y.saving}
                      investment={y.investment}
                      finalAmount={y.finalAmount}
                      finished={finished}
                      expanded={expandedGlobalYear === y.year}
                      highlighted={selectedTableYear === y.year}
                      onPress={() => {
                        // Seleccionar el año (para la tabla mensual de arriba)
                        // siempre funciona, incluso en el año en curso, que
                        // todavía no tiene datos "cerrados" que desplegar.
                        setSelectedTableYear(y.year);
                        if (finished) setExpandedGlobalYear(expandedGlobalYear === y.year ? null : y.year);
                      }}
                    />
                  );
                })}

                <View style={{ flexDirection: "row", paddingVertical: 10 }}>
                  <Text style={{ flex: 0.9, fontSize: 13, fontWeight: "800", color: "#0F172A" }} numberOfLines={1}>TOTAL</Text>
                  <Text style={{ flex: 1.15, fontSize: 12, fontWeight: "800", textAlign: "center", color: "#0F172A" }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{fmtNum(totalGlobalIncome)}</Text>
                  <Text style={{ flex: 1.15, fontSize: 12, fontWeight: "800", textAlign: "center", color: "#0F172A" }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{fmtNum(totalGlobalExpense)}</Text>
                  <Text
                    style={{
                      flex: 1.3,
                      fontSize: 12,
                      fontWeight: "800",
                      textAlign: "right",
                      color: totalGlobalSaving >= 0 ? "#16A34A" : "#DC2626",
                    }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {fmtNum(totalGlobalSaving, true)}
                  </Text>
                </View>
              </View>

              {/* ── Añadir año / mes manual ── */}
              <TouchableOpacity
                onPress={() => navigation.navigate("EditMonth", { mode: "select" })}
                activeOpacity={0.85}
                style={{ marginTop: 16, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "white" }}
              >
                <Text style={{ textAlign: "center", fontSize: 13, fontWeight: "700", color: "#334155" }}>
                  Añadir año / mes manual
                </Text>
              </TouchableOpacity>
              <Text style={{ textAlign: "center", color: "#9CA3AF", marginTop: 6, fontSize: 11 }}>
                Úsalo para un registro manual en cualquier mes.
              </Text>
            </ScrollView>
          )}
        </>
      )}

      {selectedWallet && <WalletGoalReservationsModal wallet={selectedWallet} onClose={() => setSelectedWallet(null)} onOpenGoal={(goalId) => {
        setSelectedWallet(null);
        navigation.navigate("GoalDetail", { goalId });
      }} />}
      <NetWorthBreakdownModal
        visible={breakdownVisible}
        onClose={() => setBreakdownVisible(false)}
        onOpenDetails={() => {
          setBreakdownVisible(false);
          setMainTab("evolucion");
        }}
        current={netTrend.current}
        periodDelta={netTrend.periodDelta}
        periodLabel={netTrend.periodLabel}
        savings={netTrend.periodSavings}
        investmentResult={currentInvestmentResult}
        adjustments={currentAdjustments}
      />
    </SafeAreaView>
  );
}
