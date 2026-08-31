import type { BracketTable } from './types';

/**
 * Continuous statutory effective-deduction rate from a country's bracket
 * table: income tax after the standard relief plus capped mandatory employee
 * social contributions, over gross. Savings-type contributions (EPF, CPF,
 * JHT and similar) are excluded unless includeSavings is set, matching the
 * tier-table convention set by the Malaysia EPF precedent.
 */
export function effectiveDeductionAt(
  table: BracketTable,
  annualGross: number,
  opts: { includeSavings?: boolean } = {},
): number {
  if (annualGross <= 0) return 0;
  let relief = table.personalReliefAnnual;
  const taper = table.personalReliefTaper;
  if (taper && annualGross > taper.fromGross) {
    const taperSpan = taper.toGross - taper.fromGross;
    relief = Math.max(0, relief * (1 - (annualGross - taper.fromGross) / taperSpan));
  }

  // Wage-based contributions first: their total may reduce the taxable base.
  let socialOnWage = 0;
  for (const item of table.employeeSocial ?? []) {
    if (item.base === 'incomeTax') continue;
    if (item.savings && !opts.includeSavings) continue;
    const capped = item.wageBaseCapAnnual
      ? Math.min(annualGross, item.wageBaseCapAnnual)
      : annualGross;
    const base = Math.max(0, capped - (item.wageBaseFloorAnnual ?? 0));
    socialOnWage += base * item.rate;
  }

  const taxable = Math.max(
    0,
    annualGross - relief - (table.socialsReduceTaxable ? socialOnWage : 0),
  );
  let tax = 0;
  let lower = 0;
  for (const band of table.brackets) {
    const upper = band.threshold ?? Number.POSITIVE_INFINITY;
    const span = Math.min(taxable, upper) - lower;
    if (span > 0) tax += span * band.rate;
    lower = upper;
    if (taxable <= upper) break;
  }

  // Surcharges computed on the income-tax amount (e.g., the German soli),
  // exempt while the tax stays below the floor.
  let socialOnTax = 0;
  for (const item of table.employeeSocial ?? []) {
    if (item.base !== 'incomeTax') continue;
    if (item.savings && !opts.includeSavings) continue;
    if (tax > (item.wageBaseFloorAnnual ?? 0)) socialOnTax += tax * item.rate;
  }

  return (tax + socialOnWage + socialOnTax) / annualGross;
}

/**
 * Solve annual gross so that gross minus its own statutory deductions equals
 * netAnnual. The rate depends on gross, so iterate from a seed rate; bracket
 * schedules are smooth and monotone, so a few passes converge tightly.
 */
export function solveGrossForNet(table: BracketTable, netAnnual: number, seedRate: number): number {
  let gross = netAnnual / (1 - Math.min(seedRate, 0.6));
  for (let i = 0; i < 8; i++) {
    const rate = effectiveDeductionAt(table, gross);
    const next = netAnnual / (1 - rate);
    if (Math.abs(next - gross) <= gross * 0.001) return next;
    gross = next;
  }
  return gross;
}
