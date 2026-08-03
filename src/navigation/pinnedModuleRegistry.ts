// src/navigation/pinnedModuleRegistry.ts
import type { ComponentType } from "react";
import { DEFAULT_PINNED_MODULE_KEY } from "../screens/Mobile/finances/financeModulesConfig";

// Carga perezosa (misma convención que getComponent en los navigators):
// solo se evalúa el require() del módulo que el usuario tiene pineado.
export const PINNED_MODULE_SCREEN_LOADERS: Record<string, () => ComponentType<any>> = {
  investments: () =>
    require("../screens/Mobile/finances/invests/InvestmentsScreen").default,
  budgets: () =>
    require("../screens/Mobile/finances/budgets/BudgetsScreen").default,
  goals: () => require("../screens/Mobile/finances/goals/GoalsScreen").default,
  debts: () => require("../screens/Mobile/finances/debts/DebtsScreen").default,
  trips: () =>
    require("../screens/Mobile/finances/travels/TravelsScreen").default,
  projects: () =>
    require("../screens/Mobile/finances/projects/ProjectsScreen").default,
  recurring: () =>
    require("../screens/Mobile/finances/RecurringTransactions/RecurringTransactionsScreen")
      .default,
  monthlyContributions: () =>
    require("../screens/Mobile/finances/MonthlyContributions/MonthlyContributionsScreen")
      .default,
  netWorth: () =>
    require("../screens/Mobile/finances/NetWorthScreen").default,
};

export function getPinnedModuleScreen(key: string): ComponentType<any> {
  const loader =
    PINNED_MODULE_SCREEN_LOADERS[key] ??
    PINNED_MODULE_SCREEN_LOADERS[DEFAULT_PINNED_MODULE_KEY];
  return loader();
}
