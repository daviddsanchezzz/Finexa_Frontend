import { queryClient } from '../lib/queryClient';

const MONEY_QUERIES = ['transactions', 'budgets', 'debts', 'debt', 'projects', 'project', 'trips', 'tripsSummary', 'goals', 'investments', 'netWorthWallets', 'netWorthCurrent', 'netWorthTrendSeries', 'financialHealth'];

export function financeMutationQueryKeys(method?: string, url?: string): string[] {
  if (!['post', 'put', 'patch', 'delete'].includes((method ?? '').toLowerCase())) return [];
  const path = (url ?? '').replace(/^https?:\/\/[^/]+/, '').split('?')[0];
  const module = path.split('/').filter(Boolean)[0];
  switch (module) {
    case 'transactions': return MONEY_QUERIES;
    case 'wallets': return ['netWorthWallets', 'netWorthCurrent', 'netWorthTrendSeries', 'financialHealth', 'goals', 'investments', 'wallets'];
    case 'investments': return ['investments', 'goals', 'transactions', 'budgets', 'netWorthWallets', 'netWorthCurrent', 'netWorthTrendSeries', 'financialHealth'];
    case 'debts': return ['debts', 'debt', 'transactions', 'budgets', 'goals', 'netWorthWallets', 'netWorthCurrent', 'netWorthTrendSeries', 'financialHealth'];
    case 'projects': return ['projects', 'project', 'transactions', 'budgets', 'goals', 'netWorthWallets', 'netWorthCurrent', 'netWorthTrendSeries', 'financialHealth'];
    case 'trips': return ['trips', 'trip', 'tripsSummary', 'tripsContinentsStats', 'transactions', 'budgets', 'goals', 'netWorthWallets', 'netWorthCurrent', 'netWorthTrendSeries', 'financialHealth'];
    case 'budgets': return ['budgets'];
    case 'goals': return ['goals', 'financialHealth'];
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
