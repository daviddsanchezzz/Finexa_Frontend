import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
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

function photoFilename(photo: TripGalleryPhoto) {
  return photo.fileName || `foto-${photo.id}.jpg`;
}

async function shareGalleryPhotos(photos: TripGalleryPhoto[]) {
  if (photos.length === 0) return;

  if (Platform.OS === "web") {
    try {
      const files = await Promise.all(
        photos.map(async (p) => {
          const res = await fetch(p.url);
          const blob = await res.blob();
          return new File([blob], photoFilename(p), { type: blob.type || "image/jpeg" });
        })
      );
      const nav: any = typeof navigator !== "undefined" ? navigator : null;
      if (nav?.canShare?.({ files })) {
        await nav.share({ files });
        return;
      }
      // Fallback: descarga cada archivo
      for (const file of files) {
        const blobUrl = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }
    } catch {
      // silencioso: si falla, el usuario puede reintentar
    }
    return;
  }

  // Nativo: expo-sharing no soporta compartir varios archivos a la vez,
  // así que abrimos la hoja de compartir una vez por foto.
  for (const p of photos) {
    try {
      const localUri = (FileSystem as any).cacheDirectory + photoFilename(p);
      await FileSystem.downloadAsync(p.url, localUri);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localUri);
      }
    } catch {
      // continúa con el resto
    }
  }
}

export default function TripGalleryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { tripId, tripName, destination, startDate, endDate } = route.params || {};

  const { photos, isLoading, createPhotos, deletePhoto } = useTripGallery(tripId);
  const [filter, setFilter] = useState<string>("all"); // "all" | "general" | dateKey
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState<{ images: TripGalleryPhoto[]; index: number } | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

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

  const toggleSelected = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePhotoPress = (sectionPhotos: TripGalleryPhoto[], idx: number) => {
    if (selectionMode) {
      toggleSelected(sectionPhotos[idx].id);
    } else {
      setGalleryIndex({ images: sectionPhotos, index: idx });
    }
  };

  const selectedPhotos = useMemo(
    () => photos.filter((p) => selectedIds.has(p.id)),
    [photos, selectedIds]
  );

  const handleBulkDelete = () => {
    const count = selectedIds.size;
    appAlert("Eliminar fotos", `¿Seguro que quieres eliminar ${count} foto${count === 1 ? "" : "s"}?`, [
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          setBulkBusy(true);
          try {
            await Promise.all(Array.from(selectedIds).map((id) => deletePhoto(id)));
            setSelectedIds(new Set());
          } finally {
            setBulkBusy(false);
          }
        },
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const handleBulkShare = async () => {
    setBulkBusy(true);
    try {
      await shareGalleryPhotos(selectedPhotos);
    } finally {
      setBulkBusy(false);
    }
  };

  const visibleDayKeys = filter === "all" ? populatedDayKeys : filter === "general" ? [] : [filter];
  const showGeneral = filter === "all" || filter === "general";

  const visiblePhotos = useMemo(
    () => [...visibleDayKeys.flatMap((key) => dayGroups.get(key) ?? []), ...(showGeneral ? generalPhotos : [])],
    [visibleDayKeys, dayGroups, showGeneral, generalPhotos]
  );

  const enterSelectionMode = () => setSelectionMode(true);

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const selectAllVisible = () => {
    setSelectedIds(new Set(visiblePhotos.map((p) => p.id)));
  };

  const subtitleLocation = tripName || destination || "";

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 8 }}>
        <TouchableOpacity
          onPress={() => (selectionMode ? exitSelectionMode() : navigation.goBack())}
          style={{ padding: 4 }}
        >
          <Ionicons name={selectionMode ? "close" : "chevron-back"} size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          {selectionMode ? (
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#0F172A" }}>
              {selectedIds.size} seleccionada{selectedIds.size === 1 ? "" : "s"}
            </Text>
          ) : (
            <>
              <Text style={{ fontSize: 20, fontWeight: "900", color: "#0F172A" }}>Galería</Text>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#94A3B8" }}>
                {photos.length} foto{photos.length === 1 ? "" : "s"}{subtitleLocation ? ` · ${subtitleLocation}` : ""}
              </Text>
            </>
          )}
        </View>
        {photos.length > 0 && (
          <TouchableOpacity onPress={selectionMode ? selectAllVisible : enterSelectionMode} style={{ padding: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>
              {selectionMode ? "Seleccionar todas" : "Seleccionar"}
            </Text>
          </TouchableOpacity>
        )}
        {!selectionMode && (
          <TouchableOpacity onPress={openDayPicker} style={{ padding: 4 }}>
            <Ionicons name="add" size={26} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {!selectionMode && showChipBar && (
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

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: selectionMode ? 100 : 40 }} showsVerticalScrollIndicator={false}>
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
                  selectionMode={selectionMode}
                  selectedIds={selectedIds}
                  onAdd={() => uploadTo(key, key)}
                  onPressPhoto={(idx) => handlePhotoPress(dayPhotos, idx)}
                />
              );
            })}

            {showGeneral && (
              <GallerySection
                title="GENERAL DEL VIAJE"
                photos={generalPhotos}
                uploading={uploadingKey === "general"}
                selectionMode={selectionMode}
                selectedIds={selectedIds}
                onAdd={() => uploadTo(null, "general")}
                onPressPhoto={(idx) => handlePhotoPress(generalPhotos, idx)}
              />
            )}
          </>
        )}
      </ScrollView>

      {selectionMode && (
        <View
          style={{
            position: "absolute", left: 0, right: 0, bottom: 0,
            flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28,
            backgroundColor: "white", borderTopWidth: 1, borderTopColor: "#F1F5F9",
          }}
        >
          <TouchableOpacity
            onPress={handleBulkShare}
            disabled={bulkBusy}
            style={{ flex: 1, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", paddingVertical: 13, opacity: bulkBusy ? 0.6 : 1 }}
          >
            <Ionicons name="share-outline" size={18} color="#0F172A" />
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#0F172A" }}>Compartir</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleBulkDelete}
            disabled={bulkBusy}
            style={{ flex: 1, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#FEE2E2", paddingVertical: 13, opacity: bulkBusy ? 0.6 : 1 }}
          >
            {bulkBusy ? <ActivityIndicator color="#DC2626" /> : <Ionicons name="trash-outline" size={18} color="#DC2626" />}
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#DC2626" }}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      )}

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
  photos,
  uploading,
  selectionMode,
  selectedIds,
  onAdd,
  onPressPhoto,
}: {
  title: string;
  photos: TripGalleryPhoto[];
  uploading: boolean;
  selectionMode: boolean;
  selectedIds: Set<number>;
  onAdd: () => void;
  onPressPhoto: (index: number) => void;
}) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
        {title}
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: "1.5%" }}>
        {photos.map((photo, idx) => {
          const selected = selectedIds.has(photo.id);
          return (
            <TouchableOpacity
              key={photo.id}
              onPress={() => onPressPhoto(idx)}
              style={{ width: "32.3%", aspectRatio: 1, borderRadius: 12, overflow: "hidden", marginBottom: 8, backgroundColor: "#F1F5F9" }}
            >
              <Image source={{ uri: photo.url }} style={{ width: "100%", height: "100%", opacity: selectionMode && !selected ? 0.55 : 1 }} resizeMode="cover" />
              {selectionMode && (
                <View
                  style={{
                    position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 11,
                    alignItems: "center", justifyContent: "center",
                    backgroundColor: selected ? colors.primary : "rgba(255,255,255,0.85)",
                    borderWidth: selected ? 0 : 1.5, borderColor: "#CBD5E1",
                  }}
                >
                  {selected && <Ionicons name="checkmark" size={14} color="white" />}
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {!selectionMode && (
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
        )}
      </View>
    </View>
  );
}
