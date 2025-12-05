// src/screens/Trips/components/TripPlanningSection.tsx
import React, { useMemo } from "react";
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

  const formatTime = (iso?: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDayHeader = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const raw = d.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };

  const isSameDay = (a?: string | null, b?: string | null) => {
    if (!a || !b) return false;
    const da = new Date(a);
    const db = new Date(b);
    return (
      da.getFullYear() === db.getFullYear() &&
      da.getMonth() === db.getMonth() &&
      da.getDate() === db.getDate()
    );
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

  const handleCreate = () => {
    navigation.navigate("TripPlanForm", { tripId });
  };

  return (
    <View className="flex-1">
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 24,
          paddingHorizontal: 12,
          paddingTop: 4,
        }}
        showsVerticalScrollIndicator={false}
      >
        {sortedItems.length === 0 ? (
          <Text className="text-center text-gray-400 text-sm mt-16">
            Aún no tienes nada en el planning de este viaje.
          </Text>
        ) : (
          sortedItems.map((item, index) => {
            const prev = sortedItems[index - 1];
            const showHeader =
              index === 0 || !isSameDay(prev?.date, item.date);

            const start = formatTime(item.startTime);
            const end = formatTime(item.endTime);

            return (
              <View key={item.id}>
                {/* Encabezado de día muy sencillo */}
                {showHeader && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: index === 0 ? 8 : 18,
                      marginBottom: 6,
                    }}
                  >
<View
  style={{
    flexDirection: "row",
    alignItems: "center",
    marginTop: index === 0 ? 10 : 20,
    marginBottom: 4,
  }}
>
  <View style={{ width: 28 }} />
  <Text style={{ fontSize: 15, fontWeight: "700", color: "#334155" }}>
    {formatDayHeader(item.date)}
  </Text>
</View>
                  </View>
                )}

                <View className="flex-row">
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
    backgroundColor: "#E0E7FF",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 3,
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

                  {/* Tarjeta súper simple y compacta */}
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
                        marginBottom: 8,
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        backgroundColor: "#F9FAFB",
                        borderWidth: 1,
                        borderColor: "#ECEFF3",
                      }}
                    >
                      {/* Título + hora a la derecha */}
                      <View className="flex-row justify-between items-center mb-1">
                        <Text
                          className="text-[13px] font-semibold text-gray-900 flex-1"
                          numberOfLines={2}
                        >
                          {item.title}
                        </Text>
                        {(start || end) && (
                          <Text className="text-[11px] text-slate-500 ml-2">
                            {start}
                            {start && end ? " – " : ""}
                            {end}
                          </Text>
                        )}
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

                      {/* Notas (si existen), discretas y truncadas */}
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
              </View>
            );
          })
        )}

        {/* Botón añadir muy limpio y poco intrusivo */}
        <View className="mt-10 mb-2">
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
