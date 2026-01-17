// src/screens/Desktop/travel/TripDetailDesktopScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
  TouchableOpacity,
  Platform,
  Dimensions,
  Modal,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";

import api from "../../../api/api";
import { colors } from "../../../theme/theme";
import { textStyles } from "../../../theme/typography";

/** =========================
 * Types (alineados con mobile)
 * ========================= */
type TripStatus = "upcoming" | "ongoing" | "past";

// Alineado con enum Prisma + legacy
type TripPlanItemType =
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
  | "other"
  | "activity";

type TxType = "income" | "expense" | "transfer";

interface Tx {
  id: number;
  date: string;
  amount: number;
  type: TxType;
  description?: string;
  category?: { id: number; name: string; emoji?: string; color?: string };
  subcategory?: { id: number; name: string; emoji?: string; color?: string };
  wallet?: { id: number; name: string; emoji?: string };
}

export interface TripPlanItem {
  id: number;
  tripId: number;
  type: TripPlanItemType;
  title: string;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  notes?: string | null;
  transactionId?: number | null;
  cost?: number | null;
  logistics?: boolean | null;
}

interface TripFromApi {
  id: number;
  name: string;
  destination?: string | null;
  startDate: string;
  endDate: string;
  emoji?: string | null;
  color?: string | null;
  companions?: string[];
  transactions?: Tx[];
  planItems?: TripPlanItem[];
  cost: number | null;
}

type TripTab = "expenses" | "planning" | "logistics";

/** =========================
 * UI constants (pro desktop)
 * ========================= */
const UI = {
  bg: "#F8FAFC",
  surface: "#FFFFFF",
  border: "#E2E8F0",
  text: "#0B1220",
  muted: "#64748B",
  muted2: "#94A3B8",
  hover: "rgba(15,23,42,0.04)",
  activeBg: "rgba(15,23,42,0.06)",
  radius: 16,
};

/** =========================
 * Helpers
 * ========================= */
const formatEuro = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const parseISO = (iso?: string | null) => (iso ? new Date(iso).getTime() : 0);

function formatDateRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "—";

  const sameYear = s.getFullYear() === e.getFullYear();
  const baseOpts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };

  const startStr = s.toLocaleDateString("es-ES", baseOpts);
  const endStr = e.toLocaleDateString("es-ES", { ...baseOpts, year: sameYear ? undefined : "numeric" });
  return `${startStr} — ${endStr}`;
}

function getTripStatus(trip: { startDate: string; endDate: string }): TripStatus {
  const today = new Date();
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  if (end < today) return "past";
  if (start > today) return "upcoming";
  return "ongoing";
}

function statusPill(status: TripStatus) {
  switch (status) {
    case "upcoming":
      return { label: "Próximo", fg: "#15803D", bg: "rgba(22,163,74,0.12)", bd: "rgba(22,163,74,0.20)" };
    case "ongoing":
      return { label: "En curso", fg: "#C2410C", bg: "rgba(249,115,22,0.12)", bd: "rgba(249,115,22,0.20)" };
    default:
      return { label: "Pasado", fg: "#475569", bg: "rgba(100,116,139,0.12)", bd: "rgba(100,116,139,0.18)" };
  }
}

function daysBetweenInclusive(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
  const diff = e.getTime() - s.getTime();
  const d = Math.round(diff / (1000 * 60 * 60 * 24)) + 1;
  return d > 0 ? d : 0;
}

function useUiScale() {
  const { width } = Dimensions.get("window");
  const s = useMemo(() => {
    const raw = width / 1440;
    return Math.max(0.88, Math.min(1.08, raw));
  }, [width]);
  const px = useCallback((n: number) => Math.round(n * s), [s]);
  const fs = useCallback((n: number) => Math.round(n * s), [s]);
  return { width, s, px, fs };
}

/** =========================
 * Expenses grouping (desktop)
 * ========================= */
type GroupId = "flights" | "accommodation" | "transport" | "activities" | "food" | "shopping";
type GroupDef = { id: GroupId; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; types: TripPlanItemType[] };

const GROUPS: GroupDef[] = [
  { id: "flights", label: "Vuelos", icon: "airplane-outline", color: "#DBEAFE", types: ["flight"] },
  { id: "accommodation", label: "Alojamiento", icon: "bed-outline", color: "#FEF3C7", types: ["accommodation"] },
  { id: "transport", label: "Transporte", icon: "bus-outline", color: "#DCFCE7", types: ["transport", "taxi"] },
  {
    id: "activities",
    label: "Actividades",
    icon: "sparkles-outline",
    color: "#F3E8FF",
    types: ["museum", "monument", "viewpoint", "free_tour", "concert", "bar_party", "beach", "activity"],
  },
  { id: "food", label: "Comida", icon: "restaurant-outline", color: "#FFEDD5", types: ["restaurant"] },
  { id: "shopping", label: "Compras / Otros", icon: "cart-outline", color: "#F1F5F9", types: ["shopping", "other"] },
];

const TYPE_ICON: Record<TripPlanItemType, keyof typeof Ionicons.glyphMap> = {
  flight: "airplane-outline",
  accommodation: "bed-outline",
  transport: "bus-outline",
  taxi: "car-outline",
  museum: "library-outline",
  monument: "business-outline",
  viewpoint: "eye-outline",
  free_tour: "walk-outline",
  concert: "musical-notes-outline",
  bar_party: "wine-outline",
  beach: "sunny-outline",
  restaurant: "restaurant-outline",
  shopping: "cart-outline",
  other: "options-outline",
  activity: "sparkles-outline",
};

function groupForType(t: TripPlanItemType): GroupId {
  return GROUPS.find((g) => g.types.includes(t))?.id ?? "shopping";
}

function fmtShort(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function fmtTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** =========================
 * Small UI atoms
 * ========================= */
function SoftCard({ children, px, pad = 16 }: { children: React.ReactNode; px: (n: number) => number; pad?: number }) {
  return (
    <View
      style={{
        backgroundColor: UI.surface,
        borderRadius: px(UI.radius),
        padding: px(pad),
        borderWidth: 1,
        borderColor: "rgba(226,232,240,0.85)",
        shadowColor: "#0B1220",
        shadowOpacity: 0.05,
        shadowRadius: px(18),
        shadowOffset: { width: 0, height: px(10) },
      }}
    >
      {children}
    </View>
  );
}

function TopButton({
  icon,
  label,
  onPress,
  px,
  fs,
  tone = "default",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label?: string;
  onPress: () => void;
  px: (n: number) => number;
  fs: (n: number) => number;
  tone?: "default" | "primary";
}) {
  const [hover, setHover] = useState(false);
  const isPrimary = tone === "primary";

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={Platform.OS === "web" ? () => setHover(true) : undefined}
      onHoverOut={Platform.OS === "web" ? () => setHover(false) : undefined}
      style={{
        height: px(40),
        paddingHorizontal: label ? px(12) : 0,
        width: label ? undefined : px(40),
        borderRadius: px(12),
        backgroundColor: isPrimary ? (hover ? "rgba(37,99,235,0.92)" : colors.primary) : hover ? UI.hover : "rgba(255,255,255,0.92)",
        borderWidth: isPrimary ? 0 : 1,
        borderColor: "rgba(148,163,184,0.30)",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: label ? px(8) : 0,
      }}
    >
      <Ionicons name={icon} size={px(18)} color={isPrimary ? "white" : UI.text} />
      {!!label && (
        <Text style={[textStyles.button, { fontSize: fs(12), fontWeight: "700", color: isPrimary ? "white" : UI.text }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

function SegmentedTabs({
  value,
  onChange,
  px,
  fs,
}: {
  value: TripTab;
  onChange: (v: TripTab) => void;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  const opts: Array<{ key: TripTab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { key: "expenses", label: "Gastos", icon: "cash-outline" },
    { key: "planning", label: "Planning", icon: "calendar-outline" },
    { key: "logistics", label: "Logística", icon: "map-outline" },
  ];

  return (
    <View style={{ flexDirection: "row", gap: px(8), backgroundColor: "rgba(15,23,42,0.04)", padding: px(6), borderRadius: px(14) }}>
      {opts.map((o) => {
        const active = value === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={({ hovered, pressed }) => [
              {
                flex: 1,
                height: px(38),
                borderRadius: px(12),
                backgroundColor: active ? "white" : "transparent",
                borderWidth: active ? 1 : 0,
                borderColor: active ? "rgba(37,99,235,0.30)" : "transparent",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: px(8),
                opacity: pressed ? 0.92 : 1,
              },
              Platform.OS === "web" && hovered && !active ? { backgroundColor: UI.hover } : null,
            ]}
          >
            <Ionicons name={o.icon} size={px(16)} color={active ? colors.primary : UI.muted} />
            <Text style={{ fontSize: fs(12), fontWeight: active ? "900" : "800", color: active ? colors.primary : UI.muted }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** =========================
 * Main Screen
 * ========================= */
export default function TripDetailDesktopScreen({ navigation }: any) {
  const route = useRoute<any>();
  const tripId: number | undefined = route?.params?.tripId;

  const { width, px, fs } = useUiScale();
  const WIDE = width >= 1120;

  const [trip, setTrip] = useState<TripFromApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TripTab>("expenses");

  // export modal
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [includeExpenses, setIncludeExpenses] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchTrip = useCallback(async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      const res = await api.get(`/trips/${tripId}`);
      setTrip(res.data);
    } catch (e) {
      console.error("❌ Error al obtener viaje:", e);
      setTrip(null);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  const status = useMemo<TripStatus>(() => (trip ? getTripStatus(trip) : "upcoming"), [trip]);
  const pill = useMemo(() => statusPill(status), [status]);

  const days = useMemo(() => (trip ? daysBetweenInclusive(trip.startDate, trip.endDate) : 0), [trip]);
  const dateRange = useMemo(() => (trip ? formatDateRange(trip.startDate, trip.endDate) : "—"), [trip]);
  const companionsLabel = useMemo(() => (trip?.companions?.length ? trip.companions.join(", ") : "—"), [trip]);
  const planItems = useMemo(() => trip?.planItems ?? [], [trip]);

  /** =========================
   * Export PDF (web-friendly)
   * ========================= */
  const handleExportPdf = useCallback(async () => {
    if (!trip) return;

    try {
      setExporting(true);

      const res = await api.post(`/trips/${trip.id}/export`, { includeExpenses });
      const { pdfUrl, base64, fileName } = res.data || {};

      if (pdfUrl) {
        if (Platform.OS === "web" && typeof window !== "undefined") window.open(pdfUrl, "_blank");
        else console.warn("pdfUrl recibido pero no se puede abrir fuera de web.");
        return;
      }

      if (base64 && Platform.OS === "web" && typeof window !== "undefined") {
        const safeFileName =
          fileName && String(fileName).trim().length > 0 ? String(fileName).replace(/[^a-zA-Z0-9_\-\.]/g, "_") : `viaje-${trip.id}.pdf`;

        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 60_000);

        // Si quieres forzar descarga en vez de abrir:
        // const a = document.createElement("a");
        // a.href = url;
        // a.download = safeFileName;
        // a.click();
      } else {
        console.warn("No se recibió pdfUrl/base64 válido.");
      }
    } catch (e) {
      console.error("❌ Error al exportar viaje", e);
    } finally {
      setExporting(false);
      setExportModalVisible(false);
    }
  }, [trip, includeExpenses]);

  /** =========================
   * Expenses: build desktop view
   * ========================= */
  const itemsWithCost = useMemo(
    () => planItems.filter((i) => typeof i.cost === "number" && !Number.isNaN(i.cost as number)),
    [planItems]
  );

  const totalPlannedCost = useMemo(
    () => itemsWithCost.reduce((sum, it) => sum + Number(it.cost || 0), 0),
    [itemsWithCost]
  );

  const grouped = useMemo(() => {
    const map: Record<GroupId, { total: number; items: TripPlanItem[] }> = {
      flights: { total: 0, items: [] },
      accommodation: { total: 0, items: [] },
      transport: { total: 0, items: [] },
      activities: { total: 0, items: [] },
      food: { total: 0, items: [] },
      shopping: { total: 0, items: [] },
    };

    for (const item of itemsWithCost) {
      const g = groupForType(item.type);
      map[g].items.push(item);
      map[g].total += Number(item.cost || 0);
    }

    (Object.keys(map) as GroupId[]).forEach((g) => {
      map[g].items.sort((a, b) => (parseISO(a.date) || 0) - (parseISO(b.date) || 0));
    });

    return map;
  }, [itemsWithCost]);

  const nonEmptyGroups = useMemo(() => {
    return GROUPS.map((g) => ({
      ...g,
      total: grouped[g.id].total,
      items: grouped[g.id].items,
      pct: totalPlannedCost > 0 ? (grouped[g.id].total / totalPlannedCost) * 100 : 0,
    }))
      .filter((g) => g.items.length > 0)
      .sort((a, b) => b.total - a.total);
  }, [grouped, totalPlannedCost]);

  const [activeGroupId, setActiveGroupId] = useState<GroupId | null>(null);
  const activeGroup = useMemo(() => {
    const first = nonEmptyGroups[0]?.id ?? null;
    const chosen = activeGroupId ?? first;
    return nonEmptyGroups.find((g) => g.id === chosen) ?? null;
  }, [nonEmptyGroups, activeGroupId]);

  // Keep selection stable when groups change
  useEffect(() => {
    if (!activeGroupId && nonEmptyGroups.length) setActiveGroupId(nonEmptyGroups[0].id);
  }, [activeGroupId, nonEmptyGroups]);

  /** =========================
   * Render states
   * ========================= */
  if (!tripId) {
    return (
      <View style={{ flex: 1, backgroundColor: UI.bg, padding: 22, justifyContent: "center" }}>
        <Text style={[textStyles.bodyMuted, { color: UI.muted2, fontWeight: "800" }]}>Falta tripId en la navegación.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: UI.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: px(22),
          paddingTop: px(18),
          paddingBottom: px(90),
          maxWidth: px(1480),
          width: "100%",
          alignSelf: "center",
        }}
      >
        {/* ===== Top toolbar ===== */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: px(14), marginBottom: px(14) }}>
          <View style={{ flex: 1 }}>
            <Text style={[textStyles.h1, { fontSize: fs(22), color: UI.text, fontWeight: "900" }]} numberOfLines={1}>
              Detalle del viaje
            </Text>
            <Text style={[textStyles.bodyMuted, { marginTop: px(4), fontSize: fs(12), color: UI.muted, fontWeight: "700" }]} numberOfLines={1}>
              {loading ? "Cargando…" : `${trip?.destination ?? "Sin destino"} · ${dateRange}`}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: px(10) }}>
            <TopButton icon="arrow-back-outline" label="Volver" onPress={() => navigation.goBack?.()} px={px} fs={fs} />
            <TopButton
              icon="create-outline"
              label="Editar"
              onPress={() => {
                // Ajusta a tu ruta real desktop
                navigation.navigate?.("TripForm", { editTrip: trip });
              }}
              px={px}
              fs={fs}
            />
            <TopButton icon="download-outline" label="Exportar" onPress={() => setExportModalVisible(true)} px={px} fs={fs} />
            <TopButton icon="refresh-outline" onPress={fetchTrip} px={px} fs={fs} />
          </View>
        </View>

        {/* ===== Hero + KPI strip ===== */}
        <View style={{ flexDirection: WIDE ? "row" : "column", gap: px(12) }}>
          <View style={{ flex: 1 }}>
            <SoftCard px={px} pad={18}>
              {loading ? (
                <View style={{ height: px(132), alignItems: "center", justifyContent: "center" }}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : !trip ? (
                <View style={{ paddingVertical: px(18) }}>
                  <Text style={[textStyles.bodyMuted, { color: UI.muted2, fontWeight: "800" }]}>No se encontró el viaje.</Text>
                </View>
              ) : (
                <View style={{ gap: px(12) }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: px(12) }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: px(12), flex: 1 }}>
                      <View
                        style={{
                          width: px(48),
                          height: px(48),
                          borderRadius: 999,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "rgba(15,23,42,0.06)",
                          borderWidth: 1,
                          borderColor: "rgba(226,232,240,0.9)",
                        }}
                      >
                        <Text style={{ fontSize: fs(22) }}>{trip.emoji || "✈️"}</Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: fs(12), fontWeight: "800", color: UI.muted }} numberOfLines={1}>
                          {trip.destination || "Sin destino especificado"}
                        </Text>
                        <Text style={{ fontSize: fs(18), fontWeight: "950", color: UI.text, marginTop: px(2) }} numberOfLines={2}>
                          {trip.name}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={{
                        alignSelf: "flex-start",
                        paddingHorizontal: px(10),
                        height: px(28),
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: pill.bd,
                        backgroundColor: pill.bg,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: fs(11), fontWeight: "900", color: pill.fg }}>{pill.label}</Text>
                    </View>
                  </View>

                  <View style={{ height: 1, backgroundColor: "rgba(226,232,240,0.9)" }} />

                  <View style={{ flexDirection: WIDE ? "row" : "column", gap: px(12) }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: fs(11), fontWeight: "800", color: UI.muted2 }}>Fechas</Text>
                      <Text style={{ fontSize: fs(13), fontWeight: "900", color: UI.text, marginTop: px(4) }}>
                        {dateRange}
                        {!!days && (
                          <Text style={{ fontSize: fs(12), fontWeight: "800", color: UI.muted }}> · {days} día{days === 1 ? "" : "s"}</Text>
                        )}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: fs(11), fontWeight: "800", color: UI.muted2 }}>Compañeros</Text>
                      <Text style={{ fontSize: fs(13), fontWeight: "900", color: UI.text, marginTop: px(4) }} numberOfLines={2}>
                        {companionsLabel}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: fs(11), fontWeight: "800", color: UI.muted2 }}>Total gastado</Text>
                      <Text style={{ fontSize: fs(16), fontWeight: "950", color: UI.text, marginTop: px(4) }}>
                        {formatEuro(trip.cost || 0)}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </SoftCard>
          </View>

          <View style={{ width: WIDE ? px(420) : "100%" }}>
            <SoftCard px={px} pad={18}>
              <Text style={{ fontSize: fs(12), fontWeight: "900", color: UI.text }}>Acciones rápidas</Text>
              <Text style={{ fontSize: fs(11), fontWeight: "800", color: UI.muted, marginTop: px(4) }}>
                Planning, logística y exportación del viaje.
              </Text>

              <View style={{ marginTop: px(14), gap: px(10) }}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setTab("expenses")}
                  style={{
                    height: px(42),
                    borderRadius: px(12),
                    backgroundColor: "rgba(15,23,42,0.04)",
                    borderWidth: 1,
                    borderColor: "rgba(226,232,240,0.95)",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: px(12),
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: px(10) }}>
                    <Ionicons name="cash-outline" size={px(18)} color={UI.text} />
                    <Text style={{ fontSize: fs(12), fontWeight: "900", color: UI.text }}>Ver gastos</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={px(16)} color={UI.muted2} />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setTab("planning")}
                  style={{
                    height: px(42),
                    borderRadius: px(12),
                    backgroundColor: "rgba(15,23,42,0.04)",
                    borderWidth: 1,
                    borderColor: "rgba(226,232,240,0.95)",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: px(12),
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: px(10) }}>
                    <Ionicons name="calendar-outline" size={px(18)} color={UI.text} />
                    <Text style={{ fontSize: fs(12), fontWeight: "900", color: UI.text }}>Planning</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={px(16)} color={UI.muted2} />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setTab("logistics")}
                  style={{
                    height: px(42),
                    borderRadius: px(12),
                    backgroundColor: "rgba(15,23,42,0.04)",
                    borderWidth: 1,
                    borderColor: "rgba(226,232,240,0.95)",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: px(12),
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: px(10) }}>
                    <Ionicons name="map-outline" size={px(18)} color={UI.text} />
                    <Text style={{ fontSize: fs(12), fontWeight: "900", color: UI.text }}>Logística</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={px(16)} color={UI.muted2} />
                </TouchableOpacity>
              </View>
            </SoftCard>
          </View>
        </View>

        {/* ===== Tabs ===== */}
        <View style={{ marginTop: px(12) }}>
          <SegmentedTabs value={tab} onChange={setTab} px={px} fs={fs} />
        </View>

        {/* ===== Content by tab ===== */}
        <View style={{ marginTop: px(12) }}>
          {/* EXPENSES */}
          {tab === "expenses" && (
            <View style={{ flexDirection: WIDE ? "row" : "column", gap: px(12) }}>
              {/* Left: distribution */}
              <View style={{ flex: 1 }}>
                <SoftCard px={px} pad={16}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View>
                      <Text style={{ fontSize: fs(12), fontWeight: "900", color: UI.text }}>Distribución</Text>
                      <Text style={{ fontSize: fs(11), fontWeight: "800", color: UI.muted, marginTop: px(4) }}>
                        Basado en costes del planning (items con cost).
                      </Text>
                    </View>

                    <View
                      style={{
                        paddingHorizontal: px(10),
                        height: px(28),
                        borderRadius: 999,
                        backgroundColor: "rgba(37,99,235,0.10)",
                        borderWidth: 1,
                        borderColor: "rgba(37,99,235,0.18)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: fs(11), fontWeight: "900", color: colors.primary }}>
                        Total: {formatEuro(totalPlannedCost)}
                      </Text>
                    </View>
                  </View>

                  {loading ? (
                    <View style={{ height: px(160), alignItems: "center", justifyContent: "center" }}>
                      <ActivityIndicator color={colors.primary} />
                    </View>
                  ) : itemsWithCost.length === 0 ? (
                    <View style={{ paddingVertical: px(24) }}>
                      <Text style={{ fontSize: fs(12), fontWeight: "800", color: UI.muted2 }}>
                        Aún no hay costes asignados en el planning de este viaje.
                      </Text>
                    </View>
                  ) : (
                    <View style={{ marginTop: px(14), gap: px(10) }}>
                      {/* Grid of groups */}
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: px(10) }}>
                        {nonEmptyGroups.map((g) => {
                          const active = activeGroup?.id === g.id;
                          return (
                            <Pressable
                              key={g.id}
                              onPress={() => setActiveGroupId(g.id)}
                              style={({ hovered, pressed }) => [
                                {
                                  width: WIDE ? "calc(50% - 6px)" : "100%",
                                  padding: px(12),
                                  borderRadius: px(14),
                                  borderWidth: 1,
                                  borderColor: active ? "rgba(37,99,235,0.35)" : "rgba(226,232,240,0.95)",
                                  backgroundColor: active ? "rgba(37,99,235,0.06)" : "white",
                                  opacity: pressed ? 0.92 : 1,
                                },
                                Platform.OS === "web" && hovered && !active ? { backgroundColor: "rgba(15,23,42,0.02)" } : null,
                              ]}
                            >
                              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: px(10) }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: px(10), flex: 1 }}>
                                  <View
                                    style={{
                                      width: px(34),
                                      height: px(34),
                                      borderRadius: px(12),
                                      alignItems: "center",
                                      justifyContent: "center",
                                      backgroundColor: g.color,
                                      borderWidth: 1,
                                      borderColor: "rgba(15,23,42,0.06)",
                                    }}
                                  >
                                    <Ionicons name={g.icon} size={px(16)} color={colors.primary} />
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: fs(12), fontWeight: "950", color: UI.text }} numberOfLines={1}>
                                      {g.label}
                                    </Text>
                                    <Text style={{ fontSize: fs(11), fontWeight: "800", color: UI.muted, marginTop: px(2) }} numberOfLines={1}>
                                      {g.items.length} item{g.items.length === 1 ? "" : "s"} · {g.pct.toFixed(0)}%
                                    </Text>
                                  </View>
                                </View>

                                <Text style={{ fontSize: fs(12), fontWeight: "950", color: UI.text }}>{formatEuro(g.total)}</Text>
                              </View>

                              <View style={{ marginTop: px(10), height: px(6), borderRadius: 999, backgroundColor: "rgba(15,23,42,0.06)", overflow: "hidden" }}>
                                <View style={{ height: "100%", width: `${Math.min(100, g.pct)}%`, backgroundColor: colors.primary }} />
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </SoftCard>
              </View>

              {/* Right: details */}
              <View style={{ width: WIDE ? px(520) : "100%" }}>
                <SoftCard px={px} pad={16}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View>
                      <Text style={{ fontSize: fs(12), fontWeight: "900", color: UI.text }}>Detalle</Text>
                      <Text style={{ fontSize: fs(11), fontWeight: "800", color: UI.muted, marginTop: px(4) }} numberOfLines={1}>
                        {activeGroup ? activeGroup.label : "—"}
                      </Text>
                    </View>

                    {activeGroup ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: px(10) }}>
                        <Text style={{ fontSize: fs(12), fontWeight: "950", color: UI.text }}>
                          {formatEuro(activeGroup.total)}
                        </Text>
                        <View
                          style={{
                            paddingHorizontal: px(10),
                            height: px(26),
                            borderRadius: 999,
                            backgroundColor: "rgba(15,23,42,0.04)",
                            borderWidth: 1,
                            borderColor: "rgba(226,232,240,0.95)",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ fontSize: fs(11), fontWeight: "900", color: UI.muted }}>
                            {activeGroup.items.length} item{activeGroup.items.length === 1 ? "" : "s"}
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </View>

                  <View style={{ marginTop: px(12), height: 1, backgroundColor: "rgba(226,232,240,0.9)" }} />

                  {!activeGroup ? (
                    <View style={{ paddingVertical: px(20) }}>
                      <Text style={{ fontSize: fs(12), fontWeight: "800", color: UI.muted2 }}>Selecciona una categoría.</Text>
                    </View>
                  ) : (
                    <ScrollView style={{ maxHeight: px(520) }} showsVerticalScrollIndicator>
                      {activeGroup.items.map((it, idx) => {
                        const dateLabel = fmtShort(it.date);
                        const timeLabel = fmtTime(it.startTime);
                        const iconName = TYPE_ICON[it.type];

                        return (
                          <Pressable
                            key={it.id}
                            onPress={() => {
                              // Ajusta a tu route real de editar plan en desktop
                              navigation.navigate?.("TripPlanForm", { tripId, planItem: it });
                            }}
                            style={({ hovered, pressed }) => [
                              {
                                paddingVertical: px(12),
                                borderBottomWidth: idx === activeGroup.items.length - 1 ? 0 : 1,
                                borderBottomColor: "rgba(226,232,240,0.9)",
                                opacity: pressed ? 0.92 : 1,
                              },
                              Platform.OS === "web" && hovered ? { backgroundColor: "rgba(15,23,42,0.02)" } : null,
                            ]}
                          >
                            <View style={{ flexDirection: "row", alignItems: "center", gap: px(12) }}>
                              <View
                                style={{
                                  width: px(36),
                                  height: px(36),
                                  borderRadius: px(12),
                                  alignItems: "center",
                                  justifyContent: "center",
                                  backgroundColor: "rgba(15,23,42,0.04)",
                                  borderWidth: 1,
                                  borderColor: "rgba(226,232,240,0.9)",
                                }}
                              >
                                <Ionicons name={iconName} size={px(16)} color={UI.text} />
                              </View>

                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: fs(12), fontWeight: "950", color: UI.text }} numberOfLines={2}>
                                  {it.title}
                                </Text>
                                <Text style={{ fontSize: fs(11), fontWeight: "800", color: UI.muted, marginTop: px(2) }} numberOfLines={1}>
                                  {dateLabel}
                                  {timeLabel ? ` · ${timeLabel}` : ""}
                                  {it.location ? ` · ${it.location}` : ""}
                                </Text>
                              </View>

                              <View style={{ alignItems: "flex-end" }}>
                                <Text style={{ fontSize: fs(12), fontWeight: "950", color: UI.text }}>{formatEuro(it.cost || 0)}</Text>
                                <Text style={{ fontSize: fs(11), fontWeight: "800", color: UI.muted2, marginTop: px(2) }}>
                                  Editar
                                </Text>
                              </View>
                            </View>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  )}
                </SoftCard>
              </View>
            </View>
          )}

          {/* PLANNING */}
          {tab === "planning" && (
            <SoftCard px={px} pad={16}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View>
                  <Text style={{ fontSize: fs(12), fontWeight: "900", color: UI.text }}>Planning</Text>
                  <Text style={{ fontSize: fs(11), fontWeight: "800", color: UI.muted, marginTop: px(4) }}>
                    Aquí puedes montar tu vista desktop (agenda / timeline / kanban).
                  </Text>
                </View>
                <TopButton
                  icon="add"
                  label="Añadir ítem"
                  onPress={() => navigation.navigate?.("TripPlanForm", { tripId })}
                  px={px}
                  fs={fs}
                  tone="primary"
                />
              </View>

              <View style={{ marginTop: px(14), height: px(220), alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: fs(12), fontWeight: "800", color: UI.muted2, textAlign: "center" }}>
                  Conecta aquí tus componentes desktop para planning (por ejemplo: tabla por días, calendario, etc.).
                </Text>
              </View>
            </SoftCard>
          )}

          {/* LOGISTICS */}
          {tab === "logistics" && (
            <SoftCard px={px} pad={16}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View>
                  <Text style={{ fontSize: fs(12), fontWeight: "900", color: UI.text }}>Logística</Text>
                  <Text style={{ fontSize: fs(11), fontWeight: "800", color: UI.muted, marginTop: px(4) }}>
                    Ítems marcados como logística (o con notas/ubicación).
                  </Text>
                </View>
                <TopButton icon="refresh-outline" onPress={fetchTrip} px={px} fs={fs} />
              </View>

              <View style={{ marginTop: px(14) }}>
                {loading ? (
                  <View style={{ paddingVertical: px(24), alignItems: "center" }}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : (
                  (() => {
                    const logisticsItems = planItems
                      .filter((i) => !!i.logistics || !!i.location || !!i.notes)
                      .sort((a, b) => (parseISO(a.date) || 0) - (parseISO(b.date) || 0));

                    if (!logisticsItems.length) {
                      return <Text style={{ fontSize: fs(12), fontWeight: "800", color: UI.muted2 }}>No hay items de logística.</Text>;
                    }

                    return (
                      <View style={{ gap: px(10) }}>
                        {logisticsItems.map((i) => (
                          <View
                            key={i.id}
                            style={{
                              padding: px(12),
                              borderRadius: px(14),
                              borderWidth: 1,
                              borderColor: "rgba(226,232,240,0.95)",
                              backgroundColor: "rgba(15,23,42,0.02)",
                            }}
                          >
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: px(10) }}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: px(10), flex: 1 }}>
                                <View
                                  style={{
                                    width: px(34),
                                    height: px(34),
                                    borderRadius: px(12),
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundColor: "rgba(15,23,42,0.04)",
                                    borderWidth: 1,
                                    borderColor: "rgba(226,232,240,0.95)",
                                  }}
                                >
                                  <Ionicons name={TYPE_ICON[i.type]} size={px(16)} color={UI.text} />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: fs(12), fontWeight: "950", color: UI.text }} numberOfLines={1}>
                                    {i.title}
                                  </Text>
                                  <Text style={{ fontSize: fs(11), fontWeight: "800", color: UI.muted, marginTop: px(2) }} numberOfLines={1}>
                                    {fmtShort(i.date)}
                                    {i.location ? ` · ${i.location}` : ""}
                                  </Text>
                                </View>
                              </View>

                              <TopButton
                                icon="create-outline"
                                onPress={() => navigation.navigate?.("TripPlanForm", { tripId, planItem: i })}
                                px={px}
                                fs={fs}
                              />
                            </View>

                            {!!i.notes?.trim() && (
                              <Text style={{ marginTop: px(10), fontSize: fs(12), fontWeight: "700", color: "#334155", lineHeight: fs(18) }}>
                                {i.notes}
                              </Text>
                            )}
                          </View>
                        ))}
                      </View>
                    );
                  })()
                )}
              </View>
            </SoftCard>
          )}
        </View>
      </ScrollView>

      {/* ===== Export modal ===== */}
      <Modal
        visible={exportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !exporting && setExportModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: px(18), backgroundColor: "rgba(2,6,23,0.35)" }}>
          <View
            style={{
              width: "100%",
              maxWidth: px(520),
              borderRadius: px(18),
              backgroundColor: "white",
              borderWidth: 1,
              borderColor: "rgba(226,232,240,0.95)",
              padding: px(18),
              shadowColor: "#000",
              shadowOpacity: 0.16,
              shadowRadius: px(24),
              shadowOffset: { width: 0, height: px(14) },
            }}
          >
            <Text style={{ fontSize: fs(14), fontWeight: "950", color: UI.text }}>Exportar viaje</Text>
            <Text style={{ marginTop: px(6), fontSize: fs(12), fontWeight: "700", color: UI.muted, lineHeight: fs(18) }}>
              Se generará un PDF con la información del viaje. Puedes decidir si incluir también el detalle de los gastos.
            </Text>

            <View style={{ marginTop: px(14), flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: fs(12), fontWeight: "900", color: UI.text }}>Incluir gastos</Text>
              <Switch value={includeExpenses} onValueChange={setIncludeExpenses} />
            </View>

            <View style={{ marginTop: px(16), flexDirection: "row", justifyContent: "flex-end", gap: px(10) }}>
              <TouchableOpacity
                disabled={exporting}
                onPress={() => setExportModalVisible(false)}
                style={{
                  height: px(40),
                  paddingHorizontal: px(14),
                  borderRadius: px(12),
                  borderWidth: 1,
                  borderColor: "rgba(148,163,184,0.30)",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "white",
                  opacity: exporting ? 0.6 : 1,
                }}
              >
                <Text style={{ fontSize: fs(12), fontWeight: "900", color: UI.muted }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={exporting}
                onPress={handleExportPdf}
                style={{
                  height: px(40),
                  paddingHorizontal: px(14),
                  borderRadius: px(12),
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: exporting ? "rgba(37,99,235,0.55)" : colors.primary,
                }}
              >
                <Text style={{ fontSize: fs(12), fontWeight: "950", color: "white" }}>
                  {exporting ? "Generando…" : "Exportar PDF"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
