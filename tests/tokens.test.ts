import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));
const run = (cmd: string) => execSync(cmd, { cwd: root, stdio: 'pipe' }).toString();

const tokensCss = () => readFileSync(`${root}src/styles/tokens.css`, 'utf8');
const tokensJson = () =>
  JSON.parse(readFileSync(`${root}design-system/tokens.json`, 'utf8'));

test('check mode confirms tokens.css is in sync with tokens.json', () => {
  expect(() => run('node scripts/generate-tokens.mjs --check')).not.toThrow();
});

test('generation is idempotent', () => {
  run('node scripts/generate-tokens.mjs');
  const first = tokensCss();
  run('node scripts/generate-tokens.mjs');
  expect(tokensCss()).toBe(first);
});

test('every semantic token has a @theme utility mapping', () => {
  const css = tokensCss();
  const tokens = tokensJson();
  for (const key of Object.keys(tokens.color.semantic.light)) {
    expect(css).toContain(`--color-${key}: var(--${key})`);
  }
});

test('light and dark sets expose identical custom property names', () => {
  const css = tokensCss();
  const rootBlock = css.split('.dark')[0];
  const darkBlock = css.split('.dark')[1].split('@theme')[0];
  const names = (block: string) =>
    [...block.matchAll(/--[a-z0-9-]+(?=\s*:)/g)].map((m) => m[0]).sort();
  expect(names(darkBlock)).toEqual(names(rootBlock));
});

test('primitive scale steps are emitted as reference variables', () => {
  const css = tokensCss();
  const tokens = tokensJson();
  for (const [hue, scale] of Object.entries(tokens.color.primitives)) {
    for (const step of Object.keys(scale)) {
      expect(css).toContain(`--${hue}-${step}:`);
    }
  }
});

test('typography, radius, and font tokens are emitted', () => {
  const css = tokensCss();
  expect(css).toContain('--font-base:');
  expect(css).toContain('--text-display-numeral:');
  expect(css).toContain('--text-display-numeral--line-height: 1.05');
  expect(css).toContain('--radius-sm:');
  expect(css).toContain('--radius-xl:');
});

test('stylelint rejects raw hex colors and physical direction properties', () => {
  expect(() => run('pnpm exec stylelint tests/fixtures/bad.css')).toThrow();
});

test('stylelint accepts token-based logical-property styles', () => {
  expect(() => run('pnpm exec stylelint tests/fixtures/good.css')).not.toThrow();
});

const wcagLuminance = (hex6: string) => {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex6.slice(i, i + 2), 16) / 255);
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

const contrastRatio = (a: string, b: string) => {
  const la = wcagLuminance(a);
  const lb = wcagLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

const channelMidpoint = (a: string, b: string) =>
  [0, 2, 4]
    .map((i) =>
      Math.round(
        (parseInt(a.slice(i, i + 2), 16) + parseInt(b.slice(i, i + 2), 16)) / 2,
      ),
    )
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');

test('white text on the primary button clears AA at rest, on hover, and mid-transition', () => {
  const light = tokensJson().color.semantic.light;
  const rest = light['primary'].hex.slice(1);
  const hover = light['primary-hover'].hex.slice(1);
  // axe sampled the 150ms hover transition mid-flight in CI; every frame must pass.
  expect(contrastRatio('ffffff', rest)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio('ffffff', hover)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio('ffffff', channelMidpoint(rest, hover))).toBeGreaterThanOrEqual(4.5);
});
