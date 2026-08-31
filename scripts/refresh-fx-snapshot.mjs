import { readFileSync, writeFileSync } from 'node:fs';

// Refreshes the embedded FX snapshot from the keyless open.er-api.com endpoint.
// Runs in CI before the build. On any failure it logs a warning and exits 0:
// the runtime fallback chain and the existing snapshot keep the site honest.
const SNAPSHOT_PATH = new URL('../src/data/fx-snapshot.json', import.meta.url);

try {
  const response = await fetch('https://open.er-api.com/v6/latest/USD');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  if (payload?.result !== 'success' || typeof payload?.rates !== 'object') {
    throw new Error('malformed payload');
  }

  // Target set: every currency of every supported country, plus USD.
  const countries = JSON.parse(
    readFileSync(new URL('../src/data/countries.json', import.meta.url), 'utf8'),
  );
  const wanted = [...new Set(['USD', ...countries.map((c) => c.currency)])].sort();
  const nextRates = {};
  for (const code of wanted) {
    if (typeof payload.rates[code] === 'number') nextRates[code] = payload.rates[code];
  }
  const missing = wanted.filter((code) => !(code in nextRates));

  writeFileSync(
    SNAPSHOT_PATH,
    `${JSON.stringify(
      {
        base: 'USD',
        asOf: new Date().toISOString().slice(0, 10),
        source: 'https://open.er-api.com/v6/latest/USD',
        attribution: 'Embedded fallback snapshot, refreshed automatically at build time. The running site fetches live rates in the browser first.',
        rates: nextRates,
        missing,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`FX snapshot refreshed: ${Object.keys(nextRates).length} rates, ${missing.length} missing (${missing.join(', ') || 'none'})`);
} catch (error) {
  console.warn(`FX snapshot refresh skipped (${error instanceof Error ? error.message : 'unknown error'}); keeping the existing snapshot.`);
}
