import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from "../../api/api";
import { colors } from "../../theme/theme";
import TransactionsList from "../../components/TransactionsList";
import BudgetGoalCard from "../../components/BudgetGoalCard";

export default function BudgetTransactionsScreen({ route, navigation }: any) {
  const {
    budgetName,
    budgetEmoji,
    budgetColor,
    budgetLimit,
    budgetSpent,
    categoryName,
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
        dateFrom,
        dateTo,
        type,
      };

      const res = await api.get("/transactions", { params });

      const filtered = res.data.filter(
        (tx: any) =>
          tx.category?.name === categoryName && tx.type === type
      );

      setTransactions(filtered);
    } catch (e) {
      console.log("❌ Error cargando transacciones por presupuesto", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTx();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background">

      {/* HEADER */}
      <View className="flex-row items-center px-5 py-3">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
       </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 50 }}
        />
      ) : (
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>

          {/* 🔥 BUDGET CARD ENCIMA DEL LISTADO */}
          <BudgetGoalCard
            title={budgetName}
            icon={budgetEmoji}
            total={Number(budgetLimit) || 0}
            current={Number(budgetSpent) || 0}
            color={budgetColor}
            onPress={() => {}}
            />


          {/* 📌 LISTADO DE TRANSACCIONES */}
          <TransactionsList
            transactions={transactions}
            navigation={navigation}
            onDeleted={fetchTx}
          />

          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
