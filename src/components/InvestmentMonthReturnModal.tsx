import React, { useEffect, useState } from "react";
import { Modal, View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/api";
import { formatEuro } from "../utils/currency";

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface SnapshotRow {
  monthStart: string;
  startValue: number | null;
  endValue: number;
  cashflowNet: number;
  profit: number;
  returnPct: number | null;
}

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Mismo popup "Inicio/Final/Cashflow/Rentabilidad %/Rentabilidad €" que
// InvestmentsScreen abre al tocar la barra del mes en curso, reutilizado aquí
// para el indicador "RENTABILIDAD" de Home.
export default function InvestmentMonthReturnModal({ visible, onClose }: Props) {
  const [row, setRow] = useState<SnapshotRow | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    api
      .get("/investments/snapshots/current")
      .then((res) => setRow(res.data ?? null))
      .catch(() => setRow(null))
      .finally(() => setLoading(false));
  }, [visible]);

  const money = (n: number) => `${formatEuro(n)} €`;
  const neutral = (v: number | null) => (v == null || !Number.isFinite(v) ? "-" : money(v));
  const signed = (v: number | null) =>
    v == null || !Number.isFinite(v) ? "-" : `${v >= 0 ? "+" : ""}${money(Math.abs(v))}`;
  const pct = (v: number | null) =>
    v == null || !Number.isFinite(v) ? "-" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(2).replace(".", ",")} %`;
  const tone = (v: number | null) =>
    v == null || !Number.isFinite(v) ? "#94A3B8" : v >= 0 ? "#14B8A6" : "#FB7185";

  const monthDate = row ? new Date(row.monthStart) : null;
  const title = monthDate
    ? `${capitalize(monthDate.toLocaleDateString("es-ES", { month: "long" }))} · ${monthDate.getFullYear()} (en curso)`
    : "Rentabilidad de este mes";

  const rows = row
    ? ([
        { label: "Inicio", value: neutral(row.startValue), color: "#0F172A" },
        { label: "Final", value: neutral(row.endValue), color: "#0F172A" },
        { label: "Cashflow", value: signed(row.cashflowNet), color: tone(row.cashflowNet) },
        { label: "Rentabilidad %", value: pct(row.returnPct), color: tone(row.returnPct) },
        { label: "Rentabilidad €", value: signed(row.profit), color: tone(row.profit) },
      ] as const)
    : [];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", paddingHorizontal: 28 }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={{ width: "100%" }} onPress={() => {}}>
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 24,
              padding: 20,
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 8 },
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <Text style={{ fontSize: 17, fontWeight: "900", color: "#0F172A" }}>{title}</Text>
              <TouchableOpacity
                onPress={onClose}
                style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="close" size={14} color="#64748B" />
              </TouchableOpacity>
            </View>

            {loading || !row ? (
              <ActivityIndicator color="#0F172A" style={{ marginVertical: 20 }} />
            ) : (
              rows.map(({ label, value, color }, i) => (
                <View
                  key={label}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 11,
                    borderBottomWidth: i < rows.length - 1 ? 1 : 0,
                    borderBottomColor: "#F1F5F9",
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B" }}>{label}</Text>
                  <Text style={{ fontSize: 14, fontWeight: "800", color }}>{value}</Text>
                </View>
              ))
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
