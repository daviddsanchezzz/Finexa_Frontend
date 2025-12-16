import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from "../../../api/api";
import { colors } from "../../../theme/theme";
import TransactionsList from "../../../components/TransactionsList";
import BudgetGoalCard from "../../../components/BudgetGoalCard";

export default function BudgetTransactionsScreen({ route, navigation }: any) {
  const {
    budgetId,
    budgetName,
    budgetEmoji,
    budgetColor,
    budgetLimit,
    budgetSpent,
    categoryName,
    categoryId,
    walletId,
    periodType,
    range,
    type,
    dateFrom,
    dateTo,
  } = route.params;

  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);

  const fetchTx = async () => {
    try {
      setLoading(true);

      const params: any = {
        dateFrom: range?.from || dateFrom,
        dateTo: range?.to || dateTo,
        type: type || "expense",
        excludeFromStats: false,
        isRecurring: false,
        active: true,
      };

      if (categoryId) params.categoryId = categoryId;
      if (walletId) params.walletId = walletId;

      const res = await api.get("/transactions", { params });

      setTransactions(res.data || []);
    } catch (e) {
      console.log("❌ Error cargando transacciones por presupuesto", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTx();
  }, []);

  // ✅ Métricas debajo del resumen
  const txCount = transactions.length;

  const txSum = useMemo(() => {
    return (transactions || []).reduce((acc: number, tx: any) => {
      const amount = Number(tx.amount ?? tx.value ?? 0); // por si tu backend usa otro nombre
      if (!Number.isFinite(amount)) return acc;
      return acc + amount;
    }, 0);
  }, [transactions]);

  const signedSum = useMemo(() => {
    // Si estás viendo gastos, lo mostramos negativo (más intuitivo en presupuesto)
    const isExpense = (type || "expense") === "expense";
    return isExpense ? -Math.abs(txSum) : Math.abs(txSum);
  }, [txSum, type]);

  const formatMoney = (n: number) => {
    const value = Number(n || 0);
    const sign = value < 0 ? "-" : "";
    const abs = Math.abs(value);
    // Formato simple (sin Intl por compat RN); ajusta si ya tienes util de currency
    return `${sign}${abs.toFixed(2)}€`;
  };

  const handleEdit = () => {
    if (!budgetId) {
      Alert.alert("Error", "No se recibió budgetId. Pásalo desde la pantalla anterior.");
      return;
    }

    navigation.navigate("BudgetCreate", {
      periodType: periodType,
      editData: {
        id: budgetId,
        name: budgetName,
        limit: Number(budgetLimit) || 0,
        period: periodType,
        startDate: range?.from || undefined,
        categoryId: categoryId || null,
        walletId: walletId || null,
      },
    });
  };

  const handleDelete = () => {
    if (!budgetId) {
      Alert.alert("Error", "No se recibió budgetId. Pásalo desde la pantalla anterior.");
      return;
    }

    Alert.alert(
      "Eliminar presupuesto",
      "¿Seguro que quieres eliminar este presupuesto? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await api.delete(`/budgets/${budgetId}`);
              Alert.alert("Eliminado", "Presupuesto eliminado correctamente.");
              navigation.goBack();
            } catch (e) {
              console.log("❌ Error eliminando presupuesto", e);
              Alert.alert("Error", "No se pudo eliminar el presupuesto.");
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* HEADER: Back + acciones texto a la derecha */}
      <View className="flex-row items-center justify-between px-5 py-3">
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>

        <View className="flex-row items-center">
          <TouchableOpacity onPress={handleEdit} activeOpacity={0.85} className="mr-4">
            <Text className="text-[14px] font-semibold text-text">Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDelete} activeOpacity={0.85}>
            <Text className="text-[14px] font-semibold" style={{ color: "#ef4444" }}>
              Eliminar
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* CONTENIDO */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <View className="flex-1 px-5">
          {/* RESUMEN FIJO (NO SCROLL) */}
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

{/* ✅ KPI BAR (más vistosa) */}
{/* ✅ Resumen simple y bonito */}
<View className="flex-row items-center justify-between mb-3">
  {/* Chip: nº transacciones */}
  <View
    className="flex-row items-center px-3 py-2 rounded-full border"
    style={{
      backgroundColor: "rgba(0,0,0,0.03)",
      borderColor: "rgba(0,0,0,0.06)",
    }}
  >
    <Ionicons name="receipt-outline" size={16} color={colors.text} />
    <Text className="ml-2 text-[13px] text-text font-semibold">
      {txCount}
    </Text>
    <Text className="ml-1 text-[13px] text-muted-foreground">
      transacc.
    </Text>
  </View>

  {/* Chip: total */}
  <View
    className="flex-row items-center px-3 py-2 rounded-full border"
    style={{
      backgroundColor: signedSum < 0 ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
      borderColor: signedSum < 0 ? "rgba(239,68,68,0.20)" : "rgba(34,197,94,0.20)",
    }}
  >
    <Text className="text-[13px] text-muted-foreground mr-2">Total</Text>
    <Text
      className="text-[13px] font-semibold"
    >
      {formatMoney(signedSum)}
    </Text>
  </View>
</View>


          {/* SOLO EL LISTADO SCROLLEA */}
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 30 }}
          >
            <TransactionsList transactions={transactions} navigation={navigation} onDeleted={fetchTx} />
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}
