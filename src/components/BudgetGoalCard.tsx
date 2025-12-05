import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  title: string;
  icon?: string; // emoji o icono
  total: number;
  current: number;
  daysLeft?: number;
  color?: string; // color de progreso por defecto
  onPress?: () => void;

  // NUEVOS OPCIONALES
  backgroundColor?: string;
  titleColor?: string;
  subtitleColor?: string;
  progressColor?: string;
}

const euro = (n: number) => n.toFixed(2).replace(".", ",");
const pct = (p: number) => `${p}%` as `${number}%`;
const getProgress = (a: number, b: number) =>
  b > 0 ? Math.min(100, Math.max(0, (a / b) * 100)) : 0;

function isEmoji(str?: string) {
  if (!str) return false;
  return /\p{Emoji}/u.test(str);
}

export default function BudgetGoalCard({
  title,
  icon,
  total,
  current,
  daysLeft,
  color = "#3b82f6",
  onPress,

  // nuevos estilos opcionales
  backgroundColor = "white",
  titleColor = "#111827",
  subtitleColor = "#6B7280",
  progressColor,
}: Props) {
  const p = getProgress(current, total);
  const remaining = Math.max(0, total - current);
  const showEmoji = isEmoji(icon);
  const barColor = progressColor || color;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      className="p-4 rounded-3xl mb-3"
      style={{
        backgroundColor,
        shadowColor: "#000",
        shadowOpacity: backgroundColor === "white" ? 0.04 : 0.08,
        shadowRadius: 6,
        elevation: 1,
      }}
    >
      {/* HEADER */}
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row items-center">
          {icon && (
            <View
              className="w-8 h-8 rounded-lg items-center justify-center mr-2"
              style={{
                backgroundColor: backgroundColor === "white"
                  ? "#F3F4F6"
                  : "rgba(255,255,255,0.2)",
              }}
            >
              {showEmoji ? (
                <Text style={{ fontSize: 22 }}>{icon}</Text>
              ) : (
                <Ionicons name={icon as any} size={20} color={titleColor} />
              )}
            </View>
          )}

          <Text
            className="text-[17px] font-semibold"
            style={{ color: titleColor }}
          >
            {title}
          </Text>

          {daysLeft !== undefined && (
            <Text className="text-[13px] ml-2" style={{ color: subtitleColor }}>
              {daysLeft}d
            </Text>
          )}
        </View>

        <Text
          className="text-[17px] font-semibold"
          style={{ color: titleColor }}
        >
          {euro(remaining)} €
        </Text>
      </View>

      {/* PROGRESS */}
      <View
        className="h-3 rounded-full overflow-hidden mb-3"
        style={{
          backgroundColor:
            backgroundColor === "white"
              ? "#E5E7EB"
              : "rgba(255,255,255,0.35)",
        }}
      >
        <View
          className="h-full rounded-full"
          style={{
            width: pct(p),
            backgroundColor: barColor,
          }}
        />
      </View>

      {/* FOOTER */}
      <View className="flex-row justify-between">
        <Text className="text-[13px]" style={{ color: subtitleColor }}>
          {p.toFixed(0)}% completado
        </Text>

        <Text className="text-[13px]" style={{ color: subtitleColor }}>
          {euro(total)} € totales
        </Text>
      </View>
    </TouchableOpacity>
  );
}
