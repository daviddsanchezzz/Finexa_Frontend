import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import api from "../../../../api/api";
import { colors } from "../../../../theme/theme";
import { formatEuro } from "../../../../utils/currency";
import {
  CreationFlow,
  CreationStep,
  FormAccountPicker,
  FormCategoryPicker,
  FormDateField,
  FormError,
  FormMoneyField,
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

export default function BudgetCreateScreen({ navigation }: any) {
  const route = useRoute();
  const { periodType } = (route.params as any) || {};

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [wallets, setWallets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const [name, setName] = useState("");
  const [period, setPeriod] = useState<BudgetPeriod>(
    ["daily", "weekly", "monthly", "yearly"].includes(periodType) ? periodType : "monthly"
  );
  const [totalLimitText, setTotalLimitText] = useState("");

  const [categoryLimits, setCategoryLimits] = useState<CategoryLimitDraft[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);

  const [walletIds, setWalletIds] = useState<number[]>([]);
  const [startDate, setStartDate] = useState<Date>(normalizeStartOfDay(new Date()));
  const [autoRenew, setAutoRenew] = useState(true);
  const [carryOverRemaining, setCarryOverRemaining] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [walletRes, catRes] = await Promise.all([api.get("/wallets"), api.get("/categories")]);
        setWallets(walletRes.data || []);
        setCategories(catRes.data || []);
      } catch (e) {
        console.error("ERROR (budgets create fetch):", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const expenseCategories = useMemo(
    () => (categories || []).filter((c: any) => c?.type === "expense" && c?.active !== false),
    [categories]
  );

  const totalLimitValue = toNumberOrNull(totalLimitText);
  const catSum = categoryLimits.reduce((s, c) => s + (toNumberOrNull(c.limitText) || 0), 0);
  const overLimit = totalLimitValue != null && catSum > totalLimitValue;
  const hasAnyLimit = (totalLimitValue != null && totalLimitValue > 0) || categoryLimits.length > 0;
  const allCategoryLimitsPositive = categoryLimits.every((c) => (toNumberOrNull(c.limitText) || 0) > 0);
  const step2Valid = hasAnyLimit && allCategoryLimitsPositive && !overLimit;

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
      await api.post("/budgets", payload);
      navigation.goBack();
    } catch (e: any) {
      console.error("ERROR guardando presupuesto:", e);
      setSubmitError(e?.response?.data?.message || "No se pudo guardar el presupuesto");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const steps: CreationStep[] = [
    {
      id: "budget",
      title: "Presupuesto",
      description: "Define cuánto quieres gastar durante este periodo.",
      isValid: true,
      content: (
        <View style={{ gap: 18 }}>
          <FormTextField label="Nombre" value={name} onChangeText={setName} autoCapitalize="sentences" returnKeyType="done" />
          <FormSegmentedControl<BudgetPeriod>
            label="Periodo"
            value={period}
            options={PERIOD_OPTIONS}
            onChange={setPeriod}
          />
          <FormMoneyField
            label="Límite total"
            value={totalLimitText}
            onChangeText={setTotalLimitText}
            currency="€"
            hint="Opcional. Define el máximo que quieres gastar en total durante este periodo."
          />
        </View>
      ),
    },
    {
      id: "limits",
      title: "Límites por categoría",
      description: "Añade límites específicos si quieres controlar algunas categorías por separado.",
      isValid: step2Valid,
      content: ({ showErrors }) => (
        <View style={{ gap: 20 }}>
          <View style={{ gap: 10 }}>
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
            ) : showErrors && !hasAnyLimit ? (
              <FormError message="Añade un límite total o al menos un límite por categoría." />
            ) : null}
          </View>

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

          <View style={{ gap: 18 }}>
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
          </View>

          <FormCategoryPicker
            visible={pickerVisible}
            categories={expenseCategories}
            excludeIds={categoryLimits.map((c) => c.categoryId)}
            onSelect={addCategoryLimit}
            onClose={() => setPickerVisible(false)}
          />
        </View>
      ),
    },
  ];

  return (
    <CreationFlow
      title="Presupuesto"
      steps={steps}
      submitLabel="Crear presupuesto"
      onSubmit={handleSubmit}
      onClose={() => navigation.goBack()}
      isSubmitting={saving}
      submitError={submitError}
    />
  );
}
