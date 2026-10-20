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
