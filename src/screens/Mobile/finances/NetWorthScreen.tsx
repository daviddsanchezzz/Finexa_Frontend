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

interface InvestmentAsset {
  id: number;
  name: string;
  type: string;
  currentValue: number;
  pnl: number;
}

interface NetWorthData {
  wallets: WalletItem[];
  investments: {
    totalCurrentValue: number;
    totalPnL: number;
    totalInvested: number;
    assets: InvestmentAsset[];
  };
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

function Section({ kindKey, total, children, badge, badgeColor, defaultOpen = false }: SectionProps) {
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

const ASSET_TYPE_EMOJI: Record<string, string> = {
  crypto: "₿",
  etf:    "📦",
  stock:  "📊",
  fund:   "🏦",
  custom: "💼",
  cash:   "💵",
};

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
                assets: investRes.value.data?.assets ?? [],
              }
            : { totalCurrentValue: 0, totalPnL: 0, totalInvested: 0, assets: [] },
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
  const debtTotal    = activeDebts.reduce((s, d) => s + d.remainingAmount, 0);

  const totalAssets      = cashTotal + savingsTotal + investTotal;
  const totalLiabilities = debtTotal;
  const netWorth         = totalAssets - totalLiabilities;

  const sortedAssets = [...(data?.investments.assets ?? [])].sort(
    (a, b) => b.currentValue - a.currentValue
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F3F4F6" }}>
      {/* AppHeader */}
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
        <>
          {/* ── Hero fijo (no scrollea) ── */}
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={{ backgroundColor: colors.primary, borderRadius: 24, padding: 22 }}>
              <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.6 }}>
                Patrimonio neto
              </Text>
              <Text style={{ color: "white", fontSize: 38, fontWeight: "800", marginTop: 6 }}>
                {fmt(netWorth)}
              </Text>

              <DistributionBar cash={cashTotal} savings={savingsTotal} invest={investTotal} />

              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                {[
                  { label: "Liquidez",  value: cashTotal,   color: KIND.cash.color,       textColor: "white",   pct: totalAssets > 0 ? cashTotal / totalAssets : 0 },
                  { label: "Ahorro",    value: savingsTotal, color: KIND.savings.color,    textColor: "white",   pct: totalAssets > 0 ? savingsTotal / totalAssets : 0 },
                  { label: "Inversión", value: investTotal,  color: KIND.investment.color, textColor: "white",   pct: totalAssets > 0 ? investTotal / totalAssets : 0 },
                  { label: "Deudas",   value: debtTotal,    color: KIND.debt.color,       textColor: "#FCA5A5", pct: totalAssets > 0 ? debtTotal / totalAssets : 0 },
                ].map((s) => (
                  <View key={s.label} style={{ alignItems: "center" }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.color, marginBottom: 4 }} />
                    <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 10 }}>{s.label}</Text>
                    <Text style={{ color: s.textColor, fontSize: 13, fontWeight: "700", marginTop: 1 }}>{fmt(s.value)}</Text>
                    <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, marginTop: 1 }}>
                      {s.pct > 0 ? (s.pct * 100).toFixed(0) + "%" : "—"}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* ── Secciones con scroll ── */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); fetchData(true); }}
              />
            }
          >
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
              Activos — {fmt(totalAssets)}
            </Text>

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

            <Section kindKey="investment" total={investTotal}>
              {sortedAssets.length === 0 ? (
                <EmptyRow label="Sin activos de inversión" />
              ) : (
                sortedAssets.map((a) => (
                  <Row
                    key={a.id}
                    emoji={ASSET_TYPE_EMOJI[a.type] ?? "💼"}
                    name={a.name}
                    amount={a.currentValue}
                    amountColor="#16A34A"
                  />
                ))
              )}
            </Section>

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
        </>
      )}
    </SafeAreaView>
  );
}
