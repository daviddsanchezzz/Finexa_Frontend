// src/screens/Mobile/finances/travels/components/FlightDetailsFields.tsx
import React from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const UI = {
    text: "#0B1220",
    muted: "#64748B",
    muted2: "#94A3B8",
    border: "rgba(148,163,184,0.22)",
};

type FlightProvider = "ryanair" | "vueling" | "iberia" | "easyjet" | "lufthansa" | "air_europa" | "other";

interface FlightDetailsFieldsProps {
    provider?: FlightProvider | null;
    airlineName?: string;
    flightNumber?: string;
    fromIata?: string;
    toIata?: string;
    depTerminal?: string;
    arrTerminal?: string;
    onChangeProvider: (value: FlightProvider) => void;
    onChangeAirlineName: (value: string) => void;
    onChangeFlightNumber: (value: string) => void;
    onChangeFromIata: (value: string) => void;
    onChangeToIata: (value: string) => void;
    onChangeDepTerminal: (value: string) => void;
    onChangeArrTerminal: (value: string) => void;
}

const PROVIDERS: Array<{ value: FlightProvider; label: string }> = [
    { value: "ryanair", label: "Ryanair" },
    { value: "vueling", label: "Vueling" },
    { value: "iberia", label: "Iberia" },
    { value: "easyjet", label: "EasyJet" },
    { value: "lufthansa", label: "Lufthansa" },
    { value: "air_europa", label: "Air Europa" },
    { value: "other", label: "Otra" },
];

export default function FlightDetailsFields({
    provider,
    airlineName,
    flightNumber,
    fromIata,
    toIata,
    depTerminal,
    arrTerminal,
    onChangeProvider,
    onChangeAirlineName,
    onChangeFlightNumber,
    onChangeFromIata,
    onChangeToIata,
    onChangeDepTerminal,
    onChangeArrTerminal,
}: FlightDetailsFieldsProps) {
    return (
        <View style={{ gap: 14 }}>
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="airplane-outline" size={18} color={UI.text} />
                <Text style={{ fontSize: 16, fontWeight: "800", color: UI.text }}>
                    Detalles del Vuelo
                </Text>
            </View>

            {/* Provider selector */}
            <View>
                <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted, marginBottom: 8 }}>
                    Aerolínea
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {PROVIDERS.map((p) => {
                        const active = provider === p.value;
                        return (
                            <Pressable
                                key={p.value}
                                onPress={() => onChangeProvider(p.value)}
                                style={({ pressed }) => ({
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: active ? "#2563EB" : UI.border,
                                    backgroundColor: active ? "rgba(37,99,235,0.08)" : "white",
                                    opacity: pressed ? 0.9 : 1,
                                })}
                            >
                                <Text
                                    style={{
                                        fontSize: 12,
                                        fontWeight: "800",
                                        color: active ? "#2563EB" : UI.text,
                                    }}
                                >
                                    {p.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>

            {/* Airline name (if other) */}
            {provider === "other" && (
                <View>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted, marginBottom: 8 }}>
                        Nombre de la aerolínea
                    </Text>
                    <TextInput
                        value={airlineName}
                        onChangeText={onChangeAirlineName}
                        placeholder="Ej: Emirates"
                        placeholderTextColor={UI.muted2}
                        style={{
                            borderWidth: 1,
                            borderColor: UI.border,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            fontSize: 14,
                            fontWeight: "600",
                            color: UI.text,
                            backgroundColor: "white",
                        }}
                    />
                </View>
            )}

            {/* Flight number */}
            <View>
                <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted, marginBottom: 8 }}>
                    Número de vuelo
                </Text>
                <TextInput
                    value={flightNumber}
                    onChangeText={onChangeFlightNumber}
                    placeholder="Ej: FR1234"
                    placeholderTextColor={UI.muted2}
                    style={{
                        borderWidth: 1,
                        borderColor: UI.border,
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        fontSize: 14,
                        fontWeight: "600",
                        color: UI.text,
                        backgroundColor: "white",
                    }}
                />
            </View>

            {/* From/To IATA codes */}
            <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted, marginBottom: 8 }}>
                        Desde (IATA)
                    </Text>
                    <TextInput
                        value={fromIata}
                        onChangeText={(text) => onChangeFromIata(text.toUpperCase())}
                        placeholder="MAD"
                        placeholderTextColor={UI.muted2}
                        maxLength={3}
                        autoCapitalize="characters"
                        style={{
                            borderWidth: 1,
                            borderColor: UI.border,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            fontSize: 14,
                            fontWeight: "600",
                            color: UI.text,
                            backgroundColor: "white",
                            textAlign: "center",
                        }}
                    />
                </View>

                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted, marginBottom: 8 }}>
                        Hasta (IATA)
                    </Text>
                    <TextInput
                        value={toIata}
                        onChangeText={(text) => onChangeToIata(text.toUpperCase())}
                        placeholder="BCN"
                        placeholderTextColor={UI.muted2}
                        maxLength={3}
                        autoCapitalize="characters"
                        style={{
                            borderWidth: 1,
                            borderColor: UI.border,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            fontSize: 14,
                            fontWeight: "600",
                            color: UI.text,
                            backgroundColor: "white",
                            textAlign: "center",
                        }}
                    />
                </View>
            </View>

            {/* Terminals */}
            <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted, marginBottom: 8 }}>
                        Terminal salida
                    </Text>
                    <TextInput
                        value={depTerminal}
                        onChangeText={onChangeDepTerminal}
                        placeholder="T1"
                        placeholderTextColor={UI.muted2}
                        style={{
                            borderWidth: 1,
                            borderColor: UI.border,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            fontSize: 14,
                            fontWeight: "600",
                            color: UI.text,
                            backgroundColor: "white",
                            textAlign: "center",
                        }}
                    />
                </View>

                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted, marginBottom: 8 }}>
                        Terminal llegada
                    </Text>
                    <TextInput
                        value={arrTerminal}
                        onChangeText={onChangeArrTerminal}
                        placeholder="T2"
                        placeholderTextColor={UI.muted2}
                        style={{
                            borderWidth: 1,
                            borderColor: UI.border,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            fontSize: 14,
                            fontWeight: "600",
                            color: UI.text,
                            backgroundColor: "white",
                            textAlign: "center",
                        }}
                    />
                </View>
            </View>
        </View>
    );
}
