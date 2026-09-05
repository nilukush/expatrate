import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { allSiteUrls } from '../src/lib/seo';

const root = fileURLToPath(new URL('..', import.meta.url));

const pngSize = (file: string): { width: number; height: number } => ({
  width: readFileSync(file).readUInt32BE(16),
  height: readFileSync(file).readUInt32BE(20),
});

test('the web app manifest is complete and every icon it names is real', () => {
  const manifest = JSON.parse(readFileSync(`${root}public/manifest.webmanifest`, 'utf8'));
  expect(manifest.name).toBe('ExpatRate');
  expect(manifest.short_name).toBe('ExpatRate');
  expect(manifest.start_url).toBe('/');
  expect(manifest.scope).toBe('/');
  expect(manifest.display).toBe('standalone');
  expect(manifest.theme_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  expect(manifest.background_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  expect(manifest.icons.length).toBeGreaterThanOrEqual(4);
  const purposes = manifest.icons.map((icon: { purpose: string }) => icon.purpose);
  expect(purposes).toContain('any');
  expect(purposes).toContain('maskable');
  for (const icon of manifest.icons as Array<{ src: string; sizes: string }>) {
    const file = `${root}public${icon.src}`;
    expect(existsSync(file), `${icon.src} exists`).toBe(true);
    const [width, height] = icon.sizes.split('x').map(Number);
    expect(pngSize(file), icon.src).toEqual({ width, height });
  }
});

test('the service worker precaches an offline fallback and drives fetches', () => {
  const sw = readFileSync(`${root}public/sw.js`, 'utf8');
  expect(sw).toContain("const OFFLINE_URL = '/offline/'");
  expect(sw).toContain("addEventListener('install'");
  expect(sw).toContain("addEventListener('activate'");
  expect(sw).toContain("addEventListener('fetch'");
  // Assets are hashed or immutable; the worker itself must never be long-cached.
  const headers = readFileSync(`${root}public/_headers`, 'utf8');
  expect(headers).toMatch(/\/sw\.js\s*\n\s*Cache-Control: no-cache/);
});

test('every full HTML template ships the manifest, theme color, and registration', () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = `${dir}/${name}`;
      return statSync(path).isDirectory() ? walk(path) : [path];
    });
  const templates = walk(`${root}src`)
    .filter((path) => path.endsWith('.astro') && /<!doctype/i.test(readFileSync(path, 'utf8')));
  expect(templates.length, 'the scan finds the known templates').toBeGreaterThanOrEqual(10);
  for (const template of templates) {
    const text = readFileSync(template, 'utf8');
    expect(
      text.includes('<Pwa />') || text.includes('manifest.webmanifest'),
      `${template} ships PWA head tags`,
    ).toBe(true);
  }
  const pwa = readFileSync(`${root}src/components/Pwa.astro`, 'utf8');
  expect(pwa).toContain('manifest.webmanifest');
  expect(pwa).toContain('theme-color');
  expect(pwa).toContain('serviceWorker');
});

test('the offline fallback page is self-contained and excluded from the sitemap', () => {
  const offline = readFileSync(`${root}src/pages/offline.astro`, 'utf8');
  expect(offline).toContain('noindex');
  expect(offline, 'no build-time asset imports: it must render with zero network').not.toContain("import '../styles");
  expect(offline).toContain('is:inline');
  expect(allSiteUrls().some((url) => url.includes('/offline'))).toBe(false);
});
