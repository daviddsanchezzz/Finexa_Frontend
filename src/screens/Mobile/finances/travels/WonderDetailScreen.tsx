import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import api from "../../../../api/api";
import { colors } from "../../../../theme/theme";
import { useWonders } from "../../../../hooks/useWonders";
import { pickAndUploadWonderPhoto } from "../../../../utils/uploadTripCover";

interface TripOption {
  id: number;
  name: string;
  startDate: string | null;
}

const MONTH_LABELS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const NO_TRIP = -1;

const pickerWrapStyle = {
  backgroundColor: "#F8FAFC",
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#E5E7EB",
  overflow: "hidden" as const,
};

const pickerStyle = {
  height: 44,
  fontSize: 14,
  color: "#0F172A",
  backgroundColor: "transparent",
  borderWidth: 0,
  paddingHorizontal: 10,
};

function currentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

function monthYearFromISO(iso: string | null) {
  if (!iso) return currentMonthYear();
  const d = new Date(iso);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

export default function WonderDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { wonderKey } = route.params || {};

  const { wonders, isLoading, updateWonder, isSaving } = useWonders();
  const wonder = wonders.find((w) => w.key === wonderKey);

  const [visited, setVisited] = useState(false);
  const [visitedMonth, setVisitedMonth] = useState(currentMonthYear().month);
  const [visitedYear, setVisitedYear] = useState(currentMonthYear().year);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [tripId, setTripId] = useState<number | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!wonder) return;
    setVisited(wonder.visited);
    const { month, year } = monthYearFromISO(wonder.visitedAt);
    setVisitedMonth(month);
    setVisitedYear(year);
    setPhotoUrl(wonder.photoUrl);
    setTripId(wonder.tripId);
  }, [wonder]);

  const tripsQuery = useQuery({
    queryKey: ["tripsByCountry", wonder?.country],
    queryFn: async () =>
      (await api.get("/trips", { params: { country: wonder!.country } })).data as TripOption[],
    enabled: !!wonder?.country,
    staleTime: 1000 * 30,
  });

  if (isLoading || !wonder) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F8FC" }}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  const handlePickPhoto = async () => {
    if (uploadingPhoto) return;
    setUploadingPhoto(true);
    try {
      const url = await pickAndUploadWonderPhoto();
      if (url) setPhotoUrl(url);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSelectTrip = (value: number) => {
    if (value === NO_TRIP) {
      setTripId(null);
      return;
    }
    setTripId(value);
    // Vincular un viaje implica que la maravilla se visitó: se marca como
    // visitada y se toma el mes/año del viaje automáticamente.
    setVisited(true);
    const trip = (tripsQuery.data ?? []).find((t) => t.id === value);
    if (trip?.startDate) {
      const { month, year } = monthYearFromISO(trip.startDate);
      setVisitedMonth(month);
      setVisitedYear(year);
    }
  };

  const handleSave = async () => {
    const visitedAt = visited
      ? `${visitedYear}-${String(visitedMonth).padStart(2, "0")}-01`
      : undefined;
    await updateWonder(wonderKey, {
      visited,
      visitedAt,
      photoUrl: visited ? photoUrl ?? undefined : undefined,
      tripId: visited ? tripId ?? undefined : undefined,
    });
    navigation.goBack();
  };

  const years = Array.from({ length: 60 }, (_, i) => currentMonthYear().year - i);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F8FC" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, gap: 8 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "900", color: "#0F172A" }}>{wonder.name}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, gap: 16 }}>
        <TouchableOpacity
          onPress={handlePickPhoto}
          activeOpacity={0.85}
          style={{
            height: 180, borderRadius: 16, backgroundColor: "#F3F4F6",
            borderWidth: 1, borderColor: "#E5E7EB", borderStyle: "dashed",
            alignItems: "center", justifyContent: "center", overflow: "hidden",
          }}
        >
          {uploadingPhoto ? (
            <ActivityIndicator color={colors.primary} />
          ) : photoUrl ? (
            <Image source={{ uri: photoUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          ) : (
            <>
              <Ionicons name="image-outline" size={28} color="#9CA3AF" />
              <Text style={{ fontSize: 12, color: "#6B7280", fontWeight: "600", marginTop: 6 }}>
                Añadir tu foto en {wonder.name}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View
          style={{
            flexDirection: "row", alignItems: "center", justifyContent: "space-between",
            backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#F3F4F6",
            paddingHorizontal: 16, paddingVertical: 14,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#0F172A" }}>Marcar como visitada</Text>
          <Switch value={visited} onValueChange={setVisited} trackColor={{ false: "#E5E7EB", true: colors.primary }} />
        </View>

        {visited && (
          <>
            <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#F3F4F6", padding: 14 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8", marginBottom: 8 }}>
                MES Y AÑO DE LA VISITA
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1.4, ...pickerWrapStyle }}>
                  <Picker
                    selectedValue={visitedMonth}
                    onValueChange={(v) => setVisitedMonth(Number(v))}
                    style={pickerStyle}
                  >
                    {MONTH_LABELS.map((label, index) => (
                      <Picker.Item key={label} label={label} value={index + 1} />
                    ))}
                  </Picker>
                </View>
                <View style={{ flex: 1, ...pickerWrapStyle }}>
                  <Picker
                    selectedValue={visitedYear}
                    onValueChange={(v) => setVisitedYear(Number(v))}
                    style={pickerStyle}
                  >
                    {years.map((year) => (
                      <Picker.Item key={year} label={String(year)} value={year} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#F3F4F6", padding: 14 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8", marginBottom: 8 }}>
                VINCULAR A UN VIAJE (OPCIONAL)
              </Text>
              <View style={pickerWrapStyle}>
                <Picker
                  selectedValue={tripId ?? NO_TRIP}
                  onValueChange={(v) => handleSelectTrip(Number(v))}
                  style={pickerStyle}
                >
                  <Picker.Item label="Ninguno seleccionado" value={NO_TRIP} />
                  {(tripsQuery.data ?? []).map((t) => (
                    <Picker.Item key={t.id} label={t.name} value={t.id} />
                  ))}
                </Picker>
              </View>
            </View>
          </>
        )}

        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.85}
          style={{
            backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 14,
            alignItems: "center", opacity: isSaving ? 0.6 : 1,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "800", color: "white" }}>
            {isSaving ? "Guardando..." : "Guardar"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
