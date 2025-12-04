import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  title: string;
  icon?: string; // cambiamos el tipo para permitir emoji
  total: number;
  current: number;
  daysLeft?: number;
  color?: string;
  onPress?: () => void;
}

const euro = (n: number) => n.toFixed(2).replace(".", ",");
const pct = (p: number) => `${p}%` as `${number}%`;
const getProgress = (a: number, b: number) =>
  b > 0 ? Math.min(100, Math.max(0, (a / b) * 100)) : 0;

// Detecta si un string contiene al menos un emoji real
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
}: Props) {
  const p = getProgress(current, total);
  const remaining = Math.max(0, total - current);
  const showEmoji = isEmoji(icon);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      className="bg-white p-4 rounded-3xl mb-3"
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 5,
        elevation: 1,
      }}
    >
      {/* HEADER */}
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row items-center">
          {icon && (
            <View className="w-8 h-8 bg-gray-100 rounded-lg items-center justify-center mr-2">
              {showEmoji ? (
                <Text style={{ fontSize: 22 }}>{icon}</Text>
              ) : (
                <Ionicons name={icon as any} size={20} color={color} />
              )}
            </View>
          )}

          <Text className="text-[17px] font-semibold text-black">
            {title}
          </Text>

          {daysLeft !== undefined && (
            <Text className="text-[13px] text-gray-400 ml-2">
              {daysLeft}d
            </Text>
          )}
        </View>

        <Text className="text-[17px] font-semibold text-black">
          {euro(total)} €
        </Text>
      </View>

      {/* PROGRESS BAR */}
      <View className="h-3 bg-gray-200 rounded-full overflow-hidden mb-3">
        <View
          className="h-full rounded-full"
          style={{
            width: pct(p),
            backgroundColor: color,
          }}
        />
      </View>

      {/* FOOTER */}
      <View className="flex-row justify-between">
        <Text className="text-gray-500 text-[13px]">
          {p.toFixed(0)}% completado
        </Text>

        <Text className="text-gray-500 text-[13px]">
          {euro(remaining)} € restantes
        </Text>
      </View>
    </TouchableOpacity>
  );
}
