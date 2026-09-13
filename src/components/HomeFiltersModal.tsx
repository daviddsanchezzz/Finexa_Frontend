import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput } from "react-native";
import Modal from "react-native-modal";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/api";
import { colors } from "../theme/theme";
import WalletIcon from "./WalletIcon";

export type MovementType = "all" | "expense" | "income" | "transfer";
export type SortBy = "recent" | "oldest" | "amount_desc" | "amount_asc";

export interface HomeFilters {
  type: MovementType;
  walletIds: number[];
  categoryIds: number[];
  includeUncategorized: boolean;
  amountMin: string;
  amountMax: string;
  sortBy: SortBy;
}

export const DEFAULT_HOME_FILTERS: HomeFilters = {
  type: "all",
  walletIds: [],
  categoryIds: [],
  includeUncategorized: false,
  amountMin: "",
  amountMax: "",
  sortBy: "recent",
};

export function countActiveHomeFilters(f: HomeFilters): number {
  let n = 0;
  if (f.type !== "all") n++;
  if (f.walletIds.length > 0) n++;
  if (f.categoryIds.length > 0 || f.includeUncategorized) n++;
  if (f.amountMin.trim() !== "" || f.amountMax.trim() !== "") n++;
  return n;
}

function moneyToNumber(s: string): number | null {
  const v = (s || "").replace(/\./g, "").replace(",", ".");
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Aplica los filtros (todo salvo el rango de fecha, que ya gestiona Home con
// su propio selector) a una lista de transacciones ya cargada.
export function applyHomeFilters(transactions: any[], f: HomeFilters): any[] {
  let list = transactions;

  if (f.type !== "all") {
    list = list.filter((tx) => tx.type === f.type);
  }

  if (f.walletIds.length > 0) {
    list = list.filter((tx) => f.walletIds.includes(tx.walletId ?? tx.wallet?.id));
  }

  if (f.categoryIds.length > 0 || f.includeUncategorized) {
    list = list.filter((tx) => {
      const catId = tx.categoryId ?? tx.category?.id ?? null;
      if (catId == null) return f.includeUncategorized;
      return f.categoryIds.includes(catId);
    });
  }

  const min = f.amountMin.trim() !== "" ? moneyToNumber(f.amountMin) : null;
  const max = f.amountMax.trim() !== "" ? moneyToNumber(f.amountMax) : null;
  if (min != null || max != null) {
    list = list.filter((tx) => {
      const amt = Math.abs(tx.amount);
      if (min != null && amt < min) return false;
      if (max != null && amt > max) return false;
      return true;
    });
  }

  const sorted = [...list];
  switch (f.sortBy) {
    case "oldest":
      sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      break;
    case "amount_desc":
      sorted.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
      break;
    case "amount_asc":
      sorted.sort((a, b) => Math.abs(a.amount) - Math.abs(b.amount));
      break;
    case "recent":
    default:
      sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      break;
  }
  return sorted;
}

interface Wallet {
  id: number;
  name: string;
  emoji: string;
}

interface Category {
  id: number;
  name: string;
  emoji?: string | null;
  color?: string | null;
  type: "income" | "expense";
}

function Chip({
  label,
  emoji,
  icon,
  active,
  onPress,
  showCheck,
}: {
  label: string;
  emoji?: string | null;
  icon?: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
  showCheck?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        flexDirection: "row",
        alignItems: "center",
        height: 30,
        paddingHorizontal: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? colors.primary : "#E5E7EB",
        backgroundColor: active ? "rgba(0,60,197,0.08)" : "#F9FAFB",
        marginRight: 6,
      }}
    >
      {showCheck && active ? (
        <Ionicons name="checkmark-circle" size={13} color={colors.primary} style={{ marginRight: 5 }} />
      ) : emoji ? (
        <View style={{ marginRight: 5 }}>
          <WalletIcon emoji={emoji} size={12} />
        </View>
      ) : icon ? (
        <Ionicons name={icon} size={12} color={active ? colors.primary : "#64748B"} style={{ marginRight: 5 }} />
      ) : null}
      <Text style={{ fontSize: 12, fontWeight: "700", color: active ? colors.primary : "#374151" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 4 }}>
      {children}
    </ScrollView>
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
  filters: HomeFilters;
  onApply: (filters: HomeFilters) => void;
  baseTransactions: any[];
}

export default function HomeFiltersModal({ visible, onClose, filters, onApply, baseTransactions }: Props) {
  const [draft, setDraft] = useState<HomeFilters>(filters);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (!visible) return;
    setDraft(filters);
    api.get("/wallets").then((res) => setWallets(res.data || [])).catch(() => setWallets([]));
    api.get("/categories").then((res) => setCategories(res.data || [])).catch(() => setCategories([]));
  }, [visible]);

  const visibleCategories = useMemo(() => {
    if (draft.type === "expense") return categories.filter((c) => c.type === "expense");
    if (draft.type === "income") return categories.filter((c) => c.type === "income");
    return categories;
  }, [categories, draft.type]);

  const matchCount = useMemo(() => applyHomeFilters(baseTransactions, draft).length, [baseTransactions, draft]);
  const activeCount = countActiveHomeFilters(draft);

  const toggleWallet = (id: number) => {
    setDraft((d) => ({
      ...d,
      walletIds: d.walletIds.includes(id) ? d.walletIds.filter((w) => w !== id) : [...d.walletIds, id],
    }));
  };

  const toggleCategory = (id: number) => {
    setDraft((d) => ({
      ...d,
      categoryIds: d.categoryIds.includes(id) ? d.categoryIds.filter((c) => c !== id) : [...d.categoryIds, id],
    }));
  };

  const reset = () => setDraft(DEFAULT_HOME_FILTERS);

  const apply = () => {
    onApply(draft);
    onClose();
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      backdropOpacity={0.4}
      style={{ justifyContent: "flex-end", margin: 0 }}
      avoidKeyboard
    >
      <View className="bg-white rounded-t-3xl p-4 pb-6 max-h-[80%]">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-3">
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={20} color="#0F172A" />
          </TouchableOpacity>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text className="text-[15px] font-semibold text-text">Filtros</Text>
            {activeCount > 0 && (
              <View style={{ backgroundColor: "rgba(0,60,197,0.1)", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1.5 }}>
                <Text style={{ fontSize: 10.5, fontWeight: "700", color: colors.primary }}>{activeCount} activos</Text>
              </View>
            )}
          </View>

          <TouchableOpacity onPress={reset}>
            <Text className="text-[13px] font-medium" style={{ color: colors.primary }}>Restablecer</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Tipo de movimiento */}
          <Text className="text-[12px] text-gray-400 mb-1.5 font-medium">Tipo de movimiento</Text>
          <ChipRow>
            {(
              [
                { key: "all", label: "Todos" },
                { key: "expense", label: "Gastos" },
                { key: "income", label: "Ingresos" },
                { key: "transfer", label: "Traspasos" },
              ] as { key: MovementType; label: string }[]
            ).map((opt) => (
              <Chip
                key={opt.key}
                label={opt.label}
                active={draft.type === opt.key}
                onPress={() => setDraft((d) => ({ ...d, type: opt.key }))}
              />
            ))}
          </ChipRow>

          {/* Carteras */}
          <View className="flex-row justify-between items-center mt-2.5 mb-1.5">
            <Text className="text-[12px] text-gray-400 font-medium">Carteras</Text>
            {draft.walletIds.length > 0 && (
              <Text className="text-[11px] text-gray-400">{draft.walletIds.length} seleccionada{draft.walletIds.length !== 1 ? "s" : ""}</Text>
            )}
          </View>
          <ChipRow>
            <Chip
              label="Todas"
              active={draft.walletIds.length === 0}
              onPress={() => setDraft((d) => ({ ...d, walletIds: [] }))}
            />
            {wallets.map((w) => (
              <Chip
                key={w.id}
                label={w.name}
                emoji={w.emoji}
                showCheck
                active={draft.walletIds.includes(w.id)}
                onPress={() => toggleWallet(w.id)}
              />
            ))}
          </ChipRow>

          {/* Categorías */}
          {draft.type !== "transfer" && (
            <>
              <Text className="text-[12px] text-gray-400 mt-2.5 mb-1.5 font-medium">Categorías</Text>
              <ChipRow>
                {visibleCategories.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.name}
                    emoji={c.emoji}
                    showCheck
                    active={draft.categoryIds.includes(c.id)}
                    onPress={() => toggleCategory(c.id)}
                  />
                ))}
                <Chip
                  label="Sin categoría"
                  icon="pricetag-outline"
                  showCheck
                  active={draft.includeUncategorized}
                  onPress={() => setDraft((d) => ({ ...d, includeUncategorized: !d.includeUncategorized }))}
                />
              </ChipRow>
            </>
          )}

          {/* Importe */}
          <Text className="text-[12px] text-gray-400 mt-2.5 mb-1.5 font-medium">Importe</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1, backgroundColor: "#F9FAFB", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "600" }}>Mínimo</Text>
              <TextInput
                value={draft.amountMin}
                onChangeText={(v) => setDraft((d) => ({ ...d, amountMin: v }))}
                placeholder="0,00 €"
                placeholderTextColor="#CBD5E1"
                keyboardType="decimal-pad"
                style={{ fontSize: 14, fontWeight: "700", color: "#0F172A", marginTop: 1, padding: 0 }}
              />
            </View>
            <View style={{ flex: 1, backgroundColor: "#F9FAFB", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "600" }}>Máximo</Text>
              <TextInput
                value={draft.amountMax}
                onChangeText={(v) => setDraft((d) => ({ ...d, amountMax: v }))}
                placeholder="Sin límite"
                placeholderTextColor="#CBD5E1"
                keyboardType="decimal-pad"
                style={{ fontSize: 14, fontWeight: "700", color: "#0F172A", marginTop: 1, padding: 0 }}
              />
            </View>
          </View>

          {/* Ordenar por */}
          <Text className="text-[12px] text-gray-400 mt-2.5 mb-1.5 font-medium">Ordenar por</Text>
          <ChipRow>
            {(
              [
                { key: "recent", label: "Más recientes" },
                { key: "oldest", label: "Más antiguos" },
                { key: "amount_desc", label: "Mayor importe" },
                { key: "amount_asc", label: "Menor importe" },
              ] as { key: SortBy; label: string }[]
            ).map((opt) => (
              <Chip
                key={opt.key}
                label={opt.label}
                active={draft.sortBy === opt.key}
                onPress={() => setDraft((d) => ({ ...d, sortBy: opt.key }))}
              />
            ))}
          </ChipRow>
        </ScrollView>

        {/* Botón inferior */}
        <TouchableOpacity
          onPress={apply}
          activeOpacity={0.85}
          style={{ marginTop: 12, backgroundColor: colors.primary, borderRadius: 13, paddingVertical: 12, alignItems: "center" }}
        >
          <Text style={{ fontSize: 13.5, fontWeight: "700", color: "white" }}>Ver {matchCount} movimiento{matchCount !== 1 ? "s" : ""}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
