// src/screens/Trips/components/TripLogisticsSection.tsx
import React, { useMemo } from "react";
import { View, Text, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../../theme/theme";

type TripPlanItemType = "flight" | "accommodation" | "activity" | "transport" | "other";

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

export default function TripLogisticsSection({ planItems }: Props) {
  const logisticsItems = useMemo(
    () =>
      planItems.filter((i) =>
        ["flight", "accommodation", "transport"].includes(i.type)
      ),
    [planItems]
  );

  const formatDate = (iso?: string | null) => {
    if (!iso) return "Sin fecha";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Sin fecha";
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getIcon = (type: TripPlanItemType) => {
    switch (type) {
      case "flight":
        return "airplane-outline";
      case "accommodation":
        return "bed-outline";
      case "transport":
        return "bus-outline";
      default:
        return "cube-outline";
    }
  };

  return (
    <View className="flex-1">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {logisticsItems.length === 0 ? (
          <Text className="text-center text-gray-400 mt-8 text-sm">
            No hay logística registrada aún (vuelos, alojamiento, etc.).
          </Text>
        ) : (
          logisticsItems.map((item) => (
            <View
              key={item.id}
              className="rounded-3xl mb-2 px-4 py-3"
              style={{ backgroundColor: "white" }}
            >
              <View className="flex-row items-center mb-1.5">
                <View
                  className="w-8 h-8 rounded-2xl items-center justify-center mr-2"
                  style={{ backgroundColor: "#EEF2FF" }}
                >
                  <Ionicons
                    name={getIcon(item.type) as any}
                    size={16}
                    color={colors.primary}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] font-semibold text-gray-900">
                    {item.title}
                  </Text>
                  {item.location && (
                    <View className="flex-row items-center mt-0.5">
                      <Ionicons
                        name="location-outline"
                        size={12}
                        color="#9CA3AF"
                      />
                      <Text className="text-[11px] text-gray-500 ml-1">
                        {item.location}
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-[11px] text-gray-500">
                  {formatDate(item.date || null)}
                </Text>
              </View>

              {item.notes ? (
                <Text className="text-[11px] text-gray-500 mt-1">
                  {item.notes}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
