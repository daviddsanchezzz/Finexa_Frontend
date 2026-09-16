import api from "../api/api";
import { useBudgetData } from "./useBudgetData";

export function useBudgetFormOptions() {
  return useBudgetData(["form-options"], async (signal) => {
    const [wallets, categories] = await Promise.all([
      api.get("/wallets", { signal }),
      api.get("/categories", { signal }),
    ]);
    return { wallets: wallets.data as any[], categories: categories.data as any[] };
  });
}
