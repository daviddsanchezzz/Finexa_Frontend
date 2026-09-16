import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { formatEuro as formatEuroBase } from "../utils/currency";
import { colors } from "../theme/theme";

const formatEuro = (n: number) => `${formatEuroBase(n)} €`;

export type DebtFrequency = "weekly" | "monthly" | "quarterly" | "yearly";

const FREQUENCY_SUFFIX: Record<DebtFrequency, string> = {
  weekly: "semana",
  monthly: "mes",
  quarterly: "trim.",
  yearly: "año",
};

function daysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function daysLabel(days: number): string {
  if (days < 0) return "vencido";
  if (days === 0) return "hoy";
  if (days === 1) return "mañana";
  return `${days} d`;
}

interface Props {
  title: string;
  icon?: string | null;
  color?: string | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  monthlyPayment?: number | null;
  paymentFrequency?: DebtFrequency | null;
  nextDueDate?: string | null;
  onPress?: () => void;
}

// Tarjeta compacta de fila para la lista de Deudas: icono + título + importe
// pendiente en una sola cabecera, barra de progreso "% pagado" (crece hacia
// el 100%) y un único footer con el % y, si tiene pagos periódicos, la cuota
// y el próximo vencimiento — 3 líneas visuales en total, como BudgetGoalCard.
export default function DebtListCard({
  title,
  icon,
  color,
  totalAmount,
  paidAmount,
  remainingAmount,
  monthlyPayment,
  paymentFrequency,
  nextDueDate,
  onPress,
}: Props) {
  const rawPct = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
  const pct = Math.min(100, Math.max(0, rawPct));
  const barColor = color || colors.primary;
  const hasPeriodicPayments = monthlyPayment != null && paymentFrequency != null;

  const rightFooter = hasPeriodicPayments
    ? `${formatEuro(monthlyPayment!)}/${FREQUENCY_SUFFIX[paymentFrequency!]}${nextDueDate ? ` · ${daysLabel(daysUntil(nextDueDate))}` : ""}`
    : `${formatEuro(totalAmount)} totales`;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        backgroundColor: "white",
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 9,
            backgroundColor: "#F3F4F6",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 9,
          }}
        >
          <Text style={{ fontSize: 14 }}>{icon || "💸"}</Text>
        </View>
        <Text style={{ flex: 1, fontSize: 14.5, fontWeight: "700", color: colors.ink }} numberOfLines={1}>
          {title}
        </Text>
        <Text style={{ fontSize: 14.5, fontWeight: "700", color: colors.ink, marginLeft: 8 }}>
          {formatEuro(remainingAmount)}
        </Text>
      </View>

      <View style={{ height: 6, borderRadius: 999, backgroundColor: "#E5E7EB", overflow: "hidden", marginBottom: 6 }}>
        <View style={{ height: "100%", width: `${pct}%`, borderRadius: 999, backgroundColor: barColor }} />
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 11.5, fontWeight: "600", color: "#6B7280" }}>{pct.toFixed(0)}% pagado</Text>
        <Text style={{ fontSize: 11.5, fontWeight: "600", color: "#6B7280" }}>{rightFooter}</Text>
      </View>
    </TouchableOpacity>
  );
}
