// src/screens/Mobile/finances/travels/components/MiniKpiCard.tsx
import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface MiniKpiCardProps {
    title: string;
    value: string;
    icon: keyof typeof Ionicons.glyphMap;
    tone: "success" | "info" | "neutral" | "danger";
    px: (n: number) => number;
    fs: (n: number) => number;
}

export default function MiniKpiCard({
    title,
    value,
    icon,
    tone,
    px,
    fs,
}: MiniKpiCardProps) {
    const colors = {
        success: {
            bg: "rgba(16,185,129,0.10)",
            border: "rgba(16,185,129,0.25)",
            text: "#10B981",
        },
        info: {
            bg: "rgba(37,99,235,0.10)",
            border: "rgba(37,99,235,0.25)",
            text: "#2563EB",
        },
        neutral: {
            bg: "rgba(100,116,139,0.10)",
            border: "rgba(100,116,139,0.25)",
            text: "#64748B",
        },
        danger: {
            bg: "rgba(239,68,68,0.10)",
            border: "rgba(239,68,68,0.25)",
            text: "#EF4444",
        },
    };

    const style = colors[tone];

    return (
        <View
            style={{
                flex: 1,
                padding: px(12),
                borderRadius: px(14),
                borderWidth: 1,
                borderColor: style.border,
                backgroundColor: style.bg,
            }}
        >
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: px(6),
                    marginBottom: px(6),
                }}
            >
                <Ionicons name={icon} size={px(14)} color={style.text} />
                <Text
                    style={{
                        fontSize: fs(10),
                        fontWeight: "800",
                        color: style.text,
                    }}
                >
                    {title}
                </Text>
            </View>
            <Text
                style={{
                    fontSize: fs(18),
                    fontWeight: "900",
                    color: "#0B1220",
                }}
            >
                {value}
            </Text>
        </View>
    );
}
