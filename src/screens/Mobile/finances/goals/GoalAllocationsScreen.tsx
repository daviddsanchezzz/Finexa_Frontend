import React, { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../../../api/api';
import { EditingActionRow, EditingForm } from '../../../../components/creation';
import { invalidateGoals, useGoalQuery, useGoalWalletsQuery } from '../../../../hooks/useGoalsQuery';
import { Goal } from '../../../../types/goal';
import GoalAllocationFields, { allocationDraft } from './GoalAllocationFields';
import { decimalText, errorText, money, percentage } from './goalShared';
import { colors } from '../../../../theme/theme';

export default function GoalAllocationsScreen({ navigation, route }: any) {
  const query = useGoalQuery(route.params.goalId);
  if (!query.data) return <EditingForm title="Gestionar asignaciones" onClose={() => navigation.goBack()} onSubmit={() => {}} isLoading={query.isLoading} isValid={false}><Text>No se pudo cargar el objetivo.</Text><EditingActionRow label="Reintentar" onPress={() => { void query.refetch(); }} /></EditingForm>;
  return <AllocationForm goal={query.data} navigation={navigation} />;
}

function AllocationForm({ goal, navigation }: { goal: Goal; navigation: any }) {
  const query = useGoalWalletsQuery();
  useFocusEffect(useCallback(() => { void query.refetch(); }, [query.refetch]));
  const wallets = query.data ?? [];
  const [amounts, setAmounts] = useState<Record<number, string>>(() => Object.fromEntries(goal.allocations.map((a) => [a.walletId, decimalText(a.amount)])));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const draft = allocationDraft(wallets, goal.currency, amounts, goal.allocations);
  const valid = !query.isLoading && !query.isError && draft.valid && goal.status !== 'ARCHIVED' && goal.trackingMode === 'ALLOCATIONS';
  const progress = goal.targetAmount > 0 ? Math.max(draft.total, 0) / goal.targetAmount * 100 : 0;
  const submit = async () => {
    if (!valid || inFlight.current) return;
    inFlight.current = true; setSaving(true); setError(null);
    try {
      await api.put(`/goals/${goal.id}/allocations`, { allocations: draft.payload });
      await invalidateGoals();
      navigation.goBack();
    } catch (e) { setError(errorText(e)); }
    finally { inFlight.current = false; setSaving(false); }
  };
  return (
    <EditingForm title="Gestionar asignaciones" onClose={() => navigation.goBack()} onSubmit={submit} isLoading={query.isLoading} isSubmitting={saving} isValid={valid} submitError={error} disableInvalidSubmit
      footerContent={!query.isError && (
        <View style={{ paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background, gap: 6 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>Total asignado</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink, fontVariant: ['tabular-nums'] }}>{money(draft.total, goal.currency)} <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>de {money(goal.targetAmount, goal.currency)}</Text></Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1, height: 5, borderRadius: 999, backgroundColor: colors.border, overflow: 'hidden' }}><View style={{ height: '100%', width: `${Math.min(progress, 100)}%`, backgroundColor: progress >= 100 ? colors.success : colors.primary }} /></View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>{percentage(progress)}</Text>
          </View>
        </View>
      )}>
      {query.isError ? <><Text>No se pudieron cargar las carteras.</Text><EditingActionRow label="Reintentar" onPress={() => { void query.refetch(); }} /></> :
        <GoalAllocationFields wallets={wallets} currency={goal.currency} amounts={amounts} existing={goal.allocations} showErrors showTotal={false}
          onChange={(id, amount) => setAmounts((prev) => ({ ...prev, [id]: amount }))} />}
    </EditingForm>
  );
}
