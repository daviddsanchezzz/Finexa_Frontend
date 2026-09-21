import { describe, it, expect } from 'vitest';
import { parseWalletAmount } from './walletAmount';

describe('parseWalletAmount', () => {
  it.each([
    ['0,20 €', 0.2, 'EUR'],
    ['12,50 €', 12.5, 'EUR'],
    ['1.234,56 €', 1234.56, 'EUR'],
    ['1 234,56 €', 1234.56, 'EUR'],
    ['12.50 CHF', 12.5, 'CHF'],
    ['15,50 CHF', 15.5, 'CHF'],
    ['CHF 12.50', 12.5, 'CHF'],
    ['£8.99', 8.99, 'GBP'],
    ['1,234.56 USD', 1234.56, 'USD'],
    ['1.234 €', 1234, 'EUR'],
    ['150 zł', 150, 'PLN'],
    ['CA$ 9.99', 9.99, 'CAD'],
    ['500 JPY', 500, 'JPY'],
  ])('%s → %d %s', (raw, amount, currency) => {
    expect(parseWalletAmount(raw)).toEqual({ amount, currency });
  });

  it('soporta NBSP (\\u00A0) y espacios finos', () => {
    expect(parseWalletAmount('0,20 €')).toEqual({ amount: 0.2, currency: 'EUR' });
    expect(parseWalletAmount('1 234,56 €')).toEqual({ amount: 1234.56, currency: 'EUR' });
    expect(parseWalletAmount('CHF 15.50')).toEqual({ amount: 15.5, currency: 'CHF' });
  });

  it('no asume moneda para símbolos ambiguos', () => {
    const usd = parseWalletAmount('$20.50');
    expect(usd?.amount).toBe(20.5);
    expect(usd?.currency).toBeNull();
    expect(usd?.ambiguousCurrencies).toEqual(expect.arrayContaining(['USD', 'CAD', 'AUD']));

    const yen = parseWalletAmount('¥1,500');
    expect(yen?.amount).toBe(1500);
    expect(yen?.currency).toBeNull();
    expect(yen?.ambiguousCurrencies).toEqual(['JPY', 'CNY']);
  });

  it('importe sin moneda → currency null', () => {
    expect(parseWalletAmount('12,50')).toEqual({ amount: 12.5, currency: null });
  });

  it.each(['', '   ', 'abc', '€', 'CHF', '1.2.3 €', null, undefined])(
    'valor inválido %j → null',
    (raw) => {
      expect(parseWalletAmount(raw as any)).toBeNull();
    },
  );
});

describe('URLSearchParams + Wallet', () => {
  it('decodifica 0,20%C2%A0%E2%82%AC a "0,20 €" sin decodeURIComponent manual', () => {
    const params = new URLSearchParams('?qa=1&amount=0,20%C2%A0%E2%82%AC&merchant=Caprabo&card=Revolut%20Mastercard');
    expect(params.get('amount')).toBe('0,20 €');
    expect(params.get('merchant')).toBe('Caprabo');
    expect(params.get('card')).toBe('Revolut Mastercard');
    expect(parseWalletAmount(params.get('amount'))).toEqual({ amount: 0.2, currency: 'EUR' });
  });
});
