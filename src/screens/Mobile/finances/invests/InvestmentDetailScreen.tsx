// src/screens/Investments/InvestmentDetailScreen.tsx
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AppHeader from "../../../../components/AppHeader";
import api from "../../../../api/api";
import { colors } from "../../../../theme/theme";

import Svg, { Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";

type InvestmentAssetType = "crypto" | "etf" | "stock" | "fund" | "custom";
type InvestmentRiskType = "variable_income" | "fixed_income" | "unknown";

interface AssetFromApi {
  id: number;
  name: string;
  description?: string | null;
  type: InvestmentAssetType;
  riskType?: InvestmentRiskType | null;
  currency: string;
  initialInvested: number;
  active: boolean;
  createdAt?: string | null; // ISO
}

interface SeriesPoint {
  date: string; // ISO
  value: number;
  currency: string;
}

interface SummaryAsset {
  id: number;
  invested: number;
  currentValue: number;
  pnl: number;
  lastValuationDate: string | null;
}

type RangeKey = "1m" | "3m" | "6m" | "1y" | "all";

type TransactionFromApi = {
  id: number;
  date?: string | null; // ISO
  createdAt?: string | null; // ISO
  amount: number;
  currency?: string | null;
  note?: string | null;

  investmentAssetId?: number | null;
  investment_asset_id?: number | null;
  investmentAsset?: { id: number } | null;

  type?: string | null;
  kind?: string | null;
  category?: string | null;
  subcategory?: string | null;
};

const formatMoney = (n: number, currency = "EUR") =>
  n.toLocaleString("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatPct = (pnl: number, invested: number) => {
  if (!invested) return "0.00%";
  return `${((pnl / invested) * 100).toFixed(2)}%`;
};

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

const riskLabel = (r?: InvestmentRiskType | null) => {
  switch (r) {
    case "variable_income":
      return "Renta variable";
    case "fixed_income":
      return "Renta fija";
    default:
      return "Sin definir";
  }
};

const riskIcon = (r?: InvestmentRiskType | null) => {
  switch (r) {
    case "variable_income":
      return "trending-up-outline" as const;
    case "fixed_income":
      return "shield-checkmark-outline" as const;
    default:
      return "help-circle-outline" as const;
  }
};

const pnlMeta = (pnl: number) => {
  if (pnl > 0) return { color: "#16A34A", soft: "#DCFCE7", icon: "trending-up-outline" as const };
  if (pnl < 0) return { color: "#DC2626", soft: "#FEE2E2", icon: "trending-down-outline" as const };
  return { color: "#64748B", soft: "#E5E7EB", icon: "remove-outline" as const };
};

const parseISO = (d: string) => new Date(d).getTime();

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatMonth = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", { month: "short", year: "2-digit" });

const rangeDays = (k: RangeKey) => {
  switch (k) {
    case "1m":
      return 30;
    case "3m":
      return 90;
    case "6m":
      return 180;
    case "1y":
      return 365;
    default:
      return null;
  }
};

const rangeLabel = (k: RangeKey) => {
  switch (k) {
    case "1m":
      return "1M";
    case "3m":
      return "3M";
    case "6m":
      return "6M";
    case "1y":
      return "1A";
    default:
      return "Todo";
  }
};

function buildSparkPath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
}

export default function InvestmentDetailScreen({ navigation, route }: any) {
  const assetId: number = route?.params?.assetId;

  const [asset, setAsset] = useState<AssetFromApi | null>(null);
  const [summaryRow, setSummaryRow] = useState<SummaryAsset | null>(null);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [transactions, setTransactions] = useState<TransactionFromApi[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [range, setRange] = useState<RangeKey>("3m");
  const [tab, setTab] = useState<"contributions" | "valuations">("contributions");

  const currency = useMemo(() => asset?.currency ?? "EUR", [asset?.currency]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);

      const aRes = await api.get(`/investments/assets/${assetId}`);
      setAsset(aRes.data);

      const sRes = await api.get(`/investments/summary`);
      const row = (sRes.data?.assets || []).find((x: any) => x.id === assetId) || null;
      setSummaryRow(row);

      const serRes = await api.get(`/investments/assets/${assetId}/series`);
      setSeries(serRes.data || []);

      const tRes = await api.get(`/transactions`, { params: { investmentAssetId: assetId } });
      setTransactions(tRes.data || []);
    } catch (e) {
      console.error("❌ Error loading investment detail:", e);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [assetId, navigation]);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll])
  );

  const stats = useMemo(() => {
    const invested = summaryRow?.invested ?? (asset?.initialInvested ?? 0);
    const currentValue = summaryRow?.currentValue ?? invested;
    const pnl = summaryRow?.pnl ?? currentValue - invested;
    const meta = pnlMeta(pnl);

    const last = summaryRow?.lastValuationDate
      ? formatDate(summaryRow.lastValuationDate)
      : series.length
      ? formatDate([...series].sort((a, b) => parseISO(b.date) - parseISO(a.date))[0].date)
      : "Sin datos";

    return { invested, currentValue, pnl, meta, last };
  }, [asset, summaryRow, series]);

  const sortedSeries = useMemo(() => [...series].sort((a, b) => parseISO(a.date) - parseISO(b.date)), [series]);

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

    const values = pts.map((p) => p.value);
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
      const t = (p.value - minV) / span;
      const y = padY + (1 - t) * (H - padY * 2);
      return { x, y, ...p };
    });

    const path = buildSparkPath(mapped.map((m) => ({ x: m.x, y: m.y })));
    const areaPath = `${path} L ${mapped[mapped.length - 1].x.toFixed(2)} ${(H - padY).toFixed(
      2
    )} L ${mapped[0].x.toFixed(2)} ${(H - padY).toFixed(2)} Z`;

    const last = pts[pts.length - 1];
    const prev = pts[pts.length - 2];

    const delta = last.value - prev.value;
    const deltaPct = prev.value ? (delta / prev.value) * 100 : 0;

    const rangeDelta = last.value - pts[0].value;
    const rangeDeltaPct = pts[0].value ? (rangeDelta / pts[0].value) * 100 : 0;

    const deltaMeta = pnlMeta(delta);

    return { W, H, padY, mapped, path, areaPath, minV, maxV, delta, deltaPct, rangeDelta, rangeDeltaPct, deltaMeta };
  }, [filteredSeries]);

  const contributions = useMemo(() => {
    const matchesAsset = (tx: TransactionFromApi) => {
      const a = tx.investmentAssetId ?? tx.investment_asset_id ?? tx.investmentAsset?.id ?? null;
      return a === assetId;
    };

    const looksLikeContribution = (tx: TransactionFromApi) => {
      const hay = `${tx.type ?? ""} ${tx.kind ?? ""} ${tx.category ?? ""} ${tx.subcategory ?? ""}`.toLowerCase();
      if (!hay.trim()) return true;
      return (
        hay.includes("aport") ||
        hay.includes("contrib") ||
        hay.includes("investment") ||
        hay.includes("inversion") ||
        hay.includes("transfer")
      );
    };

    const getIso = (tx: TransactionFromApi) => tx.date || tx.createdAt || "";

    const txRows = [...transactions]
      .filter((tx) => matchesAsset(tx))
      .filter((tx) => looksLikeContribution(tx))
      .map((tx) => ({
        id: `tx-${tx.id}`,
        iso: getIso(tx),
        amount: tx.amount,
        currency: tx.currency || currency,
        note: tx.note || null,
        kind: "tx" as const,
      }))
      .filter((x) => !!x.iso)
      .sort((a, b) => parseISO(b.iso) - parseISO(a.iso));

    const hasInitial = (asset?.initialInvested ?? 0) > 0;
    const initialIso = asset?.createdAt || (txRows.length ? txRows[txRows.length - 1].iso : new Date().toISOString());

    const initialRow = hasInitial
      ? [
          {
            id: "initial",
            iso: initialIso,
            amount: asset?.initialInvested ?? 0,
            currency,
            note: "Aportación inicial",
            kind: "initial" as const,
          },
        ]
      : [];

    return [...initialRow, ...txRows];
  }, [transactions, assetId, currency, asset?.initialInvested, asset?.createdAt]);

  const valuations = useMemo(() => {
    return [...series]
      .filter((p) => !!p.date)
      .map((p, idx) => ({
        id: `${p.date}-${idx}`,
        iso: p.date,
        value: p.value,
        currency: p.currency || currency,
      }))
      .sort((a, b) => parseISO(b.iso) - parseISO(a.iso));
  }, [series, currency]);

  const Chip = ({
    icon,
    label,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
  }) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.18)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.14)",
      }}
    >
      <Ionicons name={icon} size={14} color="rgba(255,255,255,0.92)" />
      <Text style={{ fontSize: 12, fontWeight: "900", color: "rgba(255,255,255,0.92)" }}>
        {label}
      </Text>
    </View>
  );

  const KPI = ({
    label,
    value,
    hint,
  }: {
    label: string;
    value: string;
    hint?: string;
  }) => (
    <View
      style={{
        flex: 1,
        padding: 12,
        borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.16)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.14)",
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "900", color: "rgba(255,255,255,0.75)" }}>{label}</Text>
      <Text style={{ marginTop: 6, fontSize: 14, fontWeight: "900", color: "white" }} numberOfLines={1}>
        {value}
      </Text>
      {hint ? (
        <Text style={{ marginTop: 4, fontSize: 11, fontWeight: "800", color: "rgba(255,255,255,0.70)" }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );

  const SmallAction = ({
    label,
    icon,
    onPress,
    tone = "primary",
    style,
  }: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    tone?: "primary" | "neutral";
    style?: any;
  }) => {
    const isPrimary = tone === "primary";
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderRadius: 18,
            backgroundColor: isPrimary ? colors.primary : "white",
            borderWidth: 1,
            borderColor: isPrimary ? "transparent" : "#E5E7EB",
          },
          style,
        ]}
      >
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 999,
            backgroundColor: isPrimary ? "rgba(255,255,255,0.18)" : "#F1F5F9",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={15} color={isPrimary ? "white" : "#334155"} />
        </View>
        <Text style={{ fontSize: 12, fontWeight: "900", color: isPrimary ? "white" : "#0F172A" }} numberOfLines={1}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const SegmentedTab = ({
    label,
    active,
    onPress,
    count,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
    count?: number;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        flex: 1,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: active ? "white" : "transparent",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: "900", color: active ? "#0F172A" : "#64748B" }}>
        {label}
      </Text>
      {typeof count === "number" ? (
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 999,
            backgroundColor: active ? "#EEF2FF" : "#E5E7EB",
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "900", color: active ? colors.primary : "#475569" }}>
            {count}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

  const MetricRow = ({
    label,
    value,
    icon,
  }: {
    label: string;
    value: string;
    icon: keyof typeof Ionicons.glyphMap;
  }) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1, paddingRight: 12 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 14,
            backgroundColor: "#F8FAFC",
            borderWidth: 1,
            borderColor: "#E5E7EB",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={16} color="#64748B" />
        </View>
        <Text style={{ fontSize: 12, fontWeight: "900", color: "#475569" }}>{label}</Text>
      </View>

      <Text style={{ fontSize: 13, fontWeight: "900", color: "#0F172A" }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );

  const riskChip = useMemo(() => {
    const r = asset?.riskType ?? "unknown";
    return { icon: riskIcon(r), label: riskLabel(r) };
  }, [asset?.riskType]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pb-3">
        <AppHeader title={asset?.name || "Inversión"} showProfile={false} showDatePicker={false} showBack={true} />
      </View>

      {loading || !asset ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-gray-400 mt-3 text-sm">Cargando…</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
{/* HERO (Minimal + accent bar) */}
<View
  style={{
    backgroundColor: "white",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
    overflow: "hidden",
  }}
>
  <View style={{ flexDirection: "row" }}>
    <View style={{ width: 6, backgroundColor: colors.primary }} />
    <View style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 11, fontWeight: "900", color: "#94A3B8" }}>Valor actual</Text>

        <TouchableOpacity
          onPress={() => navigation.navigate("InvestmentForm", { assetId })}
          activeOpacity={0.9}
          style={{
            width: 40,
            height: 40,
            borderRadius: 16,
            backgroundColor: "#F8FAFC",
            borderWidth: 1,
            borderColor: "#E5E7EB",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="create-outline" size={18} color="#334155" />
        </TouchableOpacity>
      </View>

      <Text style={{ marginTop: 6, fontSize: 30, fontWeight: "900", color: "#0F172A" }} numberOfLines={1}>
        {formatMoney(stats.currentValue, currency)}
      </Text>

      <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 12, fontWeight: "900", color: "#64748B" }} numberOfLines={1}>
          Aportado: {formatMoney(stats.invested, currency)}
        </Text>

        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: stats.meta.soft,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Ionicons name={stats.meta.icon} size={14} color={stats.meta.color} />
          <Text style={{ fontSize: 12, fontWeight: "900", color: stats.meta.color }} numberOfLines={1}>
            {formatMoney(stats.pnl, currency)} · {formatPct(stats.pnl, stats.invested)}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E5E7EB", flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="time-outline" size={14} color="#64748B" />
          <Text style={{ fontSize: 12, fontWeight: "900", color: "#334155" }}>Última: {stats.last}</Text>
        </View>
      </View>
    </View>
  </View>
</View>


          {/* Acciones (full width / 2 columnas) */}
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
            <SmallAction
              label="Añadir valoración"
              icon="add-circle-outline"
              onPress={() => navigation.navigate("InvestmentValuation", { assetId })}
              tone="primary"
              style={{ flex: 1 }}
            />
            <SmallAction
              label="Añadir aportación"
              icon="swap-horizontal-outline"
              onPress={() => navigation.navigate("Add", { prefillInvestmentAssetId: assetId })}
              tone="neutral"
              style={{ flex: 1 }}
            />
          </View>

          {/* Gráfica */}
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 28,
              padding: 16,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: "900", color: "#0F172A" }}>Evolución</Text>
                <Text style={{ marginTop: 3, fontSize: 11, fontWeight: "800", color: "#94A3B8" }}>
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
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
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
            </View>

            {!chart ? (
              <Text style={{ marginTop: 12, fontSize: 12, color: "#94A3B8", fontWeight: "700" }}>
                No hay suficientes puntos para dibujar la gráfica. Añade 2 valoraciones o más.
              </Text>
            ) : (
              <>
                <View
                  style={{
                    marginTop: 12,
                    backgroundColor: "#F8FAFC",
                    borderRadius: 22,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: "800", color: "#94A3B8" }}>
                      Máx: {formatMoney(chart.maxV, currency)}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: "800", color: "#94A3B8" }}>
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
                      stroke="#E5E7EB"
                      strokeWidth="1"
                      fill="none"
                    />

                    <Path d={chart.areaPath} fill="url(#areaGrad)" />
                    <Path d={chart.path} stroke={colors.primary} strokeWidth="3" fill="none" />

                    <Circle
                      cx={chart.mapped[chart.mapped.length - 1].x}
                      cy={chart.mapped[chart.mapped.length - 1].y}
                      r="4"
                      fill={colors.primary}
                    />
                  </Svg>

                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: "800", color: "#94A3B8" }}>
                      {formatMonth(chart.mapped[0].date)}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: "800", color: "#94A3B8" }}>
                      {formatMonth(chart.mapped[chart.mapped.length - 1].date)}
                    </Text>
                  </View>
                </View>

                <View style={{ marginTop: 12, flexDirection: "row", gap: 10 }}>
                  <View
                    style={{
                      flex: 1,
                      borderRadius: 22,
                      padding: 14,
                      backgroundColor: "white",
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "800", color: "#94A3B8" }}>Cambio del rango</Text>
                    <Text style={{ marginTop: 6, fontSize: 16, fontWeight: "900", color: pnlMeta(chart.rangeDelta).color }}>
                      {formatMoney(chart.rangeDelta, currency)}
                    </Text>
                    <Text style={{ marginTop: 2, fontSize: 11, fontWeight: "800", color: "#64748B" }}>
                      {chart.rangeDeltaPct.toFixed(2)}%
                    </Text>
                  </View>

                  <View
                    style={{
                      flex: 1,
                      borderRadius: 22,
                      padding: 14,
                      backgroundColor: "white",
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "800", color: "#94A3B8" }}>Último cambio</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                      <Ionicons name={chart.deltaMeta.icon} size={16} color={chart.deltaMeta.color} />
                      <Text style={{ fontSize: 16, fontWeight: "900", color: chart.deltaMeta.color }}>
                        {formatMoney(chart.delta, currency)}
                      </Text>
                    </View>
                    <Text style={{ marginTop: 2, fontSize: 11, fontWeight: "800", color: "#64748B" }}>
                      {chart.deltaPct.toFixed(2)}%
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>

          {/* Información */}
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 28,
              padding: 16,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, fontWeight: "900", color: "#0F172A" }}>Información</Text>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: "#F8FAFC",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Ionicons name="information-circle-outline" size={14} color="#64748B" />
                <Text style={{ fontSize: 12, fontWeight: "900", color: "#334155" }}>{asset.currency}</Text>
              </View>
            </View>

            <View style={{ marginTop: 10 }}>
              <MetricRow label="Tipo" value={typeLabel(asset.type)} icon="pricetag-outline" />
              <MetricRow label="Riesgo" value={riskLabel(asset.riskType)} icon={riskIcon(asset.riskType)} />
              <MetricRow label="Aportado inicial" value={formatMoney(asset.initialInvested || 0, currency)} icon="flag-outline" />

              {asset.description?.trim() ? (
                <View
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 18,
                    backgroundColor: "#F8FAFC",
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="document-text-outline" size={16} color="#64748B" />
                    <Text style={{ fontSize: 12, fontWeight: "900", color: "#0F172A" }}>Descripción</Text>
                  </View>
                  <Text style={{ marginTop: 6, fontSize: 12, fontWeight: "700", color: "#334155", lineHeight: 18 }}>
                    {asset.description}
                  </Text>
                </View>
              ) : null}


            </View>
          </View>

          {/* Tabs + Tabla */}
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 28,
              padding: 16,
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            {/* Segmented control */}
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                padding: 6,
                borderRadius: 18,
                backgroundColor: "#F8FAFC",
                borderWidth: 1,
                borderColor: "#E5E7EB",
              }}
            >
              <SegmentedTab
                label="Aportaciones"
                active={tab === "contributions"}
                onPress={() => setTab("contributions")}
                count={contributions.length}
              />
              <SegmentedTab
                label="Valoraciones"
                active={tab === "valuations"}
                onPress={() => setTab("valuations")}
                count={valuations.length}
              />
            </View>

            {/* Table */}
            <View style={{ marginTop: 14 }}>
              <View
                style={{
                  flexDirection: "row",
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: "#E5E7EB",
                }}
              >
                <Text style={{ flex: 1.2, fontSize: 11, fontWeight: "900", color: "#64748B" }}>Fecha</Text>
                <Text style={{ flex: 1, fontSize: 11, fontWeight: "900", color: "#64748B", textAlign: "right" }}>
                  {tab === "contributions" ? "Importe" : "Valor"}
                </Text>
              </View>

              {tab === "contributions" ? (
                contributions.length ? (
                  contributions.map((c) => (
                    <View
                      key={c.id}
                      style={{
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: "#F1F5F9",
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text style={{ flex: 1.2, fontSize: 12, fontWeight: "900", color: "#0F172A" }}>
                          {formatDate(c.iso)}
                        </Text>
                        <Text style={{ flex: 1, fontSize: 12, fontWeight: "900", color: "#0F172A", textAlign: "right" }}>
                          {formatMoney(c.amount, c.currency)}
                        </Text>
                      </View>

                      {c.note ? (
                        <Text style={{ marginTop: 4, fontSize: 11, fontWeight: "800", color: "#64748B" }}>
                          {c.note}
                        </Text>
                      ) : null}
                    </View>
                  ))
                ) : (
                  <Text style={{ marginTop: 10, fontSize: 12, fontWeight: "700", color: "#94A3B8" }}>
                    No hay aportaciones registradas.
                  </Text>
                )
              ) : valuations.length ? (
                valuations.map((v) => (
                  <View
                    key={v.id}
                    style={{
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: "#F1F5F9",
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={{ flex: 1.2, fontSize: 12, fontWeight: "900", color: "#0F172A" }}>
                        {formatDate(v.iso)}
                      </Text>
                      <Text style={{ flex: 1, fontSize: 12, fontWeight: "900", color: "#0F172A", textAlign: "right" }}>
                        {formatMoney(v.value, v.currency)}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={{ marginTop: 10, fontSize: 12, fontWeight: "700", color: "#94A3B8" }}>
                  No hay valoraciones guardadas.
                </Text>
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
