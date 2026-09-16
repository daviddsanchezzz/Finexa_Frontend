import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import api from "../../../../api/api";
import { colors } from "../../../../theme/theme";
import TransactionsList from "../../../../components/TransactionsList";
import BudgetGoalCard from "../../../../components/BudgetGoalCard";
import HeroBalanceCard from "../../../../components/HeroBalanceCard";
import StatsRow from "../../../../components/StatsRow";
import OverflowMenuButton from "../../../../components/OverflowMenuButton";
import { formatEuro as formatEuroBase } from "../../../../utils/currency";
import { budgetProgressColor } from "../../../../utils/budgetProgressColor";

const formatEuro = (n: number) => `${formatEuroBase(n)} €`;

interface CategoryLimitItem {
  categoryId: number;
  category: { id: number; name: string; emoji?: string | null; color?: string | null } | null;
  limit: number;
  spent: number;
  remaining: number;
  progress: number;
}

interface BudgetProgress {
  id: number;
  name: string | null;
  period: string;
  walletIds: number[];
  totalLimit: number | null;
  effectiveTotalLimit: number | null;
  globalSpent: number | null;
  globalRemaining: number | null;
  globalProgress: number | null;
  otherSpent: number | null;
  categoryLimits: CategoryLimitItem[];
  range: { from: string; to: string };
}

function ProgressBar({ progress, color = colors.primary, height = 8 }: { progress: number; color?: string; height?: number }) {
  const pct = Math.min(100, Math.max(0, progress * 100));
  return (
    <View style={{ height, borderRadius: 999, backgroundColor: "#E5E7EB", overflow: "hidden" }}>
      <View style={{ height: "100%", width: `${pct}%`, borderRadius: 999, backgroundColor: color }} />
    </View>
  );
}

export default function BudgetTransactionsScreen({ navigation }: any) {
  const route = useRoute();
  const {
    budgetId,
    budgetName,
    budgetEmoji,
    budgetColor,
    budgetLimit,
    budgetSpent,
    date,
    goalId,
    range,
    dateFrom,
    dateTo,
    categoryId,
    walletId,
    type,
  } = (route.params as any) || {};

  // GoalsScreen reutiliza esta misma pantalla para ver las transacciones de un
  // objetivo de ahorro (no un Budget real) — en ese caso mantenemos el
  // comportamiento simple de siempre: lista de transacciones con los filtros
  // que ya vienen en los params, sin tocar el endpoint de presupuestos.
  const isGoalMode = !!goalId;

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<BudgetProgress | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  const fetchGoalTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        dateFrom: range?.from || dateFrom,
        dateTo: range?.to || dateTo,
        type: type || "expense",
      };
      if (categoryId) params.categoryId = categoryId;
      if (walletId) params.walletId = walletId;
      const res = await api.get("/transactions", { params });
      setTransactions(res.data || []);
    } catch (e) {
      console.log("❌ Error cargando transacciones del objetivo", e);
    } finally {
      setLoading(false);
    }
  }, [range, dateFrom, dateTo, type, categoryId, walletId]);

  // Si se abrió desde una tarjeta de categoría concreta (no la global), solo
  // nos interesan el progreso y las transacciones de esa categoría.
  const scopedCategoryId = !isGoalMode && categoryId != null ? Number(categoryId) : null;

  const fetchBudgetProgress = useCallback(async () => {
    try {
      setLoading(true);

      const progressRes = await api.get(`/budgets/${budgetId}/progress`, { params: date ? { date } : undefined });
      const p: BudgetProgress = progressRes.data;
      setProgress(p);

      const hasGlobal = p.effectiveTotalLimit != null;
      const categoryIds = p.categoryLimits.map((c) => c.categoryId);

      if (scopedCategoryId == null && !hasGlobal && categoryIds.length === 0) {
        setTransactions([]);
        return;
      }

      const params: any = {
        dateFrom: p.range.from,
        dateTo: p.range.to,
        type: "expense",
        isRecurring: false,
      };
      if (p.walletIds?.length) params.walletIds = p.walletIds.join(",");

      if (scopedCategoryId != null) {
        params.categoryId = scopedCategoryId;
      } else if (!hasGlobal) {
        params.categoryIds = categoryIds.join(",");
      }

      const txRes = await api.get("/transactions", { params });
      // El backend no filtra excludeFromStats server-side (igual que en Home);
      // isRecurring se pide ya filtrado, pero lo reforzamos aquí por si acaso.
      const filtered = (txRes.data || [])
        .filter((tx: any) => tx.isRecurring !== true)
        .filter((tx: any) => tx.excludeFromStats !== true);
      setTransactions(filtered);
    } catch (e) {
      console.log("❌ Error cargando presupuesto/transacciones", e);
    } finally {
      setLoading(false);
    }
  }, [budgetId, date, scopedCategoryId]);

  const fetchAll = isGoalMode ? fetchGoalTransactions : fetchBudgetProgress;

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (isGoalMode) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center px-5 py-3">
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <View className="flex-1 px-5">
            <View className="pb-3">
              <BudgetGoalCard
                title={budgetName}
                icon={budgetEmoji}
                total={Number(budgetLimit) || 0}
                current={Number(budgetSpent) || 0}
                color={budgetColor}
                onPress={() => {}}
              />
            </View>
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
              <TransactionsList transactions={transactions} navigation={navigation} onDeleted={fetchGoalTransactions} />
            </ScrollView>
          </View>
        )}
      </SafeAreaView>
    );
  }

  const hasGlobal = progress?.effectiveTotalLimit != null;
  const scopedCategory = scopedCategoryId != null ? progress?.categoryLimits.find((c) => c.categoryId === scopedCategoryId) : null;
  const title = scopedCategory
    ? scopedCategory.category?.name || "Categoría"
    : progress?.name || budgetName || "Presupuesto";

  const limitValue = scopedCategory ? scopedCategory.limit : progress?.effectiveTotalLimit ?? 0;
  const spentValue = scopedCategory ? scopedCategory.spent : progress?.globalSpent ?? 0;
  const remainingValue = scopedCategory ? scopedCategory.remaining : progress?.globalRemaining ?? 0;
  const rawProgress = scopedCategory ? scopedCategory.progress : progress?.globalProgress ?? 0;
  const heroBarPct = Math.min(100, Math.max(0, rawProgress * 100));

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-5 py-3">
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8} style={{ marginRight: 6 }}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: "800", color: colors.ink }} numberOfLines={1}>
          {title}
        </Text>
        <OverflowMenuButton
          title={title}
          actions={[{ label: "Editar", onPress: () => navigation.navigate("BudgetEdit", { budgetId }) }]}
        />
      </View>

      {loading || !progress ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }}>
          {scopedCategory || hasGlobal ? (
            <View style={{ marginBottom: 16 }}>
              <HeroBalanceCard
                label="Disponible"
                value={formatEuro(remainingValue)}
                style={{ marginBottom: 8 }}
                footer={
                  <View style={{ width: "100%", marginTop: 8, alignItems: "center" }}>
                    <View
                      style={{
                        width: "100%",
                        height: 6,
                        borderRadius: 999,
                        backgroundColor: "rgba(255,255,255,0.25)",
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          height: "100%",
                          width: `${heroBarPct}%`,
                          borderRadius: 999,
                          backgroundColor: "white",
                        }}
                      />
                    </View>
                    <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: "600", marginTop: 6, textAlign: "center" }} numberOfLines={1}>
                      {(rawProgress * 100).toFixed(0)}% completado
                    </Text>
                  </View>
                }
              />

              <StatsRow
                items={[
                  { key: "limite", label: "LÍMITE", value: formatEuro(limitValue) },
                  { key: "gastado", label: "GASTADO", value: formatEuro(spentValue), color: colors.danger },
                ]}
              />
            </View>
          ) : null}

          {!scopedCategory && progress.categoryLimits.length > 0 ? (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 12, fontWeight: "800", letterSpacing: 0.45, color: "#64748B", marginBottom: 12 }}>
                LÍMITES POR CATEGORÍA
              </Text>
              <View style={{ gap: 16 }}>
                {progress.categoryLimits.map((cl) => (
                  <View key={cl.categoryId}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: colors.ink, marginBottom: 4 }}>
                      {cl.category?.emoji ? `${cl.category.emoji} ` : ""}
                      {cl.category?.name || "Categoría"}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 6 }}>
                      {formatEuro(cl.spent)} de {formatEuro(cl.limit)}
                    </Text>
                    <ProgressBar progress={cl.progress} color={budgetProgressColor(cl.progress)} />
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {!scopedCategory && hasGlobal && progress.categoryLimits.length > 0 ? (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 12, fontWeight: "800", letterSpacing: 0.45, color: "#64748B", marginBottom: 8 }}>
                RESTO DE GASTOS
              </Text>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.ink }}>{formatEuro(progress.otherSpent || 0)}</Text>
            </View>
          ) : null}

          <TransactionsList transactions={transactions} navigation={navigation} onDeleted={fetchBudgetProgress} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
