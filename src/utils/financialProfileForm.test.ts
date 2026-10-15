import { describe, it, expect } from 'vitest';
import { EMPTY_PROFILE_FORM, parseNumber, parseProfileForm, parseScenarioForm, profileToForm } from './financialProfileForm';

describe('parseNumber', () => {
  it.each([
    ['12', 12], ['12,5', 12.5], ['12.5', 12.5], ['1.234,5', 1234.5], ['1.234', 1234], ['  7 ', 7], ['3,5 %', 3.5], ['150 €', 150],
  ])('%s -> %s', (text, expected) => expect(parseNumber(text)).toBe(expected));
  it.each([[''], ['abc'], ['1,2,3'], ['--']])('inválido o vacío: "%s" -> null', (text) => expect(parseNumber(text)).toBeNull());
});

describe('profileToForm / parseProfileForm', () => {
  it('ida y vuelta conserva los valores', () => {
    const form = profileToForm({ birthYear: 1998, incomeType: 'salaried', dependents: 0, riskTolerance: 4, emergencyMonthsTarget: 6, fiTargetAge: 50, fiTargetMultiple: 25, expectedRealReturnPct: 3.5 });
    expect(form.expectedRealReturnPct).toBe('3,5');
    const { body, errors } = parseProfileForm(form);
    expect(errors).toEqual({});
    expect(body).toEqual({ incomeType: 'salaried', riskTolerance: 4, birthYear: 1998, dependents: 0, emergencyMonthsTarget: 6, fiTargetAge: 50, fiTargetMultiple: 25, expectedRealReturnPct: 3.5 });
  });

  it('los campos vacíos se envían como null para borrar el valor guardado', () => {
    const { body, errors } = parseProfileForm(EMPTY_PROFILE_FORM);
    expect(errors).toEqual({});
    for (const k of ['birthYear', 'incomeType', 'dependents', 'riskTolerance', 'emergencyMonthsTarget', 'fiTargetAge', 'fiTargetMultiple', 'expectedRealReturnPct']) {
      expect(body).toHaveProperty(k, null);
    }
  });

  it('valida rangos igual que el backend', () => {
    const bad = { ...EMPTY_PROFILE_FORM, birthYear: '1800', dependents: '25', emergencyMonthsTarget: '0', fiTargetAge: '10', fiTargetMultiple: '3', expectedRealReturnPct: '20' };
    const { errors } = parseProfileForm(bad);
    expect(Object.keys(errors).sort()).toEqual(['birthYear', 'dependents', 'emergencyMonthsTarget', 'expectedRealReturnPct', 'fiTargetAge', 'fiTargetMultiple']);
  });

  it('rechaza decimales donde se exige un entero y texto no numérico', () => {
    const { errors } = parseProfileForm({ ...EMPTY_PROFILE_FORM, dependents: '1,5', fiTargetAge: 'abc' });
    expect(errors.dependents).toContain('entero');
    expect(errors.fiTargetAge).toContain('número');
  });

  it('acepta la rentabilidad con coma y la redondea a 2 decimales', () => {
    expect(parseProfileForm({ ...EMPTY_PROFILE_FORM, expectedRealReturnPct: '3,456' }).body.expectedRealReturnPct).toBe(3.46);
  });

  it('sin perfil devuelve el formulario vacío', () => {
    expect(profileToForm(null)).toEqual(EMPTY_PROFILE_FORM);
  });
});

describe('parseScenarioForm', () => {
  it('vacío = no aplica; solo envía lo que hay', () => {
    expect(parseScenarioForm('150', '').body).toEqual({ extraMonthlySavings: 150 });
    expect(parseScenarioForm('', '1.200').body).toEqual({ oneOffExpense: 1200 });
    expect(parseScenarioForm('100', '500').body).toEqual({ extraMonthlySavings: 100, oneOffExpense: 500 });
  });
  it('pide al menos un cambio', () => {
    expect(parseScenarioForm('', '').error).toContain('al menos un cambio');
    expect(parseScenarioForm('0', '0').error).toContain('al menos un cambio');
  });
  it('rechaza negativos, texto y cifras absurdas', () => {
    expect(parseScenarioForm('-5', '').error).toContain('negativos');
    expect(parseScenarioForm('abc', '').error).toContain('válidos');
    expect(parseScenarioForm('99999999', '').error).toContain('grande');
  });
});
