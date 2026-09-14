// src/screens/Goals/GoalsHomeScreen.tsx
import React, { useMemo } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../../../components/AppHeader";
import AddButton from "../../../../components/AddButton";
import { colors } from "../../../../theme/theme";
import BudgetGoalCard from "../../../../components/BudgetGoalCard";

interface Goal {
  id: number;
  name: string;
  emoji?: string;
  color?: string;
  targetAmount: number;
  savedAmount: number;
}

// MOCKS de objetivos
const mockGoals: Goal[] = [
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

export default function GoalsHomeScreen({ navigation, isPinnedModuleTab = false }: any) {
  const goals = mockGoals; // luego aquí meterás datos del backend

  const summary = useMemo(() => {
    if (!goals.length) {
      return {
        totalTarget: 0,
        totalSaved: 0,
        remaining: 0,
        count: 0,
      };
    }

    const totalTarget = goals.reduce(
      (sum, g) => sum + (g.targetAmount || 0),
      0
    );
    const totalSaved = goals.reduce(
      (sum, g) => sum + (g.savedAmount || 0),
      0
    );
    const remaining = Math.max(totalTarget - totalSaved, 0);

    return {
      totalTarget,
      totalSaved,
      remaining,
      count: goals.length,
    };
  }, [goals]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* HEADER */}
      <View className="px-5 pb-3">
        <AppHeader
          title="Objetivos"
          showProfile={false}
          showDatePicker={false}
          showBack={!isPinnedModuleTab}
        />
      </View>

      {/* RESUMEN */}
      <View className="px-5 mb-3">
        {/* RESUMEN COMO BUDGETGOALCARD (COLORES INVERTIDOS) */}
        <View className="mb-2">
          <BudgetGoalCard
            title="Resumen de objetivos"
            icon="🎯"
            total={summary.totalTarget}
            current={summary.totalSaved}
            color="white" // barra blanca
            backgroundColor={colors.primary} // fondo azul
            titleColor="white"
            subtitleColor="rgba(255,255,255,0.8)"
          />

          {summary.totalTarget > 0 && (
            <Text
              className="text-[11px] mt-1 ml-1"
              style={{ color: "rgba(55,65,81,0.9)" }}
            >
              Te queda{" "}
              <Text style={{ fontWeight: "600" }}>
                {summary.remaining.toFixed(0)} €
              </Text>{" "}
              para completar tus {summary.count} objetivo
              {summary.count === 1 ? "" : "s"}.
            </Text>
          )}
        </View>
      </View>

      {/* LISTA DE OBJETIVOS */}
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {goals.length === 0 ? (
          <Text className="text-center text-gray-400 mt-16 text-sm">
            Todavía no tienes objetivos creados.
          </Text>
        ) : (
          goals.map((g) => (
            <View key={g.id} className="mb-3">
              <BudgetGoalCard
                title={g.name}
                icon={g.emoji || "🎯"}
                total={g.targetAmount}
                current={g.savedAmount}
                color={g.color || colors.primary}
                onPress={() =>
                  navigation.navigate("BudgetTransactions", {
                    // Reutilizas la misma pantalla de transacciones
                    budgetId: g.id,
                    budgetName: g.name,
                    budgetEmoji: g.emoji || "🎯",
                    budgetColor: g.color || colors.primary,
                    budgetLimit: g.targetAmount,
                    budgetSpent: g.savedAmount,
                    categoryName: undefined,
                    periodType: undefined, // aquí no hay periodo, puedes ignorarlo en esa screen
                    goalId: g.id,
                  })
                }
              />
            </View>
          ))
        )}

        {/* BOTÓN AÑADIR OBJETIVO */}
        <AddButton
          label="Añadir objetivo"
          onPress={() => navigation.navigate("GoalCreate")}
          style={{ justifyContent: "center", alignSelf: "stretch", marginTop: 8 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
