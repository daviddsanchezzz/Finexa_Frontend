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
import { colors } from "../theme/theme";

const ACCENT = colors.primary;
const ACCENT_SOFT = "rgba(0,60,197,0.09)";
const INK = "#0B1220";
const MUTED = "#5B6A80";

export default function LiveTripCard() {
  const insets = useSafeAreaInsets();
  const { trip } = useOngoingTrip();
  const { currentItem, nextItem, now } = useTripActivityStatus(trip?.planItems);
  const minimized = useUIStore((s) => s.liveTripMinimized);
  const setMinimized = useUIStore((s) => s.setLiveTripMinimized);

  if (!trip) return null;

  const start = trip.startDate ? new Date(trip.startDate) : null;
  const end = trip.endDate ? new Date(trip.endDate) : null;
  const totalDays = start && end ? Math.round((end.getTime() - start.getTime()) / 86400000) + 1 : null;
  const dayNumber = start ? Math.floor((now.getTime() - start.getTime()) / 86400000) + 1 : null;

  const headline = currentItem ?? nextItem;
  const headlineLabel = currentItem ? "Ahora" : "Siguiente";

  // Si hay una actividad en curso, la segunda línea no repite su propio
  // tiempo restante — informa de qué viene después. Si no hay actividad en
  // curso, el headline ya ES "Siguiente", así que aquí solo va la cuenta atrás.
  const nextTimeLabel = nextItem?.startAt
    ? new Date(nextItem.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;
  const subLine = currentItem
    ? nextItem
      ? `Siguiente: ${nextTimeLabel ? `${nextTimeLabel} · ` : ""}${nextItem.title}`
      : null
    : nextItem?.startAt
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
      label: "Añadir Gasto",
      icon: "cash-outline" as const,
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
      icon: "ticket-outline" as const,
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
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 6,
        }}
      >
        {/* Capa recortada en círculo: solo la foto/bandera vive aquí dentro */}
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: "#111827",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {trip.coverImageUrl ? (
            <Image source={{ uri: trip.coverImageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          ) : trip.destination ? (
            <CountryFlag cca2={trip.destination} size={46} radius={0} />
          ) : (
            <Ionicons name="airplane" size={20} color="white" />
          )}
        </View>
        {/* Insignia del día: fuera del contenedor recortado para que sobresalga de verdad */}
        {dayNumber != null && (
          <View
            style={{
              position: "absolute",
              bottom: -5,
              right: -5,
              minWidth: 17,
              height: 17,
              borderRadius: 9,
              paddingHorizontal: 3,
              backgroundColor: "#16A34A",
              borderWidth: 1.5,
              borderColor: "white",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "white", fontSize: 8.5, fontWeight: "900" }}>{dayNumber}</Text>
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
      <View
        style={{
          backgroundColor: "white",
          borderRadius: 22,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "rgba(15,23,42,0.07)",
          shadowColor: "#0B1220",
          shadowOpacity: 0.16,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 10 },
          elevation: 8,
        }}
      >
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
            backgroundColor: "rgba(15,23,42,0.06)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="close" size={15} color={MUTED} />
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
            <View style={{ width: 52, height: 52 }}>
              <View style={{ width: 52, height: 52, borderRadius: 14, overflow: "hidden", backgroundColor: "rgba(15,23,42,0.06)" }}>
                {trip.coverImageUrl ? (
                  <Image source={{ uri: trip.coverImageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                ) : (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="image-outline" size={20} color={MUTED} />
                  </View>
                )}
              </View>
              {/* Bandera como insignia sobre la foto: fuera de la fila del nombre,
                  para poder hacerla más grande sin competir por el espacio del texto. */}
              {trip.destination ? (
                <View
                  style={{
                    position: "absolute",
                    bottom: -5,
                    right: -5,
                    borderRadius: 5,
                    overflow: "hidden",
                    borderWidth: 2,
                    borderColor: "white",
                  }}
                >
                  <CountryFlag cca2={trip.destination} width={28} height={20} radius={0} />
                </View>
              ) : null}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: INK, fontSize: 17, fontWeight: "800" }} numberOfLines={1}>
                {trip.name}
              </Text>
              {headline ? (
                <>
                  <Text style={{ color: MUTED, fontSize: 12, fontWeight: "600", marginTop: 3 }} numberOfLines={1}>
                    {headlineLabel}: {headline.title}
                  </Text>
                  {subLine ? (
                    <Text style={{ color: "rgba(91,106,128,0.75)", fontSize: 10.5, fontWeight: "600", marginTop: 1 }} numberOfLines={1}>
                      {subLine}
                    </Text>
                  ) : null}
                </>
              ) : null}
            </View>
          </View>
        </View>

        <View style={{ flexDirection: "row", backgroundColor: "rgba(15,23,42,0.025)", paddingVertical: 12, borderTopWidth: 1, borderTopColor: "rgba(15,23,42,0.06)" }}>
          {shortcuts.map((s) => (
            <TouchableOpacity key={s.key} onPress={s.onPress} style={{ flex: 1, alignItems: "center", gap: 6 }} activeOpacity={0.75}>
              <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: ACCENT_SOFT, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={s.icon} size={17} color={ACCENT} />
              </View>
              <Text style={{ color: INK, fontSize: 9.5, fontWeight: "700" }}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={() => goTo("TripDetail", { tripId: trip.id, initialTab: "planning" })}
          style={{ paddingVertical: 12, alignItems: "center", borderTopWidth: 1, borderTopColor: "rgba(15,23,42,0.06)" }}
          activeOpacity={0.8}
        >
          <Text style={{ color: ACCENT, fontSize: 13, fontWeight: "700" }}>Ir al viaje →</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
