import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));

test('tsc --noEmit passes: the typing gap that shipped the engine.undefined defect stays closed', () => {
  // vitest transpiles without checking, so the unit suite alone can go green
  // on type-broken code; this pins the compiler to the gate.
  expect(() => execSync('pnpm typecheck', { cwd: root, stdio: 'pipe' })).not.toThrow();
});
