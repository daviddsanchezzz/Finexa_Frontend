// src/screens/Trips/components/TripLogisticaSection.tsx
import React, { useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../../../../../theme/theme";
import { useUserDocuments } from "../../../../../hooks/useUserDocuments";
import { useTripDocuments } from "../../../../../hooks/useTripDocuments";
import { useTripContacts } from "../../../../../hooks/useTripContacts";
import { getEmergencyNumber } from "../../../../../utils/emergencyNumbers";

interface FlightDetails {
  flightNumberIata?: string | null;
  flightNumberRaw?: string | null;
  airlineName?: string | null;
  fromIata?: string | null;
  toIata?: string | null;
  gate?: string | null;
  seat?: string | null;
}

interface AccommodationDetails {
  phone?: string | null;
}

interface TripPlanItem {
  id: number;
  type: string;
  title: string;
  startAt?: string | null;
  flightDetails?: FlightDetails | null;
  accommodationDetails?: AccommodationDetails | null;
}

interface TripLite {
  id: number;
  name?: string | null;
  destination?: string | null;
  endDate?: string | null;
}

interface Props {
  tripId: number;
  trip: TripLite;
  planItems: TripPlanItem[];
  onRefresh: () => void;
}

function fmtTime(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export default function TripLogisticsSection({ tripId, trip, planItems }: Props) {
  const navigation = useNavigation<any>();

  const { documentsByType: userDocsByType, isLoading: userDocsLoading } = useUserDocuments();
  const { documentsByType: tripDocsByType, isLoading: tripDocsLoading } = useTripDocuments(tripId);
  const { contacts, isLoading: contactsLoading } = useTripContacts(tripId);

  const hasPassport = userDocsByType.has("passport");
  const hasDni = userDocsByType.has("dni");
  const hasInsurance = tripDocsByType.has("travel_insurance");
  const docsLoading = userDocsLoading || tripDocsLoading;
  const docsCount = (hasPassport ? 1 : 0) + (hasDni ? 1 : 0) + (hasInsurance ? 1 : 0);

  const reservationsCount = useMemo(
    () => planItems.filter((i) => i.type === "flight" || i.type === "accommodation").length,
    [planItems]
  );

  const accommodationsWithPhone = useMemo(
    () => planItems.filter((i) => i.type === "accommodation" && i.accommodationDetails?.phone).length,
    [planItems]
  );
  const emergencyNumber = getEmergencyNumber(trip?.destination);
  const contactsCount = (emergencyNumber ? 1 : 0) + accommodationsWithPhone + contacts.length;

  const nextFlight = useMemo(() => {
    const now = Date.now();
    const upcoming = planItems
      .filter((i) => i.type === "flight" && i.startAt && new Date(i.startAt).getTime() >= now)
      .sort((a, b) => new Date(a.startAt!).getTime() - new Date(b.startAt!).getTime());
    return upcoming[0] ?? null;
  }, [planItems]);

  const openDocuments = () =>
    navigation.navigate("TripDocuments", {
      tripId,
      destination: trip?.destination ?? null,
      tripName: trip?.name ?? null,
      endDate: trip?.endDate ?? null,
    });

  const openReservas = () => navigation.navigate("Reservas", { tripId, planItems });

  const openContactos = () =>
    navigation.navigate("Contactos", { tripId, destination: trip?.destination ?? null, planItems });

  const openMaleta = () =>
    navigation.navigate("Maleta", { tripId, destination: trip?.destination ?? null, tripName: trip?.name ?? null });

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingTop: 4 }}>
      {!docsLoading && !hasInsurance && (
        <TouchableOpacity
          onPress={openDocuments}
          activeOpacity={0.8}
          style={{
            flexDirection: "row", alignItems: "center", gap: 8,
            backgroundColor: "#FEF2F2", borderRadius: 14, padding: 12, marginBottom: 16,
          }}
        >
          <Ionicons name="warning-outline" size={18} color="#DC2626" />
          <Text style={{ flex: 1, fontSize: 12, fontWeight: "700", color: "#991B1B" }}>
            Te falta añadir el seguro de viaje
          </Text>
          <Text style={{ fontSize: 12, fontWeight: "800", color: "#DC2626" }}>Añadir</Text>
        </TouchableOpacity>
      )}

      {/* Stats */}
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
        <StatCard label="Documentos" value={docsLoading ? "—" : `${docsCount}/3`} onPress={openDocuments} />
        <StatCard label="Reservas" value={String(reservationsCount)} onPress={openReservas} />
        <StatCard label="Contactos" value={contactsLoading ? "—" : String(contactsCount)} onPress={openContactos} />
      </View>

      {/* Próximo en tu viaje */}
      {nextFlight && nextFlight.flightDetails && (
        <>
          <SectionTitle>Próximo en tu viaje</SectionTitle>
          <NextFlightCard item={nextFlight} />
        </>
      )}

      {/* Accesos rápidos */}
      <SectionTitle>Accesos rápidos</SectionTitle>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <QuickAccessTile icon="document-text-outline" label="Documentos" onPress={openDocuments} />
        <QuickAccessTile icon="briefcase-outline" label="Reservas" onPress={openReservas} />
        <QuickAccessTile icon="call-outline" label="Contactos" onPress={openContactos} />
        <QuickAccessTile icon="checkmark-done-outline" label="Maleta" onPress={openMaleta} />
      </View>
    </ScrollView>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
      {children}
    </Text>
  );
}

function StatCard({
  label,
  value,
  disabled,
  onPress,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flex: 1, backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#F0F4F8",
        paddingVertical: 14, alignItems: "center", opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8", marginBottom: 4 }}>{label}</Text>
      <Text style={{ fontSize: 18, fontWeight: "900", color: "#0F172A" }}>{value}</Text>
    </TouchableOpacity>
  );
}

function NextFlightCard({ item }: { item: TripPlanItem }) {
  const fd = item.flightDetails!;
  const flightNum = fd.flightNumberIata || fd.flightNumberRaw || null;
  const subline = [fd.airlineName, flightNum].filter(Boolean).join(" · ");
  const route = fd.fromIata && fd.toIata ? `${fd.fromIata} → ${fd.toIata}` : item.title;
  const depTime = fmtTime(item.startAt);
  const today = item.startAt ? isToday(item.startAt) : false;

  return (
    <View style={{ backgroundColor: "#0B1220", borderRadius: 20, padding: 16, marginBottom: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        {!!subline && (
          <Text style={{ fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.6)" }}>{subline}</Text>
        )}
        {today && (
          <View style={{ backgroundColor: "#16A34A", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
            <Text style={{ fontSize: 10, fontWeight: "800", color: "white" }}>Hoy</Text>
          </View>
        )}
      </View>

      <Text style={{ fontSize: 20, fontWeight: "900", color: "white", marginBottom: 12 }}>{route}</Text>

      <View style={{ flexDirection: "row", gap: 20 }}>
        {!!depTime && (
          <View>
            <Text style={{ fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>SALIDA</Text>
            <Text style={{ fontSize: 14, fontWeight: "800", color: "white" }}>{depTime}</Text>
          </View>
        )}
        {!!fd.gate && (
          <View>
            <Text style={{ fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>PUERTA</Text>
            <Text style={{ fontSize: 14, fontWeight: "800", color: "white" }}>{fd.gate}</Text>
          </View>
        )}
        {!!fd.seat && (
          <View>
            <Text style={{ fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>ASIENTO</Text>
            <Text style={{ fontSize: 14, fontWeight: "800", color: "white" }}>{fd.seat}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function QuickAccessTile({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        width: "47.5%", backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#F0F4F8",
        paddingVertical: 18, alignItems: "center", gap: 8, opacity: disabled ? 0.45 : 1,
      }}
    >
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={{ fontSize: 12, fontWeight: "700", color: "#1F2937" }}>{label}</Text>
    </TouchableOpacity>
  );
}
