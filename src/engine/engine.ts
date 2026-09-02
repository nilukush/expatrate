import { effectiveDeductionAt, solveGrossForNet } from './tax';
import type {
  BenchmarkData,
  ConfidenceResult,
  CountryRow,
  Datasets,
  EngineContext,
  EngineInputs,
  EngineMessage,
  EngineResult,
  FxRates,
  FloorResult,
  Level,
  MarketAnchor,
  PackageCompositionResult,
  PackageConvention,
  PppRow,
  SalaryInput,
  TaxTier,
} from './types';

const TARGET_PERCENTILE: Record<Level, number> = {
  senior: 50,
  lead: 60,
  executive: 70,
};

const ON_TOP_SHARES: Record<string, number> = {
  housing: 0.25,
  transport: 0.08,
  schooling: 0.15,
  flights: 0.05,
  // Employer-paid family health cover: comprehensive UAE family plans run about
  // AED 17,000-33,500 per year (Policybazaar.ae, Gargash, Pacific Prime 2025),
  // which is 3-5% of typical executive package salaries. 0.04 is the midpoint.
  health: 0.04,
  bonus: 0,
};

const MAX_ON_TOP_SHARE = 0.45;
const VOLATILE_CURRENCIES = new Set(['EGY', 'NGA', 'LBN']);
// Targets whose healthcare is funded from general tax, which the floor's tax
// gross-up already pays for. Verified set only; extend with sources.
const TAX_FUNDED_HEALTHCARE = new Set(['GBR', 'AUS', 'CAN', 'NLD', 'DEU']);

function interpolate(p25: number, p50: number, p75: number, percentile: number): number {
  if (percentile <= 25) return p25;
  if (percentile <= 50) return p25 + ((percentile - 25) / 25) * (p50 - p25);
  if (percentile <= 75) return p50 + ((percentile - 50) / 25) * (p75 - p50);
  return p75;
}

function findCountry(datasets: Datasets, iso3: string): CountryRow {
  const row = datasets.countries.find((c) => c.iso3 === iso3);
  if (!row) throw new Error(`Unknown country code: ${iso3}`);
  return row;
}

function toUsd(amount: number, currency: string, fx: FxRates): number {
  const rate = fx.rates[currency];
  if (!rate) throw new Error(`No exchange rate available for ${currency}`);
  return amount / rate;
}

function fromUsd(amountUsd: number, currency: string, fx: FxRates): number {
  const rate = fx.rates[currency];
  if (!rate) throw new Error(`No exchange rate available for ${currency}`);
  return amountUsd * rate;
}

function convertOrUndefined(amount: number, from: string, to: string, fx: FxRates): number | undefined {
  const fromRate = fx.rates[from];
  const toRate = fx.rates[to];
  if (fromRate === undefined || toRate === undefined) return undefined;
  return (amount / fromRate) * toRate;
}

function effectiveDeduction(
  datasets: Datasets,
  iso3: string,
  level: Level,
): TaxTier {
  const row = datasets.tax.find((t) => t.iso3 === iso3);
  if (row) {
    const exact = row.tiers.find((t) => t.label === level);
    if (exact) return exact;
    const anyIncome = row.tiers.find((t) => t.label === 'any-income');
    if (anyIncome) return anyIncome;
  }
  return {
    label: 'default',
    effectiveDeduction: 0.2,
    quality: 'Low',
    note: 'No verified tax tier for this country and level; a conservative 20% default is applied.',
    sourceUrl: '',
  };
}

function monthsPerYear(datasets: Datasets, iso3: string): number {
  const override = datasets.employment.countryOverrides.find((o) => o.country === iso3);
  const pending = override?.thirteenthMonthMandatory === true || override?.religiousAllowanceTHR === true;
  return pending ? 13 : datasets.employment.defaultMonthsPerYear;
}

function marketAnchor(
  datasets: Datasets,
  family: string,
  level: Level,
  country: string,
): MarketAnchor | null {
  const entry = datasets.benchmarks.find(
    (b) => b.family === family && b.level === level && b.country === country,
  );
  if (!entry || entry.status === 'insufficient_data') return null;
  const data = entry as BenchmarkData;
  const toMonthly = (v: number) => (data.basis === 'annual-gross' ? v / 12 : v);
  const p50Monthly = toMonthly(data.p50);
  // Partial bands: a zero p75 means no upper band is published (CBS lead rows);
  // a zero p25 with zero p75 means median only (SEEK averages, some ATO rows).
  // Either way the band collapses to the published median and the result says so.
  const partialUpper = data.p75 <= 0;
  const partialLower = data.p25 <= 0;
  const p25Monthly = partialLower ? p50Monthly : toMonthly(data.p25);
  const p75Monthly = partialUpper ? p50Monthly : toMonthly(data.p75);
  const targetMonthly = interpolate(p25Monthly, p50Monthly, p75Monthly, TARGET_PERCENTILE[level]);
  return {
    currency: data.currency,
    p25Monthly,
    p50Monthly,
    p75Monthly,
    targetMonthly,
    quality: data.quality,
    sources: data.sources,
    note: data.note,
    partialBand: partialUpper || partialLower,
    medianOnly: partialLower,
  };
}

function packageComposition(
  monthlyTotal: number,
  convention: PackageConvention | undefined,
): PackageCompositionResult | null {
  if (!convention || convention.style !== 'gcc-split' || !convention.basicPercent || !convention.housingPercent || !convention.transportPercent) {
    return null;
  }
  const mid = (r: { min: number; max: number }) => (r.min + r.max) / 2 / 100;
  return {
    basicMonthly: monthlyTotal * mid(convention.basicPercent),
    housingMonthly: monthlyTotal * mid(convention.housingPercent),
    transportMonthly: monthlyTotal * mid(convention.transportPercent),
    gratuityNote: convention.gratuity,
  };
}

function confidenceScore(
  anchor: MarketAnchor | null,
  inputs: EngineInputs,
  datasets: Datasets,
  stalePpp: PppRow[] = [],
): ConfidenceResult {
  const reasons: EngineMessage[] = [];
  let level: 'High' | 'Medium' | 'Low';
  if (anchor) {
    level = anchor.quality === 'High' ? 'High' : anchor.quality === 'Medium' ? 'Medium' : 'Low';
    reasons.push({ key: 'benchmarkQuality', params: { quality: anchor.quality } });
  } else {
    level = 'Low';
    reasons.push({ key: 'noBenchmark' });
  }
  if (stalePpp.length > 0) {
    if (level === 'High') level = 'Medium';
    reasons.push({ key: 'pppStaleReason' });
  }
  if (inputs.level === 'executive') {
    if (level === 'High') level = 'Medium';
    reasons.push({ key: 'executiveBand' });
  }
  if (inputs.workArrangement === 'remote-foreign') {
    if (level === 'High') level = 'Medium';
    reasons.push({ key: 'remoteForeign' });
  }
  if (VOLATILE_CURRENCIES.has(inputs.targetCountry)) {
    if (level === 'High') level = 'Medium';
    reasons.push({ key: 'volatileCurrency' });
  }
  const originTax = effectiveDeduction(datasets, inputs.originCountry ?? '', inputs.level);
  if (originTax.quality === 'Low' || originTax.label === 'default') {
    reasons.push({ key: 'originTaxEstimate' });
  }
  return { level, reasons };
}

export function calculate(inputs: EngineInputs, ctx: EngineContext): EngineResult {
  const { datasets, fx } = ctx;

  if (inputs.workArrangement === 'remote-foreign' && !inputs.employerCountry) {
    throw new Error('Remote for a foreign company requires the employer country.');
  }

  const entryMode = !inputs.currentSalary || !inputs.originCountry;
  const origin = entryMode ? null : findCountry(datasets, inputs.originCountry as string);
  const target = findCountry(datasets, inputs.targetCountry);
  const warnings: EngineMessage[] = [];

  let annual = 0;
  let basisLine: string | null = null;
  let netAnnual = 0;
  let onTopShare = 0;
  if (!entryMode && origin) {
    const months = monthsPerYear(datasets, inputs.originCountry as string);
    const salary = inputs.currentSalary as SalaryInput;
    annual = salary.basis === 'monthly' ? salary.amount * months : salary.amount;
    if (salary.currency !== origin.currency) {
      annual = fromUsd(toUsd(annual, salary.currency, fx), origin.currency, fx);
      warnings.push({
        key: 'salaryCurrencyDiff',
        params: { from: salary.currency, country: origin.name },
      });
    }

    // USD plausibility check tolerates a missing FX rate: PPP gives an equivalent scale.
    const usdMonthly =
      fx.rates[origin.currency] !== undefined
        ? annual / fx.rates[origin.currency] / months
        : annual / (datasets.ppp.find((p) => p.iso3 === inputs.originCountry)?.value ?? 1) / months;
    if (salary.basis === 'monthly' && usdMonthly > 100_000) {
      throw new Error('This monthly amount is implausibly high. It looks like an annual figure; switch the basis to annual.');
    }
    if (salary.basis === 'monthly' && usdMonthly < 2_000 / 12) {
      // Same bar as the annual check below: USD 2,000 per year.
      throw new Error('Implausibly low monthly salary. Check the amount and the monthly or annual basis.');
    }
    if (salary.basis === 'annual' && usdMonthly * months < 2_000) {
      throw new Error('Implausibly low annual salary. Check the amount and the monthly or annual basis.');
    }

    basisLine = `${origin.currency} ${Math.round(annual / months)} per month ${salary.gross ? 'gross' : 'net'} (${origin.currency} ${Math.round(annual)} per year) earned in ${origin.name}`;

    // Net income, applying the origin tax tier and any package-on-top components.
    const originBracket = datasets.taxBrackets.find((t) => t.iso3 === inputs.originCountry);
    const originTax = originBracket
      ? {
          label: '2026 brackets',
          effectiveDeduction: effectiveDeductionAt(originBracket, annual),
          quality: 'High',
          note: originBracket.note,
          sourceUrl: originBracket.sourceUrl,
        }
      : effectiveDeduction(datasets, inputs.originCountry as string, inputs.level);
    netAnnual = salary.gross ? annual * (1 - originTax.effectiveDeduction) : annual;

    if (inputs.currentPackageOnTop) {
      for (const [component, checked] of Object.entries(inputs.currentPackageOnTop)) {
        if (checked) onTopShare += ON_TOP_SHARES[component] ?? 0;
      }
      onTopShare = Math.min(onTopShare, MAX_ON_TOP_SHARE);
      if (onTopShare > 0) {
        netAnnual = netAnnual / (1 - onTopShare);
        warnings.push({ key: 'packageOnTop' });
        if (inputs.currentPackageOnTop.health && TAX_FUNDED_HEALTHCARE.has(inputs.targetCountry)) {
          warnings.push({ key: 'healthOverlap', params: { country: target.name } });
        }
      }
    }
  }

  // Purchasing-power floor: PPP transfer from origin to target, then gross-up.
  // Entry mode has no origin salary, so no floor is computed.
  const originPpp = entryMode ? undefined : datasets.ppp.find((p) => p.iso3 === inputs.originCountry);
  const targetPpp = datasets.ppp.find((p) => p.iso3 === inputs.targetCountry);
  const targetTax = effectiveDeduction(datasets, inputs.targetCountry, inputs.level);
  const targetTaxAssumed = targetTax.label === 'default';
  let floor: FloorResult | null = null;
  if (originPpp && targetPpp) {
    const realIncomeUsd = netAnnual / originPpp.value;
    const targetNet = realIncomeUsd * targetPpp.value;
    const targetBracket = datasets.taxBrackets.find((t) => t.iso3 === inputs.targetCountry);
    let targetGross: number;
    let taxRate: number;
    let taxLabel: string;
    let taxQuality: string;
    if (targetBracket) {
      targetGross = solveGrossForNet(targetBracket, targetNet, targetTax.effectiveDeduction);
      taxRate = effectiveDeductionAt(targetBracket, targetGross);
      taxLabel = '2026 brackets';
      taxQuality = 'High';
    } else {
      targetGross = targetNet / (1 - targetTax.effectiveDeduction);
      taxRate = targetTax.effectiveDeduction;
      taxLabel = targetTax.label;
      taxQuality = targetTax.quality;
    }
    floor = {
      currency: target.currency,
      annualGross: targetGross,
      monthlyGross: targetGross / 12,
      derivation: {
        netMonthlyTarget: targetNet / 12,
        taxRate,
        taxLabel,
        taxQuality: taxQuality,
        originPpp: originPpp.value,
        originPppYear: originPpp.year,
        targetPpp: targetPpp.value,
        targetPppYear: targetPpp.year,
        onTopShare,
      },
    };
  }
  if (targetTaxAssumed && floor && !datasets.taxBrackets.some((t) => t.iso3 === inputs.targetCountry)) {
    warnings.push({ key: 'targetTaxDefault', params: { country: target.name } });
  }
  const stalePpp = [originPpp, targetPpp].filter((row): row is NonNullable<typeof row> =>
    row !== undefined && row.year < 2024);
  if (stalePpp.length > 0 && floor) {
    const names = stalePpp
      .map((row) => `${findCountry(datasets, row.iso3).name} (${row.year})`)
      .join(' and ');
    warnings.push({ key: 'pppStale', params: { names } });
  }

  const anchor = marketAnchor(datasets, inputs.roleFamily, inputs.level, inputs.targetCountry);
  if (anchor?.medianOnly) {
    warnings.push({ key: 'medianOnly' });
  } else if (anchor?.partialBand) {
    warnings.push({ key: 'upperBand' });
  }

  const dualAnchors = inputs.workArrangement === 'remote-foreign'
    ? {
        employerCountry: inputs.employerCountry as string,
        anchor: marketAnchor(datasets, inputs.roleFamily, inputs.level, inputs.employerCountry as string),
      }
    : null;

  let quote: EngineResult['quote'] = null;
  if (anchor) {
    // Market benchmarks quote the market currency (USD rows for Lebanon and
    // Panama) while the floor is denominated in the target's local currency.
    // Every floor-to-band comparison happens in the anchor currency so a
    // mixed-quote target cannot corrupt the band.
    const floorMonthlyInAnchor = floor
      ? floor.currency === anchor.currency
        ? floor.monthlyGross
        : convertOrUndefined(floor.monthlyGross, floor.currency, anchor.currency, fx)
      : undefined;
    const floorAboveMarket = floorMonthlyInAnchor !== undefined && floorMonthlyInAnchor > anchor.p75Monthly;
    if (floorAboveMarket) {
      warnings.push({
        key: 'floorAboveMarket',
        params: {
          floor: { amount: Math.round(floorMonthlyInAnchor), currency: anchor.currency },
          ceiling: { amount: Math.round(anchor.p75Monthly), currency: anchor.currency },
        },
      });
    }
    const lowMonthly = floorAboveMarket
      ? anchor.p25Monthly
      : Math.max(anchor.p25Monthly, floorMonthlyInAnchor ?? 0);
    const targetMonthly = Math.min(
      Math.max(anchor.targetMonthly, lowMonthly),
      anchor.p75Monthly,
    );
    quote = {
      currency: anchor.currency,
      lowMonthly,
      targetMonthly,
      stretchMonthly: anchor.p75Monthly,
      annualTarget: targetMonthly * 12,
    };
  }

  const convention = datasets.packageConventions.find((p) => p.country === inputs.targetCountry);
  const packageComp = quote ? packageComposition(quote.targetMonthly, convention) : null;

  let employment: EngineResult['employment'] = {
    type: inputs.employmentType,
    indicative: inputs.employmentType !== 'full-time',
  };
  if (inputs.employmentType === 'contract' && quote) {
    employment = {
      ...employment,
      dayRate: quote.annualTarget / datasets.employment.dayRateDivisors.standard,
    };
  }

  let currencyRisk: EngineResult['currencyRisk'] = null;
  if (VOLATILE_CURRENCIES.has(inputs.targetCountry)) {
    const toUsdOrUndefined = (amount: number, currency: string): number | undefined =>
      fx.rates[currency] !== undefined ? amount / fx.rates[currency] : undefined;
    currencyRisk = {
      noticeKey: 'currencyRisk',
      usdAnchors: {
        targetMonthlyUsd: quote ? toUsdOrUndefined(quote.targetMonthly, quote.currency) : undefined,
        floorMonthlyUsd: floor ? toUsdOrUndefined(floor.monthlyGross, floor.currency) : undefined,
      },
    };
  }

  // Advisory hardship differential: an opt-in corporate-relocation view.
  // It scales an alternate range and never touches the primary quote.
  let hardship: EngineResult['hardship'] = null;
  if (inputs.hardshipPost && quote) {
    const post = datasets.hardshipPosts.find(
      (p) => p.iso3 === inputs.targetCountry && p.city === inputs.hardshipPost,
    );
    if (post) {
      const factor = 1 + post.differentialPct / 100;
      hardship = {
        city: post.city,
        differentialPct: post.differentialPct,
        effectiveDate: post.effectiveDate,
        sourceUrl: post.sourceUrl,
        adjustedRangeMonthly: {
          low: quote.lowMonthly * factor,
          target: quote.targetMonthly * factor,
          stretch: quote.stretchMonthly * factor,
        },
        currency: quote.currency,
      };
    }
  }

  const status: EngineResult['status'] = quote
    ? 'ok'
    : floor
      ? 'floor-only'
      : 'insufficient_data';

  const confidence = confidenceScore(anchor, inputs, datasets, stalePpp);
  if (targetTaxAssumed && floor) {
    confidence.reasons.push({ key: 'targetTaxDefaultReason' });
  }
  if (entryMode) {
    confidence.reasons.push({ key: 'entryMode' });
  }
  return {
    status,
    basisLine,
    anchor,
    floor,
    quote,
    dualAnchors,
    employment,
    packageComposition: packageComp,
    currencyRisk,
    hardship,
    confidence,
    warnings,
  };
}

export interface OfferVerdict {
  bandPosition: 'below-p25' | 'within-band' | 'above-p75';
  /** Linear read of where the offer sits between the published P25 and P75. */
  percentileInBand: number;
  /** Percent gap vs the purchasing-power floor; null in entry mode (no floor). */
  floorGapPct: number | null;
  /** The offer as monthly gross in the quote currency, for display. */
  monthlyGrossInQuoteCurrency: number;
}

export function evaluateOffer(offer: SalaryInput, result: EngineResult, fx: FxRates): OfferVerdict {
  if (!result.quote) {
    throw new Error('No market band to compare the offer against.');
  }
  const monthlyOfferCurrency = offer.basis === 'monthly' ? offer.amount : offer.amount / 12;
  const quote = result.quote;
  const monthly = offer.currency === quote.currency
    ? monthlyOfferCurrency
    : fromUsd(toUsd(monthlyOfferCurrency, offer.currency, fx), quote.currency, fx);
  const p25 = quote.lowMonthly;
  const p75 = quote.stretchMonthly;
  const bandPosition = monthly < p25 ? 'below-p25' : monthly > p75 ? 'above-p75' : 'within-band';
  const span = p75 - p25;
  const percentileInBand = span > 0
    ? Math.round(25 + (50 * (monthly - p25)) / span)
    : monthly >= p75
      ? 75
      : 25;
  // The floor is denominated in the target currency (LBP for Lebanon) while
  // the band and this offer are in the quote currency; convert before the gap.
  const floorMonthly = result.floor
    ? result.floor.currency === quote.currency
      ? result.floor.monthlyGross
      : convertOrUndefined(result.floor.monthlyGross, result.floor.currency, quote.currency, fx)
    : undefined;
  const floorGapPct = floorMonthly !== undefined && floorMonthly > 0
    ? Math.round(((monthly - floorMonthly) / floorMonthly) * 100)
    : null;
  return { bandPosition, percentileInBand, floorGapPct, monthlyGrossInQuoteCurrency: monthly };
}
