import { describe, it, expect } from 'vitest';
import { formatCurrency, formatEuro } from './currency';

describe('formatCurrency', () => {
  it('EUR con 2 decimales, coma decimal, punto de miles', () => {
    expect(formatCurrency(1234.5, 'EUR')).toBe('1.234,50 €');
  });

  it('USD con simbolo $', () => {
    expect(formatCurrency(20.5, 'USD')).toBe('20,50 $');
  });

  it('CHF sin simbolo unico: muestra el codigo', () => {
    expect(formatCurrency(15.5, 'CHF')).toBe('15,50 CHF');
  });

  it('JPY sin decimales', () => {
    expect(formatCurrency(1500, 'JPY')).toBe('1.500 ¥');
  });

  it('GBP con simbolo £', () => {
    expect(formatCurrency(8.99, 'GBP')).toBe('8,99 £');
  });

  it('negativo mantiene el signo', () => {
    expect(formatCurrency(-20.5, 'USD')).toBe('-20,50 $');
  });

  it('moneda desconocida: usa el propio codigo como simbolo', () => {
    expect(formatCurrency(10, 'XYZ')).toBe('10,00 XYZ');
  });
});

describe('formatEuro (sin cambios de comportamiento)', () => {
  it('sigue devolviendo el mismo formato de siempre, sin simbolo', () => {
    expect(formatEuro(1234.5)).toBe('1.234,50');
  });
});
