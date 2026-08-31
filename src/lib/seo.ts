import countriesJson from '../data/countries.json';
import roleFamiliesJson from '../data/role-families.json';
import benchmarksJson from '../data/benchmarks.json';
import iso3Iso2Json from '../data/iso3-iso2.json';
const iso3Iso2 = iso3Iso2Json as Record<string, string>;
import { t, getLocale } from '../i18n';

export const SITE_URL = 'https://expatrate.pages.dev';

type BenchmarkCell = {
  family: string;
  level: string;
  country: string;
  currency: string;
  basis: string;
  p25: number;
  p50: number;
  p75: number;
  quality: string;
  lastReviewed: string;
  sources: string[];
  note: string;
};

const countries = countriesJson as Array<{ iso3: string; name: string; currency: string }>;
const families = roleFamiliesJson.families as Array<{ id: string; name: string }>;
const dataCells = (benchmarksJson.entries as Array<Record<string, unknown>>).filter(
  (entry) => entry.status === undefined,
) as unknown as BenchmarkCell[];

const LEVEL_ORDER = ['executive', 'lead', 'senior'] as const;
const LEVEL_LABEL: Record<string, string> = {
  senior: 'senior',
  lead: 'lead',
  executive: 'executive',
};
const levelLabelFor = (level: string) => t(`seo.levelWord.${level}`);

const regionNamesCache: Record<string, Intl.DisplayNames> = {};
const localName = (iso3: string, fallback: string): string => {
  const locale = getLocale();
  if (locale === 'en') return fallback;
  try {
    regionNamesCache[locale] ??= new Intl.DisplayNames([locale], { type: 'region' });
    const iso2 = (iso3Iso2 as Record<string, string>)[iso3];
    return (iso2 && regionNamesCache[locale].of(iso2)) || fallback;
  } catch {
    return fallback;
  }
};

export const countrySlug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const countryByIso3 = new Map(countries.map((c) => [c.iso3, c]));
const familyById = new Map(families.map((f) => [f.id, f]));

const fmtCurrency = (amount: number, currency: string): string =>
  new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

const toAnnual = (cell: BenchmarkCell, value: number): number =>
  cell.basis === 'monthly-gross' ? value * 12 : value;

const toMonthly = (cell: BenchmarkCell, value: number): number =>
  cell.basis === 'monthly-gross' ? value : value / 12;

export interface SeoLevel {
  level: string;
  levelLabel: string;
  currency: string;
  p25: number;
  p50: number;
  p75: number;
  quality: string;
  lastReviewed: string;
  sources: string[];
  note: string;
}

export interface SeoDetailPage {
  familyLocal: string;
  countryLocal: string;
  familyId: string;
  familyName: string;
  countryIso3: string;
  countryName: string;
  countrySlug: string;
  levels: SeoLevel[];
  answer: {
    level: string;
    medianFormatted: string;
    paragraph: string;
  };
}

export function detailPages(): SeoDetailPage[] {
  const byPair = new Map<string, BenchmarkCell[]>();
  for (const cell of dataCells) {
    const key = `${cell.family}|${cell.country}`;
    byPair.set(key, [...(byPair.get(key) ?? []), cell]);
  }
  const pages: SeoDetailPage[] = [];
  for (const [key, cells] of byPair) {
    const [familyId, countryIso3] = key.split('|');
    const country = countryByIso3.get(countryIso3);
    const family = familyById.get(familyId);
    if (!country || !family) continue;
    const levels = [...cells].sort(
      (a, b) => LEVEL_ORDER.indexOf(a.level as (typeof LEVEL_ORDER)[number]) - LEVEL_ORDER.indexOf(b.level as (typeof LEVEL_ORDER)[number]),
    );
    const lead = levels[0];
    const medianAnnual = toAnnual(lead, lead.p50);
    const lowAnnual = lead.p25 > 0 ? toAnnual(lead, lead.p25) : medianAnnual;
    const highAnnual = lead.p75 > 0 ? toAnnual(lead, lead.p75) : medianAnnual;
    const firstSourceHost = new URL(lead.sources[0]).hostname.replace(/^www\./, '');
    const answer = {
      level: levelLabelFor(lead.level),
      medianFormatted: fmtCurrency(medianAnnual, lead.currency),
      paragraph: t('seo.answer', {
        level: levelLabelFor(lead.level),
        family: t(`options.families.${familyId}`),
        country: localName(countryIso3, country.name),
        median: fmtCurrency(medianAnnual, lead.currency),
        low: fmtCurrency(lowAnnual, lead.currency),
        high: fmtCurrency(highAnnual, lead.currency),
        source: `${firstSourceHost}, ${lead.lastReviewed}`,
      }),
    };
    pages.push({
      familyId,
      familyName: family.name,
      countryIso3,
      countryName: country.name,
      countrySlug: countrySlug(country.name),
      levels: levels.map((cell) => ({
        level: cell.level,
        levelLabel: levelLabelFor(cell.level),
        currency: cell.currency,
        p25: toAnnual(cell, cell.p25),
        p50: toAnnual(cell, cell.p50),
        p75: cell.p75 > 0 ? toAnnual(cell, cell.p75) : 0,
        quality: cell.quality,
        lastReviewed: cell.lastReviewed,
        sources: cell.sources,
        note: cell.note,
      })),
      answer,
      familyLocal: t(`options.families.${familyId}`),
      countryLocal: localName(countryIso3, country.name),
    });
  }
  return pages.sort((a, b) =>
    `${a.countryName}${a.familyName}`.localeCompare(`${b.countryName}${b.familyName}`),
  );
}

export function detailPagesFor(familyId: string): SeoDetailPage[] {
  return detailPages().filter((page) => page.familyId === familyId);
}

export function detailPage(familyId: string, countryIso3: string): SeoDetailPage | undefined {
  return detailPages().find((page) => page.familyId === familyId && page.countryIso3 === countryIso3);
}

export function seoCountries(): Array<{ iso3: string; name: string; slug: string; families: number }> {
  const byCountry = new Map<string, Set<string>>();
  for (const cell of dataCells) {
    byCountry.set(cell.country, (byCountry.get(cell.country) ?? new Set()).add(cell.family));
  }
  return countries
    .filter((c) => byCountry.has(c.iso3))
    .map((c) => ({
      iso3: c.iso3,
      name: c.name,
      slug: countrySlug(c.name),
      families: byCountry.get(c.iso3)?.size ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const detailUrl = (familyId: string, slug: string): string =>
  `/salary/${familyId}/in/${slug}/`;

export const countryHubUrl = (slug: string): string => `/salaries/${slug}/`;

export const monthlyFor = (amount: number, currency: string): string =>
  fmtCurrency(amount / 12, currency);

export function breadcrumbLd(items: Array<{ name: string; url: string }>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function webAppLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'ExpatRate',
    url: `${SITE_URL}/`,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    description: t('seo.appDescription'),
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };
}

export function organizationLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ExpatRate',
    url: `${SITE_URL}/`,
  };
}

export function datasetLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'ExpatRate expat salary benchmarks',
    description: t('seo.datasetDescription'),
    creator: { '@type': 'Organization', name: 'ExpatRate', url: `${SITE_URL}/` },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    variableMeasured: [
      'role family',
      'seniority level',
      'country',
      'p25',
      'p50',
      'p75',
      'currency',
      'basis',
      'quality',
      'sources',
    ],
  };
}

export function sitemapXml(urls: string[]): string {
  const entries = urls
    .map((url) => {
      const alternates = [
        `<xhtml:link rel="alternate" hreflang="en" href="${url}"/>`,
        `<xhtml:link rel="alternate" hreflang="x-default" href="${url}"/>`,
      ].join('');
      return `  <url>\n    <loc>${url}</loc>\n    ${alternates}\n  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries}\n</urlset>\n`;
}

export function allSiteUrls(): string[] {
  const urls = [`${SITE_URL}/`, `${SITE_URL}/methodology/`, `${SITE_URL}/salaries/`];
  for (const locale of ['', '/ar', '/hi']) {
    urls.push(`${SITE_URL}${locale}/`);
    for (const country of seoCountries()) urls.push(`${SITE_URL}${locale}${countryHubUrl(country.slug)}`);
    for (const family of families) urls.push(`${SITE_URL}${locale}/salary/${family.id}/`);
    for (const page of detailPages()) urls.push(`${SITE_URL}${locale}${detailUrl(page.familyId, page.countrySlug)}`);
    urls.push(`${SITE_URL}${locale}/salaries/`);
    urls.push(`${SITE_URL}${locale}/methodology/`);
  }
  return [...new Set(urls)];
}

export { localName };
