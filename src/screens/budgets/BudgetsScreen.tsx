// src/screens/Budgets/BudgetsScreen.tsx
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

import { useFocusEffect } from "@react-navigation/native";
import AppHeader from "../../components/AppHeader";
import BudgetGoalCard from "../../components/BudgetGoalCard";
import { colors } from "../../theme/theme";
import api from "../../api/api";

type PeriodType = "daily" | "weekly" | "monthly" | "yearly";

type DebtType = "loan" | "personal";
type DebtDirection = "i_ow" | "they_owe";
type DebtStatus = "active" | "paid" | "closed";

interface Debt {
  id: number;
  type: DebtType;
  direction: DebtDirection;
  status: DebtStatus;
  name: string;
  entity: string;
  emoji?: string | null;
  color?: string | null;
  totalAmount: number;
  payed?: number | null;
  remainingAmount: number;
  interestRate?: number | null;
  monthlyPayment?: number | null;
  startDate?: string | null;
  nextDueDate?: string | null;
  installmentsPaid?: number | null;
}

// ------------------ MOCKS PRESUPUESTOS ------------------ //
const mockBudgets = [
  {
    id: 1,
    name: "Comida",
    periodType: "monthly" as PeriodType,
    limit: 200,
    spent: 120,
    category: {
      name: "Comida",
      emoji: "🍔",
      color: "#f97316",
    },
  },
  {
    id: 2,
    name: "Transporte",
    periodType: "monthly" as PeriodType,
    limit: 80,
    spent: 30,
    category: {
      name: "Transporte",
      emoji: "🚌",
      color: "#22c55e",
    },
  },
  {
    id: 3,
    name: "Café diario",
    periodType: "daily" as PeriodType,
    limit: 5,
    spent: 3,
    category: {
      name: "Café",
      emoji: "☕️",
      color: "#a855f7",
    },
  },
  {
    id: 4,
    name: "Salida finde",
    periodType: "weekly" as PeriodType,
    limit: 60,
    spent: 40,
    category: {
      name: "Ocio",
      emoji: "🎉",
      color: "#3b82f6",
    },
  },
  {
    id: 5,
    name: "Ahorro anual",
    periodType: "yearly" as PeriodType,
    limit: 2000,
    spent: 750,
    category: {
      name: "Ahorro",
      emoji: "💰",
      color: "#16a34a",
    },
  },
];

// ------------------ MOCKS OBJETIVOS ------------------ //
const mockGoals = [
  {
    id: 1,
    name: "Viaje a Roma",
    emoji: "✈️",
    color: "#3b82f6",
    targetAmount: 600,
    savedAmount: 240,
  },
  {
    id: 2,
    name: "Nuevo portátil",
    emoji: "💻",
    color: "#8b5cf6",
    targetAmount: 1200,
    savedAmount: 450,
  },
  {
    id: 3,
    name: "Fondo de emergencia",
    emoji: "🧯",
    color: "#f97316",
    targetAmount: 1000,
    savedAmount: 1000,
  },
];

export default function BudgetsScreen({ navigation }: any) {
  const [view, setView] = useState<"budgets" | "goals" | "debts">("budgets");
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");

  const [debts, setDebts] = useState<Debt[]>([]);
  const [loadingDebts, setLoadingDebts] = useState(false);

  const filteredBudgets = mockBudgets.filter(
    (b) => b.periodType === periodType
  );

  const fetchDebts = async () => {
    try {
      setLoadingDebts(true);
      const res = await api.get("/debts");
      setDebts(res.data || []);
    } catch (err) {
      console.error("❌ Error al obtener deudas:", err);
    } finally {
      setLoadingDebts(false);
    }
  };

  // Cargar deudas cuando entras en la pestaña "Deudas"
  useFocusEffect(
    useCallback(() => {
      if (view === "debts") {
        fetchDebts();
      }
    }, [view])
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* HEADER */}
      <View className="px-5 pb-2">
        <AppHeader title="Finanzas" showProfile={false} />
      </View>

      {/* SELECTOR PRINCIPAL */}
      <View className="flex-row mx-5 bg-gray-100 rounded-2xl p-1 mb-3">
        {[
          { key: "budgets", label: "Presupuestos" },
          { key: "goals", label: "Objetivos" },
          { key: "debts", label: "Deudas" },
        ].map((item) => {
          const active = view === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => setView(item.key as any)}
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

      {/* SELECTOR DE PERIODO (solo Presupuestos) */}
      {view === "budgets" && (
        <View className="flex-row mx-5 bg-gray-100 rounded-2xl p-1 mb-4">
          {[
            { key: "daily" as PeriodType, label: "Día" },
            { key: "weekly" as PeriodType, label: "Semana" },
            { key: "monthly" as PeriodType, label: "Mes" },
            { key: "yearly" as PeriodType, label: "Año" },
          ].map((item) => {
            const active = periodType === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setPeriodType(item.key)}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 14,
                  backgroundColor: active ? "#e5f0ff" : "transparent",
                }}
              >
                <Text
                  style={{
                    textAlign: "center",
                    fontWeight: "500",
                    fontSize: 13,
                    color: active ? colors.primary : "gray",
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* CONTENIDO */}
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ============================ */}
        {/*         PRESUPUESTOS         */}
        {/* ============================ */}
        {view === "budgets" && (
          <>
            {filteredBudgets.length === 0 && (
              <Text className="text-center text-gray-400 mt-10">
                No hay presupuestos para este periodo.
              </Text>
            )}

            {filteredBudgets.map((b) => {
              const hasCategory = !!b.category;

              const title = hasCategory
                ? b.category.name
                : b.name || "Presupuesto general";

              const icon = hasCategory ? b.category.emoji : "wallet-outline";

              const color = hasCategory
                ? b.category.color || colors.primary
                : colors.primary;

              return (
                <BudgetGoalCard
                  key={b.id}
                  title={title}
                  icon={icon}
                  total={b.limit}
                  current={b.spent ?? 0}
                  color={color}
                  onPress={() =>
                    navigation.navigate("BudgetTransactions", {
                      budgetName: title,
                      budgetEmoji: icon,
                      budgetColor: color,
                      budgetLimit: b.limit,
                      budgetSpent: b.spent,
                      categoryName: b.category?.name,
                      type: "expense",
                      periodType,
                    })
                  }
                />
              );
            })}

            <TouchableOpacity
              onPress={() =>
                navigation.navigate("BudgetCreate", {
                  periodType,
                })
              }
              className="py-2 rounded-xl mt-1 mb-10"
              style={{
                borderWidth: 1,
                borderColor: "#CBD5E1",
                backgroundColor: "white",
              }}
            >
              <Text className="text-center text-gray-600 font-medium">
                + Añadir presupuesto
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ============================ */}
        {/*           OBJETIVOS          */}
        {/* ============================ */}
        {view === "goals" && (
          <>
            {mockGoals.length === 0 && (
              <Text className="text-center text-gray-400 mt-20">
                No tienes objetivos creados.
              </Text>
            )}

            {mockGoals.map((g) => (
              <BudgetGoalCard
                key={g.id}
                title={g.name}
                icon={g.emoji || "flag-outline"}
                total={g.targetAmount}
                current={g.savedAmount}
                color={g.color || colors.primary}
                onPress={() =>
                  navigation.navigate("BudgetTransactions", {
                    budgetName: g.name,
                    budgetEmoji: g.emoji || "flag-outline",
                    budgetColor: g.color || colors.primary,
                    budgetLimit: g.targetAmount,
                    budgetSpent: g.savedAmount,
                    categoryName: undefined,
                    type: "expense",
                    periodType,
                  })
                }
              />
            ))}

            <TouchableOpacity
              onPress={() => navigation.navigate("GoalCreate")}
              className="py-2 rounded-xl mt-1 mb-10"
              style={{
                borderWidth: 1,
                borderColor: "#CBD5E1",
                backgroundColor: "white",
              }}
            >
              <Text className="text-center text-gray-600 font-medium">
                + Añadir objetivo
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ============================ */}
        {/*             DEUDAS           */}
        {/* ============================ */}
        {view === "debts" && (
          <>
            {loadingDebts ? (
              <ActivityIndicator
                size="large"
                color={colors.primary}
                style={{ marginTop: 40 }}
              />
            ) : debts.length === 0 ? (
              <Text className="text-center text-gray-400 mt-20">
                No tienes deudas registradas.
              </Text>
            ) : (
              debts.map((d) => {
                const total = d.totalAmount;
                const paid =
                  d.payed != null
                    ? d.payed
                    : Math.max(0, Math.min(total, total - d.remainingAmount));

                return (
                  <BudgetGoalCard
                    key={d.id}
                    title={d.name}
                    icon={d.emoji || "💸"}
                    total={total}
                    current={paid}
                    color={d.color || colors.primary}
                    onPress={() =>
                      navigation.navigate("DebtDetail", {
                        debtId: d.id,
                      })
                    }
                  />
                );
              })
            )}

            <TouchableOpacity
              onPress={() => navigation.navigate("DebtForm")}
              className="py-2 rounded-xl mt-1 mb-10"
              style={{
                borderWidth: 1,
                borderColor: "#CBD5E1",
                backgroundColor: "white",
              }}
            >
              <Text className="text-center text-gray-600 font-medium">
                + Añadir deuda
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
