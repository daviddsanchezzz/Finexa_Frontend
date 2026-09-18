import { useQuery } from "@tanstack/react-query";
import api from "../api/api";
import { queryClient } from "../lib/queryClient";
import { subscribeTransactionsInvalidation } from "../utils/transactionsInvalidation";

// Key propia, distinta de ["transactions", "recurring"] que usa el resumen
// del hub (financeModuleSummaries) — ese query no ordena ni filtra igual, y
// al compartir la misma queryKey esta pantalla acababa leyendo, según qué
// query corriera primero, datos sin el orden ascendente que necesita.
export const RECURRING_TRANSACTIONS_QUERY_KEY = ["transactions", "recurring", "list"] as const;

export function invalidateRecurringTransactions() {
  void queryClient.invalidateQueries({ queryKey: RECURRING_TRANSACTIONS_QUERY_KEY });
}

// markTransactionsDirty() se llama en un único sitio por cada mutación real
// (crear/editar en AddTransactionScreen, eliminar en TransactionsList), así
// que basta suscribirse aquí una vez para que esta pantalla se mantenga al
// día sin tener que refetchear cada vez que se abre.
subscribeTransactionsInvalidation(invalidateRecurringTransactions);

async function fetchRecurringTransactions() {
  const res = await api.get("/transactions", { params: { isRecurring: true } });
  return (res.data || [])
    .filter((t: any) => t?.active !== false)
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function useRecurringTransactionsQuery(options: { staleTime?: number; gcTime?: number } = {}) {
  return useQuery({
    queryKey: RECURRING_TRANSACTIONS_QUERY_KEY,
    queryFn: fetchRecurringTransactions,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    ...options,
  });
}
