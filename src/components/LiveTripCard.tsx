import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import Modal from "react-native-modal";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useOngoingTrip } from "../hooks/useOngoingTrip";
import { useTripActivityStatus, minutesUntil, formatCountdown } from "../hooks/useTripActivityStatus";

export default function LiveTripCard() {
  const navigation = useNavigation<any>();
  const { trip } = useOngoingTrip();
  const { currentItem, nextItem, now } = useTripActivityStatus(trip?.planItems);
  const [dismissed, setDismissed] = useState(false);

  if (!trip || dismissed) return null;

  const start = trip.startDate ? new Date(trip.startDate) : null;
  const end = trip.endDate ? new Date(trip.endDate) : null;
  const totalDays = start && end ? Math.round((end.getTime() - start.getTime()) / 86400000) + 1 : null;
  const dayNumber = start ? Math.floor((now.getTime() - start.getTime()) / 86400000) + 1 : null;

  const headline = currentItem ?? nextItem;
  const headlineLabel = currentItem ? "Ahora" : "Siguiente";
  const countdown = !currentItem && nextItem?.startAt ? formatCountdown(minutesUntil(nextItem.startAt, now)) : null;

  const shortcuts = [
    {
      key: "ticket",
      label: "Ticket",
      icon: "airplane-outline" as const,
      onPress: () => navigation.navigate("Reservas", { tripId: trip.id, planItems: trip.planItems }),
    },
    {
      key: "docs",
      label: "Documentos",
      icon: "document-text-outline" as const,
      onPress: () => navigation.navigate("TripDocuments", { tripId: trip.id, destination: trip.destination, tripName: trip.name, endDate: trip.endDate }),
    },
    {
      key: "weather",
      label: "Clima",
      icon: "sunny-outline" as const,
      onPress: () => navigation.navigate("TripDetail", { tripId: trip.id }),
    },
    {
      key: "contacts",
      label: "Contactos",
      icon: "call-outline" as const,
      onPress: () => navigation.navigate("Contactos", { tripId: trip.id, destination: trip.destination, planItems: trip.planItems }),
    },
  ];

  return (
    <Modal
      isVisible
      onBackdropPress={() => setDismissed(true)}
      backdropOpacity={0.45}
      animationIn="fadeIn"
      animationOut="fadeOut"
      style={{ margin: 0, justifyContent: "flex-start", paddingTop: 60, paddingHorizontal: 16 }}
    >
      <View style={{ backgroundColor: "#111827", borderRadius: 22, overflow: "hidden" }}>
        <TouchableOpacity
          onPress={() => setDismissed(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 2,
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: "rgba(255,255,255,0.15)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="close" size={15} color="white" />
        </TouchableOpacity>

        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: "#16A34A",
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
              marginBottom: 10,
            }}
          >
            <Text style={{ color: "white", fontSize: 11, fontWeight: "800" }}>
              De viaje{dayNumber && totalDays ? ` · Día ${dayNumber} de ${totalDays}` : ""}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <View style={{ width: 52, height: 52, borderRadius: 14, overflow: "hidden", backgroundColor: "#1F2937" }}>
              {trip.coverImageUrl ? (
                <Image source={{ uri: trip.coverImageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              ) : (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="image-outline" size={20} color="rgba(255,255,255,0.4)" />
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "white", fontSize: 17, fontWeight: "800" }} numberOfLines={1}>
                {trip.name}
              </Text>
              {headline ? (
                <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                  {headlineLabel}: {headline.title}
                  {countdown ? ` · ${countdown}` : ""}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        <View style={{ flexDirection: "row", backgroundColor: "rgba(255,255,255,0.06)", paddingVertical: 12 }}>
          {shortcuts.map((s) => (
            <TouchableOpacity key={s.key} onPress={s.onPress} style={{ flex: 1, alignItems: "center", gap: 4 }} activeOpacity={0.75}>
              <Ionicons name={s.icon} size={20} color="white" />
              <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 10, fontWeight: "700" }}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate("TripDetail", { tripId: trip.id })}
          style={{ paddingVertical: 12, alignItems: "center" }}
          activeOpacity={0.8}
        >
          <Text style={{ color: "#60A5FA", fontSize: 13, fontWeight: "700" }}>Ir al viaje →</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
