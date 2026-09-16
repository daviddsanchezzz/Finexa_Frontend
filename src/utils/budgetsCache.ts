import { queryClient } from "../lib/queryClient";
import { subscribeTransactionsInvalidation } from "./transactionsInvalidation";

export function invalidateBudgets() {
  void queryClient.invalidateQueries({ queryKey: ["budgets"] });
}

// Spending changes affect the overview, category detail, pace and history.
subscribeTransactionsInvalidation(invalidateBudgets);
