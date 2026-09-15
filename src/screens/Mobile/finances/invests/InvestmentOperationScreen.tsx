// src/screens/Investments/InvestmentOperationScreen.tsx
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import api from "../../../../api/api";
import { colors } from "../../../../theme/theme";
import ModalHeader from "../../../../components/ModalHeader";
import WalletIcon from "../../../../components/WalletIcon";
import NumericCalculatorKeyboard from "../../../../components/NumericCalculatorKeyboard";
import { markInvestmentsDirty } from "../../../../utils/investmentsInvalidation";
import CrossPlatformDateTimePicker from "../../../../components/CrossPlatformDateTimePicker";
import { formatEuro } from "../../../../utils/currency";
import { getCryptoLogoUrl } from "../../../../constants/bankPresets";
import { FormTextField } from "../../../../components/creation";

type OperationMode = "buy" | "sell" | "swap";
type InvestmentAssetType = "crypto" | "etf" | "stock" | "fund" | "custom" | "cash";

type InvestmentAssetLite = {
  id: number;
  name: string;
  abbreviation?: string | null;
  identificator?: string | null;
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

const OP_COLORS: Record<OperationMode, string> = {
  buy: "#16A34A",
  sell: "#DC2626",
  swap: "#2563EB",
};

const OP_LABEL_ES: Record<OperationMode, string> = {
  buy: "compra",
  sell: "venta",
  swap: "traspaso",
};

const sectionLabelStyle = {
  fontSize: 12,
  fontWeight: "700" as const,
  color: "#64748B",
  marginBottom: 5,
};

function RequiredLabel({ text }: { text: string }) {
  return (
    <Text style={sectionLabelStyle}>
      {text}
      <Text style={{ color: colors.error }}> *</Text>
    </Text>
  );
}

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
  if (currency === "EUR") return `${formatEuro(v)} €`;
  try {
    return v.toLocaleString("es-ES", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch {
    return `${v.toFixed(2)} ${currency}`;
  }
}

const assetLabel = (a: InvestmentAssetLite) => a.abbreviation?.trim() || a.name;

const assetTypeLabel = (t: InvestmentAssetType) => {
  switch (t) {
    case "crypto": return "Crypto";
    case "stock":  return "Acción";
    case "etf":    return "ETF";
    case "fund":   return "Fondo";
    default:       return "Otro";
  }
};

const iconForType = (t: InvestmentAssetType): keyof typeof Ionicons.glyphMap => {
  switch (t) {
    case "crypto": return "logo-bitcoin";
    case "stock":  return "trending-up";
    case "etf":    return "layers";
    case "fund":   return "pie-chart";
    default:       return "briefcase";
  }
};

// Logo real para crypto (si el símbolo tiene icono conocido); icono de
// respaldo por tipo de activo en cualquier otro caso.
function AssetIcon({ asset, size = 16, color }: { asset: InvestmentAssetLite; size?: number; color: string }) {
  const symbol = asset.identificator?.trim().toLowerCase();
  const [failed, setFailed] = useState(false);

  if (asset.type === "crypto" && symbol && !failed) {
    return (
      <Image
        source={{ uri: getCryptoLogoUrl(symbol) }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        onError={() => setFailed(true)}
      />
    );
  }

  return <Ionicons name={iconForType(asset.type)} size={size} color={color} />;
}

// ── Tarjeta de selección (cartera / activo) — logo/icono + texto, compacta ──
function OptionCard({
  icon,
  label,
  subLabel,
  selected,
  disabled,
  onPress,
}: {
  icon?: React.ReactNode;
  label: string;
  subLabel?: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={{
        minWidth: 84,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: selected ? colors.primary : "#E2E8F0",
        backgroundColor: selected ? "#EEF3FF" : "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 8,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {icon ? <View style={{ marginBottom: 4 }}>{icon}</View> : null}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={{ fontSize: 12.5, fontWeight: "700", color: selected ? colors.primary : "#475569", textAlign: "center" }}
      >
        {label}
      </Text>
      {subLabel != null && (
        <Text numberOfLines={1} style={{ fontSize: 10.5, fontWeight: "600", color: "#94A3B8", marginTop: 2 }}>
          {subLabel}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────
export default function InvestmentOperationScreen({ navigation, route }: any) {
  const defaultAssetId: number | undefined = route?.params?.assetId;
  // editData: operation passed from InvestmentDetailScreen for editing
  const editData: any | undefined = route?.params?.operationData;
  const isEditing = !!editData;
  const isSwapEdit = isEditing && !!editData?.swapGroupId;

  const saveBarHeight = 74;
  const scrollRef = useRef<ScrollView>(null);

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
  const [calcVisible, setCalcVisible] = useState(false);
  const [calcExpression, setCalcExpression] = useState("");
  const [fee,         setFee]         = useState("");
  const [description, setDescription] = useState("");
  const [date,        setDate]        = useState<Date>(new Date());
  const [showDate,    setShowDate]    = useState(false);

  const [quantity,    setQuantity]    = useState("");
  const [quantityOut, setQuantityOut] = useState("");
  const [quantityIn,  setQuantityIn]  = useState("");

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

  const fmtDecimal = (n: any) => {
    const v = Number(n);
    if (!Number.isFinite(v) || v === 0) return "";
    return v.toString().replace(".", ",");
  };

  const prefillFromEdit = useCallback((assetList: InvestmentAssetLite[], walletList: WalletLite[]) => {
    if (!editData) return;
    const opType = String(editData.type ?? "buy");
    const isSwap = !!editData.swapGroupId;

    // Date
    const opDate = editData.date ? new Date(editData.date) : new Date();
    setDate(Number.isFinite(opDate.getTime()) ? opDate : new Date());

    if (isSwap) {
      setMode("swap");
      const fromA = assetList.find((a) => a.id === editData.assetId) || null;
      setFromAsset(fromA);
      setToAsset(null);
      setSelectedWallet(null);
      setAmount(fmtDecimal(Math.abs(Number(editData.amount || 0))));
      setFee(fmtDecimal(editData.fee));
      setQuantityOut(fmtDecimal(editData.quantity));
      setQuantityIn("");
      setQuantity("");
    } else {
      const newMode: OperationMode = opType === "sell" || opType === "transfer_out" ? "sell" : "buy";
      setMode(newMode);
      const asset = assetList.find((a) => a.id === editData.assetId) || null;
      setSelectedAsset(asset);
      setFromAsset(null);
      setToAsset(null);

      const walletId = newMode === "buy"
        ? editData.transaction?.fromWalletId
        : editData.transaction?.toWalletId;
      const wallet = walletId ? walletList.find((w) => w.id === walletId) || null : walletList[0] || null;
      setSelectedWallet(wallet);

      setAmount(fmtDecimal(Math.abs(Number(editData.amount || 0))));
      setFee(fmtDecimal(editData.fee));
      setQuantity(fmtDecimal(editData.quantity));
      setQuantityOut("");
      setQuantityIn("");
    }
    setDescription(editData.description ?? "");
  }, [editData]);

  const resetForm = useCallback((assetList: InvestmentAssetLite[], walletList: WalletLite[]) => {
    if (isEditing) {
      prefillFromEdit(assetList, walletList);
      return;
    }
    setMode("buy");
    const def   = defaultAssetId ? assetList.find((a) => a.id === defaultAssetId) || null : null;
    const first = def || assetList[0] || null;
    setSelectedAsset(first);
    setFromAsset(first);
    setToAsset(null);
    setSelectedWallet(walletList[0] || null);
    setAmount(""); setFee(""); setDescription("");
    setQuantity(""); setQuantityOut(""); setQuantityIn("");
  }, [defaultAssetId, isEditing, prefillFromEdit]);

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
      const dateIso = date.toISOString();
      const desc    = description.trim() || undefined;
      const feeN    = fee.trim() ? parseAmount(fee) : 0;
      const amtN    = parseAmount(amount);

      if (mode === "swap") {
        const qOutN = quantityOut.trim() ? parseQty(quantityOut) : undefined;
        const qInN  = quantityIn.trim()  ? parseQty(quantityIn)  : undefined;
        const body = {
          fromAssetId: fromAsset!.id, toAssetId: toAsset!.id,
          amountOut: amtN, amountIn: amtN,
          fee: feeN || 0, date: dateIso, description: desc,
          ...(qOutN !== undefined ? { quantityOut: qOutN } : {}),
          ...(qInN  !== undefined ? { quantityIn:  qInN  } : {}),
        };
        if (isSwapEdit) {
          await api.patch(`/investments/swaps/${editData.swapGroupId}`, body);
        } else {
          await api.post("/investments/swap", body);
        }
      } else {
        const qtyN = quantity.trim() ? parseQty(quantity) : undefined;
        const base = { amount: amtN, fee: feeN || 0, date: dateIso, description: desc,
                       ...(qtyN !== undefined ? { quantity: qtyN } : {}) };
        if (isEditing && !isSwapEdit) {
          await api.patch(`/investments/operations/${editData.id}`, {
            ...base,
            fromWalletId: mode === "buy"  ? selectedWallet!.id : undefined,
            toWalletId:   mode === "sell" ? selectedWallet!.id : undefined,
          });
        } else if (mode === "buy") {
          await api.post(`/investments/${selectedAsset!.id}/buy`,  { ...base, fromWalletId: selectedWallet!.id });
        } else {
          await api.post(`/investments/${selectedAsset!.id}/sell`, { ...base, toWalletId: selectedWallet!.id });
        }
      }

      markInvestmentsDirty();
      navigation.goBack();
    } catch (e: any) {
      console.error("InvestmentOperationScreen submit:", e?.response?.data || e);
    } finally {
      setSaving(false);
    }
  }, [amount, canSave, description, editData, fee, fromAsset, isEditing, isSwapEdit, mode, navigation, quantity, quantityIn, quantityOut, selectedAsset, selectedWallet, toAsset]);

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
  const walletLabel = mode === "buy" ? "Cartera origen" : "Cartera destino";

  const openCalc = () => {
    Keyboard.dismiss();
    setCalcVisible(true);
  };

  const closeCalc = () => {
    setCalcVisible(false);
    setCalcExpression("");
  };

  const saveLabel = `${isEditing ? "Actualizar" : "Guardar"} ${OP_LABEL_ES[mode]}`;

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* HEADER */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
        <ModalHeader
          title={isEditing ? "Editar operación" : "Añadir operación"}
          onClose={() => navigation.goBack()}
          closeLabel="Cancelar"
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: (calcVisible ? 310 : 20) + saveBarHeight,
              paddingHorizontal: 20,
            }}
          >
            {/* TABS */}
            <View
              style={{
                flexDirection: "row",
                backgroundColor: "#F3F4F6",
                borderRadius: 14,
                padding: 3,
                marginTop: 14,
                marginBottom: 14,
              }}
            >
              {([
                { label: "Comprar",    value: "buy"  },
                { label: "Vender",     value: "sell" },
                { label: "Transferir", value: "swap" },
              ] as const).map((tab) => {
                const active = mode === tab.value;
                return (
                  <TouchableOpacity
                    key={tab.value}
                    onPress={() => !isEditing && onChangeMode(tab.value)}
                    activeOpacity={isEditing ? 1 : 0.8}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: active ? "#FFFFFF" : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                      shadowColor: active ? "#0F172A" : "transparent",
                      shadowOpacity: active ? 0.08 : 0,
                      shadowRadius: 4,
                      shadowOffset: { width: 0, height: 1 },
                      elevation: active ? 1 : 0,
                      opacity: isEditing && !active ? 0.35 : 1,
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: "700", color: active ? OP_COLORS[tab.value] : "#9CA3AF" }}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* IMPORTE */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={openCalc}
              style={{ alignItems: "center", marginBottom: 26, marginTop: 6 }}
            >
              {mode === "swap" && (
                <Text style={{ fontSize: 12, color: "#94A3B8", fontWeight: "600", marginBottom: 4 }}>
                  Importe (venta = compra)
                </Text>
              )}
              {!!calcExpression && (
                <Text style={{ fontSize: 13, color: "#94A3B8", fontWeight: "600", marginBottom: 2 }}>
                  {calcExpression}
                </Text>
              )}
              <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "center" }}>
                <Text
                  style={{
                    fontSize: 46,
                    fontWeight: "700",
                    color: amount ? "#0F172A" : "#D1D5DB",
                    letterSpacing: -1,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {amount || "0,00"}
                </Text>
                <FontAwesome5
                  name="euro-sign"
                  size={22}
                  color="#94A3B8"
                  style={{ marginLeft: 6, marginBottom: 7 }}
                />
              </View>
            </TouchableOpacity>

            {/* WALLET */}
            {mode !== "swap" ? (
              <>
                <RequiredLabel text={walletLabel} />
                {walletError ? (
                  <Text style={{ fontSize: 13, color: "#b45309", marginBottom: 14 }}>{walletError}</Text>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingRight: 12 }}
                    style={{ marginBottom: 14 }}
                  >
                    {wallets.map((w) => (
                      <OptionCard
                        key={w.id}
                        icon={<WalletIcon emoji={w.emoji} size={18} />}
                        label={w.name}
                        subLabel={w.balance != null ? formatMoney(w.balance, w.currency || "EUR") : undefined}
                        selected={selectedWallet?.id === w.id}
                        onPress={() => setSelectedWallet(w)}
                      />
                    ))}
                  </ScrollView>
                )}
              </>
            ) : null}

            {/* ASSETS */}
            {mode === "swap" ? (
              <>
                <RequiredLabel text="Activo venta" />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: 12 }}
                  style={{ marginBottom: 14 }}
                >
                  {assets.map((a) => (
                    <OptionCard
                      key={a.id}
                      icon={<AssetIcon asset={a} color={fromAsset?.id === a.id ? colors.primary : "#64748B"} />}
                      label={assetLabel(a)}
                      subLabel={assetTypeLabel(a.type)}
                      selected={fromAsset?.id === a.id}
                      onPress={() => { setFromAsset(a); if (toAsset?.id === a.id) setToAsset(null); }}
                    />
                  ))}
                </ScrollView>

                <RequiredLabel text="Activo compra" />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: 12 }}
                  style={{ marginBottom: 14 }}
                >
                  {assets.map((a) => (
                    <OptionCard
                      key={a.id}
                      icon={<AssetIcon asset={a} color={toAsset?.id === a.id ? colors.primary : "#64748B"} />}
                      label={assetLabel(a)}
                      subLabel={assetTypeLabel(a.type)}
                      selected={toAsset?.id === a.id}
                      disabled={fromAsset?.id === a.id}
                      onPress={() => { if (fromAsset?.id !== a.id) setToAsset(a); }}
                    />
                  ))}
                </ScrollView>
              </>
            ) : (
              <>
                <RequiredLabel text="Activo" />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: 12 }}
                  style={{ marginBottom: 14 }}
                >
                  {assets.map((a) => (
                    <OptionCard
                      key={a.id}
                      icon={<AssetIcon asset={a} color={selectedAsset?.id === a.id ? colors.primary : "#64748B"} />}
                      label={assetLabel(a)}
                      subLabel={assetTypeLabel(a.type)}
                      selected={selectedAsset?.id === a.id}
                      onPress={() => setSelectedAsset(a)}
                    />
                  ))}
                </ScrollView>
              </>
            )}

            {/* PARTICIPACIONES */}
            {mode === "swap" ? (
              <View style={{ gap: 14, marginBottom: 14 }}>
                <FormTextField
                  label="Participaciones vendidas"
                  value={quantityOut}
                  onChangeText={(t) => setQuantityOut(t.replace(".", ","))}
                  inputMode="decimal"
                  onFocus={closeCalc}
                  returnKeyType="done"
                />
                <FormTextField
                  label="Participaciones compradas"
                  value={quantityIn}
                  onChangeText={(t) => setQuantityIn(t.replace(".", ","))}
                  inputMode="decimal"
                  onFocus={closeCalc}
                  returnKeyType="done"
                />
              </View>
            ) : (
              <View style={{ marginBottom: 14 }}>
                <FormTextField
                  label="Participaciones"
                  value={quantity}
                  onChangeText={(t) => setQuantity(t.replace(".", ","))}
                  inputMode="decimal"
                  onFocus={closeCalc}
                  returnKeyType="done"
                />
              </View>
            )}

            {/* COMISIÓN */}
            <View style={{ marginBottom: 14 }}>
              <FormTextField
                label="Comisión"
                value={fee}
                onChangeText={(t) => setFee(t.replace(".", ","))}
                inputMode="decimal"
                suffix="€"
                onFocus={closeCalc}
                returnKeyType="done"
              />
            </View>

            {/* DESCRIPCIÓN */}
            <View style={{ marginBottom: 14 }}>
              <FormTextField
                label="Descripción"
                value={description}
                onChangeText={setDescription}
                onFocus={closeCalc}
                returnKeyType="done"
              />
            </View>

            {/* FECHA */}
            <Text style={sectionLabelStyle}>Fecha y hora</Text>
            <TouchableOpacity
              onPress={() => { closeCalc(); setShowDate(true); }}
              activeOpacity={0.85}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 14,
                paddingVertical: 10,
                paddingHorizontal: 14,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="calendar-outline" size={16} color="#64748B" />
                <Text style={{ fontSize: 14, color: "#0F172A", fontWeight: "500" }}>
                  {date.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                  , {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
            </TouchableOpacity>
            <CrossPlatformDateTimePicker
              isVisible={showDate}
              mode="datetime"
              date={date}
              onConfirm={(d) => { setShowDate(false); setDate(d); }}
              onCancel={() => setShowDate(false)}
            />
          </ScrollView>

          {/* BOTÓN GUARDAR — fijo al fondo */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 8,
              paddingBottom: calcVisible ? 8 : 14,
              backgroundColor: "#FFFFFF",
              borderTopWidth: 1,
              borderTopColor: "#F1F5F9",
            }}
          >
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!canSave || saving}
              activeOpacity={0.85}
              style={{
                height: 54,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: canSave ? colors.primary : "#E5E7EB",
              }}
            >
              {saving ? (
                <ActivityIndicator color={canSave ? "#FFFFFF" : "#94A3B8"} />
              ) : (
                <Text style={{ fontSize: 16, fontWeight: "700", color: canSave ? "#FFFFFF" : "#94A3B8" }}>
                  {saveLabel}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <NumericCalculatorKeyboard
            visible={calcVisible}
            value={amount}
            onChangeValue={setAmount}
            onExpressionChange={setCalcExpression}
            showExpressionInHeader={false}
            onDone={closeCalc}
            variant="calculator"
          />
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
