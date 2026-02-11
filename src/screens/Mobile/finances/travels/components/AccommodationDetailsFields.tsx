// src/screens/Mobile/finances/travels/components/AccommodationDetailsFields.tsx
import React from "react";
import { View, Text, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";

const UI = {
    text: "#0B1220",
    muted: "#64748B",
    muted2: "#94A3B8",
    border: "rgba(148,163,184,0.22)",
};

interface AccommodationDetailsFieldsProps {
    name?: string;
    address?: string;
    city?: string;
    country?: string;
    checkInAt?: Date | null;
    checkOutAt?: Date | null;
    guests?: number;
    rooms?: number;
    bookingRef?: string;
    phone?: string;
    website?: string;
    onChangeName: (value: string) => void;
    onChangeAddress: (value: string) => void;
    onChangeCity: (value: string) => void;
    onChangeCountry: (value: string) => void;
    onChangeCheckInAt: (value: Date | null) => void;
    onChangeCheckOutAt: (value: Date | null) => void;
    onChangeGuests: (value: string) => void;
    onChangeRooms: (value: string) => void;
    onChangeBookingRef: (value: string) => void;
    onChangePhone: (value: string) => void;
    onChangeWebsite: (value: string) => void;
}

export default function AccommodationDetailsFields({
    name,
    address,
    city,
    country,
    checkInAt,
    checkOutAt,
    guests,
    rooms,
    bookingRef,
    phone,
    website,
    onChangeName,
    onChangeAddress,
    onChangeCity,
    onChangeCountry,
    onChangeCheckInAt,
    onChangeCheckOutAt,
    onChangeGuests,
    onChangeRooms,
    onChangeBookingRef,
    onChangePhone,
    onChangeWebsite,
}: AccommodationDetailsFieldsProps) {
    const [showCheckInPicker, setShowCheckInPicker] = React.useState(false);
    const [showCheckOutPicker, setShowCheckOutPicker] = React.useState(false);

    const formatDateTime = (date: Date | null) => {
        if (!date) return "";
        return date.toLocaleString("es-ES", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <View style={{ gap: 14 }}>
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="bed-outline" size={18} color={UI.text} />
                <Text style={{ fontSize: 16, fontWeight: "800", color: UI.text }}>
                    Detalles del Alojamiento
                </Text>
            </View>

            {/* Name */}
            <View>
                <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted, marginBottom: 8 }}>
                    Nombre del alojamiento
                </Text>
                <TextInput
                    value={name}
                    onChangeText={onChangeName}
                    placeholder="Ej: Hotel Barceló"
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

            {/* Address */}
            <View>
                <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted, marginBottom: 8 }}>
                    Dirección
                </Text>
                <TextInput
                    value={address}
                    onChangeText={onChangeAddress}
                    placeholder="Calle Principal, 123"
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

            {/* City & Country */}
            <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted, marginBottom: 8 }}>
                        Ciudad
                    </Text>
                    <TextInput
                        value={city}
                        onChangeText={onChangeCity}
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

                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted, marginBottom: 8 }}>
                        País
                    </Text>
                    <TextInput
                        value={country}
                        onChangeText={onChangeCountry}
                        placeholder="España"
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

            {/* Check-in & Check-out */}
            <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted, marginBottom: 8 }}>
                        Check-in
                    </Text>
                    <TextInput
                        value={formatDateTime(checkInAt)}
                        onFocus={() => setShowCheckInPicker(true)}
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
                        isVisible={showCheckInPicker}
                        mode="datetime"
                        onConfirm={(date) => {
                            onChangeCheckInAt(date);
                            setShowCheckInPicker(false);
                        }}
                        onCancel={() => setShowCheckInPicker(false)}
                        date={checkInAt || new Date()}
                    />
                </View>

                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted, marginBottom: 8 }}>
                        Check-out
                    </Text>
                    <TextInput
                        value={formatDateTime(checkOutAt)}
                        onFocus={() => setShowCheckOutPicker(true)}
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
                        isVisible={showCheckOutPicker}
                        mode="datetime"
                        onConfirm={(date) => {
                            onChangeCheckOutAt(date);
                            setShowCheckOutPicker(false);
                        }}
                        onCancel={() => setShowCheckOutPicker(false)}
                        date={checkOutAt || new Date()}
                    />
                </View>
            </View>

            {/* Guests & Rooms */}
            <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted, marginBottom: 8 }}>
                        Huéspedes
                    </Text>
                    <TextInput
                        value={guests?.toString() || ""}
                        onChangeText={onChangeGuests}
                        placeholder="2"
                        placeholderTextColor={UI.muted2}
                        keyboardType="number-pad"
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
                        Habitaciones
                    </Text>
                    <TextInput
                        value={rooms?.toString() || ""}
                        onChangeText={onChangeRooms}
                        placeholder="1"
                        placeholderTextColor={UI.muted2}
                        keyboardType="number-pad"
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

            {/* Phone */}
            <View>
                <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted, marginBottom: 8 }}>
                    Teléfono
                </Text>
                <TextInput
                    value={phone}
                    onChangeText={onChangePhone}
                    placeholder="+34 123 456 789"
                    placeholderTextColor={UI.muted2}
                    keyboardType="phone-pad"
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

            {/* Website */}
            <View>
                <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted, marginBottom: 8 }}>
                    Sitio web
                </Text>
                <TextInput
                    value={website}
                    onChangeText={onChangeWebsite}
                    placeholder="https://..."
                    placeholderTextColor={UI.muted2}
                    keyboardType="url"
                    autoCapitalize="none"
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
    );
}
