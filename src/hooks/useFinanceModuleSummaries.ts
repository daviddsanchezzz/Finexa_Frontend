import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/api';
import { useBudgetData } from './useBudgetData';
import { useGoalsQuery } from './useGoalsQuery';
import { useDebtsQuery } from './useDebtsQuery';
import { useProjectsQuery } from './useProjectsQuery';
import { useInvestmentsSummaryQuery } from './useInvestmentsQuery';
import { queryClient } from '../lib/queryClient';
import {
  BudgetHubOverview, DebtHubItem, TripHubItem, RecurringHubItem, FinanceHubKey, FinanceModuleSummary,
  budgetHubSummary, goalsHubSummary, debtsHubSummary, tripsHubSummary, projectsHubSummary, recurringHubSummary, investmentsHubSummary,
} from '../utils/financeModuleSummaries';

const CACHE_OPTIONS = { staleTime: 5 * 60_000, gcTime: 30 * 60_000 };

function querySummary<T>(query: { data: T | undefined; isError: boolean }, summarize: (data: T) => FinanceModuleSummary): FinanceModuleSummary {
  if (query.data !== undefined) return summarize(query.data);
  return { text: query.isError ? 'No se pudo cargar' : 'Cargando…' };
}

export function useFinanceModuleSummaries(): Record<FinanceHubKey, FinanceModuleSummary> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const budgets = useBudgetData<BudgetHubOverview>(['overview', 'monthly', periodStart], async (signal) =>
    (await api.get('/budgets/overview', { params: { period: 'monthly', date: new Date().toISOString() }, signal })).data, true, { ...CACHE_OPTIONS, refetchOnFocus: false });
  const goals = useGoalsQuery(CACHE_OPTIONS);
  const debts = useDebtsQuery(CACHE_OPTIONS);
  const projects = useProjectsQuery(CACHE_OPTIONS);
  const investments = useInvestmentsSummaryQuery(CACHE_OPTIONS);
  const trips = useQuery({ queryKey: ['trips'], queryFn: async () => (await api.get('/trips')).data as TripHubItem[], ...CACHE_OPTIONS });
  const recurring = useQuery({ queryKey: ['transactions', 'recurring'], queryFn: async () =>
    (await api.get('/transactions', { params: { isRecurring: true } })).data as RecurringHubItem[], ...CACHE_OPTIONS });

  useFocusEffect(useCallback(() => {
    for (const key of ['budgets', 'goals', 'debts', 'projects', 'trips', 'transactions', 'investments']) {
      void queryClient.refetchQueries({ queryKey: [key], stale: true, type: 'active' }, { cancelRefetch: false });
    }
  }, []));

  return {
    budgets: querySummary(budgets, budgetHubSummary),
    goals: querySummary(goals, goalsHubSummary),
    debts: querySummary<DebtHubItem[]>(debts, debtsHubSummary),
    trips: querySummary(trips, tripsHubSummary),
    projects: querySummary(projects, projectsHubSummary),
    recurring: querySummary(recurring, recurringHubSummary),
    investments: querySummary(investments, investmentsHubSummary),
  };
}
