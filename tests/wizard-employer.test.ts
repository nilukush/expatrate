import { expect, test } from 'vitest';
import { compareEmployerOffer } from '../src/wizard/employer';

const rates = { AED: 3.6725, EUR: 0.9213, USD: 1 };

test('converts the floor into the job description currency before comparing', () => {
  // AED 646,452 is about EUR 162,100 at these rates; an EUR 90,000 to 110,000
  // range is below it, but nowhere near the roughly 83 percent cut the raw
  // AED comparison used to report.
  const cmp = compareEmployerOffer(
    { min: 90000, max: 110000, currency: 'EUR' },
    { annualGross: 646452, currency: 'AED' },
    null,
    rates,
  );
  expect(cmp.kind).toBe('below');
  expect(cmp.kind === 'below' && cmp.floorCurrency).toBe('EUR');
  expect(cmp.kind === 'below' && cmp.floorAnnual).toBeGreaterThan(150000);
  expect(cmp.kind === 'below' && cmp.floorAnnual).toBeLessThan(175000);
  expect(cmp.kind === 'below' && cmp.shortfallPct).toBeLessThan(40);
});

test('overlap, above, and same-currency semantics survive', () => {
  const floor = { annualGross: 646452, currency: 'AED' };
  expect(compareEmployerOffer({ min: 150000, max: 170000, currency: 'EUR' }, floor, null, rates).kind).toBe('overlap');
  expect(compareEmployerOffer({ min: 200000, max: 250000, currency: 'EUR' }, floor, null, rates).kind).toBe('above');
  const same = compareEmployerOffer({ min: 500000, max: 600000, currency: 'AED' }, floor, null, rates);
  expect(same.kind).toBe('below');
  expect(same.kind === 'below' && same.floorAnnual).toBe(646452);
  expect(same.kind === 'below' && same.floorCurrency).toBe('AED');
});

test('a null JD currency falls back to the quote currency for the comparison', () => {
  const cmp = compareEmployerOffer(
    { min: 90000, max: 110000, currency: null },
    { annualGross: 646452, currency: 'AED' },
    { annualTarget: 1200000, currency: 'AED' },
    rates,
  );
  expect(cmp.kind).toBe('below');
  expect(cmp.kind === 'below' && cmp.floorCurrency).toBe('AED');
});

test('without a floor the card falls back to the quote comparison, or hides', () => {
  expect(
    compareEmployerOffer({ min: 1, max: 2, currency: 'EUR' }, null, { annualTarget: 100, currency: 'EUR' }, rates).kind,
  ).toBe('vs-quote');
  expect(compareEmployerOffer({ min: 1, max: 2, currency: 'EUR' }, null, null, rates).kind).toBe('hidden');
});

test('an unconvertible pair suppresses the verdict instead of comparing raw numbers', () => {
  expect(
    compareEmployerOffer(
      { min: 90000, max: 110000, currency: 'XYZ' },
      { annualGross: 646452, currency: 'AED' },
      { annualTarget: 1200000, currency: 'AED' },
      rates,
    ).kind,
  ).toBe('vs-quote');
  expect(
    compareEmployerOffer({ min: 1, max: 2, currency: 'XYZ' }, { annualGross: 10, currency: 'AED' }, null, rates).kind,
  ).toBe('hidden');
});
