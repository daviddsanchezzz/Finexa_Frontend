import { COMMON_CURRENCIES } from "./exchangeRate";

// Monedas que no usan decimales. Añadir una es una línea aquí.
const ZERO_DECIMAL_CURRENCIES = new Set(["JPY"]);

function currencySymbolFor(code: string): string {
  return COMMON_CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

// Formato de moneda genérico, para cualquier ISO 4217. Símbolo detrás del
// número, con espacio ("1.234,50 €", nunca "€1.234,50"), igual que el resto
// de la UI. Reutiliza el mismo agrupador manual que formatEuro (ver su
// comentario: no usamos Intl.NumberFormat porque en Hermes/React Native su
// soporte es parcial y el agrupador de miles no siempre se aplica en
// dispositivo real). `locale` queda en la firma para uso futuro, pero hoy
// solo se implementa el formato es-ES que ya usa toda la app.
export function formatCurrency(amount: number, currency: string, locale = "es-ES"): string {
  if (!Number.isFinite(amount)) amount = 0;
  const decimals = ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2;
  const abs = Math.abs(amount).toFixed(decimals);
  const sign = amount < 0 && Number(abs) !== 0 ? "-" : "";
  const [intPart, decPart] = abs.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const number = decPart ? `${grouped},${decPart}` : grouped;
  return `${sign}${number} ${currencySymbolFor(currency)}`;
}

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
