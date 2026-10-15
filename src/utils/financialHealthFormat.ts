import { formatEuro } from "./currency";
import type { Grade, HealthMetric, HealthReport, Severity, Status } from "../types/financialHealth";

// Sin Intl / toLocaleString: en Hermes el soporte es parcial (ver utils/currency.ts).

/** 12,5 -> "12,5"; 12 -> "12" (sin ceros sobrantes). */
export function formatDecimal(n: number, decimals = 1): string {
  if (!Number.isFinite(n)) return "—";
  const fixed = Math.abs(n).toFixed(decimals);
  const trimmed = decimals > 0 ? fixed.replace(/\.?0+$/, "") : fixed;
  const sign = n < 0 && Number(fixed) !== 0 ? "-" : "";
  const [int, dec] = trimmed.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${grouped}${dec ? "," + dec : ""}`;
}

export function formatPercent(fraction: number, decimals = 0): string {
  return `${formatDecimal(fraction * 100, decimals)} %`;
}

/** 19,1 -> "19 años y 1 mes"; 0,4 -> "5 meses"; null -> "—". */
export function formatYears(years: number | null | undefined): string {
  if (years == null || !Number.isFinite(years)) return "—";
  const total = Math.round(Math.abs(years) * 12);
  const y = Math.floor(total / 12);
  const m = total % 12;
  const yPart = y > 0 ? `${y} ${y === 1 ? "año" : "años"}` : "";
  const mPart = m > 0 ? `${m} ${m === 1 ? "mes" : "meses"}` : "";
  if (yPart && mPart) return `${yPart} y ${mPart}`;
  return yPart || mPart || "0 meses";
}

export function formatMonths(months: number | null | undefined): string {
  if (months == null || !Number.isFinite(months)) return "—";
  return `${formatDecimal(months, 1)} ${Math.abs(months - 1) < 0.05 ? "mes" : "meses"}`;
}

export const GRADE_LABEL: Record<Grade, string> = {
  excelente: "Excelente",
  buena: "Buena",
  mejorable: "Mejorable",
  atencion: "Requiere atención",
};

export function gradeColor(grade: Grade | null | undefined): string {
  switch (grade) {
    case "excelente": return "#16A34A";
    case "buena": return "#65A30D";
    case "mejorable": return "#D97706";
    case "atencion": return "#DC2626";
    default: return "#9CA3AF";
  }
}

export function statusColor(status: Status): string {
  switch (status) {
    case "good": return "#16A34A";
    case "ok": return "#D97706";
    case "attention": return "#DC2626";
    default: return "#9CA3AF";
  }
}

export const STATUS_LABEL: Record<Status, string> = {
  good: "Bien",
  ok: "Aceptable",
  attention: "A mejorar",
  na: "Sin datos",
};

export const CONFIDENCE_LABEL = { alta: "Confianza alta", media: "Confianza media", baja: "Confianza baja" } as const;

export function severityStyle(sev: Severity): { icon: "alert-circle" | "bulb" | "information-circle"; color: string } {
  switch (sev) {
    case "warning": return { icon: "alert-circle", color: "#D97706" };
    case "tip": return { icon: "bulb", color: "#2563EB" };
    default: return { icon: "information-circle", color: "#64748B" };
  }
}

/** Valor legible de una métrica según su unidad. */
export function formatMetricValue(m: Pick<HealthMetric, "value" | "unit">): string {
  if (m.value == null) return "—";
  switch (m.unit) {
    case "percent": return formatPercent(m.value, m.value < 0.1 ? 1 : 0);
    case "months": return formatMonths(m.value);
    case "years": return formatYears(m.value);
    case "eur": return `${formatEuro(m.value)} €`;
    default: return formatDecimal(m.value, 0);
  }
}

/** Delta de años (escenario - base, como devuelve el backend): negativo = llegas antes, positivo = más tarde. */
export function formatYearsDelta(deltaYears: number | null | undefined): string {
  if (deltaYears == null || !Number.isFinite(deltaYears) || Math.abs(deltaYears) < 1 / 24) return "sin cambio";
  return `${formatYears(deltaYears)} ${deltaYears < 0 ? "antes" : "más tarde"}`;
}

/** Frase de una línea que más ayuda ahora: aviso > foco > primer consejo > palanca. */
export function healthHeadline(r: HealthReport): string {
  if (r.score == null) return "Registra al menos 2 meses de movimientos para calcularla.";
  const warning = r.insights.find((i) => i.severity === "warning");
  if (warning) return warning.title;
  if (r.focus) return `Para mejorar: ${r.focus.label.toLowerCase()}.`;
  if (r.insights[0]) return r.insights[0].title;
  const lever = r.levers[0];
  if (lever?.yearsSooner) return `${lever.label} adelantaría ${formatYears(lever.yearsSooner)} tu independencia financiera.`;
  return "Todo en orden. Sigue así.";
}
