// src/screens/Trips/TripFormScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { colors } from "../../../theme/theme";
import api from "../../../api/api";

type TripPlanItemType = "flight" | "accommodation" | "activity" | "transport" | "other";

interface TripFromApi {
  id: number;
  userId: number;
  name: string;
  destination?: string | null;
  startDate: string;
  endDate: string;
  companions: string[]; // en la DB es String[]
  emoji?: string | null;
  budget?: number | null;
}

type DateField = "start" | "end" | null;

export default function TripFormScreen({ route, navigation }: any) {
  const editTrip: TripFromApi | undefined = route?.params?.editTrip;

  const [name, setName] = useState(editTrip?.name ?? "");
  const [destination, setDestination] = useState(editTrip?.destination ?? "");
  const [emoji, setEmoji] = useState(editTrip?.emoji ?? "✈️");

  const [startDate, setStartDate] = useState<Date>(
    editTrip?.startDate ? new Date(editTrip.startDate) : new Date()
  );
  const [endDate, setEndDate] = useState<Date>(
    editTrip?.endDate ? new Date(editTrip.endDate) : new Date()
  );

  const [companionsText, setCompanionsText] = useState(
    editTrip?.companions?.join(", ") ?? ""
  );

  const [budget, setBudget] = useState(
  editTrip?.budget ? String(editTrip.budget) : ""
);


  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [dateField, setDateField] = useState<DateField>(null);

  const isEditing = !!editTrip;

  const openDatePicker = (field: DateField) => {
    setDateField(field);
    setDatePickerVisible(true);
  };

  const closeDatePicker = () => {
    setDatePickerVisible(false);
    setDateField(null);
  };

  const handleConfirmDate = (date: Date) => {
    if (dateField === "start") {
      setStartDate(date);
      if (endDate < date) setEndDate(date);
    } else if (dateField === "end") {
      setEndDate(date);
    }
    closeDatePicker();
  };

  const formatDate = (d: Date) =>
    d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const parseCompanions = (text: string): string[] =>
    text
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Falta el nombre", "Añade un nombre para el viaje.");
      return;
    }

    if (!startDate || !endDate) {
      Alert.alert("Fechas incompletas", "Indica fechas de inicio y fin.");
      return;
    }

    if (endDate < startDate) {
      Alert.alert(
        "Rango de fechas inválido",
        "La fecha de fin no puede ser anterior a la de inicio."
      );
      return;
    }

    const companionsArray = parseCompanions(companionsText);

    const payload = {
      name: name.trim(),
      destination: destination.trim() || null,
      startDate,
      endDate,
      emoji: emoji?.trim() || null,
      companions: companionsArray,
      budget: budget ? Number(budget) : null,
    };

    try {
      setSaving(true);

      if (isEditing && editTrip) {
        console.log("✏️ Editando viaje ID", editTrip.id, "con datos:", payload);
        await api.patch(`/trips/${editTrip.id}`, payload);
      } else {
        await api.post("/trips", payload);
      }

      navigation.goBack();
    } catch (err) {
      console.error("❌ Error al guardar viaje:", err);
      Alert.alert(
        "Error",
        "Ha ocurrido un error al guardar el viaje. Inténtalo de nuevo."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editTrip || deleting) return;

    Alert.alert(
      "Eliminar viaje",
      "¿Seguro que quieres eliminar este viaje? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              await api.delete(`/trips/${editTrip.id}`);
              navigation.goBack();
            } catch (err) {
              console.error("❌ Error al eliminar viaje:", err);
              Alert.alert(
                "Error",
                "Ha ocurrido un error al eliminar el viaje. Inténtalo de nuevo."
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* HEADER */}
      <View className="px-5 pt-3 pb-2 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ paddingRight: 10, paddingVertical: 4 }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">
            {isEditing ? "Editar viaje" : "Nuevo viaje"}
          </Text>
        </View>

        <View className="flex-row items-center">
          {isEditing && (
            <TouchableOpacity
              onPress={handleDelete}
              disabled={deleting || saving}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: "#FCA5A5",
                marginRight: 8,
                opacity: deleting || saving ? 0.6 : 1,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  <Text
                    className="text-[13px] font-semibold ml-1"
                    style={{ color: "#DC2626" }}
                  >
                    Eliminar
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || deleting}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: colors.primary,
              opacity: saving || deleting ? 0.7 : 1,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="save-outline" size={16} color="#FFFFFF" />
                <Text className="text-[13px] font-semibold text-white ml-1.5">
                  Guardar
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* CARD PRINCIPAL */}
        <View
          className="rounded-3xl p-4 mb-4"
          style={{
            backgroundColor: "white",
            shadowColor: "#000",
            shadowOpacity: 0.04,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 },
          }}
        >
          {/* Emoji + nombre */}
          <View className="flex-row items-center mb-3">
            <TouchableOpacity
              activeOpacity={0.9}
              style={{
                width: 48,
                height: 48,
                borderRadius: 999,
                backgroundColor: "#EEF2FF",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Text style={{ fontSize: 26 }}>{emoji || "✈️"}</Text>
            </TouchableOpacity>

            <View className="flex-1">
              <Text className="text-[12px] text-gray-500 mb-1">
                Nombre del viaje
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ej. Navidad en Praga"
                className="text-[16px] font-semibold text-gray-900"
              />
            </View>
          </View>

          {/* Destino */}
          <View className="mt-1">
            <Text className="text-[12px] text-gray-500 mb-1">Destino</Text>
            <View className="flex-row items-center rounded-2xl bg-slate-50 px-3 py-2">
              <Ionicons name="location-outline" size={16} color="#9CA3AF" />
              <TextInput
                value={destination}
                onChangeText={setDestination}
                placeholder="Ciudad / país"
                className="flex-1 ml-2 text-[14px] text-gray-800"
              />
            </View>
          </View>
        </View>

        {/* Fechas */}
        <View
          className="rounded-3xl p-4 mb-4"
          style={{
            backgroundColor: "white",
            borderWidth: 1,
            borderColor: "#E5E7EB",
          }}
        >
          <Text className="text-[13px] font-semibold text-gray-900 mb-3">
            Fechas del viaje
          </Text>

          <View className="flex-row">
            <TouchableOpacity
              className="flex-1 mr-1.5 rounded-2xl px-3 py-2.5 bg-slate-50 flex-row items-center"
              activeOpacity={0.9}
              onPress={() => openDatePicker("start")}
            >
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <View className="ml-2">
                <Text className="text-[11px] text-gray-500">Desde</Text>
                <Text className="text-[13px] text-gray-900 font-medium">
                  {formatDate(startDate)}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 ml-1.5 rounded-2xl px-3 py-2.5 bg-slate-50 flex-row items-center"
              activeOpacity={0.9}
              onPress={() => openDatePicker("end")}
            >
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <View className="ml-2">
                <Text className="text-[11px] text-gray-500">Hasta</Text>
                <Text className="text-[13px] text-gray-900 font-medium">
                  {formatDate(endDate)}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Emoji + Compañeros */}
        <View
          className="rounded-3xl p-4 mb-4"
          style={{
            backgroundColor: "white",
            borderWidth: 1,
            borderColor: "#E5E7EB",
          }}
        >
          <Text className="text-[13px] font-semibold text-gray-900 mb-3">
            Detalles opcionales
          </Text>

            {/* Emoji + Presupuesto en la misma fila */}
            <View className="flex-row mb-3">
            {/* Emoji */}
            <View className="flex-1 mr-1.5">
                <Text className="text-[12px] text-gray-500 mb-1">Emoji</Text>
                <View className="flex-row items-center rounded-2xl bg-slate-50 px-3 py-2">
                <TextInput
                    value={emoji}
                    onChangeText={setEmoji}
                    placeholder="✈️"
                    className="flex-1 text-[16px]"
                />
                </View>
            </View>

            {/* Presupuesto */}
            <View className="flex-1 ml-1.5">
                <Text className="text-[12px] text-gray-500 mb-1">Presupuesto (€)</Text>
                <View className="flex-row items-center rounded-2xl bg-slate-50 px-3 py-2">
                <TextInput
                    value={budget}
                    onChangeText={setBudget}
                    placeholder="300"
                    keyboardType="numeric"
                    className="flex-1 text-[16px] text-gray-800"
                />
                </View>
            </View>
            </View>

          {/* Compañeros */}
          <View>
            <Text className="text-[12px] text-gray-500 mb-1">
              Compañeros (separados por comas)
            </Text>
            <View className="rounded-2xl bg-slate-50 px-3 py-2">
              <TextInput
                value={companionsText}
                onChangeText={setCompanionsText}
                placeholder="Ej. Juan, María, Ana"
                multiline
                className="text-[13px] text-gray-800"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* DATE PICKER MODAL */}
      <DateTimePickerModal
        isVisible={datePickerVisible}
        mode="date"
        date={dateField === "end" ? endDate : startDate}
        onConfirm={handleConfirmDate}
        onCancel={closeDatePicker}
      />
    </SafeAreaView>
  );
}
