import { test, expect } from '@playwright/test';

test.describe('layout composition', () => {
  test('header, hero, markets, and footer share one column axis and nothing overflows', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.waitForSelector('#stepIndicator', { state: 'visible' });

    const geo = await page.evaluate(() => {
      const pick = (sel: string) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { left: r.left, center: r.left + r.width / 2 };
      };
      return {
        header: pick('.site-header'),
        hero: pick('.hero'),
        wizard: pick('.wizard-rail'),
        markets: pick('.home-markets'),
        footer: pick('.site-footer'),
        halfViewport: innerWidth / 2,
        docWidth: document.documentElement.scrollWidth,
        viewport: innerWidth,
      };
    });

    expect(geo.header).not.toBeNull();
    expect(geo.hero).not.toBeNull();
    expect(geo.wizard).not.toBeNull();
    expect(geo.markets).not.toBeNull();
    expect(geo.footer).not.toBeNull();
    expect(Math.abs(geo.header!.left - geo.hero!.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(geo.markets!.left - geo.hero!.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(geo.footer!.left - geo.hero!.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(geo.header!.center - geo.halfViewport)).toBeLessThanOrEqual(1);
    expect(Math.abs(geo.hero!.center - geo.halfViewport)).toBeLessThanOrEqual(1);
    expect(Math.abs(geo.wizard!.center - geo.halfViewport)).toBeLessThanOrEqual(1);
    expect(Math.abs(geo.footer!.center - geo.halfViewport)).toBeLessThanOrEqual(1);
    expect(geo.docWidth).toBeLessThanOrEqual(geo.viewport);
  });
});
