import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../api/api";

interface SnapshotRow {
  monthStart: string;
  profit: number | null;
}

// Suma el profit de los snapshots mensuales de inversión (mismo dato que usa
// Estadísticas avanzadas) cuyo mes cae dentro del rango [fromISO, toISO]
// seleccionado en Home. Al ser granularidad mensual, un filtro de día/semana
// que no incluya el día 1 del mes no encontrará snapshot y devolverá 0.
export function useInvestmentPeriodProfit(fromISO: string, toISO: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["investmentSnapshotsAll"],
    queryFn: async () => (await api.get("/investments/snapshots")).data as SnapshotRow[],
    staleTime: 1000 * 60,
  });

  const profit = useMemo(() => {
    if (!data) return 0;
    const from = new Date(fromISO).getTime();
    const to = new Date(toISO).getTime();
    return data.reduce((sum, s) => {
      if (s.profit == null) return sum;
      const t = new Date(s.monthStart).getTime();
      return t >= from && t <= to ? sum + Number(s.profit) : sum;
    }, 0);
  }, [data, fromISO, toISO]);

  return { profit, isLoading };
}
