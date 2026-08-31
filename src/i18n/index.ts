import en from './en.json';
import ar from './ar.json';
import hi from './hi.json';

export type Locale = 'en' | 'ar' | 'hi';

const DICTIONARIES: Record<Locale, unknown> = { en, ar, hi };

let currentLocale: Locale = 'en';

function lookup(dict: unknown, path: string[]): unknown {
  let current: unknown = dict;
  for (const key of path) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function interpolate(raw: string, vars?: Record<string, string | number>): string {
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const localized = lookup(DICTIONARIES[currentLocale], key.split('.'));
  const raw = typeof localized === 'string' ? localized : lookup(en, key.split('.'));
  if (typeof raw !== 'string') return key;
  return interpolate(raw, vars);
}

/* Locale-aware currency formatting: hi-IN lakh grouping, Eastern Arabic digits on ar. */
export function formatCurrency(amount: number, currency: string, locale: Locale = currentLocale): string {
  const intlLocale = locale === 'hi' ? 'hi-IN' : locale === 'ar' ? 'ar' : 'en';
  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export { en, ar, hi };
