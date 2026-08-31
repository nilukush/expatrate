import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

test('the design token source of truth exists and identifies itself', () => {
  const tokens = JSON.parse(
    readFileSync(`${repoRoot}design-system/tokens.json`, 'utf8'),
  );
  expect(tokens.meta.name).toBe('ExpatRate Design System');
  expect(tokens.meta.colorSpace).toBe('oklch');
});

test('primitive and semantic color sets are structurally complete', () => {
  const tokens = JSON.parse(
    readFileSync(`${repoRoot}design-system/tokens.json`, 'utf8'),
  );
  const primitives = Object.keys(tokens.color.primitives);
  expect(primitives).toContain('teal');
  expect(primitives).toContain('slate');
  expect(primitives).toContain('amber');

  const lightKeys = Object.keys(tokens.color.semantic.light).sort();
  const darkKeys = Object.keys(tokens.color.semantic.dark).sort();
  expect(darkKeys).toEqual(lightKeys);
});
