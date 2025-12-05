// src/screens/Budgets/BudgetsHomeScreen.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../../components/AppHeader";
import { colors } from "../../../theme/theme";
import BudgetGoalCard from "../../../components/BudgetGoalCard";

type PeriodType = "daily" | "weekly" | "monthly" | "yearly";

interface Budget {
  id: number;
  name: string;
  periodType: PeriodType;
  limit: number;
  spent: number;
  category?: {
    name: string;
    emoji?: string;
    color?: string;
  };
}

// MOCKS
const mockBudgets: Budget[] = [
  {
    id: 1,
    name: "Comida",
    periodType: "monthly",
    limit: 200,
    spent: 120,
    category: { name: "Comida", emoji: "🍔", color: "#f97316" },
  },
  {
    id: 2,
    name: "Transporte",
    periodType: "monthly",
    limit: 80,
    spent: 30,
    category: { name: "Transporte", emoji: "🚌", color: "#22c55e" },
  },
  {
    id: 3,
    name: "Café diario",
    periodType: "daily",
    limit: 5,
    spent: 3,
    category: { name: "Café", emoji: "☕️", color: "#a855f7" },
  },
  {
    id: 4,
    name: "Salida finde",
    periodType: "weekly",
    limit: 60,
    spent: 40,
    category: { name: "Ocio", emoji: "🎉", color: "#3b82f6" },
  },
  {
    id: 5,
    name: "Ahorro anual",
    periodType: "yearly",
    limit: 2000,
    spent: 750,
    category: { name: "Ahorro", emoji: "💰", color: "#16a34a" },
  },
];

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

  const filteredBudgets = useMemo(
    () => mockBudgets.filter((b) => b.periodType === periodType),
    [periodType]
  );

  const summary = useMemo(() => {
    const totalLimit = filteredBudgets.reduce(
      (sum, b) => sum + (b.limit || 0),
      0
    );
    const totalSpent = filteredBudgets.reduce(
      (sum, b) => sum + (b.spent || 0),
      0
    );
    const remaining = Math.max(totalLimit - totalSpent, 0);

    return {
      totalLimit,
      totalSpent,
      remaining,
      count: filteredBudgets.length,
    };
  }, [filteredBudgets]);

  const periodLabel = getPeriodLabel(periodType);

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

      {/*  + RESUMEN */}
      <View className="px-5 mb-3">
        {/* RESUMEN COMO BUDGETGOALCARD (COLORES INVERTIDOS) */}
        <View className="mb-2">
          <BudgetGoalCard
            title={`Resumen ${periodLabel}`}
            icon="📊"
            total={summary.totalLimit}
            current={summary.totalSpent}
            color="white" // <-- Barra blanca
            backgroundColor={colors.primary} // <-- Fondo azul intenso
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

      {/* LISTA DE PRESUPUESTOS */}
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {filteredBudgets.length === 0 ? (
          <Text className="text-center text-gray-400 mt-16 text-sm">
            No tienes presupuestos para este periodo.
          </Text>
        ) : (
          filteredBudgets.map((b) => {
            const hasCategory = !!b.category;
            const title = hasCategory ? b.category!.name : b.name;
            const icon = hasCategory ? b.category!.emoji || "💰" : "💰";
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
                      categoryName: b.category?.name,
                      periodType,
                    })
                  }
                />
              </View>
            );
          })
        )}

        {/* BOTÓN AÑADIR PRESUPUESTO (discreto) */}
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
    </SafeAreaView>
  );
}
