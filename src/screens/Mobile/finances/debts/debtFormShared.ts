import { Ionicons } from "@expo/vector-icons";

type IoniconName = keyof typeof Ionicons.glyphMap;

export type DebtType = "loan" | "mortgage" | "credit_card" | "personal" | "other";
export type DebtFrequency = "weekly" | "monthly" | "quarterly" | "yearly";

export const DEBT_TYPE_OPTIONS: { value: DebtType; label: string; icon: IoniconName }[] = [
  { value: "loan", label: "Préstamo", icon: "cash-outline" },
  { value: "mortgage", label: "Hipoteca", icon: "home-outline" },
  { value: "credit_card", label: "Tarjeta", icon: "card-outline" },
  { value: "personal", label: "Personal", icon: "person-outline" },
  { value: "other", label: "Otro", icon: "ellipsis-horizontal-outline" },
];

export const DEBT_FREQUENCY_OPTIONS: { value: DebtFrequency; label: string }[] = [
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensual" },
  { value: "quarterly", label: "Trimestral" },
  { value: "yearly", label: "Anual" },
];

export const toNumberOrNull = (text: string): number | null => {
  if (!text || !text.trim()) return null;
  const n = Number(text.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
