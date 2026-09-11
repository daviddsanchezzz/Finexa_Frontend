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
  // Patrimonio actual real: suma en vivo del balance de todas las carteras.
  current: number;
  // current - último saldo final cerrado (mismo número que la columna
  // "Saldo final" de Estadísticas avanzadas).
  monthDelta: number;
  // monthDelta relativo al último saldo cerrado, en %.
  pctChange: number;
  // Últimos puntos mensuales cerrados + el punto "hoy" (current) al final,
  // para la mini gráfica del card.
  sparkline: { label: string; value: number }[];
}

const MAX_SPARKLINE_POINTS = 6;

export function useNetWorthTrend(): NetWorthTrend {
  const seriesQuery = useQuery({
    queryKey: ["netWorthTrendSeries"],
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

  const walletsQuery = useQuery({
    queryKey: ["netWorthWallets"],
    queryFn: async () => (await api.get("/wallets")).data as { balance: number }[],
    staleTime: 1000 * 30,
  });

  const isLoading = seriesQuery.isLoading || walletsQuery.isLoading;

  return useMemo(() => {
    if (!seriesQuery.data || !walletsQuery.data) {
      return { isLoading, current: 0, monthDelta: 0, pctChange: 0, sparkline: [] };
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const incomeExpense = filterTransactionsForStats(seriesQuery.data.transactions).filter(
      (tx: any) => tx.type === "income" || tx.type === "expense"
    );

    const { wealthSeries } = computeWealthSeries({
      transactions: incomeExpense,
      manualData: mapManualMonthRows(seriesQuery.data.manual),
      snapshots: mapInvestmentSnapshotRows(seriesQuery.data.snapshots),
      currentYear,
      currentMonth,
    });

    const lastClosed: WealthPoint | undefined = wealthSeries[wealthSeries.length - 1];
    const lastClosedAmount = lastClosed?.finalAmount ?? 0;

    // Patrimonio actual real = suma del balance de todas las carteras ahora mismo.
    const current = walletsQuery.data.reduce((sum, w) => sum + Number(w.balance || 0), 0);

    const monthDelta = current - lastClosedAmount;
    const pctChange = lastClosedAmount !== 0 ? (monthDelta / Math.abs(lastClosedAmount)) * 100 : 0;

    const sparkline = wealthSeries
      .slice(-MAX_SPARKLINE_POINTS)
      .map((p) => ({ label: p.label, value: p.finalAmount }));
    sparkline.push({ label: "Hoy", value: current });

    return { isLoading, current, monthDelta, pctChange, sparkline };
  }, [seriesQuery.data, walletsQuery.data, isLoading]);
}
