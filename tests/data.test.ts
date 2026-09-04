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
  expect(cheFin.p25).toBe(117_750);
  expect(cheFin.p75).toBe(142_250);
  expect(cheFin.quality).toBe('Medium');
  // Self-reported crowd sources stay Low even with big n.
  const cheSw = by('CHE').find((r: { family: string; level: string }) => r.family === 'software-engineering' && r.level === 'senior');
  expect(cheSw.quality).toBe('Low');
});

test('expansion wave 3: France, Spain, Poland, Turkey carry verified rows', () => {
  const by = (cc: string) => load('benchmarks.json').entries.filter(
    (e: { country: string; status?: string }) => e.country === cc && e.status === undefined,
  );
  const currency = { FRA: 'EUR', ESP: 'EUR', POL: 'PLN', TUR: 'TRY' };
  const counts = { FRA: 22, ESP: 16, POL: 22, TUR: 7 };
  for (const cc of Object.keys(counts)) {
    const rows = by(cc);
    expect(rows.length, cc).toBeGreaterThanOrEqual(counts[cc as keyof typeof counts]);
    for (const row of rows) {
      expect(row.currency, cc).toBe(currency[cc as keyof typeof currency]);
    }
  }
  // Spot anchors verified against the cited pages on 2026-09-02.
  const fraIt = by('FRA').find((r: { family: string; level: string }) => r.family === 'it-executive' && r.level === 'executive');
  expect(fraIt.p50).toBe(150_000);
  expect(fraIt.p75).toBe(180_000);
  expect(fraIt.basis).toBe('annual-gross');
  const espSw = by('ESP').find((r: { family: string; level: string }) => r.family === 'software-engineering' && r.level === 'senior');
  expect(espSw.p25).toBe(32_763);
  expect(espSw.p50).toBe(41_846);
  expect(espSw.p75).toBe(54_731);
  // INE rows carry 2022 survey vintage, so quality caps at Medium with the year disclosed.
  expect(espSw.quality).toBe('Medium');
  expect(espSw.note).toContain('2022');
  const polSw = by('POL').find((r: { family: string; level: string }) => r.family === 'software-engineering' && r.level === 'senior');
  expect(polSw.p50).toBe(23_250);
  expect(polSw.basis).toBe('monthly-gross');
  expect(polSw.p25).toBe(0);
  expect(polSw.p75).toBe(0);
  const turSw = by('TUR').find((r: { family: string; level: string }) => r.family === 'software-engineering' && r.level === 'senior');
  expect(turSw.p50).toBe(1_851_540);
  expect(turSw.basis).toBe('annual-gross');
  expect(turSw.quality).toBe('Low');
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
  expect(svkIt.p25).toBe(2_545);
  expect(svkIt.p75).toBe(6_423);
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
