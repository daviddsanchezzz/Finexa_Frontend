import { Ionicons } from "@expo/vector-icons";

export interface FinanceModule {
  key: string;
  title: string;
  subtitle: string;
  emoji: string;
  iconName: keyof typeof Ionicons.glyphMap;
  routeName: string;
  accentColor: string;
  softBg: string;
}

export type ModuleConfig = {
  key: string;
  enabled: boolean;
  order: number;
};

export const STORAGE_KEY = "finances.modules.config.v1";

export const MODULES: FinanceModule[] = [
  {
    key: "budgets",
    title: "Presupuestos",
    subtitle: "Limita y controla tus gastos por categoría.",
    emoji: "📊",
    iconName: "wallet-outline",
    routeName: "Budgets",
    accentColor: "#6366F1",
    softBg: "#EEF2FF",
  },
  {
    key: "goals",
    title: "Objetivos",
    subtitle: "Ahorra para lo que más te importa.",
    emoji: "🎯",
    iconName: "flag-outline",
    routeName: "Goals",
    accentColor: "#F97316",
    softBg: "#FFF7ED",
  },
  {
    key: "debts",
    title: "Deudas",
    subtitle: "Controla préstamos, cuotas y pagos pendientes.",
    emoji: "💸",
    iconName: "card-outline",
    routeName: "Debts",
    accentColor: "#EF4444",
    softBg: "#FEF2F2",
  },
  {
    key: "trips",
    title: "Viajes",
    subtitle: "Agrupa y analiza los gastos de viajes.",
    emoji: "✈️",
    iconName: "airplane-outline",
    routeName: "Trips",
    accentColor: "#0EA5E9",
    softBg: "#E0F2FE",
  },
  {
    key: "projects",
    title: "Proyectos",
    subtitle: "Controla ingresos, gastos y balance por proyecto.",
    emoji: "🧩",
    iconName: "briefcase-outline",
    routeName: "Projects",
    accentColor: "#14B8A6",
    softBg: "#E6FFFB",
  },
  {
    key: "recurring",
    title: "Transacciones recurrentes",
    subtitle: "Gestiona pagos programados y sus próximas ejecuciones.",
    emoji: "🔁",
    iconName: "repeat-outline",
    routeName: "RecurringTransactions",
    accentColor: "#A855F7",
    softBg: "#F3E8FF",
  },
  {
    key: "monthlyContributions",
    title: "Aportaciones mensuales",
    subtitle: "Planifica cuánto aportas cada mes a tus objetivos e inversión.",
    emoji: "🗓️",
    iconName: "calendar-outline",
    routeName: "MonthlyContributions",
    accentColor: "#14B8A6",
    softBg: "#E6FFFB",
  },
  {
    key: "netWorth",
    title: "Patrimonio neto",
    subtitle: "Visualiza activos, pasivos y tu riqueza neta en tiempo real.",
    emoji: "🏦",
    iconName: "analytics-outline",
    routeName: "NetWorth",
    accentColor: "#7C3AED",
    softBg: "#EDE9FE",
  },
];

export const buildDefaultConfig = (): ModuleConfig[] =>
  MODULES.map((m, i) => ({ key: m.key, enabled: true, order: i }));

export const mergeConfig = (saved: ModuleConfig[] | null): ModuleConfig[] => {
  const defaults = buildDefaultConfig();
  const map = new Map(saved?.map((c) => [c.key, c]));
  return defaults
    .map((d) => ({ ...d, ...(map.get(d.key) || {}) }))
    .sort((a, b) => a.order - b.order)
    .map((c, i) => ({ ...c, order: i }));
};
