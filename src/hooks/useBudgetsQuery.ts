import { useQuery } from "@tanstack/react-query";
import api from "../api/api";

type PeriodType = "daily" | "weekly" | "monthly" | "yearly";

async function fetchBudgetsOverview(period: PeriodType) {
  const res = await api.get("/budgets/overview", { params: { period } });
  return res.data;
}

export function useBudgetsQuery(period: PeriodType) {
  return useQuery({
    queryKey: ["budgets", "overview", period],
    queryFn: () => fetchBudgetsOverview(period),
    staleTime: 1000 * 60 * 2,
  });
}
