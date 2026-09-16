import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatEuro } from "../utils/currency";

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
  compact?: boolean;
  progressLabel?: "completado" | "gastado";
  // Si es true, el "% completado" del footer muestra el valor real aunque
  // supere el 100% (p.ej. "110%" si te has pasado del límite). La barra
  // siempre se capa visualmente en el 100% de ancho, se muestre o no el overflow.
  showOverflow?: boolean;
}

const euro = (n: number) => formatEuro(n);
const pct = (p: number) => `${p}%` as `${number}%`;
const getRawProgress = (a: number, b: number) => (b > 0 ? Math.max(0, (a / b) * 100) : 0);

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
  compact = false,
  showOverflow = false,
  progressLabel = "completado",
}: Props) {
  const rawPct = getRawProgress(current, total);
  const barPct = Math.min(100, rawPct);
  const displayPct = showOverflow ? rawPct : barPct;
  const remaining = Math.max(0, total - current);
  const showEmoji = isEmoji(icon);
  const barColor = progressColor || color;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      className={compact ? "px-4 py-3 rounded-2xl mb-2" : "p-4 rounded-3xl mb-3"}
      style={{
        backgroundColor,
        shadowColor: "#000",
        shadowOpacity: backgroundColor === "white" ? 0.04 : 0.08,
        shadowRadius: 6,
        elevation: 1,
      }}
    >
      {/* HEADER */}
      <View className={compact ? "flex-row justify-between items-center mb-2" : "flex-row justify-between items-center mb-3"}>
        <View className="flex-row items-center">
          {icon && (
            <View
              className={compact ? "w-6 h-6 rounded-md items-center justify-center mr-2" : "w-8 h-8 rounded-lg items-center justify-center mr-2"}
              style={{
                backgroundColor: backgroundColor === "white"
                  ? "#F3F4F6"
                  : "rgba(255,255,255,0.2)",
              }}
            >
              {showEmoji ? (
                <Text style={{ fontSize: compact ? 15 : 22 }}>{icon}</Text>
              ) : (
                <Ionicons name={icon as any} size={compact ? 14 : 20} color={titleColor} />
              )}
            </View>
          )}

          <Text
            className={compact ? "text-[14px] font-semibold" : "text-[17px] font-semibold"}
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
          className={compact ? "text-[14px] font-semibold" : "text-[17px] font-semibold"}
          style={{ color: titleColor }}
        >
          {euro(remaining)} €
        </Text>
      </View>

      {/* PROGRESS */}
      <View
        className={compact ? "rounded-full overflow-hidden mb-2" : "h-3 rounded-full overflow-hidden mb-3"}
        style={{
          height: compact ? 8 : undefined,
          backgroundColor:
            backgroundColor === "white"
              ? "#E5E7EB"
              : "rgba(255,255,255,0.35)",
        }}
      >
        <View
          className="h-full rounded-full"
          style={{
            width: pct(barPct),
            backgroundColor: barColor,
          }}
        />
      </View>

      {/* FOOTER */}
      <View className="flex-row justify-between">
        <Text className={compact ? "text-[11px]" : "text-[13px]"} style={{ color: subtitleColor }}>
          {displayPct.toFixed(0)}% {progressLabel}
        </Text>

        <Text className={compact ? "text-[11px]" : "text-[13px]"} style={{ color: subtitleColor }}>
          {euro(total)} € totales
        </Text>
      </View>
    </TouchableOpacity>
  );
}
