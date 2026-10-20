import { formatCurrency } from "./currency";

// Formato de las rentabilidades de las tarjetas de inversión (es-ES, sin Intl: Hermes no lo trae completo).

/** 0.1046 -> "+10,46 %"; -0.0738 -> "−7,38 %"; null/NaN -> "—". */
export function formatReturnPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const pct = Math.round(value * 10_000) / 100; // dos decimales, como porcentaje
  if (pct === 0) return "0,00 %";
  return `${pct > 0 ? "+" : "−"}${Math.abs(pct).toFixed(2).replace(".", ",")} %`;
}

export type ReturnTone = "up" | "down" | "flat";

/** Color semántico: verde / rojo / neutro (sin dato o exactamente 0). */
export function returnTone(value: number | null | undefined): ReturnTone {
  if (value == null || !Number.isFinite(value)) return "flat";
  const pct = Math.round(value * 10_000) / 100;
  return pct > 0 ? "up" : pct < 0 ? "down" : "flat";
}

/** Peso en cartera: 0.599 -> "59,9 %"; null -> "—". */
export function formatWeightPct(fraction: number | null | undefined): string {
  if (fraction == null || !Number.isFinite(fraction)) return "—";
  return `${(fraction * 100).toFixed(1).replace(".", ",")} %`;
}

/** 72.2237 -> "+72,22 €"; -60.7 -> "−60,70 €"; 0 -> "0,00 €"; null -> "—". Usa el formato de moneda de la app. */
export function formatSignedMoney(value: number | null | undefined, currency = "EUR"): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 100) / 100;
  if (rounded === 0) return formatCurrency(0, currency);
  return `${rounded > 0 ? "+" : "−"}${formatCurrency(Math.abs(rounded), currency)}`;
}

/** Como formatSignedMoney, pero desde 1.000 € sin céntimos (+10.199 €): cabe en columnas estrechas. */
export function formatCompactSignedMoney(value: number | null | undefined, currency = "EUR"): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (currency !== "EUR" || Math.abs(value) < 1000) return formatSignedMoney(value, currency);
  const int = Math.round(Math.abs(value)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${value > 0 ? "+" : "−"}${int} €`;
}

/** Color semántico de un importe (mismo criterio de redondeo que formatSignedMoney). */
export function amountTone(value: number | null | undefined): ReturnTone {
  if (value == null || !Number.isFinite(value)) return "flat";
  const rounded = Math.round(value * 100) / 100;
  return rounded > 0 ? "up" : rounded < 0 ? "down" : "flat";
}

export type ReturnMode = "pct" | "eur";
export const RETURN_MODE_KEY = "investments_return_mode";

/** Lo guardado en el almacenamiento -> modo válido ("pct" por defecto). */
export function parseReturnMode(raw: string | null | undefined): ReturnMode {
  return raw === "eur" ? "eur" : "pct";
}

const MONTHS_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "2026-10-14T00:00:00.000Z" -> "14 oct" (la fecha tal cual está guardada, sin desplazarla por zona horaria). */
export function formatDayMonth(iso: string | null | undefined): string {
  const m = typeof iso === "string" ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  if (!m) return "";
  return `${Number(m[3])} ${MONTHS_ES[Number(m[2]) - 1] ?? ""}`.trim();
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Día hábil anterior a `now` (sábados y domingos se saltan), como "YYYY-MM-DD" en hora local. */
export function previousBusinessDayKey(now: Date): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  do d.setDate(d.getDate() - 1);
  while (d.getDay() === 0 || d.getDay() === 6);
  return dayKey(d);
}

/**
 * ¿La última valoración va retrasada? Un fondo publica su valor liquidativo al día siguiente, así que lo
 * esperado es tener el del día hábil anterior: si la última valoración es anterior a ese día, se avisa.
 * Así un lunes con datos del viernes no se marca, y un dato de hace dos días hábiles sí.
 */
export function isStaleValuation(lastValuationIso: string | null | undefined, now: Date = new Date()): boolean {
  const m = typeof lastValuationIso === "string" ? /^(\d{4}-\d{2}-\d{2})/.exec(lastValuationIso) : null;
  if (!m) return false;
  return m[1] < previousBusinessDayKey(now);
}
