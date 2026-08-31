# Verifier Report: Source Verification and Independent Model

Agent role: Verifier (one of three consensus agents: Analyzer, Debugger, Verifier)
Research date: 30 August 2026
Method: independent verification with primary-source citations, including live API calls. No reliance on the Analyzer's output.

---

Independent verification conducted 2026-08-30. Every claim below was checked against the cited primary source during this session, including live API calls.

## 1. Source Verification Table

| Source | URL | Free? | License | Embeddable in a free commercial web tool? | Quality |
|---|---|---|---|---|---|
| World Bank PPP conversion factors (PA.NUS.PPP, PA.NUS.PRVT.PP), GDP per capita | data.worldbank.org/indicator/PA.NUS.PPP | Yes | CC BY 4.0 (stated on indicator pages) | Yes, with attribution. I pulled live 2025 values from the public JSON API with no key (UAE 2.527, UK 0.702, US 1.0, India 19.839, Egypt 7.722, S.Africa 7.740, Saudi 1.871, Singapore 1.024, Germany 0.719 LCU per intl USD) | High |
| IMF World Economic Outlook | imf.org/en/publications/weo/weo-database | Yes | IMF Copyright and Usage: free reuse and redistribution with attribution, no endorsement implied (imf.org/en/about/copyright-and-terms) | Yes, with attribution | Medium-High |
| OECD wages / Taxing Wages | data-explorer.oecd.org | Yes | CC BY 4.0 for content published since 1 July 2024 ("Open by Default" policy, July 2024 press release) | Yes, with attribution. But OECD members only; no GCC, no Egypt, no most of the 20 target countries | High (members), Low coverage elsewhere |
| ILO Global Wage Report / ILOSTAT | ilostat.ilo.org/topics/wages/ | Yes | Free download with dataset; reuse with attribution | Yes, with attribution | Medium-High |
| Numbeo | numbeo.com/common/terms_of_use.jsp | Free for personal, academic, journalistic only | Terms state: "Automated data collection methods (such as scraping or crawling) are strictly prohibited" without written permission; commercial use requires a paid Data License; premium licensees may not "republish or disseminate Numbeo data through other APIs or public-facing data feeds" | NO. This is the single most important legal finding. A free ad-supported web product is commercial use. Scraping is prohibited, embedding or republishing via a public tool conflicts with the premium license terms | High confidence it is NOT embeddable |
| Mercer COL survey | mercer.com/insights/total-rewards/talent-mobility-insights/cost-of-living/ | Only top-10 rankings in press releases | Proprietary | No numbers, only ranks. Latest edition I could confirm indexed: 2024 (Hong Kong 1, Singapore 2, Zurich 3) | Low for data, High for methodology articles |
| ECA International | eca.global/data-reports/data-calculator/build-up-calculator | Only rankings/press releases | Proprietary | No. Build-up Calculator and COL data are subscription products | Low for data, High for methodology |
| UK ONS ASHE | ons.gov.uk/ashe | Yes | Crown copyright under Open Government Licence v3.0 (nationalarchives.gov.uk/doc/open-government-licence/version/3) | Yes with OGL attribution. Not public domain, but free commercial reuse | High (UK only) |
| US BLS OEWS | bls.gov/oes | Yes | Public domain. BLS: "You are free to use our public domain material without specific permission" (bls.gov/opub/copyright-information.htm; 17 U.S.C. 105) | Yes, citation requested as courtesy | High (US only) |
| Levels.fyi | levels.fyi/about/terms.html | Browsable; API is paid | TOS restrict salary-data use; official paid API exists (levels.fyi/api-access) | No. Not embeddable without a paid license | Low (not usable) |
| Glassdoor | glassdoor.com/about/terms | Browsable | TOS prohibit automated agents and scraping/mining; no public API | No | Low (not usable) |
| talent.com | talent.com/integrations | Partially | Official XML feeds / publisher API are the sanctioned path; scraping not the intended path | Unclear, likely no | Low |
| Payscale | payscale.com/about/terms-of-use | No | TOS restrict reuse and resale | No | Low (not usable) |
| Frankfurter | frankfurter.dev (API at api.frankfurter.dev) | Yes | Free, open source, no key, "no quotas", fair-use rate limiting; v2 covers 201 currencies from 84 central banks, daily updates | Yes. Note: canonical domain moved from frankfurter.app to frankfurter.dev; v1 was ECB-only (~30 currencies), v2 expanded | High |
| open.er-api.com | open.er-api.com/v6/latest/USD | Yes | Free tier of exchangerate-api.com | Yes. Verified live today: 166 currencies, updated daily (last update Sun, 30 Aug 2026 00:02 UTC), includes all 19 needed currencies (AED 3.6725, SAR 3.75, QAR 3.64, EGP 50.25, LBP 89,500, MAD 9.25, VND 26,051, IDR 17,749, PHP 62.39, THB 33.01, ZAR 16.11, KES 129.46, NGN 1,339, PAB 1.0, MXN 17.02, INR 95.65, GBP 0.7379, USD 1.0, SGD 1.2732) | High |
| Wikidata | wikidata.org/wiki/Wikidata:Licensing | Yes | CC0 public domain | Yes, no restrictions | High for country metadata |
| Wikipedia | en.wikipedia.org | Yes | CC BY-SA 4.0 | Facts are not copyrightable; text reuse would trigger share-alike. Use as tertiary reference, not a data feed | Medium |
| GulfTalent salaries | gulftalent.com/salaries | Free tool, registration-gated reports | Unverified terms; crowd/employer survey hybrid | Not confirmed embeddable; usable as cited manual reference for GCC benchmarks | Medium-Low |

## 2. Methodology Verification

Build-up / balance sheet approach. Confirmed. Three independent mobility-firm sources agree on the structure:

- AIRINC ("The Balance Sheet for Expatriates", air-inc.com): four components: (1) income tax via tax equalization with hypothetical tax; (2) goods and services via a COLA paid when host costs exceed home costs, calculated from a market basket comparison by an external provider, updated "two to four times a year"; (3) housing, with the old "housing norm" deduction increasingly discontinued; (4) savings, preserved so the employee "can save at the same rate as prior to the assignment", which AIRINC calls the definition of economic neutrality. The piece notes it is expensive and typically reserved for "critical skill or executive-level employees".
- Mercer ("Changes to Cost of Living Allowances", mobilityexchange.mercer.com): home-based balance sheet method; COLA is calculated by adjusting spendable income by the cost-of-living index; their sample: home spendable income USD 100,600 x 0.6829 = GBP 68,700. Mercer defines spendable income as the portion of base salary a typical family spends on goods and services.
- ECA (eca.global/data-reports/data-calculator/build-up-calculator): Build-up Calculator uses a "home-based approach, combining salary adjustments, allowances and cost-of-living data"; spendable income is the portion of net salary to which the COL index is applied.

Net-to-net equivalence. Confirmed as the equalization principle: the package aims to deliver the same net purchasing power (and savings capacity) as at home. It is a corporate-policy construct for sent employees, not a market-price law. For a job seeker negotiating local hires, net-to-net is a defensibility floor, not a predictor of what the market pays.

Tax gross-up from a 0% country. Confirmed mechanics. Gross = Net / (1 - t) in flat-rate form; in progressive systems you solve iteratively because deductions and tapers interact (e.g., UK personal allowance taper). AIRINC gives the canonical illustration: to deliver a net of 100,000 at a 50% rate the employer pays 200,000 gross (airshare.air-inc.com). From the UAE there is no meaningful hypothetical home tax, so the calculation is a full host-country gross-up: target host net, then solve for host gross through host income tax and social charges. Verified 2026 parameters:

- UK 2026-27 (gov.uk/income-tax-rates; House of Commons Library CBP-10618): PA 12,570 (tapered 1 for 2 over 100,000, zero at 125,140), 20% to 50,270, 40% to 125,140, 45% above, frozen to April 2028. Employee NI Class 1: 8% to UEL 50,270, 2% above; employer 15% above 5,000.
- US 2026 single (IRS): 10/12/22/24/32/35/37, with 37% above 640,600 (OBBBA-set threshold); standard deduction about 16,100 single (CRS figure, confirm against final Rev. Proc.). Plus FICA 6.2% + 1.45% (+0.9% over 200k).
- Germany 2026: Grundfreibetrag 12,348; 14 to 42%, 45% top; Soli 5.5% of tax liability (most mid incomes exempt); employee social shares roughly: pension 9.3%, unemployment 1.3%, health 7.3% + half of ~2.9% add-on, care ~1.7-2.3%; ceilings: pension 101,400/yr, health 69,750/yr (PwC tax summaries; boundlesshq.com).
- Singapore YA 2026 (IRAS; PwC): resident 0-24% progressive, 23% above S$500k, 24% above S$1M; non-residents 24% flat on employment income (15% effective if higher); no CPF for employment-pass expats.
- Saudi 2026: 0% personal income tax; expat GOSI is employer-only 2% occupational hazard; Saudi-national rates differ (PwC).
- UAE 2026: 0% personal income tax (u.ae; PwC); 9% corporate tax above AED 375k; 5% VAT.
- India AY 2026-27 new regime (incometax.gov.in): 0% to 4 lakh, 5% to 8, 10% to 12, 15% to 16, then 20/25%; 87A rebate makes up to 12 lakh effectively nil for residents (not available to non-residents, relevant for a UAE-based Indian national); 4% cess.
- Egypt (PwC): 0% to 40k EGP, 10/15/20/22.5%, top 27.5% above 400k; EGP 20k personal exemption; social insurance applies; exemption thresholds announced to rise 25% (Dec 2025).
- South Africa 2027 year (SARS): 18% to R245,100, 26/31/36/39/41%, top 45% above R1,331,500 (bracket reading approximate at the top edge).

## 3. Regional Package Conventions

- UAE: The "housing = 25% of basic" figure is real but its statutory basis is the repealed Federal Law No. 8 of 1980, which deemed housing allowance at 25% of basic when the contract was silent. The current law (Federal Decree-Law No. 33 of 2021, uaelegislation.gov.ae) obliges the employer to provide accommodation or an allowance but does not mandate a split. End-of-service gratuity is on basic only: 21 days per year for the first 5 years, 30 days after, capped at 2 years' wage. Market practice: basic 50-60% of gross, housing 20-30%, transport 5-10%.
- Saudi: Common splits cited: 50/25/25 basic/housing/transport (Papaya Global) or 70-75/20-25/5-10 (recruiter guides). Saudi Labor Law caps housing allowance at 2 months' basic wage (Marco Payroll).
- Qatar: Housing usually provided or allowanced; transport allowance 8-12% of base is common (Associated Alliance).
- GCC-wide: Housing allowance commonly 20-30% of total package value for expatriates (QuickHCM).
- Western markets: Single gross figure; balance-sheet equalization only for executive-level transfers.

## 4. Independent Model and Day-One Dataset Spec

### Parameter list with evidence quality

| Parameter | Definition | Source basis | Evidence quality |
|---|---|---|---|
| Home anchor: last net salary + home country/city | User input, treated as NET | User | High (given) |
| PPP conversion factor, private consumption | LCU per intl USD, latest year | WB PA.NUS.PRVT.PP, CC BY 4.0, live API | High |
| Market FX rate | Daily, 166 currencies | open.er-api.com (primary), frankfurter.dev v2 (fallback) | High |
| Host tax rules 2026 | Bands, rates, employee social shares, ceilings, tapers | Official sources cited in section 2 | High for UK/US/DE/SG/IN/EG/ZA/SA/AE; Medium elsewhere |
| Price level / COL ratio | Derived: PPP factor / market FX | Derived from WB data, High; city-level granularity: Medium-Low (no clean free source) | Medium |
| Role x level market benchmark | p25/p50/p75 gross, local currency | BLS OEWS (US), ASHE (UK), ILOSTAT (others), GulfTalent manual references (GCC) | High US/UK; Medium for most; Low for GCC and several African markets |
| Package split convention | basic/housing/transport %, gratuity rule | Legal texts + payroll guides in section 3 | Medium-High UAE/KSA/QA; Medium elsewhere |
| Seniority multiplier ladder | Years of experience to level mapping | Curatorial, calibrated to ASHE/OEWS distributions | Low-Medium |
| Hardship / mobility premium | Qualitative band | Public ECA/Mercer commentary | Low |
| Confidence score | Function of evidence quality + data dispersion + FX volatility | Derived | Derived |

### Formula-level approach

1. Anchor: Net_home (AED) annualized. Real purchasing power R = Net_home / PPP_home(private consumption).
2. COL transfer: Target_net_host = R x PPP_host. (Full-basket equalization. Optionally separate a housing differential; AIRINC notes housing norms are fading from practice, so a full-basket approach is defensible for v1.)
3. Market cross-check: pull role/level p50 and p75 in the host market; if Target_net_host implies gross far above p75, present both the equalization floor and the market reality, and lower confidence accordingly. This tension is the product's core insight.
4. Gross-up: solve iteratively Net(gross) = Target_net_host through the host's progressive bands, tapers, and social charges (handles UK PA taper, US FICA caps, Germany ceilings).
5. Package formatting: GCC targets render as basic + housing + transport per section 3 conventions; Western targets as a single gross figure; both rendered monthly and annually in chosen output currencies at daily FX.
6. Range: p25-p75 spread from benchmark data where available, otherwise +/-15% (explicit heuristic label). Confidence: high only when all three of role benchmark, PPP factor, and tax rules are High quality; downgrade stepwise otherwise.

Worked validation using live 2025 WB values (user: AED 53,871/mo net = AED 646,452/yr):
- R = 646,452 / 2.527 = 255,800 intl USD/yr.
- UK: target net = 255,800 x 0.702 = 179,600 GBP. Gross-up through 2026-27 bands and NI gives approximately GBP 307,000 gross (effective deductions ~41.7%).
- US: target net ~USD 255,800. Gross-up single filer 2026 gives approximately USD 365,000 gross.
- India: target net = 255,800 x 19.839 = INR 5.07M; gross under new regime roughly INR 6.8-7.0M.
- Egypt: target net = 255,800 x 7.722 = EGP 1.98M; gross roughly EGP 2.6-2.7M.
- Saudi/UAE moves: no gross-up; equalization reduces to COL ratio and market benchmark only.

### Day-one embedded dataset contents

- countries: 25 rows (the 20 target countries plus Germany, plus Canada, Australia, Netherlands as common comparator markets). Fields: ISO3, name, currency, region, tax regime id, package convention id.
- ppp: 25 rows x latest 2 years. Fields: year, ppp_private (PA.NUS.PRVT.PP), ppp_gdp, gdp_per_capita_ppp, gdp_per_capita_mer. Source: World Bank API, CC BY 4.0. Update: annual, on WDI release.
- tax_rules: per-country 2026 snapshot: band list, rates, employee social %, ceilings, tapers, tax year dates, notes (e.g., "UAE: 0%", "US: state taxes excluded, flag"). Update: annual manual review, changelog dated.
- benchmarks: role family (8 families: IT executive, software engineering, data, product, security, delivery/PM, sales engineering, general management) x level (senior/lead/exec) x country: p25/p50/p75 monthly gross local currency, source id, quality rating. US from OEWS (public domain), UK from ASHE (OGL), others ILOSTAT-anchored with Low/Medium flags; GCC values entered manually from GulfTalent citations with Low rating. Update: semiannual.
- package_conventions: country, basic%, housing%, transport%, gratuity rule, legal citation. Update: annual.
- fx_cache: daily pull from open.er-api.com, frankfurter fallback, one row per day per currency with retrieved_at; graceful degradation to last cached rate.
- premiums: qualitative hardship tiers, max 3 buckets, explicit Low-evidence label.
- meta: per-table provenance (source URL, license, retrieval date, quality rating) so the UI can show attributions: World Bank CC BY 4.0, IMF, OECD CC BY 4.0, ONS OGL v3.0, BLS public domain, frankfurter/exchangerate-api.

## 5. Where I Suspect the Analyzer Will Be Wrong or Overstated

1. Numbeo as the COL source. If the Analyzer recommends Numbeo, it is legally wrong for this product: scraping is "strictly prohibited" without written permission, commercial use requires a paid license, and even paying premium clients cannot republish through public-facing tools. The compliant substitute at country level is World Bank ICP price level indices (PA.NUS.GDP.PLI family, CC BY 4.0), which I verified exist. City-level free COL data with clean licensing is the genuine gap.
2. Mercer/ECA "data". Only rankings are public. Any Analyzer model that embeds Mercer or ECA numbers is asserting data that is not lawfully accessible for free.
3. Scraped Glassdoor/Levels.fyi/Payscale benchmarks. All prohibit it; Levels.fyi now sells an API specifically to be the sanctioned channel. If the Analyzer's role benchmarks depend on these, they must be replaced with BLS/ASHE/ILOSTAT plus clearly-labeled manual references.
4. frankfurter.app as primary. The domain moved to frankfurter.dev and v1 covered only ~30 ECB currencies; any claim that frankfurter covers all needed currencies is only true of v2. open.er-api.com is the safer primary (verified live, all 19 currencies).
5. UAE 25% housing as current law. The 25% deemed-housing figure comes from the repealed 1980 law. It survives as a convention, not a mandate. A model stating "UAE law requires 25% housing" is overstated.
6. GDP per capita as a salary anchor. If the Analyzer anchors executive pay to GDP per capita multiples, expect extreme noise: it is a macro average, not an occupational wage. I anchor on the user's own net salary (exact) and use role benchmarks as the market check, with GDP per capita only as a sanity band.
7. Net-to-net as "the answer". It is an equalization floor for corporate transfers. For local-hire negotiation it can price the user above market (my UK worked example: ~GBP 307k equalized gross vs London market p50 well below that). A product that only outputs the equalized number will systematically overquote Western markets. Both numbers must be shown.
8. Single-point confidence. With GCC role benchmarks at Low evidence quality, any per-country confidence score above Medium for GCC targets would be overstated.

## 6. Full Source List

Data and licensing:
- https://data.worldbank.org/indicator/PA.NUS.PPP (CC BY 4.0)
- https://data.worldbank.org/indicator/PA.NUS.PRVT.PP (CC BY 4.0)
- https://api.worldbank.org/v2/country/ARE;GBR;USA;IND;EGY;ZAF;SGP;SAU;DEU/indicator/PA.NUS.PRVT.PP (live pull, 2025 values)
- https://www.imf.org/en/about/copyright-and-terms and https://www.imf.org/en/publications/weo/weo-database/disclaimer
- https://www.oecd.org/en/about/terms-conditions.html and https://www.oecd.org/en/about/news/press-releases/2024/07/oecd-data-publications-and-analysis-become-freely-accessible.html
- https://ilostat.ilo.org/topics/wages/ and https://www.ilo.org/publications/flagship-reports/global-wage-report-2024-25-wage-inequality-decreasing-globally
- https://www.numbeo.com/common/terms_of_use.jsp and https://www.numbeo.com/premium/commercial-license
- https://www.ons.gov.uk/ashe and https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/
- https://www.bls.gov/oes/ and https://www.bls.gov/opub/copyright-information.htm
- https://www.levels.fyi/about/terms.html and https://levels.fyi/api-access/
- https://www.glassdoor.com/about/terms/
- https://www.payscale.com/about/terms-of-use
- https://www.talent.com/integrations
- https://frankfurter.dev/ and https://frankfurter.dev/v1/
- https://open.er-api.com/v6/latest/USD (live pull 2026-08-30)
- https://www.wikidata.org/wiki/Wikidata:Licensing
- https://www.gulftalent.com/salaries

Methodology:
- https://www.air-inc.com/education-knowledge-base/the-balance-sheet-for-expatriates/
- https://airshare.air-inc.com/what-is-tax-equalization-hypo-tax
- https://mobilityexchange.mercer.com/insights/article/changes-to-cost-of-living-allowances-a-closer-look
- https://mobilityexchange.mercer.com/insights/article/managing-international-assignments-compensation-approaches
- https://eca.global/data-reports/data-calculator/build-up-calculator
- https://eca.global/data-reports/data-calculator/cost-of-living
- https://www.mercer.com/insights/total-rewards/talent-mobility-insights/cost-of-living/

Tax rates 2026:
- https://www.gov.uk/income-tax-rates and https://commonslibrary.parliament.uk/research-briefings/cbp-10618/
- https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill and https://taxfoundation.org/data/all/federal/2026-tax-brackets/
- https://taxsummaries.pwc.com/germany/individual/other-taxes and https://boundlesshq.com/blog/payroll-tax-germany-2026/
- https://taxsummaries.pwc.com/singapore/individual/taxes-on-personal-income and https://www.iras.gov.sg
- http://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1
- https://taxsummaries.pwc.com/egypt/individual/taxes-on-personal-income
- https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/
- https://taxsummaries.pwc.com/saudi-arabia/individual/other-taxes
- https://u.ae/en/information-and-services/finance-and-investment/taxation and https://taxsummaries.pwc.com/united-arab-emirates/individual/taxes-on-personal-income

Regional conventions:
- https://uaelegislation.gov.ae/en/legislations/1541
- https://www.papayaglobal.com/countrypedia/country/saudi-arabia/
- https://marcopayroll.com/countries/saudi-arabia/
- https://quickhcm.com/multi-component-salary-structures-gcc/
- https://associatedalliance.com/a-business-consulting-that-can-produce/
