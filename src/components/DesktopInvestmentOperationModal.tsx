// src/components/DesktopInvestmentOperationModal.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/api";
import { colors } from "../theme/theme";

type OperationType = "buy" | "sell" | "transfer_in" | "transfer_out" | "swap";
type InvestmentAssetType = "crypto" | "etf" | "stock" | "fund" | "custom" | "cash";

export type InvestmentAssetLite = {
  id: number;
  name: string;
  type: InvestmentAssetType;
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

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;

  assets: InvestmentAssetLite[];
  defaultAssetId?: number;
};

const isWeb = Platform.OS === "web";
const noOutline = isWeb ? ({ outlineStyle: "none" } as any) : {};

const moneyToNumber = (s: string) => {
  // admite "1.234,56" o "1234,56" o "1234.56"
  const v = (s || "").replace(/\./g, "").replace(",", ".");
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

function formatMoney(n: any, currency = "EUR") {
  const v = Number.isFinite(Number(n)) ? Number(n) : 0;
  try {
    return v.toLocaleString("es-ES", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch {
    return `${v.toFixed(2)} ${currency}`;
  }
}

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
        noOutline,
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
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 12,
        marginTop: 10,
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

export default function DesktopInvestmentOperationModal({
  visible,
  onClose,
  onSaved,
  assets,
  defaultAssetId,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

const [opType, setOpType] = useState<OperationType>("buy");

  // Wallets cash desde backend
  const [wallets, setWallets] = useState<WalletLite[]>([]);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Selecciones
  const [selectedWallet, setSelectedWallet] = useState<WalletLite | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<InvestmentAssetLite | null>(null);

  // Swap
  const [fromAsset, setFromAsset] = useState<InvestmentAssetLite | null>(null);
  const [toAsset, setToAsset] = useState<InvestmentAssetLite | null>(null);

  // Inputs
  const [amount, setAmount] = useState(""); // cantidad principal (buy/sell/deposit/withdraw)
  const [fee, setFee] = useState(""); // comisión
  const [amountOut, setAmountOut] = useState(""); // swap: salida
  const [amountIn, setAmountIn] = useState(""); // swap: entrada (opcional)
  const [description, setDescription] = useState("");

  const amountRef = useRef<any>(null);

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

const opMeta = useMemo(() => {
  switch (opType) {
    case "buy":
      return { title: "Comprar", subtitle: "Cash → inversión (wallet origen cash)" };
    case "sell":
      return { title: "Vender", subtitle: "Inversión → cash (wallet destino cash)" };
    case "transfer_in":
      return { title: "Aportar", subtitle: "Cash → inversión (aporte/entrada)" };
    case "transfer_out":
      return { title: "Retirar", subtitle: "Inversión → cash (retirada/salida)" };
    case "swap":
      return { title: "Swap", subtitle: "Activo A → Activo B (sin wallets en v1)" };
    default:
      return { title: "Operación", subtitle: "" };
  }
}, [opType]);

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

  const resetForm = useCallback(() => {
    setOpType("buy");

    setSelectedWallet(null);

    const def = defaultAssetId ? assets.find((a) => a.id === defaultAssetId) || null : null;
    setSelectedAsset(def);
    setFromAsset(def);
    setToAsset(null);

    setAmount("");
    setFee("");
    setAmountOut("");
    setAmountIn("");
    setDescription("");
  }, [assets, defaultAssetId]);

  useEffect(() => {
    if (!visible) return;

    (async () => {
      setLoading(true);
      resetForm();

      const w = await fetchWallets();
      // autoselección: primera wallet cash si existe
      if (w?.length) setSelectedWallet(w[0]);

      setLoading(false);

      // focus cantidad (web)
      setTimeout(() => {
        amountRef.current?.focus?.();
      }, 50);
    })();
  }, [visible, resetForm, fetchWallets]);

const canSave = useMemo(() => {
  if (loading || saving) return false;

  const feeN = fee.trim() ? moneyToNumber(fee) : 0;
  if (fee.trim() && !Number.isFinite(feeN)) return false;
  if (Number.isFinite(feeN) && feeN < 0) return false;

  if (opType === "swap") {
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
}, [loading, saving, fee, opType, fromAsset, toAsset, amountOut, amountIn, selectedAsset, selectedWallet, amount]);

const handleSubmit = useCallback(async () => {
  if (!canSave) return;

  try {
    setSaving(true);

    const date = new Date().toISOString();
    const desc = description.trim() || undefined;

    const feeN = fee.trim() ? moneyToNumber(fee) : 0;
    if (fee.trim() && !Number.isFinite(feeN)) return;

    if (opType === "swap") {
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

      onSaved();
      onClose();
      return;
    }

    const amtN = moneyToNumber(amount);
    const baseBody: any = { amount: amtN, fee: feeN || 0, date, description: desc };

    // IMPORTANTE: aquí mantienes tus endpoints tal cual
    if (opType === "buy") {
      await api.post(`/investments/${selectedAsset!.id}/buy`, { ...baseBody, fromWalletId: selectedWallet!.id });
    } else if (opType === "transfer_in") {
      await api.post(`/investments/${selectedAsset!.id}/deposit`, { ...baseBody, fromWalletId: selectedWallet!.id });
    } else if (opType === "sell") {
      await api.post(`/investments/${selectedAsset!.id}/sell`, { ...baseBody, toWalletId: selectedWallet!.id });
    } else if (opType === "transfer_out") {
      await api.post(`/investments/${selectedAsset!.id}/withdraw`, { ...baseBody, toWalletId: selectedWallet!.id });
    }

    onSaved();
    onClose();
  } catch (e: any) {
    console.error("DesktopInvestmentOperationModal submit error:", e?.response?.data || e);
  } finally {
    setSaving(false);
  }
}, [
  canSave,
  opType,
  amount,
  fee,
  description,
  amountOut,
  amountIn,
  fromAsset,
  toAsset,
  selectedAsset,
  selectedWallet,
  onSaved,
  onClose,
]);

  // Keyboard web: ESC / Ctrl+Enter
  useEffect(() => {
    if (!visible || !isWeb) return;
    const onKeyDown = (e: any) => {
      if (e.key === "Escape") onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        if (canSave && !saving) handleSubmit();
      }
    };
    // @ts-ignore
    window.addEventListener("keydown", onKeyDown);
    // @ts-ignore
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visible, onClose, canSave, saving, handleSubmit]);

  const walletLabel = useMemo(() => {
    if (opType === "buy" || opType === "transfer_in") return "Wallet origen (cash)";
    if (opType === "sell" || opType === "transfer_out") return "Wallet destino (cash)";
    return "Wallet (cash)";
  }, [opType]);

  const AmountCard = (
    <View
      style={{
        width: 340,
        backgroundColor: "white",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 12,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: "900", color: "#94A3B8", alignSelf: "flex-start" }}>
        {opType === "swap" ? "Cantidad (swap)" : "Cantidad"}
      </Text>

      {opType === "swap" ? (
        <View style={{ width: "100%", marginTop: 8 }}>
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: "900", color: "#94A3B8" }}>Salida</Text>
            <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 4 }}>
              <TextInput
                value={amountOut}
                onChangeText={(t) => setAmountOut(t.replace(".", ","))}
                placeholder="0,00"
                placeholderTextColor="#CBD5E1"
                inputMode="decimal"
                style={{
                  fontSize: 34,
                  fontWeight: "900",
                  color: "#0F172A",
                  textAlign: "left",
                  width: 190,
                  paddingVertical: 6,
                }}
                onSubmitEditing={() => {
                  if (canSave && !saving) handleSubmit();
                }}
                blurOnSubmit={false}
              />
              <Text style={{ fontSize: 22, fontWeight: "900", color: "#94A3B8", marginLeft: 6, paddingBottom: 10 }}>
                €
              </Text>
            </View>
          </View>

          <View>
            <Text style={{ fontSize: 12, fontWeight: "900", color: "#94A3B8" }}>Entrada (opcional)</Text>
            <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 4 }}>
              <TextInput
                value={amountIn}
                onChangeText={(t) => setAmountIn(t.replace(".", ","))}
                placeholder="Si vacío = salida"
                placeholderTextColor="#CBD5E1"
                inputMode="decimal"
                style={{
                  fontSize: 22,
                  fontWeight: "900",
                  color: "#0F172A",
                  textAlign: "left",
                  width: 190,
                  paddingVertical: 6,
                }}
              />
              <Text style={{ fontSize: 18, fontWeight: "900", color: "#94A3B8", marginLeft: 6, paddingBottom: 10 }}>
                €
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 4 }}>
          <TextInput
            ref={amountRef}
            value={amount}
            onChangeText={(t) => setAmount(t.replace(".", ","))}
            placeholder="0,00"
            placeholderTextColor="#CBD5E1"
            inputMode="decimal"
            style={{
              fontSize: 44,
              fontWeight: "900",
              color: "#0F172A",
              textAlign: "center",
              width: 190,
              paddingVertical: 6,
            }}
            onSubmitEditing={() => {
              if (canSave && !saving) handleSubmit();
            }}
            blurOnSubmit={false}
          />
          <Text style={{ fontSize: 26, fontWeight: "900", color: "#94A3B8", marginLeft: 6, paddingBottom: 10 }}>€</Text>
        </View>
      )}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        onPress={onClose}
        style={[
          {
            flex: 1,
            backgroundColor: "rgba(2,6,23,0.45)",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          },
          noOutline,
        ]}
      >
        <Pressable
          onPress={(e: any) => e?.stopPropagation?.()}
          onStartShouldSetResponder={() => true}
          style={[
            {
              width: 900,
              maxWidth: "100%",
              maxHeight: "92%",
              backgroundColor: "#F8FAFC",
              borderRadius: 22,
              borderWidth: 1,
              borderColor: "rgba(15,23,42,0.12)",
              overflow: "hidden",
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 10 },
              elevation: 20,
            },
            noOutline,
          ]}
        >
          {/* Header */}
          <View
            style={{
              height: 56,
              backgroundColor: "white",
              borderBottomWidth: 1,
              borderBottomColor: "#E5E7EB",
              paddingHorizontal: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  backgroundColor: "white",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                <Ionicons name="flash" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={{ fontSize: 14, fontWeight: "900", color: "#0F172A" }}>{opMeta.title}</Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!canSave || saving}
                activeOpacity={0.9}
                style={[
                  {
                    height: 40,
                    paddingHorizontal: 14,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: !canSave ? "#E5E7EB" : "rgba(15,23,42,0.14)",
                    backgroundColor: !canSave ? "#F1F5F9" : "white",
                    flexDirection: "row",
                    alignItems: "center",
                    marginRight: 10,
                  },
                  noOutline,
                ]}
              >
                {saving ? <ActivityIndicator /> : <Ionicons name="checkmark" size={18} color="#0F172A" />}
                <Text style={{ marginLeft: 8, fontSize: 12, fontWeight: "900", color: "#0F172A" }}>
                  Ejecutar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.9}
                style={[
                  {
                    width: 40,
                    height: 40,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    backgroundColor: "white",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                  noOutline,
                ]}
              >
                <Ionicons name="close" size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <View style={{ padding: 18 }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 14, paddingBottom: 18 }}>
              {/* TOP: Modo + Cantidad */}
              <View style={{ flexDirection: "row", alignItems: "stretch" }}>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "white",
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    padding: 12,
                    marginRight: 10,
                    minWidth: 320,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "900", color: "#94A3B8", marginBottom: 10 }}>
                    Operación
                  </Text>

                  <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
 {[
  { label: "Comprar",   value: "buy" as const,         icon: "cart" as const,            tint: tints.buy },
  { label: "Vender",    value: "sell" as const,        icon: "cash" as const,            tint: tints.sell },
  { label: "Aportar",   value: "transfer_in" as const, icon: "arrow-down" as const,      tint: tints.deposit },
  { label: "Retirar",   value: "transfer_out" as const,icon: "arrow-up" as const,        tint: tints.withdraw },
  { label: "Swap",      value: "swap" as const,        icon: "swap-horizontal" as const, tint: tints.swap },
].map((opt) => {
  const active = opType === opt.value;
  return (
    <View key={opt.value} style={{ marginRight: 8, marginBottom: 8 }}>
      <Chip
        label={opt.label}
        leftIcon={opt.icon}
        active={active}
        tint={opt.tint}
        onPress={() => {
          setOpType(opt.value);

          if (opt.value === "swap") {
            if (!fromAsset && selectedAsset) setFromAsset(selectedAsset);
            setSelectedWallet(null); // no aplica
          } else {
            if (!selectedWallet && wallets.length) setSelectedWallet(wallets[0]);
            if (!selectedAsset && assets.length) setSelectedAsset(assets[0]);
          }
        }}
      />
    </View>
  );
})}

                  </View>

                </View>

                {AmountCard}
              </View>

              {/* Wallet (solo si NO swap) */}
              {opType !== "swap" ? (
                <Section
                  title={walletLabel}
                  right={
                    <TouchableOpacity
                      onPress={fetchWallets}
                      activeOpacity={0.9}
                      style={[
                        {
                          height: 34,
                          paddingHorizontal: 10,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: "rgba(15,23,42,0.10)",
                          backgroundColor: "#F8FAFC",
                          flexDirection: "row",
                          alignItems: "center",
                        },
                        noOutline,
                      ]}
                    >
                      <Ionicons name="refresh" size={16} color={colors.primary} />
                      <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: "900", color: "#0F172A" }}>Actualizar</Text>
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
                      <View style={{ flexDirection: "row" }}>
                        {wallets.map((w, idx) => {
                          const active = selectedWallet?.id === w.id;
                          const label = `${w.emoji || "👛"} ${w.name}${
                            w.balance !== undefined ? ` · ${formatMoney(w.balance, w.currency || "EUR")}` : ""
                          }`;

                          return (
                            <View key={w.id} style={idx ? { marginLeft: 8 } : undefined}>
                              <Chip label={label} active={active} onPress={() => setSelectedWallet(w)} tint={tints.deposit} />
                            </View>
                          );
                        })}
                      </View>
                    </ScrollView>
                  )}
                </Section>
              ) : null}

              {/* Activo(s) */}
              {opType === "swap" ? (
                <>
                  <Section title="Activo origen">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: "row" }}>
                        {assets.map((a, idx) => {
                          const active = fromAsset?.id === a.id;
                          return (
                            <View key={a.id} style={idx ? { marginLeft: 8 } : undefined}>
                              <Chip
                                label={` ${a.name}`}
                                leftIcon={iconForAssetType(a.type)}
                                active={active}
                                onPress={() => {
                                  setFromAsset(a);
                                  if (toAsset?.id === a.id) setToAsset(null);
                                }}
                                tint={tints.swap}
                              />
                            </View>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </Section>

                  <Section title="Activo destino">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: "row" }}>
                        {assets.map((a, idx) => {
                          const disabled = fromAsset?.id === a.id;
                          const active = toAsset?.id === a.id;
                          return (
                            <View key={a.id} style={idx ? { marginLeft: 8 } : undefined}>
                              <Chip
                                label={` ${a.name}`}
                                leftIcon={iconForAssetType(a.type)}
                                active={active}
                                disabled={disabled}
                                onPress={() => {
                                  if (disabled) return;
                                  setToAsset(a);
                                }}
                                tint={tints.swap}
                              />
                            </View>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </Section>
                </>
              ) : (
                <Section title="Activo">
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: "row" }}>
                      {assets.map((a, idx) => {
                        const active = selectedAsset?.id === a.id;
                        return (
                          <View key={a.id} style={idx ? { marginLeft: 8 } : undefined}>
                            <Chip
                              label={` ${a.name}`}
                              leftIcon={iconForAssetType(a.type)}
                              active={active}
                              onPress={() => setSelectedAsset(a)}
                              tint={tints.buy}
                            />
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                </Section>
              )}

              {/* Comisión + Nota */}
              <View style={{ flexDirection: "row", marginTop: 10 }}>
                <View style={{ width: 340, marginRight: 10 }}>
                  <Section title="Comisión (opcional)">
                    <View
                      style={{
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                        backgroundColor: "white",
                        paddingHorizontal: 12,
                        height: 42,
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons name="pricetag" size={16} color="#94A3B8" />
                      <TextInput
                        value={fee}
                        onChangeText={(t) => setFee(t.replace(".", ","))}
                        placeholder="0,00"
                        placeholderTextColor="#94A3B8"
                        inputMode="decimal"
                        style={{ marginLeft: 10, flex: 1, fontSize: 13, fontWeight: "800", color: "#0F172A" }}
                      />
                      <Text style={{ fontSize: 12, fontWeight: "900", color: "#94A3B8" }}>€</Text>
                    </View>

                    <Text style={{ marginTop: 8, fontSize: 12, fontWeight: "800", color: "#94A3B8" }}>
                      La comisión se suma al coste (buy/deposit) o se descuenta del ingreso (sell/withdraw).
                    </Text>
                  </Section>
                </View>

                <View style={{ flex: 1 }}>
                  <Section title="Nota (opcional)">
                    <View style={{ borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "white", padding: 10 }}>
                      <TextInput
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Ej: ajuste por comisiones / rebalanceo"
                        placeholderTextColor="#94A3B8"
                        style={{ fontSize: 13, fontWeight: "800", color: "#0F172A" }}
                      />
                    </View>
                  </Section>
                </View>
              </View>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
