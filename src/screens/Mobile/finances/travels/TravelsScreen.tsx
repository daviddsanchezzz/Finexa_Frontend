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
  if (!isValidISODate(startISO) || !isValidISODate(endISO)) return "Sin fecha";
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  return `${new Date(startISO!).toLocaleDateString("es-ES", opts)} · ${new Date(endISO!).toLocaleDateString("es-ES", opts)}`;
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

/* ─── Status meta ─── */
const STATUS_META: Record<TripStatus, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  planning:  { label: "Organizando", icon: "radio-button-on-outline", color: colors.primary, bg: "#EEF2FF" },
  seen:      { label: "Visitado",    icon: "checkmark-circle-outline", color: "#16A34A", bg: "#DCFCE7" },
  wishlist:  { label: "Por visitar", icon: "time-outline",             color: "#F59E0B", bg: "#FEF3C7" },
};

/* ─── Screen ─── */
export default function TripsHomeScreen({ navigation }: any) {
  const [boardMode, setBoardMode]             = useState<BoardMode>("status");
  const [q, setQ]                             = useState("");
  const [statusSelected, setStatusSelected]   = useState<TripStatus>("planning");
  const [continentSelected, setContinentSelected] = useState<string>("europe");
  const [yearSelected, setYearSelected]       = useState<string>("unknown");

  const [loading, setLoading]                     = useState(true);
  const [trips, setTrips]                         = useState<TripUI[]>([]);
  const [summary, setSummary]                     = useState<TripsSummaryDto | null>(null);
  const [summaryLoading, setSummaryLoading]       = useState(true);
  const [continentStats, setContinentStats]       = useState<ContinentsStatsDto | null>(null);
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

  /* ─── Hero stats ─── */
  const heroStats = useMemo(() => {
    const seenTrips   = trips.filter((t) => t.status === "seen");
    const totalSpent  = seenTrips.reduce((s, t) => s + (t.cost || 0), 0);
    const totalTrips  = trips.length;
    const seenCount   = seenTrips.length;
    const visited     = summary?.visitedCountries ?? uniqueCountryCount(seenTrips);
    const visitedPct  = summary?.visitedPct ?? 0;
    return { totalSpent, totalTrips, seenCount, visited, visitedPct };
  }, [trips, summary]);

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

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header fijo */}
      <View className="px-5 pb-3">
        <AppHeader title="Viajes" showProfile={false} showDatePicker={false} showBack={true} />
      </View>

      {/* Hero + controles (no scroll) */}
      <View style={{ paddingHorizontal: 20, gap: 12 }}>

        {/* ── Hero card azul ── */}
        <View
          style={{
            backgroundColor: colors.primary,
            borderRadius: 26,
            padding: 16,
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          {/* Cabecera del hero */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  width: 42, height: 42, borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.16)",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 20 }}>✈️</Text>
              </View>
              <View>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "white" }}>Mis viajes</Text>
                <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
                  {heroStats.totalTrips} {heroStats.totalTrips === 1 ? "viaje" : "viajes"} en total
                </Text>
              </View>
            </View>

            {/* Badge % mundo */}
            {heroStats.visitedPct > 0 && (
              <View
                style={{
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.18)",
                  flexDirection: "row", alignItems: "center", gap: 4,
                }}
              >
                <Ionicons name="earth-outline" size={13} color="white" />
                <Text style={{ color: "white", fontWeight: "900", fontSize: 12 }}>
                  {Math.round(heroStats.visitedPct * 100)}% mundo
                </Text>
              </View>
            )}
          </View>

          {/* Valor principal */}
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: "700" }}>
              Países visitados
            </Text>
            <Text style={{ fontSize: 32, fontWeight: "900", color: "white", marginTop: 2 }}>
              {summaryLoading ? "—" : heroStats.visited}
            </Text>
          </View>

          {/* Dos sub-boxes */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            {/* Próximo viaje */}
            <View
              style={{
                flex: 1, backgroundColor: "rgba(255,255,255,0.14)",
                borderRadius: 18, padding: 12,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Ionicons name="calendar-number-outline" size={13} color="rgba(255,255,255,0.85)" />
                <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: "800" }}>
                  Próximo
                </Text>
              </View>
              {summaryLoading ? (
                <Text style={{ fontSize: 13, fontWeight: "900", color: "white" }}>—</Text>
              ) : summary?.daysToNextTrip != null ? (
                <>
                  <Text style={{ fontSize: 15, fontWeight: "900", color: "white" }}>
                    {summary.daysToNextTrip} días
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.65)", marginTop: 2 }} numberOfLines={1}>
                    {summary.nextTrip?.name ?? ""}
                  </Text>
                </>
              ) : (
                <Text style={{ fontSize: 12, fontWeight: "800", color: "rgba(255,255,255,0.65)" }}>
                  Sin próximos
                </Text>
              )}
            </View>

            {/* Total gastado */}
            <View
              style={{
                flex: 1, backgroundColor: "rgba(255,255,255,0.14)",
                borderRadius: 18, padding: 12,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Ionicons name="wallet-outline" size={13} color="rgba(255,255,255,0.85)" />
                <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: "800" }}>
                  Gastado
                </Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: "900", color: "white" }}>
                {formatEuro(heroStats.totalSpent)}
              </Text>
              <Text style={{ fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.65)", marginTop: 2 }}>
                en {heroStats.seenCount} {heroStats.seenCount === 1 ? "viaje" : "viajes"}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Botón nuevo viaje + buscador ── */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate("TripForm")}
            activeOpacity={0.9}
            style={{
              flexDirection: "row", alignItems: "center", gap: 8,
              paddingVertical: 12, paddingHorizontal: 16,
              borderRadius: 18, backgroundColor: colors.primary,
              shadowColor: colors.primary,
              shadowOpacity: 0.25, shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
            }}
          >
            <Ionicons name="add-outline" size={18} color="white" />
            <Text style={{ fontSize: 14, fontWeight: "900", color: "white" }}>Nuevo viaje</Text>
          </TouchableOpacity>

          {/* Buscador */}
          <View
            style={{
              flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
              paddingHorizontal: 12, height: 46,
              backgroundColor: "white", borderRadius: 18,
              borderWidth: 1, borderColor: "#E5E7EB",
            }}
          >
            <Ionicons name="search-outline" size={16} color="#94A3B8" />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Buscar…"
              placeholderTextColor="#CBD5E1"
              style={{ flex: 1, fontSize: 14, fontWeight: "600", color: "#0F172A", paddingVertical: 0 }}
            />
            {!!q && (
              <TouchableOpacity onPress={() => setQ("")}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Mode selector ── */}
        <View
          style={{
            flexDirection: "row", gap: 6, padding: 5,
            backgroundColor: "white", borderRadius: 18,
            borderWidth: 1, borderColor: "#E5E7EB",
          }}
        >
          {([
            { id: "status",    label: "Estado",     icon: "albums-outline" as const },
            { id: "continent", label: "Continente", icon: "earth-outline" as const  },
            { id: "year",      label: "Año",        icon: "calendar-outline" as const },
          ] as { id: BoardMode; label: string; icon: keyof typeof Ionicons.glyphMap }[]).map((opt) => {
            const active = boardMode === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setBoardMode(opt.id)}
                activeOpacity={0.85}
                style={{
                  flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
                  gap: 6, paddingVertical: 9, borderRadius: 14,
                  backgroundColor: active ? colors.primary : "transparent",
                }}
              >
                <Ionicons name={opt.icon} size={14} color={active ? "white" : "#64748B"} />
                <Text style={{ fontSize: 12, fontWeight: "900", color: active ? "white" : "#64748B" }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Sub-selector pills ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 4 }}
        >
          {boardMode === "status" && statusPills.map((opt) => {
            const active = statusSelected === opt.id;
            const meta = STATUS_META[opt.id];
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setStatusSelected(opt.id)}
                activeOpacity={0.85}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 6,
                  height: 36, paddingHorizontal: 14, borderRadius: 18,
                  backgroundColor: active ? colors.primary : "white",
                  borderWidth: 1,
                  borderColor: active ? colors.primary : "#E5E7EB",
                }}
              >
                <Ionicons name={meta.icon} size={14} color={active ? "white" : meta.color} />
                <Text style={{ fontSize: 13, fontWeight: "900", color: active ? "white" : "#0F172A" }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {boardMode === "continent" && continentPills.map((opt) => {
            const active = continentSelected === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setContinentSelected(opt.id)}
                activeOpacity={0.85}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 6,
                  height: 36, paddingHorizontal: 14, borderRadius: 18,
                  backgroundColor: active ? colors.primary : "white",
                  borderWidth: 1, borderColor: active ? colors.primary : "#E5E7EB",
                }}
              >
                <Ionicons name="earth-outline" size={14} color={active ? "white" : "#64748B"} />
                <Text style={{ fontSize: 13, fontWeight: "900", color: active ? "white" : "#0F172A" }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {boardMode === "year" && yearKeys.map((id) => {
            const active = yearSelected === id;
            return (
              <TouchableOpacity
                key={id}
                onPress={() => setYearSelected(id)}
                activeOpacity={0.85}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 6,
                  height: 36, paddingHorizontal: 14, borderRadius: 18,
                  backgroundColor: active ? colors.primary : "white",
                  borderWidth: 1, borderColor: active ? colors.primary : "#E5E7EB",
                }}
              >
                <Ionicons name="calendar-outline" size={14} color={active ? "white" : "#64748B"} />
                <Text style={{ fontSize: 13, fontWeight: "900", color: active ? "white" : "#0F172A" }}>
                  {id === "unknown" ? "Sin año" : id}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Lista de viajes (scroll independiente) ── */}
      <View style={{ flex: 1, paddingHorizontal: 20, marginTop: 14 }}>
        {/* Section header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "900", color: "#94A3B8", letterSpacing: 0.5, textTransform: "uppercase" }}>
              {activeColumn.title}
            </Text>
            {activeColumn.trips.length > 0 && (
              <View
                style={{
                  paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
                  backgroundColor: "#EEF2FF",
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "900", color: colors.primary }}>
                  {activeColumn.trips.length}
                </Text>
              </View>
            )}
          </View>

          {activeColumn.subcount ? (
            <Text style={{ fontSize: 12, fontWeight: "800", color: "#64748B" }}>
              {activeColumn.subcount}
            </Text>
          ) : null}
        </View>

        {(loading || (boardMode === "continent" && continentStatsLoading)) && trips.length === 0 ? (
          <TravelsScreenSkeleton />
        ) : isEmptyAll ? (
          /* Empty state global */
          <View style={{ alignItems: "center", marginTop: 32, gap: 12 }}>
            <View
              style={{
                width: 64, height: 64, borderRadius: 24,
                backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 30 }}>✈️</Text>
            </View>
            <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A" }}>Sin viajes aún</Text>
            <Text style={{ fontSize: 13, color: "#94A3B8", fontWeight: "600", textAlign: "center" }}>
              Añade tu primer viaje para empezar a explorar el mundo.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("TripForm")}
              activeOpacity={0.9}
              style={{
                flexDirection: "row", alignItems: "center", gap: 8,
                paddingVertical: 12, paddingHorizontal: 20,
                borderRadius: 18, backgroundColor: colors.primary,
              }}
            >
              <Ionicons name="add-outline" size={18} color="white" />
              <Text style={{ fontSize: 14, fontWeight: "900", color: "white" }}>Añadir viaje</Text>
            </TouchableOpacity>
          </View>
        ) : activeColumn.trips.length === 0 ? (
          /* Empty state del grupo */
          <View
            style={{
              padding: 16, borderRadius: 18,
              backgroundColor: "white", borderWidth: 1, borderColor: "#E5E7EB",
              alignItems: "center", gap: 6,
            }}
          >
            <Text style={{ fontSize: 20 }}>🗺️</Text>
            <Text style={{ fontSize: 13, fontWeight: "800", color: "#64748B", textAlign: "center" }}>
              {boardMode === "status" ? "No hay viajes en esta categoría." : "No hay viajes visitados en este grupo."}
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingBottom: 100 }}
          >
            {activeColumn.trips.map((t) => {
              const meta      = STATUS_META[t.status];
              const hasDate   = isValidISODate(t.startDate) || isValidISODate(t.endDate);
              const dateLabel = formatDateRange(t.startDate, t.endDate);
              const yearLabel = t.year ?? (isValidISODate(t.startDate) ? new Date(t.startDate!).getFullYear() : null);
              const showSpent = t.status === "seen" && (t.cost || 0) > 0;

              return (
                <TouchableOpacity
                  key={t.id}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate("TripDetail", { tripId: t.id })}
                  style={{
                    backgroundColor: "white",
                    borderRadius: 18,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderWidth: 1,
                    borderColor: "#EEF2F7",
                    shadowColor: "#000",
                    shadowOpacity: 0.03,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 1 },
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    {/* Flag */}
                    <View
                      style={{
                        width: 44, height: 44, borderRadius: 14,
                        backgroundColor: "#F8FAFC",
                        alignItems: "center", justifyContent: "center",
                        borderWidth: 1, borderColor: "#E5E7EB",
                      }}
                    >
                      <CountryBadge code={t.destination} size={24} />
                    </View>

                    {/* Info */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "800", color: "#0F172A" }} numberOfLines={1}>
                        {t.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "600", marginTop: 1 }} numberOfLines={1}>
                        {countryNameEsFromISO2(t.destination)}
                      </Text>
                    </View>

                    {/* Derecha: gastado o chevron */}
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      {showSpent && (
                        <Text style={{ fontSize: 13, fontWeight: "900", color: "#0F172A" }}>
                          {formatEuro(t.cost)}
                        </Text>
                      )}
                      <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
                    </View>
                  </View>

                  {/* Tags */}
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                    {/* Status badge */}
                    <View
                      style={{
                        flexDirection: "row", alignItems: "center", gap: 5,
                        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
                        backgroundColor: meta.bg,
                      }}
                    >
                      <Ionicons name={meta.icon} size={11} color={meta.color} />
                      <Text style={{ fontSize: 11, fontWeight: "800", color: meta.color }}>
                        {meta.label}
                      </Text>
                    </View>

                    {hasDate && (
                      <View
                        style={{
                          flexDirection: "row", alignItems: "center", gap: 5,
                          paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
                          backgroundColor: "#F1F5F9",
                        }}
                      >
                        <Ionicons name="calendar-outline" size={11} color="#64748B" />
                        <Text style={{ fontSize: 11, fontWeight: "800", color: "#475569" }}>
                          {dateLabel}
                        </Text>
                      </View>
                    )}

                    {!!yearLabel && !hasDate && (
                      <View
                        style={{
                          paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
                          backgroundColor: "#F1F5F9",
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: "800", color: "#475569" }}>
                          {yearLabel}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
