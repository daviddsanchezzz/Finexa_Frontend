// src/screens/Investments/InvestmentDetailScreen.tsx
// Versión alternativa: header ultra-ligero + “cards” con secciones claras + gráfico tipo línea sin libs (sparkline SVG)
// Si ya tienes react-native-svg en el proyecto: expo install react-native-svg
// Si NO lo tienes, puedes cambiar Sparkline por la variante “barras” (te lo dejo comentado).

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
import api from "../../../api/api";
import { colors } from "../../../theme/theme";

// ✅ Sparkline (recomendado)
import Svg, { Path, Circle } from "react-native-svg";

type InvestmentAssetType = "crypto" | "etf" | "stock" | "fund" | "custom";

interface AssetFromApi {
  id: number;
  name: string;
  symbol?: string | null;
  type: InvestmentAssetType;
  currency: string;
  initialInvested: number;
  active: boolean;
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
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export default function InvestmentDetailScreen({ navigation, route }: any) {
  const assetId: number = route?.params?.assetId;

  const [asset, setAsset] = useState<AssetFromApi | null>(null);
  const [summaryRow, setSummaryRow] = useState<SummaryAsset | null>(null);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [range, setRange] = useState<RangeKey>("3m");

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

  const sortedSeries = useMemo(() => {
    return [...series].sort((a, b) => parseISO(a.date) - parseISO(b.date));
  }, [series]);

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

    // canvas
    const W = 320;
    const H = 90;
    const padX = 8;
    const padY = 10;

    const step = (W - padX * 2) / (pts.length - 1);

    const mapped = pts.map((p, i) => {
      const x = padX + i * step;
      const t = (p.value - minV) / span;
      const y = padY + (1 - t) * (H - padY * 2);
      return { x, y, ...p };
    });

    const path = buildSparkPath(mapped.map((m) => ({ x: m.x, y: m.y })));

    const last = pts[pts.length - 1];
    const prev = pts[pts.length - 2];

    const delta = last.value - prev.value;
    const deltaPct = prev.value ? (delta / prev.value) * 100 : 0;

    const rangeDelta = last.value - pts[0].value;
    const rangeDeltaPct = pts[0].value ? (rangeDelta / pts[0].value) * 100 : 0;

    const deltaMeta = pnlMeta(delta);

    return {
      W,
      H,
      minV,
      maxV,
      mapped,
      path,
      last,
      prev,
      delta,
      deltaPct,
      rangeDelta,
      rangeDeltaPct,
      deltaMeta,
    };
  }, [filteredSeries]);

  const QuickAction = ({
    title,
    subtitle,
    icon,
    onPress,
    tone = "primary",
  }: {
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    tone?: "primary" | "neutral";
  }) => {
    const isPrimary = tone === "primary";
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={{
          flex: 1,
          borderRadius: 22,
          padding: 14,
          backgroundColor: isPrimary ? colors.primary : "white",
          borderWidth: 1,
          borderColor: isPrimary ? "transparent" : "#E5E7EB",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 14,
              backgroundColor: isPrimary ? "rgba(255,255,255,0.18)" : "#F1F5F9",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name={icon} size={18} color={isPrimary ? "white" : "#334155"} />
          </View>

          <Ionicons
            name="chevron-forward-outline"
            size={18}
            color={isPrimary ? "rgba(255,255,255,0.9)" : "#94A3B8"}
          />
        </View>

        <Text
          style={{
            marginTop: 10,
            fontSize: 14,
            fontWeight: "900",
            color: isPrimary ? "white" : "#0F172A",
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            marginTop: 4,
            fontSize: 11,
            fontWeight: "700",
            color: isPrimary ? "rgba(255,255,255,0.8)" : "#64748B",
          }}
        >
          {subtitle}
        </Text>
      </TouchableOpacity>
    );
  };

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
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 12,
            backgroundColor: "#F1F5F9",
            borderWidth: 1,
            borderColor: "#E5E7EB",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={14} color="#64748B" />
        </View>
        <Text style={{ fontSize: 12, fontWeight: "800", color: "#64748B" }}>{label}</Text>
      </View>
      <Text style={{ fontSize: 13, fontWeight: "900", color: "#0F172A" }}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header mínimo: sin hero */}
      <View className="px-5 pb-3">
        <AppHeader title={asset?.name || "Inversión"} showProfile={false} showDatePicker={false} showBack={true} />
      </View>

      {loading || !asset ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-gray-400 mt-3 text-sm">Cargando…</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* HERO NUMÉRICO: SOLO 2 líneas fuertes + chip P&L */}
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
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 18,
                    backgroundColor: "#F1F5F9",
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="layers-outline" size={18} color="#334155" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "900", color: "#0F172A" }} numberOfLines={1}>
                    {asset.name}
                    {asset.symbol ? ` · ${asset.symbol}` : ""}
                  </Text>
                  <Text style={{ marginTop: 3, fontSize: 12, fontWeight: "800", color: "#64748B" }}>
                    {typeLabel(asset.type)} · {asset.currency} · Última: {stats.last}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => navigation.navigate("InvestmentForm", { assetId })}
                activeOpacity={0.9}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 18,
                  backgroundColor: "#EEF2FF",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="create-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 14 }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#94A3B8" }}>Valor actual</Text>
              <Text style={{ fontSize: 26, fontWeight: "900", color: "#0F172A", marginTop: 2 }}>
                {formatMoney(stats.currentValue, currency)}
              </Text>

              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: "#64748B" }}>
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
                  <Text style={{ fontSize: 12, fontWeight: "900", color: stats.meta.color }}>
                    {formatMoney(stats.pnl, currency)} · {formatPct(stats.pnl, stats.invested)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ACCIONES: 2 cards grandes (no barra inferior) */}
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
            <QuickAction
              title="Añadir valoración"
              subtitle="Guarda el valor total hoy o cualquier día"
              icon="add-circle-outline"
              onPress={() => navigation.navigate("InvestmentValuation", { assetId })}
              tone="primary"
            />
            <QuickAction
              title="Añadir aportación"
              subtitle="Registra una transferencia a inversión"
              icon="swap-horizontal-outline"
              onPress={() => navigation.navigate("CreateTransaction", { prefillInvestmentAssetId: assetId })}
              tone="neutral"
            />
          </View>

          {/* GRÁFICO: Card con sparkline + métricas del rango */}
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
              <Text style={{ fontSize: 14, fontWeight: "900", color: "#0F172A" }}>Gráfica</Text>

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
                  <Svg width="100%" height={chart.H} viewBox={`0 0 ${chart.W} ${chart.H}`}>
                    <Path d={chart.path} stroke={colors.primary} strokeWidth="3" fill="none" />
                    {/* último punto */}
                    {chart.mapped.length ? (
                      <Circle
                        cx={chart.mapped[chart.mapped.length - 1].x}
                        cy={chart.mapped[chart.mapped.length - 1].y}
                        r="4"
                        fill={colors.primary}
                      />
                    ) : null}
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

                {/* Métricas del rango */}
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
                    <Text
                      style={{
                        marginTop: 6,
                        fontSize: 16,
                        fontWeight: "900",
                        color: pnlMeta(chart.rangeDelta).color,
                      }}
                    >
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

                <TouchableOpacity
                  onPress={() => navigation.navigate("InvestmentSeries", { assetId })}
                  activeOpacity={0.9}
                  style={{
                    marginTop: 12,
                    paddingVertical: 12,
                    borderRadius: 22,
                    backgroundColor: "#EEF2FF",
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Ionicons name="analytics-outline" size={16} color={colors.primary} />
                  <Text style={{ fontSize: 13, fontWeight: "900", color: colors.primary }}>
                    Ver serie completa
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* DETALLES: filas con icono */}
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 28,
              padding: 16,
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, fontWeight: "900", color: "#0F172A" }}>Información</Text>

              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: "#F1F5F9",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Ionicons name="information-circle-outline" size={14} color="#64748B" />
                <Text style={{ fontSize: 12, fontWeight: "900", color: "#334155" }}>
                  {asset.currency}
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 10 }}>
              <MetricRow label="Tipo" value={typeLabel(asset.type)} icon="pricetag-outline" />
              <MetricRow label="Símbolo" value={asset.symbol ? asset.symbol : "—"} icon="text-outline" />
              <MetricRow
                label="Aportado inicial"
                value={formatMoney(asset.initialInvested || 0, currency)}
                icon="flag-outline"
              />
              <View style={{ paddingTop: 10 }}>
                <Text style={{ fontSize: 11, color: "#94A3B8", lineHeight: 16 }}>
                  “Aportado” incluye aportaciones registradas en la app. “Valor actual” depende de tus valoraciones guardadas.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
