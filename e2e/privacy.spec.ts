import { test, expect } from '@playwright/test';

test.describe('privacy and sharing polish', () => {
  test('privacy page exists and promises no data collection beyond anonymous analytics', async ({ page }) => {
    const response = await page.goto('/privacy/');
    expect(response?.status()).toBe(200);
    const body = await page.textContent('body');
    expect(body).toContain('never uploaded');
    expect(body).toContain('cookie-free');
    expect(body).toContain('no account');
    expect(body).toContain('© 2026 ExpatRate');
    const arAlternate = page.locator('link[rel="alternate"][hreflang="ar"]');
    await expect(arAlternate).toHaveAttribute('href', 'https://expatrate.pages.dev/ar/privacy/');
  });

  test('privacy is fully localized in arabic and hindi', async ({ page }) => {
    const ar = await page.goto('/ar/privacy/');
    expect(ar?.status()).toBe(200);
    let body = await page.textContent('body');
    expect(body).toContain('الخصوصية');
    expect(body).toContain('لا يجمع');
    expect(body).not.toContain('cookie-free');
    expect(await page.getAttribute('html', 'dir')).toBe('rtl');
    const hi = await page.goto('/hi/privacy/');
    expect(hi?.status()).toBe(200);
    body = await page.textContent('body');
    expect(body).toContain('गोपनीयता');
    expect(body).not.toContain('cookie-free');
  });

  test('footer privacy link follows the reader locale', async ({ page }) => {
    await page.goto('/ar/');
    await expect(page.locator('.footer-nav a', { hasText: 'الخصوصية' })).toHaveAttribute(
      'href',
      '/ar/privacy/',
    );
  });

  test('OG tags present on every public page type with a summary image', async ({ page }) => {
    for (const path of ['/', '/ar/', '/salary/it-executive/in/australia/', '/methodology/']) {
      await page.goto(path);
      const og = await page.evaluate(() => ({
        title: document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
        image: document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
        card: document.querySelector('meta[name="twitter:card"]')?.getAttribute('content'),
      }));
      expect(og.title, `${path} og:title`).toBeTruthy();
      expect(og.image, `${path} og:image`).toContain('og-default.png');
      expect(og.card, `${path} twitter:card`).toBe('summary_large_image');
    }
  });

  test('no tracking cookies are set on a clean visit', async ({ context, page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    const cookies = await context.cookies();
    expect(cookies.filter((c) => !c.name.startsWith('__cf'))).toEqual([]);
  });

  test('results disclaimer persists with FX date and the privacy link is reachable', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#stepIndicator');
    await page.selectOption('#roleFamily', 'it-executive');
    await page.selectOption('#experienceBand', '15+');
    await page.click('#nextBtn');
    await page.selectOption('#originCountry', 'ARE');
    await page.fill('#salaryAmount', '53871');
    await page.check('#salaryConfirmed');
    await page.click('#nextBtn');
    await page.selectOption('#targetCountry', 'ARE');
    await page.click('#nextBtn');
    await page.click('#skipFamily');
    await page.click('#seeQuote');
    await expect(page.locator('#resultsHeading')).toBeVisible();
    await expect(page.locator('#fxLine')).toContainText('Rates:');
    const privacy = page.locator('footer a[href="/privacy/"]');
    await expect(privacy).toBeVisible();
  });
});
