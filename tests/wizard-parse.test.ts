import { expect, test } from 'vitest';
import { extractJdSalary, parseAmount, suggestFamily, suggestYears } from '../src/wizard/parse';

test('suggestFamily maps executive technology titles to it-executive', () => {
  const resume = 'Nilesh Kumar\nFounder & CPTO\nChief Technology Officer at Zenith\nled platform engineering and AI agents';
  expect(suggestFamily(resume)).toBe('it-executive');
});

test('suggestFamily maps software and data titles', () => {
  expect(suggestFamily('Senior Software Engineer, Java and Go')).toBe('software-engineering');
  expect(suggestFamily('Data Scientist, recommendations and forecasting')).toBe('data-and-ai');
  expect(suggestFamily('Head of HR and Talent')).toBe('hr-and-people');
  expect(suggestFamily('Finance Manager ACCA')).toBe('finance-and-accounting');
});

test('suggestFamily returns empty when nothing matches', () => {
  expect(suggestFamily('Lorem ipsum dolor sit amet')).toBe('');
});

test('suggestYears reads explicit year ranges and years-of-experience phrases', () => {
  // Two stints, 3 and 6 years: careers accumulate, so the band is 6-9.
  expect(suggestYears('Work history\nRaena 2021 - 2024\nSnapdeal 2014 - 2020')).toBe('6-9');
  expect(suggestYears('8+ years of experience building platforms')).toBe('6-9');
  expect(suggestYears('17 years in technology leadership')).toBe('15+');
  expect(suggestYears('no dates here')).toBe('');
});

test('extractJdSalary reads an annual range with a currency word', () => {
  expect(extractJdSalary('Salary: AUD 350,000 - 380,000 per annum plus super.'))
    .toEqual({ min: 350000, max: 380000, currency: 'AUD' });
});

test('extractJdSalary reads a single annual figure with a symbol', () => {
  expect(extractJdSalary('The package is £90,000 a year.')).toEqual({ min: 90000, max: 90000, currency: 'GBP' });
});

test('extractJdSalary expands k notation', () => {
  expect(extractJdSalary('We offer up to 350k per annum.')).toEqual({ min: 350000, max: 350000, currency: '' });
});

test('parseAmount reads both decimal conventions and plain digits', () => {
  expect(parseAmount('5,387.12')).toBeCloseTo(5387.12, 9);
  expect(parseAmount('5.387,12')).toBeCloseTo(5387.12, 9);
  expect(parseAmount('1,234,567')).toBeCloseTo(1234567, 9);
  expect(parseAmount('1.234.567')).toBeCloseTo(1234567, 9);
  expect(parseAmount('12,5')).toBeCloseTo(12.5, 9);
  // A single dot stays a decimal point (US bias, documented in the helper).
  expect(parseAmount('5.387')).toBeCloseTo(5.387, 9);
  expect(parseAmount('5000')).toBeCloseTo(5000, 9);
  expect(parseAmount(' 5,000 ')).toBeCloseTo(5000, 9);
});

test('parseAmount returns null for empty or non-numeric input', () => {
  expect(parseAmount('')).toBeNull();
  expect(parseAmount('   ')).toBeNull();
  expect(parseAmount('abc')).toBeNull();
  // The old inline parser stored NaN for junk; null keeps the step invalid
  // instead of poisoning the engine input.
  expect(parseAmount('1.2.3,4.5')).toBeNull();
});

test('extractJdSalary resolves A$ to AUD and leaves bare $ for target resolution', () => {
  expect(extractJdSalary('A$250,000 package.')).toEqual({ min: 250000, max: 250000, currency: 'AUD' });
  expect(extractJdSalary('$250,000 to $280,000 annually.')).toEqual({ min: 250000, max: 280000, currency: '' });
});

test('extractJdSalary ignores monthly figures', () => {
  expect(extractJdSalary('AED 25,000 per month plus housing.')).toBeNull();
});
