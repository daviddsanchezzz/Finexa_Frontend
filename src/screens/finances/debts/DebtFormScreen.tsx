// src/screens/Debts/DebtFormScreen.tsx

import React, { useState, useMemo } from "react";
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
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { colors } from "../../../theme/theme";
import api from "../../../api/api";

type DebtType = "loan" | "personal";
type DirectionType = "i_ow" | "they_owe";
type DebtStatus = "active" | "paid" | "closed";

export interface DebtFromApi {
  id: number;
  type: DebtType;
  direction: DirectionType;
  status: DebtStatus;
  name: string;
  entity: string;
  emoji?: string;
  color?: string;
  totalAmount: number;
  payed?: number | null;
  remainingAmount: number;
  interestRate?: number | null;
  monthlyPayment?: number | null;
  startDate?: string | null;
  nextDueDate?: string | null;
  installmentsPaid?: number | null;
}

interface DebtFormData {
  id?: number;
  type: DebtType;
  name: string;
  entity: string;
  emoji: string;
  totalAmount: string;
  payed: string;
  interestRate: string;
  monthlyPayment: string;
  startDate: string;   // ISO string o ""
  nextDueDate: string; // ISO string o ""
  installmentsPaid: string;
  direction: DirectionType;
  status: DebtStatus;
}

const parseNumber = (value: string) => {
  if (!value?.trim()) return null;
  const normalized = value.replace(",", ".");
  const num = Number(normalized);
  return isNaN(num) ? null : num;
};

const getStatusLabel = (status: DebtStatus) => {
  switch (status) {
    case "active":
      return "Activa";
    case "paid":
      return "Pagada";
    case "closed":
      return "Cerrada";
    default:
      return "Activa";
  }
};

const getStatusColor = (status: DebtStatus) => {
  switch (status) {
    case "active":
      return { bg: "#dcfce7", text: "#166534" };
    case "paid":
      return { bg: "#dbeafe", text: "#1d4ed8" };
    case "closed":
      return { bg: "#e5e7eb", text: "#4b5563" };
    default:
      return { bg: "#dcfce7", text: "#166534" };
  }
};

export default function DebtFormScreen({ navigation, route }: any) {
  const editDebt: DebtFromApi | null = (route.params as any)?.editDebt || null;
  const isEditMode = !!editDebt;

  const [saving, setSaving] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showNextDatePicker, setShowNextDatePicker] = useState(false);

  // 👉 marcar para cerrar al guardar (solo edición)
  const [markAsClosed, setMarkAsClosed] = useState(false);

  const [form, setForm] = useState<DebtFormData>({
    id: editDebt?.id,
    type: editDebt?.type ?? "loan",
    name: editDebt?.name ?? "",
    entity: editDebt?.entity ?? "",
    emoji: editDebt?.emoji ?? "💸",
    totalAmount:
      editDebt?.totalAmount != null ? String(editDebt.totalAmount) : "",
    payed: editDebt?.payed != null ? String(editDebt.payed) : "",
    interestRate:
      editDebt?.interestRate != null ? String(editDebt.interestRate) : "",
    monthlyPayment:
      editDebt?.monthlyPayment != null ? String(editDebt.monthlyPayment) : "",
    startDate: editDebt?.startDate ?? "",
    nextDueDate: editDebt?.nextDueDate ?? "",
    installmentsPaid:
      editDebt?.installmentsPaid != null
        ? String(editDebt.installmentsPaid)
        : "",
    direction: editDebt?.direction ?? "i_ow",
    status: editDebt?.status ?? "active",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const isPersonal = form.type === "personal";

  const handleChange = (field: keyof DebtFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};

    if (!form.name.trim()) e.name = "Introduce un nombre.";
    if (!form.entity.trim()) e.entity = "Introduce la persona o entidad.";
    if (!form.totalAmount.trim()) e.totalAmount = "Introduce el importe total.";

    if (!isPersonal) {
      if (!form.interestRate.trim()) e.interestRate = "Introduce el interés.";
      if (!form.monthlyPayment.trim())
        e.monthlyPayment = "Introduce la cuota mensual.";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // --- mini resumen / preview ---
  const total = useMemo(
    () => parseNumber(form.totalAmount) ?? 0,
    [form.totalAmount]
  );
  const payedNumeric = useMemo(
    () => parseNumber(form.payed) ?? 0,
    [form.payed]
  );
  const remaining = useMemo(() => {
    const rem = total - payedNumeric;
    return rem < 0 ? 0 : rem;
  }, [total, payedNumeric]);

  const percentage =
    total > 0
      ? Math.max(
          0,
          Math.min(100, Math.round(((total - remaining) / total) * 100))
        )
      : 0;

  const handleSave = async () => {
    if (!validate()) return;

    const parsedTotal = parseNumber(form.totalAmount) ?? 0;

    // Estado a enviar: si marcamos cerrar y estamos editando → "closed"
    const statusToSend: DebtStatus =
      isEditMode && markAsClosed ? "closed" : form.status;

    const payload: any = {
      type: form.type,
      direction: form.direction,
      name: form.name.trim(),
      entity: form.entity.trim(),
      emoji: form.emoji || "💸",
      totalAmount: parsedTotal,
      payed: parseNumber(form.payed) ?? 0,
      interestRate: isPersonal
        ? undefined
        : parseNumber(form.interestRate) ?? undefined,
      monthlyPayment: isPersonal
        ? undefined
        : parseNumber(form.monthlyPayment) ?? undefined,
      startDate: form.startDate || undefined,
      nextDueDate: form.nextDueDate || undefined,
      installmentsPaid: parseNumber(form.installmentsPaid) ?? undefined,
      status: statusToSend,
    };

    try {
      setSaving(true);
      if (isEditMode && form.id) {
        await api.patch(`/debts/${form.id}`, payload);
      } else {
        await api.post("/debts", payload);
      }

      Alert.alert("Listo", "Deuda guardada correctamente");
      navigation.goBack();
    } catch (error) {
      console.error("Error guardando deuda", error);
      Alert.alert("Error", "No se pudo guardar la deuda");
    } finally {
      setSaving(false);
    }
  };

  const formatDateLabel = (value: string) => {
    if (!value) return "Sin fecha";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // estilos chips como en AddScreen
  const chipBase = {
    minHeight: 30,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    minWidth: 90,
    marginRight: 8,
  };

  const chipText = {
    fontSize: 14,
  };

  const blueSelected = {
    backgroundColor: "#e0f2fe",
    borderColor: "#3b82f6",
  };

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
            {isEditMode ? "Editar deuda" : "Nueva deuda"}
          </Text>
        </View>

        <View style={{ minWidth: 60, alignItems: "flex-end" }}>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text className="text-[15px] text-primary font-medium">
                {isEditMode ? "Actualizar" : "Guardar"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}
        >
          {/* TABS TIPO DE DEUDA */}
          <View className="mt-6 mb-6 flex-row bg-gray-100 rounded-2xl p-1">
            {[
              { value: "loan" as DebtType, label: "Préstamo" },
              { value: "personal" as DebtType, label: "Deuda personal" },
            ].map((opt) => {
              const active = form.type === opt.value;
              const bg =
                opt.value === "loan"
                  ? "rgba(37,99,235,0.12)"
                  : "rgba(34,197,94,0.12)";

              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => handleChange("type", opt.value)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 14,
                    backgroundColor: active ? bg : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
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

          {/* IMPORTE TOTAL */}
          <View className="items-center mb-8 mt-2">
            <Text className="text-[12px] text-gray-400 mb-1">
              Importe total de la deuda
            </Text>
            <View className="flex-row items-end justify-center pb-1">
              <TextInput
                value={form.totalAmount}
                onChangeText={(t) =>
                  handleChange("totalAmount", t.replace(".", ","))
                }
                keyboardType="numeric"
                placeholder="0,00"
                placeholderTextColor="#d1d5db"
                className="text-[42px] font-semibold text-black text-center"
                style={{ minWidth: 120 }}
              />
              <Text className="text-[28px] text-gray-400 font-semibold ml-1 mb-1">
                €
              </Text>
            </View>
            {errors.totalAmount && (
              <Text className="text-[11px] text-red-600 mt-1">
                {errors.totalAmount}
              </Text>
            )}
          </View>

          {/* PREVIEW CARD */}
          {(total > 0 || payedNumeric > 0) && (
            <View className="bg-primary rounded-3xl p-4 mb-6 shadow-md">
              <View className="flex-row justify-between items-center mb-2">
                <View className="flex-1 pr-2">
                  <Text className="text-white/70 text-xs mb-0.5">
                    Vista previa
                  </Text>
                  <Text
                    className="text-white text-lg font-semibold"
                    numberOfLines={1}
                  >
                    {form.emoji || "💸"} {form.name || "Nueva deuda"}
                  </Text>
                  <Text className="text-white/75 text-[11px] mt-0.5">
                    {form.entity || "Entidad o persona no especificada"}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-white/60 text-[11px]">
                    Progreso estimado
                  </Text>
                  <Text className="text-white text-xl font-bold">
                    {percentage}%
                  </Text>
                </View>
              </View>

              <View className="mt-2">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-[11px] text-white/80">
                    Pagado:{" "}
                    <Text className="font-semibold text-white">
                      {payedNumeric.toLocaleString("es-ES")} €
                    </Text>
                  </Text>
                  <Text className="text-[11px] text-white/80">
                    Pendiente:{" "}
                    <Text className="font-semibold text-white">
                      {remaining.toLocaleString("es-ES")} €
                    </Text>
                  </Text>
                </View>
                <View className="h-2 rounded-full bg-white/25 overflow-hidden">
                  <View
                    style={{
                      height: "100%",
                      width: `${percentage}%`,
                      borderRadius: 999,
                      backgroundColor: "white",
                    }}
                  />
                </View>
              </View>
            </View>
          )}

          {/* QUIÉN DEBE A QUIÉN (solo personal) */}
          {isPersonal && (
            <View className="mb-6">
              <Text className="text-[13px] text-gray-400 mb-2">
                ¿Quién debe a quién?
              </Text>
              <View className="flex-row">
                {[
                  { label: "Yo debo", value: "i_ow" as DirectionType },
                  { label: "Me deben", value: "they_owe" as DirectionType },
                ].map((opt) => {
                  const active = form.direction === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => handleChange("direction", opt.value)}
                      style={[
                        chipBase,
                        active ? blueSelected : { borderColor: "#d1d5db" },
                      ]}
                    >
                      <Text
                        style={[
                          chipText,
                          { color: active ? "#111827" : "#6b7280" },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* INFO BÁSICA */}
          <View className="mb-6">
            <Text className="text-[13px] text-gray-400 mb-2">
              Información básica
            </Text>

            <Text className="text-[11px] text-gray-500 mb-1">Nombre</Text>
            <TextInput
              value={form.name}
              onChangeText={(t) => handleChange("name", t)}
              placeholder={
                isPersonal
                  ? "Cena Erasmus, Viaje Roma, Deuda con Marcos..."
                  : "Hipoteca piso, Préstamo coche..."
              }
              className="border-b border-gray-200 pb-2 text-[15px] text-black mb-1"
            />
            {errors.name && (
              <Text className="text-[11px] text-red-600 mb-1">
                {errors.name}
              </Text>
            )}

            <Text className="text-[11px] text-gray-500 mb-1 mt-3">
              Entidad o persona
            </Text>
            <TextInput
              value={form.entity}
              onChangeText={(t) => handleChange("entity", t)}
              placeholder={
                isPersonal ? "Nombre de tu amigo/a" : "Banco, financiera..."
              }
              className="border-b border-gray-200 pb-2 text-[15px] text-black mb-1"
            />
            {errors.entity && (
              <Text className="text-[11px] text-red-600 mb-1">
                {errors.entity}
              </Text>
            )}

            <Text className="text-[11px] text-gray-500 mb-1 mt-3">
              Emoji (opcional)
            </Text>
            <View className="flex-row items-center">
              <TextInput
                value={form.emoji}
                onChangeText={(t) => handleChange("emoji", t)}
                maxLength={2}
                className="border border-slate-200 rounded-xl px-3 py-2 w-16 text-center mr-2 text-[18px]"
              />
              <Text className="text-[11px] text-gray-500">
                Se mostrará en la tarjeta de la deuda.
              </Text>
            </View>
          </View>

          {/* IMPORTE / CONDICIONES */}
          <View className="mb-6">
            <Text className="text-[13px] text-gray-400 mb-2">
              Importe y condiciones
            </Text>

            <Text className="text-[11px] text-gray-500 mb-1">
              Importe ya pagado (opcional)
            </Text>
            <TextInput
              value={form.payed}
              onChangeText={(t) => handleChange("payed", t)}
              keyboardType="numeric"
              placeholder="0"
              className="border-b border-gray-200 pb-2 text-[15px] text-black mb-1"
            />
            <Text className="text-[10px] text-gray-400 mb-2">
              Lo que ya llevas pagado antes de registrar pagos en la app.
            </Text>

            {!isPersonal && (
              <>
                <View className="flex-row mt-3">
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text className="text-[11px] text-gray-500 mb-1">
                      Interés TIN (%)
                    </Text>
                    <TextInput
                      value={form.interestRate}
                      onChangeText={(t) => handleChange("interestRate", t)}
                      keyboardType="numeric"
                      placeholder="2,1"
                      className="border-b border-gray-200 pb-2 text-[15px] text-black mb-1"
                    />
                    {errors.interestRate && (
                      <Text className="text-[11px] text-red-600 mb-1">
                        {errors.interestRate}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text className="text-[11px] text-gray-500 mb-1">
                      Cuota mensual (€)
                    </Text>
                    <TextInput
                      value={form.monthlyPayment}
                      onChangeText={(t) =>
                        handleChange("monthlyPayment", t)
                      }
                      keyboardType="numeric"
                      placeholder="520"
                      className="border-b border-gray-200 pb-2 text-[15px] text-black mb-1"
                    />
                    {errors.monthlyPayment && (
                      <Text className="text-[11px] text-red-600 mb-1">
                        {errors.monthlyPayment}
                      </Text>
                    )}
                  </View>
                </View>

                <View className="mt-3">
                  <Text className="text-[11px] text-gray-500 mb-1">
                    Cuotas pagadas históricas
                  </Text>
                  <TextInput
                    value={form.installmentsPaid}
                    onChangeText={(t) =>
                      handleChange("installmentsPaid", t)
                    }
                    keyboardType="numeric"
                    placeholder="24"
                    className="border-b border-gray-200 pb-2 text-[15px] text-black mb-1"
                  />
                  <Text className="text-[10px] text-gray-400">
                    Cuotas ya pagadas antes de usar la app.
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* FECHAS */}
          <View className="mb-6">
            <Text className="text-[13px] text-gray-400 mb-2">
              Fechas y recordatorios
            </Text>

            <Text className="text-[11px] text-gray-500 mb-1">
              Inicio de la deuda
            </Text>
            <TouchableOpacity
              onPress={() => setShowStartDatePicker(true)}
              className="py-2 flex-row justify-between items-center border-b border-gray-200 mb-3"
            >
              <Text className="text-[15px] text-black">
                {form.startDate
                  ? formatDateLabel(form.startDate)
                  : "Sin especificar"}
              </Text>
              <Ionicons name="calendar-outline" size={18} color="black" />
            </TouchableOpacity>
          </View>

          {/* ESTADO Y CERRAR DEUDA (solo edición) */}
          {isEditMode && (
            <View className="mb-10">
              <Text className="text-[13px] text-gray-400 mb-2">
                Estado de la deuda
              </Text>

              {/* Estado actual */}
              <View className="flex-row items-center mb-3">
                <Text className="text-[12px] text-gray-500 mr-2">
                  Estado actual:
                </Text>
                {(() => {
                  const { bg, text } = getStatusColor(form.status);
                  return (
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 999,
                        backgroundColor: bg,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "600",
                          color: text,
                        }}
                      >
                        {getStatusLabel(form.status)}
                      </Text>
                    </View>
                  );
                })()}
              </View>

              {form.status === "closed" ? (
                <Text className="text-[11px] text-gray-500">
                  Esta deuda ya está marcada como cerrada. Si modificas los
                  importes, el estado se mantendrá cerrado salvo que lo cambies
                  desde el backend.
                </Text>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => setMarkAsClosed((prev) => !prev)}
                    style={{
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: markAsClosed ? "#f97316" : "#e5e7eb",
                      backgroundColor: markAsClosed ? "#fff7ed" : "#f8fafc",
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name={
                        markAsClosed
                          ? "checkbox-outline"
                          : "square-outline"
                      }
                      size={18}
                      color={markAsClosed ? "#f97316" : "#9ca3af"}
                    />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text className="text-[13px] text-gray-800 font-medium">
                        Marcar esta deuda como cerrada
                      </Text>
                      <Text className="text-[11px] text-gray-500 mt-1">
                        Al guardar, la deuda pasará a estado{" "}
                        <Text style={{ fontWeight: "600" }}>cerrada</Text> y la
                        subcategoría asociada podrá dejar de usarse para nuevos
                        movimientos.
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {markAsClosed && (
                    <Text className="text-[11px] text-amber-700 mt-2">
                      Asegúrate de que los importes pagados y pendientes son
                      correctos antes de cerrar la deuda.
                    </Text>
                  )}
                </>
              )}
            </View>
          )}

          {/* DATE PICKERS */}
          <DateTimePickerModal
            isVisible={showStartDatePicker}
            mode="date"
            locale="es_ES"
            themeVariant="light"
            date={form.startDate ? new Date(form.startDate) : new Date()}
            onConfirm={(d) => {
              setShowStartDatePicker(false);
              handleChange("startDate", d.toISOString());
            }}
            onCancel={() => setShowStartDatePicker(false)}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
