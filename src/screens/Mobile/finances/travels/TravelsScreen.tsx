// src/screens/Trips/TripsHomeScreen.tsx
import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Platform,
  TextInput,
  Pressable,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AppHeader from "../../../../components/AppHeader";
import api from "../../../../api/api";
import { colors } from "../../../../theme/theme";

type TripStatus = "wishlist" | "planning" | "seen";
type BoardMode = "status" | "continent" | "year";

type Continent =
  | "europe"
  | "africa"
  | "asia"
  | "north_america"
  | "south_america"
  | "oceania"
  | "antarctica";

type KanbanTone = "neutral" | "blue" | "green" | "purple" | "orange" | "pink" | "teal";

interface TripFromApi {
  id: number;
  name: string;
  destination: string | null; // ISO2
  startDate: string | null;
  endDate: string | null;
  status: TripStatus;
  cost: number;
  budget: number | null;
  continent: Continent | null;
  year: number | null;
}

interface TripUI {
  id: number;
  name: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  status: TripStatus;
  cost: number;
  budget: number | null;
  continent: Continent | null;
  year: number | null;
}

type TripsSummaryDto = {
  daysToNextTrip: number | null;
  nextTrip: { id: number; name: string; startDate: string | null } | null;

  visitedCountries: number;
  pendingCountries: number;
  visitedPct: number;
  totalCountries: number;
};

type ContinentKey =
  | "europe"
  | "africa"
  | "asia"
  | "north_america"
  | "south_america"
  | "oceania"
  | "antarctica"
  | "unknown";

type ContinentStat = {
  continent: ContinentKey;
  visitedCountries: number;
  totalCountries: number;
  pct: number;
  trips: number;
};

type ContinentsStatsDto = ContinentStat[];

/** ===== Flags + country name ===== */
export function flagEmojiFromISO2(code?: string | null) {
  const c = (code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return "🌍";
  const cps = [...c].map((ch) => 127397 + ch.charCodeAt(0));
  return String.fromCodePoint(...cps);
}
export function countryNameEsFromISO2(code?: string | null) {
  const c = (code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return "—";
  try {
    // @ts-ignore
    const dn = new Intl.DisplayNames(["es-ES"], { type: "region" });
    return dn.of(c) || c;
  } catch {
    return c;
  }
}
export function twemojiFlagUrlFromISO2(code?: string | null) {
  const c = (code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return null;
  const cp1 = 0x1f1e6 + (c.charCodeAt(0) - 65);
  const cp2 = 0x1f1e6 + (c.charCodeAt(1) - 65);
  const hex = `${cp1.toString(16)}-${cp2.toString(16)}`;
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${hex}.svg`;
}
function CountryBadge({ code, size = 20 }: { code?: string | null; size?: number }) {
  const url = twemojiFlagUrlFromISO2(code);
  const flag = flagEmojiFromISO2(code);

  if (Platform.OS === "web" && url) {
    // @ts-ignore
    return <img src={url} alt={code || "flag"} style={{ width: size, height: size, display: "block" }} />;
  }
  return <Text style={{ fontSize: size }}>{flag}</Text>;
}

/** ===== Utils ===== */
function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
function isValidISODate(iso?: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  return !Number.isNaN(d.getTime());
}
function formatDateRange(startISO?: string | null, endISO?: string | null) {
  if (!isValidISODate(startISO) || !isValidISODate(endISO)) return "Sin fecha";
  const s = new Date(startISO!);
  const e = new Date(endISO!);
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  const startStr = s.toLocaleDateString("es-ES", opts);
  const endStr = e.toLocaleDateString("es-ES", opts);
  return `${startStr} · ${endStr}`;
}
function formatEuro(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function continentLabel(c?: string | null) {
  const v = (c || "").toLowerCase();
  if (v === "europe") return "Europa";
  if (v === "africa") return "África";
  if (v === "asia") return "Asia";
  if (v === "america" || v === "north_america") return "Norteamérica";
  if (v === "south_america") return "Sudamérica";
  if (v === "oceania") return "Oceanía";
  if (v === "antarctica") return "Antártida";
  return c ? c : "Sin continente";
}
function uniqueCountryCount(trips: TripUI[]) {
  const set = new Set(trips.map((t) => (t.destination || "").trim().toUpperCase()).filter(Boolean));
  return set.size;
}
function toneForContinent(id: string): KanbanTone {
  switch ((id || "").toLowerCase()) {
    case "europe":
      return "blue";
    case "asia":
      return "purple";
    case "africa":
      return "orange";
    case "north_america":
      return "blue";
    case "america":
      return "green";
    case "south_america":
      return "pink";
    case "oceania":
      return "teal";
    case "antarctica":
      return "neutral";
    default:
      return "neutral";
  }
}
const YEAR_TONES: KanbanTone[] = ["blue", "green", "purple", "orange", "teal", "pink"];
function toneForYear(key: string, index: number): KanbanTone {
  if (key === "unknown") return "neutral";
  return YEAR_TONES[index % YEAR_TONES.length];
}
function toneForStatus(s: TripStatus): KanbanTone {
  if (s === "planning") return "blue";
  if (s === "seen") return "green";
  return "neutral";
}

/** ===== Visual atoms ===== */
function useUiScaleMobile() {
  const { width } = Dimensions.get("window");
  const s = useMemo(() => {
    const raw = width / 390;
    return Math.max(0.92, Math.min(1.08, raw));
  }, [width]);
  const px = useCallback((n: number) => Math.round(n * s), [s]);
  const fs = useCallback((n: number) => Math.round(n * s), [s]);
  return { px, fs };
}

function SearchBar({
  q,
  setQ,
  px,
  fs,
}: {
  q: string;
  setQ: (v: string) => void;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  return (
    <View
      style={{
        height: px(40),
        borderRadius: px(14),
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.22)",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: px(12),
        gap: px(10),
        flex: 1,
      }}
    >
      <Ionicons name="search-outline" size={px(18)} color="#64748B" />
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Buscar viajes…"
        placeholderTextColor="#94A3B8"
        style={{
          flex: 1,
          fontSize: fs(13),
          fontWeight: "700",
          color: "#0F172A",
          paddingVertical: 0,
        }}
      />
      {!!q && (
        <Pressable onPress={() => setQ("")} style={{ padding: px(2) }}>
          <Ionicons name="close-circle" size={px(18)} color="#94A3B8" />
        </Pressable>
      )}
    </View>
  );
}

function ModeSelector({
  value,
  options,
  onChange,
  px,
  fs,
}: {
  value: string;
  options: { id: string; label: string; icon: keyof typeof Ionicons.glyphMap }[];
  onChange: (v: string) => void;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: px(6),
        padding: px(4),
        borderRadius: px(14),
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.22)",
      }}
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange(opt.id)}
            style={{
              flex: 1,
              height: px(34),
              borderRadius: px(12),
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: px(8),
              backgroundColor: active ? "#0F172A" : "transparent",
            }}
          >
            <Ionicons name={opt.icon} size={px(16)} color={active ? "white" : "#475569"} />
            <Text style={{ fontSize: fs(12), fontWeight: "900", color: active ? "white" : "#0F172A" }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Single “Hero pill” (más bonita) para el KPI de Próximo Viaje.
 * - Layout desktop-like
 * - Border + shadow sutil
 * - Badge icon a la izquierda
 * - Value grande + subtitle
 */
function HeroPill({
  title,
  value,
  subtitle,
  loading,
  px,
  fs,
  onPress,
}: {
  title: string;
  value: string;
  subtitle: string;
  loading?: boolean;
  px: (n: number) => number;
  fs: (n: number) => number;
  onPress?: () => void;
}) {
  const Inner = (
    <View
      style={{
        borderRadius: px(18),
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.22)",
        padding: px(14),
        shadowColor: "#0B1220",
        shadowOpacity: 0.07,
        shadowRadius: px(18),
        shadowOffset: { width: 0, height: px(10) },
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: px(10) }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: px(10), flex: 1 }}>
          <View
            style={{
              width: px(42),
              height: px(42),
              borderRadius: px(16),
              backgroundColor: "rgba(15,23,42,0.06)",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: "rgba(148,163,184,0.20)",
            }}
          >
            <Ionicons name="calendar-number-outline" size={px(20)} color="#0F172A" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: fs(10), fontWeight: "900", color: "#64748B", letterSpacing: 0.6 }}>
              {title}
            </Text>

            <View style={{ flexDirection: "row", alignItems: "baseline", gap: px(10), marginTop: px(6) }}>
              <Text style={{ fontSize: fs(20), fontWeight: "900", color: "#0F172A" }} numberOfLines={1}>
                {loading ? "—" : value}
              </Text>
              <View
                style={{
                  height: px(22),
                  paddingHorizontal: px(10),
                  borderRadius: 999,
                  backgroundColor: "rgba(37,99,235,0.10)",
                  borderWidth: 1,
                  borderColor: "rgba(37,99,235,0.18)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: fs(11), fontWeight: "900", color: "#2563EB" }} numberOfLines={1}>
                  Próximo
                </Text>
              </View>
            </View>

            <Text style={{ marginTop: px(4), fontSize: fs(12), fontWeight: "800", color: "#94A3B8" }} numberOfLines={1}>
              {loading ? "—" : subtitle}
            </Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={px(18)} color="#CBD5E1" />
      </View>
    </View>
  );

  if (!onPress) return Inner;
  return <Pressable onPress={onPress}>{Inner}</Pressable>;
}

/** smaller trip card */
function TripCardCompact({
  trip,
  px,
  fs,
  onPress,
}: {
  trip: TripUI;
  px: (n: number) => number;
  fs: (n: number) => number;
  onPress: () => void;
}) {
  const hasSomeDate = isValidISODate(trip.startDate) || isValidISODate(trip.endDate);
  const dateLabel = formatDateRange(trip.startDate, trip.endDate);
  const yearLabel = trip.year ?? (isValidISODate(trip.startDate) ? new Date(trip.startDate!).getFullYear() : null);
  const showSpent = trip.status === "seen" && (trip.cost || 0) > 0;


  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: px(14),
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.18)",
        padding: px(10),
        shadowColor: "#0B1220",
        shadowOpacity: 0.035,
        shadowRadius: px(14),
        shadowOffset: { width: 0, height: px(8) },
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: px(10) }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: px(10), flex: 1 }}>
          <View
            style={{
              width: px(36),
              height: px(36),
              borderRadius: px(12),
              backgroundColor: "rgba(15,23,42,0.06)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CountryBadge code={trip.destination} size={px(20)} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: fs(13), fontWeight: "900", color: "#0F172A" }} numberOfLines={1}>
              {trip.name}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: px(6), marginTop: px(1) }}>
              <Ionicons name="location-outline" size={px(13)} color="#94A3B8" />
              <Text style={{ fontSize: fs(10), fontWeight: "800", color: "#64748B" }} numberOfLines={1}>
                {countryNameEsFromISO2(trip.destination)}
              </Text>
            </View>
          </View>
        </View>

{         showSpent && (
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: fs(9), fontWeight: "800", color: "#94A3B8" }}>Gastado</Text>
            <Text style={{ fontSize: fs(13), fontWeight: "900", color: "#0F172A" }} numberOfLines={1}>
              {formatEuro(trip.cost || 0)}
            </Text>
          </View>
          )

}
        
        
      </View>

      <View style={{ marginTop: px(8), flexDirection: "row", alignItems: "center", gap: px(8), flexWrap: "wrap" }}>
        {hasSomeDate && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: px(7),
              paddingHorizontal: px(9),
              height: px(26),
              borderRadius: 999,
              backgroundColor: "rgba(15,23,42,0.08)",
            }}
          >
            <Ionicons name="calendar-outline" size={px(13)} color="#475569" />
            <Text style={{ fontSize: fs(10), fontWeight: "900", color: "#0F172A" }}>{dateLabel}</Text>
          </View>
        )}

        {!!yearLabel && (
          <View
            style={{
              paddingHorizontal: px(9),
              height: px(26),
              borderRadius: 999,
              backgroundColor: "rgba(15,23,42,0.08)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: fs(10), fontWeight: "900", color: "#0F172A" }}>{yearLabel}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function ColumnHeader({
  title,
  subcount,
  px,
  fs,
}: {
  title: string;
  subcount?: string;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: px(10) }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: px(10) }}>
        <View
          style={{
            height: px(32),
            paddingHorizontal: px(12),
            borderRadius: 999,
            backgroundColor: "rgba(15,23,42,0.06)",
            borderWidth: 1,
            borderColor: "rgba(148,163,184,0.18)",
            flexDirection: "row",
            alignItems: "center",
            gap: px(8),
          }}
        >
          <Ionicons name="albums-outline" size={px(14)} color="#0F172A" />
          <Text style={{ fontSize: fs(12), fontWeight: "900", color: "#0F172A" }} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {!!subcount && (
          <Text style={{ fontSize: fs(11), fontWeight: "900", color: "#64748B" }} numberOfLines={1}>
            {subcount}
          </Text>
        )}
      </View>

      <Ionicons name="ellipsis-horizontal" size={px(18)} color="#CBD5E1" />
    </View>
  );
}

/** ===== Screen ===== */
export default function TripsHomeScreen({ navigation }: any) {
  const { px, fs } = useUiScaleMobile();

  const [boardMode, setBoardMode] = useState<BoardMode>("status");
  const [q, setQ] = useState("");

  // sub selectors
  const [statusSelected, setStatusSelected] = useState<TripStatus>("planning");
  const [continentSelected, setContinentSelected] = useState<string>("europe");
  const [yearSelected, setYearSelected] = useState<string>("unknown");

  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<TripUI[]>([]);

  const [summary, setSummary] = useState<TripsSummaryDto | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [continentStats, setContinentStats] = useState<ContinentsStatsDto | null>(null);
  const [continentStatsLoading, setContinentStatsLoading] = useState(false);

  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/trips");
      const data: TripFromApi[] = res.data || [];
      const mapped: TripUI[] = data.map((t) => ({
        id: t.id,
        name: t.name,
        destination: t.destination || "",
        startDate: t.startDate ?? null,
        endDate: t.endDate ?? null,
        status: t.status,
        cost: typeof t.cost === "number" ? t.cost : 0,
        budget: t.budget ?? null,
        continent: t.continent ?? null,
        year: typeof t.year === "number" ? t.year : null,
      }));
      setTrips(mapped);
    } catch (e) {
      console.error("❌ Error al obtener viajes:", e);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const res = await api.get("/trips/summary");
      setSummary(res.data as TripsSummaryDto);
    } catch (e) {
      console.error("❌ Error al obtener summary:", e);
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchContinentsStats = useCallback(async () => {
    try {
      setContinentStatsLoading(true);
      const res = await api.get("/trips/continents-stats");
      setContinentStats(res.data as ContinentsStatsDto);
    } catch (e) {
      console.error("❌ Error al obtener continents-stats:", e);
      setContinentStats(null);
    } finally {
      setContinentStatsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTrips();
      fetchSummary();
      fetchContinentsStats();
    }, [fetchTrips, fetchSummary, fetchContinentsStats])
  );

  const continentStatsMap = useMemo(() => {
    const m = new Map<string, ContinentStat>();
    for (const row of continentStats ?? []) m.set(row.continent, row);
    return m;
  }, [continentStats]);

  const filteredTrips = useMemo(() => {
    const needle = norm(q);
    if (!needle) return trips;
    return trips.filter((t) => norm(`${t.name} ${t.destination}`).includes(needle));
  }, [trips, q]);

  const lanes = useMemo(() => {
    const seen = filteredTrips.filter((t) => t.status === "seen");
    const planning = filteredTrips.filter((t) => t.status === "planning");
    const wishlist = filteredTrips.filter((t) => t.status === "wishlist");

    const planningSorted = [...planning].sort((a, b) => {
      const A = isValidISODate(a.startDate) ? new Date(a.startDate!).getTime() : Number.POSITIVE_INFINITY;
      const B = isValidISODate(b.startDate) ? new Date(b.startDate!).getTime() : Number.POSITIVE_INFINITY;
      return A - B;
    });

    const seenSorted = [...seen].sort((a, b) => {
      const A = isValidISODate(a.endDate) ? new Date(a.endDate!).getTime() : 0;
      const B = isValidISODate(b.endDate) ? new Date(b.endDate!).getTime() : 0;
      return B - A;
    });

    const wishlistSorted = [...wishlist].sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));

    return { seen: seenSorted, planning: planningSorted, wishlist: wishlistSorted };
  }, [filteredTrips]);

  const yearKeys = useMemo(() => {
    const seenTrips = filteredTrips.filter((t) => t.status === "seen");
    const years = new Set<string>();
    for (const t of seenTrips) {
      const y =
        typeof t.year === "number"
          ? t.year
          : isValidISODate(t.startDate)
          ? new Date(t.startDate!).getFullYear()
          : null;
      years.add(y != null ? String(y) : "unknown");
    }
    const arr = Array.from(years);
    const known = arr.filter((k) => k !== "unknown").sort((a, b) => Number(b) - Number(a));
    const out = [...known, ...(arr.includes("unknown") ? ["unknown"] : [])];
    return out.length ? out : ["unknown"];
  }, [filteredTrips]);

  useMemo(() => {
    if (!yearKeys.includes(yearSelected)) setYearSelected(yearKeys[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearKeys.join("|")]);

  const boardModeOptions = useMemo(
    () => [
      { id: "status", label: "Estado", icon: "albums-outline" as const },
      { id: "continent", label: "Continente", icon: "earth-outline" as const },
      { id: "year", label: "Año", icon: "calendar-outline" as const },
    ],
    []
  );

  const statusOptions = useMemo(
    () => [
      { id: "wishlist", label: "Por visitar", icon: "time-outline" as const },
      { id: "planning", label: "Organizando", icon: "radio-button-on-outline" as const },
      { id: "seen", label: "Vistos", icon: "checkmark-circle-outline" as const },
    ],
    []
  );

  const continentOptions = useMemo(() => {
    const order = ["europe", "africa", "asia", "north_america", "south_america", "oceania", "antarctica", "unknown"];
    return order.map((id) => ({
      id,
      label: id === "unknown" ? "Sin continente" : continentLabel(id),
      icon: "earth-outline" as const,
      tone: toneForContinent(id),
    }));
  }, []);

  const yearOptions = useMemo(() => {
    return yearKeys.map((id, idx) => ({
      id,
      label: id === "unknown" ? "Sin año" : id,
      icon: "calendar-outline" as const,
      tone: toneForYear(id, idx),
    }));
  }, [yearKeys]);

  const SubSelector = () => {
    if (boardMode === "status") {
      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: px(8), paddingRight: px(6) }}>
          {statusOptions.map((opt) => {
            const active = statusSelected === opt.id;
            const tone = toneForStatus(opt.id as TripStatus);
            const fg = active ? "white" : tone === "blue" ? "#2563EB" : tone === "green" ? "#059669" : "#475569";

            return (
              <Pressable
                key={opt.id}
                onPress={() => setStatusSelected(opt.id as TripStatus)}
                style={{
                  height: px(36),
                  paddingHorizontal: px(12),
                  borderRadius: px(14),
                  backgroundColor: active ? "#0F172A" : "white",
                  borderWidth: 1,
                  borderColor: active ? "rgba(15,23,42,0.12)" : "rgba(148,163,184,0.22)",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: px(8),
                }}
              >
                <Ionicons name={opt.icon} size={px(16)} color={active ? "white" : fg} />
                <Text style={{ fontSize: fs(12), fontWeight: "900", color: active ? "white" : "#0F172A" }}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      );
    }

    if (boardMode === "continent") {
      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: px(8), paddingRight: px(6) }}>
          {continentOptions.map((opt) => {
            const active = continentSelected === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => setContinentSelected(opt.id)}
                style={{
                  height: px(36),
                  paddingHorizontal: px(12),
                  borderRadius: px(14),
                  backgroundColor: active ? "#0F172A" : "white",
                  borderWidth: 1,
                  borderColor: active ? "rgba(15,23,42,0.12)" : "rgba(148,163,184,0.22)",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: px(8),
                }}
              >
                <Ionicons name="earth-outline" size={px(16)} color={active ? "white" : "#475569"} />
                <Text style={{ fontSize: fs(12), fontWeight: "900", color: active ? "white" : "#0F172A" }}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      );
    }

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: px(8), paddingRight: px(6) }}>
        {yearOptions.map((opt) => {
          const active = yearSelected === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => setYearSelected(opt.id)}
              style={{
                height: px(36),
                paddingHorizontal: px(12),
                borderRadius: px(14),
                backgroundColor: active ? "#0F172A" : "white",
                borderWidth: 1,
                borderColor: active ? "rgba(15,23,42,0.12)" : "rgba(148,163,184,0.22)",
                flexDirection: "row",
                alignItems: "center",
                gap: px(8),
              }}
            >
              <Ionicons name="calendar-outline" size={px(16)} color={active ? "white" : "#475569"} />
              <Text style={{ fontSize: fs(12), fontWeight: "900", color: active ? "white" : "#0F172A" }}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    );
  };

  const kpiValue =
    summaryLoading
      ? "—"
      : (summary?.daysToNextTrip ?? null) === null
      ? "—"
      : `${summary!.daysToNextTrip} días`;

  const kpiSubtitle =
    summaryLoading
      ? "—"
      : (summary?.daysToNextTrip ?? null) === null
      ? "Sin viajes próximos"
      : `${summary?.nextTrip?.name ?? ""}`;

  const activeColumn = useMemo(() => {
    if (boardMode === "status") {
      const title =
        statusSelected === "wishlist" ? "Por visitar" : statusSelected === "planning" ? "Organizando" : "Vistos";
      const trips =
        statusSelected === "wishlist" ? lanes.wishlist : statusSelected === "planning" ? lanes.planning : lanes.seen;

      return { title, trips, subcount: undefined as string | undefined };
    }

    if (boardMode === "continent") {
      const seenTrips = filteredTrips.filter((t) => t.status === "seen");
      const key = (continentSelected || "unknown").toLowerCase();

      const group = seenTrips
        .filter((t) => ((t.continent || "unknown").toLowerCase().trim() || "unknown") === key)
        .slice()
        .sort((a, b) => {
          const A = isValidISODate(a.endDate) ? new Date(a.endDate!).getTime() : 0;
          const B = isValidISODate(b.endDate) ? new Date(b.endDate!).getTime() : 0;
          return B - A;
        });

      const st = continentStatsMap.get(key);
      const visited = st?.visitedCountries ?? uniqueCountryCount(group);
      const total = st?.totalCountries ?? 0;
      const pct = st?.pct ?? (total > 0 ? Math.round((visited / total) * 100) : 0);
      const label = total > 0 ? `${visited}/${total} · ${pct}%` : `${visited}/—`;

      return { title: key === "unknown" ? "Sin continente" : continentLabel(key), trips: group, subcount: label };
    }

    // year
    const seenTrips = filteredTrips.filter((t) => t.status === "seen");
    const key = yearSelected || "unknown";

    const group = seenTrips
      .filter((t) => {
        const y =
          typeof t.year === "number"
            ? t.year
            : isValidISODate(t.startDate)
            ? new Date(t.startDate!).getFullYear()
            : null;
        const k = y != null ? String(y) : "unknown";
        return k === key;
      })
      .slice()
      .sort((a, b) => {
        const A = isValidISODate(a.endDate) ? new Date(a.endDate!).getTime() : 0;
        const B = isValidISODate(b.endDate) ? new Date(b.endDate!).getTime() : 0;
        return B - A;
      });

    return { title: key === "unknown" ? "Sin año" : key, trips: group, subcount: undefined as string | undefined };
  }, [boardMode, statusSelected, continentSelected, yearSelected, lanes, filteredTrips, continentStatsMap]);

  const isEmptyAll = !loading && trips.length === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F8FC" }}>
      {/* Header */}
      <View style={{ paddingHorizontal: px(16), paddingBottom: px(8), paddingTop: px(6) }}>
        <AppHeader title="Viajes" showProfile={false} showDatePicker={false} showBack={true} />
      </View>

      {/* Top content (NO vertical scroll aquí) */}
      <View style={{ paddingHorizontal: px(16), gap: px(12) }}>
        {/* Hero pill */}
        <HeroPill
          title="PRÓXIMO VIAJE"
          value={kpiValue}
          subtitle={kpiSubtitle}
          loading={summaryLoading}
          px={px}
          fs={fs}
          onPress={() => {
            if (summary?.nextTrip?.id) navigation.navigate("TripDetail", { tripId: summary.nextTrip.id });
          }}
        />

        {/* Toolbar */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: px(10) }}>
          <SearchBar q={q} setQ={setQ} px={px} fs={fs} />
          <Pressable
            onPress={() => {
              fetchTrips();
              fetchSummary();
              fetchContinentsStats();
            }}
            style={{
              width: px(40),
              height: px(40),
              borderRadius: px(14),
              backgroundColor: "white",
              borderWidth: 1,
              borderColor: "rgba(148,163,184,0.22)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="refresh-outline" size={px(18)} color="#475569" />
          </Pressable>
        </View>

        <ModeSelector value={boardMode} options={boardModeOptions} onChange={(v) => setBoardMode(v as BoardMode)} px={px} fs={fs} />
        <SubSelector />
      </View>

      {/* Kanban container (ONLY vertical scroll here) */}
      <View style={{ flex: 1, paddingHorizontal: px(16), marginTop: px(12), paddingBottom: px(12) }}>
        <View
          style={{
            flex: 1,
            borderRadius: px(16),
            padding: px(12),
            borderWidth: 1,
            borderColor: "rgba(148,163,184,0.18)",
            backgroundColor: "transparent",
          }}
        >
          <ColumnHeader title={activeColumn.title} subcount={activeColumn.subcount} px={px} fs={fs} />

          <View style={{ height: 1, backgroundColor: "rgba(148,163,184,0.14)", marginTop: px(10), marginBottom: px(10) }} />

          {(loading || (boardMode === "continent" && continentStatsLoading)) && trips.length === 0 ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : isEmptyAll ? (
            <View style={{ borderRadius: px(12), backgroundColor: "rgba(15,23,42,0.04)", padding: px(12) }}>
              <Text style={{ fontSize: fs(12), fontWeight: "900", color: "#94A3B8" }}>No tienes viajes todavía.</Text>
            </View>
          ) : activeColumn.trips.length === 0 ? (
            <View style={{ borderRadius: px(12), backgroundColor: "rgba(15,23,42,0.04)", padding: px(12) }}>
              <Text style={{ fontSize: fs(12), fontWeight: "900", color: "#94A3B8" }}>
                {boardMode === "status" ? "No hay viajes aquí." : "No hay viajes vistos en este grupo."}
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: px(10), paddingBottom: px(90) }}
            >
              {activeColumn.trips.map((t) => (
                <TripCardCompact
                  key={t.id}
                  trip={t}
                  px={px}
                  fs={fs}
                  onPress={() => navigation.navigate("TripDetail", { tripId: t.id })}
                />
              ))}
            </ScrollView>
          )}
        </View>
      </View>

      {/* Floating Action Button */}
      <Pressable
        onPress={() => navigation.navigate("TripForm")}
        style={{
          position: "absolute",
          right: px(16),
          bottom: px(16),
          width: px(56),
          height: px(56),
          borderRadius: 999,
          backgroundColor: "#0F172A",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#0B1220",
          shadowOpacity: 0.22,
          shadowRadius: px(18),
          shadowOffset: { width: 0, height: px(12) },
        }}
      >
        <Ionicons name="add-outline" size={px(24)} color="white" />
      </Pressable>
    </SafeAreaView>
  );
}
