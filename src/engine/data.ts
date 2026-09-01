import countriesJson from '../data/countries.json';
import pppJson from '../data/ppp.json';
import taxBracketsJson from '../data/tax-brackets.json';
import hardshipPostsJson from '../data/hardship-posts.json';
import taxJson from '../data/tax-effective.json';
import benchmarksJson from '../data/benchmarks.json';
import packageJson from '../data/package-conventions.json';
import employmentJson from '../data/employment-conventions.json';
import familyJson from '../data/family-context.json';
import type {
  BenchmarkEntry,
  CountryRow,
  Datasets,
  EmploymentConventions,
  FamilyContextData,
  PackageConvention,
  PppRow,
  BracketTable,
  HardshipPost,
  TaxRow,
} from './types';

export function loadDatasets(): Datasets {
  return {
    countries: countriesJson as unknown as CountryRow[],
    ppp: pppJson.rows as unknown as PppRow[],
    tax: taxJson as unknown as TaxRow[],
    taxBrackets: taxBracketsJson as unknown as BracketTable[],
    hardshipPosts: hardshipPostsJson as unknown as HardshipPost[],
    benchmarks: benchmarksJson.entries as unknown as BenchmarkEntry[],
    packageConventions: packageJson as unknown as PackageConvention[],
    employment: employmentJson as unknown as EmploymentConventions,
    family: familyJson as unknown as FamilyContextData,
  };
}
