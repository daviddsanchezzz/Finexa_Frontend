// src/components/CreateTransactionModal.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Platform,
  Pressable,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { colors } from "../theme/theme";
import api from "../api/api";
import { markTransactionsDirty } from "../utils/transactionsInvalidation";
import { matchWalletByCard } from "../utils/quickAdd";
import EditCategoryModal from "./EditCategoryModal";
import CrossPlatformDateTimePicker from "./CrossPlatformDateTimePicker";
import { isLogoUrl } from "../constants/bankPresets";
import CurrencyPickerModal, { currencySymbol } from "./CurrencyPickerModal";

// Los chips de cartera solo aceptan texto; si el "emoji" es en realidad la
// URL de un logo de banco, se omite en vez de imprimir la URL como texto.
const walletChipLabel = (w: { emoji?: string | null; name: string }) =>
  `${w.emoji && !isLogoUrl(w.emoji) ? w.emoji : "👛"} ${w.name}`;

type TxType = "expense" | "income" | "transfer";
type Recurrence = "never" | "daily" | "weekly" | "monthly" | "yearly";

type Prefill = {
  walletId?: number;
  fromWalletId?: number;
  toWalletId?: number;
  type?: TxType;
  date?: string; // ISO
  assetId?: number;
  amount?: number;
  currency?: string;
  description?: string;
  cardName?: string;
  quickAddId?: string;
  categoryId?: number;
  subcategoryId?: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
  prefill?: Prefill;
  editData?: any | null;
};

type Wallet = { id: number; name: string; emoji?: string; kind?: string };
type Category = {
  id: number;
  name: string;
  emoji?: string;
  type: TxType;
  subcategories?: any[];
};
type InvestmentAsset = { id: number; name: string };

const isWeb = Platform.OS === "web";
const noOutline = isWeb ? ({ outlineStyle: "none" } as any) : {};

const moneyToNumber = (s: string) => {
  const v = (s || "").replace(/\./g, "").replace(",", ".");
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

function formatShortDate(d: Date) {
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
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
    : {
        backgroundColor: "rgba(59,130,246,0.10)",
        borderColor: "rgba(59,130,246,0.55)",
      };

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
        <Ionicons
          name={leftIcon}
          size={16}
          color={active ? (tint?.icon ?? "#0F172A") : "#64748B"}
        />
      ) : null}
      <Text
        style={{
          marginLeft: leftIcon ? 8 : 0,
          fontSize: 12,
          fontWeight: "900",
          color: active ? (tint?.text ?? "#0F172A") : "#475569",
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
        <Text style={{ fontSize: 12, fontWeight: "900", color: "#94A3B8" }}>
          {title}
        </Text>
        {right}
      </View>
      {children}
    </View>
  );
}

// --- helpers date input web
const toDateTimeLocalValue = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
};

const parseDateTimeLocal = (v: string) => {
  // "YYYY-MM-DDTHH:mm" -> local Date (sin líos de UTC)
  if (!v) return null;
  const [datePart, timePart] = v.split("T");
  if (!datePart || !timePart) return null;

  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);

  return isNaN(dt.getTime()) ? null : dt;
};

export default function CreateTransactionModal({
  visible,
  onClose,
  onSaved,
  prefill: initialPrefill,
  editData,
}: Props) {
  const prefill = useMemo<Prefill | undefined>(
    () =>
      editData
        ? {
            type: editData.type,
            amount: Math.abs(Number(editData.amount)),
            currency: editData.currency,
            description: editData.description ?? editData.note ?? "",
            date: editData.date,
            walletId: editData.walletId ?? editData.wallet?.id,
            fromWalletId: editData.fromWalletId ?? editData.fromWallet?.id,
            toWalletId: editData.toWalletId ?? editData.toWallet?.id,
            categoryId: editData.categoryId ?? editData.category?.id,
            subcategoryId: editData.subcategoryId ?? editData.subcategory?.id,
            assetId:
              editData.investmentAssetId ??
              editData.investmentAsset?.id ??
              editData.asset?.id,
          }
        : initialPrefill,
    [editData, initialPrefill],
  );
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState<TxType>("expense");

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [investmentAssets, setInvestmentAssets] = useState<InvestmentAsset[]>(
    [],
  );

  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [selectedWalletFrom, setSelectedWalletFrom] = useState<Wallet | null>(
    null,
  );
  const [selectedWalletTo, setSelectedWalletTo] = useState<Wallet | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [selectedSub, setSelectedSub] = useState<any>(null);

  const [selectedInvestmentAsset, setSelectedInvestmentAsset] =
    useState<InvestmentAsset | null>(null);

  const [amount, setAmount] = useState("");
  // Solo visual por ahora: detectada desde Wallet (?qa=1) o EUR; no se guarda.
  const [currency, setCurrency] = useState<string>("EUR");
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [description, setDescription] = useState("");

  const [date, setDate] = useState<Date>(new Date());
  const [recurrenceInterval, setRecurrenceInterval] =
    useState<Recurrence>("never");

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [modalEditingItem, setModalEditingItem] = useState<any>(null);

  // Date picker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateInputRef = useRef<any>(null);

  const openDatePicker = useCallback(() => {
    if (isWeb) {
      const el = dateInputRef.current as any;
      if (!el) return;
      // algunos navegadores soportan showPicker()
      if (typeof el.showPicker === "function") el.showPicker();
      else {
        el.focus?.();
        el.click?.();
      }
      return;
    }
    setShowDatePicker(true);
  }, []);

  // Búsqueda categorías
  const [categoryQuery, setCategoryQuery] = useState("");
  const [recentIds, setRecentIds] = useState<number[]>([]);

  const tints = useMemo(
    () => ({
      expense: {
        bg: "rgba(239,68,68,0.10)",
        border: "rgba(239,68,68,0.35)",
        text: "#0F172A",
        icon: "#0F172A",
      },
      income: {
        bg: "rgba(34,197,94,0.10)",
        border: "rgba(34,197,94,0.35)",
        text: "#0F172A",
        icon: "#0F172A",
      },
      transfer: {
        bg: "rgba(59,130,246,0.10)",
        border: "rgba(59,130,246,0.35)",
        text: "#0F172A",
        icon: "#0F172A",
      },
    }),
    [],
  );

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type],
  );

  const normalizedQuery = useMemo(
    () => categoryQuery.trim().toLowerCase(),
    [categoryQuery],
  );

  const searchedCategories = useMemo(() => {
    if (!normalizedQuery) return filteredCategories;
    return filteredCategories.filter((c) => {
      const hay = `${c.name} ${c.emoji || ""}`.toLowerCase();
      return hay.includes(normalizedQuery);
    });
  }, [filteredCategories, normalizedQuery]);

  const recentCategories = useMemo(() => {
    if (!recentIds.length) return [];
    const map = new Map(filteredCategories.map((c) => [c.id, c]));
    return recentIds.map((id) => map.get(id)).filter(Boolean) as Category[];
  }, [recentIds, filteredCategories]);

  const subcategories = useMemo(
    () =>
      (selectedCategory?.subcategories || [])
        .filter((s: any) => s.active !== false)
        .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0)),
    [selectedCategory],
  );

  const fetchData = useCallback(async () => {
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
    } catch (e) {
      console.error("CreateTransactionModal fetchData error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const resetForm = useCallback(() => {
    setType(prefill?.type ?? "expense");
    setAmount(
      prefill?.amount != null ? String(prefill.amount).replace(".", ",") : "",
    );
    setCurrency(prefill?.currency || "EUR");
    setDescription(prefill?.description ?? "");
    setDate(prefill?.date ? new Date(prefill.date) : new Date());
    setRecurrenceInterval(
      editData?.isRecurring ? editData.recurrence || "never" : "never",
    );

    setSelectedCategory(null);
    setSelectedSub(null);
    setSelectedInvestmentAsset(null);

    setSelectedWallet(null);
    setSelectedWalletFrom(null);
    setSelectedWalletTo(null);

    setCategoryQuery("");
    setShowDatePicker(false);
  }, [prefill, editData]);

  useEffect(() => {
    if (!visible) return;
    resetForm();
    fetchData();
  }, [visible, resetForm, fetchData]);

  // Categoría/subcategoría sugeridas (historial del comercio, flujo Wallet):
  // se aplican una vez cargadas las categorías, sin pisar una elección manual.
  const appliedCategorySuggestion = useRef(false);
  useEffect(() => {
    if (!visible) {
      appliedCategorySuggestion.current = false;
      return;
    }
    if (
      appliedCategorySuggestion.current ||
      !prefill?.categoryId ||
      !categories.length
    )
      return;
    const cat = categories.find((c) => c.id === prefill.categoryId);
    appliedCategorySuggestion.current = true;
    if (!cat) return;
    setSelectedCategory(cat);
    if (prefill.subcategoryId) {
      setSelectedSub(
        cat.subcategories?.find((s: any) => s.id === prefill.subcategoryId) ??
          null,
      );
    }
  }, [visible, categories, prefill?.categoryId, prefill?.subcategoryId]);

  // Defaults: wallet(s)
  useEffect(() => {
    if (!visible) return;
    if (!wallets.length) return;

    let pre: Wallet | null = null;
    if (prefill?.walletId) {
      pre = wallets.find((w) => w.id === prefill.walletId) ?? null;
    } else if (prefill?.cardName) {
      const matchedId = matchWalletByCard(prefill.cardName, wallets);
      if (matchedId != null)
        pre = wallets.find((w) => w.id === matchedId) ?? null;
    }

    if (type === "transfer") {
      if (!selectedWalletFrom)
        setSelectedWalletFrom(
          wallets.find((w) => w.id === prefill?.fromWalletId) ||
            pre ||
            wallets[0] ||
            null,
        );
      if (!selectedWalletTo)
        setSelectedWalletTo(
          wallets.find((w) => w.id === prefill?.toWalletId) ||
            wallets[1] ||
            wallets[0] ||
            null,
        );
    } else {
      if (!selectedWallet) setSelectedWallet(pre || wallets[0] || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, wallets, type]);

  // Auto asset when TO is investment
  useEffect(() => {
    if (!visible) return;
    if (type !== "transfer") return;

    const toIsInv = selectedWalletTo?.kind === "investment";
    if (!toIsInv) {
      setSelectedInvestmentAsset(null);
      return;
    }

    if (prefill?.assetId && investmentAssets.length) {
      const found =
        investmentAssets.find((a) => a.id === prefill.assetId) || null;
      if (found) {
        setSelectedInvestmentAsset(found);
        return;
      }
    }

    if (!selectedInvestmentAsset && investmentAssets.length) {
      setSelectedInvestmentAsset(investmentAssets[0]);
    }
  }, [
    visible,
    type,
    selectedWalletTo,
    investmentAssets,
    prefill?.assetId,
    selectedInvestmentAsset,
  ]);

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

  const handleCategoryModalSave = async (savedItem: any) => {
    try {
      if (savedItem?.isSub) {
        const res = await api.get(`/categories/${savedItem.categoryId}`);
        const cat = res.data;
        setSelectedCategory(cat);
        const newSub = cat?.subcategories?.find(
          (s: any) => s.id === savedItem.id,
        );
        if (newSub) setSelectedSub(newSub);
      }
      await fetchData();
    } finally {
      setCategoryModalVisible(false);
    }
  };

  const canSave = useMemo(() => {
    if (loading) return false;
    const n = moneyToNumber(amount);
    if (!amount || !Number.isFinite(n)) return false;

    if (type === "transfer") {
      if (!selectedWalletFrom || !selectedWalletTo) return false;
      if (selectedWalletFrom.id === selectedWalletTo.id) return false;
      if (selectedWalletTo?.kind === "investment" && !selectedInvestmentAsset)
        return false;
      return true;
    }

    if (!selectedWallet) return false;
    if (!selectedCategory && !editData) return false;
    return true;
  }, [
    amount,
    type,
    selectedWallet,
    selectedCategory,
    selectedWalletFrom,
    selectedWalletTo,
    selectedInvestmentAsset,
    editData,
    loading,
  ]);

  const handleSubmit = useCallback(async () => {
    const n = moneyToNumber(amount);
    if (!Number.isFinite(n)) return;

    const payload: any = {
      type,
      amount: n,
      currency,
      description: description?.trim() || "",
      date: date.toISOString(),
    };

    if (type === "transfer") {
      if (!selectedWalletFrom || !selectedWalletTo) return;
      payload.fromWalletId = selectedWalletFrom.id;
      payload.toWalletId = selectedWalletTo.id;
      payload.investmentAssetId =
        selectedWalletTo?.kind === "investment"
          ? (selectedInvestmentAsset?.id ?? null)
          : null;
    } else {
      if (!selectedWallet) return;
      payload.walletId = selectedWallet.id;
      payload.categoryId = selectedCategory?.id ?? null;
      payload.subcategoryId = selectedSub?.id ?? null;
    }

    if (recurrenceInterval !== "never") {
      payload.isRecurring = true;
      payload.recurrence = recurrenceInterval;
    } else {
      payload.isRecurring = false;
      payload.recurrence = null;
    }

    const resolvesQuickAdd = !!prefill?.quickAddId;
    if (resolvesQuickAdd) {
      payload.quickAddId = prefill.quickAddId;
    }

    try {
      setSaving(true);
      if (editData?.id)
        await api.patch(`/transactions/${editData.id}`, payload);
      else await api.post("/transactions", payload);
      markTransactionsDirty();
      if (resolvesQuickAdd) {
        queryClient.invalidateQueries({ queryKey: ["notificationsFeed"] });
      }
      onSaved?.();
      onClose();
    } catch (e) {
      console.error("CreateTransactionModal submit error:", e);
    } finally {
      setSaving(false);
    }
  }, [
    amount,
    editData,
    currency,
    date,
    description,
    onClose,
    onSaved,
    prefill,
    queryClient,
    recurrenceInterval,
    selectedCategory,
    selectedInvestmentAsset,
    selectedSub,
    selectedWallet,
    selectedWalletFrom,
    selectedWalletTo,
    type,
  ]);

  // Keyboard web
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

  const onPickCategory = (c: Category) => {
    setSelectedCategory(c);
    setSelectedSub(null);
  };

  // --- categorías: mostrar solo 6 "píldoras" por fila visual y scroll vertical interno
  // Con 3 columnas, 2 filas = 6 visibles. Ajusta maxHeight para clavar 2 filas.
  const CATEGORY_COLS = 3;
  const CATEGORY_ITEM_H = 44;
  const CATEGORY_ITEM_PAD = 6;
  const CATEGORY_VISIBLE_ROWS = 2;
  const categoryGridMaxHeight =
    CATEGORY_VISIBLE_ROWS * (CATEGORY_ITEM_H + CATEGORY_ITEM_PAD * 2) + 2;

  // Opcional: mostrar "Recientes" encima cuando no hay búsqueda
  const showRecents = !normalizedQuery && recentCategories.length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <CurrencyPickerModal
        visible={currencyModalOpen}
        value={currency}
        onSelect={setCurrency}
        onClose={() => setCurrencyModalOpen(false)}
      />
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
              width: isWeb ? 1040 : 900,
              maxWidth: "96%",
              maxHeight: "90%",
              backgroundColor: "#F5F7FB",
              borderRadius: 24,
              borderWidth: 1,
              borderColor: "rgba(15,23,42,0.12)",
              overflow: "hidden",
              shadowColor: "#000",
              shadowOpacity: 0.2,
              shadowRadius: 28,
              shadowOffset: { width: 0, height: 10 },
              elevation: 20,
            },
            noOutline,
          ]}
        >
          {/* Header */}
          <View
            style={{
              height: 68,
              backgroundColor: "white",
              borderBottomWidth: 1,
              borderBottomColor: "#E5E7EB",
              paddingHorizontal: 20,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 13,
                  backgroundColor: "#EAF0FF",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                <Ionicons name="add" size={18} color={colors.primary} />
              </View>
              <Text
                style={{ fontSize: 14, fontWeight: "900", color: "#0F172A" }}
              >
                {editData ? "Editar transacción" : "Nueva transacción"}
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!canSave || saving}
                activeOpacity={0.9}
                style={[
                  {
                    height: 38,
                    paddingHorizontal: 16,
                    borderRadius: 11,
                    borderWidth: 1,
                    borderColor: !canSave ? "#E5E7EB" : colors.primary,
                    backgroundColor: !canSave ? "#E9EEF5" : colors.primary,
                    flexDirection: "row",
                    alignItems: "center",
                    marginRight: 10,
                  },
                  noOutline,
                ]}
              >
                {saving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Ionicons name="checkmark" size={17} color="white" />
                )}
                <Text
                  style={{
                    marginLeft: 8,
                    fontSize: 12,
                    fontWeight: "900",
                    color: "white",
                  }}
                >
                  Guardar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.9}
                style={[
                  {
                    width: 38,
                    height: 38,
                    borderRadius: 11,
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
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 20, paddingBottom: 22 }}
            >
              {/* TOP: Tipo + Cantidad */}
              <View style={{ flexDirection: "row", alignItems: "stretch" }}>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "white",
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    padding: 16,
                    marginRight: 14,
                    minWidth: 360,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "900",
                      letterSpacing: 0.8,
                      color: "#8290A5",
                      marginBottom: 12,
                    }}
                  >
                    TIPO DE MOVIMIENTO
                  </Text>
                  <View style={{ flexDirection: "row" }}>
                    {[
                      {
                        label: "Gasto",
                        value: "expense" as const,
                        icon: "remove" as const,
                      },
                      {
                        label: "Ingreso",
                        value: "income" as const,
                        icon: "add" as const,
                      },
                      {
                        label: "Transfer",
                        value: "transfer" as const,
                        icon: "swap-horizontal" as const,
                      },
                    ].map((opt, idx) => {
                      const active = type === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          onPress={() => {
                            setType(opt.value);
                            setSelectedCategory(null);
                            setSelectedSub(null);
                            setSelectedInvestmentAsset(null);
                            setCategoryQuery("");

                            if (opt.value === "transfer")
                              setSelectedWallet(null);
                            else {
                              setSelectedWalletFrom(null);
                              setSelectedWalletTo(null);
                            }
                          }}
                          activeOpacity={0.9}
                          style={[
                            {
                              flex: 1,
                              height: 42,
                              borderRadius: 11,
                              borderWidth: 1,
                              borderColor: active
                                ? tints[opt.value].border
                                : "#E5E7EB",
                              backgroundColor: active
                                ? tints[opt.value].bg
                                : "white",
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
                            },
                            idx < 2 ? { marginRight: 8 } : null,
                            noOutline,
                          ]}
                        >
                          <Ionicons
                            name={opt.icon}
                            size={16}
                            color={active ? "#0F172A" : "#64748B"}
                          />
                          <Text
                            style={{
                              marginLeft: 8,
                              fontSize: 12,
                              fontWeight: "900",
                              color: active ? "#0F172A" : "#64748B",
                            }}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View
                  style={{
                    width: 365,
                    backgroundColor: "#2458E8",
                    borderRadius: 16,
                    padding: 16,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "900",
                      letterSpacing: 0.8,
                      color: "#C9D7FF",
                      alignSelf: "flex-start",
                    }}
                  >
                    IMPORTE
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-end",
                      marginTop: 4,
                    }}
                  >
                    <TextInput
                      value={amount}
                      onChangeText={(t) => setAmount(t.replace(".", ","))}
                      placeholder="0,00"
                      placeholderTextColor="#BFD0FF"
                      inputMode="decimal"
                      style={{
                        fontSize: 42,
                        fontWeight: "900",
                        color: "white",
                        textAlign: "center",
                        width: 170,
                        paddingVertical: 6,
                      }}
                      onSubmitEditing={() => {
                        if (canSave && !saving) handleSubmit();
                      }}
                      blurOnSubmit={false}
                    />
                    <TouchableOpacity
                      onPress={() => setCurrencyModalOpen(true)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={{ marginLeft: 6, paddingBottom: 10 }}
                    >
                      <Text
                        style={{
                          fontSize: 25,
                          fontWeight: "900",
                          color: "#C9D7FF",
                        }}
                      >
                        {currencySymbol(currency)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Wallets */}
              {type === "transfer" ? (
                <>
                  <Section title="Desde">
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      <View style={{ flexDirection: "row" }}>
                        {wallets.map((w, idx) => {
                          const active = selectedWalletFrom?.id === w.id;
                          return (
                            <View
                              key={w.id}
                              style={idx ? { marginLeft: 8 } : undefined}
                            >
                              <Chip
                                label={walletChipLabel(w)}
                                active={active}
                                onPress={() => {
                                  setSelectedWalletFrom(w);
                                  if (selectedWalletTo?.id === w.id) {
                                    const next =
                                      wallets.find((x) => x.id !== w.id) ||
                                      null;
                                    setSelectedWalletTo(next);
                                    if ((next as any)?.kind !== "investment")
                                      setSelectedInvestmentAsset(null);
                                  }
                                }}
                                tint={tints.transfer}
                              />
                            </View>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </Section>

                  <Section title="Hacia">
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      <View style={{ flexDirection: "row" }}>
                        {wallets.map((w, idx) => {
                          const disabled = selectedWalletFrom?.id === w.id;
                          const active = selectedWalletTo?.id === w.id;
                          return (
                            <View
                              key={w.id}
                              style={idx ? { marginLeft: 8 } : undefined}
                            >
                              <Chip
                                label={walletChipLabel(w)}
                                active={active}
                                disabled={disabled}
                                onPress={() => {
                                  if (disabled) return;
                                  setSelectedWalletTo(w);
                                  if (w.kind !== "investment")
                                    setSelectedInvestmentAsset(null);
                                }}
                                tint={tints.transfer}
                              />
                            </View>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </Section>

                  {selectedWalletTo?.kind === "investment" ? (
                    <Section title="Inversión">
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                      >
                        <View style={{ flexDirection: "row" }}>
                          {investmentAssets.map((a, idx) => {
                            const active = selectedInvestmentAsset?.id === a.id;
                            return (
                              <View
                                key={a.id}
                                style={idx ? { marginLeft: 8 } : undefined}
                              >
                                <Chip
                                  label={`📈 ${a.name}`}
                                  active={active}
                                  onPress={() => setSelectedInvestmentAsset(a)}
                                  tint={tints.transfer}
                                />
                              </View>
                            );
                          })}
                        </View>
                      </ScrollView>
                    </Section>
                  ) : null}
                </>
              ) : (
                <>
                  <Section title="Cartera">
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      <View style={{ flexDirection: "row" }}>
                        {wallets.map((w, idx) => {
                          const active = selectedWallet?.id === w.id;
                          return (
                            <View
                              key={w.id}
                              style={idx ? { marginLeft: 8 } : undefined}
                            >
                              <Chip
                                label={walletChipLabel(w)}
                                active={active}
                                onPress={() => setSelectedWallet(w)}
                              />
                            </View>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </Section>

                  {/* Categorías */}
                  <Section
                    title="Categoría"
                    right={
                      <TouchableOpacity
                        onPress={() => openCategoryModal(false)}
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
                        <Ionicons name="add" size={16} color={colors.primary} />
                        <Text
                          style={{
                            marginLeft: 6,
                            fontSize: 12,
                            fontWeight: "900",
                            color: "#0F172A",
                          }}
                        >
                          Crear
                        </Text>
                      </TouchableOpacity>
                    }
                  >
                    {/* Search */}
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
                      <Ionicons name="search" size={16} color="#94A3B8" />
                      <TextInput
                        value={categoryQuery}
                        onChangeText={setCategoryQuery}
                        placeholder="Buscar categoría..."
                        placeholderTextColor="#94A3B8"
                        style={{
                          marginLeft: 10,
                          flex: 1,
                          fontSize: 13,
                          fontWeight: "800",
                          color: "#0F172A",
                        }}
                      />
                      {categoryQuery ? (
                        <TouchableOpacity
                          onPress={() => setCategoryQuery("")}
                          style={[{ padding: 6 }, noOutline]}
                          activeOpacity={0.9}
                        >
                          <Ionicons
                            name="close-circle"
                            size={18}
                            color="#CBD5E1"
                          />
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {/* Grid (2 filas visibles = 6 categorías) */}
                    <View
                      style={{
                        marginTop: 10,
                        maxHeight: categoryGridMaxHeight,
                      }}
                    >
                      <ScrollView showsVerticalScrollIndicator>
                        <View
                          style={{ flexDirection: "row", flexWrap: "wrap" }}
                        >
                          {searchedCategories.map((c) => {
                            const active = selectedCategory?.id === c.id;
                            const tint =
                              type === "expense" ? tints.expense : tints.income;

                            return (
                              <TouchableOpacity
                                key={c.id}
                                onPress={() => onPickCategory(c)}
                                activeOpacity={0.9}
                                style={[
                                  {
                                    width: `${100 / CATEGORY_COLS}%`,
                                    padding: CATEGORY_ITEM_PAD,
                                  },
                                  noOutline,
                                ]}
                              >
                                <View
                                  style={{
                                    height: CATEGORY_ITEM_H,
                                    borderRadius: 14,
                                    borderWidth: 1,
                                    borderColor: active
                                      ? tint.border
                                      : "#E5E7EB",
                                    backgroundColor: active ? tint.bg : "white",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    paddingHorizontal: 10,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 13,
                                      fontWeight: "900",
                                      color: "#0F172A",
                                    }}
                                    numberOfLines={1}
                                  >
                                    {(c.emoji || "🏷️") + " " + c.name}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            );
                          })}

                          {!searchedCategories.length ? (
                            <View style={{ paddingVertical: 16 }}>
                              <Text
                                style={{
                                  fontSize: 13,
                                  fontWeight: "800",
                                  color: "#94A3B8",
                                }}
                              >
                                No hay resultados para “{categoryQuery}”.
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </ScrollView>
                    </View>

                    {/* Subcategorías */}
                    {selectedCategory && subcategories.length > 0 ? (
                      <View style={{ marginTop: 12 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 10,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "900",
                              color: "#94A3B8",
                            }}
                          >
                            Subcategoría (opcional)
                          </Text>
                          <TouchableOpacity
                            onPress={() => openCategoryModal(true)}
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
                            <Ionicons
                              name="add"
                              size={16}
                              color={colors.primary}
                            />
                            <Text
                              style={{
                                marginLeft: 6,
                                fontSize: 12,
                                fontWeight: "900",
                                color: "#0F172A",
                              }}
                            >
                              Crear
                            </Text>
                          </TouchableOpacity>
                        </View>

                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                        >
                          <View style={{ flexDirection: "row" }}>
                            <Chip
                              label="Sin sub"
                              active={!selectedSub}
                              onPress={() => setSelectedSub(null)}
                              tint={
                                type === "expense"
                                  ? tints.expense
                                  : tints.income
                              }
                            />
                            {subcategories.map((s: any, idx: number) => {
                              const active = selectedSub?.id === s.id;
                              return (
                                <View key={s.id} style={{ marginLeft: 8 }}>
                                  <Chip
                                    label={`${s.emoji || "•"} ${s.name}`}
                                    active={active}
                                    onPress={() => setSelectedSub(s)}
                                    tint={
                                      type === "expense"
                                        ? tints.expense
                                        : tints.income
                                    }
                                  />
                                </View>
                              );
                            })}
                          </View>
                        </ScrollView>
                      </View>
                    ) : null}
                  </Section>
                </>
              )}

              {/* Nota + Fecha */}
              <View style={{ flexDirection: "row", marginTop: 10 }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Section title="Nota (opcional)">
                    <View
                      style={{
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                        backgroundColor: "white",
                        padding: 10,
                      }}
                    >
                      <TextInput
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Ej: cena con amigos"
                        placeholderTextColor="#94A3B8"
                        style={{
                          fontSize: 13,
                          fontWeight: "800",
                          color: "#0F172A",
                        }}
                      />
                    </View>
                  </Section>
                </View>

                <View style={{ width: 320 }}>
                  <Section title="Fecha">
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <TouchableOpacity
                        onPress={openDatePicker}
                        activeOpacity={0.9}
                        style={[
                          {
                            flex: 1,
                            height: 40,
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: "#E5E7EB",
                            backgroundColor: "white",
                            paddingHorizontal: 12,
                            flexDirection: "row",
                            alignItems: "center",
                            marginRight: 10,
                          },
                          noOutline,
                        ]}
                      >
                        <Ionicons
                          name="calendar-outline"
                          size={16}
                          color="#64748B"
                        />
                        <Text
                          style={{
                            marginLeft: 8,
                            fontSize: 13,
                            fontWeight: "900",
                            color: "#0F172A",
                          }}
                        >
                          {formatShortDate(date)}{" "}
                          {date.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                        <View style={{ flex: 1 }} />
                        <Ionicons
                          name="chevron-down"
                          size={16}
                          color="#94A3B8"
                        />
                      </TouchableOpacity>

                      <Chip label="Ahora" onPress={() => setDate(new Date())} />
                    </View>

                    {/* Web: input real invisible (abre selector nativo) */}
                    {isWeb ? (
                      <input
                        ref={dateInputRef}
                        type="datetime-local"
                        value={toDateTimeLocalValue(date)}
                        onChange={(e) => {
                          const next = parseDateTimeLocal(
                            (e.target as any).value,
                          );
                          if (next) setDate(next);
                        }}
                        tabIndex={-1}
                        aria-hidden
                        style={{
                          position: "absolute",
                          opacity: 0,
                          pointerEvents: "none",
                          width: 1,
                          height: 1,
                        }}
                      />
                    ) : null}
                  </Section>
                </View>
              </View>

              {/* Recurrencia */}
              <Section title="Recurrencia">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: "row" }}>
                    {[
                      { label: "Nunca", value: "never" as const },
                      { label: "Diaria", value: "daily" as const },
                      { label: "Semanal", value: "weekly" as const },
                      { label: "Mensual", value: "monthly" as const },
                      { label: "Anual", value: "yearly" as const },
                    ].map((opt, idx) => (
                      <View
                        key={opt.value}
                        style={idx ? { marginLeft: 8 } : undefined}
                      >
                        <Chip
                          label={opt.label}
                          active={recurrenceInterval === opt.value}
                          onPress={() => setRecurrenceInterval(opt.value)}
                        />
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </Section>
            </ScrollView>
          )}

          <EditCategoryModal
            visible={categoryModalVisible}
            onClose={() => setCategoryModalVisible(false)}
            editingItem={modalEditingItem}
            onSave={handleCategoryModalSave}
          />

          {/* Native picker (móvil) */}
          {!isWeb ? (
            <CrossPlatformDateTimePicker
              isVisible={showDatePicker}
              mode="datetime"
              date={date}
              onConfirm={(d: Date) => {
                setShowDatePicker(false);
                setDate(d);
              }}
              onCancel={() => setShowDatePicker(false)}
            />
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
