// src/screens/Investments/InvestmentOperationScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import api from "../../../../api/api";
import { colors } from "../../../../theme/theme";
import AppHeader from "../../../../components/AppHeader";

type OperationMode = "buy" | "sell" | "deposit" | "withdraw" | "swap";
type InvestmentAssetType = "crypto" | "etf" | "stock" | "fund" | "custom" | "cash";

type InvestmentAssetLite = {
  id: number;
  name: string;
  type: InvestmentAssetType;
  active?: boolean;
};

type WalletLite = {
  id: number;
  name: string;
  emoji?: string | null;
  kind: "cash" | "investment" | string;
  currency?: string | null;
  balance?: number | null;
  active?: boolean;
  position?: number | null;
};

const moneyToNumber = (s: string) => {
  // admite "1.234,56" o "1234,56" o "1234.56"
  const v = (s || "").replace(/\./g, "").replace(",", ".");
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

function formatMoney(n: any, currency = "EUR") {
  const v = Number.isFinite(Number(n)) ? Number(n) : 0;
  try {
    return v.toLocaleString("es-ES", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    return `${v.toFixed(2)} ${currency}`;
  }
}

const iconForAssetType = (t: InvestmentAssetType): keyof typeof Ionicons.glyphMap => {
  switch (t) {
    case "crypto":
      return "logo-bitcoin";
    case "stock":
      return "trending-up";
    case "etf":
      return "layers";
    case "fund":
      return "pie-chart";
    default:
      return "briefcase";
  }
};

function Chip({
  label,
  active,
  disabled,
  onPress,
  leftIcon,
  tint,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  tint?: { bg: string; border: string; text?: string; icon?: string };
}) {
  const activeStyle = tint
    ? { backgroundColor: tint.bg, borderColor: tint.border }
    : { backgroundColor: "rgba(59,130,246,0.10)", borderColor: "rgba(59,130,246,0.55)" };

  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      activeOpacity={0.9}
      style={[
        {
          height: 34,
          paddingHorizontal: 12,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          backgroundColor: "white",
          flexDirection: "row",
          alignItems: "center",
          opacity: disabled ? 0.45 : 1,
        },
        active ? activeStyle : null,
      ]}
    >
      {leftIcon ? (
        <Ionicons name={leftIcon} size={16} color={active ? tint?.icon ?? "#0F172A" : "#64748B"} />
      ) : null}
      <Text
        style={{
          marginLeft: leftIcon ? 8 : 0,
          fontSize: 12,
          fontWeight: "900",
          color: active ? tint?.text ?? "#0F172A" : "#475569",
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 14,
        marginTop: 12,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: "900", color: "#94A3B8" }}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

export default function InvestmentOperationScreen({ navigation, route }: any) {
  const defaultAssetId: number | undefined = route?.params?.assetId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [mode, setMode] = useState<OperationMode>("buy");

  const [assets, setAssets] = useState<InvestmentAssetLite[]>([]);
  const [wallets, setWallets] = useState<WalletLite[]>([]);
  const [walletError, setWalletError] = useState<string | null>(null);

  const [selectedWallet, setSelectedWallet] = useState<WalletLite | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<InvestmentAssetLite | null>(null);

  const [fromAsset, setFromAsset] = useState<InvestmentAssetLite | null>(null);
  const [toAsset, setToAsset] = useState<InvestmentAssetLite | null>(null);

  const [amount, setAmount] = useState("");
  const [fee, setFee] = useState("");
  const [amountOut, setAmountOut] = useState("");
  const [amountIn, setAmountIn] = useState("");
  const [description, setDescription] = useState("");

  const amountRef = useRef<TextInput | null>(null);

  const tints = useMemo(
    () => ({
      buy: { bg: "rgba(34,197,94,0.10)", border: "rgba(34,197,94,0.35)", text: "#0F172A", icon: "#0F172A" },
      sell: { bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.35)", text: "#0F172A", icon: "#0F172A" },
      deposit: { bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.35)", text: "#0F172A", icon: "#0F172A" },
      withdraw: { bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.35)", text: "#0F172A", icon: "#0F172A" },
      swap: { bg: "rgba(124,58,237,0.10)", border: "rgba(124,58,237,0.35)", text: "#0F172A", icon: "#0F172A" },
    }),
    []
  );

  const modeMeta = useMemo(() => {
    switch (mode) {
      case "buy":
        return { title: "Comprar", subtitle: "Cash → inversión (wallet origen cash)" };
      case "sell":
        return { title: "Vender", subtitle: "Inversión → cash (wallet destino cash)" };
      case "deposit":
        return { title: "Aportar", subtitle: "Cash → inversión" };
      case "withdraw":
        return { title: "Retirar", subtitle: "Inversión → cash" };
      case "swap":
        return { title: "Swap", subtitle: "Activo A → Activo B (sin wallet en v1)" };
      default:
        return { title: "Operación", subtitle: "" };
    }
  }, [mode]);

  const walletLabel = useMemo(() => {
    if (mode === "buy" || mode === "deposit") return "Wallet origen (cash)";
    if (mode === "sell" || mode === "withdraw") return "Wallet destino (cash)";
    return "Wallet (cash)";
  }, [mode]);

  const fetchAssets = useCallback(async () => {
    // Ajusta este endpoint si tu backend usa otro path.
    const res = await api.get("/investments/assets");
    const list: InvestmentAssetLite[] = Array.isArray(res.data) ? res.data : res.data?.assets ?? [];
    const onlyActive = (list || []).filter((a) => (a.active ?? true));
    // orden: nombre
    onlyActive.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    setAssets(onlyActive);
    return onlyActive;
  }, []);

  const fetchWallets = useCallback(async () => {
    try {
      setWalletError(null);
      const res = await api.get("/wallets");
      const list: WalletLite[] = Array.isArray(res.data) ? res.data : res.data?.wallets ?? [];

      const onlyCash = (list || [])
        .filter((w) => String(w.kind) === "cash" && (w.active ?? true))
        .sort((a, b) => {
          const pa = Number(a.position);
          const pb = Number(b.position);
          if (Number.isFinite(pa) && Number.isFinite(pb)) return pa - pb;
          return String(a.name).localeCompare(String(b.name));
        });

      setWallets(onlyCash);
      return onlyCash;
    } catch (e: any) {
      setWalletError(String(e?.response?.data?.message || e?.message || "Error cargando wallets"));
      setWallets([]);
      return [];
    }
  }, []);

  const resetForm = useCallback(
    (assetList: InvestmentAssetLite[], walletList: WalletLite[]) => {
      setMode("buy");

      const def = defaultAssetId ? assetList.find((a) => a.id === defaultAssetId) || null : null;
      const firstAsset = def || assetList[0] || null;

      setSelectedAsset(firstAsset);
      setFromAsset(firstAsset);
      setToAsset(null);

      setSelectedWallet(walletList[0] || null);

      setAmount("");
      setFee("");
      setAmountOut("");
      setAmountIn("");
      setDescription("");
    },
    [defaultAssetId]
  );

  const canSave = useMemo(() => {
    if (loading || saving) return false;

    const feeN = fee.trim() ? moneyToNumber(fee) : 0;
    if (fee.trim() && !Number.isFinite(feeN)) return false;
    if (Number.isFinite(feeN) && feeN < 0) return false;

    if (mode === "swap") {
      if (!fromAsset || !toAsset) return false;
      if (fromAsset.id === toAsset.id) return false;

      const outN = moneyToNumber(amountOut);
      if (!amountOut || !Number.isFinite(outN) || outN <= 0) return false;

      if (amountIn.trim()) {
        const inN = moneyToNumber(amountIn);
        if (!Number.isFinite(inN) || inN <= 0) return false;
      }

      return true;
    }

    if (!selectedAsset) return false;
    if (!selectedWallet) return false;

    const amtN = moneyToNumber(amount);
    if (!amount || !Number.isFinite(amtN) || amtN <= 0) return false;

    return true;
  }, [amount, amountIn, amountOut, fee, fromAsset, loading, mode, saving, selectedAsset, selectedWallet, toAsset]);

  const handleSubmit = useCallback(async () => {
    if (!canSave) return;

    try {
      setSaving(true);

      const date = new Date().toISOString();
      const desc = description.trim() || undefined;

      const feeN = fee.trim() ? moneyToNumber(fee) : 0;
      if (fee.trim() && !Number.isFinite(feeN)) return;

      if (mode === "swap") {
        const outN = moneyToNumber(amountOut);
        const inN = amountIn.trim() ? moneyToNumber(amountIn) : outN;

        await api.post("/investments/swap", {
          fromAssetId: fromAsset!.id,
          toAssetId: toAsset!.id,
          amountOut: outN,
          amountIn: inN,
          fee: feeN || 0,
          date,
          description: desc,
        });

        navigation.goBack();
        return;
      }

      const amtN = moneyToNumber(amount);
      const baseBody: any = { amount: amtN, fee: feeN || 0, date, description: desc };

      if (mode === "buy") {
        await api.post(`/investments/${selectedAsset!.id}/buy`, { ...baseBody, fromWalletId: selectedWallet!.id });
      } else if (mode === "deposit") {
        await api.post(`/investments/${selectedAsset!.id}/deposit`, { ...baseBody, fromWalletId: selectedWallet!.id });
      } else if (mode === "sell") {
        await api.post(`/investments/${selectedAsset!.id}/sell`, { ...baseBody, toWalletId: selectedWallet!.id });
      } else if (mode === "withdraw") {
        await api.post(`/investments/${selectedAsset!.id}/withdraw`, { ...baseBody, toWalletId: selectedWallet!.id });
      }

      navigation.goBack();
    } catch (e: any) {
      console.error("InvestmentOperationScreen submit error:", e?.response?.data || e);
      // Aquí puedes enchufar tu toast / inline error si lo usas en otras pantallas.
    } finally {
      setSaving(false);
    }
  }, [
    amount,
    amountIn,
    amountOut,
    canSave,
    description,
    fee,
    fromAsset,
    mode,
    navigation,
    selectedAsset,
    selectedWallet,
    toAsset,
  ]);

  const bootstrap = useCallback(async () => {
    try {
      setLoading(true);
      const [assetList, walletList] = await Promise.all([fetchAssets(), fetchWallets()]);
      resetForm(assetList, walletList);

      setTimeout(() => amountRef.current?.focus?.(), 120);
    } catch (e) {
      console.error("InvestmentOperationScreen bootstrap error:", e);
    } finally {
      setLoading(false);
    }
  }, [fetchAssets, fetchWallets, resetForm]);

  useFocusEffect(
    useCallback(() => {
      bootstrap();
    }, [bootstrap])
  );

  const onChangeMode = useCallback(
    (next: OperationMode) => {
      setMode(next);

      if (next === "swap") {
        if (!fromAsset && selectedAsset) setFromAsset(selectedAsset);
        setSelectedWallet(null); // no aplica
      } else {
        if (!selectedWallet && wallets.length) setSelectedWallet(wallets[0]);
        if (!selectedAsset && assets.length) setSelectedAsset(assets[0]);
      }
    },
    [assets.length, fromAsset, selectedAsset, selectedWallet, wallets]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background ?? "#F8FAFC" }}>
      {/* Header fijo */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <AppHeader title="Añadir operación" showProfile={false} showDatePicker={false} showBack={true} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Scroll desde debajo del header */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110 }}
        >
          {/* Top summary */}
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 26,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              padding: 16,
              overflow: "hidden",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 16,
                    backgroundColor: "rgba(15,23,42,0.04)",
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 10,
                  }}
                >
                  <Ionicons name="flash-outline" size={18} color={colors.primary} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "900", color: "#0F172A" }}>{modeMeta.title}</Text>
                  <Text style={{ marginTop: 2, fontSize: 12, fontWeight: "800", color: "#94A3B8" }} numberOfLines={1}>
                    {modeMeta.subtitle}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={bootstrap}
                activeOpacity={0.9}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 16,
                  backgroundColor: "#F8FAFC",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="refresh-outline" size={18} color="#334155" />
              </TouchableOpacity>
            </View>

            {/* Amount block */}
            <View style={{ marginTop: 14 }}>
              {mode === "swap" ? (
                <>
                  <Text style={{ fontSize: 12, fontWeight: "900", color: "#94A3B8" }}>Salida</Text>
                  <View
                    style={{
                      marginTop: 6,
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      backgroundColor: "#F8FAFC",
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      flexDirection: "row",
                      alignItems: "flex-end",
                      justifyContent: "space-between",
                    }}
                  >
                    <TextInput
                      value={amountOut}
                      onChangeText={(t) => setAmountOut(t.replace(".", ","))}
                      placeholder="0,00"
                      placeholderTextColor="#CBD5E1"
                      inputMode="decimal"
                      style={{ fontSize: 28, fontWeight: "900", color: "#0F172A", flex: 1 }}
                      returnKeyType="done"
                    />
                    <Text style={{ fontSize: 18, fontWeight: "900", color: "#94A3B8", marginLeft: 10 }}>€</Text>
                  </View>

                  <Text style={{ fontSize: 12, fontWeight: "900", color: "#94A3B8", marginTop: 12 }}>
                    Entrada (opcional)
                  </Text>
                  <View
                    style={{
                      marginTop: 6,
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      backgroundColor: "white",
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      flexDirection: "row",
                      alignItems: "flex-end",
                      justifyContent: "space-between",
                    }}
                  >
                    <TextInput
                      value={amountIn}
                      onChangeText={(t) => setAmountIn(t.replace(".", ","))}
                      placeholder="Si vacío = salida"
                      placeholderTextColor="#CBD5E1"
                      inputMode="decimal"
                      style={{ fontSize: 18, fontWeight: "900", color: "#0F172A", flex: 1 }}
                      returnKeyType="done"
                    />
                    <Text style={{ fontSize: 16, fontWeight: "900", color: "#94A3B8", marginLeft: 10 }}>€</Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 12, fontWeight: "900", color: "#94A3B8" }}>Cantidad</Text>
                  <View
                    style={{
                      marginTop: 6,
                      borderRadius: 22,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      backgroundColor: "#F8FAFC",
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      flexDirection: "row",
                      alignItems: "flex-end",
                      justifyContent: "space-between",
                    }}
                  >
                    <TextInput
                      ref={(r) => (amountRef.current = r)}
                      value={amount}
                      onChangeText={(t) => setAmount(t.replace(".", ","))}
                      placeholder="0,00"
                      placeholderTextColor="#CBD5E1"
                      inputMode="decimal"
                      style={{ fontSize: 34, fontWeight: "900", color: "#0F172A", flex: 1 }}
                      returnKeyType="done"
                      onSubmitEditing={() => {
                        if (canSave && !saving) handleSubmit();
                      }}
                    />
                    <Text style={{ fontSize: 20, fontWeight: "900", color: "#94A3B8", marginLeft: 10 }}>€</Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Mode selector */}
          <Section title="Operación">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {[
                { label: "Comprar", value: "buy" as const, icon: "cart-outline" as const, tint: tints.buy },
                { label: "Vender", value: "sell" as const, icon: "cash-outline" as const, tint: tints.sell },
                { label: "Aportar", value: "deposit" as const, icon: "arrow-down-outline" as const, tint: tints.deposit },
                { label: "Retirar", value: "withdraw" as const, icon: "arrow-up-outline" as const, tint: tints.withdraw },
                { label: "Swap", value: "swap" as const, icon: "swap-horizontal-outline" as const, tint: tints.swap },
              ].map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  leftIcon={opt.icon}
                  active={mode === opt.value}
                  tint={opt.tint}
                  onPress={() => onChangeMode(opt.value)}
                />
              ))}
            </View>
          </Section>

          {/* Wallet (no swap) */}
          {mode !== "swap" ? (
            <Section
              title={walletLabel}
              right={
                <TouchableOpacity
                  onPress={fetchWallets}
                  activeOpacity={0.9}
                  style={{
                    height: 34,
                    paddingHorizontal: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "rgba(15,23,42,0.10)",
                    backgroundColor: "#F8FAFC",
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="refresh" size={16} color={colors.primary} />
                  <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: "900", color: "#0F172A" }}>
                    Actualizar
                  </Text>
                </TouchableOpacity>
              }
            >
              {!!walletError ? (
                <View
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "rgba(245,158,11,0.25)",
                    backgroundColor: "rgba(245,158,11,0.10)",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "900", color: "#92400E" }}>{walletError}</Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {wallets.map((w) => {
                      const active = selectedWallet?.id === w.id;
                      const label = `${w.emoji || "👛"} ${w.name}${
                        w.balance !== undefined && w.balance !== null
                          ? ` · ${formatMoney(w.balance, w.currency || "EUR")}`
                          : ""
                      }`;

                      return (
                        <Chip
                          key={w.id}
                          label={label}
                          active={active}
                          onPress={() => setSelectedWallet(w)}
                          tint={tints.deposit}
                        />
                      );
                    })}
                  </View>
                </ScrollView>
              )}
            </Section>
          ) : null}

          {/* Assets */}
          {mode === "swap" ? (
            <>
              <Section title="Activo origen">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {assets.map((a) => (
                      <Chip
                        key={a.id}
                        label={` ${a.name}`}
                        leftIcon={iconForAssetType(a.type)}
                        active={fromAsset?.id === a.id}
                        onPress={() => {
                          setFromAsset(a);
                          if (toAsset?.id === a.id) setToAsset(null);
                        }}
                        tint={tints.swap}
                      />
                    ))}
                  </View>
                </ScrollView>
              </Section>

              <Section title="Activo destino">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {assets.map((a) => {
                      const disabled = fromAsset?.id === a.id;
                      return (
                        <Chip
                          key={a.id}
                          label={` ${a.name}`}
                          leftIcon={iconForAssetType(a.type)}
                          active={toAsset?.id === a.id}
                          disabled={disabled}
                          onPress={() => {
                            if (!disabled) setToAsset(a);
                          }}
                          tint={tints.swap}
                        />
                      );
                    })}
                  </View>
                </ScrollView>
              </Section>
            </>
          ) : (
            <Section title="Activo">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {assets.map((a) => (
                    <Chip
                      key={a.id}
                      label={` ${a.name}`}
                      leftIcon={iconForAssetType(a.type)}
                      active={selectedAsset?.id === a.id}
                      onPress={() => setSelectedAsset(a)}
                      tint={tints.buy}
                    />
                  ))}
                </View>
              </ScrollView>
            </Section>
          )}

          {/* Fee + Note */}
          <Section title="Comisión (opcional)">
            <View
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                backgroundColor: "white",
                paddingHorizontal: 12,
                height: 46,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Ionicons name="pricetag-outline" size={16} color="#94A3B8" />
              <TextInput
                value={fee}
                onChangeText={(t) => setFee(t.replace(".", ","))}
                placeholder="0,00"
                placeholderTextColor="#94A3B8"
                inputMode="decimal"
                style={{ marginLeft: 10, flex: 1, fontSize: 14, fontWeight: "800", color: "#0F172A" }}
              />
              <Text style={{ fontSize: 12, fontWeight: "900", color: "#94A3B8" }}>€</Text>
            </View>

            <Text style={{ marginTop: 10, fontSize: 12, fontWeight: "800", color: "#94A3B8", lineHeight: 16 }}>
              La comisión se suma al coste (buy/deposit) o se descuenta del ingreso (sell/withdraw).
            </Text>
          </Section>

          <Section title="Nota (opcional)">
            <View
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                backgroundColor: "white",
                padding: 12,
              }}
            >
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Ej: ajuste por comisiones / rebalanceo"
                placeholderTextColor="#94A3B8"
                style={{ fontSize: 14, fontWeight: "800", color: "#0F172A" }}
              />
            </View>
          </Section>

          {loading ? (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ marginTop: 10, fontSize: 12, fontWeight: "800", color: "#94A3B8" }}>Cargando…</Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Bottom CTA fixed */}
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 20,
            paddingBottom: Platform.OS === "ios" ? 24 : 16,
            paddingTop: 10,
            backgroundColor: "rgba(248,250,252,0.96)",
            borderTopWidth: 1,
            borderTopColor: "#E5E7EB",
          }}
        >
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSave || saving}
            activeOpacity={0.9}
            style={{
              height: 52,
              borderRadius: 18,
              backgroundColor: !canSave ? "#E2E8F0" : "#0F172A",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Ionicons name="checkmark-outline" size={20} color="white" />
            )}
            <Text style={{ fontSize: 14, fontWeight: "900", color: "white" }}>
              Ejecutar operación
            </Text>
          </TouchableOpacity>

          {!canSave && !loading ? (
            <Text style={{ marginTop: 8, fontSize: 12, fontWeight: "800", color: "#94A3B8", textAlign: "center" }}>
              Completa los campos requeridos para poder ejecutar.
            </Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
