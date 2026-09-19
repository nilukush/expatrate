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

test('the resume chip reads as an action button, not a status pill', () => {
  const rule = wizardCss.match(/\.wz-btn-chip\s*{[^}]*}/s)?.[0] ?? '';
  expect(rule, 'chip uses the button card surface').toContain('var(--card)');
  expect(rule, 'chip carries a visible border').toContain('var(--input)');
  expect(rule, 'chip uses the button radius, not the tag pill').toContain('var(--radius-md)');
  expect(wizardCss).toMatch(/\.wz-btn-chip:hover\s*{[^}]*var\(--secondary\)/s);
  expect(mainTs).toMatch(/id="resumeBtn"[^>]*><svg/);
});

test('the language switcher is a dropdown, not a growing row of pills', () => {
  const globalCss = readFileSync(`${root}src/styles/global.css`, 'utf8');
  expect(globalCss).toMatch(/\.lang-menu\s*\{[^}]*position:\s*relative/s);
  expect(globalCss).toMatch(/\.lang-menu-list\s*\{[^}]*var\(--shadow-2\)/s);
  const home = readFileSync(`${root}src/components/HomePage.astro`, 'utf8');
  const seo = readFileSync(`${root}src/components/SeoPage.astro`, 'utf8');
  for (const tpl of [home, seo]) {
    expect(tpl, 'switcher uses the details dropdown').toContain('<details class="lang-menu">');
    expect(tpl).toContain('lang-menu-list');
  }
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

test('the popular markets row joins the site link language and the page column', () => {
  const globalCss = readFileSync(`${root}src/styles/global.css`, 'utf8');
  expect(globalCss, 'section returns to the centered 46rem column').toMatch(
    /\.home-markets\s*{[^}]*max-inline-size:\s*46rem/s,
  );
  expect(globalCss, 'section centers like hero and footer').toMatch(
    /\.home-markets\s*{[^}]*margin-inline:\s*auto/s,
  );
  expect(globalCss, 'items never split across lines').toMatch(
    /\.home-markets-list\s+li\s*{[^}]*white-space:\s*nowrap/s,
  );
  expect(globalCss, 'separators are decorative CSS trailing each item, never a leading dot on a wrapped line').toMatch(
    /\.home-markets-list\s+li:not\(:last-child\)::after\s*{[^}]*content/s,
  );
  expect(globalCss, 'links use the primary link color').toMatch(
    /\.home-markets-list\s+a\s*{[^}]*var\(--primary\)/s,
  );
  expect(globalCss, 'links carry the hub link weight').toMatch(
    /\.home-markets-list\s+a\s*{[^}]*font-weight:\s*600/s,
  );
  expect(globalCss, 'links underline on hover like seo-list links').toMatch(
    /\.home-markets-list\s+a:hover\s*{[^}]*underline/s,
  );
});

test('the markets row is a list, not a run of anchors in a paragraph', () => {
  const home = readFileSync(`${root}src/components/HomePage.astro`, 'utf8');
  expect(home).toContain('home-markets-list');
  expect(home, 'the old unstyled paragraph pattern must not return').not.toContain(
    '<p class="footer-nav">',
  );
});

test('body links share one focus ring and footer links read as links', () => {
  const globalCss = readFileSync(`${root}src/styles/global.css`, 'utf8');
  expect(globalCss, 'one site-wide focus rule on the ring token').toMatch(
    /a:focus-visible\s*{[^}]*var\(--ring\)/s,
  );
  expect(globalCss, 'footer links keep a persistent underline').toMatch(
    /\.footer-nav\s+a\s*{[^}]*text-decoration:\s*underline/s,
  );
  expect(globalCss, 'footer links answer hover in the primary color').toMatch(
    /\.footer-nav\s+a:hover\s*{[^}]*var\(--primary\)/s,
  );
});

test('one footer partial renders every footer in the site', () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.astro')) files.push(p);
    }
  };
  walk(`${root}src`);
  const offenders = files.filter(
    (f) => !f.endsWith('SiteFooter.astro') && readFileSync(f, 'utf8').includes('class="site-footer"'),
  );
  expect(offenders, 'no template may write the footer markup directly').toEqual([]);
  const partial = readFileSync(`${root}src/components/SiteFooter.astro`, 'utf8');
  expect(partial).toContain('footer-nav');
  expect(partial).toContain("t('home.linkMethodology')");
  expect(partial).toContain("t('home.linkSalaries')");
  expect(partial).toContain("t('home.linkPrivacy')");
  for (const tpl of [
    'src/components/HomePage.astro',
    'src/components/SeoPage.astro',
    'src/components/PrivacyPage.astro',
    'src/pages/salaries/index.astro',
    'src/pages/salaries/[country].astro',
    'src/pages/salary/[family]/index.astro',
    'src/pages/salary/[family]/in/[country].astro',
    'src/pages/methodology.astro',
    'src/pages/404.astro',
  ]) {
    expect(readFileSync(`${root}${tpl}`, 'utf8'), `${tpl} must include the footer partial`).toContain(
      'SiteFooter',
    );
  }
});
