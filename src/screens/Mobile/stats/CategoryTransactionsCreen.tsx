import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from "../../../api/api";
import { colors } from "../../../theme/theme";
import TransactionsList from "../../../components/TransactionsList";
import CategoryBarList, { type CategoryBarItem } from "../../../components/CategoryBarList";
import { formatEuro as formatEuroBase } from "../../../utils/currency";

const capitalizeLabel = (label: string) => (label ? label.charAt(0).toUpperCase() + label.slice(1) : label);
const formatEuro = (n: number) => `${formatEuroBase(n)} €`;

export default function CategoryTransactionsScreen({ route, navigation }: any) {
  const {
    categoryName,
    categoryEmoji,
    categoryColor,
    subcategoryName,
    type,
    dateFrom,
    dateTo,
  } = route.params;

  const [loading, setLoading] = useState(true);
  // Todas las transacciones del tipo en el periodo (sin filtrar por
  // categoría), para poder calcular el "% de tus gastos/ingresos" de esta
  // categoría sobre el total, no solo sobre sí misma.
  const [allTypeTransactions, setAllTypeTransactions] = useState<any[]>([]);

  const periodLabel = useMemo(() => {
    if (!dateFrom) return "";
    const raw = new Date(dateFrom).toLocaleString("es-ES", { month: "long", year: "numeric" }).replace("de ", "");
    return capitalizeLabel(raw);
  }, [dateFrom]);

  const fetchTx = async () => {
    try {
      setLoading(true);
      const res = await api.get("/transactions", { params: { dateFrom, dateTo, type } });
      const filtered = (res.data || [])
        .filter((tx: any) => !tx.isRecurring)
        .filter((tx: any) => tx.type === type);
      setAllTypeTransactions(filtered);
    } catch (e) {
      console.log("❌ Error cargando transacciones por categoría", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTx();
  }, []);

  const categoryTransactions = useMemo(
    () =>
      allTypeTransactions
        .filter((tx: any) => tx.category?.name === categoryName)
        .filter((tx: any) =>
          subcategoryName ? (tx.subcategory?.name || "Sin subcategoría") === subcategoryName : true
        ),
    [allTypeTransactions, categoryName, subcategoryName]
  );

  const totalForType = useMemo(
    () => allTypeTransactions.reduce((s, tx) => s + Math.abs(tx.amount), 0),
    [allTypeTransactions]
  );

  const categoryTotal = useMemo(
    () => categoryTransactions.reduce((s, tx) => s + Math.abs(tx.amount), 0),
    [categoryTransactions]
  );

  const pctOfTotal = totalForType > 0 ? (categoryTotal / totalForType) * 100 : 0;

  const subcategoryItems: CategoryBarItem[] = useMemo(() => {
    const map: Record<string, { amount: number }> = {};
    categoryTransactions.forEach((tx: any) => {
      const name = tx.subcategory?.name?.trim() || "Sin subcategoría";
      if (!map[name]) map[name] = { amount: 0 };
      map[name].amount += Math.abs(tx.amount);
    });
    return Object.entries(map)
      .map(([name, v]) => ({
        key: name,
        label: name,
        amount: v.amount,
        percent: categoryTotal > 0 ? (v.amount / categoryTotal) * 100 : 0,
        color: categoryColor,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [categoryTransactions, categoryTotal, categoryColor]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-5 py-3">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>

        <View className="flex-row items-center">
          <View className="w-9 h-9 rounded-lg items-center justify-center mr-3" style={{ backgroundColor: categoryColor }}>
            <Text style={{ fontSize: 18 }}>{categoryEmoji}</Text>
          </View>

          <Text className="text-[20px] font-bold text-text">
            {subcategoryName ? `${categoryName} · ${subcategoryName}` : categoryName}
          </Text>
        </View>
      </View>

      {periodLabel ? (
        <Text style={{ paddingHorizontal: 20, color: "#9CA3AF", fontSize: 13, marginBottom: 4 }}>{periodLabel}</Text>
      ) : null}

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingBottom: 40, gap: 16 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: `${categoryColor}22`, borderRadius: 18, padding: 16, gap: 14 }}>
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: categoryColor, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 22 }}>{categoryEmoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 22, fontWeight: "800", color: "#0F172A" }} numberOfLines={1} adjustsFontSizeToFit>
                {formatEuro(categoryTotal)}
              </Text>
              <Text style={{ fontSize: 12.5, color: "#6B7280", marginTop: 3 }}>
                {pctOfTotal.toFixed(1).replace(".", ",")}% de tus {type === "expense" ? "gastos" : "ingresos"}
              </Text>
            </View>
          </View>

          {subcategoryItems.length > 0 && (
            <View>
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A", marginBottom: 8 }}>
                Distribución por subcategorías
              </Text>
              <CategoryBarList items={subcategoryItems} />
            </View>
          )}

          <View>
            <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A", marginBottom: 4 }}>
              Movimientos ({categoryTransactions.length})
            </Text>
            <TransactionsList transactions={categoryTransactions} navigation={navigation} onDeleted={fetchTx} />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
