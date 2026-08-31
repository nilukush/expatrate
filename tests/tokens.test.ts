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
