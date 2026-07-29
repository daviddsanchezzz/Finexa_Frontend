const SESSION_KEY = 'finexa_quick_add';

export type QuickAddParams = { amount: number; merchant: string };

export function readQuickAddFromUrl(): QuickAddParams | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (!params.get('qa')) return null;
  const amount = parseFloat(params.get('amount') ?? '');
  const merchant = params.get('merchant') ?? '';
  if (!isFinite(amount) || amount <= 0) return null;
  return { amount, merchant };
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
