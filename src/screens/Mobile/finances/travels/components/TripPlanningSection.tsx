// src/screens/Trips/components/TripPlanningSection.redesign.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../../../../../theme/theme";

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
  day?: string | null; // YYYY-MM-DD o ISO
  date?: string | null; // ISO
  startAt?: string | null; // ISO o "HH:MM"
  endAt?: string | null;
  startTime?: string | null; // ISO
  endTime?: string | null;
  location?: string | null;
  notes?: string | null;
  transactionId?: number | null;
  cost?: number | null;
  logistics?: boolean | null;
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
  other: {
    icon: "options-outline",
    accent: UI.text,
    badgeBg: "rgba(15,23,42,0.06)",
    badgeBorder: "rgba(148,163,184,0.28)",
  },
};

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
  onPress,
}: {
  item: TripPlanItem;
  onPress: () => void;
}) {
  const meta = TYPE_META[item.type] ?? TYPE_META.other ?? {
    icon: "options-outline",
    accent: UI.text,
    badgeBg: "rgba(15,23,42,0.06)",
    badgeBorder: UI.border,
  };

  const start = item.startAt ?? item.startTime ?? null;
  const end = item.endAt ?? item.endTime ?? null;
  const time = fmtTimeRangeSameDay(start, end);

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
      })}
    >
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

        {!!(item.location || item.notes) && (
          <Text
            style={{ marginTop: 3, fontSize: 11, fontWeight: "700", color: UI.muted2 }}
            numberOfLines={2}
          >
            {item.location || ""}
            {item.location && item.notes ? " · " : ""}
            {item.notes || ""}
          </Text>
        )}
      </View>

      {/* Right meta (hora) */}
      {!!time && (
        <View style={{ alignItems: "flex-end", paddingLeft: 6, minWidth: 64 }}>
          <Text style={{ marginTop: 1, fontSize: 11, fontWeight: "900", color: UI.muted }}>
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
}: TripPlanningSectionProps) {
  const navigation = useNavigation<any>();
  const { height } = useWindowDimensions();
  const LIST_MAX_H = Math.max(220, Math.round(height * 0.56));

  const handleCreate = (dateISO?: string) => {
    navigation.navigate("TripPlanForm", { tripId, presetDay: dateISO || "" });
  };

  const handleEdit = (item: TripPlanItem) => {
    navigation.navigate("TripPlanForm", { tripId, planItem: item });
  };

  // 1) Filtrado: excluimos accommodation; dejamos items sin fecha para "Sin fecha"
  const planningItems = useMemo(
    () => planItems.filter((i) => i.type !== "accommodation"),
    [planItems]
  );

  // 2) Days: preferimos trip.startDate/endDate. Si no hay, inferimos del planning.
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

  // 3) Agrupar por día + NO_DATE
  const byDate = useMemo(() => {
    const map: Record<string, TripPlanItem[]> = {};
    for (const it of planningItems) {
      const k = isoDay(it.day ?? it.date ?? null) ?? NO_DATE;
      (map[k] ||= []).push(it);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => {
        const as = fmtTime(a.startAt ?? a.startTime ?? null) || "99:99";
        const bs = fmtTime(b.startAt ?? b.startTime ?? null) || "99:99";
        if (as !== bs) return as.localeCompare(bs);
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

  const [selectedDay, setSelectedDay] = useState<string>(dayKeys[0] ?? NO_DATE);

  useEffect(() => {
    if (!dayKeys.length) {
      setSelectedDay(NO_DATE);
      return;
    }
    if (!dayKeys.includes(selectedDay)) setSelectedDay(dayKeys[0] ?? NO_DATE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKeys.join("|")]);

  const dayItems = byDate[selectedDay] ?? [];
  const isNoDate = selectedDay === NO_DATE;
  const dayNumber = isNoDate ? null : Math.max(1, dayKeys.findIndex((d) => d === selectedDay) + 1);

  const hasAny = planningItems.length > 0;

  if (!hasAny) {
    return (
      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 22 }}
        >
          <View style={{ marginTop: 28, alignItems: "center", paddingHorizontal: 14 }}>
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
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Day selector */}
      <View style={{ paddingHorizontal: 10, paddingTop: 6, paddingBottom: 4 }}>
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
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "900",
                    color: active ? colors.primary : UI.text,
                  }}
                  numberOfLines={1}
                >
                  {noDate ? "Sin fecha" : `Día ${idx + 1}`}
                </Text>

                <Text
                  style={{ marginTop: 1, fontSize: 10, fontWeight: "700", color: active ? "rgba(37,99,235,0.85)" : UI.muted2 }}
                  numberOfLines={1}
                >
                  {noDate ? "Items sin día" : fmtDayTitle(d)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Timeline + content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 18 }}
      >
        {/* Header */}
        <View style={{ marginTop: 4, marginBottom: 10, flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <Text style={{ fontSize: 16, fontWeight: "900", color: UI.text }}>
            {isNoDate ? "Día: Sin fecha" : `Día ${dayNumber}:`}
          </Text>
          {!isNoDate && (
            <Text style={{ fontSize: 11, fontWeight: "700", color: UI.muted2 }}>
              {fmtDayTitle(selectedDay)}
            </Text>
          )}
        </View>

        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
          {/* rail */}
          <View style={{ width: 16, alignItems: "center" }}>
            <View style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: UI.text, marginTop: 6 }} />
            <View style={{ width: 2, backgroundColor: UI.rail, flex: 1, minHeight: 110, marginTop: 6 }} />
          </View>

          {/* list */}
          <View style={{ flex: 1, minWidth: 0 }}>
            {dayItems.length === 0 ? (
              <EmptyDayCard onPress={() => handleCreate(isNoDate ? "" : selectedDay)} />
            ) : (
              <View style={{ maxHeight: LIST_MAX_H, gap: 10 }}>
                {dayItems.map((it) => (
                  <ActivityCard key={it.id} item={it} onPress={() => handleEdit(it)} />
                ))}
              </View>
            )}

            {/* Bottom add button */}
            <View style={{ marginTop: 12 }}>
              <Pressable
                onPress={() => handleCreate(isNoDate ? "" : selectedDay)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 9,
                  borderRadius: 14,
                  backgroundColor: "rgba(248,250,252,1)",
                  borderWidth: 1,
                  borderColor: UI.border,
                  opacity: pressed ? 0.96 : 1,
                })}
              >
                <Ionicons name="add-outline" size={16} color={UI.muted2} />
                <Text style={{ marginLeft: 7, fontSize: 12, fontWeight: "900", color: UI.muted2 }}>
                  Añadir al planning
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
