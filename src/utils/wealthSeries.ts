// Cálculo compartido del "saldo final" mensual (patrimonio neto histórico),
// usado tanto por las tablas/gráfica de NetWorthScreen > Evolución como por
// el card de Home. Vive aquí para que ambos muestren siempre el mismo número.

export type TxType = "income" | "expense" | "transfer";

export interface WealthTransaction {
  date: string;
  amount: number;
  // Equivalente en la moneda base del usuario, ya calculado por el backend al
  // crear la transacción (tipo histórico del día). Null/ausente cuando la
  // transacción ya está en la moneda base — en ese caso `amount` es correcto
  // tal cual. Nunca se convierte nada aquí, solo se elige el campo correcto.
  baseAmount?: number | null;
  type: TxType;
  isRecurring?: boolean;
  active?: boolean;
  excludeFromStats?: boolean;
}

export interface ManualMonthOverride {
  income?: number;
  expense?: number;
  finalBalance?: number;
}

export type ManualMonthMap = Record<number, Record<number, ManualMonthOverride>>;
export type InvestmentSnapshotMap = Record<string, number>; // "YYYY-M" -> profit €

export interface MonthSummary {
  monthIndex: number;
  monthName: string;
  income: number;
  expense: number;
  saving: number;
  investment: number | null; // null = sin snapshot ese mes
  finalAmount: number;
}

export interface YearSummary {
  year: number;
  income: number;
  expense: number;
  saving: number;
  investment: number;
  finalAmount: number;
}

export interface WealthPoint {
  year: number;
  month: number;
  label: string;
  finalAmount: number;
}

export const MONTH_NAMES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function formatMonthShort(y: number, m: number) {
  return new Date(y, m, 1).toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
}

export function buildLinePath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
}

// Mismo filtro que Stats: sin transfers, sin recurrentes, sin inactivas, sin excludeFromStats.
export function filterTransactionsForStats(list: any[]): WealthTransaction[] {
  return (list || [])
    .filter((tx: any) => tx.type !== "transfer")
    .filter((tx: any) => tx.isRecurring === false)
    .filter((tx: any) => tx.active !== false)
    .filter((tx: any) => tx.excludeFromStats !== true);
}

export function mapManualMonthRows(rows: any[]): ManualMonthMap {
  const map: ManualMonthMap = {};
  (rows || []).forEach((row: any) => {
    if (!map[row.year]) map[row.year] = {};
    map[row.year][row.month] = {
      income: row.income ?? undefined,
      expense: row.expense ?? undefined,
      finalBalance: row.finalBalance ?? undefined,
    };
  });
  return map;
}

export function mapInvestmentSnapshotRows(rows: any[]): InvestmentSnapshotMap {
  const map: InvestmentSnapshotMap = {};
  (rows || []).forEach((s: any) => {
    if (s.profit == null) return;
    const d = new Date(s.monthStart);
    map[`${d.getUTCFullYear()}-${d.getUTCMonth()}`] = Number(s.profit);
  });
  return map;
}

// Saldo final mes a mes, propagado desde initialBalance, con overrides manuales
// y profit de inversión donde exista snapshot. Un mes "no terminado" (el actual,
// salvo override manual) no suma ni cierra saldo — se refleja como finalAmount: 0.
export function computeWealthSeries(params: {
  transactions: WealthTransaction[];
  manualData: ManualMonthMap;
  snapshots: InvestmentSnapshotMap;
  initialBalance?: number;
  currentYear: number;
  currentMonth: number; // 0-11
}): { monthsByYear: Record<number, MonthSummary[]>; globalSummaryList: YearSummary[]; wealthSeries: WealthPoint[] } {
  const { transactions, manualData, snapshots, initialBalance = 0, currentYear, currentMonth } = params;

  const perYearMonth: Record<number, { income: number[]; expense: number[] }> = {};

  for (const tx of transactions) {
    if (tx.type !== "income" && tx.type !== "expense") continue;
    const d = new Date(tx.date);
    const y = d.getFullYear();
    const m = d.getMonth();

    if (!perYearMonth[y]) {
      perYearMonth[y] = { income: new Array(12).fill(0), expense: new Array(12).fill(0) };
    }

    const amount = Math.abs(tx.baseAmount ?? tx.amount);
    if (tx.type === "income") perYearMonth[y].income[m] += amount;
    if (tx.type === "expense") perYearMonth[y].expense[m] += amount;
  }

  let minYear = currentYear;
  for (const yStr of Object.keys(perYearMonth)) minYear = Math.min(minYear, Number(yStr));
  for (const yStr of Object.keys(manualData)) minYear = Math.min(minYear, Number(yStr));
  const maxYear = currentYear;

  const yearsSorted: number[] = [];
  for (let y = minYear; y <= maxYear; y++) yearsSorted.push(y);

  if (yearsSorted.length === 0) {
    return { monthsByYear: {}, globalSummaryList: [], wealthSeries: [] };
  }

  const monthsByYear: Record<number, MonthSummary[]> = {};
  const yearAgg: Record<number, { income: number; expense: number; saving: number; investment: number; finalAmount: number }> = {};

  let globalRunningBalance = initialBalance;

  yearsSorted.forEach((y) => {
    const d = perYearMonth[y] ?? { income: new Array(12).fill(0), expense: new Array(12).fill(0) };

    let yearIncome = 0;
    let yearExpense = 0;
    let yearInvestment = 0;
    let lastFinishedFinalAmount: number | null = null;

    const monthsArr: MonthSummary[] = new Array(12).fill(null).map((_, m) => {
      const isPastYear = y < currentYear;
      const isCurrentYear = y === currentYear;
      const isFinishedMonth = isPastYear || (isCurrentYear && m < currentMonth);

      const override = manualData[y]?.[m];

      const txIncome = d.income[m] ?? 0;
      const txExpense = d.expense[m] ?? 0;

      const income = override?.income !== undefined ? override.income : isFinishedMonth ? txIncome : 0;
      const expense = override?.expense !== undefined ? override.expense : isFinishedMonth ? txExpense : 0;

      const saving = income - expense;

      const investmentProfit: number | null = isFinishedMonth ? (snapshots[`${y}-${m}`] ?? null) : null;

      let finalAmount = 0;

      if (isFinishedMonth) {
        yearIncome += income;
        yearExpense += expense;
        if (investmentProfit !== null) yearInvestment += investmentProfit;

        if (override?.finalBalance !== undefined && override?.finalBalance !== null) {
          globalRunningBalance = override.finalBalance;
        } else {
          globalRunningBalance = globalRunningBalance + saving + (investmentProfit ?? 0);
        }

        finalAmount = globalRunningBalance;
        lastFinishedFinalAmount = finalAmount;
      }

      return {
        monthIndex: m,
        monthName: MONTH_NAMES_ES[m],
        income,
        expense,
        saving,
        investment: isFinishedMonth ? investmentProfit : null,
        finalAmount,
      };
    });

    const yearSaving = yearIncome - yearExpense;
    const yearFinalAmount = lastFinishedFinalAmount ?? 0;

    monthsByYear[y] = monthsArr;
    yearAgg[y] = { income: yearIncome, expense: yearExpense, saving: yearSaving, investment: yearInvestment, finalAmount: yearFinalAmount };
  });

  const globalSummaryList: YearSummary[] = yearsSorted.map((y) => {
    const fullYearFinished = y < currentYear;
    if (!fullYearFinished) return { year: y, income: 0, expense: 0, saving: 0, investment: 0, finalAmount: 0 };
    const agg = yearAgg[y] ?? { income: 0, expense: 0, saving: 0, investment: 0, finalAmount: 0 };
    return { year: y, ...agg };
  });

  const rows: WealthPoint[] = [];
  const years = Object.keys(monthsByYear).map(Number).sort((a, b) => a - b);
  for (const y of years) {
    const arr = monthsByYear[y] || [];
    for (const m of arr) {
      const isPastYear = y < currentYear;
      const isCurrentYear = y === currentYear;
      const isFinishedMonth = isPastYear || (isCurrentYear && m.monthIndex < currentMonth);
      if (!isFinishedMonth) continue;
      if (!Number.isFinite(m.finalAmount)) continue;
      rows.push({ year: y, month: m.monthIndex, label: formatMonthShort(y, m.monthIndex), finalAmount: m.finalAmount });
    }
  }
  rows.sort((a, b) => a.year - b.year || a.month - b.month);
  const seen = new Set<string>();
  const wealthSeries = rows.filter((r) => {
    const key = `${r.year}-${r.month}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { monthsByYear, globalSummaryList, wealthSeries };
}
