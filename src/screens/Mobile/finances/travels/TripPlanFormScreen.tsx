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
  Modal,
  FlatList,
  Image,
  useWindowDimensions,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from "../../../../api/api";
import { colors } from "../../../../theme/theme";
import { TripPlanItemType, BudgetCategoryType, RoomType, BathroomType } from "../../../../types/enums/travel";
import CrossPlatformDateTimePicker from "../../../../components/CrossPlatformDateTimePicker";
import { toEur, COMMON_CURRENCIES } from "../../../../utils/exchangeRate";
import { pickAndUploadAccommodationCover } from "../../../../utils/uploadTripCover";
import { pickAndUploadTripAttachments, UploadedTripAttachment } from "../../../../utils/uploadTripAttachments";
import { VisitStop, VisitStopType, VISIT_STOP_TYPES } from "./components/TripPlanningSection";

// ==================== TYPES ====================

type MainTab = "transport" | "accommodation" | "activity" | "expense" | "visit";
type TransportSubTab = "flight" | "train" | "bus" | "car" | "ferry";
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

type PlanAttachment = UploadedTripAttachment & {
  id?: number;
};

// ==================== CONSTANTS ====================

const UI = {
  text: "#0B1220",
  muted: "#64748B",
  muted2: "#94A3B8",
  border: "rgba(226,232,240,0.95)",
  primary: colors.primary,
};

const ACTIVITY_TYPES: ActivityType[] = [
  { label: "Museo",      value: TripPlanItemType.museum,     icon: "color-palette-outline" },
  { label: "Monumento",  value: TripPlanItemType.monument,   icon: "business-outline" },
  { label: "Mirador",    value: TripPlanItemType.viewpoint,  icon: "eye-outline" },
  { label: "Free Tour",  value: TripPlanItemType.free_tour,  icon: "walk-outline" },
  { label: "Concierto",  value: TripPlanItemType.concert,    icon: "musical-notes-outline" },
  { label: "Fiesta",     value: TripPlanItemType.bar_party,  icon: "wine-outline" },
  { label: "Playa",      value: TripPlanItemType.beach,      icon: "sunny-outline" },
  { label: "Restaurante",value: TripPlanItemType.restaurant, icon: "restaurant-outline" },
  { label: "Compras",    value: TripPlanItemType.shopping,   icon: "cart-outline" },
  { label: "Otro",       value: TripPlanItemType.other,      icon: "sparkles-outline" },
];

const EXPENSE_CATEGORIES = [
  { label: "Transporte",  value: BudgetCategoryType.transport_local, icon: "car-outline" },
  { label: "Alojamiento", value: BudgetCategoryType.accommodation,   icon: "bed-outline" },
  { label: "Comida",      value: BudgetCategoryType.food,            icon: "restaurant-outline" },
  { label: "Actividades", value: BudgetCategoryType.activities,      icon: "ticket-outline" },
  { label: "Compras",     value: BudgetCategoryType.shopping,        icon: "cart-outline" },
  { label: "Ocio",        value: BudgetCategoryType.leisure,         icon: "game-controller-outline" },
  { label: "Otro",        value: BudgetCategoryType.other,           icon: "ellipsis-horizontal-outline" },
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
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad" | "url" | "decimal-pad";
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
        keyboardType={keyboardType ?? "default"}
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
        onConfirm={(d: Date) => { setOpen(false); onChange(d); }}
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
  emoji,
  label,
  selected,
  onPress,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  emoji?: string;
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
      {emoji
        ? <Text style={{ fontSize: 16, lineHeight: 19 }}>{emoji}</Text>
        : icon ? <Ionicons name={icon} size={16} color={selected ? "white" : UI.text} /> : null
      }
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
        height: 48,
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
      <Text style={{ fontSize: 15, fontWeight: "700", color: "white" }}>{label}</Text>
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
    if (presetType === "expense") return "expense";
    if (presetType === "visit") return "visit";
    if (planItem?.type === "flight" || planItem?.type === "transport_destination" || planItem?.type === "transport_local") return "transport";
    if (planItem?.type === "accommodation") return "accommodation";
    if (planItem?.type === "expense") return "expense";
    if (planItem?.type === "visit") return "visit";
    return "activity";
  };

  const getInitialTransportTab = (): TransportSubTab => {
    if (presetType === "flight" || planItem?.type === "flight") return "flight";
    const mode = planItem?.destinationTransport?.mode;
    if (mode === "car") return "car";
    if (mode === "bus") return "bus";
    if (mode === "ferry") return "ferry";
    return "train";
  };

  const [mainTab, setMainTab] = useState<MainTab>(getInitialTab());
  const [transportTab, setTransportTab] = useState<TransportSubTab>(getInitialTransportTab());
  const [transportKind, setTransportKind] = useState<TransportKind>(
    planItem?.type === TripPlanItemType.transport_local ? "local" : "principal"
  );

  // ==================== FLIGHT STATE ====================

  // Parse "VY6600 · BCN → PMO" or "BCN → PMO" as fallback when flightDetails fields are missing
  const parsedFlightTitle = (() => {
    const t: string = planItem?.title || "";
    const withNum = t.match(/^([A-Z0-9]{2,8})\s*[·•]\s*([A-Z]{3})\s*[→>-]+\s*([A-Z]{3})/);
    if (withNum) return { num: withNum[1], from: withNum[2], to: withNum[3] };
    const simple = t.match(/([A-Z]{3})\s*[→>-]+\s*([A-Z]{3})/);
    if (simple) return { num: "", from: simple[1], to: simple[2] };
    return { num: "", from: "", to: "" };
  })();

  const fd = planItem?.flightDetails;
  const [flightEntryMode, setFlightEntryMode] = useState<FlightEntryMode>("manual");
  const [flightNumber, setFlightNumber] = useState(
    (fd as any)?.flightNumberRaw || (fd as any)?.flightNumber || parsedFlightTitle.num
  );
  const [flightDate, setFlightDate] = useState<Date | null>(null);
  const [flightAirline, setFlightAirline] = useState(fd?.airlineName || "");
  const [flightFrom, setFlightFrom] = useState(fd?.fromIata || planItem?.location || parsedFlightTitle.from);
  const [flightTo, setFlightTo] = useState(fd?.toIata || parsedFlightTitle.to);
  const [flightDep, setFlightDep] = useState<Date | null>(() => {
    const raw = (fd as any)?.depAt || planItem?.startAt || (planItem as any)?.startTime || null;
    return raw ? new Date(raw) : null;
  });
  const [flightArr, setFlightArr] = useState<Date | null>(() => {
    const raw = (fd as any)?.arrAt || planItem?.endAt || (planItem as any)?.endTime || null;
    return raw ? new Date(raw) : null;
  });
  const [flightGate, setFlightGate] = useState((fd as any)?.gate || "");
  const [flightSeat, setFlightSeat] = useState((fd as any)?.seat || "");
  const [flightBookingRef, setFlightBookingRef] = useState((fd as any)?.bookingRef || "");

  // ==================== TRANSPORT STATE (train/bus/car) ====================

  const [company, setCompany] = useState(planItem?.destinationTransport?.company || "");
  const [bookingRef, setBookingRef] = useState(planItem?.destinationTransport?.bookingRef || "");
  const [from, setFrom] = useState(planItem?.destinationTransport?.fromName || "");
  const [to, setTo] = useState(planItem?.destinationTransport?.toName || "");
  const [dep, setDep] = useState<Date | null>(
    planItem?.destinationTransport?.depAt ? new Date(planItem.destinationTransport.depAt) : null
  );
  const [arr, setArr] = useState<Date | null>(
    planItem?.destinationTransport?.arrAt ? new Date(planItem.destinationTransport.arrAt) : null
  );
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
  const [accCoverImageUrl, setAccCoverImageUrl] = useState<string | null>(
    planItem?.accommodationDetails?.coverImageUrl || null
  );
  const [uploadingAccCover, setUploadingAccCover] = useState(false);
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
  const [actCostStr, setActCostStr] = useState(
    planItem?.cost && planItem.type !== "accommodation" && planItem.type !== "flight"
      ? String(planItem.cost).replace(".", ",")
      : ""
  );
  const [actCurrency, setActCurrency] = useState("EUR");

  // ==================== VISIT STATE ====================

  const [visitTitle, setVisitTitle] = useState(planItem?.title || "");
  const [visitLocation, setVisitLocation] = useState(planItem?.location || "");
  const [visitStartAt, setVisitStartAt] = useState<Date | null>(
    planItem?.startAt ? new Date(planItem.startAt) : presetDay ? new Date(`${presetDay}T09:00`) : null
  );
  const [visitEndAt, setVisitEndAt] = useState<Date | null>(
    planItem?.endAt ? new Date(planItem.endAt) : null
  );
  const [visitStops, setVisitStops] = useState<VisitStop[]>(
    planItem?.metadata?.stops ?? []
  );
  const [visitReordering, setVisitReordering] = useState(false);
  const [visitNewStopLabel, setVisitNewStopLabel] = useState("");
  const [visitNewStopType, setVisitNewStopType] = useState<VisitStopType>("otro");
  const [visitAddingStop, setVisitAddingStop] = useState(false);

  // ==================== EXPENSE STATE ====================

  const [expTitle, setExpTitle] = useState(planItem?.title || "");
  const [expAmountStr, setExpAmountStr] = useState(
    planItem?.cost ? String(planItem.cost).replace(".", ",") : ""
  );
  const [expCurrency, setExpCurrency] = useState(planItem?.currency || "EUR");
  const [expCategory, setExpCategory] = useState<BudgetCategoryType>(
    (planItem?.metadata?.expenseCategory as BudgetCategoryType) ?? BudgetCategoryType.other
  );
  const [expOccurredAt, setExpOccurredAt] = useState<Date | null>(
    planItem?.date ? new Date(planItem.date) : presetDay ? new Date(`${presetDay}T12:00`) : new Date()
  );
  const [expEurPreview, setExpEurPreview] = useState<number | null>(null);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);

  useEffect(() => {
    const amount = parseCost(expAmountStr);
    if (!amount || expCurrency === "EUR") { setExpEurPreview(null); return; }
    let cancelled = false;
    toEur(amount, expCurrency).then((v) => { if (!cancelled) setExpEurPreview(v); });
    return () => { cancelled = true; };
  }, [expAmountStr, expCurrency]);

  const handleAddAttachments = async () => {
    try {
      setUploadingAttachments(true);
      const uploaded = await pickAndUploadTripAttachments();
      if (uploaded.length > 0) {
        setPlanAttachments((prev) => [...prev, ...uploaded]);
      }
    } catch (error) {
      console.error("Error subiendo adjuntos", error);
      Alert.alert("Error", "No se pudieron subir los archivos");
    } finally {
      setUploadingAttachments(false);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setPlanAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOpenAttachment = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Error", "No se pudo abrir el archivo");
    }
  };

  // ==================== COMMON STATE ====================

  const [planNotes, setPlanNotes] = useState(planItem?.notes || "");
  const [planAttachments, setPlanAttachments] = useState<PlanAttachment[]>(
    ((planItem as any)?.attachments ?? []).map((file: any) => ({
      id: file.id,
      kind: file.kind,
      url: file.url,
      filename: file.filename ?? null,
      mimeType: file.mimeType ?? null,
      sizeBytes: file.sizeBytes ?? null,
      metadata: file.metadata ?? null,
    }))
  );
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Un "gasto pendiente" (creado desde una transacción sin clasificar) todavía
  // no tiene un tipo real elegido — aunque venga como planItem (edición), se
  // debe mostrar el selector de tipo igualmente para que el usuario lo elija.
  const isPendingReclass = isEdit && !!(planItem as any)?.metadata?.pending;
  const [step, setStep] = useState<"pick" | "form">((isEdit && !isPendingReclass) || presetType ? "form" : "pick");

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
        title: `${flightFrom} → ${flightTo}`,
        notes: planNotes.trim() || null,
        attachments: planAttachments.map(({ id, ...file }) => file),
        cost: parseCost(costStr),
        currency,
        startAt: flightDep?.toISOString() || null,
        endAt: flightArr?.toISOString() || null,
        day: flightDep ? flightDep.toISOString().slice(0, 10) : null,
        flightDetails: {
          provider: "manual",
          airlineName: flightAirline,
          flightNumberRaw: flightNumber || null,
          fromIata: flightFrom,
          toIata: flightTo,
          depAt: flightDep?.toISOString() || null,
          arrAt: flightArr?.toISOString() || null,
          gate: flightGate || null,
          seat: flightSeat || null,
          bookingRef: flightBookingRef || null,
        },
      };
      if (isEdit) {
        await api.patch(`/trips/${tripId}/plan-items/${planItem.id}`, payload);
      } else {
        await api.post(`/trips/${tripId}/plan-items`, payload);
      }
      navigation.goBack();
    } catch (error: any) {
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
        title: `${from} → ${to}`,
        notes: planNotes.trim() || null,
        attachments: planAttachments.map(({ id, ...file }) => file),
        cost: parseCost(costStr),
        currency,
        startAt: dep?.toISOString() || null,
        endAt: arr?.toISOString() || null,
        day: dep ? dep.toISOString().slice(0, 10) : null,
        destinationTransportDetails: {
          mode: transportTab === "car" ? "car" : transportTab === "bus" ? "bus" : transportTab === "ferry" ? "ferry" : "train",
          company: company || null,
          bookingRef: bookingRef || null,
          fromName: from,
          toName: to,
          depAt: dep?.toISOString() || null,
          arrAt: arr?.toISOString() || null,
        },
      };
      if (isEdit) {
        await api.patch(`/trips/${tripId}/plan-items/${planItem.id}`, payload);
      } else {
        await api.post(`/trips/${tripId}/plan-items`, payload);
      }
      navigation.goBack();
    } catch (error: any) {
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
        title: accName,
        notes: planNotes.trim() || null,
        attachments: planAttachments.map(({ id, ...file }) => file),
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
          coverImageUrl: accCoverImageUrl || null,
        },
        date: accCheckInAt?.toISOString() || null,
        endTime: accCheckOutAt?.toISOString() || null,
      };
      if (isEdit) {
        await api.patch(`/trips/${tripId}/plan-items/${planItem.id}`, payload);
      } else {
        await api.post(`/trips/${tripId}/plan-items`, payload);
      }
      navigation.goBack();
    } catch (error: any) {
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
        notes: planNotes.trim() || null,
        attachments: planAttachments.map(({ id, ...file }) => file),
        cost: parseCost(actCostStr),
        currency: actCurrency,
      };
      if (isEdit) {
        await api.patch(`/trips/${tripId}/plan-items/${planItem.id}`, payload);
      } else {
        await api.post(`/trips/${tripId}/plan-items`, payload);
      }
      navigation.goBack();
    } catch (error: any) {
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
        notes: planNotes.trim() || null,
        attachments: planAttachments.map(({ id, ...file }) => file),
        metadata: { expenseCategory: expCategory },
      };
      if (isEdit) {
        await api.patch(`/trips/${tripId}/plan-items/${planItem.id}`, payload);
      } else {
        await api.post(`/trips/${tripId}/plan-items`, payload);
      }
      navigation.goBack();
    } catch (error: any) {
      setErr(error?.response?.data?.message || "No se pudo guardar el gasto");
      Alert.alert("Error", "No se pudo guardar el gasto");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVisit = async () => {
    if (!visitTitle.trim()) {
      Alert.alert("Error", "El título de la visita es obligatorio");
      return;
    }
    if (visitStops.length === 0) {
      Alert.alert("Error", "Añade al menos una parada");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        tripId,
        type: TripPlanItemType.visit,
        title: visitTitle,
        location: visitLocation.trim() || null,
        notes: planNotes.trim() || null,
        attachments: planAttachments.map(({ id, ...file }) => file),
        startAt: visitStartAt?.toISOString() || null,
        endAt: visitEndAt?.toISOString() || null,
        day: visitStartAt ? visitStartAt.toISOString().slice(0, 10) : presetDay || null,
        metadata: { stops: visitStops },
      };
      if (isEdit) {
        await api.patch(`/trips/${tripId}/plan-items/${planItem.id}`, payload);
      } else {
        await api.post(`/trips/${tripId}/plan-items`, payload);
      }
      navigation.goBack();
    } catch (error: any) {
      setErr(error?.response?.data?.message || "No se pudo guardar la visita");
      Alert.alert("Error", "No se pudo guardar la visita");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!planItem?.id) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!planItem?.id) return;
    try {
      setDeleting(true);
      await api.delete(`/trips/${tripId}/plan-items/${planItem.id}`);
      navigation.goBack();
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
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
    } else if (mainTab === "visit") {
      handleSaveVisit();
    }
  };

  // ==================== RENDER ====================

  const { width: screenWidth } = useWindowDimensions();

  const dayLabel = (() => {
    if (!presetDay) return null;
    const d = new Date(`${presetDay}T00:00:00`);
    if (isNaN(d.getTime())) return null;
    const weekday = d.toLocaleDateString("es-ES", { weekday: "short" });
    const dd = d.toLocaleDateString("es-ES", { day: "2-digit" });
    const month = d.toLocaleDateString("es-ES", { month: "short" });
    return `${weekday[0].toUpperCase()}${weekday.slice(1)} ${dd} ${month}`;
  })();

  const TYPE_CARDS = [
    { key: "transport" as MainTab,     emoji: "✈️",  label: "Transporte",  subtitle: "Vuelo, tren, bus, coche..." },
    { key: "accommodation" as MainTab, emoji: "🏨",  label: "Alojamiento", subtitle: "Hotel, apartamento, hostal..." },
    { key: "activity" as MainTab,      emoji: "🎭",  label: "Actividad",   subtitle: "Museo, playa, tour, restaurante..." },
    { key: "expense" as MainTab,       emoji: "💰",  label: "Gasto",       subtitle: "Un gasto suelto sin actividad" },
    { key: "visit" as MainTab,         emoji: "🚶",  label: "Visitar",     subtitle: 'Varias paradas a pie, tipo "Visitar Palermo"' },
  ];

  const FORM_LABELS: Record<MainTab, { title: string; saveLabel: string }> = {
    transport:     { title: "Transporte",  saveLabel: "Guardar transporte"  },
    accommodation: { title: "Alojamiento", saveLabel: "Guardar alojamiento" },
    activity:      { title: "Actividad",   saveLabel: "Guardar actividad"   },
    expense:       { title: "Gasto",       saveLabel: "Guardar gasto"       },
    visit:         { title: "Visitar",     saveLabel: "Guardar visita"      },
  };

  const TRANSPORT_TABS = [
    { key: "flight" as TransportSubTab, label: "Vuelo",  emoji: "✈️" },
    { key: "train"  as TransportSubTab, label: "Tren",   emoji: "🚂" },
    { key: "bus"    as TransportSubTab, label: "Bus",    emoji: "🚌" },
    { key: "car"    as TransportSubTab, label: "Coche",  emoji: "🚗" },
    { key: "ferry"  as TransportSubTab, label: "Barco",  emoji: "⛴️" },
  ];

  const ACTIVITY_TYPES_EMOJI = [
    { label: "Monumento",   value: TripPlanItemType.monument,   emoji: "🏛️" },
    { label: "Museo",       value: TripPlanItemType.museum,     emoji: "🎨" },
    { label: "Playa",       value: TripPlanItemType.beach,      emoji: "🏖️" },
    { label: "Restaurante", value: TripPlanItemType.restaurant, emoji: "🍽️" },
    { label: "Free Tour",   value: TripPlanItemType.free_tour,  emoji: "🚶" },
    { label: "Concierto",   value: TripPlanItemType.concert,    emoji: "🎵" },
    { label: "Compras",     value: TripPlanItemType.shopping,   emoji: "🛍️" },
    { label: "Mirador",     value: TripPlanItemType.viewpoint,  emoji: "🔭" },
    { label: "Otro",        value: TripPlanItemType.other,      emoji: "✨" },
  ];

  const EXPENSE_CATS_EMOJI = [
    { label: "Transporte",  value: BudgetCategoryType.transport_local, emoji: "🚗" },
    { label: "Alojamiento", value: BudgetCategoryType.accommodation,   emoji: "🏨" },
    { label: "Comida",      value: BudgetCategoryType.food,            emoji: "🍽️" },
    { label: "Actividades", value: BudgetCategoryType.activities,      emoji: "🎟️" },
    { label: "Compras",     value: BudgetCategoryType.shopping,        emoji: "🛍️" },
    { label: "Ocio",        value: BudgetCategoryType.leisure,         emoji: "🎉" },
    { label: "Otro",        value: BudgetCategoryType.other,           emoji: "···" },
  ];

  // ── PICK STEP ──────────────────────────────────────────────────────────────
  if (step === "pick") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: "900", color: UI.text }}>Nuevo elemento</Text>
            {dayLabel && (
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary, marginTop: 3 }}>{dayLabel}</Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="close" size={18} color={UI.text} />
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          {TYPE_CARDS.map((card) => (
            <Pressable
              key={card.key}
              onPress={() => { setMainTab(card.key); setStep("form"); }}
              style={({ pressed }) => ({
                flexDirection: "row", alignItems: "center",
                backgroundColor: pressed ? "#F8FAFC" : "white",
                borderRadius: 16, borderWidth: 1, borderColor: UI.border,
                padding: 14, gap: 12,
              })}
            >
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 22 }}>{card.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "800", color: UI.text }}>{card.label}</Text>
                <Text style={{ fontSize: 12, color: UI.muted, marginTop: 1 }}>{card.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={UI.muted2} />
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  // ── FORM STEP ──────────────────────────────────────────────────────────────
  const formInfo = FORM_LABELS[mainTab];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      {/* FORM HEADER */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: UI.border }}>
        <TouchableOpacity
          onPress={() => ((isEdit && !isPendingReclass) ? navigation.goBack() : setStep("pick"))}
          style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginRight: 4 }}
        >
          <Ionicons name="chevron-back" size={22} color={UI.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: "800", color: UI.text }}>{formInfo.title}</Text>
        {isEdit && (
          <TouchableOpacity onPress={handleDelete} style={{ padding: 8 }}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* TRANSPORT */}
        {mainTab === "transport" && (
          <View>
            {/* Al destino / Local toggle */}
            <View style={{ flexDirection: "row", backgroundColor: "#F1F5F9", borderRadius: 12, padding: 3, marginBottom: 20 }}>
              {([
                { key: "principal" as TransportKind, label: "Al destino" },
                { key: "local"     as TransportKind, label: "Local"      },
              ]).map((k) => {
                const active = transportKind === k.key;
                return (
                  <Pressable
                    key={k.key}
                    onPress={() => setTransportKind(k.key)}
                    style={{ flex: 1, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: active ? colors.primary : "transparent" }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "800", color: active ? "white" : UI.muted }}>{k.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Transport sub-tabs — grid sin scroll */}
            {(() => {
              const gap = 8;
              const cols = TRANSPORT_TABS.length;
              const itemW = (screenWidth - 40 - gap * (cols - 1)) / cols;
              return (
                <View style={{ flexDirection: "row", gap, marginBottom: 20 }}>
                  {TRANSPORT_TABS.map((t) => {
                    const active = transportTab === t.key;
                    return (
                      <Pressable
                        key={t.key}
                        onPress={() => setTransportTab(t.key)}
                        style={{ width: itemW, height: itemW, borderRadius: 14, borderWidth: 1.5,
                          borderColor: active ? colors.primary : UI.border,
                          backgroundColor: active ? colors.primary : "white",
                          alignItems: "center", justifyContent: "center", gap: 3 }}
                      >
                        <Text style={{ fontSize: 20, lineHeight: 24 }}>{t.emoji}</Text>
                        <Text style={{ fontSize: 10, fontWeight: "800", color: active ? "white" : UI.text, textAlign: "center" }}>{t.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })()}

            {/* DESDE → HASTA */}
            <View style={{ flexDirection: "row", alignItems: "flex-end", marginBottom: 20, gap: 8 }}>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontSize: 10, fontWeight: "900", color: UI.muted, letterSpacing: 1, marginBottom: 6 }}>DESDE</Text>
                <TextInput
                  value={transportTab === "flight" ? flightFrom : from}
                  onChangeText={transportTab === "flight" ? setFlightFrom : setFrom}
                  placeholder={transportTab === "flight" ? "BCN" : "Origen"}
                  placeholderTextColor={UI.muted2}
                  autoCapitalize={transportTab === "flight" ? "characters" : "words"}
                  maxLength={transportTab === "flight" ? 3 : undefined}
                  style={{ fontSize: transportTab === "flight" ? 32 : 18, fontWeight: "900", color: UI.text, textAlign: "center", letterSpacing: transportTab === "flight" ? 2 : 0, borderBottomWidth: 2, borderBottomColor: UI.border, paddingBottom: 6, width: "100%" } as any}
                />
              </View>
              <View style={{ alignItems: "center", paddingBottom: 10 }}>
                <Text style={{ fontSize: 18 }}>
                  {transportTab === "flight" ? "✈️" : transportTab === "train" ? "🚂" : transportTab === "bus" ? "🚌" : transportTab === "ferry" ? "⛴️" : "🚗"}
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontSize: 10, fontWeight: "900", color: UI.muted, letterSpacing: 1, marginBottom: 6 }}>HASTA</Text>
                <TextInput
                  value={transportTab === "flight" ? flightTo : to}
                  onChangeText={transportTab === "flight" ? setFlightTo : setTo}
                  placeholder={transportTab === "flight" ? "PMO" : "Destino"}
                  placeholderTextColor={UI.muted2}
                  autoCapitalize={transportTab === "flight" ? "characters" : "words"}
                  maxLength={transportTab === "flight" ? 3 : undefined}
                  style={{ fontSize: transportTab === "flight" ? 32 : 18, fontWeight: "900", color: UI.text, textAlign: "center", letterSpacing: transportTab === "flight" ? 2 : 0, borderBottomWidth: 2, borderBottomColor: UI.border, paddingBottom: 6, width: "100%" } as any}
                />
              </View>
            </View>

            <Row2>
              <View style={{ flex: 1 }}>
                <DateTimeField
                  key={`dep-${transportTab}`}
                  label="SALIDA"
                  value={transportTab === "flight" ? flightDep : dep}
                  onChange={transportTab === "flight" ? setFlightDep : setDep}
                  placeholder="Fecha y hora"
                />
              </View>
              <View style={{ flex: 1 }}>
                <DateTimeField
                  key={`arr-${transportTab}`}
                  label="LLEGADA"
                  value={transportTab === "flight" ? flightArr : arr}
                  onChange={transportTab === "flight" ? setFlightArr : setArr}
                  placeholder="Fecha y hora"
                />
              </View>
            </Row2>

            <Field
              label={transportTab === "flight" ? "COMPAÑÍA / VUELO" : "COMPAÑÍA"}
              value={transportTab === "flight" ? flightAirline : company}
              onChange={transportTab === "flight" ? setFlightAirline : setCompany}
              placeholder={
                transportTab === "flight" ? "Ej: Vueling · VY6600" :
                transportTab === "train"  ? "Ej: Renfe" :
                transportTab === "ferry"  ? "Ej: Grimaldi" : "Ej: FlixBus"
              }
              autoCapitalize="words"
            />

            <Row2>
              <View style={{ flex: 1 }}>
                <Field label="PRECIO" value={costStr} onChange={setCostStr} placeholder="0,00" keyboardType="decimal-pad" />
              </View>
              <View style={{ flex: 1 }}>
                {transportTab === "flight" ? (
                  <Field label="Nº VUELO" value={flightNumber} onChange={setFlightNumber} placeholder="VY6600" />
                ) : (
                  <Field label="RESERVA" value={bookingRef} onChange={setBookingRef} placeholder="Ej: ABC123" />
                )}
              </View>
            </Row2>

            {transportTab === "flight" && (
              <>
                <Row2>
                  <View style={{ flex: 1 }}>
                    <Field label="PUERTA (OPCIONAL)" value={flightGate} onChange={setFlightGate} placeholder="B14" autoCapitalize="characters" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="ASIENTO (OPCIONAL)" value={flightSeat} onChange={setFlightSeat} placeholder="14C" autoCapitalize="characters" />
                  </View>
                </Row2>
                <Field label="CÓD. RESERVA (OPCIONAL)" value={flightBookingRef} onChange={setFlightBookingRef} placeholder="Ej: XR7QLM" autoCapitalize="characters" />
              </>
            )}
          </View>
        )}

        {/* ACCOMMODATION */}
        {mainTab === "accommodation" && (
          <View>
            <Pressable
              onPress={async () => {
                if (uploadingAccCover) return;
                setUploadingAccCover(true);
                try {
                  const url = await pickAndUploadAccommodationCover();
                  if (url) setAccCoverImageUrl(url);
                } finally {
                  setUploadingAccCover(false);
                }
              }}
              style={{
                borderWidth: 1.5, borderColor: UI.border, borderStyle: accCoverImageUrl ? "solid" : "dashed",
                borderRadius: 16, height: 100, alignItems: "center", justifyContent: "center",
                backgroundColor: "#FAFAFA", marginBottom: 20, gap: 6, overflow: "hidden",
              }}
            >
              {uploadingAccCover ? (
                <ActivityIndicator size="small" color={UI.muted2} />
              ) : accCoverImageUrl ? (
                <>
                  <Image source={{ uri: accCoverImageUrl }} style={{ width: "100%", height: "100%", position: "absolute" }} resizeMode="cover" />
                  <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.45)", paddingVertical: 6, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 4 }}>
                    <Ionicons name="camera-outline" size={12} color="white" />
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "white" }}>Cambiar foto</Text>
                  </View>
                </>
              ) : (
                <>
                  <Ionicons name="image-outline" size={24} color={UI.muted2} />
                  <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted2 }}>Añadir foto del alojamiento</Text>
                </>
              )}
            </Pressable>

            <Field label="NOMBRE *" value={accName} onChange={setAccName} placeholder="Ej: Hotel Roma" autoCapitalize="words" />
            <Field label="DIRECCIÓN" value={accAddress} onChange={setAccAddress} placeholder="Calle Principal 123, Ciudad" autoCapitalize="words" />

            <Row2>
              <View style={{ flex: 1 }}>
                <DateTimeField label="CHECK-IN" value={accCheckInAt} onChange={setAccCheckInAt} placeholder="Fecha" />
              </View>
              <View style={{ flex: 1 }}>
                <DateTimeField label="CHECK-OUT" value={accCheckOutAt} onChange={setAccCheckOutAt} placeholder="Fecha" />
              </View>
            </Row2>

            <Row2>
              <View style={{ flex: 1 }}>
                <Field label="HUÉSPEDES" value={accGuestsStr} onChange={setAccGuestsStr} placeholder="2" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="HABITACIONES" value={accRoomsStr} onChange={setAccRoomsStr} placeholder="1" />
              </View>
            </Row2>

            <Field
              label="LINK RESERVA"
              value={accWebsite}
              onChange={setAccWebsite}
              placeholder="https://..."
              keyboardType="url"
            />

            <Field
              label="TELÉFONO ALOJAMIENTO"
              value={accPhone}
              onChange={setAccPhone}
              placeholder="+34 600 000 000"
              keyboardType="phone-pad"
            />

            <Field label="COSTE TOTAL" value={accCostStr} onChange={setAccCostStr} placeholder="0,00 €" keyboardType="decimal-pad" />
          </View>
        )}

        {/* ACTIVITY */}
        {mainTab === "activity" && (
          <View>
            <Text style={{ fontSize: 11, fontWeight: "900", color: UI.muted, letterSpacing: 0.8, marginBottom: 10 }}>TIPO</Text>
            {(() => {
              const gap = 8;
              const cols = 3;
              const itemW = (screenWidth - 40 - gap * (cols - 1)) / cols;
              return (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap, marginBottom: 20 }}>
                  {ACTIVITY_TYPES_EMOJI.map((t) => {
                    const active = actType === t.value;
                    return (
                      <Pressable
                        key={t.value}
                        onPress={() => setActType(t.value)}
                        style={{ width: itemW, height: itemW, borderRadius: 16, borderWidth: 1.5,
                          borderColor: active ? colors.primary : UI.border,
                          backgroundColor: active ? colors.primary : "white",
                          alignItems: "center", justifyContent: "center", gap: 5 }}
                      >
                        <Text style={{ fontSize: 24, lineHeight: 28 }}>{t.emoji}</Text>
                        <Text style={{ fontSize: 11, fontWeight: "800", color: active ? "white" : UI.text, textAlign: "center" }}>{t.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })()}

            <Field label="TÍTULO *" value={actTitle} onChange={setActTitle} placeholder="Ej: Tour al Etna" autoCapitalize="sentences" />
            <Field label="UBICACIÓN" value={actLocation} onChange={setActLocation} placeholder="Ej: Etna, Sicilia" autoCapitalize="words" />

            <Row2>
              <View style={{ flex: 1 }}>
                <DateTimeField label="INICIO" value={actStartAt} onChange={setActStartAt} placeholder="Fecha y hora" />
              </View>
              <View style={{ flex: 1 }}>
                <DateTimeField label="FIN" value={actEndAt} onChange={setActEndAt} placeholder="Opcional" />
              </View>
            </Row2>

            <Row2>
              <View style={{ flex: 1 }}>
                <Field label="COSTE" value={actCostStr} onChange={setActCostStr} placeholder="0,00" keyboardType="decimal-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="MONEDA" value={actCurrency} onChange={setActCurrency} placeholder="EUR" />
              </View>
            </Row2>
          </View>
        )}

        {/* EXPENSE */}
        {mainTab === "expense" && (
          <View>
            <View style={{ alignItems: "center", paddingVertical: 18, marginBottom: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: "900", color: UI.muted, letterSpacing: 1, marginBottom: 10 }}>IMPORTE</Text>
              <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "center", maxWidth: "88%" }}>
                <TextInput
                  value={expAmountStr}
                  onChangeText={setExpAmountStr}
                  placeholder="0,00"
                  placeholderTextColor={UI.muted2}
                  keyboardType="decimal-pad"
                  className="text-amount-lg"
                  style={{ fontSize: 40, lineHeight: 46, fontWeight: "900", color: UI.text, minWidth: 72, maxWidth: 220, textAlign: "center", paddingVertical: 0, flexShrink: 1 } as any}
                />
                <Text style={{ fontSize: 22, lineHeight: 26, fontWeight: "700", color: UI.muted, marginLeft: 6, marginBottom: 5 }}>{"€"}</Text>
              </View>
              {expCurrency !== "EUR" && expEurPreview !== null && (
                <Text style={{ fontSize: 13, color: UI.muted, marginTop: 6 }}>
                  ≈ {expEurPreview.toFixed(2).replace(".", ",")} EUR
                </Text>
              )}
            </View>

            <Field label="CONCEPTO *" value={expTitle} onChange={setExpTitle} placeholder="Ej: Cena en restaurante" autoCapitalize="sentences" />

            <Text style={{ fontSize: 11, fontWeight: "900", color: UI.muted, letterSpacing: 0.8, marginBottom: 10 }}>CATEGORÍA</Text>
            {(() => {
              const gap = 8;
              const cols = 3;
              const itemW = (screenWidth - 40 - gap * (cols - 1)) / cols;
              return (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap, marginBottom: 20 }}>
                  {EXPENSE_CATS_EMOJI.map((cat) => {
                    const active = expCategory === cat.value;
                    return (
                      <Pressable
                        key={cat.value}
                        onPress={() => setExpCategory(cat.value)}
                        style={{ width: itemW, height: itemW, borderRadius: 16, borderWidth: 1.5,
                          borderColor: active ? colors.primary : UI.border,
                          backgroundColor: active ? colors.primary : "white",
                          alignItems: "center", justifyContent: "center", gap: 5 }}
                      >
                        <Text style={{ fontSize: 24, lineHeight: 28 }}>{cat.emoji}</Text>
                        <Text style={{ fontSize: 11, fontWeight: "800", color: active ? "white" : UI.text, textAlign: "center" }}>{cat.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })()}

            <DateTimeField label="FECHA" value={expOccurredAt} onChange={setExpOccurredAt} placeholder="Seleccionar fecha" />
          </View>
        )}

        {/* VISIT */}
        {mainTab === "visit" && (
          <View>
            <Field label="TÍTULO" value={visitTitle} onChange={setVisitTitle} placeholder='Ej: Visitar Palermo' autoCapitalize="sentences" />
            <Field
              label="UBICACION PARA EL MAPA"
              value={visitLocation}
              onChange={setVisitLocation}
              placeholder="Ej: Cefalu, Sicilia"
              autoCapitalize="words"
            />

            <Row2>
              <View style={{ flex: 1 }}>
                <DateTimeField label="HORA DE INICIO" value={visitStartAt} onChange={setVisitStartAt} placeholder="Fecha y hora" />
              </View>
              <View style={{ flex: 1 }}>
                <DateTimeField label="HORA DE FIN (OPCIONAL)" value={visitEndAt} onChange={setVisitEndAt} placeholder="Añadir" />
              </View>
            </Row2>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: "900", color: UI.muted, letterSpacing: 0.8 }}>
                PARADAS · {visitStops.length}
              </Text>
              {visitStops.length > 1 && (
                <TouchableOpacity onPress={() => setVisitReordering((v) => !v)}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>
                    {visitReordering ? "Listo" : "Reordenar"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ gap: 8, marginBottom: 12 }}>
              {visitStops.map((stop, i) => {
                const typeMeta = VISIT_STOP_TYPES.find((t) => t.value === stop.stopType);
                return (
                  <View
                    key={stop.id}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 10,
                      backgroundColor: "white", borderRadius: 12, borderWidth: 1, borderColor: UI.border,
                      paddingHorizontal: 12, paddingVertical: 10,
                    }}
                  >
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />
                    <Text style={{ fontSize: 16 }}>{typeMeta?.emoji ?? "📍"}</Text>
                    <Text style={{ flex: 1, fontSize: 13, fontWeight: "700", color: UI.text }} numberOfLines={1}>{stop.label}</Text>
                    {visitReordering ? (
                      <View style={{ flexDirection: "row" }}>
                        <TouchableOpacity
                          disabled={i === 0}
                          onPress={() => setVisitStops((prev) => {
                            const next = [...prev];
                            [next[i - 1], next[i]] = [next[i], next[i - 1]];
                            return next;
                          })}
                          style={{ paddingHorizontal: 6, opacity: i === 0 ? 0.3 : 1 }}
                        >
                          <Ionicons name="chevron-up" size={18} color={UI.muted} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          disabled={i === visitStops.length - 1}
                          onPress={() => setVisitStops((prev) => {
                            const next = [...prev];
                            [next[i], next[i + 1]] = [next[i + 1], next[i]];
                            return next;
                          })}
                          style={{ paddingHorizontal: 6, opacity: i === visitStops.length - 1 ? 0.3 : 1 }}
                        >
                          <Ionicons name="chevron-down" size={18} color={UI.muted} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => setVisitStops((prev) => prev.filter((s) => s.id !== stop.id))}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>

            {visitAddingStop ? (
              <View style={{ backgroundColor: "#F8FAFC", borderRadius: 14, borderWidth: 1, borderColor: UI.border, padding: 12, marginBottom: 20 }}>
                <TextInput
                  value={visitNewStopLabel}
                  onChangeText={setVisitNewStopLabel}
                  placeholder="Ej: Quattro Canti"
                  placeholderTextColor={UI.muted2}
                  autoFocus
                  style={{ fontSize: 14, fontWeight: "700", color: UI.text, marginBottom: 10, paddingVertical: 4 }}
                />
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {VISIT_STOP_TYPES.map((t) => {
                    const active = visitNewStopType === t.value;
                    return (
                      <Pressable
                        key={t.value}
                        onPress={() => setVisitNewStopType(t.value)}
                        style={{
                          flexDirection: "row", alignItems: "center", gap: 4,
                          paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
                          borderWidth: 1, borderColor: active ? colors.primary : UI.border,
                          backgroundColor: active ? colors.primary : "white",
                        }}
                      >
                        <Text style={{ fontSize: 13 }}>{t.emoji}</Text>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: active ? "white" : UI.text }}>{t.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => { setVisitAddingStop(false); setVisitNewStopLabel(""); setVisitNewStopType("otro"); }}
                    style={{ flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "700", color: UI.muted }}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={!visitNewStopLabel.trim()}
                    onPress={() => {
                      setVisitStops((prev) => [...prev, {
                        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                        label: visitNewStopLabel.trim(),
                        stopType: visitNewStopType,
                      }]);
                      setVisitNewStopLabel("");
                      setVisitNewStopType("otro");
                      setVisitAddingStop(false);
                    }}
                    style={{ flex: 1, backgroundColor: colors.primary, paddingVertical: 10, alignItems: "center", borderRadius: 10, opacity: !visitNewStopLabel.trim() ? 0.5 : 1 }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "800", color: "white" }}>Añadir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => setVisitAddingStop(true)}
                style={({ pressed }) => ({
                  borderWidth: 1.5, borderColor: UI.border, borderStyle: "dashed", borderRadius: 12,
                  paddingVertical: 12, alignItems: "center", marginBottom: 20,
                  backgroundColor: pressed ? "#F8FAFC" : "transparent",
                })}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>+ Añadir parada</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={{ marginTop: 4, marginBottom: 20 }}>
          <Field
            label="NOTAS"
            value={planNotes}
            onChange={setPlanNotes}
            placeholder="Añade notas, recordatorios o detalles útiles"
            autoCapitalize="sentences"
            multiline
          />

          <Text style={{ fontSize: 12, fontWeight: "800", color: UI.muted, letterSpacing: 0.4, marginBottom: 8 }}>
            ARCHIVOS
          </Text>

          <View style={{ gap: 8, marginBottom: 12 }}>
            {planAttachments.map((file, index) => {
              const isImage = file.kind === "image";
              const isPdf = file.kind === "pdf";
              return (
                <View
                  key={`${file.url}-${index}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    borderWidth: 1,
                    borderColor: UI.border,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    backgroundColor: "white",
                  }}
                >
                  <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons
                      name={isImage ? "image-outline" : isPdf ? "document-text-outline" : "attach-outline"}
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => handleOpenAttachment(file.url)}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: UI.text }} numberOfLines={1}>
                      {file.filename || "Archivo"}
                    </Text>
                    <Text style={{ fontSize: 11, color: UI.muted2, marginTop: 2 }} numberOfLines={1}>
                      {isImage ? "Imagen" : isPdf ? "PDF" : "Archivo"}{file.sizeBytes ? ` · ${Math.max(1, Math.round(file.sizeBytes / 1024))} KB` : ""}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleRemoveAttachment(index)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          <Pressable
            onPress={handleAddAttachments}
            disabled={uploadingAttachments}
            style={({ pressed }) => ({
              borderWidth: 1.5,
              borderColor: UI.border,
              borderStyle: "dashed",
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: "center",
              backgroundColor: pressed ? "#F8FAFC" : "transparent",
              opacity: uploadingAttachments ? 0.6 : 1,
            })}
          >
            {uploadingAttachments ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>+ Añadir archivos</Text>
            )}
          </Pressable>
        </View>

        {err && (
          <Text style={{ fontSize: 12, color: "#EF4444", textAlign: "center", marginTop: 8 }}>{err}</Text>
        )}
      </ScrollView>

      {/* SAVE BUTTON */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 28, borderTopWidth: 1, borderTopColor: UI.border }}>
        <PrimaryButton
          label={isEdit ? "Guardar cambios" : formInfo.saveLabel}
          loading={saving}
          disabled={saving}
          onPress={handleSave}
        />
      </View>

      {/* DELETE MODAL */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} activeOpacity={1} onPress={() => setShowDeleteConfirm(false)} />
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "white", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 24, paddingBottom: 40, gap: 8 }}>
          <Text style={{ fontSize: 17, fontWeight: "800", color: UI.text, textAlign: "center" }}>Eliminar elemento</Text>
          <Text style={{ fontSize: 14, color: UI.muted, textAlign: "center", marginBottom: 8 }}>
            ¿Seguro que quieres eliminar este elemento? Esta acción no se puede deshacer.
          </Text>
          <TouchableOpacity
            onPress={confirmDelete}
            disabled={deleting}
            style={{ backgroundColor: "#EF4444", borderRadius: 14, paddingVertical: 14, alignItems: "center", opacity: deleting ? 0.6 : 1 }}
          >
            {deleting ? <ActivityIndicator color="white" /> : <Text style={{ fontSize: 15, fontWeight: "800", color: "white" }}>Eliminar</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowDeleteConfirm(false)} style={{ paddingVertical: 12, alignItems: "center" }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: UI.muted }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* CURRENCY MODAL */}
      <Modal visible={currencyModalOpen} transparent animationType="slide" onRequestClose={() => setCurrencyModalOpen(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }} activeOpacity={1} onPress={() => setCurrencyModalOpen(false)} />
        <View style={{ backgroundColor: "white", borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: "70%", position: "absolute", bottom: 0, left: 0, right: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: UI.border }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: UI.text }}>Seleccionar moneda</Text>
            <TouchableOpacity onPress={() => setCurrencyModalOpen(false)}>
              <Ionicons name="close" size={22} color={UI.muted} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={COMMON_CURRENCIES}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => {
              const active = expCurrency === item.code;
              return (
                <TouchableOpacity
                  onPress={() => { setExpCurrency(item.code); setCurrencyModalOpen(false); }}
                  style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, backgroundColor: active ? "rgba(11,18,32,0.05)" : "white" }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 15, fontWeight: "700", color: UI.text, width: 52 }}>{item.symbol}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: UI.text }}>{item.code}</Text>
                    <Text style={{ fontSize: 12, color: UI.muted }}>{item.label}</Text>
                  </View>
                  {active && <Ionicons name="checkmark" size={18} color={UI.text} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
