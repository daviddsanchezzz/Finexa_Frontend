// src/components/DesktopTripPlanItemModal.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/api";
import { colors } from "../theme/theme";
import { textStyles, typography } from "../theme/typography";
import CrossPlatformDateTimePicker from "./CrossPlatformDateTimePicker";
import TripTransactionSelectorModal, { TransactionForSelector } from "../screens/Mobile/finances/travels/components/TripTransactionSelectorModal";


// 👇 Debe reflejar EXACTAMENTE tu enum de Prisma
export type TripPlanItemType =
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

type TypeOption = {
  label: string;
  value: TripPlanItemType;
  icon: keyof typeof Ionicons.glyphMap;
};

const TYPE_OPTIONS: TypeOption[] = [
  { label: "Museum", value: "museum", icon: "color-palette-outline" },
  { label: "Monument", value: "monument", icon: "business-outline" },
  { label: "Viewpoint", value: "viewpoint", icon: "eye-outline" },
  { label: "Free tour", value: "free_tour", icon: "walk-outline" },
  { label: "Concert / event", value: "concert", icon: "musical-notes-outline" },
  { label: "Bar / party", value: "bar_party", icon: "wine-outline" },
  { label: "Beach", value: "beach", icon: "sunny-outline" },
  { label: "Restaurant", value: "restaurant", icon: "restaurant-outline" },
  { label: "Shopping", value: "shopping", icon: "cart-outline" },
  { label: "Flight", value: "flight", icon: "airplane-outline" },
  { label: "Accommodation", value: "accommodation", icon: "bed-outline" },
  { label: "Transport", value: "transport", icon: "bus-outline" },
  { label: "Taxi", value: "taxi", icon: "car-sport-outline" },
  { label: "Other", value: "other", icon: "sparkles-outline" },
];

type PickerField =
  | "date"
  | "startTime"
  | "endTime"
  | "accommodationStart"
  | "accommodationEnd"
  | null;

export type PlanItemFromApi = {
  id: number;
  type: TripPlanItemType | "activity";
  title: string;
  location?: string | null;
  notes?: string | null;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  cost?: number | null;
  transactionId?: number | null;
};

function formatEuro(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const formatEuroFromNumber = (value: number): string => {
  if (isNaN(value)) return "";
  return value.toFixed(2).replace(".", ",");
};

const formatEuroInput = (text: string): string => {
  if (!text) return "";
  let sanitized = text.replace(/[^0-9.,]/g, "");
  sanitized = sanitized.replace(/\./g, ",");
  const parts = sanitized.split(",");
  if (parts.length > 2) sanitized = parts[0] + "," + parts.slice(1).join("");
  let [intPart, decPart = ""] = sanitized.split(",");
  intPart = intPart.replace(/^0+(?=\d)/, "");
  if (intPart === "") intPart = "0";
  if (decPart.length > 2) decPart = decPart.slice(0, 2);
  return decPart ? `${intPart},${decPart}` : intPart;
};

function formatDate(d: Date | null, placeholder = "Seleccionar fecha") {
  if (!d) return placeholder;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(d: Date | null, placeholder: string) {
  if (!d) return placeholder;
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function mergeDateAndTime(baseDate: Date | null, time: Date | null) {
  if (!baseDate || !time) return null;
  const merged = new Date(baseDate);
  merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return merged.toISOString();
}

function safeType(t: any): TripPlanItemType {
  // compat con datos antiguos
  if (t === "activity") return "other";
  const ok = TYPE_OPTIONS.some((x) => x.value === t);
  return ok ? t : "other";
}

function InputWeb({
  value,
  onChange,
  placeholder,
  multiline,
  height,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  height?: number;
}) {
  if (Platform.OS !== "web") {
    return (
      <Text style={[textStyles.bodyMuted, { fontWeight: "700", color: "#94A3B8" }]}>
        (Este input está pensado para web/desktop)
      </Text>
    );
  }

  if (multiline) {
    // @ts-ignore
    return (
      <textarea
        value={value}
        onChange={(e: any) => onChange(e?.target?.value ?? "")}
        placeholder={placeholder}
        style={{
          width: "100%",
          border: "none",
          outline: "none",
          background: "transparent",
          fontFamily: typography.family.base,
          fontWeight: 700,
          fontSize: 13,
          color: "#0F172A",
          resize: "none",
          height: height ?? 90,
          lineHeight: "18px",
        }}
      />
    );
  }

  // @ts-ignore
  return (
    <input
      value={value}
      onChange={(e: any) => onChange(e?.target?.value ?? "")}
      placeholder={placeholder}
      style={{
        width: "100%",
        border: "none",
        outline: "none",
        background: "transparent",
        fontFamily: typography.family.base,
        fontWeight: 800,
        fontSize: 13,
        color: "#0F172A",
      }}
    />
  );
}

function Banner({
  tone,
  title,
  desc,
  onClose,
}: {
  tone: "danger" | "success" | "info";
  title: string;
  desc?: string;
  onClose?: () => void;
}) {
  const palette =
    tone === "danger"
      ? { bg: "rgba(239,68,68,0.10)", bd: "rgba(239,68,68,0.20)", fg: "#991B1B", ic: "alert-circle-outline" as const }
      : tone === "success"
      ? { bg: "rgba(34,197,94,0.10)", bd: "rgba(34,197,94,0.20)", fg: "#166534", ic: "checkmark-circle-outline" as const }
      : { bg: "rgba(59,130,246,0.10)", bd: "rgba(59,130,246,0.20)", fg: "#1E3A8A", ic: "information-circle-outline" as const };

  return (
    <View
      style={{
        borderRadius: 12,
        borderWidth: 1,
        borderColor: palette.bd,
        backgroundColor: palette.bg,
        padding: 12,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
      }}
    >
      <Ionicons name={palette.ic} size={18} color={palette.fg} />
      <View style={{ flex: 1 }}>
        <Text style={[textStyles.body, { fontWeight: "900", color: palette.fg, fontSize: 13 }]}>{title}</Text>
        {!!desc && <Text style={[textStyles.caption, { marginTop: 3, fontWeight: "800", color: palette.fg }]}>{desc}</Text>}
      </View>
      {!!onClose && (
        <TouchableOpacity activeOpacity={0.9} onPress={onClose}>
          <Ionicons name="close" size={18} color={palette.fg} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export function DesktopTripPlanItemModal({
  visible,
  tripId,
  planItem,
  onClose,
  onSaved,
}: {
  visible: boolean;
  tripId: number;
  planItem?: PlanItemFromApi | null; // si viene, es edición
  onClose: () => void;
  onSaved: () => void; // refrescar lista al guardar/eliminar
}) {
  const isEdit = !!planItem?.id;

  const initialType = useMemo(() => safeType(planItem?.type ?? "other"), [planItem?.type]);
  const initialTypeOption = useMemo(
    () => TYPE_OPTIONS.find((x) => x.value === initialType) || TYPE_OPTIONS[TYPE_OPTIONS.length - 1],
    [initialType]
  );

  const [selectedType, setSelectedType] = useState<TypeOption>(initialTypeOption);

  const isAccommodationInitial = initialType === "accommodation";

  // fechas (normal)
  const [date, setDate] = useState<Date | null>(
    planItem?.date && !isAccommodationInitial ? new Date(planItem.date) : null
  );
  const [startTime, setStartTime] = useState<Date | null>(
    planItem?.startTime && !isAccommodationInitial ? new Date(planItem.startTime) : null
  );
  const [endTime, setEndTime] = useState<Date | null>(
    planItem?.endTime && !isAccommodationInitial ? new Date(planItem.endTime) : null
  );

  // alojamiento (día inicio/fin)
  const [accommodationStartDate, setAccommodationStartDate] = useState<Date | null>(
    isAccommodationInitial && planItem?.date ? new Date(planItem.date) : null
  );
  const [accommodationEndDate, setAccommodationEndDate] = useState<Date | null>(
    isAccommodationInitial && planItem?.endTime ? new Date(planItem.endTime) : null
  );

  const [title, setTitle] = useState<string>(planItem?.title ?? "");
  const [location, setLocation] = useState<string>(planItem?.location ?? "");
  const [notes, setNotes] = useState<string>(planItem?.notes ?? "");

  const [cost, setCost] = useState<string>(
    typeof planItem?.cost === "number" ? formatEuroFromNumber(planItem.cost) : ""
  );

  const [selectedTransaction, setSelectedTransaction] = useState<TransactionForSelector | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerField, setPickerField] = useState<PickerField>(null);

  const [txSelectorVisible, setTxSelectorVisible] = useState(false);

  const [banner, setBanner] = useState<{ tone: "danger" | "success" | "info"; title: string; desc?: string } | null>(
    null
  );

  const baseType = selectedType.value;
  const isAccommodation = baseType === "accommodation";

  const openPicker = (field: PickerField) => {
    setPickerField(field);
    setPickerVisible(true);
  };

  const closePicker = () => {
    setPickerVisible(false);
    setPickerField(null);
  };

  const handleConfirmPicker = (value: Date) => {
    if (pickerField === "date") setDate(value);
    if (pickerField === "startTime") setStartTime(value);
    if (pickerField === "endTime") setEndTime(value);
    if (pickerField === "accommodationStart") setAccommodationStartDate(value);
    if (pickerField === "accommodationEnd") setAccommodationEndDate(value);
    closePicker();
  };

  const currentPickerMode =
    pickerField === "date" || pickerField === "accommodationStart" || pickerField === "accommodationEnd"
      ? ("date" as const)
      : ("time" as const);

  const currentPickerDate = useMemo(() => {
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
  }, [pickerField, date, startTime, endTime, accommodationStartDate, accommodationEndDate]);

  const handleSelectTransaction = (tx: TransactionForSelector) => {
    setSelectedTransaction(tx);

    const rawAmount = typeof tx.amount === "number" ? tx.amount : Number(tx.amount);
    if (!isNaN(rawAmount)) setCost(formatEuroFromNumber(Math.abs(rawAmount)));

    setTxSelectorVisible(false);
  };

  const validate = () => {
    if (!title.trim()) {
      setBanner({ tone: "danger", title: "Título requerido", desc: "Ponle un título al elemento del viaje." });
      return false;
    }

    if (isAccommodation) {
      if (!accommodationStartDate || !accommodationEndDate) {
        setBanner({
          tone: "danger",
          title: "Fechas requeridas",
          desc: "Selecciona día de inicio y día de fin para el alojamiento.",
        });
        return false;
      }
      if (accommodationEndDate < accommodationStartDate) {
        setBanner({
          tone: "danger",
          title: "Rango inválido",
          desc: "La fecha de fin no puede ser anterior a la de inicio.",
        });
        return false;
      }
    }

    setBanner(null);
    return true;
  };

  const buildPayload = () => {
    const payload: any = {
      type: baseType,
      title: title.trim(),
      location: location.trim() || null,
      notes: notes.trim() || null,
    };

    if (isAccommodation) {
      if (accommodationStartDate) payload.date = accommodationStartDate.toISOString();
      if (accommodationEndDate) payload.endTime = accommodationEndDate.toISOString();
    } else if (date) {
      payload.date = date.toISOString();
      const startIso = mergeDateAndTime(date, startTime);
      const endIso = mergeDateAndTime(date, endTime);
      if (startIso) payload.startTime = startIso;
      if (endIso) payload.endTime = endIso;
    }

    const numericCost = Number(cost.replace(",", "."));
    if (!isNaN(numericCost) && cost !== "") payload.cost = numericCost;

    if (selectedTransaction?.id) {
      payload.transactionId = selectedTransaction.id;
      const rawAmount =
        typeof selectedTransaction.amount === "number"
          ? selectedTransaction.amount
          : Number(selectedTransaction.amount);
      if (!isNaN(rawAmount)) payload.cost = Math.abs(rawAmount);
    }

    return payload;
  };

  const handleSave = async () => {
    if (!validate()) return;

    const payload = buildPayload();

    try {
      setSaving(true);
      if (isEdit && planItem?.id) {
        await api.patch(`/trips/${tripId}/plan-items/${planItem.id}`, payload);
      } else {
        await api.post(`/trips/${tripId}/plan-items`, payload);
      }

      setBanner({ tone: "success", title: "Guardado", desc: isEdit ? "Cambios guardados." : "Elemento añadido al planning." });
      onSaved();
      onClose();
    } catch (e) {
      console.error("❌ Error guardando plan item:", e);
      setBanner({ tone: "danger", title: "Error", desc: "No se ha podido guardar. Inténtalo de nuevo." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit || !planItem?.id) return;

    // confirm sin Alert.alert (web-friendly)
    const ok =
      Platform.OS === "web"
        ? // eslint-disable-next-line no-restricted-globals
          confirm("¿Seguro que quieres eliminar este elemento del viaje?")
        : true;

    if (!ok) return;

    try {
      setDeleting(true);
      await api.delete(`/trips/${tripId}/plan-items/${planItem.id}`);
      setBanner({ tone: "success", title: "Eliminado", desc: "Elemento eliminado correctamente." });
      onSaved();
      onClose();
    } catch (e) {
      console.error("❌ Error eliminando plan item:", e);
      setBanner({ tone: "danger", title: "Error", desc: "No se ha podido eliminar. Inténtalo de nuevo." });
    } finally {
      setDeleting(false);
    }
  };

  // UI helpers
  const FieldCard = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <View style={{ marginTop: 12 }}>
      <Text style={[textStyles.labelMuted2, { fontSize: 12 }]}>{label}</Text>
      <View
        style={{
          marginTop: 8,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          backgroundColor: "#F8FAFC",
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        {children}
      </View>
    </View>
  );

  const ActionBtn = ({
    tone,
    icon,
    label,
    onPress,
    loading,
    disabled,
  }: {
    tone: "primary" | "danger" | "ghost";
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
  }) => {
    const style =
      tone === "primary"
        ? { bg: colors.primary, bd: colors.primary, fg: "white" }
        : tone === "danger"
        ? { bg: "rgba(239,68,68,0.10)", bd: "rgba(239,68,68,0.25)", fg: "#B91C1C" }
        : { bg: "white", bd: "#E5E7EB", fg: "#334155" };

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        disabled={disabled || loading}
        style={{
          height: 44,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: style.bd,
          backgroundColor: style.bg,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          opacity: disabled || loading ? 0.7 : 1,
          paddingHorizontal: 14,
        }}
      >
        {loading ? (
          <ActivityIndicator size="small" color={tone === "primary" ? "#FFFFFF" : style.fg} />
        ) : (
          <Ionicons name={icon} size={18} color={style.fg as any} />
        )}
        <Text style={[textStyles.button, { fontSize: 12, fontWeight: "900", color: style.fg as any }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  // Reset state when opening with different planItem:
  // (Si en tu app el modal se monta/desmonta, esto no hace falta. Si no, conviene.)
  // Para no complicarlo con useEffect, lo dejo fuera: si necesitas esto, te lo ajusto.

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.35)",
          padding: 24,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            width: 980,
            maxWidth: "100%",
            borderRadius: 16,
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: "rgba(229,231,235,0.9)",
            overflow: "hidden",
            shadowColor: "#000",
            shadowOpacity: 0.10,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
          }}
        >
          {/* Header */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: "#E5E7EB",
              backgroundColor: "white",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: "rgba(59,130,246,0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name={isEdit ? "create-outline" : "add-outline"} size={18} color={colors.primary} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[textStyles.body, { fontSize: 14, fontWeight: "900", color: "#0F172A" }]}>
                  {isEdit ? "Editar elemento" : "Nuevo elemento del viaje"}
                </Text>
                <Text style={[textStyles.caption, { marginTop: 2, fontWeight: "800", color: "#64748B" }]}>
                  Planifica vuelos, alojamiento, visitas o actividades.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onClose}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#F8FAFC",
              }}
            >
              <Ionicons name="close" size={18} color="#334155" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={{ padding: 16, backgroundColor: "#F8FAFC" }}>
            {!!banner && (
              <View style={{ marginBottom: 12 }}>
                <Banner tone={banner.tone} title={banner.title} desc={banner.desc} onClose={() => setBanner(null)} />
              </View>
            )}

            <View style={{ flexDirection: "row", gap: 12 }}>
              {/* LEFT: tipo */}
              <View
                style={{
                  width: 280,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  backgroundColor: "white",
                  overflow: "hidden",
                }}
              >
                <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" }}>
                  <Text style={[textStyles.labelMuted2, { fontSize: 12 }]}>Tipo</Text>
                  <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 12,
                        backgroundColor: "rgba(59,130,246,0.10)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name={selectedType.icon} size={16} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[textStyles.body, { fontSize: 13, fontWeight: "900", color: "#0F172A" }]} numberOfLines={1}>
                        {selectedType.label}
                      </Text>
                      <Text style={[textStyles.caption, { marginTop: 2, fontWeight: "800", color: "#64748B" }]}>
                        Selecciona el tipo de plan.
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={{ paddingVertical: 6, maxHeight: 420 }}>
                  {TYPE_OPTIONS.map((opt) => {
                    const active = opt.value === selectedType.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        activeOpacity={0.9}
                        onPress={() => setSelectedType(opt)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          backgroundColor: active ? "rgba(59,130,246,0.08)" : "transparent",
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                          <Ionicons
                            name={opt.icon}
                            size={16}
                            color={active ? colors.primary : "#64748B"}
                          />
                          <Text style={[textStyles.body, { fontSize: 13, fontWeight: active ? "900" : "800", color: "#0F172A" }]}>
                            {opt.label}
                          </Text>
                        </View>
                        {active && <Ionicons name="checkmark-outline" size={16} color={colors.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* RIGHT: formulario */}
              <View style={{ flex: 1, gap: 12 }}>
                <View
                  style={{
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    backgroundColor: "white",
                    padding: 14,
                  }}
                >
                  <Text style={[textStyles.labelMuted2, { fontSize: 12 }]}>
                    {isAccommodation ? "Fechas de alojamiento" : "Fecha y horario"}
                  </Text>

                  <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                    {isAccommodation ? (
                      <>
                        <TouchableOpacity
                          activeOpacity={0.9}
                          onPress={() => openPicker("accommodationStart")}
                          style={{
                            flex: 1,
                            height: 42,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: "#E5E7EB",
                            backgroundColor: "#F8FAFC",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                            paddingHorizontal: 12,
                          }}
                        >
                          <Ionicons name="calendar-outline" size={16} color="#64748B" />
                          <Text style={[textStyles.body, { fontSize: 12, fontWeight: "900", color: "#0F172A" }]}>
                            {formatDate(accommodationStartDate, "Día inicio")}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          activeOpacity={0.9}
                          onPress={() => openPicker("accommodationEnd")}
                          style={{
                            flex: 1,
                            height: 42,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: "#E5E7EB",
                            backgroundColor: "#F8FAFC",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                            paddingHorizontal: 12,
                          }}
                        >
                          <Ionicons name="calendar-outline" size={16} color="#64748B" />
                          <Text style={[textStyles.body, { fontSize: 12, fontWeight: "900", color: "#0F172A" }]}>
                            {formatDate(accommodationEndDate, "Día fin")}
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <TouchableOpacity
                          activeOpacity={0.9}
                          onPress={() => openPicker("date")}
                          style={{
                            flex: 1.2,
                            height: 42,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: "#E5E7EB",
                            backgroundColor: "#F8FAFC",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                            paddingHorizontal: 12,
                          }}
                        >
                          <Ionicons name="calendar-outline" size={16} color="#64748B" />
                          <Text style={[textStyles.body, { fontSize: 12, fontWeight: "900", color: "#0F172A" }]}>
                            {formatDate(date)}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          activeOpacity={0.9}
                          onPress={() => openPicker("startTime")}
                          style={{
                            flex: 1,
                            height: 42,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: "#E5E7EB",
                            backgroundColor: "#F8FAFC",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                            paddingHorizontal: 12,
                          }}
                        >
                          <Ionicons name="time-outline" size={16} color="#64748B" />
                          <Text style={[textStyles.body, { fontSize: 12, fontWeight: "900", color: "#0F172A" }]}>
                            {formatTime(startTime, "Inicio")}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          activeOpacity={0.9}
                          onPress={() => openPicker("endTime")}
                          style={{
                            flex: 1,
                            height: 42,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: "#E5E7EB",
                            backgroundColor: "#F8FAFC",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                            paddingHorizontal: 12,
                          }}
                        >
                          <Ionicons name="time-outline" size={16} color="#64748B" />
                          <Text style={[textStyles.body, { fontSize: 12, fontWeight: "900", color: "#0F172A" }]}>
                            {formatTime(endTime, "Fin")}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>

                  {/* Detalles */}
                  <FieldCard label="Título">
                    <InputWeb
                      value={title}
                      onChange={setTitle}
                      placeholder="Ej. Museo Nacional, free tour por el centro…"
                    />
                  </FieldCard>

                  <FieldCard label="Lugar">
                    <InputWeb value={location} onChange={setLocation} placeholder="Lugar / punto de encuentro" />
                  </FieldCard>

                  <FieldCard label="Notas">
                    <InputWeb
                      value={notes}
                      onChange={setNotes}
                      placeholder="Notas (código de reserva, detalles, etc.)"
                      multiline
                      height={90}
                    />
                  </FieldCard>
                </View>

                {/* Coste y transacción */}
                <View
                  style={{
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    backgroundColor: "white",
                    padding: 14,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={[textStyles.labelMuted2, { fontSize: 12 }]}>Coste y transacción</Text>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(34,197,94,0.10)" }}>
                      <Text style={[textStyles.caption, { fontWeight: "900", color: "#166534" }]}>Opcional</Text>
                    </View>
                  </View>

                  <View style={{ marginTop: 10, flexDirection: "row", gap: 10 }}>
                    <View
                      style={{
                        flex: 1,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                        backgroundColor: "#F8FAFC",
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Ionicons name="cash-outline" size={16} color="#64748B" />
                      <View style={{ flex: 1 }}>
                        <InputWeb
                          value={cost}
                          onChange={(v) => setCost(formatEuroInput(v))}
                          placeholder="Coste (opcional)"
                        />
                      </View>
                      <Text style={[textStyles.caption, { fontWeight: "900", color: "#64748B" }]}>€</Text>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => setTxSelectorVisible(true)}
                      style={{
                        width: 220,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: "rgba(59,130,246,0.25)",
                        backgroundColor: "rgba(59,130,246,0.08)",
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                        <View
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 10,
                            backgroundColor: "white",
                            alignItems: "center",
                            justifyContent: "center",
                            borderWidth: 1,
                            borderColor: "rgba(0,0,0,0.06)",
                          }}
                        >
                          <Ionicons name="link-outline" size={14} color={colors.primary} />
                        </View>
                        <Text style={[textStyles.body, { fontSize: 12, fontWeight: "900", color: "#1E3A8A" }]} numberOfLines={1}>
                          {selectedTransaction ? "Transacción vinculada" : "Vincular transacción"}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward-outline" size={16} color="#1E3A8A" />
                    </TouchableOpacity>
                  </View>

                  {!!selectedTransaction && (
                    <View
                      style={{
                        marginTop: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                        backgroundColor: "#F8FAFC",
                        padding: 12,
                      }}
                    >
                      <Text style={[textStyles.caption, { fontWeight: "900", color: "#64748B" }]}>Transacción seleccionada</Text>
                      <Text style={[textStyles.body, { marginTop: 4, fontWeight: "900", color: "#0F172A", fontSize: 13 }]} numberOfLines={2}>
                        {selectedTransaction.description || "Sin descripción"}
                      </Text>
                      <Text style={[textStyles.caption, { marginTop: 4, fontWeight: "900", color: "#64748B" }]}>
                        Importe:{" "}
                        <Text style={{ color: "#0F172A" }}>
                          {formatEuro(Math.abs(Number(selectedTransaction.amount) || 0))}
                        </Text>
                      </Text>
                    </View>
                  )}
                </View>

                {/* Footer actions */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    {isEdit && (
                      <ActionBtn
                        tone="danger"
                        icon="trash-outline"
                        label="Eliminar"
                        onPress={handleDelete}
                        loading={deleting}
                        disabled={saving}
                      />
                    )}
                  </View>

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <ActionBtn tone="ghost" icon="close-outline" label="Cancelar" onPress={onClose} disabled={saving || deleting} />
                    <ActionBtn
                      tone="primary"
                      icon="checkmark-outline"
                      label={isEdit ? "Guardar cambios" : "Guardar"}
                      onPress={handleSave}
                      loading={saving}
                      disabled={deleting}
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Picker */}
          <CrossPlatformDateTimePicker
            isVisible={pickerVisible}
            mode={currentPickerMode as "date" | "time" | "datetime"}
            date={currentPickerDate}
            onConfirm={handleConfirmPicker}
            onCancel={closePicker}
          />

          {/* Tx selector */}
          <TripTransactionSelectorModal
            visible={txSelectorVisible}
            onClose={() => setTxSelectorVisible(false)}
            onSelect={handleSelectTransaction}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
