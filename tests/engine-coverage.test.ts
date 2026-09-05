import { describe, expect, it } from 'vitest';
import { calculate } from '../src/engine/engine';
import { loadDatasets } from '../src/engine/data';
import countries from '../src/data/countries.json';
import type { EngineInputs, FxRates } from '../src/engine/types';

const datasets = loadDatasets();

// Unit rates for every supported currency: this test isolates the engine from FX realism.
const fx: FxRates = {
  base: 'USD',
  asOf: '2026-08-30',
  rates: Object.fromEntries(['USD', ...countries.map((c) => c.currency)].map((code) => [code, 1])),
};

const inputs = (origin: string, target: string): EngineInputs => ({
  roleFamily: 'it-executive',
  level: 'executive',
  originCountry: origin,
  currentSalary: { amount: 10000, currency: 'USD', basis: 'monthly', gross: true },
  targetCountry: target,
  workArrangement: 'onsite',
  employmentType: 'full-time',
});

describe('engine coverage', () => {
  it('every origin-to-target country pair returns a number, never insufficient_data', () => {
    const deadEnds: string[] = [];
    for (const origin of countries) {
      for (const target of countries) {
        const result = calculate(inputs(origin.iso3, target.iso3), { datasets, fx });
        const hasNumber = result.quote !== null || result.floor !== null;
        if (result.status === 'insufficient_data' || !hasNumber) {
          deadEnds.push(`${origin.iso3}->${target.iso3}`);
        }
      }
    }
    expect(deadEnds, `pairs returning nothing: ${deadEnds.join(', ')}`).toEqual([]);
  }, 30000);

  it('the Philippines to UAE corridor returns a floor even without a market benchmark', () => {
    const result = calculate(inputs('PHL', 'ARE'), { datasets, fx });
    expect(result.status).not.toBe('insufficient_data');
    expect(result.floor).not.toBeNull();
    expect(result.floor?.monthlyGross).toBeGreaterThan(0);
  });

  it('covers every supported country with a PPP row', () => {
    const covered = new Set(datasets.ppp.map((row) => row.iso3));
    const missing = countries.filter((c) => !covered.has(c.iso3)).map((c) => c.iso3);
    expect(missing).toEqual([]);
  });
});
