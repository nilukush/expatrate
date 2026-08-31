import { expect, test, beforeEach, describe, vi } from 'vitest';
import { getFxRates, clearFxCache } from '../src/fx/index';

const SNAPSHOT = {
  base: 'USD',
  asOf: '2026-08-30',
  source: 'https://open.er-api.com/v6/latest/USD',
  attribution: 'embedded snapshot',
  rates: { USD: 1, AED: 3.6725, GBP: 0.7379, NGN: 1339 },
};

const erApiSuccess = () =>
  Promise.resolve(
    new Response(
      JSON.stringify({
        result: 'success',
        base_code: 'USD',
        time_last_update_utc: 'Sun, 30 Aug 2026 00:02:31 +0000',
        rates: {
          USD: 1,
          ...Object.fromEntries(
            Array.from({ length: 59 }, (_, i) => [`CUR${i}`, 1 + i / 10]),
          ),
        },
      }),
      { status: 200 },
    ),
  );

const frankfurterSuccess = () =>
  Promise.resolve(
    new Response(
      JSON.stringify({
        base: 'USD',
        date: '2026-08-29',
        rates: Object.fromEntries(
          Array.from({ length: 25 }, (_, i) => [`FCUR${i}`, 2 + i / 10]),
        ),
      }),
      { status: 200 },
    ),
  );

const failure = () => Promise.reject(new Error('network down'));

beforeEach(() => {
  clearFxCache();
});

describe('getFxRates fallback chain', () => {
  test('primary success returns er-api rates with the fetch date', async () => {
    const fetchImpl = vi.fn().mockImplementation(erApiSuccess);
    const result = await getFxRates({ fetchImpl, snapshot: SNAPSHOT });
    expect(result.source).toBe('open.er-api.com');
    expect(result.rates.CUR0).toBeCloseTo(1, 5);
    expect(result.asOf).toMatch(/2026-08-30/);
    expect(result.warning).toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test('primary failure falls back to frankfurter', async () => {
    const fetchImpl = vi
      .fn()
      .mockImplementationOnce(failure)
      .mockImplementationOnce(frankfurterSuccess);
    const result = await getFxRates({ fetchImpl, snapshot: SNAPSHOT });
    expect(result.source).toBe('frankfurter.dev');
    expect(result.rates.FCUR0).toBeCloseTo(2, 5);
    expect(result.rates.USD).toBe(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  test('malformed primary (no rates object) is rejected and falls back', async () => {
    const malformed = () =>
      Promise.resolve(new Response(JSON.stringify({ result: 'error' }), { status: 200 }));
    const fetchImpl = vi
      .fn()
      .mockImplementationOnce(malformed)
      .mockImplementationOnce(frankfurterSuccess);
    const result = await getFxRates({ fetchImpl, snapshot: SNAPSHOT });
    expect(result.source).toBe('frankfurter.dev');
  });

  test('both providers failing falls back to the snapshot with its date and a warning', async () => {
    const fetchImpl = vi.fn().mockImplementation(failure);
    const result = await getFxRates({ fetchImpl, snapshot: SNAPSHOT });
    expect(result.source).toBe('snapshot');
    expect(result.asOf).toBe('2026-08-30');
    expect(result.rates.AED).toBeCloseTo(3.6725, 4);
    expect(result.warning).toMatch(/snapshot/i);
  });

  test('a hanging provider is aborted by the timeout and the snapshot serves quickly', async () => {
    const hanging = (_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new Error('aborted'));
        });
      });
    const fetchImpl = vi.fn().mockImplementation(hanging);
    const started = Date.now();
    const result = await getFxRates({ fetchImpl, snapshot: SNAPSHOT, timeoutMs: 50 });
    expect(result.source).toBe('snapshot');
    expect(Date.now() - started).toBeLessThan(2000);
  });

  test('successful results are cached for the session', async () => {
    const fetchImpl = vi.fn().mockImplementation(erApiSuccess);
    await getFxRates({ fetchImpl, snapshot: SNAPSHOT });
    await getFxRates({ fetchImpl, snapshot: SNAPSHOT });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
