// src/screens/Transactions/AddScreen.tsx
import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import { colors } from "../../theme/theme";
import api from "../../api/api";
import { ViewStyle, TextStyle } from "react-native";
import EditCategoryModal from "../../components/EditCategoryModal";
import CrossPlatformDateTimePicker from "../../components/CrossPlatformDateTimePicker";
import { appAlert } from "../../utils/appAlert";

export default function AddScreen({ navigation }: any) {
  const route = useRoute();
  const editData = (route.params as any)?.editData || null;

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
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState("never");
  const [descriptionY, setDescriptionY] = useState(0);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [modalEditingItem, setModalEditingItem] = useState<any>(null);

  //---------------------------------------
  // Estilos de chips
  //---------------------------------------
  const chipBase: ViewStyle = {
    minHeight: 30,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 90,
    marginRight: 8,
  };

  const chipText: TextStyle = {
    fontSize: 15,
  };

  const blueSelected = {
    backgroundColor: "#e0f2fe",
    borderColor: "#3b82f6",
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
    if (editData) return;
    if (wallets.length === 0) return;

    if (type === "transfer") {
      if (!selectedWalletFrom || selectedWalletFrom.id !== wallets[0].id) {
        setSelectedWalletFrom(wallets[0]);
      }

      if (wallets.length > 1) {
        if (!selectedWalletTo || selectedWalletTo.id !== wallets[1].id) {
          setSelectedWalletTo(wallets[1]);
        }
      } else {
        setSelectedWalletTo(null);
      }
    } else {
      if (!selectedWallet || selectedWallet.id !== wallets[0].id) {
        setSelectedWallet(wallets[0]);
      }
    }
  }, [wallets, type, editData]);

  //---------------------------------------
  // Auto-selección de asset cuando TO es wallet inversión
  //---------------------------------------
  useEffect(() => {
    if (editData) return;
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
    editData,
    selectedInvestmentAsset,
  ]);

  //---------------------------------------
  // Resetear pantalla al entrar
  //---------------------------------------
  useFocusEffect(
    useCallback(() => {
      if (!editData) {
        setType("expense");
        setSelectedWallet(null);
        setSelectedWalletFrom(null);
        setSelectedWalletTo(null);
        setSelectedCategory(null);
        setSelectedSub(null);
        setSelectedInvestmentAsset(null);
        setAmount("");
        setDescription("");
        setDate(new Date());
        setRecurrenceInterval("never");
        setIsRecurring(false);
      }
    }, [editData])
  );

  //---------------------------------------
  // Rellenar datos si venimos en modo edición
  //---------------------------------------
  useEffect(() => {
    if (!editData || wallets.length === 0 || categories.length === 0) return;

    setType(editData.type);

    // --------- WALLET ----------
    if (editData.type === "transfer") {
      const from = wallets.find((w) => w.id === editData.fromWalletId) || null;
      const to = wallets.find((w) => w.id === editData.toWalletId) || null;

      setSelectedWalletFrom(from);
      setSelectedWalletTo(to);

      // ✅ asset si era aportación a inversión
      if (editData.investmentAssetId && investmentAssets.length > 0) {
        const inv =
          investmentAssets.find((a) => a.id === editData.investmentAssetId) || null;
        setSelectedInvestmentAsset(inv);
      } else {
        setSelectedInvestmentAsset(null);
      }
    } else {
      const wallet = wallets.find((w) => w.id === editData.walletId) || null;
      setSelectedWallet(wallet);
      setSelectedInvestmentAsset(null);
    }

    // --------- CATEGORY ----------
    const cat = categories.find((c) => c.id === editData.categoryId) || null;
    setSelectedCategory(cat);

    // --------- SUBCATEGORY ----------
    if (cat && Array.isArray(cat.subcategories)) {
      const sub = cat.subcategories.find((s: any) => s.id === editData.subcategoryId) || null;
      setSelectedSub(sub);
    } else {
      setSelectedSub(null);
    }

    // --------- CAMPOS BÁSICOS ----------
    setAmount(
      typeof editData.amount === "number"
        ? editData.amount.toString().replace(".", ",")
        : "0,00"
    );

    setDescription(editData.description || "");
    setDate(new Date(editData.date));

    // --------- RECURRENCIA ----------
    if (editData.isRecurring && editData.recurrence) {
      setRecurrenceInterval(editData.recurrence);
      setIsRecurring(true);
    } else {
      setRecurrenceInterval("never");
      setIsRecurring(false);
    }
  }, [editData, wallets, categories, investmentAssets]);

  //---------------------------------------
  // Lógica filtrado categorías
  //---------------------------------------
  const filteredCategories = categories.filter((c) => c.type === type);
  const subcategories = selectedCategory?.subcategories || [];

  //---------------------------------------
  // Helper: ¿esta transacción pertenece a una serie recurrente?
  //---------------------------------------
  const isPartOfSeries = !!(editData && (editData.isRecurring || editData.parentId));

  //---------------------------------------
  // Guardar (con scope para recurrentes en edición)
  //---------------------------------------
  const handleSubmit = async (scope: "single" | "series" | "future" = "single") => {
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
      if (editData) {
        await api.patch(`/transactions/${editData.id}`, payload, {
          params: { scope },
        });
      } else {
        await api.post("/transactions", payload);
      }
      navigation.goBack();
    } catch (error) {
      appAlert("Error", "No se pudo guardar");
    } finally {
      setSaving(false);
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

  //---------------------------------------
  // UI
  //---------------------------------------
  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* HEADER */}
      <View className="flex-row items-center px-5 py-4 border-b border-gray-100">
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 50 }}>
          <Ionicons name="chevron-back" size={26} color="#111" />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: "center" }}>
          <Text className="text-[17px] font-medium text-[#111]">
            {editData ? "Editar" : "Añadir"}
          </Text>
        </View>

        <View style={{ minWidth: 60, alignItems: "flex-end" }}>
          <TouchableOpacity
            onPress={() => {
              if (editData && isPartOfSeries) {
                appAlert("Actualizar transacción recurrente", "¿Qué quieres actualizar?", [
                  { text: "Solo esta", onPress: () => handleSubmit("single") },
                  { text: "Solo futuras", onPress: () => handleSubmit("future") },
                  {
                    text: "Toda la serie",
                    style: "destructive",
                    onPress: () => handleSubmit("series"),
                  },
                  { text: "Cancelar", style: "cancel" },
                ]);
              } else {
                handleSubmit("single");
              }
            }}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text className="text-[15px] text-primary font-medium">
                {editData ? "Actualizar" : "Guardar"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
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
            contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}
          >
            {/* TABS */}
            <View className="mt-6 mb-6 flex-row bg-gray-100 rounded-2xl p-1">
              {[
                { label: "Gasto", value: "expense", bg: "rgba(239,68,68,0.12)" },
                { label: "Ingreso", value: "income", bg: "rgba(34,197,94,0.12)" },
                { label: "Transferencia", value: "transfer", bg: "rgba(37,99,235,0.12)" },
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
                      paddingVertical: 10,
                      borderRadius: 14,
                      backgroundColor: active ? opt.bg : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: active ? "#111827" : "#9CA3AF",
                      }}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* INPUT CANTIDAD */}
            <View className="items-center mb-10 mt-2">
              <View className="flex-row items-center pb-2 justify-center">
                <View className="flex-row items-end justify-center">
                  <TextInput
                    value={amount}
                    onChangeText={(t) => setAmount(t.replace(".", ","))}
                    keyboardType="decimal-pad"
                    placeholder="0,00"
                    placeholderTextColor="#d1d5db"
                    className="text-[48px] font-semibold text-black text-center"
                    onFocus={() => scrollToInput(0)}
                    style={{ minWidth: 120 }}
                  />
                  <Text className="text-[32px] text-gray-400 font-semibold ml-1 mb-1">€</Text>
                </View>
              </View>
            </View>

            {/* CARTERAS */}
            {type === "transfer" ? (
              <>
                <Text className="text-[13px] text-gray-400 mb-2">Desde</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                  {wallets.map((wallet) => {
                    const isSelected = selectedWalletFrom?.id === wallet.id;
                    return (
                      <TouchableOpacity
                        key={`from-${wallet.id}`}
                        onPress={() => {
                          setSelectedWalletFrom(wallet);
                          if (selectedWalletTo?.id === wallet.id) {
                            const next = wallets.find((w) => w.id !== wallet.id);
                            setSelectedWalletTo(next || null);

                            // si cambia TO por evitar conflicto, limpia asset si ya no es investment
                            if ((next as any)?.kind !== "investment") setSelectedInvestmentAsset(null);
                          }
                        }}
                        style={[chipBase, isSelected ? blueSelected : { borderColor: "#d1d5db" }]}
                      >
                        <Text style={chipText}>
                          {wallet.emoji} {wallet.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <Text className="text-[13px] text-gray-400 mb-2">Hacia</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
                  {wallets.map((wallet) => {
                    const isDisabled = selectedWalletFrom?.id === wallet.id;
                    const isSelected = selectedWalletTo?.id === wallet.id;

                    return (
                      <TouchableOpacity
                        key={`to-${wallet.id}`}
                        activeOpacity={isDisabled ? 1 : 0.8}
                        onPress={() => {
                          if (isDisabled) return;
                          setSelectedWalletTo(wallet);

                          // ✅ si deja de ser wallet inversión, limpia asset
                          if (wallet.kind !== "investment") {
                            setSelectedInvestmentAsset(null);
                          }
                        }}
                        style={[
                          chipBase,
                          isDisabled
                            ? { borderColor: "#e5e7eb", opacity: 0.4 }
                            : isSelected
                            ? blueSelected
                            : { borderColor: "#d1d5db" },
                        ]}
                      >
                        <Text style={chipText}>
                          {wallet.emoji} {wallet.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* ✅ Selector de inversión solo si TO es wallet de inversión */}
                {selectedWalletTo?.kind === "investment" ? (
                  <>
                    <Text className="text-[13px] text-gray-400 mb-2">Inversión</Text>

                    {investmentAssets.length === 0 ? (
                      <TouchableOpacity
                        onPress={() => navigation.navigate("InvestmentForm")}
                        className="py-3 px-4 rounded-2xl mb-6"
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
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
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
                                {inv.symbol ? ` · ${inv.symbol}` : ""}
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
                <Text className="text-[13px] text-gray-400 mb-2">Cartera</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
                  {wallets.map((wallet) => {
                    const isSelected = selectedWallet?.id === wallet.id;
                    return (
                      <TouchableOpacity
                        key={wallet.id}
                        onPress={() => setSelectedWallet(wallet)}
                        style={[chipBase, isSelected ? blueSelected : { borderColor: "#d1d5db" }]}
                      >
                        <Text style={chipText}>
                          {wallet.emoji} {wallet.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {/* CATEGORÍA */}
            {type !== "transfer" && (
              <>
                <Text className="text-[13px] text-gray-400 mb-2">Categoría</Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
                  {filteredCategories.map((cat) => {
                    const isSelected = selectedCategory?.id === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => {
                          setSelectedCategory(cat);
                          setSelectedSub(null);
                        }}
                        style={[chipBase, isSelected ? blueSelected : { borderColor: "#d1d5db" }]}
                      >
                        <Text style={chipText}>
                          {cat.emoji} {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {/* BOTÓN CREAR CATEGORÍA */}
                  <TouchableOpacity
                    onPress={() => openCategoryModal(false)}
                    style={[chipBase, { borderColor: colors.primary }]}
                  >
                    <Text style={[chipText, { color: colors.primary, fontWeight: "600" }]}>
                      + Crear categoría
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}

            {/* SUBCATEGORÍAS */}
            {type !== "transfer" && selectedCategory && (
              <>
                <Text className="text-[13px] text-gray-400 mb-2">Subcategoría</Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
                  {subcategories.length > 0 &&
                    subcategories.map((sub: any) => {
                      const isSelected = selectedSub?.id === sub.id;
                      return (
                        <TouchableOpacity
                          key={sub.id}
                          onPress={() => setSelectedSub(sub)}
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
                      + Crear subcategoría
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}

            {/* FECHA */}
            <Text className="text-[13px] text-gray-400 mb-2">Fecha</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className="py-2 flex-row justify-between items-center border-b border-gray-200 mb-6"
            >
              <Text className="text-[15px] text-black">
                {date.toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}{" "}
                {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
              <Ionicons name="calendar-outline" size={19} color="black" />
            </TouchableOpacity>

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

            {/* DESCRIPCIÓN */}
            <Text className="text-[13px] text-gray-400 mb-2">Descripción</Text>
            <View
              onLayout={(e) => {
                setDescriptionY(e.nativeEvent.layout.y);
              }}
            >
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Añadir nota"
                placeholderTextColor="#ccc"
                multiline
                className="border-b border-gray-200 pb-2 text-[15px] text-black"
                onFocus={() => {
                  setTimeout(() => {
                    scrollRef.current?.scrollTo({
                      y: descriptionY - 80,
                      animated: true,
                    });
                  }, 250);
                }}
              />
            </View>

            {/* RECURRENCIA */}
            <View className="mt-6">
              <Text className="text-[13px] text-gray-400 mb-3">Recurrencia</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
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
                      style={[chipBase, isSelected ? blueSelected : { borderColor: "#d1d5db" }]}
                    >
                      <Text style={chipText}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </ScrollView>

          <EditCategoryModal
            visible={categoryModalVisible}
            onClose={() => setCategoryModalVisible(false)}
            editingItem={modalEditingItem}
            onSave={handleCategoryModalSave}
          />
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
