import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));
const wizardCss = readFileSync(`${root}src/styles/wizard.css`, 'utf8');
const tokensCss = readFileSync(`${root}src/styles/tokens.css`, 'utf8');
const mainTs = readFileSync(`${root}src/wizard/main.ts`, 'utf8');

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

test('dynamic wizard regions announce themselves', () => {
  expect((mainTs.match(/aria-live="polite"/g) ?? []).length).toBeGreaterThanOrEqual(4);
});

test('small controls expand their hit area', () => {
  expect(wizardCss).toMatch(/\.wz-btn-chip::after[^}]*-0\.5625rem/s);
  expect(wizardCss).toMatch(/\.wz-file-remove::after/s);
  expect(wizardCss).toMatch(/\.wz-check::after/s);
});

test('the confidence badge uses the confidence tokens', () => {
  expect(wizardCss).toContain('--confidence-high');
  expect(mainTs).toContain('wz-badge');
});

test('the hero title size comes from a token', () => {
  expect(tokensCss).toContain('--text-display-hero:');
  expect(readFileSync(`${root}src/styles/global.css`, 'utf8')).toMatch(/\.hero-title\s*{[^}]*var\(--text-display-hero\)/s);
});

test('every page shell lands on a skip link and a real main landmark', () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.astro')) files.push(p);
    }
  };
  walk(`${root}src`);
  const shells = files.filter((f) => readFileSync(f, 'utf8').includes('page-shell'));
  expect(shells.length).toBeGreaterThanOrEqual(9);
  for (const f of shells) {
    const html = readFileSync(f, 'utf8');
    expect(html, `${f} misses the skip link`).toContain('skip-link');
    expect(html, `${f} misses the main landmark`).toContain('<main id="main">');
    expect(html, `${f} still nests everything in main.page-shell`).not.toContain('<main class="page-shell">');
  }
});

test('off-scale font sizes snap to tokens', () => {
  expect(readFileSync(`${root}src/styles/global.css`, 'utf8')).not.toContain('1.05rem');
  expect(wizardCss).toMatch(/\.wz-file-remove\s*{[^}]*var\(--text-body-lg\)/s);
});
