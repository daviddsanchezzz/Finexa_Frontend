import { useQuery } from '@tanstack/react-query';
import api from '../api/api';
import { queryClient } from '../lib/queryClient';
import { subscribeTransactionsInvalidation } from '../utils/transactionsInvalidation';
import { subscribeInvestmentsInvalidation } from '../utils/investmentsInvalidation';
import { Goal, GoalsOverview, GoalWalletAvailability } from '../types/goal';

export const invalidateGoals = () => queryClient.invalidateQueries({ queryKey: ['goals'] });
// Observed wallet balances can change from normal transactions or valuations.
subscribeTransactionsInvalidation(() => { void invalidateGoals(); });
subscribeInvestmentsInvalidation(() => { void invalidateGoals(); });

export function useGoalsQuery(options: { staleTime?: number; gcTime?: number } = {}) {
  return useQuery({ queryKey: ['goals', 'overview'], queryFn: async () => (await api.get('/goals')).data as GoalsOverview, ...options });
}
export function useGoalQuery(id: number | undefined) {
  return useQuery({ queryKey: ['goals', 'detail', id], queryFn: async () => (await api.get(`/goals/${id}`)).data as Goal, enabled: !!id });
}
export function useGoalWalletsQuery() {
  return useQuery({ queryKey: ['goals', 'wallets'], queryFn: async () => (await api.get('/goals/wallets')).data as GoalWalletAvailability[] });
}
