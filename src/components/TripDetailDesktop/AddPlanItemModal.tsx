// src/components/TripDetailDesktop/AddPlanItemModal.tsx
import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  Platform,
  TextInput,
  ActivityIndicator,
  ScrollView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "./ui";
import api from "../../api/api";
import CrossPlatformDateTimePicker from "../CrossPlatformDateTimePicker";
import { AccommodationCreateFields } from "./AccommodationCreateFields";
import { ActivityCreateFields } from "./ActivityCreateFields";
import { BathroomType, RoomType, TripPlanItemType } from "../../types/enums/travel";
import { ExpenseCreateFields } from "./ExpenseCreateFields";
import { BudgetCategoryType } from "../../types/enums/travel";
import { TransportCreateFields, TransportMode, FlightEntryMode, TransportKind } from "./TransportCreateFields";


type TopChoice = "transport" | "accommodation" | "activity" | "expense";

// ✅ Transporte AL DESTINO (tu requisito)
function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function toYMD(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toLocalIsoMinute(d: Date) {
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function niceLocalLabel(d: Date) {
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

function isWeb() {
  return Platform.OS === "web";
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  autoCapitalize,
  px,
  fs,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  return (
    <View>
      <Text style={{ fontSize: fs(12), fontWeight: "800", color: UI.muted, letterSpacing: 0.4 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={UI.muted2}
        autoCapitalize={autoCapitalize ?? "none"}
        style={{
          marginTop: px(6),
          height: px(42),
          borderRadius: px(12),
          borderWidth: 1,
          borderColor: "rgba(226,232,240,0.95)",
          paddingHorizontal: px(12),
          fontSize: fs(13),
          fontWeight: "700",
          color: UI.text,
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
  px,
  fs,
}: {
  label: string;
  value: Date | null;
  onChange: (d: Date) => void;
  placeholder?: string;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  const [open, setOpen] = useState(false);

  if (isWeb()) {
    const v = value ? toLocalIsoMinute(value) : "";
    return (
      <View>
        <Text style={{ fontSize: fs(12), fontWeight: "800", color: UI.muted, letterSpacing: 0.4 }}>
          {label}
        </Text>
        <View
          style={{
            marginTop: px(6),
            height: px(42),
            borderRadius: px(12),
            borderWidth: 1,
            borderColor: "rgba(226,232,240,0.95)",
            paddingHorizontal: px(12),
            justifyContent: "center",
            backgroundColor: "white",
          }}
        >
          <input
            type="datetime-local"
            value={v}
            onChange={(e) => {
              const next = e.target.value;
              if (!next) return;
              const d = new Date(next);
              if (!isNaN(d.getTime())) onChange(d);
            }}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              outline: "none",
              fontSize: fs(13),
              fontWeight: 800,
              color: UI.text,
              background: "transparent",
            } as any}
          />
        </View>
        {!!placeholder && !value ? (
          <Text style={{ marginTop: px(6), fontSize: fs(11), fontWeight: "700", color: UI.muted2 }}>
            {placeholder}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View>
      <Text style={{ fontSize: fs(12), fontWeight: "800", color: UI.muted, letterSpacing: 0.4 }}>
        {label}
      </Text>

      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed, hovered }) => [
          {
            marginTop: px(6),
            height: px(42),
            borderRadius: px(12),
            borderWidth: 1,
            borderColor: "rgba(226,232,240,0.95)",
            paddingHorizontal: px(12),
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "space-between",
            backgroundColor: "white",
            opacity: pressed ? 0.92 : 1,
          },
          Platform.OS === "web" && hovered ? { borderColor: "rgba(15,23,42,0.25)" } : null,
        ]}
      >
        <Text style={{ fontSize: fs(13), fontWeight: "800", color: value ? UI.text : UI.muted2 }}>
          {value ? niceLocalLabel(value) : placeholder ?? ""}
        </Text>
        <Ionicons name="calendar-outline" size={px(16)} color={UI.muted} />
      </Pressable>

      <CrossPlatformDateTimePicker
        visible={open}
        onClose={() => setOpen(false)}
        value={value ?? new Date()}
        onChange={(d: Date) => {
          setOpen(false);
          onChange(d);
        }}
        mode="datetime"
      />
    </View>
  );
}

function DateField({
  label,
  value,
  onChange,
  placeholder,
  px,
  fs,
}: {
  label: string;
  value: Date | null;
  onChange: (d: Date) => void;
  placeholder?: string;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  const [open, setOpen] = useState(false);

  if (Platform.OS === "web") {
    const v = value ? toYMD(value) : "";
    return (
      <View>
        <Text style={{ fontSize: fs(12), fontWeight: "800", color: UI.muted, letterSpacing: 0.4 }}>
          {label}
        </Text>
        <View
          style={{
            marginTop: px(6),
            height: px(42),
            borderRadius: px(12),
            borderWidth: 1,
            borderColor: "rgba(226,232,240,0.95)",
            paddingHorizontal: px(12),
            justifyContent: "center",
            backgroundColor: "white",
          }}
        >
          <input
            type="date"
            value={v}
            onChange={(e) => {
              const next = e.target.value;
              if (!next) return;
              const d = new Date(`${next}T00:00`);
              if (!isNaN(d.getTime())) {
                const dd = new Date(d);
                dd.setHours(0, 0, 0, 0);
                onChange(dd);
              }
            }}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              outline: "none",
              fontSize: fs(13),
              fontWeight: 800,
              color: UI.text,
              background: "transparent",
            } as any}
          />
        </View>
        {!!placeholder && !value ? (
          <Text style={{ marginTop: px(6), fontSize: fs(11), fontWeight: "700", color: UI.muted2 }}>
            {placeholder}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View>
      <Text style={{ fontSize: fs(12), fontWeight: "800", color: UI.muted, letterSpacing: 0.4 }}>
        {label}
      </Text>

      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          marginTop: px(6),
          height: px(42),
          borderRadius: px(12),
          borderWidth: 1,
          borderColor: "rgba(226,232,240,0.95)",
          paddingHorizontal: px(12),
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between",
          backgroundColor: "white",
          opacity: pressed ? 0.92 : 1,
        })}
      >
        <Text style={{ fontSize: fs(13), fontWeight: "800", color: value ? UI.text : UI.muted2 }}>
          {value ? toYMD(value) : placeholder ?? ""}
        </Text>
        <Ionicons name="calendar-outline" size={px(16)} color={UI.muted} />
      </Pressable>

      <CrossPlatformDateTimePicker
        visible={open}
        onClose={() => setOpen(false)}
        value={value ?? new Date()}
        onChange={(d: Date) => {
          setOpen(false);
          const dd = new Date(d);
          dd.setHours(0, 0, 0, 0);
          onChange(dd);
        }}
        mode="date"
      />
    </View>
  );
}

function Row2({
  left,
  right,
  px,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  px: (n: number) => number;
}) {
  return (
    <View style={{ flexDirection: "row", gap: px(10) }}>
      <View style={{ flex: 1 }}>{left}</View>
      <View style={{ flex: 1 }}>{right}</View>
    </View>
  );
}

function TopTabs({
  value,
  onChange,
  px,
  fs,
}: {
  value: TopChoice;
  onChange: (v: TopChoice) => void;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  const tabs: Array<{ key: TopChoice; label: string }> = [
    { key: "transport", label: "Transporte" },
    { key: "accommodation", label: "Alojamiento" },
    { key: "activity", label: "Actividad" },
    { key: "expense", label: "Gasto" }
  ];

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: px(22) }}>
      {tabs.map((t) => {
        const active = value === t.key;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={({ hovered, pressed }) => [
              {
                paddingVertical: px(10),
                borderBottomWidth: 2,
                borderBottomColor: active ? UI.text : "transparent",
                opacity: pressed ? 0.92 : 1,
              },
              Platform.OS === "web" && hovered && !active ? { opacity: 0.9 } : null,
            ]}
          >
            <Text style={{ fontSize: fs(14), fontWeight: active ? "800" : "600", color: active ? UI.text : UI.muted }}>
              {t.label}
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
  px,
  fs,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  selected?: boolean;
  onPress: () => void;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.92 : 1,
        flex: 1,
        minWidth: px(120),
        borderRadius: px(14),
        paddingVertical: px(12),
        paddingHorizontal: px(12),
        borderWidth: 1,
        borderColor: selected ? "rgba(15,23,42,0.35)" : "rgba(226,232,240,0.95)",
        backgroundColor: selected ? "#0B1220" : "white",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: px(10),
      })}
    >
      <Ionicons name={icon} size={px(16)} color={selected ? "white" : UI.text} />
      <Text style={{ fontSize: fs(13), fontWeight: "800", color: selected ? "white" : UI.text }}>{label}</Text>
    </Pressable>
  );
}

function PrimaryButton({
  label,
  disabled,
  loading,
  onPress,
  px,
  fs,
}: {
  label: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: disabled || loading ? 0.45 : pressed ? 0.92 : 1,
        height: px(44),
        borderRadius: px(14),
        backgroundColor: "#0B1220",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: px(16),
        flexDirection: "row",
        gap: px(10),
      })}
    >
      {loading ? <ActivityIndicator /> : null}
      <Text style={{ fontSize: fs(13), fontWeight: "600", color: "white" }}>{label}</Text>
    </Pressable>
  );
}

function GhostButton({
  label,
  onPress,
  disabled,
  px,
  fs,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: disabled ? 0.45 : pressed ? 0.92 : 1,
        height: px(44),
        borderRadius: px(14),
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "rgba(226,232,240,0.95)",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: px(16),
      })}
    >
      <Text style={{ fontSize: fs(13), fontWeight: "700", color: UI.text }}>{label}</Text>
    </Pressable>
  );
}

function Segmented({
  value,
  onChange,
  px,
  fs,
}: {
  value: FlightEntryMode;
  onChange: (v: FlightEntryMode) => void;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  const items: Array<{ key: FlightEntryMode; label: string }> = [
    { key: "autofill", label: "Autorelleno" },
    { key: "manual", label: "Manual" },
  ];

  return (
    <View
      style={{
        flexDirection: "row",
        borderWidth: 1,
        borderColor: "rgba(226,232,240,0.95)",
        borderRadius: px(14),
        overflow: "hidden",
        backgroundColor: "white",
      }}
    >
      {items.map((it) => {
        const active = it.key === value;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            style={({ pressed }) => ({
              flex: 1,
              height: px(40),
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: active ? "#0B1220" : "white",
              opacity: pressed ? 0.92 : 1,
            })}
          >
            <Text style={{ fontSize: fs(13), fontWeight: "900", color: active ? "white" : UI.text }}>
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function parseIntNullable(value: string): number | null {
  const v = (value || "").trim();
  if (!v) return null;

  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) return null;

  return n;
}


export function AddPlanItemModal({
  tripId,
  visible,
  onClose,
  onContinue,
  onCreated,
  px,
  fs,
  presetDate,
}: {
  tripId: number;
  visible: boolean;
  onClose: () => void;
  onContinue: (presetType: TripPlanItemType, presetDate?: string | null) => void;
  onCreated: () => void;
  px: (n: number) => number;
  fs: (n: number) => number;
  presetDate?: string | null;
}) {
  const [top, setTop] = useState<TopChoice>("activity");
  const [mode, setMode] = useState<TransportMode | null>(null);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ✈️ Flight
  const [flightEntryMode, setFlightEntryMode] = useState<FlightEntryMode>("autofill");

  // Autofill inputs
  const [flightNumber, setFlightNumber] = useState("");
  const [flightDate, setFlightDate] = useState<Date | null>(null);

  // Manual inputs
  const [flightAirline, setFlightAirline] = useState("");
  const [flightFrom, setFlightFrom] = useState("");
  const [flightTo, setFlightTo] = useState("");
  const [flightDep, setFlightDep] = useState<Date | null>(null);
  const [flightArr, setFlightArr] = useState<Date | null>(null);

  // Train/Bus/Car (AL DESTINO)
  const [company, setCompany] = useState("");
  const [bookingRef, setBookingRef] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dep, setDep] = useState<Date | null>(null);
  const [arr, setArr] = useState<Date | null>(null);

  const [costStr, setCostStr] = useState("");
  const [currency, setCurrency] = useState("EUR");

// 🏨 Accommodation quick create
const [accName, setAccName] = useState("");
const [accAddress, setAccAddress] = useState("");
const [accCity, setAccCity] = useState("");
const [accCountry, setAccCountry] = useState("");
const [roomType, setRoomType] = useState<RoomType | null>(null);
const [bathroomType, setBathroomType] = useState<BathroomType | null>(null);

const [accCheckInAt, setAccCheckInAt] = useState<Date | null>(null);
const [accCheckOutAt, setAccCheckOutAt] = useState<Date | null>(null);

const [accGuestsStr, setAccGuestsStr] = useState("");
const [accRoomsStr, setAccRoomsStr] = useState("");

const [accBookingRef, setAccBookingRef] = useState("");
const [accPhone, setAccPhone] = useState("");
const [accWebsite, setAccWebsite] = useState("");

const [accCostStr, setAccCostStr] = useState("");
const [accCurrency, setAccCurrency] = useState("EUR");


const [actType, setActType] = useState<TripPlanItemType>(TripPlanItemType.activity);
const [actTitle, setActTitle] = useState("");
const [actLocation, setActLocation] = useState("");
const [actStartAt, setActStartAt] = useState<Date | null>(null);
const [actEndAt, setActEndAt] = useState<Date | null>(null);
const [actNotes, setActNotes] = useState("");
const [actCostStr, setActCostStr] = useState("");
const [actCurrency, setActCurrency] = useState("EUR");


// 💸 Expense quick create
const [expTitle, setExpTitle] = useState("");
const [expAmountStr, setExpAmountStr] = useState("");
const [expCurrency, setExpCurrency] = useState("EUR");
const [expCategory, setExpCategory] = useState<BudgetCategoryType>(BudgetCategoryType.other);
const [expOccurredAt, setExpOccurredAt] = useState<Date | null>(null);
const [expNotes, setExpNotes] = useState("");
const [transportKind, setTransportKind] = useState<TransportKind>("principal");

// local
const [localTitle, setLocalTitle] = useState("");
const [localStartAt, setLocalStartAt] = useState<Date | null>(null);
const [localEndAt, setLocalEndAt] = useState<Date | null>(null);
const [localNotes, setLocalNotes] = useState("");
const [localLocation, setLocalLocation] = useState("");

function parseCost(input: string): number | null {
  const s = (input || "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  if (!isFinite(n) || n < 0) return null;
  return n;
}

  React.useEffect(() => {
    if (!visible) return;
    setTransportKind("principal");
    setLocalTitle("");
setLocalStartAt(null);
setLocalEndAt(null);
setLocalNotes("");
setLocalLocation("");

    setExpTitle("");
setExpAmountStr("");
setExpCurrency("EUR");
setExpCategory(BudgetCategoryType.other);
setExpOccurredAt(null);
setExpNotes("");



    setActType(TripPlanItemType.activity);
    setActTitle("");
    setActLocation("");
    setActStartAt(null);
    setActEndAt(null);
    setActNotes("");
    setActCostStr("");
    setActCurrency("EUR");

    setTop("activity");
    setMode(null);

    setSaving(false);
    setErr(null);
setCostStr("");
setCurrency("EUR");
setAccName("");
setAccAddress("");
setAccCity("");
setAccCountry("");
setAccGuestsStr("");
setAccRoomsStr("");
setAccBookingRef("");
setAccPhone("");
setAccWebsite("");
setAccCheckInAt(null);
setAccCheckOutAt(null);
setAccCostStr("");
setAccCurrency("EUR");
setRoomType(null);
setBathroomType(null);



    setFlightEntryMode("autofill");
    setFlightNumber("");
    setFlightAirline("");
    setFlightFrom("");
    setFlightTo("");
    setFlightDep(null);
    setFlightArr(null);
    setFlightDate(null);

    setCompany("");
    setBookingRef("");
    setFrom("");
    setTo("");
    setDep(null);
    setArr(null);

    if (presetDate) {
      const d = new Date(`${presetDate}T09:00`);
      if (!isNaN(d.getTime())) {
        setDep(d);
        setFlightDate(new Date(`${presetDate}T00:00`));
        setFlightDep(d);
      }
    }
  }, [visible, presetDate]);

  const subtitle = useMemo(() => {
    if (top === "transport") {
      if (!mode) return "Elige el tipo de transporte";
      if (mode === "flight") return flightEntryMode === "autofill" ? "Autorelleno por número + día" : "Relleno manual";
      if (mode === "train") return "Tren ";
      if (mode === "bus") return "Bus";
      if (mode === "car") return "Coche ";
      return "Transporte";
    }
    if (top === "accommodation") return "Crea un alojamiento ";
    if (top === "expense") return "Crea un gasto ";
    return "Crea una actividad ";
  }, [top, mode, flightEntryMode]);

  const activityValid = useMemo(() => {
  if (top !== "activity") return false;
  if (!actTitle.trim()) return false;

  if (actStartAt && actEndAt && actEndAt.getTime() < actStartAt.getTime()) return false;

  if (actCostStr.trim() && parseCost(actCostStr) == null) return false;

  return true;
}, [top, actTitle, actStartAt, actEndAt, actCostStr]);

const expenseValid = useMemo(() => {
  if (top !== "expense") return false;
  if (!expTitle.trim()) return false;

  const amount = parseCost(expAmountStr);
  if (parseCost(expAmountStr) == null) return false; // importe requerido y válido

  if (!expCurrency.trim()) return false;

  return true;
}, [top, expTitle, expAmountStr, expCurrency]);


const transportValid = useMemo(() => {
  if (top !== "transport") return false;

  // =========================
  // LOCAL
  // =========================
  if (transportKind === "local") {
    if (!localTitle.trim()) return false;

    if (localStartAt && localEndAt && localEndAt.getTime() < localStartAt.getTime()) {
      return false;
    }

    // coste: opcional pero válido
    if (costStr.trim() && parseCost(costStr) == null) return false;

    return true;
  }

  // =========================
  // PRINCIPAL
  // =========================
  if (transportKind === "principal") {
    if (!mode) return false;

    // coste: opcional pero válido
    if (costStr.trim() && parseCost(costStr) == null) return false;

    if (mode === "flight") {
      if (flightEntryMode === "autofill") {
        return !!flightNumber.trim() && !!flightDate;
      }
      return !!flightNumber.trim() && !!flightDep && !!flightArr;
    }

    if (mode === "train" || mode === "bus") {
      return !!company.trim() && !!from.trim() && !!to.trim() && !!dep && !!arr;
    }

    if (mode === "car") {
      return !!from.trim() && !!to.trim() && !!dep && !!arr;
    }

    return false;
  }

  return false;
}, [
  top,
  transportKind,

  // local
  localTitle,
  localStartAt,
  localEndAt,

  // shared
  costStr,

  // principal
  mode,
  flightEntryMode,
  flightNumber,
  flightDate,
  flightDep,
  flightArr,
  company,
  from,
  to,
  dep,
  arr,
]);


const accommodationValid = useMemo(() => {
  if (top !== "accommodation") return false;
  if (!accName.trim()) return false;

  if (accCheckInAt && accCheckOutAt && accCheckOutAt.getTime() < accCheckInAt.getTime()) return false;

  if (accCostStr.trim() && parseCost(accCostStr) == null) return false;

  const g = accGuestsStr.trim();
  if (g && parseIntNullable(g) == null) return false;

  const r = accRoomsStr.trim();
  if (r && parseIntNullable(r) == null) return false;

  return true;
}, [top, accName, accCheckInAt, accCheckOutAt, accCostStr, accGuestsStr, accRoomsStr]);

async function saveExpense() {
  if (top !== "expense") return;

  setErr(null);
  setSaving(true);

  const amount = parseCost(expAmountStr);
  const currencyCode = (expCurrency || "EUR").trim().toUpperCase();

  if (!expTitle.trim()) {
    setErr("Concepto requerido.");
    setSaving(false);
    return;
  }

  if (amount == null) {
    setErr("Importe inválido. Usa un número (ej: 12.50).");
    setSaving(false);
    return;
  }

  try {
    const dayIso =
      expOccurredAt
        ? new Date(expOccurredAt).toISOString().slice(0, 10) + "T00:00:00.000Z"
        : presetDate
        ? `${presetDate}T00:00:00.000Z`
        : null;

    await api.post(`/trips/${tripId}/plan-items`, {
      type: TripPlanItemType.expense,
      title: expTitle.trim(),
      logistics: false,

      day: dayIso,
      startAt: expOccurredAt ? expOccurredAt.toISOString() : null,
      endAt: null,
      timezone: null,

      location: null,
      notes: expNotes.trim() || null,

      cost: amount,
      currency: currencyCode,

      // ✅ categoría para presupuestos (si tu backend la soporta aquí)
      budgetCategory: expCategory,
    });

    onClose();
    onCreated();
  } catch (e: any) {
    setErr(e?.response?.data?.message ?? "No se pudo guardar el gasto.");
  } finally {
    setSaving(false);
  }
}

async function saveTransport() {
  if (top !== "transport") return;

  setErr(null);
  setSaving(true);

  const cost = parseCost(costStr);
  const currencyCode = (currency || "EUR").trim().toUpperCase();

  // coste opcional pero si se escribe debe ser válido
  if (costStr.trim() && cost == null) {
    setErr("Coste inválido. Usa un número (ej: 25.90).");
    setSaving(false);
    return;
  }

  try {
    // =========================
    // LOCAL
    // =========================
    if (transportKind === "local") {
      const title = (localTitle || "").trim();

      if (!title) {
        setErr("Título requerido para el transporte local.");
        setSaving(false);
        return;
      }

      if (localStartAt && localEndAt && localEndAt.getTime() < localStartAt.getTime()) {
        setErr("La fecha de fin no puede ser anterior a la de inicio.");
        setSaving(false);
        return;
      }

      const dayIso =
        localStartAt
          ? new Date(localStartAt).toISOString().slice(0, 10) + "T00:00:00.000Z"
          : presetDate
          ? `${presetDate}T00:00:00.000Z`
          : null;

      await api.post(`/trips/${tripId}/plan-items`, {
        type: "transport_local",
        title,
        logistics: false, // local suele ser "no logístico" (ajústalo si quieres que sea true)

        day: dayIso,
        startAt: localStartAt ? localStartAt.toISOString() : null,
        endAt: localEndAt ? localEndAt.toISOString() : null,
        timezone: null,

location: (localLocation || "").trim() || null,
        notes: (localNotes || "").trim() || null,

        cost: cost ?? null,
        currency: currencyCode,
      });

      onClose();
      onCreated();
      return;
    }

    // =========================
    // PRINCIPAL (tu lógica actual)
    // =========================
    if (!mode) {
      setErr("Selecciona un modo de transporte principal.");
      setSaving(false);
      return;
    }

    if (mode === "flight") {
      // ========= AUTOFILL =========
      if (flightEntryMode === "autofill") {
        const date = flightDate ? toYMD(flightDate) : "";
        const fn = flightNumber.trim().toUpperCase();

        if (!fn || !date) {
          setErr("Código de vuelo y día son obligatorios.");
          setSaving(false);
          return;
        }

        await api.post(`/trips/${tripId}/plan-items/flight/autofill`, {
          flightNumber: fn,
          date, // "YYYY-MM-DD"
          cost: cost ?? null,
          currency: currencyCode,
        });

        onClose();
        onCreated();
        return;
      }

      // ========= MANUAL =========
      const fn = flightNumber.trim().toUpperCase();
      const depIso = flightDep ? flightDep.toISOString() : null;
      const arrIso = flightArr ? flightArr.toISOString() : null;

      if (!fn || !depIso || !arrIso) {
        setErr("Código, salida y llegada son obligatorios.");
        setSaving(false);
        return;
      }

      const dayIso = flightDep
        ? new Date(flightDep).toISOString().slice(0, 10) + "T00:00:00.000Z"
        : null;

      await api.post(`/trips/${tripId}/plan-items`, {
        type: "flight",
        title: `${fn} · ${flightFrom.trim()} → ${flightTo.trim()}`.trim(),
        logistics: true,

        day: dayIso,
        startAt: depIso,
        endAt: arrIso,
        timezone: null,

        location: flightFrom.trim() || null,
        notes: null,

        cost: cost ?? null,
        currency: currencyCode,

        flightDetails: {
          provider: "manual",
          status: null,

          flightNumberRaw: fn,
          flightNumberIata: fn,
          airlineName: flightAirline.trim() || null,

          fromName: flightFrom.trim() || null,
          toName: flightTo.trim() || null,
        },

        metadata: {
          source: "manual_ui",
        },
      });

      onClose();
      onCreated();
      return;
    }

    // ========= TRAIN / BUS =========
    if (mode === "train" || mode === "bus") {
      const depIso = dep ? dep.toISOString() : null;
      const arrIso = arr ? arr.toISOString() : null;

      if (!company.trim() || !from.trim() || !to.trim() || !depIso || !arrIso) {
        setErr("Compañía, origen, destino, salida y llegada son obligatorios.");
        setSaving(false);
        return;
      }

      const dayIso = dep ? new Date(dep).toISOString().slice(0, 10) + "T00:00:00.000Z" : null;

      await api.post(`/trips/${tripId}/plan-items`, {
        type: "transport_destination",
        title: `${mode === "train" ? "Tren" : "Bus"} · ${company.trim()} · ${from.trim()} → ${to.trim()}`.trim(),
        logistics: true,

        day: dayIso,
        startAt: depIso,
        endAt: arrIso,
        timezone: null,

        cost: cost ?? null,
        currency: currencyCode,

        location: from.trim() || null,
        notes: bookingRef.trim() ? `Reserva: ${bookingRef.trim()}` : null,

        destinationTransportDetails: {
          mode: mode === "train" ? "train" : "bus",
          company: company.trim() || null,
          bookingRef: bookingRef.trim() || null,
          fromName: from.trim() || null,
          toName: to.trim() || null,
          depAt: depIso,
          arrAt: arrIso,
          metadata: null,
        },
      });

      onClose();
      onCreated();
      return;
    }

    // ========= CAR =========
    if (mode === "car") {
      const depIso = dep ? dep.toISOString() : null;
      const arrIso = arr ? arr.toISOString() : null;

      if (!from.trim() || !to.trim() || !depIso || !arrIso) {
        setErr("Origen, destino, salida y llegada son obligatorios.");
        setSaving(false);
        return;
      }

      const dayIso = dep ? new Date(dep).toISOString().slice(0, 10) + "T00:00:00.000Z" : null;

      await api.post(`/trips/${tripId}/plan-items`, {
        type: "transport_destination",
        title: `Coche · ${from.trim()} → ${to.trim()}`.trim(),
        logistics: true,

        day: dayIso,
        startAt: depIso,
        endAt: arrIso,
        timezone: null,

        cost: cost ?? null,
        currency: currencyCode,

        location: from.trim() || null,
        notes: null,

        destinationTransportDetails: {
          mode: "car",
          company: null,
          bookingRef: bookingRef.trim() || null,
          fromName: from.trim() || null,
          toName: to.trim() || null,
          depAt: depIso,
          arrAt: arrIso,
          metadata: null,
        },
      });

      onClose();
      onCreated();
      return;
    }
  } catch (e: any) {
    setErr(e?.response?.data?.message ?? "No se pudo guardar el transporte.");
  } finally {
    setSaving(false);
  }
}

async function saveAccommodation() {
  if (top !== "accommodation") return;

  setErr(null);
  setSaving(true);

  // ---- COSTE (PlanItem) ----
  const costRaw = (accCostStr || "").trim();
  const cost = costRaw ? Number(costRaw.replace(",", ".")) : null;
  const currencyCode = (accCurrency || "EUR").trim().toUpperCase();

  if (costRaw && (!Number.isFinite(cost as any) || (cost as number) < 0)) {
    setErr("Coste inválido. Usa un número (ej: 120.00).");
    setSaving(false);
    return;
  }

  // ---- FECHAS ----
  if (accCheckInAt && accCheckOutAt && accCheckOutAt.getTime() < accCheckInAt.getTime()) {
    setErr("El check-out no puede ser anterior al check-in.");
    setSaving(false);
    return;
  }

  // ---- ENTEROS (AccommodationDetails) ----
  const guests = parseIntNullable(accGuestsStr);
  const rooms = parseIntNullable(accRoomsStr);

  if (accGuestsStr && guests === null) {
    setErr("Número de huéspedes inválido.");
    setSaving(false);
    return;
  }

  if (accRoomsStr && rooms === null) {
    setErr("Número de habitaciones inválido.");
    setSaving(false);
    return;
  }

  try {
    // ---- DAY (normalización backend-friendly) ----
    const dayIso =
      accCheckInAt
        ? new Date(accCheckInAt).toISOString().slice(0, 10) + "T00:00:00.000Z"
        : presetDate
        ? `${presetDate}T00:00:00.000Z`
        : null;

    await api.post(`/trips/${tripId}/plan-items`, {
      type: "accommodation",
      title: accName.trim(),
      logistics: true,

      // PlanItem (tiempos)
      day: dayIso,
      startAt: accCheckInAt ? accCheckInAt.toISOString() : null,
      endAt: accCheckOutAt ? accCheckOutAt.toISOString() : null,
      timezone: null,

      // PlanItem (económico)
      cost,
      currency: currencyCode,

      // ---- AccommodationDetails ----
      accommodationDetails: {
        name: accName.trim(),
        address: accAddress.trim() || null,
        city: accCity.trim() || null,
        country: accCountry.trim() || null,

        checkInAt: accCheckInAt ? accCheckInAt.toISOString() : null,
        checkOutAt: accCheckOutAt ? accCheckOutAt.toISOString() : null,

        guests,
        rooms,

        bookingRef: accBookingRef.trim() || null,
        phone: accPhone.trim() || null,
        website: accWebsite.trim() || null,

        metadata: { source: "modal_quick_create" },
      },
    });

    onClose();
    onCreated();
  } catch (e: any) {
    setErr(e?.response?.data?.message ?? "No se pudo guardar el alojamiento.");
  } finally {
    setSaving(false);
  }
}

async function saveActivity() {
  if (top !== "activity") return;

  setErr(null);
  setSaving(true);

  const cost = parseCost(actCostStr);
  const currencyCode = (actCurrency || "EUR").trim().toUpperCase();

  if (actCostStr.trim() && cost == null) {
    setErr("Coste inválido. Usa un número (ej: 25.90).");
    setSaving(false);
    return;
  }

  if (!actTitle.trim()) {
    setErr("Título requerido.");
    setSaving(false);
    return;
  }

  if (actStartAt && actEndAt && actEndAt.getTime() < actStartAt.getTime()) {
    setErr("La fecha de fin no puede ser anterior a la de inicio.");
    setSaving(false);
    return;
  }

  try {
    const dayIso =
      actStartAt
        ? new Date(actStartAt).toISOString().slice(0, 10) + "T00:00:00.000Z"
        : presetDate
        ? `${presetDate}T00:00:00.000Z`
        : null;

    await api.post(`/trips/${tripId}/plan-items`, {
      type: actType,                      // 👈 importante: tipo real
      title: actTitle.trim(),
      logistics: false,

      day: dayIso,
      startAt: actStartAt ? actStartAt.toISOString() : null,
      endAt: actEndAt ? actEndAt.toISOString() : null,
      timezone: null,

      location: actLocation.trim() || null,
      notes: actNotes.trim() || null,

      cost: cost ?? null,
      currency: currencyCode,
    });

    onClose();
    onCreated();
  } catch (e: any) {
    setErr(e?.response?.data?.message ?? "No se pudo guardar la actividad.");
  } finally {
    setSaving(false);
  }
}



const continueDisabled = useMemo(() => {
  if (saving) return true;
  if (top === "transport") return !transportValid;
  if (top === "accommodation") return !accommodationValid;
  if (top === "activity") return !activityValid;
  if (top === "expense") return !expenseValid;

  return false;
}, [saving, top, transportValid, accommodationValid, activityValid, expenseValid]);

function handleContinue() {
  if (top === "transport") {
    saveTransport();
    return;
  }
  if (top === "accommodation") {
    saveAccommodation();
    return;
  }
if (top === "activity") {
    saveActivity();
    return;
  }
    if (top === "expense") {
    saveExpense();
    return;
  }
  onContinue(TripPlanItemType.activity, presetDate ?? null);
}


  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(2,6,23,0.55)",
          alignItems: "center",
          justifyContent: "center",
          padding: px(18),
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: px(760),
            maxHeight: "90vh" as any, // ✅ web
                ...(Platform.OS !== "web" ? { maxHeight: "90%" } : null), // ✅ native
            borderRadius: px(20),
            backgroundColor: "white",
            borderWidth: 1,
            borderColor: "rgba(226,232,240,0.95)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <View
            style={{
              padding: px(16),
              borderBottomWidth: 1,
              borderBottomColor: "rgba(226,232,240,0.95)",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: px(12),
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: fs(16), fontWeight: "900", color: UI.text }}>Añadir al viaje</Text>
              <Text style={{ marginTop: px(3), fontSize: fs(12), fontWeight: "600", color: UI.muted }}>
                {subtitle}
              </Text>
            </View>

            <Pressable onPress={onClose} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
              <View
                style={{
                  width: px(36),
                  height: px(36),
                  borderRadius: px(12),
                  backgroundColor: "rgba(148,163,184,0.20)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="close" size={px(18)} color={UI.text} />
              </View>
            </Pressable>
          </View>

{/* Body */}
<ScrollView
  showsVerticalScrollIndicator={false}
  keyboardShouldPersistTaps="handled"
  contentContainerStyle={{
    padding: px(16),
    paddingBottom: px(10), // deja aire antes del footer
    gap: px(12),
  }}
  style={{
    flexGrow: 0,
    flexShrink: 1, // ✅ clave para que el footer no desaparezca
  }}
>
  <TopTabs
    value={top}
    onChange={(v) => {
      setTop(v);
      if (v !== "transport") setMode(null);
      setErr(null);
    }}
    px={px}
    fs={fs}
  />

{top === "transport" ? (
  <TransportCreateFields
    px={px}
    fs={fs}
    Field={Field}
    DateField={DateField}
    DateTimeField={DateTimeField}
    Row2={Row2}
    presetDate={presetDate ?? null}
    onAnyChange={() => setErr(null)}

    mode={mode}
    setMode={(m) => setMode(m)}

    costStr={costStr}
    setCostStr={setCostStr}
    currency={currency}
    setCurrency={setCurrency}

    flightEntryMode={flightEntryMode}
    setFlightEntryMode={setFlightEntryMode}

    flightNumber={flightNumber}
    setFlightNumber={setFlightNumber}
    flightDate={flightDate}
    setFlightDate={setFlightDate}

  kind={transportKind}
  setKind={setTransportKind}
  localTitle={localTitle}
  setLocalTitle={setLocalTitle}
  localStartAt={localStartAt}
  setLocalStartAt={setLocalStartAt}
  localEndAt={localEndAt}
  setLocalEndAt={setLocalEndAt}
  localNotes={localNotes}
  setLocalNotes={setLocalNotes}
    localLocation={localLocation}
    setLocalLocation={setLocalLocation}

    flightAirline={flightAirline}
    setFlightAirline={setFlightAirline}
    flightFrom={flightFrom}
    setFlightFrom={setFlightFrom}
    flightTo={flightTo}
    setFlightTo={setFlightTo}
    flightDep={flightDep}
    setFlightDep={setFlightDep}
    flightArr={flightArr}
    setFlightArr={setFlightArr}

    company={company}
    setCompany={setCompany}
    bookingRef={bookingRef}
    setBookingRef={setBookingRef}
    from={from}
    setFrom={setFrom}
    to={to}
    setTo={setTo}
    dep={dep}
    setDep={setDep}
    arr={arr}
    setArr={setArr}
  />
) : top === "accommodation" ? (
<AccommodationCreateFields
  px={px}
  fs={fs}
  Field={Field}
  DateTimeField={DateTimeField}
  Row2={Row2}
  // AccommodationDetails
  name={accName}
  setName={setAccName}
  address={accAddress}
  setAddress={setAccAddress}
  city={accCity}
  setCity={setAccCity}
  country={accCountry}
  setCountry={(v: string) => setAccCountry((v || "").trim().toUpperCase())}
  checkInAt={accCheckInAt}
  setCheckInAt={setAccCheckInAt}
  checkOutAt={accCheckOutAt}
  setCheckOutAt={setAccCheckOutAt}
  guestsStr={accGuestsStr}
  setGuestsStr={setAccGuestsStr}
  roomsStr={accRoomsStr}
  setRoomsStr={setAccRoomsStr}
  bookingRef={accBookingRef}
  setBookingRef={setAccBookingRef}
  phone={accPhone}
  setPhone={setAccPhone}
  website={accWebsite}
  setWebsite={setAccWebsite}
    roomType={roomType}
    setRoomType={setRoomType}
    bathroomType={bathroomType}
    setBathroomType={setBathroomType}
  // PlanItem cost
  costStr={accCostStr}
  setCostStr={setAccCostStr}
  currency={accCurrency}
  setCurrency={(v: string) => setAccCurrency((v || "").trim().toUpperCase())}
  valid={accommodationValid}
/>
) : top === "expense" ? (
  <ExpenseCreateFields
    px={px}
    fs={fs}
    Field={Field}
    DateTimeField={DateTimeField}
    Row2={Row2}
    type={TripPlanItemType.expense}
    title={expTitle}
    setTitle={setExpTitle}
    amountStr={expAmountStr}
    setAmountStr={setExpAmountStr}
    currency={expCurrency}
    setCurrency={setExpCurrency}
    category={expCategory}
    setCategory={setExpCategory}
    occurredAt={expOccurredAt}
    setOccurredAt={setExpOccurredAt}
    notes={expNotes}
    setNotes={setExpNotes}
    valid={expenseValid}
  />
) : top === "activity" ? (
  <ActivityCreateFields
    px={px}
    fs={fs}
    Field={Field}
    DateTimeField={DateTimeField}
    Row2={Row2}
    type={actType}
    setType={setActType}
    title={actTitle}
    setTitle={setActTitle}
    location={actLocation}
    setLocation={setActLocation}
    startAt={actStartAt}
    setStartAt={setActStartAt}
    endAt={actEndAt}
    setEndAt={setActEndAt}
    notes={actNotes}
    setNotes={setActNotes}
    costStr={actCostStr}
    setCostStr={setActCostStr}
    currency={actCurrency}
    setCurrency={setActCurrency}
    valid={activityValid}
  />
) : null}

  {!!err ? (
    <View
      style={{
        marginTop: px(10),
        padding: px(12),
        borderRadius: px(14),
        borderWidth: 1,
        borderColor: "rgba(239,68,68,0.25)",
        backgroundColor: "rgba(239,68,68,0.06)",
        flexDirection: "row",
        gap: px(10),
        alignItems: "center",
      }}
    >
      <Ionicons name="alert-circle-outline" size={px(18)} color="#EF4444" />
      <Text style={{ flex: 1, fontSize: fs(12), fontWeight: "700", color: UI.text }}>{err}</Text>
    </View>
  ) : null}
</ScrollView>

{/* Footer */}
<View
  style={{
    padding: px(16),
    borderTopWidth: 1,
    borderTopColor: "rgba(226,232,240,0.95)",
    flexDirection: "row",
    gap: px(10),
    justifyContent: "flex-end",
  }}
>
  <GhostButton label="Cancelar" onPress={onClose} disabled={saving} px={px} fs={fs} />
  <PrimaryButton
    label="Guardar"
    disabled={continueDisabled}
    loading={saving}
    onPress={handleContinue}
    px={px}
    fs={fs}
  />
</View>
        </View>
      </View>
    </Modal>
  );
}
