export interface HealthScoreInput {
  totalIncome: number;
  totalExpense: number;
  budgets: { limit: number; spent: number }[];
  activeDebts: { totalAmount: number; remainingAmount: number }[];
  hasInvestments: boolean;
  emergencyFundMonths: number;
}

export interface HealthScoreResult {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  label: string;
  color: string;
  breakdown: {
    savingsRate: number;
    budgetAdherence: number;
    debtRatio: number;
    investmentPresence: number;
    emergencyFund: number;
  };
}

export function computeHealthScore(input: HealthScoreInput): HealthScoreResult {
  const {
    totalIncome,
    totalExpense,
    budgets,
    activeDebts,
    hasInvestments,
    emergencyFundMonths,
  } = input;

  // 1. Savings rate (30 pts) — target ≥ 20%
  let savingsRate = 0;
  if (totalIncome > 0) {
    const rate = (totalIncome - totalExpense) / totalIncome;
    savingsRate = Math.min(30, Math.max(0, (rate / 0.2) * 30));
  }

  // 2. Budget adherence (25 pts) — avg % of budgets not overspent
  let budgetAdherence = 25;
  if (budgets.length > 0) {
    const avgProgress =
      budgets.reduce((acc, b) => acc + Math.min(b.spent / (b.limit || 1), 1), 0) /
      budgets.length;
    budgetAdherence = Math.round((1 - Math.max(0, avgProgress - 1)) * 25);
    budgetAdherence = Math.min(25, Math.max(0, budgetAdherence));
  }

  // 3. Debt ratio (20 pts) — lower remaining/total is better
  let debtRatio = 20;
  if (activeDebts.length > 0) {
    const totalDebt = activeDebts.reduce((s, d) => s + d.totalAmount, 0);
    const totalRemaining = activeDebts.reduce((s, d) => s + d.remainingAmount, 0);
    const ratio = totalDebt > 0 ? totalRemaining / totalDebt : 0;
    debtRatio = Math.round((1 - ratio) * 20);
  }

  // 4. Investment presence (15 pts) — binary
  const investmentPresence = hasInvestments ? 15 : 0;

  // 5. Emergency fund (10 pts) — target 3 months
  const emergencyFund = Math.min(10, Math.round((emergencyFundMonths / 3) * 10));

  const score = Math.round(
    savingsRate + budgetAdherence + debtRatio + investmentPresence + emergencyFund
  );

  let grade: HealthScoreResult["grade"];
  let label: string;
  let color: string;

  if (score >= 85) { grade = "A"; label = "Excelente"; color = "#16A34A"; }
  else if (score >= 70) { grade = "B"; label = "Bueno"; color = "#2563EB"; }
  else if (score >= 55) { grade = "C"; label = "Regular"; color = "#D97706"; }
  else if (score >= 40) { grade = "D"; label = "Mejorable"; color = "#EA580C"; }
  else { grade = "F"; label = "Crítico"; color = "#DC2626"; }

  return {
    score,
    grade,
    label,
    color,
    breakdown: {
      savingsRate: Math.round(savingsRate),
      budgetAdherence: Math.round(budgetAdherence),
      debtRatio: Math.round(debtRatio),
      investmentPresence,
      emergencyFund,
    },
  };
}
