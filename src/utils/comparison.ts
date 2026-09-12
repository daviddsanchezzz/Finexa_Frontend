import { formatEuro as formatEuroBase } from "./currency";

// Única fuente de verdad para comparar un valor con el periodo anterior en
// toda la sección de Estadísticas (Resumen, Gastos, Ingresos, Evolución).
//
// Reglas fijas — nunca las invierte según la métrica:
//   diferencia = valorActual - valorAnterior
//   variación% = (diferencia / valorAnterior) * 100
//
// El SIGNO/FLECHA reflejan siempre esa resta matemática tal cual. El COLOR
// (isPositiveForUser) es la única pieza que depende del tipo de métrica:
// para gastos, bajar es favorable (verde) aunque el signo sea negativo.

export type MetricType = "income" | "expense" | "savings";
export type ComparisonDirection = "up" | "down" | "neutral";

export interface Comparison {
  difference: number; // valorActual - valorAnterior, con signo real (sin redondear)
  percentage: number | null; // variación %, con signo real; null cuando no es calculable (mes anterior = 0 y actual != 0)
  direction: ComparisonDirection;
  isPositiveForUser: boolean; // true = favorable → verde; false = desfavorable → rojo
  isNew: boolean; // mes anterior era 0 y el actual no (variación no representable en %)
  formattedDifference: string; // "+123,45 €" | "−123,45 €" | "0,00 €"
  formattedPercentage: string; // "16%" | "0%" | "Nuevo"
}

// Por debajo de esto se considera "igual" — evita el clásico "-0,00 €" de
// floating point y variaciones de una fracción de céntimo sin sentido.
const EPSILON = 0.005;

export function getComparison(currentValue: number, previousValue: number, metricType: MetricType): Comparison {
  const rawDifference = currentValue - previousValue;
  const difference = Math.abs(rawDifference) < EPSILON ? 0 : rawDifference;

  const direction: ComparisonDirection = difference > 0 ? "up" : difference < 0 ? "down" : "neutral";

  // Para gastos la subida es desfavorable y la bajada favorable; para
  // ingresos y ahorro, al revés. El signo mostrado NUNCA se toca por esto.
  const worseWhenUp = metricType === "expense";
  const isPositiveForUser = direction === "neutral" ? true : worseWhenUp ? direction === "down" : direction === "up";

  const isNew = previousValue === 0 && currentValue !== 0;
  let percentage: number | null;
  if (previousValue === 0) {
    percentage = currentValue === 0 ? 0 : null;
  } else {
    const rawPct = (rawDifference / previousValue) * 100;
    percentage = Math.abs(rawPct) < EPSILON ? 0 : rawPct;
  }

  const sign = difference > 0 ? "+" : difference < 0 ? "−" : "";
  const formattedDifference = `${sign}${formatEuroBase(Math.abs(difference))} €`;
  const formattedPercentage = percentage == null ? "Nuevo" : `${Math.abs(percentage).toFixed(0)}%`;

  return { difference, percentage, direction, isPositiveForUser, isNew, formattedDifference, formattedPercentage };
}
