import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEY = "exchange_rates_eur";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

interface RatesCache {
  ts: number;
  rates: Record<string, number>; // rates relative to EUR (1 EUR = X currency)
}

async function fetchRates(): Promise<Record<string, number>> {
  const res = await fetch("https://open.er-api.com/v6/latest/EUR");
  const json = await res.json();
  if (json.result !== "success") throw new Error("Exchange rate fetch failed");
  return json.rates as Record<string, number>;
}

async function getRates(): Promise<Record<string, number>> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed: RatesCache = JSON.parse(cached);
      if (Date.now() - parsed.ts < CACHE_TTL) return parsed.rates;
    }
  } catch {}

  const rates = await fetchRates();
  try {
    const cache: RatesCache = { ts: Date.now(), rates };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
  return rates;
}

/**
 * Convert amount from sourceCurrency to EUR.
 * Returns null if conversion is not possible (unknown currency, network error).
 */
export async function toEur(amount: number, sourceCurrency: string): Promise<number | null> {
  if (!sourceCurrency || sourceCurrency.toUpperCase() === "EUR") return amount;
  try {
    const rates = await getRates();
    const rate = rates[sourceCurrency.toUpperCase()];
    if (!rate) return null;
    return amount / rate;
  } catch {
    return null;
  }
}

/** Synchronously convert using cached rates — returns null if no cache available */
let _cachedRates: Record<string, number> | null = null;

export function toEurSync(amount: number, sourceCurrency: string): number | null {
  if (!sourceCurrency || sourceCurrency.toUpperCase() === "EUR") return amount;
  if (!_cachedRates) return null;
  const rate = _cachedRates[sourceCurrency.toUpperCase()];
  if (!rate) return null;
  return amount / rate;
}

export async function preloadRates(): Promise<void> {
  try {
    _cachedRates = await getRates();
  } catch {}
}

export const COMMON_CURRENCIES = [
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "USD", symbol: "$", label: "Dólar" },
  { code: "GBP", symbol: "£", label: "Libra" },
  { code: "JPY", symbol: "¥", label: "Yen" },
  { code: "CHF", symbol: "CHF", label: "Franco suizo" },
  { code: "MXN", symbol: "$", label: "Peso mex." },
  { code: "BRL", symbol: "R$", label: "Real" },
  { code: "CAD", symbol: "CA$", label: "Dólar can." },
  { code: "AUD", symbol: "A$", label: "Dólar aus." },
  { code: "THB", symbol: "฿", label: "Baht" },
  { code: "TRY", symbol: "₺", label: "Lira" },
  { code: "MAD", symbol: "د.م.", label: "Dírham mar." },
  { code: "CZK", symbol: "Kč", label: "Corona checa" },
  { code: "PLN", symbol: "zł", label: "Esloti" },
  { code: "SEK", symbol: "kr", label: "Corona sueca" },
  { code: "NOK", symbol: "kr", label: "Corona noruega" },
  { code: "DKK", symbol: "kr", label: "Corona danesa" },
  { code: "HUF", symbol: "Ft", label: "Forinto" },
  { code: "RON", symbol: "lei", label: "Leu rumano" },
  { code: "BGN", symbol: "лв", label: "Lev búlgaro" },
];
