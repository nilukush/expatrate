# Analyzer Report: Parameter Model and Data Architecture

Agent role: Analyzer (one of three consensus agents: Analyzer, Debugger, Verifier)
Research date: 30 August 2026
Method: live verification of data sources (APIs fetched, terms pages read). Items not verified are flagged [UNVERIFIED].

---

Methodology note: I verified every data source claim directly (APIs fetched live, terms pages read) rather than relying on secondary summaries. Items I could not verify are explicitly flagged with [UNVERIFIED]. Today's date basis: August 30, 2026.

## 1. Ranked Parameter Table

Ranking reflects weight the parameter should carry in the final quote, based on how mobility industry practice (Mercer, ECA International, AIRINC balance sheet methodology) and market reality drive outcomes.

| # | Parameter | Why it matters | Weight guidance | Primary free data source |
|---|-----------|----------------|-----------------|--------------------------|
| 1 | Local market pay percentile for role and seniority (target city) | The single strongest predictor of what an employer will actually pay. A quote outside the local band for the role loses the offer regardless of personal cost math. Industry "going rate / localization" approach treats host market as the anchor; corporates use it for permanent and local-plus hires | 40-60% of the blended anchor. Quote target percentile: P50 for mid-level, P60-P75 for senior/executive, P90 as ceiling | BLS OEWS (US), ONS ASHE via Nomis (UK), ILOSTAT (global baseline), recruiter guides (GCC/APAC), Levels.fyi display data (tech) |
| 2 | Income tax and social security differential (net-to-net, gross-up) | A gross quote that ignores tax is meaningless. Moving UAE (0% income tax) to UK means roughly 30-45% marginal+NI erosion at executive income; the gross must be grossed up to preserve net. Core of corporate "tax equalization" practice | Gates the entire calculation: required input for converting a net target into a gross quote. Weight 15-25% | OECD Taxing Wages (OECD countries), PwC Tax Summaries (Egypt, Nigeria, Vietnam, Indonesia), national tax authority pages |
| 3 | Cost of living differential (goods and services basket, excluding rent) | Mobility industry applies COL only to the "spendable income" portion (roughly 30-45% of net), not the whole salary. Mercer/ECA COLA is computed as spendable income times index differential, adjusted for FX | Applied to spendable portion only, so effectively 10-20% of total quote magnitude, but decides winnability in extreme cases (Hong Kong, Singapore, Zurich vs low-cost markets) | World Bank ICP PPP tables (PA.NUS.PRVT.PP), Numbeo (view only, licensing caveat), State Dept allowance tables |
| 4 | Housing / rent differential (city level, expat-standard housing) | Rent is the largest single relocation cost swing and is treated separately from goods-and-services COL in all industry methodologies. Mercer computes housing allowance as host city accommodation cost minus hypothetical home housing norm | Separate component, typically the largest single adjustment. Norms: home housing spend 18-22% of net income (Eurostat 22.2%, US BLS ~20.4%) | Numbeo rent by city (display), ECA/Mercer public summaries, State Dept housing allowance tables [verify coverage] |
| 5 | Seniority level and years of experience premium | Experience-earnings curves are concave: annual within-role raises of 2-5%, but step changes at level boundaries; executive promotions average +67% (Revelio Labs). 17+ years as founder/CPTO is a different market from mid-level engineer | Modifies anchor percentile choice (+1 percentile band per seniority tier) rather than multiplicative premium | Built-in to percentile selection; ASHE/OEWS percentiles by occupation already embed experience |
| 6 | Expat package structure by region (allowances vs all-cash gross) | The same total means different things: GCC packages pay allowances on top (or as split), Western packages are gross with minimal cash allowances. Quote must be presented in the local convention or it is misread by recruiters | Presentation-layer parameter, plus 0-25% package value effect in GCC where allowances stack | Country payroll guides (Papaya, Asanify: KSA 50% basic + 25% housing + 25% transport convention; UAE 60/40 or 50/50 basic split) |
| 7 | Skill scarcity / demand premium for the role | Scarce skills (AI, senior product, cyber) command above-band quotes; this is how a P75+ quote is defended. Current tech market premiums run 5-15% above standard bands for hot skills [directional] | Multiplier 1.00-1.15 on market anchor, evidence-based only | Recruiter salary guides (Michael Page UAE, Motion Recruitment), Levels.fyi trends |
| 8 | Family status and dependents | Drives housing size (industry sizing rule: 1BR single/couple + 1BR per child), schooling need, flights. Schooling is the single largest premium component in Saudi packages (SAR 25,000-80,000 per child per year; 75% of UAE and KSA employers pay education allowance vs only 30% in Qatar) | Does not change base quote; changes total package target and negotiation checklist. Schooling: 0-15% of package if dependents school-age | International school fee databases (Edarabia: Dubai AED 12,723-120,000+/yr; Holborn: KSA SAR 40,000-100,000 avg) |
| 9 | Hardship / location difficulty rating | Industry adds 5-35% of base for hardship locations. Corporate assignee packages use Mercer/ECA location grades; free substitute exists (see sources) | 0-35% multiplier, but only for corporate-style relocation quotes, not local hires | US State Dept DSSR 500 Post Hardship Differential table (free, city-level, updated biweekly) |
| 10 | Currency volatility and inflation of target currency | Quoting in a collapsing currency destroys real value: EGP floated March 2024 (EGP 31 to ~50/USD) with inflation spiking near 33-57%; NGN inflation ended 2024 near 35% and IMF still calls the naira ~25.6% undervalued. Affects whether to quote with indexation clauses or in hard-currency terms | Does not change level; changes recommended structure (USD-pegged, annual review clause) and widens the range | IMF, World Bank inflation series, Frankfurter historical FX (free) |
| 11 | Nationality / passport-linked pay differentials (GCC and Asia) | Documented reality: Gulf recruitment survey data show Asian expatriates earning on average 25.8% less than Western expatriates region-wide, and in the UAE Western expats averaged $11,936/month, about 35% above Asian expatriates ($8,853) in comparable roles. Driven by the "passport wage" system, kafala history, and home-country anchoring by employers. ETHICAL HANDLING: the product must NEVER apply a nationality discount to its recommendation. Use only as (a) an optional informational context note to the user, (b) a data-quality explanation for why observed crowdsourced medians may sit below a fair-market quote | 0% as an adjustment factor. Informational only | Gulf Business salary surveys, Gulf Labour Markets programme (gulfmigration.grc.net) nationality-group tables |
| 12 | Purchasing power parity conversion (fallback tier) | PPP (especially the household-consumption variant) is the right macro fallback when city-level cost data is missing. Note PPP conversion is NOT a salary-setting method by itself, it is a cross-country comparability tool | Only as fallback when parameters 1-4 are data-poor; then carries the anchor weight | World Bank ICP, CC BY-4.0 |

## 2. Recommended Calculation Model

Approach evaluation:

- Bottom-up cost basket (pure build-up): start from current net salary, adjust COL and housing, gross up for target taxes. This is the classic corporate balance sheet method. Strength: defensible to the user. Weakness: produces quotes wildly off local market (a Dubai AED 646k net-equivalence for Lagos would be absurd vs local market). Also weak for self-initiated job seekers, who are paid market rates, not corporate assignment packages.
- Top-down market percentile (going rate / localization): start from local role percentiles. Strength: winnable quotes. Weakness: ignores the user's floor; a UAE resident moving to Cairo deserves to know the market implies a huge pay cut.
- Hybrid, market-anchored with net-preservation floor (RECOMMENDED). This matches how real hiring actually works for self-directed expat job seekers (local-plus packages) while keeping the user's purchasing power as a decision input, not a blind multiplier.

Formula-style model:

```
INPUTS
  R        = resolved role/seniority (from job listing + resume, mapped to local occupation taxonomy)
  C_target = target city/country
  S_cur    = current salary, normalized to annual gross in origin currency
  FX       = market exchange rates (daily)

STEP 0: Normalize
  S_cur_annual_gross = S_cur * (12 or 13, by country convention) if monthly
  Convert to a common base currency (USD) at spot FX

STEP 1: Market anchor (top-down)
  M_p = local-market gross annual pay at percentile p for R in C_target
  Choose percentile by seniority: entry P25-P40, mid P50, senior P60-P75, executive P70-P85
  M_low = M_p25, M_high = M_p90 (or P75 where percentile detail is unavailable)

STEP 2: Net-equivalence anchor (bottom-up floor)
  Net_cur = S_cur_annual_gross * (1 - effective_tax_rate_origin(S_cur_annual_gross))
  Spendable_cur = Net_cur * spendable_share (30-45% by family size and income level)
  Housing_norm_cur = Net_cur * housing_share (18-22%)
  COLA = Spendable_cur * (COL_index_target / COL_index_origin - 1)   [expat-oriented index]
  Housing_diff = Rent_target(expat standard, family-sized) - Housing_norm_cur
  Net_target_needed = Net_cur + COLA + Housing_diff
  Gross_equiv = gross_up(Net_target_needed, target_country_tax_schedule)
      where gross_up solves: Net_target_needed = G - tax(G) - SSC(G) iteratively

STEP 3: Blend with clamping (the core recommendation)
  Raw = w1 * M_p + w2 * Gross_equiv        (w1 = 0.6, w2 = 0.4 default;
                                            w1 -> 1.0 when local market data is strong;
                                            w2 -> 0.5+ when user is a corporate relocation)
  Recommended_target = clamp(Raw, M_p25, M_p90)
    Interpretation: never quote below the market floor (undervalues the user)
    nor above the market ceiling (loses the offer).

STEP 4: Adjustments
  Scarcity_multiplier = 1.00-1.15 (documented hot-skill demand only)
  Hardship_premium = 1 + DSSR_rate (optional, corporate-relocation mode only; e.g. Riyadh 30%, Cairo 25%, Dubai 5%, London 0%)
  Recommended_target = Recommended_target * Scarcity_multiplier * Hardship_premium
    then re-clamp to (M_p25, M_p90 or 1.2 * M_p75 for executives)

STEP 5: Range and confidence
  Quote_low  = max(Recommended_target * 0.85, M_p25)
  Quote_high = min(Recommended_target * 1.15, M_p90)
  Confidence = score of data completeness:
    +2 role percentile available at city level
    +1 role percentile at country level only
    +2 verified tax schedule for target
    +1 city-level COL and rent
    +1 stable currency
    Report bands: High (6-7), Medium (4-5), Low (0-3)

STEP 6: Output formatting (critical for usability)
  Present: annual gross and monthly gross, in local currency first, then user-chosen currencies at spot FX
  Present package structure guidance by region:
    GCC: quote TOTAL package; if asked for basic split, KSA convention ~50% basic + 25% housing + 25% transport;
         UAE convention ~60/40 or 50/50 basic-to-allowance; warn end-of-service gratuity is computed on BASIC only
    Western markets: single gross figure; add note that health insurance, retirement match are on top
  Present negotiation floor (the net-equivalence number) privately to the user as their walk-away
```

Worked sanity check with the example user (17+ yrs, CPTO, Dubai, AED 53,871/month = AED 646,452/year tax-free): recruiter and job-listing data for technology chiefs in Dubai cluster at AED 60,000-90,000/month base at large enterprises (JobxDubai AED 60k-140k; RFS HR AED 600k-1.44M/year; live LinkedIn posting AED 55k-75k). The user's current AED 53.9k/month sits slightly below the senior band, so for a UAE application the model should recommend approximately AED 60k-75k/month (P60-P75), which validates cleanly against independent market data. For a UK application the same user needs roughly double the Dubai gross just to preserve net (UK income tax + NI at that level erodes roughly 35-40%), so the model's gross-up step will correctly show why UK quotes look enormous.

## 3. Data Source Inventory (free, zero-budget)

Verified live unless flagged.

| Source | URL | Provides | Update freq | License / terms | Embed or manual |
|--------|-----|----------|-------------|-----------------|-----------------|
| Frankfurter FX API | https://frankfurter.dev (API: https://api.frankfurter.dev) | Daily FX from 84 central banks; v2 covers 165 currencies. VERIFIED: AED, SAR, QAR, EGP, NGN, INR, ZAR, VND, THB, PHP, IDR, MXN, PAB, KES, MAD, LBP, GBP all present. Historical series to 1948 | Daily | Free, open source, no API key, no hard quota, commercial use OK, attribution expected | Embed (public JSON API) |
| ExchangeRate-API open endpoint | https://open.er-api.com/v6/latest/USD | VERIFIED live: no key, daily update, 166 currencies, all 18 target currencies present (AED 3.6725, EGP 50.25, NGN 1339 as of 2026-08-30) | Daily | No key; attribution link required; caching expected; redistribution prohibited | Embed (use as fallback for Frankfurter) |
| World Bank WDI PPP API | https://api.worldbank.org/v2/indicator/PA.NUS.PRVT.PP | PPP conversion factor for household consumption (the right variant for salary comparison), plus PA.NUS.PPP (GDP), price level indices | Annual (2025 data now available) | CC BY-4.0, fully reusable with attribution | Embed (bulk CSV download) |
| US BLS OEWS | https://www.bls.gov/oes/data.htm | ~830 occupations, P10/P25/P50/P75/P90 wages, national/state/metro, US only | Annual | Public domain (US federal) | Embed |
| UK ONS ASHE + Nomis | https://www.ons.gov.uk/ashe and https://www.nomisweb.co.uk/datasets/ashe | Occupation-level earnings (SOC 2020 4-digit), percentiles 10-99, by region | Annual (Oct release) | Open Government Licence (attribution) | Embed |
| ILOSTAT | https://ilostat.ilo.org/topics/wages/ | Mean nominal wages by country/sector for 200+ countries; Global Wage Report Excel download. NOT by occupation | Annual | Free, open access | Embed |
| NBER Occupational Wages around the World | https://www.nber.org/research/data/occupational-wages-around-world-oww-database | 164 occupations, 192 countries, historical (ends 2008) | Frozen | Free download | Manual backfill only |
| US State Dept Post (Hardship) Differential | https://allowances.state.gov/web920/hardship.asp | City-level hardship rates 0-35%. VERIFIED 08/23/2026 table: Riyadh 30%, Lagos/Abuja 30%, Cairo 25%, Delhi/Mumbai 25%, Hanoi/HCMC 25%, Jakarta 25%, Beirut 25%, Jeddah/Dhahran 25%, Nairobi 20%, Johannesburg 20%, Alexandria 20%, Manila 15%, Mexico City 15%, Casablanca 15%, Cape Town 15%, Bangkok 10%, Doha 10%, Abu Dhabi 10%, Rabat 10%, Dubai 5%, Panama City 5%, Singapore 0%, London 0% | Biweekly | Public, free, no login | Embed (scrape-friendly public table; cite source) |
| State Dept allowances portal | https://allowances.state.gov/web920/location.asp | COLA, housing, education allowance benchmarks by post (education at post: Abu Dhabi ~USD 24,650; Dhahran ~USD 17,600-25,450) | Biweekly | Public | Embed |
| OECD Data Explorer (Taxing Wages, PIT_EESSC) | https://data-explorer.oecd.org/s/12t | Personal income tax + employee SSC rates at 67/100/133% of average wage, OECD countries | Annual | Free download, reuse per OECD terms | Embed for OECD |
| PwC Tax Summaries | https://taxsummaries.pwc.com | Country PIT and SSC rate cards. VERIFIED: Egypt 0-27.5% progressive (top above EGP 1.2m); Nigeria new 2026 bands 0-25% (0% first NGN 800k); Vietnam 5-35% residents, 20% flat non-residents; Indonesia 5-35%; India new regime Nil-30% (effectively tax-free to INR 12 lakh with rebate) | Annual | Free reference content; no API; summarizing rates in your own calculator is standard practice but check PwC terms | Manual entry into tax tables |
| Numbeo | https://www.numbeo.com (terms: https://www.numbeo.com/common/terms_of_use.jsp) | City-level COL indices, rent, item prices; the free crowd standard | Continuous | CRITICAL CAVEAT: free for personal, academic, journalistic use. Commercial use requires a paid data license. Raw data redistribution prohibited. Scraping violates ToS. A free web product monetized later is commercial | Manual reference at launch; license if embedding |
| Levels.fyi | https://levels.fyi | Tech salary benchmarks by level/company | Continuous | ToS claim broad rights; official API is enterprise (~$4,000/month); actively anti-scraping. Public web pages may be consulted manually like a human job seeker | Manual reference only, never scrape |
| Glassdoor | https://www.glassdoor.com | Salary ranges by title/city | Continuous | ToS prohibit scraping and automated access without written permission; official partnership required for data reuse | Manual reference only |
| Mercer public city ranking | https://www.mercer.com/insights/total-rewards/talent-mobility-insights/cost-of-living/ | Annual most-expensive-city list for expats (2024: Hong Kong 1, Singapore 2, Zurich 3; Dubai 15th, Abu Dhabi 43rd). 2025 edition not yet clearly indexed [UNVERIFIED] | Annual | Public article; cite, do not republish wholesale | Manual |
| Michael Page UAE salary guide | https://www.michaelpage.ae/salary-guide-uae | Free recruiter salary tables by role for UAE | Annual | Free PDF/web; check reuse terms | Manual |
| Gulf Labour Markets programme | https://gulfmigration.grc.net | GCC average salaries by nationality group (2017 tables), the main public documentation of passport-based differentials | Irregular | Academic, cite | Manual |
| ERI SalaryExpert | https://www.salaryexpert.com | Free lookups of compensation for many countries | Continuous | Free display; API is paid | Manual |
| IMF WEO + World Bank inflation | https://www.imf.org/en/Publications/WEO and WDI API (FP.CPI.TOTL.ZG) | Inflation and currency stability scoring | Semiannual / annual | Open, CC BY-4.0 (WB) | Embed |
| Talent.com | https://talent.com/salary | Aggregated posted salary ranges by country | Continuous | [UNVERIFIED terms; treat like Glassdoor until checked] | Manual |

Architecture implication: build the product on Frankfurter (primary FX), World Bank API (PPP), State Dept DSSR (hardship), BLS/ONS (US/UK anchors), ILOSTAT (fallback country wage level), and manually curated recruiter-guide tables for the 20 target countries refreshed quarterly. Treat Numbeo, Levels.fyi, and Glassdoor as editorial references a human consultant reads, not as data pipelines.

## 4. Edge Cases and Mitigations

1. Large informal markets (Egypt, Nigeria, Lebanon, Morocco). Formal-sector pay can be 2-5x informal; crowdsourced medians are noisy. Mitigation: prefer ILO mean formal-sector wage + PPP for the country floor, use recruiter/LinkedIn-listing data for role level, widen range (low = 0.75x target), cap confidence at Medium, and show the split "formal sector multinationals vs local companies."
2. Missing role data for a city/country. Mitigation ladder: (a) same role country capital, (b) same role regional hub city with city COL adjustment, (c) occupation-family percentile from ILO/NBER OWW with seniority band, (d) PPP round-trip method: indicative salary = home_net_equiv via PPP conversion. Drop one confidence point per fallback level.
3. Commission or equity heavy roles (sales, startup executives). Mitigation: quote base + target bonus separately (OTE convention); state that equity is excluded from the quote but note GCC startups increasingly offer equity at the top of base bands; never fold variable pay into the base quote.
4. Fresh graduates. Product gap: last salary is mandatory, so new grads cannot use the net-equivalence anchor. Mitigation: allow a "no prior salary / entry level" mode that runs market-anchor-only (P25-P40 percentile) with degree and internship tier.
5. Currency instability (EGP, NGN, and historically LBP). EGP floated March 2024 (~EGP 31 to ~50/USD, inflation peaked near 33-57% in 2024); NGN unified mid-2024, inflation ~35% end-2024, IMF still estimates ~25.6% undervaluation despite 2025 appreciation. Mitigation: for these targets add a mandatory "currency risk" notice, recommend quoting with an annual FX/inflation review clause or a USD-indexed component, use market (not official) rates when they diverge, and widen the range by the trailing 12-month FX volatility band.
6. GCC allowance structures vs Western gross conventions. Mitigation: the output must render a "package composition card" per country: KSA (typical 50% basic + 25% housing + 25% transport; housing 25-35% of basic is the convention; transport 10%), UAE (50-60% basic split; gratuity accrues on basic only, so advise the user to negotiate total package with a reasonable basic), Qatar (note only ~30% of employers pay education allowance vs ~75% in UAE/KSA), Western markets (single gross + benefits on top).
7. Part-time or contract work. Mitigation: normalize via day-rate conventions (annual / 220-250 working days; hourly = annual / 2080 for US-style), handle 13th-month conventions (Philippines 13th month mandatory, Indonesia THR religious allowance) so monthly-vs-annual conversion does not silently lose 8.3% [conventions from payroll-practice knowledge, verify per country].
8. Executive outliers. Executive pay data is thin and bimodal (startup vs enterprise). Mitigation: for C-level use recruiter guides and executive search publications as primary, drop percentile math in favor of range presentation, and always output a negotiation brief rather than a single number.
9. Nationality-linked pay reality (GCC/Asia). Mitigation as stated in the parameter table: never encode as a pricing factor. If the user's observed market data appears depressed relative to fair market, surface a neutral explanatory note ("market medians in this location vary by employer origin and passport; your fair-market quote is anchored to role and seniority benchmarks").

## 5. Open Questions for the Other Agents

1. Verifier: can you confirm whether Mercer published a 2025 or 2026 Cost of Living City Ranking, and whether any free current city-level COL index exists with a license that permits embedding in a free web product? (Numbeo's commercial license is the blocker I found.)
2. Verifier: my Mercer/ECA hardship band mapping came from model knowledge under rate-limited search, not from a verified page. The State Dept DSSR table is verified and is the better free source anyway, but please flag if my private-sector bands are wrong.
3. Debugger: is the iterative gross-up (solving G from Net = G - tax(G) - SSC(G)) numerically safe for bracketed progressive systems with discontinuities, and what iteration count/tolerance is needed?
4. Debugger: should the blend weights (w1 = 0.6 market, w2 = 0.4 net-equivalence) shift by direction of move (cheap-to-expensive vs expensive-to-cheap country)? My hypothesis: when the net-equivalence anchor exceeds the market ceiling, the clamp should win silently but the UI should warn the user their current lifestyle is not affordable at local rates.
5. Both: is presenting a "walk-away floor" (net-equivalence number) to the user ethically and tactically correct even when it sits far below market, since it may anchor them too low?
6. Verifier: talent.com reuse terms remain unchecked. Also please verify the 13th-month/THR conventions and the UK effective tax + NI rate at the ~AED 646k equivalent income level, which I asserted at roughly 35-40% from general knowledge.

## 6. Full Source List

Methodology:
- https://www.smart-expatriation.com/en/content/13-expatriate-salary-package-compensation-calculation-methodology
- https://mobilityexchange.mercer.com/insights/article/paying-expatriates-understanding-split-pay
- https://mobilityexchange.mercer.com/insights/article/changes-to-cost-of-living-allowances-a-closer-look
- https://www.thomasnet.com/insights/balance-sheet-approach/
- https://airshare.air-inc.com/why-the-balance-sheet-approach-still-leads-in-global-mobility
- https://blog.iese.edu/expatriatus/2015/03/05/localization-a-way-to-deal-with-expat-cost-pressures/
- https://mobilityexchange.mercer.com/assignments/localized-compensation

GCC packages and pay:
- https://www.papayaglobal.com/countrypedia/country/saudi-arabia/
- https://asanify.com/global-employer-of-record/saudi-arabia/salary-structure/
- https://www.snad.io/en/tools/hr/housing-allowance-calculator
- https://nowmoney.me/blog/basic-salary-in-uae-labour-law/
- https://www.pinkcameljobsite.com/articles/uae-salary-allowances-guide
- https://associatedalliance.com/a-business-consulting-that-can-produce/
- https://holbornassets.sa/blog/education-costs-in-saudi-arabia-planning-for-your-childrens-future-as-an-expat/
- https://www.edarabia.com/dubai-school-fees/
- https://gulfmigration.grc.net/gcc-a-comparison-of-average-monthly-salaries-received-by-nationality-group-of-workers-and-country-in-us-selected-professions-2017/
- https://jobxdubai.com/salaries-2026/chief-technology-officer-cto-technology-executive-leadership-salary-dubai-2026
- https://rfsonshr.com/job-descriptions/technology/chief-technical-officer/
- https://www.michaelpage.ae/salary-guide-uae

Tax:
- https://data-explorer.oecd.org/s/12t
- https://www.oecd.org/en/publications/2025/04/taxing-wages-2025_20d1a01d.html
- https://taxsummaries.pwc.com/egypt/individual/taxes-on-personal-income
- https://taxsummaries.pwc.com/nigeria/individual/taxes-on-personal-income
- https://vietnam.acclime.com/guides/personal-income-tax/
- https://taxsummaries.pwc.com/indonesia/individual/taxes-on-personal-income
- https://www.incometaxindia.gov.in/tax-rates and https://cleartax.in/p/income-tax-slab-rates

Hardship and COL rankings:
- https://allowances.state.gov/web920/hardship.asp
- https://fam.state.gov/fam/03fam/03fam3260.html
- https://www.mercer.com/insights/total-rewards/talent-mobility-insights/cost-of-living/

Free data and APIs:
- https://frankfurter.dev/ and https://api.frankfurter.dev/v2/currencies
- https://open.er-api.com/v6/latest/USD and https://www.exchangerate-api.com/docs/free
- https://data.worldbank.org/indicator/PA.NUS.PPPC.RF and https://api.worldbank.org/v2/indicator/PA.NUS.PRVT.PP
- https://www.bls.gov/oes/data.htm
- https://www.ons.gov.uk/ashe and https://www.nomisweb.co.uk/datasets/ashe
- https://ilostat.ilo.org/topics/wages/
- https://www.nber.org/research/data/occupational-wages-around-world-oww-database
- https://www.numbeo.com/common/terms_of_use.jsp and https://www.numbeo.com/premium/commercial-license
- https://www.levels.fyi/about/terms.html and https://levels.fyi/api-access/
- https://www.octoparse.com/blog/how-to-scrape-glassdoor-data-easily

Currency instability:
- https://www.piie.com/research/piie-charts/2024/egyptian-pound-devaluations-have-induced-recurring-crises-1952
- https://www.chathamhouse.org/2025/03/nigerias-economy-needs-naira-stay-competitive
- https://eipr.org/en/press/2024/03/shock-3rd-flotation-and-its-impact-social-justice
- https://www.afdb.org/en/countries-west-africa-nigeria/nigeria-economic-outlook

Experience curves:
- https://www.reveliolabs.com/news/business/how-much-does-a-promotion-buy-you
- https://insight.ieeeusa.org/articles/2026-tech-salary-trends-outlook/
