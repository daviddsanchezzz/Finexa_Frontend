// src/screens/Trips/TripPlanFormScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import api from "../../../api/api";
import { colors } from "../../../theme/theme";
import TripTransactionSelectorModal, {
  TransactionForSelector,
} from "./components/TripTransactionSelectorModal";
import CrossPlatformDateTimePicker from "../../../components/CrossPlatformDateTimePicker";


// 👇 Este tipo debe reflejar EXACTAMENTE el enum de Prisma TripPlanItemType
type TripPlanItemType =
  | "flight"
  | "accommodation"
  | "transport"
  | "taxi"
  | "museum"
  | "monument"
  | "viewpoint"
  | "free_tour"
  | "concert"
  | "bar_party"
  | "beach"
  | "restaurant"
  | "shopping"
  | "other";

type PickerField =
  | "date"
  | "startTime"
  | "endTime"
  | "accommodationStart"
  | "accommodationEnd"
  | null;

interface TripPlanFormScreenProps {
  route: any;
  navigation: any;
}

type TypeOption = {
  label: string;
  value: TripPlanItemType;
  icon: string;
};

// 👇 Los value ahora son los del enum del backend, en inglés
const TYPE_OPTIONS: TypeOption[] = [
  // ——— CULTURA Y TURISMO ———
  { label: "Museum", value: "museum", icon: "color-palette-outline" },
  { label: "Monument", value: "monument", icon: "business-outline" },
  { label: "Viewpoint", value: "viewpoint", icon: "eye-outline" },

  // ——— OCIO / ENTRETENIMIENTO ———
  { label: "Free tour", value: "free_tour", icon: "walk-outline" },
  {
    label: "Concert / event",
    value: "concert",
    icon: "musical-notes-outline",
  },
  { label: "Bar / party", value: "bar_party", icon: "wine-outline" },

  // ——— NATURALEZA / AVENTURA ———
  { label: "Beach", value: "beach", icon: "sunny-outline" },

  // ——— GASTRONOMÍA ———
  { label: "Restaurant", value: "restaurant", icon: "restaurant-outline" },

  // ——— COMPRAS ———
  { label: "Shopping", value: "shopping", icon: "cart-outline" },

  // ——— LOGÍSTICA ———
  { label: "Flight", value: "flight", icon: "airplane-outline" },
  { label: "Accommodation", value: "accommodation", icon: "bed-outline" },
  { label: "Transport", value: "transport", icon: "bus-outline" },
  { label: "Taxi", value: "taxi", icon: "car-sport-outline" },

  // ——— GENÉRICO ———
  { label: "Other", value: "other", icon: "sparkles-outline" },
];

// 👉 Helpers para gestionar el input de euros con coma y 2 decimales
const formatEuroFromNumber = (value: number): string => {
  if (isNaN(value)) return "";
  // 2 decimales y coma como separador
  return value.toFixed(2).replace(".", ",");
};

const formatEuroInput = (text: string): string => {
  if (!text) return "";

  // Solo números, puntos y comas
  let sanitized = text.replace(/[^0-9.,]/g, "");

  // Convertir siempre . a ,
  sanitized = sanitized.replace(/\./g, ",");

  // Evitar más de una coma: si hay más, unimos todo lo que sobra
  const parts = sanitized.split(",");
  if (parts.length > 2) {
    sanitized = parts[0] + "," + parts.slice(1).join("");
  }

  let [intPart, decPart = ""] = sanitized.split(",");

  // Evitar muchos ceros a la izquierda tipo 00012
  intPart = intPart.replace(/^0+(?=\d)/, "");
  if (intPart === "") intPart = "0";

  // Máximo 2 decimales
  if (decPart.length > 2) {
    decPart = decPart.slice(0, 2);
  }

  return decPart ? `${intPart},${decPart}` : intPart;
};


export default function TripPlanFormScreen({
  route,
  navigation,
}: TripPlanFormScreenProps) {
  const { tripId, planItem } = route.params || {};
  const isEdit = !!planItem;

  // Tipo inicial: si edito, cojo el que coincida con planItem.type
  // Si hay datos viejos con "activity", los mapeamos a "other" por seguridad
  const normalizedBackendType: TripPlanItemType =
    planItem?.type === "activity" ? "other" : planItem?.type || "other";

  const initialTypeOption: TypeOption =
    TYPE_OPTIONS.find((opt) => opt.value === normalizedBackendType) ||
    TYPE_OPTIONS[0];

  const [selectedType, setSelectedType] =
    useState<TypeOption>(initialTypeOption);
  const baseType: TripPlanItemType = selectedType.value;

  const isAccommodationTypeInitial = normalizedBackendType === "accommodation";

  // Para actividades normales
  const [date, setDate] = useState<Date | null>(
    planItem?.date && !isAccommodationTypeInitial
      ? new Date(planItem.date)
      : null
  );
  const [startTime, setStartTime] = useState<Date | null>(
    planItem?.startTime && !isAccommodationTypeInitial
      ? new Date(planItem.startTime)
      : null
  );
  const [endTime, setEndTime] = useState<Date | null>(
    planItem?.endTime && !isAccommodationTypeInitial
      ? new Date(planItem.endTime)
      : null
  );

  // Para alojamiento (solo días)
  const [accommodationStartDate, setAccommodationStartDate] =
    useState<Date | null>(
      isAccommodationTypeInitial && planItem?.date
        ? new Date(planItem.date)
        : null
    );
  const [accommodationEndDate, setAccommodationEndDate] =
    useState<Date | null>(
      isAccommodationTypeInitial && planItem?.endTime
        ? new Date(planItem.endTime)
        : null
    );

  const [title, setTitle] = useState<string>(planItem?.title ?? "");
  const [location, setLocation] = useState<string>(planItem?.location ?? "");
  const [notes, setNotes] = useState<string>(planItem?.notes ?? "");

const [cost, setCost] = useState<string>(
  typeof planItem?.cost === "number"
    ? formatEuroFromNumber(planItem.cost)
    : ""
);

  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionForSelector | null>(null);

  const [loadingTransaction, setLoadingTransaction] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false); // 👈 NUEVO

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerField, setPickerField] = useState<PickerField>(null);

  const [typePickerVisible, setTypePickerVisible] = useState(false);
  const [txSelectorVisible, setTxSelectorVisible] = useState(false);

  const openPicker = (field: PickerField) => {
    setPickerField(field);
    setPickerVisible(true);
  };

  const closePicker = () => {
    setPickerVisible(false);
    setPickerField(null);
  };

  const handleConfirmPicker = (value: Date) => {
    if (pickerField === "date") {
      setDate(value);
    } else if (pickerField === "startTime") {
      setStartTime(value);
    } else if (pickerField === "endTime") {
      setEndTime(value);
    } else if (pickerField === "accommodationStart") {
      setAccommodationStartDate(value);
    } else if (pickerField === "accommodationEnd") {
      setAccommodationEndDate(value);
    }
    closePicker();
  };

  const formatDate = (d: Date | null, placeholder = "Seleccionar fecha") => {
    if (!d) return placeholder;
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (d: Date | null, placeholder: string) => {
    if (!d) return placeholder;
    return d.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const mergeDateAndTime = (baseDate: Date | null, time: Date | null) => {
    if (!baseDate || !time) return null;
    const merged = new Date(baseDate);
    merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return merged.toISOString();
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Título requerido", "Ponle un título a la actividad.");
      return;
    }

    const isAccommodation = baseType === "accommodation";

    if (isAccommodation) {
      if (!accommodationStartDate || !accommodationEndDate) {
        Alert.alert(
          "Fechas requeridas",
          "Selecciona día de inicio y día de fin para el alojamiento."
        );
        return;
      }
    }

    const payload: any = {
      type: baseType, // 👈 ahora coincide con enum prisma
      title: title.trim(),
      location: location.trim() || null,
      notes: notes.trim() || null,
    };

    if (isAccommodation) {
      payload.date = accommodationStartDate!.toISOString();
      payload.endTime = accommodationEndDate!.toISOString();
    } else if (date) {
      payload.date = date!.toISOString();

      const startIso = mergeDateAndTime(date, startTime);
      const endIso = mergeDateAndTime(date, endTime);

      if (startIso) payload.startTime = startIso;
      if (endIso) payload.endTime = endIso;
    }

    // coste
    const numericCost = Number(cost.replace(",", "."));
    if (!isNaN(numericCost) && cost !== "") {
      payload.cost = numericCost;
    }

    // transacción vinculada
    if (selectedTransaction?.id) {
      payload.transactionId = selectedTransaction.id;
      if (typeof selectedTransaction.amount === "number") {
        payload.cost = Math.abs(selectedTransaction.amount);
      } else {
        const parsed = Number(selectedTransaction.amount);
        if (!isNaN(parsed)) payload.cost = Math.abs(parsed);
      }
    }

    try {
      setSaving(true);
      console.log("💾 Guardando plan item con payload:", payload);
      if (isEdit && planItem?.id) {
        await api.patch(`/trips/${tripId}/plan-items/${planItem.id}`, payload);
      } else {
        await api.post(`/trips/${tripId}/plan-items`, payload);
      }

      Alert.alert(
        "Guardado",
        isEdit ? "Cambios guardados." : "Elemento añadido al planning.",
        [
          {
            text: "OK",
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } catch (err) {
      console.error("❌ Error al guardar plan item:", err);
      Alert.alert(
        "Error",
        "No se ha podido guardar la actividad. Inténtalo de nuevo."
      );
    } finally {
      setSaving(false);
    }
  };

  // 👇 NUEVO: eliminar plan
const handleDelete = () => {
  if (!isEdit || !planItem?.id) {
    console.log("❌ No es edición o falta planItem.id");
    return;
  }
  if (!tripId) {
    console.log("❌ No hay tripId en route.params");
    Alert.alert(
      "Error",
      "No se ha encontrado el viaje asociado a este plan (tripId indefinido)."
    );
    return;
  }

  Alert.alert(
    "Eliminar plan",
    "¿Seguro que quieres eliminar este elemento del viaje?",
    [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            setDeleting(true);
            console.log(
              "🗑 Eliminando plan item...",
              `/trips/${tripId}/plan-items/${planItem.id}`
            );

            await api.delete(`/trips/${tripId}/plan-items/${planItem.id}`);

            console.log("✅ Plan item eliminado correctamente");
            navigation.goBack();
          } catch (err) {
            console.error("❌ Error al eliminar plan item:", err);
            Alert.alert(
              "Error",
              "No se ha podido eliminar el plan. Inténtalo de nuevo."
            );
          } finally {
            setDeleting(false);
          }
        },
      },
    ]
  );
};

  const currentPickerMode =
    pickerField === "date" ||
    pickerField === "accommodationStart" ||
    pickerField === "accommodationEnd"
      ? "date"
      : "time";

  const currentPickerDate = (() => {
    switch (pickerField) {
      case "date":
        return date || new Date();
      case "startTime":
        return startTime || new Date();
      case "endTime":
        return endTime || new Date();
      case "accommodationStart":
        return accommodationStartDate || new Date();
      case "accommodationEnd":
        return accommodationEndDate || new Date();
      default:
        return new Date();
    }
  })();

const handleSelectTransaction = (tx: TransactionForSelector) => {
  setSelectedTransaction(tx);

  const rawAmount =
    typeof tx.amount === "number" ? tx.amount : Number(tx.amount);

  if (!isNaN(rawAmount)) {
    setCost(formatEuroFromNumber(Math.abs(rawAmount)));
  }

  setTxSelectorVisible(false);
};

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* HEADER */}
      <View className="flex-row items-center px-4 pt-3 pb-2">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="mr-3 rounded-full bg-white px-2 py-1 shadow-sm"
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-[16px] font-semibold text-gray-900">
            {isEdit ? "Editar elemento" : "Nuevo elemento del viaje"}
          </Text>
          <Text className="text-[11px] text-gray-500">
            Añade planes, vuelos, alojamientos o actividades al viaje
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >

        {/* CARD: Tipo + fechas */}
        <View className="rounded-3xl bg-white p-4 shadow-sm mb-4">
          {/* Tipo */}
          <Text className="text-[13px] font-semibold text-gray-900 mb-1">
            Tipo
          </Text>
          <TouchableOpacity
            onPress={() => setTypePickerVisible(true)}
            activeOpacity={0.9}
            className="rounded-2xl bg-gray-100 px-3 py-2 mb-4 flex-row items-center justify-between"
          >
            <View className="flex-row items-center">
              <View className="h-7 w-7 rounded-full bg-white items-center justify-center mr-2">
                <Ionicons
                  name={selectedType.icon as any}
                  size={16}
                  color={colors.primary}
                />
              </View>
              <View>
                <Text className="text-[13px] text-gray-800 font-medium">
                  {selectedType.label}
                </Text>
                <Text className="text-[10px] text-gray-500">
                  Toca para cambiar el tipo de plan
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-down-outline" size={18} color="#6B7280" />
          </TouchableOpacity>

          {/* Fecha + horario / fechas alojamiento */}
          <Text className="text-[13px] font-semibold text-gray-900 mb-1">
            {baseType === "accommodation"
              ? "Fechas de alojamiento"
              : "Fecha y horario"}
          </Text>

          {baseType === "accommodation" ? (
            <View className="flex-row mb-1.5">
              {/* Día inicio */}
              <TouchableOpacity
                onPress={() => openPicker("accommodationStart")}
                className="flex-1 rounded-2xl px-3 py-2 bg-gray-100 flex-row items-center mr-1.5"
                activeOpacity={0.9}
              >
                <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                <Text className="text-[12px] text-gray-700 ml-2">
                  {formatDate(accommodationStartDate, "Día inicio")}
                </Text>
              </TouchableOpacity>

              {/* Día fin */}
              <TouchableOpacity
                onPress={() => openPicker("accommodationEnd")}
                className="flex-1 rounded-2xl px-3 py-2 bg-gray-100 flex-row items-center ml-1.5"
                activeOpacity={0.9}
              >
                <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                <Text className="text-[12px] text-gray-700 ml-2">
                  {formatDate(accommodationEndDate, "Día fin")}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="flex-row mb-1.5">
              {/* Fecha */}
              <TouchableOpacity
                onPress={() => openPicker("date")}
                className="flex-1 rounded-2xl px-3 py-2 bg-gray-100 flex-row items-center mr-1.5"
                activeOpacity={0.9}
              >
                <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                <Text className="text-[12px] text-gray-700 ml-2">
                  {formatDate(date)}
                </Text>
              </TouchableOpacity>

              {/* Hora inicio */}
              <TouchableOpacity
                onPress={() => openPicker("startTime")}
                className="flex-1 rounded-2xl px-3 py-2 bg-gray-100 flex-row items-center mx-0.75"
                activeOpacity={0.9}
              >
                <Ionicons name="time-outline" size={16} color="#6B7280" />
                <Text className="text-[12px] text-gray-700 ml-2">
                  {formatTime(startTime, "Inicio")}
                </Text>
              </TouchableOpacity>

              {/* Hora fin */}
              <TouchableOpacity
                onPress={() => openPicker("endTime")}
                className="flex-1 rounded-2xl px-3 py-2 bg-gray-100 flex-row items-center ml-1.5"
                activeOpacity={0.9}
              >
                <Ionicons name="time-outline" size={16} color="#6B7280" />
                <Text className="text-[12px] text-gray-700 ml-2">
                  {formatTime(endTime, "Fin")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* CARD: Detalles */}
        <View className="rounded-3xl bg-white p-4 shadow-sm mb-4">
          {/* Título */}
          <Text className="text-[13px] font-semibold text-gray-900 mb-1">
            Título
          </Text>
          <View className="rounded-2xl bg-gray-100 px-3 py-2 mb-3">
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ej. Museo Nacional, free tour por el centro…"
              className="text-[13px] text-gray-800"
            />
          </View>

          {/* Lugar */}
          <Text className="text-[13px] font-semibold text-gray-900 mb-1">
            Lugar
          </Text>
          <View className="rounded-2xl bg-gray-100 px-3 py-2 mb-3">
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Lugar / punto de encuentro"
              className="text-[13px] text-gray-800"
            />
          </View>

          {/* Notas */}
          <Text className="text-[13px] font-semibold text-gray-900 mb-1">
            Notas
          </Text>
          <View className="rounded-2xl bg-gray-100 px-3 py-2">
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Notas (código de reserva, detalles, etc.)"
              multiline
              className="text-[12px] text-gray-700"
            />
          </View>
        </View>

        {/* CARD: Coste & Transacción */}
        <View className="rounded-3xl bg-white p-4 shadow-sm mb-2">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-[13px] font-semibold text-gray-900">
              Coste y transacción
            </Text>
            <View className="rounded-full bg-emerald-50 px-2 py-0.5">
              <Text className="text-[10px] text-emerald-700">
                Opcional pero recomendado
              </Text>
            </View>
          </View>

          <View className="rounded-2xl bg-gray-100 px-3 py-2 mb-2">
            <View className="flex-row items-center mb-1">
              <Ionicons name="cash-outline" size={16} color="#6B7280" />
              <TextInput
                value={cost}
                onChangeText={(text) => setCost(formatEuroInput(text))}
                placeholder="Coste (opcional)"
                keyboardType="decimal-pad"
                className="flex-1 text-[13px] text-gray-800 ml-2"
              />
              <Text className="text-[11px] text-gray-500 ml-1">€</Text>
            </View>
          </View>

          <Text className="text-[11px] text-gray-500 mb-1 mt-1">
            O vincula una transacción (sobrescribirá el coste)
          </Text>

          <TouchableOpacity
            onPress={() => setTxSelectorVisible(true)}
            className="mt-1 rounded-2xl bg-indigo-50 px-3 py-2 flex-row items-center justify-between"
            activeOpacity={0.9}
          >
            <View className="flex-row items-center">
              <View className="h-7 w-7 rounded-full bg-white items-center justify-center mr-2">
                <Ionicons name="link-outline" size={16} color={colors.primary} />
              </View>
              <Text
                className={`text-[12px] ${
                  selectedTransaction ? "text-indigo-900" : "text-indigo-700"
                }`}
              >
                {selectedTransaction
                  ? selectedTransaction.description || "Transacción seleccionada"
                  : "Seleccionar transacción"}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward-outline"
              size={16}
              color="#4B5563"
            />
          </TouchableOpacity>

          {selectedTransaction && (
            <View className="mt-3 bg-gray-50 rounded-2xl px-3 py-2 border border-gray-100">
              <Text className="text-[11px] text-gray-500 mb-1">
                Transacción seleccionada
              </Text>
              <Text className="text-[12px] text-gray-900 font-medium">
                {selectedTransaction.description || "Sin descripción"}
              </Text>
              <Text className="text-[11px] text-gray-500 mt-1">
                Importe:{" "}
                <Text className="font-semibold text-gray-900">
                  {selectedTransaction.amount} €
                </Text>
              </Text>
            </View>
          )}
        </View>

        {/* Botón guardar */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || deleting}
          className="mt-4 flex-row items-center justify-center rounded-2xl py-3"
          style={{
            backgroundColor: colors.primary,
            opacity: saving || deleting ? 0.7 : 1,
          }}
          activeOpacity={0.9}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-outline" size={18} color="#FFFFFF" />
              <Text className="text-[13px] text-white font-semibold ml-1.5">
                {isEdit ? "Guardar cambios" : "Guardar en el viaje"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Botón eliminar (solo en edición) */}
{isEdit && (
  <TouchableOpacity
    onPress={handleDelete}
    disabled={deleting || saving}
    className="mt-2 flex-row items-center justify-center rounded-2xl py-3"
    style={{
      backgroundColor: "#FEF2F2",
      borderWidth: 1,
      borderColor: "#FCA5A5",
      opacity: deleting || saving ? 0.7 : 1,
    }}
    activeOpacity={0.9}
  >
    {deleting ? (
      <ActivityIndicator size="small" color="#B91C1C" />
    ) : (
      <>
        <Ionicons name="trash-outline" size={18} color="#B91C1C" />
        <Text className="text-[13px] text-red-700 font-semibold ml-1.5">
          Eliminar plan
        </Text>
      </>
    )}
  </TouchableOpacity>
)}

      </ScrollView>

      {/* Date / Time picker */}
{/* Date / Time picker */}
<CrossPlatformDateTimePicker
  isVisible={pickerVisible}
  mode={currentPickerMode as "date" | "time" | "datetime"}
  date={currentPickerDate}
  onConfirm={handleConfirmPicker}
  onCancel={closePicker}
/>

      {/* Selector de tipo */}
      <Modal
        visible={typePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTypePickerVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setTypePickerVisible(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 24,
              paddingVertical: 12,
              maxHeight: "70%",
            }}
          >
            <Text className="text-center text-[14px] font-semibold text-gray-900 mb-2">
              Selecciona un tipo
            </Text>
            <ScrollView>
              {TYPE_OPTIONS.map((opt) => {
                const active = opt.value === selectedType.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      setSelectedType(opt);
                      setTypePickerVisible(false);
                    }}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: active ? "#EEF2FF" : "transparent",
                    }}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={16}
                      color={active ? colors.primary : "#6B7280"}
                    />
                    <Text className="ml-2 text-[13px] text-gray-800">
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Selector de transacción */}
      <TripTransactionSelectorModal
        visible={txSelectorVisible}
        onClose={() => setTxSelectorVisible(false)}
        onSelect={handleSelectTransaction}
      />
    </SafeAreaView>
  );
}
