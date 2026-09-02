import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, describe } from 'vitest';
import { calculate, evaluateOffer, loadDatasets } from '../src/engine/index';
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

  test('refuses an implausibly low monthly amount', () => {
    const input: EngineInputs = {
      ...PERSONA,
      currentSalary: { amount: 45, currency: 'USD', basis: 'monthly', gross: true },
    };
    expect(() => calculate(input, { datasets, fx })).toThrow(/low/i);
  });

  test('a salary currency that differs from the origin warns with the keyed message', () => {
    const result = calculate(
      { ...PERSONA, currentSalary: { amount: 120000, currency: 'USD', basis: 'annual', gross: true } },
      { datasets, fx },
    );
    // Every warning must be a keyed EngineMessage; a plain string renders
    // literally as "engine.undefined" in the warnings card.
    for (const w of result.warnings) {
      expect(typeof w.key).toBe('string');
    }
    const diff = result.warnings.find((w) => w.key === 'salaryCurrencyDiff');
    expect(diff).toBeDefined();
    expect(String((diff?.params as { from?: string })?.from)).toBe('USD');
    expect(String((diff?.params as { country?: string })?.country)).toContain('Emirates');
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
    // Bracket-based 2026 Indian rates (new-regime slabs, cess and surcharge
    // folded in) gross up slightly lower than the old tier: 6.77M.
    expect(annual).toBeGreaterThan(6_600_000);
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
    // 142,450 net USD grossed up through the US single-filer brackets and
    // capped FICA lands at about 193,650 annual (26.4% effective).
    const annual = result.floor!.monthlyGross * 12;
    expect(annual).toBeGreaterThan(190_000);
    expect(annual).toBeLessThan(200_000);
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
    // AUD 374,633 net grossed up through the 2026-27 ATO brackets plus
    // Medicare lands at about AUD 642,516 (41.7% effective at that income).
    expect(result.floor!.annualGross).toBeGreaterThan(620_000);
    expect(result.floor!.annualGross).toBeLessThan(665_000);
    expect(result.floor!.currency).toBe('AUD');
    expect(result.warnings.some((w) => w.key === 'targetTaxDefault')).toBe(false);
    // The Dubai floor sits above the Australian CIO market ceiling: said plainly.
    expect(result.warnings.some((w) => w.key === 'floorAboveMarket')).toBe(true);
    // The floor ships its own derivation so the UI can show the math.
    const d = result.floor!.derivation;
    expect(d.netMonthlyTarget).toBeCloseTo(374633 / 12, -2);
    expect(d.taxRate).toBeCloseTo(0.417, 2);
    expect(d.taxLabel).toBe('2026 brackets');
    expect(d.taxQuality).toBe('High');
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

  test('a target without brackets or a verified tax tier surfaces the 20% default assumption', () => {
    const result = calculate(
      { ...PERSONA, targetCountry: 'PAK' },
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
    // EUR 196,206 net grossed up through the 2026 Dutch scale plus capped
    // premiums lands at about EUR 368,753 (46.8% effective at that income).
    expect(result.floor!.annualGross).toBeGreaterThan(355_000);
    expect(result.floor!.annualGross).toBeLessThan(382_000);
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
    // CAD 322,405 net grossed up through the 2026 federal brackets plus CPP
    // and EI: about CAD 442,981 (27.2% federal effective; the bracket table
    // excludes the provincial layer, which the tier estimate had baked in).
    expect(result.floor!.annualGross).toBeGreaterThan(425_000);
    expect(result.floor!.annualGross).toBeLessThan(462_000);
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

test('entry mode: no current salary returns a market-only quote with no floor', () => {
  const result = calculate(
    {
      roleFamily: PERSONA.roleFamily,
      level: PERSONA.level,
      targetCountry: 'ARE',
      workArrangement: 'onsite',
      employmentType: 'full-time',
    },
    { datasets, fx },
  );
  expect(result.status).toBe('ok');
  expect(result.quote).not.toBeNull();
  expect(result.quote!.lowMonthly).toBeGreaterThan(0);
  expect(result.floor).toBeNull();
  expect(result.basisLine).toBeNull();
  expect(result.confidence.reasons.some((r) => r.key === 'entryMode')).toBe(true);
});

test('offer evaluation: positions an offer in the market band and against the floor', () => {
  const result = calculate(PERSONA, { datasets, fx });
  const verdict = evaluateOffer(
    { amount: 70000, currency: 'AED', basis: 'monthly', gross: true },
    result,
    fx,
  );
  expect(verdict.bandPosition).toBe('within-band');
  expect(verdict.percentileInBand).toBeGreaterThan(40);
  expect(verdict.percentileInBand).toBeLessThan(75);
  expect(verdict.floorGapPct).not.toBeNull();
  expect(verdict.floorGapPct!).toBeGreaterThan(0);
});

test('offer evaluation: flags an offer below the band and in another currency', () => {
  const result = calculate(PERSONA, { datasets, fx });
  const verdict = evaluateOffer(
    { amount: 120000, currency: 'USD', basis: 'annual', gross: true },
    result,
    fx,
  );
  expect(verdict.bandPosition).toBe('below-p25');
  expect(verdict.floorGapPct!).toBeLessThan(0);
});

test('floor uses the bracket table when the target country has one', () => {
  const result = calculate(
    { ...PERSONA, targetCountry: 'GBR' },
    { datasets, fx },
  );
  expect(result.floor).not.toBeNull();
  expect(result.floor!.derivation.taxLabel).toBe('2026 brackets');
  expect(result.floor!.derivation.taxRate).toBeGreaterThan(0.2);
  expect(result.floor!.derivation.taxRate).toBeLessThan(0.5);
});

test('origin tax uses the bracket table when available', () => {
  const gbrPersona: EngineInputs = {
    ...PERSONA,
    originCountry: 'GBR',
    currentSalary: { amount: 8000, currency: 'GBP', basis: 'monthly', gross: true },
  };
  const result = calculate(gbrPersona, { datasets, fx });
  // 96k GBP gross: income tax + NI lands near 33%; a tier default would be 20%.
  const basis = result.basisLine ?? '';
  expect(basis).toContain('GBP');
  expect(result.status).not.toBe('insufficient_data');
});

describe('market-currency anchors (Lebanon rows quote USD while the floor is LBP)', () => {
  const usaToLbn: EngineInputs = {
    roleFamily: 'general-management',
    level: 'executive',
    originCountry: 'USA',
    currentSalary: { amount: 120000, currency: 'USD', basis: 'annual', gross: true },
    targetCountry: 'LBN',
    workArrangement: 'onsite',
    employmentType: 'full-time',
  };

  test('the floor is converted into the anchor currency before it meets the band', () => {
    const result = calculate(usaToLbn, { datasets, fx });
    expect(result.status).toBe('ok');
    expect(result.anchor!.currency).toBe('USD');
    expect(result.floor!.currency).toBe('LBP');
    // 120k USD gross nets near 90k; the PPP transfer lands the floor near
    // USD 5.5k per month, inside the 4,000 to 8,000 general-management band.
    // Compared raw in LBP the floor dwarfed every USD figure and the
    // floor-above-market warning fired on essentially every Lebanon run.
    expect(result.warnings.some((w) => w.key === 'floorAboveMarket')).toBe(false);
    expect(result.quote!.lowMonthly).toBeGreaterThan(result.anchor!.p25Monthly);
    expect(result.quote!.lowMonthly).toBeLessThan(result.anchor!.p75Monthly);
    // The lifted low end IS the converted floor, not an independent number.
    const lbp = fx.rates.LBP;
    expect(
      Math.abs(result.quote!.lowMonthly * lbp - result.floor!.monthlyGross) /
        result.floor!.monthlyGross,
    ).toBeLessThan(0.005);
  });

  test('offer evaluation converts the floor before computing the gap', () => {
    const result = calculate(usaToLbn, { datasets, fx });
    const verdict = evaluateOffer(
      { amount: 6500, currency: 'USD', basis: 'monthly', gross: true },
      result,
      fx,
    );
    // The offer clears the converted floor by a modest margin; the raw-LBP
    // comparison used to report about minus 100 percent on every offer.
    expect(verdict.floorGapPct!).toBeGreaterThan(-50);
    expect(verdict.floorGapPct!).toBeLessThan(100);
  });
});

describe('Gulf zero-personal-income-tax targets', () => {
  test('Kuwait: the verified 0 percent tier replaces the 20 percent default', () => {
    const result = calculate(
      {
        roleFamily: 'finance-and-accounting',
        level: 'lead',
        originCountry: 'USA',
        currentSalary: { amount: 120000, currency: 'USD', basis: 'annual', gross: true },
        targetCountry: 'KWT',
        workArrangement: 'onsite',
        employmentType: 'full-time',
      },
      { datasets, fx },
    );
    expect(result.status).toBe('ok');
    expect(result.floor!.derivation.taxRate).toBe(0);
    expect(result.floor!.derivation.taxLabel).toBe('any-income');
    // Gross equals net with no tax; the 20 percent default inflated the
    // gross-up by exactly 1.25 (audit worked example: KWD 543 vs 434).
    expect(
      result.floor!.annualGross / (result.floor!.derivation.netMonthlyTarget * 12),
    ).toBeCloseTo(1, 6);
    expect(result.warnings.some((w) => w.key === 'targetTaxDefault')).toBe(false);
  });

  test('Kuwait origin: no silent 20 percent cut of the net salary', () => {
    const result = calculate(
      {
        roleFamily: 'it-executive',
        level: 'executive',
        originCountry: 'KWT',
        currentSalary: { amount: 2000, currency: 'KWD', basis: 'monthly', gross: true },
        targetCountry: 'SAU',
        workArrangement: 'onsite',
        employmentType: 'full-time',
      },
      { datasets, fx },
    );
    expect(result.confidence.reasons.some((r) => r.key === 'originTaxEstimate')).toBe(false);
    // 24,000 KWD gross is 24,000 KWD net; the PPP transfer to Saudi Arabia
    // lands near SAR 20,400 per month (the old default cut it near 16,300).
    expect(result.floor!.monthlyGross).toBeGreaterThan(19_500);
    expect(result.floor!.monthlyGross).toBeLessThan(21_500);
  });
});

describe('hardship differential (corporate relocation mode)', () => {
  const posts = [
    { iso3: 'KEN', city: 'Nairobi', differentialPct: 10, effectiveDate: '2026-07-01', sourceUrl: 'https://travel.state.gov/dssr' },
    { iso3: 'KEN', city: 'Mombasa', differentialPct: 10, effectiveDate: '2026-07-01', sourceUrl: 'https://travel.state.gov/dssr' },
  ];
  const hardshipDatasets = { ...datasets, hardshipPosts: posts };

  test('an opted-in post scales an alternate range and never moves the primary quote', () => {
    const plain = calculate({ ...PERSONA, targetCountry: 'KEN' }, { datasets, fx });
    const withPost = calculate(
      { ...PERSONA, targetCountry: 'KEN', hardshipPost: 'Nairobi' },
      { datasets: hardshipDatasets, fx },
    );
    expect(withPost.hardship).not.toBeNull();
    expect(withPost.hardship!.city).toBe('Nairobi');
    expect(withPost.hardship!.differentialPct).toBe(10);
    expect(withPost.hardship!.adjustedRangeMonthly.target).toBeCloseTo(
      withPost.quote!.targetMonthly * 1.10, -2,
    );
    // The primary quote is untouched by the advisory mode.
    expect(withPost.quote!.targetMonthly).toBeCloseTo(plain.quote!.targetMonthly, -2);
  });

  test('no opt-in or unknown post means no hardship card', () => {
    const off = calculate({ ...PERSONA, targetCountry: 'KEN' }, { datasets: hardshipDatasets, fx });
    expect(off.hardship).toBeNull();
    const unknown = calculate(
      { ...PERSONA, targetCountry: 'KEN', hardshipPost: 'Nowhere' },
      { datasets: hardshipDatasets, fx },
    );
    expect(unknown.hardship).toBeNull();
  });
});
