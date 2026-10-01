import type { DataAdapter } from 'obsidian';
import { CATALOG_EXPORT_ROOT, LAYOUT_EXPORT_ROOT, DEVELOPMENT_ROOT } from './export-paths';

export const DEVELOPMENT_EXPORT_ROOTS = [
  CATALOG_EXPORT_ROOT,
  LAYOUT_EXPORT_ROOT,
  `${DEVELOPMENT_ROOT}/snapshot-diffs`,
] as const;

export interface DevelopmentExportInventory {
  roots: Array<{ path: string; files: string[]; folders: string[] }>;
  fileCount: number;
  folderCount: number;
}

function isWithinRoot(root: string, path: string): boolean {
  return path.startsWith(`${root}/`) && path.slice(root.length + 1).split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..');
}

async function collect(adapter: DataAdapter, root: string, folder: string, files: string[], folders: string[]): Promise<void> {
  const listed = await adapter.list(folder);
  for (const file of listed.files) {
    if (!isWithinRoot(root, file)) throw new Error(`Unexpected development export path: ${file}`);
    files.push(file);
  }
  for (const child of listed.folders) {
    if (!isWithinRoot(root, child)) throw new Error(`Unexpected development export path: ${child}`);
    await collect(adapter, root, child, files, folders);
    folders.push(child);
  }
}

/** Only the three fixed technical roots are eligible; Figma Packages are outside them. */
export async function inspectDevelopmentExports(adapter: DataAdapter): Promise<DevelopmentExportInventory> {
  const roots: DevelopmentExportInventory['roots'] = [];
  for (const path of DEVELOPMENT_EXPORT_ROOTS) {
    const files: string[] = [];
    const folders: string[] = [];
    if (await adapter.exists(path)) await collect(adapter, path, path, files, folders);
    roots.push({ path, files, folders });
  }
  return {
    roots,
    fileCount: roots.reduce((total, root) => total + root.files.length, 0),
    folderCount: roots.reduce((total, root) => total + root.folders.length, 0),
  };
}

/** Delete exactly the paths shown in the confirmation inventory, deepest folders first. */
export async function cleanDevelopmentExports(adapter: DataAdapter, inventory: DevelopmentExportInventory): Promise<void> {
  for (const root of inventory.roots) {
    if (!DEVELOPMENT_EXPORT_ROOTS.includes(root.path as typeof DEVELOPMENT_EXPORT_ROOTS[number])) {
      throw new Error(`Unexpected development export root: ${root.path}`);
    }
    for (const file of root.files) {
      if (!isWithinRoot(root.path, file)) throw new Error(`Unexpected development export path: ${file}`);
      await adapter.remove(file);
    }
    for (const folder of root.folders) {
      if (!isWithinRoot(root.path, folder)) throw new Error(`Unexpected development export path: ${folder}`);
      await adapter.rmdir(folder, false);
    }
  }
}
