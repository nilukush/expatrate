import { readFileSync, writeFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../src/data/${path}`, import.meta.url), 'utf8');

const { families, levels } = JSON.parse(read('role-families.json'));
const allCountries = JSON.parse(read('countries.json'));
const seeds = JSON.parse(read('benchmark-seeds.json')).rows;

// The matrix covers tier 1 plus every country that has at least one curated row
// (curation has expanded beyond tier 1: AUS, CAN, NLD...). Unseeded cells stay
// explicit insufficient-data markers everywhere.
const seededCountries = new Set(seeds.map((s) => s.country));
const countries = allCountries.filter(
  (c) => c.tier === 1 || seededCountries.has(c.iso3),
);

const CURATION_DATE = '2026-08-30';

// Curated rows live in src/data/benchmark-seeds.json. Every row carries a
// source and quality rating (see docs/RESEARCH/benchmark-curation-2026-08-30.md).
// Cells without a seed stay explicit insufficient-data markers; never filled silently.

const entries = [];
let seedConflicts = 0;
for (const family of families) {
  for (const level of levels) {
    for (const country of countries) {
      const seed = seeds.find(
        (s) => s.family === family.id && s.level === level && s.country === country.iso3,
      );
      if (seed && entries.some((e) => e.status === undefined && e.family === family.id && e.level === level && e.country === country.iso3)) {
        seedConflicts += 1;
        continue;
      }
      entries.push(
        seed ?? {
          family: family.id,
          level,
          country: country.iso3,
          status: 'insufficient_data',
          reason: 'Awaiting curation. No verified public source has been entered for this role, level, and country yet.',
          lastReviewed: CURATION_DATE,
        },
      );
    }
  }
}

const dataRows = entries.filter((e) => e.status === undefined).length;

const output = {
  meta: {
    generatedFrom: 'scripts/generate-benchmarks.mjs',
    lastReviewed: CURATION_DATE,
    familiesCount: families.length,
    levelsCount: levels.length,
    tier1CountriesCount: countries.length,
    dataRows,
    curationNote:
      'Benchmarks are entered only from verifiable public recruiter and official statistics sources with quality ratings (docs/RESEARCH/analyzer-report.md and verifier-report.md). Cells without a verified source remain explicit insufficient-data markers; they are never silently filled from a global average.',
  },
  entries,
};

writeFileSync(
  new URL('../src/data/benchmarks.json', import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);
console.log(
  `Wrote src/data/benchmarks.json: ${entries.length} entries, ${dataRows} with data, ${entries.length - dataRows} insufficient-data markers${seedConflicts > 0 ? `, ${seedConflicts} seed conflicts skipped` : ''}`,
);
