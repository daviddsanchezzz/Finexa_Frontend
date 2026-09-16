import { useBudgetData } from "../../../../hooks/useBudgetData";
import React, { useState } from "react";
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
import SegmentedTabs from "../../../../components/SegmentedTabs";
import BudgetPaceCard from "../../../../components/BudgetPaceCard";
import BudgetHistoryCard from "../../../../components/BudgetHistoryCard";
import OverflowMenuButton from "../../../../components/OverflowMenuButton";
import { formatEuro as formatEuroBase } from "../../../../utils/currency";
import { budgetProgressColor, budgetSpentTextColor } from "../../../../utils/budgetProgressColor";

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

  const [tab, setTab] = useState<"movements" | "pace" | "history">("movements");
  const scopedCategoryId = !isGoalMode && categoryId != null ? Number(categoryId) : null;
  // referenceDate es lo que se envía al backend: NUNCA se trunca a medianoche
  // local, porque convertida a UTC puede caer en el día/mes anterior según el
  // huso horario del usuario, haciendo que el backend calcule el rango
  // equivocado (p.ej. agosto en vez de septiembre) y muestre 0 gastado.
  // cacheDate sí se trunca, mismo día = misma query, pero solo se usa para la key.
  const referenceDate = new Date(date || Date.now()).toISOString();
  const cacheDate = new Date(date || Date.now());
  cacheDate.setHours(0, 0, 0, 0);
  const detail = useBudgetData<{ progress: BudgetProgress | null; transactions: any[] }>(
    ["detail", isGoalMode ? "goal" : "budget", budgetId ?? goalId, cacheDate.toISOString(), scopedCategoryId, range?.from ?? dateFrom, range?.to ?? dateTo, walletId, type, categoryId],
    async (signal) => {
      if (isGoalMode) {
        const params: any = { dateFrom: range?.from || dateFrom, dateTo: range?.to || dateTo, type: type || "expense" };
        if (categoryId) params.categoryId = categoryId;
        if (walletId) params.walletId = walletId;
        const response = await api.get("/transactions", { params, signal });
        return { progress: null, transactions: response.data || [] };
      }
      const response = await api.get<BudgetProgress>(`/budgets/${budgetId}/progress`, { params: { date: referenceDate }, signal });
      const progress = response.data;
      const hasGlobal = progress.effectiveTotalLimit != null;
      const categoryIds = progress.categoryLimits.map(item => item.categoryId);
      if (scopedCategoryId == null && !hasGlobal && !categoryIds.length) return { progress, transactions: [] };
      const params: any = { dateFrom: progress.range.from, dateTo: progress.range.to, type: "expense", isRecurring: false };
      if (progress.walletIds?.length) params.walletIds = progress.walletIds.join(",");
      if (scopedCategoryId != null) params.categoryId = scopedCategoryId;
      else if (!hasGlobal) params.categoryIds = categoryIds.join(",");
      const txResponse = await api.get("/transactions", { params, signal });
      return { progress, transactions: (txResponse.data || []).filter((tx: any) => tx.isRecurring !== true && tx.excludeFromStats !== true) };
    }
  );
  const loading = detail.isPending;
  const progress = detail.data?.progress ?? null;
  const transactions = detail.data?.transactions ?? [];
  const fetchGoalTransactions = () => { void detail.refetch(); };
  const fetchBudgetProgress = () => { void detail.refetch(); };

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
        <View className="flex-1">
          {scopedCategory || hasGlobal ? (
            <View style={{ marginBottom: 16, paddingHorizontal: 20 }}>
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
                      {(rawProgress * 100).toFixed(0)}% gastado
                    </Text>
                  </View>
                }
              />

              <StatsRow
                items={[
                  { key: "limite", label: "LÍMITE", value: formatEuro(limitValue) },
                  { key: "gastado", label: "GASTADO", value: formatEuro(spentValue), color: budgetSpentTextColor(rawProgress) },
                ]}
              />
            </View>
          ) : null}

          <SegmentedTabs<"movements" | "pace" | "history">
            options={[{ key: "movements", label: "Movimientos" }, { key: "pace", label: "Ritmo" }, { key: "history", label: "Histórico" }]}
            value={tab}
            onChange={setTab}
            variant="underline"
          />
          <ScrollView
            key={tab}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }}
          >
          {tab === "history" ? (
            <View style={{ paddingTop: 16 }}>
              <BudgetHistoryCard budgetId={budgetId} categoryId={scopedCategoryId} />
            </View>
          ) : tab === "pace" ? (
            <View style={{ paddingTop: 16 }}>
              <BudgetPaceCard
                from={progress.range.from}
                to={progress.range.to}
                limit={scopedCategory || hasGlobal ? Number(limitValue) : progress.categoryLimits.reduce((sum, item) => sum + Number(item.limit), 0)}
                transactions={transactions}
              />
            </View>
          ) : <>
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
          </>}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}
