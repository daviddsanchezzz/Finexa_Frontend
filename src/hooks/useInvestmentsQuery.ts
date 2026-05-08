import { useQuery } from "@tanstack/react-query";
import api from "../api/api";

async function fetchInvestmentsSummary() {
  const res = await api.get("/investments/summary");
  return res.data;
}

export function useInvestmentsSummaryQuery() {
  return useQuery({
    queryKey: ["investments", "summary"],
    queryFn: fetchInvestmentsSummary,
    staleTime: 1000 * 60 * 5,
  });
}
