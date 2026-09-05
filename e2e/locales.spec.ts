import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('locales', () => {
  test('the Arabic home renders RTL with the Arabic font and Arabic UI strings', async ({ page }) => {
    const response = await page.goto('/ar/');
    expect(response?.status()).toBe(200);
    expect(await page.getAttribute('html', 'dir')).toBe('rtl');
    expect(await page.getAttribute('html', 'lang')).toBe('ar');
    // Arabic subset preloaded, Latin subset preload absent.
    const preloads = await page.$$eval('link[rel=preload][as=font]', (nodes) => nodes.map((n) => n.getAttribute('href')));
    expect(preloads).toContain('/fonts/noto-sans-arabic-var.woff2');
    expect(preloads.some((href) => href?.includes('inter-latin'))).toBe(false);
    // Dictionary-driven chrome resolves in Arabic (no English leak on primary buttons).
    await page.waitForSelector('#stepIndicator');
    await expect(page.locator('#stepIndicator')).toContainText('الخطوة 1 من 5');
    await expect(page.locator('#nextBtn')).toContainText('متابعة');
    await expect(page.locator('.hero-title')).toContainText('تذكر');
    // Reciprocal hreflang set.
    const alts = await page.$$eval('link[rel=alternate]', (nodes) => nodes.map((n) => ({ hreflang: n.getAttribute('hreflang'), href: n.getAttribute('href') })));
    expect(alts).toEqual(expect.arrayContaining([
      { hreflang: 'en', href: expect.stringContaining('/') },
      { hreflang: 'ar', href: expect.stringContaining('/ar/') },
      { hreflang: 'hi', href: expect.stringContaining('/hi/') },
      { hreflang: 'id', href: expect.stringContaining('/id/') },
      { hreflang: 'x-default', href: expect.stringMatching(/pages\.dev\/$/) },
    ]));
    // RTL layout uses logical properties: no horizontal overflow.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('the Hindi home renders with Hindi UI strings and lakh numerals in results', async ({ page }) => {
    await page.goto('/hi/');
    expect(await page.getAttribute('html', 'lang')).toBe('hi');
    expect(await page.getAttribute('html', 'dir')).toBe('ltr');
    await page.waitForSelector('#stepIndicator');
    await expect(page.locator('#stepIndicator')).toContainText('चरण 1 / 5');
    await expect(page.locator('#nextBtn')).toContainText('आगे बढ़ें');
    // Full flow: amounts must format with hi-IN grouping (Devanagari digits, lakh separators).
    await page.selectOption('#roleFamily', 'it-executive');
    await page.selectOption('#experienceBand', '15+');
    await page.click('#nextBtn');
    await page.selectOption('#originCountry', 'IND');
    await page.fill('#salaryAmount', '300000');
    await page.check('#salaryConfirmed');
    await page.click('#nextBtn');
    await page.selectOption('#targetCountry', 'ARE');
    await page.click('#nextBtn');
    await page.click('#skipFamily');
    await page.click('#seeQuote');
    await expect(page.locator('#resultsHeading')).toBeVisible();
    // hi-IN lakh grouping (3,00,000 pattern) in the basis and quote figures.
    const basis = await page.locator('#basisLine').textContent();
    expect(basis).toMatch(/3,00,000/);
    const hero = await page.locator('#quoteTarget').textContent();
    expect(hero).toMatch(/[\d,]{6,}/);
  });

  test('the Indonesian home renders with Indonesian UI strings and Latin font', async ({ page }) => {
    const response = await page.goto('/id/');
    expect(response?.status()).toBe(200);
    expect(await page.getAttribute('html', 'lang')).toBe('id');
    expect(await page.getAttribute('html', 'dir')).toBe('ltr');
    // Indonesian uses the Latin subset, the same as English.
    const preloads = await page.$$eval('link[rel=preload][as=font]', (nodes) => nodes.map((n) => n.getAttribute('href')));
    expect(preloads).toContain('/fonts/inter-latin-var.woff2');
    await page.waitForSelector('#stepIndicator');
    await expect(page.locator('#stepIndicator')).toContainText('Langkah 1 dari 5');
    await expect(page.locator('#nextBtn')).toContainText('Lanjut');
    await expect(page.locator('.hero-title')).toContainText('ajukan');
    await expect(page.locator('#autosave')).toContainText('Tersimpan di browser ini');
    const roleOptions = await page.$$eval('#roleFamily option', (nodes) => nodes.map((n) => n.textContent ?? ''));
    expect(roleOptions).toContain('Rekayasa Perangkat Lunak');
    expect(roleOptions).not.toContain('Software Engineering');
  });

  test('the Arabic home has no axe violations in RTL', async ({ page }) => {
    await page.goto('/ar/');
    await page.waitForSelector('#stepIndicator');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('dropdown contents and the interpretation line are localized, not English', async ({ page }) => {
    await page.goto('/ar/');
    await page.waitForSelector('#stepIndicator');
    const roleOptions = await page.$$eval('#roleFamily option', (nodes) => nodes.map((n) => n.textContent ?? ''));
    expect(roleOptions).toContain('هندسة البرمجيات');
    expect(roleOptions).not.toContain('Software Engineering');
    const expOptions = await page.$$eval('#experienceBand option', (nodes) => nodes.map((n) => n.textContent ?? ''));
    expect(expOptions).toContain('+15 سنوات');
    await page.selectOption('#roleFamily', 'it-executive');
    await page.selectOption('#experienceBand', '15+');
    await page.click('#nextBtn');
    await page.selectOption('#originCountry', 'ARE');
    await page.fill('#salaryAmount', '53871');
    const interpretation = await page.locator('#interpretation').textContent();
    expect(interpretation).toContain('فهمنا');
    expect(interpretation).not.toContain('We understood');
    const originOptions = await page.$$eval('#originCountry option', (nodes) => nodes.map((n) => n.textContent ?? ''));
    expect(originOptions).toContain('الإمارات العربية المتحدة');
  });

  test('the language switcher navigates between locales', async ({ page }) => {
    await page.goto('/ar/');
    await page.click('.lang-switch a[href="/hi/"]');
    await page.waitForSelector('#stepIndicator');
    expect(await page.getAttribute('html', 'lang')).toBe('hi');
    await page.click('.lang-switch a[href="/"]');
    await page.waitForSelector('#stepIndicator');
    expect(await page.getAttribute('html', 'lang')).toBe('en');
    await expect(page.locator('#nextBtn')).toContainText('Continue');
  });
});

test('the EN switcher on the Arabic methodology page stays on methodology', async ({ page }) => {
  await page.goto('/ar/methodology/');
  await page.click('.lang-switch:has-text("EN") >> text=EN');
  await expect(page).toHaveURL(/\/methodology\/$/);
});

test('EN programmatic pages emit the reciprocal hreflang set', async ({ page }) => {
  await page.goto('/salaries/australia/');
  const alts = await page.$$eval('link[rel=alternate]', (nodes) =>
    nodes.map((n) => ({ hreflang: n.getAttribute('hreflang'), href: n.getAttribute('href') })));
  expect(alts).toEqual(expect.arrayContaining([
    { hreflang: 'en', href: expect.stringContaining('/salaries/australia/') },
    { hreflang: 'ar', href: expect.stringContaining('/ar/salaries/australia/') },
    { hreflang: 'hi', href: expect.stringContaining('/hi/salaries/australia/') },
    { hreflang: 'id', href: expect.stringContaining('/id/salaries/australia/') },
    { hreflang: 'x-default', href: expect.stringContaining('/salaries/australia/') },
  ]));
  await expect(page.locator('.seo-answer').first()).not.toContainText('{');
});
