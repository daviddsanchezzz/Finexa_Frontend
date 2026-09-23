import type { WealthPoint } from '../../../utils/wealthSeries';
import type { DashboardTx, Period } from './dashboardData';

// Los cierres mensuales son referencias reales. Para fechas intermedias solo
// conocemos los flujos de caja: se devuelve estimated para indicarlo en la UI.
export function wealthPeriodChange(period: Period, series: WealthPoint[], current: number, transactions: DashboardTx[], now = new Date()) {
  const from = new Date(period.from).getTime();
  const to = Math.min(new Date(period.to).getTime() + 1, now.getTime());
  if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) return null;
  const points = series.map(p => ({ time: new Date(p.year, p.month + 1, 1).getTime(), value: p.finalAmount })).sort((a, b) => a.time - b.time);
  const valueAt = (time: number): { value: number; estimated: boolean } | null => {
    if (time === now.getTime()) return { value: current, estimated: false };
    const point = points.filter(p => p.time <= time).at(-1);
    if (!point) return null;
    if (point.time === time) return { value: point.value, estimated: false };
    const flow = transactions.filter(tx => {
      const date = new Date(tx.date).getTime();
      return date >= point.time && date < time && tx.isRecurring === false && tx.active !== false && tx.excludeFromStats !== true && (tx.type === 'income' || tx.type === 'expense');
    }).reduce((sum, tx) => sum + (tx.type === 'income' ? 1 : -1) * Math.abs(Number(tx.baseAmount ?? tx.amount)), 0);
    return { value: point.value + flow, estimated: true };
  };
  const start = valueAt(from), end = valueAt(to);
  if (!start || !end) return null;
  const delta = Math.abs(end.value - start.value) < 0.005 ? 0 : end.value - start.value;
  return { delta, percentage: start.value === 0 ? null : delta / Math.abs(start.value) * 100, estimated: start.estimated || end.estimated };
}
