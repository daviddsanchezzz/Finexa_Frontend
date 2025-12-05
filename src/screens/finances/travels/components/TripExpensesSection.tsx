// src/screens/Trips/components/TripExpensesSection.tsx
import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../../theme/theme";

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
  location?: string | null;
  cost?: number | null;
  startTime?: string | null;
}

interface Props {
  tripId: number;
  planItems: TripPlanItem[];
  budget: number | null;
}

// ==== GRUPOS ==== //
type GroupId =
  | "flights"
  | "accommodation"
  | "transport"
  | "activities"
  | "food"
  | "shopping";

interface GroupDef {
  id: GroupId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  types: TripPlanItemType[];
}

const GROUPS: GroupDef[] = [
  { id: "flights", label: "Vuelos", icon: "airplane-outline", color: "#DBEAFE", types: ["flight"] },
  { id: "accommodation", label: "Alojamiento", icon: "bed-outline", color: "#FEF3C7", types: ["accommodation"] },
  { id: "transport", label: "Transporte", icon: "bus-outline", color: "#ECFDF3", types: ["transport", "taxi"] },
  {
    id: "activities",
    label: "Actividades y visitas",
    icon: "sparkles-outline",
    color: "#F3E8FF",
    types: ["museum", "monument", "viewpoint", "free_tour", "concert", "bar_party", "beach", "activity"],
  },
  { id: "food", label: "Comida y bebida", icon: "restaurant-outline", color: "#FFF7ED", types: ["restaurant"] },
  { id: "shopping", label: "Compras y otros", icon: "cart-outline", color: "#F9FAFB", types: ["shopping", "other"] },
];

const TYPE_ICON: Record<TripPlanItemType, keyof typeof Ionicons.glyphMap> = {
  flight: "airplane-outline",
  accommodation: "bed-outline",
  transport: "bus-outline",
  taxi: "car-outline",
  museum: "library-outline",
  monument: "business-outline",
  viewpoint: "eye-outline",
  free_tour: "walk-outline",
  concert: "musical-notes-outline",
  bar_party: "wine-outline",
  beach: "sunny-outline",
  restaurant: "restaurant-outline",
  shopping: "cart-outline",
  other: "options-outline",
  activity: "sparkles-outline",
};

export default function TripExpensesSection({ planItems }: Props) {
  const itemsWithCost = useMemo(
    () => planItems.filter((i) => typeof i.cost === "number" && !isNaN(i.cost as number)),
    [planItems]
  );

  const formatEuro = (n: number) =>
    n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

  const formatDate = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    return !isNaN(d.getTime()) ? d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) : "";
  };

  const formatTime = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    return !isNaN(d.getTime()) ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  };

  const getGroupForType = (type: TripPlanItemType): GroupId =>
    GROUPS.find((g) => g.types.includes(type))?.id ?? "shopping";

  const total = useMemo(
    () => itemsWithCost.reduce((sum, item) => sum + (item.cost || 0), 0),
    [itemsWithCost]
  );

  const grouped = useMemo(() => {
    const map: Record<GroupId, { total: number; items: TripPlanItem[] }> = {
      flights: { total: 0, items: [] },
      accommodation: { total: 0, items: [] },
      transport: { total: 0, items: [] },
      activities: { total: 0, items: [] },
      food: { total: 0, items: [] },
      shopping: { total: 0, items: [] },
    };

    for (const item of itemsWithCost) {
      const gId = getGroupForType(item.type);
      map[gId].items.push(item);
      map[gId].total += item.cost || 0;
    }

    // ordenar items por fecha
    (Object.keys(map) as GroupId[]).forEach((gId) =>
      map[gId].items.sort((a, b) => (new Date(a.date || "").getTime() || 0) - (new Date(b.date || "").getTime() || 0))
    );

    return map;
  }, [itemsWithCost]);

  const nonEmptyGroups = useMemo(
    () => GROUPS.map((g) => ({ ...g, total: grouped[g.id].total, items: grouped[g.id].items })).filter((g) => g.items.length > 0),
    [grouped]
  );

  const [activeGroupId, setActiveGroupId] = useState<GroupId | null>(null);
  const activeGroup =
    nonEmptyGroups.find((g) => g.id === (activeGroupId ?? nonEmptyGroups[0]?.id)) ?? nonEmptyGroups[0];

  return (
    <View className="flex-1">
      {/* Si no hay costes */}
      {itemsWithCost.length === 0 ? (
        <Text className="text-center text-gray-400 mt-8 text-sm">
          Aún no hay costes asignados en el planning de este viaje.
        </Text>
      ) : (
        <>
          {/* Título */}
          <View className="px-1 mb-1">
            <Text className="text-[13px] text-gray-500">Distribución por categorías</Text>
          </View>

          {/* 🔥 CARRUSEL DE CATEGORÍAS (altura fija + sin hueco extra) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ height: 110 }} // ← altura fija
            className="mb-1" // ← poco espacio debajo
            contentContainerStyle={{
              paddingHorizontal: 2,
              paddingVertical: 4,
              alignItems: "center",
            }}
          >
            {nonEmptyGroups
              .sort((a, b) => b.total - a.total)
              .map((group) => {
                const isActive = activeGroup?.id === group.id;
                const percentage = total > 0 ? (group.total / total) * 100 : 0;

                return (
                  <TouchableOpacity
                    key={group.id}
                    onPress={() => setActiveGroupId(group.id)}
                    activeOpacity={0.8}
                    className="mr-2"
                    style={{
                      height: "100%", // ← todas las cards mismo alto
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 18,
                      minWidth: 130,
                      backgroundColor: isActive ? "white" : group.color,
                      borderWidth: 1,
                      borderColor: isActive ? colors.primary : "transparent",
                      justifyContent: "space-between",
                    }}
                  >
                    <View className="flex-row items-center">
                      <View
                        className="w-7 h-7 rounded-2xl items-center justify-center mr-2"
                        style={{ backgroundColor: group.color }}
                      >
                        <Ionicons name={group.icon} size={16} color={colors.primary} />
                      </View>
                      <Text className="text-[12px] font-semibold" numberOfLines={1}>
                        {group.label}
                      </Text>
                    </View>

                    <View>
                      <Text className="text-[11px] text-gray-500">
                        {group.items.length} gasto{group.items.length > 1 ? "s" : ""}
                      </Text>
                      <Text className="text-[13px] font-semibold text-gray-900">{formatEuro(group.total)}</Text>
                      <Text className="text-[10px] text-gray-500 mt-0.5">
                        {percentage.toFixed(0)}% del viaje
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
          </ScrollView>

          {/* 🔥 LISTA DE PLANS (timeline) */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {activeGroup && (
              <View className="rounded-3xl p-3" style={{ backgroundColor: "white" }}>
                {activeGroup.items.map((item, index) => {
                  const dateLabel = formatDate(item.date);
                  const timeLabel = formatTime(item.startTime);
                  const iconName = TYPE_ICON[item.type];

                  return (
                    <View key={item.id} className="flex-row mb-3">
                      {/* Timeline left */}
                      <View className="items-center mr-3">
                        <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: "#F3F4F6" }}>
                          <Ionicons name={iconName} size={16} color={colors.primary} />
                        </View>
                        {index < activeGroup.items.length - 1 && (
                          <View style={{ width: 1, flex: 1, backgroundColor: "#E5E7EB", marginTop: 2 }} />
                        )}
                      </View>

                      {/* Card */}
                      <View className="flex-1 rounded-2xl px-3 py-2.5" style={{ backgroundColor: "#F9FAFB" }}>
                        <View className="flex-row justify-between items-center mb-1">
                          <Text className="text-[13px] font-semibold text-gray-900 flex-1">{item.title}</Text>
                          <Text className="text-[13px] font-semibold text-gray-900">{formatEuro(item.cost || 0)}</Text>
                        </View>

                        <View className="flex-row flex-wrap items-center">
                          {dateLabel && (
                            <View className="flex-row items-center mr-2 mb-1">
                              <Ionicons name="calendar-outline" size={11} color="#9CA3AF" />
                              <Text className="text-[11px] text-gray-500 ml-1">
                                {dateLabel}
                                {timeLabel ? ` · ${timeLabel}` : ""}
                              </Text>
                            </View>
                          )}

                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
}
