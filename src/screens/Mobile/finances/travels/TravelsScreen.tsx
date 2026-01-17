// src/screens/Trips/TripsHomeScreen.tsx
import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AppHeader from "../../../../components/AppHeader";
import { colors } from "../../../../theme/theme";
import api from "../../../../api/api";

type TripStatus = "wishlist" | "planning" | "seen";
type FilterType = "all" | TripStatus;

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
  userId: number;
  name: string;
  destination: string | null; // ISO2 (ES, IT, LT...)
  startDate: string | null;
  endDate: string | null;
  companions: string[];
  status: TripStatus; // ✅ viene del backend
  cost: number;
  budget: number | null;
  continent: Continent | null;
  year: number | null;
  createdAt: string;
  updatedAt: string;
}

interface TripUI {
  id: number;
  name: string;
  destination: string; // ISO2
  startDate: string | null;
  endDate: string | null;
  status: TripStatus;
  cost: number;
  budget: number | null;
  continent: Continent | null;
  year: number | null;
}

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

function CountryBadge({ code, size = 22 }: { code?: string | null; size?: number }) {
  const url = twemojiFlagUrlFromISO2(code);
  const flag = flagEmojiFromISO2(code);

  // En web, el emoji de bandera puede renderizarse como "IT" "LT" etc -> Twemoji garantiza bandera.
  if (Platform.OS === "web" && url) {
    // @ts-ignore
    return <img src={url} alt={code || "flag"} style={{ width: size, height: size, display: "block" }} />;
  }

  return <Text style={{ fontSize: size }}>{flag}</Text>;
}

/** ===== UI helpers ===== */
const formatEuro = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function isValidISODate(iso?: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  return !Number.isNaN(d.getTime());
}

const formatDateRange = (start?: string | null, end?: string | null) => {
  if (!isValidISODate(start) || !isValidISODate(end)) return "Sin fecha";

  const s = new Date(start!);
  const e = new Date(end!);

  const baseOpts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  const sameYear = s.getFullYear() === e.getFullYear();

  const startStr = s.toLocaleDateString("es-ES", baseOpts);
  const endStr = e.toLocaleDateString("es-ES", { ...baseOpts, year: sameYear ? undefined : "numeric" });

  return `${startStr} - ${endStr}`;
};

const getStatusStyle = (status: TripStatus) => {
  switch (status) {
    case "wishlist":
      return { label: "Por ver", color: "#0F172A", bg: "rgba(15,23,42,0.08)" };
    case "planning":
      return { label: "Organizando", color: "#2563EB", bg: "rgba(37,99,235,0.12)" };
    case "seen":
    default:
      return { label: "Vistos", color: "#059669", bg: "rgba(16,185,129,0.14)" };
  }
};

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "wishlist", label: "Por ver" },
  { key: "planning", label: "Organizando" },
  { key: "seen", label: "Vistos" },
];

export default function TripsHomeScreen({ navigation }: any) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [trips, setTrips] = useState<TripUI[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTrips = async () => {
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
        year: t.year ?? null,
      }));

      setTrips(mapped);
    } catch (err) {
      console.error("❌ Error al obtener viajes:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTrips();
    }, [])
  );

  const filteredTrips = useMemo(() => {
    let base = trips;

    if (filter !== "all") {
      base = trips.filter((t) => t.status === filter);
    }

    // Orden:
    // - planning: por startDate asc si existe, si no al final
    // - wishlist: por name asc
    // - seen: por endDate desc si existe, si no por updatedAt (no lo tenemos aquí) -> dejamos por name
    const safeTime = (iso?: string | null, fallback: number) =>
      isValidISODate(iso) ? new Date(iso!).getTime() : fallback;

    const sorted = [...base].sort((a, b) => {
      // Mantén agrupado por status cuando estás en "Todos": wishlist, planning, seen (como Kanban mental)
      if (filter === "all" && a.status !== b.status) {
        const order: Record<TripStatus, number> = { wishlist: 0, planning: 1, seen: 2 };
        return order[a.status] - order[b.status];
      }

      if (a.status === "planning") {
        return safeTime(a.startDate, Number.POSITIVE_INFINITY) - safeTime(b.startDate, Number.POSITIVE_INFINITY);
      }

      if (a.status === "seen") {
        return safeTime(b.endDate, 0) - safeTime(a.endDate, 0);
      }

      // wishlist
      return (a.name || "").localeCompare(b.name || "", "es");
    });

    return sorted;
  }, [filter, trips]);

  const summary = useMemo(() => {
    const totalCost = trips.reduce((sum, t) => sum + (t.cost || 0), 0);

    const wishlistCount = trips.filter((t) => t.status === "wishlist").length;
    const planningCount = trips.filter((t) => t.status === "planning").length;
    const seenCount = trips.filter((t) => t.status === "seen").length;

    return {
      totalCost,
      count: trips.length,
      wishlistCount,
      planningCount,
      seenCount,
    };
  }, [trips]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* HEADER */}
      <View className="px-5 pb-3">
        <AppHeader title="Viajes" showProfile={false} showDatePicker={false} showBack={true} />
      </View>

      {/* RESUMEN + FILTROS */}
      <View className="px-5 mb-3">
        {/* TARJETA RESUMEN (hero azul) */}
        <View
          style={{
            backgroundColor: colors.primary,
            borderRadius: 24,
            padding: 18,
            marginBottom: 10,
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-row items-center">
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.16)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 22 }}>✈️</Text>
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "white" }}>
                  Resumen de viajes
                </Text>
              </View>
            </View>

            {summary.count > 0 && (
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Total gastado</Text>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "white" }}>
                  {formatEuro(summary.totalCost)}
                </Text>
              </View>
            )}
          </View>

          <View className="flex-row mt-1">
            <View className="flex-1">
              <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Viajes registrados</Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "white", marginTop: 2 }}>{summary.count}</Text>
            </View>

            <View className="flex-1 items-end">
              <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Organizando</Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "white", marginTop: 2 }}>
                {summary.planningCount}
              </Text>
            </View>
          </View>

          <View className="flex-row mt-3">
            <View className="flex-1">
              <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Por ver</Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "white", marginTop: 2 }}>
                {summary.wishlistCount}
              </Text>
            </View>

            <View className="flex-1 items-end">
              <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Vistos</Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "white", marginTop: 2 }}>
                {summary.seenCount}
              </Text>
            </View>
          </View>
        </View>

        {/* FILTROS (Todos / Por ver / Organizando / Vistos) */}
        <View className="flex-row rounded-2xl bg-slate-50 p-1 mt-1">
          {FILTERS.map((opt) => {
            const active = filter === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setFilter(opt.key)}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 14,
                  backgroundColor: active ? "white" : "transparent",
                  borderWidth: active ? 1 : 0,
                  borderColor: active ? colors.primary : "transparent",
                }}
                activeOpacity={0.9}
              >
                <Text
                  style={{
                    textAlign: "center",
                    fontSize: 12,
                    fontWeight: "600",
                    color: active ? colors.primary : "#6B7280",
                  }}
                  numberOfLines={1}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* LISTA DE VIAJES */}
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : filteredTrips.length === 0 ? (
          <Text className="text-center text-gray-400 mt-16 text-sm">
            No hay viajes en este filtro.
          </Text>
        ) : (
          filteredTrips.map((trip) => {
            const statusInfo = getStatusStyle(trip.status);

            const showSpent = trip.status === "seen" && (trip.cost || 0) > 0;

            return (
              <TouchableOpacity
                key={trip.id}
                activeOpacity={0.9}
                onPress={() => navigation.navigate("TripDetail", { tripId: trip.id })}
                className="rounded-3xl mb-3"
                style={{
                  backgroundColor: "white",
                  padding: 14,
                  shadowColor: "#000",
                  shadowOpacity: 0.04,
                  shadowRadius: 5,
                  shadowOffset: { width: 0, height: 2 },
                }}
              >
                {/* HEADER CARD */}
                <View className="flex-row justify-between items-center mb-2">
                  <View className="flex-row items-center flex-1 pr-2">
                    <View
                      className="w-9 h-9 rounded-2xl items-center justify-center mr-2"
                      style={{ backgroundColor: "#F3F4F6" }}
                    >
                      <CountryBadge code={trip.destination} size={22} />
                    </View>

                    <View className="flex-1">
                      <Text className="text-[15px] font-semibold text-gray-900" numberOfLines={1}>
                        {trip.name}
                      </Text>

                      <View className="flex-row items-center mt-0.5">
                        <Ionicons name="location-outline" size={12} color="#9CA3AF" />
                        <Text className="text-[11px] text-gray-500 ml-1" numberOfLines={1}>
                          {countryNameEsFromISO2(trip.destination)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Gastado: SOLO en vistos y si hay coste */}
                  {showSpent ? (
                    <View className="items-end">
                      <Text className="text-[11px] text-gray-400">Gastado</Text>
                      <Text className="text-[15px] font-semibold text-gray-900">
                        {formatEuro(trip.cost || 0)}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ width: 1 }} />
                  )}
                </View>

                {/* FOOTER CARD */}
                <View className="flex-row justify-between items-center mt-1">
                  <View className="flex-row items-center">
                    <Ionicons name="calendar-outline" size={13} color="#9CA3AF" />
                    <Text className="text-[11px] text-gray-500 ml-1">
                      {formatDateRange(trip.startDate, trip.endDate)}
                    </Text>
                  </View>

                  <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: statusInfo.bg }}>
                    <Text className="text-[10px] font-semibold" style={{ color: statusInfo.color }}>
                      {statusInfo.label}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* BOTÓN AÑADIR VIAJE */}
        <TouchableOpacity
          onPress={() => navigation.navigate("TripForm")}
          className="flex-row items-center justify-center py-2.5 rounded-2xl mt-2"
          style={{
            backgroundColor: "#F3F4F6",
            borderWidth: 1,
            borderColor: "#E5E7EB",
          }}
          activeOpacity={0.9}
        >
          <Ionicons name="add-outline" size={18} color="#64748B" />
          <Text className="text-sm text-slate-500 font-medium ml-1.5">
            Añadir viaje
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
