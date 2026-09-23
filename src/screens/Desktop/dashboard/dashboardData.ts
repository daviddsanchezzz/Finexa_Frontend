export type Period = { from: string; to: string; label: string; type: string };
export type DashboardTx = {
  id: number; type: string; amount: number; date: string; isRecurring?: boolean;
  active?: boolean; excludeFromStats?: boolean; description?: string; note?: string;
  baseAmount?: number | string | null; currency?: string;
  walletId?: number; fromWalletId?: number; toWalletId?: number; wallet?: { id: number; name: string };
  category?: { id?: number; name: string; emoji?: string; color?: string } | null;
  subcategory?: { name: string } | null;
};

export function currentMonth(): Period {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString(),
    label: now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }), type: 'month',
  };
}

export function previousPeriod(period: Period): Period | null {
  if (period.type === 'all') return null;
  const from = new Date(period.from);
  const to = new Date(period.to);
  let start: Date;
  let end: Date;
  if (period.type === 'month') {
    start = new Date(from.getFullYear(), from.getMonth() - 1, 1);
    end = new Date(from.getFullYear(), from.getMonth(), 0, 23, 59, 59, 999);
  } else if (period.type === 'year') {
    start = new Date(from.getFullYear() - 1, 0, 1);
    end = new Date(from.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
  } else {
    const days = Math.round((Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) - Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) / 86400000) + 1;
    start = new Date(from); start.setDate(start.getDate() - days); start.setHours(0, 0, 0, 0);
    end = new Date(from); end.setDate(end.getDate() - 1); end.setHours(23, 59, 59, 999);
  }
  return { from: start.toISOString(), to: end.toISOString(), type: period.type, label: 'periodo anterior' };
}

export function inPeriod(rows: DashboardTx[], period: Period | null) {
  if (!period) return [];
  const start = new Date(period.from).getTime(), end = new Date(period.to).getTime();
  return rows.filter(tx => { const time = new Date(tx.date).getTime(); return time >= start && time <= end; });
}

export function summarize(rows: DashboardTx[]) {
  const income = rows.filter(tx => tx.type === 'income').reduce((s, tx) => s + Math.abs(Number(tx.baseAmount ?? tx.amount) || 0), 0);
  const expense = rows.filter(tx => tx.type === 'expense').reduce((s, tx) => s + Math.abs(Number(tx.baseAmount ?? tx.amount) || 0), 0);
  return { income, expense, savings: income - expense, rate: income > 0 ? (income - expense) / income * 100 : null };
}

export function categories(rows: DashboardTx[], type: string) {
  const map = new Map<string, { name: string; emoji: string; color: string; amount: number; count: number }>();
  rows.filter(tx => tx.type === type).forEach(tx => {
    const name = tx.category?.name || 'Sin categoría';
    const item = map.get(name) ?? { name, emoji: tx.category?.emoji || '•', color: tx.category?.color || '#8A9BBD', amount: 0, count: 0 };
    item.amount += Math.abs(Number(tx.baseAmount ?? tx.amount) || 0); item.count++; map.set(name, item);
  });
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

export function activityBuckets(rows: DashboardTx[], period: Period) {
  const anchor = new Date(period.to);
  const year = anchor.getFullYear(), month = anchor.getMonth();
  const weekly = period.type === 'month';
  const count = weekly ? Math.ceil(new Date(year, month + 1, 0).getDate() / 7) : period.type === 'year' ? 12 : 6;
  return Array.from({ length: count }, (_, i) => {
    const start = weekly ? new Date(year, month, 1 + i * 7) : new Date(year, period.type === 'year' ? i : month - 5 + i, 1);
    const end = weekly ? new Date(year, month, Math.min((i + 1) * 7, new Date(year, month + 1, 0).getDate()), 23, 59, 59, 999) : new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    const totals = summarize(inPeriod(rows, { from: start.toISOString(), to: end.toISOString(), label: '', type: '' }));
    return { ...totals, label: weekly ? `S${i + 1}` : start.toLocaleDateString('es-ES', { month: 'short' }), fullLabel: weekly ? `${start.getDate()}–${end.getDate()} ${start.toLocaleDateString('es-ES', { month: 'long' })}` : start.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) };
  });
}
