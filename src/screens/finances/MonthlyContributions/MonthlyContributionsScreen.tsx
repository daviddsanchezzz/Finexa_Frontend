// src/screens/Finances/MonthlyContributions/MonthlyContributionsScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../../components/AppHeader";
import { colors } from "../../../theme/theme";
import api from "../../../api/api";

type CategoryKey = "expense" | "investment" | "savings";

type Concept = {
  id: number; // viene del back
  name: string;
  amount: number;
  category: CategoryKey;
  order?: number;
};

type PlanResponse = {
  id: number;
  income: number;
  currency: "EUR";
  items: Array<{
    id: number;
    category: CategoryKey;
    name: string;
    amount: number;
    order: number;
    percentOfIncome?: number;
  }>;
  summary?: {
    totals: { expense: number; investment: number; savings: number };
    allocated: number;
    remaining: number;
    percentages: { expense: number; investment: number; savings: number; allocated: number };
  };
};

const parseMoney = (raw: string) => {
  const n = Number(String(raw).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const fmtEUR = (n: number) => {
  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} €`;
  }
};

const pct = (part: number, total: number) =>
  !total || total <= 0 ? 0 : (part / total) * 100;

const groupItems = (items: PlanResponse["items"]) => {
  const out: Record<CategoryKey, Concept[]> = { expense: [], investment: [], savings: [] };
  for (const it of items || []) out[it.category].push(it as any);
  // orden consistente
  (Object.keys(out) as CategoryKey[]).forEach((k) => {
    out[k] = out[k].slice().sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0) || b.id - a.id);
  });
  return out;
};

export default function MonthlyContributionsScreen({ navigation }: any) {
  // ====== UI STATE ======
  const [loading, setLoading] = useState(true);
  const [savingIncome, setSavingIncome] = useState(false);

  // ====== BACKED STATE ======
  const [incomeRaw, setIncomeRaw] = useState("0");
  const income = useMemo(() => parseMoney(incomeRaw), [incomeRaw]);

  const [concepts, setConcepts] = useState<Record<CategoryKey, Concept[]>>({
    expense: [],
    investment: [],
    savings: [],
  });

  // ====== MODAL (ADD/EDIT) ======
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCat, setModalCat] = useState<CategoryKey>("expense");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<{ name: string; amountRaw: string }>({ name: "", amountRaw: "" });

  // ====== Helpers ======
  const hydrateFromPlan = (plan: PlanResponse) => {
    setIncomeRaw(String(plan.income ?? 0).replace(".", ","));
    setConcepts(groupItems(plan.items || []));
  };

  const fetchPlan = async () => {
    setLoading(true);
    try {
      const res = await api.get<PlanResponse>("/allocation-plan");
      hydrateFromPlan(res.data as any);
    } catch (e: any) {
      Alert.alert("Error", "No se pudo cargar tu plan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, []);

  // ====== Totals (front) ======
  // (podrías usar res.data.summary del back; esto lo mantenemos por robustez/UI instantánea)
  const totals = useMemo(() => {
    const expense = concepts.expense.reduce((s, c) => s + (c.amount || 0), 0);
    const investment = concepts.investment.reduce((s, c) => s + (c.amount || 0), 0);
    const savings = concepts.savings.reduce((s, c) => s + (c.amount || 0), 0);
    const allocated = expense + investment + savings;
    const remaining = income - allocated;
    return { expense, investment, savings, allocated, remaining };
  }, [concepts, income]);

  // ====== Income autosave (debounced) ======
  const incomeSaveTimer = useRef<any>(null);
  const lastSavedIncome = useRef<number | null>(null);

  const scheduleSaveIncome = (nextRaw: string) => {
    setIncomeRaw(nextRaw);
    if (incomeSaveTimer.current) clearTimeout(incomeSaveTimer.current);

    incomeSaveTimer.current = setTimeout(async () => {
      const nextIncome = parseMoney(nextRaw);

      // evita guardar si no ha cambiado
      if (lastSavedIncome.current !== null && Math.abs(lastSavedIncome.current - nextIncome) < 0.0001) return;

      setSavingIncome(true);
      try {
        const res = await api.patch<PlanResponse>("/allocation-plan", { income: nextIncome });
        // el back devuelve el plan completo: hidrata y actualiza lastSaved
        hydrateFromPlan(res.data as any);
        lastSavedIncome.current = nextIncome;
      } catch (e: any) {
        // no rompemos UX: dejamos el input como está y avisamos
        Alert.alert("Error", "No se pudo guardar el ingreso.");
      } finally {
        setSavingIncome(false);
      }
    }, 650);
  };

  useEffect(() => {
    return () => {
      if (incomeSaveTimer.current) clearTimeout(incomeSaveTimer.current);
    };
  }, []);

  // ====== CRUD ======
  const openCreate = (cat: CategoryKey) => {
    setModalCat(cat);
    setEditingId(null);
    setForm({ name: "", amountRaw: "" });
    setModalOpen(true);
  };

  const openEdit = (cat: CategoryKey, item: Concept) => {
    setModalCat(cat);
    setEditingId(item.id);
    setForm({ name: item.name, amountRaw: String(item.amount).replace(".", ",") });
    setModalOpen(true);
  };

  const removeConcept = async (id: number) => {
    try {
      const res = await api.delete<PlanResponse>(`/allocation-plan/items/${id}`);
      hydrateFromPlan(res.data as any);
    } catch (e: any) {
      Alert.alert("Error", "No se pudo eliminar el concepto.");
    }
  };

  const upsertConcept = async () => {
    const name = form.name.trim();
    const amount = parseMoney(form.amountRaw);

    if (!name) return Alert.alert("Falta el nombre", "Pon un nombre al concepto.");
    if (!amount || amount <= 0) return Alert.alert("Importe inválido", "Introduce una cantidad mayor que 0.");

    try {
      if (editingId) {
        const res = await api.patch<PlanResponse>(`/allocation-plan/items/${editingId}`, {
          name,
          amount,
          category: modalCat,
        });
        hydrateFromPlan(res.data as any);
      } else {
        const res = await api.post<PlanResponse>("/allocation-plan/items", {
          name,
          amount,
          category: modalCat,
        });
        hydrateFromPlan(res.data as any);
      }

      setModalOpen(false);
      setEditingId(null);
      setForm({ name: "", amountRaw: "" });
    } catch (e: any) {
      Alert.alert("Error", "No se pudo guardar el concepto.");
    }
  };

  const CategoryBlock = ({ cat, title }: { cat: CategoryKey; title: string }) => {
    const list = concepts[cat];
    const total = list.reduce((s, x) => s + (x.amount || 0), 0);

    return (
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 18,
          borderWidth: 1,
          borderColor: "#E2E8F0",
          padding: 14,
          marginBottom: 12,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-[14px] font-bold text-[#0F172A]">{title}</Text>
            <Text className="text-[12px] text-[#64748B]">
              {fmtEUR(total)} · {pct(total, income).toFixed(1)}%
            </Text>
          </View>

          <TouchableOpacity onPress={() => openCreate(cat)} activeOpacity={0.9}>
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View className="mt-3">
          {list.length === 0 ? (
            <Text className="text-[12px] text-[#94A3B8]">Sin conceptos.</Text>
          ) : (
            list.map((x) => (
              <View
                key={x.id}
                style={{
                  paddingVertical: 10,
                  borderTopWidth: 1,
                  borderTopColor: "rgba(15,23,42,0.06)",
                }}
              >
                <View className="flex-row items-center">
                  <View style={{ flex: 1 }}>
                    <Text className="text-[13px] font-semibold text-[#0F172A]" numberOfLines={1}>
                      {x.name}
                    </Text>
                    <Text className="text-[12px] text-[#64748B]">
                      {pct(x.amount, income).toFixed(1)}% del ingreso
                    </Text>
                  </View>

                  <View className="items-end ml-2">
                    <Text className="text-[13px] font-extrabold text-[#0F172A]">
                      {fmtEUR(x.amount)}
                    </Text>
                    <View className="flex-row mt-1">
                      <TouchableOpacity
                        onPress={() => openEdit(cat, x)}
                        activeOpacity={0.8}
                        style={{ paddingHorizontal: 8, paddingVertical: 6 }}
                      >
                        <Ionicons name="create-outline" size={18} color="#94A3B8" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => removeConcept(x.id)}
                        activeOpacity={0.8}
                        style={{ paddingHorizontal: 8, paddingVertical: 6 }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#94A3B8" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F3F4F6]">
      <View className="px-5 pb-1">
        <AppHeader title="Aportaciones mensuales" showBack={true} showProfile={false} showDatePicker={false} />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
          <Text className="mt-2 text-[12px] text-[#64748B]">Cargando...</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingTop: 6, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Ingreso + Restante */}
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 18,
              borderWidth: 1,
              borderColor: "#E2E8F0",
              padding: 14,
              marginBottom: 12,
            }}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-[12px] text-[#64748B]">Ingreso (manual)</Text>
              {savingIncome ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" />
                  <Text className="ml-2 text-[12px] text-[#64748B]">Guardando…</Text>
                </View>
              ) : null}
            </View>

            <View className="flex-row items-center mt-2">
              <TextInput
                value={incomeRaw}
                onChangeText={scheduleSaveIncome}
                placeholder="Ej: 1500"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  borderRadius: 16,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  color: "#0F172A",
                  fontSize: 16,
                  fontWeight: "800",
                }}
              />
              <Text className="ml-3 text-[14px] font-extrabold text-[#0F172A]">€</Text>
            </View>

            <View className="mt-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-[12px] text-[#64748B]">Asignado</Text>
                <Text className="text-[13px] font-bold text-[#0F172A]">
                  {fmtEUR(totals.allocated)} ({pct(totals.allocated, income).toFixed(1)}%)
                </Text>
              </View>

              <View className="flex-row items-center justify-between mt-2">
                <Text className="text-[12px] text-[#64748B]">Restante</Text>
                <Text
                  className="text-[14px] font-extrabold"
                  style={{ color: totals.remaining >= 0 ? "#0F172A" : "#EF4444" }}
                >
                  {fmtEUR(totals.remaining)}
                </Text>
              </View>

              {totals.remaining < 0 ? (
                <Text className="text-[11px] text-[#EF4444] mt-2">
                  Estás asignando más que tu ingreso.
                </Text>
              ) : null}
            </View>
          </View>

          {/* Categorías */}
          <CategoryBlock cat="expense" title="Gasto" />
          <CategoryBlock cat="investment" title="Inversión" />
          <CategoryBlock cat="savings" title="Ahorro" />
        </ScrollView>
      )}

      {/* ADD/EDIT MODAL */}
      <Modal visible={modalOpen} transparent animationType="fade">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View className="flex-1 bg-black/40 justify-end">
            <View className="bg-white rounded-t-3xl px-4 pt-4 pb-6">
              <View className="flex-row justify-between items-center mb-3">
                <View>
                  <Text className="text-[15px] font-semibold text-[#0F172A]">
                    {editingId ? "Editar concepto" : "Nuevo concepto"}
                  </Text>
                  <Text className="text-[12px] text-[#64748B]">
                    {modalCat === "expense" ? "Gasto" : modalCat === "investment" ? "Inversión" : "Ahorro"}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setModalOpen(false);
                    setEditingId(null);
                    setForm({ name: "", amountRaw: "" });
                  }}
                >
                  <Text className="text-[13px] font-semibold text-[#0F172A]">Cerrar</Text>
                </TouchableOpacity>
              </View>

              <Text className="text-[12px] text-[#64748B] mb-1">Nombre</Text>
              <TextInput
                value={form.name}
                onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
                placeholder="Ej: Alquiler, ETF, Emergencia…"
                placeholderTextColor="#94A3B8"
                style={{
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  borderRadius: 16,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: "#0F172A",
                  marginBottom: 10,
                }}
              />

              <Text className="text-[12px] text-[#64748B] mb-1">Cantidad (€)</Text>
              <TextInput
                value={form.amountRaw}
                onChangeText={(v) => setForm((p) => ({ ...p, amountRaw: v }))}
                placeholder="Ej: 250"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                style={{
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  borderRadius: 16,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: "#0F172A",
                  marginBottom: 12,
                }}
              />

              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-[12px] text-[#64748B]">Preview</Text>
                <Text className="text-[13px] font-extrabold text-[#0F172A]">
                  {fmtEUR(parseMoney(form.amountRaw))} · {pct(parseMoney(form.amountRaw), income).toFixed(1)}%
                </Text>
              </View>

              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => {
                    setModalOpen(false);
                    setEditingId(null);
                    setForm({ name: "", amountRaw: "" });
                  }}
                  activeOpacity={0.9}
                  style={{
                    flex: 1,
                    backgroundColor: "#F1F5F9",
                    borderRadius: 16,
                    paddingVertical: 12,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                  }}
                >
                  <Text className="text-[13px] font-semibold text-[#0F172A]">Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={upsertConcept}
                  activeOpacity={0.9}
                  style={{
                    flex: 1,
                    backgroundColor: colors.primary,
                    borderRadius: 16,
                    paddingVertical: 12,
                    alignItems: "center",
                  }}
                >
                  <Text className="text-[13px] font-semibold text-white">
                    {editingId ? "Guardar" : "Crear"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
