// src/components/TripDetailDesktop/PlanItemEditorModal.tsx
import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  Platform,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../../api/api";
import { UI } from "./ui";
import CrossPlatformDateTimePicker from "../CrossPlatformDateTimePicker";

import { AccommodationCreateFields } from "./AccommodationCreateFields";
import { ActivityCreateFields } from "./ActivityCreateFields";
import { ExpenseCreateFields } from "./ExpenseCreateFields";
import { TransportCreateFields, TransportMode, FlightEntryMode, TransportKind } from "./TransportCreateFields";

import { BathroomType, RoomType, TripPlanItemType, BudgetCategoryType } from "../../types/enums/travel";

// ---- types (ajusta si tu shape difiere) ----

type TopChoice = "transport" | "accommodation" | "activity" | "expense";

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

function toDayIsoFromDate(d: Date) {
  return new Date(d).toISOString().slice(0, 10) + "T00:00:00.000Z";
}
function toDayIsoFromStartAt(startAtIso: string) {
  const d = new Date(startAtIso);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10) + "T00:00:00.000Z";
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
    { key: "expense", label: "Gasto" },
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

// =============================================
// PlanItemEditorModal
// =============================================
export function PlanItemEditorModal({
  tripId,
  visible,
  onClose,
  onCreatedOrUpdated,
  onDeleted,
  px,
  fs,
  presetDate,     // opcional para create
  editingItem,    // si viene -> edit
}: {
  tripId: number;
  visible: boolean;
  onClose: () => void;
  onCreatedOrUpdated: () => void;
  onDeleted?: () => void;
  px: (n: number) => number;
  fs: (n: number) => number;
  presetDate?: string | null;
  editingItem?: TripPlanItem | null;
}) {
  const isEdit = !!editingItem?.id;

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // -------------------------
  // UI mode
  // -------------------------
  const initialTop: TopChoice = useMemo(() => {
    const t = (editingItem?.type ?? "").toString();
    if (!t) return "activity";

    if (t === "accommodation") return "accommodation";
    if (t === "expense") return "expense";
    if (t === "flight" || t === "transport_destination" || t === "transport_local" || t === "transport" || t === "taxi")
      return "transport";
    // resto: activity-ish
    return "activity";
  }, [editingItem?.type]);

  const [top, setTop] = useState<TopChoice>(initialTop);

  // -------------------------
  // Transport state
  // -------------------------
  const [transportKind, setTransportKind] = useState<TransportKind>(() => {
    const t = (editingItem?.type ?? "").toString();
    return t === "transport_local" ? "local" : "principal";
  });

  const [mode, setMode] = useState<TransportMode | null>(() => {
    const t = (editingItem?.type ?? "").toString();
    if (t === "flight") return "flight";
    if (t === "transport_destination") {
      const m = editingItem?.destinationTransportDetails?.mode;
      if (m === "train" || m === "bus" || m === "car") return m;
      return "train";
    }
    return null;
  });

  // shared transport cost
  const [costStr, setCostStr] = useState<string>(() => (editingItem?.cost ?? "") === 0 ? "0" : (editingItem?.cost ? String(editingItem.cost) : ""));
  const [currency, setCurrency] = useState<string>(() => (editingItem?.currency || "EUR").toString().trim().toUpperCase() || "EUR");

  // flight
  const [flightEntryMode, setFlightEntryMode] = useState<FlightEntryMode>("manual"); // en edición forzamos manual
  const [flightNumber, setFlightNumber] = useState<string>(() => {
    const fd = editingItem?.flightDetails;
    return (fd?.flightNumberIata || fd?.flightNumberRaw || "").toString();
  });
  const [flightDate, setFlightDate] = useState<Date | null>(() => null); // solo para autofill (create)
  const [flightAirline, setFlightAirline] = useState<string>(() => (editingItem?.flightDetails?.airlineName || "").toString());
  const [flightFrom, setFlightFrom] = useState<string>(() => (editingItem?.flightDetails?.fromName || editingItem?.location || "").toString());
  const [flightTo, setFlightTo] = useState<string>(() => (editingItem?.flightDetails?.toName || "").toString());
  const [flightDep, setFlightDep] = useState<Date | null>(() => (editingItem?.startAt ? new Date(editingItem.startAt) : null));
  const [flightArr, setFlightArr] = useState<Date | null>(() => (editingItem?.endAt ? new Date(editingItem.endAt) : null));

  // destination transport
  const [company, setCompany] = useState<string>(() => (editingItem?.destinationTransportDetails?.company || "").toString());
  const [bookingRef, setBookingRef] = useState<string>(() => (editingItem?.destinationTransportDetails?.bookingRef || "").toString());
  const [from, setFrom] = useState<string>(() => (editingItem?.destinationTransportDetails?.fromName || editingItem?.location || "").toString());
  const [to, setTo] = useState<string>(() => (editingItem?.destinationTransportDetails?.toName || "").toString());
  const [dep, setDep] = useState<Date | null>(() => (editingItem?.startAt ? new Date(editingItem.startAt) : null));
  const [arr, setArr] = useState<Date | null>(() => (editingItem?.endAt ? new Date(editingItem.endAt) : null));

  // local transport
  const [localTitle, setLocalTitle] = useState<string>(() => (editingItem?.type === "transport_local" ? (editingItem?.title || "") : ""));
  const [localStartAt, setLocalStartAt] = useState<Date | null>(() => (editingItem?.type === "transport_local" && editingItem?.startAt ? new Date(editingItem.startAt) : null));
  const [localEndAt, setLocalEndAt] = useState<Date | null>(() => (editingItem?.type === "transport_local" && editingItem?.endAt ? new Date(editingItem.endAt) : null));
  const [localNotes, setLocalNotes] = useState<string>(() => (editingItem?.type === "transport_local" ? (editingItem?.notes || "") : ""));
  const [localLocation, setLocalLocation] = useState<string>(() => (editingItem?.type === "transport_local" ? (editingItem?.location || "") : ""));

  // -------------------------
  // Accommodation state
  // -------------------------
  const [accName, setAccName] = useState<string>(() => (editingItem?.accommodationDetails?.name || editingItem?.title || "").toString());
  const [accAddress, setAccAddress] = useState<string>(() => (editingItem?.accommodationDetails?.address || "").toString());
  const [accCity, setAccCity] = useState<string>(() => (editingItem?.accommodationDetails?.city || "").toString());
  const [accCountry, setAccCountry] = useState<string>(() => (editingItem?.accommodationDetails?.country || "").toString());

  const [roomType, setRoomType] = useState<RoomType | null>(() => editingItem?.accommodationDetails?.roomType ?? null);
  const [bathroomType, setBathroomType] = useState<BathroomType | null>(() => editingItem?.accommodationDetails?.bathroomType ?? null);

  const [accCheckInAt, setAccCheckInAt] = useState<Date | null>(() => (editingItem?.startAt ? new Date(editingItem.startAt) : null));
  const [accCheckOutAt, setAccCheckOutAt] = useState<Date | null>(() => (editingItem?.endAt ? new Date(editingItem.endAt) : null));

  const [accGuestsStr, setAccGuestsStr] = useState<string>(() => {
    const g = editingItem?.accommodationDetails?.guests;
    return g === 0 ? "0" : g ? String(g) : "";
  });
  const [accRoomsStr, setAccRoomsStr] = useState<string>(() => {
    const r = editingItem?.accommodationDetails?.rooms;
    return r === 0 ? "0" : r ? String(r) : "";
  });

  const [accBookingRef, setAccBookingRef] = useState<string>(() => (editingItem?.accommodationDetails?.bookingRef || "").toString());
  const [accPhone, setAccPhone] = useState<string>(() => (editingItem?.accommodationDetails?.phone || "").toString());
  const [accWebsite, setAccWebsite] = useState<string>(() => (editingItem?.accommodationDetails?.website || "").toString());

  const [accCostStr, setAccCostStr] = useState<string>(() => (editingItem?.cost ?? "") === 0 ? "0" : (editingItem?.cost ? String(editingItem.cost) : ""));
  const [accCurrency, setAccCurrency] = useState<string>(() => (editingItem?.currency || "EUR").toString().trim().toUpperCase() || "EUR");

  // -------------------------
  // Activity state
  // -------------------------
  const [actType, setActType] = useState<TripPlanItemType>(() => {
    const t = (editingItem?.type ?? "").toString();
    // si editas algo que no sea activity-ish, default:
    const allowed = Object.values(TripPlanItemType) as string[];
    if (allowed.includes(t)) return t as TripPlanItemType;
    return TripPlanItemType.activity;
  });
  const [actTitle, setActTitle] = useState<string>(() => (editingItem && initialTop === "activity" ? (editingItem.title || "") : ""));
  const [actLocation, setActLocation] = useState<string>(() => (editingItem && initialTop === "activity" ? (editingItem.location || "") : ""));
  const [actStartAt, setActStartAt] = useState<Date | null>(() => (editingItem && initialTop === "activity" && editingItem.startAt ? new Date(editingItem.startAt) : null));
  const [actEndAt, setActEndAt] = useState<Date | null>(() => (editingItem && initialTop === "activity" && editingItem.endAt ? new Date(editingItem.endAt) : null));
  const [actNotes, setActNotes] = useState<string>(() => (editingItem && initialTop === "activity" ? (editingItem.notes || "") : ""));
  const [actCostStr, setActCostStr] = useState<string>(() => (editingItem && initialTop === "activity" && editingItem.cost != null ? String(editingItem.cost) : ""));
  const [actCurrency, setActCurrency] = useState<string>(() => (editingItem && initialTop === "activity" ? ((editingItem.currency || "EUR") as string) : "EUR"));

  // -------------------------
  // Expense state
  // -------------------------
  const [expTitle, setExpTitle] = useState<string>(() => (editingItem?.type === "expense" ? (editingItem.title || "") : ""));
  const [expAmountStr, setExpAmountStr] = useState<string>(() => (editingItem?.type === "expense" && editingItem.cost != null ? String(editingItem.cost) : ""));
  const [expCurrency, setExpCurrency] = useState<string>(() => (editingItem?.type === "expense" ? ((editingItem.currency || "EUR") as string) : "EUR"));
  const [expCategory, setExpCategory] = useState<BudgetCategoryType>(() => {
    const c = editingItem?.budgetCategory as any;
    return (c as BudgetCategoryType) ?? BudgetCategoryType.other;
  });
  const [expOccurredAt, setExpOccurredAt] = useState<Date | null>(() => (editingItem?.type === "expense" && editingItem.startAt ? new Date(editingItem.startAt) : null));
  const [expNotes, setExpNotes] = useState<string>(() => (editingItem?.type === "expense" ? (editingItem.notes || "") : ""));

  // -------------------------
  // When opening: if creating with presetDate, seed some dates
  // -------------------------
  React.useEffect(() => {
    if (!visible) return;

    setErr(null);
    setSaving(false);

    if (!isEdit && presetDate) {
      const d = new Date(`${presetDate}T09:00`);
      if (!isNaN(d.getTime())) {
        // transporte principal default
        setDep(d);
        setFlightDep(d);
        setFlightDate(new Date(`${presetDate}T00:00`));
      }
    }

    // En edición, NO reseteamos estados aquí porque ya se inicializan con editingItem
    // Si necesitas re-hidratar cuando cambia editingItem con el modal abierto,
    // se haría con otro effect y setStates explícitos.
  }, [visible, presetDate, isEdit]);

  // -------------------------
  // Validations (igual que tu modal)
  // -------------------------
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
    if (parseCost(expAmountStr) == null) return false; // requerido
    if (!expCurrency.trim()) return false;
    return true;
  }, [top, expTitle, expAmountStr, expCurrency]);

  const transportValid = useMemo(() => {
    if (top !== "transport") return false;

    if (transportKind === "local") {
      if (!localTitle.trim()) return false;
      if (localStartAt && localEndAt && localEndAt.getTime() < localStartAt.getTime()) return false;
      if (costStr.trim() && parseCost(costStr) == null) return false;
      return true;
    }

    if (transportKind === "principal") {
      if (!mode) return false;
      if (costStr.trim() && parseCost(costStr) == null) return false;

      if (mode === "flight") {
        if (!isEdit && flightEntryMode === "autofill") return !!flightNumber.trim() && !!flightDate;
        // manual (edit o create manual)
        return !!flightNumber.trim() && !!flightDep && !!flightArr;
      }

      if (mode === "train" || mode === "bus") {
        return !!company.trim() && !!from.trim() && !!to.trim() && !!dep && !!arr;
      }
      if (mode === "car") {
        return !!from.trim() && !!to.trim() && !!dep && !!arr;
      }
    }

    return false;
  }, [
    top,
    transportKind,
    mode,
    isEdit,
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
    localTitle,
    localStartAt,
    localEndAt,
    costStr,
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

  const continueDisabled = useMemo(() => {
    if (saving) return true;
    if (top === "transport") return !transportValid;
    if (top === "accommodation") return !accommodationValid;
    if (top === "activity") return !activityValid;
    if (top === "expense") return !expenseValid;
    return false;
  }, [saving, top, transportValid, accommodationValid, activityValid, expenseValid]);

  const subtitle = useMemo(() => {
    if (isEdit) return "Edita el item";
    if (top === "transport") return "Crea transporte";
    if (top === "accommodation") return "Crea alojamiento";
    if (top === "expense") return "Crea un gasto";
    return "Crea una actividad";
  }, [top, isEdit]);

  // -------------------------
  // API helpers
  // -------------------------
  async function createPlanItem(dto: any) {
    return api.post(`/trips/${tripId}/plan-items`, dto);
  }
  async function updatePlanItem(planItemId: number, dto: any) {
    return api.patch(`/trips/${tripId}/plan-items/${planItemId}`, dto);
  }
  async function deletePlanItem(planItemId: number) {
    return api.delete(`/trips/${tripId}/plan-items/${planItemId}`);
  }

  // -------------------------
  // Save handlers
  // -------------------------
  async function saveExpense() {
    setErr(null);
    setSaving(true);

    const amount = parseCost(expAmountStr);
    const currencyCode = (expCurrency || "EUR").trim().toUpperCase();

    try {
      const dayIso =
        expOccurredAt ? toDayIsoFromDate(expOccurredAt)
        : presetDate ? `${presetDate}T00:00:00.000Z`
        : null;

      const dto = {
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
        budgetCategory: expCategory,
      };

      if (isEdit && editingItem?.id) await updatePlanItem(editingItem.id, dto);
      else await createPlanItem(dto);

      onClose();
      onCreatedOrUpdated();
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "No se pudo guardar el gasto.");
    } finally {
      setSaving(false);
    }
  }

  async function saveActivity() {
    setErr(null);
    setSaving(true);

    const cost = parseCost(actCostStr);
    const currencyCode = (actCurrency || "EUR").trim().toUpperCase();

    try {
      const dayIso =
        actStartAt ? toDayIsoFromDate(actStartAt)
        : presetDate ? `${presetDate}T00:00:00.000Z`
        : null;

      const dto = {
        type: actType,
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
      };

      if (isEdit && editingItem?.id) await updatePlanItem(editingItem.id, dto);
      else await createPlanItem(dto);

      onClose();
      onCreatedOrUpdated();
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "No se pudo guardar la actividad.");
    } finally {
      setSaving(false);
    }
  }

  async function saveAccommodation() {
    setErr(null);
    setSaving(true);

    const cost = parseCost(accCostStr);
    const currencyCode = (accCurrency || "EUR").trim().toUpperCase();

    const guests = parseIntNullable(accGuestsStr);
    const rooms = parseIntNullable(accRoomsStr);

    try {
      const dayIso =
        accCheckInAt ? toDayIsoFromDate(accCheckInAt)
        : presetDate ? `${presetDate}T00:00:00.000Z`
        : null;

      const dto = {
        type: "accommodation",
        title: accName.trim(),
        logistics: true,

        day: dayIso,
        startAt: accCheckInAt ? accCheckInAt.toISOString() : null,
        endAt: accCheckOutAt ? accCheckOutAt.toISOString() : null,
        timezone: null,

        cost: cost ?? null,
        currency: currencyCode,

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

          roomType: roomType ?? null,
          bathroomType: bathroomType ?? null,

          metadata: { source: isEdit ? "modal_edit" : "modal_create" },
        },
      };

      if (isEdit && editingItem?.id) await updatePlanItem(editingItem.id, dto);
      else await createPlanItem(dto);

      onClose();
      onCreatedOrUpdated();
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "No se pudo guardar el alojamiento.");
    } finally {
      setSaving(false);
    }
  }

  async function saveTransport() {
    setErr(null);
    setSaving(true);

    const cost = parseCost(costStr);
    const currencyCode = (currency || "EUR").trim().toUpperCase();

    try {
      // LOCAL
      if (transportKind === "local") {
        const dayIso =
          localStartAt ? toDayIsoFromDate(localStartAt)
          : presetDate ? `${presetDate}T00:00:00.000Z`
          : null;

        const dto = {
          type: "transport_local",
          title: localTitle.trim(),
          logistics: false,

          day: dayIso,
          startAt: localStartAt ? localStartAt.toISOString() : null,
          endAt: localEndAt ? localEndAt.toISOString() : null,
          timezone: null,

          location: (localLocation || "").trim() || null,
          notes: (localNotes || "").trim() || null,

          cost: cost ?? null,
          currency: currencyCode,
        };

        if (isEdit && editingItem?.id) await updatePlanItem(editingItem.id, dto);
        else await createPlanItem(dto);

        onClose();
        onCreatedOrUpdated();
        return;
      }

      // PRINCIPAL
      if (!mode) throw new Error("Selecciona un modo de transporte principal.");

      // Flight autofill SOLO create
      if (mode === "flight" && !isEdit && flightEntryMode === "autofill") {
        const date = flightDate ? toYMD(flightDate) : "";
        const fn = flightNumber.trim().toUpperCase();
        if (!fn || !date) throw new Error("Código de vuelo y día son obligatorios.");

        await api.post(`/trips/${tripId}/plan-items/flight/autofill`, {
          flightNumber: fn,
          date,
          cost: cost ?? null,
          currency: currencyCode,
        });

        onClose();
        onCreatedOrUpdated();
        return;
      }

      // Flight manual (create o edit)
      if (mode === "flight") {
        const fn = flightNumber.trim().toUpperCase();
        const depIso = flightDep ? flightDep.toISOString() : null;
        const arrIso = flightArr ? flightArr.toISOString() : null;
        if (!fn || !depIso || !arrIso) throw new Error("Código, salida y llegada son obligatorios.");

        const dto = {
          type: "flight",
          title: `${fn} · ${flightFrom.trim()} → ${flightTo.trim()}`.trim(),
          logistics: true,

          day: toDayIsoFromStartAt(depIso),
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

          metadata: { source: isEdit ? "manual_ui_edit" : "manual_ui_create" },
        };

        if (isEdit && editingItem?.id) await updatePlanItem(editingItem.id, dto);
        else await createPlanItem(dto);

        onClose();
        onCreatedOrUpdated();
        return;
      }

      // Train / Bus
      if (mode === "train" || mode === "bus") {
        const depIso = dep ? dep.toISOString() : null;
        const arrIso = arr ? arr.toISOString() : null;
        if (!company.trim() || !from.trim() || !to.trim() || !depIso || !arrIso) {
          throw new Error("Compañía, origen, destino, salida y llegada son obligatorios.");
        }

        const dto = {
          type: "transport_destination",
          title: `${mode === "train" ? "Tren" : "Bus"} · ${company.trim()} · ${from.trim()} → ${to.trim()}`.trim(),
          logistics: true,

          day: toDayIsoFromStartAt(depIso),
          startAt: depIso,
          endAt: arrIso,
          timezone: null,

          cost: cost ?? null,
          currency: currencyCode,

          location: from.trim() || null,
          notes: bookingRef.trim() ? `Reserva: ${bookingRef.trim()}` : null,

          destinationTransportDetails: {
            mode,
            company: company.trim() || null,
            bookingRef: bookingRef.trim() || null,
            fromName: from.trim() || null,
            toName: to.trim() || null,
            depAt: depIso,
            arrAt: arrIso,
            metadata: null,
          },
        };

        if (isEdit && editingItem?.id) await updatePlanItem(editingItem.id, dto);
        else await createPlanItem(dto);

        onClose();
        onCreatedOrUpdated();
        return;
      }

      // Car
      if (mode === "car") {
        const depIso = dep ? dep.toISOString() : null;
        const arrIso = arr ? arr.toISOString() : null;
        if (!from.trim() || !to.trim() || !depIso || !arrIso) throw new Error("Origen, destino, salida y llegada son obligatorios.");

        const dto = {
          type: "transport_destination",
          title: `Coche · ${from.trim()} → ${to.trim()}`.trim(),
          logistics: true,

          day: toDayIsoFromStartAt(depIso),
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
        };

        if (isEdit && editingItem?.id) await updatePlanItem(editingItem.id, dto);
        else await createPlanItem(dto);

        onClose();
        onCreatedOrUpdated();
        return;
      }

      throw new Error("Modo de transporte no soportado.");
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? e?.message ?? "No se pudo guardar el transporte.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!isEdit || !editingItem?.id) return;

    setErr(null);
    setSaving(true);
    try {
      await deletePlanItem(editingItem.id);
      onClose();
      onDeleted?.();
      onCreatedOrUpdated();
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "No se pudo eliminar el item.");
    } finally {
      setSaving(false);
    }
  }

  function handleSave() {
    if (top === "transport") return saveTransport();
    if (top === "accommodation") return saveAccommodation();
    if (top === "activity") return saveActivity();
    if (top === "expense") return saveExpense();
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
            maxHeight: "90vh" as any,
            ...(Platform.OS !== "web" ? { maxHeight: "90%" } : null),
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
              <Text style={{ fontSize: fs(16), fontWeight: "900", color: UI.text }}>
                {isEdit ? "Editar item" : "Añadir al viaje"}
              </Text>
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
              paddingBottom: px(10),
              gap: px(12),
            }}
            style={{ flexGrow: 0, flexShrink: 1 }}
          >
            {/* Tabs: en edit podrías bloquear el cambio de top si quieres; aquí lo dejo abierto */}
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
                DateField={() => null as any} // no lo usamos aquí; si tu TransportCreateFields lo necesita, tráetelo del modal viejo
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
                flightEntryMode={isEdit ? "manual" : flightEntryMode}
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
            ) : (
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
            )}

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
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {/* Left actions */}
            <View style={{ flexDirection: "row", gap: px(10) }}>
              {isEdit ? (
                <Pressable
                  disabled={saving}
                  onPress={handleDelete}
                  style={({ pressed }) => ({
                    opacity: saving ? 0.45 : pressed ? 0.92 : 1,
                    height: px(44),
                    borderRadius: px(14),
                    backgroundColor: "rgba(239,68,68,0.08)",
                    borderWidth: 1,
                    borderColor: "rgba(239,68,68,0.25)",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: px(16),
                    flexDirection: "row",
                    gap: px(8),
                  })}
                >
                  {saving ? <ActivityIndicator /> : <Ionicons name="trash-outline" size={px(16)} color="#EF4444" />}
                  <Text style={{ fontSize: fs(13), fontWeight: "800", color: "#EF4444" }}>Eliminar</Text>
                </Pressable>
              ) : null}
            </View>

            {/* Right actions */}
            <View style={{ flexDirection: "row", gap: px(10) }}>
              <Pressable
                disabled={saving}
                onPress={onClose}
                style={({ pressed }) => ({
                  opacity: saving ? 0.45 : pressed ? 0.92 : 1,
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
                <Text style={{ fontSize: fs(13), fontWeight: "700", color: UI.text }}>Cancelar</Text>
              </Pressable>

              <Pressable
                disabled={continueDisabled}
                onPress={handleSave}
                style={({ pressed }) => ({
                  opacity: continueDisabled ? 0.45 : pressed ? 0.92 : 1,
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
                {saving ? <ActivityIndicator /> : null}
                <Text style={{ fontSize: fs(13), fontWeight: "600", color: "white" }}>
                  {isEdit ? "Guardar cambios" : "Guardar"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
