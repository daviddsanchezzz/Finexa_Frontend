import { parseWalletAmount } from './walletAmount';

// Las notificaciones antiguas solo conservan la divisa en rawQuery.
export function quickAddCurrency(data: { currency?: unknown; rawQuery?: unknown }): string {
  const query = new URLSearchParams(typeof data.rawQuery === 'string' ? data.rawQuery : '');
  for (const value of [data.currency, query.get('currency')]) {
    if (typeof value !== 'string') continue;
    const code = value.trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(code)) return code;
  }
  return parseWalletAmount(query.get('amount'))?.currency ?? 'EUR';
}
