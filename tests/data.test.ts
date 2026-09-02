import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));
const load = (name: string) =>
  JSON.parse(readFileSync(`${root}src/data/${name}`, 'utf8'));

const TIER_1 = ['ARE', 'DEU', 'EGY', 'GBR', 'IDN', 'IND', 'QAT', 'SAU', 'SGP', 'USA'];
const CURATED_TIER_2 = ['VNM', 'PHL', 'THA', 'ZAF', 'KEN', 'NGA', 'LBN', 'MAR', 'PAN', 'MEX', 'CAN', 'AUS', 'NLD'];

test('countries: world-wide coverage, unique iso3, valid shape, tier 1 set exact', () => {
  const rows = load('countries.json');
  // World-wide coverage: every World Bank economy with usable PPP data (9 excluded for
  // missing or non-comparable data: CHI CUB GIB IMN LIE MAF MCO PRK YEM, plus VEN ZWE).
  expect(rows.length).toBeGreaterThanOrEqual(190);
  const iso3 = rows.map((r: { iso3: string }) => r.iso3);
  expect(new Set(iso3).size).toBe(rows.length);
  for (const row of rows) {
    expect(row.iso3).toMatch(/^[A-Z]{3}$/);
    expect(row.name.length).toBeGreaterThan(2);
    expect(row.currency).toMatch(/^[A-Z]{3}$/);
    expect(['GCC', 'Middle East', 'Europe', 'North America', 'Asia', 'Africa', 'LATAM', 'Oceania']).toContain(row.region);
    expect([1, 2, 3]).toContain(row.tier);
    expect(typeof row.taxRegime).toBe('string');
    expect(typeof row.packageConvention).toBe('string');
  }
  const byTier = (tier: number) => rows.filter((r: { tier: number }) => r.tier === tier).map((r: { iso3: string }) => r.iso3).sort();
  expect(byTier(1)).toEqual([...TIER_1].sort());
  expect(byTier(2)).toEqual([...CURATED_TIER_2].sort());
  // Economies where World Bank PPP is not comparable to the listed currency stay out.
  for (const excluded of ['VEN', 'ZWE', 'YEM', 'PRK', 'MCO', 'CUB']) {
    expect(iso3).not.toContain(excluded);
  }
});

test('ppp: every supported country covered, exact Verifier values, full provenance', () => {
  const { meta, rows } = load('ppp.json');
  expect(meta.license).toBe('CC BY 4.0');
  expect(meta.retrievedAt).toBe('2026-08-30');
  expect(meta.sourceUrl).toContain('worldbank.org');
  const countries = load('countries.json').map((r: { iso3: string }) => r.iso3);
  const expected: Record<string, number> = {
    ARE: 2.527, DEU: 0.719, EGY: 7.722, GBR: 0.702, IND: 19.839,
    SAU: 1.871, SGP: 1.024, USA: 1.0, ZAF: 7.740,
    QAT: 2.7555, IDN: 5065.969, VNM: 7203.3696, PHL: 20.5335,
  };
  for (const row of rows) {
    expect(row.year).toBeGreaterThanOrEqual(2020);
    expect(row.value).toBeGreaterThan(0);
    expect(row.license).toBe('CC BY 4.0');
    expect(row.sourceUrl).toMatch(/^https:/);
    expect(countries).toContain(row.iso3);
    if (expected[row.iso3] !== undefined) {
      expect(row.value).toBeCloseTo(expected[row.iso3], 3);
    }
  }
  for (const code of Object.keys(expected)) {
    expect(rows.some((r: { iso3: string }) => r.iso3 === code)).toBe(true);
  }
  // Full coverage: the purchasing-power floor must compute for every supported country.
  for (const code of countries) {
    expect(rows.some((r: { iso3: string }) => r.iso3 === code), `PPP missing for ${code}`).toBe(true);
  }
});

test('tax: shape valid, UK executive tier verified at 0.417, zero-tax countries at 0', () => {
  const rows = load('tax-effective.json');
  const countries = load('countries.json');
  const byCountry = new Map(rows.map((r: { iso3: string }) => [r.iso3, r]));
  const aus = byCountry.get('AUS') as { tiers: Array<{ label: string; effectiveDeduction: number }> } | undefined;
  expect(aus).toBeDefined();
  expect(aus!.tiers.find((t) => t.label === 'executive')?.effectiveDeduction).toBeCloseTo(0.40, 2);
  for (const row of rows) {
    expect(countries.some((c: { iso3: string }) => c.iso3 === row.iso3)).toBe(true);
    for (const tier of row.tiers) {
      expect(tier.effectiveDeduction).toBeGreaterThanOrEqual(0);
      expect(tier.effectiveDeduction).toBeLessThanOrEqual(0.6);
      expect(['High', 'Medium', 'Low']).toContain(tier.quality);
      expect(tier.note.length).toBeGreaterThan(20);
      expect(tier.sourceUrl).toMatch(/^https:/);
    }
  }
  const uk = byCountry.get('GBR') as { tiers: Array<{ label: string; effectiveDeduction: number; quality: string }> };
  const ukExec = uk.tiers.find((t: { label: string }) => t.label === 'executive') as { effectiveDeduction: number; quality: string };
  expect(ukExec.effectiveDeduction).toBeCloseTo(0.417, 3);
  expect(ukExec.quality).toBe('High');
  const areTiers = (byCountry.get('ARE') as { tiers: Array<{ effectiveDeduction: number }> }).tiers;
  expect(areTiers[0].effectiveDeduction).toBe(0);
  // The rest of the GCC levies no personal income tax on salaries (PwC 2026).
  // Bahrain folds in the 1 percent SIO share expatriate employees pay.
  for (const code of ['SAU', 'QAT', 'OMN', 'KWT'] as const) {
    const gcc = byCountry.get(code) as { tiers: Array<{ label: string; effectiveDeduction: number }> };
    expect(gcc, `tax row for ${code}`).toBeDefined();
    expect(gcc.tiers[0].label).toBe('any-income');
    expect(gcc.tiers[0].effectiveDeduction).toBe(0);
  }
  const bhr = byCountry.get('BHR') as { tiers: Array<{ label: string; effectiveDeduction: number }> };
  expect(bhr, 'tax row for BHR').toBeDefined();
  expect(bhr.tiers[0].label).toBe('any-income');
  expect(bhr.tiers[0].effectiveDeduction).toBeCloseTo(0.01, 4);
  for (const code of TIER_1) {
    expect(byCountry.has(code)).toBe(true);
  }
});

test('role families: 16 families and 3 levels defined', () => {
  const { families, levels } = load('role-families.json');
  expect(families).toHaveLength(16);
  expect(levels).toEqual(['senior', 'lead', 'executive']);
  expect(families.some((f: { id: string }) => f.id === 'it-executive')).toBe(true);
  expect(families.some((f: { id: string }) => f.id === 'finance-and-accounting')).toBe(true);
});

test('benchmarks: full curated matrix, honest insufficient-data markers, curated rows valid', () => {
  const { meta, entries } = load('benchmarks.json');
  const { families, levels } = load('role-families.json');
  const countryCurrency = new Map(load('countries.json').map((c: { iso3: string; currency: string }) => [c.iso3, c.currency]));
  // Matrix = tier 1 plus every country with curated rows (curation expanded: NLD, CAN).
  const seeds = load('benchmark-seeds.json').rows;
  const matrixCountries = new Set([...TIER_1, ...seeds.map((r: { country: string }) => r.country)]);
  expect(entries).toHaveLength(families.length * levels.length * matrixCountries.size);
  const dataRows = entries.filter((e: { status?: string }) => e.status === undefined);
  const markers = entries.filter((e: { status?: string }) => e.status === 'insufficient_data');
  expect(dataRows.length).toBeGreaterThanOrEqual(189);
  for (const marker of markers) {
    expect(marker.reason.length).toBeGreaterThan(10);
    expect(marker.lastReviewed).toBe('2026-08-30');
  }
  for (const row of dataRows) {
    // Zero p25 with zero p75 encodes "median only" (SEEK averages, some ATO rows).
    expect(row.p25 === 0 || row.p25 <= row.p50).toBe(true);
    // A zero p75 encodes "upper band not published" (CBS lead rows); the engine caps at p50.
    expect(row.p75 === 0 || row.p75 >= row.p50).toBe(true);
    expect(['monthly-gross', 'annual-gross']).toContain(row.basis);
    expect(['High', 'Medium', 'Low']).toContain(row.quality);
    // Panama and Lebanon quote salaries in USD: Panama's balboa is pegged 1:1 and
    // Lebanese professional pay is negotiated in "fresh dollars" (89,500 LBP/USD),
    // so published bands for both markets are in USD and the seeds carry USD.
    const QUOTE_CURRENCY: Record<string, string> = { PAN: 'USD', LBN: 'USD' };
    expect(row.currency).toBe(QUOTE_CURRENCY[row.country] ?? countryCurrency.get(row.country));
    expect(row.sources.every((s: string) => s.startsWith('https://'))).toBe(true);
    expect(row.note.length).toBeGreaterThan(20);
  }
  const seed = dataRows.find(
    (r: { family: string; level: string; country: string }) =>
      r.family === 'it-executive' && r.level === 'executive' && r.country === 'ARE',
  );
  expect(seed.p25).toBe(55000);
  expect(seed.p50).toBe(67500);
  expect(seed.p75).toBe(90000);
  expect(seed.quality).toBe('Medium');
  expect(meta.curationNote).toContain('recruiter');

  // The 2026-08-30 world curation pass: Netherlands (CBS StatLine + CAO Rijk) and
  // Canada (Job Bank) verified rows.
  const nldExec = dataRows.find(
    (r: { family: string; level: string; country: string }) =>
      r.family === 'it-executive' && r.level === 'executive' && r.country === 'NLD',
  );
  expect(nldExec).toBeDefined();
  expect(nldExec.p50).toBe(128600);
  expect(nldExec.sources.some((s: string) => s.includes('caorijk.nl'))).toBe(true);
  const canExec = dataRows.find(
    (r: { family: string; level: string; country: string }) =>
      r.family === 'it-executive' && r.level === 'executive' && r.country === 'CAN',
  );
  expect(canExec).toBeDefined();
  expect(canExec.p50).toBe(200000);
  expect(canExec.quality).toBe('High');
  // The Netherlands lead rows publish no upper band: p75 must stay 0, never invented.
  const nldLeadSw = dataRows.find(
    (r: { family: string; level: string; country: string }) =>
      r.family === 'software-engineering' && r.level === 'lead' && r.country === 'NLD',
  );
  expect(nldLeadSw.p75).toBe(0);

  // Australia (ATO taxation statistics 2023-24): the user's live corridor.
  const ausExec = dataRows.find(
    (r: { family: string; level: string; country: string }) =>
      r.family === 'it-executive' && r.level === 'executive' && r.country === 'AUS',
  );
  expect(ausExec).toBeDefined();
  expect(ausExec.p50).toBe(157000);
  expect(ausExec.p75).toBe(209000);
  expect(ausExec.quality).toBe('High');
  expect(ausExec.sources.some((s: string) => s.includes('data.gov.au'))).toBe(true);
  expect(ausExec.sources.some((s: string) => s.includes('yourcareer.gov.au'))).toBe(true);
  // Median-only ATO rows keep honest zeros in both band edges.
  const ausHealthExec = dataRows.find(
    (r: { family: string; level: string; country: string }) =>
      r.family === 'healthcare' && r.level === 'executive' && r.country === 'AUS',
  );
  expect(ausHealthExec.p25).toBe(0);
  expect(ausHealthExec.p75).toBe(0);
  expect(ausHealthExec.p50).toBe(113000);
});

test('package conventions: GCC splits with legal basis, western single gross', () => {
  const rows = load('package-conventions.json');
  const byCountry = new Map(rows.map((r: { country: string }) => [r.country, r]));
  const are = byCountry.get('ARE') as { style: string; basicPercent: { min: number }; housingPercent: { max: number }; gratuity: string };
  expect(are.style).toBe('gcc-split');
  expect(are.basicPercent.min).toBe(50);
  expect(are.housingPercent.max).toBe(30);
  expect(are.gratuity).toContain('basic');
  for (const code of ['GBR', 'USA', 'DEU', 'SGP', 'IND']) {
    expect((byCountry.get(code) as { style: string }).style).toBe('single-gross');
  }
  for (const row of rows) {
    expect(row.sourceUrls.length).toBeGreaterThan(0);
  }
});

test('employment conventions: defaults, pending-verification flags for PH and ID', () => {
  const data = load('employment-conventions.json');
  expect(data.defaultMonthsPerYear).toBe(12);
  expect(data.dayRateDivisors.standard).toBe(220);
  const ph = data.countryOverrides.find((o: { country: string }) => o.country === 'PHL');
  const id = data.countryOverrides.find((o: { country: string }) => o.country === 'IDN');
  expect(ph.thirteenthMonthMandatory).toBe(true);
  expect(ph.quality).toBe('pending-verification');
  expect(id.religiousAllowanceTHR).toBe(true);
  expect(id.quality).toBe('pending-verification');
});

test('family context: allowance prevalence and school fee ranges sourced', () => {
  const data = load('family-context.json');
  const prevalence = new Map(
    data.educationAllowancePrevalence.map((p: { country: string }) => [p.country, p]),
  );
  expect((prevalence.get('ARE') as { shareOfEmployers: number }).shareOfEmployers).toBeCloseTo(0.75, 2);
  expect((prevalence.get('QAT') as { shareOfEmployers: number }).shareOfEmployers).toBeCloseTo(0.30, 2);
  expect(data.prevalenceSource).toMatch(/^https:/);
  const are = data.schoolFees.find((f: { country: string }) => f.country === 'ARE');
  expect(are.currency).toBe('AED');
  expect(are.minAnnual).toBeLessThan(are.maxAnnual);
  for (const fee of data.schoolFees) {
    expect(fee.source).toMatch(/^https:/);
  }
});

test('fx snapshot: structurally valid fallback with the known coverage', () => {
  const snap = load('fx-snapshot.json');
  expect(snap.base).toBe('USD');
  expect(snap.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(snap.attribution.length).toBeGreaterThan(10);
  const rates = snap.rates;
  expect(Object.keys(rates).length).toBeGreaterThanOrEqual(19);
  for (const code of ['USD', 'AED', 'EGP', 'NGN', 'GBP', 'SGD', 'SAR', 'QAR', 'INR', 'IDR']) {
    expect(rates[code]).toBeGreaterThan(0);
  }
  for (const code of snap.missing) {
    expect(['EUR', 'CAD', 'AUD']).toContain(code);
  }
});

test('tax brackets: 24 progressive regimes, ascending open-topped scales, valid socials', () => {
  const rows = load('tax-brackets.json');
  expect(rows).toHaveLength(24);
  for (const r of rows) {
    expect(r.iso3).toMatch(/^[A-Z]{3}$/);
    expect(r.brackets.length).toBeGreaterThanOrEqual(2);
    expect(r.brackets[r.brackets.length - 1].threshold).toBeNull();
    let prev = 0;
    for (const b of r.brackets.slice(0, -1)) {
      expect(b.threshold).toBeGreaterThan(prev);
      prev = b.threshold;
    }
    for (const b of r.brackets) expect(b.rate).toBeGreaterThanOrEqual(0);
    expect(r.brackets.some((b: { rate: number }) => b.rate > 0)).toBe(true);
    for (const s of r.employeeSocial ?? []) {
      expect(s.rate).toBeGreaterThan(0);
      if (s.wageBaseCapAnnual !== null) expect(s.wageBaseCapAnnual).toBeGreaterThan(0);
    }
    expect(r.sourceUrl.startsWith('https://')).toBe(true);
    expect(r.note.length).toBeGreaterThan(30);
  }
});

test('hardship posts: DSSR rows for target countries only, valid schema', () => {
  const rows = load('hardship-posts.json');
  expect(rows.length).toBeGreaterThan(300);
  const iso3 = new Set(load('countries.json').map((c: { iso3: string }) => c.iso3));
  const keys = new Set<string>();
  for (const r of rows) {
    expect(iso3.has(r.iso3)).toBe(true);
    expect(Number.isInteger(r.differentialPct)).toBe(true);
    expect(r.differentialPct).toBeGreaterThanOrEqual(5);
    expect(r.differentialPct).toBeLessThanOrEqual(35);
    expect(r.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.sourceUrl.startsWith('https://')).toBe(true);
    const key = `${r.iso3}/${r.city}`;
    expect(keys.has(key)).toBe(false);
    keys.add(key);
  }
  expect(rows.every((r: { effectiveDate: string }) => r.effectiveDate === rows[0].effectiveDate)).toBe(true);
});

test('remote pay policies: curated rows, valid percentages, sources dated', () => {
  const rows = load('remote-policies.json');
  expect(rows.length).toBeGreaterThanOrEqual(15);
  const patterns = new Set(rows.map((r: { pattern: string }) => r.pattern));
  expect(patterns.has('localize-to-worker-country')).toBe(true);
  expect(patterns.has('location-agnostic-global-bands')).toBe(true);
  expect(patterns.has('location-adjustment-magnitude')).toBe(true);
  for (const r of rows) {
    for (const k of ['prevalencePct', 'adjustmentPct'] as const) {
      if (r[k] !== null) {
        expect(r[k]).toBeGreaterThanOrEqual(0);
        expect(r[k]).toBeLessThanOrEqual(100);
      }
    }
    expect(r.sourceUrl.startsWith('https://')).toBe(true);
    expect(r.note.length).toBeGreaterThan(20);
    expect(r.date.length).toBeGreaterThan(3);
  }
});
