import type { EngineInputs, Level } from '../engine/types';
import type { ExperienceBand, WizardState } from './types';

export function bandToLevel(band: ExperienceBand | ''): Level | null {
  if (band === '15+') return 'executive';
  if (band === '6-9' || band === '10-14') return 'lead';
  if (band === '0-2' || band === '3-5') return 'senior';
  return null;
}

export function toEngineInputs(state: WizardState): EngineInputs | null {
  const level = bandToLevel(state.experienceBand);
  if (!level || state.salaryAmount === null || state.salaryAmount <= 0) return null;
  return {
    roleFamily: state.roleFamily,
    level,
    originCountry: state.originCountry,
    currentSalary: {
      amount: state.salaryAmount,
      currency: state.salaryCurrency || 'USD',
      basis: state.salaryBasis,
      gross: state.salaryGross,
    },
    currentPackageOnTop: state.packageOnTop,
    targetCountry: state.targetCountry,
    workArrangement: state.workArrangement,
    employerCountry: state.workArrangement === 'remote-foreign' ? state.employerCountry : undefined,
    employmentType: state.employmentType,
    displayCurrencies: state.displayCurrencies,
  };
}
