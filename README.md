# ExpatRate

Know what to quote. ExpatRate is a free web tool that tells expat job seekers what salary to quote in any country, monthly and annually, in your currency.

Built for a real problem: when you apply for jobs across borders, portals ask for your expected salary in the local currency and you have no idea what number keeps you both competitive and fairly paid. ExpatRate answers that with a defensible band, a confidence label, and a negotiation brief.

## Status

Launched 31 August 2026 at https://expatrate.pages.dev. Live coverage: 169 countries with verified market benchmarks (3,089 curated rows; twenty countries now run on the official Eurostat SES 2022 earnings spine, Germany, France, Ireland, Switzerland, Poland, Italy, Cyprus, Malta, Spain, Portugal, Austria, and Belgium among them, which dropped Stepstone, Robert Half, Morgan McKinley, jobs.ch, capital.fr, tpc-recrutement, wynagrodzenia.pl, justjoin.it, manageritalia, techcompenso, CareerFinders, Archer, tecnoempleo, infojobs, landing.jobs, kununu, karriere.at, and jobat cells for official survey means and made Germany a fully official market, while Belarus joined on Belstat 2026 Q2 quarterly earnings, the freshest quarter in the matrix, Uzbekistan joined via the Statistics Agency press release, Mongolia via the NSO PxWeb table reached through the data.1212.mn API with its occupation cut now anchoring lead levels, Turkey carries SES 2023 managers on top of the NACE spine, Moldova via the NBS quarterly earnings annex, Russia via Rosstat's by-activity wage table, Costa Rica joined on INEC ECE branch means from the NADA microdata catalog with the April to June 2026 moving quarter, Vietnam gained nine official ILOSTAT cells republishing the national Labour Force Survey beside its specialist-survey rows, Cambodia, Honduras, El Salvador, and the Dominican Republic joined as markets 84 to 87 on the same ILOSTAT SDMX recipe with 2025 survey medians, Sri Lanka, Bangladesh, Zambia, Mauritius, Fiji, and Botswana followed as markets 88 to 93 on the 2024 vintage with the Mauritius and Fiji survey-redesign breaks disclosed, a third wave closed out the median seam with Laos, Mozambique, Pakistan, Bolivia, Myanmar, Ethiopia, Tunisia, Uganda, and Namibia, a means-flow wave then unlocked Ecuador (its own institute publishes only five coarse branches, but ILOSTAT carries the ENEMDU means at 2025 with the survey-redesign break disclosed), Bhutan, Guyana, Angola, Lesotho, and Mali on survey means, a second means wave brought in the Bahamas, Burkina Faso, Equatorial Guinea, Eswatini, Kiribati, Palau, Guinea-Bissau, Chad, Samoa, Togo, and Benin at 2022-2023 vintages, a final tail wave closed the Rev.4 seams with Ivory Coast, Niger, Comoros, Guinea, Curaçao, Belize, Burundi, the Maldives, Mauritania, the Marshall Islands, the Gambia, and Sierra Leone, an ISIC Rev.3 sweep then surfaced Paraguay and Puerto Rico at 2020 (Puerto Rico on published medians), Antigua and Barbuda, Macao, Suriname, and Seychelles, Palestine joined on 2025 Labour Force Survey medians in Israeli shekels after its stored World Bank PPP factor was found denominated in shekels while the config said Jordanian dinar, a mismatch that had inflated every Palestinian purchasing-power floor roughly 4.6 times, a national-host sweep of the remaining floor-only markets then brought Tanzania in on the NBS Formal Sector Employment and Earnings Survey 2024/25, the freshest survey in the matrix, with the formal-sector scope disclosed on every row, and Kosovo joined on the ASK administrative wage register after a browser session walked its postback-only PxWeb portal and recovered the direct API endpoint behind it, with ICT the highest-paid sector at 1,216 euro gross per month, and Ukraine joined on the Derzhstat Data Bank SDMX API, whose documented endpoint behind the new stat.gov.ua explorer serves the enterprise labour survey free under CC-BY 4.0 with Q2 2026 average monthly wages by activity section, information and communication at 77,598 hryvnia a month against an economy-wide 31,421, the quarterly economy-wide value matching the service's own announcement and the June single-month cell matching the published headline, with the wartime scope (10+ employee enterprises, occupied territories excluded) disclosed on every row, and Tajikistan joined on the statistics agency analytical-tables workbook, whose sector sheet carries 2024 average monthly wages under the national TUNFI-2 classification with finance at 6,199 somoni and information and communication at 4,610 against an economy-wide 2,310, the 2026 monthly path of 3,114 to 3,304 somoni disclosed per row so the cells read as conservative floors, and Nepal joined on the ILOSTAT republication of its 2017/18 Labour Force Survey after the round-15 batch probe had missed the market: the full ISIC4 section circle at one vintage, 14 rows with medians from 12,000 rupees in trade to 32,000 for the managers pool that anchors the three lead families, every cell carrying the survey-redesign break flag and the eight-year age handled with a conservative-floor sentence anchored on the minimum-wage revaluation from 13,450 to 17,300 rupees, and an explicit per-country ILOSTAT resweep (after the round-15 batch probe proved unreliable, the Nepal miss being the tell) then added six markets on the standard recipe: Jordan and Rwanda and Senegal and Uruguay at 2024 medians, Guatemala at 2023, and Ghana at its 2017 section-level vintage with the survey-redesign break and the eight-year age both disclosed, each carrying the ISCO-08 managers pool for its three lead families (Senegal's education median, 300,000 CFA francs above the 241,159 managers pool, ships verbatim under the established inversion precedent), and the resweep tail wave then landed fifteen markets in one pass, Timor-Leste, Somalia, and Liberia (the latter two carrying survey-quoted US dollar earnings under the Panama and Lebanon convention), Barbados, Saint Lucia, New Caledonia, Cameroon, Cabo Verde, Sudan, and Madagascar on ISIC4 medians, Nicaragua, Afghanistan, and Jamaica on ISIC3 medians where the revision publishes no technology section at all, and San Marino plus Montenegro on published means, with Unreliable cells excluded and their absences pinned (Sudan without technology, Saint Lucia without technology or leads, Cameroon without marketing, Cabo Verde reduced to five sections, Afghanistan without any finance section), older-vintage rows carrying conservative-floor disclosures, and five pre-2014 candidates declined as too old even for floors, and the round-28 wave corrected a queue-triage miss and opened the occupation seam: Brunei on its full 2014 section recipe and Tonga on fresh 2021 medians joined straight from the resweep data, while DR Congo, Djibouti, and Trinidad became the first leads-only markets, their one-digit ISCO managers pools anchoring the three leadership families with the senior absence pinned because one-digit groups cannot be attributed to senior families, and Liechtenstein remains the only EEA market still without benchmarks) and 2026 tax treatment (statutory schedules for 27 countries, from full bracket regimes to the Gulf zero-tax states), a purchasing-power floor for all 207 supported countries (Taiwan via the IMF, the rest via the World Bank), English, Arabic, Hindi, Indonesian, Spanish, French, Portuguese, and Russian locales with full RTL for Arabic, and an installable PWA (manifest, generated icon set, service worker with an offline fallback page). The gate (typecheck, unit tests, Playwright end to end tests, build) runs in CI on every push.

Beyond the core quote the site offers: offer evaluation against your band and floor, an opt-in relocation hardship view built on official DSSR allowances, remote-pay policy advisories from published research, and job description import by link from Greenhouse, Lever, and Ashby boards (fetched by your browser; no server involved).

## How it works

The calculator uses a two anchor model, validated by a three agent research team (Analyzer, Debugger, Verifier) on 30 August 2026 and re-audited end to end on 2 September 2026:

1. Market anchor: what employers in the target country actually pay for your role family and seniority band (P25, P50, P75), from official statistics and cited recruiter sources.
2. Floor anchor: the gross salary that preserves your current purchasing power after moving, using World Bank PPP factors and verified 2026 tax rules. Where no verified tax schedule exists, a conservative 20 percent default applies and the result says so.

The recommended quote is presented as floor, target, and stretch, in local currency monthly and annually plus any currencies you choose. GCC results include the local package structure (basic, housing, transport). Volatile currency targets (EGP, NGN, LBP) carry explicit risk notices.

Nationality never changes the number. Passport linked pay gaps in Gulf markets are real and documented, and the product reports them as advisory context only, because quoting below fair market value is how the gap survives.

## Principles

- Zero cost to run: static site on Cloudflare Pages, all math in the browser, free keyless FX APIs.
- Privacy by architecture: resumes, when uploaded, are parsed in the browser and never leave it. Job board imports are fetched by your browser directly from the board's public API.
- Honesty as a feature: every result shows data dates, source quality, and a confidence score with reasons. Single-average sources collapse the band to the median and say so.
- Free and open data only: World Bank (CC BY 4.0), US BLS (public domain), UK ONS (OGL v3), ILO, and cited recruiter sources. Numbeo, Glassdoor, and Levels.fyi data are never scraped or embedded, per their terms.

## Stack

Astro 5 with TypeScript, Tailwind v4 design tokens authored in OKLCH, Vitest unit tests, Playwright end to end tests, Cloudflare Pages hosting. Noto Sans family across Latin, Arabic, and Devanagari scripts with full RTL support.

## Development

Node 22 or newer, pnpm 10.

```
pnpm install
pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build
```

Deploy: push to main. Cloudflare Pages builds the site and GitHub Actions runs the same gate on every push.

Generators (all no-new-dependency, driven by the project's Playwright chromium or its data files):

- `pnpm tokens` regenerates `src/styles/tokens.css` from `design-system/tokens.json`, the single source of truth for styling.
- `pnpm benchmarks` regenerates `src/data/benchmarks.json` from the curated seeds.
- `pnpm fx:snapshot` refreshes the embedded exchange rate snapshot.
- `pnpm data:world` re-syncs World Bank PPP data.
- `node scripts/generate-og.mjs` and `node scripts/generate-icons.mjs` rebuild the share image and favicon set from tokens.

Contributing guide: `CONTRIBUTING.md`.

## License

MIT. See `LICENSE`.
