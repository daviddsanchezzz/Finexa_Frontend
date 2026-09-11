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
  const sign = n < 0 ? "-" : "";
  const [intPart, decPart] = Math.abs(n).toFixed(2).split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${grouped},${decPart}`;
}

// Igual que formatEuro pero siempre antepone "+"/"-" (para deltas/variaciones).
export function formatEuroSigned(n: number): string {
  const sign = n < 0 ? "-" : "+";
  return `${sign}${formatEuro(Math.abs(n))}`;
}
