import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AppHeader from "../../../../components/AppHeader";
import AddButton from "../../../../components/AddButton";
import SegmentedTabs from "../../../../components/SegmentedTabs";
import { colors } from "../../../../theme/theme";
import BudgetGoalCard from "../../../../components/BudgetGoalCard";
import api from "../../../../api/api";
import { BudgetsScreenSkeleton } from "../../../../components/skeletons/BudgetsScreenSkeleton";
import { checkBudgetAlerts } from "../../../../utils/budgetAlerts";

type PeriodType = "daily" | "weekly" | "monthly" | "yearly";

interface BudgetFromApi {
  id: number;
  name: string | null;
  period: PeriodType;
  limit: number;
  startDate: string;

  categoryId: number | null;
  walletId: number | null;

  category: null | {
    id: number;
    name: string;
    emoji?: string | null;
    color?: string | null;
  };

  wallet: null | {
    id: number;
    name: string;
    emoji: string;
    currency: string;
    kind: string;
  };

  range?: { from: string; to: string }; // si tu backend lo devuelve
  spent: number;
  remaining: number;
  progress: number;
}

interface OverviewResponse {
  period: PeriodType | null;
  date?: string;
  from?: string;
  to?: string;
  summary: {
    totalLimit: number;
    totalSpent: number;
    remaining: number;
    count: number;
  };
  budgets: BudgetFromApi[];
}

const getPeriodLabel = (period: PeriodType) => {
  switch (period) {
    case "daily":
      return "diario";
    case "weekly":
      return "semanal";
    case "monthly":
      return "mensual";
    case "yearly":
      return "anual";
    default:
      return "";
  }
};

export default function BudgetsHomeScreen({ navigation }: any) {
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [budgets, setBudgets] = useState<BudgetFromApi[]>([]);
  const [summary, setSummary] = useState<OverviewResponse["summary"]>({
    totalLimit: 0,
    totalSpent: 0,
    remaining: 0,
    count: 0,
  });

  const fetchOverview = useCallback(
    async (opts?: { silent?: boolean }) => {
      try {
        if (!opts?.silent) setLoading(true);

        const res = await api.get<OverviewResponse>("/budgets/overview", {
          params: { period: periodType },
        });

        const budgetList = res.data?.budgets || [];
        setBudgets(budgetList);
        setSummary(
          res.data?.summary || {
            totalLimit: 0,
            totalSpent: 0,
            remaining: 0,
            count: 0,
          }
        );
        checkBudgetAlerts(budgetList).catch(() => {});
      } catch (e) {
        console.log("❌ Error cargando overview de budgets", e);
        setBudgets([]);
        setSummary({ totalLimit: 0, totalSpent: 0, remaining: 0, count: 0 });
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [periodType]
  );

  useFocusEffect(
    useCallback(() => {
      fetchOverview();
    }, [fetchOverview])
  );

  // Cuando cambias el periodo, refresca automáticamente
  React.useEffect(() => {
    fetchOverview();
  }, [periodType]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchOverview({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [fetchOverview]);

  const periodLabel = getPeriodLabel(periodType);

  // Si tu backend devolviera budgets “mixed periods” (no debería si filtras por period),
  // filtramos por seguridad:
  const filteredBudgets = useMemo(
    () => budgets.filter((b) => b.period === periodType),
    [budgets, periodType]
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* HEADER */}
      <View className="px-5 pb-3">
        <AppHeader
          title="Presupuestos"
          showProfile={false}
          showDatePicker={false}
          showBack={true}
        />
      </View>

      {/* SELECTOR PERIODO - siempre visible (interactivo) */}
      <View className="px-5 mb-3">
        <SegmentedTabs<PeriodType>
          options={[
            { key: "daily", label: "Día" },
            { key: "weekly", label: "Semana" },
            { key: "monthly", label: "Mes" },
            { key: "yearly", label: "Año" },
          ]}
          value={periodType}
          onChange={setPeriodType}
        />
      </View>

      {/* CONTENIDO */}
      {loading ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <BudgetsScreenSkeleton />
        </ScrollView>
      ) : (
        <ScrollView
          className="flex-1 px-3"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View className="mb-3">
            <BudgetGoalCard
              title={`Resumen ${periodLabel}`}
              icon="📊"
              total={summary.totalLimit}
              current={summary.totalSpent}
              color="white"
              backgroundColor={colors.primary}
              titleColor="white"
              subtitleColor="rgba(255,255,255,0.8)"
            />
          </View>

          {filteredBudgets.length === 0 ? (
            <Text className="text-center text-gray-400 mt-16 text-sm">
              No tienes presupuestos para este periodo.
            </Text>
          ) : (
            filteredBudgets.map((b) => {
              const hasCategory = !!b.category;
              const title = hasCategory
                ? b.category!.name
                : b.name || "Presupuesto";
              const icon = hasCategory
                ? b.category!.emoji || "💰"
                : "💰";
              const color = hasCategory
                ? b.category!.color || colors.primary
                : colors.primary;

              return (
                <View key={b.id} className="mb-3">
                  <BudgetGoalCard
                    title={title}
                    icon={icon}
                    total={b.limit}
                    current={b.spent}
                    color={color}
                    onPress={() =>
                      navigation.navigate("BudgetTransactions", {
                        budgetId: b.id,
                        budgetName: title,
                        budgetEmoji: icon,
                        budgetColor: color,
                        budgetLimit: b.limit,
                        budgetSpent: b.spent,
                        categoryId: b.categoryId,
                        walletId: b.walletId,
                        periodType: periodType,
                        range: b.range, // por si lo usas para filtrar transacciones
                      })
                    }
                  />
                </View>
              );
            })
          )}

          {/* BOTÓN AÑADIR PRESUPUESTO */}
          <AddButton
            label="Añadir presupuesto"
            onPress={() => navigation.navigate("BudgetCreate", { periodType })}
            style={{ justifyContent: "center", alignSelf: "stretch", marginTop: 8 }}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
