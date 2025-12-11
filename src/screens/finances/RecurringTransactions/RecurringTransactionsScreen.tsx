// src/screens/Finances/RecurringTransactionsScreen.tsx
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { colors } from "../../../theme/theme";
import api from "../../../api/api";
import AppHeader from "../../../components/AppHeader";

interface Category {
  id: number;
  name: string;
  emoji?: string | null;   // 👈 emoji
  color?: string | null;   // 👈 color de fondo
}

interface Subcategory {
  id: number;
  name: string;
}

interface RecurringTransaction {
  id: number;
  type: "income" | "expense" | "transfer";
  amount: number;
  description?: string | null;
  date: string; // próxima ejecución
  isRecurring: boolean;
  recurrence: "daily" | "weekly" | "monthly" | "yearly" | string | null;
  active: boolean;
  category?: Category | null;
  subcategory?: Subcategory | null;
}

export default function RecurringTransactionsScreen({ navigation }: any) {
  const [transactions, setTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const formatEuro = (n: number) => n.toFixed(2).replace(".", ",");

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Sin fecha";
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatRecurrence = (recurrence: RecurringTransaction["recurrence"]) => {
    switch (recurrence) {
      case "daily":
        return "Diaria";
      case "weekly":
        return "Semanal";
      case "monthly":
        return "Mensual";
      case "yearly":
        return "Anual";
      default:
        return "Recurrente";
    }
  };

  const getTypeColor = (type: RecurringTransaction["type"]) => {
    if (type === "income") return "#16A34A";
    if (type === "expense") return "#DC2626";
    return colors.text;
  };

  const getPrimaryText = (tx: RecurringTransaction) => {
    if (tx.description?.trim()) return tx.description.trim();
    if (tx.subcategory?.name) return tx.subcategory.name;
    if (tx.category?.name) return tx.category.name;
    return "Transacción recurrente";
  };

  // Línea secundaria: "Semanal · Próximo pago: 10 ene 2026"
  const getSecondaryText = (tx: RecurringTransaction) => {
    const recurrenceLabel = formatRecurrence(tx.recurrence);
    const nextDate = formatDate(tx.date);
    return `${recurrenceLabel} · Próximo pago: ${nextDate}`;
  };

  const fetchRecurring = async () => {
    try {
      if (!refreshing) setLoading(true);

        const res = await api.get("/transactions", {
        params: { isRecurring: true }, // 👈 solo plantillas
        });

        const templates: RecurringTransaction[] = (res.data || []).sort(
        (a: any, b: any) =>
            new Date(a.date).getTime() - new Date(b.date).getTime() // más próximo primero
        );

        setTransactions(templates);
    } catch (e) {
      console.error("❌ Error cargando transacciones recurrentes:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRecurring();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecurring();
  };

  const handlePressTx = (tx: RecurringTransaction) => {
    // Ajusta esta navegación a tu flujo real de edición de series
    navigation.navigate("Add", { editData: tx, scope: "series" });
  };

  const renderIcon = (tx: RecurringTransaction) => {
    return (
      <View
        className="w-9 h-9 rounded-lg items-center justify-center"
        style={{ backgroundColor: tx.category?.color || "#f3f4f6" }}
      >
        <Text className="text-[18px]">
          {tx.category?.emoji || "💸"}
        </Text>
      </View>
    );
  };

  const renderAmount = (tx: RecurringTransaction) => {
    const color = getTypeColor(tx.type);

    if (tx.type === "transfer") {
      return (
        <Text
          className="text-[16px] font-semibold"
          style={{ color }}
        >
          {formatEuro(tx.amount)} €
        </Text>
      );
    }

    return (
      <Text
        className="text-[16px] font-semibold"
        style={{ color }}
      >
        {tx.type === "income"
          ? `+${formatEuro(tx.amount)} €`
          : `-${formatEuro(tx.amount)} €`}
      </Text>
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#F3F4F6" }}>
      {/* HEADER */}
      <View className="px-5 pb-2">
        <AppHeader
          title="Transacciones recurrentes"
          showProfile={false}
          showDatePicker={false}
          showBack={true}
        />
      </View>

      {/* BANNER INTRO */}
      <View className="px-5 mb-3">
        <View
          style={{
            backgroundColor: "#F3E8FF",
            borderRadius: 18,
            paddingVertical: 10,
            paddingHorizontal: 14,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              backgroundColor: "#FAF5FF",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Ionicons
              name="repeat-outline"
              size={16}
              color="#A855F7"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#1F2937",
                marginBottom: 2,
              }}
            >
              Pagos programados
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: "#6B7280",
              }}
            >
              Consulta de un vistazo cuándo se repetirán tus gastos e ingresos.
            </Text>
          </View>
        </View>
      </View>

      {/* LISTA (similar a TransactionsList pero sin agrupar por día) */}
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 4 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <ActivityIndicator
            color={colors.primary}
            size="large"
            style={{ marginTop: 40 }}
          />
        ) : transactions.length === 0 ? (
          <View className="items-center mt-10">
            <Text className="text-gray-400 text-[15px] text-center px-8">
              No hay transacciones recurrentes todavía
            </Text>
          </View>
        ) : (
          <View className="mt-3">
            {transactions.map((tx) => (
              <View key={tx.id} style={{ marginBottom: 6 }}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handlePressTx(tx)}
                  className="flex-row justify-between items-center py-1.5 px-1.5 bg-background rounded-xl"
                >
                  {/* IZQUIERDA: icono + textos, igual estilo que TransactionsList */}
                  <View className="flex-row items-center">
                    {renderIcon(tx)}

                    <View className="ml-3">
                      {/* Nombre principal: description || subcat || cat */}
                      <Text className="text-[16px] font-semibold text-text" numberOfLines={1}>
                        {getPrimaryText(tx)}
                      </Text>

                      {/* Secundaria: recurrencia + próximo pago */}
                      <Text className="text-gray-400 text-[12px]" numberOfLines={2}>
                        {getSecondaryText(tx)}
                      </Text>
                    </View>
                  </View>

                  {/* DERECHA: importe */}
                  {renderAmount(tx)}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
