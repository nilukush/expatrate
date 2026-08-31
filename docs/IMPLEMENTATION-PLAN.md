# ExpatRate: Implementation Plan

Phase: PART 2 planning, pending approval of `docs/ANALYSIS.md`
Discipline: strict TDD (red, green, refactor) for every step. No production code without a failing test first.
Process safeguards: maximum 3 implementation attempts per step; after 3 failures, stop and request human guidance. Each step ends with a stop or go checkpoint.

Model tagging: steps tagged ENGINE (pure logic, heavy unit tests), UI (components, a11y and visual checks), DATA (datasets and provenance), or INFRA (build, deploy).

Dev environment notes: local development uses non-standard ports to avoid conflicts. Astro dev server on port 4573, preview on 4574. Package manager pnpm.

Regression baseline: at Step 1 the full suite (unit plus e2e) becomes the baseline; every subsequent step must leave it green.

---

## Step 1: Project Scaffold and Test Harness [INFRA]

├─ Objective: A building Astro 5 site with TypeScript, Tailwind v4, Vitest, Playwright, and axe-core wired up, plus CI, establishing the regression baseline.
├─ Prerequisites: none.
├─ Test First:
│  ├─ Test type: e2e smoke (Playwright)
│  ├─ Test cases: dev server responds 200 on port 4573; the placeholder home page contains the site name; `pnpm build` exits 0; a trivial Vitest assertion passes; a trivial axe scan of the placeholder page reports zero violations.
│  └─ Expected: all fail because the project does not exist.
├─ Implementation:
│  ├─ Scope: `npm create astro` (minimal, strict TypeScript), add Tailwind v4, Vitest config, Playwright config with webServer on 4573, axe-core in the e2e helper, GitHub Actions workflow running lint, unit, build, e2e (free for public repos).
│  └─ Constraints: no paid dependencies; no analytics yet; site renders a placeholder heading.
├─ Acceptance Criteria:
│  ├─ Tests pass: smoke e2e green, Vitest green, CI green on first push.
│  ├─ No regressions: baseline is this suite.
│  └─ Code quality: strict TS, no `any` in committed code.
├─ Verification: `pnpm test && pnpm test:e2e && pnpm build` all exit 0 locally and in CI.
└─ Stop/Go: proceed to Step 2.

## Step 2: Design Token Pipeline [UI]

├─ Objective: tokens.json drives Tailwind v4 `@theme` and CSS custom properties; drift and rule violations fail the build.
├─ Prerequisites: Step 1.
├─ Test First:
│  ├─ Test type: unit (Vitest) plus lint (Stylelint)
│  ├─ Test cases: every primitive in `design-system/tokens.json` appears in the generated `@theme` block; semantic light and dark sets contain the same token names; a fixture stylesheet using a raw hex value or a physical `margin-left` fails Stylelint; a component referencing a primitive (teal-600) instead of a semantic token fails the check.
│  └─ Expected: fail; no pipeline exists.
├─ Implementation:
│  ├─ Scope: build script generating the `@theme` block from tokens.json; Stylelint config (no raw colors, spacing scale enforcement, logical properties only); placeholder theme toggle class wiring (`.dark`) unstyled beyond tokens.
│  └─ Constraints: tokens.json is the single source of truth; generated file committed for review clarity.
├─ Acceptance Criteria:
│  ├─ Tests pass: generation test and Stylelint rules green.
│  ├─ No regressions: Step 1 suite green.
│  └─ Code quality: token generation is idempotent (running twice changes nothing).
├─ Verification: mutate tokens.json, observe the generation test fail; revert.
└─ Stop/Go: proceed to Step 3.

## Step 3: Core Dataset with Provenance [DATA]

├─ Objective: versioned JSON datasets (25 countries, PPP, effective tax tiers, package conventions, role family benchmark schema) with per-row provenance and validation tests.
├─ Prerequisites: none technically; Step 1 for the harness.
├─ Test First:
│  ├─ Test type: unit (Vitest) over a schema validator
│  ├─ Test cases: every country row carries ISO3, currency, tax regime id, package convention id; every PPP row carries year, value, source URL, license, retrieved date; every benchmark row carries role family, level, country, p25, p50, p75, currency, quality rating, last_reviewed date; tier 1 countries all have benchmark rows for the priority role families, with explicit insufficient-data markers for the remaining families; tier 2 countries explicitly lack benchmark rows; the Verifier's live 2025 PPP values (UAE 2.527, UK 0.702, India 19.839, Egypt 7.722, Saudi 1.871, Singapore 1.024, Germany 0.719) round-trip exactly.
│  └─ Expected: fail; datasets absent.
├─ Implementation:
│  ├─ Scope: `src/data/*.json` populated from the verified sources in `docs/RESEARCH/`; tier 1 set (UAE, SA, QA, GB, US, IN, SG, EG, ID, DE); effective deduction tiers per country at defined income levels (from the Verifier's worked examples: UK about 41.7% at the executive tier); package conventions with legal citations; benchmark rows for the 16 role families x 3 levels x tier 1 countries with quality ratings (US and UK public data covers all occupations; other countries entered manually with honest Low or Medium flags, prioritizing the high-volume families first: software engineering, finance and accounting, HR and people, sales and business development, operations and supply chain, general management); employment-type conventions per country (months per year, 13th-month and THR flags, day-rate divisors); family context data (education-allowance prevalence, indicative international school fee ranges, sourced); changelog file.
│  └─ Constraints: no scraped data; every row cites a source a human can click; Indonesia 13th-month and THR conventions resolved and documented before the monthly/annual conversion ships for ID and PH (open item from research).
├─ Acceptance Criteria:
│  ├─ Tests pass: schema and value tests green.
│  ├─ No regressions: prior suite green.
│  └─ Code quality: no row without provenance.
├─ Verification: CI green; spot check 5 random rows against their cited sources.
└─ Stop/Go: human review of the benchmark table contents (data correctness gate), then proceed.

## Step 4: Salary Engine (Pure TypeScript) [ENGINE]

├─ Objective: the complete calculation as a DOM-free package: normalization, market anchor, PPP floor, effective-tax gross-up, range assembly, confidence scoring.
├─ Prerequisites: Step 3.
├─ Test First:
│  ├─ Test type: unit (Vitest), worked-example driven
│  ├─ Test cases (each asserts against the research-validated numbers):
│  │  ├─ normalizeSalary: AED 53,871 monthly -> AED 646,452 annual; monthly/annual and gross/net toggles; refuses absurd plausibility outliers (annual entered as monthly).
│  │  ├─ marketAnchor: role family x level x country returns P25/P50/P75; missing cell returns an explicit insufficient-data result, never a silent fallback.
│  │  ├─ pppFloor: persona UAE to UK floor path (646,452 / 2.527 x 0.702 = about GBP 179,600 net; gross-up at 41.7% effective = about GBP 308,000) and UAE to India path (about INR 5.07M net) within stated tolerance.
│  │  ├─ originCountry: the floor uses the current country of employment input, never currency inference (test: a USD salary earned in the UK uses UK PPP, not US).
│  │  ├─ workArrangement: remote for a foreign company returns dual anchors (local market and employer market) with confidence dropped one level; on-site and remote for a local company return the single local anchor.
│  │  ├─ employmentType: full-time monthly to annual uses the country's months convention; contract mode converts via the day-rate divisor and labels the result indicative.
│  │  ├─ packageComposition: a current package including housing lifts the like-for-like floor comparison against a foreign all-gross figure (GCC to GCC case).
│  │  ├─ recommendedQuote: clamps to the P25 to P90 band; floor below market widens the low end; floor above ceiling triggers the explicit unaffordable-at-market flag instead of a blended number.
│  │  ├─ packageSplit: KSA 50/25/25, UAE gratuity-on-basic warning, western single gross.
│  │  ├─ currencyRisk: EGP, NGN, LBP targets produce the risk notice and USD-anchored figure.
│  │  └─ confidence: tier-down rules (Low benchmark quality caps at Medium; executive band caps at Low-Medium; volatile currency drops one level).
│  └─ Expected: fail; engine absent.
├─ Implementation:
│  ├─ Scope: `src/engine/` pure functions, no imports from UI code; a fixed set of exported types; constants for percentile targets by seniority (P50 mid, P60-P75 senior, P70-P85 executive). Employment type, package composition, sponsorship, company type, and family context feed advisory outputs (day-rate conversion, schooling and allowance notes, leverage notes) without altering the base anchors; the one exception is work arrangement, which switches remote-for-a-foreign-company results to dual anchors.
│  └─ Constraints: deterministic (FX passed in as a parameter, never fetched inside the engine); tolerance bands documented per test.
├─ Acceptance Criteria:
│  ├─ Tests pass: all worked examples green.
│  ├─ No regressions: prior suite green.
│  └─ Code quality: 90%+ line coverage on engine; no `any`.
├─ Verification: run the persona through UAE, UK, India, Egypt, Saudi targets and compare against the numbers in `docs/RESEARCH/verifier-report.md` and `docs/RESEARCH/analyzer-report.md`.
└─ Stop/Go: human review of the persona output (correctness gate), then proceed.

## Step 5: FX Module with Fallback Chain [ENGINE]

├─ Objective: runtime FX fetch (open.er-api.com primary, frankfurter.dev v2 secondary, embedded snapshot last) with dates surfaced.
├─ Prerequisites: Step 1.
├─ Test First:
│  ├─ Test type: unit (Vitest with mocked fetch)
│  ├─ Test cases: primary success returns rates plus fetch date; primary failure falls back to secondary; both fail falls back to snapshot with snapshot date exposed; malformed responses rejected; rates cached for the session; timeout bounded (3 seconds) so offline users get the snapshot quickly.
│  └─ Expected: fail; module absent.
├─ Implementation:
│  ├─ Scope: `src/fx/` with injected fetch for testability; build step refreshing `src/data/fx-snapshot.json` with attribution.
│  └─ Constraints: no keys, no paid services; snapshot regeneration is a CI job.
├─ Acceptance Criteria:
│  ├─ Tests pass: fallback chain green.
│  ├─ No regressions: prior suite green.
│  └─ Code quality: fetch mocked, no live network in unit tests.
├─ Verification: temporarily block the primary host in dev, confirm the secondary serves; block both, confirm snapshot serves with its date shown.
└─ Stop/Go: proceed to Step 6.

## Step 6: Wizard UI, English Locale [UI]

├─ Objective: the five-step wizard (your role; your current pay with origin country and the interpretation confirmation; the opportunity with target country and work arrangement; optional skippable family context; display currencies, plus optional JD paste and resume prefill) with autosave and full keyboard and screen reader support.
├─ Prerequisites: Steps 2, 3, 4, 5.
├─ Test First:
│  ├─ Test type: e2e (Playwright plus axe)
│  ├─ Test cases: full happy path to a result; back navigation preserves every value; reload restores from localStorage; the salary confirmation step blocks progression until confirmed; the interpretation line states monthly, currency, and basis correctly; choosing remote for a foreign company reveals the employer-country field; the family context step is skippable and skipping changes no base number; axe reports zero violations on each step; keyboard-only completion succeeds; focus moves to each new step heading; error state on empty required field shows text, links the field, and focuses the summary.
│  └─ Expected: fail; wizard absent.
├─ Implementation:
│  ├─ Scope: wizard island components per the design system (step shell, stepper, money input with currency selector, work arrangement and employment type segmented controls, conditional employer-country select, package composition checkbox group, skippable family context step, country and currency selects including current country of employment, resume dropzone with in-browser pdf.js and mammoth.js parsing that only prefills, JD textarea with confirmable suggestion chips, skip affordances); i18n dictionary structure with English.
│  └─ Constraints: resume bytes never leave the browser (verified by a test asserting no network request on upload); one hydrated island, everything else static.
├─ Acceptance Criteria:
│  ├─ Tests pass: e2e and axe green.
│  ├─ No regressions: prior suite green.
│  └─ Code quality: all copy from dictionaries, no hardcoded strings.
├─ Verification: manual pass in Safari and Chrome, mobile viewport, 200% zoom.
└─ Stop/Go: human review of the flow feel, then proceed.

## Step 7: Results Dashboard [UI]

├─ Objective: bento results page: hero quote card, range bar with markers, confidence block, floor card, package card, currency-risk notice, breakdown accordion, comparison table, trust strip, share link, print stylesheet.
├─ Prerequisites: Step 6.
├─ Test First:
│  ├─ Test type: e2e plus unit for formatting
│  ├─ Test cases: persona inputs produce the Step 4 numbers rendered exactly; monthly/annual toggle recomputes displayed figures; currency chips convert with the fetched rate and show the FX date; GCC target renders the package card and gratuity warning; volatile-currency target renders the risk notice with the USD figure; every value is present as text (chart-equivalent rule); share URL encodes inputs and reproduces the same result when opened; print stylesheet shows the full result (checked via print media emulation); axe zero violations; reduced-motion renders the final number without count-up.
│  └─ Expected: fail; dashboard absent.
├─ Implementation:
│  ├─ Scope: results island per the design system wireframe; Intl.NumberFormat formatting module with explicit locale and ISO 4217 codes; trust strip fed from dataset provenance.
│  └─ Constraints: hero figure inside the H1; markers distinguished by shape, not color alone.
├─ Acceptance Criteria:
│  ├─ Tests pass: all listed e2e green.
│  ├─ No regressions: prior suite green.
│  └─ Code quality: zero raw number formatting outside the formatting module.
├─ Verification: visual review against the wireframe; verify a printed page reads correctly.
└─ Stop/Go: human visual acceptance, then proceed.

## Step 8: SEO Layer: Programmatic Pages, hreflang, Structured Data [INFRA]

├─ Objective: static landing pages for tier 1 country x role combinations, hubs, sitemap with reciprocal hreflang (English only at first), valid JSON-LD, answer-first content blocks.
├─ Prerequisites: Steps 3, 4, 7.
├─ Test First:
│  ├─ Test type: unit over generated routes and e2e over rendered pages
│  ├─ Test cases: every expected tier 1 page exists and returns 200 with prerendered figures in the HTML source (no client-only content); each page's opening paragraph contains the key figure; JSON-LD parses and validates against WebApplication, Organization, BreadcrumbList shapes; no HowTo or FAQPage markup anywhere (negative test); hreflang set is reciprocal and includes x-default; sitemap URLs all resolve; no page generated for combinations lacking data (doorway prevention).
│  └─ Expected: fail; pages absent.
├─ Implementation:
│  ├─ Scope: Astro static routes for `/salary/{role}/in/{country}/`, country and role hubs, methodology page with Dataset markup and provenance tables; content templates with answer-first copy from dictionaries; tier 2 country pages render honest limited-data framing.
│  └─ Constraints: every generated page must contain role-and-country-specific numbers and unique content per the spam policy research.
├─ Acceptance Criteria:
│  ├─ Tests pass: route and JSON-LD tests green.
│  ├─ No regressions: prior suite green.
│  └─ Code quality: content generation data-driven, no per-page handcrafted HTML.
├─ Verification: Rich Results Test and Schema.org validator on three sample pages; check the HTML source shows figures without JavaScript.
└─ Stop/Go: proceed to Step 9.

## Step 9: Arabic and Hindi Locales with RTL [UI]

├─ Objective: fully localized ar and hi sites with correct RTL behavior, script-correct fonts, and localized number formatting.
├─ Prerequisites: Steps 2, 6, 7, 8.
├─ Test First:
│  ├─ Test type: e2e plus unit over formatting
│  ├─ Test cases: /ar/ pages render dir="rtl" lang="ar" and load only the Arabic font subset (assert the Latin preload is absent); every UI string resolves from the ar and hi dictionaries (negative test for fallback-to-English leaks); layout mirrors via logical properties with no horizontal overflow; numerals format per locale (hi-IN lakh grouping; ar Eastern Arabic digits where the locale dictates); axe zero violations on RTL pages; hreflang now includes ar and hi reciprocally; language switcher preserves page context.
│  └─ Expected: fail; locales absent.
├─ Implementation:
│  ├─ Scope: dictionary files translated by a reviewed workflow (no raw machine-published pages); font loading per script with unicode-range; script size factors from tokens.
│  └─ Constraints: human review of Arabic copy before publish (curation requirement from the scaled-content policy research).
├─ Acceptance Criteria:
│  ├─ Tests pass: all locale e2e green.
│  ├─ No regressions: prior suite green.
│  └─ Code quality: zero physical direction properties in components (Stylelint already enforces; RTL test proves it).
├─ Verification: native-reader spot check of Arabic and Hindi pages for clipping, shaping, and tone.
└─ Stop/Go: human review of translations, then proceed.

## Step 10: Privacy, Analytics, Disclaimers, Sharing Polish [INFRA]

├─ Objective: privacy policy, Cloudflare Web Analytics, persistent disclaimers, OG images, print refinement.
├─ Test First:
│  ├─ Test types: e2e
│  ├─ Test cases: privacy page exists and names no data collection beyond anonymous analytics; results footer carries the disclaimer with benchmark and FX dates; OG tags present with a summary image on every public page type; analytics script loads only after consent-free assessment documented in the policy (no cookies asserted by test); no resume upload ever issues a network request (repeated from Step 6 as a regression guard).
│  └─ Expected: fail; absent.
├─ Implementation:
│  ├─ Scope: static OG image generation at build; privacy and terms pages; disclaimer component wired to dataset dates.
│  └─ Constraints: no cookies, no consent banner needed; Cloudflare Web Analytics only.
├─ Acceptance Criteria:
│  ├─ Tests pass; prior suite green.
├─ Verification: cookie inspection in a clean browser profile shows zero first-party tracking cookies.
└─ Stop/Go: proceed to Step 11.

## Step 11: Deploy and Search Enrollment [INFRA]

├─ Objective: production on Cloudflare Pages, custom domain (optional, the only cash item, roughly USD 10/year; pages.dev subdomain acceptable until approved), Search Console with sitemap and generative AI reporting.
├─ Prerequisites: all prior steps.
├─ Test First:
│  ├─ Test type: e2e against the deployed URL
│  ├─ Test cases: production URL serves 200 on home, a tier 1 landing page, ar and hi pages; sitemap.xml fetches; canonical and hreflang tags correct on production; FX snapshot refresh CI job runs and updates dates.
│  └─ Expected: fail; not deployed.
├─ Implementation:
│  ├─ Scope: Cloudflare Pages project bound to the repo; production and preview branches; header config for caching and security; Search Console verification; llms.txt published once the domain is final.
│  └─ Constraints: free tier only; build minutes verified within the 500/month limit.
├─ Acceptance Criteria: deployed e2e green; Search Console shows the sitemap processed.
├─ Verification: external uptime check on three URLs for one week.
└─ Stop/Go: post-launch backlog review (v2 items from `docs/ANALYSIS.md` section 6).

---

## Regression Protection

- The full suite (Vitest unit, Playwright e2e with axe, build) runs on every push via GitHub Actions and locally before each step is declared done.
- Steps 4 and 7 carry the persona worked-example tests permanently; any change to the engine must keep them passing or explicitly revise the research basis with a documented reason.
- Steps 6 and 10 both assert the no-network-on-resume-upload property; this is a privacy invariant, not a feature test.
- Unexpected failures in an unrelated step stop work immediately (divergence protocol below), including when the failure appears flaky: flakiness is treated as a finding.

## Divergence Protocol

Stop and reassess when: any regression appears; the dataset cannot support a planned calculation honestly; a free-tier limit turns out to be narrower than verified; a legal or licensing question surfaces that the research did not cover; complexity exceeds the step estimate by roughly 2x.

Response: finish the current step only if safe; document the divergence in `MEMORY.md`; request a decision on re-planning versus side-task-first; after resolution, resume at the identified step.

## Attempt Limit

Three failed implementation attempts on any single step: stop, write up what was attempted and why it failed, request human guidance. No fourth attempt without new information.
