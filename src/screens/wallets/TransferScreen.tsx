// --- TransfersScreen.tsx ---

import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import api from "../../api/api";
import TransactionsList from "../../components/TransactionsList";
import { colors } from "../../theme/theme";
import AppHeader from "../../components/AppHeader";
import DateFilterModal from "../../components/DateFilterModal";

export default function TransfersScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [transfers, setTransfers] = useState([]);
  const [dateModalVisible, setDateModalVisible] = useState(false);

  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);

  const [dateLabel, setDateLabel] = useState(() => {
    const now = new Date();
    return now
      .toLocaleString("es-ES", { month: "long", year: "numeric" })
      .replace("de ", "");
  });

  const fetchTransfers = async () => {
    try {
      setLoading(true);

      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      const params: any = {
        type: "transfer",
        dateFrom: dateFrom || firstDay,
        dateTo: dateTo || lastDay
      };

      const res = await api.get("/transactions", { params });

      const filtered = res.data
        .filter((tx: any) => tx.isRecurring === false);   // 👈 excluir plantillas
      const sorted = filtered.sort(
        (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setTransfers(sorted);

    } catch (e) {
      console.error("❌ Error:", e);
    } finally {
      setLoading(false);
    }
  };

  // ⭐ Cada vez que cambian las fechas → recargar datos
  useEffect(() => {
    fetchTransfers();
  }, [dateFrom, dateTo]);

  // ⭐ Ejecutar primera carga
  useEffect(() => {
    fetchTransfers();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background">
        <View className="mr-4">
            <AppHeader
                title="Transferencias"
                showProfile={false}
                showBack={true}
                onOpenDateModal={() => setDateModalVisible(true)}
                dateLabel={dateLabel}
            />
        </View>
      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 40 }}
        />
      ) : transfers.length === 0 ? (
        <View className="items-center mt-20">
          <Text className="text-gray-400 text-[15px]">No hay transferencias</Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 24 }}>
          <TransactionsList
            transactions={transfers}
            onDeleted={fetchTransfers}
            navigation={navigation}
          />
        </View>
      )}

      <DateFilterModal
        visible={dateModalVisible}
        onClose={() => setDateModalVisible(false)}
        onSelect={({ from, to, label }) => {
          setDateFrom(from);
          setDateTo(to);
          setDateLabel(label);
        }}
      />
    </SafeAreaView>
  );
}
