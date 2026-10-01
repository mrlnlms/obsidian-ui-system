import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { DataAdapter } from 'obsidian';
import type { CaptureContext, SnapshotManifest } from '@obsidian-ui-system/ui-schema';
import {
  assertCaptureContextMatches, assertCaptureContextStable, readCaptureContext, verifyControlledCaptureSet,
} from '../src/capture-context';

const manifest = (mode: 'dark' | 'light', capturedAt = mode): SnapshotManifest => ({
  schemaVersion: '0.4.0', obsidianVersion: '1.14.3', obsidianSdkVersion: '1.13.1',
  capturedAt, platform: 'macos', theme: null, mode,
});
const viewport = { widthPx: 1024, heightPx: 800, devicePixelRatio: 1 };
const context = (kind: 'mapping' | 'layout', mode: 'dark' | 'light'): CaptureContext => ({
  format: 'obsidian-ui-capture-context', version: 1, kind,
  environment: manifest(mode, `${kind}-${mode}`),
  pluginBuild: { algorithm: 'SHA-256', path: '.obsidian/plugins/obsidian-ui-mapping/main.js',
    sha256: 'a'.repeat(64) },
  viewport: { ...viewport },
});
const set = () => ({
  dark: { mapping: context('mapping', 'dark'), layout: context('layout', 'dark') },
  light: { mapping: context('mapping', 'light'), layout: context('layout', 'light') },
});

test('reads the installed compiled plugin and records exact viewport/environment', async () => {
  const bytes = new TextEncoder().encode('abc');
  const paths: string[] = [];
  const adapter = {
    readBinary: async (path: string) => {
      paths.push(path);
      return bytes.buffer;
    },
  } as unknown as DataAdapter;
  const doc = { defaultView: { innerWidth: 1024, innerHeight: 800, devicePixelRatio: 1 } } as Document;
  const result = await readCaptureContext(adapter, '.obsidian', doc, manifest('dark'), 'mapping');
  assert.deepEqual(paths, ['.obsidian/plugins/obsidian-ui-mapping/main.js']);
  assert.equal(result.pluginBuild.sha256,
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.deepEqual(result.viewport, viewport);
  assert.equal(result.environment.mode, 'dark');
  await assert.rejects(readCaptureContext(
    { readBinary: async () => { throw new Error('blocked'); } } as unknown as DataAdapter,
    '.obsidian', doc, manifest('dark'), 'mapping',
  ), /blocked/);
});

test('accepts four controlled individual exports with different timestamps and one inference source', () => {
  const captures = set();
  const verified = verifyControlledCaptureSet(captures, 'dark');
  assert.equal(verified.technicalContext, 'verified');
  assert.equal(verified.buildSha256, 'a'.repeat(64));
  assert.deepEqual(verified.viewport, viewport);
  assert.deepEqual(verified.inferenceSource, {
    mode: 'dark', layoutCapturedAt: 'layout-dark',
  });
  assert.equal(verified.themeNameKnown, false);
});

test('rejects changed build, viewport, version, mode, and Mapping/Layout disagreement', () => {
  const cases: Array<[string, (captures: ReturnType<typeof set>) => void, RegExp]> = [
    ['build', (v) => { v.light.layout.pluginBuild.sha256 = 'b'.repeat(64); }, /plugin build/],
    ['viewport', (v) => { v.light.mapping.viewport.widthPx = 900; }, /viewport/],
    ['runtime', (v) => { v.light.mapping.environment.obsidianVersion = '1.14.4'; }, /obsidianVersion/],
    ['SDK', (v) => { v.light.mapping.environment.obsidianSdkVersion = '1.14.4'; }, /obsidianSdkVersion/],
    ['schema', (v) => { v.light.mapping.environment.schemaVersion = '0.3.0' as '0.4.0'; }, /schemaVersion/],
    ['platform', (v) => { v.light.mapping.environment.platform = 'ios'; }, /platform/],
    ['mode', (v) => { v.light.mapping.environment.mode = 'dark'; }, /mode/],
    ['kind', (v) => { v.light.layout.kind = 'mapping'; }, /kind/],
  ];
  for (const [label, change, pattern] of cases) {
    const captures = set();
    change(captures);
    assert.throws(() => verifyControlledCaptureSet(captures, 'dark'), pattern, label);
  }
  const changed = set();
  changed.light.mapping.environment.theme = 'A';
  changed.dark.mapping.environment.theme = 'B';
  changed.light.layout.environment.theme = 'A';
  changed.dark.layout.environment.theme = 'B';
  assert.throws(() => verifyControlledCaptureSet(changed, 'dark'), /theme/);
});

test('detects environment, viewport, or bundle changing during one export', () => {
  const before = context('mapping', 'dark');
  const after = structuredClone(before);
  assert.doesNotThrow(() => assertCaptureContextStable(before, after));
  after.viewport.widthPx = 900;
  assert.throws(() => assertCaptureContextStable(before, after), /viewport/);
  after.viewport.widthPx = 1024;
  after.pluginBuild.sha256 = 'b'.repeat(64);
  assert.throws(() => assertCaptureContextStable(before, after), /plugin build/);
  after.pluginBuild.sha256 = 'a'.repeat(64);
  after.environment.mode = 'light';
  assert.throws(() => assertCaptureContextStable(before, after), /environment/);
});

test('binds each context to its sibling artifact', () => {
  const mapping = context('mapping', 'dark');
  const layout = context('layout', 'dark');
  assert.doesNotThrow(() => assertCaptureContextMatches(mapping, 'mapping', mapping.environment));
  assert.doesNotThrow(() => assertCaptureContextMatches(layout, 'layout', layout.environment, viewport));
  assert.throws(() => assertCaptureContextMatches(mapping, 'layout', mapping.environment), /environment/);
  assert.throws(() => assertCaptureContextMatches(mapping, 'mapping', manifest('light')), /environment/);
  assert.throws(() => assertCaptureContextMatches(layout, 'layout', layout.environment,
    { ...viewport, widthPx: 900 }), /viewport/);
});
