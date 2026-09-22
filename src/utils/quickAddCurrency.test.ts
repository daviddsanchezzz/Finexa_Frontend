import { describe, expect, it } from 'vitest';
import { quickAddCurrency } from './quickAddCurrency';

describe('notification currency', () => {
  it.each(['EUR', 'USD', 'GBP', 'CHF'])('reads legacy rawQuery currency %s', currency => {
    expect(quickAddCurrency({ rawQuery: `?qa=1&amount=12&merchant=Art%20Studio&currency=${currency}` })).toBe(currency);
  });
  it('prefers the explicit field and normalizes it', () => {
    expect(quickAddCurrency({ currency: ' usd ', rawQuery: '?currency=EUR' })).toBe('USD');
  });
  it('recovers the symbol from legacy amounts', () => {
    expect(quickAddCurrency({ rawQuery: '?amount=12%20%C2%A3' })).toBe('GBP');
  });
  it('falls back for absent or malformed currencies', () => {
    expect(quickAddCurrency({})).toBe('EUR');
    expect(quickAddCurrency({ currency: 'invalid', rawQuery: '?currency=12' })).toBe('EUR');
  });
});
