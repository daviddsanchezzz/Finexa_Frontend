// src/components/TransactionsList.tsx
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/api";
import { colors } from "../theme/theme";
import Modal from "react-native-modal";
import { appAlert } from "../utils/appAlert";
import RecurringScopeModal, {
  RecurringScope,
} from "./RecurringScopeModal";
import DesktopTransactionDetailsModal from "./DesktopTransactionDetailsModal";

interface Props {
  transactions: any[];
  onDeleted?: () => void;
  navigation: any;
  backgroundColor?: string;
  onEditTx: (tx: any) => void;
}


export default function DesktopTransactionsList({
  transactions,
  onDeleted,
  navigation,
  backgroundColor,
  onEditTx,
}: Props) {
  const bg = backgroundColor ?? colors.background;
  const [selectedTx, setSelectedTx] = React.useState<any>(null);
  const [modalVisible, setModalVisible] = React.useState(false);
  const isRecurringOccurrence = (tx: any) => !!tx?.parentId; // instancia generada

  // Modal alcance borrado recurrente (reutiliza RecurringScopeModal)
  const [deleteScopeModal, setDeleteScopeModal] = React.useState<{
    visible: boolean;
    tx: any | null;
  }>({ visible: false, tx: null });

  const openTxModal = (tx: any) => {
    setSelectedTx(tx);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedTx(null);
  };

  if (!transactions || transactions.length === 0) {
    return (
      <View className="items-center mt-10">
        <Text className="text-gray-400 text-[15px]">
          No hay transacciones todavía
        </Text>
      </View>
    );
  }

  const swipeableRefs = React.useRef<Record<number, any>>({});
  const [openId, setOpenId] = React.useState<number | null>(null);

  const handleSwipeOpen = (id: number) => {
    if (openId && openId !== id) {
      swipeableRefs.current[openId]?.close();
    }
    setOpenId(id);
  };

  const formatEuro = (n: number) => n.toFixed(2).replace(".", ",");

  // 🔵 Total diario, soporta transferencias (no cuentan en total)
  const getDayTotal = (items: any[]) => {
    const sum = items.reduce((acc, tx) => {
      if (tx.type === "transfer") return acc; // no afecta al saldo
      const signed =
        tx.type === "expense" ? -Math.abs(tx.amount) : Math.abs(tx.amount);
      return acc + signed;
    }, 0);
    return sum;
  };

  const getDayKey = (dateStr: string) => {
    const d = new Date(dateStr);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const grouped: Record<string, any[]> = sorted.reduce((acc, tx) => {
    const key = getDayKey(tx.date);
    (acc[key] = acc[key] || []).push(tx);
    return acc;
  }, {});

  const formatDateLabel = (iso: string) => {
    const today = new Date();
    const [y, m, d] = iso.split("-").map(Number);

    const isToday =
      y === today.getUTCFullYear() &&
      m === today.getUTCMonth() + 1 &&
      d === today.getUTCDate();

    if (isToday) return "Hoy";

    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-ES", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  };

  // DESCRIPCIÓN SECUNDARIA
  const getSecondaryText = (tx: any) => {
    if (tx.description?.trim()) {
      const max = 30;
      return tx.description.length > max
        ? tx.description.substring(0, max) + "..."
        : tx.description;
    }
    if (tx.subcategory?.name) return tx.subcategory.name;

    const d = new Date(tx.date);
    return `${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()
    ).padStart(2, "0")}`;
  };

  // Helper: ¿pertenece a una serie recurrente?
  const isPartOfSeries = (tx: any) => !!(tx?.isRecurring || tx?.parentId);

  // 🔴 Borrado real en backend, con scope
  const deleteTxByScope = async (tx: any, scope: RecurringScope) => {
    try {
      await api.delete(`/transactions/${tx.id}`, { params: { scope } });
      onDeleted?.();
    } catch (e) {
      appAlert("Error", "No se pudo eliminar");
    }
  };

  const handleScopePress = async (scope: RecurringScope) => {
    if (!deleteScopeModal.tx) return;
    const tx = deleteScopeModal.tx;
    setDeleteScopeModal({ visible: false, tx: null });
    await deleteTxByScope(tx, scope);
  };

  // 🔴 Eliminar (decide si usar modal de scopes o confirm simple)
  const deleteTx = (tx: any) => {
    const partOfSeries = isPartOfSeries(tx);

    if (partOfSeries) {
      setDeleteScopeModal({ visible: true, tx });
    } else {
      appAlert("Eliminar transacción", "¿Seguro que quieres eliminarla?", [
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => deleteTxByScope(tx, "single"),
        },
        {
          text: "Cancelar",
          style: "cancel",
        },
      ]);
    }
  };

  const renderRightActions = (tx: any) => (
    <TouchableOpacity
      onPress={() => deleteTx(tx)}
      activeOpacity={0.8}
      style={{
        backgroundColor: "red",
        justifyContent: "center",
        alignItems: "center",
        width: 70,
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
      }}
    >
      <Ionicons name="trash-outline" size={26} color="#fff" />
    </TouchableOpacity>
  );

  const renderLeftActions = (tx: any) => (
    <TouchableOpacity
onPress={() => onEditTx(tx)}
      activeOpacity={0.8}
      style={{
        backgroundColor: "#007AFF",
        justifyContent: "center",
        alignItems: "center",
        width: 70,
        borderTopLeftRadius: 12,
        borderBottomLeftRadius: 12,
      }}
    >
      <Ionicons name="create-outline" size={26} color="#fff" />
    </TouchableOpacity>
  );

  // ICONO PRINCIPAL SEGÚN TIPO
  const renderIcon = (tx: any) => {
    if (tx.type === "transfer") {
      return (
        <View className="w-9 h-9 bg-blue-100 rounded-lg items-center justify-center">
          <Ionicons
            name="swap-horizontal-outline"
            size={20}
            color="#2563eb"
          />
        </View>
      );
    }

    return (
      <View
        className="w-9 h-9 rounded-lg items-center justify-center"
        style={{ backgroundColor: tx.category?.color || "#f3f4f6" }}
      >
        <Text className="text-[18px]">
          {tx.category?.emoji || "💸"}
        </Text>
      </View>
    );
  };

  // IMPORTE SEGÚN TIPO
  const renderAmount = (tx: any) => {
    if (tx.type === "transfer") {
      return (
        <Text className="text-[16px] font-semibold text-text">
          {formatEuro(tx.amount)} €
        </Text>
      );
    }

    return (
      <Text className="text-[16px] font-semibold text-text">
        {tx.type === "income"
          ? `+${formatEuro(tx.amount)} €`
          : `-${formatEuro(tx.amount)} €`}
      </Text>
    );
  };

  return (
    <View className="mt-3">
      {Object.keys(grouped)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
        .map((isoDay) => {
          const items = grouped[isoDay];
          const dayTotal = getDayTotal(items);
          const allAreTransfers = items.every((tx) => tx.type === "transfer");

          return (
            <View key={isoDay} className="mb-1">
              {/* HEADER DÍA */}
              <View className="flex-row justify-between items-center mb-2 px-1.5">
                <Text className="text-gray-400 text-[15px] font-medium">
                  {formatDateLabel(isoDay)}
                </Text>

                {!allAreTransfers && (
                  <Text className="text-gray-400 text-[15px] font-semibold">
                    {dayTotal >= 0
                      ? `+${formatEuro(dayTotal)} €`
                      : `${formatEuro(dayTotal)} €`}
                  </Text>
                )}
              </View>

              <View className="h-[1px] bg-gray-300 mb-2" />

              {/* TRANSACCIONES */}
              {items.map((tx) => (
                <View key={tx.id} style={{ marginBottom: 6 }}>
                  <Swipeable
                    ref={(ref) => {
                      if (ref) swipeableRefs.current[tx.id] = ref;
                    }}
                    onSwipeableOpen={() => handleSwipeOpen(tx.id)}
                    renderRightActions={() => renderRightActions(tx)}
                    renderLeftActions={() => renderLeftActions(tx)}
                    overshootRight={false}
                    overshootLeft={false}
                    containerStyle={{ backgroundColor: bg }}
                    childrenContainerStyle={{
                      backgroundColor: bg,
                    }}
                  >
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => openTxModal(tx)}
                      style={{ backgroundColor: bg }}
                      className="flex-row justify-between items-center py-1.5 px-1.5 rounded-xl"
                    >
                      {/* IZQUIERDA */}
                      <View className="flex-row items-center">
                        {renderIcon(tx)}

                        <View className="ml-3">
                          <Text className="text-[16px] font-semibold text-text">
                            {tx.type === "transfer"
                              ? `${tx.fromWallet?.name}  →  ${tx.toWallet?.name}`
                              : tx.category?.name || "Sin categoría"}
                          </Text>

                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            {isRecurringOccurrence(tx) && (
                              <Ionicons
                                name="repeat-outline"
                                size={14}
                                color="#9CA3AF"
                                style={{ marginRight: 6, marginTop: 1 }}
                              />
                            )}

                            <Text className="text-gray-400 text-[12px]">
                              {getSecondaryText(tx)}
                            </Text>
                          </View>

                        </View>
                      </View>

                      {/* DERECHA – IMPORTE */}
                      {renderAmount(tx)}
                    </TouchableOpacity>
                  </Swipeable>
                </View>
              ))}
            </View>
          );
        })}

      {/* MODAL DETALLES (adaptado para transferencias) */}
<DesktopTransactionDetailsModal
  visible={modalVisible}
  tx={selectedTx}
  onClose={closeModal}
onEdit={(tx) => {
  closeModal();

  // evita que el click que cierra el modal anterior cierre también el nuevo
  requestAnimationFrame(() => {
    onEditTx(tx);
  });
}}
  onDelete={(tx) => {
    closeModal();
    deleteTx(tx); // ✅ mantiene tu lógica (scopes + confirm)
  }}
/>


      {/* MODAL ALCANCE ELIMINACIÓN RECURRENTE (reutilizable y profesional) */}
      <RecurringScopeModal
        visible={deleteScopeModal.visible}
        mode="delete"
        onClose={() => setDeleteScopeModal({ visible: false, tx: null })}
        onSelect={handleScopePress}
      />
    </View>
  );
}
