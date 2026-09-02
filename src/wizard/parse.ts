import type { ExperienceBand } from './types';

const FAMILY_KEYWORDS: Array<[string, string[]]> = [
  ['it-executive', ['cto', 'chief technology', 'chief product and technology', 'cpto', 'vp engineering', 'head of engineering', 'technology director', 'it director', 'head of it']],
  ['software-engineering', ['software engineer', 'software developer', 'full stack', 'backend', 'back end', 'frontend', 'front end', 'engineering manager']],
  ['data-and-ai', ['data scientist', 'data engineer', 'machine learning', 'ml engineer', 'ai engineer', 'data analyst', 'head of data', 'analytics']],
  ['product-management', ['product manager', 'head of product', 'product owner']],
  ['cybersecurity', ['security engineer', 'ciso', 'cybersecurity', 'information security']],
  ['design', ['designer', 'ux', 'ui designer', 'design lead']],
  ['delivery-and-project-management', ['project manager', 'scrum master', 'program manager', 'delivery manager', 'pmo']],
  ['sales-and-business-development', ['sales', 'business development', 'account executive', 'account manager', 'sales manager', 'bde']],
  ['marketing-and-growth', ['marketing', 'growth', 'seo', 'brand']],
  ['finance-and-accounting', ['finance', 'accountant', 'controller', 'cfo', 'accounts']],
  ['hr-and-people', ['hr ', 'human resources', 'people operations', 'talent', 'recruiter', 'head of hr']],
  ['operations-and-supply-chain', ['operations', 'supply chain', 'logistics', 'procurement', 'coo']],
  ['general-management', ['general manager', 'managing director', 'coo', 'founder', 'co-founder', 'chief operating']],
  ['engineering-civil-mechanical-electrical', ['civil engineer', 'mechanical engineer', 'electrical engineer', 'site engineer', 'structural']],
  ['healthcare', ['doctor', 'nurse', 'physician', 'clinical', 'medical']],
  ['education-and-teaching', ['teacher', 'lecturer', 'professor', 'educator']],
];

const EXPERIENCE_BANDS: ExperienceBand[] = ['0-2', '3-5', '6-9', '10-14', '15+'];

function bandFromYears(years: number): ExperienceBand | '' {
  if (years < 3) return '0-2';
  if (years < 6) return '3-5';
  if (years < 10) return '6-9';
  if (years < 15) return '10-14';
  return '15+';
}

export function suggestFamily(text: string): string {
  const haystack = ` ${text.toLowerCase().replace(/\s+/g, ' ')} `;
  for (const [family, keywords] of FAMILY_KEYWORDS) {
    if (keywords.some((keyword) => haystack.includes(keyword))) return family;
  }
  return '';
}

export interface JdSalary {
  min: number;
  max: number;
  currency: string; // '' when a bare $ was found; resolved against the target country later
}

const CURRENCY_BY_WORD: Record<string, string> = {
  aud: 'AUD', usd: 'USD', gbp: 'GBP', eur: 'EUR', aed: 'AED', sar: 'SAR',
  qar: 'QAR', inr: 'INR', sgd: 'SGD', cad: 'CAD', nzd: 'NZD', zar: 'ZAR',
};

const CURRENCY_BY_SYMBOL: Array<[string, string]> = [
  ['A$', 'AUD'], ['US$', 'USD'], ['C$', 'CAD'], ['S$', 'SGD'], ['NZ$', 'NZD'],
  ['£', 'GBP'], ['€', 'EUR'], ['₹', 'INR'],
];

const symbolCurrency = (token: string): string => {
  for (const [symbol, code] of CURRENCY_BY_SYMBOL) {
    if (token.includes(symbol)) return code;
  }
  return '';
};

/**
 * Extracts an annual salary figure or range from a pasted job description.
 * Monthly and hourly figures are deliberately ignored: quoting advice is annual.
 */
export function extractJdSalary(text: string): JdSalary | null {
  const amounts: Array<{ value: number; currency: string }> = [];
  const pattern =
    /(A\$|US\$|C\$|S\$|NZ\$|£|€|₹|\$)?\s*(AUD|USD|GBP|EUR|AED|SAR|QAR|INR|SGD|CAD|NZD|ZAR)?\s?(\d[\d,.]{2,})\s?(k|K)?(?:\s*(?:-|–|to)\s*(?:A\$|US\$|C\$|S\$|NZ\$|£|€|₹|\$)?\s*(\d[\d,.]{2,})\s?(k|K)?)?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const symbol = match[1] ?? '';
    const word = match[2] ?? '';
    const firstRaw = match[3];
    const secondRaw = match[5];
    const kFirst = match[4] !== undefined;
    const kSecond = match[6] !== undefined;
    const parse = (raw: string | undefined, kilo: boolean): number | null => {
      if (raw === undefined) return null;
      const value = Number.parseFloat(raw.replace(/,/g, ''));
      if (Number.isNaN(value)) return null;
      return kilo ? value * 1000 : value;
    };
    const first = parse(firstRaw, kFirst);
    const second = parse(secondRaw, kSecond);
    const currency = word ? CURRENCY_BY_WORD[word.toLowerCase()] : symbolCurrency(symbol);
    const sentenceStart = text.lastIndexOf('.', match.index);
    const sentenceEnd = text.indexOf('.', match.index + match[0].length);
    const sentence = text.slice(sentenceStart < 0 ? 0 : sentenceStart, sentenceEnd < 0 ? text.length : sentenceEnd);
    const monthlyMentioned = /per month|monthly|\/mo\b|p\.m\./i.test(sentence);
    const annualMentioned = /per annum|annually|a year|per year|\/yr|p\.a\./i.test(sentence);
    for (const value of [first, second]) {
      if (value === null || monthlyMentioned) continue;
      const annualish = annualMentioned || value >= 15000;
      if (annualish && value <= 20_000_000) {
        amounts.push({ value, currency });
      }
    }
  }
  if (amounts.length === 0) return null;
  const min = Math.min(...amounts.map((a) => a.value));
  const max = Math.max(...amounts.map((a) => a.value));
  const known = amounts.find((a) => a.currency !== '');
  return { min, max, currency: known?.currency ?? '' };
}

export function suggestYears(text: string): ExperienceBand | '' {
  const lower = text.toLowerCase();
  const explicit = /(\d{1,2})\s*\+?\s*(?:years|yrs)/.exec(lower);
  if (explicit) {
    const years = Number.parseInt(explicit[1], 10);
    if (years >= 0 && years <= 60) return bandFromYears(years);
  }
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  const range = /(20\d{2})\s*[-–to\s]+\s*(20\d{2}|present|now|current)/g;
  let match: RegExpExecArray | null;
  while ((match = range.exec(lower)) !== null) {
    const start = Number.parseInt(match[1], 10);
    const end = /^(present|now|current)$/.test(match[2]) ? currentYear : Number.parseInt(match[2], 10);
    if (end > start && end - start <= 60) years.push(end - start);
  }
  if (years.length > 0) {
    // Careers accumulate: stints are summed rather than taking the longest one.
    return bandFromYears(Math.min(years.reduce((total, span) => total + span, 0), 60));
  }

  const bareYears = /(?:^|\s)(\d{1,2})\s+years?(?:\s|,|\.)/.exec(lower);
  if (bareYears) {
    const value = Number.parseInt(bareYears[1], 10);
    if (value >= 0 && value <= 60) return bandFromYears(value);
  }
  return '';
}

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();
  if (name.endsWith('.pdf')) {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
    const parts: string[] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      for (const item of content.items) {
        if ('str' in item) parts.push(item.str);
      }
    }
    return parts.join(' ');
  }
  if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value;
  }
  return '';
}

/**
 * Parses a user-typed amount in either decimal convention. "5,387.12" and
 * "5.387,12" both read 5387.12; the other separator is treated as thousands
 * grouping. A single dot stays a decimal point (US bias). Returns null for
 * empty or non-numeric input so callers keep the field invalid instead of
 * storing NaN.
 */
export function parseAmount(raw: string): number | null {
  const s = raw.trim().replace(/\s+/g, '');
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null;
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  let normalized: string;
  if (hasComma && hasDot) {
    const decimalDot = s.lastIndexOf('.') > s.lastIndexOf(',');
    normalized = decimalDot ? s.replace(/,/g, '') : s.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    const parts = s.split(',');
    const decimal = parts.length === 2 && parts[1].length > 0 && parts[1].length <= 2;
    normalized = decimal ? s.replace(',', '.') : s.replace(/,/g, '');
  } else {
    normalized = s.split('.').length > 2 ? s.replace(/\./g, '') : s;
  }
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}
