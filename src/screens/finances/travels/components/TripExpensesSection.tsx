// src/screens/Trips/components/TripExpensesSection.tsx
import React, { useMemo } from "react";
import { View, Text, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../../theme/theme";

// 👇 mismo tipo que usas en TripPlanningSection
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
  location?: string | null;
  cost?: number | null;
}

interface Props {
  tripId: number;
  planItems: TripPlanItem[];
  budget: number | null;
}

export default function TripExpensesSection({ planItems, budget }: Props) {
  // Solo items con cost definido
  const itemsWithCost = useMemo(
    () =>
      planItems.filter(
        (i) => typeof i.cost === "number" && !isNaN(i.cost as number)
      ),
    [planItems]
  );

    const formatEuro = (n: number) =>
    n.toLocaleString("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });


  const total = useMemo(
    () =>
      itemsWithCost.reduce((sum, item) => sum + (item.cost || 0), 0),
    [itemsWithCost]
  );

  const getIconName = (type: TripPlanItemType) => {
    switch (type) {
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

      // GENÉRICO / LEGACY
      case "activity":
      case "other":
      default:
        return "sparkles-outline";
    }
  };

  const formatDate = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    });
  };

  return (
    <View className="flex-1">
      {/* Tarjeta resumen */}
      <View
        className="rounded-3xl p-4 mb-3"
        style={{ backgroundColor: "white" }}
      >
        <Text className="text-[12px] text-gray-500 mb-1">
          Resumen de gastos
        </Text>
        <View className="flex-row justify-between items-end">
          <View>
            <Text className="text-[11px] text-gray-400">Gastado</Text>
            <Text className="text-[20px] font-semibold text-gray-900">
              {formatEuro(total)}
            </Text>
          </View>

          {typeof budget === "number" && (
            <View style={{ alignItems: "flex-end" }}>
              <Text className="text-[11px] text-gray-400">Presupuesto</Text>
              <Text className="text-[14px] font-semibold text-gray-900">
                {budget.toFixed(0)} €
              </Text>
              <Text className="text-[11px] text-gray-500 mt-1">
                Quedan {formatEuro(budget - total)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Lista de planes con coste */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {itemsWithCost.length === 0 ? (
          <Text className="text-center text-gray-400 mt-8 text-sm">
            Aún no hay costes asignados en el planning de este viaje.
          </Text>
        ) : (
          itemsWithCost.map((item) => (
            <View
              key={item.id}
              className="rounded-3xl mb-2 px-4 py-3 flex-row items-center"
              style={{ backgroundColor: "white" }}
            >
              {/* Icono según tipo */}
              <View
                className="w-9 h-9 rounded-2xl items-center justify-center mr-3"
                style={{ backgroundColor: "#F3F4F6" }}
              >
                <Ionicons
                  name={getIconName(item.type)}
                  size={18}
                  color={colors.primary}
                />
              </View>

              {/* Info */}
              <View className="flex-1">
                <Text className="text-[13px] font-semibold text-gray-900">
                  {item.title}
                </Text>
                <View className="flex-row items-center mt-0.5">
                  {item.location ? (
                    <>
                      <Ionicons
                        name="location-outline"
                        size={11}
                        color="#9CA3AF"
                      />
                      <Text className="text-[11px] text-gray-500 ml-1">
                        {item.location}
                      </Text>
                    </>
                  ) : null}

                  {item.location && item.date && (
                    <Text className="text-[11px] text-gray-400 mx-1">·</Text>
                  )}

                  {item.date ? (
                    <Text className="text-[11px] text-gray-400">
                      {formatDate(item.date)}
                    </Text>
                  ) : null}
                </View>
              </View>

              {/* Coste */}
              <Text className="text-[14px] font-semibold text-gray-900">
                {formatEuro(item.cost || 0)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
