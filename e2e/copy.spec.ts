import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const benchmarkCountries = (() => {
  const matrix = JSON.parse(
    readFileSync(new URL('../src/data/benchmarks.json', import.meta.url), 'utf8'),
  );
  // Only countries with real rows: insufficient-data markers are not coverage.
  const withData = matrix.entries.filter(
    (e: { status?: string }) => e.status !== 'insufficient_data',
  );
  return new Set(withData.map((e: { country: string }) => e.country)).size;
})();

test.describe('copy and footer', () => {
  test('footer separates the data disclosure from navigation and rights', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('.site-footer');
    await expect(footer).toBeVisible();
    // Navigation lives in its own element, not glued inside the data paragraph.
    await expect(footer.locator('p a')).toHaveCount(0);
    const nav = footer.locator('nav');
    await expect(nav.locator('a')).toHaveCount(3);
    await expect(footer.locator('p').first()).toContainText('frankfurter.dev');
    await expect(footer).toContainText(`benchmarks for ${benchmarkCountries} destination countries`);
    await expect(footer).toContainText('© 2026 ExpatRate');
    await expect(footer).toContainText(
      'Estimates are indicative only and are not financial, tax, or legal advice.',
    );
  });

  test('home title tag matches the h1 casing', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('ExpatRate: Know what to quote');
  });

  test('saved indicator explains where, and bands are plain ranges', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#stepIndicator', { state: 'visible' });
    await expect(page.locator('#autosave')).toContainText('browser');
    const option = page.locator('#experienceBand option[value="15+"]');
    await expect(option).toHaveText('15+ years');
    await expect(page.locator('#experienceBand option[value="6-9"]')).toHaveText(
      '6-9 years',
    );
  });

  test('resume dropzone is marked optional and the role label has no parenthetical', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForSelector('.wz-dropzone', { state: 'visible' });
    await expect(page.locator('.wz-dropzone')).toContainText('(optional)');
    await expect(page.locator('label[for="roleFamily"]')).toHaveText('Role family');
  });

  test('trust bullet scopes coverage to the floor and renders its counts', async ({ page }) => {
    await page.goto('/');
    const bullet = page.locator('.hero-trust li').nth(1);
    await expect(bullet).toContainText(/floor/i);
    await expect(bullet).toContainText('role families');
    await expect(bullet).not.toContainText('{');
    await page.goto('/ar/');
    await expect(page.locator('.hero-trust li').nth(1)).not.toContainText('{');
  });

  test('arabic footer keeps the structure, stays in locale, drops corridor jargon', async ({
    page,
  }) => {
    await page.goto('/ar/');
    const footer = page.locator('.site-footer');
    await expect(footer.locator('p a')).toHaveCount(0);
    await expect(footer.locator('nav a')).toHaveCount(3);
    await expect(footer.locator('nav a').first()).toHaveAttribute(
      'href',
      '/ar/methodology/',
    );
    await expect(footer).not.toContainText('الممرات');
    await expect(footer).toContainText('دولة وجهة');
    await expect(footer).toContainText('© 2026 ExpatRate');
  });
});
