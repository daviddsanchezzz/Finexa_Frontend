import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput } from "react-native";
import Modal from "react-native-modal";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/theme";

export type InvestmentTypeFilter = "all" | "crypto" | "etf" | "stock" | "fund" | "cash" | "custom";
export type InvestmentPerformanceFilter = "all" | "gain" | "loss";
export type InvestmentSortBy = "value_desc" | "value_asc" | "pnl_desc" | "pnl_asc" | "name_asc";

export interface InvestmentFilters {
  type: InvestmentTypeFilter;
  performance: InvestmentPerformanceFilter;
  amountMin: string;
  amountMax: string;
  sortBy: InvestmentSortBy;
}

export const DEFAULT_INVESTMENT_FILTERS: InvestmentFilters = {
  type: "all",
  performance: "all",
  amountMin: "",
  amountMax: "",
  sortBy: "value_desc",
};

export function countActiveInvestmentFilters(f: InvestmentFilters): number {
  let n = 0;
  if (f.type !== "all") n++;
  if (f.performance !== "all") n++;
  if (f.amountMin.trim() !== "" || f.amountMax.trim() !== "") n++;
  if (f.sortBy !== "value_desc") n++;
  return n;
}

function moneyToNumber(s: string): number | null {
  const v = (s || "").replace(/\./g, "").replace(",", ".");
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

interface FilterableAsset {
  type: string;
  currentValue: number;
  pnl: number;
  name: string;
}

export function applyInvestmentFilters<T extends FilterableAsset>(assets: T[], f: InvestmentFilters): T[] {
  let list = assets;

  if (f.type !== "all") list = list.filter((a) => a.type === f.type);
  if (f.performance === "gain") list = list.filter((a) => a.pnl >= 0);
  if (f.performance === "loss") list = list.filter((a) => a.pnl < 0);

  const min = f.amountMin.trim() !== "" ? moneyToNumber(f.amountMin) : null;
  const max = f.amountMax.trim() !== "" ? moneyToNumber(f.amountMax) : null;
  if (min != null || max != null) {
    list = list.filter((a) => {
      if (min != null && a.currentValue < min) return false;
      if (max != null && a.currentValue > max) return false;
      return true;
    });
  }

  const sorted = [...list];
  switch (f.sortBy) {
    case "value_asc":
      sorted.sort((a, b) => a.currentValue - b.currentValue);
      break;
    case "pnl_desc":
      sorted.sort((a, b) => b.pnl - a.pnl);
      break;
    case "pnl_asc":
      sorted.sort((a, b) => a.pnl - b.pnl);
      break;
    case "name_asc":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "value_desc":
    default:
      sorted.sort((a, b) => b.currentValue - a.currentValue);
      break;
  }
  return sorted;
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        height: 30,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? colors.primary : "#E5E7EB",
        backgroundColor: active ? "rgba(0,60,197,0.08)" : "#F9FAFB",
        marginRight: 6,
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: "700", color: active ? colors.primary : "#374151" }}>{label}</Text>
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
  filters: InvestmentFilters;
  onApply: (filters: InvestmentFilters) => void;
  baseAssets: FilterableAsset[];
}

export default function InvestmentsFiltersModal({ visible, onClose, filters, onApply, baseAssets }: Props) {
  const [draft, setDraft] = useState<InvestmentFilters>(filters);

  useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible, filters]);

  const matchCount = applyInvestmentFilters(baseAssets, draft).length;
  const activeCount = countActiveInvestmentFilters(draft);

  const reset = () => setDraft(DEFAULT_INVESTMENT_FILTERS);
  const apply = () => { onApply(draft); onClose(); };

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
          {/* Tipo de activo */}
          <Text className="text-[12px] text-gray-400 mb-1.5 font-medium">Tipo de activo</Text>
          <ChipRow>
            {(
              [
                { key: "all", label: "Todos" },
                { key: "crypto", label: "Crypto" },
                { key: "etf", label: "ETF" },
                { key: "stock", label: "Acción" },
                { key: "fund", label: "Fondo" },
                { key: "cash", label: "Efectivo" },
                { key: "custom", label: "Custom" },
              ] as { key: InvestmentTypeFilter; label: string }[]
            ).map((opt) => (
              <Chip key={opt.key} label={opt.label} active={draft.type === opt.key} onPress={() => setDraft((d) => ({ ...d, type: opt.key }))} />
            ))}
          </ChipRow>

          {/* Rendimiento */}
          <Text className="text-[12px] text-gray-400 mt-2.5 mb-1.5 font-medium">Rendimiento</Text>
          <ChipRow>
            {(
              [
                { key: "all", label: "Todos" },
                { key: "gain", label: "En ganancia" },
                { key: "loss", label: "En pérdida" },
              ] as { key: InvestmentPerformanceFilter; label: string }[]
            ).map((opt) => (
              <Chip key={opt.key} label={opt.label} active={draft.performance === opt.key} onPress={() => setDraft((d) => ({ ...d, performance: opt.key }))} />
            ))}
          </ChipRow>

          {/* Valor actual */}
          <Text className="text-[12px] text-gray-400 mt-2.5 mb-1.5 font-medium">Valor actual</Text>
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
                { key: "value_desc", label: "Mayor valor" },
                { key: "value_asc", label: "Menor valor" },
                { key: "pnl_desc", label: "Mayor rentabilidad" },
                { key: "pnl_asc", label: "Menor rentabilidad" },
                { key: "name_asc", label: "Nombre (A-Z)" },
              ] as { key: InvestmentSortBy; label: string }[]
            ).map((opt) => (
              <Chip key={opt.key} label={opt.label} active={draft.sortBy === opt.key} onPress={() => setDraft((d) => ({ ...d, sortBy: opt.key }))} />
            ))}
          </ChipRow>
        </ScrollView>

        {/* Botón inferior */}
        <TouchableOpacity
          onPress={apply}
          activeOpacity={0.85}
          style={{ marginTop: 12, backgroundColor: colors.primary, borderRadius: 13, paddingVertical: 12, alignItems: "center" }}
        >
          <Text style={{ fontSize: 13.5, fontWeight: "700", color: "white" }}>Ver {matchCount} activo{matchCount !== 1 ? "s" : ""}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
