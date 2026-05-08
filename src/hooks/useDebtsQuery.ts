import { useQuery } from "@tanstack/react-query";
import api from "../api/api";

async function fetchDebts() {
  const res = await api.get("/debts");
  return res.data || [];
}

export function useDebtsQuery() {
  return useQuery({
    queryKey: ["debts"],
    queryFn: fetchDebts,
    staleTime: 1000 * 60 * 2,
  });
}
