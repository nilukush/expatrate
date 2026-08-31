export type Level = 'senior' | 'lead' | 'executive';
export type WorkArrangement = 'onsite' | 'remote-local' | 'remote-foreign';
export type EmploymentType = 'full-time' | 'contract' | 'freelance' | 'part-time';

export interface SalaryInput {
  amount: number;
  currency: string;
  basis: 'monthly' | 'annual';
  gross: boolean;
}

export interface PackageOnTop {
  housing?: boolean;
  transport?: boolean;
  schooling?: boolean;
  flights?: boolean;
  health?: boolean;
  bonus?: boolean;
}

export interface EngineInputs {
  roleFamily: string;
  level: Level;
  /** Omitted in entry mode: no prior salary, so no floor is computed. */
  originCountry?: string;
  currentSalary?: SalaryInput;
  currentPackageOnTop?: PackageOnTop;
  targetCountry: string;
  workArrangement: WorkArrangement;
  employerCountry?: string;
  employmentType: EmploymentType;
  displayCurrencies?: string[];
}

export interface FxRates {
  base: string;
  asOf: string;
  rates: Record<string, number>;
}

export interface CountryRow {
  iso3: string;
  name: string;
  currency: string;
  region: string;
  tier: number;
  taxRegime: string;
  packageConvention: string;
}

export interface PppRow {
  iso3: string;
  year: number;
  value: number;
  license: string;
  sourceUrl: string;
  retrievedAt: string;
}

export interface TaxTier {
  label: string;
  effectiveDeduction: number;
  quality: string;
  note: string;
  sourceUrl: string;
}

export interface TaxRow {
  iso3: string;
  tiers: TaxTier[];
}

export interface BenchmarkData {
  family: string;
  level: Level;
  country: string;
  currency: string;
  basis: 'monthly-gross' | 'annual-gross';
  p25: number;
  p50: number;
  p75: number;
  quality: string;
  lastReviewed: string;
  sources: string[];
  note: string;
  status?: undefined;
}

export interface BenchmarkMarker {
  family: string;
  level: Level;
  country: string;
  status: 'insufficient_data';
  reason: string;
  lastReviewed: string;
}

export type BenchmarkEntry = BenchmarkData | BenchmarkMarker;

export interface PackageConvention {
  country: string;
  style: 'gcc-split' | 'single-gross';
  basicPercent: { min: number; max: number } | null;
  housingPercent: { min: number; max: number } | null;
  transportPercent: { min: number; max: number } | null;
  gratuity: string;
  legalBasis: string;
  sourceUrls: string[];
}

export interface EmploymentConventions {
  defaultMonthsPerYear: number;
  dayRateDivisors: { standard: number; usHourlyBasis: number };
  countryOverrides: Array<{
    country: string;
    quality: string;
    note: string;
    sourceUrl: string;
    thirteenthMonthMandatory?: boolean;
    religiousAllowanceTHR?: boolean;
  }>;
}

export interface FamilyContextData {
  educationAllowancePrevalence: Array<{ country: string; shareOfEmployers: number }>;
  prevalenceSource: string;
  prevalenceNote: string;
  schoolFees: Array<{
    country: string;
    currency: string;
    minAnnual: number;
    maxAnnual: number;
    source: string;
    city?: string;
    note?: string;
    maxNote?: string;
  }>;
}

export interface Datasets {
  countries: CountryRow[];
  ppp: PppRow[];
  tax: TaxRow[];
  benchmarks: BenchmarkEntry[];
  packageConventions: PackageConvention[];
  employment: EmploymentConventions;
  family: FamilyContextData;
}

export interface EngineContext {
  datasets: Datasets;
  fx: FxRates;
}

export interface MarketAnchor {
  currency: string;
  p25Monthly: number;
  p50Monthly: number;
  p75Monthly: number;
  targetMonthly: number;
  quality: string;
  sources: string[];
  note: string;
  /** True when the source publishes no upper band; the stretch is capped at p50. */
  partialBand?: boolean;
  /** True when only a median exists; the whole band collapses to p50. */
  medianOnly?: boolean;
}

export interface FloorDerivation {
  netMonthlyTarget: number;
  taxRate: number;
  taxLabel: string;
  taxQuality: string;
  originPpp: number;
  originPppYear: number;
  targetPpp: number;
  targetPppYear: number;
  onTopShare: number;
}

export interface FloorResult {
  currency: string;
  annualGross: number;
  monthlyGross: number;
  derivation: FloorDerivation;
}

export interface QuoteResult {
  currency: string;
  lowMonthly: number;
  targetMonthly: number;
  stretchMonthly: number;
  annualTarget: number;
}

export interface PackageCompositionResult {
  basicMonthly: number;
  housingMonthly: number;
  transportMonthly: number;
  gratuityNote: string;
}

export interface CurrencyRiskResult {
  noticeKey: string;
  usdAnchors: { targetMonthlyUsd?: number; floorMonthlyUsd?: number };
}

export interface ConfidenceResult {
  reasons: EngineMessage[];
  level: 'High' | 'Medium' | 'Low';
}

/** Engine output message: dictionary key plus parameters; the UI renders it localized. */
export interface EngineMessage {
  key: string;
  params?: Record<string, EngineAmount | string | number>;
}

export interface EngineAmount {
  amount: number;
  currency: string;
}

export interface EngineResult {
  status: 'ok' | 'floor-only' | 'insufficient_data';
  /** Null in entry mode (no prior salary to describe). */
  basisLine: string | null;
  anchor: MarketAnchor | null;
  floor: FloorResult | null;
  quote: QuoteResult | null;
  dualAnchors: { employerCountry: string; anchor: MarketAnchor | null } | null;
  employment: { type: EmploymentType; indicative: boolean; dayRate?: number } | null;
  packageComposition: PackageCompositionResult | null;
  currencyRisk: CurrencyRiskResult | null;
  confidence: ConfidenceResult;
  warnings: EngineMessage[];
}
