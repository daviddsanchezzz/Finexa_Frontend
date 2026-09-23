import { describe, expect, it } from 'vitest';
import { activityBuckets, categories, inPeriod, previousPeriod, summarize, type DashboardTx, type Period } from './dashboardData';
import { filterTransactionsForStats } from '../../../utils/wealthSeries';

const period: Period = { from: new Date(2026, 8, 1).toISOString(), to: new Date(2026, 8, 30, 23, 59, 59, 999).toISOString(), label: 'Septiembre', type: 'month' };
const tx = (id: number, day: number, amount: number, type = 'expense'): DashboardTx => ({ id, date: new Date(2026, 8, day, 18).toISOString(), amount, type, isRecurring: false });

describe('desktop overview data', () => {
  it('uses the stored converted amount, including zero, for all statistics', () => {
    const rows = [{ ...tx(1, 1, 100), currency: 'CHF', baseAmount: 105 }, { ...tx(2, 2, 50), baseAmount: 0 }];
    expect(summarize(rows).expense).toBe(105);
    expect(categories(rows, 'expense')[0].amount).toBe(105);
    expect(activityBuckets(rows, period)[0].expense).toBe(105);
  });
  it('includes the last evening of the month and its fifth week', () => {
    const rows = [tx(1, 30, 25), tx(2, 31, 80)];
    expect(inPeriod(rows, period)).toHaveLength(1);
    const buckets = activityBuckets(rows, period);
    expect(buckets).toHaveLength(5);
    expect(buckets[4].expense).toBe(25);
  });
  it('compares calendar months of different lengths', () => {
    const previous = previousPeriod(period)!;
    expect(new Date(previous.from).getMonth()).toBe(7);
    expect(new Date(previous.to).getDate()).toBe(31);
    expect(previousPeriod({ ...period, type: 'all' })).toBeNull();
  });
  it('handles year boundaries and leap years', () => {
    const january = { ...period, from: new Date(2025, 0, 1).toISOString(), to: new Date(2025, 0, 31).toISOString() };
    expect(new Date(previousPeriod(january)!.from).getFullYear()).toBe(2024);
    const march = { ...period, from: new Date(2024, 2, 1).toISOString() };
    expect(new Date(previousPeriod(march)!.to).getDate()).toBe(29);
  });
  it('compares custom ranges using the same number of calendar days', () => {
    const previous = previousPeriod({ ...period, type: 'custom', from: new Date(2026, 8, 10).toISOString(), to: new Date(2026, 8, 12, 23, 59).toISOString() })!;
    expect(new Date(previous.from).getDate()).toBe(7);
    expect(new Date(previous.to).getDate()).toBe(9);
  });
  it('matches mobile exclusions and keeps uncategorized amounts in the breakdown', () => {
    const rows = [tx(1, 1, -25), tx(2, 2, 100, 'income'), tx(3, 3, 1000, 'transfer'), { ...tx(4, 4, 70), excludeFromStats: true }, { ...tx(5, 5, 50), isRecurring: true }, { ...tx(6, 6, 20), active: false }];
    const included = filterTransactionsForStats(rows) as DashboardTx[];
    expect(summarize(included)).toEqual({ income: 100, expense: 25, savings: 75, rate: 75 });
    expect(categories(included, 'expense')[0]).toMatchObject({ name: 'Sin categoría', amount: 25 });
    expect(summarize([tx(1, 1, 25)]).rate).toBeNull();
  });
});
