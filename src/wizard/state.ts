import { DEFAULT_STATE } from './types';
import type { WizardState } from './types';

const STORAGE_KEY = 'expatrate.wizard.v1';
const RESUME_KEY = 'expatrate.wizard.resume.v1';

export function loadState(): WizardState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const merged: WizardState = {
      ...DEFAULT_STATE,
      ...(parsed as Partial<WizardState>),
      packageOnTop: {
        ...DEFAULT_STATE.packageOnTop,
        ...((parsed as { packageOnTop?: Partial<WizardState['packageOnTop']> }).packageOnTop ?? {}),
      },
    };
    return merged;
  } catch {
    return null;
  }
}

export function saveState(state: WizardState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable (private mode); the wizard still works for this session.
  }
}

/* Furthest step the user reached; survives the step reset that a fresh landing does. */
export function saveResumeStep(step: number): void {
  try {
    const current = Number.parseInt(localStorage.getItem(RESUME_KEY) ?? '0', 10);
    if (step > current) localStorage.setItem(RESUME_KEY, String(step));
  } catch {
    // ignore
  }
}

export function loadResumeStep(): number | null {
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const step = Number.parseInt(raw, 10);
    return Number.isFinite(step) && step > 1 && step <= 5 ? step : null;
  } catch {
    return null;
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(RESUME_KEY);
  } catch {
    // ignore
  }
}

export function encodeState(state: WizardState): string {
  const json = JSON.stringify({ ...state, step: 1 });
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeState(encoded: string): WizardState | null {
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null) return null;
    return { ...DEFAULT_STATE, ...(parsed as Partial<WizardState>) };
  } catch {
    return null;
  }
}
