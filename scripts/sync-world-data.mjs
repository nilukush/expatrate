/* Syncs world-wide country coverage into src/data/countries.json and src/data/ppp.json.

   Sources (all free, no keys):
   - World Bank country list (iso3, iso2, region): api.worldbank.org/v2/country
   - World Bank PA.NUS.PRVT.PP, most recent non-empty value per economy
   - CLDR currencyData (territory -> current ISO 4217 currency): unicode-org/cldr-json
   - Node ICU Intl.DisplayNames for clean country names (fallback: World Bank name)

   Conflict rule (same as benchmark curation): existing rows win untouched; the
   script only ADDS countries and PPP rows. Run: pnpm data:world
*/
import { readFileSync, writeFileSync } from 'node:fs';

const WB_COUNTRIES = 'https://api.worldbank.org/v2/country?format=json&per_page=400';
const WB_PPP =
  'https://api.worldbank.org/v2/country/ALL/indicator/PA.NUS.PRVT.PP?format=json&mrnev=1&per_page=400';
const CLDR_CURRENCIES =
  'https://raw.githubusercontent.com/unicode-org/cldr-json/main/cldr-json/cldr-core/supplemental/currencyData.json';

const GCC = new Set(['ARE', 'SAU', 'QAT', 'KWT', 'OMN', 'BHR']);
const REGION_BY_WB = {
  'Europe & Central Asia': 'Europe',
  'Middle East & North Africa': 'Middle East',
  'East Asia & Pacific': 'Asia',
  'South Asia': 'Asia',
  'Sub-Saharan Africa': 'Africa',
  'Latin America & Caribbean': 'LATAM',
  'North America': 'North America',
};
// Pacific island economies map to Oceania regardless of the World Bank bucket.
const OCEANIA = new Set([
  'AUS', 'NZL', 'FJI', 'PNG', 'SLB', 'VUT', 'WSM', 'TON', 'KIR', 'TUV', 'NRU',
  'MHL', 'FSM', 'PLW', 'ASM', 'GUM', 'NCL', 'PYF', 'MNP', 'COK', 'NIU', 'TKL', 'WLF',
]);

// CLDR lists non-circulating ISO 4217 codes (bond/fund/test units) alongside real
// currencies; picking the last active entry can surface them (Switzerland -> CHW).
const NON_CIRCULATING = new Set(['CHE', 'CHW', 'USN', 'MXV', 'CNX', 'XBC', 'XBD', 'XTS', 'XXX', 'CLF', 'COU', 'UYW', 'UYI', 'BOV', 'SLL']);

// Economies where World Bank PPP is not comparable to the listed currency
// (redenomination or hyperinflation): a floor computed from these would be noise.
const EXCLUDED_ECONOMIES = {
  VEN: 'PPP vintage 2011, currency redenominated (VED/Bs.); not comparable',
  ZWE: 'PPP reflects retired ZWL while listings pay in USD; not comparable',
};
// Below this vintage the PPP factor predates currency reality entirely (Yemen 2013).
const MIN_PPP_YEAR = 2020;

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
  return response.json();
};

const cleanWbName = (name) =>
  name
    .replace(', Arab Rep.', '')
    .replace(', Islamic Rep.', '')
    .replace('Rep. of', '')
    .replace('Rep.', '')
    .replace('St.', 'Saint')
    .replace(/\s+/g, ' ')
    .trim();

async function main() {
  const [wbCountries, wbPpp, cldr] = await Promise.all([
    fetchJson(WB_COUNTRIES),
    fetchJson(WB_PPP),
    fetchJson(CLDR_CURRENCIES),
  ]);

  const countriesFile = read('../src/data/countries.json');
  const pppFile = read('../src/data/ppp.json');
  const existing = new Map(countriesFile.map((row) => [row.iso3, row]));
  const existingPpp = new Map(pppFile.rows.map((row) => [row.iso3, row]));

  const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
  const displayName = (iso2, fallback) => {
    try {
      return regionNames.of(iso2) || fallback;
    } catch {
      return fallback;
    }
  };

  const pppByIso3 = new Map(
    wbPpp[1].filter((row) => row.value !== null).map((row) => [row.countryiso3code, row]),
  );

  const regionCurrency = cldr.supplemental.currencyData.region;
  const currentCurrency = (iso2) => {
    const entries = regionCurrency[iso2];
    if (!entries) return null;
    const active = entries
      .filter((entry) => {
        const code = Object.keys(entry)[0];
        return !entry[code]._to && !NON_CIRCULATING.has(code);
      })
      .map((entry) => Object.keys(entry)[0]);
    if (active.length === 0) return null;
    return active[active.length - 1];
  };

  let addedCountries = 0;
  let addedPpp = 0;
  const skippedNoPpp = [];
  const skippedNoCurrency = [];

  for (const row of wbCountries[1]) {
    if (row.region.value === 'Aggregates') continue;
    const iso3 = row.id;
    if (EXCLUDED_ECONOMIES[iso3]) {
      console.log(`excluded ${iso3}: ${EXCLUDED_ECONOMIES[iso3]}`);
      continue;
    }
    if (existing.has(iso3)) continue;
    const ppp = pppByIso3.get(iso3);
    if (!ppp || Number.parseInt(ppp.date, 10) < MIN_PPP_YEAR) {
      skippedNoPpp.push(iso3);
      continue;
    }
    const currency = currentCurrency(row.iso2Code);
    if (!currency || currency.length !== 3) {
      skippedNoCurrency.push(iso3);
      continue;
    }
    const region = GCC.has(iso3)
      ? 'GCC'
      : OCEANIA.has(iso3)
        ? 'Oceania'
        : REGION_BY_WB[row.region.value.trim()] ?? 'Asia';
    existing.set(iso3, {
      iso3,
      name: displayName(row.iso2Code, cleanWbName(row.name)),
      currency,
      region,
      tier: 3,
      taxRegime: '',
      packageConvention: '',
    });
    addedCountries += 1;
  }

  // Every supported country must carry a PPP row: the floor depends on it.
  for (const country of existing.values()) {
    if (existingPpp.has(country.iso3)) continue;
    const ppp = pppByIso3.get(country.iso3);
    if (!ppp) {
      console.error(`ERROR: country ${country.iso3} has no World Bank PPP value; remove it or add data`);
      process.exit(1);
    }
    existingPpp.set(country.iso3, {
      iso3: country.iso3,
      year: Number.parseInt(ppp.date, 10),
      value: Number(ppp.value),
      license: 'CC BY 4.0',
      sourceUrl: 'https://api.worldbank.org/v2/indicator/PA.NUS.PRVT.PP',
      retrievedAt: '2026-08-30',
    });
    addedPpp += 1;
  }

  const countriesOut = [...existing.values()].sort((a, b) => a.name.localeCompare(b.name));
  writeFileSync(
    new URL('../src/data/countries.json', import.meta.url),
    JSON.stringify(countriesOut, null, 2) + '\n',
  );
  pppFile.rows = [...existingPpp.values()].sort((a, b) => a.iso3.localeCompare(b.iso3));
  pppFile.meta.note =
    'World Bank PA.NUS.PRVT.PP (PPP conversion factor, private consumption, LCU per international USD), most recent non-empty year per economy. All supported countries are covered, so the purchasing-power floor always computes. The original 9 tier-1 rows were hand-verified by the Verifier agent on 2026-08-30; 14 more were fetched the same day; the remainder were added by scripts/sync-world-data.mjs on 2026-08-30 (vintage year recorded per row).';
  writeFileSync(
    new URL('../src/data/ppp.json', import.meta.url),
    JSON.stringify(pppFile, null, 2) + '\n',
  );

  console.log(
    `countries: ${countriesOut.length} total (${addedCountries} added, ${skippedNoPpp.length} skipped without PPP, ${skippedNoCurrency.length} without currency)`,
  );
  console.log(`ppp rows: ${pppFile.rows.length} total (${addedPpp} added)`);
  if (skippedNoPpp.length > 0) console.log(`no PPP: ${skippedNoPpp.join(', ')}`);
  if (skippedNoCurrency.length > 0) console.log(`no currency: ${skippedNoCurrency.join(', ')}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
