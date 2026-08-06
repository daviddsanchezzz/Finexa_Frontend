// src/screens/Trips/components/TripLogisticaSection.tsx
import React, { useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../../../../../theme/theme";
import { useUserDocuments } from "../../../../../hooks/useUserDocuments";
import { useTripContacts } from "../../../../../hooks/useTripContacts";
import { getEmergencyNumber } from "../../../../../utils/emergencyNumbers";
import { appAlert } from "../../../../../utils/appAlert";

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
  phone?: string | null;
}

interface TripPlanItem {
  id: number;
  type: string;
  title: string;
  startAt?: string | null;
  endAt?: string | null;
  isReservation?: boolean | null;
  flightDetails?: FlightDetails | null;
  accommodationDetails?: AccommodationDetails | null;
}

function fmtDayTime(iso?: string | null) {
  if (!iso) return { day: null as string | null, time: null as string | null };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { day: null, time: null };
  return {
    day: d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }),
    time: d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
  };
}

function joinText(parts: Array<string | null | undefined>) {
  return parts.map((p) => p?.trim()).filter(Boolean).join(" · ");
}

interface TripLite {
  id: number;
  name?: string | null;
  destination?: string | null;
  endDate?: string | null;
  countryStays?: { country: string; startDate?: string | null; endDate?: string | null }[] | null;
}

interface Props {
  tripId: number;
  trip: TripLite;
  planItems: TripPlanItem[];
  onRefresh: () => void;
}

export default function TripLogisticsSection({ tripId, trip, planItems }: Props) {
  const navigation = useNavigation<any>();

  const { documentsByType: userDocsByType, isLoading: userDocsLoading } = useUserDocuments();
  const { contacts, isLoading: contactsLoading } = useTripContacts(tripId);

  // Lo único realmente obligatorio para viajar es llevar un documento de
  // identidad (DNI o pasaporte, según destino) — el resto (seguro, EHIC...)
  // es recomendado/opcional y se gestiona dentro de la pantalla Documentos.
  const hasIdentityDoc = userDocsByType.has("passport") || userDocsByType.has("dni");
  const docsLoading = userDocsLoading;
  const docsCount = hasIdentityDoc ? 1 : 0;

  const reservationsCount = useMemo(
    () => planItems.filter((item) => item.isReservation === true).length,
    [planItems]
  );

  const accommodationsWithPhone = useMemo(
    () => planItems.filter((item) => item.type === "accommodation" && item.accommodationDetails?.phone).length,
    [planItems]
  );
  const emergencyNumber = getEmergencyNumber(trip?.destination);
  const contactsCount = (emergencyNumber ? 1 : 0) + accommodationsWithPhone + contacts.length;

  const nextFlight = useMemo(() => {
    const now = Date.now();
    const upcoming = planItems
      .filter((item) => item.type === "flight" && item.startAt && new Date(item.startAt).getTime() >= now)
      .sort((a, b) => new Date(a.startAt!).getTime() - new Date(b.startAt!).getTime());
    return upcoming[0] ?? null;
  }, [planItems]);

  const openDocuments = () =>
    navigation.navigate("TripDocuments", {
      tripId,
      destination: trip?.destination ?? null,
      tripName: trip?.name ?? null,
      endDate: trip?.endDate ?? null,
      countryStays: trip?.countryStays ?? undefined,
    });

  const openReservas = () => navigation.navigate("Reservas", { tripId, planItems });

  const openContactos = () =>
    navigation.navigate("Contactos", { tripId, destination: trip?.destination ?? null, planItems });

  const openMaleta = () =>
    navigation.navigate("Maleta", { tripId, destination: trip?.destination ?? null, tripName: trip?.name ?? null });

  const openDestinationInfo = () =>
    navigation.navigate("DestinationInfo", {
      tripId,
      destination: trip?.destination ?? null,
      countryStays: trip?.countryStays ?? undefined,
      tripName: trip?.name ?? null,
    });

  const openGallery = () =>
    appAlert("Galería del viaje", "Muy pronto podrás ver esto aquí.");

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingTop: 4 }}>
      {!docsLoading && !hasIdentityDoc && (
        <TouchableOpacity
          onPress={() => navigation.navigate("MyDocuments")}
          activeOpacity={0.8}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: "#FEF2F2",
            borderRadius: 14,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <Ionicons name="warning-outline" size={18} color="#DC2626" />
          <Text style={{ flex: 1, fontSize: 12, fontWeight: "700", color: "#991B1B" }}>
            Te falta añadir tu DNI o pasaporte
          </Text>
          <Text style={{ fontSize: 12, fontWeight: "800", color: "#DC2626" }}>Añadir</Text>
        </TouchableOpacity>
      )}

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
        <StatCard label="Documentos" value={docsLoading ? "—" : `${docsCount}/1`} onPress={openDocuments} />
        <StatCard label="Reservas" value={String(reservationsCount)} onPress={openReservas} />
        <StatCard label="Contactos" value={contactsLoading ? "—" : String(contactsCount)} onPress={openContactos} />
      </View>

      {nextFlight && nextFlight.flightDetails && (
        <>
          <SectionTitle>Próximo en tu viaje</SectionTitle>
          <NextFlightCard item={nextFlight} />
        </>
      )}

      <SectionTitle>Accesos rápidos</SectionTitle>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <QuickAccessTile icon="globe-outline" label="Información del destino" onPress={openDestinationInfo} />
        <QuickAccessTile icon="images-outline" label="Galería del viaje" onPress={openGallery} />
        <QuickAccessTile icon="document-text-outline" label="Documentos" onPress={openDocuments} />
        <QuickAccessTile icon="briefcase-outline" label="Reservas" onPress={openReservas} />
        <QuickAccessTile icon="call-outline" label="Contactos" onPress={openContactos} />
        <QuickAccessTile icon="briefcase-outline" label="Maleta" onPress={openMaleta} />
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
        flex: 1,
        backgroundColor: "white",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#F0F4F8",
        paddingVertical: 14,
        alignItems: "center",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8", marginBottom: 4 }}>{label}</Text>
      <Text style={{ fontSize: 18, fontWeight: "900", color: "#0F172A" }}>{value}</Text>
    </TouchableOpacity>
  );
}

function NextFlightCard({ item }: { item: TripPlanItem }) {
  const fd = item.flightDetails || {};
  const flightNum = fd.flightNumberIata || fd.flightNumberRaw || null;
  const subtitle = joinText([fd.airlineName, flightNum]);
  const fromCode = fd.fromIata?.trim() || "—";
  const toCode = fd.toIata?.trim() || "—";
  const dep = fmtDayTime(item.startAt);
  const arr = fmtDayTime(item.endAt);

  const hasFooter = !!(fd.gate || fd.seat || fd.bookingRef);

  return (
    <View style={{ borderRadius: 14, overflow: "hidden", backgroundColor: "#0B1220", marginBottom: 20 }}>
      <View style={{ backgroundColor: "#0F172A", paddingHorizontal: 13, paddingTop: 10, paddingBottom: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6, paddingRight: 12 }}>
            <Ionicons name="airplane" size={12} color="rgba(255,255,255,0.55)" />
            {!!subtitle && (
              <Text style={{ fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.55)" }} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 21, fontWeight: "900", color: "white", letterSpacing: 0.2 }}>{fromCode}</Text>
          </View>

          <View style={{ width: 64, alignItems: "center" }}>
            <View style={{ width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
              <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.22)" }} />
              <Ionicons name="airplane" size={11} color="#60A5FA" style={{ marginHorizontal: 5, transform: [{ rotate: "90deg" }] }} />
              <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.22)" }} />
            </View>
          </View>

          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text style={{ fontSize: 21, fontWeight: "900", color: "white", letterSpacing: 0.2 }}>{toCode}</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <FlightTimeBlock align="left" label="SALIDA" day={dep.day} time={dep.time} />
          <FlightTimeBlock align="right" label="LLEGADA" day={arr.day} time={arr.time} />
        </View>

        {hasFooter && (
          <View
            style={{
              marginTop: 8,
              paddingTop: 8,
              borderTopWidth: 1,
              borderTopColor: "rgba(255,255,255,0.10)",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ flexDirection: "row", gap: 14 }}>
              {!!fd.gate && <FlightBadge label="PUERTA" value={fd.gate} />}
              {!!fd.seat && <FlightBadge label="ASIENTO" value={fd.seat} />}
            </View>
            {!!fd.bookingRef && <Text style={{ fontSize: 11, fontWeight: "800", color: "white" }}>{fd.bookingRef}</Text>}
          </View>
        )}
      </View>
    </View>
  );
}

function FlightTimeBlock({
  label,
  day,
  time,
  align,
}: {
  label: string;
  day: string | null;
  time: string | null;
  align: "left" | "right";
}) {
  return (
    <View style={{ alignItems: align === "left" ? "flex-start" : "flex-end" }}>
      <Text style={{ fontSize: 9, fontWeight: "700", color: "rgba(255,255,255,0.48)", marginBottom: 2 }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 5 }}>
        <Text style={{ fontSize: 15, fontWeight: "900", color: "white" }}>{time || "—"}</Text>
        <Text style={{ fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.55)" }}>{day || "—"}</Text>
      </View>
    </View>
  );
}

function FlightBadge({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
      <Text style={{ fontSize: 9, fontWeight: "700", color: "rgba(255,255,255,0.48)" }}>{label}</Text>
      <Text style={{ fontSize: 12, fontWeight: "900", color: "white" }}>{value}</Text>
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
        width: "47.5%",
        backgroundColor: "white",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#F0F4F8",
        paddingVertical: 18,
        alignItems: "center",
        gap: 8,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={{ fontSize: 12, fontWeight: "700", color: "#1F2937" }}>{label}</Text>
    </TouchableOpacity>
  );
}
