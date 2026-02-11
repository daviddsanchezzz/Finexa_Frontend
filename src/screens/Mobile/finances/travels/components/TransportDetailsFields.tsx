// src/screens/Mobile/finances/travels/components/TransportDetailsFields.tsx
import React from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";

const UI = {
    text: "#0B1220",
    muted: "#64748B",
    muted2: "#94A3B8",
    border: "rgba(148,163,184,0.22)",
};

type TransportMode = "flight" | "train" | "bus" | "car" | "ferry" | "other";

interface TransportDetailsFieldsProps {
    mode?: TransportMode | null;
    company?: string;
    bookingRef?: string;
    fromName?: string;
    toName?: string;
    depAt?: Date | null;
    arrAt?: Date | null;
    onChangeMode: (value: TransportMode) => void;
    onChangeCompany: (value: string) => void;
    onChangeBookingRef: (value: string) => void;
    onChangeFromName: (value: string) => void;
    onChangeToName: (value: string) => void;
    onChangeDepAt: (value: Date | null) => void;
    onChangeArrAt: (value: Date | null) => void;
}

const TRANSPORT_MODES: Array<{ value: TransportMode; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { value: "flight", label: "Avión", icon: "airplane-outline" },
    { value: "train", label: "Tren", icon: "train-outline" },
    { value: "bus", label: "Autobús", icon: "bus-outline" },
    { value: "car", label: "Coche", icon: "car-outline" },
    { value: "ferry", label: "Ferry", icon: "boat-outline" },
    { value: "other", label: "Otro", icon: "ellipsis-horizontal-outline" },
];

export default function TransportDetailsFields({
    mode,
    company,
    bookingRef,
    fromName,
    toName,
    depAt,
    arrAt,
    onChangeMode,
    onChangeCompany,
    onChangeBookingRef,
    onChangeFromName,
    onChangeToName,
    onChangeDepAt,
    onChangeArrAt,
}: TransportDetailsFieldsProps) {
    const [showDepPicker, setShowDepPicker] = React.useState(false);
    const [showArrPicker, setShowArrPicker] = React.useState(false);

    const formatDateTime = (date: Date | null) => {
        if (!date) return "";
        return date.toLocaleString("es-ES", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <View style={{ gap: 14 }}>
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="bus-outline" size={18} color={UI.text} />
                <Text style={{ fontSize: 16, fontWeight: "800", color: UI.text }}>
                    Detalles del Transporte
                </Text>
            </View>

            {/* Mode selector */}
            <View>
                <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted, marginBottom: 8 }}>
                    Tipo de transporte
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {TRANSPORT_MODES.map((m) => {
                        const active = mode === m.value;
                        return (
                            <Pressable
                                key={m.value}
                                onPress={() => onChangeMode(m.value)}
                                style={({ pressed }) => ({
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 6,
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: active ? "#0EA5E9" : UI.border,
                                    backgroundColor: active ? "rgba(14,165,233,0.08)" : "white",
                                    opacity: pressed ? 0.9 : 1,
                                })}
                            >
                                <Ionicons name={m.icon} size={14} color={active ? "#0EA5E9" : UI.muted} />
                                <Text
                                    style={{
                                        fontSize: 12,
                                        fontWeight: "800",
                                        color: active ? "#0EA5E9" : UI.text,
                                    }}
                                >
                                    {m.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>

            {/* Company */}
            <View>
                <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted, marginBottom: 8 }}>
                    Compañía
                </Text>
                <TextInput
                    value={company}
                    onChangeText={onChangeCompany}
                    placeholder="Ej: Renfe, Alsa, etc."
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

            {/* Booking reference */}
            <View>
                <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted, marginBottom: 8 }}>
                    Referencia de reserva
                </Text>
                <TextInput
                    value={bookingRef}
                    onChangeText={onChangeBookingRef}
                    placeholder="ABC123456"
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

            {/* From/To */}
            <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted, marginBottom: 8 }}>
                        Desde
                    </Text>
                    <TextInput
                        value={fromName}
                        onChangeText={onChangeFromName}
                        placeholder="Madrid"
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

                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted, marginBottom: 8 }}>
                        Hasta
                    </Text>
                    <TextInput
                        value={toName}
                        onChangeText={onChangeToName}
                        placeholder="Barcelona"
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
            </View>

            {/* Departure & Arrival times */}
            <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted, marginBottom: 8 }}>
                        Salida
                    </Text>
                    <TextInput
                        value={formatDateTime(depAt)}
                        onFocus={() => setShowDepPicker(true)}
                        placeholder="Seleccionar"
                        placeholderTextColor={UI.muted2}
                        editable={false}
                        style={{
                            borderWidth: 1,
                            borderColor: UI.border,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            fontSize: 13,
                            fontWeight: "600",
                            color: UI.text,
                            backgroundColor: "white",
                        }}
                    />
                    <DateTimePickerModal
                        isVisible={showDepPicker}
                        mode="datetime"
                        onConfirm={(date) => {
                            onChangeDepAt(date);
                            setShowDepPicker(false);
                        }}
                        onCancel={() => setShowDepPicker(false)}
                        date={depAt || new Date()}
                    />
                </View>

                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted, marginBottom: 8 }}>
                        Llegada
                    </Text>
                    <TextInput
                        value={formatDateTime(arrAt)}
                        onFocus={() => setShowArrPicker(true)}
                        placeholder="Seleccionar"
                        placeholderTextColor={UI.muted2}
                        editable={false}
                        style={{
                            borderWidth: 1,
                            borderColor: UI.border,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            fontSize: 13,
                            fontWeight: "600",
                            color: UI.text,
                            backgroundColor: "white",
                        }}
                    />
                    <DateTimePickerModal
                        isVisible={showArrPicker}
                        mode="datetime"
                        onConfirm={(date) => {
                            onChangeArrAt(date);
                            setShowArrPicker(false);
                        }}
                        onCancel={() => setShowArrPicker(false)}
                        date={arrAt || new Date()}
                    />
                </View>
            </View>
        </View>
    );
}
