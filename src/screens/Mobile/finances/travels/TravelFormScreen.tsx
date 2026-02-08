// src/screens/Trips/TripFormScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../../theme/theme";
import api from "../../../../api/api";
import CrossPlatformDateTimePicker from "../../../../components/CrossPlatformDateTimePicker";
import { CountrySelect } from "../../../../components/CountrySelect";

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

  // opcional (si lo tienes en backend)
  status?: TripStatus | null;
  continent?: string | null;
  year?: number | null;
  cost?: number | null;
}

function useUiScaleMobile() {
  const { width } = Dimensions.get("window");
  const s = Math.max(0.92, Math.min(1.08, width / 390));
  const px = (n: number) => Math.round(n * s);
  return { px, width };
}

function isValidISODate(iso?: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  return !Number.isNaN(d.getTime());
}

function formatDate(d: Date) {
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function parseCompanions(text: string): string[] {
  return (text || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseMoney(text: string): number {
  const t = (text || "").trim();
  if (!t) return 0;
  const normalized = t.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function looksLikeCca2(v?: string | null) {
  const s = String(v || "").trim();
  return /^[A-Za-z]{2}$/.test(s);
}

const STATUS_OPTIONS: { value: TripStatus; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "planning", label: "Planificando", icon: "construct-outline" },
  { value: "wishlist", label: "Lista de deseos", icon: "heart-outline" },
  { value: "seen", label: "Visto", icon: "checkmark-circle-outline" },
];

function Chip({
  active,
  icon,
  label,
  onPress,
  px,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  px: (n: number) => number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        height: px(36),
        paddingHorizontal: px(12),
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? "rgba(15,23,42,0.14)" : "rgba(148,163,184,0.25)",
        backgroundColor: active ? "#0F172A" : "white",
        flexDirection: "row",
        alignItems: "center",
        gap: px(8),
      }}
    >
      <Ionicons name={icon} size={px(16)} color={active ? "white" : "#475569"} />
      <Text style={{ fontSize: px(12), fontWeight: "900", color: active ? "white" : "#0F172A" }}>{label}</Text>
    </Pressable>
  );
}

function FieldCard({
  title,
  hint,
  children,
  px,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  px: (n: number) => number;
}) {
  return (
    <View
      style={{
        borderRadius: px(22),
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.22)",
        padding: px(14),
        shadowColor: "#0B1220",
        shadowOpacity: 0.05,
        shadowRadius: px(14),
        shadowOffset: { width: 0, height: px(8) },
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <Text style={{ fontSize: px(13), fontWeight: "900", color: "#0F172A" }}>{title}</Text>
        {!!hint && <Text style={{ fontSize: px(11), fontWeight: "800", color: "#94A3B8" }}>{hint}</Text>}
      </View>
      <View style={{ marginTop: px(12) }}>{children}</View>
    </View>
  );
}

function InputRow({
  icon,
  children,
  px,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  px: (n: number) => number;
}) {
  return (
    <View
      style={{
        minHeight: px(44),
        borderRadius: px(16),
        backgroundColor: "rgba(15,23,42,0.04)",
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.22)",
        paddingHorizontal: px(12),
        paddingVertical: px(10),
        flexDirection: "row",
        alignItems: "center",
        gap: px(10),
      }}
    >
      <Ionicons name={icon} size={px(16)} color="#64748B" />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

export default function TripFormScreen({ route, navigation }: any) {
  const { px } = useUiScaleMobile();

  const editTrip: TripFromApi | undefined = route?.params?.editTrip;
  const isEditing = !!editTrip;

  const [name, setName] = useState(editTrip?.name ?? "");

  // destination as ISO2 internally (to align with desktop)
  const [countryName, setCountryName] = useState("");
  const [countryCode, setCountryCode] = useState<string | null>(null);


  const [startDate, setStartDate] = useState<Date>(
    editTrip?.startDate && isValidISODate(editTrip.startDate) ? new Date(editTrip.startDate) : new Date()
  );
  const [endDate, setEndDate] = useState<Date>(
    editTrip?.endDate && isValidISODate(editTrip.endDate) ? new Date(editTrip.endDate) : new Date()
  );

  const [companionsText, setCompanionsText] = useState(editTrip?.companions?.join(", ") ?? "");
  const [budgetText, setBudgetText] = useState(editTrip?.budget == null ? "" : String(editTrip.budget));

  // ✅ new on mobile (matching desktop)
  const [status, setStatus] = useState<TripStatus | null>((editTrip?.status as TripStatus) ?? null);
  const [continent, setContinent] = useState<string | null>(editTrip?.continent ?? null);
  const [costText, setCostText] = useState(editTrip?.cost == null ? "" : String(editTrip.cost));

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [dateField, setDateField] = useState<DateField>(null);

  // init country from existing destination (if editing)
  useEffect(() => {
    const dest = editTrip?.destination ?? null;
    if (!dest) return;

    if (looksLikeCca2(dest)) {
      setCountryCode(String(dest).toUpperCase());
      setCountryName("");
    } else {
      // fallback (if old data stored as text)
      setCountryCode(null);
      setCountryName(String(dest));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTrip?.id]);

  const openDatePicker = (field: DateField) => {
    setDateField(field);
    setDatePickerVisible(true);
  };
  const closeDatePicker = () => {
    setDatePickerVisible(false);
    setDateField(null);
  };
  const handleConfirmDate = (date: Date) => {
    if (dateField === "start") {
      setStartDate(date);
      if (endDate < date) setEndDate(date);
      if (!endDate) setEndDate(date);
    } else if (dateField === "end") {
      setEndDate(date);
      if (!startDate) setStartDate(date);
    }
    closeDatePicker();
  };

  const durationLabel = useMemo(() => {
    if (!startDate || !endDate) return null;
    const s = new Date(startDate);
    const e = new Date(endDate);
    s.setHours(0, 0, 0, 0);
    e.setHours(0, 0, 0, 0);
    const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
    return `${days} días`;
  }, [startDate, endDate]);

  const validate = () => {
    if (!name.trim()) {
      Alert.alert("Falta el nombre", "Añade un nombre para el viaje.");
      return false;
    }
    if (!(countryCode || "").trim()) {
      Alert.alert("Falta el país", "Selecciona un país.");
      return false;
    }
    if (!startDate || !endDate) {
      Alert.alert("Fechas incompletas", "Indica fechas de inicio y fin.");
      return false;
    }
    if (endDate < startDate) {
      Alert.alert("Rango inválido", "La fecha de fin no puede ser anterior a la de inicio.");
      return false;
    }
    const cost = costText.trim() ? parseMoney(costText) : 0;
    if (cost < 0) {
      Alert.alert("Coste inválido", "El coste no puede ser negativo.");
      return false;
    }
    const b = budgetText.trim() ? parseMoney(budgetText) : 0;
    if (b < 0) {
      Alert.alert("Presupuesto inválido", "El presupuesto no puede ser negativo.");
      return false;
    }
    return true;
  };

  const payload = useMemo(() => {
    const companionsArray = parseCompanions(companionsText);
    const cost = costText.trim() ? parseMoney(costText) : 0;
    const budget = budgetText.trim() ? parseMoney(budgetText) : null;

    return {
      name: name.trim(),
      destination: (countryCode || "").trim() || null,

      startDate,
      endDate,

      companions: companionsArray,

      // ✅ aligned with desktop
      status: status ?? null,
      continent: continent ?? null,
      cost,
      budget,
    };
  }, [name, countryCode, startDate, endDate, companionsText, status, continent, costText, budgetText]);

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      if (isEditing && editTrip) {
        await api.patch(`/trips/${editTrip.id}`, payload);
      } else {
        await api.post("/trips", payload);
      }
      navigation.goBack();
    } catch (err) {
      console.error("❌ Error al guardar viaje:", err);
      Alert.alert("Error", "Ha ocurrido un error al guardar el viaje. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editTrip || deleting) return;

    Alert.alert("Eliminar viaje", "¿Seguro que quieres eliminar este viaje? Esta acción no se puede deshacer.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            setDeleting(true);
            await api.delete(`/trips/${editTrip.id}`);
            navigation.goBack();
          } catch (err) {
            console.error("❌ Error al eliminar viaje:", err);
            Alert.alert("Error", "Ha ocurrido un error al eliminar el viaje. Inténtalo de nuevo.");
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const CONTINENTS: { key: string; label: string }[] = [
    { key: "europe", label: "Europa" },
    { key: "africa", label: "África" },
    { key: "asia", label: "Asia" },
    { key: "north_america", label: "N. América" },
    { key: "south_america", label: "S. América" },
    { key: "oceania", label: "Oceanía" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F8FC" }}>
      {/* HEADER */}
      <View style={{ paddingHorizontal: px(16), paddingTop: px(10), paddingBottom: px(10) }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: px(10) }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: px(10), flex: 1 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: px(6), paddingVertical: px(4) }}>
              <Ionicons name="chevron-back" size={px(24)} color={colors.primary} />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: px(16), fontWeight: "900", color: "#0F172A" }}>
                {isEditing ? "Editar viaje" : "Nuevo viaje"}
              </Text>
              <Text style={{ marginTop: px(2), fontSize: px(12), fontWeight: "800", color: "#94A3B8" }}>
                Destino, país, fechas y detalles.
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: px(10) }}>
            {isEditing && (
              <TouchableOpacity
                onPress={handleDelete}
                disabled={deleting || saving}
                style={{
                  width: px(40),
                  height: px(40),
                  borderRadius: px(14),
                  borderWidth: 1,
                  borderColor: "rgba(239,68,68,0.30)",
                  backgroundColor: "rgba(239,68,68,0.10)",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: deleting || saving ? 0.6 : 1,
                }}
              >
                {deleting ? <ActivityIndicator size="small" color="#DC2626" /> : <Ionicons name="trash-outline" size={px(18)} color="#DC2626" />}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || deleting}
              style={{
                height: px(40),
                paddingHorizontal: px(14),
                borderRadius: 999,
                backgroundColor: "#0F172A",
                opacity: saving || deleting ? 0.75 : 1,
                flexDirection: "row",
                alignItems: "center",
                gap: px(8),
              }}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="save-outline" size={px(18)} color="#FFFFFF" />
              )}
              <Text style={{ fontSize: px(12), fontWeight: "900", color: "white" }}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: px(16), paddingBottom: px(28), gap: px(12) }}
      >
        {/* HERO: emoji + name */}
        <View
          style={{
            borderRadius: px(22),
            backgroundColor: "white",
            borderWidth: 1,
            borderColor: "rgba(148,163,184,0.22)",
            padding: px(14),
            shadowColor: "#0B1220",
            shadowOpacity: 0.06,
            shadowRadius: px(16),
            shadowOffset: { width: 0, height: px(10) },
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: px(12) }}>


            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: px(11), fontWeight: "900", color: "#94A3B8", letterSpacing: 0.6 }}>
                NOMBRE DEL VIAJE
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ej. Navidad en Praga"
                placeholderTextColor="#94A3B8"
                style={{
                  marginTop: px(6),
                  fontSize: px(16),
                  fontWeight: "900",
                  color: "#0F172A",
                  paddingVertical: 0,
                }}
              />
              <View style={{ marginTop: px(8) }}>
                <InputRow icon="happy-outline" px={px}>
                  <TextInput
                    placeholder=""
                    placeholderTextColor="#94A3B8"
                    style={{ fontSize: px(14), fontWeight: "900", color: "#0F172A", paddingVertical: 0 }}
                  />
                </InputRow>
              </View>
            </View>
          </View>
        </View>

        {/* PAÍS */}
        <FieldCard title="País" hint="obligatorio" px={px}>
          <View style={{ marginTop: px(4) }}>
            <CountrySelect
              valueName={countryName}
              valueCode={countryCode}
              onChange={({ name, code }: any) => {
                setCountryName(name);
                setCountryCode(code);
              }}
            />
            {!!countryCode && (
              <View style={{ marginTop: px(10), flexDirection: "row", alignItems: "center", gap: px(8) }}>
                <Ionicons name="checkmark-circle-outline" size={px(16)} color="#059669" />
                <Text style={{ fontSize: px(12), fontWeight: "900", color: "#059669" }}>
                  {countryCode.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </FieldCard>

        {/* ESTADO */}
        <FieldCard title="Estado" hint="opcional" px={px}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: px(8), paddingRight: px(6) }}>
            <Chip
              active={status === null}
              icon="remove-circle-outline"
              label="Sin estado"
              onPress={() => setStatus(null)}
              px={px}
            />
            {STATUS_OPTIONS.map((o) => (
              <Chip
                key={o.value}
                active={status === o.value}
                icon={o.icon}
                label={o.label}
                onPress={() => setStatus(o.value)}
                px={px}
              />
            ))}
          </ScrollView>
        </FieldCard>

        {/* FECHAS */}
        <FieldCard title="Fechas" hint={durationLabel ? `Duración: ${durationLabel}` : "obligatorio"} px={px}>
          <View style={{ flexDirection: "row", gap: px(10) }}>
            <Pressable
              onPress={() => openDatePicker("start")}
              style={{
                flex: 1,
                borderRadius: px(18),
                borderWidth: 1,
                borderColor: "rgba(148,163,184,0.22)",
                backgroundColor: "rgba(15,23,42,0.04)",
                paddingHorizontal: px(12),
                paddingVertical: px(12),
                flexDirection: "row",
                alignItems: "center",
                gap: px(10),
              }}
            >
              <Ionicons name="calendar-outline" size={px(16)} color="#64748B" />
              <View>
                <Text style={{ fontSize: px(11), fontWeight: "900", color: "#94A3B8" }}>DESDE</Text>
                <Text style={{ marginTop: px(3), fontSize: px(13), fontWeight: "900", color: "#0F172A" }}>
                  {formatDate(startDate)}
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => openDatePicker("end")}
              style={{
                flex: 1,
                borderRadius: px(18),
                borderWidth: 1,
                borderColor: "rgba(148,163,184,0.22)",
                backgroundColor: "rgba(15,23,42,0.04)",
                paddingHorizontal: px(12),
                paddingVertical: px(12),
                flexDirection: "row",
                alignItems: "center",
                gap: px(10),
              }}
            >
              <Ionicons name="calendar-outline" size={px(16)} color="#64748B" />
              <View>
                <Text style={{ fontSize: px(11), fontWeight: "900", color: "#94A3B8" }}>HASTA</Text>
                <Text style={{ marginTop: px(3), fontSize: px(13), fontWeight: "900", color: "#0F172A" }}>
                  {formatDate(endDate)}
                </Text>
              </View>
            </Pressable>
          </View>

          <View style={{ marginTop: px(10), flexDirection: "row", gap: px(10) }}>
            <Pressable
              onPress={() => {
                setStartDate(new Date());
                setEndDate(new Date());
              }}
              style={{
                flex: 1,
                height: px(40),
                borderRadius: px(14),
                borderWidth: 1,
                borderColor: "rgba(148,163,184,0.22)",
                backgroundColor: "white",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: px(12), fontWeight: "900", color: "#0F172A" }}>Hoy</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                // clear: set to today but treat as filled (your backend expects dates)
                const now = new Date();
                setStartDate(now);
                setEndDate(now);
              }}
              style={{
                flex: 1,
                height: px(40),
                borderRadius: px(14),
                borderWidth: 1,
                borderColor: "rgba(148,163,184,0.22)",
                backgroundColor: "white",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: px(12), fontWeight: "900", color: "#0F172A" }}>Reset</Text>
            </Pressable>
          </View>
        </FieldCard>

        {/* CONTINENTE */}
        <FieldCard title="Continente" hint="opcional" px={px}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: px(8), paddingRight: px(6) }}>
            <Chip
              active={continent === null}
              icon="remove-circle-outline"
              label="Sin continente"
              onPress={() => setContinent(null)}
              px={px}
            />
            {CONTINENTS.map((c) => (
              <Chip
                key={c.key}
                active={continent === c.key}
                icon="earth-outline"
                label={c.label}
                onPress={() => setContinent(c.key)}
                px={px}
              />
            ))}
          </ScrollView>
        </FieldCard>

        {/* COSTE + PRESUPUESTO */}
        <View style={{ flexDirection: "row", gap: px(12) }}>
          <View style={{ flex: 1 }}>
            <FieldCard title="Coste" hint="€ (opcional)" px={px}>
              <InputRow icon="cash-outline" px={px}>
                <TextInput
                  value={costText}
                  onChangeText={setCostText}
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
                  style={{ fontSize: px(14), fontWeight: "900", color: "#0F172A", paddingVertical: 0 }}
                />
              </InputRow>
            </FieldCard>
          </View>

          <View style={{ flex: 1 }}>
            <FieldCard title="Presupuesto" hint="€ (opcional)" px={px}>
              <InputRow icon="wallet-outline" px={px}>
                <TextInput
                  value={budgetText}
                  onChangeText={setBudgetText}
                  placeholder="300"
                  placeholderTextColor="#94A3B8"
                  keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
                  style={{ fontSize: px(14), fontWeight: "900", color: "#0F172A", paddingVertical: 0 }}
                />
              </InputRow>
            </FieldCard>
          </View>
        </View>

        {/* COMPAÑEROS */}
        <FieldCard title="Compañeros" hint="separados por comas" px={px}>
          <View
            style={{
              borderRadius: px(18),
              backgroundColor: "rgba(15,23,42,0.04)",
              borderWidth: 1,
              borderColor: "rgba(148,163,184,0.22)",
              paddingHorizontal: px(12),
              paddingVertical: px(10),
            }}
          >
            <TextInput
              value={companionsText}
              onChangeText={setCompanionsText}
              placeholder="Ej. Juan, María, Ana"
              placeholderTextColor="#94A3B8"
              multiline
              style={{
                minHeight: px(58),
                fontSize: px(13),
                fontWeight: "800",
                color: "#0F172A",
                textAlignVertical: "top",
              }}
            />
          </View>
        </FieldCard>

        {/* bottom spacer so FAB-like header doesn't overlap */}
        <View style={{ height: px(8) }} />
      </ScrollView>

      <CrossPlatformDateTimePicker
        isVisible={datePickerVisible}
        mode="date"
        date={(dateField === "end" ? endDate : startDate) ?? new Date()}
        onConfirm={handleConfirmDate}
        onCancel={closeDatePicker}
      />
    </SafeAreaView>
  );
}
