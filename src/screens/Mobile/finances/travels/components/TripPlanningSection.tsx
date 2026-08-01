// src/screens/Trips/components/TripPlanningSection.redesign.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, useWindowDimensions, Linking, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../../../../../theme/theme";
import api from "../../../../../api/api";

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
  | "activity";

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
  metadata?: { expenseCategory?: string | null } | null;
  flightDetails?: {
    flightNumber?: string | null;
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
}

type TripLike = { startDate?: string | null; endDate?: string | null };

interface TripPlanningSectionProps {
  tripId: number;
  trip?: TripLike;
  planItems: TripPlanItem[];
  onRefresh?: () => void;
  onDeleteItem?: (id: number) => void;
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
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  badgeBg: string;
  badgeBorder: string;
};

const TYPE_META: Partial<Record<TripPlanItemType, TypeMeta>> = {
  flight: {
    icon: "airplane-outline",
    accent: "#2563EB",
    badgeBg: "rgba(37,99,235,0.10)",
    badgeBorder: "rgba(37,99,235,0.25)",
  },
  accommodation: {
    icon: "bed-outline",
    accent: "#16A34A",
    badgeBg: "rgba(22,163,74,0.10)",
    badgeBorder: "rgba(22,163,74,0.25)",
  },
  transport_destination: {
    icon: "bus-outline",
    accent: "#0EA5E9",
    badgeBg: "rgba(14,165,233,0.10)",
    badgeBorder: "rgba(14,165,233,0.25)",
  },
  transport_local: {
    icon: "bus-outline",
    accent: "#0EA5E9",
    badgeBg: "rgba(14,165,233,0.10)",
    badgeBorder: "rgba(14,165,233,0.25)",
  },
  transport: {
    icon: "bus-outline",
    accent: "#0EA5E9",
    badgeBg: "rgba(14,165,233,0.10)",
    badgeBorder: "rgba(14,165,233,0.25)",
  },
  taxi: {
    icon: "car-sport-outline",
    accent: "#0EA5E9",
    badgeBg: "rgba(14,165,233,0.10)",
    badgeBorder: "rgba(14,165,233,0.25)",
  },
  museum: {
    icon: "library-outline",
    accent: "#A855F7",
    badgeBg: "rgba(168,85,247,0.10)",
    badgeBorder: "rgba(168,85,247,0.25)",
  },
  monument: {
    icon: "business-outline",
    accent: "#A855F7",
    badgeBg: "rgba(168,85,247,0.10)",
    badgeBorder: "rgba(168,85,247,0.25)",
  },
  viewpoint: {
    icon: "eye-outline",
    accent: "#A855F7",
    badgeBg: "rgba(168,85,247,0.10)",
    badgeBorder: "rgba(168,85,247,0.25)",
  },
  free_tour: {
    icon: "walk-outline",
    accent: "#A855F7",
    badgeBg: "rgba(168,85,247,0.10)",
    badgeBorder: "rgba(168,85,247,0.25)",
  },
  guided_tour: {
    icon: "map-outline",
    accent: "#A855F7",
    badgeBg: "rgba(168,85,247,0.10)",
    badgeBorder: "rgba(168,85,247,0.25)",
  },
  concert: {
    icon: "musical-notes-outline",
    accent: "#F97316",
    badgeBg: "rgba(249,115,22,0.10)",
    badgeBorder: "rgba(249,115,22,0.25)",
  },
  sport: {
    icon: "football-outline",
    accent: "#F97316",
    badgeBg: "rgba(249,115,22,0.10)",
    badgeBorder: "rgba(249,115,22,0.25)",
  },
  bar_party: {
    icon: "wine-outline",
    accent: "#F97316",
    badgeBg: "rgba(249,115,22,0.10)",
    badgeBorder: "rgba(249,115,22,0.25)",
  },
  nightlife: {
    icon: "moon-outline",
    accent: "#F97316",
    badgeBg: "rgba(249,115,22,0.10)",
    badgeBorder: "rgba(249,115,22,0.25)",
  },
  beach: {
    icon: "sunny-outline",
    accent: "#EAB308",
    badgeBg: "rgba(234,179,8,0.10)",
    badgeBorder: "rgba(234,179,8,0.25)",
  },
  hike: {
    icon: "trail-sign-outline",
    accent: "#22C55E",
    badgeBg: "rgba(34,197,94,0.10)",
    badgeBorder: "rgba(34,197,94,0.25)",
  },
  restaurant: {
    icon: "restaurant-outline",
    accent: "#EF4444",
    badgeBg: "rgba(239,68,68,0.10)",
    badgeBorder: "rgba(239,68,68,0.25)",
  },
  cafe: {
    icon: "cafe-outline",
    accent: "#EF4444",
    badgeBg: "rgba(239,68,68,0.10)",
    badgeBorder: "rgba(239,68,68,0.25)",
  },
  market: {
    icon: "storefront-outline",
    accent: "#EF4444",
    badgeBg: "rgba(239,68,68,0.10)",
    badgeBorder: "rgba(239,68,68,0.25)",
  },
  shopping: {
    icon: "cart-outline",
    accent: "#64748B",
    badgeBg: "rgba(100,116,139,0.10)",
    badgeBorder: "rgba(100,116,139,0.25)",
  },
  day_trip: {
    icon: "bus-outline",
    accent: UI.text,
    badgeBg: "rgba(15,23,42,0.06)",
    badgeBorder: "rgba(148,163,184,0.28)",
  },
  activity: {
    icon: "flash-outline",
    accent: UI.text,
    badgeBg: "rgba(15,23,42,0.06)",
    badgeBorder: "rgba(148,163,184,0.28)",
  },
  expense: {
    icon: "receipt-outline",
    accent: UI.text,
    badgeBg: "rgba(15,23,42,0.06)",
    badgeBorder: "rgba(148,163,184,0.28)",
  },
};

const EXPENSE_CAT_META: Record<string, TypeMeta> = {
  transport_main: { icon: "airplane-outline", accent: "#2563EB", badgeBg: "rgba(37,99,235,0.12)", badgeBorder: "rgba(37,99,235,0.20)" },
  transport_local: { icon: "car-outline", accent: "#0EA5E9", badgeBg: "rgba(14,165,233,0.12)", badgeBorder: "rgba(14,165,233,0.20)" },
  accommodation: { icon: "bed-outline", accent: "#16A34A", badgeBg: "rgba(22,163,74,0.12)", badgeBorder: "rgba(22,163,74,0.20)" },
  food: { icon: "restaurant-outline", accent: "#EF4444", badgeBg: "rgba(239,68,68,0.10)", badgeBorder: "rgba(239,68,68,0.20)" },
  activities: { icon: "map-outline", accent: "#A855F7", badgeBg: "rgba(168,85,247,0.12)", badgeBorder: "rgba(168,85,247,0.20)" },
  shopping: { icon: "cart-outline", accent: "#64748B", badgeBg: "rgba(100,116,139,0.12)", badgeBorder: "rgba(100,116,139,0.20)" },
  leisure: { icon: "wine-outline", accent: "#F97316", badgeBg: "rgba(249,115,22,0.12)", badgeBorder: "rgba(249,115,22,0.20)" },
  other: { icon: "options-outline", accent: UI.text, badgeBg: "rgba(15,23,42,0.06)", badgeBorder: "rgba(148,163,184,0.28)" },
};

const QUICK_TYPES: Array<{ value: TripPlanItemType; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: "activity", label: "Actividad", icon: "flash-outline" },
  { value: "restaurant", label: "Restaurante", icon: "restaurant-outline" },
  { value: "museum", label: "Museo", icon: "library-outline" },
  { value: "monument", label: "Monumento", icon: "business-outline" },
  { value: "beach", label: "Playa", icon: "sunny-outline" },
  { value: "free_tour", label: "Tour", icon: "walk-outline" },
  { value: "concert", label: "Concierto", icon: "musical-notes-outline" },
  { value: "bar_party", label: "Ocio", icon: "wine-outline" },
  { value: "shopping", label: "Compras", icon: "cart-outline" },
  { value: "expense", label: "Gasto", icon: "receipt-outline" },
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
function fmtTimeRangeForDay(item: TripPlanItem, currentDay: string): string {
  const position = getItemDayPosition(item, currentDay);
  const start = item.startAt || item.startTime || item.day || item.date;
  const end = item.endAt || item.endTime;

  switch (position) {
    case "single":
      // Same day: "09:00 - 18:00"
      return fmtTimeRangeSameDay(start, end);

    case "start":
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
              <Ionicons name={qt.icon} size={14} color={active ? meta.accent : UI.muted2} />
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

function ActivityCard({
  item,
  currentDay,
  onPress,
}: {
  item: TripPlanItem;
  currentDay: string;
  onPress: () => void;
}) {
  const baseMeta = TYPE_META[item.type] ?? TYPE_META.other ?? {
    icon: "options-outline" as keyof typeof Ionicons.glyphMap,
    accent: UI.text,
    badgeBg: "rgba(15,23,42,0.06)",
    badgeBorder: UI.border,
  };
  const expCat = item.type === "expense" ? (item.metadata?.expenseCategory ?? null) : null;
  const transportMode = (item.type === "transport_local" || item.type === "transport_destination")
    ? (item.destinationTransport?.mode ?? null) : null;
  const transportIcon: keyof typeof Ionicons.glyphMap | null =
    transportMode === "car" ? "car-outline"
    : transportMode === "train" ? "train-outline"
    : transportMode === "bus" ? "bus-outline"
    : null;
  const meta = (expCat && EXPENSE_CAT_META[expCat])
    ? { ...baseMeta, ...EXPENSE_CAT_META[expCat] }
    : transportIcon
    ? { ...baseMeta, icon: transportIcon }
    : baseMeta;

  const start = item.startAt ?? item.startTime ?? null;
  const end = item.endAt ?? item.endTime ?? null;
  const time = fmtTimeRangeForDay(item, currentDay);
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
          borderWidth: 1,
          borderColor: meta.badgeBorder,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
        }}
      >
        <Ionicons name={meta.icon} size={16} color={meta.accent} />
      </View>

      {/* Main */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 12, fontWeight: "900", color: UI.text }} numberOfLines={2}>
          {item.title}
        </Text>

        {/* Flight details inline */}
        {item.type === "flight" && item.flightDetails && (() => {
          const fd = item.flightDetails;
          const route = fd.fromIata && fd.toIata ? `${fd.fromIata} → ${fd.toIata}` : null;
          const airline = fd.airlineName || null;
          const flightNum = fd.flightNumber || null;
          const subline = [airline, route].filter(Boolean).join(" · ");
          return (
            <View>
              {!!subline && (
                <Text style={{ marginTop: 2, fontSize: 11, fontWeight: "700", color: UI.muted2 }} numberOfLines={1}>
                  {subline}
                </Text>
              )}
              {!!flightNum && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`https://www.flightradar24.com/${flightNum.replace(/\s/g, "")}`)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4, alignSelf: "flex-start" }}
                  activeOpacity={0.75}
                >
                  <View style={{ backgroundColor: "rgba(37,99,235,0.10)", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="radio-outline" size={10} color="#2563EB" />
                    <Text style={{ fontSize: 10, fontWeight: "800", color: "#2563EB" }}>{flightNum} · Ver estado</Text>
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
      </View>

      {/* Right col: hora + pin */}
      {(!!time || !!item.location) && (
        <View style={{ alignItems: "flex-end", justifyContent: "space-between", paddingLeft: 6, minWidth: 52, alignSelf: "stretch" }}>
          {!!time && (
            <Text style={{ fontSize: 11, fontWeight: "900", color: UI.muted }}>
              {time}
            </Text>
          )}
          {item.type !== "flight" && !!item.location && (
            <TouchableOpacity
              onPress={(e: any) => { e?.stopPropagation?.(); Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(item.location!)}`); }}
              activeOpacity={0.7}
              style={{ marginTop: "auto" as any }}
            >
              <Ionicons name="location-outline" size={14} color={colors.primary} />
            </TouchableOpacity>
          )}
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
        const tsOf = (it: TripPlanItem) => {
          const raw = it.startAt ?? it.startTime ?? it.flightDetails?.depAt ?? it.destinationTransport?.depAt ?? it.day ?? it.date ?? null;
          if (!raw) return Infinity;
          // Si es hora sola ("13:00" o "13:00:00"), combinamos con el día del item
          const isTimeOnly = /^\d{1,2}:\d{2}(:\d{2})?$/.test(raw);
          const fullRaw = isTimeOnly
            ? `${it.day ?? it.date ?? k}T${raw}`
            : raw;
          const d = new Date(fullRaw);
          return Number.isNaN(d.getTime()) ? Infinity : d.getTime();
        };
        const ta = tsOf(a);
        const tb = tsOf(b);
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
  const [viewMode, setViewMode] = useState<"day" | "summary">("day");

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
      {/* ── Top bar: toggle + (day mode) day pills ── */}
      <View style={{ paddingHorizontal: 0, paddingTop: 6, paddingBottom: 4 }}>
        {/* View mode toggle */}
        <View style={{ flexDirection: "row", justifyContent: "flex-end", marginBottom: viewMode === "day" ? 8 : 0 }}>
          {(["day", "summary"] as const).map((mode) => {
            const active = viewMode === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => setViewMode(mode)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 10,
                  backgroundColor: active ? "rgba(37,99,235,0.12)" : "transparent",
                  borderWidth: active ? 1 : 0,
                  borderColor: "rgba(37,99,235,0.28)",
                  marginLeft: 4,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "800", color: active ? colors.primary : UI.muted2 }}>
                  {mode === "day" ? "Por día" : "Resumen"}
                </Text>
              </Pressable>
            );
          })}
        </View>

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
                      : `${fmtDayTitle(d)}${(byDate[d]?.length ?? 0) > 0 ? ` · ${byDate[d].length}` : ""}`}
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
          <View style={{ marginTop: 4, marginBottom: 10, flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <Text style={{ fontSize: 16, fontWeight: "900", color: UI.text }}>
              {isNoDate ? "Día: Sin fecha" : `Día ${dayNumber}:`}
            </Text>
            {!isNoDate && (
              <Text style={{ fontSize: 11, fontWeight: "700", color: UI.muted2 }}>{fmtDayTitle(selectedDay)}</Text>
            )}
          </View>

          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
            <View style={{ width: 16, alignItems: "center" }}>
              <View style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: UI.text, marginTop: 6 }} />
              <View style={{ width: 2, backgroundColor: UI.rail, flex: 1, minHeight: 110, marginTop: 6 }} />
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              {dayItems.length === 0 ? (
                <EmptyDayCard onPress={() => handleCreate(isNoDate ? "" : selectedDay)} />
              ) : (
                <View style={{ maxHeight: LIST_MAX_H, gap: 10 }}>
                  {dayItems.map((it) => (
                    <ActivityCard key={it.id} item={it} currentDay={selectedDay} onPress={() => handleEdit(it)} />
                  ))}
                </View>
              )}

              <View style={{ marginTop: 12 }}>
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
                  <Pressable
                    onPress={() => handleCreate()}
                    style={({ pressed }) => ({
                      flexDirection: "row", alignItems: "center", justifyContent: "center",
                      paddingVertical: 9, borderRadius: 14,
                      backgroundColor: "rgba(248,250,252,1)", borderWidth: 1, borderColor: UI.border,
                      opacity: pressed ? 0.96 : 1,
                    })}
                  >
                    <Ionicons name="add-outline" size={16} color={UI.muted2} />
                    <Text style={{ marginLeft: 7, fontSize: 12, fontWeight: "900", color: UI.muted2 }}>Añadir al planning</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {/* ── SUMMARY MODE ── */}
      {viewMode === "summary" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 32 }}
        >
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
                      <ActivityCard key={`${d}-${it.id}`} item={it} currentDay={d} onPress={() => handleEdit(it)} />
                    ))}
                  </View>
                )}
              </View>
            );
          })}

          {/* Add button at bottom */}
          <Pressable
            onPress={() => { setViewMode("day"); handleCreate(); }}
            style={({ pressed }) => ({
              flexDirection: "row", alignItems: "center", justifyContent: "center",
              paddingVertical: 9, borderRadius: 14, marginTop: 4,
              backgroundColor: "rgba(248,250,252,1)", borderWidth: 1, borderColor: UI.border,
              opacity: pressed ? 0.96 : 1,
            })}
          >
            <Ionicons name="add-outline" size={16} color={UI.muted2} />
            <Text style={{ marginLeft: 7, fontSize: 12, fontWeight: "900", color: UI.muted2 }}>Añadir al planning</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}
