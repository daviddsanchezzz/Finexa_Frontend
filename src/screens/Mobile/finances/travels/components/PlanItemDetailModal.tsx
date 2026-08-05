// src/screens/Mobile/finances/travels/components/PlanItemDetailModal.tsx
import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Image, Linking, Platform } from "react-native";
import Modal from "react-native-modal";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../../../theme/theme";
import api from "../../../../../api/api";
import { appAlert } from "../../../../../utils/appAlert";
import PdfPreviewModal from "./PdfPreviewModal";

export interface DetailAttachment {
  id?: number;
  kind: string;
  url: string;
  filename?: string | null;
}

export interface DetailPlanItem {
  id: number;
  type: string;
  title: string;
  startAt?: string | null;
  endAt?: string | null;
  location?: string | null;
  notes?: string | null;
  cost?: number | null;
  currency?: string | null;
  flightDetails?: {
    airlineName?: string | null;
    flightNumberIata?: string | null;
    flightNumberRaw?: string | null;
    fromIata?: string | null;
    toIata?: string | null;
    depAt?: string | null;
    arrAt?: string | null;
    gate?: string | null;
    seat?: string | null;
    bookingRef?: string | null;
  } | null;
  accommodationDetails?: {
    name?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    checkInAt?: string | null;
    checkOutAt?: string | null;
    guests?: number | null;
    rooms?: number | null;
    bookingRef?: string | null;
    phone?: string | null;
    website?: string | null;
    coverImageUrl?: string | null;
  } | null;
  destinationTransport?: {
    mode?: string | null;
    company?: string | null;
    bookingRef?: string | null;
    fromName?: string | null;
    toName?: string | null;
    depAt?: string | null;
    arrAt?: string | null;
  } | null;
  attachments?: DetailAttachment[] | null;
  metadata?: { stops?: DetailVisitStop[] } | null;
}

export interface DetailVisitStop {
  id: string;
  label: string;
  stopType: string;
}

const VISIT_STOP_EMOJI: Record<string, string> = {
  comida: "🍽️",
  monumento: "🏛️",
  mirador: "👁️",
  museo: "🖼️",
  teatro: "🎭",
  compras: "🛍️",
  otro: "📍",
};

function visitStopEmoji(stopType: string): string {
  return VISIT_STOP_EMOJI[stopType] ?? "📍";
}

interface Props {
  visible: boolean;
  tripId: number;
  item: DetailPlanItem | null;
  onClose: () => void;
  onEdit: (item: DetailPlanItem) => void;
  onDeleted: () => void;
  cityContext?: string | null;
}

const TYPE_EMOJI: Record<string, string> = {
  flight: "✈️",
  accommodation: "🏨",
  taxi: "🚕",
  museum: "🏛️",
  monument: "🗿",
  viewpoint: "🌅",
  free_tour: "🚶",
  guided_tour: "🗺️",
  concert: "🎵",
  sport: "⚽",
  bar_party: "🍷",
  nightlife: "🌙",
  beach: "🏖️",
  hike: "🥾",
  restaurant: "🍽️",
  cafe: "☕",
  market: "🛒",
  shopping: "🛍️",
  day_trip: "🗺️",
  activity: "⚡",
  expense: "🧾",
  visit: "🚶",
};

function isMobileWeb() {
  if (Platform.OS !== "web") return false;
  const ua = typeof navigator !== "undefined" && navigator.userAgent ? navigator.userAgent : "";
  return /iPhone|iPad|iPod|Android/i.test(ua);
}

function emojiForItem(item: DetailPlanItem): string {
  if (item.type === "transport_destination" || item.type === "transport_local" || item.type === "transport") {
    const mode = item.destinationTransport?.mode;
    if (mode === "train") return "🚂";
    if (mode === "car") return "🚗";
    if (mode === "ferry") return "⛴️";
    return "🚌";
  }
  return TYPE_EMOJI[item.type] ?? "📌";
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

function buildGoogleMapsUrl(query?: string | null) {
  const clean = query?.trim();
  if (!clean) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clean)}`;
}

function buildVisitMapsUrl(stops: DetailVisitStop[], cityContext?: string | null) {
  const queries = stops
    .map((s) => (cityContext ? `${s.label}, ${cityContext}` : s.label))
    .filter((q) => q.trim().length > 0);
  if (queries.length === 0) return null;
  if (queries.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queries[0])}`;
  }
  const origin = queries[0];
  const destination = queries[queries.length - 1];
  const waypoints = queries.slice(1, -1);
  const params = new URLSearchParams({ api: "1", origin, destination, travelmode: "walking" });
  if (waypoints.length > 0) params.set("waypoints", waypoints.join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function formatDuration(startIso?: string | null, endIso?: string | null): string | null {
  if (!startIso || !endIso) return null;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return null;
  const totalMinutes = Math.round((end - start) / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h && m) return `${h}h ${m}min`;
  if (h) return `${h}h`;
  return `${m}min`;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between">
      <Text className="text-gray-500">{label}</Text>
      <Text className="font-medium text-text">{value}</Text>
    </View>
  );
}

function MapsLinkRow({ label, value, url }: { label: string; value: string; url: string | null }) {
  return (
    <TouchableOpacity onPress={() => url && Linking.openURL(url)} disabled={!url} activeOpacity={0.7}>
      <View className="flex-row justify-between">
        <Text className="text-gray-500">{label}</Text>
        <Text
          className="font-medium"
          style={{ color: url ? colors.primary : "#334155", flex: 1, textAlign: "right", marginLeft: 12 }}
        >
          {value}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function PlanItemDetailModal({ visible, tripId, item, onClose, onEdit, onDeleted, cityContext }: Props) {
  const [deleting, setDeleting] = React.useState(false);
  const [previewFile, setPreviewFile] = React.useState<DetailAttachment | null>(null);

  if (!item) return null;

  const openAttachment = async (file: DetailAttachment) => {
    if (file.kind === "pdf") {
      // Móvil web: nada de modal + navegar la propia pestaña al PDF (eso
      // rompe el historial de la SPA — al volver, la app queda en un estado
      // raro). Abrir en pestaña nueva, en el mismo tap (sync, para que el
      // navegador no lo bloquee como popup) — cerrarla te devuelve intacto.
      if (isMobileWeb()) {
        Linking.openURL(file.url).catch(() => {});
        return;
      }
      setPreviewFile(file);
      return;
    }
    try {
      await Linking.openURL(file.url);
    } catch {
      // silencioso: si el link falla, el usuario puede reintentar
    }
  };

  const doDelete = async () => {
    try {
      setDeleting(true);
      await api.delete(`/trips/${tripId}/plan-items/${item.id}`);
      onDeleted();
    } catch {
      setDeleting(false);
      appAlert("Error", "No se pudo eliminar el elemento");
    }
  };

  const handleDeletePress = () => {
    onClose();
    appAlert("Eliminar elemento", "¿Seguro que quieres eliminarlo? Esta acción no se puede deshacer.", [
      { text: "Eliminar", style: "destructive", onPress: doDelete },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const fd = item.flightDetails;
  const ad = item.accommodationDetails;
  const td = item.destinationTransport;
  const dep = fmtDayTime(item.startAt);
  const arr = fmtDayTime(item.endAt);
  const accLocation = ad ? joinText([ad.address, ad.city, ad.country]) : null;
  const mapsUrl = buildGoogleMapsUrl(accLocation || item.location);
  const images = (item.attachments ?? []).filter((f) => f.kind === "image");
  const otherFiles = (item.attachments ?? []).filter((f) => f.kind !== "image");
  const isTransport = ["transport_destination", "transport_local", "transport", "taxi"].includes(item.type);
  const isVisit = item.type === "visit";
  const isOtherType = !["flight", "accommodation"].includes(item.type) && !isTransport && !isVisit;
  const visitStops = item.metadata?.stops ?? [];
  const visitMapsUrl = buildVisitMapsUrl(visitStops, cityContext);
  const locationMapsUrl = buildGoogleMapsUrl(item.location);
  const duration = formatDuration(item.startAt, item.endAt);

  return (
    <>
    <Modal isVisible={visible} onBackdropPress={onClose} onBackButtonPress={onClose} backdropOpacity={0.6} animationIn="fadeInUp" animationOut="fadeOutDown">
      <View className="bg-white rounded-2xl p-6">
        <TouchableOpacity onPress={onClose} style={{ position: "absolute", top: 16, left: 16, padding: 6, zIndex: 1 }}>
          <Ionicons name="close-outline" size={26} color="#555" />
        </TouchableOpacity>

        <View className="items-center mb-6 mt-3">
          {ad?.coverImageUrl ? (
            <View style={{ width: 96, height: 96, borderRadius: 16, overflow: "hidden", marginBottom: 12, backgroundColor: "#F3F4F6" }}>
              {Platform.OS === "web" ? (
                <View
                  style={{
                    width: "100%",
                    height: "100%",
                    backgroundImage: `url(${ad.coverImageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  } as any}
                />
              ) : (
                <Image source={{ uri: ad.coverImageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              )}
            </View>
          ) : (
            <View className="p-3 rounded-xl mb-3" style={{ backgroundColor: "#EFF6FF" }}>
              <Text style={{ fontSize: 28 }}>{emojiForItem(item)}</Text>
            </View>
          )}

          <Text className="text-[17px] font-semibold text-black" style={{ textAlign: "center" }}>
            {item.title}
          </Text>

          {!!(dep.day || dep.time) && (
            <Text className="text-gray-400 text-[13px] mt-1">{joinText([dep.day, dep.time])}</Text>
          )}
        </View>

        {item.cost != null && (
          <Text className="text-center font-bold mb-4" style={{ fontSize: 32 }}>
            {Number(item.cost).toFixed(2).replace(".", ",")} {item.currency || "€"}
          </Text>
        )}

        <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
          <View className="mt-2" style={{ gap: 10 }}>
            {item.type === "flight" && (
              <>
                {!!joinText([fd?.airlineName, fd?.flightNumberIata || fd?.flightNumberRaw]) && (
                  <InfoRow label="Vuelo" value={joinText([fd?.airlineName, fd?.flightNumberIata || fd?.flightNumberRaw])} />
                )}
                {!!(arr.day || arr.time) && <InfoRow label="Llegada" value={joinText([arr.day, arr.time])} />}
                {!!fd?.gate && <InfoRow label="Puerta" value={fd.gate} />}
                {!!fd?.seat && <InfoRow label="Asiento" value={fd.seat} />}
                {!!fd?.bookingRef && <InfoRow label="Confirmación" value={fd.bookingRef} />}
              </>
            )}

            {item.type === "accommodation" && (
              <>
                {(ad?.guests || ad?.rooms) && (
                  <InfoRow
                    label="Huéspedes"
                    value={joinText([
                      ad?.guests ? `${ad.guests} huésped${ad.guests > 1 ? "es" : ""}` : null,
                      ad?.rooms ? `${ad.rooms} habit.` : null,
                    ])}
                  />
                )}
                {!!ad?.checkInAt && <InfoRow label="Check-in" value={joinText([fmtDayTime(ad.checkInAt).day, fmtDayTime(ad.checkInAt).time])} />}
                {!!ad?.checkOutAt && <InfoRow label="Check-out" value={joinText([fmtDayTime(ad.checkOutAt).day, fmtDayTime(ad.checkOutAt).time])} />}
                {!!ad?.bookingRef && <InfoRow label="Confirmación" value={ad.bookingRef} />}
                {!!ad?.phone && <InfoRow label="Teléfono" value={ad.phone} />}
                {!!ad?.website && <InfoRow label="Web" value={ad.website} />}
                {!!accLocation && <MapsLinkRow label="Dirección" value={accLocation} url={mapsUrl} />}
              </>
            )}

            {isTransport && (
              <>
                {!!td?.company && <InfoRow label="Compañía" value={td.company} />}
                {!!(dep.day || dep.time) && <InfoRow label="Salida" value={joinText([dep.day, dep.time])} />}
                {!!(arr.day || arr.time) && <InfoRow label="Llegada" value={joinText([arr.day, arr.time])} />}
                {!!duration && <InfoRow label="Duración" value={duration} />}
                {!!td?.bookingRef && <InfoRow label="Confirmación" value={td.bookingRef} />}
              </>
            )}

            {isVisit && (
              <>
                {!!visitStops.length && (
                  <View style={{ gap: 6 }}>
                    {visitStops.map((stop) => (
                      <View key={stop.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ fontSize: 14 }}>{visitStopEmoji(stop.stopType)}</Text>
                        <Text className="font-medium text-text">{stop.label}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {!!visitMapsUrl && (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(visitMapsUrl)}
                    activeOpacity={0.7}
                    style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}
                  >
                    <Text style={{ fontSize: 12 }}>📍</Text>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>
                      {visitStops.length > 1 ? "Ver ruta en Google Maps" : "Ver ubicación"}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {isOtherType && !!item.location && <MapsLinkRow label="Lugar" value={item.location} url={locationMapsUrl} />}

            {!!item.notes && (
              <View style={{ marginTop: 4 }}>
                <Text className="text-gray-500 mb-1">Notas</Text>
                <Text className="font-medium text-text">{item.notes}</Text>
              </View>
            )}

            {!!(images.length || otherFiles.length) && (
              <View style={{ marginTop: 4 }}>
                <Text className="text-gray-500 mb-2">Documentos</Text>

                {!!images.length && (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: otherFiles.length ? 8 : 0 }}>
                    {images.map((file, index) => (
                      <TouchableOpacity
                        key={file.id ?? `${file.url}-${index}`}
                        onPress={() => openAttachment(file)}
                        activeOpacity={0.85}
                        style={{ width: 72, height: 72, borderRadius: 12, overflow: "hidden", backgroundColor: "#F3F4F6" }}
                      >
                        {Platform.OS === "web" ? (
                          <View
                            style={{
                              width: "100%",
                              height: "100%",
                              backgroundImage: `url(${file.url})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            } as any}
                          />
                        ) : (
                          <Image source={{ uri: file.url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {otherFiles.map((file, index) => (
                  <TouchableOpacity
                    key={file.id ?? `${file.url}-other-${index}`}
                    onPress={() => openAttachment(file)}
                    activeOpacity={0.75}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      marginBottom: index < otherFiles.length - 1 ? 8 : 0,
                    }}
                  >
                    <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                    </View>
                    <Text style={{ flex: 1, fontSize: 13, fontWeight: "700", color: "#0F172A" }} numberOfLines={1}>
                      {file.filename || "Documento"}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: colors.primary }}>
                      {file.kind === "pdf" ? "Ver" : "Abrir"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        <View className="h-[1px] bg-gray-200 my-5" />

        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => {
              onClose();
              onEdit(item);
            }}
            disabled={deleting}
            className="flex-1 bg-gray-100 py-3 rounded-full"
          >
            <Text className="text-center text-black font-semibold">Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDeletePress} disabled={deleting} className="flex-1 bg-red-500 py-3 rounded-full">
            <Text className="text-center text-white font-semibold">{deleting ? "Eliminando…" : "Eliminar"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    <PdfPreviewModal
      visible={!!previewFile}
      url={previewFile?.url ?? null}
      title={previewFile?.filename}
      onClose={() => setPreviewFile(null)}
    />
    </>
  );
}
