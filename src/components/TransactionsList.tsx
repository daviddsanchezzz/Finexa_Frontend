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

interface Props {
  transactions: any[];
  onDeleted?: () => void;
  navigation: any;
}

export default function TransactionsList({
  transactions,
  onDeleted,
  navigation,
}: Props) {
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
      onPress={() => navigation.navigate("Add", { editData: tx })}
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
                    containerStyle={{ backgroundColor: colors.background }}
                    childrenContainerStyle={{
                      backgroundColor: colors.background,
                    }}
                  >
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => openTxModal(tx)}
                      className="flex-row justify-between items-center py-1.5 px-1.5 bg-background rounded-xl"
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
      <Modal
        isVisible={modalVisible}
        onBackdropPress={closeModal}
        onBackButtonPress={closeModal}
        backdropOpacity={0.6}
        animationIn="fadeInUp"
        animationOut="fadeOutDown"
      >
        <View className="bg-white rounded-2xl p-6">
          {selectedTx && (
            <>
              {/* X */}
              <TouchableOpacity
                onPress={closeModal}
                style={{
                  position: "absolute",
                  top: 16,
                  left: 16,
                  padding: 6,
                }}
              >
                <Ionicons name="close-outline" size={26} color="#555" />
              </TouchableOpacity>

              {/* ICONO */}
              <View className="items-center mb-6 mt-3">
                {selectedTx.type === "transfer" ? (
                  <View className="bg-blue-100 p-3 rounded-xl mb-3">
                    <Ionicons
                      name="swap-horizontal-outline"
                      size={28}
                      color="#2563eb"
                    />
                  </View>
                ) : (
                  <View
                    className="p-3 rounded-xl mb-3"
                    style={{
                      backgroundColor:
                        selectedTx.category?.color || "#f1f5f9",
                    }}
                  >
                    <Text style={{ fontSize: 28 }}>
                      {selectedTx.category?.emoji || "💸"}
                    </Text>
                  </View>
                )}

                {/* TÍTULO */}
                {selectedTx.type === "transfer" ? (
                  <Text className="text-[17px] font-semibold text-black">
                    {selectedTx.fromWallet?.emoji} {selectedTx.fromWallet?.name} →{" "}
                    {selectedTx.toWallet?.emoji} {selectedTx.toWallet?.name}
                  </Text>
                ) : (
                  <Text className="text-[17px] font-semibold text-black">
                    {selectedTx.category?.name || "Sin categoría"}
                  </Text>
                )}

                <Text className="text-gray-400 text-[13px] mt-1">
                  {new Date(selectedTx.date).toLocaleString("es-ES", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>

              {/* IMPORTE */}
              <Text className="text-center font-bold mb-4" style={{ fontSize: 32 }}>
                {selectedTx.type === "expense"
                  ? `-${formatEuro(selectedTx.amount)} €`
                  : selectedTx.type === "income"
                  ? `+${formatEuro(selectedTx.amount)} €`
                  : `${formatEuro(selectedTx.amount)} €`}
              </Text>

              {/* INFO EXTRA */}
              <View className="mt-2 space-y-3">
                {selectedTx.type !== "transfer" && selectedTx.subcategory && (
                  <View className="flex-row justify-between">
                    <Text className="text-gray-500">Subcategoría</Text>
                    <Text className="font-medium text-text">
                      {selectedTx.subcategory.name}
                    </Text>
                  </View>
                )}

                {selectedTx.type === "transfer" ? (
                  <>
                    <View className="flex-row justify-between">
                      <Text className="text-gray-500">Desde</Text>
                      <Text className="font-medium text-text">
                        {selectedTx.fromWallet?.name}
                      </Text>
                    </View>

                    <View className="flex-row justify-between">
                      <Text className="text-gray-500">Hacia</Text>
                      <Text className="font-medium text-text">
                        {selectedTx.toWallet?.name}
                      </Text>
                    </View>
                  </>
                ) : selectedTx.wallet ? (
                  <View className="flex-row justify-between">
                    <Text className="text-gray-500">Cartera</Text>
                    <Text className="font-medium text-text">
                      {selectedTx.wallet.name}
                    </Text>
                  </View>
                ) : null}

                {selectedTx.description && (
                  <View style={{ marginTop: 10 }}>
                    <Text className="text-gray-500 mb-1">Descripción</Text>
                    <Text className="font-medium text-text">
                      {selectedTx.description}
                    </Text>
                  </View>
                )}
              </View>

              {/* SEPARADOR */}
              <View className="h-[1px] bg-gray-200 my-5" />

              {/* BOTONES */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => {
                    closeModal();
                    navigation.navigate("Add", { editData: selectedTx });
                  }}
                  className="flex-1 bg-gray-100 py-3 rounded-full"
                >
                  <Text className="text-center text-black font-semibold">
                    Editar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    closeModal();
                    deleteTx(selectedTx);
                  }}
                  className="flex-1 bg-red-500 py-3 rounded-full"
                >
                  <Text className="text-center text-white font-semibold">
                    Eliminar
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>

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
