// src/components/DesktopTripModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CountrySelect } from "./CountrySelect";

import api from "../api/api";
import { colors } from "../theme/theme";
import { textStyles, typography } from "../theme/typography";
import CrossPlatformDateTimePicker from "./CrossPlatformDateTimePicker";

export type TripStatus = "seen" | "planning" | "wishlist";

export type TripFromApi = {
  id: number;
  userId?: number;

  name: string;
  destination?: string | null;

  startDate: string | null;
  endDate: string | null;

  continent?: string | null;
  year?: number | null;

  companions: string[];

  // opcionales
  status?: TripStatus | null;
  cost?: number | null;
};

type DateField = "start" | "end" | null;

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

function looksLikeCca2(v?: string | null) {
  const s = String(v || "").trim();
  return /^[A-Za-z]{2}$/.test(s);
}

function parseMoney(text: string): number {
  const t = (text || "").trim();
  if (!t) return 0;
  const normalized = t.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

/** Web input */
function InputWeb({
  value,
  onChange,
  placeholder,
  multiline,
  height,
  inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  height?: number;
  inputMode?: "text" | "numeric";
}) {
  if (Platform.OS !== "web") {
    return <Text style={[textStyles.bodyMuted, { color: "#94A3B8" }]}>(Solo web)</Text>;
  }

  if (multiline) {
    // @ts-ignore
    return (
      <textarea
        value={value}
        onChange={(e: any) => onChange(e?.target?.value ?? "")}
        placeholder={placeholder}
        style={{
          width: "100%",
          border: "none",
          outline: "none",
          background: "transparent",
          fontFamily: typography.family.base,
          fontWeight: 600,
          fontSize: 13,
          color: "#0F172A",
          resize: "none",
          height: height ?? 90,
          lineHeight: "18px",
        }}
      />
    );
  }

  // @ts-ignore
  return (
    <input
      value={value}
      onChange={(e: any) => onChange(e?.target?.value ?? "")}
      placeholder={placeholder}
      inputMode={inputMode === "numeric" ? "numeric" : "text"}
      style={{
        width: "100%",
        border: "none",
        outline: "none",
        background: "transparent",
        fontFamily: typography.family.base,
        fontWeight: 600,
        fontSize: 13,
        color: "#0F172A",
      }}
    />
  );
}

function Banner({
  tone,
  title,
  desc,
  onClose,
}: {
  tone: "danger" | "success" | "info";
  title: string;
  desc?: string;
  onClose?: () => void;
}) {
  const palette =
    tone === "danger"
      ? {
          bg: "rgba(239,68,68,0.10)",
          bd: "rgba(239,68,68,0.20)",
          fg: "#991B1B",
          ic: "alert-circle-outline" as const,
        }
      : tone === "success"
      ? {
          bg: "rgba(34,197,94,0.10)",
          bd: "rgba(34,197,94,0.20)",
          fg: "#166534",
          ic: "checkmark-circle-outline" as const,
        }
      : {
          bg: "rgba(59,130,246,0.10)",
          bd: "rgba(59,130,246,0.20)",
          fg: "#1E3A8A",
          ic: "information-circle-outline" as const,
        };

  return (
    <View
      style={{
        borderRadius: 12,
        borderWidth: 1,
        borderColor: palette.bd,
        backgroundColor: palette.bg,
        padding: 12,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
      }}
    >
      <Ionicons name={palette.ic} size={18} color={palette.fg} />
      <View style={{ flex: 1 }}>
        <Text style={[textStyles.body, { fontWeight: "700", color: palette.fg, fontSize: 13 }]}>{title}</Text>
        {!!desc && (
          <Text style={[textStyles.caption, { marginTop: 3, fontWeight: "600", color: palette.fg }]}>{desc}</Text>
        )}
      </View>
      {!!onClose && (
        <TouchableOpacity activeOpacity={0.9} onPress={onClose}>
          <Ionicons name="close" size={18} color={palette.fg} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function ActionBtn({
  tone,
  icon,
  label,
  onPress,
  loading,
  disabled,
}: {
  tone: "primary" | "danger" | "ghost";
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const style =
    tone === "primary"
      ? { bg: colors.primary, bd: colors.primary, fg: "white" }
      : tone === "danger"
      ? { bg: "rgba(239,68,68,0.10)", bd: "rgba(239,68,68,0.25)", fg: "#B91C1C" }
      : { bg: "white", bd: "#E5E7EB", fg: "#334155" };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      disabled={disabled || loading}
      style={{
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: style.bd,
        backgroundColor: style.bg,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        opacity: disabled || loading ? 0.7 : 1,
        paddingHorizontal: 14,
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={tone === "primary" ? "#FFFFFF" : (style.fg as any)} />
      ) : (
        <Ionicons name={icon} size={18} color={style.fg as any} />
      )}
      <Text style={[textStyles.button, { fontSize: 12, fontWeight: "700", color: style.fg as any }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginTop: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <Text style={[textStyles.labelMuted, { fontSize: 12 }]}>{label}</Text>
        {!!hint && <Text style={[textStyles.caption, { fontWeight: "600", color: "#94A3B8" }]}>{hint}</Text>}
      </View>

      <View
        style={{
          marginTop: 8,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          backgroundColor: "#FFFFFF",
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        {children}
      </View>
    </View>
  );
}

/** Status options (ES) */
const STATUS_OPTIONS: { value: TripStatus; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "planning", label: "Planificando", icon: "construct-outline" },
  { value: "wishlist", label: "Lista de deseos", icon: "heart-outline" },
  { value: "seen", label: "Visto", icon: "checkmark-circle-outline" },
];

function StatusPills({
  value,
  onChange,
}: {
  value: TripStatus | null;
  onChange: (v: TripStatus | null) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onChange(null)}
        style={{
          height: 34,
          paddingHorizontal: 12,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: value === null ? "rgba(59,130,246,0.35)" : "#E5E7EB",
          backgroundColor: value === null ? "rgba(59,130,246,0.10)" : "#F8FAFC",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
        }}
      >
        <Ionicons name="remove-circle-outline" size={16} color={value === null ? colors.primary : "#64748B"} />
        <Text style={[textStyles.caption, { fontWeight: "600", color: value === null ? colors.primary : "#334155" }]}>
          Sin estado
        </Text>
      </TouchableOpacity>

      {STATUS_OPTIONS.map((o) => {
        const selected = value === o.value;
        return (
          <TouchableOpacity
            key={o.value}
            activeOpacity={0.9}
            onPress={() => onChange(o.value)}
            style={{
              height: 34,
              paddingHorizontal: 12,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: selected ? "rgba(59,130,246,0.35)" : "#E5E7EB",
              backgroundColor: selected ? "rgba(59,130,246,0.10)" : "#F8FAFC",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
            }}
          >
            <Ionicons name={o.icon} size={16} color={selected ? colors.primary : "#64748B"} />
            <Text style={[textStyles.caption, { fontWeight: "600", color: selected ? colors.primary : "#334155" }]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function DesktopTripModal({
  visible,
  editTrip,
  onClose,
  onSaved,
}: {
  visible: boolean;
  editTrip?: TripFromApi | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = !!editTrip?.id;

  const [destinationCity, setDestinationCity] = useState(editTrip?.name ?? "");

  const [countryName, setCountryName] = useState("");
  const [countryCode, setCountryCode] = useState<string | null>(null);

  const [continent, setContinent] = useState<string | null>(editTrip?.continent ?? null);

  // ✅ estado opcional
  const [status, setStatus] = useState<TripStatus | null>((editTrip?.status as TripStatus) ?? null);

  const [costText, setCostText] = useState(String(editTrip?.cost ?? ""));

  const [startDate, setStartDate] = useState<Date | null>(editTrip?.startDate ? new Date(editTrip.startDate) : null);
  const [endDate, setEndDate] = useState<Date | null>(editTrip?.endDate ? new Date(editTrip.endDate) : null);

  const [companionsText, setCompanionsText] = useState(editTrip?.companions?.join(", ") ?? "");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [dateField, setDateField] = useState<DateField>(null);

  const [banner, setBanner] = useState<{ tone: "danger" | "success" | "info"; title: string; desc?: string } | null>(
    null
  );

  useEffect(() => {
    setDestinationCity(editTrip?.name ?? "");
    const dest = editTrip?.destination ?? null;

    if (looksLikeCca2(dest)) {
      setCountryCode(String(dest).toUpperCase());
      setCountryName("");
    } else {
      setCountryCode(null);
      setCountryName(dest ? String(dest) : "");
    }

    setContinent(editTrip?.continent ?? null);
    setStatus(((editTrip?.status as TripStatus) ?? null) as any);
    setCostText(editTrip?.cost == null ? "" : String(editTrip.cost));

    setStartDate(editTrip?.startDate ? new Date(editTrip.startDate) : null);
    setEndDate(editTrip?.endDate ? new Date(editTrip.endDate) : null);
    setCompanionsText(editTrip?.companions?.join(", ") ?? "");
    setBanner(null);
  }, [editTrip, visible]);

  const openDatePicker = (field: DateField) => {
    setDateField(field);
    setDatePickerVisible(true);
  };

  const closeDatePicker = () => {
    setDatePickerVisible(false);
    setDateField(null);
  };

  const handleConfirmDate = (d: Date) => {
    if (dateField === "start") {
      setStartDate(d);
      if (endDate && endDate < d) setEndDate(d);
      if (!endDate) setEndDate(d);
    }
    if (dateField === "end") {
      setEndDate(d);
      if (!startDate) setStartDate(d);
    }
    closeDatePicker();
  };

  const clearDates = () => {
    setStartDate(null);
    setEndDate(null);
  };

  const validate = () => {
    if (!destinationCity.trim()) {
      setBanner({ tone: "danger", title: "Falta el destino", desc: "Añade el destino (ciudad) del viaje." });
      return false;
    }

    if (!(countryCode || "").trim()) {
      setBanner({ tone: "danger", title: "Falta el país", desc: "Selecciona un país." });
      return false;
    }

    if (startDate && endDate && endDate < startDate) {
      setBanner({ tone: "danger", title: "Rango inválido", desc: "La fecha de fin no puede ser anterior a la de inicio." });
      return false;
    }

    const cost = parseMoney(costText);
    if (cost < 0) {
      setBanner({ tone: "danger", title: "Coste inválido", desc: "El coste no puede ser negativo." });
      return false;
    }

    setBanner(null);
    return true;
  };

  const payload = useMemo(() => {
    const companions = parseCompanions(companionsText);
    const cost = costText.trim() ? parseMoney(costText) : 0;

    return {
      name: destinationCity.trim(),
      destination: (countryCode || "").trim() || null,

      startDate: startDate ? startDate : null,
      endDate: endDate ? endDate : null,

      continent: continent || null,
      companions,

      // ✅ opcional
      status: status ?? null,

      cost,
      budget: null as any,
    };
  }, [destinationCity, countryCode, startDate, endDate, continent, companionsText, status, costText]);

  const CONTINENTS: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "europe", label: "Europa", icon: "globe-outline" },
    { key: "africa", label: "África", icon: "globe-outline" },
    { key: "asia", label: "Asia", icon: "globe-outline" },
    { key: "north_america", label: "N. América", icon: "globe-outline" },
    { key: "south_america", label: "S. América", icon: "globe-outline" },
    { key: "oceania", label: "Oceanía", icon: "globe-outline" },
  ];

  function ContinentPicker({
    value,
    onChange,
  }: {
    value: string | null;
    onChange: (v: string | null) => void;
  }) {
    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onChange(null)}
          style={{
            height: 34,
            paddingHorizontal: 12,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: value === null ? "rgba(59,130,246,0.35)" : "#E5E7EB",
            backgroundColor: value === null ? "rgba(59,130,246,0.10)" : "#F8FAFC",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={[textStyles.caption, { fontWeight: "600", color: value === null ? colors.primary : "#334155" }]}>
            — Sin continente
          </Text>
        </TouchableOpacity>

        {CONTINENTS.map((c) => {
          const selected = value === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              activeOpacity={0.9}
              onPress={() => onChange(c.key)}
              style={{
                height: 34,
                paddingHorizontal: 12,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: selected ? "rgba(59,130,246,0.35)" : "#E5E7EB",
                backgroundColor: selected ? "rgba(59,130,246,0.10)" : "#F8FAFC",
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ionicons name={c.icon} size={16} color={selected ? colors.primary : "#64748B"} />
              <Text style={[textStyles.caption, { fontWeight: "600", color: selected ? colors.primary : "#334155" }]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      if (isEditing && editTrip?.id) {
        await api.patch(`/trips/${editTrip.id}`, payload);
      } else {
        await api.post("/trips", payload);
      }
      onSaved();
      onClose();
    } catch (e) {
      console.error("❌ Error al guardar viaje:", e);
      setBanner({ tone: "danger", title: "Error", desc: "No se ha podido guardar el viaje. Inténtalo de nuevo." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing || !editTrip?.id) return;

    const ok =
      Platform.OS === "web"
        ? // eslint-disable-next-line no-restricted-globals
          confirm("¿Seguro que quieres eliminar este viaje? Esta acción no se puede deshacer.")
        : true;

    if (!ok) return;

    try {
      setDeleting(true);
      await api.delete(`/trips/${editTrip.id}`);
      onSaved();
      onClose();
    } catch (e) {
      console.error("❌ Error al eliminar viaje:", e);
      setBanner({ tone: "danger", title: "Error", desc: "No se ha podido eliminar. Inténtalo de nuevo." });
    } finally {
      setDeleting(false);
    }
  };

  const headerTitle = isEditing ? "Editar viaje" : "Nuevo viaje";
  const headerSubtitle = "Destino, país, fechas y detalles del viaje.";

  const durationLabel =
    startDate && endDate
      ? `${Math.max(
          1,
          Math.round(
            (new Date(endDate).setHours(0, 0, 0, 0) - new Date(startDate).setHours(0, 0, 0, 0)) / 86400000
          ) + 1
        )} días`
      : null;

  const companionsCount = parseCompanions(companionsText).length;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(2,6,23,0.45)",
          padding: 24,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            width: 920,
            maxWidth: "100%",
            borderRadius: 16,
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: "rgba(229,231,235,0.9)",
            overflow: "hidden",
            shadowColor: "#000",
            shadowOpacity: 0.14,
            shadowRadius: 22,
            shadowOffset: { width: 0, height: 12 },
          }}
        >
          {/* Header */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: "#E5E7EB",
              backgroundColor: "white",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: "rgba(59,130,246,0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name={isEditing ? "create-outline" : "add-outline"} size={18} color={colors.primary} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[textStyles.body, { fontSize: 14, fontWeight: "700", color: "#0F172A" }]}>{headerTitle}</Text>
                <Text style={[textStyles.caption, { marginTop: 2, fontWeight: "500", color: "#64748B" }]}>{headerSubtitle}</Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onClose}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#F8FAFC",
              }}
            >
              <Ionicons name="close" size={18} color="#334155" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={{ padding: 16, backgroundColor: "#F8FAFC" }}>
            {!!banner && (
              <View style={{ marginBottom: 12 }}>
                <Banner tone={banner.tone} title={banner.title} desc={banner.desc} onClose={() => setBanner(null)} />
              </View>
            )}

            <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
              {/* LEFT */}
              <View
                style={{
                  width: 360,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  backgroundColor: "white",
                  padding: 14,
                }}
              >
                <Text style={[textStyles.labelMuted, { fontSize: 12 }]}>Datos básicos</Text>

                {/* City */}
                <View style={{ marginTop: 12 }}>
                  <Text style={[textStyles.caption, { fontWeight: "600", color: "#94A3B8" }]}>Destino (ciudad)</Text>
                  <View
                    style={{
                      marginTop: 6,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      backgroundColor: "#F8FAFC",
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                    }}
                  >
                    <InputWeb value={destinationCity} onChange={setDestinationCity} placeholder="Ej. Praga" />
                  </View>
                </View>

                {/* Country */}
                <View style={{ marginTop: 12 }}>
                  <Text style={[textStyles.labelMuted, { fontSize: 12 }]}>País</Text>
                  <View style={{ marginTop: 8 }}>
                    <CountrySelect
                      valueName={countryName}
                      valueCode={countryCode}
                      onChange={({ name, code }) => {
                        setCountryName(name);
                        setCountryCode(code);
                      }}
                    />
                  </View>
                </View>

                {/* Status (bonito + ES + opcional) */}
                <Field label="Estado" hint="opcional">
                  <StatusPills value={status} onChange={setStatus} />
                </Field>

                {/* Cost */}
                <Field label="Coste" hint="€ (opcional)">
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Ionicons name="cash-outline" size={16} color="#64748B" />
                    <View style={{ flex: 1 }}>
                      <InputWeb value={costText} onChange={setCostText} placeholder="0" inputMode="numeric" />
                    </View>
                  </View>
                </Field>
              </View>

              {/* RIGHT */}
              <View style={{ flex: 1, gap: 12 }}>
                {/* Dates */}
                <View
                  style={{
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    backgroundColor: "white",
                    padding: 14,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={[textStyles.labelMuted, { fontSize: 12 }]}>Fechas</Text>

                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={clearDates}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                        backgroundColor: "#F8FAFC",
                      }}
                    >
                      <Ionicons name="close-circle-outline" size={16} color="#64748B" />
                      <Text style={[textStyles.caption, { fontWeight: "600", color: "#334155" }]}>Quitar</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => openDatePicker("start")}
                      style={{
                        flex: 1,
                        height: 46,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                        backgroundColor: "#F8FAFC",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        paddingHorizontal: 12,
                      }}
                    >
                      <Ionicons name="calendar-outline" size={16} color="#64748B" />
                      <View>
                        <Text style={[textStyles.caption, { fontWeight: "600", color: "#94A3B8" }]}>Desde</Text>
                        <Text style={[textStyles.body, { fontSize: 13, fontWeight: "600", color: "#0F172A" }]}>
                          {startDate ? formatDate(startDate) : "Sin fecha"}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => openDatePicker("end")}
                      style={{
                        flex: 1,
                        height: 46,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                        backgroundColor: "#F8FAFC",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        paddingHorizontal: 12,
                      }}
                    >
                      <Ionicons name="calendar-outline" size={16} color="#64748B" />
                      <View>
                        <Text style={[textStyles.caption, { fontWeight: "600", color: "#94A3B8" }]}>Hasta</Text>
                        <Text style={[textStyles.body, { fontSize: 13, fontWeight: "600", color: "#0F172A" }]}>
                          {endDate ? formatDate(endDate) : "Sin fecha"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {!!durationLabel && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={[textStyles.caption, { fontWeight: "600", color: "#64748B" }]}>
                        Duración: <Text style={{ color: "#0F172A" }}>{durationLabel}</Text>
                      </Text>
                    </View>
                  )}
                </View>

                {/* (dejo tu continente + compañeros + footer tal cual, sin cambios) */}
                {/* ... tu ContinentPicker, companions, footer ... */}

                <View
                  style={{
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    backgroundColor: "white",
                    padding: 14,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={[textStyles.labelMuted, { fontSize: 12 }]}>Continente</Text>
                    <Text style={[textStyles.caption, { fontWeight: "500", color: "#94A3B8" }]}>opcional</Text>
                  </View>

                  <View style={{ marginTop: 10 }}>
                    {/* reutiliza tu ContinentPicker original */}
                    {/* @ts-ignore */}
                    <ContinentPicker value={continent} onChange={setContinent} />
                  </View>
                </View>

                <View
                  style={{
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    backgroundColor: "white",
                    padding: 14,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={[textStyles.labelMuted, { fontSize: 12 }]}>Compañeros</Text>
                    <Text style={[textStyles.caption, { fontWeight: "500", color: "#94A3B8" }]}>
                      {companionsCount ? `${companionsCount}` : "0"}
                    </Text>
                  </View>

                  <View
                    style={{
                      marginTop: 10,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      backgroundColor: "#F8FAFC",
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                    }}
                  >
                    <InputWeb value={companionsText} onChange={setCompanionsText} placeholder="Juan, María, Ana" />
                  </View>

                  <Text style={[textStyles.caption, { marginTop: 8, fontWeight: "500", color: "#94A3B8" }]}>
                    Separados por comas.
                  </Text>
                </View>

                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    {isEditing && (
                      <ActionBtn
                        tone="danger"
                        icon="trash-outline"
                        label="Eliminar"
                        onPress={handleDelete}
                        loading={deleting}
                        disabled={saving}
                      />
                    )}
                  </View>

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <ActionBtn
                      tone="ghost"
                      icon="close-outline"
                      label="Cancelar"
                      onPress={onClose}
                      disabled={saving || deleting}
                    />
                    <ActionBtn
                      tone="primary"
                      icon="save-outline"
                      label="Guardar"
                      onPress={handleSave}
                      loading={saving}
                      disabled={deleting}
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>

          <CrossPlatformDateTimePicker
            isVisible={datePickerVisible}
            mode="date"
            date={(dateField === "end" ? endDate : startDate) ?? new Date()}
            onConfirm={handleConfirmDate}
            onCancel={closeDatePicker}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
