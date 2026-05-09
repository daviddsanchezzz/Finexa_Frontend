import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../../api/api";
import AppHeader from "../../../components/AppHeader";
import { colors } from "../../../theme/theme";

type WalletKind = "cash" | "savings" | "investment";

interface WalletItem {
  id: number;
  name: string;
  emoji: string;
  balance: number;
  currency: string;
  kind: WalletKind;
}

interface DebtItem {
  id: number;
  name: string;
  emoji?: string;
  remainingAmount: number;
  status: string;
}

interface NetWorthData {
  wallets: WalletItem[];
  investments: { totalCurrentValue: number; totalPnL: number; totalInvested: number };
  debts: DebtItem[];
}

// ── Colors per kind ──────────────────────────────────
const KIND = {
  cash:       { color: "#3B82F6", bg: "#EFF6FF", label: "Liquidez",  icon: "card-outline"         },
  savings:    { color: "#10B981", bg: "#ECFDF5", label: "Ahorro",    icon: "wallet-outline"        },
  investment: { color: "#8B5CF6", bg: "#F5F3FF", label: "Inversión", icon: "trending-up-outline"   },
  debt:       { color: "#EF4444", bg: "#FEF2F2", label: "Deudas",    icon: "card-outline"          },
};

function fmt(n: number, showSign = false) {
  const s = Math.abs(n).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (showSign && n !== 0) return (n >= 0 ? "+" : "−") + s + " €";
  return (n < 0 ? "−" : "") + s + " €";
}

// ── Collapsible section ───────────────────────────────
interface SectionProps {
  kindKey: keyof typeof KIND;
  total: number;
  children?: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  defaultOpen?: boolean;
}

function Section({ kindKey, total, children, badge, badgeColor, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const k = KIND[kindKey];
  const isNeg = kindKey === "debt";

  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#F0F0F0",
        marginBottom: 12,
        overflow: "hidden",
      }}
    >
      {/* Header row */}
      <TouchableOpacity
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: k.bg,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Ionicons name={k.icon as any} size={18} color={k.color} />
        </View>

        <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: "#111827" }}>
          {k.label}
        </Text>

        {badge && (
          <View
            style={{
              backgroundColor: badgeColor ? badgeColor + "20" : k.bg,
              borderRadius: 8,
              paddingHorizontal: 7,
              paddingVertical: 2,
              marginRight: 8,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "700", color: badgeColor || k.color }}>
              {badge}
            </Text>
          </View>
        )}

        <Text style={{ fontSize: 15, fontWeight: "800", color: isNeg ? "#EF4444" : "#111827", marginRight: 8 }}>
          {fmt(total)}
        </Text>

        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color="#9CA3AF"
        />
      </TouchableOpacity>

      {/* Rows */}
      {open && children && (
        <View style={{ borderTopWidth: 1, borderTopColor: "#F3F4F6" }}>
          {children}
        </View>
      )}
    </View>
  );
}

function Row({ emoji, name, amount, amountColor }: { emoji?: string; name: string; amount: number; amountColor?: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderBottomColor: "#F9FAFB",
      }}
    >
      {emoji ? (
        <Text style={{ fontSize: 18, marginRight: 10, width: 28, textAlign: "center" }}>{emoji}</Text>
      ) : (
        <View style={{ width: 28, marginRight: 10 }} />
      )}
      <Text style={{ flex: 1, fontSize: 13, color: "#374151" }}>{name}</Text>
      <Text style={{ fontSize: 13, fontWeight: "600", color: amountColor || "#111827" }}>
        {fmt(amount)}
      </Text>
    </View>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <View style={{ padding: 16, alignItems: "center" }}>
      <Text style={{ fontSize: 13, color: "#9CA3AF" }}>{label}</Text>
    </View>
  );
}

// ── Distribution bar ──────────────────────────────────
function DistributionBar({ cash, savings, invest }: { cash: number; savings: number; invest: number }) {
  const total = cash + savings + invest;
  if (total <= 0) return null;

  const segments = [
    { value: cash,    color: KIND.cash.color },
    { value: savings, color: KIND.savings.color },
    { value: invest,  color: KIND.investment.color },
  ].filter((s) => s.value > 0);

  return (
    <View style={{ flexDirection: "row", height: 6, borderRadius: 6, overflow: "hidden", marginTop: 20, marginBottom: 16 }}>
      {segments.map((s, i) => (
        <View
          key={i}
          style={{
            flex: s.value / total,
            backgroundColor: s.color,
            marginLeft: i > 0 ? 2 : 0,
            borderRadius: 6,
          }}
        />
      ))}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────
export default function NetWorthScreen({ navigation }: any) {
  const [data, setData] = useState<NetWorthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [walletsRes, investRes, debtsRes] = await Promise.allSettled([
        api.get("/wallets"),
        api.get("/investments/summary"),
        api.get("/debts"),
      ]);

      setData({
        wallets: walletsRes.status === "fulfilled" ? walletsRes.value.data || [] : [],
        investments:
          investRes.status === "fulfilled"
            ? {
                totalCurrentValue: investRes.value.data?.totalCurrentValue ?? 0,
                totalPnL: investRes.value.data?.totalPnL ?? 0,
                totalInvested: investRes.value.data?.totalInvested ?? 0,
              }
            : { totalCurrentValue: 0, totalPnL: 0, totalInvested: 0 },
        debts: debtsRes.status === "fulfilled" ? debtsRes.value.data || [] : [],
      });
    } catch (e) {
      console.error("❌ NetWorth fetch error", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  // ── Derived values ──
  const cashWallets    = (data?.wallets ?? []).filter((w) => w.kind === "cash");
  const savingsWallets = (data?.wallets ?? []).filter((w) => w.kind === "savings");
  const activeDebts    = (data?.debts ?? []).filter((d) => d.status === "active");

  const cashTotal    = cashWallets.reduce((s, w) => s + w.balance, 0);
  const savingsTotal = savingsWallets.reduce((s, w) => s + w.balance, 0);
  const investTotal  = data?.investments.totalCurrentValue ?? 0;
  const investPnL    = data?.investments.totalPnL ?? 0;
  const debtTotal    = activeDebts.reduce((s, d) => s + d.remainingAmount, 0);

  const totalAssets      = cashTotal + savingsTotal + investTotal;
  const totalLiabilities = debtTotal;
  const netWorth         = totalAssets - totalLiabilities;

  const pnlPositive = investPnL >= 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F3F4F6" }}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 4 }}>
        <AppHeader
          title="Patrimonio neto"
          showBack={true}
          showProfile={false}
          showDatePicker={false}
        />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(true); }} />}
        >
          {/* ── Hero ── */}
          <View
            style={{
              backgroundColor: colors.primary,
              borderRadius: 24,
              padding: 22,
              marginBottom: 20,
            }}
          >
            <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.6 }}>
              Patrimonio neto
            </Text>
            <Text style={{ color: "white", fontSize: 38, fontWeight: "800", marginTop: 6 }}>
              {fmt(netWorth)}
            </Text>

            <DistributionBar cash={cashTotal} savings={savingsTotal} invest={investTotal} />

            {/* 3 mini stats */}
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View style={{ alignItems: "center" }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: KIND.cash.color, marginBottom: 4 }} />
                <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 10 }}>Liquidez</Text>
                <Text style={{ color: "white", fontSize: 13, fontWeight: "700", marginTop: 1 }}>{fmt(cashTotal)}</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: KIND.savings.color, marginBottom: 4 }} />
                <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 10 }}>Ahorro</Text>
                <Text style={{ color: "white", fontSize: 13, fontWeight: "700", marginTop: 1 }}>{fmt(savingsTotal)}</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: KIND.investment.color, marginBottom: 4 }} />
                <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 10 }}>Inversión</Text>
                <Text style={{ color: "white", fontSize: 13, fontWeight: "700", marginTop: 1 }}>{fmt(investTotal)}</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: KIND.debt.color, marginBottom: 4 }} />
                <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 10 }}>Deudas</Text>
                <Text style={{ color: "#FCA5A5", fontSize: 13, fontWeight: "700", marginTop: 1 }}>−{fmt(debtTotal)}</Text>
              </View>
            </View>
          </View>

          {/* ── Activos ── */}
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
            Activos — {fmt(totalAssets)}
          </Text>

          {/* Liquidez */}
          <Section kindKey="cash" total={cashTotal}>
            {cashWallets.length === 0 ? (
              <EmptyRow label="Sin carteras de gastos" />
            ) : (
              cashWallets.map((w) => (
                <Row key={w.id} emoji={w.emoji} name={w.name} amount={w.balance}
                  amountColor={w.balance >= 0 ? "#16A34A" : "#DC2626"} />
              ))
            )}
          </Section>

          {/* Ahorro */}
          <Section kindKey="savings" total={savingsTotal}>
            {savingsWallets.length === 0 ? (
              <EmptyRow label="Sin carteras de ahorro" />
            ) : (
              savingsWallets.map((w) => (
                <Row key={w.id} emoji={w.emoji} name={w.name} amount={w.balance}
                  amountColor="#16A34A" />
              ))
            )}
          </Section>

          {/* Inversión */}
          <Section
            kindKey="investment"
            total={investTotal}
            badge={investPnL !== 0 ? fmt(investPnL, true) : undefined}
            badgeColor={pnlPositive ? "#16A34A" : "#DC2626"}
          >
            <Row
              emoji="📈"
              name="Cartera de inversión"
              amount={investTotal}
              amountColor="#16A34A"
            />
            {data?.investments.totalInvested !== undefined && (
              <Row
                name="Capital invertido"
                amount={data.investments.totalInvested}
                amountColor="#6B7280"
              />
            )}
          </Section>

          {/* ── Pasivos ── */}
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10, marginTop: 4 }}>
            Pasivos — {fmt(totalLiabilities)}
          </Text>

          <Section kindKey="debt" total={totalLiabilities} defaultOpen={activeDebts.length > 0}>
            {activeDebts.length === 0 ? (
              <EmptyRow label="Sin deudas activas" />
            ) : (
              activeDebts.map((d) => (
                <Row key={d.id} emoji={d.emoji || "💸"} name={d.name}
                  amount={d.remainingAmount} amountColor="#EF4444" />
              ))
            )}
          </Section>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
