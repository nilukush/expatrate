import { test, expect } from '@playwright/test';

test.describe('job URL import', () => {
  test('imports a Greenhouse job link into the description box and its salary is detected', async ({ page }) => {
    await page.route('**/boards-api.greenhouse.io/v1/boards/*/jobs/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          title: 'Account Executive, FedCiv',
          location: { name: 'Washington DC' },
          content:
            '<h2>Compensation</h2><p>The expected salary range for this role is $269,000 - $370,000.</p>',
        }),
      });
    });
    await page.goto('/');
    await page.fill('#jdUrl', 'https://boards.greenhouse.io/cloudflare/jobs/7695702');
    await page.click('#jdFetch');
    const value = await page.inputValue('#jdText');
    expect(value).toContain('Account Executive, FedCiv');
    expect(value).toContain('$269,000');
    await expect(page.locator('#jdImportNote')).toBeVisible();
    await expect(page.locator('#jdImportNote')).toContainText('Greenhouse');
  });

  test('an unsupported link gets an honest note and fills nothing', async ({ page }) => {
    await page.goto('/');
    await page.fill('#jdUrl', 'https://www.acme.com/careers/123');
    await page.click('#jdFetch');
    await expect(page.locator('#jdImportNote')).toBeVisible();
    expect(await page.inputValue('#jdText')).toBe('');
  });
});
