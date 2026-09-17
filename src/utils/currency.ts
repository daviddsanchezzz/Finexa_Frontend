// Formato de número monetario único para toda la app: separador de miles "."
// y decimales ",", ej. 1234.5 -> "1.234,50".
//
// No usamos Number.prototype.toLocaleString: en Hermes/React Native el
// soporte de Intl suele ser parcial y el agrupador de miles no siempre se
// aplica en dispositivo real, aunque en un navegador o el simulador sí lo
// haga — así que ese método puede parecer correcto en desarrollo y fallar
// en producción.
export function formatEuro(n: number): string {
  if (!Number.isFinite(n)) return "0,00";
  const abs = Math.abs(n).toFixed(2);
  // Evita "-0,00": un valor que redondea a cero (p.ej. restas encadenadas con
  // porcentajes periódicos como 33,33...%) no debe mostrar signo negativo.
  const sign = n < 0 && Number(abs) !== 0 ? "-" : "";
  const [intPart, decPart] = abs.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${grouped},${decPart}`;
}

// Color verde/rojo según signo, pero tratando como neutro cualquier valor que
// redondee a 0,00 — mismo motivo que formatEuro: sin esto, un "0,00 €"
// producido por coma flotante se pintaría de rojo aunque no sea una pérdida.
export function signColor(value: number, positive: string, negative: string, neutral: string): string {
  const rounded = Math.round(value * 100) / 100;
  if (rounded === 0) return neutral;
  return rounded > 0 ? positive : negative;
}

// Igual que formatEuro pero siempre antepone "+"/"-" (para deltas/variaciones).
export function formatEuroSigned(n: number): string {
  const sign = n < 0 ? "-" : "+";
  return `${sign}${formatEuro(Math.abs(n))}`;
}

// Entero agrupado sin decimales ni "€" — para ejes de gráficas y etiquetas
// compactas donde el símbolo de moneda y los decimales sobran.
export function formatEuroInt(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const sign = n < 0 ? "-" : "";
  const grouped = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${grouped}`;
}
