import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../api/api";
import {
  computeWealthSeries,
  filterTransactionsForStats,
  mapManualMonthRows,
  mapInvestmentSnapshotRows,
  type WealthPoint,
  type MonthSummary,
  type YearSummary,
} from "../utils/wealthSeries";
import { getTransactionsDataVersion, subscribeTransactionsInvalidation } from "../utils/transactionsInvalidation";
import { getInvestmentsDataVersion, subscribeInvestmentsInvalidation } from "../utils/investmentsInvalidation";

export type NetWorthFilterType = "day" | "week" | "month" | "year" | "all" | "custom";

export interface NetWorthWallet {
  id: number;
  name: string;
  emoji?: string | null;
  balance: number;
}

export interface NetWorthTrend {
  isLoading: boolean;
  // Patrimonio actual real: suma en vivo del balance de todas las carteras.
  current: number;
  // Carteras que forman exactamente el patrimonio actual mostrado.
  wallets: NetWorthWallet[];
  // current - patrimonio al cierre del periodo anterior, según el filtro de
  // fecha activo en Home (año -> cierre del año pasado, mes -> cierre del
  // mes pasado, semana/día -> patrimonio al empezar esa semana/día).
  periodDelta: number;
  // Ingresos menos gastos dentro del mismo periodo de comparación.
  periodSavings: number;
  // Texto para el card: "este año" / "este mes" / "esta semana" / "hoy".
  periodLabel: string;
  // periodDelta relativo al patrimonio de referencia, en %.
  pctChange: number;
  // Últimos puntos mensuales cerrados + el punto "hoy" (current) al final,
  // para la mini gráfica del card.
  sparkline: { label: string; value: number }[];
  // Serie completa de cierres mensuales (sin recortar ni el punto "hoy"),
  // para pantallas que necesiten elegir su propio rango (ej. NetWorthScreen).
  series: WealthPoint[];
  // Desglose mes a mes por año y resumen por año (para las tablas de
  // Estadísticas movidas a NetWorthScreen > Evolución).
  monthsByYear: Record<number, MonthSummary[]>;
  globalSummaryList: YearSummary[];
}

const MAX_SPARKLINE_POINTS = 6;

function getWeekStart(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function useNetWorthTrend(filterType: NetWorthFilterType = "month"): NetWorthTrend {
  // Home no se desmonta al cambiar de pestaña, así que estas queries se
  // quedan cacheadas indefinidamente salvo que algo las invalide — al
  // añadir/editar una transacción o una valoración/operación de inversión,
  // las versiones de abajo suben y, al ir dentro de la queryKey, react-query
  // las trata como nuevas y las refetchea.
  const [txVersion, setTxVersion] = useState(getTransactionsDataVersion);
  useEffect(() => subscribeTransactionsInvalidation(setTxVersion), []);
  const [investVersion, setInvestVersion] = useState(getInvestmentsDataVersion);
  useEffect(() => subscribeInvestmentsInvalidation(setInvestVersion), []);

  const seriesQuery = useQuery({
    queryKey: ["netWorthTrendSeries", txVersion, investVersion],
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
    queryKey: ["netWorthWallets", txVersion],
    queryFn: async () => (await api.get("/wallets")).data as NetWorthWallet[],
    staleTime: 1000 * 30,
  });

  const isLoading = seriesQuery.isLoading || walletsQuery.isLoading;

  return useMemo(() => {
    if (!seriesQuery.data || !walletsQuery.data) {
      return { isLoading, current: 0, wallets: [], periodDelta: 0, periodSavings: 0, periodLabel: "", pctChange: 0, sparkline: [], series: [], monthsByYear: {}, globalSummaryList: [] };
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const incomeExpense = filterTransactionsForStats(seriesQuery.data.transactions).filter(
      (tx: any) => tx.type === "income" || tx.type === "expense"
    );

    const { wealthSeries, globalSummaryList, monthsByYear } = computeWealthSeries({
      transactions: incomeExpense,
      manualData: mapManualMonthRows(seriesQuery.data.manual),
      snapshots: mapInvestmentSnapshotRows(seriesQuery.data.snapshots),
      currentYear,
      currentMonth,
    });

    // Patrimonio actual real = suma del balance de todas las carteras ahora mismo.
    const current = walletsQuery.data.reduce((sum, w) => sum + Number(w.balance || 0), 0);

    // Neto (ingresos - gastos) de las transacciones desde una fecha hasta hoy,
    // para reconstruir hacia atrás el patrimonio cuando no hay un "cierre"
    // contable a esa granularidad (solo existe cierre mensual/anual).
    const netflowSince = (from: Date) => {
      const fromTime = from.getTime();
      return incomeExpense
        .filter((tx: any) => new Date(tx.date).getTime() >= fromTime)
        .reduce((s: number, tx: any) => s + (tx.type === "income" ? Math.abs(tx.amount) : -Math.abs(tx.amount)), 0);
    };

    let baseline = 0;
    let periodLabel = "este mes";
    let periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    if (filterType === "year") {
      const finishedYears = globalSummaryList.filter((y) => y.year < currentYear);
      const lastYear = finishedYears[finishedYears.length - 1];
      baseline = lastYear ? lastYear.finalAmount : 0;
      periodLabel = "este año";
      periodStart = new Date(now.getFullYear(), 0, 1);
    } else if (filterType === "week") {
      periodStart = getWeekStart(now);
      baseline = current - netflowSince(periodStart);
      periodLabel = "esta semana";
    } else if (filterType === "day") {
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      baseline = current - netflowSince(periodStart);
      periodLabel = "hoy";
    } else {
      // month, all y custom -> comparar con el último mes cerrado.
      const lastClosed: WealthPoint | undefined = wealthSeries[wealthSeries.length - 1];
      baseline = lastClosed?.finalAmount ?? 0;
      periodLabel = "este mes";
    }

    const periodDelta = current - baseline;
    const periodSavings = netflowSince(periodStart);
    const pctChange = baseline !== 0 ? (periodDelta / Math.abs(baseline)) * 100 : 0;

    const sparkline = wealthSeries
      .slice(-MAX_SPARKLINE_POINTS)
      .map((p) => ({ label: p.label, value: p.finalAmount }));
    sparkline.push({ label: "Hoy", value: current });

    return { isLoading, current, wallets: walletsQuery.data, periodDelta, periodSavings, periodLabel, pctChange, sparkline, series: wealthSeries, monthsByYear, globalSummaryList };
  }, [seriesQuery.data, walletsQuery.data, isLoading, filterType]);
}
