import { describe, it, expect } from 'vitest';
import { computeWealthSeries, WealthTransaction } from './wealthSeries';

// El histórico de patrimonio (Home / NetWorthScreen > Evolución) suma
// income/expense mes a mes. Antes de este fix sumaba tx.amount en crudo,
// ignorando que una transacción en otra moneda ya trae baseAmount calculado
// por el backend (TransactionsService.create, tipo histórico del día) — con
// eso el patrimonio histórico contaba, por ejemplo, 50 CHF como si fueran
// 50 €. No se convierte nada aquí: solo se usa el campo que el backend ya
// convirtió, exactamente igual que dashboard.service.ts.
describe('computeWealthSeries — usa baseAmount cuando existe', () => {
  const tx = (over: Partial<WealthTransaction>): WealthTransaction => ({
    date: '2026-06-15',
    amount: 100,
    type: 'expense',
    isRecurring: false,
    active: true,
    excludeFromStats: false,
    ...over,
  });

  it('con todo EUR (baseAmount ausente), suma amount tal cual — comportamiento identico al actual', () => {
    const { monthsByYear } = computeWealthSeries({
      transactions: [tx({ type: 'income', amount: 1000 }), tx({ type: 'expense', amount: 400 })],
      manualData: {},
      snapshots: {},
      currentYear: 2026,
      currentMonth: 8, // julio ya "terminado"
    });

    const june = monthsByYear[2026][5];
    expect(june.income).toBe(1000);
    expect(june.expense).toBe(400);
  });

  it('una transaccion en otra moneda usa baseAmount en vez de amount', () => {
    const { monthsByYear } = computeWealthSeries({
      transactions: [
        tx({ type: 'income', amount: 1000 }),
        // 50 CHF que el backend ya convirtió a 46,5 € el día de la transacción.
        tx({ type: 'expense', amount: 50, baseAmount: 46.5 }),
      ],
      manualData: {},
      snapshots: {},
      currentYear: 2026,
      currentMonth: 8,
    });

    const june = monthsByYear[2026][5];
    expect(june.income).toBe(1000);
    expect(june.expense).toBe(46.5);
  });
});
