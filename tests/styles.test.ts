import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));
const wizardCss = readFileSync(`${root}src/styles/wizard.css`, 'utf8');
const tokensCss = readFileSync(`${root}src/styles/tokens.css`, 'utf8');

test('card and hero shadows come from tokens, not ad hoc literals', () => {
  expect(tokensCss).toContain('--shadow-1:');
  expect(tokensCss).toContain('--shadow-2:');
  expect(wizardCss).toMatch(/\.wz-card\s*{[^}]*var\(--shadow-1\)/s);
});

test('the prior range marker is a diamond, not a same-shaped pill', () => {
  const rule = wizardCss.match(/\.wz-range-tick-prior\s*{[^}]*}/s)?.[0] ?? '';
  expect(rule).toContain('rotate(45deg)');
});

test('the dark token set is documented as not shipped', () => {
  expect(tokensCss).toContain('planned, not shipped');
});
