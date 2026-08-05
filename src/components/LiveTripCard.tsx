import React from "react";
import { View, Text, Image, TouchableOpacity, Pressable } from "react-native";
import Modal from "react-native-modal";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOngoingTrip } from "../hooks/useOngoingTrip";
import { useTripActivityStatus, minutesUntil, formatCountdown } from "../hooks/useTripActivityStatus";
import { useUIStore } from "../store/uiStore";
import { CountryFlag } from "./CountryFlag";
import { navigate } from "../navigation/navigationRef";

export default function LiveTripCard() {
  const insets = useSafeAreaInsets();
  const { trip } = useOngoingTrip();
  const { currentItem, currentItemEnd, nextItem, now } = useTripActivityStatus(trip?.planItems);
  const minimized = useUIStore((s) => s.liveTripMinimized);
  const setMinimized = useUIStore((s) => s.setLiveTripMinimized);

  if (!trip) return null;

  const start = trip.startDate ? new Date(trip.startDate) : null;
  const end = trip.endDate ? new Date(trip.endDate) : null;
  const totalDays = start && end ? Math.round((end.getTime() - start.getTime()) / 86400000) + 1 : null;
  const dayNumber = start ? Math.floor((now.getTime() - start.getTime()) / 86400000) + 1 : null;

  const headline = currentItem ?? nextItem;
  const headlineLabel = currentItem ? "Ahora" : "Siguiente";
  const countdown = currentItem && currentItemEnd
    ? `termina ${formatCountdown(minutesUntil(currentItemEnd.toISOString(), now))}`
    : !currentItem && nextItem?.startAt
    ? formatCountdown(minutesUntil(nextItem.startAt, now))
    : null;

  // Navegar desde el modal (atajos / "Ir al viaje") lo minimiza a la burbuja
  // en vez de cerrarlo del todo, para poder volver a abrirlo desde cualquier pantalla.
  const goTo = (screen: string, params: any) => {
    setMinimized(true);
    navigate(screen, params);
  };

  const shortcuts = [
    {
      key: "expense",
      label: "+ Gasto",
      icon: "add-circle-outline" as const,
      onPress: () =>
        goTo("Add", {
          prefillData: {
            type: "expense",
            categoryId: (trip as any).categoryId ?? undefined,
            subcategoryId: (trip as any).subcategoryId ?? undefined,
          },
        }),
    },
    {
      key: "ticket",
      label: "Reservas",
      icon: "airplane-outline" as const,
      onPress: () => goTo("Reservas", { tripId: trip.id, planItems: trip.planItems }),
    },
    {
      key: "docs",
      label: "Documentos",
      icon: "document-text-outline" as const,
      onPress: () => goTo("TripDocuments", { tripId: trip.id, destination: trip.destination, tripName: trip.name, endDate: trip.endDate }),
    },
    {
      key: "contacts",
      label: "Contactos",
      icon: "call-outline" as const,
      onPress: () => goTo("Contactos", { tripId: trip.id, destination: trip.destination, planItems: trip.planItems }),
    },
  ];

  if (minimized) {
    return (
      <Pressable
        onPress={() => setMinimized(false)}
        style={{
          position: "absolute",
          top: insets.top + 60,
          right: 16,
          zIndex: 9999,
          width: 46,
          height: 46,
          borderRadius: 23,
          backgroundColor: "#111827",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 6,
        }}
      >
        {trip.coverImageUrl ? (
          <Image source={{ uri: trip.coverImageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        ) : trip.destination ? (
          <CountryFlag cca2={trip.destination} size={46} radius={0} />
        ) : (
          <Ionicons name="airplane" size={20} color="white" />
        )}
        {dayNumber != null && (
          <View
            style={{
              position: "absolute",
              bottom: -5,
              right: -5,
              minWidth: 20,
              height: 20,
              borderRadius: 10,
              paddingHorizontal: 3,
              backgroundColor: "#16A34A",
              borderWidth: 2,
              borderColor: "white",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "white", fontSize: 10, fontWeight: "900" }}>{dayNumber}</Text>
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <Modal
      isVisible
      onBackdropPress={() => setMinimized(true)}
      backdropOpacity={0.45}
      animationIn="fadeIn"
      animationOut="fadeOut"
      style={{ margin: 0, justifyContent: "flex-start", paddingTop: 60, paddingHorizontal: 16 }}
    >
      <View style={{ backgroundColor: "#111827", borderRadius: 22, overflow: "hidden" }}>
        <TouchableOpacity
          onPress={() => setMinimized(true)}
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
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                {trip.destination ? <CountryFlag cca2={trip.destination} width={22} height={16} radius={3} /> : null}
                <Text style={{ color: "white", fontSize: 17, fontWeight: "800", flexShrink: 1 }} numberOfLines={1}>
                  {trip.name}
                </Text>
              </View>
              {headline ? (
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}>
                  <Text style={{ flexShrink: 1, color: "rgba(255,255,255,0.75)", fontSize: 12 }} numberOfLines={1}>
                    {headlineLabel}: {headline.title}
                  </Text>
                  {countdown ? (
                    <View style={{ marginLeft: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.14)" }}>
                      <Text style={{ color: "white", fontSize: 10, fontWeight: "800" }} numberOfLines={1}>
                        {countdown}
                      </Text>
                    </View>
                  ) : null}
                </View>
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
          onPress={() => goTo("TripDetail", { tripId: trip.id, initialTab: "planning" })}
          style={{ paddingVertical: 12, alignItems: "center" }}
          activeOpacity={0.8}
        >
          <Text style={{ color: "#60A5FA", fontSize: 13, fontWeight: "700" }}>Ir al viaje →</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
