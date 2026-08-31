import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { effectiveDeductionAt, solveGrossForNet } from '../src/engine/tax';
import type { BracketTable } from '../src/engine/types';

const root = fileURLToPath(new URL('..', import.meta.url));
const tables: BracketTable[] = JSON.parse(
  readFileSync(root + '/src/data/tax-brackets.json', 'utf8'),
);

test('the engine reproduces every agent-computed effective rate from the tables', () => {
  expect(tables).toHaveLength(24);
  for (const table of tables) {
    for (const check of table.representativeCheck ?? []) {
      const computed = effectiveDeductionAt(table, check.annualGross, { includeSavings: true });
      // 2.5pp tolerance: the schema cannot express every statutory nuance and
      // the known approximations are documented per country in the notes
      // (German soli taper as a hard limit, Indian surcharge folded into
      // marginal bands instead of total tax, excluded USC and local taxes).
      expect(
        Math.abs(computed - check.computedEffective),
        `${table.iso3} ${check.label}: engine ${computed.toFixed(4)} vs agent ${check.computedEffective}`,
      ).toBeLessThanOrEqual(0.025);
    }
  }
});

test('savings-type contributions are excluded by default', () => {
  const mys = tables.find((t) => t.iso3 === 'MYS')!;
  const senior = mys.representativeCheck![0];
  const withSavings = effectiveDeductionAt(mys, senior.annualGross, { includeSavings: true });
  const withoutSavings = effectiveDeductionAt(mys, senior.annualGross);
  expect(withoutSavings).toBeLessThan(withSavings - 0.05);
});

test('bracket walk is progressive: higher gross never lowers the effective rate', () => {
  const usa = tables.find((t) => t.iso3 === 'USA')!;
  let prev = 0;
  for (const gross of [30_000, 80_000, 150_000, 300_000, 600_000]) {
    const rate = effectiveDeductionAt(usa, gross);
    expect(rate).toBeGreaterThan(prev);
    prev = rate;
  }
});

test('gross-up solver inverts the net equation within 0.2 percent', () => {
  const deu = tables.find((t) => t.iso3 === 'DEU')!;
  const gross = 120_000;
  const net = gross * (1 - effectiveDeductionAt(deu, gross));
  const solved = solveGrossForNet(deu, net, 0.35);
  expect(Math.abs(solved - gross) / gross).toBeLessThan(0.002);
});
