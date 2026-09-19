import { test, expect } from '@playwright/test';

test.describe('internal linking', () => {
  test('the English salaries hub links every role family hub', async ({ page }) => {
    await page.goto('/salaries/');
    const hubLinks = page.locator('main a[href^="/salary/"]');
    expect(await hubLinks.count()).toBe(16);
    const swe = page.locator('main a[href="/salary/software-engineering/"]');
    await expect(swe).toContainText('Software Engineering');
  });

  test('localized salaries hubs link the localized family hubs', async ({ page }) => {
    for (const loc of ['es', 'ar']) {
      await page.goto(`/${loc}/salaries/`);
      const hubLinks = page.locator(`main a[href^="/${loc}/salary/"]`);
      expect(await hubLinks.count()).toBe(16);
    }
  });

  test('the homepage shows the popular markets row', async ({ page }) => {
    await page.goto('/');
    const links = page.locator('.home-markets a');
    expect(await links.count()).toBe(10);
    await expect(page.locator('.home-markets h2')).toContainText('Popular markets');
    await expect(page.locator('.home-markets a[href="/salaries/germany/"]')).toBeVisible();
  });

  test('localized homepages localize the popular markets row', async ({ page }) => {
    await page.goto('/es/');
    const links = page.locator('.home-markets a[href^="/es/salaries/"]');
    expect(await links.count()).toBe(10);
  });

  test('every new internal link target resolves', async ({ request }) => {
    for (const path of [
      '/salary/software-engineering/',
      '/es/salary/finance-and-accounting/',
      '/ar/salary/healthcare/',
      '/salaries/germany/',
      '/es/salaries/united-states/',
    ]) {
      const response = await request.get(path);
      expect(response.status(), `${path} should resolve`).toBe(200);
    }
  });
});
