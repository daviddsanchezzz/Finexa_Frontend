import { useBudgetData } from "../../../../hooks/useBudgetData";
import { useBudgetFormOptions } from "../../../../hooks/useBudgetFormOptions";
import { invalidateBudgets } from "../../../../utils/budgetsCache";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import api from "../../../../api/api";
import { colors } from "../../../../theme/theme";
import { formatEuro } from "../../../../utils/currency";
import { appAlert } from "../../../../utils/appAlert";
import {
  EditingActionRow,
  EditingForm,
  FormAccountPicker,
  FormCategoryPicker,
  FormDateField,
  FormError,
  FormMoneyField,
  FormSection,
  FormSegmentedControl,
  FormTextField,
  FormToggle,
} from "../../../../components/creation";

type BudgetPeriod = "daily" | "weekly" | "monthly" | "yearly";

const PERIOD_OPTIONS: { label: string; value: BudgetPeriod }[] = [
  { label: "Diario", value: "daily" },
  { label: "Semanal", value: "weekly" },
  { label: "Mensual", value: "monthly" },
  { label: "Anual", value: "yearly" },
];

const PERIOD_NOUN: Record<BudgetPeriod, string> = {
  daily: "día",
  weekly: "semana",
  monthly: "mes",
  yearly: "año",
};

// Mismo estilo que la etiqueta de FormTextField/FormSelect ("Nombre", "Periodo"...)
// para que "Límites por categoría" se vea idéntico, en vez del título pesado de FormSection.
const sectionLabelStyle = { fontSize: 12, fontWeight: "700" as const, color: "#64748B", marginBottom: 5 };

const normalizeStartOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const toNumberOrNull = (text: string): number | null => {
  if (!text || !text.trim()) return null;
  const n = Number(text.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const money = (n: number) => `${formatEuro(n)} €`;

interface CategoryLimitDraft {
  categoryId: number;
  name: string;
  emoji?: string | null;
  limitText: string;
}

export default function BudgetEditScreen({ navigation }: any) {
  const route = useRoute();
  const { budgetId } = (route.params as any) || {};

  const [formReady, setFormReady] = useState(false);
  const hydratedBudget = useRef<number | null>(null);
  const budgetQuery = useBudgetData<any>(["edit", budgetId], async (signal) => (await api.get(`/budgets/${budgetId}`, { signal })).data);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const options = useBudgetFormOptions();
  const wallets = options.data?.wallets ?? [];
  const categories = options.data?.categories ?? [];

  const [name, setName] = useState("");
  const [period, setPeriod] = useState<BudgetPeriod>("monthly");
  const [totalLimitText, setTotalLimitText] = useState("");
  const [categoryLimits, setCategoryLimits] = useState<CategoryLimitDraft[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [walletIds, setWalletIds] = useState<number[]>([]);
  const [startDate, setStartDate] = useState<Date>(normalizeStartOfDay(new Date()));
  const [autoRenew, setAutoRenew] = useState(true);
  const [carryOverRemaining, setCarryOverRemaining] = useState(false);

  useEffect(() => {
    if (!budgetQuery.data || hydratedBudget.current === budgetId) return;
    const b = budgetQuery.data;
        setName(b.name || "");
        setPeriod(b.period || "monthly");
        setTotalLimitText(b.totalLimit != null ? String(b.totalLimit).replace(".", ",") : "");
        setCategoryLimits(
          (b.categoryLimits || []).map((cl: any) => ({
            categoryId: cl.categoryId,
            name: cl.category?.name || "Categoría",
            emoji: cl.category?.emoji,
            limitText: String(cl.limit).replace(".", ","),
          }))
        );
        setWalletIds(b.walletIds || []);
        setStartDate(normalizeStartOfDay(new Date(b.startDate)));
        setAutoRenew(b.autoRenew !== undefined ? !!b.autoRenew : true);
        setCarryOverRemaining(!!b.carryOverRemaining);

    hydratedBudget.current = budgetId;
    setFormReady(true);
  }, [budgetQuery.data, budgetId]);
  const loading = !formReady || options.isPending;

  const expenseCategories = useMemo(
    () => (categories || []).filter((c: any) => c?.type === "expense" && c?.active !== false),
    [categories]
  );

  const totalLimitValue = toNumberOrNull(totalLimitText);
  const catSum = categoryLimits.reduce((s, c) => s + (toNumberOrNull(c.limitText) || 0), 0);
  const overLimit = totalLimitValue != null && catSum > totalLimitValue;
  const hasAnyLimit = (totalLimitValue != null && totalLimitValue > 0) || categoryLimits.length > 0;
  const allCategoryLimitsPositive = categoryLimits.every((c) => (toNumberOrNull(c.limitText) || 0) > 0);
  const isValid = hasAnyLimit && allCategoryLimitsPositive && !overLimit;

  const addCategoryLimit = (cat: { id: number; name: string; emoji?: string | null }) => {
    setCategoryLimits((prev) => [...prev, { categoryId: cat.id, name: cat.name, emoji: cat.emoji, limitText: "" }]);
    setPickerVisible(false);
  };
  const updateCategoryLimit = (idx: number, text: string) => {
    setCategoryLimits((prev) => prev.map((c, i) => (i === idx ? { ...c, limitText: text } : c)));
  };
  const removeCategoryLimit = (idx: number) => {
    setCategoryLimits((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitError(null);
    try {
      setSaving(true);
      const payload = {
        name: name.trim() || null,
        period,
        startDate: normalizeStartOfDay(startDate).toISOString(),
        totalLimit: totalLimitValue,
        categoryLimits: categoryLimits.map((c) => ({ categoryId: c.categoryId, limit: toNumberOrNull(c.limitText) || 0 })),
        walletIds,
        autoRenew,
        carryOverRemaining,
      };
      await api.patch(`/budgets/${budgetId}`, payload);
      invalidateBudgets();
      navigation.goBack();
    } catch (e: any) {
      console.error("ERROR actualizando presupuesto:", e);
      setSubmitError(e?.response?.data?.message || "No se pudo guardar el presupuesto");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = () => {
    appAlert(
      "Archivar presupuesto",
      "Dejará de aparecer y de renovarse, pero conservarás su histórico de gasto.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Archivar",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/budgets/${budgetId}`);
              invalidateBudgets();
              navigation.pop(2);
            } catch (e) {
              appAlert("Error", "No se pudo archivar el presupuesto");
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    appAlert(
      "Eliminar presupuesto",
      "Se eliminará de forma permanente. Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/budgets/${budgetId}/permanent`);
              invalidateBudgets();
              navigation.pop(2);
            } catch (e) {
              appAlert("Error", "No se pudo eliminar el presupuesto");
            }
          },
        },
      ]
    );
  };

  return (
    <EditingForm
      title="Editar presupuesto"
      onClose={() => navigation.goBack()}
      onSubmit={handleSubmit}
      submitLabel="Guardar cambios"
      isLoading={loading}
      isSubmitting={saving}
      isValid={isValid}
      submitError={submitError}
    >
      <FormSection>
        <FormTextField label="Nombre" value={name} onChangeText={setName} autoCapitalize="sentences" returnKeyType="done" />
        <FormSegmentedControl<BudgetPeriod> label="Periodo" value={period} options={PERIOD_OPTIONS} onChange={setPeriod} />
        <FormMoneyField
          label="Límite total"
          value={totalLimitText}
          onChangeText={setTotalLimitText}
          currency="€"
          hint="Opcional. Define el máximo que quieres gastar en total durante este periodo."
        />
      </FormSection>

      <View style={{ height: 24 }} />

      <FormSection>
        <Text style={sectionLabelStyle}>Límites por categoría</Text>
        {categoryLimits.map((c, idx) => (
          <View key={c.categoryId} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ fontSize: 18 }}>{c.emoji || "💸"}</Text>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: colors.ink }} numberOfLines={1}>
              {c.name}
            </Text>
            <View style={{ width: 108 }}>
              <FormMoneyField label="" value={c.limitText} onChangeText={(t) => updateCategoryLimit(idx, t)} currency="€" />
            </View>
            <TouchableOpacity onPress={() => removeCategoryLimit(idx)} hitSlop={8} accessibilityLabel={`Eliminar límite de ${c.name}`}>
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          onPress={() => setPickerVisible(true)}
          activeOpacity={0.75}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8 }}
        >
          <Ionicons name="add-circle" size={20} color={colors.primary} />
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary }}>Añadir categoría</Text>
        </TouchableOpacity>

        {overLimit ? (
          <FormError message="Los límites por categoría no pueden superar el límite total." />
        ) : !hasAnyLimit ? (
          <FormError message="Añade un límite total o al menos un límite por categoría." />
        ) : null}

        {totalLimitValue != null && categoryLimits.length > 0 ? (
          <View style={{ backgroundColor: "#F8FAFC", borderRadius: 14, padding: 14, gap: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 12.5, fontWeight: "600", color: "#64748B" }}>Límite total</Text>
              <Text style={{ fontSize: 12.5, fontWeight: "700", color: colors.ink }}>{money(totalLimitValue)}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 12.5, fontWeight: "600", color: "#64748B" }}>Asignado</Text>
              <Text style={{ fontSize: 12.5, fontWeight: "700", color: colors.ink }}>{money(catSum)}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 12.5, fontWeight: "600", color: "#64748B" }}>Sin asignar</Text>
              <Text style={{ fontSize: 12.5, fontWeight: "700", color: colors.ink }}>
                {money(Math.max(totalLimitValue - catSum, 0))}
              </Text>
            </View>
          </View>
        ) : null}

        <FormCategoryPicker
          visible={pickerVisible}
          categories={expenseCategories}
          excludeIds={categoryLimits.map((c) => c.categoryId)}
          onSelect={addCategoryLimit}
          onClose={() => setPickerVisible(false)}
        />
      </FormSection>

      <View style={{ height: 24 }} />

      <FormSection>
        <FormAccountPicker label="Cartera" wallets={wallets} selectedIds={walletIds} onChange={setWalletIds} />
        <FormDateField label="Fecha de inicio" value={startDate} onChange={(d) => setStartDate(normalizeStartOfDay(d))} />
        <FormToggle
          label="Renovar automáticamente"
          description={`Si lo activas, este presupuesto se creará de nuevo cada ${PERIOD_NOUN[period]}. Si lo desactivas, será único para este ${PERIOD_NOUN[period]}.`}
          value={autoRenew}
          onValueChange={setAutoRenew}
        />
        <FormToggle
          label="Transferir sobrante"
          description={`Si no gastas todo el límite total, el importe restante se añadirá al límite del próximo ${PERIOD_NOUN[period]}.`}
          value={carryOverRemaining}
          onValueChange={setCarryOverRemaining}
        />
      </FormSection>

      <View style={{ height: 24 }} />

      <FormSection title="Otras acciones">
        <EditingActionRow label="Archivar presupuesto" onPress={handleArchive} />
        <EditingActionRow label="Eliminar presupuesto" onPress={handleDelete} destructive />
      </FormSection>
    </EditingForm>
  );
}
