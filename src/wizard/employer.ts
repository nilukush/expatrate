export interface JdSalaryRange {
  min: number;
  max: number;
  currency: string | null;
}

/** The only floor fields the comparison needs; full FloorResult satisfies it. */
export interface FloorLike {
  annualGross: number;
  currency: string;
}

/** The only quote fields the comparison needs; full QuoteResult satisfies it. */
export interface QuoteLike {
  annualTarget: number;
  currency: string;
}

export type EmployerComparison =
  | { kind: 'below'; floorAnnual: number; floorCurrency: string; shortfallPct: number }
  | { kind: 'overlap'; floorAnnual: number; floorCurrency: string }
  | { kind: 'above'; floorAnnual: number; floorCurrency: string }
  | { kind: 'vs-quote' }
  | { kind: 'hidden' };

/**
 * Positions the salary stated in a job description against the floor. The JD
 * states its own currency while the floor is denominated in the target's
 * currency, so the comparison and the displayed floor figure happen in the JD
 * currency. An unconvertible pair suppresses the verdict rather than
 * comparing raw numbers across currencies.
 */
export function compareEmployerOffer(
  jd: JdSalaryRange,
  floor: FloorLike | null,
  quote: QuoteLike | null,
  rates: Record<string, number>,
): EmployerComparison {
  if (!floor && !quote) return { kind: 'hidden' };
  const display = jd.currency || quote?.currency || floor?.currency || 'USD';
  let floorAnnual: number | null = null;
  if (floor) {
    floorAnnual = floor.currency === display
      ? floor.annualGross
      : rates[floor.currency] !== undefined && rates[display] !== undefined
        ? (floor.annualGross / rates[floor.currency]) * rates[display]
        : null;
  }
  if (floorAnnual === null) return quote ? { kind: 'vs-quote' } : { kind: 'hidden' };
  if (jd.max < floorAnnual) {
    return {
      kind: 'below',
      floorAnnual,
      floorCurrency: display,
      shortfallPct: Math.round((1 - jd.max / floorAnnual) * 100),
    };
  }
  if (jd.min < floorAnnual) {
    return { kind: 'overlap', floorAnnual, floorCurrency: display };
  }
  return { kind: 'above', floorAnnual, floorCurrency: display };
}
