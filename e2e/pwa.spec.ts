import { expect, test } from '@playwright/test';

test('manifest, service worker, and theme color are served on the home page', async ({ page }) => {
  const manifest = await page.request.get('/manifest.webmanifest');
  expect(manifest.status()).toBe(200);
  expect((await manifest.json()).name).toBe('ExpatRate');
  const sw = await page.request.get('/sw.js');
  expect(sw.status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);
});

test('a visited page reloads offline and an unvisited route shows the offline page', async ({ page }) => {
  await page.goto('/methodology/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  // One online reload while controlled so the navigation lands in the runtime cache.
  await page.reload();
  await page.context().setOffline(true);
  await page.reload();
  await expect(page.locator('main')).toContainText('20 percent');
  await page.goto('/privacy/');
  await expect(page.locator('h1')).toContainText('offline');
  await page.context().setOffline(false);
});
