// src/screens/Transactions/AddScreen.tsx
import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { colors } from "../../../theme/theme";
import ModalHeader from "../../../components/ModalHeader";
import api from "../../../api/api";
import { formatEuro } from "../../../utils/currency";
import { ViewStyle, TextStyle } from "react-native";
import EditCategoryModal from "../../../components/EditCategoryModal";
import CrossPlatformDateTimePicker from "../../../components/CrossPlatformDateTimePicker";
import { appAlert } from "../../../utils/appAlert";
import { markTransactionsDirty } from "../../../utils/transactionsInvalidation";
import { matchWalletByCard } from "../../../utils/quickAdd";
import NumericCalculatorKeyboard from "../../../components/NumericCalculatorKeyboard";
import RecurringScopeModal, { RecurringScope } from "../../../components/RecurringScopeModal";
import WalletIcon from "../../../components/WalletIcon";
import { FormTextField } from "../../../components/creation";

// Mismas categorías que la pestaña "Gastos" de un viaje (TripExpensesSection).
const TRIP_EXPENSE_CATEGORIES = [
  { value: "transport_local", label: "Transporte", emoji: "🚗" },
  { value: "food", label: "Comida", emoji: "🍽️" },
  { value: "activities", label: "Actividades", emoji: "🎟️" },
  { value: "shopping", label: "Compras", emoji: "🛍️" },
  { value: "leisure", label: "Ocio", emoji: "🎉" },
  { value: "accommodation", label: "Alojamiento", emoji: "🏨" },
  { value: "other", label: "Otro", emoji: "···" },
];

const TYPE_COLORS: Record<string, string> = {
  expense: "#DC2626",
  income: "#16A34A",
  transfer: "#2563EB",
};

const TYPE_LABEL_ES: Record<string, string> = {
  expense: "gasto",
  income: "ingreso",
  transfer: "traspaso",
};

function formatBalance(n: number) {
  const value = typeof n === "number" && isFinite(n) ? n : 0;
  return `${formatEuro(Math.round(value)).replace(/,00$/, "")} €`;
}

//---------------------------------------
// Tarjeta de selección (cartera / categoría)
//---------------------------------------
function SelectCard({
  emoji,
  label,
  subLabel,
  selected,
  disabled,
  onPress,
}: {
  emoji?: string;
  label: string;
  subLabel?: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
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
      <View style={{ marginBottom: 4 }}>
        <WalletIcon emoji={emoji} size={18} />
      </View>
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

//---------------------------------------
// Tarjeta "crear nuevo" (categoría / subcategoría / inversión)
//---------------------------------------
function CreateCard({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        minWidth: 84,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 12,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 8,
      }}
    >
      <Ionicons name="add" size={16} color={colors.primary} />
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={{ fontSize: 12.5, fontWeight: "700", color: colors.primary, marginTop: 2, textAlign: "center" }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function AddScreen({ navigation }: any) {
  const route = useRoute();
  const queryClient = useQueryClient();
  const editData = (route.params as any)?.editData || null;
  const prefillData = (route.params as any)?.prefillData || null;
  const isEditing = !!(editData && editData.id != null);
  const sourceData = editData ?? prefillData;
  // La bottom tab bar se oculta mientras esta pantalla está abierta (ver
  // BottomTab.tsx), así que no hay que reservarle espacio: el SafeAreaView
  // ya cubre el safe-area inferior por su cuenta.
  // Alto aproximado de la barra de "Guardar" fija al fondo (botón + paddings)
  const saveBarHeight = 74;

  // ✅ si vienes desde InvestmentDetail para añadir aportación
  const prefillInvestmentAssetId = (route.params as any)?.prefillInvestmentAssetId ?? null;

  const scrollRef = useRef<ScrollView>(null);

  const [type, setType] = useState<"expense" | "income" | "transfer">("expense");
  const [wallets, setWallets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // ✅ investments
  const [investmentAssets, setInvestmentAssets] = useState<any[]>([]);
  const [selectedInvestmentAsset, setSelectedInvestmentAsset] = useState<any>(null);

  const [selectedWallet, setSelectedWallet] = useState<any>(null);
  const [selectedWalletFrom, setSelectedWalletFrom] = useState<any>(null);
  const [selectedWalletTo, setSelectedWalletTo] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [tripExpenseCategory, setTripExpenseCategory] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [calcVisible, setCalcVisible] = useState(false);
  const [calcExpression, setCalcExpression] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  // Solo en web: activo el input real de fecha, para oscurecer el fondo
  // mientras el picker nativo del navegador está abierto.
  const [dateFieldFocused, setDateFieldFocused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState("never");
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [modalEditingItem, setModalEditingItem] = useState<any>(null);
  const [updateScopeModalVisible, setUpdateScopeModalVisible] = useState(false);

  //---------------------------------------
  // Estilos de chips
  //---------------------------------------
  const chipBase: ViewStyle = {
    minHeight: 26,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  };

  const chipText: TextStyle = {
    fontSize: 13,
  };

  const sectionLabelStyle: TextStyle = {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 6,
  };

  const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const toAmountText = (n: number) => round2(n).toFixed(2).replace(".", ",");
  // Formato "YYYY-MM-DDTHH:mm" en hora local, el que exige value= de un
  // <input type="datetime-local">.
  const toDateTimeLocalValue = (d: Date) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const blueSelected = {
    backgroundColor: "#EFF6FF",
    borderColor: "#93C5FD",
  };

  //---------------------------------------
  // Scroll a zona exacta cuando se abre teclado
  //---------------------------------------
  const scrollToInput = (y: number) => {
    scrollRef.current?.scrollTo({ y, animated: true });
  };

  const handleCategoryModalSave = async (savedItem: any) => {
    if (savedItem?.isSub) {
      const res = await api.get(`/categories/${savedItem.categoryId}`);

      setSelectedCategory(res.data);

      const newSub = res.data.subcategories.find((s: any) => s.id === savedItem.id);
      if (newSub) setSelectedSub(newSub);
    }

    await fetchData();
    setCategoryModalVisible(false);
  };

  //---------------------------------------
  // Cargar datos
  //---------------------------------------
  const fetchData = async () => {
    try {
      setLoading(true);

      const [walletRes, catRes, invRes] = await Promise.all([
        api.get("/wallets"),
        api.get("/categories"),
        api.get("/investments/assets"),
      ]);

      setWallets(walletRes.data || []);
      setCategories(catRes.data || []);
      setInvestmentAssets(invRes.data || []);
    } catch (error) {
      console.error("ERROR:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  //---------------------------------------
  // Selección automática de carteras
  //---------------------------------------
  useEffect(() => {
    if (isEditing || prefillData) return;
    if (wallets.length === 0) return;

    // Las carteras de inversión no son un origen válido: solo pueden ser
    // destino de un traspaso (aportación a una inversión).
    const nonInvestmentWallets = wallets.filter((w) => w.kind !== "investment");

    if (type === "transfer") {
      const firstFrom = nonInvestmentWallets[0] || null;
      if (!selectedWalletFrom || selectedWalletFrom.id !== firstFrom?.id) {
        setSelectedWalletFrom(firstFrom);
      }

      const firstTo = wallets.find((w) => w.id !== firstFrom?.id) || null;
      if (!selectedWalletTo || selectedWalletTo.id !== firstTo?.id) {
        setSelectedWalletTo(firstTo);
      }
    } else {
      const first = nonInvestmentWallets[0] || null;
      if (!selectedWallet || selectedWallet.id !== first?.id) {
        setSelectedWallet(first);
      }
    }
  }, [wallets, type, isEditing, prefillData]);

  //---------------------------------------
  // Auto-selección de asset cuando TO es wallet inversión
  //---------------------------------------
  useEffect(() => {
    if (isEditing || prefillData) return;
    if (type !== "transfer") return;

    const toIsInvestment = selectedWalletTo?.kind === "investment";
    if (!toIsInvestment) {
      setSelectedInvestmentAsset(null);
      return;
    }

    // 1) si vienes desde InvestmentDetail con prefill
    if (prefillInvestmentAssetId && investmentAssets.length) {
      const found = investmentAssets.find((a) => a.id === prefillInvestmentAssetId);
      if (found) {
        setSelectedInvestmentAsset(found);
        return;
      }
    }

    // 2) default: primer asset
    if (!selectedInvestmentAsset && investmentAssets.length) {
      setSelectedInvestmentAsset(investmentAssets[0]);
    }
  }, [
    type,
    selectedWalletTo,
    investmentAssets,
    prefillInvestmentAssetId,
    isEditing,
    prefillData,
    selectedInvestmentAsset,
  ]);

  //---------------------------------------
  // Resetear pantalla al entrar
  //---------------------------------------
  useFocusEffect(
    useCallback(() => {
      if (!isEditing && !prefillData) {
        setType("expense");
        setSelectedWallet(null);
        setSelectedWalletFrom(null);
        setSelectedWalletTo(null);
        setSelectedCategory(null);
        setSelectedSub(null);
        setTripExpenseCategory(null);
        setSelectedInvestmentAsset(null);
        setAmount("");
        setDescription("");
        setDate(new Date());
        setRecurrenceInterval("never");
        setIsRecurring(false);
      }
    }, [isEditing, prefillData])
  );

  //---------------------------------------
  // Rellenar datos si venimos en modo edición
  //---------------------------------------
  useEffect(() => {
    if (!sourceData || wallets.length === 0 || categories.length === 0) return;

    setType(sourceData.type);

    // --------- WALLET ----------
    if (sourceData.type === "transfer") {
      const from = wallets.find((w) => w.id === sourceData.fromWalletId) || null;
      const to = wallets.find((w) => w.id === sourceData.toWalletId) || null;

      setSelectedWalletFrom(from);
      setSelectedWalletTo(to);

      // ✅ asset si era aportación a inversión
      if (sourceData.investmentAssetId && investmentAssets.length > 0) {
        const inv =
          investmentAssets.find((a) => a.id === sourceData.investmentAssetId) || null;
        setSelectedInvestmentAsset(inv);
      } else {
        setSelectedInvestmentAsset(null);
      }
    } else {
      let wallet = wallets.find((w: any) => w.id === sourceData.walletId) || null;
      if (!wallet && sourceData.cardName) {
        const matchedId = matchWalletByCard(sourceData.cardName, wallets);
        wallet = wallets.find((w: any) => w.id === matchedId) ?? wallets[0] ?? null;
      }
      setSelectedWallet(wallet || wallets[0] || null);
      setSelectedInvestmentAsset(null);
    }

    // --------- CATEGORY ----------
    const cat = categories.find((c) => c.id === sourceData.categoryId) || null;
    setSelectedCategory(cat);

    // --------- SUBCATEGORY ----------
    if (cat && Array.isArray(cat.subcategories)) {
      const sub = cat.subcategories.find((s: any) => s.id === sourceData.subcategoryId) || null;
      setSelectedSub(sub);

      const linkedPlanItem =
        sourceData.planItems?.find((item: any) => item?.transactionId === sourceData.id) ??
        sourceData.planItems?.[0];
      const savedTripExpenseCategory =
        sourceData.tripExpenseCategory !== undefined
          ? sourceData.tripExpenseCategory
          : linkedPlanItem?.metadata?.pending
            ? null
            : linkedPlanItem?.metadata?.expenseCategory ?? null;
      setTripExpenseCategory(sub?.tripId ? savedTripExpenseCategory : null);
    } else {
      setSelectedSub(null);
      setTripExpenseCategory(null);
    }

    // --------- CAMPOS BÁSICOS ----------
    setAmount(
      typeof sourceData.amount === "number"
        ? toAmountText(sourceData.amount)
        : ""
    );

    setDescription(sourceData.description || "");
    setDate(sourceData.date ? new Date(sourceData.date) : new Date());

    // --------- RECURRENCIA ----------
    if (sourceData.isRecurring && sourceData.recurrence) {
      setRecurrenceInterval(sourceData.recurrence);
      setIsRecurring(true);
    } else {
      setRecurrenceInterval("never");
      setIsRecurring(false);
    }
  }, [sourceData, wallets, categories, investmentAssets]);

  //---------------------------------------
  // Lógica filtrado categorías
  //---------------------------------------
  const filteredCategories = categories.filter((c) => c.type === type);
  const subcategories = (selectedCategory?.subcategories || [])
    .filter((s: any) => s.active !== false)
    .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0));

  //---------------------------------------
  // Helper: ¿esta transacción pertenece a una serie recurrente?
  //---------------------------------------
  const isPartOfSeries = !!(isEditing && editData && (editData.isRecurring || editData.parentId));

  //---------------------------------------
  // ¿Se puede guardar ya? (misma validación que handleSubmit, para
  // habilitar/deshabilitar el botón fijo del fondo)
  //---------------------------------------
  const hasValidAmount = !!amount && !isNaN(Number(amount.replace(",", ".")));
  const canSave =
    type === "transfer"
      ? !!selectedWalletFrom &&
        !!selectedWalletTo &&
        selectedWalletFrom.id !== selectedWalletTo.id &&
        (selectedWalletTo?.kind !== "investment" || !!selectedInvestmentAsset) &&
        hasValidAmount
      : !!selectedWallet && !!selectedCategory && hasValidAmount;

  const saveLabel = `${isEditing ? "Actualizar" : "Guardar"} ${TYPE_LABEL_ES[type]}`;

  //---------------------------------------
  // Guardar (con scope para recurrentes en edición)
  //---------------------------------------
  const handleSubmit = async (scope: RecurringScope = "single") => {
    if (type === "transfer") {
      if (!selectedWalletFrom || !selectedWalletTo)
        return appAlert("Error", "Selecciona ambas carteras");

      if (selectedWalletFrom.id === selectedWalletTo.id)
        return appAlert("Error", "Las carteras deben ser diferentes");

      // ✅ si destino es wallet inversión, exige asset
      if (selectedWalletTo?.kind === "investment" && !selectedInvestmentAsset) {
        return appAlert("Error", "Selecciona la inversión (BTC, Robo, etc.)");
      }
    } else if (!selectedWallet) {
      return appAlert("Error", "Selecciona una cartera");
    }

    if (type !== "transfer" && !selectedCategory)
      return appAlert("Error", "Selecciona una categoría");

    if (!amount || isNaN(Number(amount.replace(",", "."))))
      return appAlert("Error", "Introduce una cantidad válida");

    const payload: any = {
      type,
      amount: parseFloat(amount.replace(",", ".")),
      description,
      date: date.toISOString(),
    };

    if (type === "transfer") {
      payload.fromWalletId = selectedWalletFrom.id;
      payload.toWalletId = selectedWalletTo.id;

      // ✅ inversión: manda investmentAssetId solo si toWallet.kind === investment
      if (selectedWalletTo?.kind === "investment") {
        payload.investmentAssetId = selectedInvestmentAsset?.id;
      } else {
        payload.investmentAssetId = null;
      }
    } else {
      payload.walletId = selectedWallet.id;
      payload.categoryId = selectedCategory?.id || null;
      payload.subcategoryId = selectedSub?.id || null;

      if (selectedSub?.tripId) {
        payload.tripExpenseCategory = tripExpenseCategory;
      }
    }

    const resolvesQuickAdd = !isEditing && !!prefillData?.quickAddId;
    if (resolvesQuickAdd) {
      payload.quickAddId = prefillData.quickAddId;
    }

    // Recurrencia
    if (recurrenceInterval !== "never") {
      payload.isRecurring = true;
      payload.recurrence = recurrenceInterval;
    } else {
      payload.isRecurring = false;
      payload.recurrence = null;
    }

    try {
      setSaving(true);
      if (isEditing) {
        await api.patch(`/transactions/${editData.id}`, payload, {
          params: { scope },
        });
      } else {
        await api.post("/transactions", payload);
      }
      markTransactionsDirty();
      if (resolvesQuickAdd) {
        queryClient.invalidateQueries({ queryKey: ["notificationsFeed"] });
      }
      navigation.goBack();
    } catch (error) {
      appAlert("Error", "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const onPressSave = () => {
    if (isEditing && isPartOfSeries) {
      setUpdateScopeModalVisible(true);
    } else {
      handleSubmit("single");
    }
  };

  const openCategoryModal = (isSub = false) => {
    setModalEditingItem({
      isSub,
      categoryId: isSub ? selectedCategory?.id : null,
      type,
      color: colors.primary,
      emoji: "💸",
    });
    setCategoryModalVisible(true);
  };

  const openCalc = () => {
    Keyboard.dismiss();
    setCalcVisible(true);
  };

  const closeCalc = () => {
    setCalcVisible(false);
    setCalcExpression("");
  };

  //---------------------------------------
  // UI
  //---------------------------------------
  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* HEADER */}
      <View className="px-5 py-4 border-b border-gray-100">
        <ModalHeader
          title={isEditing ? "Editar transacción" : "Nueva transacción"}
          onClose={() => navigation.goBack()}
          closeLabel="Cancelar"
        />
      </View>

      {/* CONTENIDO */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
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
              {[
                { label: "Gasto", value: "expense" },
                { label: "Ingreso", value: "income" },
                { label: "Traspaso", value: "transfer" },
              ].map((opt) => {
                const active = type === opt.value;

                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      setType(opt.value as any);
                      setSelectedCategory(null);
                      setSelectedSub(null);
                      setSelectedWallet(null);
                      setSelectedWalletFrom(null);
                      setSelectedWalletTo(null);
                      setSelectedInvestmentAsset(null);
                    }}
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
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: active ? TYPE_COLORS[opt.value] : "#9CA3AF",
                      }}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* INPUT CANTIDAD */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={openCalc}
              style={{ alignItems: "center", marginBottom: 26, marginTop: 6 }}
            >
              {!!calcExpression && (
                <Text style={{ fontSize: 13, color: "#94A3B8", fontWeight: "600", marginBottom: 2 }}>
                  {calcExpression}
                </Text>
              )}
              <View className="flex-row items-end justify-center">
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

            {/* CARTERAS */}
            {type === "transfer" ? (
              <>
                <Text style={sectionLabelStyle}>Desde</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-4"
                  contentContainerStyle={{ paddingRight: 12 }}
                >
                  {wallets.map((wallet) => {
                    // Una cartera de inversión no puede ser origen de un traspaso:
                    // retirar de una inversión se hace desde "Vender" en la propia inversión.
                    const isInvestmentWallet = wallet.kind === "investment";

                    return (
                      <SelectCard
                        key={`from-${wallet.id}`}
                        emoji={wallet.emoji}
                        label={wallet.name}
                        subLabel={formatBalance(wallet.balance)}
                        selected={selectedWalletFrom?.id === wallet.id}
                        disabled={isInvestmentWallet}
                        onPress={() => {
                          setSelectedWalletFrom(wallet);
                          if (selectedWalletTo?.id === wallet.id) {
                            const next = wallets.find((w) => w.id !== wallet.id);
                            setSelectedWalletTo(next || null);

                            // si cambia TO por evitar conflicto, limpia asset si ya no es investment
                            if ((next as any)?.kind !== "investment") setSelectedInvestmentAsset(null);
                          }
                        }}
                      />
                    );
                  })}
                </ScrollView>

                <Text style={sectionLabelStyle}>Hacia</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-4"
                  contentContainerStyle={{ paddingRight: 12 }}
                >
                  {wallets.map((wallet) => {
                    const isDisabled = selectedWalletFrom?.id === wallet.id;

                    return (
                      <SelectCard
                        key={`to-${wallet.id}`}
                        emoji={wallet.emoji}
                        label={wallet.name}
                        subLabel={formatBalance(wallet.balance)}
                        selected={selectedWalletTo?.id === wallet.id}
                        disabled={isDisabled}
                        onPress={() => {
                          if (isDisabled) return;
                          setSelectedWalletTo(wallet);

                          // ✅ si deja de ser wallet inversión, limpia asset
                          if (wallet.kind !== "investment") {
                            setSelectedInvestmentAsset(null);
                          }
                        }}
                      />
                    );
                  })}
                </ScrollView>

                {/* ✅ Selector de inversión solo si TO es wallet de inversión */}
                {selectedWalletTo?.kind === "investment" ? (
                  <>
                    <Text style={sectionLabelStyle}>Inversión</Text>

                    {investmentAssets.length === 0 ? (
                      <TouchableOpacity
                        onPress={() => navigation.navigate("InvestmentForm")}
                        className="py-3 px-4 rounded-2xl mb-3"
                        style={{
                          backgroundColor: "#F3F4F6",
                          borderWidth: 1,
                          borderColor: "#E5E7EB",
                        }}
                        activeOpacity={0.9}
                      >
                        <Text className="text-[14px] text-slate-600 font-semibold">
                          No tienes inversiones. Crea una
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-4"
                  contentContainerStyle={{ paddingRight: 12 }}
                >
                        {investmentAssets.map((inv) => {
                          const isSelected = selectedInvestmentAsset?.id === inv.id;
                          return (
                            <TouchableOpacity
                              key={inv.id}
                              onPress={() => setSelectedInvestmentAsset(inv)}
                              style={[
                                chipBase,
                                isSelected ? blueSelected : { borderColor: "#d1d5db" },
                              ]}
                              activeOpacity={0.9}
                            >
                              <Text style={chipText}>
                                📈 {inv.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}

                        <TouchableOpacity
                          onPress={() => navigation.navigate("InvestmentForm")}
                          style={[chipBase, { borderColor: colors.primary }]}
                          activeOpacity={0.9}
                        >
                          <Text style={[chipText, { color: colors.primary, fontWeight: "600" }]}>
                            + Crear inversión
                          </Text>
                        </TouchableOpacity>
                      </ScrollView>
                    )}
                  </>
                ) : null}
              </>
            ) : (
              <>
                <Text style={sectionLabelStyle}>Cartera</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-4"
                  contentContainerStyle={{ paddingRight: 12 }}
                >
                  {wallets.map((wallet) => (
                    <SelectCard
                      key={wallet.id}
                      emoji={wallet.emoji}
                      label={wallet.name}
                      subLabel={formatBalance(wallet.balance)}
                      selected={selectedWallet?.id === wallet.id}
                      disabled={wallet.kind === "investment"}
                      onPress={() => setSelectedWallet(wallet)}
                    />
                  ))}
                </ScrollView>
              </>
            )}

            {/* CATEGORÍA */}
            {type !== "transfer" && (
              <>
                <Text style={sectionLabelStyle}>Categoría</Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-4"
                  contentContainerStyle={{ paddingRight: 12 }}
                >
                  {filteredCategories.map((cat) => (
                    <SelectCard
                      key={cat.id}
                      emoji={cat.emoji}
                      label={cat.name}
                      selected={selectedCategory?.id === cat.id}
                      onPress={() => {
                        setSelectedCategory(cat);
                        setSelectedSub(null);
                        setTripExpenseCategory(null);
                      }}
                    />
                  ))}

                  {/* BOTÓN CREAR CATEGORÍA */}
                  <CreateCard label="Añadir" onPress={() => openCategoryModal(false)} />
                </ScrollView>
              </>
            )}

            {/* SUBCATEGORÍAS */}
            {type !== "transfer" && selectedCategory && (
              <>
                <Text style={sectionLabelStyle}>Subcategoría</Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-4"
                  contentContainerStyle={{ paddingRight: 12 }}
                >
                  {subcategories.length > 0 &&
                    subcategories.map((sub: any) => {
                      const isSelected = selectedSub?.id === sub.id;
                      return (
                        <TouchableOpacity
                          key={sub.id}
                          onPress={() => {
                            if (selectedSub?.id !== sub.id) setTripExpenseCategory(null);
                            setSelectedSub(sub);
                          }}
                          style={[chipBase, isSelected ? blueSelected : { borderColor: "#d1d5db" }]}
                        >
                          <Text style={chipText}>
                            {sub.emoji} {sub.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}

                  <TouchableOpacity
                    onPress={() => openCategoryModal(true)}
                    style={[chipBase, { borderColor: colors.primary }]}
                  >
                    <Text style={[chipText, { color: colors.primary, fontWeight: "600" }]}>
                      + Añadir
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}

            {/* CATEGORÍA DE VIAJE — solo si la subcategoría pertenece a un viaje */}
            {type !== "transfer" && selectedSub?.tripId && (
              <>
                <Text style={sectionLabelStyle}>Categoría de viaje</Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-4"
                  contentContainerStyle={{ paddingRight: 12 }}
                >
                  {TRIP_EXPENSE_CATEGORIES.map((opt) => {
                    const isSelected = tripExpenseCategory === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => setTripExpenseCategory(isSelected ? null : opt.value)}
                        style={[chipBase, isSelected ? blueSelected : { borderColor: "#d1d5db" }]}
                      >
                        <Text style={chipText}>
                          {opt.emoji} {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {/* DESCRIPCIÓN */}
            <View style={{ marginBottom: 10 }}>
              <FormTextField
                label="Descripción"
                value={description}
                onChangeText={setDescription}
                onFocus={closeCalc}
              />
            </View>

            {/* FECHA — fila compacta estilo "settings" de iOS.
                En web ponemos el <input type="datetime-local"> real, invisible,
                exactamente encima de la fila: tocarla es un tap genuino sobre el
                campo nativo, así que el navegador abre su selector propio sin
                trucos de JS ni hojas intermedias nuestras. */}
            <Text style={sectionLabelStyle}>Fecha y hora</Text>
            <View style={{ position: "relative", marginBottom: 14 }}>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
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
                    {date.toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                    })}
                    , {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
              </TouchableOpacity>

              {Platform.OS === "web" && (
                // @ts-ignore
                <input
                  type="datetime-local"
                  value={toDateTimeLocalValue(date)}
                  onChange={(e: any) => {
                    if (!e.target.value) return;
                    setDate(new Date(e.target.value));
                  }}
                  onFocus={() => setDateFieldFocused(true)}
                  onBlur={() => setDateFieldFocused(false)}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: "100%",
                    height: "100%",
                    opacity: 0,
                    border: "none",
                    cursor: "pointer",
                  }}
                />
              )}
            </View>

            {/* Fondo oscurecido mientras el picker nativo de fecha está abierto (web) */}
            {Platform.OS === "web" && dateFieldFocused && (
              // @ts-ignore
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  backgroundColor: "rgba(0,0,0,0.35)",
                  zIndex: 40,
                  pointerEvents: "none",
                }}
              />
            )}

            {Platform.OS !== "web" && (
              <CrossPlatformDateTimePicker
                isVisible={showDatePicker}
                mode="datetime"
                date={date}
                onConfirm={(d) => {
                  setShowDatePicker(false);
                  setDate(d);
                }}
                onCancel={() => setShowDatePicker(false)}
              />
            )}

            {/* PERIODICIDAD */}
            <View>
              <Text style={sectionLabelStyle}>Periodicidad</Text>

              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: "#F3F4F6",
                  borderRadius: 12,
                  padding: 3,
                }}
              >
                {[
                  { label: "Nunca", value: "never" },
                  { label: "Diaria", value: "daily" },
                  { label: "Semanal", value: "weekly" },
                  { label: "Mensual", value: "monthly" },
                  { label: "Anual", value: "yearly" },
                ].map((opt) => {
                  const isSelected = recurrenceInterval === opt.value;

                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => {
                        setRecurrenceInterval(opt.value);
                        setIsRecurring(opt.value !== "never");
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 6,
                        borderRadius: 9,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isSelected ? "#FFFFFF" : "transparent",
                        shadowColor: isSelected ? "#0F172A" : "transparent",
                        shadowOpacity: isSelected ? 0.08 : 0,
                        shadowRadius: 4,
                        shadowOffset: { width: 0, height: 1 },
                        elevation: isSelected ? 1 : 0,
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                        style={{
                          fontSize: 10.5,
                          fontWeight: "700",
                          color: isSelected ? "#0F172A" : "#9CA3AF",
                        }}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <EditCategoryModal
            visible={categoryModalVisible}
            onClose={() => setCategoryModalVisible(false)}
            editingItem={modalEditingItem}
            onSave={handleCategoryModalSave}
          />

          {/* BOTÓN GUARDAR — fijo al fondo (safe area), encima del teclado
              calculadora si está abierto. La bottom tab bar está oculta
              mientras esta pantalla está abierta, así que no compite con
              el botón "+" central. */}
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
              onPress={onPressSave}
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
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: canSave ? "#FFFFFF" : "#94A3B8",
                  }}
                >
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

      <RecurringScopeModal
        visible={updateScopeModalVisible}
        mode="update"
        onClose={() => setUpdateScopeModalVisible(false)}
        onSelect={(scope) => {
          setUpdateScopeModalVisible(false);
          handleSubmit(scope);
        }}
      />
    </SafeAreaView>
  );
}
