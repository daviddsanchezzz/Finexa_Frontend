import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, Platform } from "react-native";
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
  address?: string | null;
  city?: string | null;
  country?: string | null;
  bookingRef?: string | null;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  phone?: string | null;
  website?: string | null;
  coverImageUrl?: string | null;
  guests?: number | null;
  rooms?: number | null;
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
  return parts.map((part) => part?.trim()).filter(Boolean).join(" · ");
}

export default function ReservasScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { tripId, planItems = [] } = route.params || {};

  const [filter, setFilter] = useState<ReservaFilter>("all");

  const reservations = useMemo(
    () => (planItems as TripPlanItem[]).filter((item) => item.type === "flight" || item.type === "accommodation"),
    [planItems]
  );

  const filtered = useMemo(() => {
    if (filter === "flight") return reservations.filter((item) => item.type === "flight");
    if (filter === "accommodation") return reservations.filter((item) => item.type === "accommodation");
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
                height: 38,
                paddingHorizontal: 14,
                borderRadius: 999,
                backgroundColor: active ? colors.primary : "#F8FAFC",
                borderWidth: 1,
                borderColor: active ? colors.primary : "#EEF2F7",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: active ? "white" : "#6B7280" }}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 10 }} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 48, gap: 8 }}>
            <Ionicons name="briefcase-outline" size={40} color="#CBD5E1" />
            <Text style={{ fontSize: 13, color: "#94A3B8", textAlign: "center" }}>
              No hay vuelos ni alojamientos registrados en este viaje todavía.
            </Text>
          </View>
        ) : (
          filtered.map((item) =>
            item.type === "flight" ? (
              <FlightReservationCard key={item.id} item={item} onPress={() => openItem(item)} />
            ) : (
              <AccommodationReservationCard key={item.id} item={item} onPress={() => openItem(item)} />
            )
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FlightReservationCard({ item, onPress }: { item: TripPlanItem; onPress: () => void }) {
  const fd = item.flightDetails || {};
  const flightNum = fd.flightNumberIata || fd.flightNumberRaw || null;
  const subtitle = joinText([fd.airlineName, flightNum]);
  const fromCode = fd.fromIata?.trim() || "—";
  const toCode = fd.toIata?.trim() || "—";
  const dep = fmtDayTime(item.startAt);
  const arr = fmtDayTime(item.endAt);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={{ borderRadius: 18, overflow: "hidden", backgroundColor: "#0B1220" }}>
      <View
        style={{
          backgroundColor: "#0F172A",
          paddingHorizontal: 15,
          paddingTop: 13,
          paddingBottom: 14,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            {!!subtitle && <Text style={{ fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.60)", marginBottom: 3 }}>{subtitle}</Text>}
            <Text style={{ fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.42)", letterSpacing: 0.8 }}>VUELO</Text>
          </View>
          <Ionicons name="airplane" size={18} color="rgba(255,255,255,0.80)" />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 27, fontWeight: "900", color: "white", letterSpacing: 0.3 }}>{fromCode}</Text>
          </View>

          <View style={{ width: 84, alignItems: "center" }}>
            <View style={{ width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
              <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.22)" }} />
              <Ionicons name="airplane" size={13} color="#60A5FA" style={{ marginHorizontal: 7, transform: [{ rotate: "90deg" }] }} />
              <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.22)" }} />
            </View>
            <Text style={{ fontSize: 9, fontWeight: "700", color: "rgba(255,255,255,0.55)", marginTop: 5 }}>
              {flightNum || "Reserva"}
            </Text>
          </View>

          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text style={{ fontSize: 27, fontWeight: "900", color: "white", letterSpacing: 0.3 }}>{toCode}</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <FlightTimeBlock align="left" label="SALIDA" day={dep.day} time={dep.time} />
          <FlightTimeBlock align="right" label="LLEGADA" day={arr.day} time={arr.time} />
        </View>

        {(fd.gate || fd.seat) && (
          <View
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTopWidth: 1,
              borderTopColor: "rgba(255,255,255,0.10)",
              flexDirection: "row",
              justifyContent: "center",
              gap: 18,
            }}
          >
            {!!fd.gate && <FlightBadge label="PUERTA" value={fd.gate} />}
            {!!fd.seat && <FlightBadge label="ASIENTO" value={fd.seat} />}
          </View>
        )}

        {!!fd.bookingRef && (
          <View
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTopWidth: 1,
              borderTopColor: "rgba(255,255,255,0.10)",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.48)" }}>Código reserva</Text>
            <Text style={{ fontSize: 12, fontWeight: "800", color: "white" }}>{fd.bookingRef}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
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
      <Text style={{ fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.48)", marginBottom: 3 }}>{label}</Text>
      <Text style={{ fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.64)", marginBottom: 1 }}>{day || "—"}</Text>
      <Text style={{ fontSize: 18, fontWeight: "900", color: "white" }}>{time || "—"}</Text>
    </View>
  );
}

function FlightBadge({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: "center", minWidth: 68 }}>
      <Text style={{ fontSize: 9, fontWeight: "700", color: "rgba(255,255,255,0.48)", marginBottom: 2 }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: "900", color: "white" }}>{value}</Text>
    </View>
  );
}

function AccommodationReservationCard({ item, onPress }: { item: TripPlanItem; onPress: () => void }) {
  const ad = item.accommodationDetails || {};
  const checkIn = fmtDayTime(ad.checkInAt);
  const checkOut = fmtDayTime(ad.checkOutAt);
  const title = ad.name || item.title;
  const location = joinText([ad.address, ad.city, ad.country]);
  const metaLine = joinText([
    ad.guests ? `${ad.guests} huésped${ad.guests > 1 ? "es" : ""}` : null,
    ad.rooms ? `${ad.rooms} habit.` : null,
  ]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{ backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#E8EEF7", overflow: "hidden" }}
    >
      {!!ad.coverImageUrl && (
        Platform.OS === "web" ? (
          <View
            style={{
              height: 112,
              backgroundImage: `url(${ad.coverImageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            } as any}
          />
        ) : (
          <Image source={{ uri: ad.coverImageUrl }} style={{ width: "100%", height: 112 }} resizeMode="cover" />
        )
      )}

      <View style={{ paddingHorizontal: 14, paddingTop: 13, paddingBottom: 13 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "900", color: "#0F172A", marginBottom: 5 }}>{title}</Text>
            {!!location && (
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
                <Ionicons name="location-outline" size={13} color="#64748B" style={{ marginTop: 1 }} />
                <Text style={{ flex: 1, fontSize: 11, fontWeight: "600", color: "#64748B", lineHeight: 16 }}>{location}</Text>
              </View>
            )}
          </View>

          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#EFF6FF",
            }}
          >
            <Ionicons name="bed-outline" size={18} color="#2563EB" />
          </View>
        </View>

        {!!metaLine && (
          <Text style={{ fontSize: 10, fontWeight: "700", color: "#94A3B8", marginBottom: 10 }}>{metaLine}</Text>
        )}

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            marginBottom: ad.bookingRef || ad.phone || ad.website ? 12 : 0,
          }}
        >
          <StayTimeInline tone="checkin" label="Check-in" day={checkIn.day} time={checkIn.time} />
          <StayTimeInline tone="checkout" label="Check-out" day={checkOut.day} time={checkOut.time} />
        </View>

        {(ad.bookingRef || ad.phone || ad.website) && (
          <View style={{ borderTopWidth: 1, borderTopColor: "#EEF2F7", paddingTop: 10, gap: 7 }}>
            {!!ad.bookingRef && <ReservationMetaRow icon="key-outline" label="Confirmación" value={ad.bookingRef} />}
            {!!ad.phone && <ReservationMetaRow icon="call-outline" label="Teléfono" value={ad.phone} />}
            {!!ad.website && <ReservationMetaRow icon="globe-outline" label="Web" value={ad.website} />}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function StayTimeInline({
  label,
  day,
  time,
  tone,
}: {
  label: string;
  day: string | null;
  time: string | null;
  tone: "checkin" | "checkout";
}) {
  const accent = tone === "checkin" ? "#16A34A" : "#DC2626";
  const valueColor = tone === "checkin" ? "#166534" : "#991B1B";
  const iconName = tone === "checkin" ? "log-in-outline" : "log-out-outline";
  const iconBg = tone === "checkin" ? "rgba(22,163,74,0.12)" : "rgba(220,38,38,0.10)";

  return (
    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: iconBg,
        }}
      >
        <Ionicons name={iconName} size={14} color={accent} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 9, fontWeight: "800", color: accent, marginBottom: 0, textTransform: "uppercase" }}>
          {label}
        </Text>
        <Text style={{ fontSize: 10, fontWeight: "700", color: "#64748B", marginBottom: 0 }}>{day || "—"}</Text>
        <Text style={{ fontSize: 14, fontWeight: "900", color: valueColor }}>{time || "—"}</Text>
      </View>
    </View>
  );
}

function ReservationMetaRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
      <Ionicons name={icon} size={13} color="#94A3B8" />
      <Text style={{ fontSize: 10, fontWeight: "700", color: "#94A3B8", minWidth: 74 }}>{label}</Text>
      <Text style={{ flex: 1, fontSize: 11, fontWeight: "700", color: "#0F172A" }}>{value}</Text>
    </View>
  );
}
