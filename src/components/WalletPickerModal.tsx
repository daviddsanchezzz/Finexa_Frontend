import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/theme";

/** Helpers */
function getWalletBalance(w: any) {
  const v =
    Number(w.balance) ||
    Number(w.currentBalance) ||
    Number(w.amount) ||
    Number(w.total) ||
    0;
  return Number.isFinite(v) ? v : 0;
}

function formatEuro(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Wallet = {
  id: number;
  name: string;
  balance?: number;
  currentBalance?: number;
  amount?: number;
  total?: number;
};

export function WalletPickerModal({
  visible,
  wallets,
  selectedWalletId,
  onClose,
  onSelect,
  onClear,
}: {
  visible: boolean;
  wallets: Wallet[];
  selectedWalletId: number | null;
  onClose: () => void;
  onSelect: (wallet: Wallet) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = Array.isArray(wallets) ? wallets : [];
    if (!q) return list;
    return list.filter((w) => String(w.name ?? "").toLowerCase().includes(q));
  }, [wallets, query]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => getWalletBalance(b) - getWalletBalance(a));
  }, [filtered]);

  const totalWallets = useMemo(
    () => (Array.isArray(wallets) ? wallets.reduce((acc, w) => acc + getWalletBalance(w), 0) : 0),
    [wallets]
  );

  const handleSelect = useCallback(
    (w: Wallet) => {
      onSelect(w);
      onClose();
      setQuery("");
    },
    [onSelect, onClose]
  );

  const handleClear = useCallback(() => {
    onClear();
    onClose();
    setQuery("");
  }, [onClear, onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Backdrop (oscurece TODO, como DateTimeFilterModal) */}
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(15, 23, 42, 0.45)",
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        {/* Card (stop propagation) */}
        <Pressable
          onPress={() => {}}
          style={{
            width: "min(560px, 96vw)" as any,
            backgroundColor: "white",
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            overflow: "hidden",
            shadowColor: "#000",
            shadowOpacity: Platform.OS === "web" ? 0.06 : 0.14,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 6,
          }}
        >
          {/* Header (igual vibe que datetimepicker) */}
          <View
            style={{
              padding: 14,
              borderBottomWidth: 1,
              borderBottomColor: "#E5E7EB",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "900", color: "#0F172A" }}>
                Seleccionar cartera
              </Text>
              <Text style={{ marginTop: 2, fontSize: 12, color: "#64748B" }}>
                Total (todas): {formatEuro(totalWallets)}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onClose}
              style={{
                width: 38,
                height: 38,
                borderRadius: 14,
                backgroundColor: "#F8FAFC",
                borderWidth: 1,
                borderColor: "#E5E7EB",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={18} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={{ padding: 14 }}>
            {/* Search (como en tu modal, pero más cercano al datetimepicker) */}
            <View
              style={{
                height: 44,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                backgroundColor: "#F8FAFC",
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                gap: 10,
              }}
            >
              <Ionicons name="search-outline" size={18} color="#64748B" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar cartera…"
                placeholderTextColor="#94A3B8"
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: "700",
                  color: "#0F172A",
                  paddingVertical: 0,
                }}
              />
              {!!query && (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setQuery("")}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 14,
                    backgroundColor: "white",
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="close" size={16} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>

            {/* "Todas las carteras" destacado */}
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={handleClear}
              style={{
                marginTop: 12,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: selectedWalletId === null ? "rgba(37,99,235,0.35)" : "#E5E7EB",
                backgroundColor: selectedWalletId === null ? "rgba(37,99,235,0.08)" : "white",
                paddingVertical: 12,
                paddingHorizontal: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 14,
                    backgroundColor: "rgba(37,99,235,0.10)",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: "rgba(37,99,235,0.20)",
                  }}
                >
                  <Ionicons name="layers-outline" size={18} color={colors.primary} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "900", color: "#0F172A" }}>
                    Todas las carteras
                  </Text>
                  <Text style={{ marginTop: 2, fontSize: 11, fontWeight: "700", color: "#64748B" }}>
                    Ver el total consolidado
                  </Text>
                </View>
              </View>

              {selectedWalletId === null ? (
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
              )}
            </TouchableOpacity>

            {/* List */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 360, marginTop: 12 }}
              contentContainerStyle={{ paddingBottom: 6 }}
            >
              {sorted.length === 0 ? (
                <View
                  style={{
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    backgroundColor: "#F8FAFC",
                    padding: 14,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "800", color: "#0F172A" }}>
                    No hay resultados
                  </Text>
                  <Text style={{ marginTop: 4, fontSize: 11, fontWeight: "700", color: "#64748B" }}>
                    Prueba con otro nombre.
                  </Text>
                </View>
              ) : (
                sorted.map((w) => {
                  const active = selectedWalletId === w.id;
                  const bal = getWalletBalance(w);

                  return (
                    <TouchableOpacity
                      key={w.id}
                      activeOpacity={0.92}
                      onPress={() => handleSelect(w)}
                      style={{
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: active ? "rgba(37,99,235,0.35)" : "#E5E7EB",
                        backgroundColor: active ? "rgba(37,99,235,0.08)" : "white",
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        marginBottom: 8,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: "#E5E7EB",
                            backgroundColor: "#F8FAFC",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Ionicons
                            name="wallet-outline"
                            size={18}
                            color={active ? colors.primary : "#64748B"}
                          />
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text
                            style={{ fontSize: 13, fontWeight: "900", color: "#0F172A" }}
                            numberOfLines={1}
                          >
                            {w.name}
                          </Text>
                          <Text style={{ marginTop: 2, fontSize: 11, fontWeight: "700", color: "#64748B" }}>
                            {formatEuro(bal)}
                          </Text>
                        </View>
                      </View>

                      {active ? (
                        <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
                      ) : (
                        <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>

          {/* Footer (parecido a DateTime: acción principal a la derecha) */}
          <View
            style={{
              padding: 14,
              borderTopWidth: 1,
              borderTopColor: "#E5E7EB",
              flexDirection: "row",
              justifyContent: "flex-end",
              backgroundColor: "white",
            }}
          >
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.9}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 12,
                backgroundColor: "#F1F5F9",
                borderWidth: 1,
                borderColor: "#E2E8F0",
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "900", color: "#0F172A" }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
