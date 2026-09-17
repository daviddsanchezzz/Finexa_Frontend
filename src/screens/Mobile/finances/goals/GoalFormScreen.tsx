import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../../../api/api';
import { CreationFlow, CreationStep, EditingForm, EditingActionRow, FormCurrencyPicker, FormDateField, FormEmojiField, FormMoneyField, FormOptionCard, FormSection, FormTextField, FormToggle, FormWalletPicker } from '../../../../components/creation';
import { invalidateGoals, useGoalQuery, useGoalWalletsQuery } from '../../../../hooks/useGoalsQuery';
import { Goal, GoalTrackingMode } from '../../../../types/goal';
import { colors } from '../../../../theme/theme';
import GoalAllocationFields, { allocationDraft } from './GoalAllocationFields';
import { decimalText, errorText, money, numeric, TRACKING_DESCRIPTIONS, TRACKING_LABELS } from './goalShared';

export default function GoalFormScreen({ route, navigation }: any) {
  const goalId = route?.params?.goalId;
  const query = useGoalQuery(goalId);
  if (goalId && !query.data) return (
    <EditingForm title="Editar objetivo" onClose={() => navigation.goBack()} onSubmit={() => {}} isLoading={query.isLoading} isValid={false}>
      <Text>No se pudo cargar el objetivo.</Text>
      <EditingActionRow label="Reintentar" onPress={() => { void query.refetch(); }} />
    </EditingForm>
  );
  return <GoalForm key={goalId ?? 'new'} goal={query.data} navigation={navigation} />;
}

function GoalForm({ goal, navigation }: { goal?: Goal; navigation: any }) {
  const walletsQuery = useGoalWalletsQuery();
  useFocusEffect(useCallback(() => { void walletsQuery.refetch(); }, [walletsQuery.refetch]));
  const wallets = walletsQuery.data ?? [];
  const [name, setName] = useState(goal?.name ?? '');
  const [icon, setIcon] = useState(goal?.icon ?? '🎯');
  const [description, setDescription] = useState(goal?.description ?? '');
  const [target, setTarget] = useState(goal ? decimalText(goal.targetAmount) : '');
  const [currency, setCurrency] = useState(goal?.currency ?? 'EUR');
  const [startDate, setStartDate] = useState(goal ? new Date(goal.startDate) : new Date());
  const [hasDate, setHasDate] = useState(!!goal?.targetDate);
  const [targetDate, setTargetDate] = useState(goal?.targetDate ? new Date(goal.targetDate) : new Date());
  const [mode, setMode] = useState<GoalTrackingMode>(goal?.trackingMode ?? 'ALLOCATIONS');
  const [linkedWalletId, setLinkedWalletId] = useState<number | null>(goal?.linkedWalletId ?? null);
  const [initial, setInitial] = useState('');
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const targetError = !Number.isFinite(numeric(target)) || numeric(target) <= 0 ? 'El objetivo debe ser mayor que cero.' : !/^\d+(?:,\d{0,2})?$/.test(target) ? 'Usa como máximo dos decimales.' : null;
  const basicValid = !!name.trim() && !targetError;
  const draft = allocationDraft(wallets, currency, amounts);
  const eligibleLinked = wallets.filter((w) => w.currency === currency && !w.fullyLinked && w.allocatedAmount === 0);
  const linked = eligibleLinked.find((w) => w.id === linkedWalletId);
  const initialValid = Number.isFinite(numeric(initial)) && numeric(initial) >= 0 && /^\d*(?:,\d{0,2})?$/.test(initial);
  const sourceValid = mode === 'MANUAL' ? initialValid : !walletsQuery.isError && !walletsQuery.isLoading && (mode === 'ALLOCATIONS' ? draft.valid : !!linked);

  const handleSubmit = async () => {
    if (inFlight.current || !basicValid || (!goal && !sourceValid)) return;
    inFlight.current = true;
    setSaving(true);
    setSubmitError(null);
    try {
      const fields = { name: name.trim(), icon: icon.trim() || null, description: description.trim() || null, targetAmount: numeric(target), startDate: startDate.toISOString(), targetDate: hasDate ? targetDate.toISOString() : null };
      if (goal) await api.patch(`/goals/${goal.id}`, fields);
      else await api.post('/goals', {
        ...fields, currency, trackingMode: mode,
        ...(mode === 'ALLOCATIONS' ? { allocations: draft.payload } : {}),
        ...(mode === 'WALLET_BALANCE' ? { linkedWalletId } : {}),
        ...(mode === 'MANUAL' ? { initialAmount: numeric(initial) } : {}),
      });
      await invalidateGoals();
      navigation.goBack();
    } catch (error) { setSubmitError(errorText(error)); }
    finally { inFlight.current = false; setSaving(false); }
  };

  const basicFields = (showErrors = false) => (
    <FormSection>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
        <FormEmojiField value={icon} onChange={setIcon} />
        <View style={{ flex: 1 }}><FormTextField label="Nombre" required value={name} onChangeText={setName} error={!name.trim() ? 'Introduce un nombre.' : null} showError={showErrors} /></View>
      </View>
      <FormMoneyField label="Objetivo" required value={target} onChangeText={(v) => setTarget(v.replace('.', ','))} currency={currency === 'EUR' ? '€' : currency} error={targetError} showError={showErrors} />
      {!goal && <FormCurrencyPicker value={currency} onChange={(v) => { setCurrency(v); setAmounts({}); setLinkedWalletId(null); }} />}
      <FormDateField label="Fecha de inicio" value={startDate} onChange={setStartDate} />
      <FormToggle label="Fecha objetivo" description="Añade una fecha para conocer el ritmo de ahorro necesario." value={hasDate} onValueChange={setHasDate} />
      {hasDate && <FormDateField label="Fecha objetivo" value={targetDate} onChange={setTargetDate} />}
      <FormTextField label="Descripción" value={description} onChangeText={setDescription} multiline />
    </FormSection>
  );

  if (goal) return (
    <EditingForm title="Editar objetivo" onClose={() => navigation.goBack()} onSubmit={handleSubmit} isSubmitting={saving} isValid={basicValid && goal.status !== 'ARCHIVED'} submitError={submitError}>
      {basicFields()}
      <View style={{ marginTop: 24 }}><FormSection title="SEGUIMIENTO" description="El método se conserva para mantener la fuente del progreso y su historial."><Text style={{ color: colors.ink }}>{TRACKING_LABELS[goal.trackingMode]}</Text></FormSection></View>
    </EditingForm>
  );

  const steps: CreationStep[] = [
    { id: 'basics', title: 'Tu próxima meta', isValid: basicValid, content: ({ showErrors }) => basicFields(showErrors) },
    { id: 'tracking', title: '¿Cómo quieres llevar el progreso?', content: (
      <View style={{ gap: 18 }}>
        {(['ALLOCATIONS', 'WALLET_BALANCE', 'MANUAL'] as GoalTrackingMode[]).map((value) => (
          <View key={value} style={{ gap: 6 }}><FormOptionCard label={TRACKING_LABELS[value]} selected={mode === value} onPress={() => { setMode(value); setSubmitError(null); }} /><Text style={{ fontSize: 12, lineHeight: 17, color: colors.textSecondary }}>{TRACKING_DESCRIPTIONS[value]}</Text></View>
        ))}
      </View>
    ) },
    { id: 'source', title: mode === 'ALLOCATIONS' ? 'Dinero de tus carteras' : mode === 'MANUAL' ? 'Tu punto de partida' : 'Vincular cartera', isValid: sourceValid, content: ({ showErrors }) => (
      <View style={{ gap: 18 }}>
        {mode !== 'MANUAL' && walletsQuery.isLoading && <ActivityIndicator color={colors.primary} />}
        {mode !== 'MANUAL' && walletsQuery.isError && <><Text>No se pudieron cargar las carteras.</Text><EditingActionRow label="Reintentar" onPress={() => { void walletsQuery.refetch(); }} /></>}
        {mode === 'ALLOCATIONS' && <GoalAllocationFields wallets={wallets} currency={currency} amounts={amounts} onChange={(id, value) => setAmounts((prev) => ({ ...prev, [id]: value }))} showErrors={showErrors} />}
        {mode === 'MANUAL' && <><FormMoneyField label="Cantidad inicial" value={initial} onChangeText={(v) => setInitial(v.replace('.', ','))} currency={currency === 'EUR' ? '€' : currency} error={!initialValid ? 'Introduce una cantidad válida, con un máximo de dos decimales.' : null} showError={showErrors} /><Text style={{ fontSize: 13, lineHeight: 18, color: colors.textSecondary }}>Se registrará una aportación inicial. No crea transacciones ni modifica tus carteras.</Text></>}
        {mode === 'WALLET_BALANCE' && <>
          <FormWalletPicker label="Cartera vinculada" required wallets={eligibleLinked} selectedId={linkedWalletId} onChange={setLinkedWalletId} />
          {!eligibleLinked.length && !walletsQuery.isLoading && <Text style={{ color: colors.textSecondary }}>No hay carteras compatibles. Deben tener la misma moneda y no tener reservas en otros objetivos.</Text>}
          {linked && <Text style={{ fontSize: 13, lineHeight: 19, color: colors.textSecondary }}>Los {money(linked.eligibleBalance, currency)} actuales contarán como progreso. Se actualizará automáticamente cuando cambie el saldo de {linked.name}.</Text>}
        </>}
      </View>
    ) },
  ];
  return <CreationFlow title="Nuevo objetivo" steps={steps} submitLabel="Crear objetivo" onClose={() => navigation.goBack()} onSubmit={handleSubmit} isSubmitting={saving} submitError={submitError} />;
}
