# Contributing to ExpatRate

ExpatRate tells expat job seekers what salary to quote. Static Astro site, browser-side calculation, zero operating cost. This guide covers the rules every change follows.

## Setup

Node 22 or newer, pnpm 10.

```
pnpm install
pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build
```

All five green before handoff. CI runs the same gate on every push, and local green does not guarantee CI green (axe contrast and timing differ on CI Chromium), so check the run after pushing.

## Ground rules

- Test first. Every behavior change starts with a failing test; the suite is the product's memory.
- Tokens only. Components use semantic tokens from `design-system/tokens.json`; raw colors, ad hoc shadows, and off-scale sizes do not ship. After editing tokens, run `pnpm tokens` (the CSS is generated).
- All locales together. Every user-facing string lands in English, Arabic, Hindi, Indonesian, Spanish, French, and Portuguese together; the copy test enforces key parity. No em dashes anywhere. Write plain, concrete sentences; avoid machine-sounding filler.
- Nationality never changes a calculated number. Context notes only.
- Privacy holds. Resume parsing stays in the browser. New integrations must not introduce a server or upload user files.
- Zero paid dependencies or services.

## Data curation

Salary benchmarks live in `src/data/benchmark-seeds.json`; the matrix in `src/data/benchmarks.json` is generated (`pnpm benchmarks`). Every number must trace to a free, public URL a human can click, recorded in the row's `sources`. Banned even if public: Numbeo, Glassdoor, Levels.fyi, Payscale, Mercer, ECA, and scribd rehosts. Single-average sources use the median-only convention (`p25` and `p75` are zero) so the result collapses the band honestly. Gated pages are not citable; if no verifiable source exists, the cell stays an explicit insufficient-data marker. Tax data carries the same discipline: statutory schedules where verified, the conservative 20 percent default disclosed where not.

## Commits and deploys

Push to main deploys (Cloudflare Pages) and triggers CI. Keep commits focused, one behavior each, with a message that says what changed and why in plain language. If a push goes red in CI, fix forward on main and say so plainly.
