import { calculate, evaluateOffer } from '../engine/engine';
import { loadDatasets } from '../engine/data';
import type { CountryRow } from '../engine/types';
import type { EngineResult } from '../engine/types';
import type { FxResult, FxSnapshot } from '../fx';
import { getFxRates } from '../fx';
import fxSnapshotJson from '../data/fx-snapshot.json';
import roleFamiliesJson from '../data/role-families.json';
import { t, setLocale, formatCurrency, getLocale, type Locale } from '../i18n';
import { suggestFamily, suggestYears, extractJdSalary, extractTextFromFile } from './parse';
import { toEngineInputs, bandToLevel } from './derive';
import { clearState, decodeState, encodeState, loadResumeStep, loadState, saveResumeStep, saveState } from './state';
import { DEFAULT_STATE } from './types';
import type { ExperienceBand, WizardState } from './types';

const datasets = loadDatasets();
const countries: CountryRow[] = datasets.countries;
const benchmarkEntries = datasets.benchmarks;
const roleFamilies = roleFamiliesJson.families as Array<{ id: string; name: string }>;
const regionNames: Record<string, Intl.DisplayNames> = {};
const localCountryName = (iso3: string, fallback: string): string => {
  const locale = getLocale();
  if (locale === 'en') return fallback;
  try {
    regionNames[locale] ??= new Intl.DisplayNames([locale], { type: 'region' });
    const iso2 = iso3ToIso2.get(iso3);
    return (iso2 && regionNames[locale].of(iso2)) || fallback;
  } catch {
    return fallback;
  }
};
import iso3Iso2Json from '../data/iso3-iso2.json';
const iso3ToIso2 = new Map(Object.entries(iso3Iso2Json));
const EXPERIENCE_OPTION_VALUES: ExperienceBand[] = ['0-2', '3-5', '6-9', '10-14', '15+'];
const EMPLOYMENT_OPTION_VALUES = ['full-time', 'contract', 'freelance', 'part-time'] as const;
const COMPANY_OPTION_VALUES = ['startup', 'enterprise', 'government', 'ngo'] as const;

function fmt(amount: number, currency: string): string {
  return formatCurrency(amount, currency);
}

function fmtNumbersIn(text: string): string {
  return text.replace(/\d{4,}/g, (digits) =>
    Number.parseInt(digits, 10).toLocaleString('en-US'),
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function selectOptions(
  rows: Array<{ value: string; label: string }>,
  selected: string,
  placeholder: string,
): string {
  // A dropdown with a real default renders no empty placeholder option.
  const placeholderOption = placeholder
    ? [`<option value="">${escapeHtml(placeholder)}</option>`]
    : [];
  return placeholderOption
    .concat(
      rows.map(
        (row) =>
          `<option value="${row.value}"${row.value === selected ? ' selected' : ''}>${escapeHtml(row.label)}</option>`,
      ),
    )
    .join('');
}

function countryRows(selected: string, placeholder: string): string {
  return selectOptions(
    [...countries]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({ value: c.iso3, label: localCountryName(c.iso3, c.name) })),
    selected,
    placeholder,
  );
}

function currencyCodes(): string[] {
  const set = new Set<string>(['USD']);
  for (const country of countries) set.add(country.currency);
  return [...set].sort();
}

interface FieldError {
  fieldId: string;
  message: string;
}

export function mountWizard(wizardEl: HTMLElement, resultsEl: HTMLElement, locale: Locale = 'en'): void {
  setLocale(locale);
  let state: WizardState = loadState() ?? { ...DEFAULT_STATE };

  // A fresh page load always starts at step 1 with saved values; resuming is one click.
  // The furthest step lives under its own key so landing renders never clobber it.
  let resumeStep: WizardState['step'] | null = loadResumeStep() as WizardState['step'] | null;
  state.step = 1;

  const sharedParams = new URLSearchParams(window.location.search);
  const shared = sharedParams.get('w');
  if (shared) {
    const decoded = decodeState(shared);
    if (decoded && toEngineInputs(decoded)) {
      state = { ...decoded, step: 5 };
      resumeStep = null;
      void submit();
    }
  }

  function render(): void {
    wizardEl.hidden = false;
    resultsEl.hidden = true;
    wizardEl.innerHTML = `<div class="wz-step wz-shell">${stepHtml(state.step)}</div>`;
    wireStep(state.step);
    saveState(state);
    saveResumeStep(state.step);
  }

  function stepHtml(step: WizardState['step']): string {
    const heading = (title: string, help: string): string => `
      <h2 id="stepHeading" class="wz-heading" tabindex="-1">${escapeHtml(title)}</h2>
      <p class="wz-help">${escapeHtml(help)}</p>
      <div id="errorSummary" class="wz-error" role="alert" tabindex="-1" hidden></div>`;

    const buttons = (step: WizardState['step']): string => `
      <div class="wz-actions">
        ${step > 1 ? `<button type="button" id="backBtn" class="wz-btn wz-btn-secondary">${escapeHtml(t('wizard.back'))}</button>` : ''}
        ${step === 5
          ? `<button type="button" id="seeQuote" class="wz-btn wz-btn-primary">${escapeHtml(t('wizard.seeQuote'))}</button>`
          : `<button type="button" id="nextBtn" class="wz-btn wz-btn-primary">${escapeHtml(t('wizard.next'))}</button>`}
      </div>`;

    const progress = `
      <div class="wz-progress">
        <p id="stepIndicator" aria-live="polite">${escapeHtml(t('wizard.progress', { n: step, total: 5 }))}</p>
        <div class="wz-bar" aria-hidden="true">${[1, 2, 3, 4, 5]
          .map((segment) => `<span${segment <= step ? ' class="is-on"' : ''}></span>`)
          .join('')}</div>
        <span class="wz-saved" id="autosave">${escapeHtml(t('wizard.saved'))}</span>
        ${resumeStep !== null && step === 1 ? `<button type="button" id="resumeBtn" class="wz-btn wz-btn-chip">${escapeHtml(t('wizard.resume', { n: resumeStep, total: 5 }))}</button>` : ''}
      </div>`;

    if (step === 1) {
      return `${progress}${heading(t('steps.role.title'), t('steps.role.help'))}
        <label for="resumeInput" class="wz-visually-hidden">${escapeHtml(t('parse.resumeLabel'))}</label>
        <div class="wz-field">
          <button type="button" id="dropzoneBtn" class="wz-dropzone">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 13v8"/><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="m8 17 4-4 4 4"/></svg>
            <span class="wz-dropzone-title">${escapeHtml(t('parse.dropTitle'))}</span>
            <span class="wz-dropzone-sub">${escapeHtml(t('parse.dropSub'))}</span>
            <span class="wz-dropzone-cta">${escapeHtml(t('parse.dropCta'))}</span>
          </button>
          <input type="file" id="resumeInput" class="wz-visually-hidden" accept=".pdf,.docx" />
          <div class="wz-file" id="fileChip" hidden>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
            <span class="wz-file-name" id="fileName"></span>
            <span class="wz-file-size" id="fileSize"></span>
            <button type="button" id="clearFile" class="wz-file-remove" aria-label="${escapeHtml(t('parse.removeFile'))}">&times;</button>
          </div>
          <p class="wz-note wz-note-ok" id="resumeNote" hidden></p>
        </div>
        <div class="wz-divider">${escapeHtml(t('wizard.dividerManual'))}</div>
        <div class="wz-grid">
          <div class="wz-field">
            <label for="roleFamily">${escapeHtml(t('steps.role.roleFamily'))}</label>
            <select id="roleFamily" class="wz-select">${selectOptions(roleFamilies.map((f) => ({ value: f.id, label: t(`options.families.${f.id}`) })), state.roleFamily, t('steps.role.roleFamilyPlaceholder'))}</select>
          </div>
          <div class="wz-field">
            <label for="experienceBand">${escapeHtml(t('steps.role.experience'))}</label>
            <select id="experienceBand" class="wz-select">${selectOptions(EXPERIENCE_OPTION_VALUES.map((v) => ({ value: v, label: t(`options.bands.${v}`) })), state.experienceBand, t('steps.role.experiencePlaceholder'))}</select>
          </div>
          <div class="wz-field">
            <label for="employmentType">${escapeHtml(t('steps.role.employmentType'))}</label>
            <select id="employmentType" class="wz-select">${selectOptions(EMPLOYMENT_OPTION_VALUES.map((v) => ({ value: v, label: t(`options.employment.${v}`) })), state.employmentType, '')}</select>
          </div>
          <div class="wz-field">
            <label for="companyType">${escapeHtml(t('steps.role.companyType'))} <span class="wz-optional">(${escapeHtml(t('wizard.optional'))})</span></label>
            <select id="companyType" class="wz-select">${selectOptions(COMPANY_OPTION_VALUES.map((v) => ({ value: v, label: t(`options.company.${v}`) })), state.companyType, t('steps.role.companyTypePlaceholder'))}</select>
          </div>
        </div>
        <div class="wz-field">
          <label for="jdText">${escapeHtml(t('steps.role.jd'))}</label>
          <textarea id="jdText" class="wz-input" rows="4">${escapeHtml('')}</textarea>
          <p class="wz-note">${escapeHtml(t('steps.role.jdHelp'))}</p>
          <p class="wz-note" id="jdSuggestion" hidden></p>
        </div>
        ${buttons(1)}`;
    }

    if (step === 2) {
      const interpretation = interpretationLine(state);
      return `${progress}${heading(t('steps.pay.title'), t('steps.pay.help'))}
        <div class="wz-grid">
          <div class="wz-field">
            ${state.entryMode ? '' : `<label for="originCountry">${escapeHtml(t('steps.pay.originCountry'))}</label>
            <select id="originCountry" class="wz-select">${countryRows(state.originCountry, t('steps.pay.originCountryPlaceholder'))}</select>`}
          </div>
          <div class="wz-field">
            <label for="salaryCurrency">${escapeHtml(t('steps.pay.currency'))}</label>
            <select id="salaryCurrency" class="wz-select">${selectOptions(currencyCodes().map((c) => ({ value: c, label: c })), state.salaryCurrency, 'USD')}</select>
          </div>
        </div>
        <div class="wz-field">
          <label for="salaryAmount">${escapeHtml(t('steps.pay.amount'))}</label>
          <input type="text" id="salaryAmount" class="wz-input" inputmode="decimal" autocomplete="off" value="${state.salaryAmount ?? ''}" />
        </div>
        <fieldset class="wz-seg">
          <legend>${escapeHtml(t('steps.pay.basis'))}</legend>
          <label><input type="radio" id="basisMonthly" name="salaryBasis" value="monthly"${state.salaryBasis === 'monthly' ? ' checked' : ''} /> ${escapeHtml(t('steps.pay.monthly'))}</label>
          <label><input type="radio" id="basisAnnual" name="salaryBasis" value="annual"${state.salaryBasis === 'annual' ? ' checked' : ''} /> ${escapeHtml(t('steps.pay.annual'))}</label>
        </fieldset>
        <fieldset class="wz-seg">
          <legend>${escapeHtml(t('steps.pay.grossNet'))}</legend>
          <label><input type="radio" id="payBasisGross" name="payBasis" value="gross"${state.salaryGross ? ' checked' : ''} /> ${escapeHtml(t('steps.pay.gross'))}</label>
          <label><input type="radio" id="payBasisNet" name="payBasis" value="net"${!state.salaryGross ? ' checked' : ''} /> ${escapeHtml(t('steps.pay.net'))}</label>
        </fieldset>
        <p class="wz-interpretation" id="interpretation">${escapeHtml(interpretation)}</p>
        <div class="wz-field">
          <label class="wz-check"><input type="checkbox" id="entryMode"${state.entryMode ? ' checked' : ''} /> ${escapeHtml(t('steps.pay.entryToggle'))}</label>
          <label class="wz-check"><input type="checkbox" id="salaryConfirmed"${state.salaryConfirmed ? ' checked' : ''} /> ${escapeHtml(t('steps.pay.confirm'))}</label>
        </div>
        <fieldset class="wz-seg">
          <legend>${escapeHtml(t('steps.pay.packageTitle'))}</legend>
          ${(['housing', 'transport', 'schooling', 'flights', 'health', 'bonus'] as const)
            .map(
              (key) =>
                `<label class="wz-check"><input type="checkbox" id="pkg${key[0].toUpperCase()}${key.slice(1)}" data-package="${key}"${state.packageOnTop[key] ? ' checked' : ''} /> ${escapeHtml(t(`steps.pay.${key}`))}</label>`,
            )
            .join('')}
        </fieldset>
        ${buttons(2)}`;
    }

    if (step === 3) {
      return `${progress}${heading(t('steps.opportunity.title'), t('steps.opportunity.help'))}
        <div class="wz-field">
          <label for="targetCountry">${escapeHtml(t('steps.opportunity.targetCountry'))}</label>
          <select id="targetCountry" class="wz-select">${countryRows(state.targetCountry, t('steps.opportunity.targetCountryPlaceholder'))}</select>
          <p class="wz-note" id="coverageHint"${state.targetCountry ? '' : ' hidden'}>${escapeHtml(coverageNote())}</p>
        </div>
        <fieldset class="wz-seg">
          <legend>${escapeHtml(t('steps.opportunity.arrangement'))}</legend>
          <label><input type="radio" id="wrOnsite" name="workArrangement" value="onsite"${state.workArrangement === 'onsite' ? ' checked' : ''} /> ${escapeHtml(t('steps.opportunity.onsite'))}</label>
          <label><input type="radio" id="wrRemoteLocal" name="workArrangement" value="remote-local"${state.workArrangement === 'remote-local' ? ' checked' : ''} /> ${escapeHtml(t('steps.opportunity.remoteLocal'))}</label>
          <label><input type="radio" id="wrRemoteForeign" name="workArrangement" value="remote-foreign"${state.workArrangement === 'remote-foreign' ? ' checked' : ''} /> ${escapeHtml(t('steps.opportunity.remoteForeign'))}</label>
        </fieldset>
        <div class="wz-field" id="employerCountryWrap"${state.workArrangement === 'remote-foreign' ? '' : ' hidden'}>
          <label for="employerCountry">${escapeHtml(t('steps.opportunity.employerCountry'))}</label>
          <select id="employerCountry" class="wz-select">${countryRows(state.employerCountry, t('steps.opportunity.employerCountryPlaceholder'))}</select>
        </div>
        <div class="wz-field">
          <label for="sponsorshipSelect">${escapeHtml(t('steps.opportunity.sponsorship'))} <span class="wz-optional">(${escapeHtml(t('wizard.optional'))})</span></label>
          <select id="sponsorshipSelect" class="wz-select">
            <option value="">${escapeHtml(t('steps.opportunity.sponsorshipPlaceholder'))}</option>
            <option value="not-needed"${state.sponsorship === 'not-needed' ? ' selected' : ''}>${escapeHtml(t('steps.opportunity.sponsorshipNotNeeded'))}</option>
            <option value="needed"${state.sponsorship === 'needed' ? ' selected' : ''}>${escapeHtml(t('steps.opportunity.sponsorshipNeeded'))}</option>
          </select>
        </div>
        ${buttons(3)}`;
    }

    if (step === 4) {
      return `${progress}${heading(t('steps.family.title'), t('steps.family.help'))}
        <div class="wz-grid">
          <div class="wz-field">
            <label for="dependents">${escapeHtml(t('steps.family.dependents'))}</label>
            <select id="dependents" class="wz-select">${selectOptions(['0', '1', '2', '3', '4', '5'].map((n) => ({ value: n, label: n })), state.dependents, '0')}</select>
          </div>
          <div class="wz-field">
            <label for="schoolAgeChildren">${escapeHtml(t('steps.family.schoolAge'))}</label>
            <select id="schoolAgeChildren" class="wz-select">${selectOptions(['0', '1', '2', '3', '4', '5'].map((n) => ({ value: n, label: n })), state.schoolAgeChildren, '0')}</select>
          </div>
        </div>
        <p class="wz-note">${escapeHtml(t('steps.family.skipNote'))}</p>
        <div class="wz-actions">
          <button type="button" id="backBtn" class="wz-btn wz-btn-secondary">${escapeHtml(t('wizard.back'))}</button>
          <button type="button" id="skipFamily" class="wz-btn wz-btn-secondary">${escapeHtml(t('wizard.skip'))}</button>
          <button type="button" id="nextBtn" class="wz-btn wz-btn-primary">${escapeHtml(t('wizard.next'))}</button>
        </div>`;
    }

    const checked = new Set(state.displayCurrencies.length > 0 ? state.displayCurrencies : defaultDisplayCurrencies(state));
    return `${progress}${heading(t('steps.display.title'), t('steps.display.help'))}
      <fieldset class="wz-seg wz-checks">
        <legend>${escapeHtml(t('steps.display.title'))}</legend>
        ${currencyCodes()
          .map(
            (code) =>
              `<label class="wz-check"><input type="checkbox" name="displayCurrency" value="${code}"${checked.has(code) ? ' checked' : ''} /> ${code}</label>`,
          )
          .join('')}
      </fieldset>
      <p class="wz-note">${escapeHtml(t('steps.display.seeAlso'))}</p>
      ${buttons(5)}`;
  }

  function defaultDisplayCurrencies(state: WizardState): string[] {
    const target = countries.find((c) => c.iso3 === state.targetCountry);
    return target ? ['USD', target.currency] : ['USD'];
  }

  function coverageNote(): string {
    if (!state.targetCountry) return '';
    const level = bandToLevel(state.experienceBand);
    if (level === null) return t('steps.opportunity.coverageNo');
    const hasMarket = benchmarkEntries.some(
      (entry) =>
        entry.family === state.roleFamily &&
        entry.level === level &&
        entry.country === state.targetCountry &&
        !('status' in entry && entry.status === 'insufficient_data'),
    );
    return hasMarket ? t('steps.opportunity.coverageYes') : t('steps.opportunity.coverageNo');
  }

  function interpretationLine(state: WizardState): string {
    if (state.salaryAmount === null || state.salaryAmount <= 0 || !state.salaryCurrency) {
      return '';
    }
    const months = 12;
    const currency = state.salaryCurrency;
    const basisWord = t(`options.grossNet.${state.salaryGross ? 'gross' : 'net'}`);
    if (state.salaryBasis === 'monthly') {
      const annual = state.salaryAmount * months;
      return t('results.interpretMonthly', { amount: fmt(state.salaryAmount, currency), basis: basisWord, annual: fmt(annual, currency) });
    }
    const monthly = state.salaryAmount / months;
    return t('results.interpretAnnual', { amount: fmt(state.salaryAmount, currency), basis: basisWord, monthly: fmt(monthly, currency) });
  }

  function validateStep(step: WizardState['step']): FieldError[] {
    const errors: FieldError[] = [];
    if (step === 1) {
      if (!state.roleFamily) errors.push({ fieldId: 'roleFamily', message: t('errors.roleFamily') });
      if (!state.experienceBand) errors.push({ fieldId: 'experienceBand', message: t('errors.experienceBand') });
    }
    if (step === 2) {
      if (!state.entryMode && !state.originCountry) errors.push({ fieldId: 'originCountry', message: t('errors.originCountry') });
      if (!state.entryMode && (state.salaryAmount === null || Number.isNaN(state.salaryAmount) || state.salaryAmount <= 0)) {
        errors.push({ fieldId: 'salaryAmount', message: t('errors.salaryAmount') });
      }
      if (!state.entryMode && !state.salaryConfirmed) errors.push({ fieldId: 'salaryConfirmed', message: t('errors.salaryConfirmed') });
    }
    if (step === 3) {
      if (!state.targetCountry) errors.push({ fieldId: 'targetCountry', message: t('errors.targetCountry') });
      if (state.workArrangement === 'remote-foreign' && !state.employerCountry) {
        errors.push({ fieldId: 'employerCountry', message: t('errors.employerCountry') });
      }
    }
    return errors;
  }

  function showErrorSummary(errors: FieldError[]): void {
    const summary = wizardEl.querySelector<HTMLElement>('#errorSummary');
    if (!summary) return;
    if (errors.length === 0) {
      summary.hidden = true;
      summary.innerHTML = '';
      return;
    }
    summary.innerHTML = `
      <p class="wz-error-title">${escapeHtml(t('wizard.errorTitle'))}</p>
      <ul>
        ${errors.map((error) => `<li><a href="#${error.fieldId}">${escapeHtml(error.message)}</a></li>`).join('')}
      </ul>`;
    summary.hidden = false;
    summary.focus();
  }

  function focusHeading(): void {
    const heading = wizardEl.querySelector<HTMLElement>('#stepHeading');
    heading?.focus();
  }

  function goNext(): void {
    resumeStep = null;
    const errors = validateStep(state.step);
    if (errors.length > 0) {
      showErrorSummary(errors);
      return;
    }
    if (state.step === 5) {
      void submit();
      return;
    }
    if (state.step === 4) state.displayCurrencies = state.displayCurrencies.length > 0 ? state.displayCurrencies : defaultDisplayCurrencies(state);
    state.step = Math.min(5, state.step + 1) as WizardState['step'];
    render();
    focusHeading();
  }

  function goBack(): void {
    resumeStep = null;
    if (state.step === 1) return;
    state.step = Math.max(1, state.step - 1) as WizardState['step'];
    render();
    focusHeading();
  }

  function wireStep(step: WizardState['step']): void {
    wizardEl.querySelector('#resumeBtn')?.addEventListener('click', () => {
      if (resumeStep === null) return;
      state.step = resumeStep;
      resumeStep = null;
      render();
      focusHeading();
    });
    wizardEl.querySelector('#nextBtn')?.addEventListener('click', goNext);
    wizardEl.querySelector('#seeQuote')?.addEventListener('click', goNext);
    wizardEl.querySelector('#skipFamily')?.addEventListener('click', () => {
      // Skip is the escape hatch: it drops the optional answers entirely.
      state.dependents = '';
      state.schoolAgeChildren = '';
      saveState(state);
      goNext();
    });
    wizardEl.querySelector('#backBtn')?.addEventListener('click', goBack);

    const readSelection = (id: string, apply: (value: string) => void) => {
      const element = wizardEl.querySelector<HTMLSelectElement>(`#${id}`);
      element?.addEventListener('change', () => {
        apply(element.value);
        saveState(state);
      });
    };

    if (step === 1) {
      readSelection('roleFamily', (value) => { state.roleFamily = value; });
      readSelection('experienceBand', (value) => { state.experienceBand = value as ExperienceBand; });
      readSelection('employmentType', (value) => { state.employmentType = value as WizardState['employmentType']; });
      readSelection('companyType', (value) => { state.companyType = value; });

      const resumeInput = wizardEl.querySelector<HTMLInputElement>('#resumeInput');
      const resumeNote = wizardEl.querySelector<HTMLElement>('#resumeNote');
      const dropzone = wizardEl.querySelector<HTMLElement>('#dropzoneBtn');
      const fileChip = wizardEl.querySelector<HTMLElement>('#fileChip');
      const fileNameEl = wizardEl.querySelector<HTMLElement>('#fileName');
      const fileSizeEl = wizardEl.querySelector<HTMLElement>('#fileSize');

      const showFileChip = (file: File): void => {
        if (fileNameEl) fileNameEl.textContent = file.name;
        if (fileSizeEl) fileSizeEl.textContent = `${Math.max(1, Math.round(file.size / 1024))} KB`;
        if (fileChip) fileChip.hidden = false;
        if (dropzone) dropzone.hidden = true;
      };

      const parseResume = async (file: File): Promise<void> => {
        if (!resumeNote) return;
        resumeNote.hidden = false;
        resumeNote.className = 'wz-note';
        resumeNote.textContent = t('parse.reading');
        try {
          const text = await extractTextFromFile(file);
          const applied: string[] = [];
          const family = suggestFamily(text);
          if (family) {
            state.roleFamily = family;
            const select = wizardEl.querySelector<HTMLSelectElement>('#roleFamily');
            if (select) select.value = family;
            applied.push('role family');
          }
          const band = suggestYears(text);
          if (band) {
            state.experienceBand = band;
            const select = wizardEl.querySelector<HTMLSelectElement>('#experienceBand');
            if (select) select.value = band;
            applied.push('experience');
          }
          saveState(state);
          resumeNote.className = 'wz-note wz-note-ok';
          resumeNote.textContent = applied.length > 0
            ? `${t('parse.applied', { what: applied.join(', ') })}${applied.includes('role family') ? ` ${t('parse.appliedSwitchNote')}` : ''} ${t('wizard.privacy')}`
            : t('parse.noHints');
        } catch {
          resumeNote.className = 'wz-note wz-note-warn';
          resumeNote.textContent = t('parse.failed');
        }
      };

      const handleFile = (file: File | undefined): void => {
        if (!file) return;
        showFileChip(file);
        void parseResume(file);
      };

      if (dropzone && resumeInput) {
        dropzone.addEventListener('click', () => resumeInput.click());
        dropzone.addEventListener('dragover', (event) => {
          event.preventDefault();
          dropzone.classList.add('is-drag');
        });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-drag'));
        dropzone.addEventListener('drop', (event) => {
          event.preventDefault();
          dropzone.classList.remove('is-drag');
          const file = event.dataTransfer?.files[0];
          if (file) {
            const transfer = new DataTransfer();
            transfer.items.add(file);
            resumeInput.files = transfer.files;
          }
          handleFile(file);
        });
      }
      resumeInput?.addEventListener('change', () => handleFile(resumeInput.files?.[0]));
      wizardEl.querySelector('#clearFile')?.addEventListener('click', () => {
        if (!resumeInput) return;
        resumeInput.value = '';
        if (fileChip) fileChip.hidden = true;
        if (dropzone) dropzone.hidden = false;
        if (resumeNote) resumeNote.hidden = true;
      });

      const jd = wizardEl.querySelector<HTMLTextAreaElement>('#jdText');
      const jdSuggestion = wizardEl.querySelector<HTMLElement>('#jdSuggestion');
      let jdTimer: ReturnType<typeof setTimeout> | undefined;
      const applyJdSuggestion = (): void => {
        if (!jdSuggestion) return;
        // Salary range and role family are both read locally from the description.
        state.jdSalary = extractJdSalary(jd?.value ?? '');
        const family = suggestFamily(jd?.value ?? '');
        jdSuggestion.replaceChildren();
        // Silent when there is nothing new to say: same family, or nothing detected.
        if (!family || family === state.roleFamily) {
          jdSuggestion.hidden = true;
          saveState(state);
          return;
        }
        const label = roleFamilies.find((f) => f.id === family)?.name ?? family;
        if (!state.roleFamily) {
          // Nothing chosen yet: fill it, exactly like the resume path.
          state.roleFamily = family;
          const select = wizardEl.querySelector<HTMLSelectElement>('#roleFamily');
          if (select) select.value = family;
          saveState(state);
          jdSuggestion.hidden = true;
          return;
        }
        const use = document.createElement('button');
        use.type = 'button';
        use.className = 'wz-btn wz-btn-chip';
        use.textContent = t('steps.role.jdSwitch');
        use.addEventListener('click', () => {
          state.roleFamily = family;
          const select = wizardEl.querySelector<HTMLSelectElement>('#roleFamily');
          if (select) select.value = family;
          saveState(state);
          jdSuggestion.hidden = true;
          jdSuggestion.replaceChildren();
        });
        jdSuggestion.append(`${t('steps.role.jdSuggestion', { family: label })} `);
        jdSuggestion.append(use);
        jdSuggestion.hidden = false;
      };
      // React while typing (debounced) so the layout settles long before any button click:
      // a suggestion appearing on blur used to shift the row and swallow the first Continue click.
      jd?.addEventListener('input', () => {
        clearTimeout(jdTimer);
        jdTimer = setTimeout(applyJdSuggestion, 400);
      });
    }

    if (step === 2) {
      const entryBox = wizardEl.querySelector<HTMLInputElement>('#entryMode');
      entryBox?.addEventListener('change', () => {
        state.entryMode = entryBox.checked;
        if (entryBox.checked) {
          state.salaryAmount = null;
          state.salaryConfirmed = false;
        }
        saveState(state);
        render();
      });
      const origin = wizardEl.querySelector<HTMLSelectElement>('#originCountry');
      const currencySelect = wizardEl.querySelector<HTMLSelectElement>('#salaryCurrency');
      origin?.addEventListener('change', () => {
        state.originCountry = origin.value;
        const country = countries.find((c) => c.iso3 === origin.value);
        if (country && currencySelect) {
          state.salaryCurrency = country.currency;
          currencySelect.value = country.currency;
        }
        updateInterpretation();
        saveState(state);
      });
      currencySelect?.addEventListener('change', () => {
        state.salaryCurrency = currencySelect.value;
        updateInterpretation();
        saveState(state);
      });
      const amount = wizardEl.querySelector<HTMLInputElement>('#salaryAmount');
      amount?.addEventListener('input', () => {
        state.salaryAmount = amount.value.trim() === '' ? null : Number.parseFloat(amount.value.replace(/,/g, ''));
        updateInterpretation();
        saveState(state);
      });
      wizardEl.querySelectorAll<HTMLInputElement>('input[name="salaryBasis"]').forEach((radio) => {
        radio.addEventListener('change', () => {
          state.salaryBasis = radio.value === 'annual' ? 'annual' : 'monthly';
          state.salaryConfirmed = false;
          const confirmBox = wizardEl.querySelector<HTMLInputElement>('#salaryConfirmed');
          if (confirmBox) confirmBox.checked = false;
          updateInterpretation();
          saveState(state);
        });
      });
      wizardEl.querySelectorAll<HTMLInputElement>('input[name="payBasis"]').forEach((radio) => {
        radio.addEventListener('change', () => {
          state.salaryGross = radio.value === 'gross';
          updateInterpretation();
          saveState(state);
        });
      });
      const confirmBox = wizardEl.querySelector<HTMLInputElement>('#salaryConfirmed');
      confirmBox?.addEventListener('change', () => {
        state.salaryConfirmed = confirmBox.checked;
        saveState(state);
      });
      wizardEl.querySelectorAll<HTMLInputElement>('input[data-package]').forEach((box) => {
        box.addEventListener('change', () => {
          const key = box.dataset.package as keyof WizardState['packageOnTop'];
          state.packageOnTop[key] = box.checked;
          saveState(state);
        });
      });
    }

    if (step === 3) {
      readSelection('targetCountry', (value) => {
        state.targetCountry = value;
        const hint = wizardEl.querySelector<HTMLElement>('#coverageHint');
        if (hint) {
          hint.textContent = coverageNote();
          hint.hidden = !state.targetCountry;
        }
      });
      const wrap = wizardEl.querySelector<HTMLElement>('#employerCountryWrap');
      const employer = wizardEl.querySelector<HTMLSelectElement>('#employerCountry');
      wizardEl.querySelectorAll<HTMLInputElement>('input[name="workArrangement"]').forEach((radio) => {
        radio.addEventListener('change', () => {
          state.workArrangement = radio.value as WizardState['workArrangement'];
          if (wrap) wrap.hidden = state.workArrangement !== 'remote-foreign';
          saveState(state);
        });
      });
      employer?.addEventListener('change', () => {
        state.employerCountry = employer.value;
        saveState(state);
      });
      readSelection('sponsorshipSelect', (value) => { state.sponsorship = value; });
    }

    if (step === 4) {
      readSelection('dependents', (value) => { state.dependents = value; });
      readSelection('schoolAgeChildren', (value) => { state.schoolAgeChildren = value; });
    }

    if (step === 5) {
      wizardEl.querySelectorAll<HTMLInputElement>('input[name="displayCurrency"]').forEach((box) => {
        box.addEventListener('change', () => {
          const set = new Set(state.displayCurrencies);
          if (box.checked) set.add(box.value);
          else set.delete(box.value);
          state.displayCurrencies = [...set];
          saveState(state);
        });
      });
    }
  }

  function updateInterpretation(): void {
    const line = wizardEl.querySelector<HTMLElement>('#interpretation');
    if (line) line.textContent = interpretationLine(state);
  }

  async function submit(): Promise<void> {
    const inputs = toEngineInputs(state);
    if (!inputs) {
      showErrorSummary([{ fieldId: 'salaryAmount', message: t('errors.salaryAmount') }]);
      return;
    }
    const datasets = loadDatasets();
    let fx: FxResult;
    try {
      fx = await getFxRates({ snapshot: fxSnapshotJson as unknown as FxSnapshot });
    } catch {
      fx = {
        rates: (fxSnapshotJson as unknown as FxSnapshot).rates,
        asOf: (fxSnapshotJson as unknown as FxSnapshot).asOf,
        source: 'snapshot',
        warning: t('results.fx', { source: 'snapshot', date: (fxSnapshotJson as unknown as FxSnapshot).asOf }),
      };
    }
    let result: EngineResult;
    try {
      result = calculate(inputs, { datasets, fx });
    } catch (error) {
      showErrorSummary([
        { fieldId: 'salaryAmount', message: error instanceof Error ? error.message : t('errors.salaryAmount') },
      ]);
      return;
    }
    renderResults(result, fx);
  }


  function engineMessage(message: { key: string; params?: Record<string, unknown> }): string {
    const params: Record<string, string | number> = {};
    for (const [name, value] of Object.entries(message.params ?? {})) {
      if (value && typeof value === 'object' && 'amount' in (value as Record<string, unknown>)) {
        const v = value as { amount: number; currency: string };
        params[name] = fmt(v.amount, v.currency);
      } else if (typeof value === 'string' || typeof value === 'number') {
        params[name] = value;
      }
    }
    return t(`engine.${message.key}`, params);
  }

  function localizedBasisLine(engineLine: string): string {
    // The engine composes English; rebuild the same sentence from the localized dictionary.
    const origin = countries.find((c) => c.iso3 === state.originCountry);
    if (!origin) return engineLine;
    const currency = state.salaryCurrency || origin.currency;
    const months = 12;
    const amount = state.salaryAmount ?? 0;
    const monthly = state.salaryBasis === 'monthly' ? amount : amount / months;
    const annual = state.salaryBasis === 'monthly' ? amount * months : amount;
    return t('results.basisLine', {
      monthly: fmt(monthly, currency),
      annual: fmt(annual, currency),
      basis: t(`options.grossNet.${state.salaryGross ? 'gross' : 'net'}`),
      country: localCountryName(origin.iso3, origin.name),
    });
  }

  function renderResults(result: EngineResult, fx: FxResult): void {
    wizardEl.hidden = true;
    resultsEl.hidden = false;

    const quote = result.quote;
    const sections: string[] = [];

    const floorMath = (floor: NonNullable<EngineResult['floor']>): string => {
      const d = floor.derivation;
      return `<div class="wz-floor-math">
        <p>${escapeHtml(t('results.floorMathNet', {
          net: fmt(d.netMonthlyTarget, floor.currency),
          originPpp: d.originPpp,
          targetPpp: d.targetPpp,
        }))}</p>
        <p>${escapeHtml(t('results.floorMathTax', {
          rate: Math.round(d.taxRate * 100),
          label: d.taxLabel,
          quality: d.taxQuality,
          gross: fmt(floor.monthlyGross, floor.currency),
        }))}</p>
      </div>`;
    };

    if (result.status === 'insufficient_data') {
      sections.push(`<div class="wz-card"><h3>${escapeHtml(t('results.insufficientTitle'))}</h3><p>${escapeHtml(t('results.insufficientBody'))}</p></div>`);
    } else if (result.status === 'floor-only' && result.floor) {
      sections.push(`<div class="wz-card"><h3>${escapeHtml(t('results.floorOnlyTitle'))}</h3><p>${escapeHtml(t('results.floorOnlyBody'))}</p><p class="wz-label wz-floor-label">${escapeHtml(t('results.floorOnlyLabel'))}</p><p class="wz-hero">${escapeHtml(fmt(result.floor.monthlyGross, result.floor.currency))} <span class="wz-unit">${escapeHtml(t('results.perMonth'))}</span></p>${floorMath(result.floor)}<p class="wz-note">${escapeHtml(t('results.floorGuidance'))}</p></div>`);
    }

    if (quote) {
      const low = quote.lowMonthly;
      const stretch = quote.stretchMonthly;
      const span = Math.max(1, stretch - low);
      const position = Math.min(96, Math.max(4, ((quote.targetMonthly - low) / span) * 100));
      const mid = result.anchor ? fmt(result.anchor.p50Monthly, result.anchor.currency) : '';
      // Where the user's current pay sits in this band, converted at today's rates.
      let priorMonthly: number | null = null;
      if (state.salaryAmount !== null && state.salaryCurrency) {
        const fromRate = fx.rates[state.salaryCurrency];
        const toRate = fx.rates[quote.currency];
        if (fromRate !== undefined && toRate !== undefined) {
          const annual = state.salaryAmount * (state.salaryBasis === 'monthly' ? 12 : 1);
          priorMonthly = ((annual / fromRate) * toRate) / 12;
        }
      }
      let priorTick = '';
      let priorLegend = '';
      if (priorMonthly !== null) {
        const clamped = Math.min(98, Math.max(2, ((priorMonthly - low) / span) * 100));
        const where = priorMonthly < low
          ? t('results.priorBelow')
          : priorMonthly > stretch
            ? t('results.priorAbove')
            : t('results.priorWithin');
        priorTick = `<div class="wz-range-tick wz-range-tick-prior" style="inset-inline-start: ${clamped.toFixed(1)}%"></div>`;
        priorLegend = `<div class="wz-range-legend">
            <span><i class="wz-dot wz-dot-quote"></i>${escapeHtml(t('results.legendQuote'))}</span>
            <span><i class="wz-dot wz-dot-prior"></i>${escapeHtml(t('results.legendYou', { amount: fmt(priorMonthly, quote.currency) }))} ${escapeHtml(where)}</span>
          </div>`;
      }
      sections.push(`
        <div class="wz-card wz-card-hero">
          <p class="wz-label">${escapeHtml(t('results.quoteThis'))}</p>
          <p class="wz-hero" id="quoteTarget">${escapeHtml(fmt(quote.targetMonthly, quote.currency))} <span class="wz-unit">${escapeHtml(t('results.perMonth'))}</span></p>
          <p class="wz-sub">${escapeHtml(fmt(quote.annualTarget, quote.currency))} ${escapeHtml(t('results.perYear'))}</p>
          <div class="wz-range">
            <div class="wz-range-track">
              <div class="wz-range-fill" style="inline-size: ${position.toFixed(1)}%"></div>
              ${priorTick}
              <div class="wz-range-tick" style="inset-inline-start: ${position.toFixed(1)}%"></div>
            </div>
            <div class="wz-range-labels">
              <span>${escapeHtml(fmt(low, quote.currency))}<small>P25</small></span>
              ${mid ? `<span class="wz-range-mid">${escapeHtml(mid)}<small>P50</small></span>` : ''}
              <span class="wz-range-end">${escapeHtml(fmt(stretch, quote.currency))}<small>P75</small></span>
            </div>
            ${priorLegend}
          </div>
          <p class="wz-sub">${escapeHtml(t('results.range', { low: fmt(low, quote.currency), stretch: fmt(stretch, quote.currency) }))}</p>
        </div>`);
    }

    if (result.floor) {
      const floorAnnual = result.floor.annualGross;
      const ceilingAnnual = quote ? quote.stretchMonthly * 12 : null;
      const floorAboveMarket = ceilingAnnual !== null && floorAnnual > ceilingAnnual;
      const onTopLine = result.floor.derivation.onTopShare > 0
        ? `<p>${escapeHtml(t('results.floorMathOnTop', { pct: Math.round(result.floor.derivation.onTopShare * 100) }))}</p>`
        : '';
      const mathWithOnTop = floorMath(result.floor).replace('</div>', `${onTopLine}</div>`);
      if (floorAboveMarket) {
        const cut = Math.round((1 - (ceilingAnnual as number) / floorAnnual) * 100);
        sections.push(`<div class="wz-card wz-card-warning"><h3>${escapeHtml(t('results.floorAboveTitle'))}</h3><p id="floorLine">${escapeHtml(fmtNumbersIn(t('results.floorAboveBody', {
          pct: cut,
          ceiling: fmt(ceilingAnnual as number, result.floor.currency),
          floor: fmt(floorAnnual, result.floor.currency),
        })))}</p>${mathWithOnTop}</div>`);
      } else {
        sections.push(`<div class="wz-card"><h3>${escapeHtml(t('results.floorTitle'))}</h3><p id="floorLine">${escapeHtml(t('results.floorBody', { amount: fmt(result.floor.monthlyGross, result.floor.currency) }))}</p>${mathWithOnTop}</div>`);
      }
    }

    const jdSalary = state.jdSalary;
    if (jdSalary && (result.floor || quote)) {
      const localCurrency = jdSalary.currency || quote?.currency || result.floor?.currency || 'USD';
      const stated =
        jdSalary.min === jdSalary.max
          ? fmt(jdSalary.min, localCurrency)
          : `${fmt(jdSalary.min, localCurrency)} to ${fmt(jdSalary.max, localCurrency)}`;
      const floorAnnual = result.floor ? result.floor.annualGross : null;
      let body: string;
      if (floorAnnual !== null && jdSalary.max < floorAnnual) {
        const shortfall = Math.round((1 - jdSalary.max / floorAnnual) * 100);
        body = t('results.employerBelow', { stated, floor: fmt(floorAnnual, result.floor!.currency), pct: shortfall });
      } else if (floorAnnual !== null && jdSalary.min < floorAnnual && floorAnnual <= jdSalary.max) {
        body = t('results.employerOverlap', { stated, floor: fmt(floorAnnual, result.floor!.currency), top: fmt(jdSalary.max, localCurrency) });
      } else if (floorAnnual !== null) {
        body = t('results.employerAbove', { stated, floor: fmt(floorAnnual, result.floor!.currency) });
      } else {
        body = t('results.employerVsQuote', { stated, quote: fmt(quote!.annualTarget, quote!.currency) });
      }
      const isBelow = floorAnnual !== null && jdSalary.max < floorAnnual;
      sections.push(`<div class="wz-card${isBelow ? ' wz-card-warning' : ''}" id="employerCard"><h3>${escapeHtml(t('results.employerTitle'))}</h3><p>${escapeHtml(fmtNumbersIn(body))}</p><p class="wz-note">${escapeHtml(t('results.employerNote', { cur: localCurrency }))}</p></div>`);
    }

    if (result.confidence) {
      sections.push(`<div class="wz-card"><p id="confidenceLine"><strong>${escapeHtml(t('results.confidence', { level: result.confidence.level }))}</strong></p><ul class="wz-reasons">${result.confidence.reasons.map((reason) => `<li>${escapeHtml(engineMessage(reason))}</li>`).join('')}</ul></div>`);
    }

    if (result.dualAnchors) {
      const employerAnchor = result.dualAnchors.anchor;
      const employerName = countries.find((c) => c.iso3 === result.dualAnchors?.employerCountry)?.name ?? result.dualAnchors.employerCountry;
      const employerLine = employerAnchor
        ? `${fmt(employerAnchor.targetMonthly, employerAnchor.currency)} ${t('results.perMonth')} (${employerName})`
        : `${t('results.insufficientBody')} (${employerName})`;
      sections.push(`<div class="wz-card" id="dualLine"><h3>${escapeHtml(t('results.dualTitle'))}</h3><p>${escapeHtml(employerLine)}</p></div>`);
    }

    if (result.packageComposition) {
      const composition = result.packageComposition;
      sections.push(`<div class="wz-card" id="packageCard"><h3>${escapeHtml(t('results.packageTitle'))}</h3>
        <p>${escapeHtml(t('results.packageBasic', { amount: fmt(composition.basicMonthly, result.quote?.currency ?? 'USD') }))}</p>
        <p>${escapeHtml(t('results.packageHousing', { amount: fmt(composition.housingMonthly, result.quote?.currency ?? 'USD') }))}</p>
        <p>${escapeHtml(t('results.packageTransport', { amount: fmt(composition.transportMonthly, result.quote?.currency ?? 'USD') }))}</p>
        <p class="wz-note">${escapeHtml(composition.gratuityNote)}</p></div>`);
    }

    if (result.currencyRisk) {
      const usd = result.currencyRisk.usdAnchors;
      const usdText = usd.targetMonthlyUsd !== undefined
        ? fmt(usd.targetMonthlyUsd, 'USD')
        : usd.floorMonthlyUsd !== undefined ? fmt(usd.floorMonthlyUsd, 'USD') : '';
      sections.push(`<div class="wz-card wz-card-warning"><h3>${escapeHtml(t('results.currencyRiskTitle'))}</h3><p>${escapeHtml(t(`engine.${result.currencyRisk.noticeKey}`))}</p>${usdText ? `<p><strong>${escapeHtml(usdText)} USD</strong> ${escapeHtml(t('results.perMonth'))}</p>` : ''}</div>`);
    }

    const warnings: Array<{ key: string; params?: Record<string, unknown> }> = [...result.warnings];
    if (warnings.length > 0) {
      sections.push(`<div class="wz-card wz-card-warning"><h3>${escapeHtml(t('results.warningsTitle'))}</h3><ul id="warningsList">${warnings.map((warning) => `<li>${escapeHtml(engineMessage(warning))}</li>`).join('')}</ul></div>`);
    }

    if (quote) {
      const others = state.displayCurrencies.filter((code) => code !== quote.currency);
      if (others.length > 0) {
        const lines = others
          .filter((code) => fx.rates[code] !== undefined)
          .map((code) => {
            const converted = quote.targetMonthly / fx.rates[quote.currency] * fx.rates[code];
            return `<li>${escapeHtml(fmt(converted, code))} ${escapeHtml(t('results.perMonth'))}</li>`;
          })
          .join('');
        sections.push(`<div class="wz-card"><h3>${escapeHtml(t('results.displayIn'))}</h3><ul>${lines}</ul></div>`);
      }
    }

    sections.push(`<div class="wz-card"><h3>${escapeHtml(t('results.basisTitle'))}</h3>${result.basisLine ? `<p id="basisLine">${escapeHtml(fmtNumbersIn(localizedBasisLine(result.basisLine)))}</p>` : `<p id="basisLine" class="wz-note">${escapeHtml(t('engine.entryMode'))}</p>`}<p class="wz-note" id="fxLine">${escapeHtml(t('results.fx', { source: fx.source, date: fx.asOf }))}</p></div>`);

    resultsEl.innerHTML = `
      <h2 id="resultsHeading" class="wz-heading" tabindex="-1">${escapeHtml(t('results.heading'))}</h2>
      <div class="wz-grid-results">${sections.join('')}</div>
      <div class="wz-card" id="offerCard">
        <h3>${escapeHtml(t('results.offerTitle'))}</h3>
        <p class="wz-note">${escapeHtml(t('results.offerHelp'))}</p>
        <div class="wz-row">
          <input type="text" id="offerAmount" class="wz-input" inputmode="decimal" autocomplete="off" placeholder="${escapeHtml(t('results.offerPlaceholder'))}" />
          <select id="offerCurrency" class="wz-select">${selectOptions(currencyCodes().map((c) => ({ value: c, label: c })), result.quote?.currency ?? 'USD', 'USD')}</select>
          <select id="offerBasis" class="wz-select"><option value="monthly">${escapeHtml(t('options.grossNet') ? '' : '')}${escapeHtml(t('results.perMonth'))}</option><option value="annual">${escapeHtml(t('results.perYear'))}</option></select>
          <button type="button" id="offerEval" class="wz-btn wz-btn-secondary">${escapeHtml(t('results.offerEval'))}</button>
        </div>
        <p id="offerVerdict" class="wz-interpretation" hidden></p>
      </div>
      <div class="wz-actions">
        <button type="button" id="shareBtn" class="wz-btn wz-btn-secondary">${escapeHtml(t('results.share'))}</button>
        <button type="button" id="printBtn" class="wz-btn wz-btn-secondary">${escapeHtml(t('results.print'))}</button>
        <button type="button" id="startOver" class="wz-btn wz-btn-primary">${escapeHtml(t('results.startOver'))}</button>
      </div>
      <p class="wz-note">${escapeHtml(t('results.notAdvice'))}</p>`;

    resultsEl.querySelector<HTMLElement>('#resultsHeading')?.focus();
    resultsEl.querySelector('#printBtn')?.addEventListener('click', () => window.print());
    resultsEl.querySelector('#offerEval')?.addEventListener('click', () => {
      const verdictEl = resultsEl.querySelector<HTMLElement>('#offerVerdict');
      if (!verdictEl || !result.quote) return;
      const raw = (resultsEl.querySelector<HTMLInputElement>('#offerAmount')?.value ?? '').replace(/,/g, '');
      const amount = Number.parseFloat(raw);
      if (!Number.isFinite(amount) || amount <= 0) {
        verdictEl.textContent = t('results.offerNeedAmount');
        verdictEl.hidden = false;
        return;
      }
      const currency = resultsEl.querySelector<HTMLSelectElement>('#offerCurrency')?.value ?? 'USD';
      const basis = resultsEl.querySelector<HTMLSelectElement>('#offerBasis')?.value === 'annual' ? 'annual' : 'monthly';
      try {
        const verdict = evaluateOffer({ amount, currency, basis, gross: true }, result, fx.rates);
        const band = t(`results.offerBand.${verdict.bandPosition}`);
        const floorLine = verdict.floorGapPct === null ? '' : ' ' + (verdict.floorGapPct >= 0
          ? t('results.offerAboveFloor', { pct: verdict.floorGapPct })
          : t('results.offerBelowFloor', { pct: Math.abs(verdict.floorGapPct) }));
        verdictEl.textContent = `${t('results.offerVerdict', { band, pct: verdict.percentileInBand })}${floorLine}`;
        verdictEl.hidden = false;
      } catch {
        verdictEl.textContent = t('results.offerNoBand');
        verdictEl.hidden = false;
      }
    });
    resultsEl.querySelector('#startOver')?.addEventListener('click', () => {
      clearState();
      state = { ...DEFAULT_STATE, packageOnTop: { ...DEFAULT_STATE.packageOnTop } };
      resumeStep = null;
      render();
      focusHeading();
    });
    resultsEl.querySelector('#shareBtn')?.addEventListener('click', async () => {
      const url = `${window.location.origin}${window.location.pathname}?w=${encodeState(state)}`;
      try {
        await navigator.clipboard.writeText(url);
        const button = resultsEl.querySelector<HTMLElement>('#shareBtn');
        if (button) button.textContent = t('results.shared');
      } catch {
        window.prompt(t('results.share'), url);
      }
    });
  }

  render();
}
