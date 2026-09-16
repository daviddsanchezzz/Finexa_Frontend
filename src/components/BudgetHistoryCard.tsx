import React from "react";
import { useBudgetData } from "../hooks/useBudgetData";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import GroupedBarChart from "./GroupedBarChart";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/api";
import { colors } from "../theme/theme";

type HistoryItem = {
  from: string;
  to: string;
  effectiveTotalLimit: number | null;
  globalSpent: number | null;
  categoryLimits: { categoryId: number; limit: number; spent: number }[];
};
type HistoryResponse = { budget: { period: string }; items: HistoryItem[] };

export function budgetHistoryBars(items: HistoryItem[], categoryId: number | null) {
  return items.map(item => {
    const category = categoryId == null ? null : item.categoryLimits.find(row => row.categoryId === categoryId);
    if (categoryId != null && !category) return null;
    const limit = category ? Number(category.limit) : item.effectiveTotalLimit != null ? Number(item.effectiveTotalLimit) : item.categoryLimits.reduce((sum, row) => sum + Number(row.limit), 0);
    const spent = category ? Number(category.spent) : item.effectiveTotalLimit != null ? Number(item.globalSpent ?? 0) : item.categoryLimits.reduce((sum, row) => sum + Number(row.spent), 0);
    if (!Number.isFinite(limit) || limit <= 0 || !Number.isFinite(spent) || !Number.isFinite(Date.parse(item.from))) return null;
    return { from: item.from, to: item.to, percentage: Math.max(0, spent / limit * 100) };
  }).filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => Date.parse(a.from) - Date.parse(b.from)).slice(-6);
}

export default function BudgetHistoryCard({ budgetId, categoryId }: { budgetId: number; categoryId: number | null }) {
  const history = useBudgetData<HistoryResponse>(["history", budgetId, new Date().toLocaleDateString("en-CA")], async (signal) => {
    const response = await api.get<HistoryResponse>(`/budgets/${budgetId}/history`, { params: { count: 6 }, signal });
    return response.data;
  });
  const data = history.data;
  const loading = history.isPending;
  const error = history.isError && !data;

  const bars = budgetHistoryBars(data?.items ?? [], categoryId);
  const monthly = data?.budget.period === "monthly";
  const periodLabel = (from: string) => {
    const value = new Date(from);
    if (monthly) return value.toLocaleDateString("es-ES", { month: "short" }).replace(".", "");
    if (data?.budget.period === "yearly") return String(value.getFullYear());
    return `${value.getDate()}/${value.getMonth() + 1}`;
  };
  const now = Date.now();
  const current = bars.some(bar => Date.parse(bar.from) <= now && Date.parse(bar.to) >= now);

  return (
    <View style={{ backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#E2E8F0", padding: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Ionicons name="bar-chart-outline" size={16} color={colors.primary} />
        <Text style={{ flex: 1, fontSize: 14, fontWeight: "800", color: colors.ink }}>Comparativa con otros {monthly ? "meses" : "periodos"}</Text>
      </View>
      <Text style={{ fontSize: 11, color: "#94A3B8", marginTop: 5, marginBottom: 12 }}>% del presupuesto gastado</Text>
      {loading ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 40 }} /> : error ? (
        <View style={{ paddingVertical: 20, gap: 12, alignItems: "center" }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>No se pudo cargar el histórico.</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => { void history.refetch(); }} style={{ padding: 12 }}><Text style={{ color: colors.primary, fontWeight: "700" }}>Reintentar</Text></TouchableOpacity>
        </View>
      ) : bars.length === 0 ? (
        <Text style={{ fontSize: 13, lineHeight: 19, color: colors.textSecondary, paddingVertical: 24 }}>Todavía no hay periodos con un límite de presupuesto para comparar.</Text>
      ) : <>
        <GroupedBarChart
          height={150}
          xLabels={bars.map(bar => periodLabel(bar.from))}
          tooltipLabels={bars.map(bar => new Date(bar.from).toLocaleDateString("es-ES", monthly ? { month: "long", year: "numeric" } : { day: "numeric", month: "short", year: "numeric" }))}
          series={[{ label: "% gastado", color: colors.primary, values: bars.map(bar => bar.percentage) }]}
          currentPeriodIndex={current ? bars.findIndex(bar => Date.parse(bar.from) <= now && Date.parse(bar.to) >= now) : null}
          minimumMax={150}
          formatAxisValue={value => value.toFixed(0) + "%"}
          formatValue={value => value.toFixed(0) + "%"}
          showValues
          referenceLine={{ value: 100, color: "#F0A5A5" }}
        />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 10 }}>
          <View style={{ width: 20, borderTopWidth: 1, borderStyle: "dashed", borderColor: "#F0A5A5" }} />
          <Text style={{ fontSize: 11, color: "#64748B" }}>Límite del presupuesto · 100%</Text>
        </View>
        <Text style={{ fontSize: 10.5, lineHeight: 15, color: "#94A3B8" }}>
          {current ? `El ${monthly ? "mes" : "periodo"} actual está en curso. ` : ""}Calculado con los límites actuales del presupuesto.
        </Text>
      </>}
    </View>
  );
}
