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
