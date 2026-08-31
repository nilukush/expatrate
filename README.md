# ExpatRate

Know what to quote. ExpatRate is a free web tool that tells expat job seekers what salary to quote in any country, monthly and annually, in any currency.

Built for a real problem: when you apply for jobs across borders, portals ask for your expected salary in the local currency and you have no idea what number keeps you both competitive and fairly paid. ExpatRate answers that with a defensible range, a confidence label, and a negotiation brief.

## Status

Launched 31 August 2026 at https://expatrate.pages.dev. Live coverage: 29 countries with verified market benchmarks and 2026 tax regimes (578 curated rows), a purchasing-power floor for 206 countries, English, Arabic, and Hindi locales with full RTL. The full suite (82 unit tests, 40 Playwright end to end tests) gates every deploy.

- Business analysis, research consensus, and product definition: `docs/ANALYSIS.md`
- UI, UX, and graphic design system: `docs/DESIGN-SYSTEM.md`
- Machine readable design tokens: `design-system/tokens.json`
- Numbered TDD implementation plan: `docs/IMPLEMENTATION-PLAN.md`
- Raw research reports from the agent team: `docs/RESEARCH/`

## How it works

The calculator uses a two anchor model, validated by a three agent research team (Analyzer, Debugger, Verifier) on 30 August 2026:

1. Market anchor: what employers in the target country actually pay for your role family and seniority band (P25, P50, P75).
2. Floor anchor: the gross salary that preserves your current purchasing power after moving, using World Bank PPP factors and verified 2026 tax rules.

The recommended quote is presented as floor, target, and stretch, in local currency monthly and annually plus any currencies you choose. GCC results include the local package structure (basic, housing, transport). Volatile currency targets (EGP, NGN, LBP) carry explicit risk notices.

Nationality never changes the number. Passport linked pay gaps in Gulf markets are real and documented, and the product reports them as advisory context only, because quoting below fair market value is how the gap survives.

## Principles

- Zero cost to run: static site on Cloudflare Pages, all math in the browser, free keyless FX APIs.
- Privacy by architecture: resumes, when uploaded, are parsed in the browser and never leave it.
- Honesty as a feature: every result shows data dates, source quality, and a confidence score with reasons.
- Free and open data only: World Bank (CC BY 4.0), US BLS (public domain), UK ONS (OGL v3), ILO. Numbeo, Glassdoor, and Levels.fyi data are used as editorial references by a human, never scraped or embedded, per their terms.

## Stack

Astro 5 with TypeScript, Tailwind v4 design tokens authored in OKLCH, Vitest unit tests, Playwright end to end tests, Cloudflare Pages hosting. Noto Sans family across Latin, Arabic, and Devanagari scripts with full RTL support.

## License

MIT. See `LICENSE`.
