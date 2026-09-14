import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/theme";
import { formatEuro } from "../utils/currency";

export type InvestmentOperationRecord = {
  id: number;
  assetId: number;
  type: string;
  date?: string | null;
  amount: number;
  quantity?: string | null;
  fee?: number | null;
  description?: string | null;
  wallet?: { name?: string | null } | null;
  swapGroupId?: string | number | null;
  createdAt?: string | null;
  transaction?: {
    description?: string | null;
    wallet?: { name?: string | null } | null;
    fromWallet?: { name?: string | null } | null;
    toWallet?: { name?: string | null } | null;
  } | null;
};

export type InvestmentOperationAsset = {
  name: string;
  abbreviation?: string | null;
  currency?: string | null;
  description?: string | null;
};

interface Props {
  operation: InvestmentOperationRecord | null;
  asset?: InvestmentOperationAsset | null;
  fallbackCurrency?: string;
  onClose: () => void;
  onEdit?: (operation: InvestmentOperationRecord) => void;
}

export function investmentOperationLabel(type: string) {
  switch (type) {
    case "buy": return "Compra";
    case "sell": return "Venta";
    case "transfer_in": return "Aportación";
    case "transfer_out": return "Retirada";
    case "dividend": return "Dividendo";
    case "fee": return "Comisión";
    case "swap_in":
    case "swap_out": return "Swap";
    default: return "Operación";
  }
}

function formatMoney(value: number, currency: string) {
  if (currency === "EUR") return `${formatEuro(value)} €`;
  return value.toLocaleString("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function InvestmentOperationDetailsModal({ operation, asset, fallbackCurrency = "EUR", onClose, onEdit }: Props) {
  const insets = useSafeAreaInsets();
  if (!operation) return null;

  const assetName = asset?.abbreviation?.trim() || asset?.name || `Activo #${operation.assetId}`;
  const currency = asset?.currency || fallbackCurrency;
  const quantity = Number(operation.quantity);
  const hasQuantity = Number.isFinite(quantity) && quantity !== 0;
  const unitPrice = hasQuantity ? Math.abs(Number(operation.amount || 0)) / Math.abs(quantity) : null;
  const operationDate = new Date(operation.date || operation.createdAt || 0);
  const dateText = Number.isNaN(operationDate.getTime())
    ? "—"
    : operationDate.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  const platform =
    operation.wallet?.name ||
    operation.transaction?.wallet?.name ||
    operation.transaction?.fromWallet?.name ||
    operation.transaction?.toWallet?.name ||
    asset?.description?.trim() ||
    "—";
  const details = [
    { label: "Importe", value: formatMoney(Math.abs(Number(operation.amount || 0)), currency) },
    { label: "Fecha", value: dateText },
    { label: "Precio por unidad", value: unitPrice == null ? "—" : formatMoney(unitPrice, currency) },
    { label: "Participaciones / unidades", value: hasQuantity ? String(operation.quantity).replace(".", ",") : "—" },
    { label: "Comisión", value: operation.fee != null ? formatMoney(Math.abs(Number(operation.fee || 0)), currency) : "—" },
    { label: "Plataforma / cuenta", value: platform },
  ];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={{ backgroundColor: "white", borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: Math.max(insets.bottom, 20) + 8 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: "900", color: "#0F172A" }} numberOfLines={1}>{assetName}</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary, marginTop: 3 }}>{investmentOperationLabel(operation.type)}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="close" size={15} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: "#F1F5F9" }}>
              {details.map((detail, index) => (
                <View key={detail.label} style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: index < details.length - 1 ? 1 : 0, borderBottomColor: "#F1F5F9", gap: 18 }}>
                  <Text style={{ fontSize: 12.5, fontWeight: "600", color: "#64748B" }}>{detail.label}</Text>
                  <Text style={{ flex: 1, fontSize: 12.5, fontWeight: "800", color: "#0F172A", textAlign: "right" }}>{detail.value}</Text>
                </View>
              ))}
            </View>

            {onEdit && !["dividend", "fee"].includes(operation.type) && (
              <TouchableOpacity onPress={() => onEdit(operation)} activeOpacity={0.82} style={{ marginTop: 16, height: 42, borderRadius: 12, backgroundColor: "#EEF2FF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Ionicons name="create-outline" size={15} color={colors.primary} />
                <Text style={{ fontSize: 13, fontWeight: "900", color: colors.primary }}>Editar operación</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
