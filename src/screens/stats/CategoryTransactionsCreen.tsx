import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from "../../api/api";
import { colors } from "../../theme/theme";
import TransactionsList from "../../components/TransactionsList";
import BottomNav from "../../components/BottomTab";

export default function CategoryTransactionsScreen({ route, navigation }: any) {
  const { categoryName, categoryEmoji, categoryColor, type, dateFrom, dateTo } =
    route.params;

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

      const filtered = res.data
        .filter((tx: any) => !tx.isRecurring)                                    // excluir plantillas
        .filter((tx: any) => tx.category?.name === categoryName)                // filtrar categoría
        .filter((tx: any) => tx.type === type);                                 // filtrar tipo

      setTransactions(filtered);
    } catch (e) {
      console.log("❌ Error cargando transacciones por categoría", e);
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

        <View className="flex-row items-center">
          <View
            className="w-10 h-10 rounded-xl items-center justify-center mr-3"
            style={{ backgroundColor: categoryColor }}
          >
            <Text style={{ fontSize: 22 }}>{categoryEmoji}</Text>
          </View>

          <Text className="text-[20px] font-bold text-text">
            {categoryName}
          </Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 50 }}
        />
      ) : (
        <View className="px-5 flex-1">
          <TransactionsList
            transactions={transactions}
            navigation={navigation}
            onDeleted={fetchTx}
          />
        </View>
      )}

      
    </SafeAreaView>
     );
}
