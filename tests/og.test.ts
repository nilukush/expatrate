import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));

test('the OG share image is a 1200x630 PNG with real content', () => {
  const png = readFileSync(`${root}public/og-default.png`);
  expect(png.readUInt32BE(0)).toBe(0x89504e47); // PNG signature
  // IHDR: width and height as big-endian uint32.
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
  const colorType = png[25];
  expect([2, 6]).toContain(colorType);
  // A designed image (text, band, markers), not a flat color fill.
  expect(png.length).toBeGreaterThan(30_000);
});
