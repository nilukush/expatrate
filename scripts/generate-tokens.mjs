import { readFileSync, writeFileSync } from 'node:fs';

const tokens = JSON.parse(
  readFileSync(new URL('../design-system/tokens.json', import.meta.url), 'utf8'),
);

const OUT_PATH = new URL('../src/styles/tokens.css', import.meta.url);
const checkOnly = process.argv.includes('--check');

/* Emit the sRGB value: axe-core miscomputes contrast from oklch() computed styles,
   and every token carries its documented sRGB equivalent. OKLCH stays canonical in tokens.json. */
const valueOf = (entry) => entry.hex ?? entry.oklch;

const semanticKeys = Object.keys(tokens.color.semantic.light);

const primitiveLines = Object.entries(tokens.color.primitives).flatMap(
  ([hue, scale]) =>
    Object.entries(scale).map(([step, entry]) => `  --${hue}-${step}: ${valueOf(entry)};`),
);

const themeVarLines = (set) =>
  semanticKeys.map((key) => `  --${key}: ${valueOf(set[key])};`);

const utilityLines = semanticKeys.map(
  (key) => `  --color-${key}: var(--${key});`,
);

const fontLines = [
  `  --font-base: ${tokens.typography.family.base};`,
  `  --font-display: ${tokens.typography.family.display};`,
];

const textLines = Object.entries(tokens.typography.scale).flatMap(([key, s]) => [
  `  --text-${key}: ${s.size};`,
  `  --text-${key}--line-height: ${s.lineHeight};`,
  `  --text-${key}--font-weight: ${s.weight};`,
]);

const radiusLines = Object.entries(tokens.radius.scale).map(([key, spec]) => {
  const match = /(\d+(?:\.\d+)?)px/.exec(spec);
  return `  --radius-${key}: ${match ? `${match[1]}px` : '9999px'};`;
});

const shadowLines = Object.entries(tokens.elevation?.shadows ?? {}).map(
  ([key, spec]) => `  --shadow-${key}: ${spec};`,
);

const css = `/* Generated from design-system/tokens.json by scripts/generate-tokens.mjs. Do not edit by hand. */

:root {
${themeVarLines(tokens.color.semantic.light).join('\n')}
}

/* Dark set: planned, not shipped; no toggle or media query applies it yet. */
.dark {
${themeVarLines(tokens.color.semantic.dark).join('\n')}
}

@theme inline {
${utilityLines.join('\n')}
}

@theme {
${fontLines.join('\n')}

${textLines.join('\n')}

${radiusLines.join('\n')}

${shadowLines.join('\n')}
}

/* Primitive reference palette. Not exposed as utilities; components use semantic tokens only. */
:root {
${primitiveLines.join('\n')}
}
`;

if (checkOnly) {
  let current = '';
  try {
    current = readFileSync(OUT_PATH, 'utf8');
  } catch {
    console.error('src/styles/tokens.css does not exist. Run: pnpm tokens');
    process.exit(1);
  }
  if (current !== css) {
    console.error(
      'src/styles/tokens.css is out of sync with design-system/tokens.json. Run: pnpm tokens',
    );
    process.exit(1);
  }
} else {
  writeFileSync(OUT_PATH, css);
  console.log(`Wrote src/styles/tokens.css (${semanticKeys.length} semantic tokens)`);
}
