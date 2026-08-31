import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, describe } from 'vitest';
import { calculate, loadDatasets } from '../src/engine/index';
import type { EngineInputs, FxRates } from '../src/engine/types';

const root = fileURLToPath(new URL('..', import.meta.url));
const snapshot = JSON.parse(
  readFileSync(`${root}src/data/fx-snapshot.json`, 'utf8'),
);
const fx: FxRates = { base: 'USD', asOf: snapshot.asOf, rates: snapshot.rates };
const datasets = loadDatasets();

const PERSONA: EngineInputs = {
  roleFamily: 'it-executive',
  level: 'executive',
  originCountry: 'ARE',
  currentSalary: { amount: 53871, currency: 'AED', basis: 'monthly', gross: true },
  targetCountry: 'ARE',
  workArrangement: 'onsite',
  employmentType: 'full-time',
  displayCurrencies: ['AED', 'USD'],
};

describe('normalizeSalary', () => {
  test('converts monthly gross to annual using the country months convention', () => {
    const result = calculate(PERSONA, { datasets, fx });
    expect(result.basisLine).toContain('AED 53871 per month');
    expect(result.basisLine).toContain('AED 646452 per year');
  });

  test('refuses a monthly figure that is actually an annual amount', () => {
    const input: EngineInputs = {
      ...PERSONA,
      currentSalary: { amount: 646452, currency: 'AED', basis: 'monthly', gross: true },
    };
    expect(() => calculate(input, { datasets, fx })).toThrow(/annual/i);
  });

  test('refuses an implausibly low annual amount', () => {
    const input: EngineInputs = {
      ...PERSONA,
      currentSalary: { amount: 1000, currency: 'USD', basis: 'annual', gross: true },
    };
    expect(() => calculate(input, { datasets, fx })).toThrow(/low/i);
  });
});

describe('marketAnchor', () => {
  test('returns percentiles for a seeded role and an explicit insufficient-data result otherwise', () => {
    const seeded = calculate(PERSONA, { datasets, fx });
    expect(seeded.status).toBe('ok');
    expect(seeded.anchor?.p25Monthly).toBe(55000);
    expect(seeded.anchor?.p75Monthly).toBe(90000);

    const missing = calculate(
      { ...PERSONA, targetCountry: 'QAT' },
      { datasets, fx },
    );
    expect(missing.status).not.toBe('ok');
    expect(missing.anchor).toBeNull();
    expect(missing.confidence.reasons.some((r) => r.key === 'noBenchmark')).toBe(true);
  });
});

describe('purchasingPowerFloor (Verifier worked examples)', () => {
  test('UAE to UK: PPP transfer plus 41.7% gross-up lands near GBP 25,700 per month', () => {
    const result = calculate(
      { ...PERSONA, targetCountry: 'GBR' },
      { datasets, fx },
    );
    const floor = result.floor?.monthlyGross;
    expect(floor).toBeDefined();
    // 646,452 / 2.527 * 0.702 = 179,576 net; / (1 - 0.417) = 308,021 annual; / 12
    expect(floor!).toBeGreaterThan(25000);
    expect(floor!).toBeLessThan(26400);
  });

  test('UAE to UK with real ONS data: market quote about GBP 9,500 per month and the unaffordable-at-market warning', () => {
    const result = calculate(
      { ...PERSONA, targetCountry: 'GBR' },
      { datasets, fx },
    );
    expect(result.status).toBe('ok');
    expect(result.quote!.targetMonthly).toBeGreaterThan(9000);
    expect(result.quote!.targetMonthly).toBeLessThan(10000);
    expect(result.warnings.some((w) => w.key === 'floorAboveMarket')).toBe(true);
  });

  test('UAE to India: lands within the researched INR 6.8M to 7.1M annual gross band', () => {
    const result = calculate(
      { ...PERSONA, targetCountry: 'IND' },
      { datasets, fx },
    );
    const annual = result.floor!.monthlyGross * 12;
    expect(annual).toBeGreaterThan(6_800_000);
    expect(annual).toBeLessThan(7_100_000);
  });

  test('floor uses the origin country input, never currency inference', () => {
    const input: EngineInputs = {
      ...PERSONA,
      originCountry: 'GBR',
      currentSalary: { amount: 100000, currency: 'GBP', basis: 'annual', gross: false },
      targetCountry: 'USA',
    };
    const result = calculate(input, { datasets, fx });
    // 100,000 / 0.702 * 1.0 = 142,450 net USD; / (1 - 0.32) = 209,485 annual
    const annual = result.floor!.monthlyGross * 12;
    expect(annual).toBeGreaterThan(206_000);
    expect(annual).toBeLessThan(213_000);
  });
});

describe('recommendedQuote assembly', () => {
  test('persona UAE result: target at the executive percentile, range and floor correct', () => {
    const result = calculate(PERSONA, { datasets, fx });
    expect(result.quote).toBeDefined();
    expect(result.quote!.targetMonthly).toBe(85500);
    expect(result.quote!.lowMonthly).toBe(55000);
    expect(result.quote!.stretchMonthly).toBe(90000);
    expect(result.floor!.monthlyGross).toBeCloseTo(53871, -2);
    expect(result.quote!.annualTarget).toBe(85500 * 12);
    expect(result.confidence.level).toBe('Medium');
    expect(result.warnings).toEqual([]);
  });

  test('flags when the floor sits above the market ceiling instead of blending it away', () => {
    const lowMarket = structuredClone(datasets);
    lowMarket.benchmarks = lowMarket.benchmarks.map((entry) => {
      if (entry.status === undefined && entry.country === 'ARE' && entry.family === 'it-executive' && entry.level === 'executive') {
        return { ...entry, p25: 20000, p50: 25000, p75: 30000 };
      }
      return entry;
    });
    const result = calculate(PERSONA, { datasets: lowMarket, fx });
    expect(result.quote).toBeDefined();
    expect(result.warnings.some((w) => w.key === 'floorAboveMarket')).toBe(true);
  });

  test('remote for a foreign company returns dual anchors and lowers confidence', () => {
    const result = calculate(
      { ...PERSONA, workArrangement: 'remote-foreign', employerCountry: 'USA' },
      { datasets, fx },
    );
    expect(result.dualAnchors).toBeDefined();
    expect(result.dualAnchors!.employerCountry).toBe('USA');
    expect(result.dualAnchors!.anchor).not.toBeNull();
    expect(result.confidence.reasons.some((r) => r.key === 'remoteForeign')).toBe(true);
  });

  test('remote-foreign without an employer country is rejected', () => {
    expect(() =>
      calculate(
        { ...PERSONA, workArrangement: 'remote-foreign' },
        { datasets, fx },
      ),
    ).toThrow(/employer/i);
  });

  test('contract employment converts the target to a day rate and labels it indicative', () => {
    const result = calculate(
      { ...PERSONA, employmentType: 'contract' },
      { datasets, fx },
    );
    expect(result.employment?.indicative).toBe(true);
    expect(result.employment?.dayRate).toBeCloseTo((85500 * 12) / 220, 0);
  });

  test('an origin package with housing on top lifts the like-for-like floor (GCC to GCC)', () => {
    const withHousing = calculate(
      { ...PERSONA, targetCountry: 'SAU', currentPackageOnTop: { housing: true } },
      { datasets, fx },
    );
    const without = calculate({ ...PERSONA, targetCountry: 'SAU' }, { datasets, fx });
    expect(withHousing.floor!.monthlyGross).toBeGreaterThan(without.floor!.monthlyGross);
    // 53,871 / 0.75 = 71,828 effective; / 2.527 * 1.871 = 53,183 SAR per month
    expect(withHousing.floor!.monthlyGross).toBeGreaterThan(52500);
    expect(withHousing.floor!.monthlyGross).toBeLessThan(54000);
  });

  test('employer-paid family health insurance lifts the floor by its researched share', () => {
    const withHealth = calculate(
      { ...PERSONA, targetCountry: 'AUS', currentPackageOnTop: { health: true } },
      { datasets, fx },
    );
    const without = calculate({ ...PERSONA, targetCountry: 'AUS' }, { datasets, fx });
    expect(withHealth.floor!.monthlyGross).toBeGreaterThan(without.floor!.monthlyGross);
    // The lift divides net by (1 - 0.04), about a 4.2% gross increase.
    const ratio = withHealth.floor!.monthlyGross / without.floor!.monthlyGross;
    expect(ratio).toBeGreaterThan(1.03);
    expect(ratio).toBeLessThan(1.06);
    expect(withHealth.warnings.some((w) => w.key === 'packageOnTop')).toBe(true);
    // Australia funds healthcare from tax: the overlap is stated, not hidden.
    expect(withHealth.warnings.some((w) => w.key === 'healthOverlap')).toBe(true);
    // Where healthcare is not tax-funded (USA), the lift stands without that caveat.
    const usHealth = calculate(
      { ...PERSONA, targetCountry: 'USA', currentPackageOnTop: { health: true } },
      { datasets, fx },
    );
    expect(usHealth.warnings.some((w) => w.key === 'healthOverlap')).toBe(false);
  });
});

describe('presentation and risk layers', () => {
  test('GCC targets render the package composition card with the gratuity warning', () => {
    const result = calculate(PERSONA, { datasets, fx });
    const pkg = result.packageComposition!;
    expect(pkg).toBeDefined();
    expect(pkg.basicMonthly).toBeCloseTo(85500 * 0.55, -1);
    expect(pkg.housingMonthly).toBeCloseTo(85500 * 0.25, -1);
    expect(pkg.gratuityNote).toContain('basic');
  });

  test('volatile currency targets attach a risk notice and a USD anchored figure', () => {
    const result = calculate(
      { ...PERSONA, targetCountry: 'EGY' },
      { datasets, fx },
    );
    expect(result.currencyRisk).toBeDefined();
    expect(result.currencyRisk!.usdAnchors).toBeDefined();
    expect(result.status).toBe('floor-only');
  });

  test('a country with no benchmark still returns the purchasing-power floor (Pakistan, was Kenya before curation)', () => {
    const result = calculate(
      { ...PERSONA, targetCountry: 'PAK' },
      { datasets, fx },
    );
    expect(result.status).toBe('floor-only');
    expect(result.floor).not.toBeNull();
    expect(result.floor!.monthlyGross).toBeGreaterThan(0);
    expect(
      result.confidence.reasons.some((reason) => reason.key === 'noBenchmark'),
    ).toBe(true);
  });

  test('Australia uses the verified ATO tax tier and no longer the 20% default', () => {
    const result = calculate(
      { ...PERSONA, targetCountry: 'AUS' },
      { datasets, fx },
    );
    // The ATO benchmark now covers this corridor: a real market quote exists.
    expect(result.status).toBe('ok');
    expect(result.anchor!.currency).toBe('AUD');
    // Band 113,500 / 157,000 / 209,000 annual; P70 target lands in the upper half.
    expect(result.anchor!.p50Monthly).toBeCloseTo(157000 / 12, 0);
    expect(result.quote!.targetMonthly).toBeCloseTo(16550, -2);
    expect(result.floor).not.toBeNull();
    // AED 646,452 net / PPP 2.527 x AUS PPP 1.4646 = AUD 374,633 net; gross-up at 40%.
    expect(result.floor!.annualGross).toBeCloseTo(374633 / 0.6, -3);
    expect(result.floor!.currency).toBe('AUD');
    expect(result.warnings.some((w) => w.key === 'targetTaxDefault')).toBe(false);
    // The Dubai floor sits above the Australian CIO market ceiling: said plainly.
    expect(result.warnings.some((w) => w.key === 'floorAboveMarket')).toBe(true);
    // The floor ships its own derivation so the UI can show the math.
    const d = result.floor!.derivation;
    expect(d.netMonthlyTarget).toBeCloseTo(374633 / 12, -2);
    expect(d.taxRate).toBeCloseTo(0.40, 2);
    expect(d.taxLabel).toBe('executive');
    expect(d.taxQuality).toBe('Medium');
    expect(d.originPpp).toBeCloseTo(2.527, 3);
    expect(d.targetPpp).toBeCloseTo(1.4646, 3);
    expect(d.originPppYear).toBe(2025);
    expect(d.targetPppYear).toBe(2025);
  });

  test('median-only ATO rows collapse the band to the median and say so', () => {
    const result = calculate(
      { ...PERSONA, roleFamily: 'healthcare', level: 'executive', targetCountry: 'AUS' },
      { datasets, fx },
    );
    expect(result.anchor?.medianOnly).toBe(true);
    expect(result.quote).not.toBeNull();
    expect(result.quote!.targetMonthly).toBeCloseTo(113000 / 12, 0);
    expect(result.quote!.stretchMonthly).toBeCloseTo(113000 / 12, 0);
    expect(result.warnings.some((w) => w.key === 'medianOnly')).toBe(true);
  });

  test('a target without a verified tax tier surfaces the 20% default assumption', () => {
    const result = calculate(
      { ...PERSONA, targetCountry: 'THA' },
      { datasets, fx },
    );
    expect(result.warnings.some((w) => w.key === 'targetTaxDefault')).toBe(true);
    expect(result.confidence.reasons.some((r) => r.key === 'targetTaxDefaultReason')).toBe(true);
  });

  test('Netherlands executive quote comes from CAO Rijk data and the floor uses the 2026 tax tier', () => {
    const result = calculate(
      { ...PERSONA, targetCountry: 'NLD' },
      { datasets, fx },
    );
    expect(result.status).toBe('ok');
    expect(result.anchor?.currency).toBe('EUR');
    // Annual band 111,400 / 128,600 / 148,100 -> monthly approx 9,283 / 10,717 / 12,342.
    expect(result.anchor!.p50Monthly).toBeCloseTo(128600 / 12, 0);
    // Floor: AED 646,452 net / PPP 2.527 x NLD PPP 0.7673 = EUR 196,206 net; at 45% tax.
    expect(result.floor!.annualGross).toBeCloseTo(196206 / 0.55, -3);
    expect(result.warnings.some((w) => w.key === 'targetTaxDefault')).toBe(false);
  });

  test('Canada executive quote comes from Job Bank data and the floor uses the 2026 tax tier', () => {
    const result = calculate(
      { ...PERSONA, targetCountry: 'CAN' },
      { datasets, fx },
    );
    expect(result.status).toBe('ok');
    expect(result.anchor!.currency).toBe('CAD');
    expect(result.anchor!.p50Monthly).toBeCloseTo(200000 / 12, 0);
    // AED 646,452 net / PPP 2.527 x CAN PPP 1.2605 = CAD 322,405 net; at 38% Ontario-basis tax.
    expect(result.floor!.annualGross).toBeCloseTo(322405 / 0.62, -3);
    expect(result.warnings.some((w) => w.key === 'targetTaxDefault')).toBe(false);
  });

  test('a partial band with unpublished P75 caps the stretch at the median and warns', () => {
    // CBS publishes no upper band for Dutch software leads (p75 = 0 in the data).
    const result = calculate(
      { ...PERSONA, roleFamily: 'software-engineering', level: 'lead', targetCountry: 'NLD' },
      { datasets, fx },
    );
    expect(result.anchor?.partialBand).toBe(true);
    expect(result.quote).not.toBeNull();
    expect(result.quote!.stretchMonthly).toBeCloseTo(result.anchor!.p50Monthly, 6);
    expect(result.quote!.targetMonthly).toBeLessThanOrEqual(result.anchor!.p50Monthly);
    expect(result.warnings.some((w) => w.key === 'upperBand')).toBe(true);
  });
});
