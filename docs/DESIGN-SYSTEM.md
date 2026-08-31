# ExpatRate Design System

Version 1.0.0, 30 August 2026
Machine-readable tokens: `design-system/tokens.json`
Research basis: `docs/RESEARCH/design-research-report.md` (all sources verified August 2026)

This system is built on findings from the leading design systems (Material 3 Expressive, Fluent 2, Carbon, Polaris, Radix Colors, shadcn/ui, Tailwind v4) and adapted for one specific product: a money tool that people across 20+ countries will use to decide what number to say out loud in a salary negotiation. Every choice below optimizes for trust, clarity of numbers, and correct rendering in English, Arabic (right to left), Hindi, and Indonesian.

---

## 1. Brand Foundations

Name: ExpatRate.
Tagline: "Know what to quote."
Brand personality: precise, calm, international, honest. The product handles the most anxiety-inducing number in a person's career, so the design must feel like a good advisor: quiet, specific, source-citing, never hype.

Design principles:
1. The number is the hero. One oversized figure per screen; everything else is subordinate.
2. Transparency is a feature. Data dates, source quality, and confidence reasons are first-class UI, not footnotes.
3. No login, no dark patterns. The result is never gated. Sharing is by link, not by account.
4. Local correctness. Currency, script, direction, and package conventions follow the user's context, not ours.
5. Restraint. One accent hue, one gradient maximum (used once, or never), no glass effects in the app.

Voice and copy rules (applies to all product and marketing copy, all languages):
- Answer first: the key figure appears in the first sentence of any result or page.
- Short declarative sentences. Numbers over adjectives.
- Show dates on claims: "data as of August 2026".
- Banned words: seamless, elevate, unlock, empower, leverage (as a verb), robust, cutting-edge, vibrant, journey (outside literal visa contexts), landscape (outside literal geography), delve, and any hollow intensifier. This also keeps copy free of the recognizable patterns of machine-written text, which is an explicit project constraint.
- Never shame the user's previous salary. Comparisons are factual, not judgmental.

## 2. Color

### 2.1 Direction: Sovereign Teal

Teal carries banking heritage and calm authority and differentiates ExpatRate from the indigo-purple uniformity of 2026 fintech interfaces. The palette is built as 12-step OKLCH scales (Radix architecture), named by semantic role (shadcn convention), with dark mode as a semantic remap rather than a separate palette (Material 3 strategy). All values live in `design-system/tokens.json`; the summary:

Light mode:
- Background slate-50 #F8FAFC, foreground slate-900 #0F172A
- Card #FFFFFF with 1px slate-200 border
- Primary teal-700 #0F766E (5.5:1 on white; used for buttons, links, all text-bearing brand surfaces)
- Primary display teal-600 #0D9488 (3.8:1; large display text 24px+ and graphics only)
- Accent surface teal-50 #F0FDFA; muted slate-100 with slate-500 text
- Range band teal-200 #99F6E4; quote marker teal-700; prior-salary marker amber-600 #D97706
- Destructive #DC2626, success text green-700 #15803D, warning text amber-700 #B45309

Dark mode:
- Background #0C1220 oklch(0.17 0.028 262), card #131C2E
- Primary teal-300 #5EEAD4 with teal-950 text on it
- Borders white at 10% opacity instead of heavier shadows
- Chart hues shift lighter, not just darker (teal-300, amber-300, indigo #818CF8, rose #FB7185, slate-400)

### 2.2 Rules

- Components reference semantic tokens only. Raw hex or primitive scales in component code fail the stylelint check.
- Never pure black (#000) or pure white (#FF) as surfaces.
- One gradient maximum across the whole product, reserved for the marketing hero if used at all. None on functional elements.
- Contrast requirements: 4.5:1 body text, 3:1 large text and graphical objects (range tracks, chart lines, markers). Warning color amber-600 passes graphics contrast only; warning text uses amber-700. The palette was tuned with both WCAG and APCA thinking per the Radix method.
- Confidence colors: green (high), amber (medium), slate (low). Low confidence is neutral, not alarming: uncertain data is normal, not an error.
- Currency-risk notices use the warning tokens with an icon, never red: volatility is a caution, not a failure.

### 2.3 Data visualization palette

Five chart slots (chart-1 teal through chart-5 slate). Rule: the user's own numbers are always teal; comparators take the remaining slots in order. Distinguish markers by shape as well as color (diamond for the recommended quote, circle for the prior salary) so the range bar reads without color vision.

## 3. Typography

### 3.1 Families

Noto Sans across all scripts: Latin (including Indonesian), Noto Sans Arabic UI for Arabic, Noto Sans Devanagari for Hindi. One superfamily gives uniform vertical metrics and one aesthetic across scripts, which removes the cross-script pairing seam entirely. Variable WOFF2 files, loaded per-script with unicode-range so an Indonesian visitor never downloads Arabic or Devanagari bytes; font-display swap; preload only the Latin subset. If brand differentiation is wanted later, the Latin layer can upgrade to Inter while Arabic and Devanagari stay Noto.

### 3.2 Scale (Carbon's productive/expressive split)

| Token | Size | Line height | Weight | Use |
|---|---|---|---|---|
| display-numeral | clamp(2.5rem, 6vw, 4.5rem) | 1.05 | 650 | The quote figure. Always tabular-nums |
| display-heading | clamp(1.75rem, 3.5vw, 2.5rem) | 1.15 | 700 | Results page H1, hero |
| h2 | 1.5rem | 1.25 | 650 | Section headings |
| h3 | 1.25rem | 1.25 | 600 | Card headings, accordion headers |
| body-lg | 1.125rem | 1.55 | 400 | Result explanations |
| body | 1rem | 1.5 | 400 | Forms, general |
| body-sm | 0.875rem | 1.45 | 400 | Help text, secondary |
| caption | 0.75rem | 1.4 | 400 | Legal, disclaimers, data dates |

All form inputs render at 16px minimum (prevents iOS zoom). Script size factors: Arabic 1.06, Devanagari 1.03 applied via html[lang] rules, because both scripts read slightly small at identical nominal sizes.

### 3.3 Numerals

Every money value, range, and table column uses font-variant-numeric: tabular-nums so digits never shift during count-up animations. Numeric columns align to the inline end. Formatting goes through Intl.NumberFormat with an explicit locale and ISO 4217 currency code: en-IN and hi-IN group digits as lakh/crore automatically, ar locales render Eastern Arabic digits. currencyDisplay "symbol" by default, "code" in dense comparison tables; narrowSymbol is banned in multi-currency contexts because "$" is ambiguous across dollar currencies.

## 4. Spacing, Layout, Radius, Elevation

Spacing: 4px base. Scale 4, 8, 12, 16, 24, 32, 48, 64, 96. Section rhythm moves in 8px jumps; 4px steps stay inside components.

Layout: content max width 1200px, wizard column max 640px. Breakpoints sm 640, md 768, lg 1024, xl 1280. Results use a 12-column bento grid: hero quote card spans 8 columns on desktop, range bar spans 8, confidence and package cards span 4 each, comparison and methodology span full width. The wizard is single column, one topic per screen on mobile.

Radius: single base 0.625rem deriving the scale shadcn-style: sm 6px (inputs, tags), md 8px (buttons), lg 10px (cards), xl 16px (hero card, modals), full for chips and toggle pills. Money interfaces read trustworthy with moderate consistent radius, not the large morphing shapes of expressive consumer apps.

Elevation: border-first, three levels only. Level 0 flat with 1px border. Level 1 cards add one soft layered shadow. Level 2 popovers and the sticky results bar add slightly more blur. Dark mode substitutes lighter surfaces and borders for shadows.

## 5. Motion

Durations: 100ms hover and focus, 200ms accordions and step transitions, 300ms results reveal and range fill, 500ms hero count-up. Entrances ease-out, exits ease-in. One playful moment allowed: the range bar settling with spring physics. Everything respects prefers-reduced-motion; under it, the count-up renders the final value instantly and step transitions become simple fades. No autoplay motion near the result number.

## 6. Iconography

Lucide, ISC license, stroke width 1.75, default size 20px. RTL mirroring: direction-relative icons (back arrows, next chevrons, progress indicators) flip with scaleX(-1); logos, media controls, clocks, and magnitude charts never flip. Icons are always paired with a text label or accessible name.

## 7. Components

Primitives: button (primary, secondary, ghost, destructive; 44px touch height), link, text input (label, help text, error slot), select, combobox (searchable, keyboard navigable), chip, segmented control (monthly/annual, gross/net), accordion, badge, tooltip, dialog, toast, tabs, table (real table elements, scoped headers, caption, tabular-nums, end-aligned numerics), skeleton, spinner, stepper.

Wizard components:
- Stepper: five steps on desktop, "Step 3 of 5" text plus thin bar on mobile. Clickable backward only. Step 1, your role: role family, experience band, employment type, company type, with the optional resume dropzone and JD paste as prefill aids. Step 2, your current pay: current country of employment, salary with currency and basis, the interpretation confirmation, optional package composition checkboxes. Step 3, the opportunity: target country, work arrangement, a conditional employer-country field when remote for a foreign company, optional sponsorship toggle. Step 4, family context: optional and fully skippable (dependents, school-age children). Step 5, display currencies.
- Step shell: H2 heading, one-line help text, fields, persistent Back and Next buttons. Back never loses data (autosave to localStorage on every change, restored on return, subtle "saved" indicator).
- Money input: type text, inputmode decimal, currency selector beside it, currency named in the visible label, formatting applied on blur. Never type number.
- Experience control: segmented bands (0-2, 3-5, 6-9, 10-14, 15+) with plain-language labels.
- Segmented controls for work arrangement (on-site, remote for a local company, remote for a foreign company) and employment type (full-time, contract, freelance, part-time). Choosing remote for a foreign company reveals the employer-country select inline.
- Country and currency selects: searchable, with ISO codes and flag glyphs, keyboard operable. Used for current country of employment, target country, conditional employer country, and display currencies.
- Package composition checkbox group: housing, transport, schooling, flights, bonus, plain labels, all defaulting to unchecked.
- Family step: dependents stepper and school-age children toggle; the whole step is skippable and skipping changes no base number.
- Resume dropzone: drag and drop plus file picker, marked optional, with the privacy line "Parsed in your browser. Never uploaded." Prefills role and years for confirmation.
- JD paste textarea: optional; suggested role and seniority appear as confirmable chips.
- Skip affordance on every optional step.

Data minimalism: the wizard never asks for gender, age, date of birth, email, passport details, or address. There is no account and no database. This is stated plainly on the privacy page because it is a product feature, not a limitation.

Results components:
- Hero quote card: "Quote this" label, the figure in display-numeral, monthly/annual segmented toggle, currency chips inline, basis line restating assumptions ("gross, tax-free, AED").
- Range bar: P25 to P75 band on a track, median notch, diamond marker for the recommended quote, circle marker for the user's last salary, all labeled in text beneath. Plain-language band caption: "Most employers for this profile in Dubai quote within this band."
- Confidence block: badge (High, Medium, Low) plus one sentence naming the main uncertainty driver, linking to the methodology page.
- Floor card: the purchasing-power walk-away number, labeled "minimum to not lose purchasing power, not a negotiation anchor".
- Package composition card (GCC targets): basic, housing, transport split with the local convention, gratuity warning on UAE basic-only accrual.
- Currency-risk notice (EGP, NGN, LBP targets): warning token, USD-anchored figure shown alongside local, suggestion of an annual review clause.
- Breakdown accordion: how each number was computed, line by line, with sources.
- Country comparison table: same profile in up to three alternates.
- Trust strip: sources with licenses, data dates, methodology link, disclaimer.
- Share: link button encoding inputs in the URL, print stylesheet for PDF export, OG summary image.

Site components: header (logo, country hub link, methodology link, language switcher, dark mode toggle), breadcrumbs, footer hub links (countries, roles, currencies, languages), FAQ sections as plain text (no FAQPage schema; see SEO section).

Wireframes (text):

```
WIZARD (mobile-first, 640px column)
+----------------------------------------+
| Step 3 of 5        [====------]        |
| Your current salary                    |
| One line of help text.                 |
|                                        |
| Amount          Currency               |
| [ 53,871    ]   [AED v]                |
| ( ) monthly   ( ) annual               |
| ( ) gross     ( ) net                  |
|                                        |
| We understood: AED 53,871 per month    |
| gross, tax-free = AED 646,452 per year |
| [ Yes, that is correct ]               |
|                                        |
| [ Back ]                  [ Continue ] |
+----------------------------------------+

RESULTS (desktop bento)
+---------------------------------------+----------------+
| QUOTE THIS                            | CONFIDENCE     |
| AED 68,000 / month   (4.5rem figure)  | Medium         |
| AED 816,000 / year  [monthly|annual]  | why + link     |
| [AED] [USD] [INR]                     +----------------+
| basis line                            | YOUR FLOOR     |
+---------------------------------------+ AED 61,000/mo  |
| RANGE BAR  |-----[==o==<>==]------|   | walk-away note |
+---------------------------------------+----------------+
| PACKAGE (GCC)  | NEGOTIATION BRIEF    | CURRENCY NOTE  |
+---------------------------------------+----------------+
| COMPARISON TABLE (3 countries)                        |
+-------------------------------------------------------+
| METHODOLOGY ACCORDION + TRUST STRIP                   |
+-------------------------------------------------------+
```

## 8. RTL and Localization

- All layout uses CSS logical properties (margin-inline-start, inset-inline, border-start-start-radius). Physical left/right values are banned except in the few documented exceptions.
- Document root carries dir="rtl" and lang="ar" for Arabic pages; selectors use :dir() where needed.
- Progress and step axes flow right to left in Arabic; magnitude axes and currency figures stay LTR; standalone numerals get isolated bidi contexts so mixed Arabic text, Latin digits, and currency codes render correctly.
- Language switcher is a set of real links preserving current page context, keyboard accessible.
- Locale set at launch: English, structure ready day one for Arabic, Hindi, Indonesian, then Spanish, French, Portuguese, Russian, Chinese. Each locale's pages are fully localized content, never raw machine output (auto-translated uncured pages are a scaled-content spam risk under current Google policy).
- Test with real Arabic and Hindi strings early; synthetic filler text hides clipping and shaping bugs.

## 9. Accessibility (WCAG 2.2 AA)

Wizard:
- Targets at least 24x24 px; primary actions 44px on touch.
- Focus visible, at least 2px, strong contrast, never obscured by the sticky bar (scroll-margin handles clearance).
- Step changes move focus to the new heading and announce via a polite live region.
- Errors: text adjacent to the field, aria-describedby linkage, top-of-step error summary that receives focus on failed submit, remedial wording ("enter your monthly amount, not annual"), never color alone.
- No redundant entry: results reuse wizard inputs.
- Sliders have non-drag equivalents; the range bar is decorative-labeled, not itself a control.

Results:
- Hero figure inside the H1; every value present as text; charts carry table equivalents.
- Currency inputs use inputmode decimal on text inputs.
- 200% zoom and 400% reflow without loss.
- Reduced motion honored everywhere (see section 5).

Validation: axe-core in the Playwright suite on every page type, both directions (LTR and RTL), both themes.

## 10. SEO and GEO

Verified against Google's own changelog as of August 2026:
- Dead: HowTo schema; FAQPage as a rich result (stopped appearing 7 May 2026); Occupation estimatedSalary (deprecated September 2025). None implemented. FAQ content stays as on-page text because it serves users and AI citation.
- Implemented: WebApplication (name, offers price 0 free, applicationCategory, operatingSystem Any), Organization, BreadcrumbList everywhere; Dataset markup on methodology pages (serves Dataset Search, not rich results).
- URLs: one domain, locale subdirectories (/en/, /ar/, /hi/, /id/), hreflang reciprocal via XML sitemap with x-default to the English root.
- Programmatic pattern: /salary/{role}/in/{country}/ pages, demand-gated and data-gated, each with a working calculator and unique surrounding content, interlinked from country and role hub pages. Phased rollout with Search Console monitoring.
- Answer-first content: every programmatic page opens with a direct sentence containing the key figure, followed by the calculator, then depth. Statistics carry inline citations; each section ends with a quotable one-sentence summary (the GEO study shows citations and statistics raise AI visibility by 30-40 percent; keyword stuffing reduces it below baseline).
- Original data as the moat: methodology tables, sample sizes, licenses, and update dates published as crawlable HTML.
- llms.txt: optional, minimal index of key pages and licensing, published once the domain exists.
- robots.txt fully open; enroll in Search Console generative AI reporting.

## 11. Token Governance

- `design-system/tokens.json` is the source of truth. The Tailwind v4 `@theme` block generates utilities from these values; a build check fails if the two drift.
- Stylelint forbids raw hex, px spacing values outside the scale, and non-logical direction properties in component styles.
- Token changes require a version bump in tokens.json and a note in the changelog.
