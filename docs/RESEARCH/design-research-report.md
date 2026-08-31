# Design Research Report: Design System, Fintech Direction, Multilingual RTL, Accessibility, Wizard UX, SEO/GEO

Agent role: Design Research (separate workstream from the three consensus agents)
Research date: August 2026
Method: all claims sourced; master source list at the end.

---

## 1. Design System References

### What each leading system does

Material 3 and the Expressive update (2025-2026). M3 Expressive, unveiled at Google I/O 2025, is the largest update since Material 3: 35 new shape options plus shape morphing, spring-physics motion tokens built into the theme, flexible variable-font typography (Roboto Flex) with "emphasized text" weight contrast, and updated component color mappings. Its color system is built on HCT (hue, chroma, tone), Google's perceptually accurate color space: a seed color generates five tonal palettes (primary, secondary, tertiary, neutral, neutral-variant), each spanning tones 0 to 100, which are then mapped to semantic roles (primary, on-primary, primary-container, surface, on-surface, outline, error, and so on). Dark mode is a tone remap of the same roles, not a separate palette. Sources: m3.color docs, M3 Expressive blog, science-of-color blog.

Fluent 2 (Microsoft). Tokens flow in three tiers: global, alias, then component. Elevation is not hand-picked shadows but a shadow ramp generated from equations with increasing blur per level. Typography is a defined type ramp with platform-native stacks; layout uses a global spacing ramp; density is an explicit dial. Source: fluent2.microsoft.design pages on elevation, design tokens, typography, layout.

IBM Carbon. Everything sits on the 2x grid (base unit 8px, all sizes and spacing in multiples). Type is tokenized in two sets: "productive" (data-dense workhorse UI) and "expressive" (marketing and large numerals), which is directly relevant to a calculator: productive styles for forms and tables, expressive for the hero result number. Source: carbondesignsystem.com spacing, typography overview, type sets, 2x grid pages.

Shopify Polaris. CSS custom properties prefixed `--p-`, shadows consolidated into "depth" tokens enforced by Stylelint rules, a 90 percent token-coverage goal across color, motion, and type. The lesson: tokens are only real if linting forbids raw values. Source: @shopify/polaris-tokens npm package and Polaris Stylelint docs.

Radix Colors. The reference architecture for palette construction: every hue is a 12-step scale where each step has a fixed purpose. Step 1 is app background, step 2 is subtle backgrounds, steps 3-5 are component backgrounds and borders, steps 6-8 approximate solid backgrounds (white text on 9 works), step 9-10 solid backgrounds, steps 11-12 are high-contrast text and borders. Dark mode is a semantic remap of the same 12 steps, so switching themes is one class on a container. Text-on-color combinations are guaranteed to hit target contrast, and the palette was tuned against APCA, not just WCAG ratios. Source: radix-ui.com/colors and the Radix/Tailwind architecture write-up.

shadcn/ui. The de facto web token convention in 2026. Themes are OKLCH by default (for example `--destructive: oklch(0.577 0.245 27.325)`). Naming is semantic surface/foreground pairs: `--background`/`--foreground`, `--card`/`--card-foreground`, `--popover`, `--primary`/`--primary-foreground`, `--secondary`, `--muted`, `--accent`, plus unpaired `--destructive`, `--border`, `--input`, `--ring`. A single `--radius` (default 0.625rem) derives the whole radius scale (sm = 0.6x, md = 0.8x, lg = 1x, up to 4xl = 2.6x). Chart colors get five dedicated slots, `--chart-1` to `--chart-5`, and dark mode uses different chart hues, not just darker ones. Dark mode is a `.dark` selector overriding the same token names. Source: ui.shadcn.com/docs/theming.

Tailwind v4. CSS-first theming via `@theme` directive inside CSS instead of a config file. Namespaces drive utilities: `--color-*` generates color utilities, `--font-*` fonts, `--spacing-*` spacing. The entire default palette is authored in OKLCH for perceptually uniform shade ramps, which also makes dark mode remaps cleaner (adjust lightness, keep hue and chroma). Source: tailwindcss.com/docs/theme.

### Concrete recommendations for the ExpatRate token architecture

Adopt: OKLCH as the authoring color space, Radix's 12-step purpose-driven palette construction, shadcn's semantic surface/foreground naming and single `--radius`, Carbon's productive/expressive type split, Fluent's ramp idea reduced to three elevation levels, M3's tone-remap dark mode strategy.

Color token architecture. Three layers:
- Primitive layer: 12-step OKLCH scales per hue (brand teal, accent amber, neutral, success green, warning amber, danger red, info blue), named `{hue}-{1..12}`.
- Semantic layer (the only layer components may reference): background/foreground, card/card-foreground, primary/primary-foreground, secondary, muted/muted-foreground, accent/accent-foreground, border, input, ring, destructive, plus chart-1 through chart-5.
- Component layer (later, only if needed): e.g., `--range-low`, `--range-mid`, `--range-high`.

Color direction candidates.

A. "Sovereign Teal" (recommended). Teal reads as money, banking heritage, and calm authority, and it differentiates from the indigo-to-purple cliche every 2026 fintech uses (The Masterly documents that convergence). Light mode: primary #0D9488 (teal-600), hover #0F766E (teal-700), primary-foreground near-white #ECFDF5 tint; range highlight accent amber #F59E0B; neutrals from a slate scale; destructive #DC2626. Dark mode: primary becomes a light tint #5EEAD4 (teal-300) for text and accents on near-black surfaces (#0B1220 range), borders white at 10 percent opacity, chart hues shifted per shadcn's dark-chart practice.

B. "Midnight Indigo". Primary #4F46E5 (indigo-600), one restrained indigo-to-violet gradient on a single hero surface only, zinc neutrals. On-trend for 2026 fintech but risks looking like every competitor; use only if brand identity testing favors it.

C. "Emerald Ledger". Primary #059669 (emerald-600) with warm stone neutrals. Strong money association but collides semantically with success states; would require moving success to blue, which confuses users.

In all cases: no pure black or pure white surfaces (use oklch lightness 0.98 and 0.15 range endpoints), and one gradient maximum, used once.

Type scale. Fluid sizes with clamp, following Carbon's productive/expressive split:
- Display numeral (hero quote): clamp(2.5rem, 6vw, 4.5rem), line height 1.05, weight 650, always tabular-nums.
- Display heading (results H1): clamp(1.75rem, 3.5vw, 2.5rem), line height 1.15.
- H2: 1.5rem, H3: 1.25rem, both line height 1.25.
- Body large (result explanations): 1.125rem, line height 1.55.
- Body (forms): 1rem, line height 1.5. Body small: 0.875rem. Caption/legal: 0.75rem.
- Minimum 16px for all form inputs to avoid iOS zoom.

Spacing scale. 4px base unit (finer control than Carbon's 8px while staying even): 4, 8, 12, 16, 24, 32, 48, 64, 96. Use 8px jumps for section rhythm, 4px only inside components.

Radius scale. `--radius: 0.625rem` (10px) base, derived shadcn-style: sm 6px (inputs, tags), md 8px (buttons), lg 10px (cards), xl 16px (hero card, modals), full 9999px (chips, toggle pills). Rationale: M3 Expressive pushes bigger, morphing shapes for expressive consumer apps, but money UIs read more trustworthy with moderate, consistent radius; 10px base is the current web-fintech norm.

Elevation. Three levels only, border-first: level 0 flat surfaces separated by 1px borders; level 1 cards: border plus a single soft shadow (roughly 0 1px 2px rgb(0 0 0 / 0.05), 0 4px 12px rgb(0 0 0 / 0.06)); level 2 popovers and the sticky results bar: slightly larger blur. In dark mode, prefer lighter surfaces plus borders over heavier shadows, per shadcn's dark border strategy.

Motion tokens. Durations: instant 100ms (hover, focus), fast 200ms (accordion, step transition), moderate 300ms (results reveal, range bar fill), slow 500ms (hero number count-up). Easing: ease-out for entrances, ease-in for exits; reserve springy physics-inspired motion (the M3 Expressive direction) for one or two playful moments like the range bar settling. All motion behind prefers-reduced-motion, with the hero count-up replaced by an instant value.

## 2. Current Design Direction for Fintech and Calculator Tools

### What reads as trustworthy for money UI in 2026

The Masterly's 2026 fintech analysis identifies the converged signature: monospaced or tabular type near numbers, bento-grid layouts on product pages, minimal color with exactly one gradient accent (usually indigo-purple). Outcrowd's 2026 trends piece frames the underlying goal as managing risk, transparency, and control through the interface. Broader 2026 UI surveys (Figma resource library, LinkedIn trend roundups) confirm bento grids and massive typography as the defining compositional trends. Practical synthesis for a salary tool: restrained neutral base, one accent, oversized tabular numerals as the visual centerpiece, generous whitespace, and near-zero glassmorphism on the functional app (glass reads decorative, not fiduciary; if used at all, only on marketing surfaces).

### What the best salary and cost-of-living tools do

Glassdoor "Know Your Worth" (the strongest pattern reference): a personalized point-in-time market value estimate, a shaded "Most Likely Range" covering the 25th to 75th percentile, a 12-month trend chart of the user's market value plotted against median base pay, weekly recalculation, results private by default, and ML inputs of employer, location, title, years of experience, and current salary. Sources: Glassdoor launch blog, Yahoo Finance coverage, Glassdoor UK blog, AIApply explanation of percentile ranges, Recruiter.com.

Levels.fyi: wins on granularity, 1M+ data points searchable by company, title, level, and location, and total-compensation breakdowns into base, equity, and bonus. Known criticisms that ExpatRate should answer head-on: self-reported unverifiable data, Big Tech skew, stale figures. Sources: igotanoffer review, LaborIQ and Ravio commentary on comp-data trust.

Numbeo: wins on free access, city-level granularity, and sheer breadth (world's largest cost-of-living database by its own description). Criticism concentrates on data reliability: crowdsourced and unverifiable, expat/traveler bias, documented manipulation vulnerability (2017 bot incident), and rents reported hundreds off reality; the ad-supported layout is dense. Sources: Wikipedia entry, Hacker News threads, r/expats and r/digitalnomad threads, Trustpilot.

talent.com salary calculator: simple lookup UX, but criticized as misleading because job-posting-derived ranges skew low, plus spam complaints. Sources: Reddit recruitinghell thread, Trustpilot.

ECA and Mercer public pages function as enterprise lead-gen: headline indices in public, full data behind sales contact. Not a UX model to copy, but a content model: they prove people will trade contact details for data depth, which a free tool can simply give away.

### The opening this implies

Every incumbent is weak in the same three places: data caveats are buried or absent, results hide behind logins (Glassdoor KYW requires an account mid-flow), and ranges appear without negotiation context. A free, no-login, methodology-transparent tool with an explicit confidence signal and a "what to actually quote" answer differentiates on trust, not just visuals.

### Recommendations

- Hero result: oversized tabular numeral (the single largest element on the page), monthly and annual as a segmented toggle, currency switcher inline. Tabular figures via font-variant-numeric so digits never shift as values animate.
- Range presentation: a percentile range bar with p25, median, and p75 markers, with the recommended quote marked distinctly; label the band in plain language ("most employers for this profile in Dubai quote within this band"), echoing Glassdoor's "Most Likely Range" convention.
- Layout: bento grid on the results dashboard (quote card largest tile, range, confidence, breakdown, comparison, methodology as smaller tiles); single-column wizard.
- Trust affordances: methodology accordion with sources and sample sizes, "last updated" dates, confidence badge with a one-sentence explanation of what drives uncertainty.
- Avoid: glass effects in the app, decorative gradients on functional elements, autoplay count-ups without reduced-motion fallback, ad density anywhere near the result (Numbeo's lesson), and any login wall before the result.

## 3. Multilingual and RTL Typography

### Free font strategy covering Latin, Arabic, Devanagari (minimum), plus Indonesian and other majors

Indonesian uses Latin, so the hard requirement is Latin + Arabic + Devanagari, with headroom for Cyrillic, Greek, and eventually more.

- Noto Sans superfamily is the only unified free solution spanning all three scripts and beyond (1,000+ languages, 150+ writing systems). Noto Sans Arabic UI is specifically tuned for interface text with tighter vertical metrics than regular Noto Sans Arabic (1,563 glyphs, 12 OpenType features); Noto Sans Devanagari covers 954 glyphs with 17 OpenType features in multiple weights and widths, including variable. Sources: fonts.google.com/noto, Noto specimen pages.
- IBM Plex Sans Arabic: neutral, friendly grotesque, 7 weights, excellent legibility in web and mobile UI, open source. But Plex Arabic has no Devanagari companion, so you would pair it with Noto Sans Devanagari and accept a stylistic seam between scripts. Source: Google Fonts specimen, ibm.com/plex.
- Noto Naskh Arabic: some Arabic readers prefer Naskh for long-form reading over the naskh-influenced sans (Fedora community debate documents this), but for UI a sans is the right default. Source: Fedora discussion.
- Rosetta is a commercial foundry, not free; exclude on budget grounds. Jali Arabic Variable (Adobe) is free only within the Adobe Fonts ecosystem, not cleanly self-hostable; exclude.

Recommendation. Noto Sans everywhere: one family, one set of vertical metrics, one aesthetic across scripts, which eliminates the Devanagari mismatch problem entirely. Load per-script subsets with unicode-range so an Indonesian user never downloads Arabic or Devanagari bytes. If brand differentiation from Noto's neutrality is wanted later, upgrade the Latin layer to Inter or IBM Plex Sans while keeping Noto for Arabic and Devanagari (Latin-script users never see the mix; Hindi and Arabic users get a harmonized Noto system).

### Pairing and loading strategy

- Single font-family stack per script declared as one family with multiple unicode-range @font-face rules: browser downloads only the ranges actually rendered. Sources: web.dev font best practices, MDN unicode-range.
- WOFF2 only, variable fonts to collapse weights into one file per script, font-display: swap to avoid invisible text, preload only the Latin subset (the default-locale critical path). Sources: web.dev, OpenReplay, CSS-Tricks subsetting guides.
- Arabic needs a slightly larger nominal size than Latin at the same token (community-documented sizing gap, Ubuntu discourse), so add a per-script optical-size adjustment factor in the type tokens rather than per-page hacks.
- Numbers and money: always font-variant-numeric: tabular-nums on values, ranges, and tables; right-align (logical: end-align) numeric columns so digits align vertically. Sources: MDN font-variant-numeric, A List Apart tables, dev.to tabular numbers explainer.

### Locale-aware number and currency formatting (Intl.NumberFormat)

- Always pass an explicit locale plus ISO 4217 currency code; never hardcode separators or symbols (W3C i18n guidance). Indian locales group digits as lakh/crore automatically (en-IN / hi-IN), Arabic locales use Eastern Arabic digits with ar locales, and separators differ everywhere.
- currencyDisplay: "symbol" gives localized symbols; "narrowSymbol" gives compact forms like $ instead of US$, but narrow symbols are ambiguous across dollar currencies (TC39 issue 858), so in a multi-currency product use "symbol" (or "code" in dense tables) and reserve "narrowSymbol" for single-currency contexts where the currency is already established on screen.
- currencySign: "accounting" renders negatives in parentheses, appropriate if you ever show tax or deduction negatives.
- Sources: MDN Intl.NumberFormat constructor and reference, W3C qa-number-format, TC39 proposals/issues.

### RTL best practices

- Build exclusively on CSS logical properties (margin-inline-start, padding-inline-end, inset-inline, border-start-start-radius) instead of left/right; this is the W3C-endorsed and Mozilla-recommended approach and halves the RTL bug surface. Sources: Mozilla RTL guidelines, MDN/CSS-Tricks logical properties, Ahmad Shadeed's deep dive, Smashing Magazine deployment guide.
- Set dir="rtl" and lang="ar" on the document root; use the :dir() or [dir="rtl"] selectors for the few physical exceptions.
- Icon mirroring rules: mirror icons with directional meaning relative to reading flow (back arrows, progress chevrons, next/previous affordances) using transform: scaleX(-1); never mirror logos, media playback controls, clocks, charts of physical quantities, or decorative icons. Sources: Simple Localize RTL guide, Tiger Oakes RTL tricks, Wagtail implementation discussion.
- Charts and sliders: progress and time-based axes conventionally flow right-to-left in Arabic locales, while numeric magnitude axes and currency figures stay LTR; wrap standalone numerals in isolated bidi contexts so mixed Arabic text plus Latin digits plus currency codes render correctly. Sliders mirror so "more" moves in the reading direction.
- Test Arabic with real content early; many breakages (truncated words, broken justification, overlapping diacritics) only appear with real strings, not lorem-Ipsum Arabic.

## 4. Accessibility: WCAG 2.2 AA Checklist for This Product

WCAG 2.2 (W3C Recommendation since October 2023) added, at level AA: 2.4.11 Focus Not Obsscured (Minimum), 2.5.7 Dragging Movements, 2.5.8 Target Size (Minimum), 3.3.8 Accessible Authentication; at A: 3.3.7 Redundant Entry; AAA additions include 2.4.12 Focus Not Obscured (Enhanced), 2.4.13 Focus Appearance (2px indicator), 3.3.9 Accessible Authentication (Enhanced). Sources: W3C WCAG22 spec, Understanding docs for 2.5.8 and 2.4.11, Tetralogical and Vision Australia overviews.

### Checklist: multi-step wizard

- Every interactive target at least 24x24 CSS px (SC 2.5.8), with 24px spacing exception never relied upon; primary actions sized 44px+ on touch.
- Focus always visible and never fully hidden by sticky headers, cookie bars, or the sticky results bar (SC 2.4.11); add scroll-margin and offsets so focused fields clear fixed UI.
- Focus indicator at least 2px thick with strong contrast (adopt the AAA 2.4.13 standard even though it is not required).
- Step changes: move focus to the new step's heading, announce the step change and step count via a polite live region, and keep a visible text label of progress ("Step 3 of 6") in addition to any bar (USWDS step-indicator pattern).
- Back navigation never loses data; forward is disabled until the step is valid, or validation errors are summarized at top with links to each field.
- Never re-ask for information already collected (SC 3.3.7 Redundant Entry); the results page must reuse wizard inputs, not request them again.
- Sliders and any drag interactions (range scrubbing, reordering) must have non-drag equivalents: number inputs, buttons, keyboard-operable sliders (SC 2.5.7).
- No cognitive-function tests anywhere (SC 3.3.8): no memorization, puzzles, or transcription required; if accounts are ever added, allow paste and passkeys.
- Keyboard operable end to end: no traps, logical tab order, Enter advances, Escape closes dialogs, focus returns to the trigger.
- Error identification (SC 3.3.1/3.3.3): errors described in text adjacent to the field, linked via aria-describedby; an error summary at the top of the step that receives focus on failed submit; errors not conveyed by color alone; error messages state how to fix, not just that it failed.
- Labels and purpose: persistent visible labels on every field, plus autocomplete tokens where purpose is standard; icon-only buttons get accessible names. SC 1.3.5 Identify Input Purpose supports autofill and IMEs, useful for nationality and salary fields.

### Checklist: calculators and results

- Currency inputs: type="text" with inputmode="decimal" (never type="number"), the currency stated in the visible label, formatting applied on blur rather than per keystroke. Sources: UX Patterns currency input, Etch money input, O'Reilly 101 UX Principles.
- Contrast: 4.5:1 for all text including placeholder-styled hints, 3:1 for large text, graphical objects, range bar tracks, and chart lines (SC 1.4.3, 1.4.11). Note WCAG contrast math is unreliable on non-white surfaces; validate palettes with both WCAG and APCA thinking (Radix's approach).
- The hero numeral, range band, and percentile markers must be readable without color alone: add text labels and pattern or marker differentiation.
- Results dashboard: reading order in DOM matches visual logic; the hero result inside an H1; all values available as text (no meaning conveyed only inside a chart); each chart has a data-table fallback or full text equivalent.
- Data tables: real table elements with scope'd headers and captions; tabular-nums; end-aligned numeric columns.
- Reduced motion honored for count-ups, range fills, and step transitions.
- Document lang and dir set per locale; language switcher is a real link, keyboard accessible, and preserves the current page context.
- Zoom to 200 percent and 400 percent reflow without loss (SC 1.4.4, 1.4.10).

## 5. UX Patterns for the Wizard and Results

### Wizard patterns (evidence base)

Reform's navigation best practices, WeWeb's 2026 multi-step form guide, the Eleken wizard-pattern overview, USWDS step indicator guidance, and long-running UX StackExchange discussions converge on: visible progress indicators on every step, save-progress capability to cut abandonment, back navigation that retains data, and consistent layout and button placement across steps.

Recommended structure.
- Six or fewer steps matching the input model: role, experience and resume, nationality and residencies, last salary (with currency), target country (and city where data supports it), display currencies. One topic per step; grouped fields within a step, one question per screen on mobile.
- Progress: numbered stepper on desktop collapsing to "Step X of Y" plus a thin bar on mobile; steps are clickable backward but not forward.
- Persistence: autosave every answer to localStorage continuously (not a separate "save" button), restore on return, with a subtle "saved" indicator. This is the zero-budget equivalent of server-side save and covers the dominant abandonment case (resume upload, interruption, return).
- Inputs: role selection as a searchable combobox over a canonical role taxonomy (handles the city x role x language matrix later); country and currency as searchable selects with flags and ISO codes; salary as the currency input pattern above with a currency selector beside it; experience as a segmented control plus fine stepper; nationality and residencies as chip multiselects; resume upload as drag-and-drop plus file picker, optional and marked as such, with privacy copy ("parsed locally, not stored") because resume trust is the biggest drop-off risk in this flow.
- Always-visible escape hatch: a "skip" or "not sure" affordance on optional steps so perfectionists are never blocked.
- Live preview: after the minimum viable inputs (role, experience, target country), show a provisional range in the stepper area so users feel progress before completing all six steps.

### Results presentation patterns

Evidence: Glassdoor KYW (point estimate plus 25th-75th percentile band plus 12-month trend versus median, private by default), Levels.fyi (component breakdowns), and the percentile-range conventions across salary tools.

Recommended results dashboard.
- Hero quote card: "Quote this: {amount} per month" as the oversized tabular numeral, with annual equivalent and the user's chosen display currency; monthly/annual segmented toggle; one-tap currency switcher (multi-currency display, e.g., local currency plus home currency, is a differentiator none of the incumbents do well).
- Range bar: p25/median/p75 band with the recommended quote marker and the user's last salary plotted for comparison; label the band in plain language.
- Confidence block: a three-level confidence badge with one sentence naming the main uncertainty driver (data coverage for that role and country) and linking to methodology. This answers the trust gap every competitor leaves open.
- Breakdown accordion: base, typical bonus and allowances, purchasing-power and cost-of-living adjustment logic, tax regime note (described, never personalized legal advice), and how nationality and residency factored in.
- Percentile context: where the quote sits in the local market distribution, phrased for negotiation ("quoting at the median keeps room to negotiate").
- Comparison table (bento tile): the same profile in up to three alternative countries, end-aligned tabular numbers.
- Share and export: a share link encoding wizard inputs in the URL (no server needed, zero budget), an OG image summary card for social sharing, and a print stylesheet as the free PDF-export story.
- Iteration loop: prominent "change country / role / currency" shortcuts back into the wizard with state intact, because iterating is the core repeat behavior.
- Trust strip: data sources, sample size, last-updated date, methodology link. Make the caveat a feature, contra Numbeo and talent.com.

## 6. SEO and GEO for Tool Sites (verified against Google guidance as of August 2026)

### Structured data: what is alive, deprecated, and dead in 2026

Verified against Google's official search documentation updates changelog:
- HowTo: dead. Rich result removed (desktop September 2023), documentation removed entirely. Do not implement HowTo schema.
- FAQPage: dead as a rich result. Restricted to government and health sites in August 2023; per Google's changelog, the FAQ rich result stopped appearing in Google Search on May 7, 2026, and the documentation was removed June 15, 2026. FAQPage markup is harmless but earns nothing; FAQ content itself remains valuable for users and AI citation (see GEO below).
- Estimated salary (Occupation schema): deprecated. Google removed the course info, estimated salary, learning video, special announcement, and vehicle listing docs on September 9, 2025 (banners added June 2025). Directly relevant to a salary product: do not build around Occupation estimatedSalary expecting a rich result.
- Also gone: ClaimReview, book actions, practice problem (docs removed January 6, 2026).
- Alive and applicable: WebApplication (schema.org subtype of SoftwareApplication, correct for a browser tool) with name, offers (price 0, "free"), applicationCategory, operatingSystem "Any"; aggregateRating only if you have genuine ratings (without it the rich result will not display, and fabricated ratings violate guidelines). Organization. BreadcrumbList. Dataset is valid but Google clarifies (November 2025) Dataset markup serves Dataset Search, not rich results; still worth publishing for your public methodology tables. Validate with the Rich Results Test plus the Schema.org validator.
- Sources: developers.google.com/search/updates (fetched directly), software-app structured data docs, schema.org SoftwareApplication.

### URL structure and hreflang

- Keep everything on one domain in subdirectories, never subdomains: /en/, /ar/, /hi/, /id/, and so on, concentrating authority (Cloudflare and practitioner consensus).
- Locale-prefixed URLs with ISO codes; each language version fully localized (auto-translated pages without curation are a scaled-content spam risk; Google removed guidance permitting blocked auto-translations in 2025 to align with the 2024 scaled-content policy).
- hreflang: reciprocal annotations (every version references itself and all others), valid ISO 639-1 codes with optional region, targets return 200 not redirects, one implementation method only; at ExpatRate's scale, XML sitemap hreflang is the maintainable choice, with x-default pointing to an English or language-selector root. No breaking hreflang changes in 2025-2026; last clarification was June 2024 (one link tag per annotation).
- Programmatic pages: demand-gate every generated combination (publish city x role pages only where search demand and real data depth exist), never the full N x M matrix; every page must contain a working calculator with genuinely role-and-country-specific numbers plus unique surrounding content, or it is a doorway page under Google's spam policies. Validate with a small manual batch, then phase rollout; interlink hub pages (country hubs, role hubs) to avoid orphans. Sources: Google spam policies, seomatic 15 rules, Ahrefs free-tools strategy, joinindexed city-pages guide.

### llms.txt and generative engines

Google's position (changelog June 15, 2026, and the May 2026 AI optimization guide, both fetched directly): llms.txt is not used by Google Search; creating one neither helps nor hurts rankings; maintaining one for other services is fine. It is optional for ExpatRate; if published, keep it a minimal curated index of key pages, methodology, and data licensing.

Google's May 2026 "Optimizing for generative AI search" guide: eligibility for AI Overviews and AI Mode requires being indexed and snippet-eligible, crawlable, and enrolled for generative features in Search Console; there is no special schema for AI; myths explicitly debunked include content chunking to ideal lengths, rewriting content for AI, mass-producing pages for query fan-out (scaled content abuse policy), and fake mentions. Semantic, well-structured HTML helps AI agents that read the DOM and accessibility tree. Unique first-hand data is the named differentiator.

### What actually gets cited by AI assistants

The Princeton/IIT Delhi GEO study (KDD 2024, arXiv 2311.09735, GEO-bench of 10,000 queries tested against Perplexity) found: adding citations improved visibility up to roughly 30-40 percent, adding statistics up to 37 percent, adding quotations 15-30 percent, answer-first structure up to 40 percent; keyword stuffing performed below the unoptimized baseline. Industry analyses add that about 55 percent of AI Overview citations come from the top 30 percent of the page, and citation probability correlates strongly with traditional organic strength. Sources: arXiv paper and project site, Similarweb GEO keyword research, AirOps citation analysis.

### SEO and GEO checklist

- Answer-first pages: every programmatic page opens with a direct answer sentence containing the key figure ("A senior software engineer moving to Dubai should quote approximately AED X per month"), followed by the calculator, then depth.
- Original data as the moat: publish sample sizes, sources, methodology, and last-updated dates as crawlable HTML tables (also eligible for Dataset markup).
- Statistics with inline citations on every claim; quotable one-sentence summaries under each heading (these are what AI engines lift).
- Comparison tables (city vs city, currency vs currency) in HTML, not images.
- Structured data set: WebApplication, Organization, BreadcrumbList on all pages; Dataset on methodology pages; no HowTo, no FAQPage expectation.
- hreflang via sitemap, reciprocal, with x-default; one domain, locale subdirectories.
- Programmatic sets: /salary/{role}/in/{country}/ as the core pattern, gated by demand and data depth, with country and role hubs interlinking them; phased rollout with index monitoring in Search Console.
- llms.txt optional and minimal; robots.txt fully open to search crawlers; enroll in Search Console generative AI reporting to measure AI Mode and AI Overview traffic (counted since June 2025) and watch the Preferred Sources feature (rolling out since May 2026).
- Front-load: key figure and definition in the first screen of every page.

## Recommended Component Inventory (product-specific)

Wizard: stepper (desktop) plus step counter and bar (mobile), step shell with heading and help text, autosave indicator, error summary, back and next buttons, skip affordance.
Inputs: role combobox with search and taxonomy grouping, country select, currency select (multi), money input with currency toggle, experience segmented control plus stepper, nationality chip multiselect, residency chip multiselect, resume dropzone with local-processing notice, display-currency picker, monthly/annual segmented control.
Results: hero quote card (oversized tabular numeral), range bar with p25/median/p75 and prior-salary marker, confidence badge with explanation, breakdown accordion, percentile context card, country comparison table, methodology accordion, trust strip (sources, sample size, updated date), share-link button, print stylesheet, OG summary image, iterate shortcuts.
Site and SEO: header with language switcher, breadcrumbs, footer hub links (countries, roles, currencies, languages), FAQ text sections (no schema needed), programmatic content blocks, data tables, dark mode toggle.
Primitives: button, link, text input with label/help/error, select, combobox, chips, segmented control, accordion, badge, tooltip, dialog, toast, tabs, table, skeleton, spinner, stepper indicator.

## Master Source List

Design systems:
- https://m3.material.io/blog/building-with-m3-expressive
- https://m3.material.io/styles/color/system/how-the-system-works
- https://m3.material.io/blog/science-of-color-design
- https://material3-themes-manual.amoebelabs.com/basics/m3-analysis-palettes/
- https://fluent2.microsoft.design/elevation , https://fluent2.microsoft.design/design-tokens , https://fluent2.microsoft.design/typography , https://fluent2.microsoft.design/layout
- https://carbondesignsystem.com/elements/spacing/overview/ , https://carbondesignsystem.com/elements/typography/overview/ , https://carbondesignsystem.com/elements/typography/type-sets/
- https://www.ibm.com/design/language/2x-grid
- https://www.jsdelivr.com/package/npm/@shopify/polaris-tokens and https://www.npmjs.com/package/@shopify/polaris-tokens
- https://www.radix-ui.com/colors , https://blog.soards.me/posts/radix-colors-with-tailwind/ , https://github.com/radix-ui/colors/issues/41
- https://ui.shadcn.com/docs/theming
- https://tailwindcss.com/docs/theme

Fintech direction and salary tools:
- https://www.themasterly.com/blog/fintech-design-guide
- https://outcrowd.io/blog/fintech-design-trends-2026 and https://fuselabcreative.com/fintech-ux-design-guide-2026-user-experience/
- https://www.figma.com/resource-library/web-design-trends/
- https://www.glassdoor.com/blog/introducing-know-worth-glassdoor/
- https://finance.yahoo.com/news/paid-fairly-glassdoor-launches-know-100000482.html
- https://www.glassdoor.co.uk/blog/know-your-worth-uk/
- https://aiapply.co/blog/how-to-find-salary-on-glassdoor
- https://recruiter.com/recruiter-today/do-you-earn-what-youre-worth-glassdoors-new-salary-explore-can-answer-that-question
- https://igotanoffer.com/en/advice/levelsfyi-alternatives-review
- https://laboriq.co/insights/do-you-trust-your-compensation-data/ and https://ravio.com/blog/free-salary-data
- https://www.numbeo.com/cost-of-living/ and https://en.wikipedia.org/wiki/Numbeo
- https://news.ycombinator.com/item?id=6277454 and https://www.reddit.com/r/expats/comments/1h430ji/is_numbeo_accurate/
- https://www.reddit.com/r/recruitinghell/comments/1aixu5r/is_talentcom_a_legit_job_search_site/ and https://www.trustpilot.com/review/talent.com?page=2

Typography, fonts, numbers, RTL:
- https://fonts.google.com/noto
- https://notofonts.github.io/noto-docs/specimen/NotoSansArabicUI/
- https://fonts.google.com/noto/specimen/Noto+Sans_Devanagari
- https://fonts.google.com/specimen/IBM+Plex+Sans+Arabic and https://www.ibm.com/plex/languages/
- https://discussion.fedoraproject.org/t/proposal-for-arabic-font-improvement-switch-from-noto-sans-arabic-to-noto-nask-arabic/85033
- https://web.dev/articles/font-best-practices
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@font-face/unicode-range
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/font-variant-numeric and https://alistapart.com/article/web-typography-tables/
- https://uxpatterns.dev/patterns/forms/currency-input and https://etch.co/blog/money-input
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat
- https://www.w3.org/International/questions/qa-number-format
- https://github.com/tc39/ecma402/issues/858
- https://firefox-source-docs.mozilla.org/code-quality/coding-style/rtl_guidelines.html
- https://ishadeed.com/article/css-logical-properties/ and https://www.smashingmagazine.com/2022/12/deploying-css-logical-properties-on-web-apps/
- https://simplelocalize.io/blog/posts/rtl-design-guide-developers/ and https://tigeroaks.com/posts/rtl-tricks/

Accessibility:
- https://www.w3.org/TR/WCAG22/
- https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
- https://tetralogical.com/blog/2023/10/05/whats-new-wcag-2-2/ and https://visionaustralia.org/business/digital-access/blog/the-new-requirements-for-wcag-2-2
- https://designsystem.digital.gov/components/step-indicator/

Wizard and forms:
- https://www.weweb.io/blog/multi-step-form-design
- https://www.reform.app/blog/10-best-practices-for-multi-step-form-navigation
- https://www.eleken.co/blog-posts/wizard-ui-pattern-explained
- https://ux.stackexchange.com/questions/3454/how-do-you-indicate-progress-to-users-in-a-multi-step-form

SEO and GEO:
- https://developers.google.com/search/updates
- https://developers.google.com/search/blog/2023/08/howto-faq-changes
- https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- https://developers.google.com/search/docs/appearance/structured-data/software-app
- https://schema.org/SoftwareApplication
- https://search.google.com/test/rich-results
- https://developers.google.com/search/docs/specialty/international/localized-versions
- https://developers.google.com/search/blog/2013/04/x-default-hreflang-for-international-pages
- https://amp.brightedge.com/blog/hreflang-xml-sitemaps-and-html-link-elements-and-international-site-management
- https://developers.google.com/search/docs/essentials/spam-policies
- https://seomatic.ai/blog/programmatic-seo-best-practices
- https://ahrefs.com/blog/the-free-tools-seo-strategy/
- https://www.joinindexed.com/blog/programmatic-seo-for-local-businesses-how-to-build-city-and-service-pages-at-scale
- https://blog.cloudflare.com/subdomains-vs-subdirectories-best-practices-workers-part-1/
- https://arxiv.org/abs/2311.09735 and https://generative-engines.com/
- https://aisearch.similarweb.com/blog/geo-keyword-research/
- https://www.seroundtable.com/google-ai-llms-txt-39607.html and https://susodigital.com/thoughts/what-is-llms-txt-and-is-it-actually-important-for-ai-search/
