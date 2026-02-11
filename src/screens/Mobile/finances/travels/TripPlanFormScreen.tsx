// src/screens/Mobile/finances/travels/TripPlanFormScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from "../../../../api/api";
import { TripPlanItemType, BudgetCategoryType, RoomType, BathroomType } from "../../../../types/enums/travel";
import CrossPlatformDateTimePicker from "../../../../components/CrossPlatformDateTimePicker";

// ==================== TYPES ====================

type MainTab = "transport" | "accommodation" | "activity" | "expense";
type TransportSubTab = "flight" | "train" | "bus" | "car";
type TransportKind = "principal" | "local";
type FlightEntryMode = "autofill" | "manual";

interface TripPlanFormScreenProps {
  route: any;
  navigation: any;
}

interface ActivityType {
  label: string;
  value: TripPlanItemType;
  icon: keyof typeof Ionicons.glyphMap;
}

// ==================== CONSTANTS ====================

// Desktop color scheme
const UI = {
  text: "#0B1220",
  muted: "#64748B",
  muted2: "#94A3B8",
  border: "rgba(226,232,240,0.95)",
  primary: "#0B1220",
};

const ACTIVITY_TYPES: ActivityType[] = [
  { label: "Museo", value: TripPlanItemType.museum, icon: "color-palette-outline" },
  { label: "Monumento", value: TripPlanItemType.monument, icon: "business-outline" },
  { label: "Mirador", value: TripPlanItemType.viewpoint, icon: "eye-outline" },
  { label: "Free Tour", value: TripPlanItemType.free_tour, icon: "walk-outline" },
  { label: "Concierto", value: TripPlanItemType.concert, icon: "musical-notes-outline" },
  { label: "Fiesta", value: TripPlanItemType.bar_party, icon: "wine-outline" },
  { label: "Playa", value: TripPlanItemType.beach, icon: "sunny-outline" },
  { label: "Restaurante", value: TripPlanItemType.restaurant, icon: "restaurant-outline" },
  { label: "Compras", value: TripPlanItemType.shopping, icon: "cart-outline" },
  { label: "Otro", value: TripPlanItemType.other, icon: "sparkles-outline" },
];

const EXPENSE_CATEGORIES = [
  { label: "Transporte", value: BudgetCategoryType.transport_main, icon: "car-outline" },
  { label: "Alojamiento", value: BudgetCategoryType.accommodation, icon: "bed-outline" },
  { label: "Comida", value: BudgetCategoryType.food, icon: "restaurant-outline" },
  { label: "Actividades", value: BudgetCategoryType.activities, icon: "ticket-outline" },
  { label: "Compras", value: BudgetCategoryType.shopping, icon: "cart-outline" },
  { label: "Ocio", value: BudgetCategoryType.leisure, icon: "game-controller-outline" },
  { label: "Otro", value: BudgetCategoryType.other, icon: "ellipsis-horizontal-outline" },
];

// ==================== HELPER FUNCTIONS ====================

function parseCost(input: string): number | null {
  const s = (input || "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  if (!isFinite(n) || n < 0) return null;
  return n;
}

function parseIntNullable(value: string): number | null {
  const v = (value || "").trim();
  if (!v) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

function toLocalIsoMinute(d: Date) {
  const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function niceLocalLabel(d: Date | null) {
  if (!d) return "";
  try {
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return toLocalIsoMinute(d);
  }
}

// ==================== HELPER COMPONENTS ====================

function Field({
  label,
  value,
  onChange,
  placeholder,
  autoCapitalize,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 12, fontWeight: "800", color: UI.muted, letterSpacing: 0.4, marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={UI.muted2}
        autoCapitalize={autoCapitalize ?? "none"}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        style={{
          height: multiline ? 80 : 42,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: UI.border,
          paddingHorizontal: 12,
          paddingVertical: multiline ? 12 : 0,
          fontSize: 13,
          fontWeight: "700",
          color: UI.text,
          backgroundColor: "white",
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
    </View>
  );
}

function DateTimeField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: Date | null;
  onChange: (d: Date) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 12, fontWeight: "800", color: UI.muted, letterSpacing: 0.4, marginBottom: 6 }}>
        {label}
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          height: 42,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: UI.border,
          paddingHorizontal: 12,
          backgroundColor: "white",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: "700", color: value ? UI.text : UI.muted2 }}>
          {value ? niceLocalLabel(value) : placeholder || "Seleccionar"}
        </Text>
        <Ionicons name="calendar-outline" size={16} color={UI.muted} />
      </Pressable>

      <CrossPlatformDateTimePicker
        isVisible={open}
        date={value ?? new Date()}
        onConfirm={(d: Date) => {
          setOpen(false);
          onChange(d);
        }}
        onCancel={() => setOpen(false)}
        mode="datetime"
      />
    </View>
  );
}

function Row2({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
      {children}
    </View>
  );
}

function Segmented({
  value,
  onChange,
  items,
}: {
  value: string;
  onChange: (v: any) => void;
  items: Array<{ key: string; label: string }>;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        borderWidth: 1,
        borderColor: UI.border,
        borderRadius: 14,
        overflow: "hidden",
        backgroundColor: "white",
        marginBottom: 16,
      }}
    >
      {items.map((it) => {
        const active = it.key === value;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            style={{
              flex: 1,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: active ? UI.primary : "white",
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "900", color: active ? "white" : UI.text }}>
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SmallChoice({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        minWidth: 120,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: selected ? "rgba(15,23,42,0.35)" : UI.border,
        backgroundColor: selected ? UI.primary : "white",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
      }}
    >
      <Ionicons name={icon} size={16} color={selected ? "white" : UI.text} />
      <Text style={{ fontSize: 13, fontWeight: "800", color: selected ? "white" : UI.text }}>{label}</Text>
    </Pressable>
  );
}

function PrimaryButton({
  label,
  disabled,
  loading,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={{
        opacity: disabled || loading ? 0.45 : 1,
        height: 44,
        borderRadius: 14,
        backgroundColor: UI.primary,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
        flexDirection: "row",
        gap: 10,
      }}
    >
      {loading && <ActivityIndicator color="white" />}
      <Text style={{ fontSize: 13, fontWeight: "600", color: "white" }}>{label}</Text>
    </Pressable>
  );
}

// ==================== MAIN COMPONENT ====================

export default function TripPlanFormScreen({
  route,
  navigation,
}: TripPlanFormScreenProps) {
  const { tripId, planItem, presetType, presetDay } = route.params || {};
  const isEdit = !!planItem;

  // ==================== TAB STATE ====================

  const getInitialTab = (): MainTab => {
    if (presetType === "flight" || presetType === "transport" || presetType === "taxi") return "transport";
    if (presetType === "accommodation") return "accommodation";
    if (planItem?.type === "flight" || planItem?.type === "transport_destination" || planItem?.type === "transport_local") return "transport";
    if (planItem?.type === "accommodation") return "accommodation";
    return "activity";
  };

  const getInitialTransportTab = (): TransportSubTab => {
    if (presetType === "flight" || planItem?.type === "flight") return "flight";
    return "train";
  };

  const [mainTab, setMainTab] = useState<MainTab>(getInitialTab());
  const [transportTab, setTransportTab] = useState<TransportSubTab>(getInitialTransportTab());
  const [transportKind, setTransportKind] = useState<TransportKind>("principal");

  // ==================== FLIGHT STATE ====================

  const [flightEntryMode, setFlightEntryMode] = useState<FlightEntryMode>("manual");

  // Autofill inputs
  const [flightNumber, setFlightNumber] = useState("");
  const [flightDate, setFlightDate] = useState<Date | null>(null);

  // Manual inputs
  const [flightAirline, setFlightAirline] = useState(planItem?.flightDetails?.airlineName || "");
  const [flightFrom, setFlightFrom] = useState(planItem?.flightDetails?.fromIata || "");
  const [flightTo, setFlightTo] = useState(planItem?.flightDetails?.toIata || "");
  const [flightDep, setFlightDep] = useState<Date | null>(
    planItem?.flightDetails?.depAt ? new Date(planItem.flightDetails.depAt) : null
  );
  const [flightArr, setFlightArr] = useState<Date | null>(
    planItem?.flightDetails?.arrAt ? new Date(planItem.flightDetails.arrAt) : null
  );

  // ==================== TRANSPORT STATE (train/bus/car) ====================

  const [company, setCompany] = useState(planItem?.destinationTransport?.company || "");
  const [bookingRef, setBookingRef] = useState(planItem?.destinationTransport?.bookingRef || "");
  const [from, setFrom] = useState(planItem?.destinationTransport?.from || "");
  const [to, setTo] = useState(planItem?.destinationTransport?.to || "");
  const [dep, setDep] = useState<Date | null>(
    planItem?.destinationTransport?.depAt ? new Date(planItem.destinationTransport.depAt) : null
  );
  const [arr, setArr] = useState<Date | null>(
    planItem?.destinationTransport?.arrAt ? new Date(planItem.destinationTransport.arrAt) : null
  );

  // Shared cost
  const [costStr, setCostStr] = useState(
    planItem?.cost ? String(planItem.cost).replace(".", ",") : ""
  );
  const [currency, setCurrency] = useState("EUR");

  // ==================== ACCOMMODATION STATE ====================

  const [accName, setAccName] = useState(planItem?.accommodationDetails?.name || "");
  const [accAddress, setAccAddress] = useState(planItem?.accommodationDetails?.address || "");
  const [accCity, setAccCity] = useState(planItem?.accommodationDetails?.city || "");
  const [accCountry, setAccCountry] = useState(planItem?.accommodationDetails?.country || "");
  const [roomType, setRoomType] = useState<RoomType | null>(planItem?.accommodationDetails?.roomType || null);
  const [bathroomType, setBathroomType] = useState<BathroomType | null>(planItem?.accommodationDetails?.bathroomType || null);
  const [accCheckInAt, setAccCheckInAt] = useState<Date | null>(
    planItem?.accommodationDetails?.checkInAt ? new Date(planItem.accommodationDetails.checkInAt) : null
  );
  const [accCheckOutAt, setAccCheckOutAt] = useState<Date | null>(
    planItem?.accommodationDetails?.checkOutAt ? new Date(planItem.accommodationDetails.checkOutAt) : null
  );
  const [accGuestsStr, setAccGuestsStr] = useState(
    planItem?.accommodationDetails?.guests ? String(planItem.accommodationDetails.guests) : ""
  );
  const [accRoomsStr, setAccRoomsStr] = useState(
    planItem?.accommodationDetails?.rooms ? String(planItem.accommodationDetails.rooms) : ""
  );
  const [accBookingRef, setAccBookingRef] = useState(planItem?.accommodationDetails?.bookingRef || "");
  const [accPhone, setAccPhone] = useState(planItem?.accommodationDetails?.phone || "");
  const [accWebsite, setAccWebsite] = useState(planItem?.accommodationDetails?.website || "");
  const [accCostStr, setAccCostStr] = useState(
    planItem?.cost && planItem.type === "accommodation" ? String(planItem.cost).replace(".", ",") : ""
  );
  const [accCurrency, setAccCurrency] = useState("EUR");

  // ==================== ACTIVITY STATE ====================

  const [actType, setActType] = useState<TripPlanItemType>(
    planItem?.type && ACTIVITY_TYPES.find(t => t.value === planItem.type)
      ? planItem.type
      : TripPlanItemType.activity
  );
  const [actTitle, setActTitle] = useState(planItem?.title || "");
  const [actLocation, setActLocation] = useState(planItem?.location || "");
  const [actStartAt, setActStartAt] = useState<Date | null>(
    planItem?.startTime ? new Date(planItem.startTime) : presetDay ? new Date(`${presetDay}T09:00`) : null
  );
  const [actEndAt, setActEndAt] = useState<Date | null>(
    planItem?.endTime ? new Date(planItem.endTime) : null
  );
  const [actNotes, setActNotes] = useState(planItem?.notes || "");
  const [actCostStr, setActCostStr] = useState(
    planItem?.cost && planItem.type !== "accommodation" && planItem.type !== "flight"
      ? String(planItem.cost).replace(".", ",")
      : ""
  );
  const [actCurrency, setActCurrency] = useState("EUR");

  // ==================== EXPENSE STATE ====================

  const [expTitle, setExpTitle] = useState(planItem?.title || "");
  const [expAmountStr, setExpAmountStr] = useState(
    planItem?.cost ? String(planItem.cost).replace(".", ",") : ""
  );
  const [expCurrency, setExpCurrency] = useState("EUR");
  const [expCategory, setExpCategory] = useState<BudgetCategoryType>(BudgetCategoryType.other);
  const [expOccurredAt, setExpOccurredAt] = useState<Date | null>(
    planItem?.date ? new Date(planItem.date) : presetDay ? new Date(`${presetDay}T12:00`) : new Date()
  );
  const [expNotes, setExpNotes] = useState(planItem?.notes || "");

  // ==================== COMMON STATE ====================

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ==================== SAVE HANDLERS ====================

  const handleSaveFlight = async () => {
    if (!flightAirline.trim() || !flightFrom.trim() || !flightTo.trim()) {
      Alert.alert("Error", "Por favor completa los campos obligatorios");
      return;
    }

    setSaving(true);
    setErr(null);
    try {
      const payload = {
        tripId,
        type: TripPlanItemType.flight,
        cost: parseCost(costStr),
        currency,
        flightDetails: {
          provider: "manual",
          airlineName: flightAirline,
          flightNumber: flightNumber || null,
          fromIata: flightFrom,
          toIata: flightTo,
          depAt: flightDep?.toISOString() || null,
          arrAt: flightArr?.toISOString() || null,
        },
      };

      if (isEdit) {
        await api.put(`/trips/${tripId}/plan-items/${planItem.id}`, payload);
      } else {
        await api.post(`/trips/${tripId}/plan-items`, payload);
      }

      navigation.goBack();
    } catch (error: any) {
      console.error("Error saving flight:", error);
      setErr(error?.response?.data?.message || "No se pudo guardar el vuelo");
      Alert.alert("Error", "No se pudo guardar el vuelo");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTransport = async () => {
    if (!from.trim() || !to.trim()) {
      Alert.alert("Error", "Por favor completa origen y destino");
      return;
    }

    setSaving(true);
    setErr(null);
    try {
      const type = transportKind === "principal"
        ? TripPlanItemType.transport_destination
        : TripPlanItemType.transport_local;

      const payload = {
        tripId,
        type,
        cost: parseCost(costStr),
        currency,
        destinationTransport: {
          mode: transportTab === "car" ? "car" : transportTab === "bus" ? "bus" : "train",
          company: company || null,
          bookingRef: bookingRef || null,
          from,
          to,
          depAt: dep?.toISOString() || null,
          arrAt: arr?.toISOString() || null,
        },
      };

      if (isEdit) {
        await api.put(`/trips/${tripId}/plan-items/${planItem.id}`, payload);
      } else {
        await api.post(`/trips/${tripId}/plan-items`, payload);
      }

      navigation.goBack();
    } catch (error: any) {
      console.error("Error saving transport:", error);
      setErr(error?.response?.data?.message || "No se pudo guardar el transporte");
      Alert.alert("Error", "No se pudo guardar el transporte");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAccommodation = async () => {
    if (!accName.trim()) {
      Alert.alert("Error", "El nombre del alojamiento es obligatorio");
      return;
    }

    setSaving(true);
    setErr(null);
    try {
      const payload = {
        tripId,
        type: TripPlanItemType.accommodation,
        cost: parseCost(accCostStr),
        currency: accCurrency,
        accommodationDetails: {
          name: accName,
          address: accAddress || null,
          city: accCity || null,
          country: accCountry || null,
          roomType: roomType || null,
          bathroomType: bathroomType || null,
          checkInAt: accCheckInAt?.toISOString() || null,
          checkOutAt: accCheckOutAt?.toISOString() || null,
          guests: parseIntNullable(accGuestsStr),
          rooms: parseIntNullable(accRoomsStr),
          bookingRef: accBookingRef || null,
          phone: accPhone || null,
          website: accWebsite || null,
        },
        date: accCheckInAt?.toISOString() || null,
        endTime: accCheckOutAt?.toISOString() || null,
      };

      if (isEdit) {
        await api.put(`/trips/${tripId}/plan-items/${planItem.id}`, payload);
      } else {
        await api.post(`/trips/${tripId}/plan-items`, payload);
      }

      navigation.goBack();
    } catch (error: any) {
      console.error("Error saving accommodation:", error);
      setErr(error?.response?.data?.message || "No se pudo guardar el alojamiento");
      Alert.alert("Error", "No se pudo guardar el alojamiento");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveActivity = async () => {
    if (!actTitle.trim()) {
      Alert.alert("Error", "El título es obligatorio");
      return;
    }

    setSaving(true);
    setErr(null);
    try {
      const payload = {
        tripId,
        type: actType,
        title: actTitle,
        location: actLocation || null,
        startTime: actStartAt?.toISOString() || null,
        endTime: actEndAt?.toISOString() || null,
        notes: actNotes || null,
        cost: parseCost(actCostStr),
        currency: actCurrency,
      };

      if (isEdit) {
        await api.put(`/trips/${tripId}/plan-items/${planItem.id}`, payload);
      } else {
        await api.post(`/trips/${tripId}/plan-items`, payload);
      }

      navigation.goBack();
    } catch (error: any) {
      console.error("Error saving activity:", error);
      setErr(error?.response?.data?.message || "No se pudo guardar la actividad");
      Alert.alert("Error", "No se pudo guardar la actividad");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveExpense = async () => {
    if (!expTitle.trim()) {
      Alert.alert("Error", "El título es obligatorio");
      return;
    }

    const amount = parseCost(expAmountStr);
    if (amount === null || amount <= 0) {
      Alert.alert("Error", "El importe debe ser mayor a 0");
      return;
    }

    setSaving(true);
    setErr(null);
    try {
      const payload = {
        tripId,
        type: TripPlanItemType.expense,
        title: expTitle,
        cost: amount,
        currency: expCurrency,
        date: expOccurredAt?.toISOString() || new Date().toISOString(),
        notes: expNotes || null,
        expenseCategory: expCategory,
      };

      if (isEdit) {
        await api.put(`/trips/${tripId}/plan-items/${planItem.id}`, payload);
      } else {
        await api.post(`/trips/${tripId}/plan-items`, payload);
      }

      navigation.goBack();
    } catch (error: any) {
      console.error("Error saving expense:", error);
      setErr(error?.response?.data?.message || "No se pudo guardar el gasto");
      Alert.alert("Error", "No se pudo guardar el gasto");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (mainTab === "transport") {
      if (transportTab === "flight") {
        handleSaveFlight();
      } else {
        handleSaveTransport();
      }
    } else if (mainTab === "accommodation") {
      handleSaveAccommodation();
    } else if (mainTab === "activity") {
      handleSaveActivity();
    } else if (mainTab === "expense") {
      handleSaveExpense();
    }
  };

  // ==================== RENDER ====================

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      {/* HEADER */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "white",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
              borderWidth: 1,
              borderColor: UI.border,
            }}
          >
            <Ionicons name="close" size={20} color={UI.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: UI.text }}>
              {isEdit ? "Editar elemento" : "Nuevo elemento"}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: "600", color: UI.muted, marginTop: 2 }}>
              {mainTab === "transport" && "Añade transporte al viaje"}
              {mainTab === "accommodation" && "Añade alojamiento al viaje"}
              {mainTab === "activity" && "Añade una actividad al viaje"}
              {mainTab === "expense" && "Registra un gasto del viaje"}
            </Text>
          </View>
        </View>

        {/* MAIN TABS */}
        <View style={{ flexDirection: "row", gap: 4 }}>
          {[
            { key: "transport" as MainTab, label: "Transporte", icon: "airplane-outline" },
            { key: "accommodation" as MainTab, label: "Alojamiento", icon: "bed-outline" },
            { key: "activity" as MainTab, label: "Actividad", icon: "sparkles-outline" },
            { key: "expense" as MainTab, label: "Gasto", icon: "wallet-outline" },
          ].map((tab) => {
            const active = mainTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setMainTab(tab.key)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderBottomWidth: 3,
                  borderBottomColor: active ? UI.primary : "transparent",
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name={tab.icon as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color={active ? UI.primary : UI.muted2}
                  style={{ marginBottom: 4 }}
                />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: active ? "800" : "600",
                    color: active ? UI.primary : UI.muted,
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* CONTENT */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* TRANSPORT TAB */}
        {mainTab === "transport" && (
          <View>
            {/* Transport Subtabs */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16, marginTop: 8 }}>
              {[
                { key: "flight" as TransportSubTab, label: "Vuelo", icon: "airplane-outline" as keyof typeof Ionicons.glyphMap },
                { key: "train" as TransportSubTab, label: "Tren", icon: "train-outline" as keyof typeof Ionicons.glyphMap },
                { key: "bus" as TransportSubTab, label: "Bus", icon: "bus-outline" as keyof typeof Ionicons.glyphMap },
                { key: "car" as TransportSubTab, label: "Coche", icon: "car-sport-outline" as keyof typeof Ionicons.glyphMap },
              ].map((subtab) => (
                <SmallChoice
                  key={subtab.key}
                  icon={subtab.icon}
                  label={subtab.label}
                  selected={transportTab === subtab.key}
                  onPress={() => setTransportTab(subtab.key)}
                />
              ))}
            </View>

            {/* Flight Form */}
            {transportTab === "flight" && (
              <View>
                <Field
                  label="AEROLÍNEA *"
                  value={flightAirline}
                  onChange={setFlightAirline}
                  placeholder="Ej: Ryanair"
                  autoCapitalize="words"
                />

                <Row2>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="DESDE (IATA) *"
                      value={flightFrom}
                      onChange={setFlightFrom}
                      placeholder="MAD"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="HASTA (IATA) *"
                      value={flightTo}
                      onChange={setFlightTo}
                      placeholder="BCN"
                    />
                  </View>
                </Row2>

                <Row2>
                  <View style={{ flex: 1 }}>
                    <DateTimeField
                      label="SALIDA"
                      value={flightDep}
                      onChange={setFlightDep}
                      placeholder="Seleccionar"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <DateTimeField
                      label="LLEGADA"
                      value={flightArr}
                      onChange={setFlightArr}
                      placeholder="Seleccionar"
                    />
                  </View>
                </Row2>

                <Field
                  label="NÚMERO DE VUELO"
                  value={flightNumber}
                  onChange={setFlightNumber}
                  placeholder="Ej: FR1234"
                />

                <Row2>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="COSTE"
                      value={costStr}
                      onChange={setCostStr}
                      placeholder="0,00"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="MONEDA"
                      value={currency}
                      onChange={setCurrency}
                      placeholder="EUR"
                    />
                  </View>
                </Row2>
              </View>
            )}

            {/* Train/Bus/Car Form */}
            {transportTab !== "flight" && (
              <View>
                <Segmented
                  value={transportKind}
                  onChange={setTransportKind}
                  items={[
                    { key: "principal", label: "Al Destino" },
                    { key: "local", label: "Local" },
                  ]}
                />

                <Field
                  label="COMPAÑÍA"
                  value={company}
                  onChange={setCompany}
                  placeholder={`Ej: ${transportTab === "train" ? "Renfe" : transportTab === "bus" ? "Alsa" : "Uber"}`}
                  autoCapitalize="words"
                />

                <Row2>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="DESDE *"
                      value={from}
                      onChange={setFrom}
                      placeholder="Madrid"
                      autoCapitalize="words"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="HASTA *"
                      value={to}
                      onChange={setTo}
                      placeholder="Barcelona"
                      autoCapitalize="words"
                    />
                  </View>
                </Row2>

                <Row2>
                  <View style={{ flex: 1 }}>
                    <DateTimeField
                      label="SALIDA"
                      value={dep}
                      onChange={setDep}
                      placeholder="Seleccionar"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <DateTimeField
                      label="LLEGADA"
                      value={arr}
                      onChange={setArr}
                      placeholder="Seleccionar"
                    />
                  </View>
                </Row2>

                <Field
                  label="REFERENCIA RESERVA"
                  value={bookingRef}
                  onChange={setBookingRef}
                  placeholder="Ej: ABC123"
                />

                <Row2>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="COSTE"
                      value={costStr}
                      onChange={setCostStr}
                      placeholder="0,00"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="MONEDA"
                      value={currency}
                      onChange={setCurrency}
                      placeholder="EUR"
                    />
                  </View>
                </Row2>
              </View>
            )}
          </View>
        )}

        {/* ACCOMMODATION TAB */}
        {mainTab === "accommodation" && (
          <View style={{ marginTop: 8 }}>
            <Field
              label="NOMBRE *"
              value={accName}
              onChange={setAccName}
              placeholder="Ej: Hotel Ritz"
              autoCapitalize="words"
            />

            <Field
              label="DIRECCIÓN"
              value={accAddress}
              onChange={setAccAddress}
              placeholder="Calle Principal 123"
              autoCapitalize="words"
            />

            <Row2>
              <View style={{ flex: 1 }}>
                <Field
                  label="CIUDAD"
                  value={accCity}
                  onChange={setAccCity}
                  placeholder="Madrid"
                  autoCapitalize="words"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="PAÍS"
                  value={accCountry}
                  onChange={setAccCountry}
                  placeholder="España"
                  autoCapitalize="words"
                />
              </View>
            </Row2>

            <Row2>
              <View style={{ flex: 1 }}>
                <DateTimeField
                  label="CHECK-IN"
                  value={accCheckInAt}
                  onChange={setAccCheckInAt}
                  placeholder="Seleccionar"
                />
              </View>
              <View style={{ flex: 1 }}>
                <DateTimeField
                  label="CHECK-OUT"
                  value={accCheckOutAt}
                  onChange={setAccCheckOutAt}
                  placeholder="Seleccionar"
                />
              </View>
            </Row2>

            <Row2>
              <View style={{ flex: 1 }}>
                <Field
                  label="HUÉSPEDES"
                  value={accGuestsStr}
                  onChange={setAccGuestsStr}
                  placeholder="2"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="HABITACIONES"
                  value={accRoomsStr}
                  onChange={setAccRoomsStr}
                  placeholder="1"
                />
              </View>
            </Row2>

            <Field
              label="REFERENCIA RESERVA"
              value={accBookingRef}
              onChange={setAccBookingRef}
              placeholder="Ej: BKG123456"
            />

            <Row2>
              <View style={{ flex: 1 }}>
                <Field
                  label="COSTE TOTAL"
                  value={accCostStr}
                  onChange={setAccCostStr}
                  placeholder="0,00"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="MONEDA"
                  value={accCurrency}
                  onChange={setAccCurrency}
                  placeholder="EUR"
                />
              </View>
            </Row2>
          </View>
        )}

        {/* ACTIVITY TAB */}
        {mainTab === "activity" && (
          <View style={{ marginTop: 8 }}>
            {/* Activity Type Selector */}
            <Text style={{ fontSize: 12, fontWeight: "800", color: UI.muted, letterSpacing: 0.4, marginBottom: 10 }}>
              TIPO DE ACTIVIDAD
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {ACTIVITY_TYPES.map((type) => {
                const active = actType === type.value;
                return (
                  <TouchableOpacity
                    key={type.value}
                    onPress={() => setActType(type.value)}
                    style={{
                      width: "23%",
                      aspectRatio: 1,
                      borderRadius: 14,
                      backgroundColor: active ? UI.primary : "white",
                      borderWidth: 1,
                      borderColor: active ? UI.primary : UI.border,
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 8,
                    }}
                  >
                    <Ionicons
                      name={type.icon}
                      size={24}
                      color={active ? "white" : UI.text}
                      style={{ marginBottom: 4 }}
                    />
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "700",
                        color: active ? "white" : UI.muted,
                        textAlign: "center",
                      }}
                      numberOfLines={1}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Field
              label="TÍTULO *"
              value={actTitle}
              onChange={setActTitle}
              placeholder="Ej: Visita al Museo del Prado"
              autoCapitalize="sentences"
            />

            <Field
              label="UBICACIÓN"
              value={actLocation}
              onChange={setActLocation}
              placeholder="Ej: Paseo del Prado, Madrid"
              autoCapitalize="words"
            />

            <Row2>
              <View style={{ flex: 1 }}>
                <DateTimeField
                  label="INICIO"
                  value={actStartAt}
                  onChange={setActStartAt}
                  placeholder="Seleccionar"
                />
              </View>
              <View style={{ flex: 1 }}>
                <DateTimeField
                  label="FIN"
                  value={actEndAt}
                  onChange={setActEndAt}
                  placeholder="Seleccionar"
                />
              </View>
            </Row2>

            <Field
              label="NOTAS"
              value={actNotes}
              onChange={setActNotes}
              placeholder="Añade detalles, horarios, recordatorios..."
              multiline
            />

            <Row2>
              <View style={{ flex: 1 }}>
                <Field
                  label="COSTE"
                  value={actCostStr}
                  onChange={setActCostStr}
                  placeholder="0,00"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="MONEDA"
                  value={actCurrency}
                  onChange={setActCurrency}
                  placeholder="EUR"
                />
              </View>
            </Row2>
          </View>
        )}

        {/* EXPENSE TAB */}
        {mainTab === "expense" && (
          <View style={{ marginTop: 8 }}>
            <Field
              label="CONCEPTO *"
              value={expTitle}
              onChange={setExpTitle}
              placeholder="Ej: Cena en restaurante"
              autoCapitalize="sentences"
            />

            <Row2>
              <View style={{ flex: 1 }}>
                <Field
                  label="IMPORTE *"
                  value={expAmountStr}
                  onChange={setExpAmountStr}
                  placeholder="0,00"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="MONEDA"
                  value={expCurrency}
                  onChange={setExpCurrency}
                  placeholder="EUR"
                />
              </View>
            </Row2>

            {/* Category */}
            <Text style={{ fontSize: 12, fontWeight: "800", color: UI.muted, letterSpacing: 0.4, marginBottom: 10 }}>
              CATEGORÍA
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {EXPENSE_CATEGORIES.map((cat) => {
                const active = expCategory === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    onPress={() => setExpCategory(cat.value)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 12,
                      backgroundColor: active ? UI.primary : "white",
                      borderWidth: 1,
                      borderColor: active ? UI.primary : UI.border,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={16}
                      color={active ? "white" : UI.text}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: active ? "white" : UI.text,
                      }}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <DateTimeField
              label="FECHA"
              value={expOccurredAt}
              onChange={setExpOccurredAt}
              placeholder="Seleccionar fecha"
            />

            <Field
              label="NOTAS"
              value={expNotes}
              onChange={setExpNotes}
              placeholder="Añade detalles adicionales..."
              multiline
            />
          </View>
        )}
      </ScrollView>

      {/* SAVE BUTTON */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          backgroundColor: "white",
          borderTopWidth: 1,
          borderTopColor: UI.border,
        }}
      >
        <PrimaryButton
          label={isEdit ? "Guardar cambios" : "Crear elemento"}
          loading={saving}
          disabled={saving}
          onPress={handleSave}
        />
      </View>
    </SafeAreaView>
  );
}
