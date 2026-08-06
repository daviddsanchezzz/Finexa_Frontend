import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { colors } from "../../../../theme/theme";
import { useTripGallery, type TripGalleryPhoto } from "../../../../hooks/useTripGallery";
import { pickAndUploadTripAttachments } from "../../../../utils/uploadTripAttachments";
import { appAlert, type AppAlertButton } from "../../../../utils/appAlert";
import ImageGalleryModal from "./components/ImageGalleryModal";

const GALLERY_FOLDER = "trip-gallery-photos";
const GALLERY_ACCEPT = "image/*";

interface TripDay {
  index: number;
  dateKey: string; // "YYYY-MM-DD"
}

function computeTripDays(startDate?: string | null, endDate?: string | null): TripDay[] {
  if (!startDate || !endDate) return [];
  const start = new Date(`${startDate.slice(0, 10)}T00:00:00Z`).getTime();
  const end = new Date(`${endDate.slice(0, 10)}T00:00:00Z`).getTime();
  if (isNaN(start) || isNaN(end) || end < start) return [];
  const days: TripDay[] = [];
  let i = 1;
  for (let t = start; t <= end && i <= 60; t += 86400000, i++) {
    days.push({ index: i, dateKey: new Date(t).toISOString().slice(0, 10) });
  }
  return days;
}

function dayLabel(dateKey: string) {
  const d = new Date(`${dateKey}T00:00:00Z`);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", timeZone: "UTC" });
}

export default function TripGalleryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { tripId, tripName, destination, startDate, endDate } = route.params || {};

  const { photos, isLoading, createPhotos, deletePhoto } = useTripGallery(tripId);
  const [filter, setFilter] = useState<string>("all"); // "all" | "general" | dateKey
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState<{ images: TripGalleryPhoto[]; index: number } | null>(null);

  const tripDays = useMemo(() => computeTripDays(startDate, endDate), [startDate, endDate]);

  const dayGroups = useMemo(() => {
    const map = new Map<string, TripGalleryPhoto[]>();
    for (const p of photos) {
      if (!p.dayDate) continue;
      const key = p.dayDate.slice(0, 10);
      const arr = map.get(key);
      if (arr) arr.push(p);
      else map.set(key, [p]);
    }
    return map;
  }, [photos]);

  const generalPhotos = useMemo(() => photos.filter((p) => !p.dayDate), [photos]);

  const populatedDayKeys = useMemo(
    () => Array.from(dayGroups.keys()).sort(),
    [dayGroups]
  );

  const chipCount = populatedDayKeys.length + (generalPhotos.length > 0 ? 1 : 0);
  const showChipBar = chipCount > 1;

  const uploadTo = async (dayDate: string | null, key: string) => {
    setUploadingKey(key);
    try {
      const uploaded = await pickAndUploadTripAttachments({ folder: GALLERY_FOLDER, accept: GALLERY_ACCEPT });
      if (uploaded.length) {
        await createPhotos(
          uploaded.map((f) => ({ url: f.url, fileName: f.filename, mimeType: f.mimeType, dayDate }))
        );
      }
    } catch {
      appAlert("No se pudieron subir las fotos", "Inténtalo de nuevo.");
    } finally {
      setUploadingKey(null);
    }
  };

  const openDayPicker = () => {
    const buttons: AppAlertButton[] = tripDays.map((d) => ({
      text: `Día ${d.index} · ${dayLabel(d.dateKey)}`,
      onPress: () => uploadTo(d.dateKey, d.dateKey),
    }));
    buttons.push({ text: "General del viaje", onPress: () => uploadTo(null, "general") });
    buttons.push({ text: "Cancelar", style: "cancel" });
    if (tripDays.length === 0) {
      uploadTo(null, "general");
      return;
    }
    appAlert("¿Fotos de qué día?", undefined, buttons);
  };

  const confirmDelete = (photo: TripGalleryPhoto) => {
    appAlert("Eliminar foto", "¿Seguro que quieres eliminarla?", [
      { text: "Eliminar", style: "destructive", onPress: () => deletePhoto(photo.id) },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const visibleDayKeys = filter === "all" ? populatedDayKeys : filter === "general" ? [] : [filter];
  const showGeneral = filter === "all" || filter === "general";

  const subtitleLocation = tripName || destination || "";

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 8 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: "900", color: "#0F172A" }}>Galería</Text>
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#94A3B8" }}>
            {photos.length} foto{photos.length === 1 ? "" : "s"}{subtitleLocation ? ` · ${subtitleLocation}` : ""}
          </Text>
        </View>
        <TouchableOpacity onPress={openDayPicker} style={{ padding: 4 }}>
          <Ionicons name="add" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {showChipBar && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, marginBottom: 12 }}
        >
          <Chip label="Todos los días" active={filter === "all"} onPress={() => setFilter("all")} />
          {populatedDayKeys.map((key, i) => (
            <Chip
              key={key}
              label={`Día ${tripDays.find((d) => d.dateKey === key)?.index ?? i + 1}`}
              active={filter === key}
              onPress={() => setFilter(key)}
            />
          ))}
          {generalPhotos.length > 0 && (
            <Chip label="General" active={filter === "general"} onPress={() => setFilter("general")} />
          )}
        </ScrollView>
      )}

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {visibleDayKeys.map((key) => {
              const dayMeta = tripDays.find((d) => d.dateKey === key);
              const dayPhotos = dayGroups.get(key) ?? [];
              return (
                <GallerySection
                  key={key}
                  title={`DÍA ${dayMeta?.index ?? ""} · ${dayLabel(key)}`}
                  photos={dayPhotos}
                  uploading={uploadingKey === key}
                  onAdd={() => uploadTo(key, key)}
                  onOpenPhoto={(idx) => setGalleryIndex({ images: dayPhotos, index: idx })}
                  onDeletePhoto={confirmDelete}
                />
              );
            })}

            {showGeneral && (
              <GallerySection
                title="GENERAL DEL VIAJE"
                badge="sin enlazar"
                photos={generalPhotos}
                uploading={uploadingKey === "general"}
                onAdd={() => uploadTo(null, "general")}
                onOpenPhoto={(idx) => setGalleryIndex({ images: generalPhotos, index: idx })}
                onDeletePhoto={confirmDelete}
              />
            )}
          </>
        )}
      </ScrollView>

      {galleryIndex && (
        <ImageGalleryModal
          visible
          images={galleryIndex.images.map((p) => ({ id: p.id, url: p.url, filename: p.fileName }))}
          initialIndex={galleryIndex.index}
          onClose={() => setGalleryIndex(null)}
        />
      )}
    </SafeAreaView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        height: 36,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: active ? colors.primary : "#F8FAFC",
        borderWidth: 1,
        borderColor: active ? colors.primary : "#EEF2F7",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: "700", color: active ? "white" : "#6B7280" }}>{label}</Text>
    </TouchableOpacity>
  );
}

function GallerySection({
  title,
  badge,
  photos,
  uploading,
  onAdd,
  onOpenPhoto,
  onDeletePhoto,
}: {
  title: string;
  badge?: string;
  photos: TripGalleryPhoto[];
  uploading: boolean;
  onAdd: () => void;
  onOpenPhoto: (index: number) => void;
  onDeletePhoto: (photo: TripGalleryPhoto) => void;
}) {
  return (
    <View style={{ marginBottom: 24 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.8 }}>
          {title}
        </Text>
        {!!badge && (
          <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: "#EFF6FF" }}>
            <Text style={{ fontSize: 9, fontWeight: "800", color: colors.primary }}>{badge}</Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: "1.5%" }}>
        {photos.map((photo, idx) => (
          <TouchableOpacity
            key={photo.id}
            onPress={() => onOpenPhoto(idx)}
            onLongPress={() => onDeletePhoto(photo)}
            style={{ width: "32.3%", aspectRatio: 1, borderRadius: 12, overflow: "hidden", marginBottom: 8, backgroundColor: "#F1F5F9" }}
          >
            <Image source={{ uri: photo.url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          onPress={onAdd}
          disabled={uploading}
          style={{
            width: "32.3%", aspectRatio: 1, borderRadius: 12, marginBottom: 8,
            borderWidth: 1.5, borderColor: "#DBEAFE", borderStyle: "dashed",
            alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC", opacity: uploading ? 0.6 : 1,
          }}
        >
          {uploading ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="add" size={26} color={colors.primary} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}
