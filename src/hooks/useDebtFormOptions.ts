import { useQuery } from "@tanstack/react-query";
import api from "../api/api";

export function useDebtFormOptions() {
  return useQuery({
    queryKey: ["debts", "form-options"],
    queryFn: async () => {
      const wallets = await api.get("/wallets");
      return { wallets: wallets.data as { id: number; name: string; emoji?: string | null }[] };
    },
    staleTime: 1000 * 60 * 2,
  });
}
