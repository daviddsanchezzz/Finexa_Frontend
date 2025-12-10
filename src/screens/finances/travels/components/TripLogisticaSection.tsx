// src/screens/Trips/components/TripLogisticsSection.tsx
import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../../theme/theme";
import { useNavigation } from "@react-navigation/native";

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

interface TripPlanItem {
  id: number;
  type: TripPlanItemType;
  title: string;
  date?: string | null;
  location?: string | null;
  notes?: string | null;
}

interface Props {
  tripId: number;
  planItems: TripPlanItem[];
  onRefresh: () => void;
}

type LogisticsFilter = "flight" | "accommodation";

const ICONS: Record<"flight" | "accommodation", keyof typeof Ionicons.glyphMap> =
  {
    flight: "airplane-outline",
    accommodation: "bed-outline",
  };

const TYPE_LABEL: Record<"flight" | "accommodation", string> = {
  flight: "Vuelo",
  accommodation: "Alojamiento",
};

const formatDate = (iso?: string | null) => {
  if (!iso) return "Sin fecha";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Sin fecha";
  return d.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
};

const formatShortDate = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
};

const sortByDate = (items: TripPlanItem[]) => {
  return [...items].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
    const db = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
    if (da !== db) return da - db;
    return a.title.localeCompare(b.title);
  });
};

const splitUpcomingPast = (items: TripPlanItem[]) => {
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime();

  const upcoming: TripPlanItem[] = [];
  const past: TripPlanItem[] = [];

  items.forEach((item) => {
    if (!item.date) {
      upcoming.push(item);
      return;
    }
    const t = new Date(item.date).getTime();
    if (isNaN(t) || t >= startOfToday) {
      upcoming.push(item);
    } else {
      past.push(item);
    }
  });

  return {
    upcoming: sortByDate(upcoming),
    past: sortByDate(past),
  };
};

export default function TripLogisticsSection({ tripId, planItems }: Props) {
  const navigation = useNavigation<any>();

  // Solo vuelos y alojamientos
  const logisticsItems = useMemo(
    () => planItems.filter((i) => i.type === "flight" || i.type === "accommodation"),
    [planItems]
  );

  const [filter, setFilter] = useState<LogisticsFilter>("flight");

  const flights = useMemo(
    () => logisticsItems.filter((i) => i.type === "flight"),
    [logisticsItems]
  );
  const accommodations = useMemo(
    () => logisticsItems.filter((i) => i.type === "accommodation"),
    [logisticsItems]
  );

  const filteredItems = useMemo(() => {
    if (filter === "flight") return flights;
    if (filter === "accommodation") return accommodations;
    return logisticsItems;
  }, [filter, flights, accommodations, logisticsItems]);

  const { upcoming, past } = useMemo(
    () => splitUpcomingPast(filteredItems),
    [filteredItems]
  );

  const handleOpenItem = (item: TripPlanItem) => {
    navigation.navigate("TripPlanForm", { tripId, planItem: item });
  };

  const summaryTotal = logisticsItems.length;
  const hasLogistics = summaryTotal > 0;

  const renderItemCard = (item: TripPlanItem) => {
    const type = item.type as "flight" | "accommodation";
    const iconName = ICONS[type];
    const typeLabel = TYPE_LABEL[type];

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.9}
        onPress={() => handleOpenItem(item)}
        className="rounded-3xl mb-2"
        style={{
          backgroundColor: "white",
          paddingVertical: 10,
          paddingHorizontal: 12,
          shadowColor: "#000",
          shadowOpacity: 0.02,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 1 },
          borderWidth: 1,
          borderColor: "#E5E7EB",
        }}
      >
        <View className="flex-row items-center">
          {/* Contenido principal */}
          <View className="flex-1 pr-2">
            <View className="flex-row items-center mb-1">
              <View
                className="w-7 h-7 rounded-2xl items-center justify-center mr-2"
                style={{
                  backgroundColor:
                    type === "flight" ? "#EEF2FF" : "#FEF3C7",
                }}
              >
                <Ionicons
                  name={iconName}
                  size={15}
                  color={colors.primary}
                />
              </View>
              <Text
                className="text-[13px] font-semibold text-gray-900 flex-1"
                numberOfLines={2}
              >
                {item.title}
              </Text>
            </View>
            <View>
              {item.location && (
                <View className="flex-row items-center mb-1">
                  <Ionicons
                    name="location-outline"
                    size={11}
                    color="#9CA3AF"
                  />
                  <Text className="text-[11px] text-gray-500 ml-1">
                    {item.location}
                  </Text>
                </View>
              )}
            </View>

            {item.notes && (
              <Text
                className="text-[11px] text-gray-400 mt-1"
                numberOfLines={2}
              >
                {item.notes}
              </Text>
            )}
          </View>

          {/* Fecha completa a la derecha */}
          <View style={{ alignItems: "flex-end" }}>
            <Text className="text-[11px] text-gray-400 mb-0.5">
              Fecha
            </Text>
            <Text className="text-[11px] font-medium text-gray-700 text-right">
              {formatDate(item.date || null)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 40,
          paddingHorizontal: 12,
          paddingTop: 6,
        }}
      >
        {/* RESUMEN COMPACTO */}
        <View
          className="rounded-2xl mb-3"
          style={{
            backgroundColor: "#F9FAFB",
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: "#E5E7EB",
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: "#4B5563",
              marginBottom: 6,
            }}
          >
            Resumen de logística
          </Text>
          <View className="flex-row">
            <View className="flex-1">
              <Text
                style={{
                  fontSize: 11,
                  color: "#6B7280",
                }}
              >
                Vuelos
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#111827",
                }}
              >
                {flights.length}
              </Text>
            </View>
            <View className="flex-1">
              <Text
                style={{
                  fontSize: 11,
                  color: "#6B7280",
                }}
              >
                Alojamientos
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#111827",
                }}
              >
                {accommodations.length}
              </Text>
            </View>
            <View className="flex-1 items-end">
              <Text
                style={{
                  fontSize: 11,
                  color: "#6B7280",
                }}
              >
                Total
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#111827",
                }}
              >
                {summaryTotal}
              </Text>
            </View>
          </View>
        </View>

        {/* FILTRO VISTA */}
        <View className="flex-row rounded-2xl bg-slate-50 p-1 mb-4">
          {(
            [
              { key: "flight", label: "Vuelos" },
              { key: "accommodation", label: "Alojamientos" },
            ] as { key: LogisticsFilter; label: string }[]
          ).map((opt) => {
            const active = filter === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setFilter(opt.key)}
                style={{
                  flex: 1,
                  paddingVertical: 7,
                  borderRadius: 14,
                  backgroundColor: active ? "white" : "transparent",
                  borderWidth: active ? 1 : 0,
                  borderColor: active ? colors.primary : "transparent",
                  marginHorizontal: 1,
                }}
                activeOpacity={0.9}
              >
                <Text
                  style={{
                    textAlign: "center",
                    fontSize: 11,
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

        {/* CONTENIDO PRINCIPAL */}
        {!hasLogistics ? (
          <View className="mt-12 items-center px-8">
            <Text className="text-center text-gray-400 text-sm mb-2">
              No hay vuelos ni alojamientos registrados todavía.
            </Text>
            <Text className="text-center text-gray-400 text-xs">
              Añádelos desde el planning del viaje para tenerlo todo controlado.
            </Text>
          </View>
        ) : upcoming.length === 0 && past.length === 0 ? (
          <View className="mt-12 items-center px-8">
            <Text className="text-center text-gray-400 text-sm">
              No hay elementos en esta vista.
            </Text>
          </View>
        ) : (
          <>
            {/* Próximos */}
            {upcoming.length > 0 && (
              <View className="mb-4">
                <Text className="text-[12px] font-semibold text-slate-600 mb-1 px-1">
                  Próximos
                </Text>
                {upcoming.map(renderItemCard)}
              </View>
            )}

            {/* Pasados */}
            {past.length > 0 && (
              <View className="mb-2">
                <Text className="text-[12px] font-semibold text-slate-500 mb-1 px-1">
                  Pasados
                </Text>
                {past.map(renderItemCard)}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
