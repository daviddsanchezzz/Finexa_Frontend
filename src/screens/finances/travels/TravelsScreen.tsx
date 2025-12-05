// src/screens/Trips/TripsHomeScreen.tsx
import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AppHeader from "../../../components/AppHeader";
import { colors } from "../../../theme/theme";
import api from "../../../api/api";

type TripStatus = "upcoming" | "ongoing" | "past";
type FilterType = "all" | "upcoming" | "past";

// Lo que esperamos del backend
interface TripFromApi {
  id: number;
  name: string;
  destination?: string | null;
  emoji?: string | null;
  color?: string | null;
  startDate: string; // ISO
  endDate: string;   // ISO
  cost: number | null;
  // opcionalmente pueden venir transacciones o un total:
  transactions?: {
    id: number;
    amount: number;
    type: string;
  }[];
}

// Lo que usamos en la UI (totalSpent siempre resuelto)
interface TripUI {
  id: number;
  name: string;
  destination: string;
  emoji?: string;
  color?: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  cost: number | null;
}

const getTripStatus = (trip: { startDate: string; endDate: string }): TripStatus => {
  const today = new Date();
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);

  if (end < today) return "past";
  if (start > today) return "upcoming";
  return "ongoing";
};

const formatDateRange = (start: string, end: string) => {
  const s = new Date(start);
  const e = new Date(end);

  if (isNaN(s.getTime()) || isNaN(e.getTime())) return "-";

  const baseOpts: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
  };

  const sameYear = s.getFullYear() === e.getFullYear();

  const startStr = s.toLocaleDateString("es-ES", baseOpts);
  const endStr = e.toLocaleDateString("es-ES", {
    ...baseOpts,
    year: sameYear ? undefined : "numeric",
  });

  return `${startStr} - ${endStr}`;
};

const getStatusStyle = (status: TripStatus) => {
  switch (status) {
    case "upcoming":
      return { label: "Próximo", color: "#16A34A", bg: "#DCFCE7" };
    case "ongoing":
      return { label: "En curso", color: "#F97316", bg: "#FFEDD5" };
    case "past":
    default:
      return { label: "Pasado", color: "#6B7280", bg: "#E5E7EB" };
  }
};

export default function TripsHomeScreen({ navigation }: any) {
  const [filter, setFilter] = useState<FilterType>("upcoming");
  const [trips, setTrips] = useState<TripUI[]>([]);
  const [loading, setLoading] = useState(false);

    const formatEuro = (n: number) =>
    n.toLocaleString("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const res = await api.get("/trips");
      const data: TripFromApi[] = res.data || [];

      const mapped: TripUI[] = data.map((t) => {
        // Si el backend ya manda totalSpent, lo usamos

        const base = {
          id: t.id,
          name: t.name,
          destination: t.destination || "",
          emoji: t.emoji || undefined,
          color: t.color || undefined,
          startDate: t.startDate,
          endDate: t.endDate,
          cost: t.cost || 0,
        };

        const status = getTripStatus(base);

        return { ...base, status };
      });

      setTrips(mapped);
    } catch (err) {
      console.error("❌ Error al obtener viajes:", err);
    } finally {
      setLoading(false);
    }
  };

  // Recargar cada vez que entras a la pantalla
  useFocusEffect(
    useCallback(() => {
      fetchTrips();
    }, [])
  );

  const filteredTrips = useMemo(() => {
    if (filter === "all") return trips;
    if (filter === "upcoming") {
      return trips.filter((t) => t.status === "upcoming");
    }
    if (filter === "past") {
      return trips.filter((t) => t.status === "past");
    }
    return trips;
  }, [filter, trips]);

  const summary = useMemo(() => {
    if (!trips.length) {
      return {
        cost: 0,
        count: 0,
        upcomingCount: 0,
      };
    }

    const cost = trips.reduce((sum, t) => sum + (t.cost || 0), 0);

    const upcomingCount = trips.filter((t) => t.status === "upcoming").length;

    return {
      cost,
      count: trips.length,
      upcomingCount,
    };
  }, [trips]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* HEADER */}
      <View className="px-5 pb-3">
        <AppHeader
          title="Viajes"
          showProfile={false}
          showDatePicker={false}
          showBack={true}
        />
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
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "white",
                  }}
                >
                  Resumen de viajes
                </Text>
              </View>
            </View>

            {summary.count > 0 && (
              <View style={{ alignItems: "flex-end" }}>
                <Text
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  Total gastado
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "white",
                  }}
                >
                  {formatEuro(summary.cost)}
                </Text>
              </View>
            )}
          </View>

          <View className="flex-row mt-1">
            <View className="flex-1">
              <Text
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                Viajes registrados
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "white",
                  marginTop: 2,
                }}
              >
                {summary.count}
              </Text>
            </View>

            <View className="flex-1 items-end">
              <Text
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                Próximos viajes
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "white",
                  marginTop: 2,
                }}
              >
                {summary.upcomingCount}
              </Text>
            </View>
          </View>
        </View>

        {/* FILTROS (Todos / Próximos / Pasados) */}
        <View className="flex-row rounded-2xl bg-slate-50 p-1 mt-1">
          {[
            { key: "all" as FilterType, label: "Todos" },
            { key: "upcoming" as FilterType, label: "Próximos" },
            { key: "past" as FilterType, label: "Pasados" },
          ].map((opt) => {
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
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginTop: 40 }}
          />
        ) : filteredTrips.length === 0 ? (
          <Text className="text-center text-gray-400 mt-16 text-sm">
            No hay viajes en este filtro.
          </Text>
        ) : (
          filteredTrips.map((trip) => {
            const statusInfo = getStatusStyle(trip.status as TripStatus);

            return (
              <TouchableOpacity
                key={trip.id}
                activeOpacity={0.9}
                onPress={() =>
                  navigation.navigate("TripDetail", {
                    tripId: trip.id,
                  })
                }
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
                      <Text style={{ fontSize: 22 }}>
                        {trip.emoji || "✈️"}
                      </Text>
                    </View>

                    <View className="flex-1">
                      <Text className="text-[15px] font-semibold text-gray-900">
                        {trip.name}
                      </Text>
                      <View className="flex-row items-center mt-0.5">
                        <Ionicons
                          name="location-outline"
                          size={12}
                          color="#9CA3AF"
                        />
                        <Text className="text-[11px] text-gray-500 ml-1">
                          {trip.destination}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="items-end">
                    <Text className="text-[11px] text-gray-400">
                      Gastado
                    </Text>
                    <Text className="text-[15px] font-semibold text-gray-900">
                      {formatEuro(trip.cost || 0)}
                    </Text>
                  </View>
                </View>

                {/* FOOTER CARD */}
                <View className="flex-row justify-between items-center mt-1">
                  <View className="flex-row items-center">
                    <Ionicons
                      name="calendar-outline"
                      size={13}
                      color="#9CA3AF"
                    />
                    <Text className="text-[11px] text-gray-500 ml-1">
                      {formatDateRange(trip.startDate, trip.endDate)}
                    </Text>
                  </View>

                  <View
                    className="px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: statusInfo.bg }}
                  >
                    <Text
                      className="text-[10px] font-semibold"
                      style={{ color: statusInfo.color }}
                    >
                      {statusInfo.label}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* BOTÓN AÑADIR VIAJE (discreto, mismo estilo) */}
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
