import type { FinancialProfile, IncomeType, ScenarioBody } from "../types/financialHealth";

export const INCOME_TYPE_OPTIONS: { value: IncomeType; label: string }[] = [
  { value: "salaried", label: "Nómina" },
  { value: "variable", label: "Variable" },
  { value: "self_employed", label: "Autónomo" },
  { value: "student", label: "Estudiante" },
  { value: "other", label: "Otro" },
];

export const RISK_LABELS = ["Muy prudente", "Prudente", "Equilibrado", "Dinámico", "Muy agresivo"] as const;

/** Estado del formulario: todo como texto para poder escribirlo a medias. */
export interface ProfileFormState {
  birthYear: string;
  incomeType: IncomeType | null;
  dependents: string;
  riskTolerance: number | null;
  emergencyMonthsTarget: string;
  fiTargetAge: string;
  fiTargetMultiple: string;
  expectedRealReturnPct: string;
}

export const EMPTY_PROFILE_FORM: ProfileFormState = {
  birthYear: "",
  incomeType: null,
  dependents: "",
  riskTolerance: null,
  emergencyMonthsTarget: "",
  fiTargetAge: "",
  fiTargetMultiple: "",
  expectedRealReturnPct: "",
};

const s = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","));

export function profileToForm(p: Partial<FinancialProfile> | null | undefined): ProfileFormState {
  if (!p) return EMPTY_PROFILE_FORM;
  return {
    birthYear: s(p.birthYear),
    incomeType: p.incomeType ?? null,
    dependents: s(p.dependents),
    riskTolerance: p.riskTolerance ?? null,
    emergencyMonthsTarget: s(p.emergencyMonthsTarget),
    fiTargetAge: s(p.fiTargetAge),
    fiTargetMultiple: s(p.fiTargetMultiple),
    expectedRealReturnPct: s(p.expectedRealReturnPct),
  };
}

/** "1.234,5" / "12,5" / "12.5" -> número; vacío o inválido -> null. */
export function parseNumber(text: string): number | null {
  const t = text.trim().replace(/\s/g, "").replace("€", "").replace("%", "");
  if (!t) return null;
  // "1.234,5" -> 1234.5 ; "12.5" -> 12.5 (un solo punto con 1-2 decimales se toma como decimal)
  const normalized = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : /^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, "") : t;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

type FieldRule = { key: keyof ProfileFormState; label: string; min: number; max: number; integer: boolean };

const THIS_YEAR = () => new Date().getFullYear();

function rules(): FieldRule[] {
  return [
    { key: "birthYear", label: "Año de nacimiento", min: 1900, max: THIS_YEAR(), integer: true },
    { key: "dependents", label: "Personas a cargo", min: 0, max: 20, integer: true },
    { key: "emergencyMonthsTarget", label: "Meses de colchón", min: 1, max: 60, integer: true },
    { key: "fiTargetAge", label: "Edad objetivo", min: 18, max: 100, integer: true },
    { key: "fiTargetMultiple", label: "Veces el gasto anual", min: 5, max: 100, integer: true },
    { key: "expectedRealReturnPct", label: "Rentabilidad real", min: 0, max: 15, integer: false },
  ];
}

export interface ParsedProfile {
  body: Record<string, number | string | null>;
  errors: Partial<Record<keyof ProfileFormState, string>>;
}

/**
 * Convierte el formulario al cuerpo del PUT. Todos los campos se envían: los
 * vacíos van como null para BORRAR el valor guardado (el backend solo toca los
 * campos que recibe). Misma validación de rangos que el backend.
 */
export function parseProfileForm(form: ProfileFormState): ParsedProfile {
  const body: ParsedProfile["body"] = {
    incomeType: form.incomeType,
    riskTolerance: form.riskTolerance,
  };
  const errors: ParsedProfile["errors"] = {};
  for (const r of rules()) {
    const raw = form[r.key] as string;
    if (!raw.trim()) {
      body[r.key] = null;
      continue;
    }
    const n = parseNumber(raw);
    if (n == null) errors[r.key] = `${r.label}: introduce un número.`;
    else if (r.integer && !Number.isInteger(n)) errors[r.key] = `${r.label}: debe ser un número entero.`;
    else if (n < r.min || n > r.max) errors[r.key] = `${r.label}: entre ${r.min} y ${r.max}.`;
    else body[r.key] = r.integer ? n : Math.round(n * 100) / 100;
  }
  return { body, errors };
}

export interface ParsedScenario {
  body: ScenarioBody;
  error: string | null;
}

const MAX_SIM = 10_000_000;

/** Entradas del simulador: vacío = 0 (no aplica); negativas o enormes se rechazan. */
export function parseScenarioForm(extraMonthlySavings: string, oneOffExpense: string): ParsedScenario {
  const a = extraMonthlySavings.trim() ? parseNumber(extraMonthlySavings) : 0;
  const b = oneOffExpense.trim() ? parseNumber(oneOffExpense) : 0;
  if (a == null || b == null) return { body: {}, error: "Introduce importes válidos." };
  if (a < 0 || b < 0) return { body: {}, error: "Los importes no pueden ser negativos." };
  if (a > MAX_SIM || b > MAX_SIM) return { body: {}, error: "El importe es demasiado grande." };
  if (a === 0 && b === 0) return { body: {}, error: "Indica al menos un cambio para simular." };
  const body: ScenarioBody = {};
  if (a > 0) body.extraMonthlySavings = a;
  if (b > 0) body.oneOffExpense = b;
  return { body, error: null };
}
