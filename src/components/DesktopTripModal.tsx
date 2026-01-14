// src/components/DesktopTripModal.tsx
import React, { useMemo, useState } from "react";
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
import api from "../api/api";
import { colors } from "../theme/theme";
import { textStyles, typography } from "../theme/typography";
import CrossPlatformDateTimePicker from "./CrossPlatformDateTimePicker";

export type TripFromApi = {
  id: number;
  userId?: number;
  name: string;
  destination?: string | null;
  startDate: string;
  endDate: string;
  companions: string[];
  emoji?: string | null;
  budget?: number | null;
};

type DateField = "start" | "end" | null;

function formatDate(d: Date) {
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function parseCompanions(text: string): string[] {
  return (text || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function safeNum(v: string): number | null {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Web inputs (serios, consistentes con tu dashboard) */
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
    return (
      <Text style={[textStyles.bodyMuted, { fontWeight: "700", color: "#94A3B8" }]}>
        (Input pensado para desktop/web)
      </Text>
    );
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
          fontWeight: 700,
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
        fontWeight: 800,
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
      ? { bg: "rgba(239,68,68,0.10)", bd: "rgba(239,68,68,0.20)", fg: "#991B1B", ic: "alert-circle-outline" as const }
      : tone === "success"
      ? { bg: "rgba(34,197,94,0.10)", bd: "rgba(34,197,94,0.20)", fg: "#166534", ic: "checkmark-circle-outline" as const }
      : { bg: "rgba(59,130,246,0.10)", bd: "rgba(59,130,246,0.20)", fg: "#1E3A8A", ic: "information-circle-outline" as const };

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
        <Text style={[textStyles.body, { fontWeight: "900", color: palette.fg, fontSize: 13 }]}>{title}</Text>
        {!!desc && (
          <Text style={[textStyles.caption, { marginTop: 3, fontWeight: "800", color: palette.fg }]}>
            {desc}
          </Text>
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
      <Text style={[textStyles.button, { fontSize: 12, fontWeight: "900", color: style.fg as any }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function FieldCard({
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
        <Text style={[textStyles.labelMuted2, { fontSize: 12 }]}>{label}</Text>
        {!!hint && <Text style={[textStyles.caption, { fontWeight: "800", color: "#94A3B8" }]}>{hint}</Text>}
      </View>
      <View
        style={{
          marginTop: 8,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          backgroundColor: "#F8FAFC",
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        {children}
      </View>
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
  editTrip?: TripFromApi | null; // null/undefined => create
  onClose: () => void;
  onSaved: () => void; // refrescar board al guardar/eliminar
}) {
  const isEditing = !!editTrip?.id;

  // state inicial
  const [name, setName] = useState(editTrip?.name ?? "");
  const [destination, setDestination] = useState(editTrip?.destination ?? "");
  const [emoji, setEmoji] = useState(editTrip?.emoji ?? "✈️");

  const [startDate, setStartDate] = useState<Date>(editTrip?.startDate ? new Date(editTrip.startDate) : new Date());
  const [endDate, setEndDate] = useState<Date>(editTrip?.endDate ? new Date(editTrip.endDate) : new Date());

  const [companionsText, setCompanionsText] = useState(editTrip?.companions?.join(", ") ?? "");
  const [budget, setBudget] = useState(editTrip?.budget != null ? String(editTrip.budget) : "");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [dateField, setDateField] = useState<DateField>(null);

  const [banner, setBanner] = useState<{ tone: "danger" | "success" | "info"; title: string; desc?: string } | null>(
    null
  );

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
      if (endDate < d) setEndDate(d);
    }
    if (dateField === "end") setEndDate(d);
    closeDatePicker();
  };

  const validate = () => {
    if (!name.trim()) {
      setBanner({ tone: "danger", title: "Falta el nombre", desc: "Añade un nombre para el viaje." });
      return false;
    }
    if (!startDate || !endDate) {
      setBanner({ tone: "danger", title: "Fechas incompletas", desc: "Indica fechas de inicio y fin." });
      return false;
    }
    if (endDate < startDate) {
      setBanner({ tone: "danger", title: "Rango inválido", desc: "La fecha de fin no puede ser anterior a la de inicio." });
      return false;
    }

    const b = budget.trim();
    if (b) {
      const parsed = safeNum(b);
      if (parsed == null || parsed < 0) {
        setBanner({ tone: "danger", title: "Presupuesto inválido", desc: "Introduce un número válido (ej. 300)." });
        return false;
      }
    }

    setBanner(null);
    return true;
  };

  const payload = useMemo(() => {
    const companions = parseCompanions(companionsText);
    const b = budget.trim();
    const parsedBudget = b ? safeNum(b) : null;

    return {
      name: name.trim(),
      destination: destination.trim() || null,
      startDate,
      endDate,
      emoji: (emoji || "").trim() || null,
      companions,
      budget: parsedBudget,
    };
  }, [name, destination, startDate, endDate, emoji, companionsText, budget]);

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      if (isEditing && editTrip?.id) {
        await api.patch(`/trips/${editTrip.id}`, payload);
      } else {
        await api.post("/trips", payload);
      }
      setBanner({ tone: "success", title: "Guardado", desc: "El viaje se ha guardado correctamente." });
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
      setBanner({ tone: "success", title: "Eliminado", desc: "El viaje se ha eliminado." });
      onSaved();
      onClose();
    } catch (e) {
      console.error("❌ Error al eliminar viaje:", e);
      setBanner({ tone: "danger", title: "Error", desc: "No se ha podido eliminar. Inténtalo de nuevo." });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.35)",
          padding: 24,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            width: 980,
            maxWidth: "100%",
            borderRadius: 16,
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: "rgba(229,231,235,0.9)",
            overflow: "hidden",
            shadowColor: "#000",
            shadowOpacity: 0.10,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
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
                <Text style={[textStyles.body, { fontSize: 14, fontWeight: "900", color: "#0F172A" }]}>
                  {isEditing ? "Editar viaje" : "Nuevo viaje"}
                </Text>
                <Text style={[textStyles.caption, { marginTop: 2, fontWeight: "800", color: "#64748B" }]}>
                  Define el viaje, fechas y detalles opcionales.
                </Text>
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
              {/* LEFT: Identidad del viaje */}
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
                <Text style={[textStyles.labelMuted2, { fontSize: 12 }]}>Identidad</Text>

                {/* Emoji + Nombre */}
                <View style={{ marginTop: 10, flexDirection: "row", gap: 10, alignItems: "center" }}>
                  <View
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: "rgba(59,130,246,0.20)",
                      backgroundColor: "rgba(59,130,246,0.10)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 26 }}>{emoji || "✈️"}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[textStyles.caption, { fontWeight: "900", color: "#94A3B8" }]}>Nombre del viaje</Text>
                    <View style={{ marginTop: 6, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#F8FAFC", paddingHorizontal: 12, paddingVertical: 10 }}>
                      <InputWeb value={name} onChange={setName} placeholder="Ej. Navidad en Praga" />
                    </View>
                  </View>
                </View>

                <FieldCard label="Destino">
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="location-outline" size={16} color="#64748B" />
                    <View style={{ flex: 1 }}>
                      <InputWeb value={destination} onChange={setDestination} placeholder="Ciudad / país" />
                    </View>
                  </View>
                </FieldCard>

                <FieldCard label="Emoji" hint="1 carácter">
                  <InputWeb value={emoji} onChange={setEmoji} placeholder="✈️" />
                </FieldCard>

                <View
                  style={{
                    marginTop: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    backgroundColor: "#FFFFFF",
                    padding: 12,
                  }}
                >
                  <Text style={[textStyles.caption, { fontWeight: "900", color: "#64748B" }]}>Vista previa</Text>
                  <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          backgroundColor: "rgba(15,23,42,0.06)",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ fontSize: 18 }}>{emoji || "✈️"}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[textStyles.body, { fontSize: 13, fontWeight: "900", color: "#0F172A" }]} numberOfLines={1}>
                          {name?.trim() || "Nuevo viaje"}
                        </Text>
                        <Text style={[textStyles.caption, { marginTop: 2, fontWeight: "800", color: "#64748B" }]} numberOfLines={1}>
                          {destination?.trim() || "Sin destino"}
                        </Text>
                      </View>
                    </View>

                    <Text style={[textStyles.caption, { fontWeight: "900", color: "#64748B" }]}>
                      {formatDate(startDate)} · {formatDate(endDate)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* RIGHT: Fechas y detalles */}
              <View style={{ flex: 1, gap: 12 }}>
                {/* Fechas */}
                <View
                  style={{
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    backgroundColor: "white",
                    padding: 14,
                  }}
                >
                  <Text style={[textStyles.labelMuted2, { fontSize: 12 }]}>Fechas del viaje</Text>

                  <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
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
                        <Text style={[textStyles.caption, { fontWeight: "900", color: "#94A3B8" }]}>Desde</Text>
                        <Text style={[textStyles.body, { fontSize: 13, fontWeight: "900", color: "#0F172A" }]}>
                          {formatDate(startDate)}
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
                        <Text style={[textStyles.caption, { fontWeight: "900", color: "#94A3B8" }]}>Hasta</Text>
                        <Text style={[textStyles.body, { fontSize: 13, fontWeight: "900", color: "#0F172A" }]}>
                          {formatDate(endDate)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  <View style={{ marginTop: 10 }}>
                    <Text style={[textStyles.caption, { fontWeight: "900", color: "#64748B" }]}>
                      Duración:{" "}
                      <Text style={{ color: "#0F172A" }}>
                        {Math.max(
                          1,
                          Math.round(
                            (new Date(endDate).setHours(0, 0, 0, 0) - new Date(startDate).setHours(0, 0, 0, 0)) /
                              86400000
                          ) + 1
                        )}{" "}
                        días
                      </Text>
                    </Text>
                  </View>
                </View>

                {/* Opcionales */}
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
                    <Text style={[textStyles.labelMuted2, { fontSize: 12 }]}>Detalles opcionales</Text>
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 999,
                        backgroundColor: "rgba(15,23,42,0.06)",
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                      }}
                    >
                      <Text style={[textStyles.caption, { fontWeight: "900", color: "#0F172A" }]}>
                        Mejoran el planning
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[textStyles.labelMuted2, { fontSize: 12 }]}>Presupuesto (€)</Text>
                      <View
                        style={{
                          marginTop: 8,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: "#E5E7EB",
                          backgroundColor: "#F8FAFC",
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Ionicons name="cash-outline" size={16} color="#64748B" />
                        <View style={{ flex: 1 }}>
                          <InputWeb value={budget} onChange={setBudget} placeholder="300" inputMode="numeric" />
                        </View>
                      </View>
                    </View>

                    <View style={{ width: 240 }}>
                      <Text style={[textStyles.labelMuted2, { fontSize: 12 }]}>Companions</Text>
                      <View
                        style={{
                          marginTop: 8,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: "#E5E7EB",
                          backgroundColor: "#F8FAFC",
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                        }}
                      >
                        <Text style={[textStyles.caption, { fontWeight: "900", color: "#64748B" }]} numberOfLines={1}>
                          {parseCompanions(companionsText).length} personas
                        </Text>
                      </View>
                    </View>
                  </View>

                  <FieldCard label="Compañeros" hint="Separados por comas">
                    <InputWeb
                      value={companionsText}
                      onChange={setCompanionsText}
                      placeholder="Ej. Juan, María, Ana"
                      multiline
                      height={90}
                    />
                  </FieldCard>
                </View>

                {/* Footer actions */}
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
                    <ActionBtn tone="ghost" icon="close-outline" label="Cancelar" onPress={onClose} disabled={saving || deleting} />
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

          {/* Date picker */}
          <CrossPlatformDateTimePicker
            isVisible={datePickerVisible}
            mode="date"
            date={dateField === "end" ? endDate : startDate}
            onConfirm={handleConfirmDate}
            onCancel={closeDatePicker}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
