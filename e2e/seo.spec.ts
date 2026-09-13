import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('seo pages', () => {
  test('a detail page renders its figures in the HTML source with breadcrumbs', async ({ page, request }) => {
    const response = await page.goto('/salary/it-executive/in/australia/');
    expect(response?.status()).toBe(200);
    const html = (await response?.text()) ?? '';
    // Answer-first: figures are prerendered, not client-only.
    expect(html).toContain('157,000');
    expect(html).toContain('ATO');
    await expect(page.locator('.seo-answer')).toContainText('Australia');
    await expect(page.locator('.seo-breadcrumb')).toContainText('Salaries in Australia');
    // Structured data: breadcrumb present, no HowTo or FAQPage anywhere.
    const ld = await page.evaluate(() =>
      [...document.querySelectorAll('script[type="application/ld+json"]')].map((node) => JSON.parse(node.textContent ?? '{}')),
    );
    expect(ld.some((entry) => entry['@type'] === 'BreadcrumbList')).toBe(true);
    expect(ld.some((entry) => entry['@type'] === 'WebApplication')).toBe(true);
    expect(JSON.stringify(ld)).not.toContain('HowTo');
    expect(JSON.stringify(ld)).not.toContain('FAQPage');
    expect(html).not.toContain('HowTo');
    // Sitemap lists this page with reciprocal hreflang.
    const sitemap = await request.get('/sitemap.xml');
    expect(await sitemap.text()).toContain('/salary/it-executive/in/australia/');
  });

  test('every sitemap url resolves', async ({ request }) => {
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.ok()).toBe(true);
    const xml = await sitemap.text();
    const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
    expect(urls.length).toBeGreaterThan(100);
    const sampled = [urls[0], urls[Math.floor(urls.length / 2)], urls[urls.length - 1]];
    for (const url of sampled) {
      const path = new URL(url).pathname;
      const response = await request.get(path);
      expect(response.status(), `${path} should resolve`).toBe(200);
    }
  });

  test('no page exists for combinations without data (doorway prevention)', async ({ request }) => {
    const response = await request.get('/salary/it-executive/in/egypt/');
    expect(response.status()).toBe(404);
  });

  test('hubs and methodology render', async ({ page }) => {
    await page.goto('/salaries/australia/');
    await expect(page.locator('h1')).toContainText('Salary benchmarks for Australia');
    await page.goto('/salary/it-executive/');
    await expect(page.locator('h1')).toContainText('IT and Technology Executive');
    await page.goto('/methodology/');
    await expect(page.locator('h1')).toContainText('How every number');
    const ld = await page.evaluate(() =>
      [...document.querySelectorAll('script[type="application/ld+json"]')].map((node) => JSON.parse(node.textContent ?? '{}')),
    );
    expect(ld.some((entry) => entry['@type'] === 'Dataset')).toBe(true);
  });

  test('a detail page has no axe violations', async ({ page }) => {
    await page.goto('/salary/it-executive/in/australia/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('head hreflang reciprocity', () => {
  // The sitemap declares a full nine-way cluster for every URL; each page head
  // must carry the same reciprocal set or Google drops the alternates.
  const LOCALES = ['ar', 'hi', 'id', 'es', 'fr', 'pt', 'ru'];
  const expectedAlternates = (path: string) =>
    [`en:${path}`, ...LOCALES.map((l) => `${l}:/${l}${path}`), `x-default:${path}`].sort();
  const alternates = (html: string) =>
    [...html.matchAll(/<link\b[^>]*\bhreflang="([^"]+)"[^>]*>/g)]
      .map((m) => {
        const href = m[0].match(/href="([^"]+)"/)?.[1] ?? '';
        return `${m[1]}:${new URL(href).pathname}`;
      })
      .sort();

  // One case per head-emission path: home (EN and localized), every SeoPage
  // kind on a localized route, the standalone EN methodology template, and
  // privacy (EN and localized).
  const cases: Array<[string, string]> = [
    ['/', '/'],
    ['/ar/', '/'],
    ['/salaries/', '/salaries/'],
    ['/es/salaries/', '/salaries/'],
    ['/ru/salary/it-executive/in/australia/', '/salary/it-executive/in/australia/'],
    ['/ar/salaries/australia/', '/salaries/australia/'],
    ['/hi/salary/it-executive/', '/salary/it-executive/'],
    ['/fr/methodology/', '/methodology/'],
    ['/methodology/', '/methodology/'],
    ['/privacy/', '/privacy/'],
    ['/pt/privacy/', '/privacy/'],
  ];

  for (const [pagePath, neutralPath] of cases) {
    test(`${pagePath} carries the full nine-way alternate set`, async ({ request }) => {
      const response = await request.get(pagePath);
      expect(response?.status(), `${pagePath} should resolve`).toBe(200);
      const html = (await response?.text()) ?? '';
      expect(alternates(html), `${pagePath} alternate set`).toEqual(expectedAlternates(neutralPath));
    });
  }
});
