import React, { useMemo, useState } from "react";
import { View, Text } from "react-native";
import api from "../../../../api/api";
import { markTransactionsDirty } from "../../../../utils/transactionsInvalidation";
import { useDebtFormOptions } from "../../../../hooks/useDebtFormOptions";
import {
  CreationFlow,
  CreationStep,
  FormDateField,
  FormEmojiField,
  FormMoneyField,
  FormNotesField,
  FormNumberField,
  FormOptionCard,
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

export default function DebtFormScreen({ navigation }: any) {
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const options = useDebtFormOptions();
  const wallets = options.data?.wallets ?? [];

  // Paso 1
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("💸");
  const [totalAmountText, setTotalAmountText] = useState("");
  const [remainingAmountText, setRemainingAmountText] = useState("");
  const [type, setType] = useState<DebtType>("loan");
  const [hasPeriodicPayments, setHasPeriodicPayments] = useState(true);

  // Paso 2 (solo si hasPeriodicPayments)
  const [cuotaText, setCuotaText] = useState("");
  const [frequency, setFrequency] = useState<DebtFrequency>("monthly");
  const [nextDueDate, setNextDueDate] = useState<Date>(normalizeStartOfDay(new Date()));
  const [walletId, setWalletId] = useState<number | null>(null);
  const [autoRecurring, setAutoRecurring] = useState(true);
  const [installmentsPaidText, setInstallmentsPaidText] = useState("");

  // Paso 3
  const [interestRateText, setInterestRateText] = useState("");
  const [startDate, setStartDate] = useState<Date>(normalizeStartOfDay(new Date()));
  const [expectedEndDate, setExpectedEndDate] = useState<Date | null>(null);
  const [entity, setEntity] = useState("");
  const [notes, setNotes] = useState("");

  const totalAmountValue = toNumberOrNull(totalAmountText);
  const remainingAmountValue = toNumberOrNull(remainingAmountText);
  const cuotaValue = toNumberOrNull(cuotaText);
  const interestRateValue = toNumberOrNull(interestRateText);
  const installmentsPaidValue = toNumberOrNull(installmentsPaidText);

  const step1Valid =
    name.trim().length > 0 &&
    totalAmountValue != null &&
    totalAmountValue > 0 &&
    remainingAmountValue != null &&
    remainingAmountValue >= 0 &&
    remainingAmountValue <= totalAmountValue;

  const step2Valid = !hasPeriodicPayments || (cuotaValue != null && cuotaValue > 0 && walletId != null);

  const handleSubmit = async () => {
    setSubmitError(null);
    try {
      setSaving(true);
      const payed = Math.max(0, (totalAmountValue ?? 0) - (remainingAmountValue ?? 0));
      const payload = {
        type,
        direction: "i_ow",
        name: name.trim(),
        emoji: emoji.trim() || undefined,
        entity: entity.trim() || undefined,
        totalAmount: totalAmountValue,
        payed,
        interestRate: interestRateValue ?? undefined,
        monthlyPayment: hasPeriodicPayments ? cuotaValue ?? undefined : undefined,
        paymentFrequency: hasPeriodicPayments ? frequency : undefined,
        walletId: hasPeriodicPayments ? walletId ?? undefined : undefined,
        autoRecurringEnabled: hasPeriodicPayments ? autoRecurring : undefined,
        installmentsPaid: hasPeriodicPayments ? installmentsPaidValue ?? undefined : undefined,
        startDate: startDate.toISOString(),
        nextDueDate: hasPeriodicPayments ? nextDueDate.toISOString() : undefined,
        expectedEndDate: expectedEndDate ? expectedEndDate.toISOString() : undefined,
        notes: notes.trim() || undefined,
      };
      await api.post("/debts", payload);
      markTransactionsDirty();
      navigation.goBack();
    } catch (e: any) {
      console.error("Error creando deuda:", e);
      setSubmitError(e?.response?.data?.message || "No se pudo crear la deuda");
    } finally {
      setSaving(false);
    }
  };

  const steps: CreationStep[] = useMemo(() => {
    const list: CreationStep[] = [
      {
        id: "basics",
        title: "Datos básicos",
        isValid: step1Valid,
        content: (
          <View style={{ gap: 18 }}>
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
              hint={
                totalAmountValue != null && remainingAmountValue != null && remainingAmountValue > totalAmountValue
                  ? undefined
                  : "Lo que te queda por pagar hoy."
              }
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
          </View>
        ),
      },
    ];

    if (hasPeriodicPayments) {
      list.push({
        id: "payment",
        title: "Pago",
        isValid: step2Valid,
        content: ({ showErrors }) => (
          <View style={{ gap: 18 }}>
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
            <FormWalletPicker
              label="Cuenta asociada"
              wallets={wallets}
              selectedId={walletId}
              onChange={setWalletId}
              required
            />
            {showErrors && walletId == null ? (
              <Text style={{ fontSize: 11.5, fontWeight: "600", color: "#DC2626", marginTop: -10 }}>Selecciona la cuenta desde la que pagas.</Text>
            ) : null}
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
          </View>
        ),
      });
    }

    list.push({
      id: "details",
      title: "Detalles opcionales",
      isValid: true,
      content: (
        <View style={{ gap: 18 }}>
          <FormNumberField label="Interés / TAE" value={interestRateText} onChangeText={setInterestRateText} suffix="%" />
          <FormDateField label="Fecha de inicio" value={startDate} onChange={(d) => setStartDate(normalizeStartOfDay(d))} />
          {expectedEndDate ? (
            <FormDateField
              label="Fecha prevista de fin"
              value={expectedEndDate}
              onChange={(d) => setExpectedEndDate(normalizeStartOfDay(d))}
            />
          ) : (
            <View>
              <Text
                onPress={() => setExpectedEndDate(normalizeStartOfDay(new Date()))}
                style={{ fontSize: 13, fontWeight: "700", color: "#2563EB" }}
              >
                + Añadir fecha prevista de fin
              </Text>
            </View>
          )}
          <FormTextField label="Entidad" value={entity} onChangeText={setEntity} hint="Banco, financiera o persona." autoCapitalize="sentences" />
          <FormNotesField label="Notas" value={notes} onChangeText={setNotes} />
        </View>
      ),
    });

    return list;
  }, [
    name,
    emoji,
    totalAmountText,
    remainingAmountText,
    totalAmountValue,
    remainingAmountValue,
    type,
    hasPeriodicPayments,
    cuotaText,
    frequency,
    nextDueDate,
    walletId,
    wallets,
    autoRecurring,
    installmentsPaidText,
    interestRateText,
    startDate,
    expectedEndDate,
    entity,
    notes,
    step1Valid,
    step2Valid,
  ]);

  return (
    <CreationFlow
      title="Nueva deuda"
      steps={steps}
      submitLabel="Crear deuda"
      onSubmit={handleSubmit}
      onClose={() => navigation.goBack()}
      isSubmitting={saving}
      submitError={submitError}
    />
  );
}
