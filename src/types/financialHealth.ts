// Contrato de GET /financial-health (backend: modules/financial-health).

export type MetricKey = "runway" | "debt" | "savings" | "contributions" | "stability" | "fiPath" | "portfolio" | "goals";
export type PillarKey = "resilience" | "habits" | "growth" | "portfolio" | "goals";
export type Unit = "percent" | "months" | "years" | "eur" | "count";
export type Status = "good" | "ok" | "attention" | "na";
export type Grade = "excelente" | "buena" | "mejorable" | "atencion";
export type Confidence = "alta" | "media" | "baja";
export type Severity = "info" | "tip" | "warning";
export type IncomeType = "salaried" | "variable" | "self_employed" | "student" | "other";

export interface HealthMetric {
  key: MetricKey;
  label: string;
  pillar: PillarKey;
  weight: number;
  score: number | null;
  value: number | null;
  unit: Unit;
  target: number | null;
  status: Status;
  summary: string;
  assumption: string | null;
}

export interface HealthPillar {
  key: PillarKey;
  label: string;
  weight: number;
  score: number | null;
}

export interface HealthInsight {
  id: string;
  severity: Severity;
  title: string;
  body: string;
  amount: number | null;
}

export interface HealthLever {
  id: string;
  label: string;
  monthlyImpact: number;
  yearsSooner: number | null;
}

export interface FiProjection {
  capital: number;
  annualExpense: number;
  target: number;
  targetMultiple: number;
  progressPct: number;
  monthsCovered: number | null;
  monthlySavings: number;
  realReturnPct: number;
  yearsToFi: number | null;
  reached: boolean;
}

export interface HealthHistoryPoint {
  key: string; // YYYY-MM
  income: number;
  expense: number;
  savingsRate: number | null;
  investmentContribution: number;
  partial: boolean;
}

export interface FinancialProfile {
  birthYear: number | null;
  incomeType: IncomeType | null;
  dependents: number | null;
  riskTolerance: number | null;
  emergencyMonthsTarget: number | null;
  fiTargetMultiple: number | null;
  fiTargetAge: number | null;
  expectedRealReturnPct: number | null;
  completeness?: number;
}

export interface HealthReport {
  score: number | null;
  grade: Grade | null;
  confidence: Confidence;
  monthsUsed: number;
  pillars: HealthPillar[];
  metrics: HealthMetric[];
  focus: { metric: MetricKey; label: string; reason: string } | null;
  insights: HealthInsight[];
  fi: FiProjection | null;
  levers: HealthLever[];
  assumptions: string[];
  currency: string;
  history: HealthHistoryPoint[];
  profile: FinancialProfile & { completeness: number };
  generatedAt: string;
}

export interface ScenarioBody {
  extraMonthlySavings?: number;
  oneOffExpense?: number;
  extraMonthlyInvestment?: number;
}

export interface ScenarioSnapshot {
  score: number | null;
  runwayMonths: number | null;
  yearsToFi: number | null;
  monthlySavings: number | null;
}

export interface ScenarioResult {
  baseline: ScenarioSnapshot;
  scenario: ScenarioSnapshot;
  delta: { score: number | null; runwayMonths: number | null; yearsToFi: number | null };
  currency: string;
}
