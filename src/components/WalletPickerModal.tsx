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
  emoji?: string;
  balance?: number;
  currentBalance?: number;
  amount?: number;
  total?: number;
};

function Divider() {
  return <View style={{ height: 1, backgroundColor: "rgba(148,163,184,0.18)" }} />;
}

function SmallButton({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={{
        flex: 1,
        height: 44,
        borderRadius: 16,
        backgroundColor: "rgba(15,23,42,0.05)",
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.22)",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 12,
      }}
    >
      <Ionicons name={icon} size={16} color="#475569" />
      <Text style={{ fontSize: 13, fontWeight: "900", color: "#475569" }} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function WalletPickerModal({
  visible,
  wallets,
  selectedWalletId,
  onClose,
  onSelect,
  onClear,
  onEditWallets,
  onViewTransfers,
}: {
  visible: boolean;
  wallets: Wallet[];
  selectedWalletId: number | null;
  onClose: () => void;
  onSelect: (wallet: Wallet) => void;
  onClear: () => void;

  /** NUEVO: navegación/acciones externas */
  onEditWallets: () => void;
  onViewTransfers: () => void;
}) {
  const [query, setQuery] = useState("");

  const list = useMemo(() => (Array.isArray(wallets) ? wallets : []), [wallets]);

  const totalWallets = useMemo(
    () => list.reduce((acc, w) => acc + getWalletBalance(w), 0),
    [list]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((w) => String(w.name ?? "").toLowerCase().includes(q));
  }, [list, query]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => getWalletBalance(b) - getWalletBalance(a));
  }, [filtered]);

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
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(2, 6, 23, 0.55)",
          justifyContent: "center",
          alignItems: "center",
          padding: 18,
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            width: "min(660px, 96vw)" as any,
            backgroundColor: "white",
            borderRadius: 22,
            borderWidth: 1,
            borderColor: "rgba(148,163,184,0.35)",
            overflow: "hidden",
            shadowColor: "#0B1220",
            shadowOpacity: Platform.OS === "web" ? 0.10 : 0.18,
            shadowRadius: 26,
            shadowOffset: { width: 0, height: 14 },
            elevation: 8,
          }}
        >
          {/* Header */}
          <View style={{ padding: 16, paddingBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "900", color: "#0F172A" }}>
                  Seleccionar cartera
                </Text>
                <Text style={{ marginTop: 3, fontSize: 12, fontWeight: "700", color: "#64748B" }}>
                  Busca y selecciona una cartera
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={onClose}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  backgroundColor: "rgba(255,255,255,0.85)",
                  borderWidth: 1,
                  borderColor: "rgba(148,163,184,0.35)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="close" size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View
              style={{
                marginTop: 12,
                height: 46,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "rgba(148,163,184,0.30)",
                backgroundColor: "rgba(15,23,42,0.03)",
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(37,99,235,0.10)",
                  borderWidth: 1,
                  borderColor: "rgba(37,99,235,0.16)",
                }}
              >
                <Ionicons name="search-outline" size={18} color={colors.primary} />
              </View>

              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar cartera..."
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
                    backgroundColor: "rgba(255,255,255,0.9)",
                    borderWidth: 1,
                    borderColor: "rgba(148,163,184,0.30)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="close" size={16} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Total / Todas (protagonista) */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleClear}
              style={{
                borderRadius: 20,
                borderWidth: 1,
                borderColor: selectedWalletId === null ? "rgba(37,99,235,0.35)" : "rgba(37,99,235,0.22)",
                backgroundColor: "rgba(37,99,235,0.10)",
                paddingVertical: 14,
                paddingHorizontal: 14,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 18,
                      backgroundColor: "rgba(255,255,255,0.85)",
                      borderWidth: 1,
                      borderColor: "rgba(37,99,235,0.20)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="layers-outline" size={20} color={colors.primary} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontSize: 14, fontWeight: "900", color: colors.primary, letterSpacing: 0.2 }}
                      numberOfLines={1}
                    >
                      Todas las carteras
                    </Text>
                    <Text style={{ marginTop: 2, fontSize: 11, fontWeight: "800", color: "rgba(37,99,235,0.75)" }}>
                      Total consolidado
                    </Text>
                  </View>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 18, fontWeight: "950" as any, color: colors.primary }} numberOfLines={1}>
                    {formatEuro(totalWallets)}
                  </Text>
                  {selectedWalletId === null ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: "900", color: colors.primary }}>ACTIVA</Text>
                      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                    </View>
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: "900", color: "rgba(37,99,235,0.85)" }}>
                        Seleccionar
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color="rgba(37,99,235,0.65)" />
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <Divider />

          {/* Lista */}
          <View style={{ padding: 16, paddingTop: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: "900", color: "#64748B", marginBottom: 10 }}>
              Carteras
            </Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 360 }}
              contentContainerStyle={{ paddingBottom: 6 }}
            >
              {sorted.length === 0 ? (
                <View
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: "rgba(148,163,184,0.25)",
                    backgroundColor: "rgba(15,23,42,0.02)",
                    padding: 14,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "900", color: "#0F172A" }}>
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
                        borderColor: active ? "rgba(37,99,235,0.38)" : "rgba(148,163,184,0.20)",
                        backgroundColor: active ? "rgba(37,99,235,0.08)" : "white",
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        marginBottom: 10,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        {/* Left: emoji + nombre */}
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                          <View
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 16,
                              borderWidth: 1,
                              borderColor: active ? "rgba(37,99,235,0.25)" : "rgba(148,163,184,0.25)",
                              backgroundColor: active ? "rgba(37,99,235,0.10)" : "rgba(15,23,42,0.03)",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Text style={{ fontSize: 18 }}>{w.emoji ?? "👛"}</Text>
                          </View>

                          <Text style={{ fontSize: 13, fontWeight: "900", color: "#0F172A" }} numberOfLines={1}>
                            {w.name}
                          </Text>
                        </View>

                        {/* Right: cantidad (como móvil) + icon */}
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <Text style={{ fontSize: 13, fontWeight: "900", color: "#0F172A" }} numberOfLines={1}>
                            {formatEuro(bal)}
                          </Text>

                          {active ? (
                            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                          ) : (
                            <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Espacio para que no “choque” con el footer */}
            <View style={{ height: 10 }} />
          </View>

          {/* Footer con botones (como móvil) */}
          <View
            style={{
              padding: 14,
              borderTopWidth: 1,
              borderTopColor: "rgba(148,163,184,0.18)",
              backgroundColor: "white",
            }}
          >
            <View style={{ flexDirection: "row", gap: 10 }}>
              <SmallButton
                label="Editar carteras"
                icon="create-outline"
                onPress={() => {
                  onClose();
                  onEditWallets();
                }}
              />
              <SmallButton
                label="Ver transferencias"
                icon="swap-horizontal-outline"
                onPress={() => {
                  onClose();
                  onViewTransfers();
                }}
              />
            </View>

            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.9}
              style={{
                marginTop: 10,
                height: 44,
                borderRadius: 16,
                backgroundColor: "rgba(15,23,42,0.05)",
                borderWidth: 1,
                borderColor: "rgba(148,163,184,0.22)",
                alignItems: "center",
                justifyContent: "center",
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
