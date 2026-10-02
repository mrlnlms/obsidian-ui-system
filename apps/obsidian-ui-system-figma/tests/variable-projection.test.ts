import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { strFromU8, unzipSync } from 'fflate';
import type { MultiModeTokens, TokenEvidenceCapture } from '@obsidian-ui-system/ui-schema';
import { projectFigmaVariableCandidates } from '../src/variable-projection';

const fixture = unzipSync(new Uint8Array(readFileSync(join(process.cwd(),
  '../obsidian-ui-mapping/tests/fixtures/controlled-dark-light-2026-10-01.zip'))));
const source = (mode: 'dark' | 'light', name: string) =>
  JSON.parse(strFromU8(fixture[`${mode}/mapping/${name}`]!));

function realTokens(): MultiModeTokens {
  const dark = source('dark', 'token-evidence.json') as TokenEvidenceCapture;
  const light = source('light', 'token-evidence.json') as TokenEvidenceCapture;
  return {
    scopes: ['html', 'body'], coverage: { dark: dark.coverage, light: light.coverage },
    tokens: Object.fromEntries([...new Set([...Object.keys(dark.tokens), ...Object.keys(light.tokens)])]
      .map((name) => [name, { dark: dark.tokens[name], light: light.tokens[name] }])),
  };
}

test('classifies every real identity with selective projection and preserves source evidence', () => {
  const tokens = realTokens();
  const before = JSON.stringify(tokens);
  const all = projectFigmaVariableCandidates(tokens);
  const counts = Object.fromEntries(['direct', 'needs-evaluation', 'deferred', 'omit']
    .map((decision) => [decision, all.filter((entry) => entry.decision === decision).length]));
  assert.equal(all.length, 1181);
  assert.deepEqual(counts, { direct: 5, 'needs-evaluation': 65, deferred: 10, omit: 1101 });
  assert.deepEqual(all.filter((item) => item.decision === 'direct').map((item) => item.cssName),
    ['--background-primary', '--button-radius', '--interactive-normal', '--modal-background', '--text-normal']);
  assert.equal(JSON.stringify(tokens), before);
});

test('projects exact Dark/Light values and only the proven pure alias', () => {
  const byName = new Map(projectFigmaVariableCandidates(realTokens()).map((item) => [item.cssName, item]));
  const background = byName.get('--background-primary')!;
  assert.equal(background.figmaType, 'COLOR');
  assert.deepEqual(background.modes.dark.projected, { strategy: 'literal',
    value: { r: 28 / 255, g: 28 / 255, b: 28 / 255 } });
  assert.deepEqual(background.modes.light.projected, { strategy: 'literal', value: { r: 1, g: 1, b: 1 } });
  const modal = byName.get('--modal-background')!;
  assert.equal(modal.figmaType, 'COLOR');
  for (const mode of ['dark', 'light'] as const) {
    assert.deepEqual(modal.modes[mode].projected,
      { strategy: 'alias', targetCssName: '--background-primary' });
    assert.equal(modal.modes[mode].declaration?.rawValue, 'var(--background-primary)');
  }
  const radius = byName.get('--button-radius')!;
  assert.equal(radius.figmaType, 'FLOAT');
  assert.equal(radius.modes.dark.computedCss, '8px');
  assert.deepEqual(radius.modes.light.projected, { strategy: 'literal', value: 8 });
  const normal = byName.get('--interactive-normal')!;
  assert.equal(normal.figmaType, 'COLOR');
  assert.deepEqual(normal.modes.dark.projected, { strategy: 'literal',
    value: { r: 51 / 255, g: 51 / 255, b: 51 / 255 } });
  assert.deepEqual(normal.modes.light.projected, { strategy: 'literal',
    value: { r: 228 / 255, g: 228 / 255, b: 228 / 255 } });
  const text = byName.get('--text-normal')!;
  assert.equal(text.figmaType, 'COLOR');
  assert.deepEqual(text.modes.dark.projected, { strategy: 'literal',
    value: { r: 218 / 255, g: 218 / 255, b: 218 / 255 } });
  assert.deepEqual(text.modes.light.projected, { strategy: 'literal',
    value: { r: 34 / 255, g: 34 / 255, b: 34 / 255 } });
  assert.equal(byName.get('--interactive-accent')?.decision, 'needs-evaluation');
  assert.equal(byName.get('--anim-duration-fast')?.decision, 'deferred');
  assert.equal(byName.get('--anim-motion-smooth')?.decision, 'deferred');
  assert.equal(byName.get('--shadow-xs')?.decision, 'omit');
  assert.equal(byName.get('--color-secondary-2')?.decision, 'omit');
});

test('binding color requires direct colors in both modes', () => {
  const tokens = realTokens();
  tokens.tokens['--interactive-normal']!.light!.computed.selected = 'color-mix(in srgb, white, black)';
  const all = projectFigmaVariableCandidates(tokens);
  assert.equal(all.find((entry) => entry.cssName === '--interactive-normal')?.decision, 'needs-evaluation');
});

test('rejects an uncertain or fallback alias without synthesizing another mode', () => {
  const tokens = realTokens();
  const modal = tokens.tokens['--modal-background']!;
  modal.light!.declarations[modal.light!.attribution.status === 'unique'
    ? modal.light!.attribution.declarationIndex : 0]!.rawValue = 'var(--background-primary, red)';
  const all = projectFigmaVariableCandidates(tokens);
  assert.equal(all.find((entry) => entry.cssName === '--modal-background')?.decision, 'omit');
  delete tokens.tokens['--button-radius']!.light;
  assert.equal(projectFigmaVariableCandidates(tokens)
    .find((entry) => entry.cssName === '--button-radius')?.decision, 'omit');
  modal.light!.declarations[modal.light!.attribution.status === 'unique'
    ? modal.light!.attribution.declarationIndex : 0]!.rawValue = 'var(--background-primary)';
  tokens.tokens['--background-primary']!.light!.computed.selected = 'color-mix(in srgb, red, white)';
  assert.equal(projectFigmaVariableCandidates(tokens)
    .find((entry) => entry.cssName === '--modal-background')?.decision, 'omit');
});
