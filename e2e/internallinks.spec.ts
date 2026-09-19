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

  test('the footer nav ships on every page type', async ({ page }) => {
    for (const path of [
      '/',
      '/salaries/',
      '/salaries/germany/',
      '/salary/it-executive/in/germany/',
      '/methodology/',
      '/privacy/',
    ]) {
      await page.goto(path);
      const links = page.locator('footer .footer-nav a');
      expect(await links.count(), `${path} footer nav link count`).toBe(3);
      await expect(
        page.locator('footer .footer-nav a[href$="/methodology/"]'),
        `${path} methodology link`,
      ).toBeVisible();
      await expect(
        page.locator('footer .footer-nav a[href$="/salaries/"]'),
        `${path} salaries link`,
      ).toBeVisible();
      await expect(
        page.locator('footer .footer-nav a[href$="/privacy/"]'),
        `${path} privacy link`,
      ).toBeVisible();
    }
  });

  test('localized inner pages localize the footer nav', async ({ page }) => {
    await page.goto('/es/salaries/germany/');
    await expect(page.locator('footer .footer-nav a[href="/es/methodology/"]')).toBeVisible();
    await expect(page.locator('footer .footer-nav a[href="/es/salaries/"]')).toBeVisible();
    await expect(page.locator('footer .footer-nav a[href="/es/privacy/"]')).toBeVisible();
    await page.goto('/ar/');
    await expect(page.locator('footer .footer-nav a[href="/ar/privacy/"]')).toBeVisible();
  });

  test('footer links render underlined and markets links join the site link language', async ({
    page,
  }) => {
    await page.goto('/');
    const footerDeco = await page
      .locator('footer .footer-nav a')
      .first()
      .evaluate((el) => getComputedStyle(el).textDecorationLine);
    expect(footerDeco).toContain('underline');
    const marketStyles = await page
      .locator('.home-markets-list a')
      .first()
      .evaluate((el) => {
        const cs = getComputedStyle(el);
        return { color: cs.color, weight: cs.fontWeight, deco: cs.textDecorationLine };
      });
    expect(marketStyles.color).toBe('rgb(15, 118, 110)');
    expect(marketStyles.weight).toBe('600');
    expect(marketStyles.deco).toBe('none');
    const ruleText = await page.evaluate(() => {
      const found: string[] = [];
      const walk = (rules: CSSRuleList | undefined) => {
        for (const rule of rules ?? []) {
          const text = rule.cssText ?? '';
          if (text.includes('.home-markets-list a:hover') || text.startsWith('a:focus-visible')) {
            found.push(text);
          }
          const nested = (rule as { cssRules?: CSSRuleList }).cssRules;
          if (nested) walk(nested);
        }
      };
      for (const sheet of document.styleSheets) {
        try {
          walk(sheet.cssRules);
        } catch {
          continue;
        }
      }
      return found.join(' | ');
    });
    expect(ruleText).toContain('underline');
    expect(ruleText).toContain('var(--ring)');
  });

  test('the markets row is a real list with nowrap items and muted separators', async ({
    page,
  }) => {
    await page.goto('/');
    const list = page.locator('.home-markets-list');
    expect(await list.locator('li').count()).toBe(10);
    const data = await list.evaluate((ul) => {
      const items = ul.querySelectorAll('li');
      const first = getComputedStyle(items[0]);
      const sep = getComputedStyle(items[1], '::before');
      return { display: first.display, nowrap: first.whiteSpace, sepContent: sep.content };
    });
    expect(data.display).toBe('inline');
    expect(data.nowrap).toBe('nowrap');
    expect(data.sepContent).toContain('·');
    const sectionWidth = await page
      .locator('.home-markets')
      .evaluate((el) => getComputedStyle(el).maxInlineSize);
    expect(sectionWidth).toBe('736px');
    await page.goto('/ar/');
    expect(await page.locator('.home-markets-list li').count()).toBe(10);
  });
});
