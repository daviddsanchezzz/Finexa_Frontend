import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../../components/AppHeader";
import DateFilterModal from "../../components/DateFilterModal";
import api from "../../api/api";
import { colors } from "../../theme/theme";
import { useFocusEffect } from "@react-navigation/native";

import PeriodChart from "../../components/PeriodChart";
import PieChartComponent from "../../components/PieChart";
import AdvancedStats from "../../components/AdvancedStats";

export default function StatsScreen({ navigation }: any) {
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [graphType, setGraphType] = useState<"expense" | "income" | "saving">("expense");

  const [showAdvanced, setShowAdvanced] = useState(false);

  const [chartMode, setChartMode] = useState<"bar" | "pie">("bar");

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);

  const [rangeType, setRangeType] = useState<"week" | "month" | "year" | "all">("month");

  const [dateLabel, setDateLabel] = useState("");

  // ------------------------------
  // HELPERS
  // ------------------------------
  const capitalizeLabel = (label: string) =>
    label ? label.charAt(0).toUpperCase() + label.slice(1) : label;

  const formatEuro = (n: number) =>
    n.toLocaleString("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatPercent = (value: number) =>
    `${value.toFixed(1).replace(".", ",")}%`;

  // ------------------------------
  // INICIALIZAR MES ACTUAL
  // ------------------------------
  const initCurrentMonth = () => {
    const now = new Date();

    const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    const rawLabel = now
      .toLocaleString("es-ES", { month: "long", year: "numeric" })
      .replace("de ", "");

    return {
      from: first,
      to: last,
      label: capitalizeLabel(rawLabel),
    };
  };

  useEffect(() => {
    const { from, to, label } = initCurrentMonth();
    setRangeType("month");
    setGraphType("expense");
    setDateLabel(label);
    setDateFrom(from);
    setDateTo(to);
  }, []);

  // Cargar datos
  useFocusEffect(
    React.useCallback(() => {
      if (dateFrom && dateTo) {
        const fetchStats = async () => {
          try {
            setLoading(true);

            const res = await api.get("/transactions", {
              params: { dateFrom, dateTo },
            });
            const filtered = res.data
              .filter((tx: any) => tx.type !== "transfer")      // excluir transfer
              .filter((tx: any) => tx.isRecurring === false);   // excluir plantillas

            setTransactions(filtered);
          } catch (err) {
            console.log("❌ Error cargando transacciones:", err);
          } finally {
            setLoading(false);
          }
        };

        fetchStats();
      }
    }, [dateFrom, dateTo])
  );

  // ------------------------------
  // AGRUPAR POR CATEGORÍA
  // ------------------------------
  const groupByCategory = (list: any[]) => {
    const incomeMap: any = {};
    const expenseMap: any = {};

    list.forEach((tx) => {
      if (!tx.category) return;
      const key = tx.category.name;
      const bucket = tx.type === "income" ? incomeMap : expenseMap;

      if (!bucket[key]) {
        bucket[key] = {
          name: tx.category.name,
          emoji: tx.category.emoji,
          color: tx.category.color,
          amount: 0,
          count: 0,
        };
      }

      bucket[key].amount += Math.abs(tx.amount);
      bucket[key].count += 1;
    });

    const incomesArr = Object.values(incomeMap) as any[];
    const expensesArr = Object.values(expenseMap) as any[];

    incomesArr.sort((a, b) => b.amount - a.amount);
    expensesArr.sort((a, b) => b.amount - a.amount);

    return { incomes: incomesArr, expenses: expensesArr };
  };

  const { incomes, expenses } = groupByCategory(transactions);

  const totalIncomes = incomes.reduce((sum, c) => sum + c.amount, 0);
  const totalExpenses = expenses.reduce((sum, c) => sum + c.amount, 0);

  // ------------------------------
  // PIE DATA (actualizado para ahorro global)
  // ------------------------------
  const pieData = (() => {
    // INGRESOS POR CATEGORÍA
    if (graphType === "income") {
      return incomes.map((c) => ({
        value: c.amount,
        realValue: c.amount,
        color: c.color,
        label: c.name,
        percent: totalIncomes > 0 ? (c.amount / totalIncomes) * 100 : 0,
      }));
    }

    // GASTOS POR CATEGORÍA
    if (graphType === "expense") {
      return expenses.map((c) => ({
        value: c.amount,
        realValue: c.amount,
        color: c.color,
        label: c.name,
        percent: totalExpenses > 0 ? (c.amount / totalExpenses) * 100 : 0,
      }));
    }

    // --- AHORRO GLOBAL ---
    const ingresos = totalIncomes;
    const gastos = totalExpenses;

    // Sin datos
    if (ingresos === 0 && gastos === 0) {
      return [
        {
          label: "Sin datos",
          value: 1,
          realValue: 0,
          color: "#D1D5DB",
          percent: 0,
        },
      ];
    }

    // Caso gastos >= ingresos → gastos es 100%, ahorro 0
    if (gastos >= ingresos) {
      return [
        {
          label: "Gastos",
          value: 1, // 100% del círculo (geométrico)
          realValue: gastos,
          color: "#ef4444",
          percent: ingresos > 0 ? (gastos / ingresos) * 100 : 100,
        },
        {
          label: "Ahorro",
          value: 0,
          realValue: 0,
          color: "#3b82f6",
          percent: 0,
        },
      ];
    }

    // Caso ingresos > gastos → 100% = ingresos
    const ahorro = ingresos - gastos;

    return [
      {
        label: "Gastos",
        value: gastos,
        realValue: gastos,
        color: "#ef4444",
        percent: (gastos / ingresos) * 100,
      },
      {
        label: "Ahorro",
        value: ahorro,
        realValue: ahorro,
        color: "#3b82f6",
        percent: (ahorro / ingresos) * 100,
      },
    ];
  })();

  // ------------------------------
  // GENERAR BARRAS
  // ------------------------------
  const generateBars = (list: any[], from: string, to: string, type: string) => {
    if (!from || !to) return [];
    const start = new Date(from);

    if (type === "week") {
      const days = new Array(7).fill(0);
      list.forEach((item) => {
        const d = new Date(item.date);
        const diff = Math.floor((d.getTime() - start.getTime()) / 86400000);
        if (diff >= 0 && diff < 7) days[diff] += Math.abs(item.amount);
      });
      return days;
    }

    if (type === "month") {
      const weeks: number[] = [];

      const firstDay = new Date(start.getFullYear(), start.getMonth(), 1);
      const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0);

      const firstWeekStart = new Date(firstDay);
      const weekday = firstWeekStart.getDay();
      const diffToMonday = (weekday + 6) % 7;
      firstWeekStart.setDate(firstWeekStart.getDate() - diffToMonday);

      let cursor = new Date(firstWeekStart);

      while (cursor <= lastDay) {
        weeks.push(0);
        cursor.setDate(cursor.getDate() + 7);
      }

      list.forEach((item) => {
        const d = new Date(item.date);
        if (d < firstWeekStart || d > lastDay) return;

        const diffWeeks = Math.floor(
          (d.getTime() - firstWeekStart.getTime()) / (86400000 * 7)
        );

        if (diffWeeks >= 0 && diffWeeks < weeks.length) {
          weeks[diffWeeks] += Math.abs(item.amount);
        }
      });

      return weeks;
    }

    if (type === "year") {
      const months = new Array(12).fill(0);
      list.forEach((item) => {
        const m = new Date(item.date).getMonth();
        months[m] += Math.abs(item.amount);
      });
      return months;
    }

    if (type === "all") {
      const map: any = {};
      list.forEach((item) => {
        const y = new Date(item.date).getFullYear();
        if (!map[y]) map[y] = 0;
        map[y] += Math.abs(item.amount);
      });
      return Object.values(map);
    }

    return [];
  };

  // NUEVO: Bars con display/real
  let bars: { display: number; real: number }[] = [];

  if (graphType === "saving") {
    const inc = generateBars(
      transactions.filter((t) => t.type === "income"),
      dateFrom!,
      dateTo!,
      rangeType
    );

    const exp = generateBars(
      transactions.filter((t) => t.type === "expense"),
      dateFrom!,
      dateTo!,
      rangeType
    );

    bars = inc.map((v, i) => {
      const saving = v - (exp[i] || 0);

      return {
        display: Math.max(saving, 0), // altura (nunca negativa)
        real: saving,                 // valor real (puede ser negativo)
      };
    });
  } else {
    const txByType = transactions.filter((t) => t.type === graphType);
    bars = generateBars(txByType, dateFrom!, dateTo!, rangeType).map((v) => ({
      display: v,
      real: v,
    }));
  }

  const barLabels = (() => {
    if (rangeType === "week") return ["L", "M", "X", "J", "V", "S", "D"];
    if (rangeType === "month") return bars.map((_, i) => `S${i + 1}`);
    if (rangeType === "year")
      return ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

    if (rangeType === "all") {
      const years = new Set(
        transactions.map((t) => new Date(t.date).getFullYear())
      );
      return [...years].sort();
    }

    return [];
  })();

  // --------------------------------------
  // RENDER
  // --------------------------------------
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* HEADER */}
        <View className="px-5 pb-2">
          <AppHeader
            title="Estadísticas"
            showProfile={false}
            onOpenDateModal={() => setDateModalVisible(true)}
            dateLabel={dateLabel}
          />
        </View>

        {/* SELECTOR TIPO */}
        <View className="flex-row mx-5 bg-gray-100 rounded-2xl p-1 mb-4">
          {[
            { key: "income", label: "Ingreso", color: "rgba(34,197,94,0.15)" },
            { key: "expense", label: "Gasto", color: "rgba(239,68,68,0.15)" },
            { key: "saving", label: "Ahorro", color: "rgba(249,115,22,0.15)" },
          ].map((item) => {
            const active = graphType === item.key;

            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setGraphType(item.key as any)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 14,
                  backgroundColor: active ? item.color : "transparent",
                }}
              >
                <Text
                  style={{
                    textAlign: "center",
                    fontWeight: "600",
                    color: active ? "black" : "gray",
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* SELECTOR MODO */}
        <View className="flex-row mx-5 bg-gray-100 rounded-2xl p-1 mb-4">
          {[
            { key: "bar", label: "Barras" },
            { key: "pie", label: "Circular" },
          ].map((item) => {
            const active = chartMode === item.key;

            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setChartMode(item.key as any)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 14,
                  backgroundColor: active ? "#dbeafe" : "transparent",
                }}
              >
                <Text
                  style={{
                    textAlign: "center",
                    fontWeight: "600",
                    color: active ? colors.primary : "gray",
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* LOADING */}
        {loading && (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        )}

        {/* ----------------------------- */}
        {/*       CONTENIDO PRINCIPAL     */}
        {/* ----------------------------- */}
        {!loading && bars && (
          <>
            {/* GRAPH */}
            <View className="mx-5 bg-white rounded-3xl p-5 mb-6 shadow-sm">
              <Text className="text-gray-600 font-semibold mb-1">
                {chartMode === "bar"
                  ? `Distribución ${
                      rangeType === "week"
                        ? "por días"
                        : rangeType === "month"
                        ? "por semanas"
                        : rangeType === "year"
                        ? "por meses"
                        : "por años"
                    }`
                  : graphType === "saving"
                  ? "Ingresos vs Gastos"
                  : "Distribución por categorías"}
              </Text>

              <View style={{ marginTop: 10 }}>
                {chartMode === "bar" ? (
                  <PeriodChart data={bars} labels={barLabels} />
                ) : graphType === "saving" ? (
                  <PieChartComponent
                    mode="saving"
                    incomes={totalIncomes}
                    expenses={totalExpenses}
                  />
                ) : (
                  <PieChartComponent
                    mode={graphType}
                    data={pieData}
                    incomes={totalIncomes}
                    expenses={totalExpenses}
                  />
                )}
              </View>
            </View>

            {/* DATE LABEL */}
            <View className="mx-5 mb-5">
              <Text className="text-[20px] font-bold text-text">Resumen {dateLabel}</Text>
            </View>

            {/* INGRESOS */}
            <View className="mx-5 mb-8">
              <View className="mb-2">
                <Text className="text-[15px] font-medium text-gray-500">
                  INGRESOS POR CATEGORÍA
                </Text>
              </View>

              {incomes.length === 0 && (
                <Text className="text-gray-400">No hay ingresos</Text>
              )}

              {incomes.length > 0 && (
                <>
                  {incomes.map((c, i) => {
                    const percent =
                      totalIncomes > 0 ? (c.amount / totalIncomes) * 100 : 0;

                    return (
                      <TouchableOpacity
                        key={i}
                        activeOpacity={0.7}
                        onPress={() =>
                          navigation.navigate("CategoryTransactions", {
                            categoryName: c.name,
                            categoryEmoji: c.emoji,
                            categoryColor: c.color,
                            type: "income",
                            dateFrom,
                            dateTo,
                          })
                        }
                        className="flex-row justify-between items-center py-3 px-1.5 border-b border-gray-200"
                        style={{
                          backgroundColor: colors.background,
                          borderRadius: 12,
                          marginVertical: 3,
                        }}
                      >
                        <View className="flex-row items-center">
                          <View
                            className="w-9 h-9 rounded-lg items-center justify-center mr-3"
                            style={{ backgroundColor: c.color }}
                          >
                            <Text className="text-[18px]">{c.emoji}</Text>
                          </View>

                          <View>
                            <Text className="text-[16px] font-semibold text-text">
                              {c.name}
                            </Text>
                            <Text className="text-[13px] text-gray-500 mt-0.5">
                              x{c.count}
                            </Text>
                          </View>
                        </View>

                        <View className="items-end">
                          <Text className="text-[16px] font-semibold text-text">
                            {formatEuro(c.amount)}
                          </Text>
                          <Text className="text-[13px] text-gray-500 mt-0.5">
                            {formatPercent(percent)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  <View
                    className="flex-row justify-between items-center py-3 px-3 mt-1"
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: 12,
                      marginVertical: 3,
                    }}
                  >
                    <View className="flex-row items-center">
                      <Text className="text-[16px] font-semibold text-text">
                        Total ingresos
                      </Text>
                    </View>

                    <Text className="text-[16px] font-bold text-text">
                      {formatEuro(totalIncomes)}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* GASTOS */}
            <View className="mx-5 mb-6">
              <View className="mb-2">
                <Text className="text-[15px] font-medium text-gray-500">
                  GASTOS POR CATEGORÍA
                </Text>
              </View>

              {expenses.length === 0 && (
                <Text className="text-gray-400">No hay gastos</Text>
              )}

              {expenses.length > 0 && (
                <>
                  {expenses.map((c, i) => {
                    const percent =
                      totalExpenses > 0 ? (c.amount / totalExpenses) * 100 : 0;

                    return (
                      <TouchableOpacity
                        key={i}
                        activeOpacity={0.7}
                        onPress={() =>
                          navigation.navigate("CategoryTransactions", {
                            categoryName: c.name,
                            categoryEmoji: c.emoji,
                            categoryColor: c.color,
                            type: "expense",
                            dateFrom,
                            dateTo,
                          })
                        }
                        className="flex-row justify-between items-center py-3 px-1.5 border-b border-gray-200"
                        style={{
                          backgroundColor: colors.background,
                          borderRadius: 12,
                          marginVertical: 3,
                        }}
                      >
                        <View className="flex-row items-center">
                          <View
                            className="w-9 h-9 rounded-lg items-center justify-center mr-3"
                            style={{ backgroundColor: c.color }}
                          >
                            <Text className="text-[18px]">{c.emoji}</Text>
                          </View>

                          <View>
                            <Text className="text-[16px] font-semibold text-text">
                              {c.name}
                            </Text>
                            <Text className="text-[13px] text-gray-500 mt-0.5">
                              x{c.count}
                            </Text>
                          </View>
                        </View>

                        <View className="items-end">
                          <Text className="text-[16px] font-semibold text-text">
                            {formatEuro(c.amount)}
                          </Text>
                          <Text className="text-[13px] text-gray-500 mt-0.5">
                            {formatPercent(percent)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  <View
                    className="flex-row justify-between items-center py-3 px-3 mt-1"
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: 12,
                      marginVertical: 3,
                    }}
                  >
                    <View className="flex-row items-center">
                      <Text className="text-[16px] font-semibold text-text">
                        Total gastos
                      </Text>
                    </View>

                    <Text className="text-[16px] font-bold text-text">
                      {formatEuro(totalExpenses)}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* AHORRO */}
            <View className="mx-5 mb-8">
              <Text className="text-[15px] font-medium text-gray-500">AHORRO</Text>

                  <View
                    className="flex-row justify-between items-center py-3 px-3 mt-1"
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: 12,
                      marginVertical: 3,
                    }}
                  >
                    <View className="flex-row items-center">
                      <Text className="text-[16px] font-semibold text-text">
                        Total ahorro
                      </Text>
                    </View>

                    <Text className="text-[16px] font-bold text-text">
                      {formatEuro(totalIncomes - totalExpenses)}
                    </Text>
                  </View>
            </View>

            {/* BOTÓN PARA MOSTRAR / OCULTAR ADVANCED */}
          <TouchableOpacity
            onPress={() => setShowAdvanced(!showAdvanced)}
            className="mx-5 mt-6 py-3 rounded-2xl"
            style={{
              borderWidth: 1.5,
              borderColor: "#CBD5E1",
              backgroundColor: "white",
            }}
          >
            <Text className="text-center font-semibold text-gray-700">
              {showAdvanced ? "Ocultar estadísticas avanzadas" : "Ver estadísticas avanzadas"}
            </Text>
          </TouchableOpacity>

            {/* --- AQUÍ APARECE DEBAJO DE TODO CUANDO SE ABRE --- */}
            {showAdvanced && (
              <View className="mt-4">
                <AdvancedStats navigation={navigation}  />
              </View>

            )}

          </>
        )}
                 
      </ScrollView>



      {/* MODAL FECHAS */}
      <DateFilterModal
        visible={dateModalVisible}
        showCustomRange={false}
        onClose={() => setDateModalVisible(false)}
        onSelect={({ from, to, label, type }) => {
          setDateFrom(from);
          setDateTo(to);
          setDateLabel(capitalizeLabel(label));
          setRangeType(type as any);
        }}
      />
    </SafeAreaView>
  );
}
