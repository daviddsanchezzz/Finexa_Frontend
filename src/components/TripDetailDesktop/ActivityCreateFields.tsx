import React, { useMemo, useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "./ui";
import { TripPlanItemType } from "../../types/enums/travel";


const ACTIVITY_TYPE_OPTIONS: Array<{ value: TripPlanItemType; label: string }> = [
  { value: TripPlanItemType.activity, label: "Actividad (genérica)" },

  { value: TripPlanItemType.museum, label: "Museo" },
  { value: TripPlanItemType.monument, label: "Monumento" },
  { value: TripPlanItemType.viewpoint, label: "Mirador" },
  { value: TripPlanItemType.guided_tour, label: "Tour guiado" },

  { value: TripPlanItemType.concert, label: "Concierto" },
  { value: TripPlanItemType.sport, label: "Deporte" },
  { value: TripPlanItemType.bar_party, label: "Fiesta / Bar" },
  { value: TripPlanItemType.nightlife, label: "Noche / Club" },

  { value: TripPlanItemType.beach, label: "Playa" },
  { value: TripPlanItemType.hike, label: "Ruta / Hike" },
  { value: TripPlanItemType.day_trip, label: "Excursión (day trip)" },

  { value: TripPlanItemType.restaurant, label: "Restaurante" },
  { value: TripPlanItemType.cafe, label: "Café" },
  { value: TripPlanItemType.market, label: "Mercado" },

  { value: TripPlanItemType.shopping, label: "Compras" },
  { value: TripPlanItemType.other, label: "Otro" },
];


function isWeb() {
  return Platform.OS === "web";
}

function TypeSelect({
  value,
  onChange,
  px,
  fs,
}: {
  value: TripPlanItemType;
  onChange: (v: TripPlanItemType) => void;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  const label = useMemo(
    () => ACTIVITY_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value,
    [value]
  );

  if (isWeb()) {
    return (
      <View>
        <Text style={{ fontSize: fs(12), fontWeight: "800", color: UI.muted, letterSpacing: 0.4 }}>
          TIPO
        </Text>
        <View
          style={{
            marginTop: px(6),
            height: px(42),
            borderRadius: px(12),
            borderWidth: 1,
            borderColor: "rgba(226,232,240,0.95)",
            paddingHorizontal: px(12),
            justifyContent: "center",
            backgroundColor: "white",
          }}
        >
          <select
            value={value}
            onChange={(e) => onChange(e.target.value as ActivityPlanItemType)}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              outline: "none",
              fontSize: fs(13),
              fontWeight: 800,
              color: UI.text,
              background: "transparent",
            } as any}
          >
            {ACTIVITY_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </View>
      </View>
    );
  }

  // Native: selector simple “expandible”
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Text style={{ fontSize: fs(12), fontWeight: "800", color: UI.muted, letterSpacing: 0.4 }}>
        TIPO
      </Text>

      <Pressable
        onPress={() => setOpen((s) => !s)}
        style={({ pressed }) => ({
          marginTop: px(6),
          height: px(42),
          borderRadius: px(12),
          borderWidth: 1,
          borderColor: "rgba(226,232,240,0.95)",
          paddingHorizontal: px(12),
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between",
          backgroundColor: "white",
          opacity: pressed ? 0.92 : 1,
        })}
      >
        <Text style={{ fontSize: fs(13), fontWeight: "800", color: UI.text }}>{label}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={px(16)} color={UI.muted} />
      </Pressable>

      {open ? (
        <View
          style={{
            marginTop: px(8),
            borderRadius: px(12),
            borderWidth: 1,
            borderColor: "rgba(226,232,240,0.95)",
            overflow: "hidden",
            backgroundColor: "white",
          }}
        >
          {ACTIVITY_TYPE_OPTIONS.map((o) => {
            const active = o.value === value;
            return (
              <Pressable
                key={o.value}
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                style={({ pressed }) => ({
                  paddingVertical: px(10),
                  paddingHorizontal: px(12),
                  backgroundColor: active ? "rgba(15,23,42,0.06)" : "white",
                  opacity: pressed ? 0.92 : 1,
                  borderTopWidth: o.value === ACTIVITY_TYPE_OPTIONS[0].value ? 0 : 1,
                  borderTopColor: "rgba(226,232,240,0.70)",
                })}
              >
                <Text style={{ fontSize: fs(13), fontWeight: active ? "900" : "700", color: UI.text }}>
                  {o.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export function ActivityCreateFields({
  px,
  fs,
  Field,
  DateTimeField,
  Row2,

  type,
  setType,
  title,
  setTitle,
  location,
  setLocation,
  startAt,
  setStartAt,
  endAt,
  setEndAt,
  notes,
  setNotes,
  costStr,
  setCostStr,
  currency,
  setCurrency,

  valid,
}: {
  px: (n: number) => number;
  fs: (n: number) => number;

  Field: React.ComponentType<{
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    autoCapitalize?: "none" | "sentences" | "words" | "characters";
    px: (n: number) => number;
    fs: (n: number) => number;
  }>;

  DateTimeField: React.ComponentType<{
    label: string;
    value: Date | null;
    onChange: (d: Date) => void;
    placeholder?: string;
    px: (n: number) => number;
    fs: (n: number) => number;
  }>;

  Row2: React.ComponentType<{
    left: React.ReactNode;
    right: React.ReactNode;
    px: (n: number) => number;
  }>;

  type: TripPlanItemType;
  setType: (v: TripPlanItemType) => void;

  title: string;
  setTitle: (v: string) => void;

  location: string;
  setLocation: (v: string) => void;

  startAt: Date | null;
  setStartAt: (d: Date) => void;

  endAt: Date | null;
  setEndAt: (d: Date) => void;

  notes: string;
  setNotes: (v: string) => void;

  costStr: string;
  setCostStr: (v: string) => void;

  currency: string;
  setCurrency: (v: string) => void;

  valid: boolean;
}) {
  return (
    <View style={{ gap: px(12) }}>
      <Row2
        px={px}
        left={<TypeSelect value={type} onChange={setType} px={px} fs={fs} />}
        right={
          <Field
            label="TÍTULO"
            value={title}
            onChange={setTitle}
            placeholder=""
            autoCapitalize="sentences"
            px={px}
            fs={fs}
          />
        }
      />

      <Field
        label="UBICACIÓN (opcional)"
        value={location}
        onChange={setLocation}
        placeholder=""
        autoCapitalize="sentences"
        px={px}
        fs={fs}
      />

      <Row2
        px={px}
        left={
          <DateTimeField
            label="INICIO (opcional)"
            value={startAt}
            onChange={setStartAt}
            placeholder="Selecciona"
            px={px}
            fs={fs}
          />
        }
        right={
          <DateTimeField
            label="FIN (opcional)"
            value={endAt}
            onChange={setEndAt}
            placeholder="Selecciona"
            px={px}
            fs={fs}
          />
        }
      />

      <Row2
        px={px}
        left={
          <Field
            label="COSTE (opcional)"
            value={costStr}
            onChange={setCostStr}
            placeholder=""
            autoCapitalize="none"
            px={px}
            fs={fs}
          />
        }
        right={
          <Field
            label="MONEDA"
            value={currency}
            onChange={(v) => setCurrency((v || "").trim().toUpperCase())}
            placeholder="EUR"
            autoCapitalize="characters"
            px={px}
            fs={fs}
          />
        }
      />

      <Field
        label="NOTAS (opcional)"
        value={notes}
        onChange={setNotes}
        placeholder=""
        autoCapitalize="sentences"
        px={px}
        fs={fs}
      />
    </View>
  );
}
