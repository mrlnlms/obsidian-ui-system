import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { readFigmaPackage } from '../src/package-data';
import { CURRENT_LAYOUT_MODEL, LEGACY_LAYOUT_MODEL } from '../src/layout-model';

const fixture = new Uint8Array(readFileSync(join(process.cwd(), 'tests/fixtures',
  'obsidian-ui-package-2026-10-01T12-12-18-735Z.zip')));

function changed(name: string, value: unknown): Uint8Array {
  const files = unzipSync(fixture);
  files[name] = strToU8(JSON.stringify(value));
  return zipSync(files);
}

test('imports the real Obsidian package and preflights Button and Search evidence', () => {
  const result = readFigmaPackage(fixture);
  assert.deepEqual(result.summary, { obsidianVersion: '1.14.3', specimens: 59, tokens: 945 });
  assert.equal((result.layout as { experimentalFormat: string }).experimentalFormat, LEGACY_LAYOUT_MODEL);
});

test('imports a package exported with the Mapping layout identifier', () => {
  const files = unzipSync(fixture);
  const packageManifest = JSON.parse(strFromU8(files['package-manifest.json']!));
  const layout = JSON.parse(strFromU8(files['layout.json']!));
  files['package-manifest.json'] = strToU8(JSON.stringify({ ...packageManifest, layoutModel: CURRENT_LAYOUT_MODEL }));
  files['layout.json'] = strToU8(JSON.stringify({ ...layout, experimentalFormat: CURRENT_LAYOUT_MODEL }));
  const result = readFigmaPackage(zipSync(files));
  assert.equal((result.layout as { experimentalFormat: string }).experimentalFormat, CURRENT_LAYOUT_MODEL);
});

test('rejects a package with a missing required file', () => {
  const files = unzipSync(fixture);
  delete files['layout.json'];
  assert.throws(() => readFigmaPackage(zipSync(files)), /layout\.json ausente/);
});

test('rejects incompatible package and schema versions', () => {
  const files = unzipSync(fixture);
  const packageManifest = JSON.parse(strFromU8(files['package-manifest.json']!));
  assert.throws(() => readFigmaPackage(changed('package-manifest.json',
    { ...packageManifest, version: 2 })), /versão do pacote/);
  const manifest = JSON.parse(strFromU8(files['manifest.json']!));
  assert.throws(() => readFigmaPackage(changed('manifest.json',
    { ...manifest, schemaVersion: '0.5.0' })), /schema 0\.5\.0/);
});

test('rejects mixed captures and missing supported components before generation', () => {
  const files = unzipSync(fixture);
  const layout = JSON.parse(strFromU8(files['layout.json']!));
  assert.throws(() => readFigmaPackage(changed('layout.json',
    { ...layout, environment: { ...layout.environment, capturedAt: 'another-run' } })),
  /diferem em capturedAt/);
  const components = JSON.parse(strFromU8(files['components.json']!)) as Array<{ id: string; variant: string }>;
  assert.throws(() => readFigmaPackage(changed('components.json',
    components.filter((item) => !(item.id === 'obsidian.search' && item.variant === 'filled')))),
  /não está no Mapping|Search/);
});

test('rejects corrupt JSON without leaking a partial import', () => {
  const files = unzipSync(fixture);
  files['tokens.json'] = strToU8('{');
  assert.throws(() => readFigmaPackage(zipSync(files)), /tokens\.json não contém JSON válido/);
});
