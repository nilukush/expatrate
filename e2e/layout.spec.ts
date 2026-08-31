import { test, expect } from '@playwright/test';

test.describe('layout composition', () => {
  test('hero, wizard, and footer share one center axis and nothing overflows', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.waitForSelector('#stepIndicator', { state: 'visible' });

    const centers = await page.evaluate(() => {
      const pick = (sel: string) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return r.left + r.width / 2;
      };
      return {
        hero: pick('.hero'),
        wizard: pick('.wizard-rail'),
        footer: pick('.site-footer'),
        halfViewport: innerWidth / 2,
        docWidth: document.documentElement.scrollWidth,
        viewport: innerWidth,
      };
    });

    expect(centers.hero).not.toBeNull();
    expect(centers.wizard).not.toBeNull();
    expect(centers.footer).not.toBeNull();
    expect(Math.abs(centers.hero! - centers.halfViewport)).toBeLessThanOrEqual(1);
    expect(Math.abs(centers.wizard! - centers.halfViewport)).toBeLessThanOrEqual(1);
    expect(Math.abs(centers.footer! - centers.halfViewport)).toBeLessThanOrEqual(1);
    expect(centers.docWidth).toBeLessThanOrEqual(centers.viewport);
  });
});
