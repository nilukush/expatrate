import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { bandToLevel } from '../src/wizard/derive';
import type { ExperienceBand } from '../src/wizard/types';

const root = fileURLToPath(new URL('..', import.meta.url));
const dict = (loc: string) =>
  JSON.parse(readFileSync(`${root}src/i18n/${loc}.json`, 'utf8'));
const locales = ['en', 'ar', 'hi'] as const;
const BANDS: ExperienceBand[] = ['0-2', '3-5', '6-9', '10-14', '15+'];

test('saved indicator says where the data is saved, in every locale', () => {
  const markers = { en: /browser/i, ar: 'المتصفح', hi: 'ब्राउज़र' } as const;
  for (const loc of locales) {
    expect(dict(loc).wizard.saved, loc).toMatch(new RegExp(markers[loc] as RegExp));
  }
});

test('resume upload is marked optional in its visible title and hidden label', () => {
  const markers = { en: 'optional', ar: 'اختياري', hi: 'वैकल्पिक' } as const;
  for (const loc of locales) {
    expect(dict(loc).parse.dropTitle, `${loc} dropTitle`).toContain(markers[loc]);
    expect(dict(loc).parse.resumeLabel, `${loc} resumeLabel`).toContain(markers[loc]);
  }
});

test('band option labels name the engine level that bandToLevel assigns', () => {
  for (const loc of locales) {
    const words = dict(loc).seo.levelWord;
    const bands = dict(loc).options.bands;
    for (const band of BANDS) {
      const level = bandToLevel(band);
      expect(level, band).not.toBeNull();
      expect(bands[band], `${loc} ${band}`).toContain(words[level as string]);
    }
  }
});

test('role family label drops the redundant parenthetical', () => {
  for (const loc of locales) {
    expect(dict(loc).steps.role.roleFamily, loc).not.toMatch(/[()（）]/);
  }
});

test('step help explains the band instead of a bare seniority sentence', () => {
  const markers = { en: 'band', ar: 'نطاق', hi: 'बैंड' } as const;
  for (const loc of locales) {
    expect(dict(loc).steps.role.help, loc).toContain(markers[loc]);
  }
  expect(dict('en').steps.role.help).not.toContain('Seniority comes from');
});

test('trust bullet scopes the country count to the floor', () => {
  const markers = { en: /floor/i, ar: 'حد', hi: 'सीमा' } as const;
  for (const loc of locales) {
    expect(dict(loc).home.trust2, loc).toMatch(new RegExp(markers[loc] as RegExp));
  }
});

test('home title tag matches the h1 casing', () => {
  expect(dict('en').home.title).toBe('ExpatRate: Know what to quote');
});

test('footer data line names a benchmark country count, not corridors', () => {
  expect(dict('en').home.footerData).toContain('{b}');
  expect(dict('en').home.footerData).toContain('destination countries');
  expect(dict('en').home.footerData).not.toContain('corridors');
  expect(dict('ar').home.footerData).not.toContain('الممرات');
  expect(dict('ar').home.footerData).toContain('دولة وجهة');
  expect(dict('hi').home.footerData).not.toContain('गलियारों');
  expect(dict('hi').home.footerData).toContain('गंतव्य');
});

test('footer disclaimer is a complete sentence', () => {
  expect(dict('en').home.footerAdvice).toBe(
    'Estimates are indicative only and are not financial, tax, or legal advice.',
  );
});

test('footer carries a rights line and a localized privacy label in every locale', () => {
  for (const loc of locales) {
    expect(dict(loc).home.footerRights, loc).toContain('{year}');
    expect(dict(loc).home.footerRights, loc).toContain('ExpatRate');
    expect(dict(loc).home.linkPrivacy, loc).toBeTruthy();
  }
});

test('the benchmark count behind {b} is real: distinct countries in the live matrix', () => {
  const matrix = JSON.parse(readFileSync(`${root}src/data/benchmarks.json`, 'utf8'));
  const countries = new Set(matrix.entries.map((e: { country: string }) => e.country));
  expect(countries.size).toBeGreaterThanOrEqual(24);
});

test('privacy copy exists in every locale with the three core promises', () => {
  const keys = ['title', 'description', 'intro', 'deviceTitle', 'deviceBody', 'analyticsTitle', 'analyticsBody', 'externalTitle', 'externalBody'];
  for (const loc of locales) {
    const p = dict(loc).privacy;
    for (const k of keys) expect(p[k], `${loc} ${k}`).toBeTruthy();
  }
  const en = dict('en').privacy;
  expect(en.intro).toContain('no account');
  expect(en.deviceBody).toContain('never uploaded');
  expect(en.analyticsBody).toContain('cookie-free');
});

test('the job link hint names the boards and the no-server promise in every locale', () => {
  const boardMarker = 'Greenhouse';
  const promiseMarker = { en: /never sees it|no server/i, ar: 'دون أن يمر', hi: 'नहीं गुजरती' } as const;
  for (const loc of locales) {
    const hint: unknown = dict(loc).steps.role.jdBoards;
    expect(typeof hint, `${loc} jdBoards is a string`).toBe('string');
    expect(hint as string, loc).toContain(boardMarker);
    expect(hint as string, loc).toMatch(new RegExp(promiseMarker[loc] as RegExp));
  }
});

test('the English methodology page discloses the 20 percent default tax gross-up', () => {
  const page = readFileSync(`${root}src/pages/methodology.astro`, 'utf8');
  expect(page).toMatch(/20 percent|20%/);
  expect(page).toMatch(/default/i);
});

test('every locale carries the full localized methodology, including the 20 percent default', () => {
  const markers = {
    en: { market: /P25/i, floor: /PPP/i, tax: /20 percent/ },
    ar: { market: /المرتبين 25/, floor: /البنك الدولي/, tax: /20 بالمئة/ },
    hi: { market: /P25/, floor: /PPP/, tax: /20 प्रतिशत/ },
  } as const;
  for (const loc of locales) {
    const seo = dict(loc).seo;
    expect(typeof seo.methodologyMarket, loc).toBe('string');
    expect(seo.methodologyMarket, loc).toMatch(markers[loc].market);
    expect(seo.methodologyFloor, loc).toMatch(markers[loc].floor);
    expect(seo.methodologyTax, loc).toMatch(markers[loc].tax);
  }
});

test('the home trust line states the data dates in every locale', () => {
  const markers = { en: /Data as of/i, ar: /البيانات حتى/, hi: /आँकड़े अद्यतन/ } as const;
  for (const loc of locales) {
    expect(dict(loc).home.trustData, loc).toMatch(new RegExp(markers[loc] as RegExp));
    for (const param of ['{benchmarks}', '{ppp}', '{fx}', '{allowances}']) {
      expect(dict(loc).home.trustData, `${loc} ${param}`).toContain(param);
    }
  }
});
