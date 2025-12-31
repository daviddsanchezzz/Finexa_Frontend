// src/screens/Investments/InvestmentsHomeScreen.tsx
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
import AppHeader from "../../../components/AppHeader";
import { colors } from "../../../theme/theme";
import api from "../../../api/api";

// ✅ SVG: Donut + Sparkline
import Svg, { G, Circle, Path } from "react-native-svg";

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
// DONUT
// =====================
type DonutSlice = {
  id: number;
  label: string;
  value: number;
  pct: number; // 0..1
  color: string;
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

const DonutChart = ({
  slices,
  size = 164,
  strokeWidth = 22,
  centerLabel,
  centerSubLabel,
}: {
  slices: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSubLabel?: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  let acc = 0;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${cx}, ${cy}`}>
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
            fill="transparent"
          />

          {slices.map((s) => {
            const dash = s.pct * circumference;
            const gap = circumference - dash;
            const dashoffset = circumference * (1 - acc);

            acc += s.pct;

            return (
              <Circle
                key={s.id}
                cx={cx}
                cy={cy}
                r={radius}
                stroke={s.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                fill="transparent"
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={dashoffset}
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
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: "900", color: "#0F172A" }}>
          {centerLabel || ""}
        </Text>
        {!!centerSubLabel && (
          <Text style={{ fontSize: 11, fontWeight: "800", color: "#64748B", marginTop: 2 }}>
            {centerSubLabel}
          </Text>
        )}
      </View>
    </View>
  );
};

// =====================
// SPARKLINE (TOTAL TIMELINE)
// =====================
const Sparkline = ({
  values,
  width = 240,
  height = 64,
  strokeWidth = 3,
}: {
  values: number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
}) => {
  const clean = values.filter((n) => Number.isFinite(n));
  if (clean.length < 2) return null;

  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const range = max - min || 1;

  const stepX = width / (clean.length - 1);

  const pts = clean.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * height;
    return { x, y };
  });

  const d = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke="#0F172A" strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
    </Svg>
  );
};

// =====================
// RANGE SELECTOR
// =====================
type RangeKey = "1M" | "3M" | "6M" | "1Y" | "ALL";

const rangeToDays: Record<RangeKey, number> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  // Ojo: si tu backend hace clamp a 365, "ALL" será equivalente a 1Y.
  // Si quieres "TOTAL" real, sube el clamp en backend o añade soporte range=all.
  ALL: 365,
};

const rangeLabel: Record<RangeKey, string> = {
  "1M": "Último mes",
  "3M": "Últimos 3 meses",
  "6M": "Últimos 6 meses",
  "1Y": "Último año",
  ALL: "Total",
};

export default function InvestmentsHomeScreen({ navigation }: any) {
  const [summary, setSummary] = useState<SummaryFromApi | null>(null);
  const [loading, setLoading] = useState(false);

  const [timeline, setTimeline] = useState<PortfolioTimelinePoint[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const [range, setRange] = useState<RangeKey>("ALL");

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

    const slices = list
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
      .filter((s) => s.pct > 0);

    return { total, slices };
  }, [assets]);

  const timelineValues = useMemo(
    () => (timeline || []).map((p) => p.totalCurrentValue || 0),
    [timeline]
  );

  const timelineMeta = useMemo(() => {
    if (!timelineValues.length) return { first: 0, last: 0, diff: 0, pct: 0 };

    const first = timelineValues[0] || 0;
    const last = timelineValues[timelineValues.length - 1] || 0;
    const diff = last - first;
    const pct = first ? (diff / first) * 100 : 0;

    return { first, last, diff, pct };
  }, [timelineValues]);

  const rangeKeys: RangeKey[] = ["1M", "3M", "6M", "1Y", "ALL"];

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* HEADER */}
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

      {/* LISTA */}
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : assets.length === 0 ? (
          <Text className="text-center text-gray-400 mt-16 text-sm">
            Aún no tienes assets. Crea uno para empezar.
          </Text>
        ) : (
          assets.map((a) => {
            const badge = pnlBadge(a.pnl);

            return (
              <TouchableOpacity
                key={a.id}
                activeOpacity={0.9}
                onPress={() => navigation.navigate("InvestmentDetail", { assetId: a.id })}
                className="rounded-3xl mb-3"
                style={{
                  backgroundColor: "white",
                  padding: 14,
                  shadowColor: "#000",
                  shadowOpacity: 0.04,
                  shadowRadius: 5,
                  shadowOffset: { width: 0, height: 2 },
                }}
              >
                <View className="flex-row justify-between items-center mb-2">
                  <View className="flex-row items-center flex-1 pr-2">
                    <View
                      className="w-9 h-9 rounded-2xl items-center justify-center mr-2"
                      style={{ backgroundColor: "#F3F4F6" }}
                    >
                      <Ionicons name={badge.icon} size={18} color={badge.color} />
                    </View>

                    <View className="flex-1">
                      <Text className="text-[15px] font-semibold text-gray-900">{a.name}</Text>

                      <View className="flex-row items-center mt-0.5">
                        <Ionicons name="pricetag-outline" size={12} color="#9CA3AF" />
                        <Text className="text-[11px] text-gray-500 ml-1">
                          {typeLabel(a.type)} · Invertido {formatMoney(a.invested || 0, currency)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="items-end">
                    <Text className="text-[11px] text-gray-400">Valor</Text>
                    <Text className="text-[15px] font-semibold text-gray-900">
                      {formatMoney(a.currentValue || 0, currency)}
                    </Text>
                  </View>
                </View>

                <View className="flex-row justify-between items-center mt-1">
                  <View className="flex-row items-center">
                    <Ionicons name="stats-chart-outline" size={13} color="#9CA3AF" />
                    <Text className="text-[11px] text-gray-500 ml-1">
                      {formatMoney(a.pnl || 0, currency)} ({formatPct(a.pnl || 0, a.invested || 0)})
                    </Text>
                  </View>

                  <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: badge.bg }}>
                    <Text className="text-[10px] font-semibold" style={{ color: badge.color }}>
                      {badge.label}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* DONUT: distribución por activo */}
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
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: "900", color: "#0F172A" }}>
                  Distribución por activo
                </Text>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#64748B", marginTop: 2 }}>
                  Basado en valor actual
                </Text>
              </View>

              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: "#F1F5F9",
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "900", color: "#0F172A" }}>
                  {formatMoney(allocation.total, currency)}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", marginTop: 12, gap: 14, alignItems: "center" }}>
              <DonutChart
                slices={allocation.slices}
                size={168}
                strokeWidth={22}
                centerLabel={`${allocation.slices.length}`}
                centerSubLabel={allocation.slices.length === 1 ? "asset" : "assets"}
              />

              <View style={{ flex: 1 }}>
                {allocation.slices.slice(0, 6).map((s) => (
                  <View
                    key={s.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingVertical: 6,
                      borderBottomWidth: 1,
                      borderBottomColor: "#F1F5F9",
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 8 }}>
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 6,
                          backgroundColor: s.color,
                          marginRight: 8,
                        }}
                      />
                      <View style={{ flex: 1, maxWidth: 150 }}>
                        <Text
                          style={{ fontSize: 12, fontWeight: "800", color: "#0F172A" }}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {s.label}
                        </Text>
                      </View>
                    </View>

                    <Text style={{ fontSize: 12, fontWeight: "900", color: "#0F172A" }}>
                      {(s.pct * 100).toFixed(1)}%
                    </Text>
                  </View>
                ))}

                {allocation.slices.length > 6 && (
                  <Text style={{ fontSize: 11, fontWeight: "800", color: "#64748B", marginTop: 8 }}>
                    +{allocation.slices.length - 6} más…
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* CTA doble */}
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
      </ScrollView>
    </SafeAreaView>
  );
}
