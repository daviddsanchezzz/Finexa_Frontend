import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { colors } from "../../../../theme/theme";

type ReservaFilter = "all" | "flight" | "accommodation";

interface FlightDetails {
  flightNumberIata?: string | null;
  flightNumberRaw?: string | null;
  airlineName?: string | null;
  fromIata?: string | null;
  toIata?: string | null;
  gate?: string | null;
  seat?: string | null;
  bookingRef?: string | null;
}

interface AccommodationDetails {
  name?: string | null;
  bookingRef?: string | null;
  checkInAt?: string | null;
  checkOutAt?: string | null;
}

interface TripPlanItem {
  id: number;
  type: string;
  title: string;
  tripId?: number;
  startAt?: string | null;
  endAt?: string | null;
  flightDetails?: FlightDetails | null;
  accommodationDetails?: AccommodationDetails | null;
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) + " · " +
    d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

export default function ReservasScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { tripId, planItems = [] } = route.params || {};

  const [filter, setFilter] = useState<ReservaFilter>("all");

  const reservations = useMemo(
    () => (planItems as TripPlanItem[]).filter((i) => i.type === "flight" || i.type === "accommodation"),
    [planItems]
  );

  const filtered = useMemo(() => {
    if (filter === "flight") return reservations.filter((i) => i.type === "flight");
    if (filter === "accommodation") return reservations.filter((i) => i.type === "accommodation");
    return reservations;
  }, [reservations, filter]);

  const openItem = (item: TripPlanItem) => navigation.navigate("TripPlanForm", { tripId, planItem: item });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 8 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "900", color: "#0F172A" }}>Reservas</Text>
      </View>

      <View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 14 }}>
        {([
          { key: "all", label: "Todas" },
          { key: "flight", label: "Vuelos" },
          { key: "accommodation", label: "Alojamiento" },
        ] as { key: ReservaFilter; label: string }[]).map((opt) => {
          const active = filter === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              onPress={() => setFilter(opt.key)}
              style={{
                paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
                backgroundColor: active ? colors.primary : "#F3F4F6",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: active ? "white" : "#6B7280" }}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 12 }} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 48, gap: 8 }}>
            <Ionicons name="briefcase-outline" size={40} color="#CBD5E1" />
            <Text style={{ fontSize: 13, color: "#94A3B8", textAlign: "center" }}>
              No hay vuelos ni alojamientos registrados en este viaje todavía.
            </Text>
          </View>
        ) : (
          filtered.map((item) =>
            item.type === "flight"
              ? <FlightReservationCard key={item.id} item={item} onPress={() => openItem(item)} />
              : <AccommodationReservationCard key={item.id} item={item} onPress={() => openItem(item)} />
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FlightReservationCard({ item, onPress }: { item: TripPlanItem; onPress: () => void }) {
  const fd = item.flightDetails || {};
  const flightNum = fd.flightNumberIata || fd.flightNumberRaw || null;
  const subline = [fd.airlineName, flightNum].filter(Boolean).join(" · ");
  const route = fd.fromIata && fd.toIata ? `${fd.fromIata} → ${fd.toIata}` : item.title;
  const dep = fmtDateTime(item.startAt);
  const arr = fmtDateTime(item.endAt);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ backgroundColor: "#0B1220", borderRadius: 18, padding: 16 }}>
      {!!subline && <Text style={{ fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.55)", marginBottom: 6 }}>{subline}</Text>}
      <Text style={{ fontSize: 18, fontWeight: "900", color: "white", marginBottom: 12 }}>{route}</Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 18, marginBottom: fd.bookingRef ? 10 : 0 }}>
        {!!dep && <FlightField label="SALIDA" value={dep} />}
        {!!arr && <FlightField label="LLEGADA" value={arr} />}
        {!!fd.gate && <FlightField label="PUERTA" value={fd.gate} />}
        {!!fd.seat && <FlightField label="ASIENTO" value={fd.seat} />}
      </View>

      {!!fd.bookingRef && (
        <View style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.12)", paddingTop: 10, flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: "700" }}>Cód. reserva</Text>
          <Text style={{ fontSize: 12, color: "white", fontWeight: "800" }}>{fd.bookingRef}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function FlightField({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={{ fontSize: 9, fontWeight: "700", color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: "800", color: "white" }}>{value}</Text>
    </View>
  );
}

function AccommodationReservationCard({ item, onPress }: { item: TripPlanItem; onPress: () => void }) {
  const ad = item.accommodationDetails || {};
  const checkIn = fmtDateTime(ad.checkInAt);
  const checkOut = fmtDateTime(ad.checkOutAt);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#F0F4F8", padding: 16 }}>
      <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A", marginBottom: 10 }}>{ad.name || item.title}</Text>

      <View style={{ flexDirection: "row", gap: 24, marginBottom: ad.bookingRef ? 10 : 0 }}>
        {!!checkIn && (
          <View>
            <Text style={{ fontSize: 10, fontWeight: "700", color: "#9CA3AF", marginBottom: 2 }}>CHECK-IN</Text>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#0F172A" }}>{checkIn}</Text>
          </View>
        )}
        {!!checkOut && (
          <View>
            <Text style={{ fontSize: 10, fontWeight: "700", color: "#9CA3AF", marginBottom: 2 }}>CHECK-OUT</Text>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#0F172A" }}>{checkOut}</Text>
          </View>
        )}
      </View>

      {!!ad.bookingRef && (
        <View style={{ borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 10, flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "700" }}>Cód. confirmación</Text>
          <Text style={{ fontSize: 12, color: "#0F172A", fontWeight: "800" }}>{ad.bookingRef}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
