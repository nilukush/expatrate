import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('smoke', () => {
  test('home responds 200 and shows the product name', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page.locator('.brand-name')).toHaveText('ExpatRate');
    await expect(page.locator('h1')).toContainText('quote');
  });

  test('home has no axe violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});

test('the home trust strip states the data dates', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.hero-trust')).toContainText('Data as of');
  await expect(page.locator('.hero-trust')).toContainText('2026');
});

test('hub pages carry og:url and a real og:description', async ({ page }) => {
  await page.goto('/salaries/');
  const ogUrl = await page.getAttribute('meta[property="og:url"]', 'content');
  const ogDesc = await page.getAttribute('meta[property="og:description"]', 'content');
  const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content');
  expect(ogUrl).toContain('/salaries/');
  expect(ogDesc).toBeTruthy();
  expect(ogDesc).not.toBe(ogTitle);
});
