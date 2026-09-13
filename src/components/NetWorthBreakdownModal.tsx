import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/theme";
import { formatEuro } from "../utils/currency";
import IconCircleButton from "./IconCircleButton";

interface Props {
  visible: boolean;
  onClose: () => void;
  onOpenDetails: () => void;
  current: number;
  periodDelta: number;
  periodLabel: string;
  savings: number;
  investmentResult: number;
  adjustments: number;
}

const signedMoney = (value: number) =>
  `${value >= 0 ? "+" : "−"}${formatEuro(Math.abs(value))} €`;

function BreakdownRow({
  icon,
  iconColor,
  iconBackground,
  label,
  caption,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBackground: string;
  label: string;
  caption: string;
  value: number;
}) {
  const valueColor = Math.abs(value) < 0.005 ? "#64748B" : value >= 0 ? colors.success : colors.danger;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 11 }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: iconBackground, alignItems: "center", justifyContent: "center", marginRight: 10 }}>
        <Ionicons name={icon} size={17} color={iconColor} />
      </View>
      <View style={{ flex: 1, paddingRight: 10 }}>
        <Text style={{ fontSize: 13.5, fontWeight: "700", color: "#0F172A" }}>{label}</Text>
        <Text style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>{caption}</Text>
      </View>
      <Text style={{ fontSize: 14, fontWeight: "800", color: valueColor, fontVariant: ["tabular-nums"] }}>
        {signedMoney(value)}
      </Text>
    </View>
  );
}

export default function NetWorthBreakdownModal({
  visible,
  onClose,
  onOpenDetails,
  current,
  periodDelta,
  periodLabel,
  savings,
  investmentResult,
  adjustments,
}: Props) {
  const insets = useSafeAreaInsets();
  const initial = current - periodDelta;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" }}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View
            style={{
              backgroundColor: "white",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 20,
              paddingTop: 18,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ fontSize: 19, fontWeight: "800", color: "#0F172A" }}>Variación del patrimonio</Text>
                <Text style={{ fontSize: 12.5, color: "#64748B", marginTop: 3 }}>
                  Así se compone el cambio {periodLabel}.
                </Text>
              </View>
              <IconCircleButton icon="close" onPress={onClose} size={30} iconSize={16} />
            </View>

            <View style={{ alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 16, paddingVertical: 12, marginBottom: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.6 }}>CAMBIO TOTAL</Text>
              <Text
                style={{ fontSize: 24, fontWeight: "900", color: periodDelta >= 0 ? colors.success : colors.danger, marginTop: 2, fontVariant: ["tabular-nums"] }}
              >
                {signedMoney(periodDelta)}
              </Text>
            </View>

            <BreakdownRow
              icon="wallet-outline"
              iconColor={colors.primary}
              iconBackground="#EEF2FF"
              label="Ahorro del periodo"
              caption="Ingresos menos gastos"
              value={savings}
            />
            <BreakdownRow
              icon="trending-up-outline"
              iconColor="#7C3AED"
              iconBackground="#F3E8FF"
              label="Resultado de inversiones"
              caption="Ganancias y pérdidas del periodo"
              value={investmentResult}
            />
            <BreakdownRow
              icon="options-outline"
              iconColor="#64748B"
              iconBackground="#F1F5F9"
              label="Ajustes y conciliación"
              caption="Diferencias de saldo y valoración"
              value={adjustments}
            />

            <View style={{ borderTopWidth: 1, borderTopColor: "#E2E8F0", marginTop: 3, paddingTop: 12, gap: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 12.5, color: "#64748B" }}>Patrimonio inicial</Text>
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#334155", fontVariant: ["tabular-nums"] }}>{formatEuro(initial)} €</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 12.5, color: "#64748B" }}>Patrimonio actual</Text>
                <Text style={{ fontSize: 14, fontWeight: "800", color: "#0F172A", fontVariant: ["tabular-nums"] }}>{formatEuro(current)} €</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onOpenDetails}
              activeOpacity={0.8}
              style={{ marginTop: 18, height: 44, borderRadius: 13, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <Text style={{ color: "white", fontSize: 13.5, fontWeight: "700" }}>Ver evolución completa</Text>
              <Ionicons name="arrow-forward" size={15} color="white" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
