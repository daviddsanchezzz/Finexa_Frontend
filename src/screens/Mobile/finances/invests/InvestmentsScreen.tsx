// src/screens/Investments/InvestmentsHomeScreen.tsx
import React, { useCallback, useMemo, useState, useEffect, useRef } from "react";
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
import { useFocusEffect } from "@react-navigation/native";
import AppHeader from "../../../../components/AppHeader";
import { colors } from "../../../../theme/theme";
import { useTheme } from "../../../../context/ThemeContext";
import api from "../../../../api/api";
import { InvestmentsScreenSkeleton } from "../../../../components/skeletons/InvestmentsScreenSkeleton";
import DonutPro, { DonutSlice } from "../../../../components/DonutPro";
import { translateCountry, translateSector } from "../../../../utils/investmentLabels";
import { getInvestmentsDataVersion, subscribeInvestmentsInvalidation } from "../../../../utils/investmentsInvalidation";

type InvestmentAssetType = "crypto" | "etf" | "stock" | "fund" | "custom";

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
  lastValuationDate: string | null;
}

interface SummaryFromApi {
  totalInvested: number;
  totalCurrentValue: number;
  totalPnL: number;
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

const formatMoney = (n: number, currency = "EUR") =>
  (Number.isFinite(n) ? n : 0).toLocaleString("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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



export default function InvestmentsHomeScreen({ navigation }: any) {
  const { isDark, colors: t } = useTheme();
  const [summary, setSummary] = useState<SummaryFromApi | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSliceId, setSelectedSliceId] = useState<number | null>(null);
  const [legendOpen, setLegendOpen] = useState(true);
  const [snapshots, setSnapshots] = useState<PortfolioSnapshotRow[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [rentSelectedYear, setRentSelectedYear] = useState<number | null>(null);
  const [archivedAssets, setArchivedAssets] = useState<any[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [donutMode, setDonutMode] = useState<"asset" | "type" | "country" | "sector" | "holding">("asset");
  const [exposure, setExposure] = useState<ExposureResponse | null>(null);
  const [otrosExpanded, setOtrosExpanded] = useState(false);
  const [targets, setTargets] = useState<TargetsResponse | null>(null);
  const [invalidationVersion, setInvalidationVersion] = useState<number>(() => getInvestmentsDataVersion());
  const [planLoading, setPlanLoading] = useState(false);
  const [rebalanceModalOpen, setRebalanceModalOpen] = useState(false);
  const [contributionInputOpen, setContributionInputOpen] = useState(false);
  const [contributionResultOpen, setContributionResultOpen] = useState(false);
  const [contributionAmountText, setContributionAmountText] = useState("");
  const [rebalancePlan, setRebalancePlan] = useState<{
    sells: Array<{ assetId?: number; assetName: string; assetAbbreviation?: string | null; amount: number }>;
    buys: Array<{ assetId?: number; assetName: string; assetAbbreviation?: string | null; amount: number }>;
  } | null>(null);
  const [contributionPlan, setContributionPlan] = useState<{ amount: number; rows: Array<{ assetName: string; amount: number }> } | null>(null);

  const { width: SCREEN_W } = useWindowDimensions();

  const donutSize = useMemo(() => {
    const target = Math.floor(SCREEN_W * 0.50);
    return Math.max(132, Math.min(176, target));
  }, [SCREEN_W]);

  const donutStroke = useMemo(
    () => Math.max(12, Math.min(16, Math.round(donutSize * 0.10))),
    [donutSize]
  );

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setFetchError(false);
      const res = await api.get("/investments/summary");
      setSummary(res.data || null);
    } catch {
      setFetchError(true);
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
      // Inicializar Año seleccionado al Año más reciente
      if (mapped.length > 0) {
        const latestYear = new Date(mapped[0].monthStart).getUTCFullYear();
        setRentSelectedYear(latestYear);
      }
    } catch {
      setSnapshots([]);
    } finally {
      setSnapshotsLoading(false);
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
          .finally(() => {
            // Fase 2 (background): datos secundarios
            fetchSnapshots();
            fetchArchived();
            fetchExposure();
            fetchTargets();
          });
      }
    }, [invalidationVersion])
  );

  const hero = useMemo(() => {
    const totalInvested = summary?.totalInvested || 0;
    const totalCurrentValue = summary?.totalCurrentValue || 0;
    const totalPnL = summary?.totalPnL || 0;
    const pct = totalInvested ? (totalPnL / totalInvested) * 100 : 0;
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

  const assets = useMemo(() => {
    const list = summary?.assets || [];
    return [...list].sort((a, b) => {
      const diff = (b.currentValue || 0) - (a.currentValue || 0);
      if (diff !== 0) return diff;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [summary]);

  const totalBadge = useMemo(() => pnlBadge(hero.totalPnL), [hero.totalPnL]);

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

  // Años únicos de los snapshots (orden asc)
  const rentYears = useMemo(() => {
    const set = new Set<number>();
    snapshots.forEach((s) => set.add(new Date(s.monthStart).getUTCFullYear()));
    return Array.from(set).sort();
  }, [snapshots]);

  // Meses del Año seleccionado (orden cronológico)
  const rentMonthRows = useMemo<MonthlyRentRow[]>(() => {
    if (rentSelectedYear === null) return [];
    const rows = [...snapshots]
      .filter((s) => new Date(s.monthStart).getUTCFullYear() === rentSelectedYear);
    const byMonth = new Map<number, PortfolioSnapshotRow>();
    rows.forEach((r) => byMonth.set(new Date(r.monthStart).getUTCMonth(), r));
    const fallbackCurrency = rows[0]?.currency ?? "EUR";

    return new Array(12).fill(null).map((_, m) => {
      const existing = byMonth.get(m);
      if (existing) {
        return {
          monthStart: existing.monthStart,
          currency: existing.currency,
          startValue: existing.startValue,
          endValue: existing.endValue,
          cashflowNet: existing.cashflowNet,
          profit: existing.profit,
          returnPct: existing.returnPct,
        };
      }
      return {
        monthStart: new Date(Date.UTC(rentSelectedYear, m, 1)).toISOString(),
        currency: fallbackCurrency,
        startValue: null,
        endValue: null,
        cashflowNet: null,
        profit: null,
        returnPct: null,
      };
    });
  }, [snapshots, rentSelectedYear]);

  // Agregado anual
  const rentYearRows = useMemo(() => {
    return rentYears.map((y) => {
      const months = [...snapshots]
        .filter((s) => new Date(s.monthStart).getUTCFullYear() === y)
        .sort((a, b) => new Date(a.monthStart).getTime() - new Date(b.monthStart).getTime());
      const first = months[0];
      const last = months[months.length - 1];
      const cashflowNet = months.reduce((s, r) => s + r.cashflowNet, 0);
      const profit = months.reduce((s, r) => s + r.profit, 0);
      const returnPct = first?.startValue != null && first.startValue > 0
        ? profit / first.startValue
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
  }, [snapshots, rentYears]);

  const [fabOpen, setFabOpen] = useState(false);
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
  const [mainTab, setMainTab] = useState<"cartera" | "distribucion" | "rentabilidad">("cartera");

  const syncAllMetadata = async () => {
    try {
      setSyncingMetadata(true);
      await api.post("/investments/metadata/sync-all");
      await Promise.all([fetchExposure(), fetchSummary(), fetchTargets()]);
      Alert.alert("Composición actualizada", "Se ha lanzado la sincronización para todos los assets.");
    } catch (e: any) {
      const msg = e?.response?.data?.message || "No se pudo sincronizar la composición.";
      Alert.alert("Error", String(msg));
    } finally {
      setSyncingMetadata(false);
      setFabOpen(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchSummary(), fetchSnapshots(), fetchArchived(), fetchExposure(), fetchTargets()]);
    setRefreshing(false);
  }, []);

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
  }, [pullAnim, onRefresh, PULL_THRESHOLD]);

  const fabActions = useMemo(() => [
    { label: "Nueva inversión", icon: "add-outline" as const, route: "InvestmentForm" },
    { label: "Nueva valoración", icon: "calendar-outline" as const, route: "InvestmentValuation" },
    { label: "Nueva operación", icon: "swap-horizontal-outline" as const, route: "InvestmentOperation" },
    { label: syncingMetadata ? "Actualizando composición..." : "Actualizar composición", icon: "refresh-outline" as const, onPress: syncAllMetadata },
  ], [syncingMetadata]);

  const TABS = [
    { key: "cartera",       label: "Cartera" },
    { key: "distribucion",  label: "Distribución" },
    { key: "rentabilidad",  label: "Rentabilidad" },
  ] as const;

  return (
    <SafeAreaView className="flex-1 bg-background" style={Platform.OS === "web" ? { overflow: "hidden" } : undefined}>
      {/* -- Header -- */}
      <View className="px-5 pb-3" style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <AppHeader title="Inversiones" showProfile={false} showDatePicker={false} showBack={false} />
        </View>
        <TouchableOpacity
          onPress={() => setFabOpen(true)}
          activeOpacity={0.8}
          style={{
            flexDirection: "row", alignItems: "center", gap: 6,
            backgroundColor: "#0F172A", borderRadius: 14,
            paddingVertical: 8, paddingHorizontal: 12, marginBottom: 4,
          }}
        >
          <Ionicons name="trending-up-outline" size={15} color="white" />
          <Text style={{ fontSize: 13, fontWeight: "800", color: "white" }}>Añadir</Text>
        </TouchableOpacity>
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
            onPress={() => { fetchSummary(); fetchSnapshots(); fetchArchived(); fetchExposure(); fetchTargets(); }}
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

          {/* -- Hero (fijo, no scrollea) -- */}
          <View style={{ paddingHorizontal: 20 }}>
            <View
              style={{
                backgroundColor: colors.primary,
                borderRadius: 26,
                paddingHorizontal: 14,
                paddingTop: 13,
                paddingBottom: 12,
                shadowColor: "#000",
                shadowOpacity: 0.12,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="stats-chart" size={18} color="white" />
                  </View>
                  <View style={{ marginLeft: 8, flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: "800", color: "white" }}>Resumen</Text>
                    <Text style={{ fontSize: 10.5, color: "rgba(255,255,255,0.75)", marginTop: 1 }}>
                      {hero.count} {hero.count === 1 ? "activo" : "activos"}
                      {hero.lastGlobal ? ` · Última: ${formatShortDate(hero.lastGlobal)}` : ""}
                    </Text>
                  </View>
                </View>
                <View style={{ paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: hero.pct > 0 ? "rgba(34,197,94,0.25)" : hero.pct < 0 ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.18)", flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name={totalBadge.icon} size={13} color={hero.pct > 0 ? "#86EFAC" : hero.pct < 0 ? "#FCA5A5" : "white"} />
                  <Text style={{ color: hero.pct > 0 ? "#86EFAC" : hero.pct < 0 ? "#FCA5A5" : "white", fontWeight: "900", marginLeft: 5, fontSize: 11.5 }}>
                    {hero.pct > 0 ? "+" : ""}{hero.pct.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                  </Text>
                </View>
              </View>

              <View style={{ marginTop: 9 }}>
                <Text style={{ fontSize: 10.5, color: "rgba(255,255,255,0.75)", fontWeight: "700" }}>Valor actual total</Text>
                <Text style={{ fontSize: 22, fontWeight: "900", color: "white", marginTop: 1 }}>
                  {formatMoney(hero.totalCurrentValue, currency)}
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: 8, marginTop: 9 }}>
                <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 16, paddingVertical: 9, paddingHorizontal: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="add-circle-outline" size={13} color="rgba(255,255,255,0.9)" />
                    <Text style={{ fontSize: 10.5, color: "rgba(255,255,255,0.75)", fontWeight: "800" }}>Invertido</Text>
                  </View>
                  <Text style={{ fontSize: 13.5, fontWeight: "900", color: "white", marginTop: 4 }}>
                    {formatMoney(hero.totalInvested, currency)}
                  </Text>
                </View>
                <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 16, paddingVertical: 9, paddingHorizontal: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name={totalBadge.icon} size={13} color="rgba(255,255,255,0.9)" />
                    <Text style={{ fontSize: 10.5, color: "rgba(255,255,255,0.75)", fontWeight: "800" }}>Resultado</Text>
                  </View>
                  <Text style={{ fontSize: 13.5, fontWeight: "900", marginTop: 4, color: hero.totalPnL > 0 ? "#86EFAC" : hero.totalPnL < 0 ? "#FCA5A5" : "white" }}>
                    {hero.totalPnL >= 0 ? "+" : ""}{formatMoney(hero.totalPnL, currency)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

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
            onScroll={(e) => { if (Platform.OS === "web") webScrollAtTop.current = e.nativeEvent.contentOffset.y <= 0; }}
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
          ) : (
            assets.map((a) => {
              const pctText = formatPct(a.pnl || 0, a.invested || 0);
              const badge = pnlBadge(a.pnl);
              const typeColor = assetTypeColor(a.type);
              const typeBg = assetTypeSoftBg(a.type);
              const allocPct = allocationMap.get(a.id);

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
                    shadowColor: "#000",
                    shadowOpacity: 0.03,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 1 },
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        width: 40, height: 40, borderRadius: 14,
                        backgroundColor: typeBg,
                        alignItems: "center", justifyContent: "center",
                        marginRight: 12,
                      }}
                    >
                      <Ionicons name={assetTypeIcon(a.type)} size={18} color={typeColor} />
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
              <Text style={{ fontSize: 14, fontWeight: "800", color: "#374151" }}>
                Actual
              </Text>
            </View>

            <View
              style={{
                backgroundColor: t.surface,
                borderRadius: 24,
                padding: 16,
                marginBottom: 10,
                marginHorizontal: 20,
                shadowColor: "#000",
                shadowOpacity: 0.04,
                shadowRadius: 5,
                shadowOffset: { width: 0, height: 2 },
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
                          ? "Activo"
                          : mode === "type"
                          ? "Tipo"
                          : mode === "country"
                          ? "Región"
                          : mode === "sector"
                          ? "Sector"
                          : "Compañía"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

              {/* Donut */}
              <View style={{ alignItems: "center", marginTop: 14 }}>
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
                <View style={{ marginTop: 12 }}>
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
                            paddingVertical: 10,
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

            <View style={{ paddingHorizontal: 20, marginTop: 6, marginBottom: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: "800", color: "#374151" }}>
                Objetivo
              </Text>
            </View>
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
                <Text style={{ fontSize: 14, fontWeight: "900", color: "#0F172A" }}>Distribucion deseada</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("InvestmentTargetAllocation")}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: "#EEF2FF",
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "900", color: colors.primary }}>Editar</Text>
                </TouchableOpacity>
              </View>

              <View style={{ marginTop: 12 }}>
                {(targets?.items || []).map((it) => (
                  <View
                    key={`target-${it.assetId}`}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: "#F1F5F9",
                      gap: 10,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: "800", color: "#0F172A" }} numberOfLines={1}>
                        {it.assetAbbreviation?.trim() || it.assetName}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontSize: 12, fontWeight: "900", color: "#0F172A" }}>
                        {Number(it.targetPct || 0).toFixed(2).replace(".", ",")}%
                      </Text>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: "#94A3B8", marginTop: 1 }}>
                        Actual {Number(it.actualPct || 0).toFixed(2).replace(".", ",")}%
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

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

        {/* == TAB: RENTABILIDAD == */}
        {mainTab === "rentabilidad" && (
          <>
        {snapshots.length > 0 && (() => {
          const CM = 110;
          const CV = 112;
          const CP = 100;
          const hStyle = { fontSize: 13, fontWeight: "700" as const, color: "#374151" };
          const cStyle = { fontSize: 13, fontWeight: "500" as const, color: "#374151" };
          const hBg = { backgroundColor: "#F8FAFC", borderBottomWidth: 1 as const, borderColor: "#E5E7EB" } as const;
          const rBorder = { borderBottomWidth: 1 as const, borderColor: "#F1F5F9" } as const;

          const filledMonthRows = rentMonthRows.filter((r) =>
            r.startValue != null || r.endValue != null || r.cashflowNet != null || r.profit != null
          );
          const totalMonthCashflow = rentMonthRows.reduce((s, r) => s + (r.cashflowNet ?? 0), 0);
          const totalMonthProfit   = rentMonthRows.reduce((s, r) => s + (r.profit ?? 0), 0);
          const firstMonthStartValue = filledMonthRows[0]?.startValue ?? null;
          const totalMonthReturnPct =
            firstMonthStartValue != null && firstMonthStartValue > 0
              ? totalMonthProfit / firstMonthStartValue
              : null;
          const totalYearCashflow  = rentYearRows.reduce((s, r) => s + r.cashflowNet, 0);
          const totalYearProfit    = rentYearRows.reduce((s, r) => s + r.profit, 0);
          const firstYearStartValue = rentYearRows[0]?.startValue ?? null;
          const totalGlobalReturnPct =
            firstYearStartValue != null && firstYearStartValue > 0
              ? totalYearProfit / firstYearStartValue
              : null;

          const cardStyle = {
            backgroundColor: t.surface,
            borderRadius: 24,
            marginHorizontal: 20,
            marginBottom: 10,
            borderWidth: 1,
            borderColor: t.border,
            shadowColor: "#000",
            shadowOpacity: 0.04,
            shadowRadius: 5,
            shadowOffset: { width: 0, height: 2 },
            overflow: "hidden",
          } as const;

          return (
            <>
              {/* -- Card 1: Tabla anual -- */}
              <View style={{ paddingHorizontal: 20, marginTop: 8, marginBottom: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: "800", color: "#374151" }}>
                  Total
                </Text>
              </View>
              <View style={cardStyle}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    <View style={{ flexDirection: "row", paddingVertical: 11, paddingHorizontal: 16, ...hBg }}>
                      <Text style={{ ...hStyle, width: CM }}>Año</Text>
                      <Text style={{ ...hStyle, width: CP, textAlign: "center" }}>Rent. %</Text>
                      <Text style={{ ...hStyle, width: CV, textAlign: "center" }}>Beneficio</Text>
                      <Text style={{ ...hStyle, width: CV, textAlign: "center" }}>Inicio</Text>
                      <Text style={{ ...hStyle, width: CV, textAlign: "center" }}>Fin</Text>
                      <Text style={{ ...hStyle, width: CV, textAlign: "center" }}>Cashflow</Text>
                    </View>
                    {rentYearRows.map((row, idx) => (
                      <TouchableOpacity
                        key={row.year}
                        onPress={() => setRentSelectedYear(row.year)}
                        style={{
                          flexDirection: "row", paddingVertical: 11, paddingHorizontal: 16,
                          backgroundColor: rentSelectedYear === row.year ? "rgba(59,130,246,0.06)" : "transparent",
                          ...(idx < rentYearRows.length - 1 ? rBorder : {}),
                        }}
                      >
                        <View style={{ width: CM, flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={{ ...cStyle, fontWeight: rentSelectedYear === row.year ? "700" : "500" }}>
                            {row.year}
                          </Text>
                          {rentSelectedYear === row.year && (
                            <Ionicons name="chevron-down" size={11} color={colors.primary} />
                          )}
                        </View>
                        <Text style={{ fontWeight: "600", width: CP, textAlign: "center", color: toneColor(row.profit) }}>
                          {formatPctRatio(row.returnPct)}
                        </Text>
                        <Text style={{ fontWeight: "600", width: CV, textAlign: "center", color: toneColor(row.profit) }}>
                          {row.profit >= 0 ? "+" : ""}{formatMoney(row.profit, row.currency)}
                        </Text>
                        <Text style={{ ...cStyle, width: CV, textAlign: "center" }}>
                          {row.startValue == null ? "-" : formatMoney(row.startValue, row.currency)}
                        </Text>
                        <Text style={{ ...cStyle, width: CV, textAlign: "center" }}>
                          {formatMoney(row.endValue, row.currency)}
                        </Text>
                        <Text style={{ ...cStyle, width: CV, textAlign: "center", color: toneColor(row.cashflowNet) }}>
                          {row.cashflowNet >= 0 ? "+" : ""}{formatMoney(row.cashflowNet, row.currency)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <View style={{ flexDirection: "row", paddingVertical: 11, paddingHorizontal: 16, ...hBg, borderTopWidth: 1, borderBottomWidth: 0 }}>
                      <Text style={{ ...hStyle, width: CM }}>TOTAL</Text>
                      <Text style={{ ...hStyle, width: CP, textAlign: "center", color: toneColor(totalYearProfit) }}>
                        {formatPctRatio(totalGlobalReturnPct)}
                      </Text>
                      <Text style={{ ...hStyle, width: CV, textAlign: "center", color: toneColor(totalYearProfit) }}>
                        {totalYearProfit >= 0 ? "+" : ""}{formatMoney(totalYearProfit)}
                      </Text>
                      <Text style={{ ...hStyle, width: CV, textAlign: "center" }}>-</Text>
                      <Text style={{ ...hStyle, width: CV, textAlign: "center" }}>-</Text>
                      <Text style={{ ...hStyle, width: CV, textAlign: "center", color: toneColor(totalYearCashflow) }}>
                        {totalYearCashflow >= 0 ? "+" : ""}{formatMoney(totalYearCashflow)}
                      </Text>
                    </View>
                  </View>
                </ScrollView>
              </View>

              {/* -- Card 2: Detalle mensual -- */}
              <View style={{ paddingHorizontal: 20, marginTop: 6, marginBottom: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: "800", color: "#374151" }}>
                  {rentSelectedYear}
                </Text>
              </View>
              <View style={cardStyle}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    <View style={{ flexDirection: "row", paddingVertical: 11, paddingHorizontal: 16, ...hBg }}>
                      <Text style={{ ...hStyle, width: CM }}>Mes</Text>
                      <Text style={{ ...hStyle, width: CP, textAlign: "center" }}>Rent. %</Text>
                      <Text style={{ ...hStyle, width: CV, textAlign: "center" }}>Beneficio</Text>
                      <Text style={{ ...hStyle, width: CV, textAlign: "center" }}>Inicio</Text>
                      <Text style={{ ...hStyle, width: CV, textAlign: "center" }}>Fin</Text>
                      <Text style={{ ...hStyle, width: CV, textAlign: "center" }}>Cashflow</Text>
                    </View>
                    {rentMonthRows.map((row, idx) => (
                      <View
                        key={row.monthStart}
                        style={{
                          flexDirection: "row", paddingVertical: 11, paddingHorizontal: 16,
                          ...(idx < rentMonthRows.length - 1 ? rBorder : {}),
                        }}
                      >
                        <Text style={{ ...cStyle, width: CM }}>{formatMonthName(row.monthStart)}</Text>
                        <Text style={{ fontWeight: "600", width: CP, textAlign: "center", color: toneColor(row.profit ?? 0) }}>
                          {formatPctRatio(row.returnPct)}
                        </Text>
                        <Text style={{ fontWeight: "600", width: CV, textAlign: "center", color: toneColor(row.profit ?? 0) }}>
                          {row.profit == null ? "-" : `${row.profit >= 0 ? "+" : ""}${formatMoney(row.profit, row.currency)}`}
                        </Text>
                        <Text style={{ ...cStyle, width: CV, textAlign: "center" }}>
                          {row.startValue == null ? "-" : formatMoney(row.startValue, row.currency)}
                        </Text>
                        <Text style={{ ...cStyle, width: CV, textAlign: "center" }}>
                          {row.endValue == null ? "-" : formatMoney(row.endValue, row.currency)}
                        </Text>
                        <Text style={{ ...cStyle, width: CV, textAlign: "center", color: toneColor(row.cashflowNet ?? 0) }}>
                          {row.cashflowNet == null ? "-" : `${row.cashflowNet >= 0 ? "+" : ""}${formatMoney(row.cashflowNet, row.currency)}`}
                        </Text>
                      </View>
                    ))}
                    <View style={{ flexDirection: "row", paddingVertical: 11, paddingHorizontal: 16, ...hBg, borderTopWidth: 1, borderBottomWidth: 0 }}>
                      <Text style={{ ...hStyle, width: CM }}>TOTAL</Text>
                      <Text style={{ ...hStyle, width: CP, textAlign: "center", color: toneColor(totalMonthProfit) }}>
                        {formatPctRatio(totalMonthReturnPct)}
                      </Text>
                      <Text style={{ ...hStyle, width: CV, textAlign: "center", color: toneColor(totalMonthProfit) }}>
                        {totalMonthProfit >= 0 ? "+" : ""}{formatMoney(totalMonthProfit)}
                      </Text>
                      <Text style={{ ...hStyle, width: CV, textAlign: "center" }}>-</Text>
                      <Text style={{ ...hStyle, width: CV, textAlign: "center" }}>-</Text>
                      <Text style={{ ...hStyle, width: CV, textAlign: "center", color: toneColor(totalMonthCashflow) }}>
                        {totalMonthCashflow >= 0 ? "+" : ""}{formatMoney(totalMonthCashflow)}
                      </Text>
                    </View>
                  </View>
                </ScrollView>
              </View>
            </>
          );
        })()}

          </>
        )}

          </ScrollView>
        </Animated.View>
      )}

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

      {/* -- Modal de acciones -- */}
      <Modal visible={fabOpen} transparent animationType="fade" onRequestClose={() => setFabOpen(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center" }}
          activeOpacity={1}
          onPress={() => setFabOpen(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View
              style={{
                backgroundColor: "white",
                borderRadius: 28,
                paddingVertical: 8,
                paddingHorizontal: 12,
                width: 280,
                shadowColor: "#000",
                shadowOpacity: 0.15,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 8 },
                elevation: 10,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "900", color: "#94A3B8", letterSpacing: 0.5, textAlign: "center", paddingVertical: 14 }}>
                NUEVA ACCIÓN
              </Text>

              {fabActions.map((action, idx) => (
                <TouchableOpacity
                  key={action.route || action.label}
                  activeOpacity={0.85}
                  disabled={syncingMetadata && !action.route}
                  onPress={() => {
                    if ((action as any).onPress) {
                      (action as any).onPress();
                      return;
                    }
                    setFabOpen(false);
                    navigation.navigate((action as any).route);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    paddingVertical: 15,
                    paddingHorizontal: 12,
                    borderRadius: 18,
                    borderTopWidth: idx === 0 ? 1 : 0,
                    borderBottomWidth: 1,
                    borderColor: "#F1F5F9",
                    opacity: syncingMetadata && !action.route ? 0.7 : 1,
                  }}
                >
                  <View
                    style={{
                      width: 40, height: 40, borderRadius: 14,
                      backgroundColor: "#EEF2FF",
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Ionicons name={action.icon} size={18} color={colors.primary} />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#0F172A" }}>
                    {action.label}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#CBD5E1" style={{ marginLeft: "auto" }} />
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                onPress={() => setFabOpen(false)}
                activeOpacity={0.7}
                style={{ alignItems: "center", paddingVertical: 16 }}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#94A3B8" }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}


