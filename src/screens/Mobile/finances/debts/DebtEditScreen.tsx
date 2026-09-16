import React, { useEffect, useRef, useState } from "react";
import { View, Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "@react-navigation/native";
import api from "../../../../api/api";
import { markTransactionsDirty } from "../../../../utils/transactionsInvalidation";
import { useDebtFormOptions } from "../../../../hooks/useDebtFormOptions";
import {
  EditingForm,
  FormDateField,
  FormEmojiField,
  FormMoneyField,
  FormNotesField,
  FormNumberField,
  FormOptionCard,
  FormSection,
  FormTextField,
  FormToggle,
  FormWalletPicker,
} from "../../../../components/creation";
import { DEBT_FREQUENCY_OPTIONS, DEBT_TYPE_OPTIONS, DebtFrequency, DebtType, toNumberOrNull } from "./debtFormShared";

const normalizeStartOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export default function DebtEditScreen({ navigation }: any) {
  const route = useRoute();
  const { debtId } = (route.params as any) || {};

  const debtQuery = useQuery({
    queryKey: ["debts", "edit", debtId],
    queryFn: async () => (await api.get(`/debts/${debtId}`)).data,
    enabled: !!debtId,
  });
  const options = useDebtFormOptions();
  const wallets = options.data?.wallets ?? [];

  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const hydrated = useRef<number | null>(null);

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("💸");
  const [totalAmountText, setTotalAmountText] = useState("");
  const [remainingAmountText, setRemainingAmountText] = useState("");
  const [type, setType] = useState<DebtType>("loan");
  const [hasPeriodicPayments, setHasPeriodicPayments] = useState(false);

  const [cuotaText, setCuotaText] = useState("");
  const [frequency, setFrequency] = useState<DebtFrequency>("monthly");
  const [nextDueDate, setNextDueDate] = useState<Date>(normalizeStartOfDay(new Date()));
  const [walletId, setWalletId] = useState<number | null>(null);
  const [autoRecurring, setAutoRecurring] = useState(true);
  const [installmentsPaidText, setInstallmentsPaidText] = useState("");

  const [interestRateText, setInterestRateText] = useState("");
  const [startDate, setStartDate] = useState<Date>(normalizeStartOfDay(new Date()));
  const [expectedEndDate, setExpectedEndDate] = useState<Date | null>(null);
  const [entity, setEntity] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!debtQuery.data || hydrated.current === debtId) return;
    const d = debtQuery.data;
    setName(d.name || "");
    setEmoji(d.emoji || "💸");
    setTotalAmountText(d.totalAmount != null ? String(d.totalAmount).replace(".", ",") : "");
    setRemainingAmountText(d.remainingAmount != null ? String(d.remainingAmount).replace(".", ",") : "");
    setType(d.type || "loan");
    setHasPeriodicPayments(d.monthlyPayment != null && d.paymentFrequency != null);
    setCuotaText(d.monthlyPayment != null ? String(d.monthlyPayment).replace(".", ",") : "");
    setFrequency(d.paymentFrequency || "monthly");
    setNextDueDate(d.nextDueDate ? normalizeStartOfDay(new Date(d.nextDueDate)) : normalizeStartOfDay(new Date()));
    setWalletId(d.walletId ?? null);
    setAutoRecurring(d.autoRecurringEnabled ?? true);
    setInstallmentsPaidText(d.installmentsPaid != null ? String(d.installmentsPaid) : "");
    setInterestRateText(d.interestRate != null ? String(d.interestRate).replace(".", ",") : "");
    setStartDate(d.startDate ? normalizeStartOfDay(new Date(d.startDate)) : normalizeStartOfDay(new Date()));
    setExpectedEndDate(d.expectedEndDate ? normalizeStartOfDay(new Date(d.expectedEndDate)) : null);
    setEntity(d.entity || "");
    setNotes(d.notes || "");
    hydrated.current = debtId;
  }, [debtQuery.data, debtId]);

  const loading = !debtQuery.data || hydrated.current !== debtId;

  const totalAmountValue = toNumberOrNull(totalAmountText);
  const remainingAmountValue = toNumberOrNull(remainingAmountText);
  const cuotaValue = toNumberOrNull(cuotaText);
  const interestRateValue = toNumberOrNull(interestRateText);
  const installmentsPaidValue = toNumberOrNull(installmentsPaidText);

  const amountsValid =
    name.trim().length > 0 &&
    totalAmountValue != null &&
    totalAmountValue > 0 &&
    remainingAmountValue != null &&
    remainingAmountValue >= 0 &&
    remainingAmountValue <= totalAmountValue;
  const paymentValid = !hasPeriodicPayments || (cuotaValue != null && cuotaValue > 0 && walletId != null);
  const isValid = amountsValid && paymentValid;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitError(null);
    try {
      setSaving(true);
      const payed = Math.max(0, (totalAmountValue ?? 0) - (remainingAmountValue ?? 0));
      const payload = {
        type,
        name: name.trim(),
        emoji: emoji.trim() || null,
        entity: entity.trim() || null,
        totalAmount: totalAmountValue,
        payed,
        interestRate: interestRateValue,
        monthlyPayment: hasPeriodicPayments ? cuotaValue : null,
        paymentFrequency: hasPeriodicPayments ? frequency : null,
        walletId: hasPeriodicPayments ? walletId : null,
        autoRecurringEnabled: hasPeriodicPayments ? autoRecurring : false,
        installmentsPaid: hasPeriodicPayments ? installmentsPaidValue : null,
        startDate: startDate.toISOString(),
        nextDueDate: hasPeriodicPayments ? nextDueDate.toISOString() : null,
        expectedEndDate: expectedEndDate ? expectedEndDate.toISOString() : null,
        notes: notes.trim() || null,
      };
      await api.patch(`/debts/${debtId}`, payload);
      markTransactionsDirty();
      navigation.goBack();
    } catch (e: any) {
      console.error("Error actualizando deuda:", e);
      setSubmitError(e?.response?.data?.message || "No se pudo guardar la deuda");
    } finally {
      setSaving(false);
    }
  };

  return (
    <EditingForm
      title="Editar deuda"
      onClose={() => navigation.goBack()}
      onSubmit={handleSubmit}
      submitLabel="Guardar cambios"
      isLoading={loading}
      isSubmitting={saving}
      isValid={isValid}
      submitError={submitError}
    >
      <FormSection>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-end" }}>
          <FormEmojiField value={emoji} onChange={setEmoji} />
          <View style={{ flex: 1 }}>
            <FormTextField label="Nombre de la deuda" value={name} onChangeText={setName} required autoCapitalize="sentences" returnKeyType="done" />
          </View>
        </View>
        <FormMoneyField label="Importe inicial" value={totalAmountText} onChangeText={setTotalAmountText} currency="€" required />
        <FormMoneyField
          label="Importe pendiente actual"
          value={remainingAmountText}
          onChangeText={setRemainingAmountText}
          currency="€"
          required
          error={
            totalAmountValue != null && remainingAmountValue != null && remainingAmountValue > totalAmountValue
              ? "No puede ser mayor que el importe inicial."
              : null
          }
          showError
        />
        <View>
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748B", marginBottom: 5 }}>Tipo</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", margin: -4 }}>
            {DEBT_TYPE_OPTIONS.map((option) => (
              <View key={option.value} style={{ width: "33.333%", padding: 4 }}>
                <FormOptionCard label={option.label} icon={option.icon} selected={type === option.value} onPress={() => setType(option.value)} />
              </View>
            ))}
          </View>
        </View>
        <FormToggle
          label="Tiene pagos periódicos"
          description="Actívalo si pagas una cuota fija (préstamo, hipoteca, tarjeta...)."
          value={hasPeriodicPayments}
          onValueChange={setHasPeriodicPayments}
        />
      </FormSection>

      {hasPeriodicPayments ? (
        <>
          <View style={{ height: 24 }} />
          <FormSection title="Pago">
            <FormMoneyField label="Cuota" value={cuotaText} onChangeText={setCuotaText} currency="€" required />
            <View>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748B", marginBottom: 5 }}>Frecuencia</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", margin: -4 }}>
                {DEBT_FREQUENCY_OPTIONS.map((option) => (
                  <View key={option.value} style={{ width: "50%", padding: 4 }}>
                    <FormOptionCard label={option.label} selected={frequency === option.value} onPress={() => setFrequency(option.value)} />
                  </View>
                ))}
              </View>
            </View>
            <FormDateField label="Próximo pago" value={nextDueDate} onChange={setNextDueDate} required />
            <FormWalletPicker label="Cuenta asociada" wallets={wallets} selectedId={walletId} onChange={setWalletId} required />
            <FormToggle
              label="Crear transacción recurrente automáticamente"
              description="Se generará un gasto recurrente en esa cuenta con la cuota y frecuencia indicadas."
              value={autoRecurring}
              onValueChange={setAutoRecurring}
            />
            <FormNumberField
              label="Cuotas pagadas inicialmente"
              value={installmentsPaidText}
              onChangeText={setInstallmentsPaidText}
              hint="Si ya venías pagando esta deuda antes de añadirla aquí, cuántas cuotas llevas pagadas."
            />
          </FormSection>
        </>
      ) : null}

      <View style={{ height: 24 }} />

      <FormSection title="Detalles opcionales">
        <FormNumberField label="Interés / TAE" value={interestRateText} onChangeText={setInterestRateText} suffix="%" />
        <FormDateField label="Fecha de inicio" value={startDate} onChange={(d) => setStartDate(normalizeStartOfDay(d))} />
        {expectedEndDate ? (
          <FormDateField label="Fecha prevista de fin" value={expectedEndDate} onChange={(d) => setExpectedEndDate(normalizeStartOfDay(d))} />
        ) : (
          <Text onPress={() => setExpectedEndDate(normalizeStartOfDay(new Date()))} style={{ fontSize: 13, fontWeight: "700", color: "#2563EB" }}>
            + Añadir fecha prevista de fin
          </Text>
        )}
        <FormTextField label="Entidad" value={entity} onChangeText={setEntity} hint="Banco, financiera o persona." autoCapitalize="sentences" />
        <FormNotesField label="Notas" value={notes} onChangeText={setNotes} />
      </FormSection>
    </EditingForm>
  );
}
