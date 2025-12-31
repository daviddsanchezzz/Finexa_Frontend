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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AppHeader from "../../../components/AppHeader";
import { colors } from "../../../theme/theme";
import api from "../../../api/api";

import Svg, { G, Path, Circle } from "react-native-svg";

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
  if (!invested) return "0.00%";
  return `${((pnl / invested) * 100).toFixed(2)}%`;
};

const pnlBadge = (pnl: number) => {
  if (pnl > 0)
    return {
      label: "Ganancia",
      color: "#16A34A",
      bg: "#DCFCE7",
      icon: "trending-up-outline" as const,
    };
  if (pnl < 0)
    return {
      label: "Pérdida",
      color: "#DC2626",
      bg: "#FEE2E2",
      icon: "trending-down-outline" as const,
    };
  return {
    label: "Neutro",
    color: "#6B7280",
    bg: "#E5E7EB",
    icon: "remove-outline" as const,
  };
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

const formatShortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// =====================
// RANGE SELECTOR (timeline)
// =====================
type RangeKey = "1M" | "3M" | "6M" | "1Y" | "ALL";

const rangeToDays: Record<RangeKey, number> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  ALL: 365,
};

// =====================
// DONUT PRO (recto, sin gaps, centro solo cantidad)
// =====================
type DonutSlice = {
  id: number;
  label: string;
  value: number;
  pct: number; // 0..1
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
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(
    2
  )} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
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

            if (sweep <= 0.2) {
              accDeg += sweep;
              return null;
            }

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

      <View
        style={{
          position: "absolute",
          inset: 0,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 12,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: "900",
            color: "#0F172A",
            textAlign: "center",
          }}
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

  const { width: SCREEN_W } = useWindowDimensions();

  // ✅ Donut centrado y más contenido vertical disponible (leyenda debajo)
  const donutSize = useMemo(() => {
    // al ir centrado, podemos hacerlo algo más grande, pero con límites
    const target = Math.floor(SCREEN_W * 0.50);
    return Math.max(132, Math.min(176, target));
  }, [SCREEN_W]);

  const donutStroke = useMemo(() => Math.max(12, Math.min(16, Math.round(donutSize * 0.10))), [donutSize]);

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

  useFocusEffect(
    useCallback(() => {
      fetchSummary();
      fetchTimeline(range);
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
      totalInvested,
      totalCurrentValue,
      totalPnL,
      pct,
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
        return {
          id: a.id,
          label: a.name,
          value,
          pct,
          color: palette[idx % palette.length],
        };
      })
      .filter((s) => s.pct > 0)
      .sort((a, b) => b.value - a.value);

    const MIN_PCT = 0.03; // 3%
    const big = base.filter((s) => s.pct >= MIN_PCT);
    const small = base.filter((s) => s.pct < MIN_PCT);

    if (small.length >= 2) {
      const otherValue = small.reduce((sum, s) => sum + s.value, 0);
      const otherPct = otherValue / total;
      big.push({
        id: -1,
        label: "Otros",
        value: otherValue,
        pct: otherPct,
        color: "#94A3B8",
      });
    } else {
      big.push(...small);
    }

    return { total, slices: big };
  }, [assets]);

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

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pb-3">
        <AppHeader title="Inversiones" showProfile={false} showDatePicker={false} showBack={true} />
      </View>

      {/* HERO */}
      <View className="px-5 mb-2">
        <View
          style={{
            backgroundColor: colors.primary,
            borderRadius: 26,
            padding: 16,
            marginBottom: 10,
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
                  width: 42,
                  height: 42,
                  borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.16)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 20 }}>📈</Text>
              </View>

              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "white" }}>Resumen</Text>
                <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
                  {hero.count} {hero.count === 1 ? "asset" : "assets"}
                  {hero.lastGlobal ? ` · Última: ${formatShortDate(hero.lastGlobal)}` : ""}
                </Text>
              </View>
            </View>

            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.18)",
                flexDirection: "row",
                alignItems: "center",
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
                flex: 1,
                backgroundColor: "rgba(255,255,255,0.14)",
                borderRadius: 18,
                padding: 12,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="add-circle-outline" size={14} color="rgba(255,255,255,0.9)" />
                <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: "800" }}>
                  Invertido
                </Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: "900", color: "white", marginTop: 6 }}>
                {formatMoney(hero.totalInvested, currency)}
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(255,255,255,0.14)",
                borderRadius: 18,
                padding: 12,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="stats-chart-outline" size={14} color="rgba(255,255,255,0.9)" />
                <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: "800" }}>
                  Resultado
                </Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: "900", color: "white", marginTop: 6 }}>
                {formatMoney(hero.totalPnL, currency)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : assets.length === 0 ? (
          <Text className="text-center text-gray-400 mt-16 text-sm">Aún no tienes assets. Crea uno para empezar.</Text>
        ) : (
          assets.map((a) => {
            const pctText = formatPct(a.pnl || 0, a.invested || 0);
            const badge = pnlBadge(a.pnl);

            return (
              <TouchableOpacity
                key={a.id}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("InvestmentDetail", { assetId: a.id })}
                style={{
                  backgroundColor: "white",
                  borderRadius: 18,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: "#EEF2F7",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 12,
                      backgroundColor: "#F1F5F9",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 10,
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                    }}
                  >
                    <Ionicons name={assetTypeIcon(a.type)} size={16} color="#64748B" />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#0F172A", lineHeight: 18 }} numberOfLines={2}>
                      {a.name}
                    </Text>

                    <Text style={{ fontSize: 11, color: "#64748B", fontWeight: "600", marginTop: 2 }}>
                      {typeLabel(a.type)} · {formatMoney(a.currentValue || 0, currency)}
                    </Text>
                  </View>

                  <View style={{ alignItems: "flex-end", marginLeft: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: badge.color }}>{pctText}</Text>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: "#94A3B8", marginTop: 2 }}>
                      {formatMoney(a.pnl || 0, currency)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* DONUT + LEYENDA DEBAJO */}
        {!loading && assets.length > 0 && allocation.slices.length > 0 && (
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 24,
              padding: 14,
              marginTop: 6,
              marginBottom: 10,
              shadowColor: "#000",
              shadowOpacity: 0.04,
              shadowRadius: 5,
              shadowOffset: { width: 0, height: 2 },
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: "900", color: "#0F172A" }}>Distribución por activo</Text>
              </View>

              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 10, fontWeight: "900", color: "#94A3B8" }}>Total</Text>
                <Text style={{ fontSize: 12, fontWeight: "900", color: "#0F172A", marginTop: 2 }}>
                  {formatMoney(allocation.total, currency)}
                </Text>
              </View>
            </View>

            {/* Donut centrado */}
            <View style={{ alignItems: "center", marginTop: 14 }}>
              <DonutPro
                slices={allocation.slices}
                size={donutSize}
                strokeWidth={donutStroke}
                selectedId={selectedSlice?.id ?? null}
                onSelect={(id) => setSelectedSliceId((prev) => (prev === id ? null : id))}
                centerValueText={
                  selectedSlice ? formatMoney(selectedSlice.value, currency) : formatMoney(allocation.total, currency)
                }
              />
            </View>

            {/* Leyenda debajo (premium, 2 columnas si quieres) */}
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
                          width: 10,
                          height: 10,
                          borderRadius: 6,
                          backgroundColor: s.color,
                          marginRight: 8,
                        }}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: isActive ? "900" : "800",
                          color: "#0F172A",
                          flex: 1,
                        }}
                        numberOfLines={1}
                      >
                        {s.label}
                      </Text>
                    </View>

                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontSize: 12, fontWeight: "900", color: "#0F172A" }}>
                        {(s.pct * 100).toFixed(1)}%
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
          </View>
        )}

        {/* CTA */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate("InvestmentForm")}
            activeOpacity={0.9}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 12,
              borderRadius: 18,
              backgroundColor: "#F3F4F6",
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            <Ionicons name="add-outline" size={18} color="#64748B" />
            <Text style={{ marginLeft: 6, fontSize: 14, fontWeight: "700", color: "#64748B" }}>
              Añadir inversión
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("InvestmentValuation")}
            activeOpacity={0.9}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 12,
              borderRadius: 18,
              backgroundColor: "#EEF2FF",
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={{ marginLeft: 6, fontSize: 14, fontWeight: "800", color: colors.primary }}>
              Añadir valor
            </Text>
          </TouchableOpacity>
        </View>

        {timelineLoading ? <View style={{ height: 10 }} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
