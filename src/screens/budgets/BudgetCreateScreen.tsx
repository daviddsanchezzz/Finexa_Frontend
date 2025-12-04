import React, { useState, useCallback, useEffect, useRef } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import DateTimePickerModal from "react-native-modal-datetime-picker";

import { colors } from "../../theme/theme";
import api from "../../api/api";
import { ViewStyle, TextStyle } from "react-native";

type BudgetPeriod = "daily" | "weekly" | "monthly" | "yearly";

export default function BudgetCreateScreen({ navigation }: any) {
  const route = useRoute();
  const { periodType, from, to, label } = (route.params as any) || {};
  const editData = (route.params as any)?.editData || null;

  const scrollRef = useRef<ScrollView>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [wallets, setWallets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [existingBudgets, setExistingBudgets] = useState<any[]>([]);

  // ---------- Estado principal ----------
  const [walletMode, setWalletMode] = useState<"all" | "one">("all");
  const [categoryMode, setCategoryMode] = useState<"all" | "one">("all");

  const [selectedWallet, setSelectedWallet] = useState<any | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);

  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [period, setPeriod] = useState<BudgetPeriod>("monthly");
  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Para scroll al enfocar
  const [nameY, setNameY] = useState(0);

  // ---------- Estilos chips ----------
  const chipBase: ViewStyle = {
    minHeight: 32,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    marginBottom: 8,
  };

  const chipText: TextStyle = {
    fontSize: 14,
  };

  const blueSelected: ViewStyle = {
    backgroundColor: "rgba(59,130,246,0.10)",
    borderColor: "#3b82f6",
  };

  const grayBorder: ViewStyle = {
    borderColor: "#d1d5db",
  };

  const scrollTo = (y: number) => {
    scrollRef.current?.scrollTo({ y, animated: true });
  };

  // ---------- Cargar datos ----------
  const fetchData = async () => {
    try {
      setLoading(true);
      const [walletRes, catRes, budgetsRes] = await Promise.all([
        api.get("/wallets"),
        api.get("/categories"),
        api.get("/budgets"),
      ]);
      setWallets(walletRes.data || []);
      setCategories(catRes.data || []);
      setExistingBudgets(budgetsRes.data || []);
    } catch (error) {
      console.error("ERROR (budgets fetch):", error);
      Alert.alert("Error", "No se pudieron cargar carteras/categorías");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  // ---------- Rellenar si venimos a editar ----------
  useEffect(() => {
    if (!editData || wallets.length === 0 || categories.length === 0) return;

    // Nombre
    setName(editData.name || "");

    // Límite
    if (typeof editData.limit === "number") {
      setAmount(editData.limit.toString().replace(".", ","));
    }

    // Periodo
    if (["daily", "weekly", "monthly", "yearly"].includes(editData.period)) {
      setPeriod(editData.period);
    } else {
      setPeriod("monthly");
    }

    // Fecha inicio
    if (editData.startDate) {
      setStartDate(new Date(editData.startDate));
    }

    // Wallet
    if (editData.walletId) {
      setWalletMode("one");
      const w = wallets.find((w) => w.id === editData.walletId) || null;
      setSelectedWallet(w);
    } else {
      setWalletMode("all");
      setSelectedWallet(null);
    }

    // Categoría
    if (editData.categoryId) {
      setCategoryMode("one");
      const c = categories.find((c) => c.id === editData.categoryId) || null;
      setSelectedCategory(c);
    } else {
      setCategoryMode("all");
      setSelectedCategory(null);
    }
  }, [editData, wallets, categories]);

  // Si venimos desde BudgetsScreen con un filtro activo: semana, mes, etc.
  useEffect(() => {
    if (periodType) {
      setPeriod(periodType as BudgetPeriod);
    }
  }, [periodType]);

  // Ajustar automáticamente la fecha de inicio según el filtro
  useEffect(() => {
    if (!from || !to) return;

    const start = new Date(from);

    // Asegura que si es un día, no cambie nada
    setStartDate(start);
  }, [from, to]);


  // ---------- Categorías: puedes filtrar solo gasto si quieres ----------
  // const expenseCategories = categories.filter((c) => c.type === "expense");
  const usableCategories = categories; // o cambia a expenseCategories

  // ---------- Guardar ----------
  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount.replace(",", ".")))) {
      return Alert.alert("Error", "Introduce una cantidad válida");
    }

    const numericLimit = parseFloat(amount.replace(",", "."));
    if (numericLimit <= 0) {
      return Alert.alert("Error", "El límite debe ser mayor que 0");
    }

    if (walletMode === "one" && !selectedWallet) {
      return Alert.alert("Error", "Selecciona una cartera o elige Todas");
    }

    if (categoryMode === "one" && !selectedCategory) {
      return Alert.alert("Error", "Selecciona una categoría o elige Todas");
    }

    // --- VALIDACIÓN DE EXCLUSIVIDAD (General vs Categorías) ---
    // 1. Filtramos presupuestos del mismo periodo
    const budgetsInPeriod = existingBudgets.filter((b) => b.period === period);

    // 2. Si estamos creando/editando un presupuesto GENERAL (sin categoría)
    if (categoryMode === "all") {
      // Verificar si ya existen presupuestos de CATEGORÍA para este periodo
      const hasCategoryBudgets = budgetsInPeriod.some((b) => b.categoryId);

      // Si estamos editando, excluimos el actual de la comprobación (aunque en teoría un general no debería tener categoryId, por seguridad)
      // Pero la validación es: "Si quiero guardar un General, no debe haber NINGÚN Category".
      // Si estoy editando MI propio presupuesto General, no pasa nada. Pero si hay OTROS que son de categoría, error.

      if (hasCategoryBudgets) {
        return Alert.alert(
          "No permitido",
          "Ya tienes presupuestos por categoría para este periodo. No puedes crear uno general."
        );
      }

      // También verificar si ya existe OTRO general (solo debería haber 1 general por periodo)
      const existingGeneral = budgetsInPeriod.find((b) => !b.categoryId && (!editData || b.id !== editData.id));
      if (existingGeneral) {
        return Alert.alert(
          "No permitido",
          "Ya existe un presupuesto general para este periodo."
        );
      }
    }

    // 3. Si estamos creando/editando un presupuesto de CATEGORÍA
    if (categoryMode === "one") {
      // Verificar si ya existe un presupuesto GENERAL para este periodo
      const hasGeneralBudget = budgetsInPeriod.some((b) => !b.categoryId);

      if (hasGeneralBudget) {
        return Alert.alert(
          "No permitido",
          "Ya tienes un presupuesto general para este periodo. No puedes crear uno por categoría."
        );
      }

      // Verificar si ya existe un presupuesto para ESTA misma categoría
      if (selectedCategory) {
        const existingSameCategory = budgetsInPeriod.find(
          (b) => b.categoryId === selectedCategory.id && (!editData || b.id !== editData.id)
        );
        if (existingSameCategory) {
          return Alert.alert(
            "No permitido",
            `Ya existe un presupuesto para la categoría ${selectedCategory.name} en este periodo.`
          );
        }
      }
    }
    // ----------------------------------------------------------

    const payload: any = {
      name: name.trim() || null,
      limit: numericLimit,
      period,
      startDate: startDate.toISOString(),
      walletId: walletMode === "one" ? selectedWallet?.id || null : null,
      categoryId: categoryMode === "one" ? selectedCategory?.id || null : null,
    };

    try {
      setSaving(true);
      if (editData) {
        await api.patch(`/budgets/${editData.id}`, payload);
      } else {
        await api.post("/budgets", payload);
      }

      Alert.alert(
        "Correcto",
        editData ? "Presupuesto actualizado" : "Presupuesto creado"
      );
      navigation.goBack();
    } catch (error) {
      console.error("ERROR guardando presupuesto:", error);
      Alert.alert("Error", "No se pudo guardar el presupuesto");
    } finally {
      setSaving(false);
    }
  };

  // ---------- UI ----------
  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* HEADER */}
      <View className="flex-row items-center px-5 py-4 border-b border-gray-100">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ width: 50 }}
        >
          <Ionicons name="chevron-back" size={26} color="#111" />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: "center" }}>
          <Text className="text-[17px] font-medium text-[#111]">
            {editData ? "Editar presupuesto" : "Nuevo presupuesto"}
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
            {/* IMPORTE */}
            <View className="items-center mb-10 mt-6">
              <View className="flex-row items-end justify-center">
                <TextInput
                  value={amount}
                  onChangeText={(t) => setAmount(t.replace(".", ","))}
                  keyboardType="numeric"
                  placeholder="0,00"
                  placeholderTextColor="#d1d5db"
                  className="text-[42px] font-semibold text-black text-center"
                  style={{ minWidth: 120 }}
                  onFocus={() => scrollTo(0)}
                />
                <Text className="text-[28px] text-gray-400 font-semibold ml-1 mb-1">
                  €
                </Text>
              </View>
              <Text className="text-[13px] text-gray-400 mt-2">
                Límite para este presupuesto
              </Text>
            </View>
            {/* CARTERAS 
<View className="mb-6">
  <Text className="text-[13px] text-gray-400 mb-2">Cartera</Text>

  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={{ paddingRight: 10 }}
  >
     🔵 BOTÓN TODAS 
    <TouchableOpacity
      onPress={() => {
        setWalletMode("all");
        setSelectedWallet(null);
      }}
      style={[
        chipBase,
        walletMode === "all" ? blueSelected : grayBorder,
      ]}
    >
      <Text style={chipText}>Todas las carteras</Text>
    </TouchableOpacity>

    {/* 🔵 LISTA DE CARTERAS 
    {wallets.map((wallet) => {
      const isSelected = walletMode === "one" && selectedWallet?.id === wallet.id;

      return (
        <TouchableOpacity
          key={wallet.id}
          onPress={() => {
            setWalletMode("one");
            setSelectedWallet(wallet);
          }}
          style={[
            chipBase,
            isSelected ? blueSelected : grayBorder,
          ]}
        >
          <Text style={chipText}>
            {wallet.emoji} {wallet.name}
          </Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>

</View>
*/}
            {/* CATEGORÍAS */}
            <View className="mb-6">
              <Text className="text-[13px] text-gray-400 mb-2">Categoría</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 10 }}
              >
                {/* 🔵 BOTÓN TODAS */}
                <TouchableOpacity
                  onPress={() => {
                    setCategoryMode("all");
                    setSelectedCategory(null);
                  }}
                  style={[
                    chipBase,
                    categoryMode === "all" ? blueSelected : grayBorder,
                  ]}
                >
                  <Text style={chipText}>Todas las categorías</Text>
                </TouchableOpacity>

                {/* 🔵 LISTA DE CATEGORÍAS */}
                {categories.map((cat) => {
                  const isSelected = categoryMode === "one" && selectedCategory?.id === cat.id;

                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => {
                        setCategoryMode("one");
                        setSelectedCategory(cat);
                      }}
                      style={[
                        chipBase,
                        isSelected ? blueSelected : grayBorder,
                      ]}
                    >
                      <Text style={chipText}>
                        {cat.emoji} {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* PERIODO */}
            <View className="mb-6">
              <Text className="text-[13px] text-gray-400 mb-2">
                Periodo del presupuesto
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 10 }}
              >
                {[
                  { label: "Diario", value: "daily" as BudgetPeriod },
                  { label: "Semanal", value: "weekly" as BudgetPeriod },
                  { label: "Mensual", value: "monthly" as BudgetPeriod },
                  { label: "Anual", value: "yearly" as BudgetPeriod },
                ].map((opt) => {
                  const isSelected = period === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setPeriod(opt.value)}
                      style={[
                        chipBase,
                        isSelected ? blueSelected : grayBorder,
                      ]}
                    >
                      <Text style={chipText}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text className="text-[12px] text-gray-500 mt-1">
                El presupuesto se renovará automáticamente cada{" "}
                {period === "daily"
                  ? "día"
                  : period === "weekly"
                    ? "semana"
                    : period === "monthly"
                      ? "mes"
                      : "año"}
                .
              </Text>
            </View>

            {/* FECHA INICIO */}
            <View className="mb-10">
              <Text className="text-[13px] text-gray-400 mb-2">
                Fecha de inicio
              </Text>

              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                className="py-2 flex-row justify-between items-center border-b border-gray-200"
              >
                <Text className="text-[15px] text-black">
                  {startDate.toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </Text>
                <Ionicons name="calendar-outline" size={19} color="black" />
              </TouchableOpacity>

              <Text className="text-[12px] text-gray-500 mt-1">
                Desde esta fecha se empezará a contar el límite.
              </Text>

              <DateTimePickerModal
                isVisible={showDatePicker}
                mode="date"
                date={startDate}
                locale="es_ES"
                themeVariant="light"
                onConfirm={(d) => {
                  setShowDatePicker(false);
                  setStartDate(d);
                }}
                onCancel={() => setShowDatePicker(false)}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
