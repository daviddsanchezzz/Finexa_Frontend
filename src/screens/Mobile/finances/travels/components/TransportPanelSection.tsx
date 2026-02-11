// src/screens/Mobile/finances/travels/components/TransportPanelSection.tsx
import React, { useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface TripPlanItem {
    id: number;
    type: string;
    title: string;
    date?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    location?: string | null;
    cost?: number | null;
    flightDetails?: any;
    destinationTransport?: any;
}

interface TransportPanelSectionProps {
    planItems: TripPlanItem[];
    onPressItem: (item: TripPlanItem) => void;
    onAdd: () => void;
}

const UI = {
    text: "#0B1220",
    muted: "#64748B",
    muted2: "#94A3B8",
    border: "rgba(148,163,184,0.22)",
    primary: "#0EA5E9",
};

function TransportCard({ item, onPress }: { item: TripPlanItem; onPress: () => void }) {
    const icon =
        item.type === "flight"
            ? "airplane-outline"
            : item.type === "taxi"
                ? "car-sport-outline"
                : "bus-outline";

    const date = item.date ? new Date(item.date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) : null;
    const time = item.startTime
        ? new Date(item.startTime).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
        : null;

    const flightNumber = item.flightDetails?.flightNumberRaw;
    const fromIata = item.flightDetails?.fromIata;
    const toIata = item.flightDetails?.toIata;
    const company = item.destinationTransport?.company;

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
                        backgroundColor: "rgba(14,165,233,0.10)",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                    }}
                >
                    <Ionicons name={icon} size={24} color={UI.primary} />
                </View>

                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "800", color: UI.text }} numberOfLines={1}>
                        {item.title}
                    </Text>

                    {/* Flight details */}
                    {item.type === "flight" && (fromIata || toIata) && (
                        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                            <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted }}>
                                {fromIata || "?"} → {toIata || "?"}
                            </Text>
                            {flightNumber && (
                                <Text style={{ fontSize: 11, fontWeight: "600", color: UI.muted2, marginLeft: 8 }}>
                                    {flightNumber}
                                </Text>
                            )}
                        </View>
                    )}

                    {/* Transport company */}
                    {item.type === "transport" && company && (
                        <Text style={{ fontSize: 12, fontWeight: "600", color: UI.muted, marginTop: 4 }}>
                            {company}
                        </Text>
                    )}

                    {/* Date and time */}
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 8 }}>
                        {date && (
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                                <Ionicons name="calendar-outline" size={12} color={UI.muted2} />
                                <Text style={{ fontSize: 11, fontWeight: "600", color: UI.muted2, marginLeft: 4 }}>
                                    {date}
                                </Text>
                            </View>
                        )}
                        {time && (
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                                <Ionicons name="time-outline" size={12} color={UI.muted2} />
                                <Text style={{ fontSize: 11, fontWeight: "600", color: UI.muted2, marginLeft: 4 }}>
                                    {time}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Cost */}
                    {item.cost != null && (
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#10B981", marginTop: 6 }}>
                            {typeof item.cost === 'number' ? item.cost.toFixed(2) : item.cost} €
                        </Text>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}

export default function TransportPanelSection({ planItems, onPressItem, onAdd }: TransportPanelSectionProps) {
    const transportItems = useMemo(() => {
        return planItems
            .filter((item) => ["flight", "transport", "taxi"].includes(item.type))
            .sort((a, b) => {
                const dateA = a.startTime || a.date || "";
                const dateB = b.startTime || b.date || "";
                return dateA.localeCompare(dateB);
            });
    }, [planItems]);

    return (
        <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {/* Header */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <View>
                        <Text style={{ fontSize: 18, fontWeight: "900", color: UI.text }}>Transportes</Text>
                        <Text style={{ fontSize: 12, fontWeight: "600", color: UI.muted, marginTop: 2 }}>
                            {transportItems.length} {transportItems.length === 1 ? "transporte" : "transportes"}
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
                            backgroundColor: "rgba(14,165,233,0.10)",
                        }}
                    >
                        <Ionicons name="add" size={18} color={UI.primary} />
                        <Text style={{ fontSize: 12, fontWeight: "800", color: UI.primary }}>Añadir</Text>
                    </Pressable>
                </View>

                {/* Transport list */}
                {transportItems.length === 0 ? (
                    <View style={{ paddingVertical: 48, alignItems: "center" }}>
                        <Ionicons name="airplane-outline" size={48} color={UI.muted2} />
                        <Text style={{ fontSize: 14, fontWeight: "700", color: UI.muted, marginTop: 12, textAlign: "center" }}>
                            No hay transportes registrados
                        </Text>
                        <Text style={{ fontSize: 12, fontWeight: "600", color: UI.muted2, marginTop: 4, textAlign: "center" }}>
                            Añade vuelos, trenes, autobuses, etc.
                        </Text>
                    </View>
                ) : (
                    transportItems.map((item) => <TransportCard key={item.id} item={item} onPress={() => onPressItem(item)} />)
                )}
            </ScrollView>
        </View>
    );
}
