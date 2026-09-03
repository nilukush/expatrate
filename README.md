# ExpatRate

Know what to quote. ExpatRate is a free web tool that tells expat job seekers what salary to quote in any country, monthly and annually, in your currency.

Built for a real problem: when you apply for jobs across borders, portals ask for your expected salary in the local currency and you have no idea what number keeps you both competitive and fairly paid. ExpatRate answers that with a defensible band, a confidence label, and a negotiation brief.

## Status

Launched 31 August 2026 at https://expatrate.pages.dev. Live coverage: 39 countries with verified market benchmarks (780 curated rows) and 2026 tax treatment (statutory brackets for 24 regimes), a purchasing-power floor for all 206 supported countries, English, Arabic, and Hindi locales with full RTL. The gate (typecheck, 158 unit tests, 60 Playwright end to end tests, build) runs in CI on every push.

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
