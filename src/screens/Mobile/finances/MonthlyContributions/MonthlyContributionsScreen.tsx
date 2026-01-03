// src/screens/Finances/MonthlyContributions/MonthlyContributionsScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  KeyboardAvoidingView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../../../components/AppHeader";
import { colors } from "../../../../theme/theme";
import api from "../../../../api/api";

type CategoryKey = "expense" | "investment" | "savings";

type PlanItem = {
  id: number;
  category: CategoryKey;
  name: string;
  amount: number;
  order: number;
  percentOfIncome?: number;
};

type PlanResponse = {
  id: number;
  income: number;
  currency: "EUR";
  items: PlanItem[];
  summary?: {
    totals: { expense: number; investment: number; savings: number };
    allocated: number;
    remaining: number;
    percentages: {
      expense: number;
      investment: number;
      savings: number;
      allocated: number;
    };
  };
};

type Concept = {
  id: number;
  name: string;
  amount: number;
  category: CategoryKey;
  order: number;
};

type LastSalaryResponse = {
  id: number;
  amount: number;
  date: string; // ISO
  description?: string | null;
  category?: { id: number; name: string } | null;
  subcategory?: { id: number; name: string } | null;
};

const parseMoneyNullable = (raw: string): number | null => {
  const s = String(raw ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const parseMoney = (raw: string) => parseMoneyNullable(raw) ?? 0;

const fmtEUR = (n: number) => {
  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2).replace(".", ",")} €`;
  }
};

const fmtDate = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES", { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return iso;
  }
};

const pct = (part: number, total: number) =>
  !total || total <= 0 ? 0 : (part / total) * 100;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const groupItems = (items: PlanItem[]) => {
  const out: Record<CategoryKey, Concept[]> = { expense: [], investment: [], savings: [] };
  for (const it of items || []) out[it.category].push(it as any);

  (Object.keys(out) as CategoryKey[]).forEach((k) => {
    out[k] = out[k]
      .slice()
      .sort((a: any, b: any) => (b.amount ?? 0) - (a.amount ?? 0) || b.id - a.id);
  });

  return out;
};

function CategoryPill({ cat }: { cat: CategoryKey }) {
  const label = cat === "expense" ? "Gasto" : cat === "investment" ? "Inversión" : "Ahorro";
  const icon =
    cat === "expense"
      ? "trending-down-outline"
      : cat === "investment"
      ? "trending-up-outline"
      : "lock-closed-outline";
  return (
    <View style={styles.pill}>
      <Ionicons name={icon as any} size={14} color="#0F172A" style={{ opacity: 0.7 }} />
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

/**
 * Cross-platform modal:
 * - Native: RN Modal
 * - Web: fixed overlay (avoid portal/zIndex quirks)
 */
function CrossModal({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!visible) return null;

  if (Platform.OS === "web") {
    return (
      <View style={styles.webModalRoot} pointerEvents="auto">
        <Pressable style={styles.webBackdrop} onPress={onClose} />
        <View style={styles.webSheet}>{children}</View>
      </View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={styles.nativeBackdrop} onPress={onClose} />
        <View style={styles.nativeSheetWrap}>
          <View style={styles.nativeSheet}>{children}</View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function MonthlyContributionsScreen({ navigation }: any) {
  // loading states
  const [loading, setLoading] = useState(true);
  const [savingIncome, setSavingIncome] = useState(false);
  const [savingItem, setSavingItem] = useState(false);

  // backend state
  const [incomeRaw, setIncomeRaw] = useState("0");
  const income = useMemo(() => parseMoney(incomeRaw), [incomeRaw]);

  const [concepts, setConcepts] = useState<Record<CategoryKey, Concept[]>>({
    expense: [],
    investment: [],
    savings: [],
  });

  // modal state (concepts)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCat, setModalCat] = useState<CategoryKey>("expense");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<{ name: string; amountRaw: string }>({ name: "", amountRaw: "" });

  // modal state (income)
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [incomeEditRaw, setIncomeEditRaw] = useState("");
  const [fetchingSalary, setFetchingSalary] = useState(false);
  const [lastSalary, setLastSalary] = useState<LastSalaryResponse | null>(null);

  const hydrateFromPlan = useCallback((plan: PlanResponse) => {
    const inc = Number(plan.income ?? 0);
    setIncomeRaw(String(inc).replace(".", ","));
    setConcepts(groupItems(plan.items || []));
  }, []);

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PlanResponse>("/allocation-plan");
      hydrateFromPlan(res.data as any);
    } catch (e) {
      Alert.alert("Error", "No se pudo cargar tu plan.");
    } finally {
      setLoading(false);
    }
  }, [hydrateFromPlan]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  // derived
  const totals = useMemo(() => {
    const expense = concepts.expense.reduce((s, c) => s + (c.amount || 0), 0);
    const investment = concepts.investment.reduce((s, c) => s + (c.amount || 0), 0);
    const savings = concepts.savings.reduce((s, c) => s + (c.amount || 0), 0);
    const allocated = expense + investment + savings;
    const remaining = income - allocated;
    return { expense, investment, savings, allocated, remaining };
  }, [concepts, income]);

  const allocatedRatio = useMemo(() => {
    if (income <= 0) return 0;
    return clamp(totals.allocated / income, 0, 1);
  }, [income, totals.allocated]);

  // ---------- INCOME FLOW (modal) ----------
  const openIncomeModal = () => {
    setIncomeEditRaw(incomeRaw);
    setIncomeModalOpen(true);
    // no hacemos fetch automático para no disparar requests si el user solo quiere editar manual
    // pero si ya estaba cargado, lo mostramos
  };

  const closeIncomeModal = () => {
    setIncomeModalOpen(false);
    setIncomeEditRaw("");
    // no limpiamos lastSalary para reutilizarlo la próxima vez (UX más fluida)
  };

  const saveIncomeValue = useCallback(
    async (nextIncomeNumber: number) => {
      setSavingIncome(true);
      try {
        const res = await api.patch<PlanResponse>("/allocation-plan", { income: nextIncomeNumber });
        hydrateFromPlan(res.data as any);
        closeIncomeModal();
      } catch (e) {
        Alert.alert("Error", "No se pudo guardar el ingreso.");
      } finally {
        setSavingIncome(false);
      }
    },
    [hydrateFromPlan]
  );

  const saveIncomeManual = () => {
    const n = parseMoneyNullable(incomeEditRaw);
    if (n === null || n < 0) return Alert.alert("Importe inválido", "Introduce un número válido.");
    saveIncomeValue(n);
  };

  // ✅ Ahora usamos el endpoint real
  const fetchLastSalary = useCallback(async (): Promise<LastSalaryResponse | null> => {
    setFetchingSalary(true);
    try {
      const res = await api.get<LastSalaryResponse>("/transactions/last-salary");
      const data = res.data as any;

      const amount = Number(data?.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        // si el backend devuelve algo raro
        return null;
      }

      const normalized: LastSalaryResponse = {
        id: Number(data.id),
        amount: Math.abs(amount),
        date: String(data.date),
        description: data.description ?? null,
        category: data.category ?? null,
        subcategory: data.subcategory ?? null,
      };

      setLastSalary(normalized);
      return normalized;
    } catch (e: any) {
      // si backend lanza 404 -> “No hay transacciones de salario”
      const status = e?.response?.status;
      if (status === 404) {
        setLastSalary(null);
        return null;
      }
      // resto de errores
      throw e;
    } finally {
      setFetchingSalary(false);
    }
  }, []);

  const handleLoadSalaryPreview = async () => {
    try {
      const data = await fetchLastSalary();
      if (!data) {
        Alert.alert("No encontrado", "No hay transacciones de salario todavía.");
      }
    } catch {
      Alert.alert("Error", "No se pudo obtener el último salario.");
    }
  };

  const useLastSalaryAsIncome = async () => {
    try {
      const salary = lastSalary ?? (await fetchLastSalary());
      if (!salary) {
        Alert.alert("No encontrado", "No hay transacciones de salario todavía.");
        return;
      }
      await saveIncomeValue(salary.amount);
    } catch {
      Alert.alert("Error", "No se pudo guardar el ingreso usando el último salario.");
    }
  };

  // ---------- CRUD conceptos ----------
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

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm({ name: "", amountRaw: "" });
  };

  const removeConcept = async (id: number) => {
    Alert.alert("Eliminar concepto", "¿Seguro que quieres eliminarlo?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await api.delete<PlanResponse>(`/allocation-plan/items/${id}`);
            hydrateFromPlan(res.data as any);
          } catch (e) {
            Alert.alert("Error", "No se pudo eliminar el concepto.");
          }
        },
      },
    ]);
  };

  const upsertConcept = async () => {
    const name = form.name.trim();
    const amount = parseMoneyNullable(form.amountRaw);

    if (!name) return Alert.alert("Falta el nombre", "Pon un nombre al concepto.");
    if (amount === null || amount <= 0) return Alert.alert("Importe inválido", "Introduce una cantidad mayor que 0.");

    setSavingItem(true);
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
      closeModal();
    } catch (e) {
      Alert.alert("Error", "No se pudo guardar el concepto.");
    } finally {
      setSavingItem(false);
    }
  };

  const Section = ({
    cat,
    title,
    accent,
    icon,
  }: {
    cat: CategoryKey;
    title: string;
    accent: string;
    icon: keyof typeof Ionicons.glyphMap;
  }) => {
    const list = concepts[cat];
    const total = list.reduce((s, x) => s + (x.amount || 0), 0);
    const percent = pct(total, income);

    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={[styles.sectionIconWrap, { borderColor: `${accent}33` }]}>
                <Ionicons name={icon} size={18} color={accent} />
              </View>
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>

            <Text style={styles.sectionSubtitle}>
              <Text style={[styles.sectionSubtitleStrong, { color: accent }]}>{fmtEUR(total)}</Text>
              <Text style={styles.sectionSubtitleMuted}> · {percent.toFixed(1)}%</Text>
            </Text>
          </View>

          <TouchableOpacity onPress={() => openCreate(cat)} activeOpacity={0.85} style={styles.addBtn}>
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {list.length === 0 ? (
          <View style={{ paddingTop: 10 }}>
            <Text style={styles.emptyText}>Sin conceptos todavía.</Text>
          </View>
        ) : (
          <View style={{ marginTop: 10 }}>
            {list.map((x, idx) => (
              <View
                key={x.id}
                style={[
                  styles.itemRow,
                  idx === 0 ? { borderTopWidth: 0, paddingTop: 6 } : null,
                ]}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {x.name}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {pct(x.amount, income).toFixed(1)}% del ingreso
                  </Text>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.itemAmount}>{fmtEUR(x.amount)}</Text>

                  <View style={{ flexDirection: "row", marginTop: 4 }}>
                    <TouchableOpacity onPress={() => openEdit(cat, x)} activeOpacity={0.85} style={styles.iconBtn}>
                      <Ionicons name="create-outline" size={17} color="#64748B" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => removeConcept(x.id)} activeOpacity={0.85} style={styles.iconBtn}>
                      <Ionicons name="trash-outline" size={17} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <AppHeader title="Aportaciones mensuales" showBack={true} showProfile={false} showDatePicker={false} />

        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroLabel}>Ingreso mensual</Text>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={fetchPlan}
                style={{ flexDirection: "row", alignItems: "center" }}
              >
                <Ionicons name="refresh-outline" size={16} color="#fff" />
                <Text style={styles.heroSavingText}>Actualizar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={openIncomeModal}
                style={{ flexDirection: "row", alignItems: "center" }}
              >
                <Ionicons name="create-outline" size={16} color="#fff" />
                <Text style={styles.heroSavingText}>Editar</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ marginTop: 12, flexDirection: "row", alignItems: "baseline" }}>
            <Text style={styles.heroIncomeReadonly}>{fmtEUR(income)}</Text>
          </View>

          <View style={{ marginTop: 14 }}>
            <View style={styles.heroBarTrack}>
              <View style={[styles.heroBarFill, { width: `${allocatedRatio * 100}%` }]} />
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroStatLabel}>Asignado</Text>
                <Text style={styles.heroStatValue}>
                  {fmtEUR(totals.allocated)}{" "}
                  <Text style={styles.heroStatSub}>({pct(totals.allocated, income).toFixed(1)}%)</Text>
                </Text>
              </View>

              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Text style={styles.heroStatLabel}>Restante</Text>
                <Text
                  style={[
                    styles.heroStatValue,
                    { color: totals.remaining >= 0 ? "#FFFFFF" : "#FEE2E2" },
                  ]}
                >
                  {fmtEUR(totals.remaining)}
                </Text>
              </View>
            </View>

            {totals.remaining < 0 ? (
              <View style={styles.warningBox}>
                <Ionicons name="alert-circle-outline" size={16} color="#92400E" />
                <Text style={styles.warningText}>Estás asignando más que tu ingreso.</Text>
              </View>
            ) : null}
          </View>

          {savingIncome ? (
            <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center" }}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={[styles.heroSavingText, { marginLeft: 8 }]}>Guardando ingreso…</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.pillsRow}>
          <View style={styles.pillCard}>
            <CategoryPill cat="expense" />
            <Text style={styles.pillCardValue}>{fmtEUR(totals.expense)}</Text>
            <Text style={styles.pillCardMeta}>{pct(totals.expense, income).toFixed(1)}%</Text>
          </View>

          <View style={styles.pillCard}>
            <CategoryPill cat="investment" />
            <Text style={styles.pillCardValue}>{fmtEUR(totals.investment)}</Text>
            <Text style={styles.pillCardMeta}>{pct(totals.investment, income).toFixed(1)}%</Text>
          </View>

          <View style={styles.pillCard}>
            <CategoryPill cat="savings" />
            <Text style={styles.pillCardValue}>{fmtEUR(totals.savings)}</Text>
            <Text style={styles.pillCardMeta}>{pct(totals.savings, income).toFixed(1)}%</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ marginTop: 8, fontSize: 12, color: "#64748B" }}>Cargando…</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        >
          <Section cat="expense" title="Gastos" accent="#EF4444" icon="trending-down-outline" />
          <Section cat="investment" title="Inversión" accent="#22C55E" icon="trending-up-outline" />
          <Section cat="savings" title="Ahorro" accent="#3B82F6" icon="lock-closed-outline" />
        </ScrollView>
      )}

      {/* MODAL: Conceptos */}
      <CrossModal visible={modalOpen} onClose={closeModal}>
        <View style={{ paddingTop: 4, paddingBottom: 6 }}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{editingId ? "Editar concepto" : "Nuevo concepto"}</Text>
              <CategoryPill cat={modalCat} />
            </View>

            <TouchableOpacity onPress={closeModal} activeOpacity={0.85} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalLabel}>Nombre</Text>
          <TextInput
            value={form.name}
            onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
            placeholder="Ej: Alquiler, ETF, Emergencia…"
            placeholderTextColor="#94A3B8"
            style={styles.field}
          />

          <Text style={styles.modalLabel}>Cantidad (€)</Text>
          <TextInput
            value={form.amountRaw}
            onChangeText={(v) => setForm((p) => ({ ...p, amountRaw: v }))}
            placeholder="Ej: 250"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            style={styles.field}
          />

          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Preview</Text>
            <Text style={styles.previewValue}>
              {fmtEUR(parseMoney(form.amountRaw))} · {pct(parseMoney(form.amountRaw), income).toFixed(1)}%
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity onPress={closeModal} activeOpacity={0.9} style={styles.btnSecondary}>
              <Text style={styles.btnSecondaryText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={upsertConcept} activeOpacity={0.9} style={styles.btnPrimary} disabled={savingItem}>
              {savingItem ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>{editingId ? "Guardar" : "Crear"}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </CrossModal>

      {/* MODAL: Editar ingreso */}
      <CrossModal visible={incomeModalOpen} onClose={closeIncomeModal}>
        <View style={{ paddingTop: 4, paddingBottom: 6 }}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Editar ingreso mensual</Text>
              <Text style={{ fontSize: 12, fontWeight: "800", color: "#64748B" }}>
                Elige cómo quieres calcular el ingreso.
              </Text>
            </View>

            <TouchableOpacity onPress={closeIncomeModal} activeOpacity={0.85} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {/* Opción 1: Manual */}
          <View style={styles.incomeBox}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="pencil-outline" size={18} color="#0F172A" style={{ opacity: 0.75 }} />
                <Text style={styles.incomeBoxTitle}>Editar manualmente</Text>
              </View>
              <Text style={styles.incomeBoxHint}>Recomendado</Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
              <TextInput
                value={incomeEditRaw}
                onChangeText={setIncomeEditRaw}
                placeholder="Ej: 1500"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                style={styles.incomeField}
              />
              <Text style={{ marginLeft: 10, fontWeight: "900", color: "#0F172A" }}>€</Text>
            </View>

            <TouchableOpacity
              onPress={saveIncomeManual}
              activeOpacity={0.9}
              style={[styles.btnPrimary, { marginTop: 10 }]}
              disabled={savingIncome}
            >
              {savingIncome ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Guardar ingreso</Text>}
            </TouchableOpacity>
          </View>

          {/* Opción 2: Último salario (con preview real del endpoint) */}
          <View style={[styles.incomeBox, { marginTop: 12 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="cash-outline" size={18} color="#0F172A" style={{ opacity: 0.75 }} />
                <Text style={styles.incomeBoxTitle}>Usar último salario</Text>
              </View>

              <TouchableOpacity onPress={handleLoadSalaryPreview} activeOpacity={0.9} style={styles.linkBtn} disabled={fetchingSalary}>
                {fetchingSalary ? (
                  <ActivityIndicator />
                ) : (
                  <Text style={styles.linkBtnText}>{lastSalary ? "Actualizar" : "Cargar"}</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.incomeBoxDesc}>
              Recupera tu última transacción de “Salario” y guarda ese importe como ingreso mensual.
            </Text>

            {lastSalary ? (
              <View style={styles.salaryPreview}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={styles.salaryPreviewLabel}>Último salario</Text>
                  <Text style={styles.salaryPreviewDate}>{fmtDate(lastSalary.date)}</Text>
                </View>
                <Text style={styles.salaryPreviewAmount}>{fmtEUR(lastSalary.amount)}</Text>
                {lastSalary.description ? (
                  <Text style={styles.salaryPreviewDesc} numberOfLines={2}>
                    {lastSalary.description}
                  </Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.salaryEmpty}>
                <Text style={styles.salaryEmptyText}>Aún no se ha cargado ningún salario.</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={useLastSalaryAsIncome}
              activeOpacity={0.9}
              style={[styles.btnSecondary, { marginTop: 10 }]}
              disabled={fetchingSalary || savingIncome}
            >
              <Text style={styles.btnSecondaryText}>Guardar último salario como ingreso</Text>
            </TouchableOpacity>
          </View>
        </View>
      </CrossModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // hero
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: 18,
    marginTop: 10,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  heroSavingText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
  heroIncomeReadonly: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  heroBarTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.22)",
    overflow: "hidden",
  },
  heroBarFill: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  heroStatLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "700",
  },
  heroStatValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 2,
  },
  heroStatSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "800",
  },
  warningBox: {
    marginTop: 12,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  warningText: {
    color: "#92400E",
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },

  // pills
  pillsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  pillCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
  },
  pill: { flexDirection: "row", alignItems: "center", gap: 6 },
  pillText: { fontSize: 12, fontWeight: "800", color: "#0F172A", opacity: 0.9 },
  pillCardValue: { marginTop: 8, fontSize: 14, fontWeight: "900", color: "#0F172A" },
  pillCardMeta: { marginTop: 2, fontSize: 11, fontWeight: "700", color: "#64748B" },

  // sections
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginTop: 12,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  sectionTitle: { marginLeft: 10, fontSize: 15, fontWeight: "900", color: "#0F172A" },
  sectionSubtitle: { marginTop: 6, fontSize: 12, fontWeight: "700" },
  sectionSubtitleStrong: { fontWeight: "900" },
  sectionSubtitleMuted: { color: "#64748B", fontWeight: "800" },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  // item rows
  itemRow: { flexDirection: "row", paddingVertical: 12, borderTopWidth: 1, borderTopColor: "rgba(15,23,42,0.06)" },
  itemName: { fontSize: 13, fontWeight: "900", color: "#0F172A" },
  itemMeta: { marginTop: 3, fontSize: 12, fontWeight: "700", color: "#64748B" },
  itemAmount: { fontSize: 13, fontWeight: "900" as any, color: "#0F172A" },
  iconBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  emptyText: { fontSize: 12, fontWeight: "700", color: "#94A3B8" },

  // modal (shared)
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: "900", color: "#0F172A", marginBottom: 6 },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  modalLabel: { fontSize: 12, fontWeight: "800", color: "#64748B", marginBottom: 6 },
  field: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#0F172A",
    fontWeight: "800",
    marginBottom: 12,
  },
  previewRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  previewLabel: { fontSize: 12, fontWeight: "800", color: "#64748B" },
  previewValue: { fontSize: 13, fontWeight: "900", color: "#0F172A" },

  btnSecondary: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
  },
  btnSecondaryText: { fontSize: 13, fontWeight: "900", color: "#0F172A" },
  btnPrimary: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: { fontSize: 13, fontWeight: "900", color: "#fff" },

  // income modal blocks
  incomeBox: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 12,
  },
  incomeBoxTitle: { fontSize: 13, fontWeight: "900", color: "#0F172A" },
  incomeBoxHint: { fontSize: 11, fontWeight: "900", color: "#0F172A", opacity: 0.55 },
  incomeBoxDesc: { marginTop: 8, fontSize: 12, fontWeight: "700", color: "#64748B", lineHeight: 16 },
  incomeField: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#0F172A",
    fontWeight: "900",
  },

  linkBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  linkBtnText: { fontSize: 12, fontWeight: "900", color: "#0F172A" },

  salaryPreview: {
    marginTop: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    borderRadius: 16,
  },
  salaryPreviewLabel: { fontSize: 12, fontWeight: "900", color: "#0F172A" },
  salaryPreviewDate: { fontSize: 12, fontWeight: "800", color: "#64748B" },
  salaryPreviewAmount: { marginTop: 6, fontSize: 18, fontWeight: "900", color: "#0F172A" },
  salaryPreviewDesc: { marginTop: 4, fontSize: 12, fontWeight: "700", color: "#64748B" },

  salaryEmpty: {
    marginTop: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    borderRadius: 16,
  },
  salaryEmptyText: { fontSize: 12, fontWeight: "700", color: "#94A3B8" },

  // native modal
  nativeBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.40)" },
  nativeSheetWrap: { flex: 1, justifyContent: "flex-end" },
  nativeSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },

  // web modal
  webModalRoot: { position: "fixed" as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, justifyContent: "flex-end" },
  webBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.40)" },
  webSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
  },
});
