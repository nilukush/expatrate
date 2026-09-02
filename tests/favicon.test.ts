import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));

test('the favicon set exists with the right dimensions and token colors', () => {
  const tokens = JSON.parse(readFileSync(`${root}design-system/tokens.json`, 'utf8'));
  const primary = tokens.color.semantic.light.primary.hex;
  const svg = readFileSync(`${root}public/favicon.svg`, 'utf8');
  expect(svg).toContain(primary);
  const png32 = readFileSync(`${root}public/favicon-32.png`);
  expect(png32.readUInt32BE(0)).toBe(0x89504e47);
  expect(png32.readUInt32BE(16)).toBe(32);
  expect(png32.readUInt32BE(20)).toBe(32);
  expect(png32.length).toBeGreaterThan(300);
  const touch = readFileSync(`${root}public/apple-touch-icon.png`);
  expect(touch.readUInt32BE(0)).toBe(0x89504e47);
  expect(touch.readUInt32BE(16)).toBe(180);
  expect(touch.readUInt32BE(20)).toBe(180);
  // favicon.ico wraps the 32 px PNG in an ICO container (little-endian).
  const ico = readFileSync(`${root}public/favicon.ico`);
  expect(ico.readUInt16LE(0)).toBe(0);
  expect(ico.readUInt16LE(2)).toBe(1);
  expect(ico[6]).toBe(32);
  expect(ico[7]).toBe(32);
  expect(ico.readUInt32BE(ico.readUInt32LE(18))).toBe(0x89504e47);
});

test('every page head declares the icon links', () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith('.astro')) files.push(p);
    }
  };
  walk(`${root}src`);
  const heads = files.filter((f) => readFileSync(f, 'utf8').includes('<head'));
  expect(heads.length).toBeGreaterThanOrEqual(9);
  for (const f of heads) {
    const html = readFileSync(f, 'utf8');
    expect(html, `${f} misses the svg icon link`).toContain('rel="icon" href="/favicon.svg"');
    expect(html, `${f} misses the png icon link`).toContain('rel="icon" href="/favicon-32.png"');
    expect(html, `${f} misses the apple touch icon`).toContain('rel="apple-touch-icon"');
  }
});
