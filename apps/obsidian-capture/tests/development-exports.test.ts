import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { DataAdapter } from 'obsidian';
import { cleanDevelopmentExports, inspectDevelopmentExports } from '../src/development-exports';
import { ensureDirectory, FIGMA_PACKAGE_ROOT } from '../src/export-paths';

function fakeAdapter(initialFiles: string[]): { adapter: DataAdapter; files: Set<string>; folders: Set<string> } {
  const files = new Set(initialFiles);
  const folders = new Set<string>();
  for (const file of files) {
    const segments = file.split('/');
    for (let index = 1; index < segments.length; index++) folders.add(segments.slice(0, index).join('/'));
  }
  const adapter = {
    exists: async (path: string) => files.has(path) || folders.has(path),
    mkdir: async (path: string) => { folders.add(path); },
    list: async (path: string) => ({
      files: [...files].filter((file) => file.startsWith(`${path}/`) && !file.slice(path.length + 1).includes('/')),
      folders: [...folders].filter((folder) => folder.startsWith(`${path}/`) && !folder.slice(path.length + 1).includes('/')),
    }),
    remove: async (path: string) => { assert.equal(files.delete(path), true); },
    rmdir: async (path: string, recursive: boolean) => {
      assert.equal(recursive, false);
      assert.equal([...files, ...folders].some((entry) => entry.startsWith(`${path}/`)), false);
      assert.equal(folders.delete(path), true);
    },
  } as unknown as DataAdapter;
  return { adapter, files, folders };
}

test('creates nested final export directories', async () => {
  const { adapter, folders } = fakeAdapter([]);
  await ensureDirectory(adapter, FIGMA_PACKAGE_ROOT);
  assert.equal(folders.has('obsidian-ui-exports'), true);
  assert.equal(folders.has(FIGMA_PACKAGE_ROOT), true);
});

test('cleans only inventoried development files and preserves Figma Packages', async () => {
  const packagePath = `${FIGMA_PACKAGE_ROOT}/obsidian-ui-package.zip`;
  const failurePath = '.obsidian-ui-system/package-failures/run.json';
  const stagingPath = '.obsidian-ui-system/package-staging/orphan.zip.partial';
  const { adapter, files, folders } = fakeAdapter([
    '.obsidian-ui-system/ui-catalog-exports/one/components.json',
    '.obsidian-ui-system/layout-lab-exports/two/layout.json',
    '.obsidian-ui-system/snapshot-diffs/three/diff.md',
    packagePath,
    failurePath,
    stagingPath,
  ]);
  const inventory = await inspectDevelopmentExports(adapter);
  assert.equal(inventory.fileCount, 3);
  assert.equal(inventory.folderCount, 3);
  await cleanDevelopmentExports(adapter, inventory);
  assert.deepEqual([...files], [packagePath, failurePath, stagingPath]);
  assert.equal(folders.has(FIGMA_PACKAGE_ROOT), true);
});

test('rejects a cleanup inventory outside technical roots', async () => {
  const { adapter, files } = fakeAdapter([`${FIGMA_PACKAGE_ROOT}/keep.zip`]);
  await assert.rejects(cleanDevelopmentExports(adapter, {
    roots: [{ path: FIGMA_PACKAGE_ROOT, files: [`${FIGMA_PACKAGE_ROOT}/keep.zip`], folders: [] }],
    fileCount: 1, folderCount: 0,
  }), /Unexpected development export root/);
  assert.equal(files.has(`${FIGMA_PACKAGE_ROOT}/keep.zip`), true);
  await assert.rejects(cleanDevelopmentExports(adapter, {
    roots: [{ path: '.obsidian-ui-system/ui-catalog-exports', files: [
      '.obsidian-ui-system/ui-catalog-exports/../../obsidian-ui-exports/figma-packages/keep.zip',
    ], folders: [] }],
    fileCount: 1, folderCount: 0,
  }), /Unexpected development export path/);
  assert.equal(files.has(`${FIGMA_PACKAGE_ROOT}/keep.zip`), true);
});
