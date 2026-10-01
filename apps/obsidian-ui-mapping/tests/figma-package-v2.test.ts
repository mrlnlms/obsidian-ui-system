import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { strFromU8, unzipSync } from 'fflate';
import type { CaptureContext, ComponentSnapshot, SnapshotManifest, TokenEvidenceCapture } from '@obsidian-ui-system/ui-schema';
import {
  assembleFigmaPackageV2, buildFigmaPackageV2Zip, type FigmaPackageV2Input, type LayoutV2Source,
} from '../src/figma-package-v2';
import { readFigmaPackage } from '../../obsidian-ui-system-figma/src/package-data';

const files = unzipSync(new Uint8Array(readFileSync(join(process.cwd(), 'tests/fixtures',
  'controlled-dark-light-2026-10-01.zip'))));
const artifact = <T>(mode: 'dark' | 'light', kind: 'mapping' | 'layout', name: string): T =>
  JSON.parse(strFromU8(files[`${mode}/${kind}/${name}`]!)) as T;

function input(): FigmaPackageV2Input {
  const source = (mode: 'dark' | 'light'): FigmaPackageV2Input['dark'] => ({
    mapping: {
      manifest: artifact<SnapshotManifest>(mode, 'mapping', 'manifest.json'),
      tokenEvidence: artifact<TokenEvidenceCapture>(mode, 'mapping', 'token-evidence.json'),
      components: artifact<ComponentSnapshot[]>(mode, 'mapping', 'components.json'),
      context: artifact<CaptureContext>(mode, 'mapping', 'capture-context.json'),
    },
    layout: {
      layout: artifact<LayoutV2Source['layout']>(mode, 'layout', 'layout.json'),
      context: artifact<CaptureContext>(mode, 'layout', 'capture-context.json'),
    },
  });
  return {
    dark: source('dark'), light: source('light'),
    inferenceSourceMode: 'dark', assembledAt: '2026-10-01T22:00:00.000Z',
  };
}

test('assembles a verified real Dark/Light set with separate Mapping and Layout provenance', () => {
  const source = input();
  const result = assembleFigmaPackageV2(source);
  assert.deepEqual(result.manifest.modes, ['dark', 'light']);
  assert.equal(result.manifest.schemaVersion, '0.5.0');
  assert.equal(result.manifest.technicalContext.status, 'verified');
  assert.equal(result.manifest.technicalContext.buildSha256,
    'c42d26fbd87fe74f05695fdbe93776b3c88ddcb8a2d35135b4951a1826c6e4e1');
  assert.deepEqual(result.manifest.technicalContext.viewport,
    { widthPx: 1024, heightPx: 800, devicePixelRatio: 1 });
  assert.deepEqual(result.manifest.sources.dark.mapping, source.dark.mapping.context);
  assert.deepEqual(result.manifest.sources.dark.layout, source.dark.layout.context);
  assert.deepEqual(result.manifest.sources.light.mapping, source.light.mapping.context);
  assert.deepEqual(result.manifest.sources.light.layout, source.light.layout.context);
  assert.notEqual(result.manifest.sources.dark.mapping.environment.capturedAt,
    result.manifest.sources.dark.layout.environment.capturedAt);
  assert.deepEqual(result.manifest.inferenceSource, {
    mode: 'dark', layoutCapturedAt: '2026-10-01T21:14:55.213Z',
  });
  assert.deepEqual(result.layout.inferenceSource, result.manifest.inferenceSource);
  assert.equal('mode' in result.manifest, false);
  assert.equal(result.packageManifest.version, 2);
});

test('preserves 1,181 token identities, declarations, references, unresolved chains and absent values', () => {
  const source = input();
  const result = assembleFigmaPackageV2(source);
  assert.equal(Object.keys(result.tokens.tokens).length, 1181);
  assert.equal('values' in result.tokens, false);
  assert.deepEqual(result.tokens.coverage.dark, source.dark.mapping.tokenEvidence.coverage);
  assert.deepEqual(result.tokens.coverage.light, source.light.mapping.tokenEvidence.coverage);
  for (const mode of ['dark', 'light'] as const) {
    for (const [name, observation] of Object.entries(source[mode].mapping.tokenEvidence.tokens)) {
      assert.deepEqual(result.tokens.tokens[name]?.[mode], observation, `${mode} ${name}`);
    }
  }
  for (const name of ['--color-secondary-2', '--color-secondary-3', '--color-secondary-4',
    '--color-secondary-5', '--color-secondary-6']) {
    assert.equal(result.tokens.tokens[name]?.dark?.status, 'resolved');
    assert.equal(result.tokens.tokens[name]?.light?.status, 'no-applicable-declaration');
    assert.equal(result.tokens.tokens[name]?.light?.computed.selected, null);
    assert.equal(result.tokens.tokens[name]?.light?.declarations[0]?.selector, '.theme-dark');
  }
  assert.equal(result.tokens.tokens['--shadow-xs']?.dark?.status, 'unresolved');
  assert.deepEqual(result.tokens.tokens['--shadow-xs']?.dark?.unresolvedReferences, ['--shadow-edges']);
  assert.equal(result.tokens.tokens['--shadow-edges']?.dark?.status, 'no-applicable-declaration');
  assert.equal(result.tokens.tokens['--shadow-xs']?.light?.status, 'resolved');
  assert.deepEqual(result.tokens.tokens['--raised-shadow']?.dark?.unresolvedReferences,
    ['--shadow-xs', '--shadow-edges']);
  const modal = result.tokens.tokens['--modal-background']?.dark;
  assert.equal(modal?.attribution.status, 'unique');
  assert.equal(modal?.declarations[0]?.rawValue, 'var(--background-primary)');
  assert.deepEqual(modal?.declarations[0]?.references[0], {
    name: '--background-primary', fallback: null, role: 'whole-value',
  });
  assert.deepEqual(result.tokens.tokens['--button-primary-active-bg-color']?.dark?.declarations[0]?.references[0], {
    name: '--csstools-light-dark-toggle--17', fallback: ' #aaf2ff', role: 'whole-value',
  });

  delete source.light.mapping.tokenEvidence.tokens['--modal-background'];
  const missing = assembleFigmaPackageV2(source).tokens.tokens['--modal-background'];
  assert.ok(missing?.dark);
  assert.equal('light' in missing, false);
});

test('preserves 59 unique specimens and 102 raw observations per mode with one inference layer', () => {
  const source = input();
  const result = assembleFigmaPackageV2(source);
  for (const mode of ['dark', 'light'] as const) {
    const components = result.components[mode];
    assert.equal(components.length, 59);
    assert.equal(new Set(components.map((item) => `${item.id}/${item.variant}`)).size, 59);
    assert.deepEqual(components, source[mode].mapping.components);
    assert.equal(result.layout.observations[mode].length, 102);
    assert.deepEqual(result.layout.observations[mode], source[mode].layout.layout.observations);
  }
  assert.equal(result.layout.inferences.length, 16);
  assert.deepEqual(result.layout.inferences, source.dark.layout.layout.inferences);
  source.inferenceSourceMode = 'light';
  const light = assembleFigmaPackageV2(source);
  assert.deepEqual(light.layout.inferences, source.light.layout.layout.inferences);
  assert.equal(light.manifest.inferenceSource.layoutCapturedAt, '2026-10-01T21:15:26.814Z');
});

test('rejects material context mismatches, duplicate modes, and mismatched sibling artifacts', () => {
  const cases: Array<[string, (source: FigmaPackageV2Input) => void, RegExp]> = [
    ['build', (x) => { x.light.mapping.context.pluginBuild.sha256 = 'a'.repeat(64); }, /plugin build/],
    ['viewport', (x) => { x.light.layout.context.viewport.widthPx = 900; }, /viewport/],
    ['DPR', (x) => { x.light.layout.context.viewport.devicePixelRatio = 2; }, /viewport/],
    ['same mode', (x) => { x.light.mapping.context.environment.mode = 'dark'; }, /mode/],
    ['runtime', (x) => { x.light.mapping.context.environment.obsidianVersion = '2.0'; }, /obsidianVersion/],
    ['Mapping sibling', (x) => { x.dark.mapping.manifest.capturedAt = '2026-10-01T00:00:00.000Z'; }, /artifact environment/],
    ['Layout sibling', (x) => { x.dark.layout.layout.viewport.widthPx = 900; }, /artifact viewport/],
    ['token mode', (x) => { x.light.mapping.tokenEvidence.mode = 'dark'; }, /token evidence/],
  ];
  for (const [label, change, pattern] of cases) {
    const source = input();
    change(source);
    assert.throws(() => assembleFigmaPackageV2(source), pattern, label);
  }
  const differentTimes = input();
  differentTimes.light.layout.context.environment.capturedAt = '2026-10-02T00:00:00.000Z';
  differentTimes.light.layout.layout.environment.capturedAt = '2026-10-02T00:00:00.000Z';
  assert.doesNotThrow(() => assembleFigmaPackageV2(differentTimes));
});

test('rejects duplicate or divergent specimen/probe identities and unsupported source schema', () => {
  const duplicate = input();
  duplicate.light.mapping.components.push(duplicate.light.mapping.components[0]!);
  assert.throws(() => assembleFigmaPackageV2(duplicate), /duplicate identities/);
  const changed = input();
  changed.light.layout.layout.observations.pop();
  assert.throws(() => assembleFigmaPackageV2(changed), /observation identities differ/);
  const schema = input();
  schema.dark.mapping.manifest.schemaVersion = '0.5.0' as '0.4.0';
  assert.throws(() => assembleFigmaPackageV2(schema), /schema must be 0\.4\.0/);
});

test('writes the five JSON members and the unchanged v1 reader rejects v2 cleanly', () => {
  const bytes = buildFigmaPackageV2Zip(input());
  const entries = unzipSync(bytes);
  assert.deepEqual(Object.keys(entries).sort(), [
    'components.json', 'layout.json', 'manifest.json', 'package-manifest.json', 'tokens.json',
  ]);
  assert.equal(JSON.parse(strFromU8(entries['package-manifest.json']!)).version, 2);
  assert.equal(JSON.parse(strFromU8(entries['manifest.json']!)).schemaVersion, '0.5.0');
  assert.equal(JSON.parse(strFromU8(entries['tokens.json']!)).tokens['--shadow-xs'].dark.status, 'unresolved');
  assert.throws(() => readFigmaPackage(bytes), /versão do pacote não suportados/);
});
