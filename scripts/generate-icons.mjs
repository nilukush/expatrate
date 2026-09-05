/*
 * Generates the favicon set from design-system/tokens.json: the range-bar
 * mark as public/favicon.svg plus raster exports rendered with the project's
 * Playwright chromium (no new dependencies): favicon-32.png,
 * apple-touch-icon.png (180x180), favicon.ico (the 32 px PNG in an ICO
 * container), and the PWA icons in public/icons/ (192/512 any + maskable,
 * the mark at 62 percent inside the safe zone on the primary color).
 * Run: node scripts/generate-icons.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const root = new URL('..', import.meta.url).pathname;
const tokens = JSON.parse(readFileSync(`${root}design-system/tokens.json`, 'utf8'));
const light = tokens.color.semantic.light;
const primary = light.primary.hex;
const marker = light['marker-prior'].hex;
const onPrimary = '#FFFFFF';

const mark = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}">
  <rect width="64" height="64" rx="14" fill="${primary}"/>
  <rect x="12" y="29" width="40" height="6" rx="3" fill="${onPrimary}"/>
  <circle cx="32" cy="32" r="7" fill="${marker}" stroke="${onPrimary}" stroke-width="3"/>
</svg>`;

const render = async (browser, size, { maskable = false } = {}) => {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const body = maskable
    ? `<body style="margin:0;background:${primary}"><div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)">${mark(Math.round(size * 0.62))}</div></body>`
    : `<body style="margin:0">${mark(size)}</body>`;
  await page.setContent(body, { waitUntil: 'load' });
  const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
  return png;
};

/* ICO container wrapping the 32 px PNG (PNG-in-ICO). */
const icoWrap = (png) => {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry[0] = 32;
  entry[1] = 32;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(22, 12);
  return Buffer.concat([header, entry, png]);
};

const main = async () => {
  writeFileSync(`${root}public/favicon.svg`, `${mark(64)}\n`);
  const browser = await chromium.launch();
  const png32 = await render(browser, 32);
  const png180 = await render(browser, 180);
  const png192 = await render(browser, 192);
  const png512 = await render(browser, 512);
  const mask192 = await render(browser, 192, { maskable: true });
  const mask512 = await render(browser, 512, { maskable: true });
  await browser.close();
  if (png32.readUInt32BE(0) !== 0x89504e47 || png32.readUInt32BE(16) !== 32 || png32.readUInt32BE(20) !== 32) {
    throw new Error('the 32 px render came out wrong');
  }
  if (png180.readUInt32BE(16) !== 180 || png180.readUInt32BE(20) !== 180) {
    throw new Error('the 180 px render came out wrong');
  }
  const pwaIcons = [
    ['icon-192.png', png192, 192],
    ['icon-512.png', png512, 512],
    ['icon-maskable-192.png', mask192, 192],
    ['icon-maskable-512.png', mask512, 512],
  ];
  for (const [name, png, size] of pwaIcons) {
    if (png.readUInt32BE(16) !== size || png.readUInt32BE(20) !== size || png.length < 1000) {
      throw new Error(`the ${size} px ${name} render came out wrong`);
    }
  }
  writeFileSync(`${root}public/favicon-32.png`, png32);
  writeFileSync(`${root}public/apple-touch-icon.png`, png180);
  writeFileSync(`${root}public/favicon.ico`, icoWrap(png32));
  mkdirSync(`${root}public/icons`, { recursive: true });
  for (const [name, png] of pwaIcons) writeFileSync(`${root}public/icons/${name}`, png);
  console.log(
    `Wrote favicon.svg, favicon-32.png (${png32.length} bytes), apple-touch-icon.png (${png180.length} bytes), favicon.ico, and 4 PWA icons in public/icons/; colors from tokens (primary ${primary}, marker ${marker}).`,
  );
};

main();
