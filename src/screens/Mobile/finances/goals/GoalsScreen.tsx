import React, { useCallback, useState } from 'react';
import { RefreshControl, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AppHeader from '../../../../components/AppHeader';
import AddButton from '../../../../components/AddButton';
import HeroBalanceCard from '../../../../components/HeroBalanceCard';
import StatsRow from '../../../../components/StatsRow';
import SegmentedTabs from '../../../../components/SegmentedTabs';
import BudgetGoalCard from '../../../../components/BudgetGoalCard';
import { GoalsScreenSkeleton } from '../../../../components/skeletons/GoalsScreenSkeleton';
import { EditingActionRow } from '../../../../components/creation';
import { useGoalsQuery } from '../../../../hooks/useGoalsQuery';
import { colors } from '../../../../theme/theme';
import { dateLabel, money, percentage } from './goalShared';

type Filter = 'active' | 'completed' | 'all';
export default function GoalsScreen({ navigation, isPinnedModuleTab = false, isDesktop = false }: any) {
  const query = useGoalsQuery();
  const [filter, setFilter] = useState<Filter>('active');
  const [currency, setCurrency] = useState('EUR');
  useFocusEffect(useCallback(() => { setFilter('active'); void query.refetch(); }, [query.refetch]));
  const goals = query.data?.goals ?? [];
  const summaries = query.data?.summaries ?? [];
  const summaryCurrency = summaries.find((s) => s.currency === currency)?.currency ?? summaries[0]?.currency ?? currency;
  const summary = summaries.find((s) => s.currency === summaryCurrency);
  const visible = goals.filter((g) => filter === 'all' || (filter === 'active' ? g.status === 'ACTIVE' : g.status === 'COMPLETED'));
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <AppHeader title="Objetivos" showProfile={false} showDatePicker={false} showBack={!isPinnedModuleTab && !isDesktop}
          rightElement={<AddButton label="Añadir" onPress={() => navigation.navigate('GoalForm')} />} />
      </View>
      {query.isLoading ? <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}><GoalsScreenSkeleton /></ScrollView> : query.isError ? (
        <View style={{ padding: 20 }}>
          <Text style={{ color: colors.textSecondary }}>No se pudieron cargar los objetivos.</Text>
          <EditingActionRow label="Reintentar" onPress={() => { void query.refetch(); }} />
        </View>
      ) : (
        <>
          <View style={{ paddingHorizontal: 20, gap: 8 }}>
            {summaries.length > 1 && <SegmentedTabs<string> options={summaries.map((s) => ({ key: s.currency, label: s.currency }))} value={summaryCurrency} onChange={setCurrency} />}
            <HeroBalanceCard label="Ahorrado para objetivos" value={money(summary?.totalSaved ?? 0, summaryCurrency)} footer={
              <View style={{ width: '100%', marginTop: 10 }}>
                <View style={{ height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${summary?.displayProgress ?? 0}%`, backgroundColor: 'white' }} />
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 6, textAlign: 'center' }}>{percentage(summary?.globalProgress ?? 0)} del total objetivo</Text>
              </View>
            } />
            <StatsRow items={[
              { key: 'target', label: 'OBJETIVO TOTAL', value: money(summary?.totalTarget ?? 0, summaryCurrency) },
              { key: 'remaining', label: 'FALTA', value: money(summary?.totalRemaining ?? 0, summaryCurrency) },
              { key: 'count', label: 'ACTIVOS', value: String(summary?.activeCount ?? 0) },
            ]} />
          </View>
          <View style={{ marginTop: 12 }}>
            <SegmentedTabs<Filter> variant="underline" options={[{ key: 'active', label: 'Activos' }, { key: 'completed', label: 'Completados' }, { key: 'all', label: 'Todos' }]} value={filter} onChange={setFilter} />
          </View>
          <ScrollView style={{ flex: 1, paddingHorizontal: 14 }} contentContainerStyle={{ paddingTop: 14, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => { void query.refetch(); }} />}>
            {!visible.length && (
              <Text style={{ marginTop: 8, fontSize: 13, color: '#94A3B8', textAlign: 'center' }}>
                No hay objetivos en este estado.
              </Text>
            )}
            {visible.map((goal) => (
              <View key={goal.id} style={{ marginBottom: 12 }}>
                <BudgetGoalCard title={goal.name} icon={goal.icon || 'flag-outline'} total={goal.targetAmount} current={goal.currentAmount}
                  color={goal.reached ? colors.success : goal.color || colors.primary} goalMode showOverflow currency={goal.currency}
                  onPress={() => navigation.navigate('GoalDetail', { goalId: goal.id })} />
                {(goal.targetDate || goal.status !== 'ACTIVE' || goal.allocations.some((a) => a.overAllocated > 0)) && (
                  <Text style={{ marginHorizontal: 4, fontSize: 12, color: goal.allocations.some((a) => a.overAllocated > 0) ? colors.error : colors.textSecondary }}>
                    {goal.status === 'ARCHIVED' ? 'Archivado · Reservas liberadas' : goal.status === 'COMPLETED' ? 'Completado' : goal.overdue ? 'Fecha objetivo vencida' : goal.targetDate ? dateLabel(goal.targetDate) : ''}
                    {goal.allocations.some((a) => a.overAllocated > 0) ? ' · Revisa las asignaciones: el saldo de una cartera ha bajado' : ''}
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}
