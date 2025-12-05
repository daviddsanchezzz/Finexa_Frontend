// src/screens/Trips/TripDetailScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../theme/theme";
import api from "../../../api/api";

// Secciones
import TripPlanningSection from "./components/TripPlanningSection";
import TripLogisticsSection from "./components/TripLogisticaSection";
import TripExpensesSection from "./components/TripExpensesSection";

type TripStatus = "upcoming" | "ongoing" | "past";

// 👇 Alineado con el enum de Prisma + "activity" legacy
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
  category?: {
    id: number;
    name: string;
    emoji?: string;
    color?: string;
  };
  subcategory?: {
    id: number;
    name: string;
    emoji?: string;
    color?: string;
  };
  wallet?: {
    id: number;
    name: string;
    emoji?: string;
  };
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

type TripTab = "expenses" | "planning" | "info";

const getTripStatus = (trip: { startDate: string; endDate: string }): TripStatus => {
  const today = new Date();
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);

  if (end < today) return "past";
  if (start > today) return "upcoming";
  return "ongoing";
};

const getStatusStyle = (status: TripStatus) => {
  switch (status) {
    case "upcoming":
      return { label: "Próximo", color: "#BBF7D0", bg: "rgba(22,163,74,0.25)" };
    case "ongoing":
      return { label: "En curso", color: "#FED7AA", bg: "rgba(249,115,22,0.25)" };
    case "past":
    default:
      return { label: "Pasado", color: "#E5E7EB", bg: "rgba(107,114,128,0.35)" };
  }
};

const formatDateRange = (start: string, end: string) => {
  const s = new Date(start);
  const e = new Date(end);

  if (isNaN(s.getTime()) || isNaN(e.getTime())) return "-";

  const sameYear = s.getFullYear() === e.getFullYear();

  const baseOpts: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
  };

  const startStr = s.toLocaleDateString("es-ES", baseOpts);
  const endStr = e.toLocaleDateString("es-ES", {
    ...baseOpts,
    year: sameYear ? undefined : "numeric",
  });

  return `${startStr} - ${endStr}`;
};

export default function TripDetailScreen({ route, navigation }: any) {
  const { tripId } = route.params || {};

  const [trip, setTrip] = useState<TripFromApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TripTab>("expenses");

    const formatEuro = (n: number) =>
    n.toLocaleString("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });


  const fetchTrip = async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      const res = await api.get(`/trips/${tripId}`);
      setTrip(res.data);
    } catch (err) {
      console.error("❌ Error al obtener viaje:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrip();
  }, [tripId]);

  // =========================
  // DERIVADOS
  // =========================

  const status: TripStatus = useMemo(() => {
    if (!trip) return "upcoming";
    return getTripStatus(trip);
  }, [trip]);

  const statusStyle = useMemo(() => getStatusStyle(status), [status]);

  const totalSpent = useMemo(() => {
    if (!trip || !trip.transactions || trip.transactions.length === 0) return 0;
    return trip.transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  }, [trip]);

  const days = useMemo(() => {
    if (!trip) return 0;
    const s = new Date(trip.startDate);
    const e = new Date(trip.endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
    const diffMs = e.getTime() - s.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 0;
  }, [trip]);

  const companionsLabel = useMemo(() => {
    if (!trip || !trip.companions || trip.companions.length === 0) {
      return "Sin compañeros añadidos";
    }
    return trip.companions.join(", ");
  }, [trip]);

  const planItems: TripPlanItem[] = trip?.planItems || [];

  // =========================
  // LOADERS / ERRORES
  // =========================

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="px-5 pt-3 pb-2 flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ paddingRight: 12, paddingVertical: 4 }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">
            Detalle de viaje
          </Text>
        </View>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="px-5 pt-3 pb-2 flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ paddingRight: 12, paddingVertical: 4 }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">
            Detalle de viaje
          </Text>
        </View>

        <View className="flex-1 justify-center items-center px-5">
          <Text className="text-gray-400 text-center">
            No se ha encontrado la información del viaje.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // =========================
  // RENDER PRINCIPAL
  // =========================

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* HEADER */}
      <View className="px-5 pt-3 pb-2 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ paddingRight: 10, paddingVertical: 4 }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>

          <Text className="text-lg font-semibold text-gray-900">
            Detalle de viaje
          </Text>
        </View>

        <TouchableOpacity
          onPress={() =>
            navigation.navigate("TripForm", {
              editTrip: trip,
            })
          }
          style={{ paddingHorizontal: 8, paddingVertical: 4 }}
        >
          <Text
            className="text-[14px] font-semibold"
            style={{ color: colors.primary }}
          >
            Editar
          </Text>
        </TouchableOpacity>
      </View>

      {/* CONTENIDO PRINCIPAL (sin ScrollView, el scroll va dentro de cada sección) */}
      <View className="flex-1 px-5">
        {/* HERO CARD */}
        <View
          style={{
            borderRadius: 24,
            padding: 18,
            marginBottom: 16,
            backgroundColor: colors.primary,
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 4,
          }}
        >
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-row items-center flex-1 pr-3">
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255,255,255,0.16)",
                }}
              >
                <Text style={{ fontSize: 26 }}>{trip.emoji || "✈️"}</Text>
              </View>

              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.75)",
                  }}
                  numberOfLines={1}
                >
                  {trip.destination || "Sin destino especificado"}
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "white",
                    marginTop: 2,
                  }}
                  numberOfLines={2}
                >
                  {trip.name}
                </Text>
              </View>
            </View>

            <View className="items-end">
              <View
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  backgroundColor: statusStyle.bg,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: statusStyle.color,
                  }}
                >
                  {statusStyle.label}
                </Text>
              </View>
            </View>
          </View>

          {/* FECHAS + GASTO */}
          <View style={{ marginBottom: 10 }}>
            <Text
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.75)",
                marginBottom: 3,
              }}
            >
              Fechas del viaje
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "white",
              }}
            >
              {formatDateRange(trip.startDate, trip.endDate)}{" "}
              {days > 0 && (
                <Text
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.8)",
                    fontWeight: "400",
                  }}
                >
                  · {days} día{days === 1 ? "" : "s"}
                </Text>
              )}
            </Text>
          </View>

          {/* GASTO / COMPIS */}
          <View style={{ marginTop: 4 }}>
            <View className="flex-row justify-between mb-2">
              <View>
                <Text
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  Total gastado 
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "white",
                    marginTop: 2,
                  }}
                >
                  {formatEuro(trip.cost || 0)}
                </Text>
              </View>

              {trip.companions && trip.companions.length > 0 && (
                <View style={{ alignItems: "flex-end", maxWidth: 140 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.8)",
                    }}
                  >
                    Compañeros
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "white",
                      marginTop: 2,
                    }}
                    numberOfLines={2}
                  >
                    {companionsLabel}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* SELECTOR TABS */}
        <View className="mb-3">
          <View className="flex-row rounded-2xl bg-slate-50 p-1">
            {[
              { key: "expenses" as TripTab, label: "Gastos" },
              { key: "planning" as TripTab, label: "Planning" },
              { key: "info" as TripTab, label: "Logística" },
            ].map((opt) => {
              const active = tab === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setTab(opt.key)}
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

        {/* CONTENIDO POR TAB (cada sección tiene su propio ScrollView interno) */}
        <View style={{ flex: 1 }}>
          {tab === "expenses" && (
            <TripExpensesSection
              tripId={trip.id}
              planItems={planItems}
              budget={null}
            />
          )}

          {tab === "planning" && (
            <TripPlanningSection
              tripId={trip.id}
              planItems={planItems}
              onRefresh={fetchTrip}
            />
          )}

          {tab === "info" && (
            <TripLogisticsSection
              tripId={trip.id}
              planItems={planItems}
              onRefresh={fetchTrip}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
