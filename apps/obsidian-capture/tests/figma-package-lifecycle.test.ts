import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { DataAdapter } from 'obsidian';
import { runFigmaPackageLifecycle } from '../src/figma-package-lifecycle';
import { FIGMA_PACKAGE_ROOT, PACKAGE_FAILURE_ROOT, PACKAGE_STAGING_ROOT } from '../src/export-paths';

function fakeAdapter(initial: string[] = [], failRename = false): { adapter: DataAdapter; files: Map<string, string | ArrayBuffer> } {
  const files = new Map<string, string | ArrayBuffer>(initial.map((path) => [path, 'existing']));
  const folders = new Set<string>();
  for (const path of initial) {
    const segments = path.split('/');
    for (let index = 1; index < segments.length; index++) folders.add(segments.slice(0, index).join('/'));
  }
  const adapter = {
    exists: async (path: string) => files.has(path) || folders.has(path),
    mkdir: async (path: string) => { folders.add(path); },
    list: async (path: string) => ({
      files: [...files.keys()].filter((file) => file.startsWith(`${path}/`) && !file.slice(path.length + 1).includes('/')),
      folders: [...folders].filter((folder) => folder.startsWith(`${path}/`) && !folder.slice(path.length + 1).includes('/')),
    }),
    write: async (path: string, value: string) => { files.set(path, value); },
    writeBinary: async (path: string, value: ArrayBuffer) => { files.set(path, value); },
    remove: async (path: string) => { assert.equal(files.delete(path), true); },
    rename: async (from: string, to: string) => {
      if (failRename) throw new Error('rename failed');
      const value = files.get(from);
      assert.ok(value);
      files.delete(from);
      files.set(to, value);
    },
  } as unknown as DataAdapter;
  return { adapter, files };
}

function failureRecord(files: Map<string, string | ArrayBuffer>): Record<string, unknown> {
  const paths = [...files.keys()].filter((path) => path.startsWith(`${PACKAGE_FAILURE_ROOT}/`));
  assert.equal(paths.length, 1);
  return JSON.parse(files.get(paths[0]!) as string) as Record<string, unknown>;
}

test('publishes only the final ZIP and removes safely identified orphans before capture', async () => {
  const orphan = `${PACKAGE_STAGING_ROOT}/obsidian-ui-package-staging-2026-10-01T12-12-18-735Z-abcdefgh.zip.partial`;
  const legacy = `${FIGMA_PACKAGE_ROOT}/obsidian-ui-package-2026-10-01T12-12-18-735Z.zip.partial`;
  const finished = `${FIGMA_PACKAGE_ROOT}/obsidian-ui-package-2026-10-01T12-12-18-735Z.zip`;
  const unrelated = `${FIGMA_PACKAGE_ROOT}/other.partial`;
  const unrelatedStaging = `${PACKAGE_STAGING_ROOT}/notes.partial`;
  const diagnostic = `${PACKAGE_FAILURE_ROOT}/older.json`;
  const atlas = '.obsidian-ui-system/ui-catalog-exports/one/components.json';
  const { adapter, files } = fakeAdapter([orphan, legacy, finished, unrelated, unrelatedStaging, diagnostic, atlas]);
  const output = await runFigmaPackageLifecycle(adapter, async () => {
    assert.equal(files.has(orphan), false);
    assert.equal(files.has(legacy), false);
    return new Uint8Array([0x50, 0x4b]);
  });
  assert.match(output, /^obsidian-ui-exports\/figma-packages\/obsidian-ui-package-.*\.zip$/);
  assert.ok(files.get(output) instanceof ArrayBuffer);
  assert.equal([...files.keys()].some((path) => path.endsWith('.partial') && path !== unrelated && path !== unrelatedStaging), false);
  for (const path of [finished, unrelated, unrelatedStaging, diagnostic, atlas]) assert.equal(files.has(path), true);
});

test('preserves a small diagnostic when capture fails without publishing a ZIP', async () => {
  const { adapter, files } = fakeAdapter();
  await assert.rejects(runFigmaPackageLifecycle(adapter, async (_timestamp, setStage) => {
    setStage('capture-layout');
    throw new Error('probe failed');
  }), /Package failure diagnostic:/);
  assert.equal([...files.keys()].some((path) => path.endsWith('.zip')), false);
  const record = failureRecord(files);
  assert.equal(record.stage, 'capture-layout');
  assert.equal((record.error as Record<string, unknown>).message, 'probe failed');
  assert.ok(JSON.stringify(record).length < 3500);
});

test('removes this run staging file and records a publish failure', async () => {
  const { adapter, files } = fakeAdapter([], true);
  await assert.rejects(runFigmaPackageLifecycle(adapter, async () => new Uint8Array([0x50, 0x4b])), /rename failed/);
  assert.equal([...files.keys()].some((path) => path.startsWith(`${PACKAGE_STAGING_ROOT}/`)), false);
  assert.equal([...files.keys()].some((path) => path.startsWith(`${FIGMA_PACKAGE_ROOT}/`)), false);
  assert.equal(failureRecord(files).stage, 'publish-package');
});
