import { describe, expect, it } from 'vitest';
import { wealthPeriodChange } from './wealthPeriodChange';
import type { Period } from './dashboardData';

const now = new Date(2026, 8, 23, 12);
const series = [{ year: 2026, month: 6, label: 'Jul', finalAmount: 900 }, { year: 2026, month: 7, label: 'Ago', finalAmount: 1000 }];
const period: Period = { from: new Date(2026, 8, 1).toISOString(), to: new Date(2026, 8, 30, 23, 59, 59, 999).toISOString(), type: 'month', label: 'Septiembre' };
describe('wealth change for the selected period', () => {
  it('compares current wealth with the preceding close', () => {
    expect(wealthPeriodChange(period, series, 1100, [], now)).toEqual({ delta: 100, percentage: 10, estimated: false });
    expect(wealthPeriodChange(period, series, 900, [], now)?.percentage).toBe(-10);
  });
  it('uses historical closes rather than today for past months', () => {
    const august = { ...period, from: new Date(2026, 7, 1).toISOString(), to: new Date(2026, 7, 31, 23, 59, 59, 999).toISOString() };
    expect(wealthPeriodChange(august, series, 9999, [], now)?.delta).toBe(100);
  });
  it('does not invent a percentage with a zero baseline or missing history', () => {
    expect(wealthPeriodChange(period, [], 1100, [], now)).toBeNull();
    expect(wealthPeriodChange(period, [{ ...series[1], finalAmount: 0 }], 1100, [], now)?.percentage).toBeNull();
  });
  it('labels partial-month reconstruction as estimated and uses converted cashflow', () => {
    const week = { ...period, from: new Date(2026, 8, 20).toISOString() };
    const tx = { id: 1, date: new Date(2026, 8, 5).toISOString(), type: 'expense', amount: 100, baseAmount: 50, isRecurring: false };
    expect(wealthPeriodChange(week, series, 1100, [tx], now)).toMatchObject({ delta: 150, estimated: true });
  });
});
