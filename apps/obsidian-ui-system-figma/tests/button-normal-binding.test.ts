import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { CaptureContext, ComponentSnapshot, SnapshotManifest, TokenEvidenceCapture } from '@obsidian-ui-system/ui-schema';
import { buildFigmaPackageV2Zip, type FigmaPackageV2Input, type LayoutV2Source } from
  '../../obsidian-ui-mapping/src/figma-package-v2';
import { readButtonV2Package, readPackageVersion } from '../src/button-v2-package';
import { prepareButtonNormalBinding } from '../src/button-normal-binding';

const files = unzipSync(new Uint8Array(readFileSync(join(process.cwd(),
  '../obsidian-ui-mapping/tests/fixtures/controlled-dark-light-2026-10-01.zip'))));
const artifact = <T>(mode: 'dark' | 'light', kind: 'mapping' | 'layout', name: string): T =>
  JSON.parse(strFromU8(files[`${mode}/${kind}/${name}`]!)) as T;

function packageInput(): FigmaPackageV2Input {
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
  return { dark: source('dark'), light: source('light'), inferenceSourceMode: 'dark',
    assembledAt: '2026-10-01T22:00:00.000Z' };
}

function diagnostic(mode: 'dark' | 'light') {
  const context = artifact<CaptureContext>(mode, 'mapping', 'capture-context.json');
  context.pluginBuild.sha256 = '7'.repeat(64);
  const result = (property: 'border-radius' | 'background-color', token: string) => ({
    specimen: 'obsidian.button', variant: 'normal', element: 'root', property,
    tokenCandidate: token, status: 'confirmed', originalComputed: 'a different captured value',
    unreadableSheets: [], competingProbes: [], candidates: [{ property, rawValue: `var(${token})`,
      applicable: 'yes', references: [{ name: token, role: 'whole-value', fallback: null }] }],
    verification: { original: 'a different captured value', restored: 'a different captured value',
      matchedWitness: true, restoredExactly: true, inlineRestored: true },
  });
  return { filename: `${mode}.json`, data: { format: 'obsidian-ui-binding-diagnostic', version: 1,
    mode, capturedAt: context.environment.capturedAt, context,
    results: [result('border-radius', '--button-radius'),
      result('background-color', '--interactive-normal')] } };
}

function diagnostics() { return [diagnostic('dark'), diagnostic('light')]; }

test('real v2 reader and structural preflight reuse confirmed identities across different resolved values', () => {
  const input = packageInput();
  const baseline = input.dark.layout.layout.observations.find((item) => item.id === 'obsidian.button' &&
    item.variant === 'normal' && item.contentContext.id === 'baseline')!;
  baseline.root.styles['background-color'] = 'rgb(0, 0, 0)';
  const snapshot = input.dark.mapping.components.find((item) => item.id === 'obsidian.button' &&
    item.variant === 'normal')!;
  snapshot.dom.styles.background = 'a snapshot-specific color';
  snapshot.dom.styles.borderRadius = 'a snapshot-specific radius';
  const bytes = buildFigmaPackageV2Zip(input);
  assert.equal(readPackageVersion(bytes), 2);
  const source = readButtonV2Package(bytes);
  assert.equal(source.button.state, 'Normal');
  assert.equal(source.baseMode, 'dark');
  assert.equal(source.button.radius, 0);
  source.tokens.tokens['--interactive-normal']!.light!.computed.selected = '#123456';
  const prepared = prepareButtonNormalBinding(source, diagnostics());
  assert.equal(prepared.radius.cssName, '--button-radius');
  assert.equal(prepared.background.cssName, '--interactive-normal');
  assert.deepEqual(prepared.background.modes.light.projected, { strategy: 'literal',
    value: { r: 0x12 / 255, g: 0x34 / 255, b: 0x56 / 255 } });
  assert.notEqual(prepared.evidence.origins.package.buildSha256,
    prepared.evidence.origins.diagnostics.dark.buildSha256);
});

test('structural preflight requires confirmed evidence and both projected mode values', () => {
  const source = readButtonV2Package(buildFigmaPackageV2Zip(packageInput()));
  const inputs = diagnostics();
  (inputs[0]!.data.results[0] as { status: string }).status = 'unknown';
  assert.throws(() => prepareButtonNormalBinding(source, inputs), /não confirmada/);
  delete source.tokens.tokens['--button-radius'];
  assert.throws(() => prepareButtonNormalBinding(source, diagnostics()), /ausente no Package v2/);
  const fresh = readButtonV2Package(buildFigmaPackageV2Zip(packageInput()));
  delete fresh.tokens.tokens['--interactive-normal']!.light;
  assert.throws(() => prepareButtonNormalBinding(fresh, diagnostics()), /não projeta COLOR/);
});

test('uses the Package inference-source mode for the real Button base', () => {
  const input = packageInput();
  input.inferenceSourceMode = 'light';
  const source = readButtonV2Package(buildFigmaPackageV2Zip(input));
  assert.equal(source.baseMode, 'light');
  assert.equal(source.button.state, 'Normal');
  assert.equal(prepareButtonNormalBinding(source, diagnostics()).background.cssName, '--interactive-normal');
});

test('real v2 reader requires Button normal without depending on CTA or Search generation', () => {
  const raw = unzipSync(buildFigmaPackageV2Zip(packageInput()));
  const components = JSON.parse(strFromU8(raw['components.json']!));
  components.dark = components.dark.filter((item: { id: string; variant: string }) =>
    item.id !== 'obsidian.button' || item.variant !== 'normal');
  raw['components.json'] = strToU8(JSON.stringify(components));
  assert.throws(() => readButtonV2Package(zipSync(raw)), /specimen dark ausente/);
});
