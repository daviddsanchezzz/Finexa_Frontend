/**
 * Rentabilidad simple de un periodo (ratio, 0.05 => 5%):
 * (final - inicio - aportado) / (inicio + aportado) = profit / (inicio + aportado).
 */
export function simplePeriodReturn(
  profit: number,
  startValue: number | null | undefined,
  cashflowNet: number,
): number | null {
  const base = Number(startValue ?? 0) + Number(cashflowNet || 0);
  if (!Number.isFinite(base) || base <= 1e-9) return null;
  return profit / base;
}
