import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import api from '../../../../api/api';
import { appAlert } from '../../../../utils/appAlert';
import { CreationFlow, EditingActionRow, EditingForm, FormDateField, FormMoneyField, FormNotesField, FormSection, FormSegmentedControl } from '../../../../components/creation';
import { invalidateGoals, useGoalQuery } from '../../../../hooks/useGoalsQuery';
import { Goal, GoalManualEntry } from '../../../../types/goal';
import { colors } from '../../../../theme/theme';
import { decimalText, errorText, numeric } from './goalShared';

export default function GoalManualEntryFormScreen({ route, navigation }: any) {
  const query = useGoalQuery(route.params.goalId);
  if (!query.data) return <EditingForm title="Aportación" onClose={() => navigation.goBack()} onSubmit={() => {}} isLoading={query.isLoading} isValid={false}><Text>No se pudo cargar el objetivo.</Text><EditingActionRow label="Reintentar" onPress={() => { void query.refetch(); }} /></EditingForm>;
  const entry = query.data.manualEntries.find((e) => e.id === route.params.entryId);
  if (route.params.entryId && !entry) return <EditingForm title="Aportación" onClose={() => navigation.goBack()} onSubmit={() => {}} isValid={false}><Text>Esta aportación ya no existe.</Text></EditingForm>;
  return <ManualForm key={entry?.id ?? 'new'} goal={query.data} entry={entry} navigation={navigation} />;
}

function ManualForm({ goal, entry, navigation }: { goal: Goal; entry?: GoalManualEntry; navigation: any }) {
  const [kind, setKind] = useState<'add' | 'withdraw'>(entry && entry.amount < 0 ? 'withdraw' : 'add');
  const [amount, setAmount] = useState(entry ? decimalText(Math.abs(entry.amount)) : '');
  const [date, setDate] = useState(entry ? new Date(entry.date) : new Date());
  const [note, setNote] = useState(entry?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const amountError = !Number.isFinite(numeric(amount)) || numeric(amount) <= 0 ? 'Introduce un importe mayor que cero.' : !/^\d+(?:,\d{0,2})?$/.test(amount) ? 'Usa como máximo dos decimales.' : null;
  const valid = !amountError && goal.status !== 'ARCHIVED' && goal.trackingMode === 'MANUAL';
  const submit = async () => {
    if (!valid || inFlight.current) return;
    inFlight.current = true; setSaving(true); setError(null);
    try {
      const payload = { amount: numeric(amount) * (kind === 'withdraw' ? -1 : 1), date: date.toISOString(), note: note.trim() || null };
      if (entry) await api.patch(`/goals/${goal.id}/manual-entries/${entry.id}`, payload);
      else await api.post(`/goals/${goal.id}/manual-entries`, payload);
      await invalidateGoals(); navigation.goBack();
    } catch (e) { setError(errorText(e)); }
    finally { inFlight.current = false; setSaving(false); }
  };
  const remove = () => appAlert('Eliminar aportación', 'Se eliminará del historial y se recalculará el progreso. Tus carteras no cambian.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: async () => {
      if (!entry || inFlight.current) return;
      inFlight.current = true; setSaving(true); setError(null);
      try { await api.delete(`/goals/${goal.id}/manual-entries/${entry.id}`); await invalidateGoals(); navigation.goBack(); }
      catch (e) { setError(errorText(e)); }
      finally { inFlight.current = false; setSaving(false); }
    } },
  ]);
  const fields = (showErrors = false) => <FormSection>
    <FormSegmentedControl<'add' | 'withdraw'> label="Tipo" value={kind} onChange={setKind} options={[{ value: 'add', label: 'Aportación' }, { value: 'withdraw', label: 'Retirada' }]} />
    <FormMoneyField label="Importe" required value={amount} onChangeText={(v) => setAmount(v.replace('.', ','))} currency={goal.currency === 'EUR' ? '€' : goal.currency} error={amountError} showError={showErrors} />
    <FormDateField label="Fecha" required value={date} onChange={setDate} />
    <FormNotesField label="Nota" value={note} onChangeText={setNote} />
    <Text style={{ fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>Este registro solo actualiza tu progreso. No crea transacciones ni mueve dinero entre carteras.</Text>
  </FormSection>;
  if (entry) return <EditingForm title="Editar aportación" onClose={() => navigation.goBack()} onSubmit={submit} isSubmitting={saving} isValid={valid} submitError={error}>
    {fields()}<View style={{ marginTop: 24 }}><EditingActionRow label="Eliminar aportación" destructive disabled={saving} onPress={remove} /></View>
  </EditingForm>;
  return <CreationFlow title="Nueva aportación" steps={[{ id: 'entry', title: 'Registrar progreso', isValid: valid, content: ({ showErrors }) => fields(showErrors) }]} submitLabel="Guardar aportación" onSubmit={submit} onClose={() => navigation.goBack()} isSubmitting={saving} submitError={error} />;
}
