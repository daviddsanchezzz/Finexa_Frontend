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
  // Filtro local por subcategoría — tocar una fila de "Distribución por
  // subcategorías" filtra los Movimientos de abajo sin salir de la pantalla.
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(subcategoryName ?? null);

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

  // Todas las transacciones de esta categoría (sin filtrar por
  // subcategoría) — base tanto del total/% de cabecera como del desglose
  // por subcategorías, que debe seguir mostrando TODAS las subcategorías
  // aunque una de ellas esté seleccionada como filtro.
  const categoryAllTransactions = useMemo(
    () => allTypeTransactions.filter((tx: any) => tx.category?.name === categoryName),
    [allTypeTransactions, categoryName]
  );

  const categoryTransactions = useMemo(
    () =>
      categoryAllTransactions.filter((tx: any) =>
        selectedSubcategory ? (tx.subcategory?.name || "Sin subcategoría") === selectedSubcategory : true
      ),
    [categoryAllTransactions, selectedSubcategory]
  );

  const totalForType = useMemo(
    () => allTypeTransactions.reduce((s, tx) => s + Math.abs(tx.amount), 0),
    [allTypeTransactions]
  );

  const categoryTotal = useMemo(
    () => categoryAllTransactions.reduce((s, tx) => s + Math.abs(tx.amount), 0),
    [categoryAllTransactions]
  );

  const pctOfTotal = totalForType > 0 ? (categoryTotal / totalForType) * 100 : 0;

  const subcategoryItems: CategoryBarItem[] = useMemo(() => {
    const map: Record<string, { amount: number }> = {};
    categoryAllTransactions.forEach((tx: any) => {
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
        active: name === selectedSubcategory,
        onPress: () => setSelectedSubcategory((prev) => (prev === name ? null : name)),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [categoryAllTransactions, categoryTotal, categoryColor, selectedSubcategory]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, gap: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: categoryColor, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 15 }}>{categoryEmoji}</Text>
        </View>

        <View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>
            {selectedSubcategory ? `${categoryName} · ${selectedSubcategory}` : categoryName}
          </Text>
          {periodLabel ? <Text style={{ fontSize: 12.5, color: "#8A8F98", marginTop: 1 }}>{periodLabel}</Text> : null}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingBottom: 40, gap: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View>
            <Text
              style={{ fontSize: 30, fontWeight: "700", color: "#0F172A", fontVariant: ["tabular-nums"] }}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatEuro(categoryTotal)}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: categoryColor }} />
              <Text style={{ fontSize: 13.5, color: "#5B6472", fontWeight: "500" }}>
                {pctOfTotal.toFixed(1).replace(".", ",")}% del {type === "expense" ? "gasto total" : "ingreso total"}
              </Text>
            </View>
          </View>

          {subcategoryItems.length > 0 && (
            <View>
              <Text style={{ fontSize: 15.5, fontWeight: "700", color: "#0F172A", marginBottom: 8 }}>
                Distribución por subcategorías
              </Text>
              <CategoryBarList items={subcategoryItems} />
            </View>
          )}

          <View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ fontSize: 15.5, fontWeight: "700", color: "#0F172A" }}>
                Movimientos ({categoryTransactions.length})
              </Text>
              {selectedSubcategory && (
                <TouchableOpacity
                  onPress={() => setSelectedSubcategory(null)}
                  activeOpacity={0.7}
                  style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: `${categoryColor}14`, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#0F172A" }}>{selectedSubcategory}</Text>
                  <Ionicons name="close" size={12} color="#5B6472" />
                </TouchableOpacity>
              )}
            </View>
            <TransactionsList transactions={categoryTransactions} navigation={navigation} onDeleted={fetchTx} />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
