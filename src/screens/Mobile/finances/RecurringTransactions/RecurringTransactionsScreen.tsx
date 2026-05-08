// src/screens/Finances/RecurringTransactionsScreen.tsx
import React, { useState, useCallback, useMemo } from "react";
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
import { colors } from "../../../../theme/theme";
import api from "../../../../api/api";
import AppHeader from "../../../../components/AppHeader";

interface Category {
  id: number;
  name: string;
  emoji?: string | null;
  color?: string | null;
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
  date: string;
  isRecurring: boolean;
  recurrence: "daily" | "weekly" | "monthly" | "yearly" | string | null;
  active: boolean;
  category?: Category | null;
  subcategory?: Subcategory | null;
  fromWallet?: { name?: string; emoji?: string } | null;
  toWallet?: { name?: string; emoji?: string } | null;
}

// Returns the days of the current month that the recurring transaction hits
function getDaysForTransaction(tx: RecurringTransaction, year: number, month: number): number[] {
  const nextDate = new Date(tx.date);
  if (isNaN(nextDate.getTime())) return [];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: number[] = [];

  switch (tx.recurrence) {
    case "daily":
      for (let d = 1; d <= daysInMonth; d++) days.push(d);
      break;
    case "weekly": {
      const dow = nextDate.getDay();
      for (let d = 1; d <= daysInMonth; d++) {
        if (new Date(year, month, d).getDay() === dow) days.push(d);
      }
      break;
    }
    case "monthly": {
      const dom = nextDate.getDate();
      if (dom <= daysInMonth) days.push(dom);
      break;
    }
    case "yearly": {
      if (nextDate.getFullYear() >= year && nextDate.getMonth() === month) {
        days.push(nextDate.getDate());
      }
      break;
    }
    default: {
      // single next occurrence in this month
      if (nextDate.getFullYear() === year && nextDate.getMonth() === month) {
        days.push(nextDate.getDate());
      }
      break;
    }
  }
  return days;
}

function buildCalendarMap(
  transactions: RecurringTransaction[],
  year: number,
  month: number
): Map<number, RecurringTransaction[]> {
  const map = new Map<number, RecurringTransaction[]>();
  for (const tx of transactions) {
    const days = getDaysForTransaction(tx, year, month);
    for (const d of days) {
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(tx);
    }
  }
  return map;
}

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

function CalendarView({
  transactions,
  year,
  month,
}: {
  transactions: RecurringTransaction[];
  year: number;
  month: number;
}) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const calendarMap = useMemo(
    () => buildCalendarMap(transactions, year, month),
    [transactions, year, month]
  );

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Monday=0

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedTxs = selectedDay ? calendarMap.get(selectedDay) || [] : [];
  const formatEuro = (n: number) => n.toFixed(2).replace(".", ",");

  return (
    <View>
      {/* Weekday headers */}
      <View style={{ flexDirection: "row", marginBottom: 4 }}>
        {WEEKDAYS.map((d) => (
          <View key={d} style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "600" }}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Grid */}
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {cells.map((day, i) => {
          if (day === null)
            return <View key={`e-${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;

          const txs = calendarMap.get(day) || [];
          const hasIncome = txs.some((t) => t.type === "income");
          const hasExpense = txs.some((t) => t.type === "expense");
          const isSelected = selectedDay === day;
          const today = new Date();
          const isToday =
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day;

          return (
            <TouchableOpacity
              key={day}
              onPress={() => setSelectedDay(isSelected ? null : day)}
              style={{
                width: `${100 / 7}%`,
                aspectRatio: 1,
                alignItems: "center",
                justifyContent: "center",
                padding: 2,
              }}
              activeOpacity={0.7}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isSelected
                    ? colors.primary
                    : isToday
                    ? `${colors.primary}18`
                    : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: isToday || isSelected ? "700" : "400",
                    color: isSelected ? "white" : isToday ? colors.primary : "#374151",
                  }}
                >
                  {day}
                </Text>
              </View>
              {txs.length > 0 && (
                <View style={{ flexDirection: "row", gap: 2, marginTop: 1 }}>
                  {hasExpense && (
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "#DC2626" }} />
                  )}
                  {hasIncome && (
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "#16A34A" }} />
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected day transactions */}
      {selectedDay !== null && (
        <View
          style={{
            marginTop: 12,
            backgroundColor: "white",
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            overflow: "hidden",
          }}
        >
          <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#374151" }}>
              Día {selectedDay} — {selectedTxs.length} transacción{selectedTxs.length !== 1 ? "es" : ""}
            </Text>
          </View>
          {selectedTxs.length === 0 ? (
            <View style={{ padding: 14 }}>
              <Text style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center" }}>Sin transacciones</Text>
            </View>
          ) : (
            selectedTxs.map((tx) => {
              const emoji = tx.type === "transfer" ? "🔄" : tx.category?.emoji || "💸";
              const name =
                tx.description?.trim() ||
                tx.subcategory?.name ||
                tx.category?.name ||
                "Transacción";
              const amtColor = tx.type === "income" ? "#16A34A" : tx.type === "expense" ? "#DC2626" : "#374151";
              const sign = tx.type === "income" ? "+" : tx.type === "expense" ? "-" : "";
              return (
                <View
                  key={tx.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: "#F9FAFB",
                  }}
                >
                  <Text style={{ fontSize: 20, marginRight: 10 }}>{emoji}</Text>
                  <Text style={{ flex: 1, fontSize: 13, color: "#374151" }}>{name}</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: amtColor }}>
                    {sign}{formatEuro(tx.amount)} €
                  </Text>
                </View>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}

export default function RecurringTransactionsScreen({ navigation }: any) {
  const [transactions, setTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<"list" | "calendar">("list");

  const now = new Date();
  const [calYear] = useState(now.getFullYear());
  const [calMonth] = useState(now.getMonth());

  const monthLabel = new Date(calYear, calMonth, 1).toLocaleString("es-ES", {
    month: "long",
    year: "numeric",
  });

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
      case "daily": return "Diaria";
      case "weekly": return "Semanal";
      case "monthly": return "Mensual";
      case "yearly": return "Anual";
      default: return "Recurrente";
    }
  };

  const getTypeColor = (type: RecurringTransaction["type"]) => {
    if (type === "income") return "#16A34A";
    if (type === "expense") return "#DC2626";
    return colors.text;
  };

  const getPrimaryText = (tx: RecurringTransaction) => {
    if (tx.type === "transfer") {
      return `${tx.fromWallet?.name || "Origen"}  →  ${tx.toWallet?.name || "Destino"}`;
    }
    if (tx.description?.trim()) return tx.description.trim();
    if (tx.subcategory?.name) return tx.subcategory.name;
    if (tx.category?.name) return tx.category.name;
    return "Transacción recurrente";
  };

  const getSecondaryText = (tx: RecurringTransaction) => {
    return `${formatRecurrence(tx.recurrence)} · Próximo: ${formatDate(tx.date)}`;
  };

  const fetchRecurring = async () => {
    try {
      if (!refreshing) setLoading(true);
      const res = await api.get("/transactions", { params: { isRecurring: true } });
      const templates: RecurringTransaction[] = (res.data || [])
        .filter((t: any) => t?.active !== false)
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setTransactions(templates);
    } catch (e) {
      console.error("❌ Error cargando transacciones recurrentes:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchRecurring(); }, []));

  const onRefresh = () => { setRefreshing(true); fetchRecurring(); };

  const renderIcon = (tx: RecurringTransaction) => {
    if (tx.type === "transfer") {
      return (
        <View className="w-10 h-10 bg-blue-100 rounded-lg items-center justify-center">
          <Ionicons name="swap-horizontal-outline" size={20} color="#2563eb" />
        </View>
      );
    }
    return (
      <View
        className="w-10 h-10 rounded-lg items-center justify-center"
        style={{ backgroundColor: tx.category?.color || "#f3f4f6" }}
      >
        <Text className="text-[18px]">{tx.category?.emoji || "💸"}</Text>
      </View>
    );
  };

  const renderAmount = (tx: RecurringTransaction) => {
    const color = getTypeColor(tx.type);
    const sign = tx.type === "income" ? "+" : tx.type === "expense" ? "-" : "";
    return (
      <Text className="text-[14px] font-semibold" style={{ color }}>
        {sign}{formatEuro(tx.amount)} €
      </Text>
    );
  };

  const RecurringRow = ({ tx }: { tx: RecurringTransaction }) => (
    <View style={{ marginBottom: 6 }}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate("Add", { editData: tx, scope: "series" })}
        className="flex-row justify-between items-center py-1.5 px-1.5 bg-background rounded-xl"
      >
        <View className="flex-row items-center flex-1 pr-3">
          {renderIcon(tx)}
          <View className="ml-3 flex-1">
            <Text className="text-[14px] font-semibold text-text" numberOfLines={1}>
              {getPrimaryText(tx)}
            </Text>
            <Text className="text-gray-400 text-[10px]" numberOfLines={2}>
              {getSecondaryText(tx)}
            </Text>
          </View>
        </View>
        {renderAmount(tx)}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#F3F4F6", paddingHorizontal: 20 }}>
      <View className="pb-2">
        <AppHeader
          title="Transacciones recurrentes"
          showProfile={false}
          showDatePicker={false}
          showBack={true}
        />
      </View>

      {/* View toggle */}
      <View style={{ flexDirection: "row", backgroundColor: "#E8EDF3", borderRadius: 14, padding: 4, marginBottom: 12 }}>
        {(["list", "calendar"] as const).map((v) => (
          <TouchableOpacity
            key={v}
            onPress={() => setView(v)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: view === v ? "white" : "transparent",
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 5,
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={v === "list" ? "list-outline" : "calendar-outline"}
              size={15}
              color={view === v ? colors.primary : "#6B7280"}
            />
            <Text style={{ fontSize: 12, fontWeight: "600", color: view === v ? colors.primary : "#6B7280" }}>
              {v === "list" ? "Lista" : "Calendario"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 4 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
        ) : transactions.length === 0 ? (
          <View className="items-center mt-10">
            <Text className="text-gray-400 text-[15px] text-center px-8">
              No hay transacciones recurrentes todavía
            </Text>
          </View>
        ) : view === "list" ? (
          <View className="mt-3">
            {transactions.map((tx) => (
              <RecurringRow key={tx.id} tx={tx} />
            ))}
          </View>
        ) : (
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 18,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              padding: 14,
              marginTop: 4,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: "#111827",
                textTransform: "capitalize",
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              {monthLabel}
            </Text>
            <CalendarView
              transactions={transactions}
              year={calYear}
              month={calMonth}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
