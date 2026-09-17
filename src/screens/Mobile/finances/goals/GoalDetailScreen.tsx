import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Modal, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../../../api/api';
import AppHeader from '../../../../components/AppHeader';
import HeroBalanceCard from '../../../../components/HeroBalanceCard';
import StatsRow from '../../../../components/StatsRow';
import SegmentedTabs from '../../../../components/SegmentedTabs';
import OverflowMenuButton, { OverflowMenuAction } from '../../../../components/OverflowMenuButton';
import WalletIcon from '../../../../components/WalletIcon';
import TransactionsList from '../../../../components/TransactionsList';
import { GoalDetailScreenSkeleton } from '../../../../components/skeletons/GoalsScreenSkeleton';
import { EditingActionRow, FormSection } from '../../../../components/creation';
import { invalidateGoals, useGoalQuery } from '../../../../hooks/useGoalsQuery';
import { appAlert } from '../../../../utils/appAlert';
import { colors, radii } from '../../../../theme/theme';
import { dateLabel, errorText, money, percentage } from './goalShared';

type Tab = 'summary' | 'activity';
export default function GoalDetailScreen({ route, navigation }: any) {
  const query = useGoalQuery(route.params.goalId);
  useFocusEffect(useCallback(() => { void query.refetch(); }, [query.refetch]));
  const [tab, setTab] = useState<Tab>('summary');
  const [busy, setBusy] = useState(false);
  const [movementsOpen, setMovementsOpen] = useState(false);
  const inFlight = useRef(false);
  const goal = query.data;
  const movements = useQuery({
    queryKey: ['transactions', 'goal-wallet', goal?.linkedWalletId],
    enabled: movementsOpen && !!goal?.linkedWalletId,
    queryFn: async () => {
      const { data } = await api.get('/transactions', { params: { walletId: goal?.linkedWalletId } });
      return (data as any[]).filter((tx) => tx.isRecurring === false).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
  });
  const mutate = async (action: 'delete' | 'archive' | 'complete' | 'activate') => {
    if (!goal || inFlight.current) return;
    inFlight.current = true; setBusy(true);
    try {
      if (action === 'delete') {
        await api.delete(`/goals/${goal.id}`);
        navigation.goBack();
        await invalidateGoals();
      } else {
        await api.patch(`/goals/${goal.id}/status`, { status: action === 'archive' ? 'ARCHIVED' : action === 'complete' ? 'COMPLETED' : 'ACTIVE' });
        await invalidateGoals();
      }
    } catch (e) { appAlert('Error', errorText(e)); }
    finally { inFlight.current = false; setBusy(false); }
  };
  const confirmArchive = () => {
    if (!goal) return;
    const message = goal.trackingMode === 'ALLOCATIONS'
      ? `Se liberarán ${money(goal.currentAmount, goal.currency)} actualmente asignados. Las asignaciones se conservarán para consulta.`
      : goal.trackingMode === 'WALLET_BALANCE'
      ? 'La cartera dejará de estar vinculada y su dinero quedará disponible para otros objetivos. Se conservará el progreso al archivar.'
      : 'Se conservará el historial de aportaciones para consulta.';
    appAlert('Archivar objetivo', `${message} El objetivo archivado solo se podrá consultar o eliminar.`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Archivar', onPress: () => { void mutate('archive'); } }]);
  };
  const actions: OverflowMenuAction[] = goal ? [
    ...(goal.status !== 'ARCHIVED' ? [
      { label: 'Editar', disabled: busy, onPress: () => navigation.navigate('GoalForm', { goalId: goal.id }) },
      ...(goal.reached && goal.status === 'ACTIVE' ? [{ label: 'Marcar como completado', disabled: busy, onPress: () => appAlert('Completar objetivo', 'Las reservas se mantienen. Puedes liberarlas gestionando las asignaciones o archivando el objetivo.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Completar', onPress: () => { void mutate('complete'); } }]) }] : []),
      ...(goal.status === 'COMPLETED' ? [{ label: 'Volver a activos', disabled: busy, onPress: () => { void mutate('activate'); } }] : []),
      { label: 'Archivar', disabled: busy, onPress: confirmArchive },
    ] : []),
    { label: 'Eliminar', style: 'destructive', disabled: busy, onPress: () => appAlert('Eliminar objetivo', 'Se eliminarán el objetivo y su historial, y se liberarán sus reservas. No cambia el saldo de tus carteras.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: () => { void mutate('delete'); } }]) },
  ] : [];
  const cardStyle = { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radii.card, padding: 16 };
  const canEdit = goal?.status !== 'ARCHIVED';
  const allocations = goal?.allocations.filter((a) => a.amount > 0) ?? [];
  const assignedTotal = allocations.reduce((total, a) => total + a.amount, 0);
  const allocationContent = goal && <FormSection title={canEdit ? 'DISTRIBUCIÓN DEL AHORRO' : 'DISTRIBUCIÓN AL ARCHIVAR'}>
    {!allocations.length && <Text style={{ fontSize: 13, color: colors.textSecondary }}>Todavía no hay dinero asignado.</Text>}
    {allocations.map((a) => <View key={a.id} style={{ ...cardStyle, padding: 14, gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 9, alignItems: 'center' }}><WalletIcon emoji={a.wallet.emoji} size={20} /><Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink }}>{a.wallet.name}</Text></View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{money(a.amount, goal.currency)}</Text><Text style={{ fontSize: 13, color: colors.textSecondary }}>{percentage(assignedTotal > 0 ? a.amount / assignedTotal * 100 : 0)}</Text></View>
      {a.overAllocated > 0 && <Text style={{ fontSize: 12, lineHeight: 17, color: colors.error }}>Las reservas de esta cartera superan su saldo en {money(a.overAllocated, goal.currency)}. Reajusta las asignaciones.</Text>}
    </View>)}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8 }}><Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>Total asignado</Text><Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>{money(assignedTotal, goal.currency)}</Text></View>
    {canEdit && <EditingActionRow label="Gestionar asignaciones" onPress={() => navigation.navigate('GoalAllocations', { goalId: goal.id })} />}
  </FormSection>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}><AppHeader title={goal?.name ?? 'Objetivo'} showBack showProfile={false} showDatePicker={false} rightElement={goal ? <OverflowMenuButton title={goal.name} actions={actions} /> : undefined} /></View>
    {!goal ? query.isLoading ? <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}><GoalDetailScreenSkeleton /></ScrollView> : <View style={{ padding: 20 }}><Text>No se pudo cargar el objetivo.</Text><EditingActionRow label="Reintentar" onPress={() => { void query.refetch(); }} /></View> : <>
      <View style={{ paddingHorizontal: 20 }}>
        <HeroBalanceCard label={goal.status === 'ARCHIVED' ? 'Ahorrado al archivar' : 'Ahorrado'} value={money(goal.currentAmount, goal.currency)} footer={
          <View style={{ width: '100%', marginTop: 10 }}><View style={{ height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}><View style={{ height: '100%', width: `${goal.displayProgress}%`, backgroundColor: 'white' }} /></View><Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 6 }}>{percentage(goal.progressPercentage)} completado</Text></View>
        } />
        <StatsRow items={[{ key: 'target', label: 'OBJETIVO', value: money(goal.targetAmount, goal.currency) }, { key: 'remaining', label: 'FALTA', value: money(goal.remainingAmount, goal.currency) }]} />
      </View>
      <SegmentedTabs<Tab> variant="underline" options={[{ key: 'summary', label: 'Resumen' }, { key: 'activity', label: goal.trackingMode === 'MANUAL' ? 'Aportaciones' : goal.trackingMode === 'WALLET_BALANCE' ? 'Cartera' : 'Asignaciones' }]} value={tab} onChange={setTab} />
      <ScrollView key={tab} style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingTop: 14, paddingBottom: 40 }}>
        {tab === 'summary' ? <View style={{ gap: 16 }}>
          <View style={cardStyle}><FormSection title="DETALLES">
            {goal.status === 'ARCHIVED' ? <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Archivado · Reservas liberadas</Text> : goal.reached ? <Text style={{ color: colors.success, fontWeight: '700' }}>Objetivo alcanzado</Text> : goal.overdue ? <Text style={{ color: colors.textSecondary }}>La fecha objetivo ha pasado. Puedes ajustar tu meta.</Text> : null}
            {!!goal.description && <Text style={{ fontSize: 13, lineHeight: 19, color: colors.textSecondary }}>{goal.description}</Text>}
            {[
              { label: 'Método', value: goal.trackingMode === 'ALLOCATIONS' ? 'Dinero de mis carteras' : goal.trackingMode === 'MANUAL' ? 'Aportaciones manuales' : 'Saldo de una cartera' },
              { label: 'Inicio', value: dateLabel(goal.startDate) },
              { label: 'Fecha objetivo', value: goal.targetDate ? dateLabel(goal.targetDate) : 'Sin fecha' },
              ...(goal.excessAmount > 0 ? [{ label: 'Por encima del objetivo', value: money(goal.excessAmount, goal.currency) }] : []),
            ].map((row) => <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}><Text style={{ fontSize: 12, color: colors.textSecondary }}>{row.label}</Text><Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink, flex: 1, textAlign: 'right' }}>{row.value}</Text></View>)}
          </FormSection></View>
          {canEdit && <View style={cardStyle}><FormSection title={goal.reached ? 'OBJETIVO ALCANZADO' : 'PARA COMPLETARLO'}>
            {goal.reached ? <Text style={{ fontSize: 13, lineHeight: 19, color: colors.success }}>Ya has alcanzado tu objetivo de ahorro.</Text> : <>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>Te faltan</Text>
              <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>{money(goal.remainingAmount, goal.currency)}</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>para alcanzar tu objetivo</Text>
              {goal.requiredMonthlyContribution != null && <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ fontSize: 13, color: colors.textSecondary }}>Ahorro necesario aprox.</Text><Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{money(goal.requiredMonthlyContribution, goal.currency)}/mes</Text></View>}
            </>}
          </FormSection></View>}
        </View> : goal.trackingMode === 'ALLOCATIONS' ? allocationContent : goal.trackingMode === 'WALLET_BALANCE' ? <View style={cardStyle}><FormSection title="CARTERA VINCULADA">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>{goal.linkedWallet && <WalletIcon emoji={goal.linkedWallet.emoji} size={22} />}<Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink }}>{goal.linkedWallet?.name ?? 'Desvinculada al archivar'}</Text></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ fontSize: 13, color: colors.textSecondary }}>{canEdit ? 'Saldo actual' : 'Ahorrado al archivar'}</Text><Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>{money(goal.linkedWallet?.balance ?? goal.currentAmount, goal.currency)}</Text></View>
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>{canEdit ? 'El progreso de este objetivo se actualiza automáticamente con el saldo de esta cartera.' : 'Se conserva el progreso registrado al archivar.'}</Text>
          {canEdit && goal.linkedWallet && <EditingActionRow label="Ver movimientos" onPress={() => setMovementsOpen(true)} />}
        </FormSection></View> : <View>
          {canEdit && <EditingActionRow label="Añadir aportación" onPress={() => navigation.navigate('GoalManualEntryForm', { goalId: goal.id })} />}
          {!goal.manualEntries.length && <Text style={{ textAlign: 'center', marginTop: 32, fontSize: 13, color: colors.textSecondary }}>Todavía no hay aportaciones.</Text>}
          {goal.manualEntries.map((entry) => <TouchableOpacity key={entry.id} disabled={!canEdit} onPress={() => navigation.navigate('GoalManualEntryForm', { goalId: goal.id, entryId: entry.id })} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 64, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 }}>
            <View style={{ flex: 1 }}><Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>{entry.note || (entry.amount < 0 ? 'Retirada' : 'Aportación')}</Text><Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 3 }}>{dateLabel(entry.date)}</Text></View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: entry.amount < 0 ? colors.ink : colors.success }}>{entry.amount > 0 ? '+' : ''}{money(entry.amount, goal.currency)}</Text>
          </TouchableOpacity>)}
        </View>}
      </ScrollView>
    </>}
    <Modal visible={movementsOpen} transparent animationType="slide" onRequestClose={() => setMovementsOpen(false)}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }}>
        <TouchableOpacity style={{ flex: 1 }} accessibilityLabel="Cerrar movimientos" onPress={() => setMovementsOpen(false)} />
        <SafeAreaView style={{ maxHeight: '85%', backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
          <View style={{ padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}><Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: colors.ink }}>Movimientos · {goal?.linkedWallet?.name}</Text><TouchableOpacity accessibilityRole="button" onPress={() => setMovementsOpen(false)}><Text style={{ color: colors.primary, fontWeight: '700' }}>Cerrar</Text></TouchableOpacity></View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
            {movements.isLoading ? <ActivityIndicator color={colors.primary} /> : movements.isError ? <EditingActionRow label="No se pudieron cargar. Reintentar" onPress={() => { void movements.refetch(); }} /> : !movements.data?.length ? <Text style={{ color: colors.textSecondary, paddingVertical: 20 }}>Esta cartera todavía no tiene movimientos.</Text> : <TransactionsList transactions={movements.data} navigation={navigation} swipeActionsEnabled={false} />}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  </SafeAreaView>;
}
