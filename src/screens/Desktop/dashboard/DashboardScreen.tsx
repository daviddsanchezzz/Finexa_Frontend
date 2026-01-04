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
import DesktopTransactionsList from "../../../components/DesktopTransactionsList"; 
import { WalletPickerModal } from "../../../components/WalletPickerModal";

import { textStyles, typography } from "../../../theme/typography";
import { useCreateTxModal } from "../../../context/CreateTxModalContext";

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

/** ======= KPI CARD ======= */
function StatCard({
  title,
  value,
  icon,
  tone = "neutral",
  subtitle,
  px,
  fs,
}: {
  title: string;
  value: string;
  subtitle?: React.ReactNode;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: "neutral" | "success" | "danger" | "info";
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  const palette = {
    neutral: {
      accent: "#000000",
      iconBg: "#F1F5F9",
      iconFg: "#000000",
      title: "#94A3B8",
    },
    info: {
      accent: "#3B82F6",
      iconBg: "rgba(59,130,246,0.12)",
      iconFg: "#2563EB",
      title: "#94A3B8",
    },
    success: {
      accent: "#22C55E",
      iconBg: "rgba(34,197,94,0.12)",
      iconFg: "#16A34A",
      title: "#94A3B8",
    },
    danger: {
      accent: "#EF4444",
      iconBg: "rgba(239,68,68,0.12)",
      iconFg: "#DC2626",
      title: "#94A3B8",
    },
  }[tone];

  return (
    <View
      style={{
        flex: 1,
        minWidth: px(230),
        backgroundColor: "white",
        borderRadius: px(12),
        borderWidth: 1,
        borderColor: "#E5E7EB",
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: px(12),
        shadowOffset: { width: 0, height: px(6) },
      }}
    >
      <View style={{ flexDirection: "row", flex: 1 }}>
        <View style={{ width: px(4), backgroundColor: palette.accent }} />

        <View style={{ flex: 1, padding: px(16) }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: px(10),
            }}
          >
            <Text
              style={[
                textStyles.labelMuted,
                { fontSize: fs(11), color: palette.title, letterSpacing: 0.6 },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>

            <View
              style={{
                width: px(34),
                height: px(34),
                borderRadius: px(10),
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: palette.iconBg,
              }}
            >
              <Ionicons name={icon} size={px(18)} color={palette.iconFg} />
            </View>
          </View>

          <Text
            style={[
              textStyles.numberLG,
              { marginTop: px(12), fontSize: fs(22), fontWeight: "900", color: "#0F172A" },
            ]}
            numberOfLines={1}
          >
            {value}
          </Text>

          {!!subtitle && <View style={{ marginTop: px(6) }}>{subtitle}</View>}
        </View>
      </View>
    </View>
  );
}

/** UI reusable card */
function SectionCard({
  title,
  right,
  children,
  noPadding,
  px,
  fs,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: px(12),
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: noPadding ? 0 : px(16),
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowRadius: px(10),
        shadowOffset: { width: 0, height: px(6) },
      }}
    >
      <View
        style={{
          paddingHorizontal: noPadding ? px(16) : 0,
          paddingTop: noPadding ? px(16) : 0,
          paddingBottom: px(10),
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: px(10),
        }}
      >
        <Text style={[textStyles.labelMuted2, { fontSize: fs(12) }]}>{title}</Text>
        {!!right && <View>{right}</View>}
      </View>

      <View
        style={{
          paddingHorizontal: noPadding ? px(16) : 0,
          paddingBottom: noPadding ? px(16) : 0,
        }}
      >
        {children}
      </View>
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
        height: px(40), // un pelín más compacto
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
              backgroundColor: active ? "rgba(15,23,42,0.10)" : "transparent",
            }}
          >
            <Text
              style={[
                textStyles.label,
                {
                  fontSize: fs(12),
                  fontWeight: active ? "900" : "800",
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

/** ======= TOP BUTTON: FIX hovered ======= */
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
        height: px(38),
        paddingHorizontal: label ? px(12) : 0,
        width: label ? undefined : px(38),
        borderRadius: px(10),
        borderWidth: 1,
        borderColor: "#E5E7EB",
        backgroundColor: hover ? "#F8FAFC" : "white",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: label ? px(8) : 0,
      }}
    >
      <Ionicons name={icon} size={px(18)} color="#64748B" />
      {!!label && (
        <Text style={[textStyles.button, { fontSize: fs(12), fontWeight: "800", color: "#64748B" }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/** Selector compacto Gastos/Ingresos */
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
  const Item = ({
    k,
    label,
    icon,
    activeBg,
  }: {
    k: GraphType;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    activeBg: string;
  }) => {
    const active = value === k;
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onChange(k)}
        style={{
          flex: 1,
          height: px(36), // MÁS PEQUEÑO
          borderRadius: px(10),
          borderWidth: 1,
          borderColor: active ? "rgba(0,0,0,0.10)" : "transparent",
          backgroundColor: active ? activeBg : "transparent",
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
              fontWeight: active ? "900" : "800",
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
        borderRadius: px(10),
        width: px(240), // MÁS PEQUEÑO
      }}
    >
      <Item k="expense" label="Gastos" icon="arrow-down-outline" activeBg="rgba(239,68,68,0.14)" />
      <Item k="income" label="Ingresos" icon="arrow-up-outline" activeBg="rgba(34,197,94,0.14)" />
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
  const WIDE = width >= 1100;

const { openCreateTx } = useCreateTxModal();
const { openEditTx } = useCreateTxModal();

  // MISMA ALTURA PARA LAS DOS CARDS DE GRÁFICAS
  const CHART_H = px(250);

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

  const _periodDays = useMemo(() => daysBetweenInclusive(dateFrom, dateTo), [dateFrom, dateTo]);

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
    <View style={{ flex: 1, backgroundColor: colors.background ?? "#F8FAFC" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: px(22),
          paddingTop: px(18),
          paddingBottom: px(90),
        }}
      >
        {/* ===== Header ===== */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: px(14),
          }}
        >
          <View>
            <Text style={[textStyles.h1, { fontSize: fs(22), fontWeight: "900", color: "#0F172A" }]}>
              {dateLabel || "—"}
            </Text>
            <Text
              style={[
                textStyles.bodyMuted,
                { marginTop: px(4), fontSize: fs(12), color: "#94A3B8", fontWeight: "700" },
              ]}
            >
              {selectedWallet ? selectedWallet.name : "Todas las carteras"}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: px(10) }}>
            <TopButton icon="calendar-outline" label="Fechas" onPress={() => setDateModalVisible(true)} px={px} fs={fs} />
            <TopButton icon="wallet-outline" label={selectedWallet ? "Cartera" : "Carteras"} onPress={() => setWalletModalVisible(true)} px={px} fs={fs} />
            <TopButton icon="refresh-outline" onPress={fetchAll} px={px} fs={fs} />
          </View>
        </View>

        {/* ===== KPI row ===== */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: px(14) }}>
          <StatCard
            title="PATRIMONIO TOTAL"
            value={loading ? "—" : formatEuro(netWorth)}
            subtitle={
              <Text
                style={[textStyles.caption, { fontSize: fs(12), color: "#94A3B8", fontWeight: "700" }]}
                numberOfLines={1}
              >
                {selectedWallet ? "Balance de la cartera" : "Suma de balances de carteras"}
              </Text>
            }
            icon="briefcase-outline"
            tone="neutral"
            px={px}
            fs={fs}
          />

          <StatCard
            title="BALANCE"
            value={loading ? "—" : formatEuro(balancePeriod)}
            subtitle={
              loading ? null : (
                <Text
                  style={[textStyles.caption, { fontSize: fs(12), color: "#94A3B8", fontWeight: "700" }]}
                  numberOfLines={1}
                >
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

          <StatCard
            title="INGRESOS"
            value={loading ? "—" : formatEuro(totalIncome)}
            subtitle={
              <Text
                style={[textStyles.caption, { fontSize: fs(12), color: "#94A3B8", fontWeight: "700" }]}
                numberOfLines={1}
              >
                {dateLabel || ""}
              </Text>
            }
            icon="arrow-up-outline"
            tone="success"
            px={px}
            fs={fs}
          />

          <StatCard
            title="GASTOS"
            value={loading ? "—" : formatEuro(totalExpenses)}
            subtitle={
              <Text
                style={[textStyles.caption, { fontSize: fs(12), color: "#94A3B8", fontWeight: "700" }]}
                numberOfLines={1}
              >
                {dateLabel || ""}
              </Text>
            }
            icon="arrow-down-outline"
            tone="danger"
            px={px}
            fs={fs}
          />
        </View>

        <View style={{ marginTop: px(14), gap: px(12) }}>
          {/* Selector Gastos | Ingresos (compacto) */}
          <View style={{ flexDirection: "row", justifyContent: "flex-start" }}>
            <GraphTypePill value={graphType} onChange={setGraphType} px={px} fs={fs} />
          </View>

          {/* Main layout */}
          <View style={{ flexDirection: WIDE ? "row" : "column", gap: px(12), alignItems: "flex-start" }}>
            {/* LEFT */}
            <View style={{ flex: 1, minWidth: px(680), gap: px(12) }}>
              {/* Gráfica evolución (altura fija REAL) */}
              <SectionCard
                title={graphType === "expense" ? "Evolución de gastos" : "Evolución de ingresos"}
                right={<Segmented value={rangeType} onChange={setRangeType} px={px} fs={fs} />}
                px={px}
                fs={fs}
              >
                <View style={{ height: CHART_H }}>
                  {loading ? (
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  ) : (
                    <DesktopPeriodChart data={bars as any} labels={barLabels as any} height={CHART_H} />
                  )}
                </View>
              </SectionCard>

              {/* Transacciones (altura libre) */}
              <SectionCard
                title="Transacciones del periodo"
                noPadding
                px={px}
                fs={fs}
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
                          backgroundColor: "rgba(15,23,42,0.06)",
                          borderWidth: 1,
                          borderColor: "#E5E7EB",
                          flexDirection: "row",
                          alignItems: "center",
                          gap: px(6),
                          maxWidth: px(240),
                        }}
                      >
                        <Text style={[textStyles.label, { fontSize: fs(12), fontWeight: "900" }]} numberOfLines={1}>
                          {selectedCategoryName}
                        </Text>
                        <Ionicons name="close" size={px(14)} color="#0F172A" />
                      </TouchableOpacity>
                    )}

                    {Platform.OS === "web" && (
                      <View
                        style={{
                          height: px(34),
                          width: px(300),
                          borderRadius: px(12),
                          borderWidth: 1,
                          borderColor: "#E5E7EB",
                          backgroundColor: "white",
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: px(10),
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
                }
              >
                {loading ? (
                  <View style={{ padding: px(16), alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                ) : filteredTransactions.length === 0 ? (
                  <View style={{ padding: px(16) }}>
                    <Text style={[textStyles.bodyMuted, { fontSize: fs(12), fontWeight: "800", color: "#94A3B8" }]}>
                      No hay transacciones que coincidan con los filtros.
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={{ paddingBottom: px(10) }}>
<DesktopTransactionsList
  transactions={txPreview}
  onDeleted={fetchAll}
  navigation={navigation}
  backgroundColor={"transparent"}
  onEditTx={(tx) => openEditTx(tx)}
/>

                    </View>

                    {filteredTransactions.length > 18 && (
                      <View style={{ paddingHorizontal: px(16), paddingBottom: px(16) }}>
                        <TouchableOpacity
                          activeOpacity={0.9}
                          onPress={() => setShowAllTx((v) => !v)}
                          style={{
                            height: px(42),
                            borderRadius: px(12),
                            borderWidth: 1,
                            borderColor: "#E5E7EB",
                            backgroundColor: "#F8FAFC",
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: px(8),
                          }}
                        >
                          <Text style={[textStyles.button, { fontSize: fs(12), fontWeight: "900", color: colors.primary }]}>
                            {showAllTx ? "Ver menos" : `Ver todas (${filteredTransactions.length})`}
                          </Text>
                          <Ionicons
                            name={showAllTx ? "chevron-up-outline" : "chevron-down-outline"}
                            size={px(16)}
                            color={colors.primary}
                          />
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}
              </SectionCard>
            </View>

            {/* RIGHT */}
            <View style={{ width: WIDE ? px(420) : "100%", gap: px(12) }}>
              {/* Pie (MISMA ALTURA REAL) */}
              <SectionCard title="Distribución por categorías" px={px} fs={fs}>
                <View style={{ height: CHART_H }}>
                  {loading ? (
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  ) : (
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                      <PieChartComponent
                        mode={graphType}
                        data={pieData as any}
                        incomes={totalIncome}
                        expenses={totalExpenses}
                      />
                    </View>
                  )}
                </View>
              </SectionCard>

              {/* Categorías (altura libre, sin scroll interno) */}
              <SectionCard title="Categorías" px={px} fs={fs}>
                {loading ? (
                  <View style={{ padding: px(16), alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : (graphType === "expense" ? expenses : incomes).length === 0 ? (
                  <View style={{ paddingBottom: px(6) }}>
                    <Text style={[textStyles.bodyMuted, { fontSize: fs(12), fontWeight: "800", color: "#94A3B8" }]}>
                      No hay datos para este periodo.
                    </Text>
                  </View>
                ) : (
                  <View>
                    {(graphType === "expense" ? expenses : incomes).slice(0, 10).map((c, idx) => {
                      const denom = graphType === "expense" ? totalExpenses : totalIncome;
                      const pct = denom > 0 ? (c.amount / denom) * 100 : 0;
                      const selected = selectedCategoryName === c.name;

                      return (
                        <TouchableOpacity
                          key={`${graphType}-${c.name}-${idx}`}
                          activeOpacity={0.85}
                          onPress={() => {
                            setSelectedCategoryName((prev) => (prev === c.name ? null : c.name));
                            setShowAllTx(true);
                          }}
                          onLongPress={() =>
                            navigation.navigate("CategoryTransactions", {
                              categoryName: c.name,
                              categoryEmoji: c.emoji,
                              categoryColor: c.color,
                              type: graphType,
                              dateFrom,
                              dateTo,
                              walletId: selectedWallet?.id ?? undefined,
                            })
                          }
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            paddingVertical: px(10),
                            borderTopWidth: idx === 0 ? 0 : 1,
                            borderTopColor: "#E5E7EB",
                            gap: px(10),
                            backgroundColor: selected ? "rgba(37,99,235,0.08)" : "transparent",
                            borderRadius: px(12),
                            paddingHorizontal: px(10),
                          }}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", gap: px(10), flex: 1 }}>
                            <View
                              style={{
                                width: px(36),
                                height: px(36),
                                borderRadius: px(12),
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: c.color,
                              }}
                            >
                              <Text style={[textStyles.number, { fontSize: fs(16), fontWeight: "900" }]}>{c.emoji}</Text>
                            </View>

                            <View style={{ flex: 1 }}>
                              <Text style={[textStyles.body, { fontSize: fs(13), fontWeight: "900" }]} numberOfLines={1}>
                                {c.name}
                              </Text>
                              <Text style={[textStyles.caption, { marginTop: px(2), fontSize: fs(11) }]}>
                                {formatPercent(pct)} · x{c.count}
                              </Text>
                            </View>
                          </View>

                          <Text style={[textStyles.number, { fontSize: fs(13), fontWeight: "900" }]}>
                            {formatEuro(c.amount)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}

                    {(graphType === "expense" ? expenses : incomes).length > 10 && (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => navigation?.navigate?.("statistics")}
                        style={{
                          marginTop: px(10),
                          height: px(42),
                          borderRadius: px(12),
                          borderWidth: 1,
                          borderColor: "#E5E7EB",
                          backgroundColor: "#F8FAFC",
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: px(8),
                        }}
                      >
                        <Text style={[textStyles.button, { fontSize: fs(12), fontWeight: "900", color: colors.primary }]}>
                          Ver todas
                        </Text>
                        <Ionicons name="arrow-forward-outline" size={px(16)} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </SectionCard>
            </View>
          </View>
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
        onSelect={(w) => {
          setSelectedWallet(w);
          setTxQuery("");
          setSelectedCategoryName(null);
          setShowAllTx(false);
        }}
      />
    </View>
  );
}
