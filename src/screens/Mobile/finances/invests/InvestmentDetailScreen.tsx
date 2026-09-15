// src/screens/Investments/InvestmentDetailScreen.tsx
import React, { useCallback, useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../../../api/api";
import { colors } from "../../../../theme/theme";
import AppHeader from "../../../../components/AppHeader";
import AddButton from "../../../../components/AddButton";
import SegmentedTabs from "../../../../components/SegmentedTabs";
import HeroBalanceCard from "../../../../components/HeroBalanceCard";
import StatsRow from "../../../../components/StatsRow";
import { markInvestmentsDirty } from "../../../../utils/investmentsInvalidation";
import { appAlert } from "../../../../utils/appAlert";

import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line } from "react-native-svg";
import { translateCountry, translateSector } from "../../../../utils/investmentLabels";
import { formatEuro } from "../../../../utils/currency";
import InvestmentOperationDetailsModal from "../../../../components/InvestmentOperationDetailsModal";
import OverflowMenuButton from "../../../../components/OverflowMenuButton";
import ChartTooltip from "../../../../components/ChartTooltip";
import useChartScrubber from "../../../../hooks/useChartScrubber";
import InvestmentDetailScreenSkeleton from "../../../../components/skeletons/InvestmentDetailScreenSkeleton";

type InvestmentAssetType = "crypto" | "etf" | "stock" | "fund" | "custom";
type InvestmentRiskType = "variable_income" | "fixed_income" | "unknown";
type RangeKey = "1m" | "3m" | "6m" | "1y" | "all";
type InvestmentOperationType =
  | "buy"
  | "sell"
  | "transfer_in"
  | "transfer_out"
  | "swap_in"
  | "swap_out"
  | "dividend"
  | "fee";

interface AssetFromApi {
  id: number;
  name: string;
  abbreviation?: string | null;
  description?: string | null;
  provider?: string | null;
  type: InvestmentAssetType;
  riskType?: InvestmentRiskType | null;
  currency: string;
  initialInvested: number;
  quantity?: number | null;
  active: boolean;
  createdAt?: string | null;
  identificator?: string | null;
}

type AssetMetadataPayload = {
  id: number;
  assetId: number;
  isin?: string | null;
  manager?: string | null;
  benchmark?: string | null;
  distributionPolicy?: string | null;
  ter?: number | string | null;
  syncedAt?: string | null;
  cryptoCategory?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  asOfDate?: string | null;
  lastError?: string | null;
};

type CompositionPayload = {
  regions: Array<{ id?: number; country: string; pct: number }>;
  sectors: Array<{ id?: number; sector: string; pct: number }>;
  holdings: Array<{ id?: number; name: string; ticker?: string | null; weight: number }>;
  updatedAt?: string | null;
};

interface SeriesPoint {
  date: string;
  value: number;
  currency?: string;
  invested?: number;
  result?: number;
  dailyReturn?: number | null;
  returnPct?: number;
  externalFlow?: number;
  operationTypes?: string[];
}

interface SummaryAsset {
  id: number;
  invested: number;
  currentValue: number;
  pnl: number;
  averagePurchasePrice?: number | null;
  lastValuationDate: string | null;
}

type ValuationFromApi = {
  id: number;
  assetId?: number;
  investmentAssetId?: number;
  date: string;
  value: number;
  unitPrice?: number | null;
  currency?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  active?: boolean;
};

type InvestmentOperationFromApi = {
  id: number;
  userId?: number;
  assetId: number;
  type: InvestmentOperationType;
  date?: string | null;
  amount: number;
  quantity?: string | null;
  fee?: number | null;
  description?: string | null;
  transactionId?: number | null;
  swapGroupId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  active?: boolean;
  asset?: {
    id: number;
    name: string;
    abbreviation?: string | null;
    currency?: string | null;
    description?: string | null;
  } | null;
  transaction?: {
    description?: string | null;
    wallet?: { id?: number; name?: string | null } | null;
    fromWalletId?: number | null;
    toWalletId?: number | null;
    fromWallet?: { id?: number; name?: string | null } | null;
    toWallet?: { id?: number; name?: string | null } | null;
  } | null;
};

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
  if (!invested) return "0,00%";
  return `${((pnl / invested) * 100).toFixed(2).replace(".", ",")}%`;
};

const parseISO = (d: string) => new Date(d).getTime();

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit", month: "short", year: "numeric",
  });

const formatMonth = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", { month: "short", year: "2-digit" });

const rangeDays = (k: RangeKey) => {
  switch (k) {
    case "1m": return 30;
    case "3m": return 90;
    case "6m": return 180;
    case "1y": return 365;
    default:   return null;
  }
};

const rangeLabel = (k: RangeKey) => {
  switch (k) {
    case "1m": return "1M";
    case "3m": return "3M";
    case "6m": return "6M";
    case "1y": return "1A";
    default:   return "Todo";
  }
};

const typeLabel = (t: InvestmentAssetType) => {
  switch (t) {
    case "crypto": return "Crypto";
    case "etf":    return "ETF";
    case "stock":  return "Acción";
    case "fund":   return "Fondo";
    default:       return "Otro";
  }
};

const assetTypeIcon = (type: InvestmentAssetType): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case "crypto": return "logo-bitcoin";
    case "stock":  return "trending-up-outline";
    case "etf":    return "layers-outline";
    case "fund":   return "pie-chart-outline";
    default:       return "briefcase-outline";
  }
};

const riskLabel = (r?: InvestmentRiskType | null) => {
  switch (r) {
    case "variable_income": return "Renta variable";
    case "fixed_income":    return "Renta fija";
    default:                return "";
  }
};

const riskIcon = (r?: InvestmentRiskType | null): keyof typeof Ionicons.glyphMap => {
  switch (r) {
    case "variable_income": return "trending-up-outline";
    case "fixed_income":    return "shield-checkmark-outline";
    default:                return "help-circle-outline";
  }
};

const pnlMeta = (pnl: number) => {
  if (pnl > 0) return { color: "#16A34A", soft: "#DCFCE7", icon: "trending-up-outline" as const };
  if (pnl < 0) return { color: "#DC2626", soft: "#FEE2E2", icon: "trending-down-outline" as const };
  return { color: "#64748B", soft: "#E5E7EB", icon: "remove-outline" as const };
};

const fmt1 = (n: number) =>
  n.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const fmt2 = (n: number) =>
  n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function buildSparkPath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
}

function opLabel(t: InvestmentOperationType) {
  switch (t) {
    case "buy":      return "Compra";
    case "sell":     return "Venta";
    case "transfer_in": return "Aportación";
    case "transfer_out": return "Retirada";
    case "dividend": return "Dividendo";
    case "fee": return "Comisión";
    case "swap_in":
    case "swap_out":
      return "Swap";
    default:         return "Operación";
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

function opIso(op: InvestmentOperationFromApi) {
  return op.date || op.createdAt || "";
}

function opSignedAmount(op: InvestmentOperationFromApi) {
  const a = Math.abs(Number(op.amount || 0));
  const fee = Math.abs(Number(op.fee || 0));
  const sign =
    op.type === "sell" || op.type === "transfer_out" || op.type === "swap_out"
      ? -1
      : op.type === "swap_in"
      ? 1
      : 1;
  return sign * a - fee;
}

type Tone = "neutral" | "success" | "danger";
function opTone(t?: string | null): Tone {
  if (t === "buy" || t === "transfer_in" || t === "swap_in") return "success";
  if (t === "sell" || t === "transfer_out" || t === "swap_out") return "danger";
  return "neutral";
}

function toneMeta(t: Tone) {
  if (t === "success") return { fg: "#16A34A", bg: "rgba(34,197,94,0.10)",  bd: "rgba(34,197,94,0.18)" };
  if (t === "danger")  return { fg: "#DC2626", bg: "rgba(239,68,68,0.10)",  bd: "rgba(239,68,68,0.18)" };
  return                      { fg: "#0F172A", bg: "rgba(15,23,42,0.05)",   bd: "rgba(15,23,42,0.10)" };
}

type AssetCacheEntry = {
  asset: AssetFromApi;
  summaryRow: SummaryAsset | null;
  series: SeriesPoint[];
  valuations: ValuationFromApi[];
  operations: InvestmentOperationFromApi[];
  metadata: AssetMetadataPayload | null;
  composition: CompositionPayload | null;
};
const assetDataCache = new Map<number, AssetCacheEntry>();

export default function InvestmentDetailScreen({ navigation, route }: any) {
  const assetId: number = route?.params?.assetId;

  const [asset, setAsset] = useState<AssetFromApi | null>(() => assetDataCache.get(assetId)?.asset ?? null);
  const [summaryRow, setSummaryRow] = useState<SummaryAsset | null>(() => assetDataCache.get(assetId)?.summaryRow ?? null);
  const [series, setSeries] = useState<SeriesPoint[]>(() => assetDataCache.get(assetId)?.series ?? []);
  const [valuations, setValuations] = useState<ValuationFromApi[]>(() => assetDataCache.get(assetId)?.valuations ?? []);
  const [operations, setOperations] = useState<InvestmentOperationFromApi[]>(() => assetDataCache.get(assetId)?.operations ?? []);
  const [metadata, setMetadata] = useState<AssetMetadataPayload | null>(() => assetDataCache.get(assetId)?.metadata ?? null);
  const [composition, setComposition] = useState<CompositionPayload | null>(() => assetDataCache.get(assetId)?.composition ?? null);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState(false);
  const [webRefreshing, setWebRefreshing] = useState(false);
  const webTouchStartY = useRef(0);
  const webScrollAtTop = useRef(true);
  const [range, setRange] = useState<RangeKey>("3m");
  const [selectedChartIndex, setSelectedChartIndex] = useState<number | null>(null);
  const [chartLayoutWidth, setChartLayoutWidth] = useState(0);
  const selectedChartIndexRef = useRef<number | null>(null);
  const [sectionTab, setSectionTab] = useState<"info" | "evolution" | "composition" | "records">("info");
  const [recordsTab, setRecordsTab] = useState<"operations" | "valuations">("operations");
  const [compositionTab, setCompositionTab] = useState<"regions" | "sectors" | "holdings">("regions");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<InvestmentOperationFromApi | null>(null);

  const dismissChartTooltip = useCallback(() => {
    selectedChartIndexRef.current = null;
    setSelectedChartIndex(null);
  }, []);

  type ActionTarget = { kind: "valuation"; item: ValuationFromApi } | null;
  const [actionTarget, setActionTarget] = useState<ActionTarget>(null);

  const currency = useMemo(() => asset?.currency ?? "EUR", [asset?.currency]);
  const cryptoCategoryLabel = useMemo(() => {
    const direct = metadata?.cryptoCategory?.trim();
    if (direct) return direct;
    const topSector = composition?.sectors?.[0]?.sector;
    if (topSector) return translateSector(topSector);
    return "No disponible";
  }, [metadata?.cryptoCategory, composition?.sectors]);

  const fetchAll = useCallback(async () => {
    // -- Fase 1: datos críticos (hero + info tab) ------------------------------
    setLoading(true);
    let newAsset: AssetFromApi | null = null;
    let newSummaryRow: SummaryAsset | null = null;
    try {
      const [aRes, sRes] = await Promise.all([
        api.get(`/investments/assets/${assetId}`),
        api.get(`/investments/summary`),
      ]);
      newAsset = aRes.data || null;
      newSummaryRow = (sRes.data?.assets || []).find((x: any) => Number(x.id) === Number(assetId)) || null;
      setAsset(newAsset);
      setSummaryRow(newSummaryRow);
    } catch {
      navigation.goBack();
      return;
    } finally {
      setLoading(false);
    }

    // -- Fase 2: datos secundarios en background (sin spinner) ------------------
    const [serRes, vRes, oRes, mRes] = await Promise.allSettled([
      api.get(`/investments/assets/${assetId}/series`),
      api.get(`/investments/valuations`, { params: { assetId } }),
      api.get(`/investments/operations`, { params: { assetId } }),
      api.get(`/investments/assets/${assetId}/metadata`),
    ]);

    const prev = assetDataCache.get(assetId);
    let newSeries: SeriesPoint[] = prev?.series ?? [];
    let newValuations: ValuationFromApi[] = prev?.valuations ?? [];
    let newOperations: InvestmentOperationFromApi[] = prev?.operations ?? [];
    let newMetadata: AssetMetadataPayload | null = prev?.metadata ?? null;
    let newComposition: CompositionPayload | null = prev?.composition ?? null;

    if (serRes.status === "fulfilled") {
      newSeries = Array.isArray(serRes.value.data) ? serRes.value.data : [];
      setSeries(newSeries);
    }

    if (vRes.status === "fulfilled") {
      const vList = Array.isArray(vRes.value.data) ? vRes.value.data : vRes.value.data?.valuations ?? [];
      newValuations = Array.isArray(vList) ? vList : [];
      setValuations(newValuations);
    }

    if (oRes.status === "fulfilled") {
      const oList = Array.isArray(oRes.value.data) ? oRes.value.data : oRes.value.data?.operations ?? [];
      newOperations = Array.isArray(oList) ? oList : [];
      setOperations(newOperations);
    }

    if (mRes.status === "fulfilled" && mRes.value.data?.composition) {
      newMetadata = mRes.value.data.metadata ?? null;
      newComposition = mRes.value.data.composition;
      setMetadata(newMetadata);
      setComposition(newComposition);
    } else {
      try {
        const cRes = await api.get(`/investments/assets/${assetId}/composition`);
        newComposition = cRes.data ?? null;
        setComposition(newComposition);
      } catch {}
    }

    assetDataCache.set(assetId, {
      asset: newAsset!,
      summaryRow: newSummaryRow,
      series: newSeries,
      valuations: newValuations,
      operations: newOperations,
      metadata: newMetadata,
      composition: newComposition,
    });
  }, [assetId, navigation]);

  useFocusEffect(
    useCallback(() => {
      // Keep instant paint from cache but always refresh on focus.
      fetchAll();
    }, [fetchAll, assetId])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const handleWebTouchStart = useCallback((e: any) => {
    if (Platform.OS === "web") {
      webTouchStartY.current = e.nativeEvent?.touches?.[0]?.pageY ?? 0;
    }
  }, []);

  const handleWebTouchEnd = useCallback(async (e: any) => {
    dismissChartTooltip();
    if (Platform.OS !== "web" || webRefreshing) return;
    const endY = e.nativeEvent?.changedTouches?.[0]?.pageY ?? 0;
    if (webScrollAtTop.current && endY - webTouchStartY.current > 80) {
      setWebRefreshing(true);
      await onRefresh();
      setWebRefreshing(false);
    }
  }, [dismissChartTooltip, webRefreshing, onRefresh]);

  const handleDeleteValuation = (id: number) => {
    if (Platform.OS === "web") {
      const ok = typeof window !== "undefined" ? window.confirm("¿Seguro que quieres eliminar esta valoración?") : false;
      if (!ok) return;
      (async () => {
        try {
          await api.delete(`/investments/valuations/${id}`);
          markInvestmentsDirty();
          setActionTarget(null);
          fetchAll();
        } catch {
          if (typeof window !== "undefined") window.alert("No se pudo eliminar la valoración.");
        }
      })();
      return;
    }

    Alert.alert("Eliminar valoración", "¿Seguro que quieres eliminar esta valoración?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/investments/valuations/${id}`);
            markInvestmentsDirty();
            setActionTarget(null);
            fetchAll();
          } catch {
            Alert.alert("Error", "No se pudo eliminar la valoración.");
          }
        },
      },
    ]);
  };

  const handleArchiveAsset = () => {
    appAlert(
      "Archivar inversión",
      "Dejará de aparecer en tu cartera activa. Para archivarla, su última valoración debe ser 0.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Archivar",
          onPress: async () => {
            try {
              await api.patch(`/investments/assets/${assetId}/archive`);
              assetDataCache.delete(assetId);
              markInvestmentsDirty();
              navigation.goBack();
            } catch (error: any) {
              const message = error?.response?.data?.message || "No se pudo archivar la inversión.";
              appAlert("No se pudo archivar", String(message));
            }
          },
        },
      ]
    );
  };

  const handleDeleteAsset = () => {
    appAlert(
      "Eliminar inversión",
      "Se ocultará la inversión, pero no se borrarán tus transacciones históricas.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/investments/assets/${assetId}`);
              assetDataCache.delete(assetId);
              markInvestmentsDirty();
              navigation.goBack();
            } catch {
              appAlert("Error", "No se pudo eliminar la inversión.");
            }
          },
        },
      ]
    );
  };

  const stats = useMemo(() => {
    const invested = summaryRow?.invested ?? (asset?.initialInvested ?? 0);
    const currentValue = summaryRow?.currentValue ?? invested;
    const pnl = summaryRow?.pnl ?? currentValue - invested;
    const meta = pnlMeta(pnl);
    const last =
      summaryRow?.lastValuationDate
        ? formatDate(summaryRow.lastValuationDate)
        : series.length
        ? formatDate([...series].sort((a, b) => parseISO(b.date) - parseISO(a.date))[0].date)
        : "Sin datos";
    return { invested, currentValue, pnl, meta, last };
  }, [asset, summaryRow, series]);

  const sortedSeries = useMemo(
    () => [...series].filter((p) => !!p?.date).sort((a, b) => parseISO(a.date) - parseISO(b.date)),
    [series]
  );

  const filteredSeries = useMemo(() => {
    if (!sortedSeries.length) return [];
    if (range === "all") return sortedSeries;
    const days = rangeDays(range);
    if (!days) return sortedSeries;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const f = sortedSeries.filter((p) => parseISO(p.date) >= cutoff);
    return f.length >= 4 ? f : sortedSeries.slice(-8);
  }, [sortedSeries, range]);

  const chart = useMemo(() => {
    const pts = filteredSeries;
    if (pts.length < 2) return null;

    const values = pts.map((p) => Number(p.value || 0));
    const capitalValues = pts.map((p) => Number(p.invested || 0));
    const scaleValues = [...values, ...capitalValues];
    const minV = Math.min(...scaleValues);
    const maxV = Math.max(...scaleValues);
    const span = maxV - minV || 1;

    const W = 340;
    const H = 128;
    const padX = 3;
    const padY = 14;
    const step = (W - padX * 2) / (pts.length - 1);

    const mapped = pts.map((p, i) => {
      const x = padX + i * step;
      const metricValue = values[i];
      const t = (metricValue - minV) / span;
      const y = padY + (1 - t) * (H - padY * 2);
      return { x, y, ...p, metricValue };
    });

    const path = buildSparkPath(mapped.map((m) => ({ x: m.x, y: m.y })));
    const areaPath = `${path} L ${mapped[mapped.length - 1].x.toFixed(2)} ${(H - padY).toFixed(2)} L ${mapped[0].x.toFixed(2)} ${(H - padY).toFixed(2)} Z`;
    const capitalMapped = pts.map((point, index) => ({
      x: padX + index * step,
      y: padY + (1 - (capitalValues[index] - minV) / span) * (H - padY * 2),
      ...point,
    }));
    const capitalPath = buildSparkPath(capitalMapped.map((point) => ({ x: point.x, y: point.y })));

    let rangeGrowthFactor = 1;
    const returnValues = pts.map((point, index) => {
      if (index > 0 && point.dailyReturn != null && Number.isFinite(Number(point.dailyReturn))) {
        rangeGrowthFactor *= 1 + Number(point.dailyReturn);
      }
      return (rangeGrowthFactor - 1) * 100;
    });
    const returnMinV = Math.min(...returnValues);
    const returnMaxV = Math.max(...returnValues);
    const returnSpan = returnMaxV - returnMinV || 1;
    const returnMapped = pts.map((point, index) => ({
      x: padX + index * step,
      y: padY + (1 - (returnValues[index] - returnMinV) / returnSpan) * (H - padY * 2),
      metricValue: returnValues[index],
      ...point,
    }));
    const returnPath = buildSparkPath(returnMapped.map((point) => ({ x: point.x, y: point.y })));
    const returnAreaPath = `${returnPath} L ${returnMapped[returnMapped.length - 1].x.toFixed(2)} ${(H - padY).toFixed(2)} L ${returnMapped[0].x.toFixed(2)} ${(H - padY).toFixed(2)} Z`;

    const last = pts[pts.length - 1];
    const rangeDelta = Number(last.value || 0) - Number(pts[0].value || 0);
    const cashflowNet = pts.slice(1).reduce((sum, point) => sum + Number(point.externalFlow || 0), 0);
    const periodProfit = rangeDelta - cashflowNet;
    const rangeReturnPct = returnValues[returnValues.length - 1];

    return { W, H, padY, mapped, path, areaPath, capitalPath, returnMapped, returnPath, returnAreaPath, returnMinV, returnMaxV, minV, maxV, rangeDelta, cashflowNet, periodProfit, rangeReturnPct };
  }, [filteredSeries]);

  const selectChartPoint = useCallback((fraction: number) => {
    if (!chart) return;
    const index = Math.max(0, Math.min(chart.mapped.length - 1, Math.round(fraction * (chart.mapped.length - 1))));
    if (selectedChartIndexRef.current !== index) {
      selectedChartIndexRef.current = index;
      setSelectedChartIndex(index);
      if (Platform.OS !== "web") void Haptics.selectionAsync();
    }
  }, [chart]);
  const valueScrubber = useChartScrubber(selectChartPoint);
  const returnScrubber = useChartScrubber(selectChartPoint);

  const valuationsRows = useMemo(() => {
    return [...valuations]
      .filter((v) => (v.active ?? true))
      .filter((v) => !!v.date)
      .sort((a, b) => parseISO(b.date) - parseISO(a.date));
  }, [valuations]);

  const operationsRows = useMemo(() => {
    return [...operations]
      .filter((op) => (op.active ?? true))
      .filter((op) => Number(op.assetId) === Number(assetId))
      .filter((op) => !!opIso(op))
      .sort((a, b) => parseISO(opIso(b)) - parseISO(opIso(a)));
  }, [operations, assetId]);

  const positionDetails = useMemo(() => {
    const quantity = Number(asset?.quantity ?? 0);
    const hasQuantity = Number.isFinite(quantity) && quantity > 0;
    const latestUnitPrice = Number(valuationsRows[0]?.unitPrice ?? 0);
    const unitPrice = latestUnitPrice > 0
      ? latestUnitPrice
      : hasQuantity
        ? stats.currentValue / quantity
        : null;

    return { quantity, hasQuantity, unitPrice };
  }, [asset?.quantity, stats.currentValue, valuationsRows]);

  const operationsByMonth = useMemo(() => {
    const groups = new Map<string, { label: string; ops: InvestmentOperationFromApi[] }>();
    operationsRows.forEach((op) => {
      const date = new Date(opIso(op));
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!groups.has(key)) {
        const label = date.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
        groups.set(key, { label: label.charAt(0).toUpperCase() + label.slice(1), ops: [] });
      }
      groups.get(key)!.ops.push(op);
    });
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [operationsRows]);

  const valuationsByMonth = useMemo(() => {
    const groups = new Map<string, { label: string; rows: ValuationFromApi[] }>();
    valuationsRows.forEach((valuation) => {
      const date = new Date(valuation.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!groups.has(key)) {
        const label = date.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
        groups.set(key, { label: label.charAt(0).toUpperCase() + label.slice(1), rows: [] });
      }
      groups.get(key)!.rows.push(valuation);
    });
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [valuationsRows]);

  if (!assetId) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: "#94A3B8", fontWeight: "800" }}>Falta assetId en la navegación.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" onTouchEnd={dismissChartTooltip}>
      {/* -- HEADER -- */}
      <View className="px-5 pb-3">
        <AppHeader
          title={asset?.abbreviation?.trim() || asset?.name || "Inversión"}
          titleFontSize={17}
          titleNumberOfLines={0}
          showBack
          showProfile={false}
          showDatePicker={false}
          rightElement={
            asset ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <AddButton label="Añadir" onPress={() => setQuickAddOpen(true)} />
                <OverflowMenuButton
                  title={asset.abbreviation?.trim() || asset.name}
                  actions={[
                    {
                      label: "Editar",
                      onPress: () => navigation.navigate("InvestmentForm", { assetId }),
                    },
                    {
                      label: "Archivar",
                      onPress: handleArchiveAsset,
                    },
                    {
                      label: "Eliminar",
                      style: "destructive",
                      onPress: handleDeleteAsset,
                    },
                  ]}
                  iconSize={19}
                  accessibilityLabel="Acciones de la inversión"
                  buttonStyle={{ width: 30, height: 36 }}
                />
              </View>
            ) : undefined
          }
        />
      </View>

      {loading || !asset ? (
        <InvestmentDetailScreenSkeleton />
      ) : (
        <View
          className="flex-1"
          onTouchStart={handleWebTouchStart}
          onTouchEnd={handleWebTouchEnd}
        >
          {/* -- HERO -- mismo lenguaje visual que Inicio/Inversiones/Viajes */}
          <View style={{ paddingHorizontal: 16 }}>
            <HeroBalanceCard
              label="Valor actual"
              value={formatMoney(stats.currentValue, currency)}
              style={{ marginBottom: 8 }}
              footer={
                <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: "600", marginTop: 6, textAlign: "center" }} numberOfLines={1}>
                  Última actualización: {stats.last}
                </Text>
              }
            />

            <StatsRow
              items={[
                { key: "aportado", label: "APORTADO", value: formatMoney(stats.invested, currency) },
                {
                  key: "resultado",
                  label: "RESULTADO",
                  value: `${stats.pnl >= 0 ? "+" : "−"}${formatMoney(Math.abs(stats.pnl), currency)}`,
                  color: stats.pnl >= 0 ? colors.success : colors.danger,
                },
                {
                  key: "rentabilidad",
                  label: "RENTABILIDAD",
                  value: `${stats.pnl >= 0 ? "+" : ""}${formatPct(stats.pnl, stats.invested)}`,
                  color: stats.pnl >= 0 ? colors.success : colors.danger,
                },
              ]}
            />
          </View>

          {/* -- TABS: underline, ancho completo, sin scroll -- */}
          <View style={{ marginTop: 12 }}>
            <SegmentedTabs<"info" | "evolution" | "composition" | "records">
              variant="underline"
              options={[
                { key: "info", label: "Información" },
                { key: "evolution", label: "Evolución" },
                { key: "composition", label: "Composición" },
                { key: "records", label: "Operaciones" },
              ]}
              value={sectionTab}
              onChange={setSectionTab}
            />
          </View>

          <ScrollView
            scrollEnabled={!valueScrubber.isScrubbing && !returnScrubber.isScrubbing}
            style={{ flex: 1, paddingHorizontal: 14 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40, paddingTop: 14 }}
            scrollEventThrottle={16}
            onScroll={(e) => { if (Platform.OS === "web") webScrollAtTop.current = e.nativeEvent.contentOffset.y <= 0; }}
            refreshControl={Platform.OS !== "web" ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
          >
            {Platform.OS === "web" && webRefreshing && (
              <View style={{ alignItems: "center", paddingBottom: 8 }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}

          {/* -- EVOLUCIÓN -- */}
          {sectionTab === "evolution" && (
          <View
            style={{
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: "row", gap: 3, backgroundColor: "#EEF1F5", borderRadius: 13, padding: 3 }}>
              {(["1m", "3m", "6m", "1y", "all"] as RangeKey[]).map((k) => {
                const active = range === k;
                return (
                  <TouchableOpacity
                    key={k}
                    onPress={() => {
                      setRange(k);
                      selectedChartIndexRef.current = null;
                      setSelectedChartIndex(null);
                    }}
                    activeOpacity={0.9}
                    style={{
                      flex: 1, alignItems: "center",
                      paddingVertical: 7, borderRadius: 10,
                      backgroundColor: active ? "white" : "transparent",
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "900", color: active ? colors.primary : "#64748B" }}>
                      {rangeLabel(k)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {!chart ? (
              <Text style={{ marginTop: 14, fontSize: 12, color: "#94A3B8", fontWeight: "600" }}>
                Añade 2 valoraciones o más para ver la gráfica.
              </Text>
            ) : (
              <>
                <View style={{ alignItems: "center", paddingTop: 16, paddingBottom: 4 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: "900", color: "#94A3B8", letterSpacing: 0.5 }}>
                    RESULTADO DEL PERIODO
                  </Text>
                  <Text style={{ marginTop: 6, fontSize: 25, fontWeight: "900", color: pnlMeta(chart.periodProfit).color }}>
                    {chart.periodProfit >= 0 ? "+" : ""}{formatMoney(chart.periodProfit, currency)}
                  </Text>
                  <Text style={{ marginTop: 2, fontSize: 14, fontWeight: "900", color: pnlMeta(chart.rangeReturnPct).color }}>
                    {chart.rangeReturnPct >= 0 ? "+" : ""}{fmt2(chart.rangeReturnPct)}%
                  </Text>
                </View>

                <View
                  ref={valueScrubber.ref}
                  {...valueScrubber.handlers}
                  onLayout={(event) => setChartLayoutWidth(event.nativeEvent.layout.width - 26)}
                  style={{
                    ...(Platform.OS === "web" ? { touchAction: "none", userSelect: "none" } as any : {}),
                    marginTop: 14, backgroundColor: "white",
                    borderRadius: 18, borderWidth: 1, borderColor: "#E5E7EB",
                    paddingVertical: 14, paddingHorizontal: 12,
                  }}
                >
                  <View style={{ marginBottom: 10 }}>
                    <Text style={{ fontSize: 14, fontWeight: "900", color: "#0F172A" }}>
                      Valor y capital aportado
                    </Text>
                  </View>

                  <View style={{ position: "relative" }}>
                    <Svg
                      width="100%"
                      height={chart.H}
                      viewBox={`0 0 ${chart.W} ${chart.H}`}
                      preserveAspectRatio="none"
                    >
                    <Defs>
                      <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={colors.primary} stopOpacity="0.18" />
                        <Stop offset="1" stopColor={colors.primary} stopOpacity="0.02" />
                      </LinearGradient>
                    </Defs>
                    <Path
                      d={`M 0 ${(chart.H - chart.padY).toFixed(2)} L ${chart.W.toFixed(2)} ${(chart.H - chart.padY).toFixed(2)}`}
                      stroke="#E5E7EB" strokeWidth="1" fill="none"
                    />
                    <Path d={chart.areaPath} fill="url(#areaGrad)" />
                    <Path d={chart.capitalPath} stroke="#94A3B8" strokeWidth="2" strokeDasharray="5 5" fill="none" />
                    <Path d={chart.path} stroke={colors.primary} strokeWidth="3" fill="none" />
                    {chart.mapped.map((point, index) => point.operationTypes?.some((type) => type === "buy" || type === "sell") ? (
                      <Circle
                        key={`operation-marker-${point.date}`}
                        cx={point.x}
                        cy={chart.H - chart.padY + 1}
                        r="2.5"
                        fill={point.operationTypes.includes("sell") ? "#7C3AED" : colors.primary}
                      />
                    ) : null)}
                    {selectedChartIndex !== null && chart.mapped[Math.min(selectedChartIndex, chart.mapped.length - 1)] ? (
                      <>
                        <Line
                          x1={chart.mapped[Math.min(selectedChartIndex, chart.mapped.length - 1)].x}
                          x2={chart.mapped[Math.min(selectedChartIndex, chart.mapped.length - 1)].x}
                          y1={chart.padY}
                          y2={chart.H - chart.padY}
                          stroke="#94A3B8"
                          strokeWidth="1"
                          strokeDasharray="3 3"
                        />
                        <Circle
                          cx={chart.mapped[Math.min(selectedChartIndex, chart.mapped.length - 1)].x}
                          cy={chart.mapped[Math.min(selectedChartIndex, chart.mapped.length - 1)].y}
                          r="5"
                          fill="white"
                          stroke={colors.primary}
                          strokeWidth="3"
                        />
                      </>
                    ) : null}
                    <Circle
                      cx={chart.mapped[chart.mapped.length - 1].x}
                      cy={chart.mapped[chart.mapped.length - 1].y}
                      r="4" fill={colors.primary}
                    />
                    </Svg>

                    {selectedChartIndex !== null && chart.mapped[Math.min(selectedChartIndex, chart.mapped.length - 1)] ? (() => {
                      const point = chart.mapped[Math.min(selectedChartIndex, chart.mapped.length - 1)];
                      const tooltipWidth = Math.min(260, chartLayoutWidth || 260);
                      const selectedX = chartLayoutWidth > 0 ? (point.x / chart.W) * chartLayoutWidth : 0;
                      const tooltipLeft = Math.min(
                        Math.max(selectedX - tooltipWidth / 2, 0),
                        Math.max(chartLayoutWidth - tooltipWidth, 0)
                      );
                      const pointerLeft = Math.min(Math.max(selectedX - tooltipLeft, 12), tooltipWidth - 12);
                      const result = Number(point.result || 0);

                      return (
                        <ChartTooltip
                          title={formatDate(point.date)}
                          pointerLeft={pointerLeft}
                          style={{
                            position: "absolute",
                            width: tooltipWidth,
                            left: tooltipLeft,
                            bottom: chart.H + 8,
                            zIndex: 20,
                            elevation: 6,
                          }}
                          rows={[
                            {
                              label: "Valor cartera",
                              color: colors.primary,
                              formattedValue: formatMoney(Number(point.value || 0), currency),
                            },
                            {
                              label: "Aportado",
                              color: "#94A3B8",
                              formattedValue: formatMoney(Number(point.invested || 0), currency),
                            },
                            {
                              label: "Resultado",
                              color: pnlMeta(result).color,
                              formattedValue: `${result >= 0 ? "+" : ""}${formatMoney(result, currency)}`,
                            },
                          ]}
                        />
                      );
                    })() : null}
                  </View>

                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>
                      {formatMonth(chart.mapped[0].date)}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>
                      {formatMonth(chart.mapped[chart.mapped.length - 1].date)}
                    </Text>
                  </View>
                </View>

                <View
                  ref={returnScrubber.ref}
                  {...returnScrubber.handlers}
                  style={{
                    ...(Platform.OS === "web" ? { touchAction: "none", userSelect: "none" } as any : {}),
                    marginTop: 12, backgroundColor: "white",
                    borderRadius: 18, borderWidth: 1, borderColor: "#E5E7EB",
                    paddingVertical: 14, paddingHorizontal: 12,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: "900", color: "#0F172A" }}>Rentabilidad acumulada</Text>
                    <Text style={{ fontSize: 11, fontWeight: "900", color: pnlMeta(chart.rangeReturnPct).color }}>
                      Cartera {chart.rangeReturnPct >= 0 ? "+" : ""}{fmt2(chart.rangeReturnPct)}%
                    </Text>
                  </View>

                  <Svg
                    width="100%"
                    height={chart.H}
                    viewBox={`0 0 ${chart.W} ${chart.H}`}
                    preserveAspectRatio="none"
                  >
                    <Defs>
                      <LinearGradient id="returnAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor="#16A34A" stopOpacity="0.16" />
                        <Stop offset="1" stopColor="#16A34A" stopOpacity="0.02" />
                      </LinearGradient>
                    </Defs>
                    <Path
                      d={`M 0 ${(chart.H - chart.padY).toFixed(2)} L ${chart.W.toFixed(2)} ${(chart.H - chart.padY).toFixed(2)}`}
                      stroke="#E5E7EB" strokeWidth="1" fill="none"
                    />
                    <Path d={chart.returnAreaPath} fill="url(#returnAreaGrad)" />
                    <Path d={chart.returnPath} stroke="#16A34A" strokeWidth="3" fill="none" />
                    {selectedChartIndex !== null && chart.returnMapped[Math.min(selectedChartIndex, chart.returnMapped.length - 1)] ? (
                      <>
                        <Line
                          x1={chart.returnMapped[Math.min(selectedChartIndex, chart.returnMapped.length - 1)].x}
                          x2={chart.returnMapped[Math.min(selectedChartIndex, chart.returnMapped.length - 1)].x}
                          y1={chart.padY}
                          y2={chart.H - chart.padY}
                          stroke="#94A3B8"
                          strokeWidth="1"
                          strokeDasharray="3 3"
                        />
                        <Circle
                          cx={chart.returnMapped[Math.min(selectedChartIndex, chart.returnMapped.length - 1)].x}
                          cy={chart.returnMapped[Math.min(selectedChartIndex, chart.returnMapped.length - 1)].y}
                          r="5"
                          fill="white"
                          stroke="#16A34A"
                          strokeWidth="3"
                        />
                      </>
                    ) : null}
                    <Circle
                      cx={chart.returnMapped[chart.returnMapped.length - 1].x}
                      cy={chart.returnMapped[chart.returnMapped.length - 1].y}
                      r="4"
                      fill="#16A34A"
                    />
                  </Svg>

                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>{formatMonth(chart.returnMapped[0].date)}</Text>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>{formatMonth(chart.returnMapped[chart.returnMapped.length - 1].date)}</Text>
                  </View>
                </View>
              </>
            )}
          </View>
          )}

          {/* -- INFORMACIÓN -- */}
          {sectionTab === "info" && (
          <View style={{ marginBottom: 20 }}>
            {(() => {
              const isin = metadata?.isin?.trim() || (asset.type !== "crypto" ? asset.identificator?.trim() : "");
              const manager = asset.provider?.trim() || metadata?.manager?.trim();
              const benchmark = metadata?.benchmark?.trim();
              const distributionPolicy = metadata?.distributionPolicy?.trim();
              const ter = typeof metadata?.ter === "number" && Number.isFinite(metadata.ter)
                ? `${metadata.ter.toLocaleString("es-ES", { maximumFractionDigits: 4 })} %`
                : typeof metadata?.ter === "string" && metadata.ter.trim()
                  ? metadata.ter.trim().includes("%")
                    ? metadata.ter.trim()
                    : `${metadata.ter.trim()} %`
                  : "";
              const positionMetrics = [
                {
                  label: "Participaciones",
                  value: positionDetails.hasQuantity
                    ? positionDetails.quantity.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 6 })
                    : "—",
                },
                ...(positionDetails.unitPrice != null ? [{
                  label: asset.type === "fund" ? "Valor liquidativo" : "Precio actual",
                  value: formatMoney(positionDetails.unitPrice, currency),
                }] : []),
                ...(summaryRow?.averagePurchasePrice != null ? [{
                  label: "Precio medio",
                  value: formatMoney(Number(summaryRow.averagePurchasePrice), currency),
                }] : []),
              ];
              const technicalRows = [
                ...(asset.description?.trim() ? [{ label: "Broker", value: asset.description.trim() }] : []),
                ...(manager ? [{ label: "Gestora", value: manager }] : []),
                ...(benchmark ? [{ label: "Índice", value: benchmark }] : []),
                ...(distributionPolicy ? [{ label: "Distribución", value: distributionPolicy }] : []),
                ...(ter ? [{ label: "TER", value: ter }] : []),
                ...(isin ? [{ label: "ISIN", value: isin }] : []),
                ...(asset.type === "crypto" && asset.identificator?.trim()
                  ? [{ label: "Símbolo", value: asset.identificator.trim() }]
                  : []),
              ];

              const renderTechnicalRows = (rows: Array<{ label: string; value: string }>) => rows.map((row, index) => (
                <View
                  key={row.label}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    minHeight: 43,
                    borderBottomWidth: index < rows.length - 1 ? 1 : 0,
                    borderBottomColor: "#E8EDF4",
                    gap: 16,
                  }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: "600", color: "#64748B" }}>{row.label}</Text>
                  <Text style={{ flex: 1, minWidth: 0, paddingVertical: 8, fontSize: 13, fontWeight: "800", color: "#0F172A", textAlign: "right" }}>
                    {row.value}
                  </Text>
                </View>
              ));

              return (
                <View
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                    borderRadius: 20,
                    overflow: "hidden",
                  }}
                >
                  <View style={{ paddingHorizontal: 14, paddingTop: 16, paddingBottom: 18 }}>
                    <Text style={{ fontSize: 12, fontWeight: "900", color: "#64748B", letterSpacing: 0.55, marginBottom: 17 }}>
                      TU POSICIÓN
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "stretch" }}>
                      {positionMetrics.map((metric, index) => (
                        <View
                          key={metric.label}
                          style={{
                            flex: 1,
                            alignItems: "center",
                            justifyContent: "flex-start",
                            paddingHorizontal: 8,
                            borderLeftWidth: index > 0 ? 1 : 0,
                            borderLeftColor: "#E8EDF4",
                          }}
                        >
                          <Text style={{ fontSize: 15, fontWeight: "900", color: "#0F172A", textAlign: "center" }} numberOfLines={1}>
                            {metric.value}
                          </Text>
                          <Text style={{ fontSize: 10.5, fontWeight: "600", color: "#94A3B8", textAlign: "center", marginTop: 4 }} numberOfLines={2}>
                            {metric.label}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={{ height: 1, backgroundColor: "#E8EDF4", marginHorizontal: 14 }} />

                  <View style={{ paddingHorizontal: 14, paddingTop: 17, paddingBottom: technicalRows.length ? 5 : 18 }}>
                    <Text style={{ fontSize: 12, fontWeight: "900", color: "#64748B", letterSpacing: 0.55 }}>
                      SOBRE EL ACTIVO
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: "800", color: "#0F172A", lineHeight: 20, marginTop: 11 }}>
                      {asset.name}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748B", marginTop: 5 }}>
                      {[typeLabel(asset.type), riskLabel(asset.riskType), asset.currency].filter(Boolean).join(" · ")}
                    </Text>
                    {technicalRows.length ? (
                      <View style={{ borderTopWidth: 1, borderTopColor: "#E8EDF4", marginTop: 14 }}>
                        {renderTechnicalRows(technicalRows)}
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })()}
          </View>
          )}

          {/* -- COMPOSICIÓN -- */}
          {sectionTab === "composition" && (
          <>
            {/* Sub-tabs: Regiones / Sectores / Holdings */}
            <View style={{ marginBottom: 12 }}>
              <SegmentedTabs<"regions" | "sectors" | "holdings">
                options={[
                  { key: "regions", label: "Regiones" },
                  { key: "sectors", label: "Sectores" },
                  { key: "holdings", label: "Holdings" },
                ]}
                value={compositionTab}
                onChange={setCompositionTab}
              />
            </View>

            <View
              style={{
                backgroundColor: "white",
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                marginBottom: 12,
              }}
            >
              {metadata?.syncedAt || metadata?.asOfDate || composition?.updatedAt ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 12 }}>
                  <Ionicons name="calendar-outline" size={13} color="#94A3B8" />
                  <Text style={{ fontSize: 11, fontWeight: "600", color: "#94A3B8" }}>
                    Composición actualizada el {formatDate((metadata?.syncedAt || metadata?.asOfDate || composition?.updatedAt)!)}
                  </Text>
                </View>
              ) : null}

              {asset.type === "crypto" ? (
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#334155", marginBottom: 12 }}>
                  Categoría: {cryptoCategoryLabel}
                </Text>
              ) : null}

              {compositionTab === "regions" && (
                !(composition?.regions?.length)
                  ? <Text style={{ fontSize: 12, fontWeight: "600", color: "#94A3B8" }}>Datos de regiones no disponibles.</Text>
                  : [...(composition.regions)].sort((a, b) => Number(b.pct) - Number(a.pct)).map((r) => (
                      <View key={`country-${r.country}`} style={{ marginBottom: 10 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                          <Text style={{ flex: 1, fontSize: 12, color: "#334155", fontWeight: "700", paddingRight: 8 }}>{translateCountry(r.country)}</Text>
                          <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "800" }}>
                            {fmt1(Number(r.pct))}% · ≈{formatMoney(stats.currentValue * Number(r.pct) / 100, currency)}
                          </Text>
                        </View>
                        <View style={{ height: 4, backgroundColor: "#E5E7EB", borderRadius: 999 }}>
                          <View style={{ height: 4, backgroundColor: colors.primary, borderRadius: 999, width: `${Math.min(Number(r.pct), 100)}%` as any }} />
                        </View>
                      </View>
                    ))
              )}

              {compositionTab === "sectors" && (
                !(composition?.sectors?.length)
                  ? <Text style={{ fontSize: 12, fontWeight: "600", color: "#94A3B8" }}>Datos de sectores no disponibles.</Text>
                  : [...(composition.sectors)].sort((a, b) => Number(b.pct) - Number(a.pct)).map((s) => (
                      <View key={`sector-${s.sector}`} style={{ marginBottom: 10 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                          <Text style={{ flex: 1, fontSize: 12, color: "#334155", fontWeight: "700", paddingRight: 8 }}>{translateSector(s.sector)}</Text>
                          <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "800" }}>
                            {fmt1(Number(s.pct))}% · ≈{formatMoney(stats.currentValue * Number(s.pct) / 100, currency)}
                          </Text>
                        </View>
                        <View style={{ height: 4, backgroundColor: "#E5E7EB", borderRadius: 999 }}>
                          <View style={{ height: 4, backgroundColor: colors.primary, borderRadius: 999, width: `${Math.min(Number(s.pct), 100)}%` as any }} />
                        </View>
                      </View>
                    ))
              )}

              {compositionTab === "holdings" && (
                !(composition?.holdings?.length)
                  ? <Text style={{ fontSize: 12, fontWeight: "600", color: "#94A3B8" }}>Holdings no disponibles.</Text>
                  : [...composition.holdings].sort((a, b) => Number(b.weight || 0) - Number(a.weight || 0)).map((h, idx) => (
                      <View key={`holding-${idx}-${h.name}`} style={{ marginBottom: 10 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                          <Text style={{ flex: 1, fontSize: 12, color: "#334155", fontWeight: "700", paddingRight: 8 }} numberOfLines={1}>
                            {h.name}{h.ticker ? ` (${h.ticker})` : ""}
                          </Text>
                          <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "800" }}>
                            {fmt1(Number(h.weight || 0))}% · ≈{formatMoney(stats.currentValue * Number(h.weight || 0) / 100, currency)}
                          </Text>
                        </View>
                        <View style={{ height: 4, backgroundColor: "#E5E7EB", borderRadius: 999 }}>
                          <View style={{ height: 4, backgroundColor: colors.primary, borderRadius: 999, width: `${Math.min(Number(h.weight || 0), 100)}%` as any }} />
                        </View>
                      </View>
                    ))
              )}
            </View>
          </>
          )}
          {/* -- OPERACIONES / VALORACIONES -- */}
          {sectionTab === "records" && (
          <>
            <View style={{ marginBottom: 12 }}>
              <SegmentedTabs<"operations" | "valuations">
                options={[
                  { key: "operations", label: "Operaciones" },
                  { key: "valuations", label: "Valoraciones" },
                ]}
                value={recordsTab}
                onChange={setRecordsTab}
              />
            </View>

          {recordsTab === "operations" ? (
            operationsRows.length ? (
              <View style={{ gap: 16 }}>
                {operationsByMonth.map(([monthKey, { label, ops }]) => (
                  <View key={monthKey}>
                    <Text style={{ fontSize: 12, fontWeight: "900", color: "#64748B", letterSpacing: 0.4, marginBottom: 8, marginLeft: 2 }}>
                      {label.toUpperCase()}
                    </Text>
                    <View style={{ backgroundColor: "white", borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }}>
                      {ops.map((op, index) => {
                        const operationAsset = op.asset || asset;
                        const assetName = operationAsset?.abbreviation?.trim() || operationAsset?.name || `Activo #${op.assetId}`;
                        const { color, bg } = opTypeColor(op.type);
                        const operationDate = new Date(opIso(op));
                        const dateText = Number.isNaN(operationDate.getTime())
                          ? "Sin fecha"
                          : operationDate.toLocaleDateString("es-ES", { day: "numeric", month: "short" });

                        return (
                          <TouchableOpacity
                            key={`op-${op.id}`}
                            activeOpacity={0.75}
                            onPress={() => setSelectedOperation(op)}
                            style={{
                              flexDirection: "row", alignItems: "center", gap: 12,
                              paddingVertical: 12, paddingHorizontal: 14,
                              borderBottomWidth: index < ops.length - 1 ? 1 : 0,
                              borderBottomColor: "#F1F5F9",
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
                                {opLabel(op.type)} · {dateText}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 13.5, fontWeight: "900", color: "#0F172A", fontVariant: ["tabular-nums"] }}>
                              {formatMoney(Math.abs(Number(op.amount || 0)), operationAsset?.currency || currency)}
                            </Text>
                            <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ alignItems: "center", paddingVertical: 34, gap: 8 }}>
                <View style={{ width: 54, height: 54, borderRadius: 20, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="swap-horizontal-outline" size={25} color="#94A3B8" />
                </View>
                <Text style={{ fontSize: 13, fontWeight: "800", color: "#0F172A" }}>Sin operaciones</Text>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#94A3B8", textAlign: "center" }}>
                  Todavía no hay operaciones registradas.
                </Text>
              </View>
            )
          ) : (
            valuationsRows.length ? (
              <View style={{ gap: 16 }}>
                {valuationsByMonth.map(([monthKey, { label, rows }]) => (
                  <View key={monthKey}>
                    <Text style={{ fontSize: 12, fontWeight: "900", color: "#64748B", letterSpacing: 0.4, marginBottom: 8, marginLeft: 2 }}>
                      {label.toUpperCase()}
                    </Text>
                    <View style={{ backgroundColor: "white", borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }}>
                      {rows.map((valuation, index) => {
                        const valuationDate = new Date(valuation.date);
                        const dateText = Number.isNaN(valuationDate.getTime())
                          ? "Sin fecha"
                          : valuationDate.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
                        return (
                          <TouchableOpacity
                            key={`val-${valuation.id}`}
                            activeOpacity={0.75}
                            onPress={() => setActionTarget({ kind: "valuation", item: valuation })}
                            style={{
                              flexDirection: "row", alignItems: "center", gap: 12,
                              paddingVertical: 12, paddingHorizontal: 14,
                              borderBottomWidth: index < rows.length - 1 ? 1 : 0,
                              borderBottomColor: "#F1F5F9",
                            }}
                          >
                            <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
                              <Ionicons name="analytics-outline" size={17} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1, gap: 2 }}>
                              <Text style={{ fontSize: 13, fontWeight: "800", color: "#0F172A" }} numberOfLines={1}>
                                {asset?.abbreviation?.trim() || asset?.name}
                              </Text>
                              <Text style={{ fontSize: 11, fontWeight: "600", color: "#64748B" }}>
                                Valoración · {dateText}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 13.5, fontWeight: "900", color: "#0F172A", fontVariant: ["tabular-nums"] }}>
                              {formatMoney(Number(valuation.value || 0), (valuation.currency || currency) as string)}
                            </Text>
                            <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ alignItems: "center", paddingVertical: 34, gap: 8 }}>
                <View style={{ width: 54, height: 54, borderRadius: 20, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="analytics-outline" size={25} color="#94A3B8" />
                </View>
                <Text style={{ fontSize: 13, fontWeight: "800", color: "#0F172A" }}>Sin valoraciones</Text>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#94A3B8" }}>Todavía no hay valoraciones guardadas.</Text>
              </View>
            )
          )}
          </>
          )}
        </ScrollView>
        </View>
      )}

      <InvestmentOperationDetailsModal
        operation={selectedOperation}
        asset={selectedOperation?.asset || asset}
        fallbackCurrency={currency}
        onClose={() => setSelectedOperation(null)}
        onEdit={(operation) => {
          setSelectedOperation(null);
          navigation.navigate("InvestmentOperation", { operationData: operation, assetId });
        }}
      />

      {/* -- Modal: quick add -- */}
      <Modal
        visible={quickAddOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setQuickAddOpen(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center" }}
          activeOpacity={1}
          onPress={() => setQuickAddOpen(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View
              style={{
                backgroundColor: "white",
                borderRadius: 26,
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

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setQuickAddOpen(false);
                  navigation.navigate("InvestmentValuation", { assetId });
                }}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 14,
                  paddingVertical: 15, paddingHorizontal: 12,
                  borderRadius: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#F1F5F9",
                }}
              >
                <View
                  style={{
                    width: 40, height: 40, borderRadius: 14,
                    backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                </View>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#0F172A" }}>Añadir valoración</Text>
                <Ionicons name="chevron-forward" size={16} color="#CBD5E1" style={{ marginLeft: "auto" }} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setQuickAddOpen(false);
                  navigation.navigate("InvestmentOperation", { assetId });
                }}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 14,
                  paddingVertical: 15, paddingHorizontal: 12,
                  borderRadius: 18, borderBottomWidth: 1, borderColor: "#F1F5F9",
                }}
              >
                <View
                  style={{
                    width: 40, height: 40, borderRadius: 14,
                    backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Ionicons name="swap-horizontal-outline" size={18} color={colors.primary} />
                </View>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#0F172A" }}>Añadir Operación</Text>
                <Ionicons name="chevron-forward" size={16} color="#CBD5E1" style={{ marginLeft: "auto" }} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setQuickAddOpen(false);
                  navigation.navigate("InvestmentComposition", {
                    assetId,
                    assetName: asset?.name ?? "",
                  });
                }}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 14,
                  paddingVertical: 15, paddingHorizontal: 12,
                  borderRadius: 18, borderBottomWidth: 1, borderColor: "#F1F5F9",
                }}
              >
                <View
                  style={{
                    width: 40, height: 40, borderRadius: 14,
                    backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Ionicons name="pie-chart-outline" size={18} color={colors.primary} />
                </View>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#0F172A" }}>Añadir Composición</Text>
                <Ionicons name="chevron-forward" size={16} color="#CBD5E1" style={{ marginLeft: "auto" }} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setQuickAddOpen(false)}
                activeOpacity={0.7}
                style={{ alignItems: "center", paddingVertical: 16 }}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#94A3B8" }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* -- Modal: detalle de valoración -- */}
      <Modal
        visible={actionTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActionTarget(null)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
          activeOpacity={1}
          onPress={() => setActionTarget(null)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            {actionTarget && (() => {
              const valuation = actionTarget.item;
              const valuationCurrency = valuation.currency || currency;
              return (
                <View style={{ backgroundColor: "white", borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 28 }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={{ fontSize: 18, fontWeight: "900", color: "#0F172A" }} numberOfLines={1}>
                        {asset?.abbreviation?.trim() || asset?.name || "Valoración"}
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary, marginTop: 3 }}>
                        Valoración
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setActionTarget(null)}
                      style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}
                    >
                      <Ionicons name="close" size={15} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  <View style={{ borderTopWidth: 1, borderTopColor: "#F1F5F9" }}>
                    {[
                      { label: "Valor", value: formatMoney(Number(valuation.value || 0), valuationCurrency) },
                      { label: "Fecha", value: valuation.date ? formatDate(valuation.date) : "—" },
                    ].map((detail, index) => (
                      <View
                        key={detail.label}
                        style={{
                          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                          paddingVertical: 12, gap: 18,
                          borderBottomWidth: index === 0 ? 1 : 0, borderBottomColor: "#F1F5F9",
                        }}
                      >
                        <Text style={{ fontSize: 12.5, fontWeight: "600", color: "#64748B" }}>{detail.label}</Text>
                        <Text style={{ flex: 1, fontSize: 12.5, fontWeight: "800", color: "#0F172A", textAlign: "right" }}>{detail.value}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                    <TouchableOpacity
                      activeOpacity={0.82}
                      onPress={() => {
                        setActionTarget(null);
                        navigation.navigate("InvestmentValuation", { assetId, editingValuationId: valuation.id });
                      }}
                      style={{
                        flex: 1, height: 44, borderRadius: 12, backgroundColor: "#EEF2FF",
                        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
                      }}
                    >
                      <Ionicons name="create-outline" size={15} color={colors.primary} />
                      <Text style={{ fontSize: 13, fontWeight: "900", color: colors.primary }}>Editar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.82}
                      onPress={() => handleDeleteValuation(valuation.id)}
                      style={{
                        height: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: "#FEF2F2",
                        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
                      }}
                    >
                      <Ionicons name="trash-outline" size={15} color="#DC2626" />
                      <Text style={{ fontSize: 13, fontWeight: "900", color: "#DC2626" }}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
