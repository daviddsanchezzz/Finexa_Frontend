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
import { useFocusEffect } from "@react-navigation/native";
import api from "../../../../api/api";
import { colors } from "../../../../theme/theme";
import { markInvestmentsDirty } from "../../../../utils/investmentsInvalidation";

import Svg, { Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { translateCountry, translateSector } from "../../../../utils/investmentLabels";

type InvestmentAssetType = "crypto" | "etf" | "stock" | "fund" | "custom";
type InvestmentRiskType = "variable_income" | "fixed_income" | "unknown";
type RangeKey = "1m" | "3m" | "6m" | "1y" | "all";
type InvestmentOperationType = "buy" | "sell" | "deposit" | "withdraw" | "swap";

interface AssetFromApi {
  id: number;
  name: string;
  abbreviation?: string | null;
  description?: string | null;
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
};

interface SeriesPoint {
  date: string;
  value: number;
  currency?: string;
}

interface SummaryAsset {
  id: number;
  invested: number;
  currentValue: number;
  pnl: number;
  lastValuationDate: string | null;
}

type ValuationFromApi = {
  id: number;
  assetId?: number;
  investmentAssetId?: number;
  date: string;
  value: number;
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
  fee?: number | null;
  transactionId?: number | null;
  swapGroupId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  active?: boolean;
};

const formatMoney = (n: number, currency = "EUR") =>
  (Number.isFinite(n) ? n : 0).toLocaleString("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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
    default:                return "Sin definir";
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

const pnlHeroColor = (pnl: number): string => {
  if (pnl > 0) return "#86EFAC";
  if (pnl < 0) return "#FCA5A5";
  return "rgba(255,255,255,0.85)";
};

function buildSparkPath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
}

function opLabel(t: InvestmentOperationType) {
  switch (t) {
    case "buy":      return "Compra";
    case "sell":     return "Venta";
    case "deposit":  return "Aportación";
    case "withdraw": return "Retirada";
    case "swap":     return "Swap";
    default:         return "Operación";
  }
}

function opIso(op: InvestmentOperationFromApi) {
  return op.date || op.createdAt || "";
}

function opSignedAmount(op: InvestmentOperationFromApi) {
  const a = Math.abs(Number(op.amount || 0));
  const fee = Math.abs(Number(op.fee || 0));
  const sign = op.type === "sell" || op.type === "withdraw" ? -1 : 1;
  return sign * a - fee;
}

type Tone = "neutral" | "success" | "danger";
function opTone(t?: string | null): Tone {
  if (t === "buy" || t === "deposit")   return "success";
  if (t === "sell" || t === "withdraw") return "danger";
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
  const [sectionTab, setSectionTab] = useState<"info" | "evolution" | "composition" | "records">("info");
  const [recordsTab, setRecordsTab] = useState<"operations" | "valuations">("operations");
  const [compositionTab, setCompositionTab] = useState<"regions" | "sectors" | "holdings">("regions");
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  type ActionTarget =
    | { kind: "valuation"; item: ValuationFromApi }
    | { kind: "operation"; item: InvestmentOperationFromApi }
    | null;
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
    if (Platform.OS !== "web" || webRefreshing) return;
    const endY = e.nativeEvent?.changedTouches?.[0]?.pageY ?? 0;
    if (webScrollAtTop.current && endY - webTouchStartY.current > 80) {
      setWebRefreshing(true);
      await onRefresh();
      setWebRefreshing(false);
    }
  }, [webRefreshing, onRefresh]);

  const handleDeleteValuation = (id: number) => {
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

  const handleDeleteSwap = (swapGroupId: string) => {
    Alert.alert("Eliminar swap", "¿Seguro que quieres eliminar este swap?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/investments/swaps/${swapGroupId}`);
            markInvestmentsDirty();
            setActionTarget(null);
            fetchAll();
          } catch {
            Alert.alert("Error", "No se pudo eliminar el swap.");
          }
        },
      },
    ]);
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
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const span = maxV - minV || 1;

    const W = 340;
    const H = 128;
    const padX = 12;
    const padY = 14;
    const step = (W - padX * 2) / (pts.length - 1);

    const mapped = pts.map((p, i) => {
      const x = padX + i * step;
      const t = (Number(p.value || 0) - minV) / span;
      const y = padY + (1 - t) * (H - padY * 2);
      return { x, y, ...p };
    });

    const path = buildSparkPath(mapped.map((m) => ({ x: m.x, y: m.y })));
    const areaPath = `${path} L ${mapped[mapped.length - 1].x.toFixed(2)} ${(H - padY).toFixed(2)} L ${mapped[0].x.toFixed(2)} ${(H - padY).toFixed(2)} Z`;

    const last = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    const delta = Number(last.value || 0) - Number(prev.value || 0);
    const deltaPct = prev.value ? (delta / prev.value) * 100 : 0;
    const rangeDelta = Number(last.value || 0) - Number(pts[0].value || 0);
    const rangeDeltaPct = pts[0].value ? (rangeDelta / pts[0].value) * 100 : 0;
    const deltaMeta = pnlMeta(delta);

    return { W, H, padY, mapped, path, areaPath, minV, maxV, delta, deltaPct, rangeDelta, rangeDeltaPct, deltaMeta };
  }, [filteredSeries]);

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

  // Pill tabs — used only for the records sub-tabs (2 options inside a card)
  const SegmentedTab = ({
    label, active, onPress,
  }: {
    label: string; active: boolean; onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        flex: 1, paddingVertical: 8, borderRadius: 9,
        backgroundColor: active ? "white" : "transparent",
        alignItems: "center", justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: "800", color: active ? colors.primary : "#64748B" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

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
    <SafeAreaView className="flex-1 bg-background">
      {/* -- HEADER -- */}
      <View className="px-5 pb-3">
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ marginRight: 8 }}
          >
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: "900", color: "#0F172A" }} numberOfLines={1}>
            {asset ? (asset.abbreviation?.trim() || asset.name) : ""}
          </Text>
          {asset && (
            <>
              <TouchableOpacity
                onPress={() => navigation.navigate("InvestmentForm", { assetId })}
                activeOpacity={0.8}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 5,
                  paddingHorizontal: 12, paddingVertical: 8,
                  borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB",
                  backgroundColor: "white", marginRight: 8,
                }}
              >
                <Ionicons name="pencil-outline" size={15} color="#0F172A" />
                <Text style={{ fontSize: 13, fontWeight: "800", color: "#0F172A" }}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setQuickAddOpen(true)}
                activeOpacity={0.8}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 5,
                  paddingHorizontal: 12, paddingVertical: 8,
                  borderRadius: 14, backgroundColor: "#0F172A",
                }}
              >
                <Ionicons name="add-outline" size={15} color="white" />
                <Text style={{ fontSize: 13, fontWeight: "800", color: "white" }}>Añadir</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {loading || !asset ? (
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 6 }}>
          {/* Hero skeleton */}
          <View style={{ backgroundColor: colors.primary, borderRadius: 22, padding: 14, opacity: 0.6, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 }}>
              <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.25)" }} />
              <View style={{ gap: 5 }}>
                <View style={{ width: 55, height: 8, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 4 }} />
                <View style={{ width: 150, height: 13, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 4 }} />
              </View>
            </View>
            <View style={{ width: 75, height: 9, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 4, marginBottom: 4 }} />
            <View style={{ width: 140, height: 24, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 6, marginBottom: 10 }} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1, height: 42, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 13 }} />
              <View style={{ flex: 1, height: 42, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 13 }} />
            </View>
          </View>
          {/* Tab skeleton */}
          <View style={{ flexDirection: "row", gap: 22, paddingTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", marginBottom: 16 }}>
            {[72, 58, 76, 80].map((w, i) => (
              <View key={i} style={{ width: w, height: 10, backgroundColor: "#E2E8F0", borderRadius: 5 }} />
            ))}
          </View>
          {/* Row skeletons */}
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: "#E2E8F0" }} />
                <View style={{ width: 70 + (i * 13) % 50, height: 11, backgroundColor: "#E2E8F0", borderRadius: 5 }} />
              </View>
              <View style={{ width: 55, height: 11, backgroundColor: "#E2E8F0", borderRadius: 5 }} />
            </View>
          ))}
        </View>
      ) : (
        <View
          className="flex-1"
          onTouchStart={handleWebTouchStart}
          onTouchEnd={handleWebTouchEnd}
        >
          {/* -- HERO -- */}
          <View style={{ paddingHorizontal: 16 }}>
            <View
              style={{
                backgroundColor: colors.primary,
                borderRadius: 22,
                paddingHorizontal: 13,
                paddingTop: 10,
                paddingBottom: 10,
                shadowColor: "#000",
                shadowOpacity: 0.12,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 8 }}>
                  <View
                    style={{
                      width: 33, height: 33, borderRadius: 12,
                      backgroundColor: "rgba(255,255,255,0.16)",
                      alignItems: "center", justifyContent: "center", marginRight: 8,
                    }}
                  >
                    <Ionicons name={assetTypeIcon(asset.type)} size={16} color="white" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10.5, fontWeight: "700", color: "rgba(255,255,255,0.65)" }}>
                      {typeLabel(asset.type)}
                    </Text>
                    <Text
                      style={{ fontSize: 13.5, fontWeight: "900", color: "white", marginTop: 1 }}
                      numberOfLines={2}
                    >
                      {asset.name}
                    </Text>
                    <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 1, fontWeight: "600" }} numberOfLines={1}>
                      Última: {stats.last}
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999,
                    backgroundColor: stats.pnl > 0 ? "rgba(34,197,94,0.25)" : stats.pnl < 0 ? "rgba(239,68,68,0.25)" : "rgba(0,0,0,0.22)",
                    flexDirection: "row", alignItems: "center",
                  }}
                >
                  <Ionicons name={stats.meta.icon} size={12} color={pnlHeroColor(stats.pnl)} />
                  <Text style={{ color: pnlHeroColor(stats.pnl), fontWeight: "900", marginLeft: 5, fontSize: 11.5 }}>
                    {formatPct(stats.pnl, stats.invested)}
                  </Text>
                </View>
              </View>

              <Text style={{ fontSize: 10.5, color: "rgba(255,255,255,0.65)", fontWeight: "700" }}>
                Valor actual
              </Text>
              <Text style={{ fontSize: 23, fontWeight: "900", color: "white", marginTop: 1 }} numberOfLines={1}>
                {formatMoney(stats.currentValue, currency)}
              </Text>

              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <View
                  style={{
                    flex: 1, backgroundColor: "rgba(255,255,255,0.14)",
                    borderRadius: 14, paddingVertical: 7, paddingHorizontal: 10,
                  }}
                >
                  <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", fontWeight: "700" }}>Aportado</Text>
                  <Text style={{ fontSize: 12.5, fontWeight: "900", color: "white", marginTop: 2 }}>
                    {formatMoney(stats.invested, currency)}
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1, backgroundColor: "rgba(255,255,255,0.14)",
                    borderRadius: 14, paddingVertical: 7, paddingHorizontal: 10,
                  }}
                >
                  <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", fontWeight: "700" }}>Resultado</Text>
                  <Text style={{ fontSize: 12.5, fontWeight: "900", color: pnlHeroColor(stats.pnl), marginTop: 2 }}>
                    {formatMoney(stats.pnl, currency)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* -- TABS: underline style, full-width scroll -- */}
          <View style={{ borderBottomWidth: 1, borderBottomColor: "#E5E7EB", marginTop: 12 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              {(["info", "evolution", "composition", "records"] as const).map((tab) => {
                const labels: Record<typeof tab, string> = {
                  info: "Información",
                  evolution: "Evolución",
                  composition: "Composición",
                  records: "Operaciones",
                };
                const active = sectionTab === tab;
                return (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setSectionTab(tab)}
                    activeOpacity={0.8}
                    style={{
                      paddingHorizontal: 2,
                      paddingVertical: 11,
                      marginRight: 24,
                      borderBottomWidth: 2.5,
                      borderBottomColor: active ? colors.primary : "transparent",
                    }}
                  >
                    <Text style={{
                      fontSize: 13,
                      fontWeight: active ? "800" : "600",
                      color: active ? colors.primary : "#94A3B8",
                    }}>
                      {labels[tab]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView
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
              backgroundColor: "white",
              borderRadius: 20, padding: 16,
              borderWidth: 1, borderColor: "#E5E7EB",
              marginBottom: 12,
            }}
          >
            <View style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: "800", color: "#0F172A" }}>Evolución</Text>
              <Text style={{ marginTop: 3, fontSize: 11, fontWeight: "600", color: "#94A3B8" }}>
                Basado en valoraciones guardadas
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 6 }}>
              {(["1m", "3m", "6m", "1y", "all"] as RangeKey[]).map((k) => {
                const active = range === k;
                return (
                  <TouchableOpacity
                    key={k}
                    onPress={() => setRange(k)}
                    activeOpacity={0.9}
                    style={{
                      flex: 1, alignItems: "center",
                      paddingVertical: 7, borderRadius: 12,
                      backgroundColor: active ? "#EEF2FF" : "#F8FAFC",
                      borderWidth: 1,
                      borderColor: active ? colors.primary : "#E5E7EB",
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "900", color: active ? colors.primary : "#64748B" }}>
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
                <View
                  style={{
                    marginTop: 14, backgroundColor: "#F8FAFC",
                    borderRadius: 18, borderWidth: 1, borderColor: "#E5E7EB",
                    paddingVertical: 12, paddingHorizontal: 12,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>
                      Máx: {formatMoney(chart.maxV, currency)}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>
                      Mín: {formatMoney(chart.minV, currency)}
                    </Text>
                  </View>

                  <Svg width="100%" height={chart.H} viewBox={`0 0 ${chart.W} ${chart.H}`}>
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
                    <Path d={chart.path} stroke={colors.primary} strokeWidth="3" fill="none" />
                    <Circle
                      cx={chart.mapped[chart.mapped.length - 1].x}
                      cy={chart.mapped[chart.mapped.length - 1].y}
                      r="4" fill={colors.primary}
                    />
                  </Svg>

                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>
                      {formatMonth(chart.mapped[0].date)}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>
                      {formatMonth(chart.mapped[chart.mapped.length - 1].date)}
                    </Text>
                  </View>
                </View>

                <View style={{ marginTop: 12, flexDirection: "row", gap: 10 }}>
                  <View
                    style={{
                      flex: 1, borderRadius: 18, padding: 14,
                      backgroundColor: "#F8FAFC",
                      borderWidth: 1, borderColor: "#E5E7EB",
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>Cambio del rango</Text>
                    <Text style={{ marginTop: 6, fontSize: 16, fontWeight: "900", color: pnlMeta(chart.rangeDelta).color }}>
                      {formatMoney(chart.rangeDelta, currency)}
                    </Text>
                    <Text style={{ marginTop: 2, fontSize: 11, fontWeight: "700", color: "#64748B" }}>
                      {fmt2(chart.rangeDeltaPct)}%
                    </Text>
                  </View>

                  <View
                    style={{
                      flex: 1, borderRadius: 18, padding: 14,
                      backgroundColor: "#F8FAFC",
                      borderWidth: 1, borderColor: "#E5E7EB",
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>Último cambio</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                      <Ionicons name={chart.deltaMeta.icon} size={16} color={chart.deltaMeta.color} />
                      <Text style={{ fontSize: 16, fontWeight: "900", color: chart.deltaMeta.color }}>
                        {formatMoney(chart.delta, currency)}
                      </Text>
                    </View>
                    <Text style={{ marginTop: 2, fontSize: 11, fontWeight: "700", color: "#64748B" }}>
                      {fmt2(chart.deltaPct)}%
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
          )}

          {/* -- INFORMACIÓN -- */}
          {sectionTab === "info" && (
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 20, padding: 16,
              borderWidth: 1, borderColor: "#E5E7EB",
              marginBottom: 12,
            }}
          >
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#0F172A" }}>Información del activo</Text>
              <Text style={{ marginTop: 3, fontSize: 11, fontWeight: "600", color: "#94A3B8" }}>
                Ficha técnica
              </Text>
            </View>

            <View
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                backgroundColor: "white",
                overflow: "hidden",
              }}
            >
              {[
                { label: "Tipo", value: typeLabel(asset.type), icon: "pricetag-outline" as const },
                { label: "Riesgo", value: riskLabel(asset.riskType), icon: riskIcon(asset.riskType) },
                {
                  label: "Participaciones",
                  value: Number(asset.quantity ?? 0) > 0
                    ? Number(asset.quantity).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 6 })
                    : "—",
                  icon: "layers-outline" as const,
                },
                { label: "Moneda", value: asset.currency, icon: "cash-outline" as const },
                ...(asset.description?.trim() ? [{ label: "Broker", value: asset.description.trim(), icon: "business-outline" as const }] : []),
                ...(asset.identificator?.trim() ? [{ label: "Identificador", value: String(asset.identificator), icon: "bookmark-outline" as const }] : []),
              ].map((row, idx, arr) => (
                <View
                  key={row.label}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 12,
                    paddingVertical: 11,
                    borderBottomWidth: idx === arr.length - 1 ? 0 : 1,
                    borderBottomColor: "#F1F5F9",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 10 }}>
                    <View
                      style={{
                        width: 26, height: 26, borderRadius: 8,
                        backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E5E7EB",
                        alignItems: "center", justifyContent: "center", marginRight: 8,
                      }}
                    >
                      <Ionicons name={row.icon} size={13} color="#64748B" />
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748B" }}>{row.label}</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: "900", color: "#0F172A" }} numberOfLines={1}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          )}

          {/* -- COMPOSICIÓN -- */}
          {sectionTab === "composition" && (
          <>
            {/* Sub-tabs: Regiones / Sectores / Holdings */}
            <View
              style={{
                flexDirection: "row", gap: 8, padding: 6,
                borderRadius: 18, backgroundColor: "#F8FAFC",
                borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 12,
              }}
            >
              <SegmentedTab label="Regiones"  active={compositionTab === "regions"}  onPress={() => setCompositionTab("regions")} />
              <SegmentedTab label="Sectores"  active={compositionTab === "sectors"}  onPress={() => setCompositionTab("sectors")} />
              <SegmentedTab label="Holdings"  active={compositionTab === "holdings"} onPress={() => setCompositionTab("holdings")} />
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
              {metadata?.syncedAt ? (
                <Text style={{ marginTop: 0, fontSize: 11, fontWeight: "600", color: "#94A3B8", marginBottom: 12 }}>
                  Actualizado el {formatDate(metadata.syncedAt)}
                </Text>
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
                          <Text style={{ fontSize: 12, color: "#334155", fontWeight: "700" }}>{translateCountry(r.country)}</Text>
                          <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "800" }}>{fmt1(Number(r.pct))}%</Text>
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
                          <Text style={{ fontSize: 12, color: "#334155", fontWeight: "700" }}>{translateSector(s.sector)}</Text>
                          <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "800" }}>{fmt1(Number(s.pct))}%</Text>
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
                          <Text style={{ fontSize: 12, color: "#334155", fontWeight: "700" }}>
                            {h.name}{h.ticker ? ` (${h.ticker})` : ""}
                          </Text>
                          <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "800" }}>{fmt1(Number(h.weight || 0))}%</Text>
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
            <View
              style={{
                flexDirection: "row", gap: 8, padding: 4,
                borderRadius: 12, backgroundColor: "#F1F5F9",
                borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 12,
              }}
            >
              <SegmentedTab
                label="Operaciones"
                active={recordsTab === "operations"}
                onPress={() => setRecordsTab("operations")}
              />
              <SegmentedTab
                label="Valoraciones"
                active={recordsTab === "valuations"}
                onPress={() => setRecordsTab("valuations")}
              />
            </View>

          <View
            style={{
              backgroundColor: "white",
              borderRadius: 20, padding: 16,
              borderWidth: 1, borderColor: "#E5E7EB",
            }}
          >
            <View>
              <View
                style={{
                  flexDirection: "row", paddingVertical: 10,
                  borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
                }}
              >
                <Text style={{ flex: 1.1, fontSize: 11, fontWeight: "700", color: "#64748B" }}>Fecha</Text>
                {recordsTab === "operations" ? (
                  <Text style={{ flex: 0.9, fontSize: 11, fontWeight: "700", color: "#64748B", textAlign: "center" }}>Tipo</Text>
                ) : null}
                <Text style={{ flex: 1, fontSize: 11, fontWeight: "700", color: "#64748B", textAlign: "right" }}>
                  {recordsTab === "operations" ? "Importe" : "Valor"}
                </Text>
              </View>

              {recordsTab === "operations" ? (
                operationsRows.length ? (
                  operationsRows.map((op) => {
                    const iso = opIso(op);
                    const amount = opSignedAmount(op);
                    const tone = opTone(op.type);
                    const tm = toneMeta(tone);
                    const isSwap = !!op.swapGroupId;
                    const icon =
                      op.type === "buy"      ? "add-circle-outline"    :
                      op.type === "sell"     ? "remove-circle-outline" :
                      op.type === "deposit"  ? "download-outline"      :
                      op.type === "withdraw" ? "log-out-outline"       :
                                               "swap-horizontal-outline";

                    return (
                      <TouchableOpacity
                        key={`op-${op.id}`}
                        activeOpacity={isSwap ? 0.85 : 1}
                        onPress={isSwap ? () => setActionTarget({ kind: "operation", item: op }) : undefined}
                        style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <Text style={{ flex: 1.1, fontSize: 12, fontWeight: "800", color: "#0F172A" }}>
                            {iso ? formatDate(iso) : "—"}
                          </Text>

                          <View style={{ flex: 0.9, alignItems: "center", justifyContent: "center" }}>
                            <View
                              style={{
                                flexDirection: "row", alignItems: "center", gap: 6,
                                paddingHorizontal: 10, height: 24, borderRadius: 999,
                                borderWidth: 1, borderColor: tm.bd, backgroundColor: tm.bg,
                              }}
                            >
                              <Ionicons name={icon} size={14} color={tm.fg} />
                              <Text style={{ fontSize: 11, fontWeight: "900", color: tm.fg }}>
                                {opLabel(op.type)}
                              </Text>
                            </View>
                          </View>

                          <Text style={{ flex: 1, fontSize: 12, fontWeight: "900", color: tm.fg, textAlign: "right" }}>
                            {formatMoney(amount, currency)}
                          </Text>
                        </View>

                        {(op.fee ?? 0) > 0 ? (
                          <Text style={{ marginTop: 4, fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>
                            Fee: {formatMoney(Math.abs(Number(op.fee || 0)), currency)}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={{ marginTop: 10, fontSize: 12, fontWeight: "600", color: "#94A3B8" }}>
                    No hay operaciones registradas.
                  </Text>
                )
              ) : valuationsRows.length ? (
                valuationsRows.map((v) => (
                  <TouchableOpacity
                    key={`val-${v.id}`}
                    activeOpacity={0.85}
                    onPress={() => setActionTarget({ kind: "valuation", item: v })}
                    style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={{ flex: 1.1, fontSize: 12, fontWeight: "800", color: "#0F172A" }}>
                        {formatDate(v.date)}
                      </Text>
                      <Text style={{ flex: 1, fontSize: 12, fontWeight: "900", color: "#0F172A", textAlign: "right" }}>
                        {formatMoney(Number(v.value || 0), (v.currency || currency) as string)}
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color="#CBD5E1" style={{ marginLeft: 8 }} />
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={{ marginTop: 10, fontSize: 12, fontWeight: "600", color: "#94A3B8" }}>
                  No hay valoraciones guardadas.
                </Text>
              )}
            </View>
          </View>
          </>
          )}
        </ScrollView>
        </View>
      )}

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
                  navigation.navigate("InvestmentValuation", { assetId, editingValuationId: null });
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
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#0F172A" }}>Añadir inversión</Text>
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

      {/* -- Modal: edit / delete action -- */}
      <Modal
        visible={actionTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActionTarget(null)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
          activeOpacity={1}
          onPress={() => setActionTarget(null)}
        >
          <View
            style={{
              backgroundColor: "white",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 20,
              paddingBottom: 36,
            }}
          >
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <View
                style={{
                  width: 40, height: 4, borderRadius: 999,
                  backgroundColor: "#E5E7EB", marginBottom: 16,
                }}
              />
              <Text style={{ fontSize: 15, fontWeight: "900", color: "#0F172A" }}>
                {actionTarget?.kind === "valuation"
                  ? `valoración · ${actionTarget.item.date ? formatDate(actionTarget.item.date) : ""}`
                  : `Swap · ${actionTarget?.item.date ? formatDate(actionTarget.item.date as string) : ""}`}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#64748B", marginTop: 4 }}>
                {actionTarget?.kind === "valuation"
                  ? formatMoney(Number((actionTarget.item as ValuationFromApi).value || 0), currency)
                  : formatMoney(Math.abs(Number((actionTarget?.item as InvestmentOperationFromApi)?.amount || 0)), currency)}
              </Text>
            </View>

            <View style={{ gap: 10 }}>
              {actionTarget?.kind === "valuation" && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    const v = actionTarget.item as ValuationFromApi;
                    setActionTarget(null);
                    navigation.navigate("InvestmentValuation", { assetId, editingValuationId: v.id });
                  }}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 12,
                    paddingVertical: 14, paddingHorizontal: 16,
                    borderRadius: 18, backgroundColor: "#EEF2FF",
                  }}
                >
                  <View
                    style={{
                      width: 36, height: 36, borderRadius: 14,
                      backgroundColor: colors.primary,
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Ionicons name="create-outline" size={18} color="white" />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: colors.primary }}>Editar</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  if (actionTarget?.kind === "valuation") {
                    handleDeleteValuation((actionTarget.item as ValuationFromApi).id);
                  } else if (actionTarget?.kind === "operation") {
                    const swapId = (actionTarget.item as InvestmentOperationFromApi).swapGroupId!;
                    handleDeleteSwap(swapId);
                  }
                }}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 12,
                  paddingVertical: 14, paddingHorizontal: 16,
                  borderRadius: 18, backgroundColor: "#FEF2F2",
                }}
              >
                <View
                  style={{
                    width: 36, height: 36, borderRadius: 14,
                    backgroundColor: "#DC2626",
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Ionicons name="trash-outline" size={18} color="white" />
                </View>
                <Text style={{ fontSize: 15, fontWeight: "800", color: "#DC2626" }}>Eliminar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setActionTarget(null)}
                style={{
                  paddingVertical: 14, borderRadius: 18,
                  backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E5E7EB",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: "800", color: "#64748B" }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}


