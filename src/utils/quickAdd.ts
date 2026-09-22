import api from "../api/api";
import { parseWalletAmount } from "./walletAmount";

const SESSION_KEY = 'finexa_quick_add';

// currency: ISO 4217 detectada en el importe de Wallet, o null/undefined si no
// se pudo determinar (p.ej. "$" es ambiguo: USD/CAD/AUD...). Solo se usa para
// preseleccionar la divisa en el formulario; no se persiste en la transacción.
export type QuickAddParams = { amount: number; currency?: string | null; merchant: string; cardName?: string; qid: string; rawQuery?: string; token?: string };

function generateQid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Words that identify card networks/tiers but not the bank — ignored during matching
const CARD_NOISE = new Set([
  'debito', 'credito', 'debit', 'credit',
  'mastercard', 'visa', 'amex', 'american', 'express',
  'business', 'plata', 'platino', 'platinum', 'oro', 'gold',
  'tarjeta', 'pase', 'card',
]);

function normalizeWords(s: string): string[] {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !CARD_NOISE.has(w));
}

export function matchWalletByCard(
  cardName: string,
  wallets: Array<{ id: number; name: string }>,
): number | null {
  const cardWords = normalizeWords(cardName);
  if (!cardWords.length) return null;

  for (const wallet of wallets) {
    const walletWords = normalizeWords(wallet.name);
    const hit = cardWords.some(cw => walletWords.some(ww => ww.includes(cw) || cw.includes(ww)));
    if (hit) return wallet.id;
  }
  return null;
}

export type CategorySuggestion = { categoryId: number; subcategoryId: number | null };

// Pide al backend la categoría/subcategoría que siempre se ha usado para este
// comercio (ver TransactionsService.suggestCategory). Nunca lanza ni bloquea:
// si falla o tarda más de 1,5 s, devuelve null y el formulario se abre sin
// categoría preseleccionada, como antes.
export async function fetchCategorySuggestion(merchant: string): Promise<CategorySuggestion | null> {
  const description = merchant.trim();
  if (!description) return null;
  try {
    const request = api
      .get('/transactions/suggest-category', { params: { description } })
      .then((res) => (res.data && res.data.categoryId != null ? (res.data as CategorySuggestion) : null));
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
    return await Promise.race([request, timeout]);
  } catch {
    return null;
  }
}

export function readQuickAddFromUrl(): { params: QuickAddParams; fromNotification: boolean } | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (!params.get('qa')) return null;
  // URLSearchParams ya devuelve el valor decodificado ("0,20 €").
  const parsed = parseWalletAmount(params.get('amount'));
  const merchant = params.get('merchant') ?? '';
  if (!parsed || parsed.amount <= 0) return null;
  // Si el Atajo manda el código ISO explícito (&currency=CHF, propiedad
  // "Código de divisa" de Wallet) tiene prioridad sobre el símbolo del importe:
  // resuelve casos ambiguos como "$" o "¥".
  const explicit = (params.get('currency') ?? '').trim().toUpperCase();
  const currency = /^[A-Z]{3}$/.test(explicit) ? explicit : parsed.currency;
  const { amount } = parsed;
  const cardName = params.get('card') ?? undefined;
  const nid = params.get('nid');
  const qid = nid || generateQid();
  // Token opcional del enlace de Shortcuts (ver Ajustes > Automatización) —
  // permite identificar al usuario sin sesión activa en el navegador/webview
  // que abre el link.
  const token = params.get('token') ?? undefined;
  // Guardamos la query string tal cual la manda el Shortcut (sin parsear) —
  // sirve para diagnosticar por qué a veces el comercio llega vacío: así
  // vemos exactamente qué mandó Apple, no lo que nosotros interpretamos.
  const rawQuery = window.location.search;
  return { params: { amount, currency, merchant, cardName, qid, rawQuery, token }, fromNotification: !!nid };
}

// Crea (fire-and-forget) la notificación de "nuevo gasto" pendiente en el
// backend. Se llama solo la primera vez que se abre el link (no cuando se
// vuelve a abrir tocando la propia notificación, porque ya existe).
//
// Si el link trae un token (ver useQuickAddToken), usamos el endpoint público
// que identifica al usuario por ese token — así funciona aunque el
// navegador/webview que abre Shortcuts no tenga sesión iniciada. Si no hay
// token (enlaces antiguos, sin actualizar en la automatización), seguimos
// usando el endpoint autenticado de siempre.
export function sendQuickAddNotification(params: QuickAddParams): void {
  const path = params.token ? '/notifications/quick-transaction/via-token' : '/notifications/quick-transaction';
  api.post(path, {
    amount: params.amount,
    currency: params.currency,
    merchant: params.merchant,
    cardName: params.cardName,
    qid: params.qid,
    rawQuery: params.rawQuery,
    ...(params.token ? { token: params.token } : {}),
  }).catch(() => null);
}

export function saveQuickAddToSession(params: QuickAddParams): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(params));
}

export function readQuickAddFromSession(): QuickAddParams | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as QuickAddParams;
  } catch {
    return null;
  }
}

export function clearQuickAddFromSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SESSION_KEY);
}
