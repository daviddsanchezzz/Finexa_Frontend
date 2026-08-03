// src/screens/Trips/components/TripPlanningSection.redesign.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, useWindowDimensions, Linking, TouchableOpacity, TextInput, ActivityIndicator, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../../../../../theme/theme";
import api from "../../../../../api/api";
import TripMapView from "./TripMapView";

type TripPlanItemType =
  | "flight"
  | "accommodation"
  | "transport_destination"
  | "transport_local"
  | "transport"
  | "taxi"
  | "museum"
  | "monument"
  | "viewpoint"
  | "free_tour"
  | "guided_tour"
  | "concert"
  | "sport"
  | "bar_party"
  | "nightlife"
  | "beach"
  | "hike"
  | "restaurant"
  | "cafe"
  | "market"
  | "shopping"
  | "day_trip"
  | "expense"
  | "other"
  | "activity"
  | "visit";

export type VisitStopType = "comida" | "monumento" | "mirador" | "museo" | "teatro" | "compras" | "otro";

export interface VisitStop {
  id: string;
  label: string;
  stopType: VisitStopType;
}

export const VISIT_STOP_TYPES: { value: VisitStopType; label: string; emoji: string }[] = [
  { value: "comida", label: "Comida", emoji: "🍽️" },
  { value: "monumento", label: "Monumento", emoji: "🏛️" },
  { value: "mirador", label: "Mirador", emoji: "👁️" },
  { value: "museo", label: "Museo", emoji: "🖼️" },
  { value: "teatro", label: "Teatro", emoji: "🎭" },
  { value: "compras", label: "Compras", emoji: "🛍️" },
  { value: "otro", label: "Otro", emoji: "📍" },
];

export function visitStopEmoji(stopType: VisitStopType): string {
  return VISIT_STOP_TYPES.find((t) => t.value === stopType)?.emoji ?? "📍";
}

export interface TripPlanItem {
  id: number;
  type: TripPlanItemType;
  title: string;
  day?: string | null;
  date?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  notes?: string | null;
  transactionId?: number | null;
  cost?: number | null;
  logistics?: boolean | null;
  metadata?: { expenseCategory?: string | null; stops?: VisitStop[] } | null;
  flightDetails?: {
    flightNumberIata?: string | null;
    flightNumberRaw?: string | null;
    airlineName?: string | null;
    fromIata?: string | null;
    toIata?: string | null;
    depAt?: string | null;
    arrAt?: string | null;
  } | null;
  destinationTransport?: {
    mode?: string | null;
    company?: string | null;
    bookingRef?: string | null;
    fromName?: string | null;
    toName?: string | null;
    depAt?: string | null;
    arrAt?: string | null;
  } | null;
  accommodationDetails?: {
    name?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    checkInAt?: string | null;
    checkOutAt?: string | null;
    coverImageUrl?: string | null;
  } | null;
}

type TripLike = { startDate?: string | null; endDate?: string | null; name?: string | null; destination?: string | null };

interface TripPlanningSectionProps {
  tripId: number;
  trip?: TripLike;
  planItems: TripPlanItem[];
  onRefresh?: () => void;
  onDeleteItem?: (id: number) => void;
  viewMode?: "day" | "summary";
  onChangeViewMode?: (mode: "day" | "summary") => void;
}

const UI = {
  text: "#0B1220",
  // un poco más oscuros para legibilidad
  muted: "rgba(71,85,105,0.92)", // slate-600
  muted2: "rgba(100,116,139,0.9)", // slate-500
  border: "rgba(148,163,184,0.45)",
  rail: "rgba(148,163,184,0.32)",
  surface: "white",
};

type TypeMeta = {
  emoji: string;
  accent: string;
  badgeBg: string;
  badgeBorder: string;
};

const TYPE_META: Partial<Record<TripPlanItemType, TypeMeta>> = {
  flight:                { emoji: "✈️",  accent: "#2563EB", badgeBg: "rgba(37,99,235,0.10)",  badgeBorder: "rgba(37,99,235,0.25)" },
  accommodation:         { emoji: "🏨",  accent: "#16A34A", badgeBg: "rgba(22,163,74,0.10)",  badgeBorder: "rgba(22,163,74,0.25)" },
  transport_destination: { emoji: "🚌",  accent: "#0EA5E9", badgeBg: "rgba(14,165,233,0.10)", badgeBorder: "rgba(14,165,233,0.25)" },
  transport_local:       { emoji: "🚌",  accent: "#0EA5E9", badgeBg: "rgba(14,165,233,0.10)", badgeBorder: "rgba(14,165,233,0.25)" },
  transport:             { emoji: "🚌",  accent: "#0EA5E9", badgeBg: "rgba(14,165,233,0.10)", badgeBorder: "rgba(14,165,233,0.25)" },
  taxi:                  { emoji: "🚕",  accent: "#0EA5E9", badgeBg: "rgba(14,165,233,0.10)", badgeBorder: "rgba(14,165,233,0.25)" },
  museum:                { emoji: "🏛️", accent: "#A855F7", badgeBg: "rgba(168,85,247,0.10)", badgeBorder: "rgba(168,85,247,0.25)" },
  monument:              { emoji: "🗿",  accent: "#A855F7", badgeBg: "rgba(168,85,247,0.10)", badgeBorder: "rgba(168,85,247,0.25)" },
  viewpoint:             { emoji: "🌅",  accent: "#A855F7", badgeBg: "rgba(168,85,247,0.10)", badgeBorder: "rgba(168,85,247,0.25)" },
  free_tour:             { emoji: "🚶",  accent: "#A855F7", badgeBg: "rgba(168,85,247,0.10)", badgeBorder: "rgba(168,85,247,0.25)" },
  guided_tour:           { emoji: "🗺️", accent: "#A855F7", badgeBg: "rgba(168,85,247,0.10)", badgeBorder: "rgba(168,85,247,0.25)" },
  concert:               { emoji: "🎵",  accent: "#F97316", badgeBg: "rgba(249,115,22,0.10)", badgeBorder: "rgba(249,115,22,0.25)" },
  sport:                 { emoji: "⚽",  accent: "#F97316", badgeBg: "rgba(249,115,22,0.10)", badgeBorder: "rgba(249,115,22,0.25)" },
  bar_party:             { emoji: "🍷",  accent: "#F97316", badgeBg: "rgba(249,115,22,0.10)", badgeBorder: "rgba(249,115,22,0.25)" },
  nightlife:             { emoji: "🌙",  accent: "#F97316", badgeBg: "rgba(249,115,22,0.10)", badgeBorder: "rgba(249,115,22,0.25)" },
  beach:                 { emoji: "🏖️", accent: "#EAB308", badgeBg: "rgba(234,179,8,0.10)",  badgeBorder: "rgba(234,179,8,0.25)" },
  hike:                  { emoji: "🥾",  accent: "#22C55E", badgeBg: "rgba(34,197,94,0.10)",  badgeBorder: "rgba(34,197,94,0.25)" },
  restaurant:            { emoji: "🍽️", accent: "#EF4444", badgeBg: "rgba(239,68,68,0.10)",  badgeBorder: "rgba(239,68,68,0.25)" },
  cafe:                  { emoji: "☕",  accent: "#EF4444", badgeBg: "rgba(239,68,68,0.10)",  badgeBorder: "rgba(239,68,68,0.25)" },
  market:                { emoji: "🛒",  accent: "#EF4444", badgeBg: "rgba(239,68,68,0.10)",  badgeBorder: "rgba(239,68,68,0.25)" },
  shopping:              { emoji: "🛍️", accent: "#64748B", badgeBg: "rgba(100,116,139,0.10)",badgeBorder: "rgba(100,116,139,0.25)" },
  day_trip:              { emoji: "🗺️", accent: UI.text,   badgeBg: "rgba(15,23,42,0.06)",   badgeBorder: "rgba(148,163,184,0.28)" },
  activity:              { emoji: "⚡",  accent: UI.text,   badgeBg: "rgba(15,23,42,0.06)",   badgeBorder: "rgba(148,163,184,0.28)" },
  expense:               { emoji: "🧾",  accent: UI.text,   badgeBg: "rgba(15,23,42,0.06)",   badgeBorder: "rgba(148,163,184,0.28)" },
  visit:                 { emoji: "🚶",  accent: "#6366F1", badgeBg: "rgba(99,102,241,0.10)", badgeBorder: "rgba(99,102,241,0.25)" },
};

const EXPENSE_CAT_META: Record<string, TypeMeta> = {
  transport_main:  { emoji: "✈️",  accent: "#2563EB", badgeBg: "rgba(37,99,235,0.12)",  badgeBorder: "rgba(37,99,235,0.20)" },
  transport_local: { emoji: "🚗",  accent: "#0EA5E9", badgeBg: "rgba(14,165,233,0.12)", badgeBorder: "rgba(14,165,233,0.20)" },
  accommodation:   { emoji: "🏨",  accent: "#16A34A", badgeBg: "rgba(22,163,74,0.12)",  badgeBorder: "rgba(22,163,74,0.20)" },
  food:            { emoji: "🍽️", accent: "#EF4444", badgeBg: "rgba(239,68,68,0.10)",  badgeBorder: "rgba(239,68,68,0.20)" },
  activities:      { emoji: "🗺️", accent: "#A855F7", badgeBg: "rgba(168,85,247,0.12)", badgeBorder: "rgba(168,85,247,0.20)" },
  shopping:        { emoji: "🛍️", accent: "#64748B", badgeBg: "rgba(100,116,139,0.12)",badgeBorder: "rgba(100,116,139,0.20)" },
  leisure:         { emoji: "🍷",  accent: "#F97316", badgeBg: "rgba(249,115,22,0.12)", badgeBorder: "rgba(249,115,22,0.20)" },
  other:           { emoji: "📌",  accent: UI.text,   badgeBg: "rgba(15,23,42,0.06)",   badgeBorder: "rgba(148,163,184,0.28)" },
};

const QUICK_TYPES: Array<{ value: TripPlanItemType; label: string; emoji: string }> = [
  { value: "activity",   label: "Actividad",   emoji: "⚡" },
  { value: "restaurant", label: "Restaurante", emoji: "🍽️" },
  { value: "museum",     label: "Museo",       emoji: "🏛️" },
  { value: "monument",   label: "Monumento",   emoji: "🗿" },
  { value: "beach",      label: "Playa",       emoji: "🏖️" },
  { value: "free_tour",  label: "Tour",        emoji: "🚶" },
  { value: "concert",    label: "Concierto",   emoji: "🎵" },
  { value: "bar_party",  label: "Ocio",        emoji: "🍷" },
  { value: "shopping",   label: "Compras",     emoji: "🛍️" },
  { value: "expense",    label: "Gasto",       emoji: "🧾" },
];

function parseCostQuick(input: string): number | null {
  const s = (input || "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return isFinite(n) && n >= 0 ? n : null;
}

const NO_DATE = "SIN_FECHA";

const safeDate = (input?: string | null) => {
  if (!input) return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
};

const isoDay = (input?: string | null) => {
  if (!input) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const d = safeDate(input);
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const daysBetween = (start?: string | null, end?: string | null) => {
  const s = safeDate(start);
  const e = safeDate(end);
  if (!s || !e) return [];
  const cur = new Date(s.getFullYear(), s.getMonth(), s.getDate());
  const last = new Date(e.getFullYear(), e.getMonth(), e.getDate());
  const out: string[] = [];
  while (cur.getTime() <= last.getTime()) {
    out.push(
      `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`
    );
    cur.setDate(cur.getDate() + 1);
  }
  return out;
};

function buildVisitMapsUrl(stops: VisitStop[], cityContext?: string | null): string | null {
  const queries = stops
    .map((s) => (cityContext ? `${s.label}, ${cityContext}` : s.label))
    .filter((q) => q.trim().length > 0);
  if (queries.length === 0) return null;
  if (queries.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queries[0])}`;
  }
  const origin = queries[0];
  const destination = queries[queries.length - 1];
  const waypoints = queries.slice(1, -1);
  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: "walking",
  });
  if (waypoints.length > 0) params.set("waypoints", waypoints.join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Timestamp (ms) usado para ordenar items cronológicamente, dentro de un día o a lo largo de todo el viaje. */
function itemTimestamp(it: TripPlanItem, fallbackDayKey?: string): number {
  const raw = it.startAt ?? it.startTime ?? it.flightDetails?.depAt ?? it.destinationTransport?.depAt ?? it.day ?? it.date ?? null;
  if (!raw) return Infinity;
  // Si es hora sola ("13:00" o "13:00:00"), combinamos con el día del item
  const isTimeOnly = /^\d{1,2}:\d{2}(:\d{2})?$/.test(raw);
  const fullRaw = isTimeOnly
    ? `${it.day ?? it.date ?? fallbackDayKey ?? ""}T${raw}`
    : raw;
  const d = new Date(fullRaw);
  return Number.isNaN(d.getTime()) ? Infinity : d.getTime();
}

const fmtDayTitle = (dateISO: string) => {
  const d = new Date(`${dateISO}T00:00:00`);
  const weekday = d.toLocaleDateString("es-ES", { weekday: "long" });
  const dd = d.toLocaleDateString("es-ES", { day: "2-digit" });
  const mon = d.toLocaleDateString("es-ES", { month: "short" });
  return `${weekday[0].toUpperCase()}${weekday.slice(1)}, ${dd} ${mon}`;
};

const fmtTime = (t?: string | null) => {
  if (!t) return "";
  if (/^\d{2}:\d{2}$/.test(t)) return t;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
};

const sameIsoDay = (a?: string | null, b?: string | null) => {
  const da = safeDate(a);
  const db = safeDate(b);
  if (!da || !db) return false;
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
};

const fmtTimeRangeSameDay = (start?: string | null, end?: string | null) => {
  if (!start) return "";
  const s = fmtTime(start);
  const e = end ? fmtTime(end) : "";
  if (!e) return s;
  return sameIsoDay(start, end) ? `${s} - ${e}` : s;
};

// ===== Multi-day activity helpers =====

type DayPosition = "single" | "start" | "middle" | "end";

/**
 * Get all days spanned by an activity (from startTime to endTime)
 */
function getDaysSpanned(item: TripPlanItem): string[] {
  const start = item.startAt || item.startTime || item.day || item.date;
  const end = item.endAt || item.endTime;

  if (!start) return [NO_DATE];

  const startDay = isoDay(start);
  if (!startDay) return [NO_DATE];

  // If no endTime or same day, return only start day
  const endDay = end ? isoDay(end) : null;
  if (!endDay || endDay === startDay) {
    return [startDay];
  }

  // Generate all days between start and end (inclusive)
  const days: string[] = [];
  const current = new Date(startDay + "T00:00:00");
  const last = new Date(endDay + "T00:00:00");

  while (current <= last) {
    const dayStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
    days.push(dayStr);
    current.setDate(current.getDate() + 1);
  }

  return days;
}

/**
 * Determine if item is on a single day or spans multiple days, and position within span
 */
function getItemDayPosition(item: TripPlanItem, currentDay: string): DayPosition {
  const start = item.startAt || item.startTime || item.day || item.date;
  const end = item.endAt || item.endTime;

  if (!start || !end) return "single";

  const startDay = isoDay(start);
  const endDay = isoDay(end);

  if (!startDay || !endDay || startDay === endDay) return "single";

  if (currentDay === startDay) return "start";
  if (currentDay === endDay) return "end";
  return "middle";
}

/**
 * Format time range for a specific day, showing continuation indicators for multi-day activities
 */
function fmtTimeRangeForDay(item: TripPlanItem, currentDay: string, isLastTripDay?: boolean): string {
  const position = getItemDayPosition(item, currentDay);
  const start = item.startAt || item.startTime || item.day || item.date;
  const end = item.endAt || item.endTime;

  switch (position) {
    case "single":
      // Same day: "09:00 - 18:00"
      return fmtTimeRangeSameDay(start, end);

    case "start":
      // Último día del viaje: no hay tarjeta del día siguiente donde ver la llegada,
      // así que mostramos ambas horas aquí: "22:15 → 00:15"
      if (isLastTripDay) return `${fmtTime(start)} → ${fmtTime(end)}`;
      // Start day: "09:00 →"
      return `${fmtTime(start)} →`;

    case "middle":
      // Middle day: "← Todo el día →"
      return "← Todo el día →";

    case "end":
      // End day: "→ 18:00"
      return `→ ${fmtTime(end)}`;
  }
}

function QuickAddForm({
  quickType, setQuickType, quickTitle, setQuickTitle,
  quickCostStr, setQuickCostStr, quickSaving, onSave, onFullForm, onCancel,
}: {
  quickType: TripPlanItemType;
  setQuickType: (t: TripPlanItemType) => void;
  quickTitle: string;
  setQuickTitle: (v: string) => void;
  quickCostStr: string;
  setQuickCostStr: (v: string) => void;
  quickSaving: boolean;
  onSave: () => void;
  onFullForm: () => void;
  onCancel: () => void;
}) {
  return (
    <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: UI.border, padding: 14, gap: 12 }}>
      {/* Type selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {QUICK_TYPES.map((qt) => {
          const active = quickType === qt.value;
          const meta = TYPE_META[qt.value] ?? { accent: UI.text, badgeBg: "rgba(15,23,42,0.06)", badgeBorder: UI.border };
          return (
            <Pressable
              key={qt.value}
              onPress={() => setQuickType(qt.value)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                paddingHorizontal: 10,
                paddingVertical: 7,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: active ? meta.badgeBorder : UI.border,
                backgroundColor: active ? meta.badgeBg : "transparent",
              }}
            >
              <Text style={{ fontSize: 14, lineHeight: 17 }}>{qt.emoji}</Text>
              <Text style={{ fontSize: 11, fontWeight: "800", color: active ? meta.accent : UI.muted2 }}>{qt.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Title input */}
      <TextInput
        value={quickTitle}
        onChangeText={setQuickTitle}
        placeholder="¿Qué vas a hacer?"
        placeholderTextColor={UI.muted2}
        autoFocus
        style={{
          height: 42,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: UI.border,
          paddingHorizontal: 12,
          fontSize: 13,
          fontWeight: "700",
          color: UI.text,
          backgroundColor: "#F8FAFC",
        }}
      />

      {/* Cost row */}
      <View style={{ flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, borderColor: UI.border, backgroundColor: "#F8FAFC", paddingHorizontal: 12, height: 38 }}>
        <Ionicons name="wallet-outline" size={14} color={UI.muted2} style={{ marginRight: 6 }} />
        <TextInput
          value={quickCostStr}
          onChangeText={setQuickCostStr}
          placeholder="Coste (opcional)"
          placeholderTextColor={UI.muted2}
          keyboardType="decimal-pad"
          style={{ flex: 1, fontSize: 13, fontWeight: "700", color: UI.text }}
        />
        <Text style={{ fontSize: 12, color: UI.muted2, fontWeight: "700" }}>€</Text>
      </View>

      {/* Action buttons */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={onCancel}
          style={{ paddingVertical: 9, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: UI.border }}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted }}>Cancelar</Text>
        </Pressable>

        <Pressable
          onPress={onFullForm}
          style={{ paddingVertical: 9, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: UI.border, flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted }}>Detalles</Text>
          <Ionicons name="chevron-forward" size={12} color={UI.muted} />
        </Pressable>

        <Pressable
          onPress={onSave}
          disabled={!quickTitle.trim() || quickSaving}
          style={({ pressed }) => ({
            flex: 1,
            paddingVertical: 9,
            borderRadius: 12,
            backgroundColor: !quickTitle.trim() ? "#E2E8F0" : colors.primary,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.9 : 1,
            flexDirection: "row",
            gap: 6,
          })}
        >
          {quickSaving
            ? <ActivityIndicator size="small" color="white" />
            : <Text style={{ fontSize: 12, fontWeight: "800", color: !quickTitle.trim() ? UI.muted : "white" }}>Añadir</Text>
          }
        </Pressable>
      </View>
    </View>
  );
}

function EmptyDayCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: 14,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: UI.border,
        backgroundColor: UI.surface,
        padding: 12,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        opacity: pressed ? 0.95 : 1,
      })}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: UI.border,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: UI.surface,
        }}
      >
        <Ionicons name="add" size={16} color={UI.muted2} />
      </View>

      <Text style={{ fontSize: 11, fontWeight: "700", color: UI.muted2, textAlign: "center" }}>
        No hay actividades para este día todavía.
      </Text>
      <Text style={{ fontSize: 11, fontWeight: "900", color: colors.primary }}>
        Explorar sugerencias
      </Text>
    </Pressable>
  );
}

function VisitActivityCard({
  item,
  currentDay,
  isLastDay,
  cityContext,
  onEdit,
}: {
  item: TripPlanItem;
  currentDay: string;
  isLastDay?: boolean;
  cityContext?: string | null;
  onEdit: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = TYPE_META.visit!;
  const stops = item.metadata?.stops ?? [];
  const time = fmtTimeRangeForDay(item, currentDay, isLastDay);
  const mapsUrl = buildVisitMapsUrl(stops, cityContext);

  return (
    <View
      style={{
        backgroundColor: UI.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: UI.border,
        overflow: "hidden",
      }}
    >
      <Pressable
        onPress={onEdit}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingVertical: 10,
          paddingHorizontal: 10,
          opacity: pressed ? 0.97 : 1,
        })}
      >
        <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: meta.badgeBg, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 17, lineHeight: 20 }}>{meta.emoji}</Text>
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 12, fontWeight: "900", color: UI.text }} numberOfLines={1}>{item.title}</Text>
          <Text style={{ fontSize: 11, fontWeight: "700", color: UI.muted2, marginTop: 2 }} numberOfLines={1}>
            {stops.length} {stops.length === 1 ? "parada" : "paradas"}
          </Text>
        </View>

        {!!time && (
          <View style={{ alignItems: "flex-end", paddingLeft: 6, minWidth: 48 }}>
            <Text style={{ fontSize: 11, fontWeight: "900", color: UI.text }}>{time}</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={(e: any) => { e?.stopPropagation?.(); setExpanded((v) => !v); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ padding: 2 }}
        >
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={UI.muted2} />
        </TouchableOpacity>
      </Pressable>

      {expanded && (
        <View style={{ paddingHorizontal: 10, paddingBottom: 10, gap: 6 }}>
          {stops.map((s, i) => (
            <View key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 8 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: meta.accent }} />
              <Text style={{ fontSize: 15 }}>{visitStopEmoji(s.stopType)}</Text>
              <Text style={{ fontSize: 12, fontWeight: "700", color: UI.text, flex: 1 }} numberOfLines={1}>{s.label}</Text>
            </View>
          ))}

          {!!mapsUrl && (
            <TouchableOpacity
              onPress={() => Linking.openURL(mapsUrl)}
              activeOpacity={0.7}
              style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4, paddingLeft: 8 }}
            >
              <Text style={{ fontSize: 10 }}>📍</Text>
              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary }}>Ver ruta en Google Maps</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function ActivityCard({
  item,
  currentDay,
  isLastDay,
  cityContext,
  onPress,
}: {
  item: TripPlanItem;
  currentDay: string;
  isLastDay?: boolean;
  cityContext?: string | null;
  onPress: () => void;
}) {
  if (item.type === "visit") {
    return <VisitActivityCard item={item} currentDay={currentDay} isLastDay={isLastDay} cityContext={cityContext} onEdit={onPress} />;
  }

  const baseMeta = TYPE_META[item.type] ?? TYPE_META.other ?? {
    emoji: "📌",
    accent: UI.text,
    badgeBg: "rgba(15,23,42,0.06)",
    badgeBorder: UI.border,
  };
  const expCat = item.type === "expense" ? (item.metadata?.expenseCategory ?? null) : null;
  const transportMode = (item.type === "transport_local" || item.type === "transport_destination" || item.type === "transport")
    ? (item.destinationTransport?.mode ?? null) : null;
  const transportEmoji: string | null =
    transportMode === "car" ? "🚗"
    : transportMode === "train" ? "🚂"
    : transportMode === "bus" ? "🚌"
    : transportMode === "ferry" ? "⛴️"
    : null;
  const meta = (expCat && EXPENSE_CAT_META[expCat])
    ? { ...baseMeta, ...EXPENSE_CAT_META[expCat] }
    : transportEmoji
    ? { ...baseMeta, emoji: transportEmoji }
    : baseMeta;

  const start = item.startAt ?? item.startTime ?? null;
  const end = item.endAt ?? item.endTime ?? null;
  const time = fmtTimeRangeForDay(item, currentDay, isLastDay);
  const position = getItemDayPosition(item, currentDay);
  const isMultiDay = position !== "single";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: UI.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: UI.border,
        paddingVertical: 10,
        paddingHorizontal: 10,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        opacity: pressed ? 0.97 : 1,
        overflow: "hidden",
        position: "relative",
      })}
    >
      {/* Multi-day indicator bar */}
      {isMultiDay && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            backgroundColor: meta.accent,
            opacity: 0.7,
          }}
        />
      )}

      {/* Icon badge */}
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          backgroundColor: meta.badgeBg,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
        }}
      >
        <Text style={{ fontSize: 17, lineHeight: 20 }}>{meta.emoji}</Text>
      </View>

      {/* Main */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 12, fontWeight: "900", color: UI.text }} numberOfLines={2}>
          {item.title}
        </Text>

        {/* Flight details inline */}
        {item.type === "flight" && item.flightDetails && (() => {
          const fd = item.flightDetails;
          const airline = fd.airlineName || null;
          const flightNum = fd.flightNumberIata || fd.flightNumberRaw || null;
          const subline = [airline, flightNum].filter(Boolean).join(" · ");
          return (
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2, gap: 5 }}>
              {!!subline && (
                <Text style={{ fontSize: 11, fontWeight: "700", color: UI.muted2, flexShrink: 1 }} numberOfLines={1}>
                  {subline}
                </Text>
              )}
              {!!flightNum && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`https://www.flightradar24.com/data/flights/${flightNum.replace(/\s/g, "").toLowerCase()}`)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  activeOpacity={0.7}
                >
                  <View style={{ backgroundColor: "rgba(37,99,235,0.10)", borderRadius: 6, padding: 3.5 }}>
                    <Ionicons name="radio-outline" size={10} color="#2563EB" />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          );
        })()}

        {item.type !== "flight" && !!item.notes && (
          <Text style={{ fontSize: 11, fontWeight: "700", color: UI.muted2, marginTop: 2 }} numberOfLines={1}>
            {item.notes}
          </Text>
        )}

        {item.type !== "flight" && !!item.location && (
          <TouchableOpacity
            onPress={(e: any) => { e?.stopPropagation?.(); Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(item.location!)}`); }}
            activeOpacity={0.7}
            style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4, alignSelf: "flex-start" }}
          >
            <Text style={{ fontSize: 10 }}>📍</Text>
            <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary }}>Ver ubicación</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Right col: hora */}
      {!!time && (
        <View style={{ alignItems: "flex-end", paddingLeft: 6, minWidth: 48, alignSelf: "center" }}>
          <Text style={{ fontSize: 11, fontWeight: "900", color: UI.text }}>
            {time}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function TripPlanningSectionRedesign({
  tripId,
  trip,
  planItems,
  onRefresh,
  viewMode: viewModeProp,
  onChangeViewMode,
}: TripPlanningSectionProps) {
  const navigation = useNavigation<any>();
  const { height } = useWindowDimensions();
  const LIST_MAX_H = Math.max(220, Math.round(height * 0.56));

  // ── Derived data ──────────────────────────────────────────────────────────

  const accommodationEvents = useMemo(() => {
    const events: TripPlanItem[] = [];
    for (const item of planItems) {
      if (item.type !== "accommodation") continue;
      const accName = item.accommodationDetails?.name || item.title;
      const checkInAt = item.accommodationDetails?.checkInAt;
      const checkOutAt = item.accommodationDetails?.checkOutAt;
      const accLocation = [item.accommodationDetails?.address, item.accommodationDetails?.city]
        .filter(Boolean).join(", ") || item.location || null;
      if (checkInAt) {
        events.push({
          ...item,
          id: -(item.id * 2),
          _realId: item.id,
          startAt: checkInAt,
          startTime: checkInAt,
          day: isoDay(checkInAt) ?? undefined,
          endAt: null,
          endTime: null,
          title: `Check-in · ${accName}`,
          location: accLocation,
        } as any);
      }
      if (checkOutAt) {
        events.push({
          ...item,
          id: -(item.id * 2 + 1),
          _realId: item.id,
          startAt: checkOutAt,
          startTime: checkOutAt,
          day: isoDay(checkOutAt) ?? undefined,
          endAt: null,
          endTime: null,
          title: `Check-out · ${accName}`,
          location: accLocation,
        } as any);
      }
    }
    return events;
  }, [planItems]);

  const planningItems = useMemo(
    () => [...planItems.filter((i) => i.type !== "accommodation"), ...accommodationEvents],
    [planItems, accommodationEvents]
  );

  // Igual que planningItems pero ordenado cronológicamente: los check-in/check-out de
  // alojamiento se añaden al final del array sin ordenar, lo que descolocaba el mapa
  // en vista semana (la vista día sí quedaba bien porque byDate ordena cada bucket).
  const planningItemsSorted = useMemo(
    () => [...planningItems].sort((a, b) => itemTimestamp(a) - itemTimestamp(b)),
    [planningItems]
  );

  const days = useMemo(() => {
    const byTrip = trip?.startDate && trip?.endDate ? daysBetween(trip.startDate, trip.endDate) : [];
    if (byTrip.length) return byTrip;
    const dated = planningItems
      .map((i) => isoDay(i.day ?? i.date ?? null))
      .filter((d): d is string => !!d);
    if (!dated.length) return [];
    const sorted = [...dated].sort();
    return daysBetween(sorted[0], sorted[sorted.length - 1]);
  }, [trip?.startDate, trip?.endDate, planningItems]);

  const byDate = useMemo(() => {
    const map: Record<string, TripPlanItem[]> = {};
    for (const it of planningItems) {
      for (const day of getDaysSpanned(it)) {
        (map[day] ||= []).push(it);
      }
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => {
        const ta = itemTimestamp(a, k);
        const tb = itemTimestamp(b, k);
        if (ta !== tb) return ta - tb;
        return (a.title || "").localeCompare(b.title || "");
      });
    }
    return map;
  }, [planningItems]);

  const hasNoDate = (byDate[NO_DATE]?.length ?? 0) > 0;
  const dayKeys = useMemo(() => {
    const base = days.length ? days : [];
    if (!base.length && hasNoDate) return [NO_DATE];
    return hasNoDate ? [...base, NO_DATE] : base;
  }, [days, hasNoDate]);

  // ── State ─────────────────────────────────────────────────────────────────

  const [selectedDay, setSelectedDay] = useState<string>(dayKeys[0] ?? NO_DATE);

  useEffect(() => {
    if (!dayKeys.length) { setSelectedDay(NO_DATE); return; }
    if (!dayKeys.includes(selectedDay)) setSelectedDay(dayKeys[0] ?? NO_DATE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKeys.join("|")]);

  const scrollRef = useRef<ScrollView>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickType, setQuickType] = useState<TripPlanItemType>("activity");
  const [quickTitle, setQuickTitle] = useState("");
  const [quickCostStr, setQuickCostStr] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);
  const [internalViewMode, setInternalViewMode] = useState<"day" | "summary">("day");
  const viewMode = viewModeProp ?? internalViewMode;
  const setViewMode = (m: "day" | "summary") => { setInternalViewMode(m); onChangeViewMode?.(m); };
  const [showMap, setShowMap] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCreate = (_dateISO?: string) => {
    setQuickType("activity");
    setQuickTitle("");
    setQuickCostStr("");
    setShowQuickAdd(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  };

  const handleEdit = (item: TripPlanItem) => {
    const realItem = (item as any)._realId
      ? { ...item, id: (item as any)._realId }
      : item;
    navigation.navigate("TripPlanForm", { tripId, planItem: realItem });
  };

  const handleQuickSave = async () => {
    if (!quickTitle.trim() || quickSaving) return;
    setQuickSaving(true);
    try {
      const cost = parseCostQuick(quickCostStr);
      const startTime = (selectedDay && selectedDay !== NO_DATE) ? `${selectedDay}T09:00:00` : undefined;
      await api.post(`/trips/${tripId}/plan-items`, {
        type: quickType,
        title: quickTitle.trim(),
        ...(cost !== null ? { cost } : {}),
        ...(startTime ? { startTime } : {}),
      });
      setShowQuickAdd(false);
      setQuickTitle("");
      setQuickCostStr("");
      onRefresh?.();
    } catch (e) {
      console.error("Error guardando plan item rápido:", e);
    } finally {
      setQuickSaving(false);
    }
  };

  const handleOpenFullForm = () => {
    setShowQuickAdd(false);
    const presetDay = selectedDay !== NO_DATE ? selectedDay : "";
    navigation.navigate("TripPlanForm", { tripId, presetDay, presetType: quickType });
  };

  const dayItems = byDate[selectedDay] ?? [];
  const isNoDate = selectedDay === NO_DATE;
  const dayNumber = isNoDate ? null : Math.max(1, dayKeys.findIndex((d) => d === selectedDay) + 1);

  // Map keys — force remount when item identity or order changes (geocoding stays cached)
  const summaryMapKey = planningItems.map(i => `${i.id}:${(i as any).startAt ?? (i as any).day ?? ""}`).join("|");
  const dayMapKey = `${selectedDay}:` + dayItems.map(i => `${i.id}:${(i as any).startAt ?? ""}`).join("|");

  const hasAny = planningItems.length > 0;

  if (!hasAny) {
    return (
      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 0, paddingTop: 14, paddingBottom: 22 }}
        >
          <View style={{ marginTop: 28, paddingHorizontal: 4 }}>
            {showQuickAdd ? (
              <QuickAddForm
                quickType={quickType}
                setQuickType={setQuickType}
                quickTitle={quickTitle}
                setQuickTitle={setQuickTitle}
                quickCostStr={quickCostStr}
                setQuickCostStr={setQuickCostStr}
                quickSaving={quickSaving}
                onSave={handleQuickSave}
                onFullForm={handleOpenFullForm}
                onCancel={() => { setShowQuickAdd(false); setQuickTitle(""); }}
              />
            ) : (
              <View style={{ alignItems: "center" }}>
                <Text style={{ textAlign: "center", color: UI.muted2, fontSize: 11, fontWeight: "700", marginBottom: 10 }}>
                  Aún no tienes nada en el planning de este viaje.
                </Text>
                <Pressable
                  onPress={() => handleCreate("")}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 9,
                    paddingHorizontal: 12,
                    borderRadius: 14,
                    backgroundColor: "rgba(37,99,235,0.10)",
                    borderWidth: 1,
                    borderColor: "rgba(37,99,235,0.22)",
                    opacity: pressed ? 0.95 : 1,
                  })}
                >
                  <Ionicons name="add-outline" size={16} color={colors.primary} />
                  <Text style={{ marginLeft: 7, fontSize: 12, fontWeight: "900", color: "rgba(30,64,175,1)" }}>
                    Añadir primer plan
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* ── Top bar: day pills (day mode only) ── */}
      <View style={{ paddingHorizontal: 0, paddingTop: 6, paddingBottom: 4 }}>
        {/* Day pills — only in day mode */}
        {viewMode === "day" && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 4, gap: 8 }}
          >
            {dayKeys.map((d, idx) => {
              const active = d === selectedDay;
              const noDate = d === NO_DATE;
              return (
                <Pressable
                  key={d}
                  onPress={() => setSelectedDay(d)}
                  style={({ pressed }) => ({
                    height: 40,
                    minWidth: 104,
                    paddingHorizontal: 10,
                    borderRadius: 14,
                    backgroundColor: active ? "rgba(37,99,235,0.12)" : UI.surface,
                    borderWidth: 1,
                    borderColor: active ? "rgba(37,99,235,0.32)" : UI.border,
                    justifyContent: "center",
                    opacity: pressed ? 0.96 : 1,
                  })}
                >
                  <Text style={{ fontSize: 11, fontWeight: "900", color: active ? colors.primary : UI.text }} numberOfLines={1}>
                    {noDate ? "Sin fecha" : `Día ${idx + 1}`}
                  </Text>
                  <Text style={{ marginTop: 1, fontSize: 10, fontWeight: "700", color: active ? "rgba(37,99,235,0.85)" : UI.muted2 }} numberOfLines={1}>
                    {noDate
                      ? `${byDate[NO_DATE]?.length ?? 0} sin fecha`
                      : fmtDayTitle(d)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* ── DAY MODE ── */}
      {viewMode === "day" && (
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 18 }}
        >
          {/* Mapa inline del día */}
          {dayItems.length > 0 && (
            <View style={{ marginBottom: 14, borderRadius: 16, borderWidth: 1, borderColor: UI.border, overflow: "hidden", height: 160 }}>
              <TripMapView key={dayMapKey} planItems={dayItems} />
              <Pressable
                onPress={() => setShowMap(true)}
                style={{
                  position: "absolute", top: 8, right: 8,
                  width: 30, height: 30, borderRadius: 8,
                  backgroundColor: "rgba(255,255,255,0.88)",
                  alignItems: "center", justifyContent: "center",
                  shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
                }}
              >
                <Ionicons name="expand-outline" size={15} color={UI.text} />
              </Pressable>
            </View>
          )}

          {/* Día header */}
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: "900", color: UI.muted, letterSpacing: 0.3 }}>
              {isNoDate ? "SIN FECHA" : `DÍA ${dayNumber} · ${fmtDayTitle(selectedDay).toUpperCase()}`}
            </Text>
          </View>

          {dayItems.length === 0 ? (
            <EmptyDayCard onPress={() => handleCreate(isNoDate ? "" : selectedDay)} />
          ) : (
            <View style={{ position: "relative" }}>
              {/* Continuous timeline line */}
              {dayItems.length > 1 && (
                <View style={{
                  position: "absolute",
                  left: 10,
                  top: 18,
                  bottom: 18,
                  width: 2,
                  backgroundColor: UI.rail,
                }} />
              )}
              {dayItems.map((it, idx) => {
                const isLast = idx === dayItems.length - 1;
                const bMeta = TYPE_META[it.type];
                const expCat = it.type === "expense" ? (it.metadata?.expenseCategory ?? null) : null;
                const dotAccent = expCat && EXPENSE_CAT_META[expCat as string]
                  ? EXPENSE_CAT_META[expCat as string].accent
                  : bMeta?.accent ?? UI.text;

                return (
                  <View key={it.id} style={{ flexDirection: "row", alignItems: "flex-start" }}>
                    {/* Timeline dot */}
                    <View style={{ width: 22, alignItems: "center", paddingTop: 13 }}>
                      <View style={{
                        width: 10, height: 10, borderRadius: 99,
                        backgroundColor: dotAccent,
                        borderWidth: 2, borderColor: "#F6F8FC",
                        zIndex: 1,
                      }} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 6, marginBottom: isLast ? 0 : 10 }}>
                      <ActivityCard item={it} currentDay={selectedDay} isLastDay={selectedDay === dayKeys[dayKeys.length - 1]} cityContext={trip?.name} onPress={() => handleEdit(it)} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}

        </ScrollView>
      )}

      {/* ── SUMMARY MODE ── */}
      {viewMode === "summary" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 32 }}
        >
          {/* Full-trip map */}
          {planningItems.length > 0 && (
            <View style={{ marginBottom: 20, borderRadius: 16, borderWidth: 1, borderColor: UI.border, overflow: "hidden", height: 200 }}>
              <TripMapView key={summaryMapKey} planItems={planningItemsSorted} />
              <Pressable
                onPress={() => setShowMap(true)}
                style={{
                  position: "absolute", top: 8, right: 8,
                  width: 30, height: 30, borderRadius: 8,
                  backgroundColor: "rgba(255,255,255,0.88)",
                  alignItems: "center", justifyContent: "center",
                  shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
                }}
              >
                <Ionicons name="expand-outline" size={15} color={UI.text} />
              </Pressable>
            </View>
          )}

          {dayKeys.map((d, idx) => {
            const noDate = d === NO_DATE;
            const items = byDate[d] ?? [];
            const dayNum = noDate ? null : idx + 1;
            const dayCost = items.reduce((sum, it) => sum + (it.cost ? Number(it.cost) : 0), 0);

            return (
              <View key={d} style={{ marginBottom: 20 }}>
                {/* Day separator header */}
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: UI.border }} />
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ fontSize: 10, fontWeight: "900", color: UI.muted, letterSpacing: 0.5 }}>
                      {noDate ? "SIN FECHA" : `DÍA ${dayNum} · ${fmtDayTitle(d).toUpperCase()}`}
                    </Text>
                    {!noDate && (items.length > 0 || dayCost > 0) && (
                      <Text style={{ fontSize: 10, fontWeight: "700", color: UI.muted2, marginTop: 1 }}>
                        {items.length > 0 ? `${items.length} actividad${items.length !== 1 ? "es" : ""}` : ""}
                        {items.length > 0 && dayCost > 0 ? " · " : ""}
                        {dayCost > 0 ? `${dayCost.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €` : ""}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1, height: 1, backgroundColor: UI.border }} />
                </View>

                {/* Items */}
                {items.length === 0 ? (
                  <Pressable
                    onPress={() => { setViewMode("day"); setSelectedDay(d); handleCreate(d); }}
                    style={{ paddingVertical: 8, alignItems: "center" }}
                  >
                    <Text style={{ fontSize: 11, color: UI.muted2, fontWeight: "600" }}>Sin actividades — toca para añadir</Text>
                  </Pressable>
                ) : (
                  <View style={{ gap: 8 }}>
                    {items.map((it) => (
                      <ActivityCard key={`${d}-${it.id}`} item={it} currentDay={d} isLastDay={d === dayKeys[dayKeys.length - 1]} cityContext={trip?.name} onPress={() => handleEdit(it)} />
                    ))}
                  </View>
                )}
              </View>
            );
          })}

        </ScrollView>
      )}

      {/* ── MODAL MAPA ── */}
      <Modal visible={showMap} animationType="slide" onRequestClose={() => setShowMap(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
          <View style={{
            flexDirection: "row", alignItems: "center",
            paddingHorizontal: 16, paddingVertical: 12,
            borderBottomWidth: 1, borderBottomColor: "#E2E8F0",
          }}>
            <Ionicons name="map-outline" size={18} color={colors.primary} />
            <Text style={{ flex: 1, marginLeft: 10, fontSize: 15, fontWeight: "700", color: "#0F172A" }}>
              Mapa del viaje
            </Text>
            <Pressable onPress={() => setShowMap(false)} hitSlop={12}>
              <Ionicons name="close" size={22} color="#64748B" />
            </Pressable>
          </View>
          <TripMapView planItems={viewMode === "day" ? dayItems : planningItemsSorted} />
        </SafeAreaView>
      </Modal>
    </View>
  );
}
