// src/screens/Trips/TravelFormScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../../theme/theme";
import api from "../../../../api/api";
import { pickAndUploadTripCover } from "../../../../utils/uploadTripCover";
import { Image } from "react-native";
import CrossPlatformDateTimePicker from "../../../../components/CrossPlatformDateTimePicker";
import { CountrySelect } from "../../../../components/CountrySelect";
import { appAlert } from "../../../../utils/appAlert";

type TripStatus = "seen" | "planning" | "wishlist";
type DateField = "start" | "end" | null;

interface TripFromApi {
  id: number;
  userId: number;
  name: string;
  destination?: string | null;
  startDate: string;
  endDate: string;
  companions: string[];
  emoji?: string | null;
  budget?: number | null;
  status?: TripStatus | null;
  continent?: string | null;
  year?: number | null;
  cost?: number | null;
  coverImageUrl?: string | null;
}

/* ─── Helpers ─── */
function isValidISODate(iso?: string | null) {
  if (!iso) return false;
  return !Number.isNaN(new Date(iso).getTime());
}
function parseMoney(text: string): number {
  const t = (text || "").trim();
  if (!t) return 0;
  const n = Number(t.replace(/\./g, "").replace(",", ".").replace("€", "").trim());
  return Number.isFinite(n) ? n : 0;
}
function looksLikeCca2(v?: string | null) {
  return /^[A-Za-z]{2}$/.test(String(v || "").trim());
}
function flagEmojiFromISO2(code?: string | null) {
  const c = (code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return "🌍";
  return String.fromCodePoint(...[...c].map(ch => 127397 + ch.charCodeAt(0)));
}
function countryNameEs(code?: string | null) {
  const c = (code || "").trim().toUpperCase();
  if (!c || !/^[A-Z]{2}$/.test(c)) return code || "";
  try { return new Intl.DisplayNames(["es-ES"], { type: "region" }).of(c) || c; }
  catch { return c; }
}
function formatShortDate(d: Date) {
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}
function getCalCells(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1).getDay();
  const offset = first === 0 ? 6 : first - 1;
  const numDays = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= numDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

const POPULAR_DESTINATIONS = [
  { code: "GR", name: "Grecia" },
  { code: "JP", name: "Japón" },
  { code: "MA", name: "Marruecos" },
  { code: "IT", name: "Sicilia" },
];

const COMPANION_OPTIONS = [
  { id: "solo",   label: "Solo",    icon: "person-outline" as const },
  { id: "pareja", label: "Pareja",  icon: "heart-outline" as const },
  { id: "familia",label: "Familia", icon: "people-outline" as const },
  { id: "amigos", label: "Amigos",  icon: "people-circle-outline" as const },
];

/* ─── Edit form (pantalla completa única) ─── */
function EditTripForm({ editTrip, navigation }: { editTrip: TripFromApi; navigation: any }) {
  const [name, setName]           = useState(editTrip.name ?? "");
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [countryName, setCountryName] = useState("");
  const [startDate, setStartDate] = useState<Date>(
    isValidISODate(editTrip.startDate) ? new Date(editTrip.startDate) : new Date()
  );
  const [endDate, setEndDate] = useState<Date>(
    isValidISODate(editTrip.endDate) ? new Date(editTrip.endDate) : new Date()
  );
  const [budgetText, setBudgetText] = useState(editTrip.budget != null ? String(editTrip.budget) : "");
  const [status, setStatus] = useState<TripStatus | null>((editTrip.status as TripStatus) ?? null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(editTrip.coverImageUrl ?? null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [dateField, setDateField] = useState<DateField>(null);

  useEffect(() => {
    const dest = editTrip?.destination ?? null;
    if (!dest) return;
    if (looksLikeCca2(dest)) { setCountryCode(String(dest).toUpperCase()); }
    else { setCountryName(String(dest)); }
  }, [editTrip?.id]);

  const handleConfirmDate = (date: Date) => {
    if (dateField === "start") {
      setStartDate(date);
      if (endDate < date) setEndDate(date);
    } else if (dateField === "end") {
      if (date < startDate) setStartDate(date);
      setEndDate(date);
    }
    setDatePickerVisible(false);
    setDateField(null);
  };

  const days = useMemo(() => {
    const d = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
    return d > 0 ? d : 1;
  }, [startDate, endDate]);

  const handleSave = async () => {
    if (!name.trim()) { appAlert("Falta el nombre", "Añade un nombre para el viaje."); return; }
    try {
      setSaving(true);
      await api.patch(`/trips/${editTrip.id}`, {
        name: name.trim(),
        destination: countryCode ?? undefined,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        budget: budgetText.trim() ? parseMoney(budgetText) : null,
        status: status ?? undefined,
        coverImageUrl: coverImageUrl ?? null,
      });
      navigation.goBack();
    } catch { appAlert("Error", "No se pudo guardar el viaje."); }
    finally { setSaving(false); }
  };

  const handleDelete = () => {
    appAlert("Eliminar viaje", "¿Seguro? Esta acción no se puede deshacer.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => {
        try {
          setDeleting(true);
          await api.delete(`/trips/${editTrip.id}`);
          navigation.goBack();
        } catch { appAlert("Error", "No se pudo eliminar."); }
        finally { setDeleting(false); }
      }},
    ]);
  };

  const statusOptions: { value: TripStatus; label: string }[] = [
    { value: "planning", label: "Organizando" },
    { value: "seen",     label: "Visitado" },
    { value: "wishlist", label: "Por visitar" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F8FC" }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "800", color: "#0F172A" }}>Editar viaje</Text>
        <TouchableOpacity
          onPress={handleDelete}
          disabled={deleting || saving}
          style={{ padding: 4 }}
        >
          {deleting
            ? <ActivityIndicator size="small" color="#EF4444" />
            : <Ionicons name="trash-outline" size={20} color="#EF4444" />
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} showsVerticalScrollIndicator={false}>
        {/* Foto de portada */}
        <TouchableOpacity
          onPress={async () => {
            if (uploadingCover) return;
            setUploadingCover(true);
            try {
              const url = await pickAndUploadTripCover();
              if (url) setCoverImageUrl(url);
            } finally { setUploadingCover(false); }
          }}
          activeOpacity={0.85}
          style={{ height: 140, borderRadius: 18, overflow: "hidden", borderWidth: coverImageUrl ? 0 : 2, borderStyle: "dashed", borderColor: "#CBD5E1", backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center" }}
        >
          {coverImageUrl ? (
            <>
              {Platform.OS === "web"
                // @ts-ignore
                ? <img src={coverImageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <Image source={{ uri: coverImageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              }
              <View style={{ position: "absolute", bottom: 8, right: 8, backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="camera-outline" size={12} color="white" />
                <Text style={{ fontSize: 11, fontWeight: "700", color: "white" }}>Cambiar</Text>
              </View>
            </>
          ) : uploadingCover ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <View style={{ alignItems: "center", gap: 6 }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="camera-outline" size={22} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#64748B" }}>Añadir foto de portada</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Nombre */}
        <View style={{ backgroundColor: "white", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#EEF2F7" }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8", marginBottom: 8 }}>NOMBRE DEL VIAJE</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ej. Navidad en Praga"
            placeholderTextColor="#94A3B8"
            style={{ fontSize: 18, fontWeight: "800", color: "#0F172A", paddingVertical: 0 }}
          />
        </View>

        {/* País */}
        <View style={{ backgroundColor: "white", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#EEF2F7" }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8", marginBottom: 10 }}>DESTINO</Text>
          <CountrySelect
            valueName={countryName}
            valueCode={countryCode}
            onChange={({ name: n, code }: any) => { setCountryName(n); setCountryCode(code); }}
          />
        </View>

        {/* Fechas */}
        <View style={{ backgroundColor: "white", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#EEF2F7" }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8", marginBottom: 10 }}>FECHAS · {days} días</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => { setDateField("start"); setDatePickerVisible(true); }}
              style={{ flex: 1, backgroundColor: "#F8FAFC", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#E5E7EB" }}
            >
              <Text style={{ fontSize: 10, fontWeight: "700", color: "#94A3B8", marginBottom: 4 }}>DESDE</Text>
              <Text style={{ fontSize: 14, fontWeight: "800", color: "#0F172A" }}>{formatShortDate(startDate)}</Text>
            </Pressable>
            <Pressable
              onPress={() => { setDateField("end"); setDatePickerVisible(true); }}
              style={{ flex: 1, backgroundColor: "#F8FAFC", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#E5E7EB" }}
            >
              <Text style={{ fontSize: 10, fontWeight: "700", color: "#94A3B8", marginBottom: 4 }}>HASTA</Text>
              <Text style={{ fontSize: 14, fontWeight: "800", color: "#0F172A" }}>{formatShortDate(endDate)}</Text>
            </Pressable>
          </View>
        </View>

        {/* Estado */}
        <View style={{ backgroundColor: "white", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#EEF2F7" }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8", marginBottom: 10 }}>ESTADO</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {statusOptions.map(o => {
              const active = status === o.value;
              return (
                <TouchableOpacity
                  key={o.value}
                  onPress={() => setStatus(active ? null : o.value)}
                  style={{
                    flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: "center",
                    backgroundColor: active ? colors.primary : "#F8FAFC",
                    borderWidth: 1, borderColor: active ? colors.primary : "#E5E7EB",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: active ? "white" : "#64748B" }}>{o.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Presupuesto */}
        <View style={{ backgroundColor: "white", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#EEF2F7" }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8", marginBottom: 10 }}>PRESUPUESTO ESTIMADO</Text>
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 12, paddingHorizontal: 14, height: 48, borderWidth: 1, borderColor: "#E5E7EB" }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#94A3B8", marginRight: 6 }}>€</Text>
            <TextInput
              value={budgetText}
              onChangeText={setBudgetText}
              placeholder="0"
              placeholderTextColor="#CBD5E1"
              keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
              style={{ flex: 1, fontSize: 18, fontWeight: "800", color: "#0F172A", paddingVertical: 0 }}
            />
          </View>
        </View>

        {/* Guardar */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || deleting}
          activeOpacity={0.9}
          style={{
            height: 52, borderRadius: 16, backgroundColor: colors.primary,
            alignItems: "center", justifyContent: "center",
            opacity: saving || deleting ? 0.7 : 1,
          }}
        >
          {saving
            ? <ActivityIndicator size="small" color="white" />
            : <Text style={{ fontSize: 15, fontWeight: "800", color: "white" }}>Guardar cambios</Text>
          }
        </TouchableOpacity>

        <View style={{ height: 16 }} />
      </ScrollView>

      <CrossPlatformDateTimePicker
        isVisible={datePickerVisible}
        mode="date"
        date={(dateField === "end" ? endDate : startDate) ?? new Date()}
        onConfirm={handleConfirmDate}
        onCancel={() => { setDatePickerVisible(false); setDateField(null); }}
      />
    </SafeAreaView>
  );
}

/* ─── Create wizard ─── */
export default function TripFormScreen({ route, navigation }: any) {
  const editTrip: TripFromApi | undefined = route?.params?.editTrip;
  if (editTrip) return <EditTripForm editTrip={editTrip} navigation={navigation} />;

  return <CreateTripWizard navigation={navigation} />;
}

function CreateTripWizard({ navigation }: { navigation: any }) {
  const [step, setStep]               = useState<1 | 2 | 3 | 4>(1);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [countryName, setCountryName] = useState("");
  const [searchQ, setSearchQ]         = useState("");
  const [startDate, setStartDate]     = useState<Date | null>(null);
  const [endDate, setEndDate]         = useState<Date | null>(null);
  const [datePreset, setDatePreset]   = useState<"week" | "custom">("custom");
  const [travelers, setTravelers]     = useState(1);
  const [tripName, setTripName]       = useState("");
  const [companion, setCompanion]     = useState<string | null>(null);
  const [budgetText, setBudgetText]     = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving]             = useState(false);
  const [createdTrip, setCreatedTrip] = useState<{ id: number; name: string } | null>(null);
  const [datePickerTarget, setDatePickerTarget] = useState<"start" | "end" | null>(null);

  // Calendar
  const [calDate, setCalDate] = useState(() => new Date());
  const calYear  = calDate.getFullYear();
  const calMonth = calDate.getMonth();
  const calCells = useMemo(() => getCalCells(calYear, calMonth), [calYear, calMonth]);

  const days = useMemo(() => {
    if (!startDate || !endDate) return null;
    const d = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
    return d > 0 ? d : 1;
  }, [startDate, endDate]);

  const selectedCountryLabel = countryCode ? countryNameEs(countryCode) : countryName;

  const handleCalDay = (day: number) => {
    const date = new Date(calYear, calMonth, day);
    setDatePreset("custom");
    if (!startDate || (startDate && endDate)) {
      setStartDate(date);
      setEndDate(null);
    } else if (date < startDate) {
      setStartDate(date);
      setEndDate(null);
    } else {
      setEndDate(date);
    }
  };

  const isDaySelected = (day: number) => {
    const date = new Date(calYear, calMonth, day);
    if (!startDate) return false;
    if (!endDate) return date.toDateString() === startDate.toDateString();
    return date >= startDate && date <= endDate;
  };
  const isDayStart = (day: number) => startDate && new Date(calYear, calMonth, day).toDateString() === startDate.toDateString();
  const isDayEnd   = (day: number) => endDate   && new Date(calYear, calMonth, day).toDateString() === endDate.toDateString();
  const isDayInRange = (day: number) => {
    if (!startDate || !endDate) return false;
    const date = new Date(calYear, calMonth, day);
    return date > startDate && date < endDate;
  };

  const applyPreset = (preset: "week") => {
    const today = new Date();
    const end = new Date(today); end.setDate(today.getDate() + 6);
    setStartDate(today); setEndDate(end);
    setDatePreset("week");
    setCalDate(today);
  };

  const handleCreate = async () => {
    if (!tripName.trim()) { appAlert("Falta el nombre", "Añade un nombre."); return; }
    if (!countryCode && !countryName) { appAlert("Falta el destino", "Selecciona un país."); return; }
    try {
      setSaving(true);
      const res = await api.post("/trips", {
        name: tripName.trim(),
        destination: countryCode ?? undefined,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        budget: budgetText.trim() ? parseMoney(budgetText) : null,
        status: "planning",
        coverImageUrl: coverImageUrl ?? undefined,
      });
      setCreatedTrip({ id: res.data.id, name: res.data.name });
      setStep(4);
    } catch { appAlert("Error", "No se pudo crear el viaje."); }
    finally { setSaving(false); }
  };

  const progress = (step - 1) / 3;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      {/* Progress bar */}
      <View style={{ height: 3, backgroundColor: "#EEF2FF" }}>
        <View style={{ height: 3, backgroundColor: colors.primary, width: `${progress * 100}%` }} />
      </View>

      {/* ── PASO 1: ¿A dónde vas? ── */}
      {step === 1 && (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {[1,2,3].map(n => (
                <View key={n} style={{ width: n === step ? 20 : 6, height: 6, borderRadius: 3, backgroundColor: n === step ? colors.primary : "#E2E8F0" }} />
              ))}
            </View>
          </View>

          <Text style={{ fontSize: 26, fontWeight: "900", color: "#0F172A" }}>¿A dónde vas?</Text>

          {/* Búsqueda */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#F8FAFC", borderRadius: 16, paddingHorizontal: 14, height: 48, borderWidth: 1, borderColor: "#E5E7EB" }}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <TextInput
              value={searchQ}
              onChangeText={setSearchQ}
              placeholder="Ciudad, región o país..."
              placeholderTextColor="#CBD5E1"
              style={{ flex: 1, fontSize: 15, color: "#0F172A", paddingVertical: 0 }}
            />
          </View>

          {/* Populares */}
          {!searchQ && (
            <View>
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#94A3B8", letterSpacing: 0.8, marginBottom: 12 }}>
                POPULARES ESTA TEMPORADA
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {POPULAR_DESTINATIONS.map(dest => {
                  const selected = countryCode === dest.code;
                  return (
                    <TouchableOpacity
                      key={dest.code}
                      onPress={() => { setCountryCode(dest.code); setCountryName(dest.name); setTripName(dest.name); }}
                      activeOpacity={0.85}
                      style={{
                        width: "47%", aspectRatio: 1.1,
                        borderRadius: 18, overflow: "hidden",
                        borderWidth: selected ? 2.5 : 0,
                        borderColor: selected ? colors.primary : "transparent",
                      }}
                    >
                      <View style={{
                        flex: 1, backgroundColor: selected ? "#EEF2FF" : "#F1F5F9",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        <Text style={{ fontSize: 52 }}>{flagEmojiFromISO2(dest.code)}</Text>
                      </View>
                      <View style={{ backgroundColor: selected ? colors.primary : "#0F172A", paddingVertical: 8, alignItems: "center" }}>
                        <Text style={{ fontSize: 13, fontWeight: "800", color: "white" }}>{dest.name}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Country select cuando buscan */}
          <View>
            <Text style={{ fontSize: 11, fontWeight: "800", color: "#94A3B8", letterSpacing: 0.8, marginBottom: 10 }}>
              {searchQ ? "RESULTADO" : "OTRO DESTINO"}
            </Text>
            <CountrySelect
              valueName={countryName}
              valueCode={countryCode}
              onChange={({ name: n, code }: any) => {
                setCountryCode(code);
                setCountryName(n);
                if (!tripName) setTripName(n);
              }}
            />
          </View>

          {/* Continuar */}
          <TouchableOpacity
            onPress={() => {
              if (!countryCode && !countryName.trim()) {
                appAlert("Selecciona un destino", "Elige a dónde quieres viajar.");
                return;
              }
              setStep(2);
            }}
            activeOpacity={0.9}
            style={{
              height: 52, borderRadius: 16, backgroundColor: colors.primary,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "800", color: "white" }}>Continuar</Text>
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* ── PASO 2: ¿Cuándo viajas? ── */}
      {step === 2 && (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={() => setStep(1)} style={{ padding: 4, marginRight: 12 }}>
              <Ionicons name="chevron-back" size={22} color={colors.primary} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: "#94A3B8", fontWeight: "700" }}>
                {selectedCountryLabel || "Tu destino"}
              </Text>
              <Text style={{ fontSize: 22, fontWeight: "900", color: "#0F172A" }}>¿Cuándo viajas?</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {[1,2,3].map(n => (
                <View key={n} style={{ width: n === step ? 20 : 6, height: 6, borderRadius: 3, backgroundColor: n === step ? colors.primary : "#E2E8F0" }} />
              ))}
            </View>
          </View>

          {/* Presets */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[
              { id: "week",    label: "Una semana" },
              { id: "custom",  label: "A medida" },
            ].map(p => {
              const active = datePreset === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => {
                    if (p.id === "week") applyPreset("week");
                    else setDatePreset("custom");
                  }}
                  activeOpacity={0.8}
                  style={{
                    flex: 1, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center",
                    backgroundColor: active ? colors.primary : "#F1F5F9",
                    borderWidth: 1, borderColor: active ? colors.primary : "#E5E7EB",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: active ? "white" : "#374151" }}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Dates selected preview */}
          {(startDate || endDate) && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#EEF2FF", borderRadius: 14, padding: 12 }}>
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary, flex: 1 }}>
                {startDate ? formatShortDate(startDate) : "—"} → {endDate ? formatShortDate(endDate) : "elige fin"}
                {days ? `  ·  ${days} días` : ""}
              </Text>
              <TouchableOpacity onPress={() => { setStartDate(null); setEndDate(null); setDatePreset("custom"); }}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          )}

          {/* Calendario */}
          <View style={{ backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#E5E7EB", padding: 14 }}>
            {/* Nav mes */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <TouchableOpacity
                onPress={() => setCalDate(new Date(calYear, calMonth - 1, 1))}
                style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="chevron-back" size={16} color="#374151" />
              </TouchableOpacity>
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A" }}>
                {capitalize(new Date(calYear, calMonth).toLocaleDateString("es-ES", { month: "long", year: "numeric" }))}
              </Text>
              <TouchableOpacity
                onPress={() => setCalDate(new Date(calYear, calMonth + 1, 1))}
                style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="chevron-forward" size={16} color="#374151" />
              </TouchableOpacity>
            </View>

            {/* Cabecera días */}
            <View style={{ flexDirection: "row", marginBottom: 4 }}>
              {["L","M","X","J","V","S","D"].map(d => (
                <View key={d} style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>{d}</Text>
                </View>
              ))}
            </View>

            {/* Grid */}
            {Array.from({ length: calCells.length / 7 }, (_, wi) => (
              <View key={wi} style={{ flexDirection: "row" }}>
                {calCells.slice(wi * 7, wi * 7 + 7).map((day, di) => {
                  const inRange = day != null && isDayInRange(day);
                  const isStart = day != null && isDayStart(day);
                  const isEnd   = day != null && isDayEnd(day);
                  const isSel   = day != null && isDaySelected(day);
                  const showLeftRange = !!day && (inRange || isEnd);
                  const showRightRange = !!day && (inRange || isStart);
                  return (
                    <TouchableOpacity
                      key={di}
                      onPress={() => day && handleCalDay(day)}
                      disabled={!day}
                      style={{
                        flex: 1, height: 40, alignItems: "center", justifyContent: "center",
                        position: "relative",
                      }}
                    >
                      {day != null ? (
                        <>
                          {showLeftRange ? (
                            <View
                              pointerEvents="none"
                              style={{
                                position: "absolute",
                                left: 0,
                                right: "50%",
                                top: 4,
                                bottom: 4,
                                backgroundColor: "#EEF2FF",
                              }}
                            />
                          ) : null}
                          {showRightRange ? (
                            <View
                              pointerEvents="none"
                              style={{
                                position: "absolute",
                                left: "50%",
                                right: 0,
                                top: 4,
                                bottom: 4,
                                backgroundColor: "#EEF2FF",
                              }}
                            />
                          ) : null}
                        </>
                      ) : null}
                      {day != null ? (
                        <View style={{
                          width: 34, height: 34, borderRadius: 17,
                          backgroundColor: isSel && !inRange ? colors.primary : "transparent",
                          alignItems: "center", justifyContent: "center",
                        }}>
                          <Text style={{
                            fontSize: 13,
                            fontWeight: isSel ? "800" : "500",
                            color: (isSel && !inRange) ? "white" : inRange ? colors.primary : "#0F172A",
                          }}>
                            {day}
                          </Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Viajeros */}
          <View style={{ backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#E5E7EB", padding: 14 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8", marginBottom: 12 }}>VIAJEROS</Text>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#0F172A" }}>
                {travelers} {travelers === 1 ? "viajero" : "viajeros"}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <TouchableOpacity
                  onPress={() => setTravelers(t => Math.max(1, t - 1))}
                  style={{ width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center", justifyContent: "center" }}
                >
                  <Ionicons name="remove" size={18} color="#374151" />
                </TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: "900", color: "#0F172A", minWidth: 22, textAlign: "center" }}>{travelers}</Text>
                <TouchableOpacity
                  onPress={() => setTravelers(t => t + 1)}
                  style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}
                >
                  <Ionicons name="add" size={18} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Continuar */}
          <TouchableOpacity
            onPress={() => {
              if (!startDate) { appAlert("Elige fechas", "Selecciona al menos la fecha de inicio."); return; }
              if (!endDate) setEndDate(startDate);
              setStep(3);
            }}
            activeOpacity={0.9}
            style={{ height: 52, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ fontSize: 15, fontWeight: "800", color: "white" }}>Continuar</Text>
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* ── PASO 3: Últimos detalles ── */}
      {step === 3 && (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={() => setStep(2)} style={{ padding: 4, marginRight: 12 }}>
              <Ionicons name="chevron-back" size={22} color={colors.primary} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 22, fontWeight: "900", color: "#0F172A" }}>Últimos detalles</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {[1,2,3].map(n => (
                <View key={n} style={{ width: n === step ? 20 : 6, height: 6, borderRadius: 3, backgroundColor: n === step ? colors.primary : "#E2E8F0" }} />
              ))}
            </View>
          </View>

          {/* Foto de portada */}
          <TouchableOpacity
            onPress={async () => {
              if (uploadingCover) return;
              setUploadingCover(true);
              try {
                const url = await pickAndUploadTripCover();
                if (url) setCoverImageUrl(url);
              } finally {
                setUploadingCover(false);
              }
            }}
            activeOpacity={0.85}
            style={{
              height: 160, borderRadius: 20, overflow: "hidden",
              borderWidth: coverImageUrl ? 0 : 2, borderStyle: "dashed",
              borderColor: "#CBD5E1", backgroundColor: "#F8FAFC",
              alignItems: "center", justifyContent: "center",
            }}
          >
            {coverImageUrl ? (
              <>
                <Image source={{ uri: coverImageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                <View style={{ position: "absolute", bottom: 10, right: 10, backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="camera-outline" size={12} color="white" />
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "white" }}>Cambiar</Text>
                </View>
              </>
            ) : uploadingCover ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <View style={{ alignItems: "center", gap: 8 }}>
                <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="camera-outline" size={24} color={colors.primary} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#64748B" }}>Añadir foto de portada</Text>
                <Text style={{ fontSize: 12, color: "#94A3B8" }}>Toca para elegir de tu galería</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Nombre */}
          <View style={{ backgroundColor: "white", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#EEF2F7" }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8", marginBottom: 8 }}>NOMBRE DEL VIAJE</Text>
            <TextInput
              value={tripName}
              onChangeText={setTripName}
              placeholder="Ej. Vacaciones en Sicilia"
              placeholderTextColor="#CBD5E1"
              style={{ fontSize: 18, fontWeight: "800", color: "#0F172A", paddingVertical: 0 }}
              autoFocus
            />
          </View>

          {/* ¿Con quién viajas? */}
          <View style={{ backgroundColor: "white", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#EEF2F7" }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8", marginBottom: 12 }}>¿CON QUIÉN VIAJAS?</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {COMPANION_OPTIONS.map(o => {
                const active = companion === o.id;
                return (
                  <TouchableOpacity
                    key={o.id}
                    onPress={() => setCompanion(active ? null : o.id)}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 6,
                      paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12,
                      backgroundColor: active ? colors.primary : "#F8FAFC",
                      borderWidth: 1, borderColor: active ? colors.primary : "#E5E7EB",
                    }}
                  >
                    <Ionicons name={o.icon} size={14} color={active ? "white" : "#64748B"} />
                    <Text style={{ fontSize: 13, fontWeight: "700", color: active ? "white" : "#374151" }}>{o.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Presupuesto */}
          <View style={{ backgroundColor: "white", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#EEF2F7" }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8", marginBottom: 10 }}>PRESUPUESTO ESTIMADO</Text>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 12, paddingHorizontal: 14, height: 48, borderWidth: 1, borderColor: "#E5E7EB" }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#94A3B8", marginRight: 6 }}>€</Text>
              <TextInput
                value={budgetText}
                onChangeText={setBudgetText}
                placeholder="450"
                placeholderTextColor="#CBD5E1"
                keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
                style={{ flex: 1, fontSize: 18, fontWeight: "800", color: "#0F172A", paddingVertical: 0 }}
              />
            </View>
          </View>

          {/* Crear */}
          <TouchableOpacity
            onPress={handleCreate}
            disabled={saving}
            activeOpacity={0.9}
            style={{
              height: 54, borderRadius: 16, backgroundColor: colors.primary,
              alignItems: "center", justifyContent: "center",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving
              ? <ActivityIndicator size="small" color="white" />
              : <Text style={{ fontSize: 15, fontWeight: "800", color: "white" }}>Crear viaje</Text>
            }
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* ── PASO 4: ¡Viaje creado! ── */}
      {step === 4 && (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 24 }}>
          {/* Check */}
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="checkmark" size={46} color="#16A34A" />
          </View>

          <View style={{ alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 26, fontWeight: "900", color: "#0F172A" }}>¡Viaje creado!</Text>
            <Text style={{ fontSize: 14, color: "#64748B", textAlign: "center" }}>
              {createdTrip?.name ?? tripName} ya está en tu lista de viajes
            </Text>
          </View>

          {/* Preview card */}
          {countryCode && (
            <View style={{
              width: "100%", backgroundColor: "#F8FAFC", borderRadius: 20, padding: 16,
              flexDirection: "row", alignItems: "center", gap: 14,
              borderWidth: 1, borderColor: "#EEF2F7",
            }}>
              <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 36 }}>{flagEmojiFromISO2(countryCode)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "800", color: "#0F172A" }}>{createdTrip?.name ?? tripName}</Text>
                <Text style={{ fontSize: 13, color: "#94A3B8", marginTop: 3 }}>
                  {startDate ? formatShortDate(startDate) : "—"}{endDate && endDate.toDateString() !== startDate?.toDateString() ? ` – ${formatShortDate(endDate)}` : ""}
                  {travelers > 1 ? ` · ${travelers} viajeros` : ""}
                </Text>
              </View>
            </View>
          )}

          {/* Botones */}
          <View style={{ width: "100%", gap: 10 }}>
            <TouchableOpacity
              onPress={() => {
                if (createdTrip?.id) {
                  navigation.replace("TripDetail", { tripId: createdTrip.id });
                } else {
                  navigation.goBack();
                }
              }}
              activeOpacity={0.9}
              style={{ height: 52, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontSize: 15, fontWeight: "800", color: "white" }}>Ver mi viaje</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
              style={{ height: 52, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#64748B" }}>Volver a viajes</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
