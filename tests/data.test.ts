import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));
// Memoized: benchmarks.json is several MB and every wave test loads it; re-parsing per
// call pushed the matrix validation over the 5s default timeout on slower CI runners.
const fileCache = new Map<string, any>();
const load = (name: string) => {
  if (!fileCache.has(name)) {
    fileCache.set(name, JSON.parse(readFileSync(`${root}src/data/${name}`, 'utf8')));
  }
  return fileCache.get(name);
};

const TIER_1 = ['ARE', 'DEU', 'EGY', 'GBR', 'IDN', 'IND', 'QAT', 'SAU', 'SGP', 'USA'];
const CURATED_TIER_2 = ['VNM', 'PHL', 'THA', 'ZAF', 'KEN', 'NGA', 'LBN', 'MAR', 'PAN', 'MEX', 'CAN', 'AUS', 'NLD'];

test('countries: world-wide coverage, unique iso3, valid shape, tier 1 set exact', () => {
  const rows = load('countries.json');
  // World-wide coverage: every World Bank economy with usable PPP data (9 excluded for
  // missing or non-comparable data: CHI CUB GIB IMN LIE MAF MCO PRK YEM, plus VEN ZWE),
  // plus Taiwan, whose PPP comes from the IMF (the World Bank has no Taiwan series).
  expect(rows.length).toBe(207);
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
  // Taiwan joined 2026-09-03 as the 207th country: tier 3, TWD, no statutory tax regime
  // (the disclosed 20 percent default applies), PPP via IMF WEO.
  const taiwan = rows.find((r: { iso3: string }) => r.iso3 === 'TWN') as { name: string; currency: string; region: string; tier: number } | undefined;
  expect(taiwan).toBeDefined();
  expect(taiwan!.name).toBe('Taiwan');
  expect(taiwan!.currency).toBe('TWD');
  expect(taiwan!.region).toBe('Asia');
  expect(taiwan!.tier).toBe(3);
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
    TWN: 13.651,
  };
  for (const row of rows) {
    expect(row.year).toBeGreaterThanOrEqual(2020);
    expect(row.value).toBeGreaterThan(0);
    if (row.iso3 === 'TWN') {
      // Taiwan: the World Bank publishes no Taiwan PPP, so this one row uses the IMF WEO
      // implied PPP conversion rate (GDP basis, 2025) under IMF open-use-with-attribution terms.
      expect(row.license).toBe('IMF WEO, open use with attribution');
      expect(row.sourceUrl).toContain('imf.org');
      expect(row.year).toBe(2025);
    } else {
      expect(row.license).toBe('CC BY 4.0');
    }
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

test('benchmarks: full curated matrix, honest insufficient-data markers, curated rows valid', { timeout: 20_000 }, () => {
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
    const seeds = load('benchmark-seeds.json').rows;
    const maxReviewed = seeds.reduce(
      (m: string, r: { lastReviewed: string }) => (r.lastReviewed > m ? r.lastReviewed : m),
      '1970-01-01',
    );
    expect(marker.lastReviewed).toBe(maxReviewed);
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

test('tax bracket notes disclose the representativeCheck savings convention', () => {
  const rows = load('tax-brackets.json');
  for (const code of ['SGP', 'MYS']) {
    const row = rows.find((r: { iso3: string }) => r.iso3 === code);
    expect(row.note, code).toMatch(/representativeCheck|production excludes/);
  }
});

test('the benchmark matrix date is derived from the seeds, not hardcoded', () => {
  const seeds = load('benchmark-seeds.json').rows;
  const max = seeds.reduce(
    (m: string, r: { lastReviewed: string }) => (r.lastReviewed > m ? r.lastReviewed : m),
    '1970-01-01',
  );
  expect(load('benchmarks.json').meta.lastReviewed).toBe(max);
});

test('seed sources cite publishers, not scribd rehosts', () => {
  const seeds = load('benchmark-seeds.json').rows;
  for (const row of seeds) {
    for (const url of (row.sources ?? []) as string[]) {
      expect(String(url)).not.toContain('scribd');
    }
  }
});

test('Indonesia curation: the last tier-1 gap now carries verified rows', () => {
  const rows = load('benchmarks.json').entries.filter(
    (e: { country: string; status?: string }) => e.country === 'IDN' && e.status === undefined,
  );
  // JobStreet ad-market averages plus Michael Page placement averages, 2026-09-02.
  expect(rows.length).toBeGreaterThanOrEqual(20);
  for (const row of rows) {
    expect(row.currency).toBe('IDR');
    // Every source publishes a single average: the band collapses to the median.
    expect(row.p25).toBe(0);
    expect(row.p75).toBe(0);
  }
  const itLead = rows.find((r: { family: string; level: string }) => r.family === 'it-executive' && r.level === 'lead');
  expect(itLead.p50).toBe(80_000_000);
  const swExec = rows.find((r: { family: string; level: string }) => r.family === 'software-engineering' && r.level === 'executive');
  expect(swExec.p50).toBe(110_000_000);
});

test('expansion wave 2: China, Korea, Hong Kong, Brazil, Switzerland carry verified rows', () => {
  const by = (cc: string) => load('benchmarks.json').entries.filter(
    (e: { country: string; status?: string }) => e.country === cc && e.status === undefined,
  );
  const currency = { CHN: 'CNH', KOR: 'KRW', HKG: 'HKD', BRA: 'BRL', CHE: 'CHF' };
  const counts = { CHN: 30, KOR: 3, HKG: 32, BRA: 24, CHE: 19 };
  for (const cc of Object.keys(counts)) {
    const rows = by(cc);
    expect(rows.length, cc).toBeGreaterThanOrEqual(counts[cc as keyof typeof counts]);
    for (const row of rows) {
      expect(row.currency, cc).toBe(currency[cc as keyof typeof currency]);
    }
  }
  // Spot anchors verified against the cited pages on 2026-09-02.
  const chnIt = by('CHN').find((r: { family: string; level: string }) => r.family === 'it-executive' && r.level === 'executive');
  expect(chnIt.p50).toBe(1_600_000);
  expect(chnIt.basis).toBe('annual-gross');
  const korSw = by('KOR').find((r: { family: string; level: string }) => r.family === 'software-engineering' && r.level === 'senior');
  expect(korSw.p50).toBe(77_540_000);
  const hkgCeo = by('HKG').find((r: { family: string; level: string }) => r.family === 'general-management' && r.level === 'executive');
  expect(hkgCeo.p50).toBe(135_000);
  const braSw = by('BRA').find((r: { family: string; level: string }) => r.family === 'software-engineering' && r.level === 'senior');
  expect(braSw.p25).toBe(12_450);
  expect(braSw.p75).toBe(20_950);
  const cheFin = by('CHE').find((r: { family: string; level: string }) => r.family === 'finance-and-accounting' && r.level === 'lead');
  // Replaced by the 2026-09-07 SES spine: the Robert Half span became the official finance-managers mean.
  expect(cheFin.p50).toBe(18_392);
  expect(cheFin.quality).toBe('High');
  // Self-reported crowd sources stay Low even with big n.
  const cheDelivery = by('CHE').find((r: { family: string; level: string }) => r.family === 'delivery-and-project-management' && r.level === 'lead');
  expect(cheDelivery.quality).toBe('Low');
});

test('expansion wave 3: France, Spain, Poland, Turkey carry verified rows', () => {
  const by = (cc: string) => load('benchmarks.json').entries.filter(
    (e: { country: string; status?: string }) => e.country === cc && e.status === undefined,
  );
  const currency = { FRA: 'EUR', ESP: 'EUR', POL: 'PLN', TUR: 'TRY' };
  const counts = { FRA: 22, ESP: 16, POL: 22, TUR: 11 };
  for (const cc of Object.keys(counts)) {
    const rows = by(cc);
    expect(rows.length, cc).toBeGreaterThanOrEqual(counts[cc as keyof typeof counts]);
    for (const row of rows) {
      expect(row.currency, cc).toBe(currency[cc as keyof typeof currency]);
    }
  }
  // Spot anchors verified against the cited pages on 2026-09-02.
  const fraIt = by('FRA').find((r: { family: string; level: string }) => r.family === 'it-executive' && r.level === 'executive');
  // Replaced by the 2026-09-07 SES spine: the Robert Half span became the economy-wide managers mean.
  expect(fraIt.p50).toBe(5_580);
  expect(fraIt.p75).toBe(0);
  expect(fraIt.basis).toBe('monthly-gross');
  const espSw = by('ESP').find((r: { family: string; level: string }) => r.family === 'software-engineering' && r.level === 'senior');
  expect(espSw.p25).toBe(32_763);
  expect(espSw.p50).toBe(41_846);
  expect(espSw.p75).toBe(54_731);
  // INE rows carry 2022 survey vintage, so quality caps at Medium with the year disclosed.
  expect(espSw.quality).toBe('Medium');
  expect(espSw.note).toContain('2022');
  const polSw = by('POL').find((r: { family: string; level: string }) => r.family === 'software-engineering' && r.level === 'senior');
  // Replaced by the 2026-09-07 SES spine: the justjoin job-ad median became the official ICT-professionals mean.
  expect(polSw.p50).toBe(11_710);
  expect(polSw.basis).toBe('monthly-gross');
  expect(polSw.p25).toBe(0);
  expect(polSw.p75).toBe(0);
  const turSw = by('TUR').find((r: { family: string; level: string }) => r.family === 'software-engineering' && r.level === 'senior');
  expect(turSw.p50).toBe(91_799.62);
  expect(turSw.basis).toBe('monthly-gross');
  expect(turSw.quality).toBe('Medium');
});

test('expansion wave 4: Italy, Sweden, Norway, Denmark, Czechia, Portugal carry verified rows', () => {
  const by = (cc: string) => load('benchmarks.json').entries.filter(
    (e: { country: string; status?: string }) => e.country === cc && e.status === undefined,
  );
  const currency = { ITA: 'EUR', SWE: 'SEK', NOR: 'NOK', DNK: 'DKK', CZE: 'CZK', PRT: 'EUR' };
  const counts = { ITA: 37, SWE: 39, NOR: 25, DNK: 32, CZE: 38, PRT: 17 };
  for (const cc of Object.keys(counts)) {
    const rows = by(cc);
    expect(rows.length, cc).toBeGreaterThanOrEqual(counts[cc as keyof typeof counts]);
    for (const row of rows) {
      expect(row.currency, cc).toBe(currency[cc as keyof typeof currency]);
    }
  }
  // Spot anchors verified against the cited statistical agency pages on 2026-09-02.
  const sweSw = by('SWE').find((r: { family: string; level: string }) => r.family === 'software-engineering' && r.level === 'senior');
  expect(sweSw.p25).toBe(46_200);
  expect(sweSw.p50).toBe(53_500);
  expect(sweSw.p75).toBe(62_600);
  expect(sweSw.quality).toBe('High');
  const norSw = by('NOR').find((r: { family: string; level: string }) => r.family === 'software-engineering' && r.level === 'senior');
  expect(norSw.p25).toBe(63_330);
  expect(norSw.p50).toBe(77_420);
  expect(norSw.p75).toBe(93_820);
  const dnkSw = by('DNK').find((r: { family: string; level: string }) => r.family === 'software-engineering' && r.level === 'senior');
  expect(dnkSw.p25).toBe(52_834);
  expect(dnkSw.p50).toBe(64_499);
  expect(dnkSw.p75).toBe(78_185);
  const czeSw = by('CZE').find((r: { family: string; level: string }) => r.family === 'software-engineering' && r.level === 'senior');
  expect(czeSw.p25).toBe(71_536);
  expect(czeSw.p50).toBe(101_103);
  expect(czeSw.p75).toBe(141_956);
  const itaEdu = by('ITA').find((r: { family: string; level: string }) => r.family === 'education-and-teaching' && r.level === 'senior');
  expect(itaEdu.p25).toBe(28_867);
  expect(itaEdu.p50).toBe(31_590);
  expect(itaEdu.p75).toBe(35_112);
  expect(itaEdu.basis).toBe('annual-gross');
  const prtGm = by('PRT').find((r: { family: string; level: string }) => r.family === 'general-management' && r.level === 'senior');
  expect(prtGm.p50).toBe(3_295.9);
  expect(prtGm.basis).toBe('monthly-gross');
  // Span sources (published 10th to 90th percentiles) become a disclosed midpoint, never a zero median.
  const czeDesign = by('CZE').find((r: { family: string; level: string }) => r.family === 'design' && r.level === 'senior');
  expect(czeDesign.p50).toBeGreaterThan(0);
  expect(czeDesign.note).toContain('midpoint');
  // A suppressed quartile collapses to the median-only convention, disclosed.
  const sweFinExec = by('SWE').find((r: { family: string; level: string }) => r.family === 'finance-and-accounting' && r.level === 'executive');
  expect(sweFinExec.p25).toBe(0);
  expect(sweFinExec.p75).toBe(0);
  expect(sweFinExec.p50).toBe(77_800);
  expect(sweFinExec.note).toContain('uppressed');
});

test('expansion wave 5: Finland, Austria, Belgium, Romania, Greece carry verified rows', () => {
  const by = (cc: string) => load('benchmarks.json').entries.filter(
    (e: { country: string; status?: string }) => e.country === cc && e.status === undefined,
  );
  const currency = { FIN: 'EUR', AUT: 'EUR', BEL: 'EUR', ROU: 'RON', GRC: 'EUR' };
  const counts = { FIN: 34, AUT: 48, BEL: 25, ROU: 17, GRC: 39 };
  for (const cc of Object.keys(counts)) {
    const rows = by(cc);
    expect(rows.length, cc).toBeGreaterThanOrEqual(counts[cc as keyof typeof counts]);
    for (const row of rows) {
      expect(row.currency, cc).toBe(currency[cc as keyof typeof currency]);
    }
  }
  // Spot anchors verified against the cited official sources on 2026-09-02.
  const finEdu = by('FIN').find((r: { family: string; level: string }) => r.family === 'education-and-teaching' && r.level === 'senior');
  expect(finEdu.p25).toBe(3_509);
  expect(finEdu.p50).toBe(4_681);
  expect(finEdu.p75).toBe(5_736);
  expect(finEdu.basis).toBe('monthly-gross');
  expect(finEdu.note).toContain('decile');
  const autSw = by('AUT').find((r: { family: string; level: string }) => r.family === 'software-engineering' && r.level === 'senior');
  expect(autSw.p25).toBe(39_263);
  expect(autSw.p50).toBe(59_352);
  expect(autSw.p75).toBe(79_770);
  expect(autSw.basis).toBe('annual-gross');
  const autGm = by('AUT').find((r: { family: string; level: string }) => r.family === 'general-management' && r.level === 'executive');
  expect(autGm.p50).toBe(107_866);
  expect(autGm.p75).toBe(188_000);
  const belEdu = by('BEL').find((r: { family: string; level: string }) => r.family === 'education-and-teaching' && r.level === 'senior');
  expect(belEdu.p50).toBe(4_736.73);
  expect(belEdu.basis).toBe('monthly-gross');
  const rouSw = by('ROU').find((r: { family: string; level: string }) => r.family === 'software-engineering' && r.level === 'senior');
  expect(rouSw.p50).toBe(22_689);
  expect(rouSw.basis).toBe('monthly-gross');
  expect(rouSw.note).toContain('CAEN 62');
  const grcGm = by('GRC').find((r: { family: string; level: string }) => r.family === 'general-management' && r.level === 'senior');
  expect(grcGm.p50).toBe(2_199);
  expect(grcGm.basis).toBe('monthly-gross');
  // Statutory and decile spans become disclosed midpoints, never zero medians.
  const rouHealth = by('ROU').find((r: { family: string; level: string }) => r.family === 'healthcare' && r.level === 'senior');
  expect(rouHealth.p50).toBe(15_542);
  expect(rouHealth.p25).toBe(13_843);
  expect(rouHealth.p75).toBe(17_241);
  expect(rouHealth.note).toContain('midpoint');
  const grcDesign = by('GRC').find((r: { family: string; level: string }) => r.family === 'design' && r.level === 'senior');
  expect(grcDesign.p50).toBeGreaterThan(0);
  expect(grcDesign.note).toContain('midpoint');
});

test('expansion wave 6: Israel, Chile, Colombia, Argentina carry verified rows', () => {
  const by = (cc: string) => load('benchmarks.json').entries.filter(
    (e: { country: string; status?: string }) => e.country === cc && e.status === undefined,
  );
  // Taiwan had 46 verified rows curated but is not in the 206-country list (the World Bank PPP
  // pipeline has no Taiwan data); shipping it needs a product decision, not a curation merge.
  const currency = { ISR: 'ILS', CHL: 'CLP', COL: 'COP', ARG: 'ARS' };
  const counts = { ISR: 38, CHL: 28, COL: 23, ARG: 31 };
  for (const cc of Object.keys(counts)) {
    const rows = by(cc);
    expect(rows.length, cc).toBeGreaterThanOrEqual(counts[cc as keyof typeof counts]);
    for (const row of rows) {
      expect(row.currency, cc).toBe(currency[cc as keyof typeof currency]);
    }
  }
  // Spot anchors verified against the cited pages on 2026-09-03.
  const isrEdu = by('ISR').find((r: { family: string; level: string }) => r.family === 'education-and-teaching' && r.level === 'senior');
  expect(isrEdu.p25).toBe(12_236);
  expect(isrEdu.p50).toBe(16_716);
  expect(isrEdu.p75).toBe(22_314);
  expect(isrEdu.basis).toBe('monthly-gross');
  expect(isrEdu.quality).toBe('High');
  const chlEdu = by('CHL').find((r: { family: string; level: string }) => r.family === 'education-and-teaching' && r.level === 'senior');
  expect(chlEdu.p50).toBe(936_585);
  expect(chlEdu.p25).toBe(0);
  expect(chlEdu.p75).toBe(0);
  expect(chlEdu.note).toContain('floor');
  const colEdu = by('COL').find((r: { family: string; level: string }) => r.family === 'education-and-teaching' && r.level === 'senior');
  expect(colEdu.p25).toBe(4_506_804);
  expect(colEdu.p75).toBe(6_758_592);
  expect(colEdu.p50).toBe(5_632_698);
  expect(colEdu.note).toContain('midpoint');
  const colGm = by('COL').find((r: { family: string; level: string }) => r.family === 'general-management' && r.level === 'executive');
  expect(colGm.p25).toBe(12_800_000);
  expect(colGm.p50).toBe(24_198_000);
  expect(colGm.p75).toBe(37_158_000);
  const argSw = by('ARG').find((r: { family: string; level: string }) => r.family === 'software-engineering' && r.level === 'senior');
  expect(argSw.p50).toBe(3_500_000);
  expect(argSw.basis).toBe('monthly-gross');
  expect(argSw.quality).toBe('Low');
  // Statutory scale spans become disclosed midpoints.
  const argHealth = by('ARG').find((r: { family: string; level: string }) => r.family === 'healthcare' && r.level === 'senior');
  expect(argHealth.p50).toBe(1_800_583);
  expect(argHealth.note).toContain('midpoint');
  expect(argHealth.quality).toBe('High');
});

test('Taiwan: the 207th country ships with its parked and verified rows', () => {
  const by = (cc: string) => load('benchmarks.json').entries.filter(
    (e: { country: string; status?: string }) => e.country === cc && e.status === undefined,
  );
  const rows = by('TWN');
  expect(rows.length).toBeGreaterThanOrEqual(46);
  for (const row of rows) {
    expect(row.currency).toBe('TWD');
    expect(row.basis).toBe('monthly-gross');
  }
  // Anchor verified verbatim against 104's public JSON on 2026-09-03:
  // salary25/50/75 = 50000/60000/75000 for the 5-to-10-year band, n 4548.
  const sw = rows.find((r: { family: string; level: string }) => r.family === 'software-engineering' && r.level === 'senior');
  expect(sw.p25).toBe(50_000);
  expect(sw.p50).toBe(60_000);
  expect(sw.p75).toBe(75_000);
  expect(sw.quality).toBe('Medium');
  // Cells with sample under 100 stay Low per the curation rubric.
  const cyberLead = rows.find((r: { family: string; level: string }) => r.family === 'cybersecurity' && r.level === 'lead');
  expect(cyberLead.quality).toBe('Low');
});

test('expansion wave 7: the remaining EEA markets and Peru carry verified rows', () => {
  const by = (cc: string) => load('benchmarks.json').entries.filter(
    (e: { country: string; status?: string }) => e.country === cc && e.status === undefined,
  );
  const currency: Record<string, string> = {
    BGR: 'EUR', HRV: 'EUR', CYP: 'EUR', EST: 'EUR', ISL: 'ISK', LTU: 'EUR', LUX: 'EUR',
    MLT: 'EUR', SVK: 'EUR', SVN: 'EUR', PER: 'PEN', HUN: 'HUF', LVA: 'EUR',
  };
  const counts: Record<string, number> = {
    BGR: 46, HRV: 34, CYP: 30, EST: 23, ISL: 39, LTU: 39, LUX: 23, MLT: 29,
    SVK: 40, SVN: 37, PER: 28, HUN: 25, LVA: 25,
  };
  for (const cc of Object.keys(counts)) {
    const rows = by(cc);
    expect(rows.length, cc).toBeGreaterThanOrEqual(counts[cc]);
    for (const row of rows) {
      expect(row.currency, cc).toBe(currency[cc]);
    }
  }
  // Spot anchors verified against the cited sources on 2026-09-04.
  const bgrSw = by('BGR').find((r: { family: string; level: string }) => r.family === 'software-engineering' && r.level === 'senior');
  expect(bgrSw.p50).toBe(2_270);
  expect(bgrSw.currency).toBe('EUR');
  const hrvSw = by('HRV').find((r: { family: string; level: string }) => r.family === 'software-engineering' && r.level === 'senior');
  expect(hrvSw.p50).toBe(2_729);
  const cypSw = by('CYP').find((r: { family: string; level: string }) => r.family === 'software-engineering' && r.level === 'senior');
  expect(cypSw.p50).toBe(3_489);
  const estSw = by('EST').find((r: { family: string; level: string }) => r.family === 'software-engineering' && r.level === 'senior');
  expect(estSw.p50).toBe(4_614);
  const islSw = by('ISL').find((r: { family: string; level: string }) => r.family === 'software-engineering' && r.level === 'senior');
  expect(islSw.p25).toBe(1_138_000);
  expect(islSw.p75).toBe(1_341_000);
  expect(islSw.p50).toBe(1_239_500);
  expect(islSw.note).toContain('midpoint');
  const ltuSw = by('LTU').find((r: { family: string; level: string }) => r.family === 'software-engineering' && r.level === 'senior');
  expect(ltuSw.p25).toBe(1_707);
  expect(ltuSw.p75).toBe(8_641);
  expect(ltuSw.p50).toBe(5_174);
  expect(ltuSw.quality).toBe('Low');
  const luxLead = by('LUX').find((r: { family: string; level: string }) => r.family === 'software-engineering' && r.level === 'lead');
  expect(luxLead.p50).toBe(8_355);
  const mltFin = by('MLT').find((r: { family: string; level: string }) => r.family === 'finance-and-accounting' && r.level === 'senior');
  expect(mltFin.p50).toBe(2_795);
  const svkIt = by('SVK').find((r: { family: string; level: string }) => r.family === 'it-executive' && r.level === 'lead');
  // Upgraded to the Eurostat SES 2022 managers-in-ICT mean in the Slovakia pass (2026-09-06).
  expect(svkIt.p25).toBe(0);
  expect(svkIt.p50).toBe(3_626);
  expect(svkIt.p75).toBe(0);
  expect(svkIt.quality).toBe('High');
  const svnSw = by('SVN').find((r: { family: string; level: string }) => r.family === 'software-engineering' && r.level === 'senior');
  expect(svnSw.p25).toBe(2_556.13);
  expect(svnSw.p50).toBe(3_400.01);
  expect(svnSw.p75).toBe(4_414.03);
  expect(svnSw.quality).toBe('High');
  const perHealth = by('PER').find((r: { family: string; level: string }) => r.family === 'healthcare' && r.level === 'senior');
  expect(perHealth.p50).toBe(8_312);
  // Hungary and Latvia were built directly from the reviewer's own Eurostat pull.
  const hunSw = by('HUN').find((r: { family: string; level: string }) => r.family === 'software-engineering' && r.level === 'senior');
  expect(hunSw.p50).toBe(883_381);
  expect(hunSw.quality).toBe('High');
  const lvaSw = by('LVA').find((r: { family: string; level: string }) => r.family === 'software-engineering' && r.level === 'senior');
  expect(lvaSw.p50).toBe(3_023);
  expect(lvaSw.quality).toBe('High');
});

test('Western Balkans pass (2026-09-05): SES 2022 backbone rows with verbatim anchors', () => {
  const by = (cc: string) => load('benchmarks.json').entries.filter(
    (e: { country: string; status?: string }) => e.country === cc && e.status === undefined,
  );
  const currency = { SRB: 'RSD', ALB: 'ALL', MKD: 'MKD', BIH: 'BAM' };
  // Montenegro and Kosovo publish nothing in SES 2022, so they stay marker-only.
  const counts = { SRB: 25, ALB: 21, MKD: 24, BIH: 25 };
  for (const cc of Object.keys(counts)) {
    const rows = by(cc);
    expect(rows.length, `${cc} row count`).toBe(counts[cc as keyof typeof counts]);
    for (const row of rows) {
      expect(row.currency, cc).toBe(currency[cc as keyof typeof currency]);
      expect(row.basis, cc).toBe('monthly-gross');
    }
  }
  // Anchors re-fetched from the exact filtered API cells on 2026-09-05.
  const anchor = (cc: string, family: string, level: string, value: number) => {
    const row = by(cc).find((r: { family: string; level: string }) => r.family === family && r.level === level);
    expect(row, `${cc} ${family} ${level}`).toBeDefined();
    expect(row!.p50).toBe(value);
    expect(row!.p25).toBe(0);
    expect(row!.p75).toBe(0);
  };
  anchor('SRB', 'software-engineering', 'senior', 339_846);
  anchor('SRB', 'healthcare', 'lead', 148_145);
  anchor('ALB', 'software-engineering', 'senior', 119_638);
  anchor('ALB', 'finance-and-accounting', 'lead', 291_869);
  anchor('MKD', 'software-engineering', 'senior', 117_002);
  anchor('MKD', 'healthcare', 'lead', 124_997);
  anchor('BIH', 'software-engineering', 'senior', 3_459);
  anchor('BIH', 'healthcare', 'lead', 4_598);
  // Albania has no economy-wide managers cell, so no executive rows may exist there.
  expect(by('ALB').filter((r: { level: string }) => r.level === 'executive')).toHaveLength(0);
  // Ten lead cells planned; North Macedonia misses the finance managers cell only.
  expect(by('MKD').filter((r: { level: string }) => r.level === 'lead')).toHaveLength(9);
  expect(by('SRB').filter((r: { level: string }) => r.level === 'lead')).toHaveLength(10);
});

test('Georgia pass (2026-09-06): Geostat occupation spine with Revenue Service median corroboration', () => {
  const by = (cc: string) => load('benchmarks.json').entries.filter(
    (e: { country: string; status?: string }) => e.country === cc && e.status === undefined,
  );
  const rows = by('GEO');
  expect(rows.length, 'GEO row count').toBe(16);
  for (const row of rows) {
    expect(row.currency, 'GEO currency').toBe('GEL');
    expect(row.basis, 'GEO basis').toBe('monthly-gross');
    expect(row.p25, 'GEO median-only shape').toBe(0);
    expect(row.p75, 'GEO median-only shape').toBe(0);
    expect(row.quality, 'GEO mixed-vintage official data stays Medium').toBe('Medium');
  }
  // Anchors verbatim from the Geostat 2021 occupation sheet and the 2024 median file.
  const anchor = (family: string, level: string, value: number) => {
    const row = rows.find((r: { family: string; level: string }) => r.family === family && r.level === level);
    expect(row, `GEO ${family} ${level}`).toBeDefined();
    expect(row!.p50).toBe(value);
  };
  anchor('software-engineering', 'senior', 2_268.39);
  anchor('it-executive', 'executive', 3_848.86);
  anchor('finance-and-accounting', 'senior', 1_422.44);
  anchor('healthcare', 'senior', 1_446.74);
  anchor('education-and-teaching', 'senior', 994.43);
  anchor('marketing-and-growth', 'senior', 1_786);
  anchor('operations-and-supply-chain', 'senior', 1_553);
});

test('Caucasus-Central Asia pass (2026-09-06): Armenia and Kazakhstan sector-spine rows with verbatim anchors', () => {
  const by = (cc: string) => load('benchmarks.json').entries.filter(
    (e: { country: string; status?: string }) => e.country === cc && e.status === undefined,
  );
  const expected = { ARM: 'AMD', KAZ: 'KZT' };
  for (const cc of Object.keys(expected)) {
    const rows = by(cc);
    expect(rows.length, `${cc} row count`).toBe(11);
    for (const row of rows) {
      expect(row.currency, cc).toBe(expected[cc as keyof typeof expected]);
      expect(row.basis, cc).toBe('monthly-gross');
      expect(row.p25, cc).toBe(0);
      expect(row.p75, cc).toBe(0);
      expect(row.quality, cc).toBe('Medium');
    }
    // Senior-only by design: no occupation or manager cuts exist in these sources.
    expect(by(cc).filter((r: { level: string }) => r.level === 'senior')).toHaveLength(11);
  }
  const anchor = (cc: string, family: string, value: number) => {
    const row = by(cc).find((r: { family: string }) => r.family === family);
    expect(row, `${cc} ${family}`).toBeDefined();
    expect(row!.p50).toBe(value);
  };
  // Armenia: ArmStat 2025 annual column; the ICT sub-aggregate sits inside NACE J.
  anchor('ARM', 'software-engineering', 1_052_774);
  anchor('ARM', 'finance-and-accounting', 956_061);
  anchor('ARM', 'healthcare', 261_687);
  anchor('ARM', 'education-and-teaching', 174_424);
  // Kazakhstan: BNS 2025 by activity, small enterprises included.
  anchor('KAZ', 'software-engineering', 674_113);
  anchor('KAZ', 'finance-and-accounting', 854_440);
  anchor('KAZ', 'operations-and-supply-chain', 524_638);
  anchor('KAZ', 'healthcare', 334_195);
});

test('Azerbaijan pass (2026-09-06): sector-spine rows with verbatim anchors', () => {
  const by = (cc: string) => load('benchmarks.json').entries.filter(
    (e: { country: string; status?: string }) => e.country === cc && e.status === undefined,
  );
  const rows = by('AZE');
  expect(rows.length, 'AZE row count').toBe(11);
  for (const row of rows) {
    expect(row.currency, 'AZE currency').toBe('AZN');
    expect(row.basis, 'AZE basis').toBe('monthly-gross');
    expect(row.p25).toBe(0);
    expect(row.p75).toBe(0);
    expect(row.quality).toBe('Medium');
  }
  expect(rows.filter((r: { level: string }) => r.level === 'senior')).toHaveLength(11);
  const anchor = (family: string, value: number) => {
    const row = rows.find((r: { family: string }) => r.family === family);
    expect(row, `AZE ${family}`).toBeDefined();
    expect(row!.p50).toBe(value);
  };
  anchor('software-engineering', 1_672.1);
  anchor('finance-and-accounting', 2_687.4);
  anchor('marketing-and-growth', 1_711.2);
  anchor('operations-and-supply-chain', 1_392.5);
  anchor('healthcare', 847.3);
  anchor('education-and-teaching', 754.2);
});

test('Kyrgyzstan pass (2026-09-06): sector-spine rows with verbatim anchors', () => {
  const by = (cc: string) => load('benchmarks.json').entries.filter(
    (e: { country: string; status?: string }) => e.country === cc && e.status === undefined,
  );
  const rows = by('KGZ');
  expect(rows.length, 'KGZ row count').toBe(11);
  for (const row of rows) {
    expect(row.currency, 'KGZ currency').toBe('KGS');
    expect(row.basis, 'KGZ basis').toBe('monthly-gross');
    expect(row.p25).toBe(0);
    expect(row.p75).toBe(0);
    expect(row.quality).toBe('Medium');
    // The published series excludes small enterprises; every note must say so.
    expect(row.note).toContain('excluding small enterprises');
  }
  expect(rows.filter((r: { level: string }) => r.level === 'senior')).toHaveLength(11);
  const anchor = (family: string, value: number) => {
    const row = rows.find((r: { family: string }) => r.family === family);
    expect(row, `KGZ ${family}`).toBeDefined();
    expect(row!.p50).toBe(value);
  };
  anchor('software-engineering', 64_126);
  anchor('finance-and-accounting', 71_973);
  anchor('marketing-and-growth', 42_349);
  anchor('operations-and-supply-chain', 46_670);
  anchor('healthcare', 23_353);
  anchor('education-and-teaching', 25_786);
});

test('Turkey upgrade (2026-09-06): TUIK NACE Rev.2 spine replaces the ERI rows with verbatim anchors', () => {
  const by = (cc: string) => load('benchmarks.json').entries.filter(
    (e: { country: string; status?: string }) => e.country === cc && e.status === undefined,
  );
  const rows = by('TUR');
  expect(rows.length, 'TUR row count').toBe(14);
  for (const row of rows) {
    expect(row.currency, 'TUR currency').toBe('TRY');
    expect(row.basis, 'TUR basis').toBe('monthly-gross');
    expect(row.p25).toBe(0);
    expect(row.p75).toBe(0);
    expect(row.quality, 'TUIK official sector means stay Medium').toBe('Medium');
    expect(row.note).toContain('NACE Rev.2');
    expect(row.note).toContain('10 or more employees');
  }
  expect(rows.filter((r: { level: string }) => r.level === 'senior')).toHaveLength(11);
  expect(rows.filter((r: { level: string }) => r.level !== 'senior')).toHaveLength(3);
  const anchor = (family: string, value: number) => {
    const row = rows.find((r: { family: string }) => r.family === family);
    expect(row, `TUR ${family}`).toBeDefined();
    expect(row!.p50).toBe(value);
  };
  anchor('software-engineering', 91_799.62);
  anchor('data-and-ai', 80_826.88);
  anchor('cybersecurity', 91_799.62);
  anchor('finance-and-accounting', 104_715.47);
  anchor('marketing-and-growth', 35_567.52);
  anchor('hr-and-people', 34_626.62);
  anchor('sales-and-business-development', 30_714.11);
  anchor('operations-and-supply-chain', 36_307.63);
  anchor('engineering-civil-mechanical-electrical', 21_498.68);
  anchor('healthcare', 56_417.81);
  anchor('education-and-teaching', 62_846.07);
});

test('Russia pass (2026-09-06): Rosstat by-activity spine with verbatim anchors', () => {
  const by = (cc: string) => load('benchmarks.json').entries.filter(
    (e: { country: string; status?: string }) => e.country === cc && e.status === undefined,
  );
  const rows = by('RUS');
  expect(rows.length, 'RUS row count').toBe(11);
  for (const row of rows) {
    expect(row.currency, 'RUS currency').toBe('RUB');
    expect(row.basis, 'RUS basis').toBe('monthly-gross');
    expect(row.p25).toBe(0);
    expect(row.p75).toBe(0);
    expect(row.quality, 'Rosstat official sector means stay Medium').toBe('Medium');
    expect(row.note).toContain('Rosstat');
    expect(row.note).toContain('Zaporozhye and Kherson');
  }
  expect(rows.filter((r: { level: string }) => r.level === 'senior')).toHaveLength(11);
  expect(rows.filter((r: { level: string }) => r.level !== 'senior')).toHaveLength(0);
  const anchor = (family: string, value: number) => {
    const row = rows.find((r: { family: string }) => r.family === family);
    expect(row, `RUS ${family}`).toBeDefined();
    expect(row!.p50).toBe(value);
  };
  anchor('software-engineering', 184_338.9);
  anchor('data-and-ai', 184_338.9);
  anchor('cybersecurity', 184_338.9);
  anchor('finance-and-accounting', 216_870.4);
  anchor('marketing-and-growth', 145_842.6);
  anchor('hr-and-people', 71_525.4);
  anchor('sales-and-business-development', 89_444.1);
  anchor('operations-and-supply-chain', 103_763.7);
  anchor('engineering-civil-mechanical-electrical', 100_853);
  anchor('healthcare', 82_183.7);
  anchor('education-and-teaching', 71_344.3);
});

test('Moldova pass (2026-09-06): NBS CAEM sector spine with verbatim anchors', () => {
  const by = (cc: string) => load('benchmarks.json').entries.filter(
    (e: { country: string; status?: string }) => e.country === cc && e.status === undefined,
  );
  const rows = by('MDA');
  expect(rows.length, 'MDA row count').toBe(11);
  for (const row of rows) {
    expect(row.currency, 'MDA currency').toBe('MDL');
    expect(row.basis, 'MDA basis').toBe('monthly-gross');
    expect(row.p25).toBe(0);
    expect(row.p75).toBe(0);
    expect(row.quality, 'NBS official sector means stay Medium').toBe('Medium');
    expect(row.note).toContain('CAEM');
    expect(row.note).toContain('4 or more employees');
    expect(row.note).toContain('left bank of the Nistru');
  }
  expect(rows.filter((r: { level: string }) => r.level === 'senior')).toHaveLength(11);
  expect(rows.filter((r: { level: string }) => r.level !== 'senior')).toHaveLength(0);
  const anchor = (family: string, value: number) => {
    const row = rows.find((r: { family: string }) => r.family === family);
    expect(row, `MDA ${family}`).toBeDefined();
    expect(row!.p50).toBe(value);
  };
  anchor('software-engineering', 35_745.6);
  anchor('data-and-ai', 35_745.6);
  anchor('cybersecurity', 35_745.6);
  anchor('finance-and-accounting', 28_485.8);
  anchor('marketing-and-growth', 17_709.6);
  anchor('hr-and-people', 13_125.2);
  anchor('sales-and-business-development', 13_774.8);
  anchor('operations-and-supply-chain', 13_225.6);
  anchor('engineering-civil-mechanical-electrical', 13_231.4);
  anchor('healthcare', 17_166.1);
  anchor('education-and-teaching', 13_011.7);
});

test('Uzbekistan and Mongolia pass (2026-09-06): national statistics agency sector spines with verbatim anchors', () => {
  const by = (cc: string) => load('benchmarks.json').entries.filter(
    (e: { country: string; status?: string }) => e.country === cc && e.status === undefined,
  );
  const uzb = by('UZB');
  expect(uzb.length, 'UZB row count').toBe(9);
  for (const row of uzb) {
    expect(row.currency, 'UZB currency').toBe('UZS');
    expect(row.basis, 'UZB basis').toBe('monthly-gross');
    expect(row.p25).toBe(0);
    expect(row.p75).toBe(0);
    expect(row.quality, 'official sector means stay Medium').toBe('Medium');
    expect(row.note).toContain('thousand soums');
    expect(row.note).toContain('preliminary');
  }
  expect(uzb.filter((r: { level: string }) => r.level === 'senior')).toHaveLength(9);
  // The release publishes no professional-scientific or administrative cells, so marketing and HR rows must not exist.
  expect(uzb.filter((r: { family: string }) => r.family === 'marketing-and-growth')).toHaveLength(0);
  expect(uzb.filter((r: { family: string }) => r.family === 'hr-and-people')).toHaveLength(0);
  const uzbAnchor = (family: string, value: number) => {
    const row = uzb.find((r: { family: string }) => r.family === family);
    expect(row, `UZB ${family}`).toBeDefined();
    expect(row!.p50).toBe(value);
  };
  uzbAnchor('software-engineering', 15_298_100);
  uzbAnchor('data-and-ai', 15_298_100);
  uzbAnchor('cybersecurity', 15_298_100);
  uzbAnchor('finance-and-accounting', 17_597_500);
  uzbAnchor('sales-and-business-development', 6_961_200);
  uzbAnchor('operations-and-supply-chain', 9_659_100);
  uzbAnchor('engineering-civil-mechanical-electrical', 6_548_800);
  uzbAnchor('healthcare', 3_909_300);
  uzbAnchor('education-and-teaching', 4_372_000);

  const mng = by('MNG');
  expect(mng.length, 'MNG row count').toBe(14);
  for (const row of mng) {
    expect(row.currency, 'MNG currency').toBe('MNT');
    expect(row.basis, 'MNG basis').toBe('monthly-gross');
    expect(row.p25).toBe(0);
    expect(row.p75).toBe(0);
    expect(row.quality, 'NSO official sector means stay Medium').toBe('Medium');
    expect(row.note).toContain('thousand MNT');
    expect(row.note).toContain('2025');
  }
  expect(mng.filter((r: { level: string }) => r.level === 'senior')).toHaveLength(11);
  expect(mng.filter((r: { level: string }) => r.level === 'lead')).toHaveLength(3);
  // No chief-executives split is published, so no executive rows may exist.
  expect(mng.filter((r: { level: string }) => r.level === 'executive')).toHaveLength(0);
  const mngAnchor = (family: string, level: string, value: number) => {
    const row = mng.find((r: { family: string; level: string }) => r.family === family && r.level === level);
    expect(row, `MNG ${family} ${level}`).toBeDefined();
    expect(row!.p50).toBe(value);
  };
  mngAnchor('software-engineering', 'senior', 2_870_100);
  mngAnchor('data-and-ai', 'senior', 2_870_100);
  mngAnchor('cybersecurity', 'senior', 2_870_100);
  mngAnchor('finance-and-accounting', 'senior', 3_263_400);
  mngAnchor('marketing-and-growth', 'senior', 3_086_200);
  mngAnchor('hr-and-people', 'senior', 2_489_900);
  mngAnchor('sales-and-business-development', 'senior', 2_148_500);
  mngAnchor('operations-and-supply-chain', 'senior', 3_128_600);
  mngAnchor('engineering-civil-mechanical-electrical', 'senior', 2_426_200);
  mngAnchor('healthcare', 'senior', 2_498_100);
  mngAnchor('education-and-teaching', 'senior', 2_360_700);
  // The ISCO major-group-1 managers pool anchors the three lead cells (2025).
  mngAnchor('it-executive', 'lead', 3_091_800);
  mngAnchor('finance-and-accounting', 'lead', 3_091_800);
  mngAnchor('general-management', 'lead', 3_091_800);
  for (const row of mng.filter((r: { level: string }) => r.level === 'lead')) {
    expect(row.note).toContain('ISCO');
  }
});

test('Turkey level upgrade (2026-09-06): TUIK SES 2023 managers anchor the lead cells', () => {
  const by = (cc: string) => load('benchmarks.json').entries.filter(
    (e: { country: string; status?: string }) => e.country === cc && e.status === undefined,
  );
  const rows = by('TUR');
  expect(rows.length, 'TUR row count').toBe(14);
  expect(rows.filter((r: { level: string }) => r.level === 'senior')).toHaveLength(11);
  expect(rows.filter((r: { level: string }) => r.level === 'lead')).toHaveLength(3);
  expect(rows.filter((r: { level: string }) => r.level === 'executive')).toHaveLength(0);
  const lead = rows.filter((r: { level: string }) => r.level === 'lead');
  expect(lead.map((r: { family: string }) => r.family).sort()).toEqual(
    ['finance-and-accounting', 'general-management', 'it-executive'],
  );
  for (const row of lead) {
    expect(row.p50).toBe(54_949.87);
    expect(row.currency).toBe('TRY');
    expect(row.basis).toBe('monthly-gross');
    expect(row.quality).toBe('Medium');
    expect(row.note).toContain('SES');
    expect(row.note).toContain('2023');
    expect(row.note).toContain('Kazanç Yapısı');
  }
});

test('Belarus pass (2026-09-06): Belstat medians by activity with an IT sub-aggregate anchor', () => {
  const by = (cc: string) => load('benchmarks.json').entries.filter(
    (e: { country: string; status?: string }) => e.country === cc && e.status === undefined,
  );
  const rows = by('BLR');
  expect(rows.length, 'BLR row count').toBe(11);
  for (const row of rows) {
    expect(row.currency, 'BLR currency').toBe('BYN');
    expect(row.basis, 'BLR basis').toBe('monthly-gross');
    expect(row.p25).toBe(0);
    expect(row.p75).toBe(0);
    expect(row.quality, 'Belstat official figures stay Medium').toBe('Medium');
    expect(row.note).toContain('Belstat');
  }
  // Eight cells carry the published May 2026 sector MEDIANS.
  for (const row of rows.filter((r: { family: string }) => r.family !== 'software-engineering' && r.family !== 'data-and-ai' && r.family !== 'cybersecurity')) {
    expect(row.note).toContain('May 2026');
    expect(row.note).toContain('MEDIAN');
    expect(row.note).toContain('fewer than 50 employees');
  }
  // The tech trio keeps the Q2 2026 IT sub-aggregate mean, the only tech-specific figure published.
  for (const row of rows.filter((r: { family: string }) => ['software-engineering', 'data-and-ai', 'cybersecurity'].includes(r.family))) {
    expect(row.note).toContain('second quarter of 2026');
    expect(row.note).toContain('4,072.1');
  }
  expect(rows.filter((r: { level: string }) => r.level === 'senior')).toHaveLength(11);
  expect(rows.filter((r: { level: string }) => r.level !== 'senior')).toHaveLength(0);
  const anchor = (family: string, value: number) => {
    const row = rows.find((r: { family: string }) => r.family === family);
    expect(row, `BLR ${family}`).toBeDefined();
    expect(row!.p50).toBe(value);
  };
  // The IT sub-aggregate inside NACE J anchors the tech pool; all-of-J corroborates in the note.
  anchor('software-engineering', 7_285.6);
  anchor('data-and-ai', 7_285.6);
  anchor('cybersecurity', 7_285.6);
  anchor('finance-and-accounting', 2_905.9);
  anchor('marketing-and-growth', 2_666.9);
  anchor('hr-and-people', 1_990.7);
  anchor('sales-and-business-development', 2_145.9);
  anchor('operations-and-supply-chain', 2_440.8);
  anchor('engineering-civil-mechanical-electrical', 3_197.7);
  anchor('healthcare', 1_932.6);
  anchor('education-and-teaching', 1_757.4);
  const sw = rows.find((r: { family: string }) => r.family === 'software-engineering')!;
  expect(sw.note).toContain('information technology');
  expect(sw.note).toContain('6,164.5');
});

test('Slovakia upgrade (2026-09-06): Eurostat SES 2022 replaces the platy.sk sector-family cells', () => {
  const by = (cc: string) => load('benchmarks.json').entries.filter(
    (e: { country: string; status?: string }) => e.country === cc && e.status === undefined,
  );
  const rows = by('SVK');
  expect(rows.length, 'SVK row count').toBe(40);
  // 24 official SES cells (10 senior + 10 lead + 4 executive), all High with the 2022 vintage disclosed.
  const ses = rows.filter((r: { sources: string[] }) => r.sources[0].includes('earn_ses22_48'));
  expect(ses.length).toBe(24);
  for (const row of ses) {
    expect(row.quality).toBe('High');
    expect(row.note).toContain('2022');
    expect(row.currency).toBe('EUR');
    expect(row.basis).toBe('monthly-gross');
    expect(row.p25).toBe(0);
    expect(row.p75).toBe(0);
  }
  const anchor = (family: string, level: string, value: number) => {
    const row = rows.find((r: { family: string; level: string }) => r.family === family && r.level === level);
    expect(row, `SVK ${family} ${level}`).toBeDefined();
    expect(row!.p50).toBe(value);
  };
  anchor('software-engineering', 'senior', 2_385);
  anchor('data-and-ai', 'senior', 2_385);
  anchor('cybersecurity', 'senior', 2_385);
  anchor('finance-and-accounting', 'senior', 2_251);
  anchor('marketing-and-growth', 'senior', 2_198);
  anchor('hr-and-people', 'senior', 2_210);
  anchor('sales-and-business-development', 'senior', 2_088);
  anchor('operations-and-supply-chain', 'senior', 1_791);
  anchor('engineering-civil-mechanical-electrical', 'senior', 1_724);
  anchor('education-and-teaching', 'senior', 1_407);
  anchor('software-engineering', 'lead', 3_626);
  anchor('it-executive', 'lead', 3_626);
  anchor('finance-and-accounting', 'lead', 3_994);
  anchor('marketing-and-growth', 'lead', 3_245);
  anchor('hr-and-people', 'lead', 2_578);
  anchor('sales-and-business-development', 'lead', 2_605);
  anchor('operations-and-supply-chain', 'lead', 2_351);
  anchor('engineering-civil-mechanical-electrical', 'lead', 2_094);
  anchor('education-and-teaching', 'lead', 1_911);
  anchor('healthcare', 'lead', 2_832);
  anchor('it-executive', 'executive', 2_708);
  anchor('finance-and-accounting', 'executive', 2_708);
  anchor('general-management', 'executive', 2_708);
  anchor('sales-and-business-development', 'executive', 2_708);
  // The statutory physician scale and the platy.sk-only families survive untouched.
  const health = rows.find((r: { family: string; level: string }) => r.family === 'healthcare' && r.level === 'senior');
  expect(health!.p50).toBe(4_219);
  expect(health!.quality).toBe('High');
  expect(rows.find((r: { family: string }) => r.family === 'design')?.level).toBeDefined();
  // No family+level may exist twice.
  const keys = new Set(rows.map((r: { family: string; level: string }) => `${r.family}|${r.level}`));
  expect(keys.size).toBe(rows.length);
});

test('Romania and Greece SES upgrade (2026-09-06): official cells replace the Paylab Low rows', () => {
  const by = (cc: string) => load('benchmarks.json').entries.filter(
    (e: { country: string; status?: string }) => e.country === cc && e.status === undefined,
  );
  const rou = by('ROU');
  expect(rou.length, 'ROU row count').toBe(27);
  // Romania gains ten official SES lead cells and the two Paylab executives go official;
  // cybersecurity senior now shares the INS software pool instead of the crowd source.
  const rouLead = rou.filter((r: { level: string }) => r.level === 'lead');
  expect(rouLead.length).toBe(10);
  for (const row of rouLead) {
    expect(row.quality).toBe('High');
    expect(row.currency).toBe('RON');
    expect(row.basis).toBe('monthly-gross');
    expect(row.note).toContain('2022');
    expect(row.note).toContain('Eurostat');
  }
  const rouAnchor = (family: string, level: string, value: number) => {
    const row = rou.find((r: { family: string; level: string }) => r.family === family && r.level === level);
    expect(row, `ROU ${family} ${level}`).toBeDefined();
    expect(row!.p50).toBe(value);
  };
  rouAnchor('software-engineering', 'lead', 17_392);
  rouAnchor('it-executive', 'lead', 17_392);
  rouAnchor('finance-and-accounting', 'lead', 15_985);
  rouAnchor('healthcare', 'lead', 14_800);
  rouAnchor('education-and-teaching', 'lead', 11_352);
  rouAnchor('it-executive', 'executive', 11_246);
  rouAnchor('general-management', 'executive', 11_246);
  rouAnchor('cybersecurity', 'senior', 22_689);
  const rouCyber = rou.find((r: { family: string }) => r.family === 'cybersecurity')!;
  expect(rouCyber.quality).toBe('High');
  expect(rouCyber.note).toContain('shares the software-engineering senior pool');
  // The two unarchetyped Paylab seniors survive.
  expect(rou.filter((r: { quality: string }) => r.quality === 'Low').map((r: { family: string }) => r.family).sort())
    .toEqual(['delivery-and-project-management', 'product-management']);

  const grc = by('GRC');
  expect(grc.length, 'GRC row count').toBe(39);
  expect(grc.filter((r: { quality: string }) => r.quality === 'Low').length).toBe(6);
  const grcAnchor = (family: string, level: string, value: number) => {
    const row = grc.find((r: { family: string; level: string }) => r.family === family && r.level === level);
    expect(row, `GRC ${family} ${level}`).toBeDefined();
    expect(row!.p50).toBe(value);
    expect(row!.quality).toBe('High');
  };
  grcAnchor('cybersecurity', 'senior', 2_299);
  grcAnchor('data-and-ai', 'senior', 2_299);
  grcAnchor('hr-and-people', 'senior', 1_668);
  grcAnchor('hr-and-people', 'lead', 4_427);
  grcAnchor('marketing-and-growth', 'senior', 2_355);
  grcAnchor('marketing-and-growth', 'lead', 4_504);
  grcAnchor('operations-and-supply-chain', 'senior', 3_013);
  grcAnchor('operations-and-supply-chain', 'lead', 4_388);
  grcAnchor('sales-and-business-development', 'senior', 2_451);
  grcAnchor('sales-and-business-development', 'lead', 3_155);
  grcAnchor('education-and-teaching', 'lead', 1_961);
  grcAnchor('finance-and-accounting', 'lead', 5_302);
  grcAnchor('engineering-civil-mechanical-electrical', 'lead', 2_973);
  grcAnchor('it-executive', 'lead', 4_486);
  grcAnchor('healthcare', 'lead', 3_305);
  for (const fam of ['finance-and-accounting', 'it-executive', 'general-management', 'sales-and-business-development', 'operations-and-supply-chain', 'hr-and-people', 'marketing-and-growth', 'engineering-civil-mechanical-electrical']) {
    grcAnchor(fam, 'executive', 3_437);
  }
  // No family+level may exist twice in either country.
  for (const cc of ['ROU', 'GRC']) {
    const rs = by(cc);
    const keys = new Set(rs.map((r: { family: string; level: string }) => `${r.family}|${r.level}`));
    expect(keys.size).toBe(rs.length);
  }
});

test('Czechia, Malta, Luxembourg SES fill (2026-09-07): official lead and executive cells close the gaps', () => {
  const by = (cc: string) => load('benchmarks.json').entries.filter(
    (e: { country: string; status?: string }) => e.country === cc && e.status === undefined,
  );
  // Czechia: the software-engineering lead moves from the platy.cz survey to official SES managers-in-ICT.
  const cze = by('CZE');
  expect(cze.length).toBe(38);
  const czeSwLead = cze.find((r: { family: string; level: string }) => r.family === 'software-engineering' && r.level === 'lead')!;
  expect(czeSwLead.p50).toBe(124_036);
  expect(czeSwLead.quality).toBe('High');
  expect(czeSwLead.p25).toBe(0);
  expect(czeSwLead.p75).toBe(0);
  expect(czeSwLead.note).toContain('Eurostat');
  // The remaining platy.cz rows (design, product, delivery lead) are the unarchetyped survivors.
  expect(cze.filter((r: { quality: string }) => r.quality === 'Low').length).toBe(5);

  // Malta gains seven official cells (marketing both levels, sales and operations seniors, education lead,
  // and the general-management and sales executives); the admin-professionals cell is unpublished, so no HR senior.
  const mlt = by('MLT');
  expect(mlt.length).toBe(36);
  const mltAnchor = (family: string, level: string, value: number) => {
    const row = mlt.find((r: { family: string; level: string }) => r.family === family && r.level === level);
    expect(row, `MLT ${family} ${level}`).toBeDefined();
    expect(row!.p50).toBe(value);
    expect(row!.quality).toBe('High');
    expect(row!.note).toContain('2022');
  };
  mltAnchor('marketing-and-growth', 'senior', 2_718);
  mltAnchor('marketing-and-growth', 'lead', 4_024);
  mltAnchor('sales-and-business-development', 'senior', 2_643);
  mltAnchor('operations-and-supply-chain', 'senior', 2_670);
  mltAnchor('education-and-teaching', 'lead', 2_938);
  mltAnchor('general-management', 'executive', 3_682);
  mltAnchor('sales-and-business-development', 'executive', 3_682);
  expect(mlt.find((r: { family: string; level: string }) => r.family === 'hr-and-people' && r.level === 'senior')).toBeUndefined();

  // Luxembourg: the three alleyesonme Low rows go official, and marketing, healthcare lead, and it-executive
  // lead cells are added.
  const lux = by('LUX');
  expect(lux.length).toBe(27);
  expect(lux.filter((r: { quality: string }) => r.quality === 'Low').length).toBe(1);
  const luxAnchor = (family: string, level: string, value: number) => {
    const row = lux.find((r: { family: string; level: string }) => r.family === family && r.level === level);
    expect(row, `LUX ${family} ${level}`).toBeDefined();
    expect(row!.p50).toBe(value);
    expect(row!.quality).toBe('High');
    expect(row!.currency).toBe('EUR');
    expect(row!.basis).toBe('monthly-gross');
  };
  luxAnchor('data-and-ai', 'senior', 5_818);
  luxAnchor('hr-and-people', 'senior', 5_344);
  luxAnchor('hr-and-people', 'lead', 8_687);
  luxAnchor('marketing-and-growth', 'senior', 6_108);
  luxAnchor('marketing-and-growth', 'lead', 10_986);
  luxAnchor('healthcare', 'lead', 10_002);
  luxAnchor('it-executive', 'lead', 8_355);
  for (const cc of ['CZE', 'MLT', 'LUX']) {
    const rs = by(cc);
    const keys = new Set(rs.map((r: { family: string; level: string }) => `${r.family}|${r.level}`));
    expect(keys.size).toBe(rs.length);
  }
});

test('Big-market SES spine (2026-09-07): Germany, France, Ireland, Switzerland move off recruiter and job-board sources', () => {
  const by = (cc: string) => load('benchmarks.json').entries.filter(
    (e: { country: string; status?: string }) => e.country === cc && e.status === undefined,
  );
  const ses = (rs: { sources: string[] }[]) => rs.filter((r) => r.sources[0].includes('earn_ses22_48')).length;

  // Germany: all 18 Stepstone cells swap to official SES means and 12 archetype cells are added; the
  // market becomes 30 High rows with no Stepstone survivor.
  const deu = by('DEU');
  expect(deu.length).toBe(30);
  expect(ses(deu)).toBe(30);
  expect(deu.every((r: { quality: string }) => r.quality === 'High')).toBe(true);
  const deuAnchor = (family: string, level: string, value: number) => {
    const row = deu.find((r: { family: string; level: string }) => r.family === family && r.level === level);
    expect(row, `DEU ${family} ${level}`).toBeDefined();
    expect(row!.p50).toBe(value);
    expect(row!.basis).toBe('monthly-gross');
  };
  deuAnchor('software-engineering', 'senior', 5_623);
  deuAnchor('software-engineering', 'lead', 9_752);
  deuAnchor('finance-and-accounting', 'lead', 10_353);
  deuAnchor('finance-and-accounting', 'executive', 8_008);
  deuAnchor('marketing-and-growth', 'lead', 9_849);
  deuAnchor('engineering-civil-mechanical-electrical', 'senior', 5_995);
  deuAnchor('healthcare', 'lead', 8_339);
  deuAnchor('education-and-teaching', 'senior', 4_812);
  deuAnchor('general-management', 'lead', 8_008);

  // France: 17 recruiter cells swap and 14 are added. The finance professionals mean (6,822) exceeds the
  // finance managers mean (5,954); both ship verbatim as published.
  const fra = by('FRA');
  expect(fra.length).toBe(36);
  expect(ses(fra)).toBe(31);
  const fraAnchor = (family: string, level: string, value: number) => {
    const row = fra.find((r: { family: string; level: string }) => r.family === family && r.level === level);
    expect(row, `FRA ${family} ${level}`).toBeDefined();
    expect(row!.p50).toBe(value);
  };
  fraAnchor('software-engineering', 'senior', 4_713);
  fraAnchor('software-engineering', 'lead', 5_986);
  fraAnchor('cybersecurity', 'lead', 5_986);
  fraAnchor('finance-and-accounting', 'senior', 6_822);
  fraAnchor('finance-and-accounting', 'lead', 5_954);
  fraAnchor('finance-and-accounting', 'executive', 5_580);
  fraAnchor('healthcare', 'lead', 4_348);
  fraAnchor('education-and-teaching', 'senior', 3_403);

  // Ireland: 28 recruiter cells swap and the economy-wide managers pool anchors the executives. The
  // finance lead keeps Morgan McKinley because SES publishes no K OC1 for Ireland; HSE and TUI statutory
  // rows stay untouched.
  const irl = by('IRL');
  expect(irl.length).toBe(45);
  expect(ses(irl)).toBe(29);
  expect(irl.filter((r: { quality: string }) => r.quality === 'Low').length).toBe(8);
  const irlAnchor = (family: string, level: string, value: number) => {
    const row = irl.find((r: { family: string; level: string }) => r.family === family && r.level === level);
    expect(row, `IRL ${family} ${level}`).toBeDefined();
    expect(row!.p50).toBe(value);
  };
  irlAnchor('software-engineering', 'senior', 7_510);
  irlAnchor('software-engineering', 'lead', 13_811);
  irlAnchor('it-executive', 'lead', 13_811);
  irlAnchor('cybersecurity', 'lead', 13_811);
  irlAnchor('finance-and-accounting', 'senior', 7_370);
  irlAnchor('finance-and-accounting', 'executive', 7_352);
  irlAnchor('operations-and-supply-chain', 'senior', 6_538);
  irlAnchor('general-management', 'lead', 7_352);
  const irlFinLead = irl.find((r: { family: string; level: string }) => r.family === 'finance-and-accounting' && r.level === 'lead')!;
  expect(irlFinLead.p50).toBe(124_500);
  expect(irlFinLead.sources[0]).toContain('roberthalf');
  const irlHealthLead = irl.find((r: { family: string; level: string }) => r.family === 'healthcare' && r.level === 'lead')!;
  expect(irlHealthLead.p50).toBe(69_189);
  expect(irlHealthLead.sources[0]).toContain('hse.ie');

  // Switzerland: 15 job-board cells swap and 14 are added; SES publishes in CHF, so the official rows
  // carry francs. Only three unarchetyped jobs.ch rows survive.
  const che = by('CHE');
  expect(che.length).toBe(33);
  expect(ses(che)).toBe(30);
  expect(che.filter((r: { quality: string }) => r.quality === 'Low').length).toBe(3);
  const cheAnchor = (family: string, level: string, value: number) => {
    const row = che.find((r: { family: string; level: string }) => r.family === family && r.level === level);
    expect(row, `CHE ${family} ${level}`).toBeDefined();
    expect(row!.p50).toBe(value);
    expect(row!.currency).toBe('CHF');
  };
  cheAnchor('software-engineering', 'senior', 10_551);
  cheAnchor('software-engineering', 'lead', 14_055);
  cheAnchor('finance-and-accounting', 'lead', 18_392);
  cheAnchor('finance-and-accounting', 'executive', 13_065);
  cheAnchor('education-and-teaching', 'lead', 10_981);

  for (const cc of ['DEU', 'FRA', 'IRL', 'CHE']) {
    const rs = by(cc);
    const keys = new Set(rs.map((r: { family: string; level: string }) => `${r.family}|${r.level}`));
    expect(keys.size).toBe(rs.length);
  }
  // Total moved to 2,012 by the southern-and-central SES round; the live count lives in the newest test.
  expect(load('benchmarks.json').entries.filter((e: { status?: string }) => e.status === undefined).length).toBe(2_055);
});

test('Southern-and-central SES spine (2026-09-07): Poland, Italy, Cyprus, and Malta move off private survey and recruiter sources', () => {
  const by = (cc: string) => load('benchmarks.json').entries.filter(
    (e: { country: string; status?: string }) => e.country === cc && e.status === undefined,
  );
  const ses48 = (rs: { sources: string[] }[]) => rs.filter((r) => r.sources[0].includes('earn_ses22_48')).length;

  // Poland: 20 wynagrodzenia.pl and justjoin.it cells swap and 11 archetype cells are added; the last
  // two Low rows (private-survey healthcare senior and education executive) go official.
  const pol = by('POL');
  expect(pol.length).toBe(33);
  expect(ses48(pol)).toBe(31);
  expect(pol.every((r: { quality: string }) => r.quality !== 'Low')).toBe(true);
  const polAnchor = (family: string, level: string, value: number) => {
    const row = pol.find((r: { family: string; level: string }) => r.family === family && r.level === level);
    expect(row, `POL ${family} ${level}`).toBeDefined();
    expect(row!.p50).toBe(value);
    expect(row!.basis).toBe('monthly-gross');
    expect(row!.currency).toBe('PLN');
  };
  polAnchor('software-engineering', 'senior', 11_710);
  polAnchor('software-engineering', 'lead', 18_129);
  polAnchor('finance-and-accounting', 'lead', 17_932);
  polAnchor('general-management', 'executive', 11_745);
  polAnchor('healthcare', 'senior', 8_877);
  polAnchor('education-and-teaching', 'senior', 6_039);
  polAnchor('marketing-and-growth', 'senior', 9_440);

  // Italy: 27 manageritalia, techcompenso, and press cells swap and 4 are added; the statutory CCNL
  // education and healthcare rows stay untouched. Italy's 13th and 14th salaries sit outside the SES
  // monthly concept, disclosed on every swapped row.
  const ita = by('ITA');
  expect(ita.length).toBe(41);
  expect(ses48(ita)).toBe(31);
  const itaAnchor = (family: string, level: string, value: number) => {
    const row = ita.find((r: { family: string; level: string }) => r.family === family && r.level === level);
    expect(row, `ITA ${family} ${level}`).toBeDefined();
    expect(row!.p50).toBe(value);
    expect(row!.basis).toBe('monthly-gross');
  };
  itaAnchor('software-engineering', 'senior', 3_409);
  itaAnchor('software-engineering', 'lead', 9_167);
  itaAnchor('it-executive', 'lead', 9_167);
  itaAnchor('finance-and-accounting', 'lead', 10_978);
  itaAnchor('marketing-and-growth', 'lead', 10_652);
  itaAnchor('general-management', 'lead', 7_606);
  itaAnchor('hr-and-people', 'senior', 2_962);
  itaAnchor('operations-and-supply-chain', 'senior', 3_423);
  const itaEdu = ita.find((r: { family: string; level: string }) => r.family === 'education-and-teaching' && r.level === 'senior')!;
  expect(itaEdu.p50).toBe(31_590);
  expect(itaEdu.sources[0]).toContain('orizzontescuola');
  const itaHealth = ita.find((r: { family: string; level: string }) => r.family === 'healthcare' && r.level === 'senior')!;
  expect(itaHealth.p50).toBe(80_000);
  expect(itaHealth.sources[0]).toContain('fanpage');
  expect(ita.filter((r: { quality: string }) => r.quality === 'Low').length).toBe(6);

  // Cyprus: 16 CareerFinders cells swap onto the all-enterprise-sizes SES convention the country
  // already runs on, and two executive cells are added. The HR lead keeps CareerFinders because
  // the N OC1 cell is unpublished even at all sizes; the CYSTAT chief-executive row stays.
  const cyp = by('CYP');
  expect(cyp.length).toBe(32);
  expect(ses48(cyp)).toBe(27);
  const cypAnchor = (family: string, level: string, value: number) => {
    const row = cyp.find((r: { family: string; level: string }) => r.family === family && r.level === level);
    expect(row, `CYP ${family} ${level}`).toBeDefined();
    expect(row!.p50).toBe(value);
    expect(row!.basis).toBe('monthly-gross');
  };
  cypAnchor('cybersecurity', 'senior', 3_489);
  cypAnchor('software-engineering', 'lead', 5_778);
  cypAnchor('marketing-and-growth', 'lead', 7_577);
  cypAnchor('operations-and-supply-chain', 'lead', 6_731);
  cypAnchor('hr-and-people', 'senior', 2_542);
  cypAnchor('finance-and-accounting', 'executive', 5_282);
  const cypHrLead = cyp.find((r: { family: string; level: string }) => r.family === 'hr-and-people' && r.level === 'lead')!;
  expect(cypHrLead.p50).toBe(3_750);
  expect(cypHrLead.sources[0]).toContain('careerfinders');
  const cypGm = cyp.find((r: { family: string; level: string }) => r.family === 'general-management' && r.level === 'executive')!;
  expect(cypGm.p50).toBe(107_400);
  expect(cypGm.sources[0]).toContain('stoixeia');

  // Malta: the ten Archer recruiter cells swap (executives onto the earn_ses22_21 all-managers pool
  // that already anchors the country's executives); delivery, product, and the IT-appointments
  // senior keep their recruitment-market rows because no SES archetype exists for them.
  const mlt = by('MLT');
  expect(mlt.length).toBe(36);
  const mltAnchor = (family: string, level: string, value: number, src: string) => {
    const row = mlt.find((r: { family: string; level: string }) => r.family === family && r.level === level);
    expect(row, `MLT ${family} ${level}`).toBeDefined();
    expect(row!.p50).toBe(value);
    expect(row!.sources[0]).toContain(src);
  };
  mltAnchor('software-engineering', 'senior', 2_857, 'earn_ses22_48');
  mltAnchor('software-engineering', 'lead', 4_179, 'earn_ses22_48');
  mltAnchor('cybersecurity', 'senior', 2_857, 'earn_ses22_48');
  mltAnchor('data-and-ai', 'lead', 4_179, 'earn_ses22_48');
  mltAnchor('cybersecurity', 'executive', 3_682, 'earn_ses22_21');
  mltAnchor('it-executive', 'executive', 3_682, 'earn_ses22_21');
  mltAnchor('software-engineering', 'executive', 3_682, 'earn_ses22_21');
  expect(mlt.filter((r: { sources: string[] }) => r.sources[0].includes('archer')).length).toBe(6);
  expect(mlt.find((r: { family: string; level: string }) => r.family === 'hr-and-people' && r.level === 'senior')).toBeUndefined();

  for (const cc of ['POL', 'ITA', 'CYP', 'MLT']) {
    const rs = by(cc);
    const keys = new Set(rs.map((r: { family: string; level: string }) => `${r.family}|${r.level}`));
    expect(keys.size).toBe(rs.length);
  }
  expect(load('benchmarks.json').entries.filter((e: { status?: string }) => e.status === undefined).length).toBe(2_055);
});

test('Iberian-and-alpine SES completion (2026-09-07): Spain, Portugal, Austria, and Belgium close the private-source gaps', () => {
  const by = (cc: string) => load('benchmarks.json').entries.filter(
    (e: { country: string; status?: string }) => e.country === cc && e.status === undefined,
  );
  const ses48 = (rs: { sources: string[] }[]) => rs.filter((r) => r.sources[0].includes('earn_ses22_48')).length;
  const ses21 = (rs: { sources: string[] }[]) => rs.filter((r) => r.sources[0].includes('earn_ses22_21')).length;

  // Spain: the six tecnoempleo and infojobs cells swap to official means and 16 archetype cells are
  // added; the official INE rows stay untouched. Spain keeps its B-S managers pool inside dataset 48.
  const esp = by('ESP');
  expect(esp.length).toBe(32);
  expect(ses48(esp)).toBe(22);
  const espAnchor = (family: string, level: string, value: number) => {
    const row = esp.find((r: { family: string; level: string }) => r.family === family && r.level === level);
    expect(row, `ESP ${family} ${level}`).toBeDefined();
    expect(row!.p50).toBe(value);
    expect(row!.basis).toBe('monthly-gross');
    expect(row!.currency).toBe('EUR');
  };
  espAnchor('cybersecurity', 'senior', 3_303);
  espAnchor('software-engineering', 'lead', 4_633);
  espAnchor('sales-and-business-development', 'lead', 4_253);
  espAnchor('finance-and-accounting', 'lead', 4_647);
  espAnchor('marketing-and-growth', 'lead', 4_959);
  espAnchor('general-management', 'lead', 4_355);
  const espSw = esp.find((r: { family: string; level: string }) => r.family === 'software-engineering' && r.level === 'senior')!;
  expect(espSw.p50).toBe(41_846);
  expect(espSw.sources[0]).toContain('ine.es');

  // Portugal: the five landing.jobs cells swap and 17 cells are added onto the PORDATA seniors; the
  // executives use the earn_ses22_21 economy-wide managers pool because B-S OC1 is unpublished.
  const prt = by('PRT');
  expect(prt.length).toBe(34);
  expect(ses48(prt)).toBe(13);
  expect(ses21(prt)).toBe(9);
  const prtAnchor = (family: string, level: string, value: number) => {
    const row = prt.find((r: { family: string; level: string }) => r.family === family && r.level === level);
    expect(row, `PRT ${family} ${level}`).toBeDefined();
    expect(row!.p50).toBe(value);
  };
  prtAnchor('software-engineering', 'senior', 2_478);
  prtAnchor('software-engineering', 'lead', 4_105);
  prtAnchor('it-executive', 'lead', 4_105);
  prtAnchor('it-executive', 'executive', 3_543);
  prtAnchor('finance-and-accounting', 'lead', 3_926);
  prtAnchor('healthcare', 'lead', 2_551);
  const prtGm = prt.find((r: { family: string; level: string }) => r.family === 'general-management' && r.level === 'senior')!;
  expect(prtGm.p50).toBe(3_295.9);

  // Austria: the seven kununu and karriere.at cells swap to official means; the Statistik Austria
  // grid stays untouched and only three unarchetyped crowd rows remain.
  const aut = by('AUT');
  expect(aut.length).toBe(48);
  expect(ses48(aut)).toBe(7);
  expect(aut.filter((r: { quality: string }) => r.quality === 'Low').length).toBe(3);
  const autAnchor = (family: string, level: string, value: number) => {
    const row = aut.find((r: { family: string; level: string }) => r.family === family && r.level === level);
    expect(row, `AUT ${family} ${level}`).toBeDefined();
    expect(row!.p50).toBe(value);
    expect(row!.basis).toBe('monthly-gross');
  };
  autAnchor('software-engineering', 'lead', 6_985);
  autAnchor('hr-and-people', 'senior', 3_890);
  autAnchor('hr-and-people', 'lead', 6_033);
  autAnchor('marketing-and-growth', 'lead', 8_945);
  autAnchor('marketing-and-growth', 'senior', 4_548);
  autAnchor('sales-and-business-development', 'lead', 6_382);

  // Belgium: the two jobat cells swap and 10 archetype cells are added; the finance lead add is
  // skipped because K OC1 is unpublished for Belgium, and the absence is not papered over.
  const bel = by('BEL');
  expect(bel.length).toBe(35);
  expect(ses48(bel)).toBe(10);
  expect(ses21(bel)).toBe(2);
  const belAnchor = (family: string, level: string, value: number) => {
    const row = bel.find((r: { family: string; level: string }) => r.family === family && r.level === level);
    expect(row, `BEL ${family} ${level}`).toBeDefined();
    expect(row!.p50).toBe(value);
  };
  belAnchor('healthcare', 'lead', 7_275);
  belAnchor('healthcare', 'senior', 5_327);
  belAnchor('software-engineering', 'lead', 8_570);
  belAnchor('marketing-and-growth', 'lead', 10_130);
  belAnchor('general-management', 'lead', 8_270);
  expect(bel.find((r: { family: string; level: string }) => r.family === 'finance-and-accounting' && r.level === 'lead')).toBeUndefined();

  for (const cc of ['ESP', 'PRT', 'AUT', 'BEL']) {
    const rs = by(cc);
    const keys = new Set(rs.map((r: { family: string; level: string }) => `${r.family}|${r.level}`));
    expect(keys.size).toBe(rs.length);
  }
  expect(load('benchmarks.json').entries.filter((e: { status?: string }) => e.status === undefined).length).toBe(2_055);
});
