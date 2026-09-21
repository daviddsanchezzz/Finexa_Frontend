// Parser de importes que manda Apple Wallet / Atajos de iOS ("0,20 €",
// "CHF 15.50", "£8.99"...). Módulo puro: sin dependencias de React Native
// para poder testearlo aislado.
//
// OJO: el valor llega ya decodificado por URLSearchParams (el percent-encoding
// %C2%A0%E2%82%AC se convierte en " €"). No hay que hacer
// decodeURIComponent ni interpretar códigos %XX aquí.

export type ParsedWalletAmount = {
  amount: number;
  /** Código ISO 4217, o null si no se puede determinar de forma inequívoca. */
  currency: string | null;
  /** Si el símbolo es ambiguo ("$", "¥"...), monedas candidatas. */
  ambiguousCurrencies?: string[];
};

// Códigos ISO reconocidos cuando vienen escritos como texto ("CHF", "USD").
// Para añadir una moneda nueva: añadir el código aquí y, si tiene símbolo
// propio inequívoco, una entrada en UNAMBIGUOUS_SYMBOLS.
const KNOWN_CODES = new Set([
  'EUR', 'GBP', 'CHF', 'USD', 'CAD', 'AUD', 'NZD', 'JPY', 'CNY', 'PLN',
  'MXN', 'BRL', 'THB', 'TRY', 'MAD', 'CZK', 'SEK', 'NOK', 'DKK', 'HUF',
  'RON', 'BGN',
]);

// Símbolos que identifican UNA sola moneda (clave en minúsculas).
const UNAMBIGUOUS_SYMBOLS: Record<string, string> = {
  '€': 'EUR',
  '£': 'GBP',
  'zł': 'PLN',
  'kč': 'CZK',
  '₺': 'TRY',
  '฿': 'THB',
  'r$': 'BRL',
  'ft': 'HUF',
  'us$': 'USD',
  'ca$': 'CAD',
  'c$': 'CAD',
  'a$': 'AUD',
  'au$': 'AUD',
  'nz$': 'NZD',
};

// Símbolos AMBIGUOS: no se asume ninguna moneda (currency = null) y se
// devuelven los candidatos. Quien consuma el resultado decide el fallback.
const AMBIGUOUS_SYMBOLS: Record<string, string[]> = {
  '$': ['USD', 'CAD', 'AUD', 'NZD', 'MXN'],
  '¥': ['JPY', 'CNY'],
  '￥': ['JPY', 'CNY'],
  'kr': ['SEK', 'NOK', 'DKK'],
};

// Espacios "raros" que iOS/Wallet pueden usar: NBSP, narrow NBSP, thin space.
const ODD_SPACES = /[   ]/g;

// Primer bloque numérico: dígitos con separadores/espacios internos.
const NUMBER_RUN = /\d(?:[\d\s.,'’]*\d)?/;

function parseNumber(run: string): number | null {
  const compact = run.replace(/[\s'’]/g, '');
  const lastDot = compact.lastIndexOf('.');
  const lastComma = compact.lastIndexOf(',');
  let normalized: string;

  if (lastDot !== -1 && lastComma !== -1) {
    // Ambos presentes: el último es el decimal, el otro es de miles.
    const decimalSep = lastDot > lastComma ? '.' : ',';
    const thousandsSep = decimalSep === '.' ? ',' : '.';
    if (compact.split(decimalSep).length > 2) return null; // "1,2.3.4"
    normalized = compact.split(thousandsSep).join('').replace(decimalSep, '.');
  } else if (lastDot !== -1 || lastComma !== -1) {
    const sep = lastDot !== -1 ? '.' : ',';
    const parts = compact.split(sep);
    const isThousands =
      parts.length > 2 || // "1.234.567"
      (parts[1].length === 3 && parts[0].length >= 1 && parts[0].length <= 3 && parts[0] !== '0');
    if (isThousands) {
      // Todos los grupos tras el primero deben tener 3 dígitos.
      if (!parts.slice(1).every((g) => g.length === 3)) return null;
      normalized = parts.join('');
    } else {
      normalized = parts.join('.');
    }
  } else {
    normalized = compact;
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/**
 * Convierte el importe crudo de Wallet a { amount, currency }.
 * Devuelve null si no se puede interpretar (sin dígitos, formato inválido...).
 *
 * Nota sobre "1.234": con un único separador y exactamente 3 dígitos detrás
 * se interpreta como miles (1234), no como 1,234 — es la lectura más probable
 * en importes de tarjeta.
 */
export function parseWalletAmount(rawAmount: string | null | undefined): ParsedWalletAmount | null {
  if (typeof rawAmount !== 'string') return null;
  const s = rawAmount.replace(ODD_SPACES, ' ').trim();
  if (!s) return null;

  const match = NUMBER_RUN.exec(s);
  if (!match) return null;

  const amount = parseNumber(match[0]);
  if (amount === null) return null;

  // Lo que queda fuera del número es la moneda (antes o después).
  const token = (s.slice(0, match.index) + ' ' + s.slice(match.index + match[0].length))
    .replace(/[-+]/g, '')
    .trim();

  if (!token) return { amount, currency: null };

  const key = token.toLowerCase();
  if (UNAMBIGUOUS_SYMBOLS[key]) return { amount, currency: UNAMBIGUOUS_SYMBOLS[key] };

  const upper = token.toUpperCase();
  if (KNOWN_CODES.has(upper)) return { amount, currency: upper };

  if (AMBIGUOUS_SYMBOLS[key]) {
    return { amount, currency: null, ambiguousCurrencies: AMBIGUOUS_SYMBOLS[key] };
  }

  // Texto de moneda desconocido: no inventamos nada.
  return { amount, currency: null };
}
