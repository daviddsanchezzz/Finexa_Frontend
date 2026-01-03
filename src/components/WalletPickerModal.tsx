import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/theme";

/**
 * Recomendación: usa esto (o tu helper actual) para leer el balance de wallet.
 */
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
  onSelect: (wallet: Wallet) => void; // importante: desde el parent, aquí haces refresh
  onClear: () => void; // importante: desde el parent, aquí haces refresh
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = Array.isArray(wallets) ? wallets : [];
    if (!q) return list;

    return list.filter((w) => {
      const name = String(w.name ?? "").toLowerCase();
      return name.includes(q);
    });
  }, [wallets, query]);

  const sorted = useMemo(() => {
    // ordena por balance desc para “lectura” rápida
    return [...filtered].sort((a, b) => getWalletBalance(b) - getWalletBalance(a));
  }, [filtered]);

  const totalWallets = useMemo(
    () => (Array.isArray(wallets) ? wallets.reduce((acc, w) => acc + getWalletBalance(w), 0) : 0),
    [wallets]
  );

  const handleSelect = useCallback(
    (w: Wallet) => {
      onSelect(w);     // <- el parent debe refrescar al cambiar selectedWallet
      onClose();
      setQuery("");
    },
    [onSelect, onClose]
  );

  const handleClear = useCallback(() => {
    onClear();         // <- el parent debe refrescar al limpiar wallet
    onClose();
    setQuery("");
  }, [onClear, onClose]);

  if (!visible) return null;

  return (
    <View
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "rgba(15,23,42,0.45)",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 520,
          backgroundColor: "white",
          borderRadius: 24,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          overflow: "hidden",
          shadowColor: "#000",
          shadowOpacity: Platform.OS === "web" ? 0 : 0.12,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 4,
        }}
      >
        {/* Top bar */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "900", color: "#0F172A" }}>
              Seleccionar cartera
            </Text>
            <Text style={{ marginTop: 2, fontSize: 11, fontWeight: "700", color: "#64748B" }}>
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
              borderWidth: 1,
              borderColor: "#E5E7EB",
              backgroundColor: "white",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close-outline" size={18} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={{ padding: 16, paddingBottom: 10 }}>
          <View
            style={{
              height: 44,
              borderRadius: 16,
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
                  width: 28,
                  height: 28,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "white",
                }}
              >
                <Ionicons name="close" size={14} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>

          {/* All wallets option */}
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={handleClear}
            style={{
              marginTop: 10,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: selectedWalletId === null ? "rgba(0,0,0,0.10)" : "#E5E7EB",
              backgroundColor: selectedWalletId === null ? "rgba(0,0,0,0.04)" : "white",
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
                  width: 34,
                  height: 34,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  backgroundColor: "#F8FAFC",
                  alignItems: "center",
                  justifyContent: "center",
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

            {selectedWalletId === null && (
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        {/* List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
          style={{ maxHeight: 360 }}
        >
          {sorted.length === 0 ? (
            <View
              style={{
                borderRadius: 18,
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
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: active ? "rgba(0,0,0,0.12)" : "#E5E7EB",
                    backgroundColor: active ? "rgba(0,0,0,0.04)" : "white",
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
                        width: 34,
                        height: 34,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                        backgroundColor: "#F8FAFC",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="wallet-outline" size={18} color={active ? colors.primary : "#64748B"} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "900", color: "#0F172A" }} numberOfLines={1}>
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

        {/* Footer */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: "#E5E7EB",
            padding: 12,
            flexDirection: "row",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.9}
            style={{
              height: 40,
              paddingHorizontal: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              backgroundColor: "white",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "900", color: "#0F172A" }}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
