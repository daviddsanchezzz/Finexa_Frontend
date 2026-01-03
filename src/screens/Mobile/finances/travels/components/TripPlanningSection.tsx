// src/screens/Trips/components/TripPlanningSection.tsx
import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../../../theme/theme";
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

export interface TripPlanItem {
  id: number;
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

interface TripPlanningSectionProps {
  tripId: number;
  planItems: TripPlanItem[];
  onRefresh: () => void;
}

const TYPE_LABEL: Record<TripPlanItemType, string> = {
  flight: "Vuelo",
  accommodation: "Alojamiento",
  transport: "Transporte",
  taxi: "Taxi",
  museum: "Museo",
  monument: "Monumento",
  viewpoint: "Mirador",
  free_tour: "Free tour",
  concert: "Concierto",
  bar_party: "Fiesta",
  beach: "Playa",
  restaurant: "Restaurante",
  shopping: "Compras",
  other: "Actividad",
  activity: "Actividad",
};

const getIconName = (item: TripPlanItem) => {
  switch (item.type) {
    case "flight":
      return "airplane-outline";
    case "transport":
      return "bus-outline";
    case "taxi":
      return "car-sport-outline";

    case "museum":
      return "color-palette-outline";
    case "monument":
      return "business-outline";
    case "viewpoint":
      return "eye-outline";

    case "free_tour":
      return "walk-outline";
    case "concert":
      return "musical-notes-outline";
    case "bar_party":
      return "wine-outline";

    case "beach":
      return "sunny-outline";

    case "restaurant":
      return "restaurant-outline";

    case "shopping":
      return "cart-outline";

    case "activity":
    case "other":
    default:
      return "sparkles-outline";
  }
};

const formatTime = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDayHeader = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const raw = d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const formatDayChip = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    weekday: "short",
  });
};

const getDayKey = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatEuro = (n?: number | null) => {
  if (n == null) return null;
  return n.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

export default function TripPlanningSection({
  tripId,
  planItems,
}: TripPlanningSectionProps) {
  const navigation = useNavigation<any>();

  // Filtrar: sin alojamientos + con fecha válida
  const planningItems = useMemo(
    () =>
      planItems.filter((i) => {
        if (i.type === "accommodation") return false;
        if (!i.date) return false;
        const d = new Date(i.date);
        return !isNaN(d.getTime());
      }),
    [planItems]
  );

  // Rango de días del viaje según el planning (min fecha -> max fecha)
  const days = useMemo(() => {
    if (!planningItems.length) return [] as { key: string; iso: string }[];

    let min = new Date(planningItems[0].date!);
    let max = new Date(planningItems[0].date!);

    planningItems.forEach((item) => {
      if (!item.date) return;
      const d = new Date(item.date);
      if (isNaN(d.getTime())) return;
      if (d < min) min = d;
      if (d > max) max = d;
    });

    // Normalizar a medianoche
    const start = new Date(min.getFullYear(), min.getMonth(), min.getDate());
    const end = new Date(max.getFullYear(), max.getMonth(), max.getDate());

    const result: { key: string; iso: string }[] = [];
    let cursor = new Date(start);

    while (cursor <= end) {
      const year = cursor.getFullYear();
      const month = `${cursor.getMonth() + 1}`.padStart(2, "0");
      const day = `${cursor.getDate()}`.padStart(2, "0");
      const key = `${year}-${month}-${day}`;
      // ISO “seguro” para formato
      const iso = new Date(year, cursor.getMonth(), cursor.getDate()).toISOString();
      result.push({ key, iso });

      cursor.setDate(cursor.getDate() + 1);
    }

    return result;
  }, [planningItems]);

  // Día seleccionado
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(() =>
    days.length ? days[0].key : null
  );

  // Si cambian los días y el seleccionado ya no existe, reajustamos
  React.useEffect(() => {
    if (!days.length) {
      setSelectedDayKey(null);
      return;
    }
    if (!selectedDayKey || !days.some((d) => d.key === selectedDayKey)) {
      setSelectedDayKey(days[0].key);
    }
  }, [days, selectedDayKey]);

  // Items ordenados por día y hora
  const sortedItems = useMemo(() => {
    const getDayTs = (iso: string) => {
      const d = new Date(iso);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    };

    const getStartTs = (iso?: string | null) => {
      if (!iso) return Number.MAX_SAFE_INTEGER;
      const d = new Date(iso);
      const t = d.getTime();
      return isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
    };

    return [...planningItems].sort((a, b) => {
      const da = getDayTs(a.date!);
      const db = getDayTs(b.date!);
      if (da !== db) return da - db;

      const sa = getStartTs(a.startTime);
      const sb = getStartTs(b.startTime);
      if (sa !== sb) return sa - sb;

      return a.title.localeCompare(b.title);
    });
  }, [planningItems]);

  // Items del día seleccionado
  const itemsForSelectedDay = useMemo(() => {
    if (!selectedDayKey) return [];
    return sortedItems.filter((item) => getDayKey(item.date) === selectedDayKey);
  }, [sortedItems, selectedDayKey]);

  const handleCreate = () => {
    navigation.navigate("TripPlanForm", { tripId });
  };

  // Sin planning
  if (!planningItems.length) {
    return (
      <View className="flex-1">
        <ScrollView
          contentContainerStyle={{
            paddingBottom: 24,
            paddingHorizontal: 16,
            paddingTop: 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View className="mt-12 items-center px-6">
            <Text className="text-center text-gray-400 text-sm mb-3">
              Aún no tienes nada en el planning de este viaje.
            </Text>
            <TouchableOpacity
              onPress={handleCreate}
              className="flex-row items-center justify-center py-2.5 px-4 rounded-2xl"
              style={{
                backgroundColor: "#EEF2FF",
                borderWidth: 1,
                borderColor: "#E0E7FF",
              }}
              activeOpacity={0.9}
            >
              <Ionicons name="add-outline" size={18} color={colors.primary} />
              <Text className="text-sm text-indigo-700 font-medium ml-1.5">
                Añadir primer plan
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* SELECTOR DE DÍAS */}
      <View style={{ paddingHorizontal: 12, paddingTop: 4, marginBottom: 6 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 6 }}
        >
          {days.map((day) => {
            const isActive = day.key === selectedDayKey;
            return (
              <TouchableOpacity
                key={day.key}
                onPress={() => setSelectedDayKey(day.key)}
                activeOpacity={0.85}
                style={{
                  marginRight: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: isActive ? colors.primary : "#F3F4F6",
                  borderWidth: isActive ? 0 : 1,
                  borderColor: "#E5E7EB",
                  minWidth: 80,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: isActive ? "white" : "#6B7280",
                  }}
                  numberOfLines={1}
                >
                  {formatDayChip(day.iso)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: 24,
          paddingHorizontal: 12,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Encabezado del día seleccionado */}
        {selectedDayKey && (
          <View style={{ marginTop: 4, marginBottom: 10 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#6B7280",
                marginLeft: 4,
              }}
            >
              {formatDayHeader(
                days.find((d) => d.key === selectedDayKey)?.iso ?? ""
              )}
            </Text>
          </View>
        )}

        {itemsForSelectedDay.length === 0 ? (
          <View style={{ marginTop: 32, alignItems: "center" }}>
            <Text className="text-[12px] text-gray-400 mb-2 text-center">
              No tienes actividades planificadas para este día.
            </Text>
            <TouchableOpacity
              onPress={handleCreate}
              className="flex-row items-center justify-center py-2 px-4 rounded-2xl"
              style={{
                backgroundColor: "#F3F4F6",
                borderWidth: 1,
                borderColor: "#E5E7EB",
              }}
              activeOpacity={0.9}
            >
              <Ionicons name="add-outline" size={16} color="#64748B" />
              <Text className="text-xs text-slate-600 font-medium ml-1.5">
                Añadir al planning
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          itemsForSelectedDay.map((item, index) => {
            const start = formatTime(item.startTime);
            const end = formatTime(item.endTime);
            const costLabel = formatEuro(item.cost);
            const typeLabel = TYPE_LABEL[item.type] || "Actividad";

            return (
              <View key={item.id} className="flex-row">
                {/* Columna timeline */}
                <View
                  style={{
                    width: 28,
                    alignItems: "center",
                    position: "relative",
                  }}
                >
                  {/* Línea */}
                  <View
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      width: 1,
                      backgroundColor: "#E5E7EB",
                    }}
                  />
                  {/* Nodo */}
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      backgroundColor: "#EEF2FF",
                      borderWidth: 1,
                      borderColor: "#C7D2FE",
                      alignItems: "center",
                      justifyContent: "center",
                      marginVertical: 6,
                      shadowColor: "#000",
                      shadowOpacity: 0.04,
                      shadowRadius: 2,
                      shadowOffset: { width: 0, height: 1 },
                    }}
                  >
                    <Ionicons
                      name={getIconName(item)}
                      size={14}
                      color={colors.primary}
                    />
                  </View>
                </View>

                {/* Tarjeta */}
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() =>
                    navigation.navigate("TripPlanForm", {
                      tripId,
                      planItem: item,
                    })
                  }
                  style={{ flex: 1, marginRight: 4 }}
                >
                  <View
                    style={{
                      borderRadius: 18,
                      marginBottom: 10,
                      paddingVertical: 9,
                      paddingHorizontal: 12,
                      backgroundColor: "white",
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      shadowColor: "#000",
                      shadowOpacity: 0.03,
                      shadowRadius: 3,
                      shadowOffset: { width: 0, height: 1 },
                    }}
                  >
                    {/* Título + hora / coste */}
                    <View className="flex-row justify-between items-center mb-1.5">
                      <Text
                        className="text-[13px] font-semibold text-gray-900 flex-1"
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>

                      <View className="items-end ml-2">
                        {(start || end) && (
                          <Text className="text-[11px] text-slate-500">
                            {start}
                            {start && end ? " – " : ""}
                            {end}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Ubicación */}
                    {item.location && (
                      <View className="flex-row items-center mt-0.5 flex-wrap">
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

                    {/* Notas */}
                    {item.notes && (
                      <Text
                        className="text-[11px] text-gray-400 mt-1"
                        numberOfLines={2}
                      >
                        {item.notes}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* Botón añadir */}
        <View className="mt-8 mb-2">
          <TouchableOpacity
            onPress={handleCreate}
            className="flex-row items-center justify-center py-2.5 rounded-2xl"
            style={{
              backgroundColor: "#F3F4F6",
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
            activeOpacity={0.9}
          >
            <Ionicons name="add-outline" size={18} color="#64748B" />
            <Text className="text-sm text-slate-500 font-medium ml-1.5">
              Añadir al planning
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
