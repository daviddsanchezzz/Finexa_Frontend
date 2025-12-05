// src/screens/Trips/components/TripPlanningSection.tsx
import React, { useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../../theme/theme";
import { useNavigation } from "@react-navigation/native";

// 👇 Que coincida con el enum de Prisma + "activity" legacy por si quedan registros antiguos
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
  | "activity"; // legacy

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

  // Ocultar alojamientos y elementos sin fecha válida
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

  // 👉 Ordenar primero por día (date), y dentro del mismo día por startTime
  const sortedItems = useMemo(() => {
    const getDayTs = (iso: string) => {
      const d = new Date(iso);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    };

    const getStartTs = (iso?: string | null) => {
      if (!iso) return Number.MAX_SAFE_INTEGER; // sin hora, al final
      const d = new Date(iso);
      const t = d.getTime();
      return isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
    };

    return [...planningItems].sort((a, b) => {
      const da = getDayTs(a.date!);
      const db = getDayTs(b.date!);
      if (da !== db) return da - db;

      // mismo día → ordenar por hora de inicio
      const sa = getStartTs(a.startTime);
      const sb = getStartTs(b.startTime);
      if (sa !== sb) return sa - sb;

      // fallback por título para estabilidad
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
      // LOGÍSTICA
      case "flight":
        return "airplane-outline";
      case "transport":
        return "bus-outline";
      case "taxi":
        return "car-sport-outline";

      // CULTURA / TURISMO
      case "museum":
        return "color-palette-outline";
      case "monument":
        return "business-outline";
      case "viewpoint":
        return "eye-outline";

      // OCIO / ENTRETENIMIENTO
      case "free_tour":
        return "walk-outline";
      case "concert":
        return "musical-notes-outline";
      case "bar_party":
        return "wine-outline";

      // NATURALEZA
      case "beach":
        return "sunny-outline";

      // GASTRONOMÍA
      case "restaurant":
        return "restaurant-outline";

      // COMPRAS
      case "shopping":
        return "cart-outline";

      // LEGACY / GENÉRICO
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
      {/* TIMELINE */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {sortedItems.length === 0 ? (
          <Text className="text-center text-gray-400 text-sm">
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
                {/* Header del día alineado con la línea */}
                {showHeader && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 20,
                      marginBottom: 8,
                    }}
                  >
                    {/* Columna de la línea (mismo ancho que la de los items) */}
                    <View style={{ width: 32 }} />
                    <Text className="text-[12px] font-semibold text-gray-500">
                      {formatDayHeader(item.date)}
                    </Text>
                  </View>
                )}

                <View className="flex-row">
                  {/* TIMELINE IZQUIERDA */}
                  <View
                    style={{
                      width: 32,
                      alignItems: "center",
                      position: "relative",
                    }}
                  >
                    {/* Línea continua */}
                    <View
                      style={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        width: 1,
                        backgroundColor: "#E5E7EB",
                      }}
                    />
                    {/* Círculo con icono */}
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 50,
                        backgroundColor: "#EEF2FF",
                        alignItems: "center",
                        justifyContent: "center",
                        marginVertical: 4,
                      }}
                    >
                      <Ionicons
                        name={getIconName(item)}
                        size={14}
                        color={colors.primary}
                      />
                    </View>
                  </View>

                  {/* TARJETA */}
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() =>
                      navigation.navigate("TripPlanForm", {
                        tripId,
                        planItem: item, // modo edición
                      })
                    }
                    style={{ flex: 1, marginRight: 8 }}
                  >
                    <View
                      className="rounded-3xl mb-3"
                      style={{
                        backgroundColor: "white",
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        shadowColor: "#000",
                        shadowOpacity: 0.04,
                        shadowRadius: 4,
                        shadowOffset: { width: 0, height: 2 },
                      }}
                    >
                      <Text className="text-[14px] font-semibold text-gray-900">
                        {item.title}
                      </Text>

                      {/* Lugar + Hora en una sola línea */}
                      {(item.location || start || end) && (
                        <View className="flex-row items-center mt-1 flex-wrap">
                          {item.location && (
                            <>
                              <Ionicons
                                name="location-outline"
                                size={12}
                                color="#9CA3AF"
                              />
                              <Text className="text-[11px] text-gray-500 ml-1">
                                {item.location}
                              </Text>
                            </>
                          )}

                          {item.location && (start || end) && (
                            <Text className="text-[11px] text-gray-400 mx-1">
                              •
                            </Text>
                          )}

                          {(start || end) && (
                            <>
                              <Ionicons
                                name="time-outline"
                                size={12}
                                color="#9CA3AF"
                              />
                              <Text className="text-[11px] text-gray-500 ml-1">
                                {start}
                                {start && end ? " - " : ""}
                                {end}
                              </Text>
                            </>
                          )}
                        </View>
                      )}

                      {item.notes && (
                        <Text className="text-[11px] text-gray-500 mt-1">
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

        {/* BOTÓN CREAR (estilo discreto igual que “Añadir viaje”) */}
        <View className="mt-8">
          <TouchableOpacity
            onPress={handleCreate}
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
              Añadir al planning
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
