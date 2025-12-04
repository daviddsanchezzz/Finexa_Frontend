import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../../api/api";

export default function EditMonthScreen({ route, navigation }: any) {
  const { year, month, monthName, currentValues, mode } = route.params;

  const isSelecting = mode === "select";

  // Convierte "1.234,56" → 1234.56
  const parseEuro = (val: string): number | undefined => {
    if (!val || val.trim() === "") return undefined;

    let clean = val.trim();

    // quitar puntos de miles: "1.234,56" → "1234,56"
    clean = clean.replace(/\./g, "");

    // cambiar coma decimal por punto: "1234,56" → "1234.56"
    clean = clean.replace(",", ".");

    const num = Number(clean);
    if (isNaN(num)) return undefined;

    return num;
  };

  const toUserFormat = (num: number | undefined): string => {
    if (num === undefined || num === null) return "";
    return String(num).replace(".", ",");
  };


  const now = new Date();
  const currentYear = now.getFullYear();

  const [selectYear, setSelectYear] = useState<number>(year ?? currentYear);
  const [selectMonth, setSelectMonth] = useState<number | null>(month ?? null);

  const monthNames = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
  ];

  const [loading, setLoading] = useState(false);

  const [income, setIncome] = useState<string>("");
  const [expense, setExpense] = useState<string>("");
  const [finalBalance, setFinalBalance] = useState<string>("");

  // Cuando seleccionan año & mes → actualizar params para activar formulario
  useEffect(() => {
    if (!isSelecting) return;
    if (selectMonth !== null) {
      navigation.setParams({
        year: selectYear,
        month: selectMonth,
        monthName: monthNames[selectMonth],
        currentValues: {},
        mode: undefined,
      });
    }
  }, [selectYear, selectMonth]);

  // Cargar valores existentes
  useEffect(() => {
    if (currentValues) {
      setIncome(toUserFormat(currentValues.income));
      setExpense(toUserFormat(currentValues.expense));
      setFinalBalance(toUserFormat(currentValues.finalBalance));
    }
  }, [currentValues]);

  const save = async () => {
    try {
      setLoading(true);

      await api.post("/manual-month", {
        year,
        month,
        income: parseEuro(income),
        expense: parseEuro(expense),
        finalBalance: parseEuro(finalBalance),
      });

      Alert.alert("Guardado", "Los datos del mes se han actualizado correctamente.");
      navigation.goBack();
    } catch (err) {
      console.log("❌ Error guardando override:", err);
      Alert.alert("Error", "No se pudo guardar el cambio.");
    } finally {
      setLoading(false);
    }
  };

  const deleteOverride = async () => {
    Alert.alert(
      "Eliminar override",
      `¿Quieres eliminar los datos manuales de ${monthName} ${year}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await api.delete(`/manual-month/${year}/${month}`);
              Alert.alert("Eliminado", "Los valores manuales han sido borrados.");
              navigation.goBack();
            } catch (err) {
              console.log("❌ Error al eliminar override:", err);
              Alert.alert("Error", "No se pudo eliminar.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-white"
    >

      {/* =============== HEADER =============== */}
      <View
        className="flex-row items-center justify-between px-4 pt-20 pb-4 mb-1"
        style={{
          borderBottomWidth: 1,
          borderColor: "#E5E7EB",
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>

        <Text className="text-lg font-semibold text-gray-900">
          {isSelecting
            ? "Nuevo registro manual"
            : `Editar ${monthName} ${year}`}
        </Text>

        <View style={{ width: 28 }} />
      </View>

      {/* =============== CONTENIDO =============== */}
      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        keyboardShouldPersistTaps="handled"
      >

        {/* ========= SELECTOR COMPACTO AÑO + MES ========= */}
        {isSelecting && (
          <View className="mb-8">
            <Text className="text-xl font-bold text-gray-900 mb-4">
              Selecciona año y mes
            </Text>

            {/* AÑO */}
            <Text className="text-gray-700 font-semibold mb-2">Año</Text>

            <View className="flex-row items-center mb-4">
              <TouchableOpacity
                onPress={() => setSelectYear((y) => y - 1)}
                className="p-2 rounded-lg bg-gray-200 mr-3"
              >
                <Ionicons name="chevron-back" size={20} color="#333" />
              </TouchableOpacity>

              <Text className="text-lg font-bold text-gray-900 mr-3">
                {selectYear}
              </Text>

              <TouchableOpacity
                onPress={() => setSelectYear((y) => y + 1)}
                className="p-2 rounded-lg bg-gray-200"
              >
                <Ionicons name="chevron-forward" size={20} color="#333" />
              </TouchableOpacity>
            </View>

            {/* MES */}
            <Text className="text-gray-700 font-semibold mb-2">Mes</Text>

            <View className="flex-row flex-wrap">
              {monthNames.map((name, idx) => {
                const active = selectMonth === idx;

                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setSelectMonth(idx)}
                    activeOpacity={0.7}
                    className={`px-3 py-2 rounded-xl mr-2 mb-2 ${
                      active ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-[14px] font-semibold ${
                        active ? "text-white" : "text-gray-800"
                      }`}
                    >
                      {name.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectMonth === null && (
              <Text className="text-gray-500 mt-2">
                Selecciona un mes para continuar.
              </Text>
            )}
          </View>
        )}

        {/* ========= FORMULARIO UNA VEZ SELECCIONADO ========= */}
        {(!isSelecting || selectMonth !== null) && (
          <>
            {/* INGRESOS */}
            <Text className="text-gray-800 font-semibold text-[16px] mb-1">
              Ingresos
            </Text>
            <TextInput
              value={income}
              onChangeText={setIncome}
              keyboardType="numeric"
              placeholder="Ingresos manuales"
              className="border border-gray-300 rounded-xl p-3 mb-4 text-[16px]"
            />

            {/* GASTOS */}
            <Text className="text-gray-800 font-semibold text-[16px] mb-1">
              Gastos
            </Text>
            <TextInput
              value={expense}
              onChangeText={setExpense}
              keyboardType="numeric"
              placeholder="Gastos manuales"
              className="border border-gray-300 rounded-xl p-3 mb-4 text-[16px]"
            />

            {/* SALDO FINAL */}
            <View className="mb-6">
              <Text className="text-gray-800 font-semibold text-[16px] mb-1">
                Saldo Final
              </Text>

              <Text className="text-gray-500 text-[13px] mb-3">
                Si lo dejas vacío, se calculará automáticamente usando el saldo del mes anterior.
              </Text>

              <TextInput
                value={finalBalance}
                onChangeText={setFinalBalance}
                keyboardType="numeric"
                placeholder="Introduce un saldo final..."
                className="border border-gray-300 rounded-xl px-4 py-3 text-[16px] bg-white"
              />
            </View>

            {/* BOTÓN GUARDAR */}
            <TouchableOpacity
              onPress={save}
              disabled={loading}
              className="bg-blue-600 py-3 rounded-xl"
            >
              <Text className="text-center text-white text-[16px] font-bold">
                {loading ? "Guardando..." : "Guardar cambios"}
              </Text>
            </TouchableOpacity>

            {/* BOTÓN ELIMINAR */}
            {!isSelecting && (
              <TouchableOpacity
                onPress={deleteOverride}
                disabled={loading}
                className="mt-4 py-3 rounded-xl border border-red-500"
              >
                <Text className="text-center text-red-600 text-[16px] font-semibold">
                  Eliminar override
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
