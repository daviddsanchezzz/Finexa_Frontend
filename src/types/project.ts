// Tipos compartidos del módulo de Proyectos. Antes vivían duplicados e
// inconsistentes dentro de ProjectsScreen/ProjectDetailScreen/ProjectFormScreen;
// se centralizan aquí las partes que ambas pantallas necesitan (financials,
// socios, status) para que no puedan desincronizarse.

export type ProjectStatus = 'idea' | 'active' | 'paused' | 'completed' | 'cancelled';

export type ProjectMovementKind = 'income' | 'expense' | 'contribution' | 'withdrawal';

export interface ProjectFinancials {
  transactionsIncome: number;
  transactionsExpense: number;
  manualIncome: number;
  manualExpense: number;
  income: number;
  expense: number;
  result: number;
  contributions: number;
  withdrawals: number;
  withdrawalsProfit: number;
  withdrawalsCapital: number;
  cash: number;
  myPercentage: number;
  myProfit: number;
  myWithdrawnProfit: number;
  myCapitalContributed: number;
  myCapitalReturned: number;
  myPending: number;
}

export interface ProjectPartner {
  id: number;
  name: string;
  percentage: number;
  isMe: boolean;
  contributed: number;
  withdrawnProfit: number;
  capitalReturned: number;
}

export interface ProjectTransaction {
  id: number;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description?: string | null;
  date?: string | null;
  projectId?: number | null;
}

export interface ProjectManualEntry {
  id: number;
  kind: ProjectMovementKind;
  isCapitalReturn: boolean;
  title: string;
  description?: string | null;
  amount: number;
  date: string;
  category?: string | null;
  notes?: string | null;
  partnerId?: number | null;
}

export interface ProjectListItem {
  id: number;
  name: string;
  description?: string | null;
  type?: string | null;
  status: ProjectStatus;
  startDate: string;
  endDate?: string | null;
  notes?: string | null;
  financials: ProjectFinancials;
}

export interface ProjectDetail extends ProjectListItem {
  transactions: ProjectTransaction[];
  manualEntries: ProjectManualEntry[];
  partners: ProjectPartner[];
}
