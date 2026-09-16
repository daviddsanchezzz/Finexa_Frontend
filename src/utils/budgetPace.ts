type PaceTransaction = { date: string; amount: number | string; type?: string; isRecurring?: boolean; excludeFromStats?: boolean };
const day = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;

export function buildBudgetPace(from: string, to: string, limit: number, transactions: PaceTransaction[], now = new Date()) {
  const start = new Date(from), end = new Date(to);
  const startDay = day(start), endDay = day(end), today = day(now);
  if (!Number.isFinite(startDay) || !Number.isFinite(endDay) || endDay < startDay || !Number.isFinite(limit) || limit <= 0) return null;
  const days = endDay - startDay + 1;
  const elapsed = Math.max(0, Math.min(days, today - startDay + 1));
  const daily = new Map<number, number>();
  for (const tx of transactions) {
    const index = day(new Date(tx.date)) - startDay;
    const amount = Number(tx.amount);
    if (tx.type && tx.type !== "expense" || tx.isRecurring || tx.excludeFromStats || !Number.isFinite(index) || !Number.isFinite(amount) || index < 0 || index >= elapsed) continue;
    daily.set(index, (daily.get(index) ?? 0) + Math.abs(amount));
  }
  let spent = 0;
  const points = [{ fraction: 0, spent: 0 }];
  for (let index = 0; index < elapsed; index++) {
    spent += daily.get(index) ?? 0;
    points.push({ fraction: (index + 1) / days, spent });
  }
  const expected = limit * elapsed / days;
  return { start, end, days, elapsed, points, spent, expected, difference: spent - expected, ended: today > endDay, future: today < startDay };
}
