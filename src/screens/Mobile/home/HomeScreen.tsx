import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { colors } from "../../../theme/theme";
import AppHeader from "../../../components/AppHeader";
import TransactionsList from "../../../components/TransactionsList";
import WalletSelectorModal from "../../../components/WalletSelectorModal";
import api from "../../../api/api";
import DateFilterModal from "../../../components/DateFilterModal";
import { ScrollView } from "react-native";

export default function HomeScreen({ navigation }: any) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<any | null>(null);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [dateModalVisible, setDateModalVisible] = useState(false);

  function isMonthlyReportBannerVisible(now = new Date()) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0); // día 1 00:00 local
    const end = new Date(now.getFullYear(), now.getMonth(), 2, 0, 0, 0, 0);   // día 2 00:00 local
    return now >= start && now < end;
  }

  const showMonthlyReportBanner = isMonthlyReportBannerVisible();

  const [dateLabel, setDateLabel] = useState(() => {
    const now = new Date();
    return now
      .toLocaleString("es-ES", { month: "long", year: "numeric" })
      .replace("de ", "");
  });

  // 🔵 Mostrar SIEMPRE coma como decimal → "12,34"
  const formatEuro = (n: number) => n.toFixed(2).replace(".", ",");

  // FETCH
  const fetchTransactions = async () => {
    try {
      if (!refreshing) setLoading(true);

      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const params: any = {
        dateFrom: firstDay.toISOString(),
        dateTo: lastDay.toISOString(),
      };

      if (selectedWallet?.id) params.walletId = selectedWallet.id;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const res = await api.get("/transactions", { params });

      const filtered = res.data
        .filter((tx: any) => tx.type !== "transfer")
        .filter((tx: any) => tx.isRecurring === false)
        .filter((tx: any) => tx.excludeFromStats !== true);

      const sorted = filtered.sort(
        (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setTransactions(sorted);
    } catch (err) {
      console.error("❌ Error al obtener transacciones:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Ejecutar fetch al entrar
  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [selectedWallet, dateFrom, dateTo])
  );

  // CÁLCULOS
  const toSigned = (tx: any) =>
    tx.type === "expense" ? -Math.abs(tx.amount) : Math.abs(tx.amount);

  const totalBalance = transactions.reduce((acc, tx) => acc + toSigned(tx), 0);
  const totalIncome = transactions
    .filter((tx) => tx.type === "income")
    .reduce((acc, tx) => acc + Math.abs(tx.amount), 0);
  const totalExpense = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((acc, tx) => acc + Math.abs(tx.amount), 0);

  // UI
  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* HEADER */}
      <View className="px-5 pb-2">
        <AppHeader
          onOpenDateModal={() => setDateModalVisible(true)}
          dateLabel={dateLabel}
          title="Inicio"
          showProfile={true}
          showBack={false}
        />

        {/* TARJETA PRINCIPAL */}
        <View className="bg-primary rounded-3xl p-6 shadow-md mb-4 items-center">
          <TouchableOpacity
            className="flex-row items-center mb-2"
            onPress={() => setWalletModalVisible(true)}
          >
            <Text className="text-white/85 text-lg font-semibold mr-2.5">
              {selectedWallet ? selectedWallet.name : "Todas las carteras"}
            </Text>
            <Ionicons name="chevron-down-outline" size={17} color="white" />
          </TouchableOpacity>

          <Text className="text-white text-[29px] font-extrabold mt-1">
            {formatEuro(totalBalance)}€
          </Text>
        </View>

        {/* Indicadores */}
        <View className="flex-row justify-between mb-1">
          <View className="flex-1 items-center mr-2.5">
            <Text className="text-[13px] text-gray-400 tracking-wider font-medium">
              INGRESOS
            </Text>
            <Text className="text-green-600 text-[18px] font-semibold mt-0.5">
              {formatEuro(totalIncome)}€
            </Text>
          </View>

          <View className="flex-1 items-center ml-2.5">
            <Text className="text-[13px] text-gray-400 tracking-wider font-medium">
              GASTOS
            </Text>
            <Text className="text-red-600 text-[18px] font-semibold mt-0.5">
              {formatEuro(totalExpense)}€
            </Text>
          </View>
        </View>

{/* 🟡 Aviso informe mensual listo */}
{showMonthlyReportBanner && (

<View className="mt-3">
  <View
    className="w-full px-4 py-3 rounded-2xl"
    style={{
      backgroundColor: "#FFFBEB", // amber-50
      borderWidth: 1,
      borderColor: "#FDE68A", // amber-200
    }}
  >
<TouchableOpacity
  activeOpacity={0.85}
  onPress={() => navigation.navigate("Reports")}
>
  <View className="flex-row items-start">
    <Ionicons
      name="document-text-outline"
      size={18}
      color="#B45309" // amber-700
      style={{ marginTop: 1 }}
    />
    <View className="ml-3 flex-1">
      <Text className="text-[13px] font-semibold text-[#92400E]">
        Informe mensual disponible
      </Text>
      <Text className="text-[12px] text-[#92400E] opacity-80 mt-0.5 leading-4">
        El informe de <Text className="font-semibold">{dateLabel}</Text> ya está
        listo.
      </Text>
    </View>
  </View>
</TouchableOpacity>
  </View>
</View>
)}

      </View>

      {/* LISTA */}
      <ScrollView
        className="flex-1 px-5 pt-0 mb-8"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 70 }}
      >
        {loading ? (
          <ActivityIndicator
            color={colors.primary}
            size="large"
            style={{ marginTop: 40 }}
          />
        ) : (
          <TransactionsList
            transactions={transactions}
            navigation={navigation}
            onDeleted={fetchTransactions}
          />
        )}
      </ScrollView>

      {/* MODALES */}
      <WalletSelectorModal
        visible={walletModalVisible}
        onClose={() => setWalletModalVisible(false)}
        onSelect={(wallet) => setSelectedWallet(wallet)}
        selectedWallet={selectedWallet}
      />

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
