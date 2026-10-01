import assert from 'node:assert/strict';
import { test } from 'node:test';
import { strFromU8, unzipSync } from 'fflate';
import type { ComponentSnapshot, SnapshotManifest, TokensSnapshot } from '@obsidian-ui-system/ui-schema';
import { buildFigmaPackageZip, type FigmaPackageInput } from '../src/figma-package-archive';
import type { LayoutObservation } from '../src/layout-capture';
import type { LayoutInference } from '../src/layout-inference';

const manifest: SnapshotManifest = {
  schemaVersion: '0.4.0', obsidianVersion: '1.13.1', obsidianSdkVersion: '1.13.1',
  capturedAt: '2026-10-01T12:00:00.000Z', platform: 'macos', theme: null, mode: 'dark',
};
const components = [{ id: 'obsidian.button', variant: 'normal' }] as ComponentSnapshot[];
const tokens: TokensSnapshot = { scopes: ['html', 'body'], values: { '--background-primary': '#000' } };
const observations = [{ id: 'obsidian.button', variant: 'normal' }] as LayoutObservation[];
const inferences = [{ id: 'obsidian.button', variant: 'normal' }] as LayoutInference[];

function input(): FigmaPackageInput {
  return {
    manifest: { ...manifest }, components, tokens,
    layout: {
      experimentalFormat: 'mapping-layout-probes-2', environment: { ...manifest },
      observations, inferences,
    },
  };
}

test('writes a real ZIP with the canonical payload and transport metadata', () => {
  const bytes = buildFigmaPackageZip(input(), ['obsidian.button/normal']);
  assert.equal(bytes[0], 0x50);
  assert.equal(bytes[1], 0x4b);
  const entries = unzipSync(bytes);
  assert.deepEqual(Object.keys(entries).sort(), [
    'components.json', 'layout.json', 'manifest.json', 'package-manifest.json', 'tokens.json',
  ]);
  assert.deepEqual(JSON.parse(strFromU8(entries['manifest.json']!)), manifest);
  assert.equal(JSON.parse(strFromU8(entries['layout.json']!)).environment.capturedAt, manifest.capturedAt);
  assert.equal(JSON.parse(strFromU8(entries['package-manifest.json']!)).layoutModel, 'mapping-layout-probes-2');
});

test('rejects mismatched capture environments before creating an archive', () => {
  const payload = input();
  payload.layout.environment.mode = 'light';
  assert.throws(() => buildFigmaPackageZip(payload, ['obsidian.button/normal']), /environments differ/);
});

test('rejects missing canonical variants and unmatched inference', () => {
  assert.throws(() => buildFigmaPackageZip(input(), ['obsidian.button/normal', 'obsidian.button/cta']), /complete canonical registry/);
  const payload = input();
  payload.layout.inferences = [{ id: 'obsidian.search', variant: 'empty' }] as LayoutInference[];
  assert.throws(() => buildFigmaPackageZip(payload, ['obsidian.button/normal']), /no matching measurement/);
});
