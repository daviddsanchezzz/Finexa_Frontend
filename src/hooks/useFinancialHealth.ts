import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/api";
import type { FinancialProfile, HealthReport, ScenarioBody, ScenarioResult } from "../types/financialHealth";

// La misma clave se invalida desde utils/financeCache.ts cuando cambia algo
// que mueve el score (movimientos, carteras, deudas, inversiones...).
export const FINANCIAL_HEALTH_QUERY_KEY = "financialHealth";

export function useFinancialHealth() {
  return useQuery({
    queryKey: [FINANCIAL_HEALTH_QUERY_KEY],
    queryFn: async () => (await api.get<HealthReport>("/financial-health")).data,
    staleTime: 1000 * 60 * 2,
    // Si el backend aún no tiene el endpoint (despliegue escalonado) no se
    // reintenta: la tarjeta de Inicio simplemente no aparece.
    retry: false,
  });
}

export type ProfileUpdateBody = Partial<Record<keyof Omit<FinancialProfile, "completeness">, number | string | null>>;

export function useUpdateFinancialProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: ProfileUpdateBody) => (await api.put("/financial-health/profile", body)).data,
    onSuccess: () => client.invalidateQueries({ queryKey: [FINANCIAL_HEALTH_QUERY_KEY] }),
  });
}

export function useSimulateHealth() {
  return useMutation({
    mutationFn: async (body: ScenarioBody) => (await api.post<ScenarioResult>("/financial-health/simulate", body)).data,
  });
}
