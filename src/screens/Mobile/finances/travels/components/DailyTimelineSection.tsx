// src/screens/Mobile/finances/travels/components/DailyTimelineSection.tsx
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
}

interface DailyTimelineSectionProps {
    trip: { startDate: string; endDate: string };
    planItems: TripPlanItem[];
    onPressItem: (item: TripPlanItem) => void;
    onAddForDate: (dateISO: string) => void;
}

const UI = {
    text: "#0B1220",
    muted: "#64748B",
    muted2: "#94A3B8",
    border: "rgba(148,163,184,0.22)",
    primary: "#2563EB",
};

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    flight: "airplane-outline",
    accommodation: "bed-outline",
    transport: "bus-outline",
    taxi: "car-sport-outline",
    museum: "color-palette-outline",
    monument: "business-outline",
    viewpoint: "eye-outline",
    free_tour: "walk-outline",
    concert: "musical-notes-outline",
    bar_party: "wine-outline",
    beach: "sunny-outline",
    restaurant: "restaurant-outline",
    shopping: "cart-outline",
    other: "sparkles-outline",
};

function DayColumn({
    day,
    dayNumber,
    items,
    onPressItem,
    onAdd,
}: {
    day: string;
    dayNumber: number;
    items: TripPlanItem[];
    onPressItem: (item: TripPlanItem) => void;
    onAdd: () => void;
}) {
    const dayDate = new Date(day);
    const dayName = dayDate.toLocaleDateString("es-ES", { weekday: "short" });
    const dayNum = dayDate.getDate();
    const monthName = dayDate.toLocaleDateString("es-ES", { month: "short" });

    return (
        <View
            style={{
                width: 280,
                marginRight: 16,
                backgroundColor: "white",
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: UI.border,
            }}
        >
            {/* Header */}
            <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View>
                        <Text style={{ fontSize: 11, fontWeight: "800", color: UI.primary, textTransform: "uppercase" }}>
                            Día {dayNumber}
                        </Text>
                        <Text style={{ fontSize: 18, fontWeight: "900", color: UI.text, marginTop: 2 }}>
                            {dayNum} {monthName}
                        </Text>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted, textTransform: "capitalize" }}>
                            {dayName}
                        </Text>
                    </View>
                    <Pressable
                        onPress={onAdd}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: "rgba(37,99,235,0.10)",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Ionicons name="add" size={22} color={UI.primary} />
                    </Pressable>
                </View>
            </View>

            {/* Timeline */}
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                {items.length === 0 ? (
                    <View style={{ paddingVertical: 32, alignItems: "center" }}>
                        <Ionicons name="calendar-outline" size={32} color={UI.muted2} />
                        <Text style={{ fontSize: 12, fontWeight: "600", color: UI.muted2, marginTop: 8, textAlign: "center" }}>
                            Sin actividades
                        </Text>
                    </View>
                ) : (
                    items.map((item, idx) => {
                        const icon = TYPE_ICONS[item.type] || "sparkles-outline";
                        const time = item.startTime
                            ? new Date(item.startTime).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
                            : null;

                        return (
                            <TouchableOpacity
                                key={item.id}
                                onPress={() => onPressItem(item)}
                                style={{
                                    marginBottom: 12,
                                    paddingLeft: 12,
                                    borderLeftWidth: 3,
                                    borderLeftColor: idx === 0 ? UI.primary : UI.border,
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                                    <View
                                        style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 16,
                                            backgroundColor: idx === 0 ? "rgba(37,99,235,0.15)" : "rgba(148,163,184,0.10)",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            marginRight: 10,
                                        }}
                                    >
                                        <Ionicons name={icon} size={16} color={idx === 0 ? UI.primary : UI.muted} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        {time && (
                                            <Text style={{ fontSize: 10, fontWeight: "800", color: UI.muted, marginBottom: 2 }}>
                                                {time}
                                            </Text>
                                        )}
                                        <Text style={{ fontSize: 13, fontWeight: "800", color: UI.text }} numberOfLines={2}>
                                            {item.title}
                                        </Text>
                                        {item.location && (
                                            <Text style={{ fontSize: 11, fontWeight: "600", color: UI.muted, marginTop: 2 }} numberOfLines={1}>
                                                📍 {item.location}
                                            </Text>
                                        )}
                                        {item.cost != null && (
                                            <Text style={{ fontSize: 11, fontWeight: "700", color: "#10B981", marginTop: 4 }}>
                                                {typeof item.cost === 'number' ? item.cost.toFixed(2) : item.cost} €
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );
}

export default function DailyTimelineSection({
    trip,
    planItems,
    onPressItem,
    onAddForDate,
}: DailyTimelineSectionProps) {
    // Generate array of days between startDate and endDate
    const days = useMemo(() => {
        const start = new Date(trip.startDate);
        const end = new Date(trip.endDate);
        const daysList: string[] = [];

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            daysList.push(d.toISOString().split("T")[0]);
        }

        return daysList;
    }, [trip.startDate, trip.endDate]);

    // Group items by day
    const itemsByDay = useMemo(() => {
        const groups = new Map<string, TripPlanItem[]>();

        planItems.forEach((item) => {
            const day = item.date ? item.date.split("T")[0] : "no-date";
            if (!groups.has(day)) groups.set(day, []);
            groups.get(day)!.push(item);
        });

        // Sort items of each day by time
        groups.forEach((items) => {
            items.sort((a, b) => {
                const timeA = a.startTime || a.date || "";
                const timeB = b.startTime || b.date || "";
                return timeA.localeCompare(timeB);
            });
        });

        return groups;
    }, [planItems]);

    if (days.length === 0) {
        return (
            <View style={{ padding: 32, alignItems: "center" }}>
                <Ionicons name="calendar-outline" size={48} color={UI.muted2} />
                <Text style={{ fontSize: 14, fontWeight: "700", color: UI.muted, marginTop: 12, textAlign: "center" }}>
                    Este viaje no tiene fechas definidas
                </Text>
            </View>
        );
    }

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
        >
            {days.map((day, idx) => (
                <DayColumn
                    key={day}
                    day={day}
                    dayNumber={idx + 1}
                    items={itemsByDay.get(day) || []}
                    onPressItem={onPressItem}
                    onAdd={() => onAddForDate(day)}
                />
            ))}
        </ScrollView>
    );
}
