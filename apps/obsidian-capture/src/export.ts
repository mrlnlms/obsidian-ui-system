import type { App } from 'obsidian';
import type { CatalogEntry } from './catalog';
import { captureComponents, captureManifest, captureTokens } from './snapshot';

const EXPORT_ROOT = 'ui-catalog-exports';

export async function exportCatalog(app: App, entries: CatalogEntry[]): Promise<string> {
  if (entries.length !== 3) throw new Error(`Expected three catalog components, found ${entries.length}`);
  if (entries.some(({ root }) => !root.isConnected)) throw new Error('Open the catalog before exporting');

  const doc = entries[0]!.root.ownerDocument;
  const capturedAt = new Date().toISOString();
  // Capture all three outputs before any file operation so they describe one UI state.
  const manifest = captureManifest(doc, capturedAt);
  const tokens = captureTokens(doc);
  const components = captureComponents(entries);

  const adapter = app.vault.adapter;
  if (!(await adapter.exists(EXPORT_ROOT))) await adapter.mkdir(EXPORT_ROOT);
  const baseName = capturedAt.replace(/[:.]/g, '-');
  let folder = `${EXPORT_ROOT}/${baseName}`;
  for (let suffix = 2; await adapter.exists(folder); suffix++) {
    folder = `${EXPORT_ROOT}/${baseName}-${suffix}`;
  }
  await adapter.mkdir(folder);
  await adapter.write(`${folder}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
  await adapter.write(`${folder}/tokens.json`, JSON.stringify(tokens, null, 2) + '\n');
  await adapter.write(`${folder}/components.json`, JSON.stringify(components, null, 2) + '\n');
  return folder;
}
