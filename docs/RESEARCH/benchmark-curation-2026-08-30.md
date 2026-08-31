# Benchmark Curation Record, 30 August 2026

Three research agents curated role benchmark rows for tier 1 countries under the project rule that every number must trace to a free, citable source a human can click. The raw rows live in `src/data/benchmark-seeds.json`; the generated matrix is `src/data/benchmarks.json`. This record documents method, coverage, conflicts, and the honest gaps.

## Coverage summary

| Pass | Countries | Rows | Sources | Quality |
|---|---|---|---|---|
| US and UK official statistics | USA, GBR | 39 | BLS OEWS public API (May 2025 national), ONS ASHE 2025 provisional Table 14.7a full-time gross | High |
| GCC public pages | ARE, SAU, QAT | 37 entered (38 found, 1 conflict) | GulfTalent public salary pages, updated Aug 2026, all n stated | Medium or Low |
| India, Singapore, Germany | IND, SGP, DEU | 32 | Instahyre public reports, Morgan McKinley Singapore 2026 public tables, Stepstone Gehalt pages | Medium |
| Original seed (from analysis phase) | ARE | 1 | JobxDubai, RFS HR, live LinkedIn posting (analyzer report) | Medium |

Total: 109 of 480 tier 1 cells. The other 371 are explicit insufficient-data markers.

## Method notes and caveats

- US: values pulled from the BLS public API OEWS time series because BLS retired the static occupation profile pages. Cross-checked against the May 2025 profile (median 135,980 for software developers matched exactly). Senior maps to the occupation's P25-P50 band, lead to P50-P75 (row p75 is the occupation P90), executive to the corresponding management occupation's own P25/P50/P75.
- UK: ONS ASHE 2025 provisional, full-time, annual gross. Verified SOC 2020 code corrections: IT directors is 1137, HR managers and directors is 1136, marketing/sales/advertising directors is 1132. Three UK lead cells were omitted because the P90 is flagged unreliable (coefficient of variation above 20 percent) in the source table. UK data-and-ai uses Data analysts (3544) because SOC 2020 has no data science code; this yields lower figures than the US Data Scientists mapping and is not a like-for-like comparison.
- GCC: Michael Page, Cooper Fitch, Hays, and Robert Walters guides are all form-gated with no public figures; Bayt publishes single averages only. GulfTalent was the only approved source publishing low/average/high bands on ungated pages. Bands map published lowest/average/highest to P25/P50/P75; samples under 20 are marked Low quality. Sales rows are base salary only, commission excluded, and say so in the note. Crowd-reported Gulf figures skew below enterprise recruiter bands; the notes state this where relevant.
- India: Instahyre internal offer data (8,000+ roles). Figures are annual CTC per local convention, noted per row. Tech families only; other families found no citable free bands (Michael Page India is login-gated, TeamLease form-gated, Careernet download-gated).
- Singapore: Morgan McKinley 2026 Technology tables are fully public with bands. Non-tech sectors publish only medians, so finance, HR, and operations cells were omitted rather than fabricated.
- Germany: Stepstone Gehalt title pages publish Min/Median/Max; 13 cells covered, 8 omitted where title pages do not exist (404s).

## Conflict resolution

One cell had two competing sources: ARE it-executive executive. The enterprise recruiter-band row (Medium, from JobxDubai 60-140k, RFS HR 600k-1.44M per year, LinkedIn posting 55-75k) was kept over the GulfTalent CTO page (n=15, Low, AED 18k/36k/78k). The alternative figures are recorded in the kept row's note. Rule: higher quality wins, the loser is documented.

## Honest gaps (zero coverage)

- Egypt: 0 rows. Wuzzuf's salary tool is dead (404), Michael Page Egypt does not exist as a site, AUC and HRDC surveys are not public, ZenHR tables are JS-rendered and not extractable. With EGP inflation, stale numbers would mislead; the country ships with PPP floor calculations only.
- Indonesia: 0 rows. Michael Page Indonesia requires signup; Glints public data is entry-level only. Same policy: no verifiable band, no row.

## Sources

US:
- https://www.bls.gov/oes/tables.htm
- https://www.bls.gov/oes/2025/may/oes_stru.htm
- https://download.bls.gov/pub/time.series/oe/oe.txt
- https://api.bls.gov/publicAPI/v2/timeseries/data/ (per-series URLs in each row)

UK:
- https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/occupation4digitsoc2010ashetable14/2025provisional

GCC (all verified live, pages state updated Aug 2026):
- https://www.gulftalent.com/uae/salaries/ (senior-software-engineer, lead-software-engineer, head-of-engineering, data-scientist, senior-data-engineer, information-technology-manager, technology-director, chief-technology-officer, senior-accountant, finance-manager, finance-director, human-resources-manager, senior-human-resources-manager, hr-director, sales-manager, senior-sales-manager, sales-director, operations-manager, supply-chain-manager, chief-operating-officer)
- https://www.gulftalent.com/saudi-arabia/salaries/ (senior-software-engineer, data-analyst, information-technology-manager, senior-accountant, finance-manager, chief-financial-officer, human-resources-manager, hr-director, sales-manager, operations-manager, supply-chain-manager, chief-operating-officer)
- https://www.gulftalent.com/qatar/salaries/ (senior-accountant, finance-manager, human-resources-manager, sales-manager, operations-manager, procurement-manager)

Checked and rejected (gated or unusable): michaelpage.ae salary guide (login), cooperfitch.ae (form gate), hays.ae (form gate, dead 2025 PDF links), robertwalters.ae Saudi survey (form gate), bayt.com UAE and Qatar salary pages (averages only).

India:
- https://resources.instahyre.com/blog/software-engineer-salary-in-india/
- https://resources.instahyre.com/blog/engineering-manager-salary-in-india/
- https://resources.instahyre.com/blog/data-scientist-salary-in-india/

Singapore:
- https://www.morganmckinley.com/sg/salary-guide/technology/permanent-salaries

Germany:
- https://www.stepstone.de/gehalt/ (Software-Entwickler-in, Head-of-Engineering, Data-Scientist, IT-Leiter-in, Senior-Controller, Leiter-in-Controlling, CFO, Head-of-HR, HR-Director, Key-Account-Manager, Vertriebsleiter-in, Head-of-Sales, Supply-Chain-Manager)

Original ARE seed:
- https://jobxdubai.com/salaries-2026/chief-technology-officer-cto-technology-executive-leadership-salary-dubai-2026
- https://rfsonhr.com/job-descriptions/technology/chief-technical-officer/
