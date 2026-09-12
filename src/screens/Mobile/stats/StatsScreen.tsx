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
import SegmentedTabs from "../../../components/SegmentedTabs";
import PieChartComponent from "../../../components/PieChart";
import GroupedBarChart from "../../../components/GroupedBarChart";
import TrendChart from "../../../components/TrendChart";
import CategoryBarList, { type CategoryBarItem } from "../../../components/CategoryBarList";
import { MetricColumn } from "../../../components/MetricCard";
import { StatsScreenSkeleton } from "../../../components/skeletons/StatsScreenSkeleton";

import api from "../../../api/api";
import { colors } from "../../../theme/theme";
import { getTransactionsDataVersion, subscribeTransactionsInvalidation } from "../../../utils/transactionsInvalidation";
import { formatEuro as formatEuroBase, formatEuroInt } from "../../../utils/currency";
import { getComparison } from "../../../utils/comparison";

type RangeType = "week" | "month" | "year" | "all";
type MainTab = "resumen" | "gastos" | "ingresos" | "evolucion";
type EvoRange = "6M" | "1A" | "3A" | "Todo";

// Verdes/rojos ligeramente desaturados respecto a los "semánticos" puros —
// el azul de marca se mantiene intacto (colors.primary) en todos los usos
// de ahorro/info.
const GREEN = "#2F9E6E";
const RED = "#D6534A";

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

interface YearBucket {
  year: number;
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

function bucketByYear(list: TxLite[]): YearBucket[] {
  const map = new Map<number, YearBucket>();
  list.forEach((tx) => {
    const y = new Date(tx.date).getFullYear();
    if (!map.has(y)) map.set(y, { year: y, income: 0, expense: 0 });
    const bucket = map.get(y)!;
    if (tx.type === "income") bucket.income += Math.abs(tx.amount);
    else if (tx.type === "expense") bucket.expense += Math.abs(tx.amount);
  });
  return [...map.values()].sort((a, b) => a.year - b.year);
}

function monthLabel(b: { year: number; month: number }, multiYear: boolean) {
  return multiYear ? `${MONTH_ABBR[b.month]} ${String(b.year).slice(2)}` : MONTH_ABBR[b.month];
}

function fullMonthLabel(b: { year: number; month: number }) {
  const raw = new Date(b.year, b.month, 1).toLocaleString("es-ES", { month: "long", year: "numeric" }).replace("de ", "");
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

// Relleno de meses consecutivos con ceros donde no hay datos — así los
// gráficos de tendencia siempre muestran un eje temporal continuo, sin
// saltos cuando un mes no tuvo movimientos.
function fillMonthRange(buckets: MonthBucket[], fromYear: number, fromMonth: number, toYear: number, toMonth: number): MonthBucket[] {
  const map = new Map(buckets.map((b) => [`${b.year}-${b.month}`, b]));
  const result: MonthBucket[] = [];
  let y = fromYear;
  let m = fromMonth;
  while (y < toYear || (y === toYear && m <= toMonth)) {
    result.push(map.get(`${y}-${m}`) ?? { year: y, month: m, income: 0, expense: 0 });
    m += 1;
    if (m > 11) { m = 0; y += 1; }
  }
  return result;
}

function fillYearRange(buckets: YearBucket[], fromYear: number, toYear: number): YearBucket[] {
  const map = new Map(buckets.map((b) => [b.year, b]));
  const result: YearBucket[] = [];
  for (let y = fromYear; y <= toYear; y += 1) {
    result.push(map.get(y) ?? { year: y, income: 0, expense: 0 });
  }
  return result;
}

// ── Card contenedora blanca — usar solo cuando agrupa información real ──
function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View
      style={[
        { backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#EEF0F3", padding: 14 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function SectionTitle({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <View style={{ marginBottom: 11 }}>
      <Text style={{ fontSize: 21, fontWeight: "700", color: "#0F172A" }}>{children}</Text>
      {subtitle ? <Text style={{ fontSize: 13, color: "#8A8F98", marginTop: 3 }}>{subtitle}</Text> : null}
    </View>
  );
}

// Cabecera de sección discreta (semibold) — un escalón por debajo del título
// de página, para no acumular demasiados bloques en negrita a la vez.
function SubHeader({ children }: { children: React.ReactNode }) {
  return <Text style={{ fontSize: 15, fontWeight: "600", color: "#0F172A", marginBottom: 4 }}>{children}</Text>;
}

// Fila financiera limpia (label + valor), usada en "Comparado con..." y
// "Resumen del periodo" — un pequeño punto de color identifica la métrica en
// vez de teñir la cantidad entera.
function FinancialRow({ dot, label, value, first, valueColor }: { dot: string; label: string; value: string; first?: boolean; valueColor?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: first ? 0 : 1, borderTopColor: "#F4F5F7" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot }} />
        <Text style={{ fontSize: 14.5, color: "#5B6472", fontWeight: "500" }}>{label}</Text>
      </View>
      <Text style={{ fontSize: 15, fontWeight: "700", color: valueColor ?? "#0F172A", fontVariant: ["tabular-nums"] }}>{value}</Text>
    </View>
  );
}

export default function StatsScreen({ navigation }: any) {
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<MainTab>("resumen");
  const [catView, setCatView] = useState<"barras" | "circular">("barras");
  const [showAllExpense, setShowAllExpense] = useState(false);
  const [showAllIncome, setShowAllIncome] = useState(false);
  const [evoRange, setEvoRange] = useState<EvoRange>("1A");
  const hasSetDefaultEvoRange = useRef(false);

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

  // Inicializados con el mes actual mediante lazy initializers (no un
  // useEffect de montaje): así el estado se calcula una única vez, en la
  // creación del componente, y nada puede volver a pisarlo más tarde y
  // "resetear" la selección del usuario a este valor por defecto.
  const [dateFrom, setDateFrom] = useState<string | null>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  });
  const [dateTo, setDateTo] = useState<string | null>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
  });
  const [rangeType, setRangeType] = useState<RangeType>("month");
  const [dateLabel, setDateLabel] = useState(() => {
    const now = new Date();
    const raw = now.toLocaleString("es-ES", { month: "long", year: "numeric" }).replace("de ", "");
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  });

  const capitalizeLabel = (label: string) => (label ? label.charAt(0).toUpperCase() + label.slice(1) : label);
  const formatEuro = (n: number) => `${formatEuroBase(n)} €`;
  const formatEuroCompact = (n: number) => `${formatEuroInt(n)} €`;

  const isYearMode = rangeType === "year";

  // Ventana anterior de la misma duración que el periodo seleccionado, para
  // los deltas "vs periodo anterior" — generaliza a semana/mes/año/todo:
  // un mes se compara con el mes anterior, un año con el año anterior, etc.
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
    if (rangeType === "year") {
      return `${new Date(prevRange.to).getFullYear()}`;
    }
    return "el periodo anterior";
  }, [prevRange, rangeType]);

  // Versión corta para las 3 mini-tarjetas KPI ("vs. ago." en vez de
  // "vs. agosto 2026") — evita que el texto salte a una segunda línea.
  const prevLabelShort = useMemo(() => {
    if (!prevRange) return "anterior";
    if (rangeType === "month") return `${MONTH_ABBR[new Date(prevRange.to).getMonth()].toLowerCase()}.`;
    if (rangeType === "year") return `${new Date(prevRange.to).getFullYear()}`;
    return "anterior";
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

  // Histórico amplio (6 años) para las gráficas de tendencia de Evolución —
  // se pide una sola vez y luego todos los rangos (6/12 meses, 5 años...) se
  // recortan en memoria a partir del periodo seleccionado arriba.
  const fetchHistory = useCallback(async () => {
    try {
      const from = new Date();
      from.setFullYear(from.getFullYear() - 6);
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

  // Única fuente de verdad para "vs. periodo anterior" en toda la pantalla:
  // el signo/flecha siempre reflejan la resta matemática tal cual, y el
  // color depende del tipo de métrica (getComparison lo resuelve).
  const incomeComparison = useMemo(() => getComparison(totalIncomes, prevTotalIncomes, "income"), [totalIncomes, prevTotalIncomes]);
  const expenseComparison = useMemo(() => getComparison(totalExpenses, prevTotalExpenses, "expense"), [totalExpenses, prevTotalExpenses]);
  const savingComparison = useMemo(() => getComparison(totalSaving, prevTotalSaving, "savings"), [totalSaving, prevTotalSaving]);

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

  // ── Todo el histórico, agrupado por mes y por año ──
  const monthlyBuckets = useMemo(() => bucketByMonth(historyTransactions), [historyTransactions]);
  const yearlyBuckets = useMemo(() => bucketByYear(historyTransactions), [historyTransactions]);

  // El selector de fecha de arriba a la derecha gobierna TODO: el punto de
  // anclaje de cualquier gráfico de tendencia es siempre el periodo
  // seleccionado, no "hoy". Mes seleccionado → tendencia mensual; año
  // seleccionado → tendencia anual, comparado con el año anterior.
  const anchor = useMemo(() => (dateTo ? new Date(dateTo) : new Date()), [dateTo]);
  const anchorYear = anchor.getFullYear();
  const anchorMonth = anchor.getMonth();

  // Mini-tendencia usada en "Ingresos vs gastos" (Resumen) y "Evolución del
  // gasto/ingreso" (Gastos/Ingresos): en modo año, los 12 meses de ese año;
  // en el resto de modos, los 6 meses que terminan en el periodo elegido.
  const miniTrendBuckets = useMemo(() => {
    if (isYearMode) return fillMonthRange(monthlyBuckets, anchorYear, 0, anchorYear, 11);
    const start = shiftMonth(anchorYear, anchorMonth, -5);
    return fillMonthRange(monthlyBuckets, start.year, start.month, anchorYear, anchorMonth);
  }, [monthlyBuckets, isYearMode, anchorYear, anchorMonth]);
  const miniTrendMultiYear = new Set(miniTrendBuckets.map((b) => b.year)).size > 1;
  const miniTrendLabels = miniTrendBuckets.map((b) => monthLabel(b, miniTrendMultiYear));
  const miniTrendFullLabels = miniTrendBuckets.map((b) => fullMonthLabel(b));
  const miniTrendCaption = isYearMode ? `Año ${anchorYear}` : "Últimos 6 meses";

  // El selector 6M/1A/3A/Todo elige por defecto 1A o 6M según cuánto
  // histórico haya disponible, la primera vez que llegan datos.
  useEffect(() => {
    if (hasSetDefaultEvoRange.current || monthlyBuckets.length === 0) return;
    hasSetDefaultEvoRange.current = true;
    setEvoRange(monthlyBuckets.length >= 12 ? "1A" : "6M");
  }, [monthlyBuckets]);

  // Tendencia de la pestaña Evolución, la más analítica: en modo año, los
  // últimos 5 años (comparados año a año, sin selector); en el resto, la
  // ventana elegida en el selector 6M/1A/3A/Todo, terminando en el periodo
  // seleccionado arriba.
  const evoSeries = useMemo(() => {
    if (isYearMode) {
      const startYear = anchorYear - 4;
      return fillYearRange(yearlyBuckets, startYear, anchorYear).map((b) => ({ label: String(b.year), fullLabel: `Año ${b.year}`, income: b.income, expense: b.expense }));
    }
    const start = evoRange === "Todo"
      ? (monthlyBuckets[0] ?? { year: anchorYear, month: anchorMonth })
      : shiftMonth(anchorYear, anchorMonth, evoRange === "6M" ? -5 : evoRange === "1A" ? -11 : -35);
    const filled = fillMonthRange(monthlyBuckets, start.year, start.month, anchorYear, anchorMonth);
    const multiYear = new Set(filled.map((b) => b.year)).size > 1;
    return filled.map((b) => ({ label: monthLabel(b, multiYear), fullLabel: fullMonthLabel(b), income: b.income, expense: b.expense }));
  }, [isYearMode, yearlyBuckets, monthlyBuckets, anchorYear, anchorMonth, evoRange]);
  const evoLabels = evoSeries.map((b) => b.label);
  const evoFullLabels = evoSeries.map((b) => b.fullLabel);
  const evoHasData = evoSeries.some((b) => b.income !== 0 || b.expense !== 0);
  const evoCaption = isYearMode ? `Últimos 5 años · hasta ${anchorYear}` : `${evoSeries.length} meses · hasta ${dateLabel}`;

  const periodTotals = useMemo(() => {
    const income = evoSeries.reduce((s, b) => s + b.income, 0);
    const expense = evoSeries.reduce((s, b) => s + b.expense, 0);
    return { income, expense, saving: income - expense, rate: income > 0 ? ((income - expense) / income) * 100 : 0 };
  }, [evoSeries]);

  const topExpenseCategory = expenses[0] ?? null;

  const insights = useMemo(() => {
    const list: { icon: keyof typeof Ionicons.glyphMap; tint: string; color: string; title: string; subtitle: string; onPress?: () => void }[] = [];

    if (topExpenseCategory) {
      const pct = totalExpenses > 0 ? (topExpenseCategory.amount / totalExpenses) * 100 : 0;
      list.push({
        icon: "pie-chart-outline", tint: `${topExpenseCategory.color}1F`, color: topExpenseCategory.color,
        title: `${topExpenseCategory.name} concentra el ${pct.toFixed(1).replace(".", ",")}% de tus gastos`,
        subtitle: `${formatEuro(topExpenseCategory.amount)} este ${isYearMode ? "año" : "mes"}.`,
        onPress: () => setActiveTab("gastos"),
      });
    }

    if (prevTotalExpenses > 0 && expenseComparison.direction !== "neutral") {
      const less = expenseComparison.direction === "down";
      list.push({
        icon: less ? "trending-down-outline" : "trending-up-outline",
        tint: expenseComparison.isPositiveForUser ? "#E4F4EC" : "#FBEAE8",
        color: expenseComparison.isPositiveForUser ? GREEN : RED,
        title: `Has gastado un ${expenseComparison.formattedPercentage} ${less ? "menos" : "más"} que en ${prevLabel.toLowerCase()}`,
        subtitle: `${expenseComparison.formattedDifference} respecto al periodo anterior.`,
        onPress: () => setActiveTab("gastos"),
      });
    }

    if (prevTotalIncomes > 0 || prevTotalExpenses > 0) {
      const up = savingComparison.direction !== "down";
      list.push({
        icon: up ? "shield-checkmark-outline" : "alert-circle-outline",
        tint: up ? "#EEF2FC" : "#FBEAE8", color: up ? colors.primary : RED,
        title: `Tu tasa de ahorro ha ${up ? "mejorado" : "empeorado"}`,
        subtitle: `${savingsRate.toFixed(1).replace(".", ",")}% este periodo.`,
        onPress: () => setActiveTab("evolucion"),
      });
    }

    return list;
  }, [topExpenseCategory, totalExpenses, prevTotalExpenses, expenseComparison, prevLabel, prevTotalIncomes, savingComparison, savingsRate, isYearMode]);

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

        <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
          <SegmentedTabs<MainTab>
            variant="solid"
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
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, gap: 14 }}
          scrollEventThrottle={16}
          onScroll={(e) => { if (Platform.OS === "web") webScrollAtTop.current = e.nativeEvent.contentOffset.y <= 0; }}
          refreshControl={Platform.OS !== "web" ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
        >
          {activeTab === "resumen" && (
            <>
              <View>
                <SectionTitle subtitle={`Así ha sido tu actividad en ${dateLabel.toLowerCase()}.`}>
                  {isYearMode ? "Resumen del año" : "Resumen del mes"}
                </SectionTitle>

                <Card style={{ flexDirection: "row" }}>
                  <MetricColumn first label="Ingresos" value={formatEuroCompact(totalIncomes)} comparison={incomeComparison} compareLabel={`vs. ${prevLabelShort}`} />
                  <MetricColumn label="Gastos" value={formatEuroCompact(totalExpenses)} comparison={expenseComparison} compareLabel={`vs. ${prevLabelShort}`} />
                  <MetricColumn muted label="Ahorro" value={formatEuroCompact(totalSaving)} comparison={savingComparison} compareLabel={`vs. ${prevLabelShort}`} />
                </Card>

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 10, paddingHorizontal: 2 }}>
                  <Text style={{ fontSize: 14.5, color: "#5B6472", fontWeight: "500" }}>Tasa de ahorro</Text>
                  <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A", fontVariant: ["tabular-nums"] }}>{savingsRate.toFixed(1).replace(".", ",")} %</Text>
                </View>
                <View style={{ height: 3, borderRadius: 2, backgroundColor: "#F1F2F4", marginTop: 8, overflow: "hidden" }}>
                  <View style={{ width: `${Math.max(0, Math.min(100, savingsRate))}%`, height: "100%", backgroundColor: colors.primary, borderRadius: 2 }} />
                </View>
              </View>

              <Card>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#0F172A" }}>Ingresos vs gastos</Text>
                  <Text style={{ fontSize: 12, color: "#B0B4BA", fontWeight: "500" }}>{miniTrendCaption}</Text>
                </View>
                <GroupedBarChart
                  xLabels={miniTrendLabels}
                  tooltipLabels={miniTrendFullLabels}
                  series={[
                    { label: "Ingresos", color: "#4ADE80", values: miniTrendBuckets.map((b) => b.income) },
                    { label: "Gastos", color: "#F87171", values: miniTrendBuckets.map((b) => b.expense) },
                  ]}
                />
              </Card>

              <View>
                <SubHeader>Comparado con {prevLabel}</SubHeader>
                <FinancialRow
                  first
                  dot={GREEN}
                  label="Ingresos"
                  value={incomeComparison.formattedDifference}
                  valueColor={incomeComparison.direction === "neutral" ? undefined : incomeComparison.isPositiveForUser ? GREEN : RED}
                />
                <FinancialRow
                  dot={RED}
                  label="Gastos"
                  value={expenseComparison.formattedDifference}
                  valueColor={expenseComparison.direction === "neutral" ? undefined : expenseComparison.isPositiveForUser ? GREEN : RED}
                />
                <FinancialRow
                  dot={colors.primary}
                  label="Ahorro"
                  value={savingComparison.formattedDifference}
                  valueColor={savingComparison.direction === "neutral" ? undefined : savingComparison.isPositiveForUser ? GREEN : RED}
                />
              </View>

              {insights.length > 0 && (() => {
                const ins = insights[0];
                return (
                  <View>
                    <SubHeader>{isYearMode ? "Insight del año" : "Insight del mes"}</SubHeader>
                    <TouchableOpacity
                      onPress={ins.onPress}
                      activeOpacity={0.7}
                      style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 12 }}
                    >
                      <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: ins.tint, alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name={ins.icon} size={15} color={ins.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13.5, fontWeight: "600", color: "#0F172A" }}>{ins.title}</Text>
                        <Text style={{ fontSize: 12, color: "#8A8F98", marginTop: 2 }}>{ins.subtitle}</Text>
                      </View>
                      {ins.onPress ? <Ionicons name="chevron-forward" size={14} color="#D1D5DB" /> : null}
                    </TouchableOpacity>
                  </View>
                );
              })()}
            </>
          )}

          {(activeTab === "gastos" || activeTab === "ingresos") && (() => {
            const isExpense = activeTab === "gastos";
            const list = isExpense ? expenses : incomes;
            const total = isExpense ? totalExpenses : totalIncomes;
            const prevTotal = isExpense ? prevTotalExpenses : prevTotalIncomes;
            const comparison = isExpense ? expenseComparison : incomeComparison;
            const deltaColor = comparison.direction === "neutral" ? "#9CA3AF" : comparison.isPositiveForUser ? GREEN : RED;
            const pieData = isExpense ? expensePieData : incomePieData;
            const showAll = isExpense ? showAllExpense : showAllIncome;
            const setShowAll = isExpense ? setShowAllExpense : setShowAllIncome;
            const barItems = toBarItems(list, total, isExpense ? "expense" : "income", showAll);
            const evoSeriesValues = miniTrendBuckets.map((b) => (isExpense ? b.expense : b.income));

            const legendTop = list.slice(0, 4);
            const legendRestPct = legendTop.reduce((s, c) => s + (total > 0 ? (c.amount / total) * 100 : 0), 0);
            const restPct = Math.max(0, 100 - legendRestPct);

            const heroBlock = (
              <View key="hero">
                <Text style={{ fontSize: 14, color: "#8A8F98", fontWeight: "500" }}>{isExpense ? "Gasto total" : "Ingresos totales"}</Text>
                <Text style={{ fontSize: 30, fontWeight: "700", color: "#0F172A", marginTop: 3, fontVariant: ["tabular-nums"] }} numberOfLines={1} adjustsFontSizeToFit>
                  {formatEuro(total)}
                </Text>
                {(prevTotal > 0 || comparison.isNew) && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
                    {comparison.direction !== "neutral" && (
                      <Ionicons name={comparison.direction === "up" ? "arrow-up" : "arrow-down"} size={12} color={deltaColor} />
                    )}
                    <Text style={{ fontSize: 13, fontWeight: "600", color: deltaColor }}>{comparison.formattedPercentage}</Text>
                    <Text style={{ fontSize: 13, color: "#8A8F98" }}>vs. {prevLabel.toLowerCase()}</Text>
                  </View>
                )}
              </View>
            );

            const categoriesBlock = (
              <View key="categories">
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <SubHeader>Distribución por categorías</SubHeader>
                  <SegmentedTabs<"barras" | "circular">
                    compact
                    options={[{ key: "barras", label: "Barras" }, { key: "circular", label: "Circular" }]}
                    value={catView}
                    onChange={setCatView}
                  />
                </View>

                {list.length === 0 ? (
                  <Text style={{ color: "#8A8F98", fontSize: 13, textAlign: "center", paddingVertical: 12 }}>
                    Sin {isExpense ? "gastos" : "ingresos"} en este periodo.
                  </Text>
                ) : catView === "circular" ? (
                  <Card style={{ alignItems: "center", borderColor: "#F2F3F5" }}>
                    <PieChartComponent size={132} innerRadius={44} mode={isExpense ? "expense" : "income"} data={pieData} incomes={totalIncomes} expenses={totalExpenses} />
                    <View style={{ width: "100%", marginTop: 14, gap: 9 }}>
                      {legendTop.map((c) => (
                        <View key={c.name} style={{ flexDirection: "row", alignItems: "center" }}>
                          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.color, marginRight: 8 }} />
                          <Text style={{ flex: 1, fontSize: 13.5, color: "#0F172A", fontWeight: "500" }} numberOfLines={1}>{c.name}</Text>
                          <Text style={{ fontSize: 13.5, color: "#5B6472", fontWeight: "600" }}>
                            {(total > 0 ? (c.amount / total) * 100 : 0).toFixed(1).replace(".", ",")}%
                          </Text>
                        </View>
                      ))}
                      {restPct > 0.5 && list.length > 4 && (
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#E5E7EB", marginRight: 8 }} />
                          <Text style={{ flex: 1, fontSize: 13.5, color: "#8A8F98", fontWeight: "500" }}>Resto</Text>
                          <Text style={{ fontSize: 13.5, color: "#8A8F98", fontWeight: "600" }}>{restPct.toFixed(1).replace(".", ",")}%</Text>
                        </View>
                      )}
                    </View>
                  </Card>
                ) : (
                  <Card style={{ borderColor: "#F2F3F5" }}>
                    <CategoryBarList items={barItems} />
                    {list.length > 5 && (
                      <TouchableOpacity onPress={() => setShowAll(!showAll)} activeOpacity={0.7} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 10, marginTop: 2, borderTopWidth: 1, borderTopColor: "#F1F2F4" }}>
                        <Text style={{ fontSize: 13.5, fontWeight: "600", color: colors.primary }}>{showAll ? "Ver menos" : "Ver todas"}</Text>
                        <Ionicons name={showAll ? "chevron-up" : "chevron-forward"} size={15} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                  </Card>
                )}
              </View>
            );

            const evolutionBlock = (
              <Card key="evolution">
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#0F172A" }}>
                    Evolución {isExpense ? "del gasto" : "de ingresos"}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#B0B4BA", fontWeight: "500" }}>{miniTrendCaption}</Text>
                </View>
                <GroupedBarChart
                  xLabels={miniTrendLabels}
                  tooltipLabels={miniTrendFullLabels}
                  series={[{ label: isExpense ? "Gastos" : "Ingresos", color: isExpense ? "#FCA5A5" : "#86EFAC", values: evoSeriesValues }]}
                />
              </Card>
            );

            return (
              <>
                {heroBlock}
                {categoriesBlock}
                {evolutionBlock}
              </>
            );
          })()}

          {activeTab === "evolucion" && (
            <>
              <View style={{ gap: 8 }}>
                {!isYearMode && (
                  <SegmentedTabs<EvoRange>
                    compact
                    options={[{ key: "6M", label: "6M" }, { key: "1A", label: "1A" }, { key: "3A", label: "3A" }, { key: "Todo", label: "Todo" }]}
                    value={evoRange}
                    onChange={setEvoRange}
                  />
                )}
                <Text style={{ fontSize: 13, color: "#8A8F98", fontWeight: "500" }}>{evoCaption}</Text>
              </View>

              <Card>
                {!evoHasData ? (
                  <Text style={{ color: "#8A8F98", fontSize: 13, textAlign: "center", paddingVertical: 20 }}>
                    Todavía no hay suficiente histórico.
                  </Text>
                ) : (
                  <TrendChart
                    xLabels={evoLabels}
                    tooltipLabels={evoFullLabels}
                    series={[
                      { key: "income", label: "Ingresos", color: GREEN, values: evoSeries.map((b) => b.income) },
                      { key: "expense", label: "Gastos", color: RED, values: evoSeries.map((b) => b.expense) },
                      { key: "saving", label: "Ahorro", color: colors.primary, values: evoSeries.map((b) => b.income - b.expense), area: true },
                    ]}
                  />
                )}
              </Card>

              <View>
                <SubHeader>Resumen del periodo</SubHeader>
                <FinancialRow first dot={GREEN} label="Ingresos totales" value={formatEuro(periodTotals.income)} />
                <FinancialRow dot={RED} label="Gastos totales" value={formatEuro(periodTotals.expense)} />
                <FinancialRow dot={colors.primary} label="Ahorro" value={formatEuro(periodTotals.saving)} />
                <FinancialRow dot="#0F172A" label="Tasa de ahorro" value={`${periodTotals.rate.toFixed(1).replace(".", ",")} %`} />
              </View>

              {evoHasData && (
                <View style={{ flexDirection: "row", alignItems: "flex-start", backgroundColor: "#F3F6FB", borderRadius: 14, padding: 12, gap: 10 }}>
                  <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: "white", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#5B6472", textTransform: "uppercase", letterSpacing: 0.3 }}>Insight</Text>
                    <Text style={{ fontSize: 13, color: "#374151", marginTop: 2, lineHeight: 18 }}>
                      Tu tasa de ahorro media en {isYearMode ? "los últimos 5 años" : "los últimos 12 meses"} ha sido del {periodTotals.rate.toFixed(1).replace(".", ",")}%.
                    </Text>
                  </View>
                </View>
              )}
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
