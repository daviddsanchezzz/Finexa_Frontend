// src/screens/Investments/InvestmentsHomeScreen.tsx
import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Modal,
  Alert,
  RefreshControl,
  Platform,
  ActivityIndicator,
  Animated,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { Circle, G, Path, Line, Text as SvgText } from "react-native-svg";
import AppHeader from "../../../../components/AppHeader";
import AddButton from "../../../../components/AddButton";
import OverflowMenuButton from "../../../../components/OverflowMenuButton";
import SegmentedTabs from "../../../../components/SegmentedTabs";
import HeroBalanceCard from "../../../../components/HeroBalanceCard";
import StatsRow from "../../../../components/StatsRow";
import InvestmentsFiltersModal, {
  type InvestmentFilters,
  DEFAULT_INVESTMENT_FILTERS,
  countActiveInvestmentFilters,
  applyInvestmentFilters,
} from "../../../../components/InvestmentsFiltersModal";
import { colors } from "../../../../theme/theme";
import { useTheme } from "../../../../context/ThemeContext";
import api from "../../../../api/api";
import { InvestmentsScreenSkeleton } from "../../../../components/skeletons/InvestmentsScreenSkeleton";
import DonutPro, { DonutSlice } from "../../../../components/DonutPro";
import { translateCountry, translateSector } from "../../../../utils/investmentLabels";
import { getInvestmentsDataVersion, subscribeInvestmentsInvalidation } from "../../../../utils/investmentsInvalidation";
import { formatEuro } from "../../../../utils/currency";
import { useUIStore } from "../../../../store/uiStore";
import { findCryptoPresetBySymbol, getCryptoLogoUrl } from "../../../../constants/bankPresets";
import WalletIcon from "../../../../components/WalletIcon";
import InvestmentOperationDetailsModal from "../../../../components/InvestmentOperationDetailsModal";
import ChartTooltip from "../../../../components/ChartTooltip";

type InvestmentAssetType = "crypto" | "etf" | "stock" | "fund" | "custom" | "cash";

type PortfolioSnapshotRow = {
  monthStart: string;
  currency: string;
  startValue: number | null;
  endValue: number;
  cashflowNet: number;
  profit: number;
  returnPct: number | null;
};

type MonthlyRentRow = {
  monthStart: string;
  currency: string;
  startValue: number | null;
  endValue: number | null;
  cashflowNet: number | null;
  profit: number | null;
  returnPct: number | null;
};

interface SummaryAssetFromApi {
  id: number;
  name: string;
  abbreviation?: string | null;
  identificator?: string | null;
  type: InvestmentAssetType;
  currency: string;
  invested: number;
  currentValue: number;
  pnl: number;
  returnPct?: number | null;
  lastValuationDate: string | null;
  description?: string | null;
}

interface SummaryFromApi {
  totalInvested: number;
  totalCurrentValue: number;
  totalPnL: number;
  returnPct?: number | null;
  asOf?: string;
  assets: SummaryAssetFromApi[];
}

type ExposureRow = { name: string; value: number; percentage: number };
type ExposureResponse = {
  countries: ExposureRow[];
  sectors: ExposureRow[];
  indirectHoldings: Array<{ name: string; ticker?: string | null; value: number; percentage: number }>;
  totalPortfolioValue: number;
};

type TargetItem = {
  assetId: number;
  assetName: string;
  assetAbbreviation?: string | null;
  assetType: InvestmentAssetType;
  currentValue: number;
  actualPct: number;
  targetPct: number;
  driftPct: number;
};

type TargetsResponse = {
  totalCurrentValue: number;
  targetSumPct: number;
  items: TargetItem[];
};

type TimelinePoint = {
  date: string;
  totalCurrentValue: number;
  equity: number;
  netContributions: number;
  externalFlow: number;
  result: number;
  dailyReturn: number | null;
  twr: number;
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

const assetTypeColor = (type: InvestmentAssetType): string => {
  switch (type) {
    case "crypto":  return "#F59E0B";
    case "stock":   return "#22C55E";
    case "etf":     return "#0EA5E9";
    case "fund":    return "#7C3AED";
    default:        return "#64748B";
  }
};

const assetTypeSoftBg = (type: InvestmentAssetType): string => {
  switch (type) {
    case "crypto":  return "#FEF3C7";
    case "stock":   return "#DCFCE7";
    case "etf":     return "#E0F2FE";
    case "fund":    return "#EDE9FE";
    default:        return "#F1F5F9";
  }
};

const palette = [
  "#2563EB", "#16A34A", "#F59E0B", "#DC2626",
  "#7C3AED", "#0EA5E9", "#10B981", "#F97316",
  "#EC4899", "#64748B",
];

const formatMoney = (n: number, currency = "EUR") => {
  const v = Number.isFinite(n) ? n : 0;
  if (currency === "EUR") return `${formatEuro(v)} €`;
  return v.toLocaleString("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatPct = (pnl: number, invested: number) => {
  if (!invested) return "0.00%";
  return `${((pnl / invested) * 100).toFixed(2)}%`;
};

const pnlBadge = (pnl: number) => {
  if (pnl > 0)
    return { label: "Ganancia", color: "#16A34A", bg: "#DCFCE7", icon: "trending-up-outline" as const };
  if (pnl < 0)
    return { label: "Pérdida", color: "#DC2626", bg: "#FEE2E2", icon: "trending-down-outline" as const };
  return { label: "Neutro", color: "#6B7280", bg: "#E5E7EB", icon: "remove-outline" as const };
};

const typeLabel = (t: InvestmentAssetType) => {
  switch (t) {
    case "crypto": return "Crypto";
    case "etf":    return "ETF";
    case "stock":  return "Acción";
    case "fund":   return "Fondo";
    case "cash":   return "Efectivo";
    default:       return "Custom";
  }
};


const formatShortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatMonthName = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const m = d.toLocaleDateString("es-ES", { month: "long" });
  return m.charAt(0).toUpperCase() + m.slice(1);
};

const formatPctRatio = (p: number | null | undefined) => {
  if (p == null || !Number.isFinite(p)) return "-";
  return `${(p * 100).toFixed(2).replace(".", ",")}%`;
};

const toneColor = (v: number) => (v > 0 ? "#16A34A" : v < 0 ? "#DC2626" : "#64748B");
const toneBg   = (v: number) => (v > 0 ? "#DCFCE7" : v < 0 ? "#FEE2E2" : "#E5E7EB");

type InvestmentOperationType =
  | "buy" | "sell" | "transfer_in" | "transfer_out" | "swap_in" | "swap_out"
  | "dividend" | "fee";

type OperationFilter = "all" | "buy" | "sell";
type RentRange = "1m" | "3m" | "6m" | "ytd" | "1a" | "all";

type AllOperationFromApi = {
  id: number;
  assetId: number;
  type: InvestmentOperationType;
  date?: string | null;
  amount: number;
  quantity?: string | null;
  fee?: number | null;
  description?: string | null;
  walletId?: number | null;
  wallet?: { id?: number; name?: string | null } | null;
  transaction?: {
    description?: string | null;
    wallet?: { name?: string | null } | null;
    fromWalletId?: number | null;
    toWalletId?: number | null;
    fromWallet?: { name?: string | null } | null;
    toWallet?: { name?: string | null } | null;
  } | null;
  swapGroupId?: string | number | null;
  createdAt?: string | null;
  asset?: {
    id: number;
    name: string;
    abbreviation?: string | null;
    currency?: string | null;
    description?: string | null;
  } | null;
};

function opLabel(t: InvestmentOperationType) {
  switch (t) {
    case "buy":          return "Compra";
    case "sell":         return "Venta";
    case "transfer_in":  return "Aportación";
    case "transfer_out": return "Retirada";
    case "dividend":     return "Dividendo";
    case "fee":          return "Comisión";
    case "swap_in":
    case "swap_out":     return "Swap";
    default:             return "Operación";
  }
}

function opTypeColor(t: InvestmentOperationType) {
  switch (t) {
    case "buy":          return { color: colors.primary, bg: "#EEF2FF" };
    case "sell":         return { color: "#7C3AED", bg: "#F3E8FF" };
    case "transfer_in":  return { color: "#0F766E", bg: "#CCFBF1" };
    case "transfer_out": return { color: "#D97706", bg: "#FEF3C7" };
    case "dividend":     return { color: colors.success, bg: "#DCFCE7" };
    case "fee":          return { color: "#64748B", bg: "#F1F5F9" };
    default:             return { color: "#64748B", bg: "#F1F5F9" };
  }
}

function opTypeIcon(t: InvestmentOperationType): keyof typeof Ionicons.glyphMap {
  switch (t) {
    case "buy":          return "arrow-down-outline";
    case "sell":         return "arrow-up-outline";
    case "transfer_in":  return "add-circle-outline";
    case "transfer_out": return "remove-circle-outline";
    case "dividend":     return "cash-outline";
    case "fee":          return "receipt-outline";
    default:              return "swap-horizontal-outline";
  }
}

export default function InvestmentsHomeScreen({ navigation, isPinnedModuleTab = false }: any) {
  const { isDark, colors: t } = useTheme();
  const showToast = useUIStore((s) => s.showToast);
  const [summary, setSummary] = useState<SummaryFromApi | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSliceId, setSelectedSliceId] = useState<number | null>(null);
  const [legendOpen, setLegendOpen] = useState(true);
  const [snapshots, setSnapshots] = useState<PortfolioSnapshotRow[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  // Rentabilidad del mes en curso, calculada en vivo (no un snapshot cerrado
  // todavía) — se funde con `snapshots` en `snapshotsForRent` para que tabla,
  // gráfica y totales anuales la incluyan como "hasta hoy".
  const [currentMonthReturn, setCurrentMonthReturn] = useState<PortfolioSnapshotRow | null>(null);
  const [archivedAssets, setArchivedAssets] = useState<any[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [donutMode, setDonutMode] = useState<"asset" | "type" | "country" | "sector" | "holding">("asset");
  const [exposure, setExposure] = useState<ExposureResponse | null>(null);
  const [otrosExpanded, setOtrosExpanded] = useState(false);
  const [targets, setTargets] = useState<TargetsResponse | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [rentView, setRentView] = useState<"grafica" | "tabla">("tabla");
  const [rentTableMetric, setRentTableMetric] = useState<"pct" | "eur">("pct");
  const [monthPopup, setMonthPopup] = useState<{
    label: string;
    entries: Array<{ year: number; row: MonthlyRentRow }>;
    isAnnual?: boolean;
  } | null>(null);
  const [rentRange, setRentRange] = useState<RentRange>("1a");
  const [lineTooltip, setLineTooltip] = useState<null | { x: number; y: number; date: string; equity: number; net: number; returnPct: number }>(null);
  const lineTooltipIndexRef = useRef<number | null>(null);
  const dismissPerformanceTooltip = useCallback(() => {
    lineTooltipIndexRef.current = null;
    setLineTooltip(null);
  }, []);
  const [invalidationVersion, setInvalidationVersion] = useState<number>(() => getInvestmentsDataVersion());
  const [planLoading, setPlanLoading] = useState(false);
  const [rebalanceModalOpen, setRebalanceModalOpen] = useState(false);
  const [contributionInputOpen, setContributionInputOpen] = useState(false);
  const [contributionResultOpen, setContributionResultOpen] = useState(false);
  const [contributionAmountText, setContributionAmountText] = useState("");
  const [rebuildSnapshotLoading, setRebuildSnapshotLoading] = useState(false);
  const [selectedRebuildMonth, setSelectedRebuildMonth] = useState<string>("2026-05");
  const [rebalancePlan, setRebalancePlan] = useState<{
    sells: Array<{ assetId?: number; assetName: string; assetAbbreviation?: string | null; amount: number }>;
    buys: Array<{ assetId?: number; assetName: string; assetAbbreviation?: string | null; amount: number }>;
  } | null>(null);
  const [contributionPlan, setContributionPlan] = useState<{ amount: number; rows: Array<{ assetName: string; amount: number }> } | null>(null);
  const [allOperations, setAllOperations] = useState<AllOperationFromApi[]>([]);
  const [allOperationsLoading, setAllOperationsLoading] = useState(false);
  const [operationFilter, setOperationFilter] = useState<OperationFilter>("all");
  const [selectedOperation, setSelectedOperation] = useState<AllOperationFromApi | null>(null);
  const allOperationsFetchedRef = useRef(false);

  const { width: SCREEN_W } = useWindowDimensions();

  const donutSize = useMemo(() => {
    // Un 22 % más pequeño que la versión anterior para que la leyenda
    // empiece a verse en el primer viewport incluso en móviles compactos.
    const target = Math.floor(SCREEN_W * 0.39);
    return Math.max(104, Math.min(138, target));
  }, [SCREEN_W]);

  const donutStroke = useMemo(
    () => Math.max(10, Math.min(14, Math.round(donutSize * 0.10))),
    [donutSize]
  );

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setFetchError(false);
      const res = await api.get("/investments/summary");
      const data = (res.data || null) as SummaryFromApi | null;
      setSummary(data);
      return data;
    } catch {
      setFetchError(true);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchSnapshots = async () => {
    setSnapshotsLoading(true);
    try {
      const res = await api.get("/investments/snapshots");
      const rows = (res.data || []) as any[];
      const mapped: PortfolioSnapshotRow[] = rows
        .map((r) => ({
          monthStart: String(r.monthStart),
          currency: String(r.currency || "EUR"),
          startValue: r.startValue == null ? null : Number(r.startValue),
          endValue: Number(r.endValue ?? 0),
          cashflowNet: Number(r.cashflowNet ?? 0),
          profit: Number(r.profit ?? 0),
          returnPct: r.returnPct == null ? null : Number(r.returnPct),
        }))
        .sort((a, b) => new Date(b.monthStart).getTime() - new Date(a.monthStart).getTime());
      setSnapshots(mapped);
    } catch {
      setSnapshots([]);
    } finally {
      setSnapshotsLoading(false);
    }
  };

  const fetchCurrentMonthReturn = async () => {
    try {
      const res = await api.get("/investments/snapshots/current");
      const r = res.data || {};
      setCurrentMonthReturn({
        monthStart: String(r.monthStart),
        currency: String(r.currency || "EUR"),
        startValue: r.startValue == null ? null : Number(r.startValue),
        endValue: Number(r.endValue ?? 0),
        cashflowNet: Number(r.cashflowNet ?? 0),
        profit: Number(r.profit ?? 0),
        returnPct: r.returnPct == null ? null : Number(r.returnPct),
      });
    } catch {
      setCurrentMonthReturn(null);
    }
  };

  const fetchArchived = async () => {
    try {
      const res = await api.get("/investments/assets/archived");
      setArchivedAssets(res.data || []);
    } catch {
      setArchivedAssets([]);
    }
  };

  const fetchExposure = async () => {
    try {
      const res = await api.get("/investments/exposure");
      setExposure(res.data || null);
    } catch {
      setExposure(null);
    }
  };

  const fetchTargets = async () => {
    try {
      const res = await api.get("/investments/targets");
      const data = (res.data || null) as TargetsResponse | null;
      setTargets(data);
    } catch {
      setTargets(null);
    }
  };

  const fetchTimeline = async (asOf?: string) => {
    try {
      setTimelineLoading(true);
      const res = await api.get("/investments/timeline", { params: { days: "all", ...(asOf ? { asOf } : {}) } });
      const points = Array.isArray(res.data?.points) ? res.data.points : [];
      const mapped: TimelinePoint[] = points.map((p: any) => ({
        date: String(p.date),
        totalCurrentValue: Number(p.totalCurrentValue ?? p.equity ?? 0),
        equity: Number(p.equity ?? p.totalCurrentValue ?? 0),
        netContributions: Number(p.netContributions ?? 0),
        externalFlow: Number(p.externalFlow ?? 0),
        result: Number(p.result ?? (Number(p.equity ?? p.totalCurrentValue ?? 0) - Number(p.netContributions ?? 0))),
        dailyReturn: p.dailyReturn == null ? null : Number(p.dailyReturn),
        twr: Number(p.twr ?? 0),
      }));
      setTimeline(mapped);
    } catch {
      setTimeline([]);
    } finally {
      setTimelineLoading(false);
    }
  };

  const fetchAllOperations = useCallback(async (force = false) => {
    if (!force && allOperationsFetchedRef.current) return;
    try {
      setAllOperationsLoading(true);
      const res = await api.get("/investments/operations");
      const list: AllOperationFromApi[] = Array.isArray(res.data) ? res.data : [];
      list.sort((a, b) => {
        const da = new Date(a.date || a.createdAt || 0).getTime();
        const db = new Date(b.date || b.createdAt || 0).getTime();
        return db - da;
      });
      setAllOperations(list);
      allOperationsFetchedRef.current = true;
    } catch {
      setAllOperations([]);
    } finally {
      setAllOperationsLoading(false);
    }
  }, []);

  const currency = useMemo(() => "EUR", []);

  const handleRebalance = useCallback(async () => {
  try {
    setPlanLoading(true);
    const res = await api.post("/investments/rebalance/preview", { minOperation: 1 });
    const sells = (res.data?.sells || []) as Array<{ assetName: string; amount: number }>;
    const buys = (res.data?.buys || []) as Array<{ assetName: string; amount: number }>;
    setRebalancePlan({ sells, buys });
    setRebalanceModalOpen(true);
  } catch {
    Alert.alert("Error", "No se pudo calcular el balanceo.");
  } finally {
    setPlanLoading(false);
  }
}, [currency]);

const runContribution = useCallback(async (amount: number) => {
  try {
    setPlanLoading(true);
    const res = await api.post("/investments/contribution/preview", { amount, minOperation: 1 });
    const rows = (res.data?.allocations || []) as Array<{ assetName: string; amount: number }>;
    setContributionPlan({ amount, rows });
    setContributionResultOpen(true);
  } catch {
    Alert.alert("Error", "No se pudo calcular la aportacion.");
  } finally {
    setPlanLoading(false);
  }
}, [currency]);

  const handleContribution = useCallback(() => {
    setContributionAmountText("");
    setContributionInputOpen(true);
  }, []);

  const rebuildMaySnapshot = useCallback(async () => {
    const monthStart = selectedRebuildMonth ? `${selectedRebuildMonth}-01` : "2026-05-01";
    try {
      setRebuildSnapshotLoading(true);
      await api.post(`/investments/snapshots/rebuild?monthStart=${encodeURIComponent(monthStart)}`);
      showToast(`Snapshot de ${monthStart.slice(0, 7)} reconstruido.`, "success");
      await Promise.all([fetchSummary(), fetchSnapshots()]);
    } catch (e: any) {
      const msg = e?.response?.data?.message || "No se pudo reconstruir el snapshot.";
      showToast(String(msg), "error");
    } finally {
      setRebuildSnapshotLoading(false);
    }
  }, [fetchSnapshots, fetchSummary, selectedRebuildMonth, showToast]);

  const confirmRebuildMay = useCallback(() => {
    if (rebuildSnapshotLoading) return;
    const monthLabel = selectedRebuildMonth || "2026-05";
    const confirmed = Platform.OS === "web"
      ? window.confirm(`Se recalculará el snapshot de ${monthLabel} para el usuario actual.`)
      : true;
    if (!confirmed) return;
    rebuildMaySnapshot();
  }, [rebuildMaySnapshot, rebuildSnapshotLoading, selectedRebuildMonth]);

const submitContribution = useCallback(() => {
  const amount = Number((contributionAmountText || "").replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) {
    Alert.alert("Aportar", "Introduce una cantidad valida.");
    return;
  }
  setContributionInputOpen(false);
  runContribution(amount);
}, [contributionAmountText, runContribution]);

  const hasFetched = useRef(false);
  const lastFetchedInvalidationVersion = useRef<number>(-1);
  useEffect(() => {
    return subscribeInvestmentsInvalidation((v) => setInvalidationVersion(v));
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!hasFetched.current || lastFetchedInvalidationVersion.current !== invalidationVersion) {
        hasFetched.current = true;
        lastFetchedInvalidationVersion.current = invalidationVersion;
        // Fase 1 (crítica): solo summary para primer paint rápido
        fetchSummary()
          .then((summaryData) => {
            // Fase 2 (background): datos secundarios
            fetchSnapshots();
            fetchCurrentMonthReturn();
            fetchArchived();
            fetchExposure();
            fetchTargets();
            fetchTimeline(summaryData?.asOf);
          });
      }
    }, [invalidationVersion])
  );

  const hero = useMemo(() => {
    const totalInvested = summary?.totalInvested || 0;
    const totalCurrentValue = summary?.totalCurrentValue || 0;
    const totalPnL = summary?.totalPnL || 0;
    const pct = summary?.returnPct != null
      ? Number(summary.returnPct) * 100
      : totalInvested ? (totalPnL / totalInvested) * 100 : 0;
    const lastGlobal =
      (summary?.assets || [])
        .map((a) => a.lastValuationDate)
        .filter(Boolean)
        .sort((a: any, b: any) => new Date(b).getTime() - new Date(a).getTime())[0] || null;
    return {
      totalInvested, totalCurrentValue, totalPnL, pct,
      count: summary?.assets?.length || 0,
      lastGlobal,
    };
  }, [summary]);

  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<InvestmentFilters>(DEFAULT_INVESTMENT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const assets = useMemo(() => {
    const list = summary?.assets || [];
    return [...list].sort((a, b) => {
      const diff = (b.currentValue || 0) - (a.currentValue || 0);
      if (diff !== 0) return diff;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [summary]);

  const searchedAssets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((a) =>
      (a.name || "").toLowerCase().includes(q) ||
      (a.abbreviation || "").toLowerCase().includes(q) ||
      (a.identificator || "").toLowerCase().includes(q)
    );
  }, [assets, searchQuery]);

  const visibleAssets = useMemo(() => applyInvestmentFilters(searchedAssets, filters), [searchedAssets, filters]);
  const activeFilterCount = countActiveInvestmentFilters(filters);

  const allocation = useMemo(() => {
    const list = assets || [];
    const total = list.reduce((s, a) => s + (a.currentValue || 0), 0);
    if (!total) return { total: 0, slices: [] as DonutSlice[], otherAssets: [] as DonutSlice[] };

    const base = list
      .map((a, idx) => {
        const value = a.currentValue || 0;
        const pct = value / total;
        const assetLabel = a.abbreviation?.trim() || a.name;
        return { id: a.id, label: assetLabel, value, pct, color: palette[idx % palette.length] };
      })
      .filter((s) => s.pct > 0)
      .sort((a, b) => b.value - a.value);

    const MIN_PCT = 0.03;
    const big = base.filter((s) => s.pct >= MIN_PCT);
    const small = base.filter((s) => s.pct < MIN_PCT);

    if (small.length >= 2) {
      const otherValue = small.reduce((sum, s) => sum + s.value, 0);
      big.push({ id: -1, label: "Otros", value: otherValue, pct: otherValue / total, color: "#94A3B8" });
    } else {
      big.push(...small);
    }

    return { total, slices: big, otherAssets: small };
  }, [assets]);

  const totalWithoutCash = useMemo(
    () =>
      (assets || []).reduce(
        (sum, a) => sum + (a.type === "cash" ? 0 : Number(a.currentValue || 0)),
        0
      ),
    [assets]
  );

  const allocationByType = useMemo(() => {
    const list = assets || [];
    const total = list.reduce((s, a) => s + (a.currentValue || 0), 0);
    if (!total) return { total: 0, slices: [] as DonutSlice[], otherAssets: [] as DonutSlice[] };

    const typeColors: Record<string, string> = {
      crypto: "#F59E0B",
      stock: "#22C55E",
      etf: "#0EA5E9",
      fund: "#7C3AED",
      cash: "#64748B",
      custom: "#64748B",
    };
    const typeNames: Record<string, string> = {
      crypto: "Crypto",
      stock: "Acciones",
      etf: "ETFs",
      fund: "Fondos",
      cash: "Liquidez",
      custom: "Custom",
    };

    const typeMap = new Map<string, number>();
    for (const a of list) {
      typeMap.set(a.type, (typeMap.get(a.type) || 0) + (a.currentValue || 0));
    }

    const slices: DonutSlice[] = Array.from(typeMap.entries())
      .map(([type, value], idx) => ({
        id: 1000 + idx,
        label: typeNames[type] || type,
        value,
        pct: value / total,
        color: typeColors[type] || palette[idx % palette.length],
      }))
      .filter((s) => s.pct > 0)
      .sort((a, b) => b.value - a.value);

    return { total, slices, otherAssets: [] as DonutSlice[] };
  }, [assets]);

  const allocationByCountry = useMemo(() => {
    const total = Number(totalWithoutCash || 0);
    if (!total) return { total: 0, slices: [] as DonutSlice[], otherAssets: [] as DonutSlice[] };

    const countryValues = new Map<string, number>();
    for (const r of exposure?.countries || []) {
      const key = r.name;
      countryValues.set(key, (countryValues.get(key) || 0) + Number(r.value || 0));
    }

    const allEntries = Array.from(countryValues.entries())
      .map(([name, value], idx) => ({
        id: 2000 + idx,
        label: translateCountry(name),
        value,
        pct: value / total,
        color: palette[idx % palette.length],
      }))
      .filter((s) => s.pct > 0)
      .sort((a, b) => b.value - a.value);
    const isUnknownLike = (label: string) => label === "Otros" || label === "Sin datos" || label === "Desconocido";
    const nonSpecial = allEntries.filter((e) => !isUnknownLike(e.label));
    const unknownLike = allEntries.filter((e) => isUnknownLike(e.label));

    const top = nonSpecial.slice(0, 6);
    const remainder = nonSpecial.slice(6);
    const otherValue = remainder.reduce((sum, s) => sum + s.value, 0);
    const coveredValue = allEntries.reduce((sum, s) => sum + s.value, 0);
    const unknownLikeValue = unknownLike.reduce((sum, s) => sum + s.value, 0);
    const missingValue = Math.max(0, total - coveredValue);
    const unknownValue = unknownLikeValue + missingValue;

    const otherTotalValue = otherValue + unknownValue;
    const unknownSubItem: DonutSlice | null = unknownValue > 0.01
      ? { id: -2002, label: "Desconocido", value: unknownValue, pct: unknownValue / total, color: "#CBD5E1" }
      : null;
    const slices: DonutSlice[] = [...top];
    if (otherTotalValue > 0) {
      slices.push({ id: -2001, label: "Otros", value: otherTotalValue, pct: otherTotalValue / total, color: "#94A3B8" });
    }
    return { total, slices, otherAssets: unknownSubItem ? [...remainder, unknownSubItem] : remainder };
  }, [totalWithoutCash, exposure]);

  const allocationBySector = useMemo(() => {
    const total = Number(totalWithoutCash || 0);
    if (!total) return { total: 0, slices: [] as DonutSlice[], otherAssets: [] as DonutSlice[] };

    const sectorValues = new Map<string, number>();
    for (const r of exposure?.sectors || []) {
      const key = r.name;
      sectorValues.set(key, (sectorValues.get(key) || 0) + Number(r.value || 0));
    }

    const allEntries = Array.from(sectorValues.entries())
      .map(([name, value], idx) => ({
        id: 3000 + idx,
        label: translateSector(name),
        value,
        pct: value / total,
        color: palette[idx % palette.length],
      }))
      .filter((s) => s.pct > 0)
      .sort((a, b) => b.value - a.value);
    const isUnknownLike = (label: string) => label === "Otros" || label === "Sin datos" || label === "Desconocido";
    const nonSpecial = allEntries.filter((e) => !isUnknownLike(e.label));
    const unknownLike = allEntries.filter((e) => isUnknownLike(e.label));

    const top = nonSpecial.slice(0, 6);
    const remainder = nonSpecial.slice(6);
    const otherValue = remainder.reduce((sum, s) => sum + s.value, 0);
    const coveredValue = allEntries.reduce((sum, s) => sum + s.value, 0);
    const unknownLikeValue = unknownLike.reduce((sum, s) => sum + s.value, 0);
    const missingValue = Math.max(0, total - coveredValue);
    const unknownValue = unknownLikeValue + missingValue;

    const otherTotalValue = otherValue + unknownValue;
    const unknownSubItem: DonutSlice | null = unknownValue > 0.01
      ? { id: -3002, label: "Desconocido", value: unknownValue, pct: unknownValue / total, color: "#CBD5E1" }
      : null;
    const slices: DonutSlice[] = [...top];
    if (otherTotalValue > 0) {
      slices.push({ id: -3001, label: "Otros", value: otherTotalValue, pct: otherTotalValue / total, color: "#94A3B8" });
    }
    return { total, slices, otherAssets: unknownSubItem ? [...remainder, unknownSubItem] : remainder };
  }, [totalWithoutCash, exposure]);

  const allocationByHolding = useMemo(() => {
    const total = Number(totalWithoutCash || 0);
    if (!total) {
      return { total: 0, slices: [] as DonutSlice[], otherAssets: [] as DonutSlice[] };
    }
    const base = (exposure?.indirectHoldings || [])
      .map((h, idx) => ({
        id: 4000 + idx,
        label: h.ticker ? `${h.name} (${h.ticker})` : h.name,
        value: Number(h.value || 0),
        pct: Number(h.value || 0) / total,
        color: palette[idx % palette.length],
      }))
      .filter((s) => s.pct > 0)
      .sort((a, b) => b.value - a.value);
    const big = base.slice(0, 6);
    const small = base.slice(6);
    const otherValue = small.reduce((sum, s) => sum + s.value, 0);
    const coveredValue = base.reduce((sum, s) => sum + s.value, 0);
    const missingValue = Math.max(0, total - coveredValue);

    const otherTotalValue = otherValue + missingValue;
    const unknownSubItem: DonutSlice | null = missingValue > 0.01
      ? { id: -4002, label: "Desconocido", value: missingValue, pct: missingValue / total, color: "#CBD5E1" }
      : null;
    const slices: DonutSlice[] = [...big];
    if (otherTotalValue > 0) {
      slices.push({ id: -4001, label: "Otros", value: otherTotalValue, pct: otherTotalValue / total, color: "#94A3B8" });
    }
    return { total, slices, otherAssets: unknownSubItem ? [...small, unknownSubItem] : small };
  }, [totalWithoutCash, exposure]);

  const activeAllocation = useMemo(() => {
    if (donutMode === "type") return allocationByType;
    if (donutMode === "country") return allocationByCountry;
    if (donutMode === "sector") return allocationBySector;
    if (donutMode === "holding") return allocationByHolding;
    return allocation;
  }, [donutMode, allocation, allocationByType, allocationByCountry, allocationBySector, allocationByHolding]);

  const visibleDonutModes = useMemo(() => {
    const modes: Array<"asset" | "type" | "country" | "sector" | "holding"> = ["asset"];
    if (allocationByType.slices.length > 0) modes.push("type");
    if (allocationByCountry.slices.length > 0) modes.push("country");
    if (allocationBySector.slices.length > 0) modes.push("sector");
    if (allocationByHolding.slices.length > 0) modes.push("holding");
    return modes;
  }, [allocationByType.slices.length, allocationByCountry.slices.length, allocationBySector.slices.length, allocationByHolding.slices.length]);

  useEffect(() => {
    if (!visibleDonutModes.includes(donutMode)) {
      setDonutMode("asset");
      setSelectedSliceId(null);
      setOtrosExpanded(false);
    }
  }, [visibleDonutModes, donutMode]);

  const allocationMap = useMemo(() => {
    const total = allocation.total;
    if (!total) return new Map<number, number>();
    const m = new Map<number, number>();
    for (const a of assets) m.set(a.id, (a.currentValue || 0) / total);
    return m;
  }, [assets, allocation.total]);

  const selectedSlice = useMemo(() => {
    if (!activeAllocation.slices.length) return null;
    if (selectedSliceId == null) return null;
    return activeAllocation.slices.find((s) => s.id === selectedSliceId) || null;
  }, [activeAllocation.slices, selectedSliceId]);

  useEffect(() => {
    if (selectedSliceId == null) return;
    const exists = activeAllocation.slices.some((s) => s.id === selectedSliceId);
    if (!exists) setSelectedSliceId(null);
  }, [activeAllocation.slices, selectedSliceId]);

  // snapshots (meses cerrados) + el mes en curso calculado en vivo, para que
  // tabla/gráfica/totales anuales reflejen "cómo va" el mes actual sin
  // esperar a que cierre. Si por lo que sea ya existiera un snapshot cerrado
  // para ese mismo mes (p.ej. reconstruido a mano), ese gana y no se duplica.
  const snapshotsForRent = useMemo(() => {
    if (!currentMonthReturn) return snapshots;
    const alreadyClosed = snapshots.some((s) => s.monthStart === currentMonthReturn.monthStart);
    return alreadyClosed ? snapshots : [...snapshots, currentMonthReturn];
  }, [snapshots, currentMonthReturn]);

  // Años únicos de los snapshots (orden asc)
  const rentYears = useMemo(() => {
    const set = new Set<number>();
    snapshotsForRent.forEach((s) => set.add(new Date(s.monthStart).getUTCFullYear()));
    return Array.from(set).sort();
  }, [snapshotsForRent]);

  // Agregado anual
  const rentYearRows = useMemo(() => {
    return rentYears.map((y) => {
      const months = [...snapshotsForRent]
        .filter((s) => new Date(s.monthStart).getUTCFullYear() === y)
        .sort((a, b) => new Date(a.monthStart).getTime() - new Date(b.monthStart).getTime());
      const first = months[0];
      const last = months[months.length - 1];
      const cashflowNet = months.reduce((s, r) => s + r.cashflowNet, 0);
      const profit = months.reduce((s, r) => s + r.profit, 0);
      const validReturns = months
        .map((month) => month.returnPct)
        .filter((value): value is number => value != null && Number.isFinite(value));
      const returnPct = validReturns.length
        ? validReturns.reduce((factor, value) => factor * (1 + value), 1) - 1
        : null;
      return {
        year: y,
        currency: first?.currency ?? "EUR",
        startValue: first?.startValue ?? null,
        endValue: last?.endValue ?? 0,
        cashflowNet,
        profit,
        returnPct,
      };
    });
  }, [snapshotsForRent, rentYears]);

  const rebuildMonthOptions = useMemo(() => {
    const years = new Set<number>();
    snapshots.forEach((snapshot) => years.add(new Date(snapshot.monthStart).getUTCFullYear()));
    if (!years.size) years.add(new Date().getUTCFullYear());

    const options: Array<{ value: string; label: string }> = [];
    years.forEach((year) => {
      for (let month = 0; month < 12; month += 1) {
        const value = `${year}-${String(month + 1).padStart(2, "0")}`;
        const date = new Date(`${value}-01T00:00:00.000Z`);
        const label = date.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
        options.push({
          value,
          label: label.charAt(0).toUpperCase() + label.slice(1),
        });
      }
    });
    

    return options.sort((a, b) => b.value.localeCompare(a.value));
  }, [snapshots]);

  const performanceChart = useMemo(() => {
    const allPoints = [...timeline]
      .filter((p) => !!p?.date)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (allPoints.length < 2) return null;

    const now = new Date();
    const cutoff = (() => {
      if (rentRange === "all") return null;
      if (rentRange === "ytd") return new Date(now.getFullYear(), 0, 1).getTime();
      const days = rentRange === "1m" ? 30 : rentRange === "3m" ? 90 : rentRange === "6m" ? 180 : 365;
      return now.getTime() - days * 24 * 60 * 60 * 1000;
    })();

    let monthly = allPoints;
    if (cutoff != null) {
      const firstInside = allPoints.findIndex((p) => new Date(p.date).getTime() >= cutoff);
      if (firstInside > 0) monthly = allPoints.slice(firstInside - 1);
      else if (firstInside === 0) monthly = allPoints;
      else monthly = allPoints.slice(-1);
    }
    if (monthly.length < 2) return null;

    const W = Math.max(200, SCREEN_W - 72);
    const H = 180;
    const padL = 62;
    const padR = 10;
    const padT = 14;
    const padB = 28;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    const eqValues = monthly.map((p) => Number(p.equity || 0));
    const ncValues = monthly.map((p) => Number(p.netContributions || 0));
    const rawMin = Math.min(...eqValues, ...ncValues);
    const rawMax = Math.max(...eqValues, ...ncValues);
    const rawSpan = Math.max(1, rawMax - rawMin);
    const minV = rawMin - rawSpan * 0.08;
    const maxV = rawMax + rawSpan * 0.08;
    const span = Math.max(1, maxV - minV);
    const midV = (minV + maxV) / 2;

    const stepX = innerW / Math.max(1, monthly.length - 1);
    const mapY = (v: number) => padT + (1 - (v - minV) / span) * innerH;
    const bottomY = padT + innerH;

    const eqPts = monthly.map((p, i) => ({ x: padL + i * stepX, y: mapY(Number(p.equity || 0)) }));
    const ncPts = monthly.map((p, i) => ({ x: padL + i * stepX, y: mapY(Number(p.netContributions || 0)) }));

    const toPath = (arr: Array<{ x: number; y: number }>) =>
      arr.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(" ");

    const fillPath =
      toPath(eqPts) +
      ` L ${eqPts[eqPts.length - 1].x.toFixed(2)} ${bottomY.toFixed(2)}` +
      ` L ${eqPts[0].x.toFixed(2)} ${bottomY.toFixed(2)} Z`;

    const compactVal = (v: number) => {
      const abs = Math.abs(v);
      if (abs >= 1000) return `${(v / 1000).toFixed(1).replace(".", ",")}k`;
      return v.toFixed(0);
    };

    const yLabels = [
      { y: mapY(maxV), value: compactVal(maxV) },
      { y: mapY(midV), value: compactVal(midV) },
      { y: mapY(minV), value: compactVal(minV) },
    ];

    const first = monthly[0];
    const last = monthly[monthly.length - 1];
    const lastEquity = Number(last?.equity || 0);
    const lastNc = Number(last?.netContributions || 0);
    const startEquity = Number(first?.equity || 0);
    const startResult = Number(first?.result ?? (startEquity - Number(first?.netContributions || 0)));
    const gain = Number(last?.result ?? (lastEquity - lastNc)) - startResult;

    // La API entrega el retorno diario neutralizado por flujos externos. El
    // periodo y la curva acumulada se obtienen encadenando esos retornos.
    let periodGrowthFactor = 1;
    const returnValues = monthly.map((point, index) => {
      if (index > 0 && point.dailyReturn != null && Number.isFinite(point.dailyReturn)) {
        periodGrowthFactor *= 1 + point.dailyReturn;
      }
      return (periodGrowthFactor - 1) * 100;
    });
    const gainPct = returnValues[returnValues.length - 1] ?? 0;
    const returnRawMin = Math.min(0, ...returnValues);
    const returnRawMax = Math.max(0, ...returnValues);
    const returnRawSpan = Math.max(1, returnRawMax - returnRawMin);
    const returnMin = returnRawMin - returnRawSpan * 0.12;
    const returnMax = returnRawMax + returnRawSpan * 0.12;
    const returnSpan = Math.max(1, returnMax - returnMin);
    const mapReturnY = (v: number) => padT + (1 - (v - returnMin) / returnSpan) * innerH;
    const returnPts = returnValues.map((value, i) => ({ x: padL + i * stepX, y: mapReturnY(value), value }));
    const returnLabelValues = Array.from(new Set([returnRawMax, 0, returnRawMin].map((v) => Number(v.toFixed(1)))))
      .sort((a, b) => b - a);

    return {
      W, H, padL, bottomY,
      minV, maxV,
      eqPath: toPath(eqPts),
      ncPath: toPath(ncPts),
      fillPath,
      eqPts, ncPts,
      yLabels,
      monthly,
      firstDate: monthly[0]?.date ?? "",
      lastDate: monthly[monthly.length - 1]?.date ?? "",
      lastEquity, lastNc, startEquity, gain, gainPct,
      returnPath: toPath(returnPts),
      returnPts,
      returnValues,
      returnYLabels: returnLabelValues.map((value) => ({ y: mapReturnY(value), value })),
    };
  }, [timeline, rentRange, SCREEN_W]);

  const selectPerformancePoint = useCallback((locationX: number) => {
    if (!performanceChart?.eqPts.length) return;
    let closest = 0;
    let minDistance = Number.POSITIVE_INFINITY;
    performanceChart.eqPts.forEach((point, index) => {
      const distance = Math.abs(point.x - locationX);
      if (distance < minDistance) {
        minDistance = distance;
        closest = index;
      }
    });
    if (lineTooltipIndexRef.current === closest) return;

    lineTooltipIndexRef.current = closest;
    const point = performanceChart.eqPts[closest];
    setLineTooltip({
      x: point.x,
      y: point.y,
      date: performanceChart.monthly[closest]?.date ?? "",
      equity: Number(performanceChart.monthly[closest]?.equity || 0),
      net: Number(performanceChart.monthly[closest]?.netContributions || 0),
      returnPct: Number(performanceChart.returnValues[closest] || 0),
    });
    if (Platform.OS !== "web") void Haptics.selectionAsync();
  }, [performanceChart]);

  const [syncingMetadata, setSyncingMetadata] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const webTouchStartY = useRef(0);
  const webScrollAtTop = useRef(true);
  const pullAnim = useRef(new Animated.Value(0)).current;
  const currentPullY = useRef(0);
  const webRefreshingRef = useRef(false);
  const PULL_THRESHOLD = 80;
  const PULL_MAX = 65;
  const [fetchError, setFetchError] = useState(false);
  const [mainTab, setMainTab] = useState<"cartera" | "distribucion" | "rentabilidad" | "operaciones">("cartera");
  const [distributionView, setDistributionView] = useState<"actual" | "objetivo">("actual");
  const rentAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (mainTab === "operaciones") fetchAllOperations();
  }, [mainTab, fetchAllOperations]);

  useEffect(() => {
    if (mainTab !== "rentabilidad" || rentView !== "grafica") return;
    rentAnim.setValue(0);
    Animated.timing(rentAnim, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [mainTab, rentView, rentRange, rentAnim]);

  const syncAllMetadata = async () => {
    try {
      setSyncingMetadata(true);
      await api.post("/investments/metadata/sync-all");
      const summaryData = await fetchSummary();
      await Promise.all([fetchExposure(), fetchTargets(), fetchTimeline(summaryData?.asOf)]);
      Alert.alert("Composición actualizada", "Se ha lanzado la sincronización para todos los assets.");
    } catch (e: any) {
      const msg = e?.response?.data?.message || "No se pudo sincronizar la composición.";
      Alert.alert("Error", String(msg));
    } finally {
      setSyncingMetadata(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    allOperationsFetchedRef.current = false;
    const summaryData = await fetchSummary();
    await Promise.all([fetchSnapshots(), fetchCurrentMonthReturn(), fetchArchived(), fetchExposure(), fetchTargets(), fetchTimeline(summaryData?.asOf), fetchAllOperations(true)]);
    setRefreshing(false);
  }, [fetchAllOperations]);

  const handleWebTouchStart = useCallback((e: any) => {
    if (Platform.OS === "web") {
      webTouchStartY.current = e.nativeEvent?.touches?.[0]?.pageY ?? 0;
      currentPullY.current = 0;
    }
  }, []);

  const handleWebTouchMove = useCallback((e: any) => {
    if (Platform.OS !== "web" || webRefreshingRef.current || !webScrollAtTop.current) return;
    const y = e.nativeEvent?.touches?.[0]?.pageY ?? 0;
    const delta = Math.max(0, y - webTouchStartY.current);
    currentPullY.current = delta;
    pullAnim.setValue(Math.min(PULL_MAX, Math.sqrt(delta) * 4.5));
  }, [pullAnim, PULL_MAX]);

  const handleWebTouchEnd = useCallback(async () => {
    dismissPerformanceTooltip();
    if (Platform.OS !== "web") return;
    const delta = currentPullY.current;
    currentPullY.current = 0;
    if (webScrollAtTop.current && delta > PULL_THRESHOLD && !webRefreshingRef.current) {
      webRefreshingRef.current = true;
      Animated.spring(pullAnim, { toValue: 36, useNativeDriver: true }).start();
      await onRefresh();
      webRefreshingRef.current = false;
    }
    Animated.spring(pullAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
  }, [dismissPerformanceTooltip, pullAnim, onRefresh, PULL_THRESHOLD]);

  const TABS = [
    { key: "cartera",      label: "Cartera" },
    { key: "distribucion", label: "Distribución" },
    { key: "rentabilidad", label: "Rentabilidad" },
    { key: "operaciones",  label: "Operaciones" },
  ] as const;

  const assetMapForOps = useMemo(() => {
    const m = new Map<number, SummaryAssetFromApi>();
    (summary?.assets ?? []).forEach((a) => m.set(a.id, a));
    return m;
  }, [summary]);

  const resolveOperationAsset = useCallback((op: AllOperationFromApi) => {
    return op.asset || assetMapForOps.get(op.assetId) || null;
  }, [assetMapForOps]);

  const filteredOperations = useMemo(
    () => operationFilter === "all" ? allOperations : allOperations.filter((op) => op.type === operationFilter),
    [allOperations, operationFilter]
  );

  const operationsByMonth = useMemo(() => {
    const groups = new Map<string, { label: string; ops: AllOperationFromApi[] }>();
    filteredOperations.forEach((op) => {
      const d = new Date(op.date || op.createdAt || 0);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!groups.has(key)) {
        const label = d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
        groups.set(key, { label: label.charAt(0).toUpperCase() + label.slice(1), ops: [] });
      }
      groups.get(key)!.ops.push(op);
    });
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredOperations]);

  const compactReturn = `${hero.pct >= 0 ? "+" : "−"}${Math.abs(hero.pct).toFixed(2).replace(".", ",")}%`;

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      style={Platform.OS === "web" ? { overflow: "hidden" } : undefined}
      onTouchEnd={dismissPerformanceTooltip}
    >
      {/* -- Header -- */}
      <View className="px-5 pb-2">
        <AppHeader
          title="Inversiones"
          showProfile={false}
          showDatePicker={false}
          showBack={!isPinnedModuleTab}
          rightElement={
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <AddButton label="Añadir" onPress={() => navigation.navigate("InvestmentForm")} />
              <OverflowMenuButton
                title="Inversiones"
                accessibilityLabel="Acciones de inversiones"
                actions={[
                  {
                    label: "Nueva valoración",
                    onPress: () => navigation.navigate("InvestmentValuation"),
                  },
                  {
                    label: "Nueva operación",
                    onPress: () => navigation.navigate("InvestmentOperation"),
                  },
                ]}
              />
            </View>
          }
        />

        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 8 }}>
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#F3F4F6",
              borderRadius: 13,
              paddingHorizontal: 12,
              height: 38,
            }}
          >
            <Ionicons name="search-outline" size={16} color="#9CA3AF" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar inversiones"
              placeholderTextColor="#9CA3AF"
              style={
                Platform.OS === "web"
                  ? ({ flex: 1, marginLeft: 6, fontSize: 13, color: "#111827", outlineStyle: "none", outlineWidth: 0 } as any)
                  : { flex: 1, marginLeft: 6, fontSize: 13, color: "#111827" }
              }
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={() => setFiltersOpen(true)}
            activeOpacity={0.8}
            style={{
              width: 38,
              height: 38,
              borderRadius: 13,
              backgroundColor: "#F3F4F6",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="options-outline" size={18} color="#4B5563" />
            {activeFilterCount > 0 && (
              <View
                style={{
                  position: "absolute", top: -3, right: -3,
                  minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3,
                  backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
                  borderWidth: 1.5, borderColor: "white",
                }}
              >
                <Text style={{ color: "white", fontSize: 9.5, fontWeight: "800" }}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* -- Loading / Error states -- */}
      {loading && <InvestmentsScreenSkeleton />}

      {!loading && fetchError && (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 }}>
          <View style={{ width: 64, height: 64, borderRadius: 24, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="cloud-offline-outline" size={30} color="#DC2626" />
          </View>
          <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A" }}>Error al cargar</Text>
          <Text style={{ fontSize: 13, color: "#94A3B8", fontWeight: "600", textAlign: "center" }}>
            No se pudieron cargar las inversiones. Comprueba tu conexión.
          </Text>
          <TouchableOpacity
            onPress={() => { fetchSummary(); fetchSnapshots(); fetchCurrentMonthReturn(); fetchArchived(); fetchExposure(); fetchTargets(); }}
            activeOpacity={0.8}
            style={{ marginTop: 4, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 24 }}
          >
            <Text style={{ fontSize: 13, fontWeight: "800", color: "white" }}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {Platform.OS === "web" && !loading && !fetchError && (
        <View style={{ position: "absolute", top: 52, left: 0, right: 0, alignItems: "center", zIndex: 0 }}>
          <Animated.View style={{
            opacity: pullAnim.interpolate({ inputRange: [0, 20, PULL_MAX], outputRange: [0, 0, 1], extrapolate: "clamp" }),
            transform: [{ scale: pullAnim.interpolate({ inputRange: [0, PULL_MAX], outputRange: [0.5, 1], extrapolate: "clamp" }) }],
          }}>
            <View style={{ backgroundColor: "white", borderRadius: 20, padding: 8, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          </Animated.View>
        </View>
      )}

      {!loading && !fetchError && (
        <Animated.View
          style={Platform.OS === "web" ? { flex: 1, transform: [{ translateY: pullAnim }] } : { flex: 1 }}
          onTouchStart={handleWebTouchStart}
          onTouchMove={handleWebTouchMove}
          onTouchEnd={handleWebTouchEnd}
        >

          {/* Cartera conserva el resumen completo. */}
          {mainTab === "cartera" && (
            <View className="px-5">
              <HeroBalanceCard
                label="Valor actual total"
                value={formatMoney(hero.totalCurrentValue, currency)}
                style={{ marginBottom: 8 }}
                footer={
                  hero.count > 0 ? (
                    <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: "600", marginTop: 6, textAlign: "center" }}>
                      {hero.count} {hero.count === 1 ? "activo" : "activos"}
                      {hero.lastGlobal ? ` · Última actualización: ${formatShortDate(hero.lastGlobal)}` : ""}
                    </Text>
                  ) : undefined
                }
              />

              <StatsRow
                items={[
                  { key: "invertido", label: "INVERTIDO", value: formatMoney(hero.totalInvested, currency) },
                  {
                    key: "ganancia",
                    label: "RESULTADO",
                    value: `${hero.totalPnL >= 0 ? "+" : "−"}${formatMoney(Math.abs(hero.totalPnL), currency)}`,
                    color: hero.totalPnL >= 0 ? colors.success : colors.danger,
                  },
                  {
                    key: "rentabilidad",
                    label: "RENTABILIDAD",
                    value: compactReturn,
                    color: hero.pct >= 0 ? colors.success : colors.danger,
                  },
                ]}
              />
            </View>
          )}

          {mainTab !== "cartera" && (
            <View style={{ paddingHorizontal: 20 }}>
              <View
                style={{
                  height: 48,
                  borderRadius: 15,
                  backgroundColor: "white",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  paddingHorizontal: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  shadowColor: "#0F172A",
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 3 },
                  elevation: 1,
                }}
              >
                <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 3 }}>
                  <Text style={{ fontSize: 8.5, lineHeight: 11, fontWeight: "800", color: "#94A3B8", letterSpacing: 0.35 }}>VALOR ACTUAL</Text>
                  <Text adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.75} style={{ fontSize: 12, lineHeight: 17, fontWeight: "900", color: "#0F172A", fontVariant: ["tabular-nums"] }}>
                    {formatMoney(hero.totalCurrentValue, currency)}
                  </Text>
                </View>
                <View style={{ width: 1, height: 25, backgroundColor: "#E5E7EB" }} />
                <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 3 }}>
                  <Text style={{ fontSize: 8.5, lineHeight: 11, fontWeight: "800", color: "#94A3B8", letterSpacing: 0.35 }}>RESULTADO</Text>
                  <Text adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.72} style={{ fontSize: 12, lineHeight: 17, fontWeight: "900", color: hero.totalPnL >= 0 ? colors.success : colors.danger, fontVariant: ["tabular-nums"] }}>
                    {hero.totalPnL >= 0 ? "+" : "−"}{formatMoney(Math.abs(hero.totalPnL), currency)}
                  </Text>
                </View>
                <View style={{ width: 1, height: 25, backgroundColor: "#E5E7EB" }} />
                <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 3 }}>
                  <Text style={{ fontSize: 8.5, lineHeight: 11, fontWeight: "800", color: "#94A3B8", letterSpacing: 0.35 }}>RENTABILIDAD</Text>
                  <Text adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.75} style={{ fontSize: 12, lineHeight: 17, fontWeight: "900", color: hero.pct >= 0 ? colors.success : colors.danger, fontVariant: ["tabular-nums"] }}>
                    {compactReturn}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* -- Tabs -- */}
          <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E5E7EB", marginTop: 12 }}>
            {TABS.map(({ key, label }) => {
              const active = mainTab === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setMainTab(key)}
                  activeOpacity={0.8}
                  style={{
                    flex: 1, alignItems: "center",
                    paddingVertical: 11,
                    borderBottomWidth: 2.5,
                    borderBottomColor: active ? colors.primary : "transparent",
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: active ? "800" : "600", color: active ? colors.primary : "#94A3B8" }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* -- Contenido del tab -- */}
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120, paddingTop: 14 }}
            scrollEventThrottle={16}
            onScroll={(event) => {
              if (Platform.OS === "web") webScrollAtTop.current = event.nativeEvent.contentOffset.y <= 0;
            }}
            refreshControl={Platform.OS !== "web" ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
          >
        {/* == TAB: CARTERA == */}
        {mainTab === "cartera" && (
          <>
        <View className="px-5">
          {assets.length === 0 ? (
            <View style={{ alignItems: "center", marginTop: 48, gap: 12 }}>
              <View
                style={{
                  width: 64, height: 64, borderRadius: 24,
                  backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center",
                }}
              >
                <Ionicons name="stats-chart" size={30} color="#94A3B8" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A" }}>Sin activos aún</Text>
              <Text style={{ fontSize: 13, color: "#94A3B8", fontWeight: "600", textAlign: "center" }}>
                Crea tu primer activo para empezar a seguir tu cartera.
              </Text>
            </View>
          ) : visibleAssets.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 32 }}>
              <Ionicons name="search-outline" size={26} color="#CBD5E1" />
              <Text style={{ color: "#94A3B8", fontSize: 13, marginTop: 8, textAlign: "center" }}>
                {searchQuery.trim() ? `Sin resultados para "${searchQuery.trim()}"` : "Sin activos con este filtro."}
              </Text>
            </View>
          ) : (
            visibleAssets.map((a) => {
              const pctText = a.returnPct == null
                ? formatPct(a.pnl || 0, a.invested || 0)
                : `${(Number(a.returnPct) * 100).toFixed(2)}%`;
              const badge = pnlBadge(a.pnl);
              const typeColor = assetTypeColor(a.type);
              const typeBg = assetTypeSoftBg(a.type);
              const allocPct = allocationMap.get(a.id);
              const cryptoPreset = a.type === "crypto" ? findCryptoPresetBySymbol(a.identificator) : undefined;

              return (
                <TouchableOpacity
                  key={a.id}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate("InvestmentDetail", { assetId: a.id })}
                  style={{
                    backgroundColor: t.surface,
                    borderRadius: 18,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: t.border,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        width: 40, height: 40, borderRadius: 14,
                        backgroundColor: cryptoPreset ? "#F9FAFB" : typeBg,
                        alignItems: "center", justifyContent: "center",
                        marginRight: 12,
                      }}
                    >
                      {cryptoPreset ? (
                        <WalletIcon emoji={getCryptoLogoUrl(cryptoPreset.symbol)} size={22} />
                      ) : (
                        <Ionicons name={assetTypeIcon(a.type)} size={18} color={typeColor} />
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{ fontSize: 14, fontWeight: "700", color: t.text, lineHeight: 18 }}
                        numberOfLines={1}
                      >
                        {a.abbreviation?.trim() || a.name}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
                        <View
                          style={{
                            paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
                            backgroundColor: typeBg,
                          }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: "800", color: typeColor }}>
                            {typeLabel(a.type)}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11, color: "#94A3B8", fontWeight: "600" }}>
                          {formatMoney(a.currentValue || 0, currency)}
                        </Text>
                      </View>
                    </View>

                    <View style={{ alignItems: "flex-end", marginLeft: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: "800", color: badge.color }}>
                        {pctText}
                      </Text>
                      {allocPct != null && (
                        <Text style={{ fontSize: 10, fontWeight: "700", color: "#CBD5E1", marginTop: 2 }}>
                          {(allocPct * 100).toFixed(1)}% cartera
                        </Text>
                      )}
                    </View>

                    <Ionicons name="chevron-forward" size={14} color="#CBD5E1" style={{ marginLeft: 6 }} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {archivedAssets.length > 0 && (
          <TouchableOpacity
            onPress={() => setShowArchived((v) => !v)}
            activeOpacity={0.7}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 6 }}
          >
            <Ionicons name={showArchived ? "chevron-up-outline" : "archive-outline"} size={14} color="#94A3B8" />
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#94A3B8" }}>
              {showArchived ? "Ocultar archivadas" : `Ver archivadas (${archivedAssets.length})`}
            </Text>
          </TouchableOpacity>
        )}

        {/* ARCHIVADAS */}
        {showArchived && archivedAssets.length > 0 && (
          <View className="px-5" style={{ marginTop: 4, marginBottom: 4 }}>
            {archivedAssets.map((a) => (
              <TouchableOpacity
                key={a.id}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("InvestmentDetail", { assetId: a.id })}
                style={{
                  backgroundColor: isDark ? t.surface : "#F8FAFC",
                  borderRadius: 18,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  marginBottom: 6,
                  borderWidth: 1,
                  borderColor: t.border,
                  flexDirection: "row",
                  alignItems: "center",
                  opacity: 0.7,
                }}
              >
                <View
                  style={{
                    width: 36, height: 36, borderRadius: 12,
                    backgroundColor: "#E2E8F0",
                    alignItems: "center", justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <Ionicons name="archive-outline" size={16} color="#94A3B8" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#64748B" }} numberOfLines={1}>
                    {a.abbreviation?.trim() || a.name}
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: "600", color: "#CBD5E1", marginTop: 2 }}>
                    Archivada
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </View>
        )}

          </>
        )}

        {/* == TAB: DISTRIBUCIÓN == */}
        {mainTab === "distribucion" && (
          <>
        {assets.length > 0 && allocation.slices.length > 0 && (
          <>
            <View style={{ paddingHorizontal: 20, marginTop: 8, marginBottom: 10 }}>
              <SegmentedTabs<"actual" | "objetivo">
                options={[
                  { key: "actual", label: "Actual" },
                  { key: "objetivo", label: "Objetivo" },
                ]}
                value={distributionView}
                onChange={setDistributionView}
              />
            </View>

            {distributionView === "actual" && (
              <>
            <View
              style={{
                backgroundColor: t.surface,
                borderRadius: 24,
                padding: 16,
                marginBottom: 10,
                marginHorizontal: 20,
                borderWidth: 1,
                borderColor: t.border,
              }}
            >
              {/* Cabecera: total + toggle leyenda */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ alignItems: "flex-start" }}>
                  <Text style={{ fontSize: 10, fontWeight: "900", color: "#94A3B8" }}>Total</Text>
                  <Text style={{ fontSize: 12, fontWeight: "900", color: "#0F172A", marginTop: 2 }}>
                    {formatMoney(activeAllocation.total, currency)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setLegendOpen((p) => !p)}
                  activeOpacity={0.7}
                  style={{
                    width: 32, height: 32, borderRadius: 10,
                    backgroundColor: "#F1F5F9",
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Ionicons name={legendOpen ? "chevron-up" : "chevron-down"} size={16} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Toggle Por activo / Por tipo */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6, marginTop: 12, backgroundColor: "#F1F5F9", borderRadius: 12, padding: 4 }}
                >
                {visibleDonutModes.map((mode) => (
                    <TouchableOpacity
                      key={mode}
                      onPress={() => { setDonutMode(mode); setSelectedSliceId(null); setOtrosExpanded(false); }}
                      activeOpacity={0.8}
                      style={{
                        minWidth: 78, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 9,
                        backgroundColor: donutMode === mode ? "white" : "transparent",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "700", color: donutMode === mode ? colors.primary : "#6B7280" }}>
                        {mode === "asset"
                          ? "Activos"
                          : mode === "type"
                          ? "Tipo"
                          : mode === "country"
                          ? "Regiones"
                          : mode === "sector"
                          ? "Sectores"
                          : "Compañía"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

              {/* Donut */}
              <View style={{ alignItems: "center", marginTop: 8 }}>
                <DonutPro
                  slices={activeAllocation.slices}
                  size={donutSize}
                  strokeWidth={donutStroke}
                  selectedId={selectedSlice?.id ?? null}
                  onSelect={(id) => setSelectedSliceId((prev) => (prev === id ? null : id))}
                  centerValueText={
                    selectedSlice
                      ? formatMoney(selectedSlice.value, currency)
                      : formatMoney(activeAllocation.total, currency)
                  }
                />
              </View>

              {/* Leyenda */}
              {legendOpen && (
                <View style={{ marginTop: 8 }}>
                  {activeAllocation.slices.map((s) => {
                    const isActive = (selectedSlice?.id ?? null) === s.id;
                    const isOtros = s.label === "Otros";

                    return (
                      <View key={s.id}>
                        <TouchableOpacity
                          activeOpacity={0.85}
                            onPress={() => {
                              if (isOtros) {
                                setOtrosExpanded((p) => !p);
                              } else {
                                setSelectedSliceId((prev) => (prev === s.id ? null : s.id));
                            }
                          }}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            paddingVertical: 8,
                            borderBottomWidth: 1,
                            borderBottomColor: "#F1F5F9",
                            opacity: selectedSliceId != null && !isOtros ? (isActive ? 1 : 0.55) : 1,
                          }}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 10 }}>
                            <View style={{ width: 10, height: 10, borderRadius: 6, backgroundColor: s.color, marginRight: 8 }} />
                            <Text style={{ fontSize: 12, fontWeight: isActive ? "900" : "800", color: "#0F172A", flex: 1 }} numberOfLines={1}>
                              {s.label}
                            </Text>
                            {isOtros && (
                              <View style={{ flexDirection: "row", alignItems: "center", marginRight: 6 }}>
                                <Text style={{ fontSize: 10, fontWeight: "800", color: "#64748B", marginRight: 4 }}>
                                  {otrosExpanded ? "Ocultar" : `Ver ${activeAllocation.otherAssets.length} más`}
                                </Text>
                                <Ionicons
                                  name={otrosExpanded ? "chevron-up" : "chevron-down"}
                                  size={13}
                                  color="#94A3B8"
                                />
                              </View>
                            )}
                          </View>
                          <View style={{ alignItems: "flex-end" }}>
                            <Text style={{ fontSize: 12, fontWeight: "900", color: "#0F172A" }}>
                              {(s.pct * 100).toFixed(1)}%
                            </Text>
                            <Text style={{ fontSize: 10, fontWeight: "700", color: "#94A3B8", marginTop: 1 }}>
                              {formatMoney(s.value, currency)}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        {/* Sub-items de "Otros" */}
                        {isOtros && otrosExpanded && activeAllocation.otherAssets.map((oa) => (
                          <View
                            key={oa.id}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                              paddingVertical: 8,
                              paddingLeft: 18,
                              borderBottomWidth: 1,
                              borderBottomColor: "#F9FAFB",
                              backgroundColor: "#FAFAFA",
                            }}
                          >
                            <View style={{ flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 10 }}>
                              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: oa.color, marginRight: 8 }} />
                              <Text style={{ fontSize: 11, fontWeight: "700", color: "#374151", flex: 1 }} numberOfLines={1}>
                                {oa.label}
                              </Text>
                            </View>
                            <View style={{ alignItems: "flex-end" }}>
                              <Text style={{ fontSize: 11, fontWeight: "800", color: "#374151" }}>
                                {(oa.pct * 100).toFixed(1)}%
                              </Text>
                              <Text style={{ fontSize: 10, fontWeight: "600", color: "#94A3B8", marginTop: 1 }}>
                                {formatMoney(oa.value, currency)}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
              </>
            )}

            {distributionView === "objetivo" && (
              <>
            <View
              style={{
                backgroundColor: t.surface,
                borderRadius: 24,
                padding: 16,
                marginBottom: 10,
                marginHorizontal: 20,
                borderWidth: 1,
                borderColor: t.border,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: "900", color: "#0F172A" }}>Distribución objetivo</Text>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: "#94A3B8", marginTop: 2 }}>
                    Compara el peso actual con el deseado
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate("InvestmentTargetAllocation")}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: "#EEF2FF",
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Ionicons name="create-outline" size={13} color={colors.primary} />
                  <Text style={{ fontSize: 12, fontWeight: "900", color: colors.primary }}>Editar</Text>
                </TouchableOpacity>
              </View>

              <View style={{ marginTop: 16 }}>
                {(targets?.items || []).map((it, index, targetItems) => {
                  const targetPct = Number(it.targetPct || 0);
                  const actualPct = Number(it.actualPct || 0);
                  const deviation = actualPct - targetPct;
                  const isOnTarget = Math.abs(deviation) < 0.05;
                  const statusColor = isOnTarget ? colors.success : deviation > 0 ? "#C66A08" : colors.primary;
                  const statusBackground = isOnTarget ? "#DCFCE7" : deviation > 0 ? "#FFF7E8" : "#EEF2FF";
                  const deviationText = isOnTarget
                    ? "En objetivo"
                    : `${deviation > 0 ? "+" : "−"}${Math.abs(deviation).toFixed(1).replace(".", ",")} pp`;
                  const actualWidth = `${Math.max(0, Math.min(100, actualPct))}%` as any;
                  const targetLeft = `${Math.max(0, Math.min(99.5, targetPct))}%` as any;
                  const typeColor = assetTypeColor(it.assetType);
                  const typeBackground = assetTypeSoftBg(it.assetType);
                  const targetAsset = assets.find((asset) => asset.id === it.assetId);
                  const cryptoPreset = targetAsset?.type === "crypto"
                    ? findCryptoPresetBySymbol(targetAsset.identificator)
                    : undefined;

                  return (
                    <View
                      key={`target-${it.assetId}`}
                      style={{
                        paddingVertical: 11,
                        borderBottomWidth: index === targetItems.length - 1 ? 0 : 1,
                        borderBottomColor: "#E8EDF4",
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 9,
                            backgroundColor: cryptoPreset ? "#FFFFFF" : typeBackground,
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 9,
                          }}
                        >
                          {cryptoPreset ? (
                            <WalletIcon emoji={getCryptoLogoUrl(cryptoPreset.symbol)} size={20} />
                          ) : (
                            <Ionicons name={assetTypeIcon(it.assetType) as any} size={16} color={typeColor} />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: "800", color: "#0F172A" }} numberOfLines={1}>
                            {it.assetAbbreviation?.trim() || it.assetName}
                          </Text>
                          <Text style={{ fontSize: 10.5, fontWeight: "600", color: "#64748B", marginTop: 2 }} numberOfLines={1}>
                            <Text style={{ color: statusColor, fontWeight: "800" }}>{actualPct.toFixed(1).replace(".", ",")} %</Text>
                            {" actual  ·  "}{targetPct.toFixed(1).replace(".", ",")} % objetivo
                          </Text>
                        </View>
                        <View style={{ backgroundColor: statusBackground, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8 }}>
                          <Text style={{ fontSize: 10.5, fontWeight: "900", color: statusColor }}>{deviationText}</Text>
                        </View>
                      </View>

                      <View style={{ height: 6, borderRadius: 999, backgroundColor: "#E2E8F0", position: "relative", marginTop: 8 }}>
                        <View style={{ width: actualWidth, height: 6, borderRadius: 999, backgroundColor: statusColor }} />
                        <View
                          style={{
                            position: "absolute",
                            left: targetLeft,
                            top: -3,
                            width: 2,
                            height: 12,
                            borderRadius: 1,
                            backgroundColor: "#0F172A",
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>

              {(targets?.items || []).length > 0 && (
                <TouchableOpacity
                  onPress={() => runContribution(500)}
                  disabled={planLoading}
                  activeOpacity={0.82}
                  style={{
                    marginTop: 14,
                    padding: 12,
                    borderRadius: 14,
                    backgroundColor: "#F0FDF4",
                    borderWidth: 1,
                    borderColor: "#BBF7D0",
                    opacity: planLoading ? 0.7 : 1,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                      <Ionicons name="leaf-outline" size={16} color="#15803D" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12.5, fontWeight: "900", color: "#14532D" }}>Reequilibrar con 500 €</Text>
                      <Text style={{ fontSize: 10.5, fontWeight: "600", color: "#4D7C5B", marginTop: 2 }}>
                        Prioriza los activos infraponderados sin vender.
                      </Text>
                    </View>
                    {planLoading ? (
                      <ActivityIndicator size="small" color="#15803D" />
                    ) : (
                      <Ionicons name="arrow-forward" size={16} color="#15803D" />
                    )}
                  </View>
                </TouchableOpacity>
              )}

              <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                <TouchableOpacity
                  onPress={handleRebalance}
                  disabled={planLoading}
                  activeOpacity={0.85}
                  style={{
                    flex: 1,
                    height: 40,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#EEF2FF",
                    opacity: planLoading ? 0.7 : 1,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "900", color: colors.primary }}>Balancear</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleContribution}
                  disabled={planLoading}
                  activeOpacity={0.85}
                  style={{
                    flex: 1,
                    height: 40,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#DCFCE7",
                    opacity: planLoading ? 0.7 : 1,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "900", color: "#166534" }}>Aportar</Text>
                </TouchableOpacity>
              </View>
            </View>
              </>
            )}
          </>
        )}

          </>
        )}

        {/* == TAB: RENTABILIDAD == */}
        {mainTab === "rentabilidad" && (
          <>
        <View style={{ paddingHorizontal: 20, marginTop: 2, marginBottom: 10 }}>
          <SegmentedTabs<"tabla" | "grafica">
            options={[
              { key: "tabla", label: "Tabla" },
              { key: "grafica", label: "Gráfica" },
            ]}
            value={rentView}
            onChange={setRentView}
          />
        </View>

        {rentView === "grafica" && (
          <>
          <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", backgroundColor: "#F1F5F9", borderRadius: 12, padding: 3 }}>
              {([
                { key: "1m", label: "1M" },
                { key: "3m", label: "3M" },
                { key: "6m", label: "6M" },
                { key: "ytd", label: "YTD" },
                { key: "1a", label: "1A" },
                { key: "all", label: "TODO" },
              ] as const).map((range) => {
                const active = rentRange === range.key;
                return (
                  <TouchableOpacity
                    key={range.key}
                    onPress={() => {
                      setRentRange(range.key);
                      lineTooltipIndexRef.current = null;
                      setLineTooltip(null);
                    }}
                    activeOpacity={0.8}
                    style={{ flex: 1, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: active ? "white" : "transparent" }}
                  >
                    <Text style={{ fontSize: 10.5, fontWeight: "900", color: active ? colors.primary : "#64748B" }}>{range.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {timelineLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
            ) : performanceChart ? (
              <View style={{ alignItems: "center", paddingTop: 16 }}>
                <Text style={{ fontSize: 10.5, fontWeight: "800", color: "#94A3B8", letterSpacing: 0.5 }}>RESULTADO DEL PERIODO</Text>
                <Text style={{ fontSize: 28, fontWeight: "900", color: performanceChart.gain >= 0 ? colors.success : colors.danger, marginTop: 3, fontVariant: ["tabular-nums"] }}>
                  {performanceChart.gain >= 0 ? "+" : "−"}{formatMoney(Math.abs(performanceChart.gain), currency)}
                </Text>
                <Text style={{ fontSize: 16, fontWeight: "800", color: performanceChart.gainPct >= 0 ? colors.success : colors.danger, marginTop: 1 }}>
                  {performanceChart.gainPct >= 0 ? "+" : "−"}{Math.abs(performanceChart.gainPct).toFixed(2).replace(".", ",")} %
                </Text>
              </View>
            ) : (
              <Text style={{ textAlign: "center", color: "#94A3B8", fontSize: 12, fontWeight: "600", paddingVertical: 18 }}>Sin datos suficientes para este periodo.</Text>
            )}
          </View>

          <Animated.View
            style={{
              opacity: rentAnim,
              transform: [
                {
                  translateY: rentAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 0],
                  }),
                },
              ],
            }}
          >
            {/* Gráfica evolución */}
            <View
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(event) => selectPerformancePoint(event.nativeEvent.locationX - 16)}
              onResponderMove={(event) => selectPerformancePoint(event.nativeEvent.locationX - 16)}
              onTouchEnd={(event) => event.stopPropagation()}
              style={{ backgroundColor: t.surface, borderRadius: 24, marginHorizontal: 20, marginBottom: 10, borderWidth: 1, borderColor: t.border, padding: 16 }}
            >
              <Text style={{ fontSize: 14, fontWeight: "900", color: "#0F172A", marginBottom: 10 }}>Valor y capital aportado</Text>
              {timelineLoading ? (
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#94A3B8" }}>Cargando gráfica...</Text>
              ) : performanceChart ? (
                <>
                  <View style={{ position: "relative" }}>
                  <Svg width={performanceChart.W} height={performanceChart.H}>
                    {/* Y-axis reference lines */}
                    {performanceChart.yLabels.map((lbl, i) => (
                      <Line key={`yline-${i}`} x1={performanceChart.padL} y1={lbl.y} x2={performanceChart.W - 10} y2={lbl.y} stroke="#F1F5F9" strokeWidth={1} />
                    ))}
                    {/* Y-axis labels */}
                    {performanceChart.yLabels.map((lbl, i) => (
                      <SvgText key={`ylabel-${i}`} x={0} y={lbl.y + 4} fontSize="9" fill="#94A3B8" fontWeight="700">{lbl.value}</SvgText>
                    ))}
                    {/* Area fill bajo equity */}
                    <Path d={performanceChart.fillPath} fill={colors.primary} fillOpacity={0.08} />
                    {/* Líneas */}
                    <Path d={performanceChart.ncPath} stroke="#CBD5E1" strokeWidth={2} fill="none" strokeDasharray="5 4" />
                    <Path d={performanceChart.eqPath} stroke={colors.primary} strokeWidth={2.8} fill="none" />
                    {/* Dot en punto seleccionado */}
                    {lineTooltip && (() => {
                      const selectedIndex = performanceChart.eqPts.reduce(
                        (closest, point, index) =>
                          Math.abs(point.x - lineTooltip.x) < Math.abs(performanceChart.eqPts[closest].x - lineTooltip.x)
                            ? index
                            : closest,
                        0
                      );
                      const equityPoint = performanceChart.eqPts[selectedIndex];
                      const contributedPoint = performanceChart.ncPts[selectedIndex];
                      return (
                        <G>
                          <Line x1={equityPoint.x} y1={14} x2={equityPoint.x} y2={performanceChart.bottomY} stroke={colors.primary} strokeWidth={1} strokeDasharray="3 3" />
                          <Circle cx={equityPoint.x} cy={equityPoint.y} r={4} fill={colors.primary} stroke="white" strokeWidth={2} />
                          <Circle cx={contributedPoint.x} cy={contributedPoint.y} r={3.5} fill="#94A3B8" stroke="white" strokeWidth={2} />
                        </G>
                      );
                    })()}
                    {/* X labels */}
                    <SvgText x={performanceChart.padL} y={performanceChart.H - 4} fontSize="10" fill="#94A3B8">
                      {new Date(performanceChart.firstDate).toLocaleDateString("es-ES", { month: "short", year: "2-digit" })}
                    </SvgText>
                    <SvgText x={performanceChart.W - performanceChart.padL - 10} y={performanceChart.H - 4} fontSize="10" fill="#94A3B8">
                      {new Date(performanceChart.lastDate).toLocaleDateString("es-ES", { month: "short", year: "2-digit" })}
                    </SvgText>
                  </Svg>

                  {lineTooltip ? (() => {
                    const tooltipWidth = 184;
                    const tooltipLeft = Math.min(
                      Math.max(lineTooltip.x - tooltipWidth / 2, 0),
                      Math.max(performanceChart.W - tooltipWidth, 0)
                    );
                    const pointerLeft = Math.min(
                      Math.max(lineTooltip.x - tooltipLeft, 12),
                      tooltipWidth - 12
                    );
                    const result = lineTooltip.equity - lineTooltip.net;
                    const tone = result >= 0 ? colors.success : colors.danger;

                    return (
                      <ChartTooltip
                        title={new Date(lineTooltip.date).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
                        pointerLeft={pointerLeft}
                        style={{
                          position: "absolute",
                          width: tooltipWidth,
                          left: tooltipLeft,
                          top: -102,
                          zIndex: 20,
                          elevation: 6,
                        }}
                        rows={[
                          {
                            label: "Valor cartera",
                            color: colors.primary,
                            formattedValue: formatMoney(lineTooltip.equity, currency),
                          },
                          {
                            label: "Aportado",
                            color: "#94A3B8",
                            formattedValue: formatMoney(lineTooltip.net, currency),
                          },
                          {
                            label: "Resultado",
                            color: tone,
                            formattedValue: `${result >= 0 ? "+" : "−"}${formatMoney(Math.abs(result), currency)}`,
                          },
                          {
                            label: "Rentabilidad",
                            color: tone,
                            formattedValue: `${lineTooltip.returnPct >= 0 ? "+" : "−"}${Math.abs(lineTooltip.returnPct).toFixed(2).replace(".", ",")} %`,
                          },
                        ]}
                      />
                    );
                  })() : null}
                  </View>
                </>
              ) : (
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#94A3B8" }}>Sin datos suficientes para la gráfica.</Text>
              )}
            </View>

            <View
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(event) => selectPerformancePoint(event.nativeEvent.locationX - 16)}
              onResponderMove={(event) => selectPerformancePoint(event.nativeEvent.locationX - 16)}
              onTouchEnd={(event) => event.stopPropagation()}
              style={{ backgroundColor: t.surface, borderRadius: 24, marginHorizontal: 20, marginBottom: 10, borderWidth: 1, borderColor: t.border, padding: 16 }}
            >
              <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: "900", color: "#0F172A" }}>Rentabilidad acumulada</Text>
                {performanceChart && (
                  <Text style={{ fontSize: 12, fontWeight: "900", color: performanceChart.gainPct >= 0 ? colors.success : colors.danger }}>
                    Cartera {performanceChart.gainPct >= 0 ? "+" : "−"}{Math.abs(performanceChart.gainPct).toFixed(2).replace(".", ",")} %
                  </Text>
                )}
              </View>

              {lineTooltip ? (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: "800", color: "#0F172A" }}>
                    {new Date(lineTooltip.date).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                  </Text>
                  <Text style={{ fontSize: 11.5, fontWeight: "900", color: lineTooltip.returnPct >= 0 ? colors.success : colors.danger }}>
                    {lineTooltip.returnPct >= 0 ? "+" : "−"}{Math.abs(lineTooltip.returnPct).toFixed(2).replace(".", ",")}%
                  </Text>
                </View>
              ) : null}

              {performanceChart ? (
                <Svg width={performanceChart.W} height={performanceChart.H}>
                  {performanceChart.returnYLabels.map((label) => (
                    <G key={`return-${label.value}`}>
                      <Line
                        x1={performanceChart.padL}
                        y1={label.y}
                        x2={performanceChart.W - 10}
                        y2={label.y}
                        stroke={Math.abs(label.value) < 0.05 ? "#CBD5E1" : "#F1F5F9"}
                        strokeWidth={Math.abs(label.value) < 0.05 ? 1.5 : 1}
                      />
                      <SvgText x={0} y={label.y + 4} fontSize="9" fill="#94A3B8" fontWeight="700">
                        {label.value > 0 ? "+" : ""}{label.value.toFixed(1).replace(".", ",")}%
                      </SvgText>
                    </G>
                  ))}
                  <Path d={performanceChart.returnPath} stroke={colors.primary} strokeWidth={2.8} fill="none" />
                  {lineTooltip && (() => {
                    const selectedIndex = performanceChart.eqPts.reduce(
                      (closest, point, index) =>
                        Math.abs(point.x - lineTooltip.x) < Math.abs(performanceChart.eqPts[closest].x - lineTooltip.x)
                          ? index
                          : closest,
                      0
                    );
                    const point = performanceChart.returnPts[selectedIndex];
                    return (
                      <G>
                        <Line x1={point.x} y1={14} x2={point.x} y2={performanceChart.bottomY} stroke={colors.primary} strokeWidth={1} strokeDasharray="3 3" />
                        <Circle cx={point.x} cy={point.y} r={4} fill={colors.primary} stroke="white" strokeWidth={2} />
                      </G>
                    );
                  })()}
                  <SvgText x={performanceChart.padL} y={performanceChart.H - 4} fontSize="10" fill="#94A3B8">
                    {new Date(performanceChart.firstDate).toLocaleDateString("es-ES", { month: "short", year: "2-digit" })}
                  </SvgText>
                  <SvgText x={performanceChart.W - performanceChart.padL - 10} y={performanceChart.H - 4} fontSize="10" fill="#94A3B8">
                    {new Date(performanceChart.lastDate).toLocaleDateString("es-ES", { month: "short", year: "2-digit" })}
                  </SvgText>
                </Svg>
              ) : (
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#94A3B8" }}>Sin datos suficientes para la gráfica.</Text>
              )}
            </View>
          </Animated.View>
          </>
        )}

        {rentView === "tabla" && snapshotsForRent.length > 0 && (() => {
          const years = [...rentYearRows].map((r) => r.year).sort((a, b) => a - b);
          const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
          const rowLabelW = 112;
          const availableYearsWidth = Math.max(104, SCREEN_W - 40 - rowLabelW);
          const colW = Math.max(104, availableYearsWidth / Math.max(years.length, 1));
          const headerH = 40;
          const totalH = 50;
          const monthH = 46;

          const monthCellByYear = new Map<number, Map<number, MonthlyRentRow>>();
          years.forEach((y) => {
            const mm = new Map<number, MonthlyRentRow>();
            snapshotsForRent
              .filter((s) => new Date(s.monthStart).getUTCFullYear() === y)
              .forEach((s) => mm.set(new Date(s.monthStart).getUTCMonth(), s));
            monthCellByYear.set(y, mm);
          });

          const isCurrentMonthCell = (row: MonthlyRentRow | null) =>
            !!row && !!currentMonthReturn && row.monthStart === currentMonthReturn.monthStart;

          const formatCell = (value: number | null | undefined, mode: "pct" | "eur", ccy: string) => {
            if (value == null || !Number.isFinite(value)) return "—";
            if (mode === "pct") return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2).replace(".", ",")}%`;
            return `${value >= 0 ? "+" : "-"}${formatMoney(Math.abs(value), ccy)}`;
          };

          const pillColors = (value: number | null | undefined) => {
            if (value == null || !Number.isFinite(value)) return { color: "#CBD5E1", bg: "transparent" };
            if (value > 0) return { color: "#16A34A", bg: "#DCFCE7" };
            if (value < 0) return { color: "#DC2626", bg: "#FEE2E2" };
            return { color: "#64748B", bg: "#F1F5F9" };
          };

          const annualRow = (year: number): MonthlyRentRow | null => {
            const row = rentYearRows.find((item) => item.year === year);
            if (!row) return null;
            return {
              monthStart: `${year}-01-01T00:00:00.000Z`,
              currency: row.currency,
              startValue: row.startValue,
              endValue: row.endValue,
              cashflowNet: row.cashflowNet,
              profit: row.profit,
              returnPct: row.returnPct,
            };
          };

          const openAllAnnualDetails = () => {
            const entries = years
              .map((year) => ({ year, row: annualRow(year) }))
              .filter((entry): entry is { year: number; row: MonthlyRentRow } => entry.row !== null);
            if (entries.length) setMonthPopup({ label: "Total año", entries, isAnnual: true });
          };

          return (
            <View style={{ marginHorizontal: 20, marginTop: 2, marginBottom: 12, backgroundColor: "white", borderRadius: 22, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }}>
              {/* Unidad de toda la matriz */}
              <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 10, paddingTop: 8, paddingBottom: 7 }}>
                <View style={{ flexDirection: "row", backgroundColor: "#F1F5F9", borderRadius: 12, padding: 3 }}>
                  {([{ key: "pct", label: "%" }, { key: "eur", label: "€" }] as const).map((m) => (
                    <TouchableOpacity
                      key={m.key}
                      onPress={() => setRentTableMetric(m.key)}
                      style={{
                        width: 38, height: 26, borderRadius: 9, alignItems: "center", justifyContent: "center",
                        backgroundColor: rentTableMetric === m.key ? "white" : "transparent",
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "900", color: rentTableMetric === m.key ? colors.primary : "#94A3B8" }}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* La columna de meses queda fuera del scroll: permanece fija. */}
              <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: "#F1F5F9" }}>
                <View style={{ width: rowLabelW, zIndex: 2, backgroundColor: "white", borderRightWidth: 1, borderRightColor: "#E5E7EB" }}>
                  <View style={{ height: headerH, justifyContent: "center", paddingLeft: 14, backgroundColor: "#F8FAFC", borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
                    <Text style={{ fontSize: 10.5, fontWeight: "800", color: "#94A3B8", letterSpacing: 0.4 }}>MES</Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.65}
                    onPress={openAllAnnualDetails}
                    style={{ height: totalH, justifyContent: "center", paddingLeft: 14, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "900", color: "#0F172A" }}>Total año</Text>
                  </TouchableOpacity>
                  {monthNames.map((label, monthIndex) => (
                    <TouchableOpacity
                      key={`month-label-${monthIndex}`}
                      activeOpacity={0.65}
                      onPress={() => {
                        const entries = years
                          .map((year) => ({ year, row: monthCellByYear.get(year)?.get(monthIndex) }))
                          .filter((entry): entry is { year: number; row: MonthlyRentRow } => entry.row != null);
                        if (entries.length) setMonthPopup({ label, entries });
                      }}
                      style={{ height: monthH, justifyContent: "center", paddingLeft: 14, borderBottomWidth: monthIndex < 11 ? 1 : 0, borderBottomColor: "#F1F5F9" }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#475569" }}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false} style={{ flex: 1 }}>
                  <View style={{ minWidth: "100%" }}>
                    <View style={{ height: headerH, flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
                      {years.map((year) => (
                        <Text key={`year-header-${year}`} style={{ width: colW, paddingRight: 14, fontSize: 10.5, fontWeight: "800", color: "#94A3B8", letterSpacing: 0.4, textAlign: "right" }}>
                          {year}
                        </Text>
                      ))}
                    </View>

                    <View style={{ height: totalH, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" }}>
                      {years.map((y) => {
                        const yr = rentYearRows.find((r) => r.year === y);
                        const value = rentTableMetric === "pct" ? (yr?.returnPct ?? null) : (yr?.profit ?? null);
                        const ccy = yr?.currency ?? currency;
                        const { color, bg } = pillColors(value);
                        const hasData = value != null && Number.isFinite(value);
                        return (
                          <TouchableOpacity
                            key={`total-${y}`}
                            disabled={!hasData}
                            activeOpacity={0.65}
                            onPress={() => {
                              const row = annualRow(y);
                              if (row) setMonthPopup({ label: "Total año", entries: [{ year: y, row }], isAnnual: true });
                            }}
                            style={{ width: colW, height: totalH, paddingRight: 14, alignItems: "flex-end", justifyContent: "center" }}
                          >
                            {hasData ? (
                              <View style={{ backgroundColor: bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                                <Text style={{ fontSize: 13, fontWeight: "900", color }}>{formatCell(value, rentTableMetric, ccy)}</Text>
                              </View>
                            ) : (
                              <Text style={{ fontSize: 12, fontWeight: "700", color: "#CBD5E1" }}>—</Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {monthNames.map((mLabel, mIdx) => {
                      return (
                        <View key={`month-row-${mIdx}`} style={{ height: monthH, flexDirection: "row", alignItems: "center", borderBottomWidth: mIdx < 11 ? 1 : 0, borderBottomColor: "#F1F5F9" }}>
                          {years.map((y) => {
                            const row = monthCellByYear.get(y)?.get(mIdx) ?? null;
                            const value = rentTableMetric === "pct" ? (row?.returnPct ?? null) : (row?.profit ?? null);
                            const ccy = row?.currency ?? currency;
                            const { color } = pillColors(value);
                            const hasData = value != null && Number.isFinite(value);
                            const isCurrent = isCurrentMonthCell(row);
                            return (
                              <TouchableOpacity
                                key={`cell-${y}-${mIdx}`}
                                disabled={!row}
                                activeOpacity={0.65}
                                onPress={() => row && setMonthPopup({ label: mLabel, entries: [{ year: y, row }] })}
                                style={{ width: colW, height: monthH, paddingRight: 14, alignItems: "flex-end", justifyContent: "center" }}
                              >
                                <Text style={{ fontSize: 12, fontWeight: "800", color: hasData ? color : "#CBD5E1", opacity: isCurrent ? 0.65 : 1 }}>
                                  {formatCell(value, rentTableMetric, ccy)}{isCurrent ? " •" : ""}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            </View>
          );
        })()}

        <View style={{ paddingHorizontal: 20, marginTop: 6, marginBottom: 8 }}>
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "900", color: "#0F172A", marginBottom: 4 }}>
              Reconstruir snapshot
            </Text>
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#64748B", marginBottom: 12 }}>
              Selecciona el mes y vuelve a calcular el snapshot mensual desde el front.
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 2 }}>
              {rebuildMonthOptions.length ? rebuildMonthOptions.map((option) => {
                const active = selectedRebuildMonth === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setSelectedRebuildMonth(option.value)}
                    activeOpacity={0.8}
                    style={{
                      paddingHorizontal: 14,
                      height: 34,
                      borderRadius: 11,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: active ? colors.primary : "#E5E7EB",
                      backgroundColor: active ? "#EEF2FF" : "#F8FAFC",
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "800", color: active ? colors.primary : "#475569" }}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              }) : (
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#94A3B8" }}>
                  No hay snapshots disponibles para seleccionar.
                </Text>
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={confirmRebuildMay}
              disabled={rebuildSnapshotLoading}
              activeOpacity={0.85}
              style={{
                marginTop: 14,
                height: 42,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: rebuildSnapshotLoading ? "#CBD5E1" : colors.primary,
                opacity: rebuildSnapshotLoading ? 0.75 : 1,
              }}
            >
              {rebuildSnapshotLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={{ fontSize: 13, fontWeight: "900", color: "white" }}>
                  Reconstruir snapshot
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        </>)}

        {/* == TAB: OPERACIONES == */}
        {mainTab === "operaciones" && (
          <View style={{ paddingHorizontal: 20 }}>
            {!allOperationsLoading && allOperations.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <SegmentedTabs<OperationFilter>
                  options={[
                    { key: "all", label: "Todas" },
                    { key: "buy", label: "Compras" },
                    { key: "sell", label: "Ventas" },
                  ]}
                  value={operationFilter}
                  onChange={setOperationFilter}
                />
              </View>
            )}

            {allOperationsLoading ? (
              <View style={{ alignItems: "center", paddingTop: 40 }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: "#94A3B8", marginTop: 10, fontSize: 13, fontWeight: "600" }}>Cargando operaciones...</Text>
              </View>
            ) : filteredOperations.length === 0 ? (
              <View style={{ alignItems: "center", marginTop: 48, gap: 12 }}>
                <View style={{ width: 64, height: 64, borderRadius: 24, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="swap-horizontal-outline" size={30} color="#94A3B8" />
                </View>
                <Text style={{ fontSize: 14, fontWeight: "800", color: "#0F172A" }}>
                  {allOperations.length === 0 ? "Sin operaciones" : "Sin operaciones de este tipo"}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#94A3B8", textAlign: "center" }}>
                  {allOperations.length === 0
                    ? "Añade una operación desde el menú de tres puntos."
                    : "Prueba con otro filtro para ver más movimientos."}
                </Text>
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                {operationsByMonth.map(([monthKey, { label, ops }]) => (
                  <View key={monthKey}>
                    <Text style={{ fontSize: 12, fontWeight: "900", color: "#64748B", letterSpacing: 0.4, marginBottom: 8, marginLeft: 2 }}>
                      {label.toUpperCase()}
                    </Text>
                    <View
                      style={{
                        backgroundColor: "white",
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: colors.border,
                        overflow: "hidden",
                      }}
                    >
                      {ops.map((op, idx) => {
                        const asset = resolveOperationAsset(op);
                        const assetName = asset?.abbreviation?.trim() || asset?.name || `Activo #${op.assetId}`;
                        const { color, bg } = opTypeColor(op.type);
                        const operationDate = new Date(op.date || op.createdAt || 0);
                        const dateStr = Number.isNaN(operationDate.getTime())
                          ? "Sin fecha"
                          : operationDate.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
                        return (
                          <TouchableOpacity
                            key={op.id}
                            activeOpacity={0.75}
                            onPress={() => setSelectedOperation(op)}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              paddingVertical: 12,
                              paddingHorizontal: 14,
                              borderBottomWidth: idx < ops.length - 1 ? 1 : 0,
                              borderBottomColor: "#F1F5F9",
                              gap: 12,
                            }}
                          >
                            <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
                              <Ionicons name={opTypeIcon(op.type)} size={17} color={color} />
                            </View>
                            <View style={{ flex: 1, gap: 2 }}>
                              <Text style={{ fontSize: 13, fontWeight: "800", color: "#0F172A" }} numberOfLines={1}>
                                {assetName}
                              </Text>
                              <Text style={{ fontSize: 11, fontWeight: "600", color: "#64748B" }}>
                                {opLabel(op.type)} · {dateStr}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 13.5, fontWeight: "900", color: "#0F172A", fontVariant: ["tabular-nums"] }}>
                              {formatMoney(Math.abs(Number(op.amount || 0)), asset?.currency ?? "EUR")}
                            </Text>
                            <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

          </ScrollView>
        </Animated.View>
      )}

      {/* -- Detalle de operación compartido con el detalle del activo -- */}
      <InvestmentOperationDetailsModal
        operation={selectedOperation}
        asset={selectedOperation ? resolveOperationAsset(selectedOperation) : null}
        fallbackCurrency="EUR"
        onClose={() => setSelectedOperation(null)}
        onEdit={(operation) => {
          setSelectedOperation(null);
          navigation.navigate("InvestmentOperation", { assetId: operation.assetId, operationData: operation });
        }}
      />

      {/* ── Popup detalle mes ── */}
      <Modal
        visible={monthPopup !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMonthPopup(null)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", paddingHorizontal: 28 }}
          activeOpacity={1}
          onPress={() => setMonthPopup(null)}
        >
          <TouchableOpacity activeOpacity={1} style={{ width: "100%" }} onPress={() => {}}>
            <View style={{ backgroundColor: "white", borderRadius: 24, padding: 20, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } }}>

              {/* Header */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <Text style={{ fontSize: 17, fontWeight: "900", color: "#0F172A" }}>
                  {monthPopup?.label}
                  {monthPopup?.entries.length === 1 ? ` · ${monthPopup.entries[0].year}` : ""}
                  {!monthPopup?.isAnnual && monthPopup?.entries.length === 1 && currentMonthReturn && monthPopup.entries[0].row.monthStart === currentMonthReturn.monthStart
                    ? " (en curso)" : ""}
                </Text>
                <TouchableOpacity
                  onPress={() => setMonthPopup(null)}
                  style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}
                >
                  <Ionicons name="close" size={14} color="#64748B" />
                </TouchableOpacity>
              </View>

              {monthPopup?.entries.map(({ year, row }, idx) => {
                const ccy = row.currency ?? currency;
                const signed = (v: number | null) =>
                  v == null || !Number.isFinite(v) ? "-"
                    : `${v >= 0 ? "+" : "−"}${formatMoney(Math.abs(v), ccy)}`;
                const neutral = (v: number | null) =>
                  v == null || !Number.isFinite(v) ? "-" : formatMoney(v, ccy);
                const pct = (v: number | null) =>
                  v == null || !Number.isFinite(v) ? "-"
                    : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(2).replace(".", ",")} %`;
                const tone = (v: number | null) =>
                  v == null || !Number.isFinite(v) ? "#94A3B8"
                    : v >= 0 ? "#14B8A6" : "#FB7185";

                return (
                  <View key={year}>
                    {(monthPopup?.entries.length ?? 0) > 1 && (
                      <Text style={{ fontSize: 12, fontWeight: "800", color: "#64748B", marginBottom: 8, marginTop: idx > 0 ? 14 : 0 }}>
                        {year}
                        {!monthPopup?.isAnnual && currentMonthReturn && row.monthStart === currentMonthReturn.monthStart ? " (en curso)" : ""}
                      </Text>
                    )}

                    {([
                      { label: "Inicio",        value: neutral(row.startValue),   color: "#0F172A" },
                      { label: "Final",          value: neutral(row.endValue),     color: "#0F172A" },
                      { label: "Cashflow",       value: signed(row.cashflowNet),   color: tone(row.cashflowNet) },
                      { label: "Rentabilidad %", value: pct(row.returnPct),        color: tone(row.returnPct) },
                      { label: "Rentabilidad €", value: signed(row.profit),        color: tone(row.profit) },
                    ] as const).map(({ label, value, color }, i, arr) => (
                      <View
                        key={label}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingVertical: 11,
                          borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                          borderBottomColor: "#F1F5F9",
                        }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#475569" }}>{label}</Text>
                        <Text style={{ fontSize: 14, fontWeight: "800", color }}>{value}</Text>
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={rebalanceModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setRebalanceModalOpen(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
          activeOpacity={1}
          onPress={() => setRebalanceModalOpen(false)}
        >
          <View style={{ backgroundColor: "white", borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 18, paddingBottom: 28 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: "900", color: "#0F172A" }}>Plan de balanceo</Text>
              <TouchableOpacity onPress={() => setRebalanceModalOpen(false)} style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="close" size={16} color="#64748B" />
              </TouchableOpacity>
            </View>
            {!(rebalancePlan?.sells?.length) && !(rebalancePlan?.buys?.length) ? (
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748B" }}>Tu cartera ya esta muy cerca del objetivo.</Text>
            ) : (
              (() => {
                const sells = [...(rebalancePlan?.sells || [])].map((x) => ({ ...x, remaining: Number(x.amount || 0) }));
                const buys = [...(rebalancePlan?.buys || [])].map((x) => ({ ...x, remaining: Number(x.amount || 0) }));
                const moves: Array<{ from: string; to: string; amount: number }> = [];
                let i = 0;
                let j = 0;
                while (i < sells.length && j < buys.length) {
                  const s = sells[i];
                  const b = buys[j];
                  const amount = Math.min(s.remaining, b.remaining);
                  if (amount > 0) {
                    moves.push({
                      from: s.assetAbbreviation?.trim() || s.assetName,
                      to: b.assetAbbreviation?.trim() || b.assetName,
                      amount: Number(amount.toFixed(2)),
                    });
                  }
                  s.remaining = Number((s.remaining - amount).toFixed(6));
                  b.remaining = Number((b.remaining - amount).toFixed(6));
                  if (s.remaining <= 0.000001) i += 1;
                  if (b.remaining <= 0.000001) j += 1;
                }

                return (
                  <View style={{ gap: 8 }}>
                    {moves.map((m, idx) => (
                      <View
                        key={`move-${idx}`}
                        style={{
                          borderWidth: 1,
                          borderColor: "#E5E7EB",
                          borderRadius: 14,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          backgroundColor: "#F8FAFC",
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: "800", color: "#64748B", marginBottom: 4 }}>
                          Mover
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: "900", color: "#0F172A" }}>
                          {m.from} → {m.to}
                        </Text>
                        <Text style={{ fontSize: 12, fontWeight: "800", color: colors.primary, marginTop: 3 }}>
                          {formatMoney(m.amount, currency)}
                        </Text>
                      </View>
                    ))}
                  </View>
                );
              })()
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={contributionInputOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setContributionInputOpen(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center" }}
          activeOpacity={1}
          onPress={() => setContributionInputOpen(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ width: 320, backgroundColor: "white", borderRadius: 20, padding: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: "900", color: "#0F172A", marginBottom: 10 }}>Plan de aportación</Text>
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748B", marginBottom: 8 }}>Cantidad a aportar</Text>
            <TextInput
              value={contributionAmountText}
              onChangeText={setContributionAmountText}
              keyboardType="decimal-pad"
              placeholder="Ej: 500"
              style={{
                height: 40,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 10,
                paddingHorizontal: 10,
                fontSize: 13,
                fontWeight: "800",
                color: "#0F172A",
              }}
            />
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                onPress={() => setContributionInputOpen(false)}
                activeOpacity={0.85}
                style={{ flex: 1, height: 40, borderRadius: 10, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ fontSize: 12, fontWeight: "900", color: "#64748B" }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitContribution}
                activeOpacity={0.85}
                style={{ flex: 1, height: 40, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ fontSize: 12, fontWeight: "900", color: "white" }}>Calcular</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={contributionResultOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setContributionResultOpen(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
          activeOpacity={1}
          onPress={() => setContributionResultOpen(false)}
        >
          <View style={{ backgroundColor: "white", borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 18, paddingBottom: 28 }}>
            <Text style={{ fontSize: 15, fontWeight: "900", color: "#0F172A", marginBottom: 8 }}>
              Plan de aportacion {contributionPlan ? `(${formatMoney(contributionPlan.amount, currency)})` : ""}
            </Text>
            {!(contributionPlan?.rows?.length) ? (
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748B" }}>No hay propuesta para ese importe.</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {contributionPlan.rows.map((x, i) => (
                  <View
                    key={`contrib-plan-${i}`}
                    style={{
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      borderRadius: 14,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      backgroundColor: "#F8FAFC",
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "800", color: "#64748B", marginBottom: 4 }}>Aportar a</Text>
                    <Text style={{ fontSize: 13, fontWeight: "900", color: "#0F172A" }}>{x.assetName}</Text>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: colors.primary, marginTop: 3 }}>
                      {formatMoney(Number(x.amount || 0), currency)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* -- Modal de filtros -- */}
      <InvestmentsFiltersModal
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onApply={setFilters}
        baseAssets={searchedAssets}
      />



    </SafeAreaView>
  );
}
