import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, Platform, ScrollView, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { TripPlanItem } from "../../screens/Desktop/travel/TripDetailDesktopScreen";
import { formatEuro, safeDate, UI } from "./ui";
import { colors } from "../../theme/theme";
import { textStyles } from "../../theme/typography";

import { TripPlanItemType } from "../../types/enums/travel";

type TypeMeta = {
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  badgeBg: string;
  badgeBorder: string;
};

const TYPE_META: Partial<Record<TripPlanItemType, TypeMeta>> = {
  // Logistics
  flight: {
    icon: "airplane-outline",
    accent: "#2563EB",
    badgeBg: "rgba(37,99,235,0.10)",
    badgeBorder: "rgba(37,99,235,0.22)",
  },
  accommodation: {
    icon: "bed-outline",
    accent: "#16A34A",
    badgeBg: "rgba(22,163,74,0.10)",
    badgeBorder: "rgba(22,163,74,0.22)",
  },
  transport_destination: {
    icon: "bus-outline",
    accent: "#0EA5E9",
    badgeBg: "rgba(14,165,233,0.10)",
    badgeBorder: "rgba(14,165,233,0.22)",
  },
  transport_local: {
    icon: "bus-outline",
    accent: "#0EA5E9",
    badgeBg: "rgba(14,165,233,0.10)",
    badgeBorder: "rgba(14,165,233,0.22)",
  },

  // Culture / tourism
  museum: {
    icon: "library-outline",
    accent: "#A855F7",
    badgeBg: "rgba(168,85,247,0.10)",
    badgeBorder: "rgba(168,85,247,0.22)",
  },
  monument: {
    icon: "business-outline",
    accent: "#A855F7",
    badgeBg: "rgba(168,85,247,0.10)",
    badgeBorder: "rgba(168,85,247,0.22)",
  },
  viewpoint: {
    icon: "eye-outline",
    accent: "#A855F7",
    badgeBg: "rgba(168,85,247,0.10)",
    badgeBorder: "rgba(168,85,247,0.22)",
  },
  free_tour: {
    icon: "walk-outline",
    accent: "#A855F7",
    badgeBg: "rgba(168,85,247,0.10)",
    badgeBorder: "rgba(168,85,247,0.22)",
  },
  guided_tour: {
    icon: "map-outline",
    accent: "#A855F7",
    badgeBg: "rgba(168,85,247,0.10)",
    badgeBorder: "rgba(168,85,247,0.22)",
  },

  // Leisure
  concert: {
    icon: "musical-notes-outline",
    accent: "#F97316",
    badgeBg: "rgba(249,115,22,0.10)",
    badgeBorder: "rgba(249,115,22,0.22)",
  },
  sport: {
    icon: "football-outline",
    accent: "#F97316",
    badgeBg: "rgba(249,115,22,0.10)",
    badgeBorder: "rgba(249,115,22,0.22)",
  },
  bar_party: {
    icon: "wine-outline",
    accent: "#F97316",
    badgeBg: "rgba(249,115,22,0.10)",
    badgeBorder: "rgba(249,115,22,0.22)",
  },
  nightlife: {
    icon: "moon-outline",
    accent: "#F97316",
    badgeBg: "rgba(249,115,22,0.10)",
    badgeBorder: "rgba(249,115,22,0.22)",
  },

  // Nature
  beach: {
    icon: "sunny-outline",
    accent: "#EAB308",
    badgeBg: "rgba(234,179,8,0.10)",
    badgeBorder: "rgba(234,179,8,0.22)",
  },
  hike: {
    icon: "trail-sign-outline",
    accent: "#22C55E",
    badgeBg: "rgba(34,197,94,0.10)",
    badgeBorder: "rgba(34,197,94,0.22)",
  },

  // Food
  restaurant: {
    icon: "restaurant-outline",
    accent: "#EF4444",
    badgeBg: "rgba(239,68,68,0.10)",
    badgeBorder: "rgba(239,68,68,0.22)",
  },
  cafe: {
    icon: "cafe-outline",
    accent: "#EF4444",
    badgeBg: "rgba(239,68,68,0.10)",
    badgeBorder: "rgba(239,68,68,0.22)",
  },
  market: {
    icon: "storefront-outline",
    accent: "#EF4444",
    badgeBg: "rgba(239,68,68,0.10)",
    badgeBorder: "rgba(239,68,68,0.22)",
  },

  // Shopping
  shopping: {
    icon: "cart-outline",
    accent: "#64748B",
    badgeBg: "rgba(100,116,139,0.10)",
    badgeBorder: "rgba(100,116,139,0.22)",
  },

  // Generic
  day_trip: {
    icon: "bus-outline",
    accent: "#0B1220",
    badgeBg: "rgba(15,23,42,0.08)",
    badgeBorder: "rgba(148,163,184,0.22)",
  },
  activity: {
    icon: "flash-outline",
    accent: "#0B1220",
    badgeBg: "rgba(15,23,42,0.08)",
    badgeBorder: "rgba(148,163,184,0.22)",
  },
  expense: {
    icon: "receipt-outline",
    accent: "#0B1220",
    badgeBg: "rgba(15,23,42,0.08)",
    badgeBorder: "rgba(148,163,184,0.22)",
  },
  other: {
    icon: "options-outline",
    accent: "#0B1220",
    badgeBg: "rgba(15,23,42,0.08)",
    badgeBorder: "rgba(148,163,184,0.22)",
  },
};


type TripLike = { startDate?: string | null; endDate?: string | null };

const NO_DATE = "SIN_FECHA";

/** ===== helpers (compactos) ===== */
const isoDay = (input?: string | null) => {
  if (!input) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
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
    out.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`);
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

const sameIsoDay = (a?: string | null, b?: string | null) => {
  const da = safeDate(a);
  const db = safeDate(b);
  if (!da || !db) return false;
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};

const fmtTimeRangeSameDay = (start?: string | null, end?: string | null) => {
  if (!start) return "";
  const s = fmtTime(start);
  const e = end ? fmtTime(end) : "";
  if (!e) return s;
  return sameIsoDay(start, end) ? `${s} - ${e}` : s;
};


const fmtTime = (t?: string | null) => {
  if (!t) return "";
  if (/^\d{2}:\d{2}$/.test(t)) return t;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
};

const toNum = (v: any) => {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};


const metaFor = (type: string) => TYPE_META[type] ?? TYPE_META.other;

function ActivityRow({
  item,
  px,
  fs,
  onPress,
}: {
  item: TripPlanItem;
  px: (n: number) => number;
  fs: (n: number) => number;
  onPress: () => void;
}) {
const meta =
  TYPE_META[item.type] ??
  TYPE_META.other!;
const time = fmtTimeRangeSameDay(item.startAt, item.endAt);
  const costN = toNum(item.cost);

  return (
    <Pressable
      onPress={onPress}
      style={({ hovered, pressed }) => [
        {
          backgroundColor: "white",
          borderRadius: px(16),
          borderWidth: 1,
          borderColor: "rgba(226,232,240,0.95)",
          padding: px(14),
          flexDirection: "row",
          alignItems: "flex-start",
          gap: px(12),
          opacity: pressed ? 0.96 : 1,
        },
        Platform.OS === "web" && hovered ? { backgroundColor: "rgba(15,23,42,0.015)" } : null,
      ]}
    >
      {/* Icon */}
      <View
        style={{
          width: px(38),
          height: px(38),
          borderRadius: px(12),
          backgroundColor: meta.badgeBg,
          borderWidth: 1,
          borderColor: meta.badgeBorder,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={meta.icon} size={px(18)} color={meta.accent} />
      </View>

      {/* Main */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: fs(13), fontWeight: "700", color: UI.text }} numberOfLines={2}>
          {item.title}
        </Text>

        {!!(item.location || item.notes) && (
          <Text style={{ marginTop: px(4), fontSize: fs(12), fontWeight: "600", color: UI.muted }} numberOfLines={2}>
            {item.location || ""}
            {item.location && item.notes ? " · " : ""}
            {item.notes || ""}
          </Text>
        )}
      </View>

      {/* Right meta (time + cost) */}
      <View style={{ alignItems: "flex-end", paddingLeft: px(10), minWidth: px(72) }}>
        {!!time && <Text style={{ fontSize: fs(12), fontWeight: "700", color: UI.muted2 }}>{time}</Text>}

        {costN != null && (
          <Text
            style={{
              marginTop: px(6),
              fontSize: fs(12),
              fontWeight: "700",
            }}
          >
            {formatEuro(costN)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function EmptyDayCard({ px, fs, onAdd }: { px: (n: number) => number; fs: (n: number) => number; onAdd: () => void }) {
  return (
    <Pressable
      onPress={onAdd}
      style={({ hovered, pressed }) => [
        {
          borderRadius: px(16),
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: "rgba(148,163,184,0.45)",
          backgroundColor: "rgba(255,255,255,0.65)",
          padding: px(18),
          alignItems: "center",
          justifyContent: "center",
          gap: px(10),
          opacity: pressed ? 0.95 : 1,
        },
        Platform.OS === "web" && hovered ? { backgroundColor: "rgba(255,255,255,0.9)" } : null,
      ]}
    >
      <View
        style={{
          width: px(34),
          height: px(34),
          borderRadius: 999,
          borderWidth: 1,
          borderColor: "rgba(148,163,184,0.45)",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "white",
        }}
      >
        <Ionicons name="add" size={px(18)} color={UI.muted} />
      </View>

      <Text style={{ fontSize: fs(12), fontWeight: "600", color: UI.muted, textAlign: "center" }}>
        No hay actividades planificadas para este día todavía.
      </Text>
      <Text style={{ fontSize: fs(12), fontWeight: "700", color: colors.primary }}>Explorar sugerencias</Text>
    </Pressable>
  );
}

export function DailyPlanTimeline({
  trip,
  items,
  px,
  fs,
  onPressItem,
  onAddForDate,
}: {
  trip: TripLike;
  items: TripPlanItem[];
  px: (n: number) => number;
  fs: (n: number) => number;
  onPressItem: (item: TripPlanItem) => void;
  onAddForDate: (dateISO: string) => void;
}) {
  const { height } = useWindowDimensions();
  const LIST_MAX_H = Math.max(px(260), Math.round(height * 0.55));

  const days = useMemo(() => {
    const r = daysBetween(trip.startDate, trip.endDate);
    return r.length ? r : [NO_DATE];
  }, [trip.startDate, trip.endDate]);

  const [selectedDay, setSelectedDay] = useState(days[0] ?? NO_DATE);

  useEffect(() => {
    if (!days.includes(selectedDay)) setSelectedDay(days[0] ?? NO_DATE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.join("|")]);

  const byDate = useMemo(() => {
    const map: Record<string, TripPlanItem[]> = {};
    for (const it of items) {
      const k = isoDay(it.day) ?? NO_DATE;
      (map[k] ||= []).push(it);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (fmtTime(a.startAt) || "").localeCompare(fmtTime(b.startAt) || ""));
    }
    return map;
  }, [items]);

  const dayItems = byDate[selectedDay] ?? [];
  const isNoDate = selectedDay === NO_DATE;
  const dayNumber = isNoDate ? null : Math.max(1, days.findIndex((d) => d === selectedDay) + 1);

  return (
    <View style={{ gap: px(14) }}>
      {/* Day selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: px(10), gap: px(10) }}>
        {days.map((d, idx) => {
          const active = d === selectedDay;
          const noDate = d === NO_DATE;
          return (
            <Pressable
              key={d}
              onPress={() => setSelectedDay(d)}
              style={({ hovered, pressed }) => [
                {
                  height: px(46),
                  minWidth: px(110),
                  paddingHorizontal: px(12),
                  borderRadius: px(14),
                  backgroundColor: active ? "rgba(37,99,235,0.10)" : "white",
                  borderWidth: 1,
                  borderColor: active ? "rgba(37,99,235,0.25)" : "rgba(226,232,240,0.95)",
                  opacity: pressed ? 0.95 : 1,
                  justifyContent: "center",
                },
                Platform.OS === "web" && hovered && !active ? { backgroundColor: "rgba(15,23,42,0.015)" } : null,
              ]}
            >
              <Text style={{ fontSize: fs(12), fontWeight: "700", color: active ? colors.primary : UI.text }} numberOfLines={1}>
                {noDate ? "Sin fecha" : `Día ${idx + 1}`}
              </Text>
              <Text style={{ marginTop: px(2), fontSize: fs(11), fontWeight: "600", color: UI.muted }} numberOfLines={1}>
                {noDate ? "Items sin día" : fmtDayTitle(d)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Timeline */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: px(14) }}>
        <View style={{ width: px(22), alignItems: "center" }}>
          <View style={{ width: px(16), height: px(16), borderRadius: 999, backgroundColor: "#0B1220" }} />
          <View style={{ width: 2, flex: 1, minHeight: px(140), backgroundColor: "rgba(226,232,240,0.95)", marginTop: px(6) }} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: px(12) }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: px(10), flexWrap: "wrap" }}>
              <Text style={{ fontSize: fs(18), fontWeight: "700", color: UI.text }}>
                {isNoDate ? "Día: Sin fecha" : `Día ${dayNumber}:`}
              </Text>
              {!isNoDate && (
                <Text style={[textStyles.bodyMuted, { fontSize: fs(12), fontWeight: "600", color: UI.muted }]}>
                  {fmtDayTitle(selectedDay)}
                </Text>
              )}
            </View>

          </View>

          <View style={{ marginTop: px(12) }}>
            {dayItems.length === 0 ? (
              <EmptyDayCard px={px} fs={fs} onAdd={() => onAddForDate(isNoDate ? "" : selectedDay)} />
            ) : (
              <ScrollView
                showsVerticalScrollIndicator
                style={{ maxHeight: LIST_MAX_H }}
                contentContainerStyle={{ paddingBottom: px(8), gap: px(12) }}
              >
                {dayItems.map((it) => (
                  <ActivityRow key={it.id} item={it} px={px} fs={fs} onPress={() => onPressItem(it)} />
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
