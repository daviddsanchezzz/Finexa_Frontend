import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StyleSheet,
  ViewStyle,
} from "react-native";
import Modal from "react-native-modal";
import { Ionicons } from "@expo/vector-icons";

type TxType = "expense" | "income" | "transfer";

type Props = {
  visible: boolean;
  tx: any | null;
  onClose: () => void;
  onEdit: (tx: any) => void; // ✅ abre tu CreateTransactionModal desktop
  onDelete: (tx: any) => void; // ✅ reutiliza tu lógica de borrado (scopes, etc.)
};

const formatEuro = (n: number) => (n || 0).toFixed(2).replace(".", ",");

const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

function Pill({
  label,
  icon,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.pill}>
      {icon && (
        <Ionicons name={icon} size={14} color="#64748B" style={{ marginRight: 6 }} />
      )}
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={{ paddingVertical: 10 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
      <View style={styles.divider} />
    </View>
  );
}

export default function DesktopTransactionDetailsModal({
  visible,
  tx,
  onClose,
  onEdit,
  onDelete,
}: Props) {
  const isTransfer = tx?.type === "transfer";
  const isIncome = tx?.type === "income";
  const isExpense = tx?.type === "expense";

  const title = useMemo(() => {
    if (!tx) return "";
    if (isTransfer) {
      return `${tx.fromWallet?.name || "Origen"} → ${tx.toWallet?.name || "Destino"}`;
    }
    return tx.category?.name || "Sin categoría";
  }, [tx, isTransfer]);

  const amountText = useMemo(() => {
    if (!tx) return "";
    if (isExpense) return `-${formatEuro(tx.amount)} €`;
    if (isIncome) return `+${formatEuro(tx.amount)} €`;
    return `${formatEuro(tx.amount)} €`;
  }, [tx, isExpense, isIncome]);

  const amountColor = useMemo(() => {
    if (!tx) return "#0F172A";
    if (isExpense) return "#DC2626";
    if (isIncome) return "#16A34A";
    return "#0F172A";
  }, [tx, isExpense, isIncome]);

  const headerIcon = useMemo(() => {
    if (!tx) return null;

    if (isTransfer) {
      return (
        <View style={styles.transferIcon}>
          <Ionicons name="swap-horizontal-outline" size={22} color="#2563EB" />
        </View>
      );
    }

    return (
      <View
        style={[
          styles.categoryIcon,
          { backgroundColor: tx.category?.color || "#F1F5F9" },
        ]}
      >
        <Text style={{ fontSize: 20 }}>{tx.category?.emoji || "💸"}</Text>
      </View>
    );
  }, [tx, isTransfer]);

  // ✅ FIX: ancho numérico (evita "92%" -> string)
  const cardWidth = useMemo(() => {
    const w = Dimensions.get("window").width;
    return Math.min(Math.round(w * 0.92), 720);
  }, []);

  const modalCardStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: "#FFFFFF",
      borderRadius: 20,
      width: cardWidth,
      alignSelf: "center",
      overflow: "hidden",
    }),
    [cardWidth]
  );

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      backdropOpacity={0.55}
      animationIn="fadeIn"
      animationOut="fadeOut"
      useNativeDriver
      style={styles.modalRoot}
    >
      <View style={modalCardStyle}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {headerIcon}

            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.subtitle}>
                {tx?.date ? formatDateTime(tx.date) : ""}
              </Text>
            </View>

            {/* ACCIONES HEADER */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                onPress={() => tx && onEdit(tx)}
                activeOpacity={0.85}
                style={styles.editBtn}
              >
                <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                <Text style={styles.editBtnText}>Editar</Text>
              </TouchableOpacity>

              <View style={{ width: 10 }} />

              <TouchableOpacity onPress={onClose} activeOpacity={0.8} style={styles.closeBtn}>
                <Ionicons name="close-outline" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>
          </View>

          {/* PILLS (sin gap) */}
          <View style={styles.pillsWrap}>
            {tx?.type && (
              <View style={styles.pillItem}>
                <Pill
                  label={
                    tx.type === "expense"
                      ? "Gasto"
                      : tx.type === "income"
                      ? "Ingreso"
                      : "Transferencia"
                  }
                  icon={
                    tx.type === "expense"
                      ? "remove-circle-outline"
                      : tx.type === "income"
                      ? "add-circle-outline"
                      : "swap-horizontal-outline"
                  }
                />
              </View>
            )}

            {!!tx?.isRecurring && (
              <View style={styles.pillItem}>
                <Pill label="Recurrente" icon="repeat-outline" />
              </View>
            )}

            {!!tx?.parentId && (
              <View style={styles.pillItem}>
                <Pill label="Instancia recurrente" icon="repeat-outline" />
              </View>
            )}

            {!!tx?.excludeFromStats && (
              <View style={styles.pillItem}>
                <Pill label="Excluida de estadísticas" icon="eye-off-outline" />
              </View>
            )}
          </View>
        </View>

        {/* BODY */}
        <ScrollView
          style={{ maxHeight: 520 }}
          contentContainerStyle={{ paddingHorizontal: 18, paddingVertical: 16 }}
          showsVerticalScrollIndicator
        >
          {/* IMPORTE */}
          <View style={styles.amountCard}>
            <Text style={styles.infoLabel}>Importe</Text>
            <Text style={[styles.amountText, { color: amountColor }]}>{amountText}</Text>
          </View>

          {/* GRID INFO (desktop) */}
          <View style={{ flexDirection: "row" }}>
            <View style={{ flex: 1, paddingRight: 7 }}>
              {!isTransfer ? (
                <>
                  {tx?.wallet?.name && <InfoRow label="Cartera" value={tx.wallet.name} />}
                  {tx?.subcategory?.name && (
                    <InfoRow label="Subcategoría" value={tx.subcategory.name} />
                  )}
                  {tx?.category?.name && <InfoRow label="Categoría" value={tx.category.name} />}
                </>
              ) : (
                <>
                  <InfoRow label="Desde" value={tx?.fromWallet?.name || "-"} />
                  <InfoRow label="Hacia" value={tx?.toWallet?.name || "-"} />
                </>
              )}
            </View>

            <View style={{ flex: 1, paddingLeft: 7 }}>
              {tx?.date && <InfoRow label="Fecha" value={formatDateTime(tx.date)} />}
              {tx?.asset?.name && <InfoRow label="Activo" value={tx.asset.name} />}
            </View>
          </View>

          {/* DESCRIPCIÓN */}
          {tx?.description?.trim?.() ? (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.infoLabel}>Descripción</Text>
              <View style={styles.descCard}>
                <Text style={styles.descText}>{tx.description}</Text>
              </View>
            </View>
          ) : null}

          {/* CTA ELIMINAR */}
          <View style={{ marginTop: 18 }}>
            <TouchableOpacity
              onPress={() => tx && onDelete(tx)}
              activeOpacity={0.85}
              style={styles.deleteBtn}
            >
              <Ionicons name="trash-outline" size={18} color="#B91C1C" />
              <Text style={styles.deleteBtnText}>Eliminar transacción</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 8 }} />
        </ScrollView>

        {/* FOOTER */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.85}
            style={styles.footerCloseBtn}
          >
            <Text style={styles.footerCloseText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { margin: 0, justifyContent: "center", alignItems: "center" },

  header: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },

  transferIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },

  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  title: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 12, color: "#64748B", marginTop: 2 },

  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#0F172A",
    flexDirection: "row",
    alignItems: "center",
  },
  editBtnText: { color: "#FFFFFF", fontWeight: "800", marginLeft: 8, fontSize: 13 },

  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  pillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    marginLeft: -4,
    marginRight: -4,
  },
  pillItem: { paddingHorizontal: 4, paddingVertical: 4 },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
  },
  pillText: { fontSize: 12, color: "#334155", fontWeight: "600" },

  amountCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  amountText: { fontSize: 34, fontWeight: "900" },

  infoLabel: { color: "#64748B", fontSize: 12, marginBottom: 6 },
  infoValue: { color: "#0F172A", fontSize: 14, fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#E2E8F0", marginTop: 10 },

  descCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  descText: { color: "#0F172A", fontSize: 14, fontWeight: "600" },

  deleteBtn: {
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  deleteBtnText: { marginLeft: 10, color: "#B91C1C", fontWeight: "900", fontSize: 13 },

  footer: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    justifyContent: "flex-end",
    backgroundColor: "#FFFFFF",
  },
  footerCloseBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  footerCloseText: { color: "#0F172A", fontWeight: "800", fontSize: 13 },
});
