import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../../api/api";
import AppHeader from "../../../components/AppHeader";
import { colors } from "../../../theme/theme";

interface NetWorthData {
  wallets: { id: number; name: string; emoji: string; balance: number; currency: string }[];
  investments: { totalValue: number };
  debts: { totalAmount: number; remainingAmount: number; status: string }[];
}

function fmt(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

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
        wallets:
          walletsRes.status === "fulfilled" ? walletsRes.value.data || [] : [],
        investments:
          investRes.status === "fulfilled"
            ? { totalValue: investRes.value.data?.totalValue || 0 }
            : { totalValue: 0 },
        debts:
          debtsRes.status === "fulfilled" ? debtsRes.value.data || [] : [],
      });
    } catch (e) {
      console.error("❌ NetWorth fetch error", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const totalAssets =
    (data?.wallets.reduce((s, w) => s + w.balance, 0) ?? 0) +
    (data?.investments.totalValue ?? 0);

  const totalLiabilities =
    data?.debts
      .filter((d) => d.status === "active")
      .reduce((s, d) => s + d.remainingAmount, 0) ?? 0;

  const netWorth = totalAssets - totalLiabilities;

  const walletTotal = data?.wallets.reduce((s, w) => s + w.balance, 0) ?? 0;
  const investTotal = data?.investments.totalValue ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pb-3">
        <AppHeader
          title="Patrimonio neto"
          showBack={true}
          showProfile={false}
          showDatePicker={false}
        />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Hero */}
          <View
            style={{
              backgroundColor: colors.primary,
              borderRadius: 24,
              padding: 24,
              marginBottom: 16,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: "600" }}>
              Patrimonio neto
            </Text>
            <Text
              style={{
                color: "white",
                fontSize: 36,
                fontWeight: "800",
                marginTop: 8,
              }}
            >
              {fmt(netWorth)}
            </Text>
            <View
              style={{ flexDirection: "row", gap: 32, marginTop: 16 }}
            >
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>Activos</Text>
                <Text style={{ color: "#86EFAC", fontSize: 16, fontWeight: "700", marginTop: 2 }}>
                  {fmt(totalAssets)}
                </Text>
              </View>
              <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.2)" }} />
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>Pasivos</Text>
                <Text style={{ color: "#FCA5A5", fontSize: 16, fontWeight: "700", marginTop: 2 }}>
                  {fmt(totalLiabilities)}
                </Text>
              </View>
            </View>
          </View>

          {/* Assets section */}
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Activos
          </Text>

          {/* Wallets */}
          <View style={{ backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 12, overflow: "hidden" }}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6", flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>💳 Carteras</Text>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#16A34A" }}>{fmt(walletTotal)}</Text>
            </View>
            {(data?.wallets ?? []).map((w, i) => (
              <View
                key={w.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderBottomWidth: i < (data?.wallets.length ?? 0) - 1 ? 1 : 0,
                  borderBottomColor: "#F9FAFB",
                }}
              >
                <Text style={{ fontSize: 18, marginRight: 10 }}>{w.emoji}</Text>
                <Text style={{ flex: 1, fontSize: 13, color: "#374151" }}>{w.name}</Text>
                <Text style={{ fontSize: 13, fontWeight: "600", color: w.balance >= 0 ? "#16A34A" : "#DC2626" }}>
                  {fmt(w.balance)}
                </Text>
              </View>
            ))}
          </View>

          {/* Investments */}
          <View style={{ backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 16, overflow: "hidden" }}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>📈 Inversiones</Text>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#16A34A" }}>{fmt(investTotal)}</Text>
            </View>
          </View>

          {/* Liabilities section */}
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Pasivos
          </Text>

          <View style={{ backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 16, overflow: "hidden" }}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6", flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>💸 Deudas activas</Text>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#DC2626" }}>{fmt(totalLiabilities)}</Text>
            </View>
            {(data?.debts ?? [])
              .filter((d) => d.status === "active")
              .map((d: any, i, arr) => (
                <View
                  key={d.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                    borderBottomColor: "#F9FAFB",
                  }}
                >
                  <Text style={{ fontSize: 18, marginRight: 10 }}>{d.emoji || "💸"}</Text>
                  <Text style={{ flex: 1, fontSize: 13, color: "#374151" }}>{d.name}</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#DC2626" }}>
                    {fmt(d.remainingAmount)}
                  </Text>
                </View>
              ))}
            {(data?.debts ?? []).filter((d) => d.status === "active").length === 0 && (
              <View style={{ padding: 16 }}>
                <Text style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center" }}>Sin deudas activas</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
