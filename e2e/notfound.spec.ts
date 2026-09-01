import { test, expect } from '@playwright/test';

test('unknown paths return a real 404 status with the 404 page', async ({ request }) => {
  const response = await request.get('/zzz-no-such-page');
  expect(response.status()).toBe(404);
  const body = await response.text();
  expect(body).toContain('Page not found');
  expect(body).toContain('ExpatRate');
});
