import React, { useEffect, useRef, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import RNModal from "react-native-modal";
import api from "../../../../api/api";
import OverflowMenuButton, { OverflowMenuAction } from "../../../../components/OverflowMenuButton";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../../theme/theme";
import { appAlert } from "../../../../utils/appAlert";
import { formatEuro } from "../../../../utils/currency";
import {
  getRecurringStatus,
  RECURRING_STATUS_COLOR,
  RECURRING_STATUS_LABEL,
} from "../../../../utils/recurringStatus";

export interface RecurringTransactionDetail {
  id: number;
  type: "income" | "expense" | "transfer";
  amount: number;
  description?: string | null;
  date: string;
  createdAt?: string | null;
  recurrence: "daily" | "weekly" | "monthly" | "yearly" | string | null;
  paused?: boolean | null;
  endDate?: string | null;
  category?: { name: string; emoji?: string | null; color?: string | null } | null;
  subcategory?: { name: string } | null;
  wallet?: { name?: string; emoji?: string } | null;
  fromWallet?: { name?: string; emoji?: string } | null;
  toWallet?: { name?: string; emoji?: string } | null;
}

const formatDateLong = (iso?: string | null) => {
  if (!iso) return "Sin fecha";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Sin fecha";
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
};

const formatRecurrence = (recurrence: RecurringTransactionDetail["recurrence"]) => {
  switch (recurrence) {
    case "daily": return "Diaria";
    case "weekly": return "Semanal";
    case "monthly": return "Mensual";
    case "yearly": return "Anual";
    default: return "Recurrente";
  }
};

const getTitle = (tx: RecurringTransactionDetail) => {
  if (tx.type === "transfer") return `${tx.fromWallet?.name || "Origen"} → ${tx.toWallet?.name || "Destino"}`;
  if (tx.description?.trim()) return tx.description.trim();
  if (tx.subcategory?.name) return tx.subcategory.name;
  if (tx.category?.name) return tx.category.name;
  return "Transacción recurrente";
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between" style={{ marginBottom: 10 }}>
      <Text className="text-gray-500">{label}</Text>
      <Text className="font-medium text-text">{value}</Text>
    </View>
  );
}

interface Props {
  visible: boolean;
  transaction: RecurringTransactionDetail | null;
  navigation: any;
  onClose: () => void;
  // Solo son avisos: quien pausa/reanuda o elimina es este componente. El
  // padre reacciona invalidando la query (pausar/reanudar) o marcando las
  // transacciones como "dirty" (eliminar, porque revierte saldos).
  onChanged: () => void;
  onDeleted: (id: number) => void;
}

// Mismo lenguaje visual que el modal de detalle de TransactionsList (card
// blanca centrada, no pantalla completa) — esta es la versión para
// plantillas recurrentes: añade el badge de estado y el menú "•••" con
// pausar/reanudar y eliminar, que no aplican a una transacción ya ocurrida.
export default function RecurringDetailModal({ visible, transaction, navigation, onClose, onChanged, onDeleted }: Props) {
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  // Copia local para reflejar pausar/reanudar al instante, sin esperar a
  // que la query invalidada del padre vuelva a bajar los datos.
  const [localTx, setLocalTx] = useState(transaction);
  useEffect(() => { setLocalTx(transaction); }, [transaction]);

  const togglePaused = async () => {
    if (!localTx || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const nextPaused = !localTx.paused;
      const res = await api.patch(`/transactions/${localTx.id}/recurring-status`, { paused: nextPaused });
      setLocalTx((prev) => (prev ? { ...prev, paused: res.data.paused, date: res.data.date ?? prev.date } : prev));
      onChanged();
    } catch (e) {
      appAlert("Error", "No se pudo actualizar la recurrente. Inténtalo de nuevo.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    if (!localTx) return;
    const id = localTx.id;
    appAlert(
      "Eliminar recurrente",
      "Se eliminará toda la serie. Las transacciones ya generadas no se ven afectadas.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            if (inFlight.current) return;
            inFlight.current = true;
            setBusy(true);
            try {
              await api.delete(`/transactions/${id}`, { params: { scope: "series" } });
              onDeleted(id);
            } catch (e) {
              appAlert("Error", "No se pudo eliminar la recurrente. Inténtalo de nuevo.");
            } finally {
              inFlight.current = false;
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const status = localTx ? getRecurringStatus(localTx) : "active";
  const typeColor = localTx?.type === "income" ? "#16A34A" : localTx?.type === "expense" ? "#DC2626" : colors.text;
  const sign = localTx?.type === "income" ? "+" : localTx?.type === "expense" ? "-" : "";
  const typeLabel = localTx?.type === "income" ? "Ingreso" : localTx?.type === "expense" ? "Gasto" : "Transferencia";

  const actions: OverflowMenuAction[] = localTx
    ? [
        { label: localTx.paused ? "Reanudar recurrente" : "Pausar recurrente", disabled: busy, onPress: () => { void togglePaused(); } },
        { label: "Eliminar recurrente", style: "destructive", disabled: busy, onPress: confirmDelete },
      ]
    : [];

  return (
    <RNModal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      backdropOpacity={0.6}
      animationIn="fadeInUp"
      animationOut="fadeOutDown"
    >
      <View className="bg-white rounded-2xl p-6">
        {localTx && (
          <>
            <TouchableOpacity onPress={onClose} style={{ position: "absolute", top: 16, left: 16, padding: 6 }}>
              <Ionicons name="close-outline" size={26} color="#555" />
            </TouchableOpacity>

            <View style={{ position: "absolute", top: 10, right: 10 }}>
              <OverflowMenuButton title={getTitle(localTx)} actions={actions} />
            </View>

            <View className="items-center mb-6 mt-3">
              <View className="p-3 rounded-xl mb-3" style={{ backgroundColor: localTx.category?.color || "#f1f5f9" }}>
                <Text style={{ fontSize: 28 }}>{localTx.category?.emoji || "💸"}</Text>
              </View>

              <Text className="text-[17px] font-semibold text-black">{getTitle(localTx)}</Text>
              <Text className="text-gray-400 text-[13px] mt-1">
                {typeLabel} {formatRecurrence(localTx.recurrence).toLowerCase()}
              </Text>

              <View
                style={{
                  marginTop: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: `${RECURRING_STATUS_COLOR[status]}1A`,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: RECURRING_STATUS_COLOR[status] }}>
                  {RECURRING_STATUS_LABEL[status]}
                </Text>
              </View>
            </View>

            <Text className="text-center font-bold mb-4" style={{ fontSize: 32, color: typeColor }}>
              {sign}{formatEuro(localTx.amount)} €
            </Text>

            <View className="mt-2">
              <DetailRow label="Próximo pago" value={status === "active" ? formatDateLong(localTx.date) : "—"} />
              <DetailRow label="Frecuencia" value={formatRecurrence(localTx.recurrence)} />
              {localTx.type === "transfer" ? (
                <>
                  <DetailRow label="Origen" value={localTx.fromWallet?.name || "—"} />
                  <DetailRow label="Destino" value={localTx.toWallet?.name || "—"} />
                </>
              ) : (
                <DetailRow label="Cartera" value={localTx.wallet?.name || "—"} />
              )}
              {localTx.category?.name && <DetailRow label="Categoría" value={localTx.category.name} />}
              {localTx.createdAt && <DetailRow label="Inicio" value={formatDateLong(localTx.createdAt)} />}
              {localTx.endDate && <DetailRow label="Fecha fin" value={formatDateLong(localTx.endDate)} />}
            </View>

            <View className="h-[1px] bg-gray-200 my-5" />

            <TouchableOpacity
              onPress={() => {
                onClose();
                navigation.navigate("Add", { editData: localTx, scope: "series" });
              }}
              className="bg-gray-100 py-3 rounded-full"
            >
              <Text className="text-center text-black font-semibold">Editar</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </RNModal>
  );
}
