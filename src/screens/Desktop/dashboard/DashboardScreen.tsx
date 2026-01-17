// src/screens/Desktop/dashboard/DashboardScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import api from "../../../api/api";
import { colors } from "../../../theme/theme";

import PieChartComponent from "../../../components/PieChart";
import DesktopPeriodChart from "../../../components/DesktopPeriodChart";
import DesktopDateTimeFilterModal from "../../../components/DesktopDateTimeFilterModal";
import { WalletPickerModal } from "../../../components/WalletPickerModal";

import { textStyles, typography } from "../../../theme/typography";
import { useCreateTxModal } from "../../../context/CreateTxModalContext";
import DesktopTransactionsTable from "../../../components/DesktopTransactionsTable";
import { KpiCard } from "../../../components/KpiCard";

type GraphType = "expense" | "income";
type RangeType = "week" | "month" | "year" | "all";

type SummaryResponse = {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  savingsRate: number;
};

type TxLite = {
  id?: number;
  type: "income" | "expense" | "transfer";
  amount: number;
  date: string;
  isRecurring?: boolean;
  active?: boolean;
  excludeFromStats?: boolean;

  category?: { name: string; emoji: string; color: string };
  subcategory?: { name: string } | null;

  note?: string | null;
  description?: string | null;
};

type CategoryAgg = {
  name: string;
  emoji: string;
  color: string;
  amount: number;
  count: number;
};

type Wallet = {
  id: number;
  name: string;
  balance?: number;
  currentBalance?: number;
  amount?: number;
  total?: number;
};

function capitalizeLabel(label: string) {
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : label;
}

function formatEuro(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `${v.toFixed(1).replace(".", ",")}%`;
}

function getWalletBalance(w: Wallet) {
  const v =
    Number(w.balance) ||
    Number(w.currentBalance) ||
    Number(w.amount) ||
    Number(w.total) ||
    0;
  return Number.isFinite(v) ? v : 0;
}

function initCurrentMonth() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
  const rawLabel = now
    .toLocaleString("es-ES", { month: "long", year: "numeric" })
    .replace("de ", "");
  return { from, to, label: capitalizeLabel(rawLabel), type: "month" as RangeType };
}

function groupByCategory(list: TxLite[]) {
  const incomeMap: Record<string, CategoryAgg> = {};
  const expenseMap: Record<string, CategoryAgg> = {};

  list.forEach((tx) => {
    if (!tx.category) return;
    if (tx.type !== "income" && tx.type !== "expense") return;

    const key = tx.category.name;
    const bucket = tx.type === "income" ? incomeMap : expenseMap;

    if (!bucket[key]) {
      bucket[key] = {
        name: tx.category.name,
        emoji: tx.category.emoji,
        color: tx.category.color,
        amount: 0,
        count: 0,
      };
    }

    bucket[key].amount += Math.abs(tx.amount);
    bucket[key].count += 1;
  });

  const incomes = Object.values(incomeMap).sort((a, b) => b.amount - a.amount);
  const expenses = Object.values(expenseMap).sort((a, b) => b.amount - a.amount);

  return { incomes, expenses };
}

function generateBars(list: TxLite[], from: string, to: string, type: RangeType) {
  if (!from || !to) return [];

  const start = new Date(from);
  const end = new Date(to);

  if (type === "week") {
    const days = new Array(7).fill(0);
    list.forEach((item) => {
      const d = new Date(item.date);
      const diff = Math.floor((d.getTime() - start.getTime()) / 86400000);
      if (diff >= 0 && diff < 7) days[diff] += Math.abs(item.amount);
    });
    return days;
  }

  if (type === "month") {
    const buckets = [0, 0, 0, 0, 0];
    list.forEach((item) => {
      const d = new Date(item.date);
      if (d < start || d > end) return;
      const day = d.getDate();
      const idx = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : day <= 28 ? 3 : 4;
      buckets[idx] += Math.abs(item.amount);
    });
    if (buckets[4] === 0) buckets.pop();
    return buckets;
  }

  if (type === "year") {
    const months = new Array(12).fill(0);
    list.forEach((item) => {
      const m = new Date(item.date).getMonth();
      months[m] += Math.abs(item.amount);
    });
    return months;
  }

  if (type === "all") {
    const map: Record<number, number> = {};
    list.forEach((item) => {
      const y = new Date(item.date).getFullYear();
      if (!map[y]) map[y] = 0;
      map[y] += Math.abs(item.amount);
    });
    return Object.values(map);
  }

  return [];
}

function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Escalado responsive (laptop vs monitor) */
function useUiScale() {
  const { width } = Dimensions.get("window");

  const s = useMemo(() => {
    const raw = width / 1440;
    return Math.max(0.86, Math.min(1.08, raw));
  }, [width]);

  const px = useCallback((n: number) => Math.round(n * s), [s]);
  const fs = useCallback((n: number) => Math.round(n * s), [s]);

  return { s, px, fs, width };
}

/** Encabezado sección (sin cajita) */
function SectionTitle({
  title,
  right,
  px,
  fs,
}: {
  title: string;
  right?: React.ReactNode;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: px(12),
      }}
    >
      <Text style={[textStyles.labelMuted, { fontSize: fs(12), color: "#64748B", letterSpacing: 0.4 }]}>
        {title}
      </Text>
      {!!right && <View>{right}</View>}
    </View>
  );
}

function Segmented({
  value,
  onChange,
  px,
  fs,
}: {
  value: RangeType;
  onChange: (v: RangeType) => void;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  const items: Array<{ key: RangeType; label: string }> = [
    { key: "week", label: "Semana" },
    { key: "month", label: "Mes" },
    { key: "year", label: "Año" },
  ];

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: "rgba(15,23,42,0.06)",
        padding: px(4),
        borderRadius: px(12),
        height: px(40),
      }}
    >
      {items.map((x) => {
        const active = value === x.key;
        return (
          <TouchableOpacity
            key={x.key}
            activeOpacity={0.9}
            onPress={() => onChange(x.key)}
            style={{
              paddingHorizontal: px(12),
              alignItems: "center",
              justifyContent: "center",
              borderRadius: px(10),
              backgroundColor: active ? "white" : "transparent",
              shadowColor: active ? "#0B1220" : "transparent",
              shadowOpacity: active ? 0.08 : 0,
              shadowRadius: px(10),
              shadowOffset: { width: 0, height: px(6) },
            }}
          >
            <Text
              style={[
                textStyles.label,
                {
                  fontSize: fs(12),
                  fontWeight: active ? "800" : "700",
                  color: active ? "#0F172A" : "#64748B",
                },
              ]}
            >
              {x.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** Top toolbar button */
function TopButton({
  icon,
  label,
  onPress,
  px,
  fs,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label?: string;
  onPress: () => void;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  const [hover, setHover] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      style={{
        height: px(40),
        paddingHorizontal: label ? px(12) : 0,
        width: label ? undefined : px(40),
        borderRadius: px(12),
        backgroundColor: hover ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.90)",
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.25)",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: label ? px(8) : 0,
      }}
    >
      <Ionicons name={icon} size={px(18)} color="#475569" />
      {!!label && (
        <Text style={[textStyles.button, { fontSize: fs(12), fontWeight: "600", color: "#475569" }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/** Selector Gastos/Ingresos */
function GraphTypePill({
  value,
  onChange,
  px,
  fs,
}: {
  value: GraphType;
  onChange: (v: GraphType) => void;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  const Item = ({ k, label, icon }: { k: GraphType; label: string; icon: keyof typeof Ionicons.glyphMap }) => {
    const active = value === k;
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onChange(k)}
        style={{
          flex: 1,
          height: px(36),
          borderRadius: px(12),
          backgroundColor: active ? "white" : "transparent",
          shadowColor: active ? "#0B1220" : "transparent",
          shadowOpacity: active ? 0.08 : 0,
          shadowRadius: px(10),
          shadowOffset: { width: 0, height: px(6) },
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: px(6),
        }}
      >
        <Ionicons name={icon} size={px(14)} color={active ? "#0F172A" : "#64748B"} />
        <Text
          style={[
            textStyles.label,
            {
              fontSize: fs(11),
              fontWeight: active ? "800" : "700",
              color: active ? "#0F172A" : "#64748B",
            },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: "rgba(15,23,42,0.06)",
        padding: px(3),
        borderRadius: px(14),
        width: px(230),
      }}
    >
      <Item k="expense" label="Gastos" icon="arrow-down-outline" />
      <Item k="income" label="Ingresos" icon="arrow-up-outline" />
    </View>
  );
}

function daysBetweenInclusive(fromISO: string | null, toISO: string | null) {
  if (!fromISO || !toISO) return 0;
  const a = new Date(fromISO);
  const b = new Date(toISO);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
  return Math.max(1, diff + 1);
}

/** Header sticky para la sección de transacciones */
function StickyTxHeader({
  title,
  right,
  px,
  fs,
}: {
  title: string;
  right?: React.ReactNode;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  return (
    <View
      style={{
        position: "sticky" as any,
        top: 0,
        zIndex: 20,
        backgroundColor: "#F6F8FC",
        paddingTop: px(10),
        paddingBottom: px(10),
      }}
    >
      <View style={{ paddingHorizontal: px(2) }}>
        <SectionTitle title={title} right={right} px={px} fs={fs} />
      </View>
      <View style={{ marginTop: px(10), height: 1, backgroundColor: "rgba(148,163,184,0.20)" }} />
    </View>
  );
}

export default function DashboardScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);

  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [rangeType, setRangeType] = useState<RangeType>("month");
  const [dateLabel, setDateLabel] = useState<string>("");

  const [graphType, setGraphType] = useState<GraphType>("expense");

  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [transactions, setTransactions] = useState<TxLite[]>([]);
  const [netWorth, setNetWorth] = useState<number>(0);

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);

  const [showAllTx, setShowAllTx] = useState(false);
  const [txQuery, setTxQuery] = useState("");
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);

  const { px, fs, width } = useUiScale();

  const { openEditTx } = useCreateTxModal();

  const CHART_H = px(280);

  useEffect(() => {
    const { from, to, label, type } = initCurrentMonth();
    setDateFrom(from);
    setDateTo(to);
    setDateLabel(label);
    setRangeType(type);
  }, []);

  const fetchAll = useCallback(async () => {
    if (!dateFrom || !dateTo) return;

    try {
      setLoading(true);

      const txParams: any = { dateFrom, dateTo };
      if (selectedWallet?.id) txParams.walletId = selectedWallet.id;

      const [walletsRes, txRes] = await Promise.all([
        api.get("/wallets"),
        api.get("/transactions", { params: txParams }),
      ]);

      const walletsList: Wallet[] = Array.isArray(walletsRes.data) ? walletsRes.data : [];
      setWallets(walletsList);

      if (selectedWallet?.id) {
        const w = walletsList.find((x) => x.id === selectedWallet.id);
        setNetWorth(w ? getWalletBalance(w) : 0);
      } else {
        const sum = walletsList.reduce((acc, w) => acc + getWalletBalance(w), 0);
        setNetWorth(sum);
      }

      const filtered = (txRes.data || [])
        .filter((tx: any) => tx.type !== "transfer")
        .filter((tx: any) => tx.isRecurring === false)
        .filter((tx: any) => tx.active !== false)
        .filter((tx: any) => tx.excludeFromStats !== true);

      filtered.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(filtered);

      const localIncome = filtered
        .filter((t: any) => t.type === "income")
        .reduce((s: number, t: any) => s + Math.abs(Number(t.amount) || 0), 0);

      const localExpense = filtered
        .filter((t: any) => t.type === "expense")
        .reduce((s: number, t: any) => s + Math.abs(Number(t.amount) || 0), 0);

      const localBalance = localIncome - localExpense;
      const localSavingsRate = localIncome > 0 ? (localBalance / localIncome) * 100 : 0;

      setSummary({
        totalIncome: localIncome,
        totalExpenses: localExpense,
        balance: localBalance,
        savingsRate: localSavingsRate,
      });
    } catch (e) {
      console.error("❌ Error cargando dashboard:", e);
      setSummary(null);
      setTransactions([]);
      setWallets([]);
      setNetWorth(0);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, selectedWallet?.id]);

  useFocusEffect(
    useCallback(() => {
      if (!dateFrom || !dateTo) return;
      fetchAll();
    }, [fetchAll, dateFrom, dateTo])
  );

  useEffect(() => {
    if (!dateFrom || !dateTo) return;
    fetchAll();
  }, [dateFrom, dateTo, selectedWallet?.id, fetchAll]);

  const { incomes, expenses } = useMemo(() => groupByCategory(transactions), [transactions]);

  const totalIncome = summary?.totalIncome ?? 0;
  const totalExpenses = summary?.totalExpenses ?? 0;
  const balancePeriod = summary?.balance ?? 0;
  const savingsRate = summary?.savingsRate ?? 0;

  const txByType = useMemo(
    () => transactions.filter((t) => t.type === graphType),
    [transactions, graphType]
  );

  const bars = useMemo(() => {
    if (!dateFrom || !dateTo) return [];
    return generateBars(txByType as any, dateFrom, dateTo, rangeType).map((v) => ({
      display: v,
      real: v,
    }));
  }, [txByType, dateFrom, dateTo, rangeType]);

  const barLabels = useMemo(() => {
    if (rangeType === "week") return ["L", "M", "X", "J", "V", "S", "D"];
    if (rangeType === "month") return bars.map((_, i) => `S${i + 1}`);
    if (rangeType === "year") return ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
    if (rangeType === "all") {
      const years = new Set(transactions.map((t) => new Date(t.date).getFullYear()));
      return [...years].sort();
    }
    return [];
  }, [rangeType, bars, transactions]);

  const pieData = useMemo(() => {
    const base = graphType === "income" ? incomes : expenses;
    const denom = graphType === "income" ? totalIncome : totalExpenses;

    return base.map((c) => ({
      value: c.amount,
      realValue: c.amount,
      color: c.color,
      label: c.name,
      percent: denom > 0 ? (c.amount / denom) * 100 : 0,
    }));
  }, [graphType, incomes, expenses, totalIncome, totalExpenses]);

  const filteredTransactions = useMemo(() => {
    const q = norm(txQuery);

    return transactions.filter((t) => {
      if (selectedCategoryName) {
        const catName = t?.category?.name ?? "";
        if (catName !== selectedCategoryName) return false;
      }

      if (!q) return true;

      const haystack = norm(
        [t?.category?.name, t?.subcategory?.name, t?.note, t?.description]
          .filter(Boolean)
          .join(" ")
      );
      return haystack.includes(q);
    });
  }, [transactions, txQuery, selectedCategoryName]);

  const txPreview = useMemo(() => {
    const base = filteredTransactions;
    if (showAllTx) return base;
    return base.slice(0, 18);
  }, [filteredTransactions, showAllTx]);

  return (
    <View style={{ flex: 1, backgroundColor: "#F6F8FC" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: px(22),
          paddingTop: px(18),
          paddingBottom: px(90),
          maxWidth: px(1400),
          width: "100%",
          alignSelf: "center",
        }}
      >
        {/* ===== Top toolbar ===== */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: px(14),
            marginBottom: px(14),
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={[textStyles.h1, { fontSize: fs(22), color: "#0F172A" }]}>{dateLabel || "—"}</Text>
            <Text style={[textStyles.bodyMuted, { marginTop: px(4), fontSize: fs(12), color: "#64748B" }]}>
              {selectedWallet ? selectedWallet.name : "Todas las carteras"}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: px(10) }}>
            <TopButton icon="calendar-outline" label="Fechas" onPress={() => setDateModalVisible(true)} px={px} fs={fs} />
            <TopButton
              icon="wallet-outline"
              label={selectedWallet ? "Cartera" : "Carteras"}
              onPress={() => setWalletModalVisible(true)}
              px={px}
              fs={fs}
            />
            <TopButton icon="refresh-outline" onPress={fetchAll} px={px} fs={fs} />
          </View>

          {Platform.OS === "web" && (
            <View
              style={{
                height: px(40),
                width: px(360),
                borderRadius: px(14),
                borderWidth: 1,
                borderColor: "rgba(148,163,184,0.25)",
                backgroundColor: "rgba(255,255,255,0.90)",
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: px(12),
                gap: px(8),
              }}
            >
              <Ionicons name="search-outline" size={px(16)} color="#64748B" />
              {/* @ts-ignore */}
              <input
                value={txQuery}
                onChange={(e: any) => setTxQuery(e?.target?.value ?? "")}
                placeholder="Buscar transacciones..."
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  fontSize: fs(13),
                  fontFamily: typography.family.base,
                  fontWeight: 600,
                  background: "transparent",
                  color: "#0F172A",
                }}
              />
              {!!txQuery && (
                <TouchableOpacity activeOpacity={0.9} onPress={() => setTxQuery("")}>
                  <Ionicons name="close-circle" size={px(16)} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* ===== KPI row ===== */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: px(14) }}>
          <KpiCard
            title="PATRIMONIO TOTAL"
            value={loading ? "—" : formatEuro(netWorth)}
            subtitle={
              <Text style={[textStyles.caption, { fontSize: fs(12), color: "#94A3B8", fontWeight: "800" }]} numberOfLines={1}>
                {selectedWallet ? "Balance de la cartera" : "Suma de balances de carteras"}
              </Text>
            }
            icon="briefcase-outline"
            variant="premium"
            px={px}
            fs={fs}
          />

          <KpiCard
            title="BALANCE"
            value={loading ? "—" : formatEuro(balancePeriod)}
            subtitle={
              loading ? null : (
                <Text style={[textStyles.caption, { fontSize: fs(12), color: "#94A3B8", fontWeight: "800" }]} numberOfLines={1}>
                  Ahorro:{" "}
                  <Text style={{ color: balancePeriod >= 0 ? "#16A34A" : "#DC2626", fontWeight: "900" }}>
                    {formatPercent(savingsRate)}
                  </Text>
                </Text>
              )
            }
            icon="stats-chart-outline"
            tone="info"
            px={px}
            fs={fs}
          />

          <KpiCard
            title="INGRESOS"
            value={loading ? "—" : formatEuro(totalIncome)}
            subtitle={
              <Text style={[textStyles.caption, { fontSize: fs(12), color: "#94A3B8", fontWeight: "800" }]} numberOfLines={1}>
                {dateLabel || ""}
              </Text>
            }
            icon="arrow-up-outline"
            tone="success"
            px={px}
            fs={fs}
          />

          <KpiCard
            title="GASTOS"
            value={loading ? "—" : formatEuro(totalExpenses)}
            subtitle={
              <Text style={[textStyles.caption, { fontSize: fs(12), color: "#94A3B8", fontWeight: "800" }]} numberOfLines={1}>
                {dateLabel || ""}
              </Text>
            }
            icon="arrow-down-outline"
            tone="danger"
            px={px}
            fs={fs}
          />
        </View>

        {/* ===== Controls row ===== */}
        <View style={{ marginTop: px(14), flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <GraphTypePill value={graphType} onChange={setGraphType} px={px} fs={fs} />
        </View>

        {/* ===== Charts row (sin “Top categories”) ===== */}
        <View style={{ marginTop: px(12), flexDirection: width >= 1120 ? "row" : "column", gap: px(12) }}>
          {/* Evolución */}
          <View
            style={{
              flex: 1,
              backgroundColor: "white",
              borderRadius: px(16),
              padding: px(16),
              shadowColor: "#0B1220",
              shadowOpacity: 0.06,
              shadowRadius: px(18),
              shadowOffset: { width: 0, height: px(10) },
            }}
          >
            <SectionTitle
              title={graphType === "expense" ? "Evolución de gastos" : "Evolución de ingresos"}
              right={<Segmented value={rangeType} onChange={setRangeType} px={px} fs={fs} />}
              px={px}
              fs={fs}
            />
            <View style={{ marginTop: px(10), height: CHART_H }}>
              {loading ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : (
                <DesktopPeriodChart data={bars as any} labels={barLabels as any} height={CHART_H} />
              )}
            </View>
          </View>

          {/* Donut */}
          <View
            style={{
              width: width >= 1120 ? px(420) : "100%",
              backgroundColor: "white",
              borderRadius: px(16),
              padding: px(16),
              shadowColor: "#0B1220",
              shadowOpacity: 0.06,
              shadowRadius: px(18),
              shadowOffset: { width: 0, height: px(10) },
            }}
          >
            <SectionTitle title="Distribución por categorías" px={px} fs={fs} />
            <View style={{ marginTop: px(10), height: CHART_H, alignItems: "center", justifyContent: "center" }}>
              {loading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <PieChartComponent
                  mode={graphType}
                  data={pieData as any}
                  incomes={totalIncome}
                  expenses={totalExpenses}
                />
              )}
            </View>
          </View>
        </View>

        {/* ===== Transacciones a TODO ANCHO: tabla sobre el fondo + header sticky + divider ===== */}
        <View style={{ marginTop: px(16) }}>
          <StickyTxHeader
            title="Transacciones del periodo"
            right={
              <View style={{ flexDirection: "row", alignItems: "center", gap: px(8) }}>
                {selectedCategoryName && (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => setSelectedCategoryName(null)}
                    style={{
                      height: px(34),
                      paddingHorizontal: px(10),
                      borderRadius: 999,
                      backgroundColor: "rgba(37,99,235,0.08)",
                      borderWidth: 1,
                      borderColor: "rgba(37,99,235,0.18)",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: px(6),
                      maxWidth: px(260),
                    }}
                  >
                    <Text style={[textStyles.label, { fontSize: fs(12), fontWeight: "900", color: "#0F172A" }]} numberOfLines={1}>
                      {selectedCategoryName}
                    </Text>
                    <Ionicons name="close" size={px(14)} color="#0F172A" />
                  </TouchableOpacity>
                )}
              </View>
            }
            px={px}
            fs={fs}
          />

          {/* Tabla directamente sobre el fondo */}
          {loading ? (
            <View style={{ paddingVertical: px(24), alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : filteredTransactions.length === 0 ? (
            <View style={{ paddingVertical: px(16) }}>
              <Text style={[textStyles.bodyMuted, { fontSize: fs(12), fontWeight: "800", color: "#94A3B8" }]}>
                No hay transacciones que coincidan con los filtros.
              </Text>
            </View>
          ) : (
            <>
              <View style={{ paddingTop: px(10) }}>
                <DesktopTransactionsTable
                  transactions={txPreview}
                  onEditTx={(tx) => openEditTx(tx)}
                  onDeleteTx={(tx) => {
                    // tu lógica existente
                  }}
                />
              </View>

              {filteredTransactions.length > 18 && (
                <View style={{ paddingTop: px(12) }}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => setShowAllTx((v) => !v)}
                    style={{
                      height: px(44),
                      borderRadius: px(14),
                      borderWidth: 1,
                      borderColor: "rgba(148,163,184,0.25)",
                      backgroundColor: "rgba(15,23,42,0.04)",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: px(8),
                    }}
                  >
                    <Text style={[textStyles.button, { fontSize: fs(12), fontWeight: "900", color: "#2563EB" }]}>
                      {showAllTx ? "Ver menos" : `Ver todas (${filteredTransactions.length})`}
                    </Text>
                    <Ionicons
                      name={showAllTx ? "chevron-up-outline" : "chevron-down-outline"}
                      size={px(16)}
                      color="#2563EB"
                    />
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <DesktopDateTimeFilterModal
        visible={dateModalVisible}
        showCustomRange={false}
        onClose={() => setDateModalVisible(false)}
        onSelect={({ from, to, label, type }: any) => {
          setDateFrom(from);
          setDateTo(to);
          setDateLabel(capitalizeLabel(label));
          setRangeType(type as RangeType);
          setTxQuery("");
          setSelectedCategoryName(null);
          setShowAllTx(false);
        }}
      />

<WalletPickerModal
  visible={walletModalVisible}
  wallets={wallets}
  selectedWalletId={selectedWallet?.id ?? null}
  onClose={() => setWalletModalVisible(false)}
  onClear={() => setSelectedWallet(null)}
  onSelect={(w) => setSelectedWallet(w)}
  onEditWallets={() => navigation.navigate("Wallets")}
  onViewTransfers={() => navigation.navigate("Transfers")}
/>
    </View>
  );
}
