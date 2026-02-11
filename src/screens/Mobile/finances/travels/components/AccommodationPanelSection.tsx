// src/screens/Mobile/finances/travels/components/AccommodationPanelSection.tsx
import React, { useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface TripPlanItem {
    id: number;
    type: string;
    title: string;
    date?: string | null;
    endTime?: string | null;
    location?: string | null;
    cost?: number | null;
    accommodationDetails?: {
        name?: string | null;
        address?: string | null;
        city?: string | null;
        country?: string | null;
        checkInAt?: string | null;
        checkOutAt?: string | null;
        guests?: number | null;
        rooms?: number | null;
        phone?: string | null;
        website?: string | null;
    } | null;
}

interface AccommodationPanelSectionProps {
    planItems: TripPlanItem[];
    onPressItem: (item: TripPlanItem) => void;
    onAdd: () => void;
}

const UI = {
    text: "#0B1220",
    muted: "#64748B",
    muted2: "#94A3B8",
    border: "rgba(148,163,184,0.22)",
    primary: "#8B5CF6",
};

function AccommodationCard({ item, onPress }: { item: TripPlanItem; onPress: () => void }) {
    const checkIn = item.date || item.accommodationDetails?.checkInAt;
    const checkOut = item.endTime || item.accommodationDetails?.checkOutAt;

    const checkInDate = checkIn
        ? new Date(checkIn).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
        : null;
    const checkOutDate = checkOut
        ? new Date(checkOut).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
        : null;

    const name = item.accommodationDetails?.name;
    const address = item.accommodationDetails?.address;
    const city = item.accommodationDetails?.city;
    const guests = item.accommodationDetails?.guests;
    const rooms = item.accommodationDetails?.rooms;
    const phone = item.accommodationDetails?.phone;
    const website = item.accommodationDetails?.website;

    return (
        <TouchableOpacity
            onPress={onPress}
            style={{
                backgroundColor: "white",
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: UI.border,
            }}
            activeOpacity={0.7}
        >
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: "rgba(139,92,246,0.10)",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                    }}
                >
                    <Ionicons name="bed-outline" size={24} color={UI.primary} />
                </View>

                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "800", color: UI.text }} numberOfLines={1}>
                        {item.title}
                    </Text>

                    {name && (
                        <Text style={{ fontSize: 12, fontWeight: "600", color: UI.muted, marginTop: 2 }} numberOfLines={1}>
                            {name}
                        </Text>
                    )}

                    {/* Address */}
                    {(address || city) && (
                        <View style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 4 }}>
                            <Ionicons name="location-outline" size={12} color={UI.muted2} style={{ marginTop: 2 }} />
                            <Text style={{ fontSize: 11, fontWeight: "600", color: UI.muted2, marginLeft: 4, flex: 1 }} numberOfLines={2}>
                                {address || city}
                            </Text>
                        </View>
                    )}

                    {/* Check-in / Check-out */}
                    {(checkInDate || checkOutDate) && (
                        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 8 }}>
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                                <Ionicons name="enter-outline" size={12} color="#10B981" />
                                <Text style={{ fontSize: 11, fontWeight: "600", color: "#10B981", marginLeft: 4 }}>
                                    {checkInDate || "?"}
                                </Text>
                            </View>
                            <Text style={{ fontSize: 11, fontWeight: "600", color: UI.muted2 }}>→</Text>
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                                <Ionicons name="exit-outline" size={12} color="#EF4444" />
                                <Text style={{ fontSize: 11, fontWeight: "600", color: "#EF4444", marginLeft: 4 }}>
                                    {checkOutDate || "?"}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Guests & Rooms */}
                    {(guests || rooms) && (
                        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 12 }}>
                            {guests && (
                                <View style={{ flexDirection: "row", alignItems: "center" }}>
                                    <Ionicons name="people-outline" size={12} color={UI.muted2} />
                                    <Text style={{ fontSize: 11, fontWeight: "600", color: UI.muted2, marginLeft: 4 }}>
                                        {guests} {guests === 1 ? "huésped" : "huéspedes"}
                                    </Text>
                                </View>
                            )}
                            {rooms && (
                                <View style={{ flexDirection: "row", alignItems: "center" }}>
                                    <Ionicons name="home-outline" size={12} color={UI.muted2} />
                                    <Text style={{ fontSize: 11, fontWeight: "600", color: UI.muted2, marginLeft: 4 }}>
                                        {rooms} {rooms === 1 ? "habitación" : "habitaciones"}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Contact info */}
                    {(phone || website) && (
                        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 8 }}>
                            {phone && (
                                <Pressable
                                    onPress={() => Linking.openURL(`tel:${phone}`)}
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        paddingHorizontal: 8,
                                        paddingVertical: 4,
                                        borderRadius: 8,
                                        backgroundColor: "rgba(37,99,235,0.08)",
                                    }}
                                >
                                    <Ionicons name="call-outline" size={12} color="#2563EB" />
                                    <Text style={{ fontSize: 10, fontWeight: "700", color: "#2563EB", marginLeft: 4 }}>Llamar</Text>
                                </Pressable>
                            )}
                            {website && (
                                <Pressable
                                    onPress={() => Linking.openURL(website)}
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        paddingHorizontal: 8,
                                        paddingVertical: 4,
                                        borderRadius: 8,
                                        backgroundColor: "rgba(139,92,246,0.08)",
                                    }}
                                >
                                    <Ionicons name="globe-outline" size={12} color={UI.primary} />
                                    <Text style={{ fontSize: 10, fontWeight: "700", color: UI.primary, marginLeft: 4 }}>Web</Text>
                                </Pressable>
                            )}
                        </View>
                    )}

                    {/* Cost */}
                    {item.cost != null && (
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#10B981", marginTop: 8 }}>
                            {typeof item.cost === 'number' ? item.cost.toFixed(2) : item.cost} €
                        </Text>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}

export default function AccommodationPanelSection({ planItems, onPressItem, onAdd }: AccommodationPanelSectionProps) {
    const accommodationItems = useMemo(() => {
        return planItems
            .filter((item) => item.type === "accommodation")
            .sort((a, b) => {
                const dateA = a.date || "";
                const dateB = b.date || "";
                return dateA.localeCompare(dateB);
            });
    }, [planItems]);

    return (
        <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {/* Header */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <View>
                        <Text style={{ fontSize: 18, fontWeight: "900", color: UI.text }}>Alojamientos</Text>
                        <Text style={{ fontSize: 12, fontWeight: "600", color: UI.muted, marginTop: 2 }}>
                            {accommodationItems.length} {accommodationItems.length === 1 ? "alojamiento" : "alojamientos"}
                        </Text>
                    </View>
                    <Pressable
                        onPress={onAdd}
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 12,
                            backgroundColor: "rgba(139,92,246,0.10)",
                        }}
                    >
                        <Ionicons name="add" size={18} color={UI.primary} />
                        <Text style={{ fontSize: 12, fontWeight: "800", color: UI.primary }}>Añadir</Text>
                    </Pressable>
                </View>

                {/* Accommodation list */}
                {accommodationItems.length === 0 ? (
                    <View style={{ paddingVertical: 48, alignItems: "center" }}>
                        <Ionicons name="bed-outline" size={48} color={UI.muted2} />
                        <Text style={{ fontSize: 14, fontWeight: "700", color: UI.muted, marginTop: 12, textAlign: "center" }}>
                            No hay alojamientos registrados
                        </Text>
                        <Text style={{ fontSize: 12, fontWeight: "600", color: UI.muted2, marginTop: 4, textAlign: "center" }}>
                            Añade hoteles, apartamentos, hostales, etc.
                        </Text>
                    </View>
                ) : (
                    accommodationItems.map((item) => (
                        <AccommodationCard key={item.id} item={item} onPress={() => onPressItem(item)} />
                    ))
                )}
            </ScrollView>
        </View>
    );
}
