# Debugger Report: Stress-Test and v1 Scope

Agent role: Debugger (one of three consensus agents: Analyzer, Debugger, Verifier)
Research date: 30 August 2026
Method: all FX, hosting, scraping, and legal claims verified against live endpoints or current (2025-2026) sources.

---

All FX, hosting, scraping, and legal claims below were verified against live endpoints or current (2025-2026) sources on 2026-08-30.

## 1. Input Contract Verdict Table

| Field | Verdict | Reason | Fallback |
|---|---|---|---|
| Target country | MANDATORY (dropdown) | Drives every benchmark row. Reliable, zero failure mode. | None needed; restrict list to covered countries. |
| Role / job title | MANDATORY, but as a curated dropdown of 8-12 role families, not free text | Free text forces a taxonomy-matching problem you cannot solve without an LLM (paid). Family granularity matches how benchmarks actually exist. | User picks nearest family; tool states which family it used. |
| Job listing URL | DROP as a load-bearing input; keep optional "paste job description text" | Verified: LinkedIn now requires login to view job listings (confirmed by n8n community threads and scraping guides); Indeed sits behind Cloudflare and returns 403 to non-browser clients; NaukriGulf/Bayt have no public API and prohibit scraping in ToS. Even ignoring the walls, a browser fetch of these domains is blocked by CORS, and free CORS proxies or readers (r.jina.ai: 20 requests per minute per IP without a key, 500 RPM with a free key) are an uncontrolled third-party dependency that still hits the auth wall. A mandatory input that fails 60-80% of the time kills trust on first use. | Textarea: user pastes the JD text. Client-side keyword extraction (title, seniority words, location) as a suggestion the user confirms. This gets 90% of the value with 0% of the fragility. |
| Resume upload | OPTIONAL, client-side only. Not mandatory. | Verified feasible: pdf.js `getTextContent()` in-browser is standard, and OpenResume (open-resume.com) proves full client-side parsing of profile, education, experience, skills with "file data is used locally and never leaves your browser." But its own docs concede it is designed for single-column English resumes with well-formatted section headings; scanned image PDFs yield nothing without OCR; DOCX needs a separate path (mammoth.js). Parsing is heuristic: use it only to PREFILL role family and years, always shown for user confirmation. Mandatory upload adds friction and failure for marginal signal. | User types role family, years, and (optionally) skills manually. Calculator must be fully usable with zero upload. |
| LinkedIn URL | DROP | Verified: without the LinkedIn Partner Program there is no profile-read API. "Sign In with LinkedIn" (OIDC) returns only name and email. To use it you would need OAuth, which means a backend and app review, violating the zero-backend constraint, and it yields nothing useful for salary math anyway. | None. The resume contains everything LinkedIn would have given. |
| Years of experience | MANDATORY (banded) | Cheap, reliable. But cap the model: 15+ years collapses into a single "executive band" because public benchmarks thin out above it. | Band defaults from resume parse if provided, else user picks. |
| Nationality | DROP as a pricing input; at most optional context text | See failure mode 8 below. It is the single most dangerous field in the product: it invites encoding the GCC nationality pay gap (Asian professionals earn ~26% less than Western peers per Doha News survey; WTW 2025 confirms multiples-wide gaps by nationality in KSA/UAE). Doing that is discriminatory advice, EU-adjacent legal exposure, and a reputational landmine. | A static, per-country editorial note: "local market premiums and discounts exist; benchmark against role, sector, and budget, not passport." |
| Residence / residencies | DROP for v1 | Weak signal (visa logistics, not pay). Golden-visa status does not change market rate. | Nothing. |
| Last salary + currency + basis | MANDATORY with an explicit confirmation step | It is the user's anchor, but it is also the top garbage-in risk (see failure mode 1). Require: amount, currency, monthly-vs-annual toggle, gross-vs-net toggle, and a rendered interpretation the user must confirm ("we understood AED 53,871 per month gross, tax-free, = AED 646,452 per year"). | Refuse to calculate until confirmed. Plausibility bands per currency catch 12x errors. |
| Output currencies | OPTIONAL, default local currency + USD | Trivial client-side conversion. | Default pair covers most portal questions. |

## 2. Ranked Failure Modes and Mitigations

1. Wrong salary basis entered (monthly vs annual, gross vs net, basic vs package). A user entering AED 53,871 monthly and the tool reading it as annual produces a 12x error; UAE salaries are quoted monthly with allowances, India uses CTC vs in-hand, UK/US use annual gross. This is the most likely way the tool gives harmful advice. Mitigation: basis toggles, interpreted-value confirmation screen, plausibility bands per currency (a "CTO in Dubai earns AED 40k-120k per month" sanity envelope), and refuse-to-compute on absurd inputs.
2. Stale or missing country/role data. A hand-curated JSON decays silently; 2019-era GCC medians are useless after 2022-2026 inflation cycles. Mitigation: every benchmark row carries `last_reviewed`; the UI prints "data as of" dates; an unknown country+role cell must return "insufficient data" honestly, never silently fall back to a global average. Widen the range as data ages (e.g., +2 percentage points of band width per quarter of age).
3. Informal and opaque markets (Egypt, Nigeria, Lebanon). Published benchmarks skew to large multinationals and NGOs; much of the real market is cash, negotiated, or dollar-denominated (Lebanon is effectively dollarized; the lira rate is nearly meaningless for salary quoting). Mitigation: per-country data-quality grade (A/B/C) shown to the user, automatically wider bands for C-grade markets, and local-practice notes ("in Lebanon, quote in USD").
4. Currency collapse and FX staleness. Verified numbers: EGP moved from ~47.2 per USD in January 2026 to below 52 in March 2026 (record low), back to ~50.25 on 30 August 2026; NGN official (NFEM ~1,360) vs parallel (~1,390-1,407) gap is currently a modest 2-4%; LBP ~89,500-89,970. A build-time FX snapshot can sit inside a 10% move for EGP within months. Mitigation: fetch FX at runtime in the browser from a keyless CORS-enabled endpoint (both verified, see section 4) with the embedded snapshot as offline fallback; always show FX date; for volatile currencies show the USD-anchored figure prominently alongside local currency.
5. Executive-level inapplicability. The persona is a 17-year technology executive. Public benchmarks for "software engineer" medians are actively misleading at that level; exec comp is idiosyncratic (equity, bonus, housing, schooling allowances). Mitigation: a hard seniority ceiling in the model (15+ = executive band), deliberately wide ranges, confidence capped at Low-Medium for the exec band, and copy that says "at this level, benchmarks indicate floor, not midpoint; negotiate on scope."
6. Nationality-linked pay gaps in GCC (ethical and legal). The gap is real and documented (Doha News survey: Asian professionals ~26% below Western peers, Arabs ~15.7% below; WTW 2025). Encoding it means the tool systematically tells South Asian and African users to underquote, entrenching discrimination. Context: UAE mandates equal pay for men and women doing the same work (2020 decree-law); the EU Pay Transparency Directive (2023/970) took effect with a 7 June 2026 transposition deadline (only ~4 of 27 member states transposed on time, infringement risk for the rest) and its entire thrust is stamping out pay differentiation by protected characteristics. Mitigation: nationality never enters the math; the tool quotes what the work is worth and teaches users to anchor on market rate, not on their passport or their previous (possibly discounted) salary. This is also a product differentiator, not just a constraint.
7. Equity- or commission-heavy roles. OTE vs base confusion produces absurd monthly quotes. Mitigation: input explicitly says "base, fixed cash only"; detect commission-heavy keywords (sales, AE, BDE) in pasted JD text and warn.
8. Remote roles paid in employer currency. Location-based pay policies cut both ways; quoting "local rate" for a remote US-employer role can underquote by 3-5x. Mitigation: remote vs on-site toggle; if remote, show both local-market and employer-market anchors and drop confidence one level.
9. User quotes net vs gross across tax systems. Comparing tax-free AED with gross GBP or net INR is apples-to-oranges. Mitigation: force gross basis, show one line of tax context ("UK figures are gross; income tax applies") without computing taxes. A tax engine is v2+ scope.
10. Solo-maintainer dataset decay. 20 countries x 30 roles = 600 cells to keep honest. That is the architecture's real break point, not hosting. Mitigation: launch small (section 5), per-row review dates, a public changelog. Better a small fresh map than a large stale one.

## 3. Privacy and Legal Notes

- Client-side parsing is the only defensible v1 design. Verified that full resume parsing in-browser is proven tech (OpenResume; pdf.js). If the file never leaves the browser, the founder never becomes a data controller for the resume contents: no retention schedule, no deletion workflow, no breach exposure, and a one-line privacy story users instantly understand. A server upload path would drag in the full GDPR controller stack (records of processing, retention, deletion requests, breach notification, DPA with the host). Do not accept a server-upload shortcut in review.
- GDPR still applies to the site itself, even with no uploads: privacy policy, identity of the controller, legal basis for any analytics. Cheap to satisfy on a static site.
- Analytics: Cloudflare Web Analytics is verified free, uses no cookies or localStorage, no fingerprinting, no cross-site tracking, which supports a no-consent-banner posture (their claim; keep a privacy policy note anyway). Avoid Google Analytics in v1; it drags in consent requirements.
- Disclaimers: results page carries a persistent footer: estimates from public market data, indicative only, not financial, tax, or legal advice, plus benchmark and FX dates. Also worth one line where relevant: several jurisdictions (various US states; the EU direction under the Pay Transparency Directive) restrict employers from demanding salary history, so the tool should teach the user to quote market rate rather than disclose history.
- ToS caution: if any v2 ever reintroduces URL import, scraping LinkedIn/Indeed/NaukriGulf violates their terms; note it now so it is never casually added.

## 4. Free Stack Feasibility Verdict: REALISTIC, with Cloudflare Pages as the only sane pick

Verified specifics:

- FX, verified live today:
  - `api.frankfurter.dev/v2/rates` (frankfurter.app now 301s to frankfurter.dev): no key, no quota, free including commercial use, CORS `access-control-allow-origin: *` confirmed with an Origin header, 165 currencies in v2 including AED, SAR, QAR, EGP, NGN, KES, MAD, VND, PAB, LBP. Got real rates on the spot (AED 3.6725, EGP 50.271 dated Aug 28, NGN 1342.04 dated Aug 29). Trap: legacy v1 docs/endpoints cover only ~30 ECB currencies with no Gulf or African currencies, so plenty of older tutorials are wrong for this use case. Also note per-currency publication lag of 1-2 days on some quotes.
  - `open.er-api.com/v6/latest/USD`: no key, CORS `*` confirmed, daily update (response dated Sun, 30 Aug 2026), all target currencies present. The sibling keyed product (exchangerate-api.com) is 1,500 requests/month on the free key, which does not matter since the keyless open endpoint is fine.
  - Architectural conclusion: fetch FX at runtime in the user's browser (costs you nothing, always fresh), embed a snapshot at build time as fallback. No paid API, no server.
- Hosting limits, verified: Cloudflare Pages free: unlimited bandwidth, unlimited static requests, unlimited sites, 500 builds/month, 1 concurrent build, 20,000 files/site, 100 projects; if any Functions are ever used, Workers free allows ~100k requests/day. That is effectively unbreakable for this product. Netlify free is officially 100 GB bandwidth / 300 build minutes, but third-party 2026 sources report a transition to ~300 credits/month, which one source equates to roughly 15 GB; treat as a risk. Vercel Hobby: ~100 GB bandwidth and 1M invocations, but Hobby is for personal non-commercial use, which is disqualifying for a product site.
- SEO: the consensus (and Google's own docs) is that client-side-rendered SPAs are risky for SEO-critical pages even though Google can render JS. Use a static site generator (Astro or Next static export) so every country/role landing page is prebuilt HTML with hreflang; the interactive calculator is one JS island on top. This costs nothing and aligns with the static host. A daily FX/refresh build (about 30 builds/month) plus content builds fits easily inside 500/month; optional GitHub Actions (2,000 free minutes/month) can pre-render and commit the FX snapshot.
- Where this architecture genuinely breaks: (a) user-contributed salary data requires a backend, moderation, and spam defense, so it is v2+; (b) dataset freshness is a human process, not a technical one; (c) any future server-side rendering or auth would push you off pure static, and Cloudflare Workers free tiers absorb that only in small volumes; (d) the only real cash cost is a custom domain (roughly $10/year); the free pages.dev subdomain works but is weaker for branding and multilingual SEO.

## 5. Recommended v1 Scope (smallest honest version)

Inputs (all client-side, nothing uploaded):
1. Target country (dropdown)
2. Role family (dropdown, 8-12 families)
3. Years of experience (banded, 15+ = executive band)
4. Current/last salary: amount + currency + monthly/annual + gross/net, with a mandatory confirm-the-interpretation step
5. Output currencies (optional; default = local + USD)
6. Optional: paste job description text (keyword hints, user-confirmed)
7. Optional: resume upload (PDF or DOCX, parsed in-browser solely to prefill fields 2-3 for confirmation)

Output: a quote range (floor, target, stretch) in local currency monthly and annually plus USD; a 3-level confidence label (High/Medium/Low) WITH explicit reasons attached (benchmark age, market opacity grade, seniority band, FX volatility); "data as of" dates for benchmarks and FX; the basis line restating input assumptions; disclaimer footer.

Countries at launch: 6. UAE, Saudi Arabia, Qatar, India, UK, Singapore. These six cover the persona's core markets with the best public benchmark coverage. Egypt, Nigeria, Lebanon are explicitly listed as "coming, low data confidence" pages (still good SEO placeholders) rather than shipping C-grade numbers that could mislead someone's mortgage negotiation.

Explicitly deferred to v2: job URL import (blocked by walls, needs a paid scraper or partnership), LinkedIn integration, user-contributed data, tax/net calculations, cost-of-living comparison, remote-pay policy modeling, offer comparison, multilingual UI (ship English v1; the hreflang structure can exist day one with English only, then add Arabic and Hindi pages as translations land), nationality/visa context pages (editorial only, never model inputs).

## 6. Open Disagreements Expected with the Analyzer

1. Nationality as a model parameter. If the Analyzer has a nationality coefficient (the GCC data tempts it), I will push back hard: it produces systematically harmful underquoting for non-Western nationals, collides with the EU Pay Transparency direction, and is the product's worst possible headline. Nationality can inform editorial copy, never the number.
2. Job URL as mandatory input. It is in the planned inputs list, and it is the field I verified as broken on a free, client-side, no-auth stack. Text paste is the honest substitute; URL import is a v2 feature contingent on an import pipeline that does not exist for free.
3. Resume upload as mandatory. I want it optional. Heuristic parsing (single-column English bias, no OCR for scans) fails often enough that gating the funnel on it loses users whose data would have been fine as three typed fields.
4. Country count. The Analyzer's parameter model will probably want all 20+ target countries. Maintainability math (600 cells for one maintainer) says 6 at launch; more countries means staler data per country, which is worse than fewer, fresher markets.
5. Executive multipliers. If the Analyzer produces a clean "17 years = 2.4x median" curve, the underlying data does not support that precision at the top band. Wide range, low confidence, floor-not-midpoint framing is the honest output for the persona himself.
6. FX at build time vs runtime. If the plan is build-time snapshot only, the EGP/NGN evidence (10% intra-year moves, 1-2 day publication lags) argues for runtime client fetch with the snapshot as fallback, which I verified is free and CORS-open.

## 7. Sources

- https://frankfurter.dev/ , https://frankfurter.dev/docs/ , https://api.frankfurter.dev/v2/currencies , live test of https://api.frankfurter.dev/v2/rates (30 Aug 2026)
- https://www.exchangerate-api.com , https://open.er-api.com/v6/latest/USD (live, 30 Aug 2026)
- https://developers.cloudflare.com/pages/platform/limits/ , https://www.cloudflare.com/products/pages/
- https://www.netlify.com/pricing/ (plus 2026 third-party reports of the credit-based free tier)
- https://vercel.com/docs/plans/hobby , https://vercel.com/pricing
- https://community.n8n.io/t/scrape-linkedin-jobs-now-log-in-needed/211353 , https://codewords.ai/blog/guide-linkedin-scaping , https://scrapfly.io/blog/posts/how-to-scrape-linkedin
- https://stackoverflow.com/questions/74010726/facing-403-error-while-indeed-web-scraping-using-python , https://www.indeed.com/help/job-seekers/articles/33465379855501-cloudflare-errors-basic-troubleshooting
- https://jina.ai/reader/
- https://www.open-resume.com/resume-parser , https://stackoverflow.com/questions/17424639/extract-text-from-pdf-file-using-javascript , https://github.com/unjs/unpdf
- https://www.morganlewis.com/pubs/2026/06/eu-pay-transparency-directive-the-deadline-for-transposition-has-passed-what-now , https://iuslaboris.com/insights/eu-pay-transparency-directive-which-countries-have-transposed/
- https://dohanews.co/survey-asian-arabs-expats-in-the-gulf-paid-less-than/ , https://www.wtwco.com/en-il/insights/2025/04/paying-for-diverse-talent-in-the-middle-east
- Trading Economics and Ahram Online data via search (Aug 2026: USD/EGP ~50.25; NFEM ~1,360 vs parallel ~1,390-1,407), plus live endpoint values above
- https://www.cloudflare.com/web-analytics/
- https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics , https://metaflow.life/blog/javascript-seo
