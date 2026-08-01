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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AppHeader from "../../../../components/AppHeader";
import api from "../../../../api/api";
import { colors } from "../../../../theme/theme";
import { TravelsScreenSkeleton } from "../../../../components/skeletons/TravelsScreenSkeleton";

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
  const offset = first === 0 ? 6 : first - 1; // lunes primero
  const numDays = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= numDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/* ─── Flag helpers ─── */
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
    return new Intl.DisplayNames(["es-ES"], { type: "region" }).of(c) || c;
  } catch { return c; }
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
    return `${new Date(startISO!).toLocaleDateString("es-ES", opts)} – ${new Date(endISO!).toLocaleDateString("es-ES", opts)}`;
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
  if (v === "europe")        return "Europa";
  if (v === "africa")        return "África";
  if (v === "asia")          return "Asia";
  if (v === "america" || v === "north_america") return "Norteamérica";
  if (v === "south_america") return "Sudamérica";
  if (v === "oceania")       return "Oceanía";
  if (v === "antarctica")    return "Antártida";
  return c ? c : "Sin continente";
}
function uniqueCountryCount(trips: TripUI[]) {
  return new Set(trips.map((t) => (t.destination || "").trim().toUpperCase()).filter(Boolean)).size;
}

const STATUS_META: Record<TripStatus, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  planning:  { label: "Organizando", icon: "radio-button-on-outline", color: colors.primary, bg: "#EEF2FF" },
  seen:      { label: "Visitado",    icon: "checkmark-circle-outline", color: "#16A34A",     bg: "#DCFCE7" },
  wishlist:  { label: "Por visitar", icon: "time-outline",             color: "#F59E0B",     bg: "#FEF3C7" },
};

/* ─── Screen ─── */
export default function TripsHomeScreen({ navigation }: any) {
  const [boardMode, setBoardMode]           = useState<BoardMode>("status");
  const [q, setQ]                           = useState("");
  const [searchOpen, setSearchOpen]         = useState(false);
  const [statusSelected, setStatusSelected] = useState<TripStatus>("planning");
  const [continentSelected, setContinentSelected] = useState<string>("europe");
  const [yearSelected, setYearSelected]     = useState<string>("unknown");

  const [viewType, setViewType]                 = useState<"list" | "calendar">("list");
  const [calDate, setCalDate]                   = useState(() => new Date());
  const [selectedCalDay, setSelectedCalDay]     = useState<number | null>(null);

  const [loading, setLoading]                   = useState(true);
  const [trips, setTrips]                       = useState<TripUI[]>([]);
  const [summary, setSummary]                   = useState<TripsSummaryDto | null>(null);
  const [summaryLoading, setSummaryLoading]     = useState(true);
  const [continentStats, setContinentStats]     = useState<ContinentsStatsDto | null>(null);
  const [continentStatsLoading, setContinentStatsLoading] = useState(false);

  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/trips");
      const data: TripFromApi[] = res.data || [];
      setTrips(data.map((t) => ({
        id: t.id, name: t.name,
        destination: t.destination || "",
        startDate: t.startDate ?? null,
        endDate: t.endDate ?? null,
        status: t.status,
        cost: typeof t.cost === "number" ? t.cost : 0,
        budget: t.budget ?? null,
        continent: t.continent ?? null,
        year: typeof t.year === "number" ? t.year : null,
      })));
    } catch { setTrips([]); } finally { setLoading(false); }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const res = await api.get("/trips/summary");
      setSummary(res.data as TripsSummaryDto);
    } catch { setSummary(null); } finally { setSummaryLoading(false); }
  }, []);

  const fetchContinentsStats = useCallback(async () => {
    try {
      setContinentStatsLoading(true);
      const res = await api.get("/trips/continents-stats");
      setContinentStats(res.data as ContinentsStatsDto);
    } catch { setContinentStats(null); } finally { setContinentStatsLoading(false); }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTrips(); fetchSummary(); fetchContinentsStats();
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
    const seen     = filteredTrips.filter((t) => t.status === "seen");
    const planning = filteredTrips.filter((t) => t.status === "planning");
    const wishlist = filteredTrips.filter((t) => t.status === "wishlist");
    const byDate = (a: TripUI, b: TripUI, asc: boolean) => {
      const A = isValidISODate(a.startDate) ? new Date(a.startDate!).getTime() : (asc ? Infinity : 0);
      const B = isValidISODate(b.startDate) ? new Date(b.startDate!).getTime() : (asc ? Infinity : 0);
      return asc ? A - B : B - A;
    };
    return {
      seen:     [...seen].sort((a, b) => byDate(a, b, false)),
      planning: [...planning].sort((a, b) => byDate(a, b, true)),
      wishlist: [...wishlist].sort((a, b) => (a.name || "").localeCompare(b.name || "", "es")),
    };
  }, [filteredTrips]);

  const yearKeys = useMemo(() => {
    const years = new Set<string>();
    for (const t of filteredTrips.filter((t) => t.status === "seen")) {
      const y = typeof t.year === "number" ? t.year
        : isValidISODate(t.startDate) ? new Date(t.startDate!).getFullYear() : null;
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

  const activeColumn = useMemo(() => {
    if (boardMode === "status") {
      const title = statusSelected === "wishlist" ? "Por visitar" : statusSelected === "planning" ? "Organizando" : "Visitados";
      const list  = statusSelected === "wishlist" ? lanes.wishlist : statusSelected === "planning" ? lanes.planning : lanes.seen;
      return { title, trips: list, subcount: undefined as string | undefined };
    }
    if (boardMode === "continent") {
      const seenTrips = filteredTrips.filter((t) => t.status === "seen");
      const key = (continentSelected || "unknown").toLowerCase();
      const group = seenTrips
        .filter((t) => ((t.continent || "unknown").toLowerCase().trim() || "unknown") === key)
        .sort((a, b) => {
          const A = isValidISODate(a.endDate) ? new Date(a.endDate!).getTime() : 0;
          const B = isValidISODate(b.endDate) ? new Date(b.endDate!).getTime() : 0;
          return B - A;
        });
      const st = continentStatsMap.get(key);
      const visited = st?.visitedCountries ?? uniqueCountryCount(group);
      const total   = st?.totalCountries ?? 0;
      const pct     = st?.pct ?? (total > 0 ? Math.round((visited / total) * 100) : 0);
      const label   = total > 0 ? `${visited}/${total} países · ${pct}%` : `${visited} países`;
      return { title: key === "unknown" ? "Sin continente" : continentLabel(key), trips: group, subcount: label };
    }
    const seenTrips = filteredTrips.filter((t) => t.status === "seen");
    const key = yearSelected || "unknown";
    const group = seenTrips
      .filter((t) => {
        const y = typeof t.year === "number" ? t.year
          : isValidISODate(t.startDate) ? new Date(t.startDate!).getFullYear() : null;
        return (y != null ? String(y) : "unknown") === key;
      })
      .sort((a, b) => {
        const A = isValidISODate(a.endDate) ? new Date(a.endDate!).getTime() : 0;
        const B = isValidISODate(b.endDate) ? new Date(b.endDate!).getTime() : 0;
        return B - A;
      });
    return { title: key === "unknown" ? "Sin año" : key, trips: group, subcount: undefined as string | undefined };
  }, [boardMode, statusSelected, continentSelected, yearSelected, lanes, filteredTrips, continentStatsMap]);

  const heroStats = useMemo(() => {
    const seenTrips  = trips.filter((t) => t.status === "seen");
    const totalSpent = seenTrips.reduce((s, t) => s + (t.cost || 0), 0);
    const visited    = summary?.visitedCountries ?? uniqueCountryCount(seenTrips);
    const visitedPct = summary?.visitedPct ?? 0;
    return { totalSpent, totalTrips: trips.length, seenCount: seenTrips.length, visited, visitedPct };
  }, [trips, summary]);

  // ── Calendar derived values ───────────────────────────────────────────────
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
    return calTrips
      .filter(t => {
        const start = new Date(t.startDate!);
        const end   = t.endDate && isValidISODate(t.endDate) ? new Date(t.endDate) : start;
        return start <= monthEnd && end >= monthStart;
      })
      .sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime());
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
  // ──────────────────────────────────────────────────────────────────────────

  const continentPills = useMemo(() => {
    const order = ["europe", "africa", "asia", "north_america", "south_america", "oceania", "antarctica", "unknown"];
    return order.map((id) => ({ id, label: id === "unknown" ? "Sin continente" : continentLabel(id) }));
  }, []);

  const statusPills = [
    { id: "planning" as TripStatus, label: "Organizando" },
    { id: "seen"     as TripStatus, label: "Visitados"   },
    { id: "wishlist" as TripStatus, label: "Por visitar" },
  ];

  const isEmptyAll = !loading && trips.length === 0;

  /* ─── Pill helper ─── */
  const Pill = ({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        height: 34,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: active ? colors.primary : "white",
        borderWidth: 1,
        borderColor: active ? colors.primary : "#E5E7EB",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: "700", color: active ? "white" : "#374151" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">

      {/* ── Header fijo ── */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 4,
          paddingBottom: 6,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View style={{ flex: 1 }}>
          <AppHeader title="Viajes" showProfile={false} showDatePicker={false} showBack={true} />
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate("TripForm")}
          activeOpacity={0.85}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            backgroundColor: "#0F172A",
            borderRadius: 12,
            paddingVertical: 6,
            paddingHorizontal: 10,
          }}
        >
          <Ionicons name="add-outline" size={14} color="white" />
          <Text style={{ fontSize: 12, fontWeight: "700", color: "white" }}>Nuevo</Text>
        </TouchableOpacity>
      </View>

      {/* ── Contenido scrollable ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Hero card */}
        <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
          <View
            style={{
              backgroundColor: colors.primary,
              borderRadius: 20,
              padding: 14,
              shadowColor: "#000",
              shadowOpacity: 0.10,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
            }}
          >
            {/* Top row: todo en una línea */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 18 }}>✈️</Text>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: "white" }}>
                    {summaryLoading ? "—" : heroStats.visited} países
                  </Text>
                  <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>
                    {heroStats.totalTrips} {heroStats.totalTrips === 1 ? "viaje" : "viajes"}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {heroStats.visitedPct > 0 && (
                  <View
                    style={{
                      paddingHorizontal: 9, paddingVertical: 4,
                      borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)",
                      flexDirection: "row", alignItems: "center", gap: 3,
                    }}
                  >
                    <Ionicons name="earth-outline" size={11} color="white" />
                    <Text style={{ color: "white", fontWeight: "700", fontSize: 11 }}>
                      {Math.round(heroStats.visitedPct)}% mundo
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Sub-boxes en línea */}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.13)", borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="calendar-number-outline" size={13} color="rgba(255,255,255,0.75)" />
                <View>
                  <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: "600" }}>Próximo</Text>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: "white" }} numberOfLines={1}>
                    {summaryLoading ? "—" : summary?.daysToNextTrip != null ? `${summary.daysToNextTrip}d` : "Sin planear"}
                  </Text>
                </View>
              </View>

              <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.13)", borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="wallet-outline" size={13} color="rgba(255,255,255,0.75)" />
                <View>
                  <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: "600" }}>Gastado</Text>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: "white" }} numberOfLines={1}>
                    {formatEuro(heroStats.totalSpent)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── Buscador colapsable ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
          {searchOpen ? (
            <View
              style={{
                flexDirection: "row", alignItems: "center", gap: 8,
                paddingHorizontal: 14, height: 44,
                backgroundColor: "white", borderRadius: 14,
                borderWidth: 1, borderColor: "#E5E7EB",
              }}
            >
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
                paddingHorizontal: 14, height: 44,
                backgroundColor: "white", borderRadius: 14,
                borderWidth: 1, borderColor: "#E5E7EB",
              }}
            >
              <Ionicons name="search-outline" size={16} color="#94A3B8" />
              <Text style={{ fontSize: 14, color: "#CBD5E1" }}>Buscar viaje…</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Toggle Lista / Calendario ── */}
        <View style={{ marginHorizontal: 20, flexDirection: "row", marginBottom: 12, backgroundColor: "#F1F5F9", borderRadius: 12, padding: 3 }}>
          {(["list", "calendar"] as const).map(type => {
            const active = viewType === type;
            return (
              <TouchableOpacity
                key={type}
                onPress={() => { setViewType(type); setSelectedCalDay(null); }}
                activeOpacity={0.8}
                style={{ flex: 1, paddingVertical: 7, borderRadius: 9, backgroundColor: active ? "white" : "transparent", alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 5 }}
              >
                <Ionicons name={type === "list" ? "list-outline" : "calendar-outline"} size={14} color={active ? colors.primary : "#6B7280"} />
                <Text style={{ fontSize: 12, fontWeight: "700", color: active ? colors.primary : "#6B7280" }}>
                  {type === "list" ? "Lista" : "Calendario"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {viewType === "calendar" && (
          <View style={{ paddingHorizontal: 20 }}>
            {/* Navegación de mes */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <TouchableOpacity
                onPress={() => { setCalDate(new Date(calYear, calMonth - 1, 1)); setSelectedCalDay(null); }}
                style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="chevron-back" size={18} color="#374151" />
              </TouchableOpacity>
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A" }}>
                {capitalize(new Date(calYear, calMonth).toLocaleDateString("es-ES", { month: "long", year: "numeric" }))}
              </Text>
              <TouchableOpacity
                onPress={() => { setCalDate(new Date(calYear, calMonth + 1, 1)); setSelectedCalDay(null); }}
                style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="chevron-forward" size={18} color="#374151" />
              </TouchableOpacity>
            </View>

            {/* Cabecera días */}
            <View style={{ flexDirection: "row", marginBottom: 4 }}>
              {["L", "M", "X", "J", "V", "S", "D"].map(d => (
                <View key={d} style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>{d}</Text>
                </View>
              ))}
            </View>

            {/* Grid del calendario */}
            <View style={{ backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#E5E7EB", paddingVertical: 6, paddingHorizontal: 4, marginBottom: 16 }}>
              {Array.from({ length: calCells.length / 7 }, (_, weekIdx) => {
                const week = calCells.slice(weekIdx * 7, weekIdx * 7 + 7);

                // Compute trip bars for this week
                const laneEnds: number[] = [];
                const weekBars: Array<{
                  trip: TripUI; color: string;
                  startCol: number; endCol: number;
                  isStart: boolean; isEnd: boolean; lane: number;
                }> = [];

                for (const trip of calTrips) {
                  const tripStart = new Date(trip.startDate!);
                  const tripEnd = trip.endDate && isValidISODate(trip.endDate) ? new Date(trip.endDate) : new Date(trip.startDate!);
                  let startCol = -1, endCol = -1, isStart = false, isEnd = false;
                  for (let col = 0; col < 7; col++) {
                    const day = week[col];
                    if (day == null) continue;
                    const cellDate = new Date(calYear, calMonth, day);
                    const cellEnd  = new Date(calYear, calMonth, day, 23, 59, 59);
                    if (tripStart <= cellEnd && tripEnd >= cellDate) {
                      if (startCol === -1) startCol = col;
                      endCol = col;
                      if (tripStart.getFullYear() === calYear && tripStart.getMonth() === calMonth && tripStart.getDate() === day) isStart = true;
                      if (tripEnd.getFullYear() === calYear && tripEnd.getMonth() === calMonth && tripEnd.getDate() === day) isEnd = true;
                    }
                  }
                  if (startCol === -1) continue;
                  let lane = 0;
                  while (lane < laneEnds.length && laneEnds[lane] >= startCol) lane++;
                  laneEnds[lane] = endCol;
                  if (lane < 3) {
                    weekBars.push({ trip, color: calTripColors.get(trip.id) ?? "#2563EB", startCol, endCol, isStart, isEnd, lane });
                  }
                }

                const maxLane = weekBars.length > 0 ? Math.max(...weekBars.map(b => b.lane)) : -1;
                const todayObj = new Date();

                return (
                  <View key={weekIdx} style={{ marginBottom: 4 }}>
                    {/* Día numbers row */}
                    <View style={{ flexDirection: "row" }}>
                      {week.map((day, dayIdx) => {
                        const isToday    = day != null && todayObj.getFullYear() === calYear && todayObj.getMonth() === calMonth && todayObj.getDate() === day;
                        const isSelected = day === selectedCalDay;
                        const hasTrips   = day ? (tripDayMap[day]?.length ?? 0) > 0 : false;
                        return (
                          <TouchableOpacity
                            key={dayIdx}
                            onPress={() => {
                              if (!day || !hasTrips) return;
                              setSelectedCalDay(prev => prev === day ? null : day);
                            }}
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

                    {/* Trip bars — una fila por lane */}
                    {Array.from({ length: maxLane + 1 }, (_, lane) => {
                      const laneBars = weekBars.filter(b => b.lane === lane);
                      return (
                        <View key={lane} style={{ flexDirection: "row", height: 16, marginBottom: 2 }}>
                          {Array.from({ length: 7 }, (_, col) => {
                            const bar = laneBars.find(b => col >= b.startCol && col <= b.endCol);
                            if (!bar) return <View key={col} style={{ flex: 1 }} />;
                            const isFirst = col === bar.startCol;
                            const isLast  = col === bar.endCol;
                            return (
                              <View
                                key={col}
                                style={{
                                  flex: 1, height: 14, marginTop: 1,
                                  backgroundColor: bar.color,
                                  borderTopLeftRadius: isFirst ? 7 : 0,
                                  borderBottomLeftRadius: isFirst ? 7 : 0,
                                  borderTopRightRadius: isLast ? 7 : 0,
                                  borderBottomRightRadius: isLast ? 7 : 0,
                                  marginLeft: isFirst ? 2 : 0,
                                  marginRight: isLast ? 2 : 0,
                                  justifyContent: "center",
                                  overflow: "hidden",
                                }}
                              >
                                {isFirst ? (
                                  <Text style={{ fontSize: 9, color: "white", fontWeight: "700", paddingLeft: 5, lineHeight: 14 }} numberOfLines={1}>
                                    {bar.trip.name}
                                  </Text>
                                ) : null}
                              </View>
                            );
                          })}
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>

            {/* Leyenda por viaje */}
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

            {/* Header lista */}
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

            {/* Lista de viajes */}
            {displayedCalTrips.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <Text style={{ fontSize: 13, color: "#94A3B8", fontWeight: "600" }}>
                  {selectedCalDay ? "No hay viajes este día" : "No hay viajes en este mes"}
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {displayedCalTrips.map(t => {
                  const dateLabel  = formatDateRange(t.startDate, t.endDate);
                  const tripColor  = calTripColors.get(t.id) ?? CAL_STATUS_COLORS[t.status];
                  const meta       = STATUS_META[t.status];
                  return (
                    <TouchableOpacity
                      key={t.id}
                      onPress={() => navigation.navigate("TripDetail", { tripId: t.id })}
                      activeOpacity={0.85}
                      style={{
                        backgroundColor: "white",
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: "#EEF2F7",
                        borderLeftWidth: 3,
                        borderLeftColor: tripColor,
                        paddingVertical: 12,
                        paddingHorizontal: 14,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <CountryBadge code={t.destination} size={22} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: "800", color: "#0F172A" }} numberOfLines={1}>{t.name}</Text>
                        {dateLabel ? (
                          <Text style={{ fontSize: 11, color: "#94A3B8", fontWeight: "600", marginTop: 2 }}>{dateLabel}</Text>
                        ) : null}
                      </View>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: tripColor + "1A" }}>
                        <Text style={{ fontSize: 10, fontWeight: "800", color: tripColor }}>{meta.label}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ── Contenido de vista lista ── */}
        {viewType === "list" && (<><View
          style={{
            marginHorizontal: 20,
            flexDirection: "row",
            backgroundColor: "#F1F5F9",
            borderRadius: 14,
            padding: 4,
            marginBottom: 12,
          }}
        >
          {([
            { id: "status",    label: "Estado"     },
            { id: "continent", label: "Continente" },
            { id: "year",      label: "Año"        },
          ] as { id: BoardMode; label: string }[]).map((opt) => {
            const active = boardMode === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setBoardMode(opt.id)}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: active ? "white" : "transparent",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: active ? colors.primary : "#6B7280" }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Sub-pills ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingBottom: 4 }}
          style={{ marginBottom: 16 }}
        >
          {boardMode === "status" && statusPills.map((opt) => (
            <Pill
              key={opt.id}
              active={statusSelected === opt.id}
              label={opt.label}
              onPress={() => setStatusSelected(opt.id)}
            />
          ))}
          {boardMode === "continent" && continentPills.map((opt) => (
            <Pill
              key={opt.id}
              active={continentSelected === opt.id}
              label={opt.label}
              onPress={() => setContinentSelected(opt.id)}
            />
          ))}
          {boardMode === "year" && yearKeys.map((id) => (
            <Pill
              key={id}
              active={yearSelected === id}
              label={id === "unknown" ? "Sin año" : id}
              onPress={() => setYearSelected(id)}
            />
          ))}
        </ScrollView>

        {/* ── Section header ── */}
        <View
          style={{
            paddingHorizontal: 20, marginBottom: 10,
            flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "900", color: "#94A3B8", letterSpacing: 0.5, textTransform: "uppercase" }}>
              {activeColumn.title}
            </Text>
            {activeColumn.trips.length > 0 && (
              <View
                style={{
                  paddingHorizontal: 8, paddingVertical: 3,
                  borderRadius: 999, backgroundColor: "#EEF2FF",
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "900", color: colors.primary }}>
                  {activeColumn.trips.length}
                </Text>
              </View>
            )}
          </View>
          {activeColumn.subcount ? (
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#94A3B8" }}>
              {activeColumn.subcount}
            </Text>
          ) : null}
        </View>

        {/* ── Lista ── */}
        <View style={{ paddingHorizontal: 20 }}>
          {(loading || (boardMode === "continent" && continentStatsLoading)) && trips.length === 0 ? (
            <TravelsScreenSkeleton />
          ) : isEmptyAll ? (
            <View style={{ alignItems: "center", paddingVertical: 48, gap: 12 }}>
              <View
                style={{
                  width: 64, height: 64, borderRadius: 24,
                  backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 28 }}>✈️</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A" }}>Sin viajes aún</Text>
              <Text style={{ fontSize: 13, color: "#94A3B8", textAlign: "center" }}>
                Añade tu primer viaje para empezar a explorar el mundo.
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("TripForm")}
                activeOpacity={0.9}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 8,
                  paddingVertical: 11, paddingHorizontal: 20,
                  borderRadius: 14, backgroundColor: colors.primary,
                }}
              >
                <Ionicons name="add-outline" size={16} color="white" />
                <Text style={{ fontSize: 14, fontWeight: "800", color: "white" }}>Añadir viaje</Text>
              </TouchableOpacity>
            </View>
          ) : activeColumn.trips.length === 0 ? (
            <View
              style={{
                padding: 20, borderRadius: 18,
                backgroundColor: "white", borderWidth: 1, borderColor: "#E5E7EB",
                alignItems: "center", gap: 6,
              }}
            >
              <Text style={{ fontSize: 22 }}>🗺️</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#64748B", textAlign: "center" }}>
                {boardMode === "status" ? "No hay viajes en esta categoría." : "No hay viajes visitados en este grupo."}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {activeColumn.trips.map((t) => {
                const dateLabel  = formatDateRange(t.startDate, t.endDate);
                const yearLabel  = t.year ?? (isValidISODate(t.startDate) ? new Date(t.startDate!).getFullYear() : null);
                const showCost   = t.status === "seen" && (t.cost || 0) > 0;
                const subtitle   = dateLabel ?? (yearLabel ? String(yearLabel) : countryNameEsFromISO2(t.destination));

                return (
                  <TouchableOpacity
                    key={t.id}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate("TripDetail", { tripId: t.id })}
                    style={{
                      backgroundColor: "white",
                      borderRadius: 18,
                      paddingVertical: 13,
                      paddingHorizontal: 14,
                      borderWidth: 1,
                      borderColor: "#EEF2F7",
                      flexDirection: "row",
                      alignItems: "center",
                      shadowColor: "#000",
                      shadowOpacity: 0.03,
                      shadowRadius: 4,
                      shadowOffset: { width: 0, height: 1 },
                    }}
                  >
                    {/* Flag */}
                    <View
                      style={{
                        width: 44, height: 44, borderRadius: 14,
                        backgroundColor: "#F8FAFC",
                        alignItems: "center", justifyContent: "center",
                        borderWidth: 1, borderColor: "#E5E7EB",
                        marginRight: 12,
                      }}
                    >
                      <CountryBadge code={t.destination} size={24} />
                    </View>

                    {/* Info */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "800", color: "#0F172A" }} numberOfLines={1}>
                        {t.name}
                      </Text>
                      {subtitle ? (
                        <Text style={{ fontSize: 12, color: "#94A3B8", fontWeight: "600", marginTop: 2 }} numberOfLines={1}>
                          {subtitle}
                        </Text>
                      ) : null}
                    </View>

                    {/* Derecha */}
                    <View style={{ alignItems: "flex-end", gap: 3, marginLeft: 8 }}>
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
        </>)}
      </ScrollView>
    </SafeAreaView>
  );
}
