import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { bandToLevel } from '../src/wizard/derive';
import type { ExperienceBand } from '../src/wizard/types';

const root = fileURLToPath(new URL('..', import.meta.url));
const dict = (loc: string) =>
  JSON.parse(readFileSync(`${root}src/i18n/${loc}.json`, 'utf8'));
const locales = ['en', 'ar', 'hi', 'id', 'es'] as const;
const BANDS: ExperienceBand[] = ['0-2', '3-5', '6-9', '10-14', '15+'];

test('saved indicator says where the data is saved, in every locale', () => {
  const markers = { en: /browser/i, ar: 'المتصفح', hi: 'ब्राउज़र', id: /browser/i, es: /navegador/i } as const;
  for (const loc of locales) {
    expect(dict(loc).wizard.saved, loc).toMatch(new RegExp(markers[loc] as RegExp));
  }
});

test('resume upload is marked optional in its visible title and hidden label', () => {
  const markers = { en: 'optional', ar: 'اختياري', hi: 'वैकल्पिक', id: 'opsional', es: 'opcional' } as const;
  for (const loc of locales) {
    expect(dict(loc).parse.dropTitle, `${loc} dropTitle`).toContain(markers[loc]);
    expect(dict(loc).parse.resumeLabel, `${loc} resumeLabel`).toContain(markers[loc]);
  }
});

test('band option labels are plain ranges; the step help carries the level mapping', () => {
  for (const loc of locales) {
    const words = dict(loc).seo.levelWord;
    const bands = dict(loc).options.bands;
    for (const band of BANDS) {
      const level = bandToLevel(band);
      expect(level, band).not.toBeNull();
      expect(bands[band], `${loc} ${band}`).not.toContain(words[level as string]);
    }
  }
});

test('role family label drops the redundant parenthetical', () => {
  for (const loc of locales) {
    expect(dict(loc).steps.role.roleFamily, loc).not.toMatch(/[()（）]/);
  }
});

test('step help explains the band instead of a bare seniority sentence', () => {
  const markers = { en: 'band', ar: 'نطاق', hi: 'बैंड', id: 'rentang', es: 'banda' } as const;
  for (const loc of locales) {
    expect(dict(loc).steps.role.help, loc).toContain(markers[loc]);
  }
  expect(dict('en').steps.role.help).not.toContain('Seniority comes from');
});

test('trust bullet scopes the country count to the floor', () => {
  const markers = { en: /floor/i, ar: 'حد', hi: 'सीमा', id: /batas/i, es: /suelo/i } as const;
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
  expect(dict('id').home.footerData).not.toContain('koridor');
  expect(dict('id').home.footerData).toContain('negara tujuan');
  expect(dict('es').home.footerData).not.toContain('corredores');
  expect(dict('es').home.footerData).toContain('países de destino');
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
  const promiseMarker = { en: /never sees it|no server/i, ar: 'دون أن يمر', hi: 'नहीं गुजरती', id: /tidak pernah melihat/i, es: /nunca lo ve/i } as const;
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
    id: { market: /P25/, floor: /Bank Dunia/, tax: /20 persen/ },
    es: { market: /P25/, floor: /Banco Mundial/, tax: /20 por ciento/ },
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
  const markers = { en: /Data as of/i, ar: /البيانات حتى/, hi: /आँकड़े अद्यतन/, id: /Data per/i, es: /Datos a/i } as const;
  for (const loc of locales) {
    expect(dict(loc).home.trustData, loc).toMatch(new RegExp(markers[loc] as RegExp));
    for (const param of ['{benchmarks}', '{ppp}', '{fx}', '{allowances}']) {
      expect(dict(loc).home.trustData, `${loc} ${param}`).toContain(param);
    }
  }
});

test('experience band labels carry no level jargon in any locale', () => {
  const banned = { en: 'band', ar: 'نطاق', hi: 'बैंड', id: 'rentang', es: 'banda' } as const;
  for (const loc of locales) {
    for (const value of Object.values(dict(loc).options.bands as Record<string, string>)) {
      expect(value, loc).not.toContain(banned[loc]);
    }
  }
});

test('the role step help explains the band-to-level mapping in every locale', () => {
  const markers = { en: 'senior', ar: 'خبير', hi: 'वरिष्ठ', id: 'senior', es: 'senior' } as const;
  for (const loc of locales) {
    expect(dict(loc).steps.role.help, loc).toMatch(new RegExp(markers[loc]));
  }
});

test('entry mode, mixed currencies, and shared views get their own copy in every locale', () => {
  for (const loc of locales) {
    const r = dict(loc).results;
    expect(typeof r.insufficientEntryBody, `${loc} insufficientEntryBody`).toBe('string');
    expect(typeof r.floorCurrencyNote, `${loc} floorCurrencyNote`).toBe('string');
    expect(typeof r.sharedRatesNote, `${loc} sharedRatesNote`).toBe('string');
    expect(typeof dict(loc).home.skip, `${loc} skip`).toBe('string');
  }
});

test('the meta description claims your currency, not any currency', () => {
  expect(dict('en').home.description).toContain('in your currency');
  expect(dict('ar').home.description).toContain('بعملتك');
  expect(dict('hi').home.description).toContain('आपकी मुद्रा');
  expect(dict('id').home.description).toContain('dalam mata uang Anda');
  expect(dict('es').home.description).toContain('en tu moneda');
});

test('English user copy says band, not a range-band mix', () => {
  expect(dict('en').results.range).toContain('band');
  expect(dict('en').home.sub).toContain('band');
  expect(dict('en').home.sub).not.toContain('range');
});

test('no locale hardcodes the role family count', () => {
  for (const loc of locales) {
    expect(JSON.stringify(dict(loc)), loc).not.toContain('16 role');
    expect(dict(loc).home.trust2, loc).toContain('{f}');
  }
});

test('returning visitors get a welcome-back note and an action-named resume chip in every locale', () => {
  const browserWord = { en: /browser/i, ar: 'المتصفح', hi: 'ब्राउज़र', id: /browser/i, es: /navegador/i } as const;
  for (const loc of locales) {
    const welcome: unknown = dict(loc).wizard.welcomeBack;
    expect(typeof welcome, `${loc} welcomeBack is a string`).toBe('string');
    expect(welcome as string, loc).toMatch(new RegExp(browserWord[loc] as RegExp));
    expect(dict(loc).wizard.resume, `${loc} resume carries the step`).toContain('{n}');
    expect(dict(loc).wizard.resume, `${loc} resume carries the total`).toContain('{total}');
  }
  expect(dict('en').wizard.resume, 'names the destination step, not a past-tense status').toContain('step {n}');
});

test('the home trust bullet passes every placeholder it declares', () => {
  const home = readFileSync(`${root}src/components/HomePage.astro`, 'utf8');
  const call = home.match(/t\('home\.trust2',\s*\{([^}]*)\}/);
  expect(call, 'HomePage calls home.trust2 with a params object').not.toBeNull();
  expect(call?.[1] ?? '', 'passes the country count').toContain('n:');
  expect(call?.[1] ?? '', 'passes the role family count').toContain('f:');
});

test('the tax-default count in user copy derives from the data', () => {
  const tax = JSON.parse(readFileSync(`${root}src/data/tax-effective.json`, 'utf8')) as Array<{ iso3: string }>;
  const countries = JSON.parse(readFileSync(`${root}src/data/countries.json`, 'utf8')) as unknown[];
  const onDefault = countries.length - new Set(tax.map((entry) => entry.iso3)).size;
  const expected = {
    en: `${onDefault} of ${countries.length}`,
    ar: `${onDefault} من ${countries.length}`,
    hi: `${countries.length} में से ${onDefault}`,
    id: `${onDefault} dari ${countries.length}`,
    es: `${onDefault} de ${countries.length}`,
  } as const;
  for (const loc of locales) {
    expect(dict(loc).seo.methodologyTax, loc).toContain(expected[loc]);
  }
  const page = readFileSync(`${root}src/pages/methodology.astro`, 'utf8');
  expect(page, 'the methodology page states the same count').toContain(`${onDefault} of ${countries.length}`);
});

test('every placeholder a copy string declares is passed at its call sites', () => {
  const placeholders = new Map<string, string[]>();
  const collect = (node: unknown, prefix: string): void => {
    if (typeof node === 'string') {
      const vars = [...node.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      if (vars.length > 0) placeholders.set(prefix, vars);
    } else if (typeof node === 'object' && node !== null) {
      for (const [key, value] of Object.entries(node)) collect(value, prefix ? `${prefix}.${key}` : key);
    }
  };
  collect(dict('en'), '');

  /* Params can be explicit (name: value) or shorthand ({ stated, pct: x }). */
  const extractParamNames = (blob: string): Set<string> => {
    const names = new Set<string>();
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    for (const ch of blob) {
      if ('([{'.includes(ch)) depth += 1;
      else if (')]}'.includes(ch)) depth -= 1;
      if (ch === ',' && depth === 0) {
        parts.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) parts.push(current);
    for (const part of parts) {
      const explicit = part.match(/^\s*([a-zA-Z_$][\w$]*)\s*:/);
      if (explicit) names.add(explicit[1]);
      else if (/^\s*[a-zA-Z_$][\w$]*\s*$/.test(part)) names.add(part.trim());
    }
    return names;
  };

  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = `${dir}/${name}`;
      return statSync(path).isDirectory() ? walk(path) : [path];
    });
  const sources = walk(`${root}src`)
    .filter((path) => /\.(astro|ts)$/.test(path) && !path.includes('/i18n/'))
    .map((path) => ({ path, text: readFileSync(path, 'utf8') }));

  const checked: string[] = [];
  for (const source of sources) {
    const call = /\bt\(\s*'([a-zA-Z][\w.]*)'\s*(?:,\s*\{([^}]*)\})?\s*\)/g;
    for (const match of source.text.matchAll(call)) {
      const required = placeholders.get(match[1]);
      if (!required) continue;
      checked.push(`${source.path}: ${match[1]}`);
      const given = extractParamNames(match[2] ?? '');
      for (const name of required) {
        expect(given.has(name), `${source.path} calls t('${match[1]}') without {${name}}`).toBe(true);
      }
    }
  }
  expect(checked.length, 'the scan still finds parameterized copy calls').toBeGreaterThan(50);
});
