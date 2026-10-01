import type { DataAdapter } from 'obsidian';

export const DEVELOPMENT_ROOT = '.obsidian-ui-system';
export const CATALOG_EXPORT_ROOT = `${DEVELOPMENT_ROOT}/ui-catalog-exports`;
export const LAYOUT_EXPORT_ROOT = `${DEVELOPMENT_ROOT}/layout-lab-exports`;
export const FIGMA_PACKAGE_ROOT = 'obsidian-ui-exports/figma-packages';

export async function ensureDirectory(adapter: DataAdapter, directory: string): Promise<void> {
  let current = '';
  for (const segment of directory.split('/')) {
    current = current ? `${current}/${segment}` : segment;
    if (!(await adapter.exists(current))) await adapter.mkdir(current);
  }
}
