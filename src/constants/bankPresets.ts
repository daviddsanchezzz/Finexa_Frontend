// Bancos y fintechs comunes en España, ofrecidos como plantillas rápidas al
// crear una cartera: elegir una rellena nombre + logo (ambos editables
// después). El logo se resuelve por dominio contra un servicio externo de
// logos de empresa — no alojamos ni distribuimos los logos nosotros mismos.
export interface BankPreset {
  key: string;
  name: string;
  domain: string;
  color: string; // usado como acento/fondo del fallback si el logo no carga
}

export const BANK_PRESETS: BankPreset[] = [
  // Bancos tradicionales
  { key: "santander", name: "Santander", domain: "santander.com", color: "#EC0000" },
  { key: "bbva", name: "BBVA", domain: "bbva.com", color: "#072146" },
  { key: "caixabank", name: "CaixaBank", domain: "caixabank.com", color: "#0A5EB0" },
  { key: "sabadell", name: "Banco Sabadell", domain: "bancsabadell.com", color: "#1973B8" },
  { key: "bankinter", name: "Bankinter", domain: "bankinter.com", color: "#F37021" },
  { key: "ing", name: "ING", domain: "ing.es", color: "#FF6600" },
  { key: "unicaja", name: "Unicaja Banco", domain: "unicajabanco.es", color: "#00A19A" },
  { key: "abanca", name: "Abanca", domain: "abanca.com", color: "#0BA85D" },
  { key: "kutxabank", name: "Kutxabank", domain: "kutxabank.com", color: "#E2001A" },
  { key: "ibercaja", name: "Ibercaja", domain: "ibercaja.es", color: "#0066B3" },
  // Neobancos / fintech
  { key: "revolut", name: "Revolut", domain: "revolut.com", color: "#0666EB" },
  { key: "n26", name: "N26", domain: "n26.com", color: "#36A18B" },
  { key: "traderepublic", name: "Trade Republic", domain: "traderepublic.com", color: "#000000" },
  { key: "myinvestor", name: "MyInvestor", domain: "myinvestor.es", color: "#00C1B2" },
  // evobanco.com no tiene favicon/logo indexado en el servicio de logos —
  // se mostrará el icono neutro de fallback hasta que exista uno.
  { key: "evobanco", name: "EVO Banco", domain: "evobanco.com", color: "#FF4713" },
  { key: "openbank", name: "Openbank", domain: "openbank.es", color: "#E4032E" },
  { key: "vivid", name: "Vivid Money", domain: "vivid.money", color: "#000000" },
  { key: "wise", name: "Wise", domain: "wise.com", color: "#9FE870" },
  // Otros métodos comunes
  { key: "paypal", name: "PayPal", domain: "paypal.com", color: "#003087" },
];

export function getBankLogoUrl(domain: string): string {
  // logo.clearbit.com's public logo endpoint is no longer reachable
  // (verified: DNS no longer resolves) — unavatar.io aggregates several
  // logo sources with its own fallback and is verified working here.
  return `https://unavatar.io/${domain}`;
}

// Las 10 criptomonedas más usadas por capitalización/uso, ofrecidas como
// plantillas igual que los bancos: elegir una rellena nombre + logo.
export interface CryptoPreset {
  key: string;
  name: string;
  symbol: string; // ticker en minúsculas, usado para resolver el icono
  color: string;
}

export const CRYPTO_PRESETS: CryptoPreset[] = [
  { key: "btc", name: "Bitcoin", symbol: "btc", color: "#F7931A" },
  { key: "eth", name: "Ethereum", symbol: "eth", color: "#627EEA" },
  { key: "usdt", name: "Tether (USDT)", symbol: "usdt", color: "#26A17B" },
  { key: "bnb", name: "BNB", symbol: "bnb", color: "#F3BA2F" },
  { key: "sol", name: "Solana", symbol: "sol", color: "#14F195" },
  { key: "usdc", name: "USD Coin (USDC)", symbol: "usdc", color: "#2775CA" },
  { key: "xrp", name: "XRP", symbol: "xrp", color: "#23292F" },
  { key: "doge", name: "Dogecoin", symbol: "doge", color: "#C2A633" },
  { key: "ada", name: "Cardano", symbol: "ada", color: "#0D1E30" },
  { key: "trx", name: "TRON", symbol: "trx", color: "#EB0029" },
];

export function getCryptoLogoUrl(symbol: string): string {
  // Set de iconos de criptomonedas de código abierto (spothq/cryptocurrency-icons),
  // verificado: las 10 URLs de este preset devuelven un icono real.
  return `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${symbol}.png`;
}

// Busca un preset de criptomoneda por símbolo (ej. el campo "Símbolo" de una
// inversión tipo Crypto) para poder mostrar su logo real en vez de un icono
// genérico, sin necesidad de guardar nada nuevo en el activo.
export function findCryptoPresetBySymbol(symbol?: string | null): CryptoPreset | undefined {
  if (!symbol) return undefined;
  const s = symbol.trim().toLowerCase();
  return CRYPTO_PRESETS.find((p) => p.symbol === s);
}

// Reconoce si un valor guardado en el campo "emoji" de una cartera es en
// realidad una URL de logo (en vez de un emoji de verdad).
export function isLogoUrl(value?: string | null): value is string {
  return !!value && /^https?:\/\//.test(value);
}
