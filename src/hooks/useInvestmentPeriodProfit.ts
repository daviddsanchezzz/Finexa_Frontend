import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../api/api";
import { getInvestmentsDataVersion, subscribeInvestmentsInvalidation } from "../utils/investmentsInvalidation";

interface SnapshotRow {
  monthStart: string;
  profit: number | null;
}

// Suma el profit de los snapshots mensuales de inversión (meses cerrados,
// vía /investments/snapshots) más el mes en curso calculado en vivo (vía
// /investments/snapshots/current — mismo dato que "Septiembre (en curso)"
// en la pantalla de Inversiones), para los meses que caen dentro del rango
// [fromISO, toISO] seleccionado en Home. Al ser granularidad mensual, un
// filtro de día/semana que no incluya el mes en curso ni el día 1 de un mes
// cerrado no encontrará snapshot y devolverá 0.
export function useInvestmentPeriodProfit(fromISO: string, toISO: string) {
  // Home es una pestaña que nunca se desmonta, así que estas queries de
  // react-query se quedan cacheadas indefinidamente salvo que algo las
  // invalide explícitamente — al añadir una valoración/operación desde
  // Inversiones, markInvestmentsDirty() sube esta versión y, al ir dentro
  // de la queryKey, react-query las trata como nuevas y las refetchea.
  const [invalidationVersion, setInvalidationVersion] = useState(getInvestmentsDataVersion);
  useEffect(() => subscribeInvestmentsInvalidation(setInvalidationVersion), []);

  const closedQuery = useQuery({
    queryKey: ["investmentSnapshotsAll", invalidationVersion],
    queryFn: async () => (await api.get("/investments/snapshots")).data as SnapshotRow[],
    staleTime: 1000 * 60,
  });

  const currentQuery = useQuery({
    queryKey: ["investmentSnapshotCurrent", invalidationVersion],
    queryFn: async () => {
      try {
        return (await api.get("/investments/snapshots/current")).data as SnapshotRow;
      } catch {
        return null;
      }
    },
    staleTime: 1000 * 60,
  });

  const isLoading = closedQuery.isLoading || currentQuery.isLoading;

  const profit = useMemo(() => {
    const closed = closedQuery.data ?? [];
    const current = currentQuery.data;
    const alreadyClosed = current && closed.some((s) => s.monthStart === current.monthStart);
    const rows = current && !alreadyClosed ? [...closed, current] : closed;

    const from = new Date(fromISO).getTime();
    const to = new Date(toISO).getTime();
    return rows.reduce((sum, s) => {
      if (s.profit == null) return sum;
      const t = new Date(s.monthStart).getTime();
      return t >= from && t <= to ? sum + Number(s.profit) : sum;
    }, 0);
  }, [closedQuery.data, currentQuery.data, fromISO, toISO]);

  return { profit, isLoading };
}
