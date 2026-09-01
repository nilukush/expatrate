import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function waitForWizard(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForSelector('#stepIndicator', { state: 'visible' });
}

async function fillHappyPathToResults(page: import('@playwright/test').Page) {
  await waitForWizard(page);
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
}

test.describe('wizard', () => {
  test('full happy path reaches a result with the persona numbers', async ({ page }) => {
    await fillHappyPathToResults(page);
    await expect(page.locator('#quoteTarget')).toContainText('85,500');
    await expect(page.locator('#quoteTarget')).toContainText('per month');
    await expect(page.locator('#floorLine')).toContainText('53,871');
    await expect(page.locator('#confidenceLine')).toContainText('Medium');
    await expect(page.locator('#basisLine')).toContainText('646,452');
  });

  test('the range bar marks the prior salary and a print action exists', async ({ page }) => {
    await fillHappyPathToResults(page);
    await expect(page.locator('.wz-range-tick-prior')).toBeVisible();
    await expect(page.locator('.wz-range-legend')).toContainText('you today');
    await expect(page.locator('.wz-range-legend')).toContainText('below the P25');
    await expect(page.locator('#printBtn')).toBeVisible();
  });

  test('back navigation preserves every value', async ({ page }) => {
    await waitForWizard(page);
    await page.selectOption('#roleFamily', 'it-executive');
    await page.selectOption('#experienceBand', '15+');
    await page.click('#nextBtn');
    await page.selectOption('#originCountry', 'ARE');
    await page.fill('#salaryAmount', '53871');
    await page.check('#salaryConfirmed');
    await page.click('#nextBtn');
    await page.click('#backBtn');
    await page.click('#backBtn');
    await expect(page.locator('#roleFamily')).toHaveValue('it-executive');
    await expect(page.locator('#experienceBand')).toHaveValue('15+');
    await page.click('#nextBtn');
    await expect(page.locator('#originCountry')).toHaveValue('ARE');
    await expect(page.locator('#salaryAmount')).toHaveValue('53871');
    expect(await page.isChecked('#salaryConfirmed')).toBe(true);
  });

  test('a reload lands on step 1 with values kept and a one-click resume', async ({ page }) => {
    await waitForWizard(page);
    await page.selectOption('#roleFamily', 'software-engineering');
    await page.selectOption('#experienceBand', '6-9');
    await page.click('#nextBtn');
    await page.selectOption('#originCountry', 'GBR');
    await page.fill('#salaryAmount', '120000');
    await page.reload();
    await waitForWizard(page);
    await expect(page.locator('#stepIndicator')).toContainText('Step 1 of 5');
    await expect(page.locator('#roleFamily')).toHaveValue('software-engineering');
    await expect(page.locator('#experienceBand')).toHaveValue('6-9');
    await page.click('#resumeBtn');
    await expect(page.locator('#stepIndicator')).toContainText('Step 2 of 5');
    await expect(page.locator('#originCountry')).toHaveValue('GBR');
    await expect(page.locator('#salaryAmount')).toHaveValue('120000');
  });

  test('a stated salary range in the JD is compared with the floor', async ({ page }) => {
    await waitForWizard(page);
    await page.selectOption('#roleFamily', 'it-executive');
    await page.selectOption('#experienceBand', '15+');
    await page.fill('#jdText', 'Dabble hires a CTO. Salary AUD 350,000 to 380,000 per annum plus super.');
    await page.click('#nextBtn');
    await page.selectOption('#originCountry', 'ARE');
    await page.fill('#salaryAmount', '53871');
    await page.check('#salaryConfirmed');
    await page.click('#nextBtn');
    await page.selectOption('#targetCountry', 'AUS');
    await page.click('#nextBtn');
    await page.click('#skipFamily');
    await page.click('#seeQuote');
    await expect(page.locator('#resultsHeading')).toBeVisible();
    const card = page.locator('#employerCard');
    await expect(card).toContainText('350,000');
    await expect(card).toContainText('below your floor');
    // When the floor sits above the whole market, the card reports the cut,
    // not an unreachable peer number next to the quote.
    const floorCard = page.locator('.wz-card', { has: page.locator('#floorLine') });
    await expect(floorCard).toContainText('costs you');
    await expect(page.locator('#floorLine')).toContainText('% less than your life today');
  });

  test('the salary confirmation step blocks progression until confirmed', async ({ page }) => {
    await waitForWizard(page);
    await page.selectOption('#roleFamily', 'it-executive');
    await page.selectOption('#experienceBand', '15+');
    await page.click('#nextBtn');
    await page.selectOption('#originCountry', 'ARE');
    await page.fill('#salaryAmount', '53871');
    await page.click('#nextBtn');
    await expect(page.locator('#stepIndicator')).toContainText('Step 2 of 5');
    await expect(page.locator('#errorSummary')).toBeVisible();
    await expect(page.locator('#errorSummary')).toBeFocused();
    await page.check('#salaryConfirmed');
    await page.click('#nextBtn');
    await expect(page.locator('#stepIndicator')).toContainText('Step 3 of 5');
  });

  test('the interpretation line states monthly, currency, and basis correctly', async ({ page }) => {
    await waitForWizard(page);
    await page.selectOption('#roleFamily', 'it-executive');
    await page.selectOption('#experienceBand', '15+');
    await page.click('#nextBtn');
    await page.selectOption('#originCountry', 'ARE');
    await page.fill('#salaryAmount', '53871');
    await expect(page.locator('#interpretation')).toContainText('AED 53,871 per month');
    await expect(page.locator('#interpretation')).toContainText('AED 646,452 per year');
    await page.check('#basisAnnual');
    await expect(page.locator('#interpretation')).toContainText('AED 53871 per year'.replace('53871', '53,871'));
  });

  test('choosing remote for a foreign company reveals the employer country field', async ({ page }) => {
    await waitForWizard(page);
    await page.selectOption('#roleFamily', 'it-executive');
    await page.selectOption('#experienceBand', '15+');
    await page.click('#nextBtn');
    await page.selectOption('#originCountry', 'ARE');
    await page.fill('#salaryAmount', '53871');
    await page.check('#salaryConfirmed');
    await page.click('#nextBtn');
    await expect(page.locator('#employerCountry')).toBeHidden();
    await page.check('#wrRemoteForeign');
    await expect(page.locator('#employerCountry')).toBeVisible();
    await page.selectOption('#employerCountry', 'USA');
  });

  test('the family context step is skippable and skipping changes no base number', async ({ page }) => {
    await fillHappyPathToResults(page);
    const quote = await page.locator('#quoteTarget').textContent();
    await page.click('#startOver');
    await page.selectOption('#roleFamily', 'it-executive');
    await page.selectOption('#experienceBand', '15+');
    await page.click('#nextBtn');
    await page.selectOption('#originCountry', 'ARE');
    await page.fill('#salaryAmount', '53871');
    await page.check('#salaryConfirmed');
    await page.click('#nextBtn');
    await page.selectOption('#targetCountry', 'ARE');
    await page.click('#nextBtn');
    await page.selectOption('#dependents', '2');
    await page.selectOption('#schoolAgeChildren', '1');
    await page.click('#skipFamily');
    await page.click('#seeQuote');
    await expect(await page.locator('#quoteTarget').textContent()).toBe(quote);
  });

  test('focus moves to the new step heading on step change', async ({ page }) => {
    await waitForWizard(page);
    await page.selectOption('#roleFamily', 'it-executive');
    await page.selectOption('#experienceBand', '15+');
    await page.click('#nextBtn');
    await expect(page.locator('#stepHeading')).toBeFocused();
  });

  test('errors on an empty required field show a summary that receives focus and links the field', async ({ page }) => {
    await waitForWizard(page);
    await page.click('#nextBtn');
    await expect(page.locator('#errorSummary')).toBeVisible();
    await expect(page.locator('#errorSummary')).toBeFocused();
    await expect(page.locator('#errorSummary a').first()).toHaveAttribute('href', '#roleFamily');
    await page.selectOption('#roleFamily', 'it-executive');
    await page.selectOption('#experienceBand', '15+');
    await page.click('#nextBtn');
    await expect(page.locator('#stepIndicator')).toContainText('Step 2 of 5');
    await expect(page.locator('#errorSummary')).toBeHidden();
  });

  test('the whole flow completes with the keyboard alone', async ({ page }) => {
    await waitForWizard(page);
    await page.locator('#roleFamily').focus();
    await page.keyboard.press('I');
    await page.locator('#experienceBand').focus();
    await page.keyboard.press('1');
    await page.keyboard.press('5');
    await page.locator('#nextBtn').focus();
    await page.keyboard.press('Enter');
    await page.locator('#originCountry').focus();
    for (const key of ['U', 'n', 'i', 't', 'e', 'd', ' ', 'A']) {
      await page.keyboard.press(key);
    }
    await page.locator('#salaryAmount').focus();
    await page.keyboard.type('53871');
    await page.locator('#salaryConfirmed').focus();
    await page.keyboard.press('Space');
    await page.locator('#nextBtn').focus();
    await page.keyboard.press('Enter');
    await page.locator('#targetCountry').focus();
    for (const key of ['U', 'n', 'i', 't', 'e', 'd', ' ', 'A']) {
      await page.keyboard.press(key);
    }
    await page.locator('#nextBtn').focus();
    await page.keyboard.press('Enter');
    await page.locator('#skipFamily').focus();
    await page.keyboard.press('Enter');
    await page.locator('#seeQuote').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#quoteTarget')).toContainText('85,500');
  });

  test('has no axe violations on any step', async ({ page }) => {
    await page.goto('/');
    await waitForWizard(page);
    await page.selectOption('#roleFamily', 'it-executive');
    await page.selectOption('#experienceBand', '15+');
    const stepsSeen = [] as string[];
    for (let step = 1; step <= 5; step += 1) {
      const indicator = await page.locator('#stepIndicator').textContent();
      stepsSeen.push(indicator ?? '');
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, `axe violations on ${indicator}`).toEqual([]);
      if (step === 1) {
        await page.click('#nextBtn');
      } else if (step === 2) {
        await page.selectOption('#originCountry', 'ARE');
        await page.fill('#salaryAmount', '53871');
        await page.check('#salaryConfirmed');
        await page.click('#nextBtn');
      } else if (step === 3) {
        await page.selectOption('#targetCountry', 'ARE');
        await page.click('#nextBtn');
      } else if (step === 4) {
        await page.click('#skipFamily');
      }
    }
    expect(stepsSeen).toHaveLength(5);
  });

  test('dropping a resume triggers no network upload', async ({ page }) => {
    const posts: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && !request.url().includes('cloudflareinsights.com')) posts.push(request.url());
    });
    await waitForWizard(page);
    await page.setInputFiles('#resumeInput', {
      name: 'resume.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj\n4 0 obj<</Length 44>>stream\nBT 72 720 Td (Software Engineer 8 years) Tj ET\nendstream\nendobj\ntrailer<</Root 1 0 R>>\n', 'utf8'),
    });
    await page.waitForTimeout(1000);
    await expect(page.locator('#resumeNote')).toBeVisible();
    expect(posts).toEqual([]);
  });

  test('a job description suggestion never blocks Continue', async ({ page }) => {
    await waitForWizard(page);
    // Empty role family: the pasted description fills it automatically and Continue advances.
    await page.fill('#jdText', 'We are hiring a Head of Finance to run our accounting function.');
    await page.selectOption('#experienceBand', '15+');
    await page.waitForTimeout(600);
    await page.click('#nextBtn');
    await expect(page.locator('#stepIndicator')).toContainText('Step 2 of 5');

    // A different family already chosen: a quiet Switch chip appears; Continue still works
    // and keeps the user's own selection.
    await page.click('#backBtn');
    await expect(page.locator('#roleFamily')).toHaveValue('finance-and-accounting');
    await page.selectOption('#roleFamily', 'software-engineering');
    await page.fill('#jdText', 'We are hiring a Head of Finance to run our accounting function.');
    await page.waitForTimeout(600);
    await expect(page.locator('#jdSuggestion')).toBeVisible();
    await expect(page.locator('#jdSuggestion')).toContainText('Finance and Accounting');
    await page.click('#nextBtn');
    await expect(page.locator('#stepIndicator')).toContainText('Step 2 of 5');
    await page.click('#backBtn');
    await expect(page.locator('#roleFamily')).toHaveValue('software-engineering');

    // The Switch chip applies the suggested family on demand.
    await page.fill('#jdText', 'We are hiring a Head of Finance to run our accounting function.');
    await page.waitForTimeout(600);
    await page.click('#jdSuggestion button');
    await expect(page.locator('#roleFamily')).toHaveValue('finance-and-accounting');
  });
});

test('entry mode: a user with no current salary gets a market-only quote', async ({ page }) => {
  await waitForWizard(page);
  await page.selectOption('#roleFamily', 'software-engineering');
  await page.selectOption('#experienceBand', '3-5');
  await page.click('#nextBtn');
  await page.check('#entryMode');
  await page.click('#nextBtn');
  await page.selectOption('#targetCountry', 'ARE');
  await page.click('#nextBtn');
  await page.click('#skipFamily');
  await page.click('#seeQuote');
  await expect(page.locator('#resultsHeading')).toBeVisible();
  await expect(page.locator('#quoteTarget')).toContainText('AED');
  await expect(page.locator('#basisLine')).toContainText(/market band alone|entry|floor/i);
});

test('offer evaluation: positions a recruiter offer against the quote', async ({ page }) => {
  await fillHappyPathToResults(page);
  await page.fill('#offerAmount', '70000');
  await page.click('#offerEval');
  await expect(page.locator('#offerVerdict')).toBeVisible();
  await expect(page.locator('#offerVerdict')).toContainText(/band/i);
  await expect(page.locator('#offerVerdict')).toContainText('%');
});

test('hardship mode: relocation toggle adds an advisory card without moving the quote', async ({ page }) => {
  const runToResults = async (withHardship: boolean) => {
    await page.goto('/');
    await page.waitForSelector('#stepIndicator', { state: 'visible' });
    await page.selectOption('#roleFamily', 'it-executive');
    await page.selectOption('#experienceBand', '15+');
    await page.click('#nextBtn');
    await page.check('#entryMode');
    await page.click('#nextBtn');
    await page.selectOption('#targetCountry', 'KEN');
    if (withHardship) {
      await page.check('#hardshipMode');
      await page.selectOption('#hardshipPost', 'Nairobi');
    }
    await page.click('#nextBtn');
    await page.click('#skipFamily');
    await page.click('#seeQuote');
    await expect(page.locator('#resultsHeading')).toBeVisible();
    return page.locator('#quoteTarget').textContent();
  };
  const plain = await runToResults(false);
  await runToResults(true);
  await expect(page.locator('#hardshipCard')).toBeVisible();
  await expect(page.locator('#hardshipCard')).toContainText('20%');
  await expect(page.locator('#hardshipCard')).toContainText('Nairobi');
  // The primary quote is identical to the same run without the mode.
  const adjustedRun = await page.locator('#quoteTarget').textContent();
  expect(adjustedRun).toBe(plain);
});

test('remote for a foreign company shows the pay-policy advisory card', async ({ page }) => {
  await waitForWizard(page);
  await page.selectOption('#roleFamily', 'it-executive');
  await page.selectOption('#experienceBand', '15+');
  await page.click('#nextBtn');
  await page.selectOption('#originCountry', 'GBR');
  await page.fill('#salaryAmount', '120000');
  await page.check('input[name="salaryBasis"][value="annual"]');
  await page.check('#salaryConfirmed');
  await page.click('#nextBtn');
  await page.selectOption('#targetCountry', 'IND');
  await page.check('#wrRemoteForeign');
  await page.selectOption('#employerCountry', 'USA');
  await page.click('#nextBtn');
  await page.click('#skipFamily');
  await page.click('#seeQuote');
  await expect(page.locator('#resultsHeading')).toBeVisible();
  await expect(page.locator('#remotePolicyCard')).toBeVisible();
  await expect(page.locator('#remotePolicyCard')).toContainText('31');
  await expect(page.locator('#remotePolicyCard a')).toHaveCount(3);
});
