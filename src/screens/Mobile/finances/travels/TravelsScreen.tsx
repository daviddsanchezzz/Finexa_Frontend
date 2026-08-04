// src/screens/Trips/TripsHomeScreen.tsx
import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  Platform,
  TextInput,
  TouchableOpacity,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import api from "../../../../api/api";
import { colors } from "../../../../theme/theme";
import { TravelsScreenSkeleton } from "../../../../components/skeletons/TravelsScreenSkeleton";

type TripStatus = "wishlist" | "planning" | "seen";
type BoardMode = "status" | "continent" | "year";
type Continent =
  | "europe" | "africa" | "asia" | "north_america"
  | "south_america" | "oceania" | "antarctica";

interface CountryStayFromApi {
  country: string;
  continent?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

interface TripFromApi {
  id: number;
  name: string;
  destination: string | null;
  startDate: string | null;
  endDate: string | null;
  status: TripStatus;
  cost: number;
  budget: number | null;
  continent: Continent | null;
  year: number | null;
  coverImageUrl?: string | null;
  countryStays?: CountryStayFromApi[] | null;
}

interface TripUI extends TripFromApi {}

type TripsSummaryDto = {
  daysToNextTrip: number | null;
  nextTrip: { id: number; name: string; startDate: string | null } | null;
  visitedCountries: number;
  pendingCountries: number;
  visitedPct: number;
  totalCountries: number;
};

type ContinentKey =
  | "europe" | "africa" | "asia" | "north_america"
  | "south_america" | "oceania" | "antarctica" | "unknown";

type ContinentStat = {
  continent: ContinentKey;
  visitedCountries: number;
  totalCountries: number;
  pct: number;
  trips: number;
};

type ContinentsStatsDto = ContinentStat[];

/* ─── Calendar helpers ─── */
const CAL_STATUS_COLORS: Record<TripStatus, string> = {
  planning: "#2563EB",
  seen: "#22C55E",
  wishlist: "#F59E0B",
};
const CAL_TRIP_PALETTE = [
  "#2563EB", "#D97706", "#7C3AED", "#DC2626",
  "#059669", "#DB2777", "#0891B2", "#65A30D", "#EA580C",
];
function getCalCells(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1).getDay();
  const offset = first === 0 ? 6 : first - 1;
  const numDays = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= numDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/* ─── Flag / country helpers ─── */
export function flagEmojiFromISO2(code?: string | null) {
  const c = (code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return "🌍";
  return String.fromCodePoint(...[...c].map((ch) => 127397 + ch.charCodeAt(0)));
}
export function countryNameEsFromISO2(code?: string | null) {
  const c = (code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return "—";
  try { return new Intl.DisplayNames(["es-ES"], { type: "region" }).of(c) || c; }
  catch { return c; }
}
export function twemojiFlagUrlFromISO2(code?: string | null) {
  const c = (code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return null;
  const cp1 = 0x1f1e6 + (c.charCodeAt(0) - 65);
  const cp2 = 0x1f1e6 + (c.charCodeAt(1) - 65);
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${cp1.toString(16)}-${cp2.toString(16)}.svg`;
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

/* ─── Multi-country helpers (a trip can span several countries) ─── */
function tripCountryCodes(trip: { destination?: string | null; countryStays?: CountryStayFromApi[] | null }): string[] {
  const fromStays = (trip.countryStays ?? [])
    .map((s) => (s.country || "").trim().toUpperCase())
    .filter(Boolean);
  if (fromStays.length > 0) return Array.from(new Set(fromStays));
  const dest = (trip.destination || "").trim().toUpperCase();
  return dest ? [dest] : [];
}
function tripCountriesLabel(trip: { destination?: string | null; countryStays?: CountryStayFromApi[] | null }): string {
  const codes = tripCountryCodes(trip);
  return codes.length > 0 ? codes.map((c) => countryNameEsFromISO2(c)).join(", ") : "—";
}

/** Row of flag badges, one per country a trip touches (falls back to a single "—" placeholder). */
function CountryBadgesRow({ codes, size = 14, gap = 3 }: { codes: string[]; size?: number; gap?: number }) {
  if (codes.length === 0) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap }}>
      {codes.map((code) => <CountryBadge key={code} code={code} size={size} />)}
    </View>
  );
}

/* ─── Trip thumbnail ─── */
function TripThumbnail({ trip, size = 56 }: { trip: TripUI; size?: number }) {
  if (trip.coverImageUrl) {
    return (
      <Image
        source={{ uri: trip.coverImageUrl }}
        style={{ width: size, height: size, borderRadius: 14, backgroundColor: "#EEF2FF" }}
        resizeMode="cover"
      />
    );
  }
  const codes = tripCountryCodes(trip);
  const primary = codes[0] ?? null;
  const flagUrl = twemojiFlagUrlFromISO2(primary);
  const flag = flagEmojiFromISO2(primary);
  return (
    <View style={{
      width: size, height: size, borderRadius: 14,
      backgroundColor: "#EEF2FF",
      alignItems: "center", justifyContent: "center",
      borderWidth: 1, borderColor: "#E0E7FF",
    }}>
      {codes.length <= 1 && Platform.OS === "web" && flagUrl ? (
        // @ts-ignore
        <img src={flagUrl} alt={primary || ""} style={{ width: size * 0.55, height: size * 0.55 }} />
      ) : (
        <Text style={{ fontSize: size * 0.44 }}>{codes.length <= 1 ? flag : "🌍"}</Text>
      )}
    </View>
  );
}

/* ─── Utils ─── */
function norm(s: string) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}
function isValidISODate(iso?: string | null) {
  if (!iso) return false;
  return !Number.isNaN(new Date(iso).getTime());
}
function formatDateRange(startISO?: string | null, endISO?: string | null) {
  if (!isValidISODate(startISO) && !isValidISODate(endISO)) return null;
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  if (isValidISODate(startISO) && isValidISODate(endISO)) {
    const s = new Date(startISO!).toLocaleDateString("es-ES", opts);
    const e = new Date(endISO!).toLocaleDateString("es-ES", opts);
    return `${s} – ${e}`;
  }
  if (isValidISODate(startISO)) return new Date(startISO!).toLocaleDateString("es-ES", opts);
  return null;
}
function formatEuro(n: number) {
  return (Number.isFinite(n) ? n : 0).toLocaleString("es-ES", {
    style: "currency", currency: "EUR",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
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
  return new Set(trips.map((t) => (t.destination || "").trim().toUpperCase()).filter(Boolean)).size;
}
function tripDurationDays(t: TripUI) {
  if (!isValidISODate(t.startDate) || !isValidISODate(t.endDate)) return null;
  const days = Math.round((new Date(t.endDate!).getTime() - new Date(t.startDate!).getTime()) / 86400000) + 1;
  return days > 0 ? days : null;
}

/* ─── Screen ─── */
export default function TripsHomeScreen({ navigation }: any) {
  const [boardMode, setBoardMode]           = useState<BoardMode>("status");
  const [q, setQ]                           = useState("");
  const [searchOpen, setSearchOpen]         = useState(false);
  const [statusSelected, setStatusSelected] = useState<TripStatus>("planning");
  const [continentSelected, setContinentSelected] = useState<string>("europe");
  const [yearSelected, setYearSelected]     = useState<string>("unknown");

  const [viewType, setViewType]         = useState<"list" | "calendar">("list");
  const [calDate, setCalDate]           = useState(() => new Date());
  const [selectedCalDay, setSelectedCalDay] = useState<number | null>(null);

  // Cacheado con react-query: al volver a la pantalla se muestran los datos ya
  // conocidos al instante (sin flash de "—") mientras se refresca en segundo plano;
  // solo se recarga de verdad si se creó/editó/eliminó algo desde la última visita.
  const tripsQuery = useQuery({
    queryKey: ["trips"],
    queryFn: async () => (await api.get("/trips")).data as TripUI[],
    staleTime: 1000 * 30,
  });
  const summaryQuery = useQuery({
    queryKey: ["tripsSummary"],
    queryFn: async () => (await api.get("/trips/summary")).data as TripsSummaryDto,
    staleTime: 1000 * 30,
  });
  const continentStatsQuery = useQuery({
    queryKey: ["tripsContinentsStats"],
    queryFn: async () => (await api.get("/trips/continents-stats")).data as ContinentsStatsDto,
    staleTime: 1000 * 30,
  });

  const trips = tripsQuery.data ?? [];
  const loading = tripsQuery.isLoading;
  const summary = summaryQuery.data ?? null;
  const summaryLoading = summaryQuery.isLoading;
  const continentStats = continentStatsQuery.data ?? null;

  useFocusEffect(useCallback(() => {
    tripsQuery.refetch();
    summaryQuery.refetch();
    continentStatsQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));

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
    const byDate = (a: TripUI, b: TripUI, asc: boolean) => {
      const A = isValidISODate(a.startDate) ? new Date(a.startDate!).getTime() : (asc ? Infinity : 0);
      const B = isValidISODate(b.startDate) ? new Date(b.startDate!).getTime() : (asc ? Infinity : 0);
      return asc ? A - B : B - A;
    };
    return {
      seen:     [...filteredTrips.filter(t => t.status === "seen")].sort((a, b) => byDate(a, b, false)),
      planning: [...filteredTrips.filter(t => t.status === "planning")].sort((a, b) => byDate(a, b, true)),
      wishlist: [...filteredTrips.filter(t => t.status === "wishlist")].sort((a, b) => (a.name || "").localeCompare(b.name || "", "es")),
    };
  }, [filteredTrips]);

  const yearKeys = useMemo(() => {
    const years = new Set<string>();
    for (const t of filteredTrips.filter(t => t.status === "seen")) {
      const y = typeof t.year === "number" ? t.year
        : isValidISODate(t.startDate) ? new Date(t.startDate!).getFullYear() : null;
      years.add(y != null ? String(y) : "unknown");
    }
    const arr = Array.from(years);
    const known = arr.filter(k => k !== "unknown").sort((a, b) => Number(b) - Number(a));
    const out = [...known, ...(arr.includes("unknown") ? ["unknown"] : [])];
    return out.length ? out : ["unknown"];
  }, [filteredTrips]);

  useMemo(() => {
    if (!yearKeys.includes(yearSelected)) setYearSelected(yearKeys[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearKeys.join("|")]);

  const activeColumn = useMemo(() => {
    if (boardMode === "status") {
      const labelMap = { wishlist: "Por visitar", planning: "Organizando", seen: "Visitados" };
      const listMap  = { wishlist: lanes.wishlist, planning: lanes.planning, seen: lanes.seen };
      return { title: labelMap[statusSelected], trips: listMap[statusSelected], subcount: undefined as string | undefined };
    }
    if (boardMode === "continent") {
      const seenTrips = filteredTrips.filter(t => t.status === "seen");
      const key = (continentSelected || "unknown").toLowerCase();
      const group = seenTrips.filter(t => ((t.continent || "unknown").toLowerCase().trim() || "unknown") === key)
        .sort((a, b) => new Date(b.endDate || 0).getTime() - new Date(a.endDate || 0).getTime());
      const st = continentStatsMap.get(key);
      const visited = st?.visitedCountries ?? uniqueCountryCount(group);
      const total   = st?.totalCountries ?? 0;
      const pct     = st?.pct ?? (total > 0 ? Math.round((visited / total) * 100) : 0);
      const label   = total > 0 ? `${visited}/${total} países · ${pct}%` : `${visited} países`;
      return { title: key === "unknown" ? "Sin continente" : continentLabel(key), trips: group, subcount: label };
    }
    const seenTrips = filteredTrips.filter(t => t.status === "seen");
    const key = yearSelected || "unknown";
    const group = seenTrips.filter(t => {
      const y = typeof t.year === "number" ? t.year
        : isValidISODate(t.startDate) ? new Date(t.startDate!).getFullYear() : null;
      return (y != null ? String(y) : "unknown") === key;
    }).sort((a, b) => new Date(b.endDate || 0).getTime() - new Date(a.endDate || 0).getTime());
    return { title: key === "unknown" ? "Sin año" : key, trips: group, subcount: undefined as string | undefined };
  }, [boardMode, statusSelected, continentSelected, yearSelected, lanes, filteredTrips, continentStatsMap]);

  const heroStats = useMemo(() => {
    const seenTrips  = trips.filter(t => t.status === "seen");
    const totalSpent = seenTrips.reduce((s, t) => s + (t.cost || 0), 0);
    const visited    = summary?.visitedCountries ?? uniqueCountryCount(seenTrips);
    const visitedPct = summary?.visitedPct ?? 0;
    return { totalSpent, totalTrips: trips.length, seenCount: seenTrips.length, visited, visitedPct };
  }, [trips, summary]);

  // Calendar
  const calYear  = calDate.getFullYear();
  const calMonth = calDate.getMonth();
  const calCells = useMemo(() => getCalCells(calYear, calMonth), [calYear, calMonth]);
  const calTrips = useMemo(
    () => trips.filter(t => (t.status === "planning" || t.status === "seen") && !!t.startDate && isValidISODate(t.startDate)),
    [trips]
  );
  const tripDayMap = useMemo(() => {
    const map: Record<number, Array<{ id: number; color: string; trip: TripUI }>> = {};
    const numDays = new Date(calYear, calMonth + 1, 0).getDate();
    for (let day = 1; day <= numDays; day++) {
      const dayStart = new Date(calYear, calMonth, day);
      const dayEnd   = new Date(calYear, calMonth, day, 23, 59, 59);
      const hits = calTrips.filter(t => {
        const start = new Date(t.startDate!);
        const end   = t.endDate && isValidISODate(t.endDate) ? new Date(t.endDate) : start;
        return start <= dayEnd && end >= dayStart;
      });
      if (hits.length > 0) map[day] = hits.map(t => ({ id: t.id, color: CAL_STATUS_COLORS[t.status], trip: t }));
    }
    return map;
  }, [calYear, calMonth, calTrips]);
  const tripsInCalMonth = useMemo(() => {
    const monthStart = new Date(calYear, calMonth, 1);
    const monthEnd   = new Date(calYear, calMonth + 1, 0, 23, 59, 59);
    return calTrips.filter(t => {
      const start = new Date(t.startDate!);
      const end   = t.endDate && isValidISODate(t.endDate) ? new Date(t.endDate) : start;
      return start <= monthEnd && end >= monthStart;
    }).sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime());
  }, [calYear, calMonth, calTrips]);
  const displayedCalTrips = useMemo(() => {
    if (selectedCalDay === null) return tripsInCalMonth;
    return (tripDayMap[selectedCalDay] ?? []).map(d => d.trip);
  }, [selectedCalDay, tripDayMap, tripsInCalMonth]);
  const calTripColors = useMemo(() => {
    const sorted = [...calTrips].sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime());
    const map = new Map<number, string>();
    sorted.forEach((t, i) => map.set(t.id, CAL_TRIP_PALETTE[i % CAL_TRIP_PALETTE.length]));
    return map;
  }, [calTrips]);

  const continentPills = useMemo(() => {
    const order = ["europe", "africa", "asia", "north_america", "south_america", "oceania", "antarctica", "unknown"];
    return order.map(id => ({ id, label: id === "unknown" ? "Sin continente" : continentLabel(id) }));
  }, []);
  const statusPills = [
    { id: "planning" as TripStatus, label: "Organizando" },
    { id: "seen"     as TripStatus, label: "Visitados"   },
    { id: "wishlist" as TripStatus, label: "Por visitar" },
  ];
  const isEmptyAll = !loading && trips.length === 0;

  const Pill = ({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        height: 34, paddingHorizontal: 16, borderRadius: 999,
        backgroundColor: active ? colors.primary : "white",
        borderWidth: 1, borderColor: active ? colors.primary : "#E5E7EB",
        alignItems: "center", justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: "700", color: active ? "white" : "#374151" }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F8FC" }}>

      {/* ── Header ── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 22, fontWeight: "900", color: "#0F172A" }}>Viajes</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("TripForm")}
          activeOpacity={0.85}
          style={{
            backgroundColor: colors.primary, borderRadius: 16,
            paddingVertical: 9, paddingHorizontal: 16,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "800", color: "white" }}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>


        {/* ── Hero card ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <LinearGradient
            colors={["#001B5E", "#003cc5", "#1A6AF5"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14,
              shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 }, elevation: 4,
            }}
          >
            {/* Badge % mundo */}
            {heroStats.visitedPct > 0 && (
              <TouchableOpacity
                onPress={() => navigation.navigate("WorldOverview")}
                activeOpacity={0.7}
                style={{
                  alignSelf: "flex-end",
                  paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.18)",
                  flexDirection: "row", alignItems: "center", gap: 4,
                  marginBottom: 6,
                }}
              >
                <Ionicons name="earth-outline" size={10} color="rgba(255,255,255,0.85)" />
                <Text style={{ fontSize: 10, fontWeight: "800", color: "white" }}>
                  {Math.round(heroStats.visitedPct)}%
                </Text>
              </TouchableOpacity>
            )}

            {/* Número grande + viajes */}
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
              <Text style={{ fontSize: 30, fontWeight: "900", color: "white", lineHeight: 34 }}>
                {summaryLoading ? "—" : heroStats.visited} <Text style={{ fontSize: 16, fontWeight: "800" }}>países</Text>
              </Text>
              <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }} numberOfLines={1}>
                {heroStats.totalTrips} {heroStats.totalTrips === 1 ? "viaje" : "viajes"}
              </Text>
            </View>

            {/* Próximo · Gastado en una sola línea */}
            <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: "600", marginTop: 6 }} numberOfLines={1}>
              {summaryLoading
                ? "—"
                : summary?.daysToNextTrip != null
                  ? `Próximo en ${summary.daysToNextTrip} días`
                  : "Sin próximo viaje"}
              {"  ·  "}Gastado {formatEuro(heroStats.totalSpent)}
            </Text>
          </LinearGradient>
        </View>

        {/* ── Buscador ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
          {searchOpen ? (
            <View style={{
              flexDirection: "row", alignItems: "center", gap: 8,
              paddingHorizontal: 14, height: 46,
              backgroundColor: "white", borderRadius: 16,
              borderWidth: 1, borderColor: "#E5E7EB",
            }}>
              <Ionicons name="search-outline" size={16} color="#94A3B8" />
              <TextInput
                autoFocus
                value={q}
                onChangeText={setQ}
                placeholder="Buscar viaje…"
                placeholderTextColor="#CBD5E1"
                style={{ flex: 1, fontSize: 14, color: "#0F172A", paddingVertical: 0 }}
              />
              <TouchableOpacity onPress={() => { setQ(""); setSearchOpen(false); }}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setSearchOpen(true)}
              activeOpacity={0.7}
              style={{
                flexDirection: "row", alignItems: "center", gap: 8,
                paddingHorizontal: 14, height: 46,
                backgroundColor: "white", borderRadius: 16,
                borderWidth: 1, borderColor: "#E5E7EB",
              }}
            >
              <Ionicons name="search-outline" size={16} color="#94A3B8" />
              <Text style={{ fontSize: 14, color: "#CBD5E1" }}>Buscar viaje…</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Toggle Lista / Calendario ── */}
        <View style={{ marginHorizontal: 20, flexDirection: "row", marginBottom: 14, backgroundColor: "#EEF2FF", borderRadius: 14, padding: 3 }}>
          {(["list", "calendar"] as const).map(type => {
            const active = viewType === type;
            return (
              <TouchableOpacity
                key={type}
                onPress={() => { setViewType(type); setSelectedCalDay(null); }}
                activeOpacity={0.8}
                style={{
                  flex: 1, paddingVertical: 8, borderRadius: 11,
                  backgroundColor: active ? "white" : "transparent",
                  alignItems: "center", justifyContent: "center",
                  shadowColor: active ? "#000" : "transparent",
                  shadowOpacity: active ? 0.06 : 0,
                  shadowRadius: active ? 4 : 0,
                  shadowOffset: { width: 0, height: 1 },
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: active ? colors.primary : "#6B7280" }}>
                  {type === "list" ? "Lista" : "Calendario"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* ── VISTA CALENDARIO ── */}
        {viewType === "calendar" && (
          <View style={{ paddingHorizontal: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <TouchableOpacity
                onPress={() => { setCalDate(new Date(calYear, calMonth - 1, 1)); setSelectedCalDay(null); }}
                style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="chevron-back" size={18} color="#374151" />
              </TouchableOpacity>
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A" }}>
                {capitalize(new Date(calYear, calMonth).toLocaleDateString("es-ES", { month: "long", year: "numeric" }))}
              </Text>
              <TouchableOpacity
                onPress={() => { setCalDate(new Date(calYear, calMonth + 1, 1)); setSelectedCalDay(null); }}
                style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="chevron-forward" size={18} color="#374151" />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: "row", marginBottom: 6 }}>
              {["L", "M", "X", "J", "V", "S", "D"].map(d => (
                <View key={d} style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>{d}</Text>
                </View>
              ))}
            </View>
            <View style={{ backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#E5E7EB", paddingVertical: 6, paddingHorizontal: 4, marginBottom: 16 }}>
              {(() => {
                type Bar = { trip: TripUI; color: string; startCol: number; endCol: number; lane: number };
                const numWeeks = calCells.length / 7;

                // Pre-calcular barras de todas las semanas
                const allWeekBars: Bar[][] = Array.from({ length: numWeeks }, (_, weekIdx) => {
                  const week = calCells.slice(weekIdx * 7, weekIdx * 7 + 7);
                  const laneEnds: number[] = [];
                  const bars: Bar[] = [];
                  for (const trip of calTrips) {
                    const tripStart = new Date(trip.startDate!);
                    const tripEnd = trip.endDate && isValidISODate(trip.endDate) ? new Date(trip.endDate) : new Date(trip.startDate!);
                    let startCol = -1, endCol = -1;
                    for (let col = 0; col < 7; col++) {
                      const day = week[col];
                      if (day == null) continue;
                      const cellDate = new Date(calYear, calMonth, day);
                      const cellEnd  = new Date(calYear, calMonth, day, 23, 59, 59);
                      if (tripStart <= cellEnd && tripEnd >= cellDate) {
                        if (startCol === -1) startCol = col;
                        endCol = col;
                      }
                    }
                    if (startCol === -1) continue;
                    let lane = 0;
                    while (lane < laneEnds.length && laneEnds[lane] >= startCol) lane++;
                    laneEnds[lane] = endCol;
                    if (lane < 3) bars.push({ trip, color: calTripColors.get(trip.id) ?? "#2563EB", startCol, endCol, lane });
                  }
                  return bars;
                });

                // Altura uniforme para todas las semanas
                const globalMaxLane = allWeekBars.flat().reduce((m, b) => Math.max(m, b.lane), -1);
                const todayObj = new Date();

                return Array.from({ length: numWeeks }, (_, weekIdx) => {
                  const week = calCells.slice(weekIdx * 7, weekIdx * 7 + 7);
                  const weekBars = allWeekBars[weekIdx];
                  return (
                  <View key={weekIdx} style={{ marginBottom: 2 }}>
                    <View style={{ flexDirection: "row" }}>
                      {week.map((day, dayIdx) => {
                        const isToday    = day != null && todayObj.getFullYear() === calYear && todayObj.getMonth() === calMonth && todayObj.getDate() === day;
                        const isSelected = day === selectedCalDay;
                        const hasTrips   = day ? (tripDayMap[day]?.length ?? 0) > 0 : false;
                        return (
                          <TouchableOpacity
                            key={dayIdx}
                            onPress={() => { if (!day || !hasTrips) return; setSelectedCalDay(prev => prev === day ? null : day); }}
                            disabled={!day || !hasTrips}
                            activeOpacity={0.7}
                            style={{ flex: 1, height: 34, alignItems: "center", justifyContent: "center" }}
                          >
                            {day != null ? (
                              <View style={{
                                width: 28, height: 28, borderRadius: 14,
                                backgroundColor: isSelected ? colors.primary : isToday ? "#EEF2FF" : "transparent",
                                alignItems: "center", justifyContent: "center",
                              }}>
                                <Text style={{
                                  fontSize: 13,
                                  fontWeight: (isToday || isSelected || hasTrips) ? "800" : "400",
                                  color: isSelected ? "white" : isToday ? colors.primary : hasTrips ? "#0F172A" : "#94A3B8",
                                }}>
                                  {day}
                                </Text>
                              </View>
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {Array.from({ length: globalMaxLane + 1 }, (_, lane) => {
                      const laneBars = weekBars.filter(b => b.lane === lane);
                      return (
                        <View key={lane} style={{ flexDirection: "row", height: 16, marginBottom: 1 }}>
                          {Array.from({ length: 7 }, (_, col) => {
                            const bar = laneBars.find(b => col >= b.startCol && col <= b.endCol);
                            if (!bar) return <View key={col} style={{ flex: 1 }} />;
                            const isFirst = col === bar.startCol;
                            const isLast  = col === bar.endCol;
                            return (
                              <View key={col} style={{
                                flex: 1, height: 14, marginTop: 1,
                                backgroundColor: bar.color,
                                borderTopLeftRadius: isFirst ? 7 : 0, borderBottomLeftRadius: isFirst ? 7 : 0,
                                borderTopRightRadius: isLast ? 7 : 0, borderBottomRightRadius: isLast ? 7 : 0,
                                marginLeft: isFirst ? 2 : 0, marginRight: isLast ? 2 : 0,
                              }} />
                            );
                          })}
                          {laneBars.map(bar => (
                            <View key={bar.trip.id} pointerEvents="none" style={{
                              position: "absolute",
                              left: `${(bar.startCol / 7) * 100}%` as any,
                              width: `${((bar.endCol - bar.startCol + 1) / 7) * 100}%` as any,
                              top: 1, height: 14, justifyContent: "center",
                              paddingLeft: 8, paddingRight: 4, overflow: "hidden",
                            }}>
                              <Text style={{ fontSize: 9, color: "white", fontWeight: "700", lineHeight: 14 }} numberOfLines={1}>
                                {bar.trip.name}
                              </Text>
                            </View>
                          ))}
                        </View>
                      );
                    })}
                  </View>
                  );
                });
              })()}
            </View>
            {tripsInCalMonth.length > 0 && (
              <View style={{ flexDirection: "row", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                {tripsInCalMonth.map(t => (
                  <View key={t.id} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: calTripColors.get(t.id) ?? "#2563EB" }} />
                    <Text style={{ fontSize: 11, fontWeight: "600", color: "#64748B" }} numberOfLines={1}>{t.name}</Text>
                  </View>
                ))}
              </View>
            )}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
              {selectedCalDay ? (
                <TouchableOpacity onPress={() => setSelectedCalDay(null)} style={{ marginRight: 6 }}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
              <Text style={{ fontSize: 11, fontWeight: "900", color: "#94A3B8", letterSpacing: 0.5, textTransform: "uppercase" }}>
                {selectedCalDay
                  ? `${selectedCalDay} de ${new Date(calYear, calMonth).toLocaleDateString("es-ES", { month: "long" })}`
                  : "Viajes en este mes"}
              </Text>
            </View>
            {displayedCalTrips.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <Text style={{ fontSize: 13, color: "#94A3B8", fontWeight: "600" }}>
                  {selectedCalDay ? "No hay viajes este día" : "No hay viajes en este mes"}
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {displayedCalTrips.map(t => {
                  const dateLabel = formatDateRange(t.startDate, t.endDate);
                  const tripColor = calTripColors.get(t.id) ?? CAL_STATUS_COLORS[t.status];
                  return (
                    <TouchableOpacity
                      key={t.id}
                      onPress={() => navigation.navigate("TripDetail", { tripId: t.id })}
                      activeOpacity={0.85}
                      style={{
                        backgroundColor: "white", borderRadius: 14, borderWidth: 1, borderColor: "#EEF2F7",
                        borderLeftWidth: 3, borderLeftColor: tripColor,
                        paddingVertical: 12, paddingHorizontal: 14,
                        flexDirection: "row", alignItems: "center", gap: 10,
                      }}
                    >
                      <CountryBadgesRow codes={tripCountryCodes(t)} size={22} gap={4} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: "800", color: "#0F172A" }} numberOfLines={1}>{t.name}</Text>
                        {dateLabel ? <Text style={{ fontSize: 11, color: "#94A3B8", fontWeight: "600", marginTop: 2 }}>{dateLabel}</Text> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ── VISTA LISTA ── */}
        {viewType === "list" && (
          <>
            {/* Board mode tabs */}
            <View style={{ marginHorizontal: 20, flexDirection: "row", marginBottom: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" }}>
              {([
                { id: "status",    label: "Estado"     },
                { id: "continent", label: "Continente" },
                { id: "year",      label: "Año"        },
              ] as { id: BoardMode; label: string }[]).map(opt => {
                const active = boardMode === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => setBoardMode(opt.id)}
                    activeOpacity={0.8}
                    style={{
                      paddingVertical: 8, paddingHorizontal: 4, marginRight: 20,
                      borderBottomWidth: 2,
                      borderBottomColor: active ? colors.primary : "transparent",
                      marginBottom: -1,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: active ? "800" : "600", color: active ? colors.primary : "#94A3B8" }}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Sub-pills */}
            <ScrollView
              horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingBottom: 4 }}
              style={{ marginBottom: 16 }}
            >
              {boardMode === "status" && statusPills.map(opt => (
                <Pill key={opt.id} active={statusSelected === opt.id} label={opt.label} onPress={() => setStatusSelected(opt.id)} />
              ))}
              {boardMode === "continent" && continentPills.map(opt => (
                <Pill key={opt.id} active={continentSelected === opt.id} label={opt.label} onPress={() => setContinentSelected(opt.id)} />
              ))}
              {boardMode === "year" && yearKeys.map(id => (
                <Pill key={id} active={yearSelected === id} label={id === "unknown" ? "Sin año" : id} onPress={() => setYearSelected(id)} />
              ))}
            </ScrollView>

            {/* Section header */}
            <View style={{ paddingHorizontal: 20, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: "900", color: "#94A3B8", letterSpacing: 0.6, textTransform: "uppercase" }}>
                {activeColumn.title}
              </Text>
              {activeColumn.trips.length > 0 && (
                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: "#EEF2FF" }}>
                  <Text style={{ fontSize: 11, fontWeight: "900", color: colors.primary }}>{activeColumn.trips.length}</Text>
                </View>
              )}
              {activeColumn.subcount ? (
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#94A3B8", marginLeft: "auto" as any }}>
                  {activeColumn.subcount}
                </Text>
              ) : null}
            </View>

            {/* Trip list */}
            <View style={{ paddingHorizontal: 20 }}>
              {(loading && trips.length === 0) ? (
                <TravelsScreenSkeleton />
              ) : isEmptyAll ? (
                <View style={{ alignItems: "center", paddingVertical: 48, gap: 12 }}>
                  <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 32 }}>✈️</Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: "900", color: "#0F172A" }}>Sin viajes aún</Text>
                  <Text style={{ fontSize: 13, color: "#94A3B8", textAlign: "center" }}>
                    Añade tu primer viaje para empezar a explorar el mundo.
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("TripForm")}
                    activeOpacity={0.9}
                    style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 22, borderRadius: 14, backgroundColor: colors.primary }}
                  >
                    <Ionicons name="add-outline" size={16} color="white" />
                    <Text style={{ fontSize: 14, fontWeight: "800", color: "white" }}>Añadir viaje</Text>
                  </TouchableOpacity>
                </View>
              ) : activeColumn.trips.length === 0 ? (
                <View style={{ padding: 24, borderRadius: 18, backgroundColor: "white", borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 24 }}>🗺️</Text>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#64748B", textAlign: "center" }}>
                    No hay viajes en esta categoría.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {activeColumn.trips.map((t) => {
                    const dateLabel = formatDateRange(t.startDate, t.endDate);
                    const days      = tripDurationDays(t);
                    const showCost  = t.status === "seen" && (t.cost || 0) > 0;
                    const countryCodes = tripCountryCodes(t);
                    const isMultiCountry = countryCodes.length > 1;
                    const showSingleCountryFlagNearTitle = !isMultiCountry && !!t.coverImageUrl && !!countryCodes[0];

                    return (
                      <TouchableOpacity
                        key={t.id}
                        activeOpacity={0.85}
                        onPress={() => navigation.navigate("TripDetail", { tripId: t.id })}
                        style={{
                          backgroundColor: "white", borderRadius: 20,
                          paddingVertical: 12, paddingHorizontal: 14,
                          borderWidth: 1, borderColor: "#F0F4F8",
                          flexDirection: "row", alignItems: "center", gap: 12,
                          shadowColor: "#000", shadowOpacity: 0.04,
                          shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
                        }}
                      >
                        {/* Thumbnail */}
                        <TripThumbnail trip={t} size={56} />

                        {/* Info */}
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                            {isMultiCountry && (
                              <CountryBadgesRow codes={countryCodes.slice(0, 3)} size={14} />
                            )}
                            {showSingleCountryFlagNearTitle && (
                              <CountryBadge code={countryCodes[0]} size={14} />
                            )}
                            <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A", flex: 1 }} numberOfLines={1}>
                              {t.name}
                            </Text>
                          </View>
                          {dateLabel ? (
                            <Text style={{ fontSize: 12, color: "#94A3B8", fontWeight: "600", marginTop: 2 }} numberOfLines={1}>
                              {dateLabel}{days ? ` · ${days} días` : ""}
                            </Text>
                          ) : (
                            <Text style={{ fontSize: 12, color: "#94A3B8", fontWeight: "600", marginTop: 2 }} numberOfLines={1}>
                              {tripCountriesLabel(t)}
                            </Text>
                          )}
                        </View>

                        {/* Derecha */}
                        <View style={{ alignItems: "flex-end", gap: 4 }}>
                          {showCost && (
                            <Text style={{ fontSize: 14, fontWeight: "800", color: "#0F172A" }}>
                              {formatEuro(t.cost)}
                            </Text>
                          )}
                          <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
