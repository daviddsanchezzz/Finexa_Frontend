import { describe, it, expect, beforeEach } from 'vitest';
import { QueryObserver } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { financeMutationQueryKeys, invalidateFinanceMutation } from './financeCache';

// La tarjeta de patrimonio de Home lee ["netWorthCurrent", txVersion] (ver
// hooks/useNetWorthTrend.ts). Si una mutación que cambia el dinero no la
// invalida, Home enseña el valor viejo hasta que otra pantalla (Patrimonio)
// monta el mismo hook y la refetchea.
describe('financeMutationQueryKeys', () => {
  it.each([
    ['post', '/investments/valuations'],
    ['post', '/investments/valuations/batch'],
    ['patch', '/investments/valuations/12'],
    ['post', '/investments/valuations/import/commit'],
    ['post', '/investments/5/valuations'],
    ['delete', '/investments/valuations/12'],
    ['post', '/transactions'],
    ['patch', '/wallets/3'],
    ['post', '/debts'],
    ['post', '/projects'],
    ['post', '/trips'],
  ])('%s %s invalida el patrimonio actual', (method, url) => {
    expect(financeMutationQueryKeys(method, url)).toContain('netWorthCurrent');
  });

  it('también invalida la serie histórica', () => {
    expect(financeMutationQueryKeys('post', '/investments/valuations')).toContain('netWorthTrendSeries');
  });

  it('no invalida nada en lecturas ni en módulos que no tocan el patrimonio', () => {
    expect(financeMutationQueryKeys('get', '/investments/valuations')).toEqual([]);
    expect(financeMutationQueryKeys('post', '/budgets')).not.toContain('netWorthCurrent');
    expect(financeMutationQueryKeys('post', '/goals')).not.toContain('netWorthCurrent');
  });

  it('acepta la URL absoluta y con query string', () => {
    expect(financeMutationQueryKeys('post', 'https://api.example.com/investments/valuations?x=1')).toContain('netWorthCurrent');
  });
});

describe('invalidateFinanceMutation', () => {
  beforeEach(() => queryClient.clear());

  it('marca como obsoleta la consulta de patrimonio actual al guardar una valoración', async () => {
    await queryClient.fetchQuery({ queryKey: ['netWorthCurrent', 3], queryFn: async () => ({ total: 100 }), staleTime: 60_000 });
    expect(queryClient.getQueryState(['netWorthCurrent', 3])?.isInvalidated).toBe(false);

    invalidateFinanceMutation('post', '/investments/valuations');

    expect(queryClient.getQueryState(['netWorthCurrent', 3])?.isInvalidated).toBe(true);
  });

  it('refetchea en segundo plano la consulta activa (Home montada)', async () => {
    let total = 100;
    let calls = 0;
    const queryFn = async () => { calls++; return { total }; };
    // Un observador activo, como el useQuery de Home.
    const obs = new QueryObserver(queryClient, { queryKey: ['netWorthCurrent', 3], queryFn, staleTime: 30_000 });
    const unsubscribe = obs.subscribe(() => {});
    await new Promise((r) => setTimeout(r, 20));
    const before = calls;

    total = 250;
    invalidateFinanceMutation('post', '/investments/valuations');
    await new Promise((r) => setTimeout(r, 20));

    expect(calls).toBeGreaterThan(before);
    expect((queryClient.getQueryData(['netWorthCurrent', 3]) as { total: number }).total).toBe(250);
    unsubscribe();
  });
});
