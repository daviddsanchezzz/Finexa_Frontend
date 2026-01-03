// src/screens/Debts/DebtsHomeScreen.tsx
import React, { useState, useMemo, useCallback } from "react";
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
import api from "../../../../api/api";
import AppHeader from "../../../../components/AppHeader";
import { colors } from "../../../../theme/theme";
import BudgetGoalCard from "../../../../components/BudgetGoalCard";

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

type FilterType = "active" | "paid" | "all";

export default function DebtsHomeScreen({ navigation }: any) {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>("active");

  const fetchDebts = async () => {
    try {
      setLoading(true);
      const res = await api.get("/debts");
      setDebts(res.data || []);
    } catch (err) {
      console.error("❌ Error al obtener deudas:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDebts();
    }, [])
  );

  const filteredDebts = useMemo(() => {
    if (filter === "all") return debts;
    if (filter === "active") return debts.filter((d) => d.status === "active");
    if (filter === "paid") return debts.filter((d) => d.status === "paid");
    return debts;
  }, [debts, filter]);

  // Resumen de deuda
  const summary = useMemo(() => {
    const activeDebts = debts.filter((d) => d.status === "active");

    const totalDebt = activeDebts.reduce(
      (sum, d) => sum + (d.totalAmount || 0),
      0
    );
    const totalRemaining = activeDebts.reduce(
      (sum, d) => sum + (d.remainingAmount || 0),
      0
    );
    const totalMonthlyPayment = activeDebts.reduce(
      (sum, d) => sum + (d.monthlyPayment || 0),
      0
    );

    const iOwe = activeDebts
      .filter((d) => d.direction === "i_ow")
      .reduce((sum, d) => sum + (d.remainingAmount || 0), 0);

    const theyOwe = activeDebts
      .filter((d) => d.direction === "they_owe")
      .reduce((sum, d) => sum + (d.remainingAmount || 0), 0);

    return {
      totalDebt,
      totalRemaining,
      totalMonthlyPayment,
      iOwe,
      theyOwe,
      activeCount: activeDebts.length,
      totalCount: debts.length,
    };
  }, [debts]);

  const formatCurrency = (value: number) => {
    if (isNaN(value)) return "0 €";
    return `${value.toFixed(0)} €`;
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* HEADER */}
      <View className="px-5 pb-3">
        <AppHeader
          title="Deudas"
          showProfile={false}
          showDatePicker={false}
          showBack={true}
        />
      </View>

      {/* RESUMEN SUPERIOR */}
      <View className="px-5 mb-3">
        {/* TARJETA RESUMEN (ESTILO OSCURO) */}
        <View
            className="rounded-3xl p-4 mb-2"
            style={{
            backgroundColor: colors.primary,
            }}
        >
          <View className="flex-row justify-between items-center mb-3">
            <View>
              <Text className="text-xs text-gray-300 mb-1">
                Deuda total activa
              </Text>
              <Text className="text-2xl font-semibold text-white">
                {formatCurrency(summary.totalDebt)}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-xs text-gray-300 mb-1">
                Pendiente por pagar
              </Text>
                <Text className="text-lg font-semibold text-white">
                {formatCurrency(summary.totalRemaining)}
                </Text>
            </View>
          </View>

          <View className="flex-row justify-between mt-1">
            <View>
              <Text className="text-[11px] text-gray-300">
                Cuota mensual estimada
              </Text>
              <Text className="text-sm font-medium text-gray-100">
                {formatCurrency(summary.totalMonthlyPayment)}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-[11px] text-gray-300">
                Deudas activas
              </Text>
              <Text className="text-sm font-medium text-gray-100">
                {summary.activeCount} / {summary.totalCount}
              </Text>
            </View>
          </View>
        </View>

        {/* TARJETA SECUNDARIA: YO DEBO / ME DEBEN */}
        <View className="flex-row mb-2">
          <View
            className="flex-1 mr-1.5 rounded-2xl p-3"
            style={{ backgroundColor: "white", borderWidth: 1, borderColor: "#E5E7EB" }}
          >
            <Text className="text-[11px] text-gray-500 mb-0.5">Yo debo</Text>
            <Text className="text-sm font-semibold text-rose-600">
              {formatCurrency(summary.iOwe)}
            </Text>
          </View>
          <View
            className="flex-1 ml-1.5 rounded-2xl p-3"
            style={{ backgroundColor: "white", borderWidth: 1, borderColor: "#E5E7EB" }}
          >
            <Text className="text-[11px] text-gray-500 mb-0.5">Me deben</Text>
            <Text className="text-sm font-semibold text-emerald-600">
              {formatCurrency(summary.theyOwe)}
            </Text>
          </View>
        </View>
      </View>

      {/* FILTROS */}
      <View className="px-5 mb-2">
        <View className="flex-row rounded-2xl bg-slate-50 p-1">
          {[
            { key: "active" as FilterType, label: "Activas" },
            { key: "paid" as FilterType, label: "Pagadas" },
            { key: "all" as FilterType, label: "Todas" },
          ].map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
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
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* LISTA DE DEUDAS */}
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginTop: 40 }}
          />
        ) : filteredDebts.length === 0 ? (
          <Text className="text-center text-gray-400 mb-4 text-sm">
            No hay deudas en este estado.
          </Text>
        ) : (
          filteredDebts.map((d) => {
            const total = d.totalAmount;
            const paid =
              d.payed != null
                ? d.payed
                : Math.max(0, Math.min(total, total - d.remainingAmount));

            const statusLabel =
              d.status === "active"
                ? "Activa"
                : d.status === "paid"
                ? "Pagada"
                : "Cerrada";

            const statusColor =
              d.status === "active"
                ? "#F97316"
                : d.status === "paid"
                ? "#22C55E"
                : "#6B7280";

            const directionLabel =
              d.direction === "i_ow" ? "Yo debo" : "Me deben";

            const directionColor =
              d.direction === "i_ow" ? "#EF4444" : "#22C55E";

            return (
              <View key={d.id} className="mb-2">
                <BudgetGoalCard
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

              </View>
            );
          })
        )}

        {/* BOTÓN AÑADIR DEUDA (igual que Añadir presupuesto) */}
          <TouchableOpacity
            onPress={() => navigation.navigate("DebtForm")}
            className="flex-row items-center justify-center py-2.5 rounded-2xl"
            style={{
              backgroundColor: "#F3F4F6",
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
            activeOpacity={0.9}
          >
            <Ionicons name="add-outline" size={18} color="#64748B" />
            <Text className="text-sm text-slate-500 font-medium ml-1.5">
              Añadir deuda
            </Text>
          </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
