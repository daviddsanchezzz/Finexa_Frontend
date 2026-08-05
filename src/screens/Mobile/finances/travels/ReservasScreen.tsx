import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, Platform, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { colors } from "../../../../theme/theme";
import PlanItemDetailModal from "./components/PlanItemDetailModal";

type ReservaFilter = "all" | "flight" | "accommodation" | "other";

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

interface DestinationTransportDetails {
  mode?: string | null;
  company?: string | null;
  bookingRef?: string | null;
  fromName?: string | null;
  toName?: string | null;
  depAt?: string | null;
  arrAt?: string | null;
}

interface PlanItemAttachment {
  id?: number;
  kind: string;
  url: string;
  filename?: string | null;
}

interface TripPlanItem {
  id: number;
  type: string;
  title: string;
  tripId?: number;
  startAt?: string | null;
  endAt?: string | null;
  cost?: number | string | null;
  notes?: string | null;
  isReservation?: boolean | null;
  flightDetails?: FlightDetails | null;
  accommodationDetails?: AccommodationDetails | null;
  destinationTransport?: DestinationTransportDetails | null;
  attachments?: PlanItemAttachment[] | null;
}

function emojiForPlanItem(item: TripPlanItem): string {
  if (item.type === "flight") return "✈️";
  if (item.type === "accommodation") return "🏨";
  if (item.type === "taxi") return "🚕";
  if (item.type === "transport_destination" || item.type === "transport_local" || item.type === "transport") {
    const mode = item.destinationTransport?.mode;
    if (mode === "train") return "🚂";
    if (mode === "car") return "🚗";
    if (mode === "ferry") return "⛴️";
    return "🚌";
  }
  if (item.type === "restaurant" || item.type === "cafe") return "🍽️";
  if (item.type === "activity" || item.type === "guided_tour" || item.type === "free_tour") return "🎟️";
  return "📌";
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

function buildGoogleMapsUrl(query?: string | null) {
  const clean = query?.trim();
  if (!clean) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clean)}`;
}

export default function ReservasScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { tripId } = route.params || {};

  const [filter, setFilter] = useState<ReservaFilter>("all");
  const [items, setItems] = useState<TripPlanItem[]>(route.params?.planItems ?? []);
  const [detailItem, setDetailItem] = useState<TripPlanItem | null>(null);

  const reservations = useMemo(
    () => items.filter((item) => item.isReservation === true),
    [items]
  );

  const filtered = useMemo(() => {
    if (filter === "flight") return reservations.filter((item) => item.type === "flight");
    if (filter === "accommodation") return reservations.filter((item) => item.type === "accommodation");
    if (filter === "other") return reservations.filter((item) => item.type !== "flight" && item.type !== "accommodation");
    return reservations;
  }, [reservations, filter]);

  const openItem = (item: TripPlanItem) => setDetailItem(item);

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
          { key: "other", label: "Otras" },
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

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 8 }} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 48, gap: 8 }}>
            <Ionicons name="briefcase-outline" size={40} color="#CBD5E1" />
            <Text style={{ fontSize: 13, color: "#94A3B8", textAlign: "center" }}>
              No hay reservas marcadas en este viaje todavía. Marca "Es una reserva" al crear o editar un elemento del itinerario para verlo aquí.
            </Text>
          </View>
        ) : (
          filtered.map((item) =>
            item.type === "flight" ? (
              <FlightReservationCard key={item.id} item={item} onPress={() => openItem(item)} />
            ) : item.type === "accommodation" ? (
              <AccommodationReservationCard key={item.id} item={item} onPress={() => openItem(item)} />
            ) : (
              <GenericReservationCard key={item.id} item={item} onPress={() => openItem(item)} />
            )
          )
        )}
      </ScrollView>

      <PlanItemDetailModal
        visible={!!detailItem}
        tripId={tripId}
        item={detailItem as any}
        onClose={() => setDetailItem(null)}
        onEdit={(it) => {
          setDetailItem(null);
          navigation.navigate("TripPlanForm", { tripId, planItem: it });
        }}
        onDeleted={() => {
          setItems((prev) => prev.filter((i) => i.id !== detailItem?.id));
          setDetailItem(null);
        }}
      />
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

  const hasFooter = !!(fd.gate || fd.seat || fd.bookingRef);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={{ borderRadius: 14, overflow: "hidden", backgroundColor: "#0B1220" }}>
      <View
        style={{
          backgroundColor: "#0F172A",
          paddingHorizontal: 13,
          paddingTop: 10,
          paddingBottom: 10,
        }}
      >
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

function AccommodationReservationCard({ item, onPress }: { item: TripPlanItem; onPress: () => void }) {
  const ad = item.accommodationDetails || {};
  const checkIn = fmtDayTime(ad.checkInAt);
  const checkOut = fmtDayTime(ad.checkOutAt);
  const title = ad.name || item.title;
  const location = joinText([ad.address, ad.city, ad.country]);
  const mapsUrl = buildGoogleMapsUrl(location);
  const metaLine = joinText([
    ad.guests ? `${ad.guests} huésped${ad.guests > 1 ? "es" : ""}` : null,
    ad.rooms ? `${ad.rooms} habit.` : null,
  ]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{ backgroundColor: "white", borderRadius: 14, borderWidth: 1, borderColor: "#E8EEF7", overflow: "hidden" }}
    >
      <View style={{ flexDirection: "row" }}>
        {!!ad.coverImageUrl && (
          Platform.OS === "web" ? (
            <View
              style={{
                width: 64,
                alignSelf: "stretch",
                backgroundImage: `url(${ad.coverImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              } as any}
            />
          ) : (
            <Image source={{ uri: ad.coverImageUrl }} style={{ width: 64, alignSelf: "stretch" }} resizeMode="cover" />
          )
        )}

        <View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "900", color: "#0F172A" }} numberOfLines={1}>{title}</Text>
              {!!location && (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={(event: any) => {
                    event?.stopPropagation?.();
                    if (mapsUrl) void Linking.openURL(mapsUrl);
                  }}
                  disabled={!mapsUrl}
                  style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}
                >
                  <Ionicons name="location-outline" size={11} color={mapsUrl ? colors.primary : "#64748B"} />
                  <Text style={{ flex: 1, fontSize: 10, fontWeight: "700", color: mapsUrl ? colors.primary : "#64748B" }} numberOfLines={1}>
                    {location}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <Ionicons name="bed-outline" size={16} color="#2563EB" />
          </View>

          {!!metaLine && (
            <Text style={{ fontSize: 10, fontWeight: "700", color: "#94A3B8", marginBottom: 6 }}>{metaLine}</Text>
          )}

          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <StayTimeInline tone="checkin" label="Check-in" day={checkIn.day} time={checkIn.time} />
            <StayTimeInline tone="checkout" label="Check-out" day={checkOut.day} time={checkOut.time} />
          </View>

          {!!ad.bookingRef && (
            <Text style={{ fontSize: 10, fontWeight: "700", color: "#94A3B8", marginTop: 6 }} numberOfLines={1}>
              Confirmación · {ad.bookingRef}
            </Text>
          )}
        </View>
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
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: iconBg,
        }}
      >
        <Ionicons name={iconName} size={11} color={accent} />
      </View>

      <View>
        <Text style={{ fontSize: 8, fontWeight: "800", color: accent, textTransform: "uppercase" }}>
          {label}
        </Text>
        <Text style={{ fontSize: 11, fontWeight: "900", color: valueColor }}>
          {day || "—"} {time ? `· ${time}` : ""}
        </Text>
      </View>
    </View>
  );
}

function GenericReservationCard({ item, onPress }: { item: TripPlanItem; onPress: () => void }) {
  const td = item.destinationTransport;
  const dep = fmtDayTime(item.startAt);
  const attachmentCount = item.attachments?.length ?? 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{ backgroundColor: "white", borderRadius: 14, borderWidth: 1, borderColor: "#E8EEF7", overflow: "hidden" }}
    >
      <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#EFF6FF",
            }}
          >
            <Text style={{ fontSize: 14 }}>{emojiForPlanItem(item)}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "900", color: "#0F172A" }} numberOfLines={1}>{item.title}</Text>
            {!!(dep.day || dep.time) && (
              <Text style={{ fontSize: 10, fontWeight: "700", color: "#94A3B8", marginTop: 1 }} numberOfLines={1}>
                {joinText([dep.day, dep.time])}
              </Text>
            )}
          </View>

          {attachmentCount > 0 && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Ionicons name="attach-outline" size={14} color="#94A3B8" />
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#94A3B8" }}>{attachmentCount}</Text>
            </View>
          )}
        </View>

        {!!(td?.company || td?.bookingRef) && (
          <Text style={{ fontSize: 10, fontWeight: "700", color: "#94A3B8", marginTop: 6 }} numberOfLines={1}>
            {joinText([td?.company, td?.bookingRef ? `Ref. ${td.bookingRef}` : null])}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
