// --- AddScreen.tsx completo al 100% ---

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { colors } from "../../theme/theme";
import api from "../../api/api";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { ViewStyle, TextStyle } from "react-native";
import { useRoute } from "@react-navigation/native";
import EditCategoryModal from "../../components/EditCategoryModal";


export default function AddScreen({ navigation }: any) {
  const route = useRoute();
  const editData = (route.params as any)?.editData || null;

  const scrollRef = useRef<ScrollView>(null);

  const [type, setType] = useState<"expense" | "income" | "transfer">("expense");
  const [wallets, setWallets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
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

  //---------------------------------------
  // Scroll a zona exacta cuando se abre teclado
  //---------------------------------------
  const scrollToInput = (y: number) => {
    scrollRef.current?.scrollTo({ y, animated: true });
  };

  const handleCategoryModalSave = async (savedItem: any) => {
    if (savedItem?.isSub) {
      // Recargar SOLO la categoría actual
      const res = await api.get(`/categories/${savedItem.categoryId}`);
      console.log("Subcategorías recargadas:", res.data);
      // Actualizar la categoría seleccionada con la nueva info
      setSelectedCategory(res.data);

      // Seleccionar automáticamente la subcategoría recién creada
      const newSub = res.data.subcategories.find(s => s.id === savedItem.id);
      if (newSub) setSelectedSub(newSub);
    }

    // Recargar todas las categorías igualmente
    await fetchData();
    setCategoryModalVisible(false);
  };


  //---------------------------------------
  // Cargar datos
  //---------------------------------------
  const fetchData = async () => {
    try {
      setLoading(true);
      const [walletRes, catRes] = await Promise.all([
        api.get("/wallets"),
        api.get("/categories"),
      ]);
      setWallets(walletRes.data || []);
      setCategories(catRes.data || []);
    } catch (error) {
      console.error("ERROR:", error);
    } finally {
      setLoading(false);
    }
  };

  //---------------------------------------
  // Selección automática de carteras
  //---------------------------------------
  useEffect(() => {
    if (editData) return;          // si estamos editando, NO tocar nada
    if (wallets.length === 0) return;

    if (type === "transfer") {
      // FROM = la primera siempre
      if (!selectedWalletFrom || selectedWalletFrom.id !== wallets[0].id) {
        setSelectedWalletFrom(wallets[0]);
      }

      // TO = la segunda si existe, si no null
      if (wallets.length > 1) {
        if (!selectedWalletTo || selectedWalletTo.id !== wallets[1].id) {
          setSelectedWalletTo(wallets[1]);
        }
      } else {
        setSelectedWalletTo(null);
      }

    } else {
      // Expense / Income → siempre seleccionar primera cartera
      if (!selectedWallet || selectedWallet.id !== wallets[0].id) {
        setSelectedWallet(wallets[0]);
      }
    }
  }, [wallets, type, editData]);


  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

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
    const from = wallets.find(w => w.id === editData.fromWalletId) || null;
    const to   = wallets.find(w => w.id === editData.toWalletId) || null;

    setSelectedWalletFrom(from);
    setSelectedWalletTo(to);
  } else {
    const wallet = wallets.find(w => w.id === editData.walletId) || null;
    setSelectedWallet(wallet);
  }

  // --------- CATEGORY ----------
  const cat = categories.find(c => c.id === editData.categoryId) || null;
  setSelectedCategory(cat);

  // --------- SUBCATEGORY ----------
  if (cat && Array.isArray(cat.subcategories)) {
    const sub = cat.subcategories.find(s => s.id === editData.subcategoryId) || null;
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
  if (editData.recurrence) {
    setRecurrenceInterval(editData.recurrence.interval || "never");
    setIsRecurring(editData.recurrence.interval !== "never");
  } else {
    setRecurrenceInterval("never");
    setIsRecurring(false);
  }
}, [editData, wallets, categories]);


  //---------------------------------------
  // Lógica filtrado categorías
  //---------------------------------------
  const filteredCategories = categories.filter((c) => c.type === type);
  const subcategories = selectedCategory?.subcategories || [];

  //---------------------------------------
  // Guardar
  //---------------------------------------
  const handleSubmit = async () => {
    if (type === "transfer") {
      if (!selectedWalletFrom || !selectedWalletTo)
        return Alert.alert("Selecciona ambas carteras");
      if (selectedWalletFrom.id === selectedWalletTo.id)
        return Alert.alert("Las carteras deben ser diferentes");
    } else if (!selectedWallet) {
      return Alert.alert("Selecciona una cartera");
    }

    if (type !== "transfer" && !selectedCategory)
      return Alert.alert("Selecciona una categoría");

    if (!amount || isNaN(Number(amount.replace(",", "."))))
      return Alert.alert("Introduce una cantidad válida");

    const payload: any = {
      type,
      amount: parseFloat(amount.replace(",", ".")),
      description,
      date: date.toISOString(),
    };

    if (type === "transfer") {
      payload.fromWalletId = selectedWalletFrom.id;
      payload.toWalletId = selectedWalletTo.id;
    } else {
      payload.walletId = selectedWallet.id;
      payload.categoryId = selectedCategory?.id || null;
      payload.subcategoryId = selectedSub?.id || null;
    }

    if (recurrenceInterval !== "never") {
      payload.recurrence = { interval: recurrenceInterval };
    }

    try {
      setSaving(true);
      if (editData) {
        await api.patch(`/transactions/${editData.id}`, payload);
      } else {
        await api.post("/transactions", payload);
    }
      Alert.alert("Guardado correctamente");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const blueSelected = {
    backgroundColor: "#e0f2fe",
    borderColor: "#3b82f6",
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
          <TouchableOpacity onPress={handleSubmit} disabled={saving}>
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
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 50 }}
        />
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
                { label: "Gasto", value: "expense", bg: "rgba(239,68,68,0.12)" },      // rojo suave
                { label: "Ingreso", value: "income", bg: "rgba(34,197,94,0.12)" },     // verde suave
                { label: "Transferencia", value: "transfer", bg: "rgba(37,99,235,0.12)" }, // azul suave
              ].map((opt) => {
                const active = type === opt.value;

                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      // 🔹 MISMA LÓGICA QUE TENÍAS
                      setType(opt.value as any);
                      setSelectedCategory(null);
                      setSelectedSub(null);
                      setSelectedWallet(null);
                      setSelectedWalletFrom(null);
                      setSelectedWalletTo(null);
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
                        color: active ? "#111827" : "#9CA3AF", // negro vs gris
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
                    keyboardType="numeric"
                    placeholder="0,00"
                    placeholderTextColor="#d1d5db"
                    className="text-[48px] font-semibold text-black text-center"
                    onFocus={() => scrollToInput(0)}
                    style={{ minWidth: 120 }}
                  />

                  <Text className="text-[32px] text-gray-400 font-semibold ml-1 mb-1">
                    €
                  </Text>
                </View>
              </View>
            </View>

            {/* CARTERAS */}
            {type === "transfer" ? (
              <>
                <Text className="text-[13px] text-gray-400 mb-2">Desde</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-4"
                >
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
                          }
                        }}
                        style={[
                          chipBase,
                          isSelected ? blueSelected : { borderColor: "#d1d5db" },
                        ]}
                      >
                        <Text style={chipText}>
                          {wallet.emoji} {wallet.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <Text className="text-[13px] text-gray-400 mb-2">Hacia</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-6"
                >
                  {wallets.map((wallet) => {
                    const isDisabled = selectedWalletFrom?.id === wallet.id;
                    const isSelected = selectedWalletTo?.id === wallet.id;

                    return (
                      <TouchableOpacity
                        key={`to-${wallet.id}`}
                        activeOpacity={isDisabled ? 1 : 0.8}
                        onPress={() => !isDisabled && setSelectedWalletTo(wallet)}
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
              </>
            ) : (
              <>
                <Text className="text-[13px] text-gray-400 mb-2">Cartera</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-6"
                >
                  {wallets.map((wallet) => {
                    const isSelected = selectedWallet?.id === wallet.id;
                    return (
                      <TouchableOpacity
                        key={wallet.id}
                        onPress={() => setSelectedWallet(wallet)}
                        style={[
                          chipBase,
                          isSelected ? blueSelected : { borderColor: "#d1d5db" },
                        ]}
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

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-6"
                >
                  {filteredCategories.map((cat) => {
                    const isSelected = selectedCategory?.id === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => {
                          setSelectedCategory(cat);
                          setSelectedSub(null);
                        }}
                        style={[
                          chipBase,
                          isSelected ? blueSelected : { borderColor: "#d1d5db" },
                        ]}
                      >
                        <Text style={chipText}>
                          {cat.emoji} {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {/* 🔵 BOTÓN CREAR CATEGORÍA */}
                  <TouchableOpacity
                    onPress={() => openCategoryModal(false)}
                    style={[
                      chipBase,
                      { borderColor: colors.primary },
                    ]}
                  >
                    <Text style={[chipText, { color: colors.primary, fontWeight: "600" }]}>
                      + Crear categoría
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}

            {/* SUBCATEGORÍAS */}
            {selectedCategory && (
              <>
                <Text className="text-[13px] text-gray-400 mb-2">Subcategoría</Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-6"
                >
                  {/* 🔵 SI EXISTEN → MOSTRAR SUBCATEGORÍAS */}
                  {subcategories.length > 0 &&
                    subcategories.map((sub) => {
                      const isSelected = selectedSub?.id === sub.id;
                      return (
                        <TouchableOpacity
                          key={sub.id}
                          onPress={() => setSelectedSub(sub)}
                          style={[
                            chipBase,
                            isSelected ? blueSelected : { borderColor: "#d1d5db" },
                          ]}
                        >
                          <Text style={chipText}>
                            {sub.emoji} {sub.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}

                  {/* 🔵 SI NO EXISTEN → NO MOSTRAR LISTA, SOLO ESTE BOTÓN */}
                  {/* 🔵 SI EXISTEN → ESTE BOTÓN SE MUESTRA IGUAL, COMO ÚLTIMO */}
                  <TouchableOpacity
                    onPress={() => openCategoryModal(true)}
                    style={[
                      chipBase,
                      { borderColor: colors.primary},
                    ]}
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
                {date.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              <Ionicons name="calendar-outline" size={19} color="black" />
            </TouchableOpacity>

            <DateTimePickerModal
              isVisible={showDatePicker}
              mode="datetime"
              date={date}
              locale="es_ES"
              themeVariant="light"
              is24Hour
              onConfirm={(d) => {
                setShowDatePicker(false);
                setDate(d);
              }}
              onCancel={() => setShowDatePicker(false)}
            />

            <Text className="text-[13px] text-gray-400 mb-2">Descripción</Text>

            <View
              onLayout={e => {
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
                  }, 250); // <- GARANTIZA que el teclado ya apareció
                }}
              />
            </View>

            {/* RECURRENCIA */}
            <View className="mt-6">
              <Text className="text-[13px] text-gray-400 mb-3">Recurrencia</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-2"
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
                      style={[
                        chipBase,
                        isSelected ? blueSelected : { borderColor: "#d1d5db" },
                      ]}
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
