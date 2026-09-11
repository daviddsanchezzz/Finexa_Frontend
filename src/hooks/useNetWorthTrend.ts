import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../api/api";
import {
  computeWealthSeries,
  filterTransactionsForStats,
  mapManualMonthRows,
  mapInvestmentSnapshotRows,
  type WealthPoint,
} from "../utils/wealthSeries";

export interface NetWorthTrend {
  isLoading: boolean;
  // Valor estimado de ahora mismo: último saldo final cerrado + lo que
  // llevamos de mes (igual que la columna "Saldo final" de Estadísticas
  // avanzadas, pero adelantado al día de hoy).
  current: number;
  // Variación de este mes en curso (ingresos - gastos desde el día 1).
  monthDelta: number;
  // monthDelta relativo al último saldo cerrado, en %.
  pctChange: number;
  // Últimos puntos mensuales cerrados + el punto "hoy" al final, para la
  // mini gráfica del card.
  sparkline: { label: string; value: number }[];
}

const MAX_SPARKLINE_POINTS = 6;

export function useNetWorthTrend(): NetWorthTrend {
  const { data, isLoading } = useQuery({
    queryKey: ["netWorthTrend"],
    queryFn: async () => {
      const [txRes, manualRes, snapRes] = await Promise.all([
        api.get("/transactions"),
        api.get("/manual-month"),
        api.get("/investments/snapshots"),
      ]);
      return {
        transactions: txRes.data || [],
        manual: manualRes.data || [],
        snapshots: snapRes.data || [],
      };
    },
    staleTime: 1000 * 60,
  });

  return useMemo(() => {
    if (!data) {
      return { isLoading, current: 0, monthDelta: 0, pctChange: 0, sparkline: [] };
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const allFiltered = filterTransactionsForStats(data.transactions);
    const incomeExpense = allFiltered.filter((tx: any) => tx.type === "income" || tx.type === "expense");

    const { wealthSeries } = computeWealthSeries({
      transactions: incomeExpense,
      manualData: mapManualMonthRows(data.manual),
      snapshots: mapInvestmentSnapshotRows(data.snapshots),
      currentYear,
      currentMonth,
    });

    const lastClosed: WealthPoint | undefined = wealthSeries[wealthSeries.length - 1];
    const lastClosedAmount = lastClosed?.finalAmount ?? 0;

    // Ingresos/gastos del mes en curso (desde el día 1 hasta hoy).
    const monthStart = new Date(currentYear, currentMonth, 1).getTime();
    const monthTx = incomeExpense.filter((tx: any) => new Date(tx.date).getTime() >= monthStart);
    const monthIncome = monthTx.filter((tx: any) => tx.type === "income").reduce((s: number, tx: any) => s + Math.abs(tx.amount), 0);
    const monthExpense = monthTx.filter((tx: any) => tx.type === "expense").reduce((s: number, tx: any) => s + Math.abs(tx.amount), 0);
    const monthDelta = monthIncome - monthExpense;

    const current = lastClosedAmount + monthDelta;
    const pctChange = lastClosedAmount !== 0 ? (monthDelta / Math.abs(lastClosedAmount)) * 100 : 0;

    const sparkline = wealthSeries
      .slice(-MAX_SPARKLINE_POINTS)
      .map((p) => ({ label: p.label, value: p.finalAmount }));
    sparkline.push({ label: "Hoy", value: current });

    return { isLoading, current, monthDelta, pctChange, sparkline };
  }, [data, isLoading]);
}
