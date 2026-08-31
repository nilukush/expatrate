# ExpatRate: High-Level Analysis

Phase: PART 1 analysis, prepared for approval before implementation
Date: 30 August 2026
Method: three-agent consensus research (Analyzer, Debugger, Verifier) plus a dedicated design research agent, all with live source verification on 30 August 2026. Full reports in `docs/RESEARCH/`.

---

## 1. Business Problem Definition

Expat job seekers applying across borders are asked by recruitment portals to state an expected salary in the local currency of each country, monthly or annually. Most people answer this question by guessing, anchoring on their previous salary, or copying a number from an unrelated forum. The three failure modes are expensive:

- Underquote: leaving money on the table, or signaling junior level for a senior role.
- Overquote: losing the offer because the number sits outside the local band for the role.
- Ignore structure: quoting a single figure in a Gulf market where packages are quoted as basic plus housing plus transport, or ignoring that a move from a zero-tax country to the UK needs nearly double the gross to preserve the same net.

The product answers one question precisely: what should I quote? It outputs a floor, target, and stretch number in the target country's currency, monthly and annually, in any additional currencies the user chooses, with a confidence label and a negotiation brief.

Success criteria:
1. A user can go from inputs to a defensible quote in under 3 minutes, no account, no upload required.
2. Every number carries provenance: source, license, data date, quality rating.
3. Zero operating cost. Static hosting, browser-side math, keyless free APIs.
4. The recommendation never prices a person by passport, gender, or origin.

Primary example user (used as the calibration persona throughout the research): Indian national, UAE Golden Visa resident in Dubai, 17+ years as a technology executive, last salary AED 53,871 per month tax-free, applying across UAE, Saudi, Qatar, Egypt, UK, USA, India, Singapore, and about 15 other countries.

The persona is a calibration fixture for worked-example tests, not the target user. The product serves every expat job seeker: fresh graduates (entry mode), mid-career professionals, and executives, of any nationality, across all covered markets and role families.

## 2. Research Method

Four agents were deployed in parallel on 30 August 2026:

| Agent | Mandate | Key verification work |
|---|---|---|
| Analyzer | Build the parameter model and data architecture | Live API fetches, terms pages, worked validation against Dubai tech-executive recruiter bands |
| Debugger | Stress-test feasibility, privacy, free stack; propose smallest honest v1 | Live CORS checks of FX APIs, login-wall verification for LinkedIn/Indeed, free-tier limits for Cloudflare/Netlify/Vercel |
| Verifier | Independent verification of sources, methodology, and 2026 tax rules; own model | Live World Bank API pulls (2025 PPP values), license verification (Numbeo, OGL, BLS, OECD), worked gross-up examples for UK/US/India/Egypt |
| Design Research | Design system foundations, i18n/RTL, accessibility, wizard UX, SEO/GEO | Google structured-data changelog verification (FAQ dead May 2026, HowTo dead, Occupation estimatedSalary deprecated Sept 2025), WCAG 2.2 specifics, GEO study findings |

Consensus rule: findings accepted only where at least two agents independently agree and the supporting source was verified live. Disagreements were adjudicated by the coordinator (documented in section 5).

## 3. Consensus Findings (all three agents, verified)

### 3.1 The calculation problem has two anchors, and both must be shown

All three agents converged on the same structural conclusion from independent directions:

- The mobility industry (Mercer, ECA, AIRINC) builds expat packages on a balance sheet: preserve home net purchasing power through cost-of-living adjustment, housing, and tax equalization. Verifier confirmed this from three independent firm sources.
- But for a self-directed job seeker negotiating a local or local-plus hire, the market pays the going rate for the role, not the newcomer's cost structure. Analyzer confirmed this as the "localization / going rate" approach; the Verifier's UK worked example proves the point concretely: the persona's purchasing-power floor in the UK is about GBP 307,000 gross (AED 53,871/month is AED 646,452/year; PPP 2.527 for UAE, 0.702 for UK, grossed up through verified 2026-27 UK tax and NI bands at about 41.7% effective deductions), while the London market median for a technology executive sits well below that. Only showing the equalized number would systematically overquote Western markets. Only showing the market median would hide the real pay cut.

Therefore: market anchor as the primary recommendation, purchasing-power floor as the explicit walk-away and decision input, both displayed, never silently blended.

### 3.2 Ranked parameter model

| Rank | Parameter | Role in model | Evidence quality | Verified free source |
|---|---|---|---|---|
| 1 | Market pay percentiles for role family and seniority in the target country (P25/P50/P75) | Primary recommendation anchor | High (US, UK), Medium (most), Low (GCC) | US BLS OEWS (public domain), UK ONS ASHE (OGL v3), ILOSTAT (open), recruiter guides for GCC (manual, cited) |
| 2 | Income tax and social charges differential | Converts the purchasing-power floor from net to gross | High (UK, US, DE, SG, IN, EG, ZA, SA, AE verified for 2026) | Official tax authorities, OECD Taxing Wages (CC BY 4.0), PwC summaries as cross-check |
| 3 | PPP conversion factor, private consumption | Purchasing-power transfer | High | World Bank PA.NUS.PRVT.PP (CC BY 4.0), live 2025 values pulled |
| 4 | Market FX rates | All currency conversion | High | open.er-api.com (primary, verified live, 166 currencies, CORS open) and frankfurter.dev v2 (fallback, verified live, 165 currencies) |
| 5 | Seniority band from years of experience | Selects the target percentile (P50 mid, P60-P75 senior, P70-P85 executive) | Medium | Calibrated to ASHE/OEWS distributions |
| 6 | Regional package structure | Output formatting (GCC basic/housing/transport splits, gratuity on basic) plus negotiation guidance | Medium-High (GCC) | Legal texts (UAE Decree-Law 33/2021, Saudi Labor Law) and payroll guides |
| 7 | Currency volatility (EGP, NGN, LBP) | Risk notice, USD-anchored display, wider range | High | Verified 2026 FX history (EGP ~47 to ~52 to ~50.25 within 2026), IMF |
| 8 | Data quality and market opacity per country | Confidence scoring | Derived | Per-row quality ratings in the dataset |
| 9 | Hardship differential | Optional corporate-relocation mode only | Low (public substitute verified) | US State Dept DSSR 500 table (free, city-level, verified 23 Aug 2026 data) |
| 10 | Family status and dependents | Negotiation checklist (schooling, housing size), not the base number | Medium | School fee databases, allowance prevalence surveys |
| 11 | Skill scarcity | Stretch-goal justification, range label | Low-Medium | Recruiter guides |
| 12 | Nationality / passport | NEVER in the math. Editorial context only | High (gap well documented) | gulfmigration.grc.net nationality tables, WTW 2025 |

### 3.3 Nationality question, answered with research

The user asked directly: are salaries different based on nationalities? Yes, in Gulf markets, materially. Survey data show Asian expatriates earning on average 25.8% less than Western expatriates region-wide; in the UAE, Western expats averaged about USD 11,936/month against USD 8,853 for Asian expatriates in comparable roles (Gulf Labour Markets programme data); WTW 2025 confirms multiples-wide gaps by nationality in KSA and UAE.

All three agents agree on handling, and this is a binding product decision: the calculator never applies a nationality coefficient. Telling South Asian and African users to underquote would systematically entrench the documented gap, collides with the direction of the EU Pay Transparency Directive (transposition deadline 7 June 2026), and would be the product's worst possible headline. Nationality appears as an optional input that unlocks advisory context: a neutral note that observed market medians vary by employer origin and passport, and that the quote is anchored to role and seniority benchmarks. Residency appears as optional context too (for example, a UAE Golden Visa holder needs no visa sponsorship, which is a negotiation plus, not a price change).

### 3.4 Input contract (consensus)

| Input | Verdict | Notes |
|---|---|---|
| Target country | Mandatory, dropdown | Tier 1 (full data) at launch; tier 2 countries shown with honest low-confidence framing |
| Role family | Mandatory, dropdown of 8 families | Free text cannot be mapped to benchmarks without paid LLM tooling; families match how benchmark data actually exists |
| Years of experience | Mandatory, banded | 15+ collapses into one executive band; public benchmarks do not support finer resolution at the top |
| Last salary (amount, currency, monthly/annual, gross/net) | Mandatory with interpretation confirmation | The number one garbage-in risk is basis confusion (12x error); a rendered confirmation step is required before computing |
| Output currencies | Optional | Default: local currency plus USD |
| Current country of employment | Mandatory, dropdown with confirmation | The PPP floor needs the origin country; salary currency alone is a bad proxy (a British professional earning USD in Dubai, remote earners in third countries). In entry mode it becomes optional because no floor is computed |
| Work arrangement (on-site, remote for a local company, remote for a foreign company) | Mandatory, segmented | Remote for a foreign company switches results to dual anchors: the local market and the employer's market, with confidence dropped one level (Debugger failure mode 8: quoting local rate for a remote US-employer role can underquote 3 to 5 times). This choice reveals a conditional employer-country field |
| Employment type (full-time, contract, freelance, part-time) | Mandatory, segmented | Day-rate conventions and 13th-month handling (Philippines, Indonesia). v1 supports full-time fully; the other three are labeled indicative |
| Family status and school-age dependents | Optional, whole step skippable | Research parameter 10: schooling costs, housing-size guidance, education-allowance prevalence (about 75% of UAE and Saudi employers pay it versus about 30% in Qatar). Drives notes and the negotiation checklist, never the base number |
| Current package composition (housing, transport, schooling, flights, bonus) | Optional checkboxes | Makes the floor comparison like-for-like; decisive for GCC-to-GCC moves where a total package must not be compared against a foreign basic-only figure |
| Sponsorship need in the target country | Optional toggle | Advisory only: needing no sponsorship is leverage (for example a UAE Golden Visa holder); needing sponsorship carries practical warnings |
| Company type (startup, enterprise, government, NGO) | Optional | Executive pay is bimodal between startup and enterprise (a documented edge case); shapes percentile framing and advisory text rather than the math |
| Job description text | Optional paste | Replaces the job URL. LinkedIn jobs sit behind login, Indeed behind Cloudflare 403, NaukriGulf and Bayt prohibit scraping; all three agents' findings converge. Client-side keyword hints, user-confirmed |
| Resume upload | Optional, parsed in browser only | pdf.js/mammoth.js in-browser prefill of role and years, always shown for confirmation. Never uploaded: the product then needs no GDPR controller stack for documents |
| Nationality | Optional | Context only, never pricing |
| Residencies | Optional | Context only (sponsorship, relocation notes) |
| Job listing URL | Dropped for v1 | Blocked by auth walls and CORS on a zero-cost stack |
| LinkedIn URL | Dropped | No free profile-read API exists; OIDC login returns only name and email |

Deliberately never collected: gender, age or date of birth, email or any login, passport details, and precise address. Protected characteristics never enter the math (the same principle that governs nationality), and a tool that collects nothing identifying has the strongest privacy posture available: no account, no database, nothing to leak. Target city inside a country stays deferred to v2 because free city-level cost data with clean licensing does not exist (the Numbeo licensing finding).

### 3.5 Data sources and licensing (the load-bearing constraint)

Embeddable, verified, free:
- World Bank PPP and price level data: CC BY 4.0. Live API, no key. Verifier pulled actual 2025 values.
- US BLS OEWS: public domain.
- UK ONS ASHE: Open Government Licence v3.0.
- ILOSTAT: open with attribution.
- OECD: CC BY 4.0 since July 2024 (members only, no GCC).
- US State Dept DSSR hardship table: public, city-level, current.
- open.er-api.com and frankfurter.dev v2: free, keyless, CORS confirmed by live test.
- Wikidata: CC0 for country metadata.

NOT embeddable (verified against their terms): Numbeo (scraping strictly prohibited; commercial use needs a paid license; a free ad-supported web product is commercial use), Glassdoor, Levels.fyi (API is enterprise priced), Payscale, and Mercer/ECA actual numbers (only rankings are public). These are used as editorial references a human reads and cites, never as data pipelines. This finding killed the naive architecture (scrape Numbeo for cost of living) and forced the World Bank PPP substitution, which the Verifier validated with worked examples.

Consequence: city-level cost data with clean licensing does not exist for free. v1 uses country-level PPP equalization (Verifier confirmed the full-basket approach is defensible; AIRINC notes housing norms are fading from practice anyway). City granularity is deferred until a licensable source exists.

### 3.6 Regional package conventions (verified)

- UAE: market practice basic 50-60%, housing 20-30%, transport 5-10%. The "housing = 25% of basic" figure traces to the repealed 1980 law; it is convention, not mandate. End-of-service gratuity accrues on basic only (21 days/year first 5 years, 30 days after).
- Saudi: commonly 50/25/25 basic/housing/transport or 70-75/20-25/5-10; housing allowance capped at 2 months' basic by labor law.
- Qatar: housing provided or allowanced; transport 8-12% of base common; education allowance paid by only about 30% of employers versus about 75% in UAE/KSA.
- Western markets: single gross figure, benefits on top.

### 3.7 Free stack (verified feasible)

- Hosting: Cloudflare Pages free tier (unlimited bandwidth and requests, 500 builds/month) is the only pick that survives verification; Vercel Hobby prohibits commercial use, Netlify free tier is tightening.
- Architecture: fully static (Astro) with the calculator as a client-side island; FX fetched at runtime in the browser (keyless, CORS-open, verified) with a build-time snapshot as offline fallback. This handles EGP/NGN volatility, where a build-time-only snapshot can sit inside a 10% move.
- Analytics: Cloudflare Web Analytics (free, no cookies, supports a no-consent-banner posture).
- The only optional cash cost is a custom domain (about USD 10/year). The free pages.dev subdomain works to start.

## 4. Approach Options Evaluated

Option A: cost-of-living converter (bottom-up only). Take the current salary, adjust by cost-of-living indices, output the result.
- Pros: simple, familiar, one dataset.
- Cons: produces un-winnable quotes in cheaper markets (an AED 646k cost basket transplanted to Lagos or Cairo is meaningless against local market pay); ignores what employers actually pay; Verifier demonstrated it overquotes Western markets too when tax is mishandled. Rejected.

Option B: market benchmark lookup (top-down only). Show local P25/P50/P75 for the role.
- Pros: winnable numbers, matches the strongest predictor of actual pay.
- Cons: ignores the user's floor entirely; a UAE resident moving to Cairo would see a huge implied pay cut with no purchasing-power context; useless for the tax dimension that dominates moves out of zero-tax countries. Rejected as sole model.

Option C (recommended): two-anchor hybrid with transparent presentation. Market anchor (role family x seniority band x country percentiles) as the primary recommendation, purchasing-power floor (PPP transfer plus tax gross-up) as the explicit walk-away number, both displayed with the tension explained. Recommended quote is clamped to the market band (never below P25, never above P90); when the floor exceeds the market ceiling the product says so plainly ("your current Dubai lifestyle is not affordable at London market rates for this role") instead of hiding it.
- Rationale: matches how self-directed expat hiring actually works (local-plus packages), keeps every number defensible to both the user and a recruiter, and turns the tension between the two anchors into the product's core insight. All three agents independently converged on a hybrid; the Verifier's worked examples validate the arithmetic end to end.

## 5. Disagreements and Adjudications

The agents were instructed to disagree openly. Six substantive disagreements emerged; each was adjudicated by the coordinator as follows.

| # | Question | Positions | Adjudication and rationale |
|---|---|---|---|
| D1 | Tax engine in v1? | Analyzer and Verifier: full iterative gross-up through 2026 brackets (Verifier verified parameters for 9 countries and ran worked examples). Debugger: defer, show one line of tax context only | v1 ships a simplified per-country effective-deduction table by income tier (for example UK at executive income: about 42% effective), which powers the floor calculation with honest rounding. The full bracket-by-bracket engine with tapers is a v2 step. Rationale: the floor only needs the effective rate to be honest, not precise to the dirham; this cuts the hardest engineering risk out of v1 while keeping the insight. The dataset schema carries the full bracket data now so v2 is an upgrade, not a rewrite |
| D2 | Blend into one number, or show both anchors? | Analyzer proposed a 60/40 blend with clamping and asked whether weights should shift by direction of move; Verifier argued the equalized number must never be the only output; Debugger wanted explicit floor/target/stretch | Show both anchors. No hidden weighting. Recommended quote = clamp(market percentile target, P25, P90), with the floor displayed as the walk-away and the stretch as P75-P90. This is more defensible than any magic blend constant |
| D3 | Walk-away floor display when far below market | Analyzer flagged the risk that a low floor anchors users too low | Display the floor labeled "minimum to not lose purchasing power; not a negotiation anchor", always alongside market context. The evidence (persona quote: UAE target AED 60k-75k/month versus current AED 53.9k) shows the floor usually sits below market for this persona, so labeling is the correct mitigation |
| D4 | Launch country count | Debugger: 6. Verifier: 25-country dataset. Analyzer: 20+ implied | Two tiers. Tier 1 (full calculator, benchmarks curated): UAE, Saudi Arabia, Qatar, UK, USA, India, Singapore, Egypt, Indonesia, Germany (10). Tax rules verified for 9 of these by the Verifier (Indonesia pending verification, flagged). Tier 2 (all remaining target countries in the dataset): PPP floor calculation plus package conventions with Low confidence and a clear "limited data" framing, no fabricated benchmarks. Rationale: Debugger's freshness argument wins for benchmarks; Verifier's dataset scope wins for coverage; tiering delivers both honestly |
| D5 | FX primary | Debugger: frankfurter primary. Verifier: open.er-api.com primary (verified all 19 needed currencies, daily) | open.er-api.com primary, frankfurter.dev v2 fallback, build-time snapshot as last resort. Both verified live; the pair provides redundancy at zero cost |
| D6 | Numbeo as cost-of-living source | Analyzer listed it with a licensing caveat; Verifier proved commercial use is prohibited | Excluded from the pipeline. World Bank PPP (CC BY 4.0) substitutes at country level. Consensus reached after the Verifier's terms verification |

One open item from the Analyzer (13th-month pay conventions in the Philippines and Indonesia, THR in Indonesia) was not fully verified; it is carried into the implementation plan as a data-verification task before the monthly/annual conversion ships for those two countries.

## 6. Product Definition

Name: ExpatRate (coordinator decision per the brief). Tagline: "Know what to quote."

Positioning: the free, no-login, methodology-transparent salary quote tool for expat job seekers. Differentiators against incumbents (validated by design research): no login wall before the result, explicit confidence scoring with reasons, data dates on every number, multi-currency output, GCC package structure support, and a negotiation brief rather than a bare number.

v1 scope:
- 10 tier 1 countries, tier 2 informational coverage for the rest of the 25-country dataset
- 16 role families spanning the whole expat labor market, not only tech: software engineering; data and AI; IT and technology executive; product management; cybersecurity; design; delivery and project management; sales and business development; marketing and growth; finance and accounting; HR and people; operations and supply chain; general management and executive leadership; engineering (civil, mechanical, electrical); healthcare; education and teaching. US and UK public data covers all of these; curation for other tier 1 countries prioritizes high-volume families, and any family and country cell without verified data returns an explicit insufficient-data result
- 3 seniority bands (senior, lead, executive) plus an entry mode that runs market-anchor-only for users with no prior salary
- Two-anchor output: floor, target (recommended), stretch; monthly and annual; local currency plus USD plus user-chosen currencies
- GCC package composition card; currency-risk notices for EGP, NGN, LBP; confidence label with reasons; data dates; disclaimer
- English UI first with hreflang scaffolding day one; Arabic and Hindi locales land as translations are produced (structure verified by design research)
- Client-side resume prefill (PDF, DOCX), JD text paste with keyword hints

Deferred to v2: job URL import, LinkedIn integration, user-contribured salary data, full bracket tax engine, city-level cost data, remote-pay policy modeling, offer comparison, hardship premium mode.

## 7. Technology Decision (coordinator, per the brief)

Astro 5 with TypeScript, Tailwind v4 for token-driven styling, Vitest for unit tests, Playwright with axe for end-to-end and accessibility tests, Cloudflare Pages hosting, GitHub Actions CI (free for public repos). The salary engine is a pure TypeScript package (no DOM dependencies) so it is unit-testable to the worked examples in the Verifier report. All rendering is static HTML; the calculator is one hydrated island. This maximizes SEO (prebuilt pages, hreflang) and keeps the free-tier ceiling effectively unreachable.

## 8. Integration Points and External Dependencies

| Dependency | Purpose | Failure behavior |
|---|---|---|
| open.er-api.com | Primary FX, runtime browser fetch | Falls back to frankfurter.dev v2, then to the embedded build-time snapshot; FX date always displayed |
| frankfurter.dev v2 | Secondary FX | Same chain |
| World Bank API (build time) | PPP refresh, annual | Embedded snapshot continues serving with its date shown |
| Cloudflare Web Analytics | Traffic measurement | Optional script; site works fully without it |
| No backend, no database, no auth | By design | Not applicable |

## 9. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Solo-maintainer dataset decay (the real break point per Debugger) | High | Launch small (tiered), per-row last_reviewed dates, public changelog, honest "insufficient data" cells instead of silent fallbacks |
| GCC benchmark quality is Low | Medium | Confidence capped at Medium for GCC targets, sources and ratings shown, semiannual manual refresh from cited recruiter guides |
| Informal markets (Egypt, Nigeria, Lebanon) | Medium | Data-quality grade shown, wider bands, formal-versus-local split noted, Lebanon "quote in USD" guidance |
| FX volatility (EGP moved about 10% inside 2026) | Medium | Runtime fetch, USD-anchored display, volatility notice, wider ranges |
| Basis input error (monthly read as annual) | Medium | Interpretation confirmation step, plausibility bands, refuse-to-compute on absurd inputs |
| Executive band precision | Medium | Wide ranges, confidence capped at Low-Medium, "floor not midpoint" framing, negotiation brief output |
| Legal exposure (pay gaps, salary history laws) | Low-Medium | Nationality never priced; disclaimer on all results; editorial framing anchored to role benchmarks |

## 10. Questions From the Brief, Answered

- What parameters matter for an expat salary quote? Section 3.2 table: market percentiles first, tax differential second, PPP third, FX fourth, then seniority, package structure, currency risk, data quality, and optional hardship, family, scarcity factors.
- Is LinkedIn input mandatory? No. Dropped: no free API exists that returns anything useful. The resume covers the same signal.
- Years of experience mandatory or optional? Mandatory but banded; 15+ is one executive band.
- Are multiple nationalities or residencies possible? The input accepts multiple (chip multiselect), but the values drive advisory context only, never the price.
- Should salaries differ by nationality? They do in practice in Gulf markets, by large documented margins. The product reports this as context and refuses to encode it, on ethical, legal, and product grounds.

## 11. Approval Checkpoint

Per the agreed process, implementation begins only after this analysis and the plan in `docs/IMPLEMENTATION-PLAN.md` are approved. The design system specification is `docs/DESIGN-SYSTEM.md` with machine-readable tokens in `design-system/tokens.json`.
