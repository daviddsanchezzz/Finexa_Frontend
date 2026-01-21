// src/components/TripDetailDesktop/AccommodationCreateFields.tsx
import React from "react";
import { View, Text, Platform } from "react-native";
import { UI } from "./ui";
import { BathroomType, RoomType } from "../../types/enums/travel";

const ROOM_OPTIONS: { value: RoomType; label: string }[] = [
  { value: RoomType.single, label: "Individual" },
  { value: RoomType.double, label: "Doble" },
  { value: RoomType.twin, label: "Twin (2 camas)" },
  { value: RoomType.triple, label: "Triple" },
  { value: RoomType.family, label: "Familiar" },
  { value: RoomType.suite, label: "Suite" },
  { value: RoomType.apartment, label: "Apartamento" },
  { value: RoomType.dorm, label: "Dormitorio compartido" },
];

const BATHROOM_OPTIONS: { value: BathroomType; label: string }[] = [
  { value: BathroomType.private, label: "Con baño" },
  { value: BathroomType.shared, label: "Sin baño" },
];

// =========================
// “Selector de toda la vida” (igual que en ExpenseCreateFields)
// Web: <select> real
// Native: fallback sin deps (no Picker)
// =========================
function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  px,
  fs,
  placeholder = "Selecciona",
}: {
  label: string;
  value: T | null;
  onChange: (v: T | null) => void;
  options: { value: T; label: string }[];
  px: (n: number) => number;
  fs: (n: number) => number;
  placeholder?: string;
}) {
  const border = "rgba(226,232,240,0.95)";

  // ---- WEB: HTML select real ----
  if (Platform.OS === "web") {
    return (
      <View>
        <Text style={{ fontSize: fs(12), fontWeight: "800", color: UI.muted, letterSpacing: 0.4 }}>
          {label}
        </Text>

        <View
          style={{
            marginTop: px(6),
            height: px(42),
            borderRadius: px(12),
            borderWidth: 1,
            borderColor: border,
            paddingHorizontal: px(12),
            justifyContent: "center",
            backgroundColor: "white",
          }}
        >
          <select
            value={value ?? ""}
            onChange={(e) => {
              const v = (e?.target?.value ?? "") as string;
              onChange((v ? (v as T) : null) as any);
            }}
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
            <option value="">{placeholder}</option>
            {options.map((opt) => (
              <option key={String(opt.value)} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </View>
      </View>
    );
  }

  // ---- NATIVE: fallback sin deps (igual filosofía que expense) ----
  // Mostramos el valor como texto y permitimos cambiarlo escribiendo el label exacto.
  // Si prefieres sí o sí dropdown nativo, entonces hay que usar Picker/lib.
  const currentLabel = options.find((o) => o.value === value)?.label ?? "";

  return (
    <View>
      <Text style={{ fontSize: fs(12), fontWeight: "800", color: UI.muted, letterSpacing: 0.4 }}>
        {label}
      </Text>

      <View
        style={{
          marginTop: px(6),
          height: px(42),
          borderRadius: px(12),
          borderWidth: 1,
          borderColor: border,
          paddingHorizontal: px(12),
          justifyContent: "center",
          backgroundColor: "white",
        }}
      >
        <Text style={{ fontSize: fs(13), fontWeight: "800", color: currentLabel ? UI.text : UI.muted2 }}>
          {currentLabel || placeholder}
        </Text>
      </View>

      {/* Input auxiliar “tipo selector” sin tocar tu Field: */}
      {/* Si quieres edición real aquí sin libs, pásame tu Field y lo sustituyo por Field como en expense. */}
      <View style={{ marginTop: px(6) }}>
        <Text style={{ fontSize: fs(11), fontWeight: "700", color: UI.muted2 }}>
          (Native) Cambia escribiendo exactamente: {options.map((o) => o.label).join(" · ")}
        </Text>
      </View>
    </View>
  );
}

export function AccommodationCreateFields({
  px,
  fs,
  Field,
  DateTimeField,
  Row2,

  // AccommodationDetails
  name,
  setName,
  address,
  setAddress,
  city,
  setCity,
  country,
  setCountry,
  checkInAt,
  setCheckInAt,
  checkOutAt,
  setCheckOutAt,
  guestsStr,
  setGuestsStr,
  roomsStr,
  setRoomsStr,
  bookingRef,
  setBookingRef,
  phone,
  setPhone,
  website,
  setWebsite,

  // PlanItem cost
  costStr,
  setCostStr,
  currency,
  setCurrency,

  // Room selectors
  roomType,
  setRoomType,
  bathroomType,
  setBathroomType,

  valid,
}: {
  px: (n: number) => number;
  fs: (n: number) => number;

  Field: any;
  DateTimeField: any;
  Row2: any;

  name: string;
  setName: (v: string) => void;

  address: string;
  setAddress: (v: string) => void;

  city: string;
  setCity: (v: string) => void;

  country: string;
  setCountry: (v: string) => void;

  checkInAt: Date | null;
  setCheckInAt: (d: Date) => void;

  checkOutAt: Date | null;
  setCheckOutAt: (d: Date) => void;

  guestsStr: string;
  setGuestsStr: (v: string) => void;

  roomsStr: string;
  setRoomsStr: (v: string) => void;

  bookingRef: string;
  setBookingRef: (v: string) => void;

  phone: string;
  setPhone: (v: string) => void;

  website: string;
  setWebsite: (v: string) => void;

  costStr: string;
  setCostStr: (v: string) => void;

  currency: string;
  setCurrency: (v: string) => void;

  roomType: RoomType | null;
  setRoomType: (v: RoomType | null) => void;

  bathroomType: BathroomType | null;
  setBathroomType: (v: BathroomType | null) => void;

  valid: boolean;
}) {
  return (
    <View style={{ gap: px(12), paddingVertical: px(6) }}>
      <Field label="NOMBRE *" value={name} onChange={setName} autoCapitalize="words" px={px} fs={fs} />

      <Row2
        px={px}
        left={<Field label="CIUDAD *" value={city} onChange={setCity} autoCapitalize="words" px={px} fs={fs} />}
        right={
          <Field
            label="DIRECCIÓN"
            value={address}
            onChange={setAddress}
            placeholder=""
            autoCapitalize="sentences"
            px={px}
            fs={fs}
          />
        }
      />

      <Row2
        px={px}
        left={<DateTimeField label="CHECK-IN" value={checkInAt} onChange={setCheckInAt} placeholder="Selecciona" px={px} fs={fs} />}
        right={<DateTimeField label="CHECK-OUT" value={checkOutAt} onChange={setCheckOutAt} placeholder="Selecciona" px={px} fs={fs} />}
      />

      <Row2
        px={px}
        left={<Field label="HUÉSPEDES" value={guestsStr} onChange={setGuestsStr} placeholder="" autoCapitalize="none" px={px} fs={fs} />}
        right={<Field label="HABITACIONES" value={roomsStr} onChange={setRoomsStr} placeholder="" autoCapitalize="none" px={px} fs={fs} />}
      />

      {/* Selectores reales (web select) */}
      <Row2
        px={px}
        left={
          <SelectField<RoomType>
            label="TIPO DE HABITACIÓN"
            value={roomType}
            onChange={(v) => setRoomType(v as RoomType | null)}
            options={ROOM_OPTIONS}
            px={px}
            fs={fs}
          />
        }
        right={
          <SelectField<BathroomType>
            label="BAÑO"
            value={bathroomType}
            onChange={(v) => setBathroomType(v as BathroomType | null)}
            options={BATHROOM_OPTIONS}
            px={px}
            fs={fs}
          />
        }
      />

      <Row2
        px={px}
        left={<Field label="REFERENCIA RESERVA" value={bookingRef} onChange={setBookingRef} placeholder="" autoCapitalize="characters" px={px} fs={fs} />}
        right={<Field label="TELÉFONO" value={phone} onChange={setPhone} placeholder="" autoCapitalize="none" px={px} fs={fs} />}
      />

      <Field label="WEB" value={website} onChange={setWebsite} placeholder="" autoCapitalize="none" px={px} fs={fs} />

      <Row2
        px={px}
        left={<Field label="COSTE" value={costStr} onChange={setCostStr} placeholder="" autoCapitalize="none" px={px} fs={fs} />}
        right={<Field label="MONEDA" value={currency} onChange={setCurrency} placeholder="EUR" autoCapitalize="characters" px={px} fs={fs} />}
      />

      {!valid ? null : null}
    </View>
  );
}

export type { RoomType, BathroomType };
export { ROOM_OPTIONS, BATHROOM_OPTIONS };
