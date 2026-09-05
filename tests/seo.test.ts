import { describe, expect, it } from 'vitest';
import {
  SITE_URL,
  countrySlug,
  detailPages,
  detailUrl,
  breadcrumbLd,
  webAppLd,
  organizationLd,
  datasetLd,
  sitemapXml,
  alternateLinks,
} from '../src/lib/seo';
import benchmarks from '../src/data/benchmarks.json';

const entries = benchmarks.entries as Array<Record<string, unknown>>;
const dataCells = entries.filter((e) => e.status === undefined);

describe('seo page inventory', () => {
  it('generates a detail page for exactly the family-country pairs with data', () => {
    const pages = detailPages();
    const pairs = new Set(dataCells.map((e) => `${e.family}|${e.country}`));
    expect(pages.length).toBe(pairs.size);
    for (const page of pages) {
      expect(page.levels.length).toBeGreaterThan(0);
      expect(page.levels.every((l) => l.p50 > 0)).toBe(true);
    }
  });

  it('never generates a page for an empty cell (doorway prevention)', () => {
    const pages = detailPages();
    const has = pages.some(
      (p) => p.familyId === 'it-executive' && p.countryIso3 === 'EGY',
    );
    expect(has).toBe(false);
  });

  it('every detail page opens with its key figure in the answer-first paragraph', () => {
    const pages = detailPages();
    for (const page of pages) {
      expect(page.answer.paragraph.length, `${page.familyId}/${page.countryIso3}`).toBeGreaterThan(40);
      const median = page.answer.medianFormatted;
      expect(page.answer.paragraph).toContain(median);
    }
  });

  it('slugs are stable and reversible', () => {
    expect(countrySlug('United Arab Emirates')).toBe('united-arab-emirates');
    expect(detailUrl('it-executive', 'australia')).toBe('/salary/it-executive/in/australia/');
  });
});

describe('seo structured data', () => {
  it('webApplication and organization JSON-LD have valid shapes', () => {
    const app = webAppLd();
    const org = organizationLd();
    expect(app['@type']).toBe('WebApplication');
    expect(app.name).toBe('ExpatRate');
    expect((app.applicationCategory as string).length).toBeGreaterThan(3);
    expect(org['@type']).toBe('Organization');
    expect(String(org.url)).toBe(SITE_URL + '/');
  });

  it('breadcrumb JSON-LD carries ordered positions and urls', () => {
    const ld = breadcrumbLd([
      { name: 'Home', url: SITE_URL + '/' },
      { name: 'Salaries in Australia', url: SITE_URL + '/salaries/australia/' },
    ]);
    expect(ld['@type']).toBe('BreadcrumbList');
    const items = ld.itemListElement as Array<{ position: number; item: string }>;
    expect(items).toHaveLength(2);
    expect(items[0].position).toBe(1);
    expect(items[0].item).toBe(SITE_URL + '/');
    expect(items[1].item).toBe(SITE_URL + '/salaries/australia/');
  });

  it('dataset JSON-LD describes the benchmark data with license and variables', () => {
    const ld = datasetLd();
    expect(ld['@type']).toBe('Dataset');
    expect(String(ld.license)).toContain('creativecommons.org');
    expect(JSON.stringify(ld.variableMeasured)).toContain('p75');
  });

  it('no HowTo or FAQPage markup is ever emitted', () => {
    const all = JSON.stringify([
      webAppLd(),
      organizationLd(),
      breadcrumbLd([{ name: 'x', url: SITE_URL + '/' }]),
      datasetLd(),
    ]);
    expect(all).not.toContain('HowTo');
    expect(all).not.toContain('FAQPage');
  });
});

describe('sitemap', () => {
  it('emits every url with reciprocal hreflang en and x-default', () => {
    const xml = sitemapXml([
      SITE_URL + '/',
      SITE_URL + '/salary/it-executive/in/australia/',
    ]);
    expect(xml).toContain('<urlset');
    expect(xml).toContain('/salary/it-executive/in/australia/');
    expect((xml.match(/hreflang="en"/g) ?? []).length).toBe(2);
    expect((xml.match(/hreflang="x-default"/g) ?? []).length).toBe(2);
    expect(xml.trim().endsWith('</urlset>')).toBe(true);
  });

  it('groups localized variants into reciprocal alternate sets', () => {
    const xml = sitemapXml([
      SITE_URL + '/salary/it-executive/in/australia/',
      SITE_URL + '/ar/salary/it-executive/in/australia/',
      SITE_URL + '/hi/salary/it-executive/in/australia/',
      SITE_URL + '/id/salary/it-executive/in/australia/',
      SITE_URL + '/es/salary/it-executive/in/australia/',
    ]);
    // The Arabic entry must declare itself as ar and link its en/hi/id/es siblings.
    const arEntry = xml.split('<url>').find((chunk) => chunk.includes('/ar/salary/it-executive/in/australia/')) ?? '';
    expect(arEntry).toContain(`hreflang="ar" href="${SITE_URL}/ar/salary/it-executive/in/australia/"`);
    expect(arEntry).toContain(`hreflang="en" href="${SITE_URL}/salary/it-executive/in/australia/"`);
    expect(arEntry).toContain(`hreflang="hi" href="${SITE_URL}/hi/salary/it-executive/in/australia/"`);
    expect(arEntry).toContain(`hreflang="id" href="${SITE_URL}/id/salary/it-executive/in/australia/"`);
    expect(arEntry).toContain(`hreflang="es" href="${SITE_URL}/es/salary/it-executive/in/australia/"`);
    expect(arEntry).toContain(`hreflang="x-default" href="${SITE_URL}/salary/it-executive/in/australia/"`);
    // No URL may ever claim the en alternate with a non-English href.
    const enToAr = xml.match(new RegExp(`hreflang="en" href="${SITE_URL}/ar/`, 'g'));
    expect(enToAr).toBeNull();
  });
});

it('alternateLinks builds the reciprocal six-way set for any path', () => {
  const links = alternateLinks('/salaries/australia/');
  expect(links).toEqual([
    { hreflang: 'en', href: 'https://expatrate.pages.dev/salaries/australia/' },
    { hreflang: 'ar', href: 'https://expatrate.pages.dev/ar/salaries/australia/' },
    { hreflang: 'hi', href: 'https://expatrate.pages.dev/hi/salaries/australia/' },
    { hreflang: 'id', href: 'https://expatrate.pages.dev/id/salaries/australia/' },
    { hreflang: 'es', href: 'https://expatrate.pages.dev/es/salaries/australia/' },
    { hreflang: 'x-default', href: 'https://expatrate.pages.dev/salaries/australia/' },
  ]);
});

it('the detail answer leads with the most senior level available', () => {
  const withSenior = detailPages().find((p) =>
    (p.levels as unknown as Array<{ level: string }>).some((c) => c.level === 'senior'),
  );
  expect(withSenior).toBeDefined();
  expect(String(withSenior!.answer.level).toLowerCase()).toBe('senior');
});

it('llms.txt states the live supported-country count', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const root = fileURLToPath(new URL('..', import.meta.url));
  const llms = readFileSync(`${root}public/llms.txt`, 'utf8');
  const countries = JSON.parse(readFileSync(`${root}src/data/countries.json`, 'utf8')) as unknown[];
  expect(llms).toContain(`${countries.length} countries`);
});
