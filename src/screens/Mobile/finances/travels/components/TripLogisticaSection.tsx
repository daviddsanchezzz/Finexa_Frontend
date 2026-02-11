// src/screens/Trips/components/TripLogisticsSection.tsx
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

interface TripPlanItem {
  id: number;
  type: TripPlanItemType;
  title: string;
  location?: string | null;
  notes?: string | null;
  startAt?: string | null;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  cost?: number | null;
  flightDetails?: any;
  accommodationDetails?: any;
  destinationTransport?: any;
}

interface Props {
  tripId: number;
  planItems: TripPlanItem[];
  onRefresh: () => void;
}

type LogisticsFilter = "transport" | "accommodation";

const TRANSPORT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  flight: "airplane-outline",
  transport: "bus-outline",
  taxi: "car-sport-outline",
};

const ICONS: Record<LogisticsFilter, keyof typeof Ionicons.glyphMap> = {
  transport: "airplane-outline",
  accommodation: "bed-outline",
};

const TYPE_LABEL: Record<LogisticsFilter, string> = {
  transport: "Transporte",
  accommodation: "Alojamiento",
};

const formatDate = (iso?: string | null) => {
  if (!iso) return "Sin fecha";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Sin fecha";
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
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

const sortByDate = (items: TripPlanItem[]) => {
  return [...items].sort((a, b) => {
    const da = a.startAt || a.date || a.startTime;
    const db = b.startAt || b.date || b.startTime;
    if (!da) return 1;
    if (!db) return -1;
    const timeA = new Date(da).getTime();
    const timeB = new Date(db).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return a.title.localeCompare(b.title);
  });
};

export default function TripLogisticsSection({ tripId, planItems }: Props) {
  const navigation = useNavigation<any>();

  // Incluir flight, transport, taxi y accommodation
  const logisticsItems = useMemo(
    () => planItems.filter((i) =>
      i.type === "flight" ||
      i.type === "transport" ||
      i.type === "taxi" ||
      i.type === "accommodation"
    ),
    [planItems]
  );

  const [filter, setFilter] = useState<LogisticsFilter>("transport");

  const transportItems = useMemo(
    () => logisticsItems.filter((i) => i.type === "flight" || i.type === "transport" || i.type === "taxi"),
    [logisticsItems]
  );

  const accommodations = useMemo(
    () => logisticsItems.filter((i) => i.type === "accommodation"),
    [logisticsItems]
  );

  const filteredItems = useMemo(() => {
    if (filter === "transport") return sortByDate(transportItems);
    if (filter === "accommodation") return sortByDate(accommodations);
    return sortByDate(logisticsItems);
  }, [filter, transportItems, accommodations, logisticsItems]);

  const handleOpenItem = (item: TripPlanItem) => {
    navigation.navigate("TripPlanForm", { tripId, planItem: item });
  };

  const summaryTotal = logisticsItems.length;
  const hasLogistics = summaryTotal > 0;

  const renderTransportCard = (item: TripPlanItem) => {
    const icon = TRANSPORT_ICONS[item.type] || "airplane-outline";
    const date = formatDate(item.startAt || item.date || item.startTime);
    const time = formatTime(item.startAt || item.startTime);

    const flightNumber = item.flightDetails?.flightNumberRaw;
    const fromIata = item.flightDetails?.fromIata;
    const toIata = item.flightDetails?.toIata;
    const company = item.destinationTransport?.company;
    const fromName = item.destinationTransport?.fromName;
    const toName = item.destinationTransport?.toName;

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.7}
        onPress={() => handleOpenItem(item)}
        style={{
          backgroundColor: "white",
          borderRadius: 16,
          padding: 14,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          shadowColor: "#000",
          shadowOpacity: 0.03,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          {/* Icon */}
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(14,165,233,0.10)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Ionicons name={icon} size={22} color="#0EA5E9" />
          </View>

          {/* Content */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "800", color: "#0B1220" }} numberOfLines={1}>
              {item.title}
            </Text>

            {/* Flight route */}
            {item.type === "flight" && (fromIata || toIata) && (
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#64748B" }}>
                  {fromIata || "?"} → {toIata || "?"}
                </Text>
                {flightNumber && (
                  <Text style={{ fontSize: 11, fontWeight: "600", color: "#94A3B8", marginLeft: 8 }}>
                    {flightNumber}
                  </Text>
                )}
              </View>
            )}

            {/* Transport route */}
            {(item.type === "transport" || item.type === "taxi") && (fromName || toName) && (
              <View style={{ marginTop: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#64748B" }} numberOfLines={1}>
                  {fromName || "Origen"} → {toName || "Destino"}
                </Text>
                {company && (
                  <Text style={{ fontSize: 11, fontWeight: "600", color: "#94A3B8", marginTop: 2 }}>
                    {company}
                  </Text>
                )}
              </View>
            )}

            {/* Date and time */}
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="calendar-outline" size={12} color="#94A3B8" />
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#64748B", marginLeft: 4 }}>
                  {date}
                </Text>
              </View>
              {time && (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="time-outline" size={12} color="#94A3B8" />
                  <Text style={{ fontSize: 11, fontWeight: "600", color: "#64748B", marginLeft: 4 }}>
                    {time}
                  </Text>
                </View>
              )}
            </View>

            {/* Cost */}
            {item.cost != null && (
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#10B981", marginTop: 6 }}>
                {typeof item.cost === 'number' ? item.cost.toFixed(2) : item.cost} €
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderAccommodationCard = (item: TripPlanItem) => {
    const checkIn = item.date || item.accommodationDetails?.checkInAt;
    const checkOut = item.endTime || item.accommodationDetails?.checkOutAt;

    const checkInDate = formatDate(checkIn);
    const checkOutDate = formatDate(checkOut);

    const name = item.accommodationDetails?.name;
    const address = item.accommodationDetails?.address;
    const city = item.accommodationDetails?.city;
    const guests = item.accommodationDetails?.guests;
    const rooms = item.accommodationDetails?.rooms;

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.7}
        onPress={() => handleOpenItem(item)}
        style={{
          backgroundColor: "white",
          borderRadius: 16,
          padding: 14,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          shadowColor: "#000",
          shadowOpacity: 0.03,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          {/* Icon */}
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(139,92,246,0.10)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Ionicons name="bed-outline" size={22} color="#8B5CF6" />
          </View>

          {/* Content */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "800", color: "#0B1220" }} numberOfLines={1}>
              {item.title}
            </Text>

            {name && (
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#64748B", marginTop: 2 }} numberOfLines={1}>
                {name}
              </Text>
            )}

            {/* Address */}
            {(address || city) && (
              <View style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 4 }}>
                <Ionicons name="location-outline" size={12} color="#94A3B8" style={{ marginTop: 1 }} />
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#94A3B8", marginLeft: 4, flex: 1 }} numberOfLines={1}>
                  {address || city}
                </Text>
              </View>
            )}

            {/* Check-in / Check-out */}
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="enter-outline" size={12} color="#10B981" />
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#10B981", marginLeft: 4 }}>
                  {checkInDate}
                </Text>
              </View>
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#94A3B8" }}>→</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="exit-outline" size={12} color="#EF4444" />
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#EF4444", marginLeft: 4 }}>
                  {checkOutDate}
                </Text>
              </View>
            </View>

            {/* Guests & Rooms */}
            {(guests || rooms) && (
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 10 }}>
                {guests && (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="people-outline" size={12} color="#94A3B8" />
                    <Text style={{ fontSize: 11, fontWeight: "600", color: "#64748B", marginLeft: 4 }}>
                      {guests} {guests === 1 ? "huésped" : "huéspedes"}
                    </Text>
                  </View>
                )}
                {rooms && (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="home-outline" size={12} color="#94A3B8" />
                    <Text style={{ fontSize: 11, fontWeight: "600", color: "#64748B", marginLeft: 4 }}>
                      {rooms} {rooms === 1 ? "hab." : "habs."}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Cost */}
            {item.cost != null && (
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#10B981", marginTop: 6 }}>
                {typeof item.cost === 'number' ? item.cost.toFixed(2) : item.cost} €
              </Text>
            )}
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
          paddingHorizontal: 16,
          paddingTop: 12,
        }}
      >
        {/* RESUMEN COMPACTO */}
        <View
          style={{
            backgroundColor: "#F9FAFB",
            borderRadius: 16,
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: "#64748B",
              marginBottom: 8,
            }}
          >
            Resumen de logística
          </Text>
          <View className="flex-row">
            <View className="flex-1">
              <Text style={{ fontSize: 11, color: "#94A3B8" }}>
                Transportes
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "800",
                  color: "#0B1220",
                }}
              >
                {transportItems.length}
              </Text>
            </View>
            <View className="flex-1">
              <Text style={{ fontSize: 11, color: "#94A3B8" }}>
                Alojamientos
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "800",
                  color: "#0B1220",
                }}
              >
                {accommodations.length}
              </Text>
            </View>
            <View className="flex-1 items-end">
              <Text style={{ fontSize: 11, color: "#94A3B8" }}>
                Total
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "800",
                  color: "#0B1220",
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
              { key: "transport", label: "Transportes" },
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
                  paddingVertical: 8,
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
                    fontSize: 12,
                    fontWeight: "700",
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
            <Ionicons name="airplane-outline" size={48} color="#CBD5E1" />
            <Text className="text-center text-gray-400 text-sm mb-2 mt-3">
              No hay transportes ni alojamientos registrados todavía.
            </Text>
            <Text className="text-center text-gray-400 text-xs">
              Añádelos desde el planning del viaje para tenerlo todo controlado.
            </Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View className="mt-12 items-center px-8">
            <Text className="text-center text-gray-400 text-sm">
              No hay elementos en esta vista.
            </Text>
          </View>
        ) : (
          <>
            {filteredItems.map((item) =>
              item.type === "accommodation"
                ? renderAccommodationCard(item)
                : renderTransportCard(item)
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
