import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import AppHeader from "../../../components/AppHeader";
import DateFilterModal from "../../../components/DateFilterModal";
import PieChartComponent from "../../../components/PieChart";
import GroupedBarChart from "../../../components/GroupedBarChart";
import CategoryBarList, { type CategoryBarItem } from "../../../components/CategoryBarList";
import { StatsScreenSkeleton } from "../../../components/skeletons/StatsScreenSkeleton";

import api from "../../../api/api";
import { colors } from "../../../theme/theme";
import { useTheme } from "../../../context/ThemeContext";
import { getTransactionsDataVersion, subscribeTransactionsInvalidation } from "../../../utils/transactionsInvalidation";
import { formatEuro as formatEuroBase } from "../../../utils/currency";

type RangeType = "week" | "month" | "year" | "all";
type MainTab = "resumen" | "gastos" | "ingresos" | "evolucion";
type EvoRange = "6M" | "1A" | "3A" | "Todo";

type CategoryAgg = {
  name: string;
  emoji: string;
  color: string;
  amount: number;
  count: number;
  subcategories: SubcategoryAgg[];
};

type SubcategoryAgg = {
  name: string;
  amount: number;
  count: number;
};

type SummaryResponse = {
  totalIncome: number;
  totalExpenses: number;
  totalInvestment: number;
  balance: number;
  savingsRate: number;
};

type TxLite = {
  type: "income" | "expense";
  amount: number;
  date: string;
  category?: { name: string; emoji: string; color: string };
  subcategory?: { name: string; emoji?: string } | null;
};

const MONTH_ABBR = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

interface MonthBucket {
  year: number;
  month: number;
  income: number;
  expense: number;
}

function bucketByMonth(list: TxLite[]): MonthBucket[] {
  const map = new Map<string, MonthBucket>();
  list.forEach((tx) => {
    const d = new Date(tx.date);
    const y = d.getFullYear();
    const m = d.getMonth();
    const key = `${y}-${m}`;
    if (!map.has(key)) map.set(key, { year: y, month: m, income: 0, expense: 0 });
    const bucket = map.get(key)!;
    if (tx.type === "income") bucket.income += Math.abs(tx.amount);
    else if (tx.type === "expense") bucket.expense += Math.abs(tx.amount);
  });
  return [...map.values()].sort((a, b) => (a.year - b.year) || (a.month - b.month));
}

function monthLabel(b: MonthBucket, multiYear: boolean) {
  return multiYear ? `${MONTH_ABBR[b.month]} ${String(b.year).slice(2)}` : MONTH_ABBR[b.month];
}

// ── Tabs superiores (Resumen/Gastos/Ingresos/Evolución) ──
function TopTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.85}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: active ? colors.primary : "transparent",
            }}
          >
            <Text style={{ fontSize: 13.5, fontWeight: active ? "700" : "600", color: active ? "white" : "#6B7280" }}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Chips pequeños reutilizados para Barras/Circular y los rangos de Evolución ──
function PillRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.85}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: active ? colors.primary : "#F1F5F9",
            }}
          >
            <Text style={{ fontSize: 12.5, fontWeight: "700", color: active ? "white" : "#6B7280" }}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Card contenedora blanca, reutilizada en todo el rediseño ──
function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View
      style={[
        { backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#E5E7EB", padding: 16 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function SectionTitle({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 17, fontWeight: "800", color: "#0F172A" }}>{children}</Text>
      {subtitle ? <Text style={{ fontSize: 12.5, color: "#9CA3AF", marginTop: 2 }}>{subtitle}</Text> : null}
    </View>
  );
}

function DeltaText({ value, pct }: { value: number; pct: number | null }) {
  const positive = value >= 0;
  const color = positive ? "#16A34A" : "#DC2626";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 }}>
      <Ionicons name={positive ? "arrow-up" : "arrow-down"} size={11} color={color} />
      <Text style={{ fontSize: 12, fontWeight: "700", color }}>
        {pct != null ? `${Math.abs(pct).toFixed(0)}%` : `${positive ? "+" : "−"}${formatEuroBase(Math.abs(value))} €`}
      </Text>
    </View>
  );
}

export default function StatsScreen({ navigation }: any) {
  const { colors: t } = useTheme();
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<MainTab>("resumen");
  const [catView, setCatView] = useState<"barras" | "circular">("barras");
  const [showAllExpense, setShowAllExpense] = useState(false);
  const [showAllIncome, setShowAllIncome] = useState(false);
  const [evoRange, setEvoRange] = useState<EvoRange>("Todo");

  const [invalidationVersion, setInvalidationVersion] = useState<number>(() => getTransactionsDataVersion());
  useEffect(() => subscribeTransactionsInvalidation((v) => setInvalidationVersion(v)), []);

  const webScrollAtTop = useRef(true);
  const webTouchStartY = useRef(0);
  const pullAnim = useRef(new Animated.Value(0)).current;
  const currentPullY = useRef(0);
  const webRefreshingRef = useRef(false);
  const hasFetched = useRef(false);
  const lastFetchKey = useRef<string>("");
  const lastFetchedVersion = useRef<number>(-1);
  const hasFetchedHistory = useRef(false);
  const PULL_THRESHOLD = 80;
  const PULL_MAX = 65;

  const [transactions, setTransactions] = useState<TxLite[]>([]);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [prevSummary, setPrevSummary] = useState<SummaryResponse | null>(null);
  const [historyTransactions, setHistoryTransactions] = useState<TxLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [rangeType, setRangeType] = useState<RangeType>("month");
  const [dateLabel, setDateLabel] = useState("");

  const capitalizeLabel = (label: string) => (label ? label.charAt(0).toUpperCase() + label.slice(1) : label);
  const formatEuro = (n: number) => `${formatEuroBase(n)} €`;

  const initCurrentMonth = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    const rawLabel = now.toLocaleString("es-ES", { month: "long", year: "numeric" }).replace("de ", "");
    return { from: first, to: last, label: capitalizeLabel(rawLabel) };
  };

  useEffect(() => {
    const { from, to, label } = initCurrentMonth();
    setRangeType("month");
    setDateLabel(label);
    setDateFrom(from);
    setDateTo(to);
  }, []);

  // Ventana anterior de la misma duración que el periodo seleccionado, para
  // los deltas "vs mes anterior" — generaliza a semana/mes/año/todo.
  const prevRange = useMemo(() => {
    if (!dateFrom || !dateTo) return null;
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const durationMs = to.getTime() - from.getTime();
    const prevTo = new Date(from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - durationMs);
    return { from: prevFrom.toISOString(), to: prevTo.toISOString() };
  }, [dateFrom, dateTo]);

  const prevLabel = useMemo(() => {
    if (!prevRange) return "el periodo anterior";
    if (rangeType === "month") {
      const raw = new Date(prevRange.to).toLocaleString("es-ES", { month: "long", year: "numeric" }).replace("de ", "");
      return capitalizeLabel(raw);
    }
    return "el periodo anterior";
  }, [prevRange, rangeType]);

  const fetchStats = useCallback(async (isManual = false) => {
    if (!dateFrom || !dateTo || !prevRange) return;
    try {
      if (!isManual) setLoading(true);

      const [summaryRes, prevSummaryRes, txRes] = await Promise.all([
        api.get("/dashboard/summary2", { params: { startDate: dateFrom, endDate: dateTo } }),
        api.get("/dashboard/summary2", { params: { startDate: prevRange.from, endDate: prevRange.to } }).catch(() => null),
        api.get("/transactions", { params: { dateFrom, dateTo } }),
      ]);

      setSummary(summaryRes.data);
      setPrevSummary(prevSummaryRes?.data ?? null);

      const filtered = (txRes.data || [])
        .filter((tx: any) => tx.type !== "transfer")
        .filter((tx: any) => tx.isRecurring === false)
        .filter((tx: any) => tx.active !== false)
        .filter((tx: any) => tx.excludeFromStats !== true);

      setTransactions(filtered);
    } catch (err) {
      console.log("❌ Error cargando estadísticas:", err);
      setSummary(null);
      setPrevSummary(null);
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateFrom, dateTo, prevRange]);

  // Histórico amplio (hasta 3 años) para las gráficas de evolución — una
  // sola vez, independiente del rango de fecha elegido arriba.
  const fetchHistory = useCallback(async () => {
    try {
      const from = new Date();
      from.setFullYear(from.getFullYear() - 3);
      from.setDate(1);
      const res = await api.get("/transactions", { params: { dateFrom: from.toISOString() } });
      const filtered = (res.data || [])
        .filter((tx: any) => tx.type !== "transfer")
        .filter((tx: any) => tx.isRecurring === false)
        .filter((tx: any) => tx.active !== false)
        .filter((tx: any) => tx.excludeFromStats !== true);
      setHistoryTransactions(filtered);
    } catch (err) {
      console.log("❌ Error cargando histórico:", err);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(true), fetchHistory()]);
  }, [fetchStats, fetchHistory]);

  useFocusEffect(
    React.useCallback(() => {
      const key = `${dateFrom ?? ""}|${dateTo ?? ""}`;
      if (hasFetched.current && lastFetchKey.current === key && lastFetchedVersion.current === invalidationVersion) return;
      lastFetchKey.current = key;
      hasFetched.current = true;
      lastFetchedVersion.current = invalidationVersion;
      fetchStats();
      if (!hasFetchedHistory.current || lastFetchedVersion.current !== invalidationVersion) {
        hasFetchedHistory.current = true;
        fetchHistory();
      }
    }, [dateFrom, dateTo, fetchStats, fetchHistory, invalidationVersion])
  );

  const handleWebTouchStart = useCallback((e: any) => {
    if (Platform.OS === "web") {
      webTouchStartY.current = e.nativeEvent?.touches?.[0]?.pageY ?? 0;
      currentPullY.current = 0;
    }
  }, []);

  const handleWebTouchMove = useCallback((e: any) => {
    if (Platform.OS !== "web" || webRefreshingRef.current || !webScrollAtTop.current) return;
    const y = e.nativeEvent?.touches?.[0]?.pageY ?? 0;
    const delta = Math.max(0, y - webTouchStartY.current);
    currentPullY.current = delta;
    pullAnim.setValue(Math.min(PULL_MAX, Math.sqrt(delta) * 4.5));
  }, [pullAnim]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleWebTouchEnd = useCallback(async () => {
    if (Platform.OS !== "web") return;
    const delta = currentPullY.current;
    currentPullY.current = 0;
    if (webScrollAtTop.current && delta > PULL_THRESHOLD && !webRefreshingRef.current) {
      webRefreshingRef.current = true;
      Animated.spring(pullAnim, { toValue: 36, useNativeDriver: true }).start();
      await onRefresh();
      webRefreshingRef.current = false;
    }
    Animated.spring(pullAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
  }, [pullAnim, onRefresh]); // eslint-disable-line react-hooks/exhaustive-deps

  const groupByCategory = (list: TxLite[]) => {
    const incomeMap: Record<string, CategoryAgg> = {};
    const expenseMap: Record<string, CategoryAgg> = {};
    const incomeSubMap: Record<string, Record<string, SubcategoryAgg>> = {};
    const expenseSubMap: Record<string, Record<string, SubcategoryAgg>> = {};

    list.forEach((tx) => {
      if (!tx.category) return;
      const key = tx.category.name;
      const bucket = tx.type === "income" ? incomeMap : expenseMap;
      const subBucket = tx.type === "income" ? incomeSubMap : expenseSubMap;

      if (!bucket[key]) {
        bucket[key] = { name: tx.category.name, emoji: tx.category.emoji, color: tx.category.color, amount: 0, count: 0, subcategories: [] };
      }
      bucket[key].amount += Math.abs(tx.amount);
      bucket[key].count += 1;

      const subName = tx.subcategory?.name?.trim() || "Sin subcategoría";
      if (!subBucket[key]) subBucket[key] = {};
      if (!subBucket[key][subName]) subBucket[key][subName] = { name: subName, amount: 0, count: 0 };
      subBucket[key][subName].amount += Math.abs(tx.amount);
      subBucket[key][subName].count += 1;
    });

    const incomesArr = Object.values(incomeMap);
    const expensesArr = Object.values(expenseMap);
    incomesArr.forEach((c) => { c.subcategories = Object.values(incomeSubMap[c.name] || {}).sort((a, b) => b.amount - a.amount); });
    expensesArr.forEach((c) => { c.subcategories = Object.values(expenseSubMap[c.name] || {}).sort((a, b) => b.amount - a.amount); });
    incomesArr.sort((a, b) => b.amount - a.amount);
    expensesArr.sort((a, b) => b.amount - a.amount);

    return { incomes: incomesArr, expenses: expensesArr };
  };

  const { incomes, expenses } = useMemo(() => groupByCategory(transactions), [transactions]);

  const totalIncomes = summary?.totalIncome ?? incomes.reduce((s, c) => s + c.amount, 0);
  const totalExpenses = summary?.totalExpenses ?? expenses.reduce((s, c) => s + c.amount, 0);
  const totalSaving = totalIncomes - totalExpenses;
  const savingsRate = totalIncomes > 0 ? (totalSaving / totalIncomes) * 100 : 0;

  const prevTotalIncomes = prevSummary?.totalIncome ?? 0;
  const prevTotalExpenses = prevSummary?.totalExpenses ?? 0;
  const prevTotalSaving = prevTotalIncomes - prevTotalExpenses;

  const incomeDelta = totalIncomes - prevTotalIncomes;
  const expenseDelta = totalExpenses - prevTotalExpenses;
  const savingDelta = totalSaving - prevTotalSaving;
  const incomeDeltaPct = prevTotalIncomes > 0 ? (incomeDelta / prevTotalIncomes) * 100 : null;
  const expenseDeltaPct = prevTotalExpenses > 0 ? (expenseDelta / prevTotalExpenses) * 100 : null;
  const savingDeltaPct = prevTotalSaving !== 0 ? (savingDelta / Math.abs(prevTotalSaving)) * 100 : null;

  const buildPieData = (list: CategoryAgg[], total: number) =>
    list.map((c) => ({ value: c.amount, realValue: c.amount, color: c.color, label: c.name, percent: total > 0 ? (c.amount / total) * 100 : 0 }));

  const expensePieData = useMemo(() => buildPieData(expenses, totalExpenses), [expenses, totalExpenses]);
  const incomePieData = useMemo(() => buildPieData(incomes, totalIncomes), [incomes, totalIncomes]);

  const toBarItems = (list: CategoryAgg[], total: number, type: "income" | "expense", expanded: boolean): CategoryBarItem[] => {
    const visible = expanded ? list : list.slice(0, 5);
    return visible.map((c) => ({
      key: c.name,
      label: c.name,
      amount: c.amount,
      percent: total > 0 ? (c.amount / total) * 100 : 0,
      color: c.color,
      emoji: c.emoji,
      onPress: () => navigation.navigate("CategoryTransactions", {
        categoryName: c.name, categoryEmoji: c.emoji, categoryColor: c.color, type, dateFrom, dateTo,
      }),
    }));
  };

  const monthlyBuckets = useMemo(() => bucketByMonth(historyTransactions), [historyTransactions]);
  const last6 = monthlyBuckets.slice(-6);
  const last6MultiYear = new Set(last6.map((b) => b.year)).size > 1;
  const last6Labels = last6.map((b) => monthLabel(b, last6MultiYear));

  const evoBuckets = useMemo(() => {
    if (evoRange === "6M") return monthlyBuckets.slice(-6);
    if (evoRange === "1A") return monthlyBuckets.slice(-12);
    if (evoRange === "3A") return monthlyBuckets.slice(-36);
    return monthlyBuckets;
  }, [monthlyBuckets, evoRange]);
  const evoMultiYear = new Set(evoBuckets.map((b) => b.year)).size > 1;
  const evoLabels = evoBuckets.map((b) => monthLabel(b, evoMultiYear));

  const periodTotals = useMemo(() => {
    const income = evoBuckets.reduce((s, b) => s + b.income, 0);
    const expense = evoBuckets.reduce((s, b) => s + b.expense, 0);
    return { income, expense, saving: income - expense, rate: income > 0 ? ((income - expense) / income) * 100 : 0 };
  }, [evoBuckets]);

  const topExpenseCategory = expenses[0] ?? null;

  const insights = useMemo(() => {
    const list: { icon: keyof typeof Ionicons.glyphMap; bg: string; color: string; title: string; subtitle: string; onPress?: () => void }[] = [];

    if (topExpenseCategory) {
      const pct = totalExpenses > 0 ? (topExpenseCategory.amount / totalExpenses) * 100 : 0;
      list.push({
        icon: "trending-up-outline", bg: topExpenseCategory.color, color: "#0F172A",
        title: `${topExpenseCategory.name} ha sido tu mayor gasto`,
        subtitle: `Supone el ${pct.toFixed(1).replace(".", ",")}% de tus gastos este mes.`,
        onPress: () => setActiveTab("gastos"),
      });
    }

    if (prevTotalExpenses > 0 && expenseDeltaPct != null) {
      const less = expenseDeltaPct < 0;
      list.push({
        icon: "bulb-outline", bg: "#FEF9C3", color: "#CA8A04",
        title: `Has gastado un ${Math.abs(expenseDeltaPct).toFixed(0)}% ${less ? "menos" : "más"} que en ${prevLabel.toLowerCase()}`,
        subtitle: `Tu gasto total ha pasado de ${formatEuro(prevTotalExpenses)} a ${formatEuro(totalExpenses)}.`,
        onPress: () => setActiveTab("gastos"),
      });
    }

    if (prevTotalIncomes > 0 || prevTotalExpenses > 0) {
      const up = savingDelta >= 0;
      list.push({
        icon: "bar-chart-outline", bg: "#EDE9FE", color: "#7C3AED",
        title: `Tu tasa de ahorro ha ${up ? "aumentado" : "disminuido"}`,
        subtitle: savingDeltaPct != null
          ? `Has ahorrado un ${Math.abs(savingDeltaPct).toFixed(0)}% ${up ? "más" : "menos"} que el mes anterior.`
          : `Ahorro de ${formatEuro(totalSaving)} este periodo.`,
        onPress: () => setActiveTab("evolucion"),
      });
    }

    return list;
  }, [topExpenseCategory, totalExpenses, prevTotalExpenses, expenseDeltaPct, prevLabel, prevTotalIncomes, savingDelta, savingDeltaPct, totalSaving]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="px-5 pb-2">
          <AppHeader title="Estadísticas" showProfile={false} onOpenDateModal={() => setDateModalVisible(true)} dateLabel={dateLabel} />
        </View>
        <StatsScreenSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" style={Platform.OS === "web" ? { overflow: "hidden" } : undefined}>
      {Platform.OS === "web" && (
        <View style={{ position: "absolute", top: 52, left: 0, right: 0, alignItems: "center", zIndex: 0 }}>
          <Animated.View style={{
            opacity: pullAnim.interpolate({ inputRange: [0, 20, PULL_MAX], outputRange: [0, 0, 1], extrapolate: "clamp" }),
            transform: [{ scale: pullAnim.interpolate({ inputRange: [0, PULL_MAX], outputRange: [0.5, 1], extrapolate: "clamp" }) }],
          }}>
            <View style={{ backgroundColor: "white", borderRadius: 20, padding: 8, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          </Animated.View>
        </View>
      )}
      <Animated.View
        style={Platform.OS === "web" ? { flex: 1, transform: [{ translateY: pullAnim }] } : { flex: 1 }}
        onTouchStart={handleWebTouchStart}
        onTouchMove={handleWebTouchMove}
        onTouchEnd={handleWebTouchEnd}
      >
        <View className="px-5 pb-2">
          <AppHeader title="Estadísticas" showProfile={false} onOpenDateModal={() => setDateModalVisible(true)} dateLabel={dateLabel} />
        </View>

        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <TopTabs<MainTab>
            options={[
              { key: "resumen", label: "Resumen" },
              { key: "gastos", label: "Gastos" },
              { key: "ingresos", label: "Ingresos" },
              { key: "evolucion", label: "Evolución" },
            ]}
            value={activeTab}
            onChange={setActiveTab}
          />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, gap: 16 }}
          scrollEventThrottle={16}
          onScroll={(e) => { if (Platform.OS === "web") webScrollAtTop.current = e.nativeEvent.contentOffset.y <= 0; }}
          refreshControl={Platform.OS !== "web" ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
        >
          {activeTab === "resumen" && (
            <>
              <SectionTitle subtitle={`Así ha sido tu actividad en ${dateLabel.toLowerCase()}.`}>Resumen del mes</SectionTitle>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1, backgroundColor: "#ECFDF5", borderRadius: 16, padding: 12 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Text style={{ fontSize: 12.5, color: "#065F46", fontWeight: "600" }}>Ingresos</Text>
                    <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.6)", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="bar-chart" size={14} color="#16A34A" />
                    </View>
                  </View>
                  <Text style={{ fontSize: 16.5, fontWeight: "800", color: "#16A34A", marginTop: 8 }} numberOfLines={1} adjustsFontSizeToFit>
                    {formatEuro(totalIncomes)}
                  </Text>
                  <DeltaText value={incomeDelta} pct={incomeDeltaPct} />
                </View>

                <View style={{ flex: 1, backgroundColor: "#FEF2F2", borderRadius: 16, padding: 12 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Text style={{ fontSize: 12.5, color: "#7F1D1D", fontWeight: "600" }}>Gastos</Text>
                    <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.6)", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="briefcase" size={14} color="#DC2626" />
                    </View>
                  </View>
                  <Text style={{ fontSize: 16.5, fontWeight: "800", color: "#DC2626", marginTop: 8 }} numberOfLines={1} adjustsFontSizeToFit>
                    {formatEuro(totalExpenses)}
                  </Text>
                  <DeltaText value={-expenseDelta} pct={expenseDeltaPct != null ? -expenseDeltaPct : null} />
                </View>

                <View style={{ flex: 1, backgroundColor: "#EFF6FF", borderRadius: 16, padding: 12 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Text style={{ fontSize: 12.5, color: "#1E3A8A", fontWeight: "600" }}>Ahorro</Text>
                    <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.6)", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="wallet" size={14} color="#2563EB" />
                    </View>
                  </View>
                  <Text style={{ fontSize: 16.5, fontWeight: "800", color: "#2563EB", marginTop: 8 }} numberOfLines={1} adjustsFontSizeToFit>
                    {formatEuro(totalSaving)}
                  </Text>
                  <DeltaText value={savingDelta} pct={savingDeltaPct} />
                </View>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 }}>
                <Text style={{ fontSize: 14, color: "#6B7280", fontWeight: "600" }}>Tasa de ahorro</Text>
                <Text style={{ fontSize: 17, fontWeight: "800", color: "#0F172A" }}>{savingsRate.toFixed(1).replace(".", ",")} %</Text>
              </View>

              <Card>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 14 }}>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A" }}>Ingresos vs gastos</Text>
                  <Text style={{ fontSize: 12, color: "#9CA3AF", fontWeight: "600" }}>Últimos 6 meses</Text>
                </View>
                <GroupedBarChart
                  xLabels={last6Labels}
                  series={[
                    { label: "Ingresos", color: "#4ADE80", values: last6.map((b) => b.income) },
                    { label: "Gastos", color: "#F87171", values: last6.map((b) => b.expense) },
                  ]}
                />
              </Card>

              <Card>
                <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A", marginBottom: 14 }}>
                  Comparado con {prevLabel}
                </Text>
                <View style={{ flexDirection: "row" }}>
                  {[
                    { label: "Ingresos", value: incomeDelta },
                    { label: "Gastos", value: -expenseDelta },
                    { label: "Ahorro", value: savingDelta },
                  ].map((item, i) => (
                    <View key={item.label} style={{ flex: 1, borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: "#F1F5F9", paddingLeft: i > 0 ? 12 : 0 }}>
                      <Text style={{ fontSize: 12.5, color: "#9CA3AF", fontWeight: "600" }}>{item.label}</Text>
                      <Text style={{ fontSize: 14.5, fontWeight: "800", marginTop: 4, color: item.value >= 0 ? "#16A34A" : "#DC2626" }} numberOfLines={1} adjustsFontSizeToFit>
                        {item.value >= 0 ? "+" : "−"}{formatEuro(Math.abs(item.value))}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>

              {insights.length > 0 && (
                <Card>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A", marginBottom: 4 }}>Insights del mes</Text>
                  {insights.map((ins, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={ins.onPress}
                      activeOpacity={0.7}
                      style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: "#F1F5F9", gap: 12 }}
                    >
                      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: ins.bg, alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name={ins.icon} size={18} color={ins.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13.5, fontWeight: "700", color: "#0F172A" }}>{ins.title}</Text>
                        <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{ins.subtitle}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                    </TouchableOpacity>
                  ))}
                </Card>
              )}
            </>
          )}

          {(activeTab === "gastos" || activeTab === "ingresos") && (() => {
            const isExpense = activeTab === "gastos";
            const list = isExpense ? expenses : incomes;
            const total = isExpense ? totalExpenses : totalIncomes;
            const prevTotal = isExpense ? prevTotalExpenses : prevTotalIncomes;
            const deltaPct = isExpense ? expenseDeltaPct : incomeDeltaPct;
            const heroColor = isExpense ? "#DC2626" : "#16A34A";
            const heroBg = isExpense ? "#FEF2F2" : "#ECFDF5";
            const pieData = isExpense ? expensePieData : incomePieData;
            const showAll = isExpense ? showAllExpense : showAllIncome;
            const setShowAll = isExpense ? setShowAllExpense : setShowAllIncome;
            const barItems = toBarItems(list, total, isExpense ? "expense" : "income", showAll);
            const evoSeriesValues = last6.map((b) => (isExpense ? b.expense : b.income));

            return (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: heroBg, borderRadius: 18, padding: 16, gap: 14 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.6)", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name={isExpense ? "briefcase" : "bar-chart"} size={22} color={heroColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 22, fontWeight: "800", color: "#0F172A" }} numberOfLines={1} adjustsFontSizeToFit>
                      {formatEuro(total)}
                    </Text>
                    {prevTotal > 0 && deltaPct != null && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
                        <Ionicons name={deltaPct >= 0 ? "arrow-up" : "arrow-down"} size={12} color={heroColor} />
                        <Text style={{ fontSize: 12.5, fontWeight: "700", color: heroColor }}>{Math.abs(deltaPct).toFixed(0)}%</Text>
                        <Text style={{ fontSize: 12, color: "#6B7280" }}>vs. {prevLabel.toLowerCase()}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A" }}>Distribución por categorías</Text>
                    <PillRow<"barras" | "circular">
                      options={[{ key: "barras", label: "Barras" }, { key: "circular", label: "Circular" }]}
                      value={catView}
                      onChange={setCatView}
                    />
                  </View>

                  <Card>
                    {list.length === 0 ? (
                      <Text style={{ color: "#9CA3AF", fontSize: 13, textAlign: "center", paddingVertical: 12 }}>
                        Sin {isExpense ? "gastos" : "ingresos"} en este periodo.
                      </Text>
                    ) : catView === "circular" ? (
                      <PieChartComponent mode={isExpense ? "expense" : "income"} data={pieData} incomes={totalIncomes} expenses={totalExpenses} />
                    ) : (
                      <>
                        <CategoryBarList items={barItems} />
                        {list.length > 5 && (
                          <TouchableOpacity onPress={() => setShowAll(!showAll)} activeOpacity={0.7} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 12, marginTop: 4, borderTopWidth: 1, borderTopColor: "#F1F5F9" }}>
                            <Text style={{ fontSize: 13.5, fontWeight: "700", color: colors.primary }}>{showAll ? "Ver menos" : "Ver todas"}</Text>
                            <Ionicons name={showAll ? "chevron-up" : "chevron-forward"} size={16} color={colors.primary} />
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                  </Card>
                </View>

                <Card>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A", marginBottom: 14 }}>
                    Evolución {isExpense ? "del gasto" : "de ingresos"}
                  </Text>
                  <GroupedBarChart
                    xLabels={last6Labels}
                    series={[{ label: isExpense ? "Gastos" : "Ingresos", color: isExpense ? "#FCA5A5" : "#86EFAC", values: evoSeriesValues }]}
                    highlightLast
                    highlightColor={isExpense ? "#DC2626" : "#16A34A"}
                  />
                </Card>
              </>
            );
          })()}

          {activeTab === "evolucion" && (
            <>
              <PillRow<EvoRange>
                options={[{ key: "6M", label: "6M" }, { key: "1A", label: "1A" }, { key: "3A", label: "3A" }, { key: "Todo", label: "Todo" }]}
                value={evoRange}
                onChange={setEvoRange}
              />

              <Card>
                {evoBuckets.length === 0 ? (
                  <Text style={{ color: "#9CA3AF", fontSize: 13, textAlign: "center", paddingVertical: 20 }}>
                    Todavía no hay suficiente histórico.
                  </Text>
                ) : (
                  <GroupedBarChart
                    xLabels={evoLabels}
                    series={[
                      { label: "Ingresos", color: "#4ADE80", values: evoBuckets.map((b) => b.income) },
                      { label: "Gastos", color: "#F87171", values: evoBuckets.map((b) => b.expense) },
                      { label: "Ahorro", color: "#60A5FA", values: evoBuckets.map((b) => b.income - b.expense) },
                    ]}
                  />
                )}
              </Card>

              <Card>
                <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A", marginBottom: 14 }}>Resumen del periodo</Text>
                {[
                  { label: "Ingresos totales", value: periodTotals.income, color: "#16A34A" },
                  { label: "Gastos totales", value: periodTotals.expense, color: "#DC2626" },
                  { label: "Ahorro", value: periodTotals.saving, color: "#2563EB" },
                ].map((row, i) => (
                  <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: "#F1F5F9" }}>
                    <Text style={{ fontSize: 14, color: "#6B7280", fontWeight: "600" }}>{row.label}</Text>
                    <Text style={{ fontSize: 14.5, fontWeight: "800", color: row.color }}>{formatEuro(row.value)}</Text>
                  </View>
                ))}
                <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, borderTopWidth: 1, borderTopColor: "#F1F5F9" }}>
                  <Text style={{ fontSize: 14, color: "#6B7280", fontWeight: "600" }}>Tasa de ahorro</Text>
                  <Text style={{ fontSize: 14.5, fontWeight: "800", color: "#0F172A" }}>{periodTotals.rate.toFixed(1).replace(".", ",")} %</Text>
                </View>

                {evoBuckets.length > 0 && (
                  <View style={{ flexDirection: "row", alignItems: "flex-start", backgroundColor: "#FEF9C3", borderRadius: 14, padding: 12, marginTop: 12, gap: 8 }}>
                    <Text style={{ fontSize: 16 }}>🏆</Text>
                    <Text style={{ flex: 1, fontSize: 12.5, color: "#854D0E", lineHeight: 17 }}>
                      Tu tasa de ahorro media en los últimos {evoBuckets.length} meses es del {periodTotals.rate.toFixed(1).replace(".", ",")}%.
                    </Text>
                  </View>
                )}
              </Card>
            </>
          )}
        </ScrollView>
      </Animated.View>

      <DateFilterModal
        visible={dateModalVisible}
        showCustomRange={false}
        onClose={() => setDateModalVisible(false)}
        onSelect={({ from, to, label, type }) => {
          setDateFrom(from);
          setDateTo(to);
          setDateLabel(capitalizeLabel(label));
          setRangeType(type as any);
        }}
      />
    </SafeAreaView>
  );
}
