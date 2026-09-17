import { GoalsOverview } from '../types/goal';
import { ProjectListItem } from '../types/project';
import { formatEuro } from './currency';

export const FINANCE_HUB_KEYS = ['budgets', 'goals', 'debts', 'trips', 'projects', 'recurring', 'investments'] as const;
export type FinanceHubKey = typeof FINANCE_HUB_KEYS[number];
export interface FinanceModuleSummary { text: string; tone?: 'positive' | 'negative' }
export interface BudgetHubOverview { summary: { count: number; remaining: number } }
export interface DebtHubItem { status: string; direction: string; remainingAmount: number }
export interface TripHubItem { status: string; name?: string; cost?: number }
export interface InvestmentHubOverview { totalCurrentValue: number; assets: unknown[] }
export interface RecurringHubItem {
  id: number;
  active: boolean;
  type: string;
  date: string;
  amount: number;
  wallet?: { currency?: string } | null;
}

const amount = (value: number, currency = 'EUR') => `${formatEuro(value).replace(/,00$/, '')} ${currency === 'EUR' ? '€' : currency}`;
const count = (value: number, singular: string, plural: string) => `${value} ${value === 1 ? singular : plural}`;

export function investmentsHubSummary(overview: InvestmentHubOverview): FinanceModuleSummary {
  return { text: overview.assets.length ? `${amount(overview.totalCurrentValue)} invertidos` : 'Sin inversiones' };
}

export function budgetHubSummary(overview: BudgetHubOverview): FinanceModuleSummary {
  if (!overview.summary.count) return { text: 'Sin presupuestos' };
  const remaining = overview.summary.remaining;
  return { text: remaining < 0 ? `${amount(Math.abs(remaining))} excedidos` : `${amount(remaining)} disponibles` };
}

export function goalsHubSummary(overview: GoalsOverview): FinanceModuleSummary {
  if (!overview.goals.length) return { text: 'Sin objetivos' };
  const active = overview.summaries.filter((summary) => summary.activeCount > 0);
  if (!active.length) return { text: 'Sin objetivos activos' };
  if (active.length === 1 && active[0].totalSaved > 0) return { text: `${amount(active[0].totalSaved, active[0].currency)} ahorrados` };
  return { text: count(active.reduce((total, summary) => total + summary.activeCount, 0), 'objetivo activo', 'objetivos activos') };
}

export function debtsHubSummary(debts: DebtHubItem[]): FinanceModuleSummary {
  const own = debts.filter((debt) => debt.direction === 'i_ow');
  if (!own.length) return { text: 'Sin deudas' };
  const pending = own.filter((debt) => debt.status === 'active').reduce((total, debt) => total + debt.remainingAmount, 0);
  return { text: pending > 0 ? `${amount(pending)} pendientes` : 'Sin deudas' };
}

export function tripsHubSummary(trips: TripHubItem[]): FinanceModuleSummary {
  const active = trips.filter((trip) => trip.status === 'planning');
  if (!active.length) return { text: 'Sin viajes activos' };
  if (active.length === 1 && active[0].name && (active[0].cost ?? 0) > 0) {
    return { text: `${active[0].name} · ${amount(active[0].cost!)} gastados` };
  }
  return { text: count(active.length, 'viaje activo', 'viajes activos') };
}

export function projectsHubSummary(projects: ProjectListItem[]): FinanceModuleSummary {
  const active = projects.filter((project) => project.status === 'active');
  if (!active.length) return { text: 'Sin proyectos activos' };
  const profit = active.reduce((total, project) => total + project.financials.myProfit, 0);
  if (!profit) return { text: count(active.length, 'proyecto activo', 'proyectos activos') };
  return { text: `${profit > 0 ? '+' : '−'}${amount(Math.abs(profit))} de ${profit > 0 ? 'beneficio' : 'pérdida'}`, tone: profit > 0 ? 'positive' : 'negative' };
}

export function recurringHubSummary(transactions: RecurringHubItem[], now = new Date()): FinanceModuleSummary {
  const active = transactions.filter((transaction) => transaction.active !== false);
  if (!active.length) return { text: 'Sin recurrentes' };
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  // Templates already contain the next execution date. Do not predict repeated
  // occurrences or count income/transfers as upcoming expenses.
  const nextExpense = active.filter((transaction) => transaction.type === 'expense' && new Date(transaction.date).getTime() >= today.getTime())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  return { text: nextExpense ? `${amount(nextExpense.amount, nextExpense.wallet?.currency ?? 'EUR')} próximo pago` : count(active.length, 'recurrente activo', 'recurrentes activos') };
}
