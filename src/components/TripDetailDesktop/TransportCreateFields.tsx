import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "./ui";

export type TransportKind = "principal" | "local";

export type TransportMode = "flight" | "train" | "bus" | "car";
export type FlightEntryMode = "autofill" | "manual";

export function TransportCreateFields({
  px,
  fs,

  // UI primitives
  Field,
  DateField,
  DateTimeField,
  Row2,

  // kind selector
  kind,
  setKind,

  // ===== shared cost =====
  costStr,
  setCostStr,
  currency,
  setCurrency,

  // ===== PRINCIPAL =====
  mode,
  setMode,

  flightEntryMode,
  setFlightEntryMode,

  // flight autofill
  flightNumber,
  setFlightNumber,
  flightDate,
  setFlightDate,

  // flight manual
  flightAirline,
  setFlightAirline,
  flightFrom,
  setFlightFrom,
  flightTo,
  setFlightTo,
  flightDep,
  setFlightDep,
  flightArr,
  setFlightArr,

  // train/bus/car
  company,
  setCompany,
  bookingRef,
  setBookingRef,
  from,
  setFrom,
  to,
  setTo,
  dep,
  setDep,
  arr,
  setArr,

  // ===== LOCAL =====
  localTitle,
  setLocalTitle,
  localStartAt,
  setLocalStartAt,
  localEndAt,
  setLocalEndAt,
  localNotes,
  setLocalNotes,
  localLocation,
  setLocalLocation,

  presetDate,

  // optional
  onAnyChange,
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
  DateField: React.ComponentType<{
    label: string;
    value: Date | null;
    onChange: (d: Date) => void;
    placeholder?: string;
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

  // selector principal/local
  kind: TransportKind;
  setKind: (k: TransportKind) => void;

  // shared cost
  costStr: string;
  setCostStr: (v: string) => void;
  currency: string;
  setCurrency: (v: string) => void;

  // principal
  mode: TransportMode | null;
  setMode: (m: TransportMode) => void;

  flightEntryMode: FlightEntryMode;
  setFlightEntryMode: (v: FlightEntryMode) => void;

  flightNumber: string;
  setFlightNumber: (v: string) => void;
  flightDate: Date | null;
  setFlightDate: (d: Date | null) => void;

  flightAirline: string;
  setFlightAirline: (v: string) => void;
  flightFrom: string;
  setFlightFrom: (v: string) => void;
  flightTo: string;
  setFlightTo: (v: string) => void;
  flightDep: Date | null;
  setFlightDep: (d: Date | null) => void;
  flightArr: Date | null;
  setFlightArr: (d: Date | null) => void;

  company: string;
  setCompany: (v: string) => void;
  bookingRef: string;
  setBookingRef: (v: string) => void;
  from: string;
  setFrom: (v: string) => void;
  to: string;
  setTo: (v: string) => void;
  dep: Date | null;
  setDep: (d: Date | null) => void;
  arr: Date | null;
  setArr: (d: Date | null) => void;

  // local
  localTitle: string;
  setLocalTitle: (v: string) => void;
  localStartAt: Date | null;
  setLocalStartAt: (d: Date | null) => void;
  localEndAt: Date | null;
  setLocalEndAt: (d: Date | null) => void;
  localNotes: string;
  setLocalNotes: (v: string) => void;
    localLocation: string;
    setLocalLocation: (v: string) => void;

  presetDate?: string | null;

  onAnyChange?: () => void;
}) {
  function bump() {
    onAnyChange?.();
  }

  function Segmented({
    value,
    onChange,
    items,
  }: {
    value: string;
    onChange: (v: any) => void;
    items: Array<{ key: string; label: string }>;
  }) {
    return (
      <View
        style={{
          flexDirection: "row",
          borderWidth: 1,
          borderColor: "rgba(226,232,240,0.95)",
          borderRadius: px(14),
          overflow: "hidden",
          backgroundColor: "white",
        }}
      >
        {items.map((it) => {
          const active = it.key === value;
          return (
            <Pressable
              key={it.key}
              onPress={() => onChange(it.key)}
              style={({ pressed }) => ({
                flex: 1,
                height: px(40),
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: active ? "#0B1220" : "white",
                opacity: pressed ? 0.92 : 1,
              })}
            >
              <Text style={{ fontSize: fs(13), fontWeight: "900", color: active ? "white" : UI.text }}>
                {it.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  function SmallChoice({
    icon,
    label,
    selected,
    onPress,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    selected?: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          opacity: pressed ? 0.92 : 1,
          flex: 1,
          minWidth: px(120),
          borderRadius: px(14),
          paddingVertical: px(12),
          paddingHorizontal: px(12),
          borderWidth: 1,
          borderColor: selected ? "rgba(15,23,42,0.35)" : "rgba(226,232,240,0.95)",
          backgroundColor: selected ? "#0B1220" : "white",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: px(10),
        })}
      >
        <Ionicons name={icon} size={px(16)} color={selected ? "white" : UI.text} />
        <Text style={{ fontSize: fs(13), fontWeight: "800", color: selected ? "white" : UI.text }}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <View style={{ gap: px(12) }}>
      {/* 1) Principal vs Local */}
      <Segmented
        value={kind}
        onChange={(v: TransportKind) => {
          setKind(v);
          bump();
        }}
        items={[
          { key: "principal", label: "Principal" },
          { key: "local", label: "Local" },
        ]}
      />

      {/* 2) Shared cost (para ambos) */}
      <Row2
        px={px}
        left={
          <Field
            label="COSTE"
            value={costStr}
            onChange={(v) => {
              setCostStr(v);
              bump();
            }}
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
            onChange={(v) => {
              setCurrency(v.trim().toUpperCase());
              bump();
            }}
            placeholder="EUR"
            autoCapitalize="characters"
            px={px}
            fs={fs}
          />
        }
      />

      {/* =========================
          LOCAL TRANSPORT
         ========================= */}
{kind === "local" ? (
  <View style={{ gap: px(10), marginTop: px(4) }}>
    <Field
      label="TÍTULO"
      value={localTitle}
      onChange={(v) => {
        setLocalTitle(v);
        bump();
      }}
      placeholder=""
      autoCapitalize="sentences"
      px={px}
      fs={fs}
    />

    <Field
      label="UBICACIÓN (opcional)"
      value={localLocation}
      onChange={(v) => {
        setLocalLocation(v);
        bump();
      }}
      placeholder=""
      autoCapitalize="sentences"
      px={px}
      fs={fs}
    />

    <Row2
      px={px}
      left={
        <DateTimeField
          label="INICIO"
          value={localStartAt}
          onChange={(d) => {
            setLocalStartAt(d);
            bump();
          }}
          placeholder={presetDate ? `${presetDate} 10:00` : "Selecciona"}
          px={px}
          fs={fs}
        />
      }
      right={
        <DateTimeField
          label="FIN (opcional)"
          value={localEndAt}
          onChange={(d) => {
            setLocalEndAt(d);
            bump();
          }}
          placeholder={presetDate ? `${presetDate} 10:30` : "Selecciona"}
          px={px}
          fs={fs}
        />
      }
    />

    <Field
      label="NOTAS (opcional)"
      value={localNotes}
      onChange={(v) => {
        setLocalNotes(v);
        bump();
      }}
      placeholder=""
      autoCapitalize="sentences"
      px={px}
      fs={fs}
    />
  </View>
) : null}

      {/* =========================
          PRINCIPAL TRANSPORT
         ========================= */}
      {kind === "principal" ? (
        <View style={{ gap: px(12) }}>
          {/* Mode choices */}
          <View style={{ flexDirection: "row", gap: px(10), flexWrap: "wrap" }}>
            <SmallChoice
              icon="airplane"
              label="Avión"
              selected={mode === "flight"}
              onPress={() => {
                setMode("flight");
                bump();
              }}
            />
            <SmallChoice
              icon="train-outline"
              label="Tren"
              selected={mode === "train"}
              onPress={() => {
                setMode("train");
                bump();
              }}
            />
            <SmallChoice
              icon="bus-outline"
              label="Bus"
              selected={mode === "bus"}
              onPress={() => {
                setMode("bus");
                bump();
              }}
            />
            <SmallChoice
              icon="car-outline"
              label="Coche"
              selected={mode === "car"}
              onPress={() => {
                setMode("car");
                bump();
              }}
            />
          </View>

          {/* Mode specific fields */}
          {mode === "flight" ? (
            <View style={{ gap: px(10), marginTop: px(6) }}>
              <Segmented
                value={flightEntryMode}
                onChange={(v: FlightEntryMode) => {
                  setFlightEntryMode(v);
                  bump();
                }}
                items={[
                  { key: "autofill", label: "Autorelleno" },
                  { key: "manual", label: "Manual" },
                ]}
              />

              {flightEntryMode === "autofill" ? (
                <View style={{ gap: px(10) }}>
                  <Row2
                    px={px}
                    left={
                      <Field
                        label="CÓDIGO DE VUELO"
                        value={flightNumber}
                        onChange={(v) => {
                          setFlightNumber(v);
                          bump();
                        }}
                        placeholder=""
                        autoCapitalize="characters"
                        px={px}
                        fs={fs}
                      />
                    }
                    right={
                      <DateField
                        label="DÍA"
                        value={flightDate}
                        onChange={(d) => {
                          setFlightDate(d);
                          bump();
                        }}
                        placeholder={presetDate ? presetDate : ""}
                        px={px}
                        fs={fs}
                      />
                    }
                  />
                  <Text style={{ fontSize: fs(12), fontWeight: "600", color: UI.muted }}>
                    Autorelleno: solo necesitamos el día. El backend trae horarios, terminales y aeropuertos.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: px(10) }}>
                  <Row2
                    px={px}
                    left={
                      <DateTimeField
                        label="SALIDA"
                        value={flightDep}
                        onChange={(d) => {
                          setFlightDep(d);
                          bump();
                        }}
                        placeholder={presetDate ? `${presetDate} 09:00` : "Selecciona"}
                        px={px}
                        fs={fs}
                      />
                    }
                    right={
                      <DateTimeField
                        label="LLEGADA"
                        value={flightArr}
                        onChange={(d) => {
                          setFlightArr(d);
                          bump();
                        }}
                        placeholder={presetDate ? `${presetDate} 11:00` : "Selecciona"}
                        px={px}
                        fs={fs}
                      />
                    }
                  />
                  <Row2
                    px={px}
                    left={
                      <Field
                        label="CÓDIGO"
                        value={flightNumber}
                        onChange={(v) => {
                          setFlightNumber(v);
                          bump();
                        }}
                        placeholder=""
                        autoCapitalize="characters"
                        px={px}
                        fs={fs}
                      />
                    }
                    right={
                      <Field
                        label="COMPAÑÍA"
                        value={flightAirline}
                        onChange={(v) => {
                          setFlightAirline(v);
                          bump();
                        }}
                        placeholder=""
                        autoCapitalize="words"
                        px={px}
                        fs={fs}
                      />
                    }
                  />
                  <Row2
                    px={px}
                    left={
                      <Field
                        label="ORIGEN"
                        value={flightFrom}
                        onChange={(v) => {
                          setFlightFrom(v);
                          bump();
                        }}
                        placeholder=""
                        autoCapitalize="words"
                        px={px}
                        fs={fs}
                      />
                    }
                    right={
                      <Field
                        label="DESTINO"
                        value={flightTo}
                        onChange={(v) => {
                          setFlightTo(v);
                          bump();
                        }}
                        placeholder=""
                        autoCapitalize="words"
                        px={px}
                        fs={fs}
                      />
                    }
                  />
                </View>
              )}
            </View>
          ) : mode === "train" || mode === "bus" ? (
            <View style={{ gap: px(10), marginTop: px(6) }}>
              <Row2
                px={px}
                left={
                  <Field
                    label="COMPAÑÍA"
                    value={company}
                    onChange={(v) => {
                      setCompany(v);
                      bump();
                    }}
                    placeholder=""
                    autoCapitalize="words"
                    px={px}
                    fs={fs}
                  />
                }
                right={
                  <Field
                    label="Nº RESERVA (opcional)"
                    value={bookingRef}
                    onChange={(v) => {
                      setBookingRef(v);
                      bump();
                    }}
                    placeholder=""
                    autoCapitalize="characters"
                    px={px}
                    fs={fs}
                  />
                }
              />

              <Row2
                px={px}
                left={
                  <Field
                    label="ORIGEN"
                    value={from}
                    onChange={(v) => {
                      setFrom(v);
                      bump();
                    }}
                    placeholder=""
                    autoCapitalize="words"
                    px={px}
                    fs={fs}
                  />
                }
                right={
                  <Field
                    label="DESTINO"
                    value={to}
                    onChange={(v) => {
                      setTo(v);
                      bump();
                    }}
                    placeholder=""
                    autoCapitalize="words"
                    px={px}
                    fs={fs}
                  />
                }
              />

              <Row2
                px={px}
                left={
                  <DateTimeField
                    label="SALIDA"
                    value={dep}
                    onChange={(d) => {
                      setDep(d);
                      bump();
                    }}
                    placeholder=""
                    px={px}
                    fs={fs}
                  />
                }
                right={
                  <DateTimeField
                    label="LLEGADA"
                    value={arr}
                    onChange={(d) => {
                      setArr(d);
                      bump();
                    }}
                    placeholder=""
                    px={px}
                    fs={fs}
                  />
                }
              />
            </View>
          ) : mode === "car" ? (
            <View style={{ gap: px(10), marginTop: px(6) }}>
              <Row2
                px={px}
                left={
                  <Field
                    label="ORIGEN"
                    value={from}
                    onChange={(v) => {
                      setFrom(v);
                      bump();
                    }}
                    placeholder=""
                    autoCapitalize="words"
                    px={px}
                    fs={fs}
                  />
                }
                right={
                  <Field
                    label="DESTINO"
                    value={to}
                    onChange={(v) => {
                      setTo(v);
                      bump();
                    }}
                    placeholder=""
                    autoCapitalize="words"
                    px={px}
                    fs={fs}
                  />
                }
              />
              <Row2
                px={px}
                left={
                  <DateTimeField
                    label="SALIDA"
                    value={dep}
                    onChange={(d) => {
                      setDep(d);
                      bump();
                    }}
                    placeholder=""
                    px={px}
                    fs={fs}
                  />
                }
                right={
                  <DateTimeField
                    label="LLEGADA"
                    value={arr}
                    onChange={(d) => {
                      setArr(d);
                      bump();
                    }}
                    placeholder=""
                    px={px}
                    fs={fs}
                  />
                }
              />
            </View>
          ) : (
            <View style={{ marginTop: px(6) }}>
              <Text style={{ fontSize: fs(12), fontWeight: "700", color: UI.muted }}>
                Selecciona un modo para rellenar los datos.
              </Text>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}
