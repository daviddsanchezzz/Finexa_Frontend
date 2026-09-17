export type GoalTrackingMode = 'MANUAL' | 'ALLOCATIONS' | 'WALLET_BALANCE';
export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export interface GoalWallet {
  id: number;
  name: string;
  emoji?: string | null;
  currency: string;
  balance: number;
}
export interface GoalWalletAvailability extends GoalWallet {
  eligibleBalance: number;
  allocatedAmount: number;
  availableToAllocate: number;
  overAllocated: number;
  fullyLinked: boolean;
  linkedGoal: { id: number; name: string } | null;
}
export interface GoalManualEntry {
  id: number;
  goalId: number;
  amount: number;
  date: string;
  note?: string | null;
  createdAt: string;
}
export interface GoalAllocation {
  id: number;
  walletId: number;
  amount: number;
  wallet: GoalWallet;
  overAllocated: number;
}
export interface Goal {
  id: number;
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  currency: string;
  trackingMode: GoalTrackingMode;
  status: GoalStatus;
  startDate: string;
  targetDate: string | null;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  excessAmount: number;
  progressPercentage: number;
  displayProgress: number;
  reached: boolean;
  overdue: boolean;
  daysRemaining: number | null;
  requiredMonthlyContribution: number | null;
  linkedWallet: GoalWallet | null;
  linkedWalletId: number | null;
  allocations: GoalAllocation[];
  manualEntries: GoalManualEntry[];
}
export interface GoalSummary {
  currency: string;
  totalSaved: number;
  totalTarget: number;
  totalRemaining: number;
  activeCount: number;
  globalProgress: number;
  displayProgress: number;
}
export interface GoalsOverview { goals: Goal[]; summaries: GoalSummary[] }
