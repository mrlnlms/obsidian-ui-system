import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { MultiModeTokens, TokenEvidenceCapture } from '@obsidian-ui-system/ui-schema';
import { pilotCandidates, bindingPilotCandidates, projectFigmaVariableCandidates } from '../src/variable-projection';
import { readVariablesPilotPackage } from '../src/variables-pilot-package';
import { readFigmaPackage } from '../src/package-data';

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

test('classifies every real identity with a narrow pilot and preserves source evidence', () => {
  const tokens = realTokens();
  const before = JSON.stringify(tokens);
  const all = projectFigmaVariableCandidates(tokens);
  const counts = Object.fromEntries(['direct', 'needs-evaluation', 'deferred', 'omit']
    .map((decision) => [decision, all.filter((entry) => entry.decision === decision).length]));
  assert.equal(all.length, 1181);
  assert.deepEqual(counts, { direct: 4, 'needs-evaluation': 65, deferred: 10, omit: 1102 });
  assert.deepEqual(pilotCandidates(all).map((entry) => entry.cssName),
    ['--background-primary', '--modal-background', '--button-radius']);
  assert.deepEqual(bindingPilotCandidates(all).map((entry) => entry.cssName),
    ['--button-radius', '--interactive-normal']);
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
  assert.throws(() => bindingPilotCandidates(all), /not directly projectable/);
});

test('rejects an uncertain or fallback alias without synthesizing another mode', () => {
  const tokens = realTokens();
  const modal = tokens.tokens['--modal-background']!;
  modal.light!.declarations[modal.light!.attribution.status === 'unique'
    ? modal.light!.attribution.declarationIndex : 0]!.rawValue = 'var(--background-primary, red)';
  const all = projectFigmaVariableCandidates(tokens);
  assert.equal(all.find((entry) => entry.cssName === '--modal-background')?.decision, 'omit');
  assert.throws(() => pilotCandidates(all), /not directly projectable/);
  delete tokens.tokens['--button-radius']!.light;
  assert.equal(projectFigmaVariableCandidates(tokens)
    .find((entry) => entry.cssName === '--button-radius')?.decision, 'omit');
  modal.light!.declarations[modal.light!.attribution.status === 'unique'
    ? modal.light!.attribution.declarationIndex : 0]!.rawValue = 'var(--background-primary)';
  tokens.tokens['--background-primary']!.light!.computed.selected = 'color-mix(in srgb, red, white)';
  assert.equal(projectFigmaVariableCandidates(tokens)
    .find((entry) => entry.cssName === '--modal-background')?.decision, 'omit');
});

test('separate v2 pilot reader accepts controlled source and v1 importer still rejects it', () => {
  const tokens = realTokens();
  const capture = (mode: 'dark' | 'light') => source(mode, 'capture-context.json');
  const manifest = {
    schemaVersion: '0.5.0', modes: ['dark', 'light'], assembledAt: '2026-10-01T22:00:00.000Z',
    technicalContext: { status: 'verified', buildSha256: capture('dark').pluginBuild.sha256 },
    sources: {
      dark: { mapping: capture('dark') }, light: { mapping: capture('light') },
    },
  };
  const components = { dark: source('dark', 'components.json'), light: source('light', 'components.json') };
  const bytes = zipSync(Object.fromEntries(Object.entries({
    'package-manifest.json': { format: 'obsidian-ui-figma-package', version: 2, schemaVersion: '0.5.0' },
    'manifest.json': manifest, 'tokens.json': tokens, 'components.json': components,
  }).map(([name, value]) => [name, strToU8(JSON.stringify(value))])));
  const read = readVariablesPilotPackage(bytes);
  assert.equal(read.tokens.tokens['--modal-background']?.dark?.status, 'resolved');
  assert.deepEqual(read.ctaBackground, { dark: 'rgb(138, 92, 245)', light: 'rgb(152, 115, 247)' });
  assert.throws(() => readFigmaPackage(bytes), /layout\.json ausente|versão do pacote/);
});
