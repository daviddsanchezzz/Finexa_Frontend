// src/screens/Investments/InvestmentsHomeScreen.tsx
import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AppHeader from "../../../../components/AppHeader";
import { colors } from "../../../../theme/theme";
import api from "../../../../api/api";

import Svg, { G, Path, Circle } from "react-native-svg";

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
  totalCurrentValue: number;
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

const formatMonthYear = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const m = d.toLocaleDateString("es-ES", { month: "short" }).replace(".", "").toUpperCase();
  return `${m} ${d.getFullYear()}`;
};

const formatPctRatio = (p: number | null | undefined) => {
  if (p == null || !Number.isFinite(p)) return "—";
  return `${(p * 100).toFixed(2).replace(".", ",")}%`;
};

const toneColor = (v: number) => (v > 0 ? "#16A34A" : v < 0 ? "#DC2626" : "#64748B");
const toneBg   = (v: number) => (v > 0 ? "#DCFCE7" : v < 0 ? "#FEE2E2" : "#E5E7EB");

type RangeKey = "1M" | "3M" | "6M" | "1Y" | "ALL";

const rangeToDays: Record<RangeKey, number> = {
  "1M": 30, "3M": 90, "6M": 180, "1Y": 365, ALL: 365,
};

type DonutSlice = {
  id: number;
  label: string;
  value: number;
  pct: number;
  color: string;
};

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
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
};

const DonutPro = ({
  slices,
  size,
  strokeWidth,
  selectedId,
  onSelect,
  centerValueText,
}: {
  slices: DonutSlice[];
  size: number;
  strokeWidth: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
  centerValueText: string;
}) => {
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
            if (sweep <= 0.2) { accDeg += sweep; return null; }
            const segStart = startAt + accDeg;
            const segEnd = startAt + accDeg + sweep;
            accDeg += sweep;
            const isSelected = selectedId != null ? s.id === selectedId : false;
            const dimOthers = selectedId != null;
            const d = describeArc(cx, cy, r, segStart, segEnd);
            return (
              <Path
                key={s.id}
                d={d}
                stroke={s.color}
                strokeWidth={isSelected ? strokeWidth + 2 : strokeWidth}
                strokeLinecap="butt"
                fill="none"
                opacity={dimOthers ? (isSelected ? 1 : 0.28) : 1}
                onPress={() => onSelect(s.id)}
              />
            );
          })}
        </G>
      </Svg>

      <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 }}>
        <Text
          style={{ fontSize: 16, fontWeight: "900", color: "#0F172A", textAlign: "center" }}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {centerValueText}
        </Text>
      </View>
    </View>
  );
};

export default function InvestmentsHomeScreen({ navigation }: any) {
  const [summary, setSummary] = useState<SummaryFromApi | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeline, setTimeline] = useState<PortfolioTimelinePoint[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [range, setRange] = useState<RangeKey>("ALL");
  const [selectedSliceId, setSelectedSliceId] = useState<number | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<PortfolioSnapshotRow[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [archivedAssets, setArchivedAssets] = useState<any[]>([]);
  const [showArchived, setShowArchived] = useState(false);

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
      const res = await api.get("/investments/summary");
      setSummary(res.data || null);
    } catch (err) {
      console.error("❌ Error al obtener investments summary:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSnapshots = async () => {
    setSnapshotsLoading(true);
    try {
      const to = new Date();
      const from = new Date(to);
      from.setMonth(from.getMonth() - 12);
      const res = await api.get(
        `/investments/snapshots?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`
      );
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

  const fetchTimeline = async (rk: RangeKey) => {
    try {
      setTimelineLoading(true);
      const days = rangeToDays[rk];
      const res = await api.get(`/investments/timeline?days=${days}`);
      setTimeline(res.data?.points || []);
    } catch (err) {
      console.error("❌ Error al obtener investments timeline:", err);
      setTimeline([]);
    } finally {
      setTimelineLoading(false);
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

  useFocusEffect(
    useCallback(() => {
      fetchSummary();
      fetchTimeline(range);
      fetchSnapshots();
      fetchArchived();
    }, [range])
  );

  const currency = useMemo(() => "EUR", []);

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
    if (!total) return { total: 0, slices: [] as DonutSlice[] };

    const base = list
      .map((a, idx) => {
        const value = a.currentValue || 0;
        const pct = value / total;
        return { id: a.id, label: a.name, value, pct, color: palette[idx % palette.length] };
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

    return { total, slices: big };
  }, [assets]);

  const allocationMap = useMemo(() => {
    const m = new Map<number, number>();
    for (const s of allocation.slices) m.set(s.id, s.pct);
    return m;
  }, [allocation.slices]);

  const selectedSlice = useMemo(() => {
    if (!allocation.slices.length) return null;
    const found = allocation.slices.find((s) => s.id === selectedSliceId);
    return found || allocation.slices[0];
  }, [allocation.slices, selectedSliceId]);

  useEffect(() => {
    if (!selectedSliceId) return;
    const exists = allocation.slices.some((s) => s.id === selectedSliceId);
    if (!exists) setSelectedSliceId(null);
  }, [allocation.slices, selectedSliceId]);

  const [fabOpen, setFabOpen] = useState(false);

  const fabActions = [
    { label: "Nueva inversión",  icon: "add-outline" as const,              route: "InvestmentForm"      },
    { label: "Nueva valoración", icon: "calendar-outline" as const,         route: "InvestmentValuation" },
    { label: "Nueva operación",  icon: "swap-horizontal-outline" as const,   route: "InvestmentOperation" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pb-3" style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <AppHeader title="Inversiones" showProfile={false} showDatePicker={false} showBack={true} />
        </View>
        <TouchableOpacity
          onPress={() => setFabOpen(true)}
          activeOpacity={0.8}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: "#0F172A",
            borderRadius: 14,
            paddingVertical: 8,
            paddingHorizontal: 12,
            marginBottom: 4,
          }}
        >
          <Ionicons name="trending-up-outline" size={15} color="white" />
          <Text style={{ fontSize: 13, fontWeight: "800", color: "white" }}>Añadir</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* HERO */}
        <View className="px-5 mb-4">
          <View
            style={{
              backgroundColor: colors.primary,
              borderRadius: 26,
              padding: 16,
              marginBottom: 12,
              shadowColor: "#000",
              shadowOpacity: 0.12,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <View
                  style={{
                    width: 42, height: 42, borderRadius: 16,
                    backgroundColor: "rgba(255,255,255,0.16)",
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 20 }}>📈</Text>
                </View>
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: "800", color: "white" }}>Resumen</Text>
                  <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
                    {hero.count} {hero.count === 1 ? "activo" : "activos"}
                    {hero.lastGlobal ? ` · Última: ${formatShortDate(hero.lastGlobal)}` : ""}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.18)",
                  flexDirection: "row", alignItems: "center",
                }}
              >
                <Ionicons name={totalBadge.icon} size={14} color="white" />
                <Text style={{ color: "white", fontWeight: "900", marginLeft: 6, fontSize: 12 }}>
                  {hero.pct.toFixed(2)}%
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: "700" }}>
                Valor actual total
              </Text>
              <Text style={{ fontSize: 26, fontWeight: "900", color: "white", marginTop: 2 }}>
                {formatMoney(hero.totalCurrentValue, currency)}
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <View
                style={{
                  flex: 1, backgroundColor: "rgba(255,255,255,0.14)",
                  borderRadius: 18, padding: 12,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="add-circle-outline" size={14} color="rgba(255,255,255,0.9)" />
                  <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: "800" }}>Invertido</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: "900", color: "white", marginTop: 6 }}>
                  {formatMoney(hero.totalInvested, currency)}
                </Text>
              </View>

              <View
                style={{
                  flex: 1, backgroundColor: "rgba(255,255,255,0.14)",
                  borderRadius: 18, padding: 12,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="stats-chart-outline" size={14} color="rgba(255,255,255,0.9)" />
                  <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: "800" }}>Resultado</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: "900", color: "white", marginTop: 6 }}>
                  {formatMoney(hero.totalPnL, currency)}
                </Text>
              </View>
            </View>
          </View>

        </View>

        {/* LISTA */}
        {(assets.length > 0 || archivedAssets.length > 0) && (
          <View style={{ paddingHorizontal: 20, marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 13, fontWeight: "900", color: "#94A3B8", letterSpacing: 0.5, textTransform: "uppercase" }}>
              Tu cartera
            </Text>
            {archivedAssets.length > 0 && (
              <TouchableOpacity
                onPress={() => setShowArchived((v) => !v)}
                activeOpacity={0.8}
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Ionicons name={showArchived ? "eye-outline" : "archive-outline"} size={13} color="#CBD5E1" />
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#CBD5E1" }}>
                  {showArchived ? "Ocultar archivadas" : `Archivadas (${archivedAssets.length})`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View className="px-5">
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : assets.length === 0 ? (
            <View style={{ alignItems: "center", marginTop: 48, gap: 12 }}>
              <View
                style={{
                  width: 64, height: 64, borderRadius: 24,
                  backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 30 }}>📈</Text>
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
                    backgroundColor: "white",
                    borderRadius: 18,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: "#EEF2F7",
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
                        style={{ fontSize: 14, fontWeight: "700", color: "#0F172A", lineHeight: 18 }}
                        numberOfLines={1}
                      >
                        {a.name}
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

        {/* ARCHIVADAS */}
        {showArchived && archivedAssets.length > 0 && (
          <View className="px-5" style={{ marginTop: 4, marginBottom: 4 }}>
            {archivedAssets.map((a) => (
              <TouchableOpacity
                key={a.id}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("InvestmentDetail", { assetId: a.id })}
                style={{
                  backgroundColor: "#F8FAFC",
                  borderRadius: 18,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  marginBottom: 6,
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
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
                    {a.name}
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

        {/* DONUT */}
        {!loading && assets.length > 0 && allocation.slices.length > 0 && (
          <>
            <View style={{ paddingHorizontal: 20, marginTop: 8, marginBottom: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: "900", color: "#94A3B8", letterSpacing: 0.5, textTransform: "uppercase" }}>
                Distribución
              </Text>
            </View>

            <View
              style={{
                backgroundColor: "white",
                borderRadius: 24,
                padding: 16,
                marginBottom: 10,
                marginHorizontal: 20,
                shadowColor: "#000",
                shadowOpacity: 0.04,
                shadowRadius: 5,
                shadowOffset: { width: 0, height: 2 },
                borderWidth: 1,
                borderColor: "#E5E7EB",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 14, fontWeight: "900", color: "#0F172A" }}>Por activo</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 10, fontWeight: "900", color: "#94A3B8" }}>Total</Text>
                    <Text style={{ fontSize: 12, fontWeight: "900", color: "#0F172A", marginTop: 2 }}>
                      {formatMoney(allocation.total, currency)}
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
                    <Ionicons
                      name={legendOpen ? "chevron-up" : "chevron-down"}
                      size={16}
                      color="#64748B"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ alignItems: "center", marginTop: 14 }}>
                <DonutPro
                  slices={allocation.slices}
                  size={donutSize}
                  strokeWidth={donutStroke}
                  selectedId={selectedSlice?.id ?? null}
                  onSelect={(id) => setSelectedSliceId((prev) => (prev === id ? null : id))}
                  centerValueText={
                    selectedSlice
                      ? formatMoney(selectedSlice.value, currency)
                      : formatMoney(allocation.total, currency)
                  }
                />
              </View>

              {legendOpen && (
                <View style={{ marginTop: 12 }}>
                  {allocation.slices.slice(0, 8).map((s) => {
                    const isActive = (selectedSlice?.id ?? null) === s.id;

                    return (
                      <TouchableOpacity
                        key={s.id}
                        activeOpacity={0.85}
                        onPress={() => setSelectedSliceId((prev) => (prev === s.id ? null : s.id))}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingVertical: 10,
                          borderBottomWidth: 1,
                          borderBottomColor: "#F1F5F9",
                          opacity: selectedSliceId != null ? (isActive ? 1 : 0.55) : 1,
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 10 }}>
                          <View
                            style={{
                              width: 10, height: 10, borderRadius: 6,
                              backgroundColor: s.color, marginRight: 8,
                            }}
                          />
                          <Text
                            style={{ fontSize: 12, fontWeight: isActive ? "900" : "800", color: "#0F172A", flex: 1 }}
                            numberOfLines={1}
                          >
                            {s.label}
                          </Text>
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
                    );
                  })}

                  {allocation.slices.length > 8 && (
                    <Text style={{ fontSize: 11, fontWeight: "800", color: "#64748B", marginTop: 10 }}>
                      +{allocation.slices.length - 8} más…
                    </Text>
                  )}
                </View>
              )}
            </View>
          </>
        )}

        {/* ── Rendimiento mensual ── */}
        {snapshots.length > 0 && (
          <>
            <View style={{ paddingHorizontal: 20, marginTop: 8, marginBottom: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: "900", color: "#94A3B8", letterSpacing: 0.5, textTransform: "uppercase" }}>
                Rendimiento mensual
              </Text>
            </View>

            <View
              style={{
                marginHorizontal: 20,
                backgroundColor: "white",
                borderRadius: 24,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                overflow: "hidden",
                marginBottom: 10,
              }}
            >
              <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
                <View>
                  {/* Cabecera */}
                  <View
                    style={{
                      flexDirection: "row",
                      backgroundColor: "rgba(15,23,42,0.04)",
                      borderBottomWidth: 1,
                      borderBottomColor: "#E5E7EB",
                    }}
                  >
                    {(
                      [
                        { label: "MES",       w: 82,  right: false },
                        { label: "INICIO",    w: 108, right: true  },
                        { label: "FIN",       w: 108, right: true  },
                        { label: "CASHFLOW",  w: 104, right: true  },
                        { label: "BENEFICIO", w: 104, right: true  },
                        { label: "RENT. %",   w: 80,  right: true  },
                      ] as { label: string; w: number; right: boolean }[]
                    ).map((col) => (
                      <View
                        key={col.label}
                        style={{
                          width: col.w,
                          paddingVertical: 10,
                          paddingHorizontal: 10,
                          alignItems: col.right ? "flex-end" : "flex-start",
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: "900", color: "#94A3B8", letterSpacing: 0.4 }}>
                          {col.label}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Filas */}
                  {snapshots.map((row, idx) => {
                    const profit   = Number(row.profit ?? 0);
                    const cashflow = Number(row.cashflowNet ?? 0);
                    const start    = row.startValue == null ? null : Number(row.startValue);
                    const end      = Number(row.endValue ?? 0);
                    const isLast   = idx === snapshots.length - 1;

                    return (
                      <View
                        key={row.monthStart}
                        style={{
                          flexDirection: "row",
                          backgroundColor: idx % 2 === 0 ? "white" : "#FAFAFA",
                          borderBottomWidth: isLast ? 0 : 1,
                          borderBottomColor: "#F1F5F9",
                        }}
                      >
                        {/* MES */}
                        <View style={{ width: 82, paddingVertical: 12, paddingHorizontal: 10, justifyContent: "center" }}>
                          <Text style={{ fontSize: 12, fontWeight: "800", color: "#0F172A" }}>
                            {formatMonthYear(row.monthStart)}
                          </Text>
                        </View>

                        {/* INICIO */}
                        <View style={{ width: 108, paddingVertical: 12, paddingHorizontal: 10, justifyContent: "center", alignItems: "flex-end" }}>
                          <Text style={{ fontSize: 12, fontWeight: "700", color: "#0F172A" }} numberOfLines={1}>
                            {start == null ? "—" : formatMoney(start, row.currency)}
                          </Text>
                        </View>

                        {/* FIN */}
                        <View style={{ width: 108, paddingVertical: 12, paddingHorizontal: 10, justifyContent: "center", alignItems: "flex-end" }}>
                          <Text style={{ fontSize: 12, fontWeight: "700", color: "#0F172A" }} numberOfLines={1}>
                            {formatMoney(end, row.currency)}
                          </Text>
                        </View>

                        {/* CASHFLOW */}
                        <View style={{ width: 104, paddingVertical: 12, paddingHorizontal: 10, justifyContent: "center", alignItems: "flex-end" }}>
                          <Text style={{ fontSize: 12, fontWeight: "700", color: toneColor(cashflow) }} numberOfLines={1}>
                            {cashflow >= 0 ? "+" : ""}{formatMoney(cashflow, row.currency)}
                          </Text>
                        </View>

                        {/* BENEFICIO */}
                        <View style={{ width: 104, paddingVertical: 12, paddingHorizontal: 10, justifyContent: "center", alignItems: "flex-end" }}>
                          <Text style={{ fontSize: 12, fontWeight: "700", color: toneColor(profit) }} numberOfLines={1}>
                            {profit >= 0 ? "+" : ""}{formatMoney(profit, row.currency)}
                          </Text>
                        </View>

                        {/* RENT. % */}
                        <View style={{ width: 80, paddingVertical: 12, paddingHorizontal: 10, justifyContent: "center", alignItems: "flex-end" }}>
                          <View
                            style={{
                              paddingHorizontal: 7, paddingVertical: 3,
                              borderRadius: 999, backgroundColor: toneBg(profit),
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: "900", color: toneColor(profit) }}>
                              {formatPctRatio(row.returnPct)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </>
        )}

        {timelineLoading ? <View style={{ height: 10 }} /> : null}
      </ScrollView>

      {/* ── Modal de acciones ── */}
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
                  key={action.route}
                  activeOpacity={0.85}
                  onPress={() => {
                    setFabOpen(false);
                    navigation.navigate(action.route);
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
