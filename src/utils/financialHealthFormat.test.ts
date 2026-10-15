import { describe, it, expect } from 'vitest';
import { formatDecimal, formatMetricValue, formatMonths, formatPercent, formatYears, formatYearsDelta, gradeColor, statusColor } from './financialHealthFormat';

describe('formatDecimal', () => {
  it('usa coma decimal, punto de miles y quita ceros sobrantes', () => {
    expect(formatDecimal(12.5)).toBe('12,5');
    expect(formatDecimal(12)).toBe('12');
    expect(formatDecimal(1234.56, 2)).toBe('1.234,56');
    expect(formatDecimal(18.34, 1)).toBe('18,3');
  });
  it('no muestra -0 y tolera valores inválidos', () => {
    expect(formatDecimal(-0.001, 1)).toBe('0');
    expect(formatDecimal(NaN)).toBe('—');
  });
});

describe('formatPercent', () => {
  it('formatea fracciones con espacio antes del %', () => {
    expect(formatPercent(0.41)).toBe('41 %');
    expect(formatPercent(0.0165, 1)).toBe('1,7 %');
  });
});

describe('formatYears', () => {
  it('combina años y meses con plural correcto', () => {
    expect(formatYears(19.1)).toBe('19 años y 1 mes');
    expect(formatYears(1)).toBe('1 año');
    expect(formatYears(2)).toBe('2 años');
    expect(formatYears(1 + 1 / 12)).toBe('1 año y 1 mes');
    expect(formatYears(0.4)).toBe('5 meses');
    expect(formatYears(0)).toBe('0 meses');
  });
  it('redondea los meses sin desbordar al año siguiente mal', () => {
    expect(formatYears(1.99)).toBe('2 años');
  });
  it('devuelve raya sin dato', () => {
    expect(formatYears(null)).toBe('—');
    expect(formatYears(undefined)).toBe('—');
  });
});

describe('formatMonths', () => {
  it('singular solo para 1', () => {
    expect(formatMonths(1)).toBe('1 mes');
    expect(formatMonths(18.3)).toBe('18,3 meses');
    expect(formatMonths(null)).toBe('—');
  });
});

describe('formatYearsDelta', () => {
  it('negativo = antes, positivo = más tarde (convención del backend: escenario - base)', () => {
    expect(formatYearsDelta(-3.9)).toBe('3 años y 11 meses antes');
    expect(formatYearsDelta(2)).toBe('2 años más tarde');
  });
  it('lo insignificante es "sin cambio"', () => {
    expect(formatYearsDelta(0)).toBe('sin cambio');
    expect(formatYearsDelta(0.01)).toBe('sin cambio');
    expect(formatYearsDelta(null)).toBe('sin cambio');
  });
});

describe('formatMetricValue', () => {
  it('formatea según la unidad', () => {
    expect(formatMetricValue({ value: 0.41, unit: 'percent' })).toBe('41 %');
    expect(formatMetricValue({ value: 0.016, unit: 'percent' })).toBe('1,6 %');
    expect(formatMetricValue({ value: 18.3, unit: 'months' })).toBe('18,3 meses');
    expect(formatMetricValue({ value: 19.1, unit: 'years' })).toBe('19 años y 1 mes');
    expect(formatMetricValue({ value: 1500, unit: 'eur' })).toBe('1.500,00 €');
    expect(formatMetricValue({ value: null, unit: 'percent' })).toBe('—');
  });
});

describe('colores', () => {
  it('cada nota y estado tiene color y lo desconocido es gris', () => {
    expect(gradeColor('excelente')).not.toBe(gradeColor('atencion'));
    expect(gradeColor(null)).toBe('#9CA3AF');
    expect(statusColor('good')).not.toBe(statusColor('attention'));
    expect(statusColor('na')).toBe('#9CA3AF');
  });
});

import { healthHeadline } from './financialHealthFormat';
import type { HealthReport } from '../types/financialHealth';

const report = (over: Partial<HealthReport> = {}): HealthReport => ({
  score: 90, grade: 'excelente', confidence: 'alta', monthsUsed: 6, pillars: [], metrics: [], focus: null, insights: [], fi: null, levers: [],
  assumptions: [], currency: 'EUR', history: [], profile: { birthYear: null, incomeType: null, dependents: null, riskTolerance: null, emergencyMonthsTarget: null, fiTargetMultiple: null, fiTargetAge: null, expectedRealReturnPct: null, completeness: 0 }, generatedAt: '',
  ...over,
});
const ins = (severity: 'info' | 'tip' | 'warning', title: string) => ({ id: title, severity, title, body: '', amount: null });

describe('healthHeadline', () => {
  it('sin score pide más historial', () => {
    expect(healthHeadline(report({ score: null, grade: null }))).toContain('al menos 2 meses');
  });
  it('un aviso (warning) tiene prioridad sobre todo lo demás', () => {
    const r = report({ insights: [ins('tip', 'Consejo'), ins('warning', 'Aviso importante')], focus: { metric: 'runway', label: 'Colchón de emergencia', reason: '' } });
    expect(healthHeadline(r)).toBe('Aviso importante');
  });
  it('sin avisos, el foco; sin foco, el primer consejo', () => {
    expect(healthHeadline(report({ focus: { metric: 'runway', label: 'Colchón de emergencia', reason: '' } }))).toBe('Para mejorar: colchón de emergencia.');
    expect(healthHeadline(report({ insights: [ins('tip', 'Tienes 13.691 € por encima de tu colchón')] }))).toBe('Tienes 13.691 € por encima de tu colchón');
  });
  it('sin nada más, la palanca que más adelanta; y si no hay, todo en orden', () => {
    const lever = { id: 'x', label: 'Gastar un 10 % menos cada mes', monthlyImpact: 110, yearsSooner: 3 };
    expect(healthHeadline(report({ levers: [lever] }))).toBe('Gastar un 10 % menos cada mes adelantaría 3 años tu independencia financiera.');
    expect(healthHeadline(report())).toBe('Todo en orden. Sigue así.');
  });
});
