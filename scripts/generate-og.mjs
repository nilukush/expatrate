/*
 * Generates public/og-default.png (1200x630) from design-system/tokens.json.
 * Run: node scripts/generate-og.mjs
 * Renders with the project's Playwright chromium (no new dependencies) and
 * self-verifies by decoding the PNG and asserting the token colors at the
 * exact coordinates the layout places them.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';
import { chromium } from '@playwright/test';

const root = new URL('..', import.meta.url).pathname;
const tokens = JSON.parse(readFileSync(`${root}design-system/tokens.json`, 'utf8'));
const light = tokens.color.semantic.light;
const hex = (key) => light[key].hex;
const rgb = (key) => {
  const h = hex(key).slice(1);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

const fontBase64 = (file) => readFileSync(`${root}public/fonts/${file}`).toString('base64');
const grotesk = fontBase64('space-grotesk-latin-var.woff2');
const inter = fontBase64('inter-latin-var.woff2');

/* Deterministic layout coordinates, mirrored by the pixel assertions below. */
const L = {
  width: 1200,
  height: 630,
  pad: 64,
  bar: { y: 420, height: 12 },
  band: { from: 0.25, to: 0.75 },
  dot: { at: 0.72, size: 34 },
  floor: { at: 0.06, width: 12, height: 24 },
};
const trackWidth = L.width - L.pad * 2;
const xAt = (f) => Math.round(L.pad + f * trackWidth);

const html = `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  @font-face { font-family: 'Space Grotesk'; src: url(data:font/woff2;base64,${grotesk}) format('woff2'); font-weight: 300 700; }
  @font-face { font-family: 'Inter'; src: url(data:font/woff2;base64,${inter}) format('woff2'); font-weight: 100 900; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  body {
    position: relative;
    background: ${hex('hero')};
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .wordmark {
    position: absolute; left: ${L.pad}px; top: 56px;
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    font-size: 30px; font-weight: 500; letter-spacing: 0.12em;
    color: ${hex('hero-muted')};
  }
  .tagline {
    position: absolute; left: ${L.pad}px; top: 210px; width: ${trackWidth}px;
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    font-size: 92px; font-weight: 650; letter-spacing: -0.01em; line-height: 1.05;
    color: ${hex('hero-foreground')};
  }
  .track {
    position: absolute; left: ${L.pad}px; top: ${L.bar.y}px;
    width: ${trackWidth}px; height: ${L.bar.height}px; border-radius: 999px;
    background: rgb(255 255 255 / 16%);
  }
  .band {
    position: absolute; top: ${L.bar.y}px;
    left: ${xAt(L.band.from)}px; width: ${xAt(L.band.to) - xAt(L.band.from)}px;
    height: ${L.bar.height}px; border-radius: 999px;
    background: ${hex('range-band')};
  }
  .dot {
    position: absolute; top: ${L.bar.y + L.bar.height / 2}px; left: ${xAt(L.dot.at)}px;
    width: ${L.dot.size}px; height: ${L.dot.size}px; border-radius: 50%;
    transform: translate(-50%, -50%);
    background: ${hex('marker-quote')};
    border: 5px solid ${hex('hero-foreground')};
  }
  .floor {
    position: absolute; top: ${L.bar.y - 6}px; left: ${xAt(L.floor.at)}px;
    width: ${L.floor.width}px; height: ${L.floor.height}px; border-radius: 4px;
    background: ${hex('marker-prior')};
  }
  .label { position: absolute; top: 462px; font-size: 21px; color: ${hex('hero-muted')}; }
  .label-floor { left: ${xAt(L.floor.at) - 24}px; width: 96px; text-align: center; }
  .label-band { left: ${(xAt(L.band.from) + xAt(L.band.to)) / 2 - 80}px; width: 160px; text-align: center; }
  .label-quote { left: ${xAt(L.dot.at) - 60}px; width: 120px; text-align: center; }
  .foot {
    position: absolute; left: ${L.pad}px; right: ${L.pad}px; top: 554px;
    display: flex; justify-content: space-between;
    font-size: 22px; color: ${hex('hero-muted')};
  }
  .foot .site { color: ${hex('hero-foreground')}; font-weight: 600; }
</style></head>
<body>
  <div class="wordmark">ExpatRate</div>
  <div class="tagline">Know what to quote</div>
  <div class="track"></div>
  <div class="band"></div>
  <div class="floor"></div>
  <div class="dot"></div>
  <div class="label label-floor">floor</div>
  <div class="label label-band">market band</div>
  <div class="label label-quote">your quote</div>
  <div class="foot"><span>Free. No account. Browser-side only.</span><span class="site">expatrate.pages.dev</span></div>
</body></html>`;

/* Minimal PNG decoder for 8-bit non-interlaced RGB/RGBA output. */
const decodePng = (buf) => {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let pos = 8;
  let width = 0;
  let height = 0;
  let colorType = -1;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    }
    pos += 12 + len;
    if (type === 'IEND') break;
  }
  if (colorType !== 2 && colorType !== 6) throw new Error(`unexpected PNG color type ${colorType}`);
  const bpp = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const rowStart = y * (stride + 1) + 1;
    const prevBase = (y - 1) * stride;
    const curBase = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[curBase + x - bpp] : 0;
      const b = y > 0 ? out[prevBase + x] : 0;
      const c = x >= bpp && y > 0 ? out[prevBase + x - bpp] : 0;
      let v = raw[rowStart + x];
      if (filter === 1) v = (v + a) & 0xff;
      else if (filter === 2) v = (v + b) & 0xff;
      else if (filter === 3) v = (v + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        v = (v + pr) & 0xff;
      }
      out[curBase + x] = v;
    }
  }
  return { width, height, bpp, data: out };
};

const near = (actual, expected, tolerance = 4) =>
  Math.abs(actual[0] - expected[0]) <= tolerance &&
  Math.abs(actual[1] - expected[1]) <= tolerance &&
  Math.abs(actual[2] - expected[2]) <= tolerance;

const main = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: L.width, height: L.height } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  const png = await page.screenshot({ type: 'png' });
  await browser.close();

  const img = decodePng(png);
  const pixel = (x, y) => {
    const i = (y * img.width + x) * img.bpp;
    return [img.data[i], img.data[i + 1], img.data[i + 2]];
  };
  const checks = [
    ['background', [10, 10], rgb('hero')],
    ['background mid', [600, 315], rgb('hero')],
    ['market band fill', [600, L.bar.y + 6], rgb('range-band')],
    ['quote dot fill', [xAt(L.dot.at), L.bar.y + 6], rgb('marker-quote')],
    ['floor tick fill', [xAt(L.floor.at) + 6, L.bar.y + 6], rgb('marker-prior')],
  ];
  const failures = checks
    .map(([name, at, expected]) => {
      const actual = pixel(at[0], at[1]);
      return near(actual, expected) ? null : `${name} at (${at[0]},${at[1]}): got rgb(${actual}) expected rgb(${expected})`;
    })
    .filter(Boolean);
  if (img.width !== L.width || img.height !== L.height) {
    failures.push(`size ${img.width}x${img.height}, expected ${L.width}x${L.height}`);
  }
  // The headline must actually render as ink, not just solid fills.
  let ink = 0;
  const bg = rgb('hero');
  for (let y = 230; y < 300; y++) {
    for (let x = L.pad; x < L.width - L.pad; x += 2) {
      const p = pixel(x, y);
      if (Math.abs(p[0] - bg[0]) > 40 || Math.abs(p[1] - bg[1]) > 40 || Math.abs(p[2] - bg[2]) > 40) ink++;
    }
  }
  if (ink < 500) failures.push(`headline appears blank (only ${ink} ink pixels sampled)`);
  if (failures.length) {
    console.error('OG image verification failed:\n  ' + failures.join('\n  '));
    process.exit(1);
  }
  writeFileSync(`${root}public/og-default.png`, png);
  console.log(`Wrote public/og-default.png (${img.width}x${img.height}, ${png.length} bytes); all ${checks.length} pixel checks passed.`);
};

main();
