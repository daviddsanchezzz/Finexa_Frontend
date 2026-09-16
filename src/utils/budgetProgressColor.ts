import { colors } from "../theme/theme";

// Color de una barra de progreso de presupuesto según lo gastado: azul dentro
// de lo normal, ámbar cerca del límite (>=85%), rojo al llegar o pasarse (>=100%).
export function budgetProgressColor(progress: number): string {
  if (progress >= 1) return colors.error;
  if (progress >= 0.85) return colors.accent;
  return colors.primary;
}

// Color de un IMPORTE de gasto (texto, no barra): a diferencia de la barra,
// el estado normal no es azul — es el mismo neutro/oscuro que cualquier otra
// cifra. El rojo se reserva para cuando el límite ya está superado.
// undefined = deja que el que lo use aplique su color de texto por defecto.
// Nota: colors.accent (#F2C94C) es demasiado claro para texto sobre blanco —
// aquí se usa un ámbar más saturado, solo para esta función.
const SPENT_WARNING_COLOR = "#B45309";

export function budgetSpentTextColor(progress: number): string | undefined {
  if (progress >= 1) return colors.error;
  if (progress >= 0.85) return SPENT_WARNING_COLOR;
  return undefined;
}
