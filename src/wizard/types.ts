export type ExperienceBand = '0-2' | '3-5' | '6-9' | '10-14' | '15+';
export type EmploymentType = 'full-time' | 'contract' | 'freelance' | 'part-time';
export type WorkArrangement = 'onsite' | 'remote-local' | 'remote-foreign';
export type SalaryBasis = 'monthly' | 'annual';
export type WizardStep = 1 | 2 | 3 | 4 | 5;

export interface PackageOnTopFlags {
  housing?: boolean;
  transport?: boolean;
  schooling?: boolean;
  flights?: boolean;
  bonus?: boolean;
  health?: boolean;
}

export interface JdSalaryHint {
  min: number;
  max: number;
  currency: string;
}

export interface WizardState {
  step: WizardStep;
  roleFamily: string;
  experienceBand: ExperienceBand | '';
  employmentType: EmploymentType;
  companyType: string;
  originCountry: string;
  salaryAmount: number | null;
  salaryCurrency: string;
  salaryBasis: SalaryBasis;
  salaryGross: boolean;
  salaryConfirmed: boolean;
  packageOnTop: PackageOnTopFlags;
  targetCountry: string;
  workArrangement: WorkArrangement;
  employerCountry: string;
  sponsorship: string;
  dependents: string;
  schoolAgeChildren: string;
  displayCurrencies: string[];
  jdSalary: JdSalaryHint | null;
}

export const DEFAULT_STATE: WizardState = {
  step: 1,
  roleFamily: '',
  experienceBand: '',
  employmentType: 'full-time',
  companyType: '',
  originCountry: '',
  salaryAmount: null,
  salaryCurrency: '',
  salaryBasis: 'monthly',
  salaryGross: true,
  salaryConfirmed: false,
  packageOnTop: { housing: false, transport: false, schooling: false, flights: false, bonus: false, health: false },
  targetCountry: '',
  workArrangement: 'onsite',
  employerCountry: '',
  sponsorship: '',
  dependents: '',
  schoolAgeChildren: '',
  displayCurrencies: [],
  jdSalary: null,
};
