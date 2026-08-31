export interface FxSnapshot {
  base: string;
  asOf: string;
  source: string;
  attribution: string;
  rates: Record<string, number>;
  missing?: string[];
}

export interface FxResult {
  rates: Record<string, number>;
  asOf: string;
  source: 'open.er-api.com' | 'frankfurter.dev' | 'snapshot';
  warning?: string;
}

export interface FxOptions {
  fetchImpl?: typeof fetch;
  snapshot: FxSnapshot;
  timeoutMs?: number;
}

const PRIMARY_URL = 'https://open.er-api.com/v6/latest/USD';
const SECONDARY_URL = 'https://api.frankfurter.dev/v2/rates?base=USD';

let sessionCache: FxResult | null = null;

export function clearFxCache(): void {
  sessionCache = null;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function extractDate(input: unknown): string | null {
  if (typeof input !== 'string' || input.length === 0) return null;
  const isoMatch = /(\d{4}-\d{2}-\d{2})/.exec(input);
  if (isoMatch) return isoMatch[1];
  const utcMatch = /(\d{1,2})\s+(\w{3})\s+(\d{4})/.exec(input);
  if (utcMatch) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = months.findIndex((m) => m.toLowerCase() === utcMatch[2].toLowerCase());
    if (monthIndex >= 0) {
      return `${utcMatch[3]}-${String(monthIndex + 1).padStart(2, '0')}-${utcMatch[1].padStart(2, '0')}`;
    }
  }
  return null;
}

async function fetchWithTimeout(
  url: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fromPrimary(options: FxOptions, timeoutMs: number): Promise<FxResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchWithTimeout(PRIMARY_URL, fetchImpl, timeoutMs);
  const payload: unknown = await response.json();
  if (!response.ok || typeof payload !== 'object' || payload === null) {
    throw new Error('primary rejected the request');
  }
  const data = payload as { result?: unknown; rates?: unknown; time_last_update_utc?: unknown };
  if (data.result !== 'success' || typeof data.rates !== 'object' || data.rates === null) {
    throw new Error('primary returned a malformed payload');
  }
  const rates = data.rates as Record<string, number>;
  if (rates.USD !== 1 || Object.keys(rates).length < 50) {
    throw new Error('primary returned implausible rates');
  }
  return {
    rates,
    asOf: extractDate(data.time_last_update_utc) ?? today(),
    source: 'open.er-api.com',
  };
}

async function fromSecondary(options: FxOptions, timeoutMs: number): Promise<FxResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchWithTimeout(SECONDARY_URL, fetchImpl, timeoutMs);
  const payload: unknown = await response.json();
  if (!response.ok || typeof payload !== 'object' || payload === null) {
    throw new Error('secondary rejected the request');
  }
  const data = payload as { rates?: unknown; date?: unknown };
  if (typeof data.rates !== 'object' || data.rates === null) {
    throw new Error('secondary returned a malformed payload');
  }
  const fetched = data.rates as Record<string, number>;
  if (Object.keys(fetched).length < 20) {
    throw new Error('secondary returned implausible rates');
  }
  return {
    rates: { USD: 1, ...fetched },
    asOf: extractDate(data.date) ?? today(),
    source: 'frankfurter.dev',
  };
}

export async function getFxRates(options: FxOptions): Promise<FxResult> {
  if (sessionCache) return sessionCache;
  const timeoutMs = options.timeoutMs ?? 3000;

  try {
    sessionCache = await fromPrimary(options, timeoutMs);
    return sessionCache;
  } catch {
    // fall through to the secondary provider
  }

  try {
    sessionCache = await fromSecondary(options, timeoutMs);
    return sessionCache;
  } catch {
    // fall through to the embedded snapshot
  }

  sessionCache = {
    rates: options.snapshot.rates,
    asOf: options.snapshot.asOf,
    source: 'snapshot',
    warning: 'Live rates are unavailable right now; figures use the embedded snapshot. Check the date shown.',
  };
  return sessionCache;
}
