import { queryClient } from '../lib/queryClient';

const MONEY_QUERIES = ['transactions', 'budgets', 'debts', 'debt', 'projects', 'project', 'trips', 'tripsSummary', 'goals', 'investments', 'netWorthWallets', 'netWorthTrendSeries'];

export function financeMutationQueryKeys(method?: string, url?: string): string[] {
  if (!['post', 'put', 'patch', 'delete'].includes((method ?? '').toLowerCase())) return [];
  const path = (url ?? '').replace(/^https?:\/\/[^/]+/, '').split('?')[0];
  const module = path.split('/').filter(Boolean)[0];
  switch (module) {
    case 'transactions': return MONEY_QUERIES;
    case 'wallets': return ['netWorthWallets', 'netWorthTrendSeries', 'goals', 'investments', 'wallets'];
    case 'investments': return ['investments', 'goals', 'transactions', 'budgets', 'netWorthWallets', 'netWorthTrendSeries'];
    case 'debts': return ['debts', 'debt', 'transactions', 'budgets', 'goals', 'netWorthWallets', 'netWorthTrendSeries'];
    case 'projects': return ['projects', 'project', 'transactions', 'budgets', 'goals', 'netWorthWallets', 'netWorthTrendSeries'];
    case 'trips': return ['trips', 'trip', 'tripsSummary', 'tripsContinentsStats', 'transactions', 'budgets', 'goals', 'netWorthWallets', 'netWorthTrendSeries'];
    case 'budgets': return ['budgets'];
    case 'goals': return ['goals'];
    default: return [];
  }
}

// Only successful mutations call this. Cached inactive modules become stale;
// active views refresh in the background without delaying the save response.
export function invalidateFinanceMutation(method?: string, url?: string) {
  for (const key of financeMutationQueryKeys(method, url)) {
    void queryClient.invalidateQueries({ queryKey: [key] });
  }
}
