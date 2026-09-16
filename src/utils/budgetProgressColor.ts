import { colors } from "../theme/theme";

// Color de una barra de progreso de presupuesto según lo gastado: azul dentro
// de lo normal, ámbar cerca del límite (>=85%), rojo al llegar o pasarse (>=100%).
export function budgetProgressColor(progress: number): string {
  if (progress >= 1) return colors.error;
  if (progress >= 0.85) return colors.accent;
  return colors.primary;
}
