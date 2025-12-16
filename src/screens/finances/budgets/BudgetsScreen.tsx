import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AppHeader from "../../../components/AppHeader";
import { colors } from "../../../theme/theme";
import BudgetGoalCard from "../../../components/BudgetGoalCard";
import api from "../../../api/api";

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

        setBudgets(res.data?.budgets || []);
        setSummary(
          res.data?.summary || {
            totalLimit: 0,
            totalSpent: 0,
            remaining: 0,
            count: 0,
          }
        );
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

      {/* RESUMEN + SELECTOR */}
      <View className="px-5 mb-3">
        <View className="mb-2">
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

        {/* SELECTOR PERIODO */}
        <View className="flex-row rounded-2xl bg-slate-50 p-1 mt-1">
          {[
            { key: "daily" as PeriodType, label: "Día" },
            { key: "weekly" as PeriodType, label: "Semana" },
            { key: "monthly" as PeriodType, label: "Mes" },
            { key: "yearly" as PeriodType, label: "Año" },
          ].map((opt) => {
            const active = periodType === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setPeriodType(opt.key)}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 14,
                  backgroundColor: active ? "white" : "transparent",
                  borderWidth: active ? 1 : 0,
                  borderColor: active ? colors.primary : "transparent",
                }}
                activeOpacity={0.9}
              >
                <Text
                  style={{
                    textAlign: "center",
                    fontSize: 12,
                    fontWeight: "600",
                    color: active ? colors.primary : "#6B7280",
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* CONTENIDO */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 50 }}
        />
      ) : (
        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
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
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("BudgetCreate", {
                periodType,
              })
            }
            className="flex-row items-center justify-center py-2.5 rounded-2xl mt-2"
            style={{
              backgroundColor: "#F3F4F6",
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
            activeOpacity={0.9}
          >
            <Ionicons name="add-outline" size={18} color="#64748B" />
            <Text className="text-sm text-slate-500 font-medium ml-1.5">
              Añadir presupuesto
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
