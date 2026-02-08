// src/screens/Trips/components/TripPlanningSection.redesign.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  Platform,
  useWindowDimensions,
} from "react-native";
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
  // Desktop usa day + startAt/endAt; en móvil tenías date + startTime/endTime.
  // Aquí soportamos ambas variantes sin romper.
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
  trip?: TripLike; // <-- pásalo desde TripDetail para igualar desktop
  planItems: TripPlanItem[];
  onRefresh?: () => void;
  onDeleteItem?: (id: number) => void; // opcional: si no lo pasas, hace console.log
}

const UI = {
  text: "#0B1220",
  muted: "rgba(100,116,139,1)", // slate-500
  muted2: "rgba(148,163,184,1)", // slate-400
  border: "rgba(226,232,240,0.95)",
  bgSoft: "rgba(248,250,252,1)", // slate-50
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
  transport: {
    icon: "bus-outline",
    accent: "#0EA5E9",
    badgeBg: "rgba(14,165,233,0.10)",
    badgeBorder: "rgba(14,165,233,0.22)",
  },
  taxi: {
    icon: "car-sport-outline",
    accent: "#0EA5E9",
    badgeBg: "rgba(14,165,233,0.10)",
    badgeBorder: "rgba(14,165,233,0.22)",
  },
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
  shopping: {
    icon: "cart-outline",
    accent: "#64748B",
    badgeBg: "rgba(100,116,139,0.10)",
    badgeBorder: "rgba(100,116,139,0.22)",
  },
  day_trip: {
    icon: "bus-outline",
    accent: UI.text,
    badgeBg: "rgba(15,23,42,0.08)",
    badgeBorder: "rgba(148,163,184,0.22)",
  },
  activity: {
    icon: "flash-outline",
    accent: UI.text,
    badgeBg: "rgba(15,23,42,0.08)",
    badgeBorder: "rgba(148,163,184,0.22)",
  },
  expense: {
    icon: "receipt-outline",
    accent: UI.text,
    badgeBg: "rgba(15,23,42,0.08)",
    badgeBorder: "rgba(148,163,184,0.22)",
  },
  other: {
    icon: "options-outline",
    accent: UI.text,
    badgeBg: "rgba(15,23,42,0.08)",
    badgeBorder: "rgba(148,163,184,0.22)",
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

function KebabMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<View>(null);
  const [pos, setPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const openMenu = () => {
    if (Platform.OS === "web") {
      anchorRef.current?.measureInWindow?.((x, y, w, h) => {
        setPos({ x, y, w, h });
        setOpen(true);
      });
    } else {
      setPos(null);
      setOpen(true);
    }
  };

  const close = () => setOpen(false);

  return (
    <View ref={anchorRef} collapsable={false}>
      <Pressable
        onPress={(e: any) => {
          e?.stopPropagation?.();
          openMenu();
        }}
        hitSlop={10}
        style={({ pressed }) => ({
          width: 28,
          height: 28,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: pressed ? "rgba(15,23,42,0.06)" : "transparent",
        })}
      >
        <Ionicons name="ellipsis-horizontal" size={18} color={UI.muted} />
      </Pressable>

      <Modal transparent visible={open} animationType="fade" onRequestClose={close}>
        <Pressable onPress={close} style={{ flex: 1, backgroundColor: "rgba(2,6,23,0.08)" }}>
          <View
            pointerEvents="box-none"
            style={{
              position: "absolute",
              ...(Platform.OS === "web" && pos
                ? ({ left: pos.x + pos.w - 168, top: pos.y + pos.h + 8 } as any)
                : ({ right: 16, bottom: 26 } as any)),
              width: 168,
              borderRadius: 16,
              backgroundColor: "white",
              borderWidth: 1,
              borderColor: UI.border,
              shadowColor: "#000",
              shadowOpacity: 0.12,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 10 },
              overflow: "hidden",
            }}
          >
            <Pressable
              onPress={() => {
                close();
                onEdit();
              }}
              style={({ pressed }) => ({
                paddingVertical: 12,
                paddingHorizontal: 12,
                backgroundColor: pressed ? "rgba(241,245,249,1)" : "white",
              })}
            >
              <Text style={{ fontSize: 13, fontWeight: "800", color: UI.text }}>Editar</Text>
            </Pressable>

            <View style={{ height: 1, backgroundColor: "rgba(226,232,240,0.9)" }} />

            <Pressable
              onPress={() => {
                close();
                onDelete();
              }}
              style={({ pressed }) => ({
                paddingVertical: 12,
                paddingHorizontal: 12,
                backgroundColor: pressed ? "rgba(254,242,242,1)" : "white",
              })}
            >
              <Text style={{ fontSize: 13, fontWeight: "900", color: "rgba(239,68,68,1)" }}>
                Eliminar
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function EmptyDayCard({
  onPress,
}: {
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: 18,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: "rgba(148,163,184,0.45)",
        backgroundColor: "rgba(255,255,255,0.70)",
        padding: 16,
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        opacity: pressed ? 0.95 : 1,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: "rgba(148,163,184,0.45)",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "white",
        }}
      >
        <Ionicons name="add" size={18} color={UI.muted} />
      </View>

      <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted, textAlign: "center" }}>
        No hay actividades planificadas para este día todavía.
      </Text>
      <Text style={{ fontSize: 12, fontWeight: "900", color: colors.primary }}>
        Explorar sugerencias
      </Text>
    </Pressable>
  );
}

function ActivityCard({
  item,
  onPress,
  onEdit,
  onDelete,
}: {
  item: TripPlanItem;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = TYPE_META[item.type] ?? TYPE_META.other ?? {
    icon: "options-outline",
    accent: UI.text,
    badgeBg: "rgba(15,23,42,0.08)",
    badgeBorder: "rgba(148,163,184,0.22)",
  };

  const start = item.startAt ?? item.startTime ?? null;
  const end = item.endAt ?? item.endTime ?? null;
  const time = fmtTimeRangeSameDay(start, end);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: "white",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: UI.border,
        padding: 14,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        opacity: pressed ? 0.97 : 1,
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      })}
    >
      {/* Icon badge */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 14,
          backgroundColor: meta.badgeBg,
          borderWidth: 1,
          borderColor: meta.badgeBorder,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
        }}
      >
        <Ionicons name={meta.icon} size={18} color={meta.accent} />
      </View>

      {/* Main */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 13, fontWeight: "900", color: UI.text }} numberOfLines={2}>
          {item.title}
        </Text>

        {!!(item.location || item.notes) && (
          <Text
            style={{ marginTop: 4, fontSize: 12, fontWeight: "700", color: UI.muted }}
            numberOfLines={2}
          >
            {item.location || ""}
            {item.location && item.notes ? " · " : ""}
            {item.notes || ""}
          </Text>
        )}
      </View>

      {/* Right meta */}
      <View style={{ alignItems: "flex-end", paddingLeft: 8, minWidth: 78 }}>
        <View style={{ marginTop: -6, marginRight: -6 }}>
          <KebabMenu onEdit={onEdit} onDelete={onDelete} />
        </View>

        {!!time && (
          <Text style={{ marginTop: 6, fontSize: 12, fontWeight: "900", color: UI.muted2 }}>
            {time}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export default function TripPlanningSectionRedesign({
  tripId,
  trip,
  planItems,
  onDeleteItem,
}: TripPlanningSectionProps) {
  const navigation = useNavigation<any>();
  const { height } = useWindowDimensions();
  const LIST_MAX_H = Math.max(280, Math.round(height * 0.62));

  const handleCreate = (dateISO?: string) => {
    navigation.navigate("TripPlanForm", { tripId, presetDay: dateISO || "" });
  };

  const handleEdit = (item: TripPlanItem) => {
    navigation.navigate("TripPlanForm", { tripId, planItem: item });
  };

  // 1) Filtrado: como desktop, excluimos accommodation; dejamos items sin fecha para "Sin fecha"
  const planningItems = useMemo(
    () => planItems.filter((i) => i.type !== "accommodation"),
    [planItems]
  );

  // 2) Days: preferimos trip.startDate/endDate (como desktop). Si no hay, inferimos del planning.
  const days = useMemo(() => {
    const byTrip = trip?.startDate && trip?.endDate ? daysBetween(trip.startDate, trip.endDate) : [];

    if (byTrip.length) return byTrip;

    // fallback: inferimos min/max en base a items con day/date válida
    const dated = planningItems
      .map((i) => isoDay(i.day ?? i.date ?? null))
      .filter((d): d is string => !!d);

    if (!dated.length) return [];
    const sorted = [...dated].sort();
    return daysBetween(sorted[0], sorted[sorted.length - 1]);
  }, [trip?.startDate, trip?.endDate, planningItems]);

  // 3) Agrupar por día (YYYY-MM-DD) + NO_DATE
  const byDate = useMemo(() => {
    const map: Record<string, TripPlanItem[]> = {};
    for (const it of planningItems) {
      const k = isoDay(it.day ?? it.date ?? null) ?? NO_DATE;
      (map[k] ||= []).push(it);
    }
    // Orden por startTime/startAt (si no hay, al final) y título
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

  // 4) Días visibles: days + (Sin fecha si hay items)
  const hasNoDate = (byDate[NO_DATE]?.length ?? 0) > 0;
  const dayKeys = useMemo(() => {
    const base = days.length ? days : [];
    if (!base.length && hasNoDate) return [NO_DATE];
    return hasNoDate ? [...base, NO_DATE] : base;
  }, [days, hasNoDate]);

  // 5) Selección
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

  // Empty global
  const hasAny = planningItems.length > 0;
  if (!hasAny) {
    return (
      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 28 }}
        >
          <View style={{ marginTop: 36, alignItems: "center", paddingHorizontal: 18 }}>
            <Text style={{ textAlign: "center", color: UI.muted2, fontSize: 12, fontWeight: "700", marginBottom: 12 }}>
              Aún no tienes nada en el planning de este viaje.
            </Text>

            <Pressable
              onPress={() => handleCreate("")}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 18,
                backgroundColor: "rgba(37,99,235,0.10)",
                borderWidth: 1,
                borderColor: "rgba(37,99,235,0.22)",
                opacity: pressed ? 0.95 : 1,
              })}
            >
              <Ionicons name="add-outline" size={18} color={colors.primary} />
              <Text style={{ marginLeft: 8, fontSize: 13, fontWeight: "900", color: "rgba(30,64,175,1)" }}>
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
      {/* Day selector (chips tipo card) */}
      <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 6, gap: 10 }}
        >
          {dayKeys.map((d, idx) => {
            const active = d === selectedDay;
            const noDate = d === NO_DATE;
            return (
              <Pressable
                key={d}
                onPress={() => setSelectedDay(d)}
                style={({ pressed }) => ({
                  height: 46,
                  minWidth: 118,
                  paddingHorizontal: 12,
                  borderRadius: 16,
                  backgroundColor: active ? "rgba(37,99,235,0.10)" : "white",
                  borderWidth: 1,
                  borderColor: active ? "rgba(37,99,235,0.25)" : UI.border,
                  justifyContent: "center",
                  opacity: pressed ? 0.96 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "900",
                    color: active ? colors.primary : UI.text,
                  }}
                  numberOfLines={1}
                >
                  {noDate ? "Sin fecha" : `Día ${idx + 1}`}
                </Text>
                <Text style={{ marginTop: 2, fontSize: 11, fontWeight: "700", color: UI.muted }} numberOfLines={1}>
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
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 22 }}
      >
        {/* Header */}
        <View style={{ marginTop: 6, marginBottom: 12, flexDirection: "row", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <Text style={{ fontSize: 18, fontWeight: "900", color: UI.text }}>
            {isNoDate ? "Día: Sin fecha" : `Día ${dayNumber}:`}
          </Text>
          {!isNoDate && (
            <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted }}>
              {fmtDayTitle(selectedDay)}
            </Text>
          )}
        </View>

        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
          {/* timeline rail */}
          <View style={{ width: 20, alignItems: "center" }}>
            <View style={{ width: 10, height: 10, borderRadius: 99, backgroundColor: UI.text, marginTop: 8 }} />
            <View style={{ width: 2, backgroundColor: UI.border, flex: 1, minHeight: 140, marginTop: 6 }} />
          </View>

          {/* list */}
          <View style={{ flex: 1, minWidth: 0 }}>
            {dayItems.length === 0 ? (
              <EmptyDayCard onPress={() => handleCreate(isNoDate ? "" : selectedDay)} />
            ) : (
              <View style={{ maxHeight: LIST_MAX_H, gap: 12 }}>
                {dayItems.map((it) => (
                  <ActivityCard
                    key={it.id}
                    item={it}
                    onPress={() => handleEdit(it)}
                    onEdit={() => handleEdit(it)}
                    onDelete={() => (onDeleteItem ? onDeleteItem(it.id) : console.log("delete", it.id))}
                  />
                ))}
              </View>
            )}

            {/* Bottom add button */}
            <View style={{ marginTop: 16 }}>
              <Pressable
                onPress={() => handleCreate(isNoDate ? "" : selectedDay)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 11,
                  borderRadius: 18,
                  backgroundColor: "rgba(248,250,252,1)",
                  borderWidth: 1,
                  borderColor: UI.border,
                  opacity: pressed ? 0.96 : 1,
                })}
              >
                <Ionicons name="add-outline" size={18} color={UI.muted} />
                <Text style={{ marginLeft: 8, fontSize: 13, fontWeight: "900", color: UI.muted }}>
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
