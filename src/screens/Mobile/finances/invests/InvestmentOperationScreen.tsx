// src/screens/Investments/InvestmentOperationScreen.tsx
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import api from "../../../../api/api";
import { colors } from "../../../../theme/theme";
import { markInvestmentsDirty } from "../../../../utils/investmentsInvalidation";

type OperationMode = "buy" | "sell" | "swap";
type InvestmentAssetType = "crypto" | "etf" | "stock" | "fund" | "custom" | "cash";

type InvestmentAssetLite = {
  id: number;
  name: string;
  abbreviation?: string | null;
  type: InvestmentAssetType;
  active?: boolean;
};

type WalletLite = {
  id: number;
  name: string;
  emoji?: string | null;
  kind: string;
  currency?: string | null;
  balance?: number | null;
  active?: boolean;
  position?: number | null;
};

const parseAmount = (s: string) => {
  const v = (s || "").replace(/\./g, "").replace(",", ".");
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

const parseQty = (s: string) => {
  const v = (s || "").trim().replace(/\./g, "").replace(",", ".");
  if (!v) return NaN;
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

const assetLabel = (a: InvestmentAssetLite) => a.abbreviation?.trim() || a.name;

const iconForType = (t: InvestmentAssetType): keyof typeof Ionicons.glyphMap => {
  switch (t) {
    case "crypto": return "logo-bitcoin";
    case "stock":  return "trending-up";
    case "etf":    return "layers";
    case "fund":   return "pie-chart";
    default:       return "briefcase";
  }
};

// ── Chip ────────────────────────────────────────────────────────────────────
const chipBase = {
  minHeight: 30,
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 9999,
  borderWidth: 1,
  justifyContent: "center" as const,
  alignItems: "center" as const,
  marginRight: 8,
};
const chipActive = { backgroundColor: "#e0f2fe", borderColor: "#3b82f6" };
const chipInactive = { borderColor: "#d1d5db" };

function Chip({
  label, active, disabled, onPress, icon,
}: {
  label: string; active?: boolean; disabled?: boolean;
  onPress?: () => void; icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      activeOpacity={0.8}
      style={[chipBase, active ? chipActive : chipInactive, disabled ? { opacity: 0.35 } : null]}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {icon ? <Ionicons name={icon} size={14} color={active ? "#1d4ed8" : "#6b7280"} style={{ marginRight: 5 }} /> : null}
        <Text style={{ fontSize: 15, color: active ? "#1d4ed8" : "#111827", fontWeight: active ? "600" : "400" }}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Inline text input row (participaciones, fee, nota) ──────────────────────
function FieldRow({ label, value, onChange, placeholder, icon, right }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; icon?: keyof typeof Ionicons.glyphMap; right?: string;
}) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 8 }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingBottom: 8 }}>
        {icon ? <Ionicons name={icon} size={16} color="#d1d5db" style={{ marginRight: 8 }} /> : null}
        <TextInput
          value={value}
          onChangeText={(t) => onChange(t.replace(".", ","))}
          placeholder={placeholder ?? "0,0000"}
          placeholderTextColor="#d1d5db"
          inputMode="decimal"
          style={{ flex: 1, fontSize: 15, color: "#111827" }}
          returnKeyType="done"
        />
        {right ? <Text style={{ fontSize: 14, color: "#9CA3AF", marginLeft: 6 }}>{right}</Text> : null}
      </View>
    </View>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────
export default function InvestmentOperationScreen({ navigation, route }: any) {
  const defaultAssetId: number | undefined = route?.params?.assetId;

  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [mode,    setMode]    = useState<OperationMode>("buy");

  const [assets,  setAssets]  = useState<InvestmentAssetLite[]>([]);
  const [wallets, setWallets] = useState<WalletLite[]>([]);
  const [walletError, setWalletError] = useState<string | null>(null);

  const [selectedWallet, setSelectedWallet] = useState<WalletLite | null>(null);
  const [selectedAsset,  setSelectedAsset]  = useState<InvestmentAssetLite | null>(null);
  const [fromAsset,      setFromAsset]      = useState<InvestmentAssetLite | null>(null);
  const [toAsset,        setToAsset]        = useState<InvestmentAssetLite | null>(null);

  const [amount,      setAmount]      = useState("");
  const [fee,         setFee]         = useState("");
  const [description, setDescription] = useState("");

  const [quantity,    setQuantity]    = useState("");
  const [quantityOut, setQuantityOut] = useState("");
  const [quantityIn,  setQuantityIn]  = useState("");

  const amountRef = useRef<TextInput>(null);

  // ── data ──────────────────────────────────────────────────────────────────
  const fetchAssets = useCallback(async () => {
    const res = await api.get("/investments/assets");
    const list: InvestmentAssetLite[] = Array.isArray(res.data) ? res.data : res.data?.assets ?? [];
    const active = list.filter((a) => a.active ?? true).sort((a, b) => a.name.localeCompare(b.name));
    setAssets(active);
    return active;
  }, []);

  const fetchWallets = useCallback(async () => {
    try {
      setWalletError(null);
      const res = await api.get("/wallets");
      const list: WalletLite[] = Array.isArray(res.data) ? res.data : res.data?.wallets ?? [];
      const cash = list
        .filter((w) => String(w.kind) === "cash" && (w.active ?? true))
        .sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0) || a.name.localeCompare(b.name));
      setWallets(cash);
      return cash;
    } catch (e: any) {
      setWalletError(String(e?.response?.data?.message || e?.message || "Error cargando wallets"));
      setWallets([]);
      return [];
    }
  }, []);

  const resetForm = useCallback((assetList: InvestmentAssetLite[], walletList: WalletLite[]) => {
    setMode("buy");
    const def   = defaultAssetId ? assetList.find((a) => a.id === defaultAssetId) || null : null;
    const first = def || assetList[0] || null;
    setSelectedAsset(first);
    setFromAsset(first);
    setToAsset(null);
    setSelectedWallet(walletList[0] || null);
    setAmount(""); setFee(""); setDescription("");
    setQuantity(""); setQuantityOut(""); setQuantityIn("");
  }, [defaultAssetId]);

  const bootstrap = useCallback(async () => {
    try {
      setLoading(true);
      const [assetList, walletList] = await Promise.all([fetchAssets(), fetchWallets()]);
      resetForm(assetList, walletList);
    } catch (e) {
      console.error("InvestmentOperationScreen bootstrap:", e);
    } finally {
      setLoading(false);
    }
  }, [fetchAssets, fetchWallets, resetForm]);

  useFocusEffect(useCallback(() => { bootstrap(); }, [bootstrap]));

  // ── validation ────────────────────────────────────────────────────────────
  const canSave = useMemo(() => {
    if (loading || saving) return false;
    const feeN = fee.trim() ? parseAmount(fee) : 0;
    if (fee.trim() && (!Number.isFinite(feeN) || feeN < 0)) return false;

    const amtN = parseAmount(amount);
    if (!amount || !Number.isFinite(amtN) || amtN <= 0) return false;

    if (mode === "swap") {
      if (!fromAsset || !toAsset || fromAsset.id === toAsset.id) return false;
      if (quantityOut.trim()) {
        const q = parseQty(quantityOut);
        if (!Number.isFinite(q) || q <= 0) return false;
      }
      if (quantityIn.trim()) {
        const q = parseQty(quantityIn);
        if (!Number.isFinite(q) || q <= 0) return false;
      }
      return true;
    }

    if (!selectedAsset || !selectedWallet) return false;
    if (quantity.trim()) {
      const q = parseQty(quantity);
      if (!Number.isFinite(q) || q <= 0) return false;
    }
    return true;
  }, [amount, fee, fromAsset, loading, mode, quantity, quantityIn, quantityOut, saving, selectedAsset, selectedWallet, toAsset]);

  // ── submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!canSave) return;
    try {
      setSaving(true);
      const date  = new Date().toISOString();
      const desc  = description.trim() || undefined;
      const feeN  = fee.trim() ? parseAmount(fee) : 0;
      const amtN  = parseAmount(amount);

      if (mode === "swap") {
        const qOutN = quantityOut.trim() ? parseQty(quantityOut) : undefined;
        const qInN  = quantityIn.trim()  ? parseQty(quantityIn)  : undefined;
        await api.post("/investments/swap", {
          fromAssetId: fromAsset!.id, toAssetId: toAsset!.id,
          amountOut: amtN, amountIn: amtN,
          fee: feeN || 0, date, description: desc,
          ...(qOutN !== undefined ? { quantityOut: qOutN } : {}),
          ...(qInN  !== undefined ? { quantityIn:  qInN  } : {}),
        });
      } else {
        const qtyN = quantity.trim() ? parseQty(quantity) : undefined;
        const base = { amount: amtN, fee: feeN || 0, date, description: desc,
                       ...(qtyN !== undefined ? { quantity: qtyN } : {}) };
        if (mode === "buy") {
          await api.post(`/investments/${selectedAsset!.id}/buy`,  { ...base, fromWalletId: selectedWallet!.id });
        } else {
          await api.post(`/investments/${selectedAsset!.id}/sell`, { ...base, toWalletId:   selectedWallet!.id });
        }
      }

      markInvestmentsDirty();
      navigation.goBack();
    } catch (e: any) {
      console.error("InvestmentOperationScreen submit:", e?.response?.data || e);
    } finally {
      setSaving(false);
    }
  }, [amount, canSave, description, fee, fromAsset, mode, navigation, quantity, quantityIn, quantityOut, selectedAsset, selectedWallet, toAsset]);

  // ── mode change ───────────────────────────────────────────────────────────
  const onChangeMode = useCallback((next: OperationMode) => {
    setMode(next);
    if (next === "swap") {
      if (!fromAsset && selectedAsset) setFromAsset(selectedAsset);
      setSelectedWallet(null);
    } else {
      if (!selectedWallet && wallets.length) setSelectedWallet(wallets[0]);
      if (!selectedAsset  && assets.length)  setSelectedAsset(assets[0]);
    }
  }, [assets.length, fromAsset, selectedAsset, selectedWallet, wallets]);

  // ── wallet label ──────────────────────────────────────────────────────────
  const walletLabel = mode === "buy" ? "Cartera origen (cash)" : "Cartera destino (cash)";

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      {/* HEADER */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 50 }}>
          <Ionicons name="chevron-back" size={26} color="#111" />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 17, fontWeight: "500", color: "#111" }}>Añadir operación</Text>
        </View>

        <View style={{ minWidth: 50, alignItems: "flex-end" }}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <TouchableOpacity onPress={handleSubmit} disabled={!canSave}>
              <Text style={{ fontSize: 15, fontWeight: "500", color: canSave ? colors.primary : "#d1d5db" }}>
                Guardar
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}
          >
            {/* TABS */}
            <View style={{ marginTop: 24, marginBottom: 24, flexDirection: "row", backgroundColor: "#f3f4f6", borderRadius: 16, padding: 4 }}>
              {([
                { label: "Comprar",    value: "buy",  bg: "rgba(34,197,94,0.12)"  },
                { label: "Vender",     value: "sell", bg: "rgba(239,68,68,0.12)"  },
                { label: "Transferir", value: "swap", bg: "rgba(37,99,235,0.12)"  },
              ] as const).map((tab) => {
                const active = mode === tab.value;
                return (
                  <TouchableOpacity
                    key={tab.value}
                    onPress={() => onChangeMode(tab.value)}
                    style={{
                      flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: "center",
                      backgroundColor: active ? tab.bg : "transparent",
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: active ? "600" : "400", color: active ? "#111827" : "#9CA3AF" }}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* AMOUNT */}
            <View style={{ alignItems: "center", marginBottom: 32, marginTop: 8 }}>
              {mode === "swap" && (
                <Text style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 4 }}>Importe (venta = compra)</Text>
              )}
              <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "center" }}>
                <TextInput
                  ref={amountRef}
                  value={amount}
                  onChangeText={(t) => setAmount(t.replace(".", ","))}
                  placeholder="0"
                  placeholderTextColor="#D1D5DB"
                  keyboardType="decimal-pad"
                  style={{ fontSize: 48, fontWeight: "700", color: "#0F172A", letterSpacing: -1, minWidth: 40, textAlign: "right" }}
                  returnKeyType="done"
                />
                <Text style={{ fontSize: 32, fontWeight: "600", color: "#94A3B8", marginLeft: 6, marginBottom: 6 }}>€</Text>
              </View>
              <Text style={{ marginTop: 6, fontSize: 11, color: "#CBD5E1", fontWeight: "600" }}>toca para editar</Text>
            </View>

            {/* WALLET */}
            {mode !== "swap" ? (
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 8 }}>{walletLabel}</Text>
                {walletError ? (
                  <Text style={{ fontSize: 13, color: "#b45309" }}>{walletError}</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {wallets.map((w) => (
                      <Chip
                        key={w.id}
                        label={`${w.emoji || "👛"} ${w.name}${w.balance != null ? ` · ${formatMoney(w.balance, w.currency || "EUR")}` : ""}`}
                        active={selectedWallet?.id === w.id}
                        onPress={() => setSelectedWallet(w)}
                      />
                    ))}
                  </ScrollView>
                )}
              </View>
            ) : null}

            {/* ASSETS */}
            {mode === "swap" ? (
              <>
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 8 }}>Activo venta</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {assets.map((a) => (
                      <Chip
                        key={a.id}
                        label={assetLabel(a)}
                        icon={iconForType(a.type)}
                        active={fromAsset?.id === a.id}
                        onPress={() => { setFromAsset(a); if (toAsset?.id === a.id) setToAsset(null); }}
                      />
                    ))}
                  </ScrollView>
                </View>

                <View style={{ marginBottom: 24 }}>
                  <Text style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 8 }}>Activo compra</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {assets.map((a) => (
                      <Chip
                        key={a.id}
                        label={assetLabel(a)}
                        icon={iconForType(a.type)}
                        active={toAsset?.id === a.id}
                        disabled={fromAsset?.id === a.id}
                        onPress={() => { if (fromAsset?.id !== a.id) setToAsset(a); }}
                      />
                    ))}
                  </ScrollView>
                </View>
              </>
            ) : (
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 8 }}>Activo</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {assets.map((a) => (
                    <Chip
                      key={a.id}
                      label={assetLabel(a)}
                      icon={iconForType(a.type)}
                      active={selectedAsset?.id === a.id}
                      onPress={() => setSelectedAsset(a)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* PARTICIPACIONES */}
            {mode === "swap" ? (
              <>
                <FieldRow
                  label="Participaciones vendidas (opcional)"
                  value={quantityOut}
                  onChange={setQuantityOut}
                  placeholder="0,0000"
                  icon="arrow-up-outline"
                />
                <FieldRow
                  label="Participaciones compradas (opcional)"
                  value={quantityIn}
                  onChange={setQuantityIn}
                  placeholder="0,0000"
                  icon="arrow-down-outline"
                />
              </>
            ) : (
              <FieldRow
                label="Participaciones (opcional)"
                value={quantity}
                onChange={setQuantity}
                placeholder="0,0000"
                icon="calculator-outline"
              />
            )}

            {/* FEE */}
            <FieldRow
              label="Comisión (opcional)"
              value={fee}
              onChange={setFee}
              placeholder="0,00"
              icon="pricetag-outline"
              right="€"
            />

            {/* NOTA */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 8 }}>Descripción</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Añadir nota"
                placeholderTextColor="#d1d5db"
                multiline
                style={{ fontSize: 15, color: "#111827", borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingBottom: 8 }}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
