import { useQuery } from "@tanstack/react-query";
import api from "../api/api";

interface FetchParams {
  dateFrom?: string | null;
  dateTo?: string | null;
  walletId?: number | null;
}

function buildDefaultRange() {
  const now = new Date();
  return {
    dateFrom: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    dateTo: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
  };
}

async function fetchTransactions(params: FetchParams) {
  const defaults = buildDefaultRange();
  const query: any = {
    dateFrom: params.dateFrom ?? defaults.dateFrom,
    dateTo: params.dateTo ?? defaults.dateTo,
  };
  if (params.walletId) query.walletId = params.walletId;

  const res = await api.get("/transactions", { params: query });
  return res.data
    .filter((tx: any) => tx.type !== "transfer")
    .filter((tx: any) => tx.isRecurring === false)
    .filter((tx: any) => tx.excludeFromStats !== true)
    .sort(
      (a: any, b: any) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
}

export function useTransactionsQuery(params: FetchParams = {}) {
  return useQuery({
    queryKey: ["transactions", params.walletId ?? null, params.dateFrom ?? null, params.dateTo ?? null],
    queryFn: () => fetchTransactions(params),
    staleTime: 1000 * 60 * 2,
  });
}
