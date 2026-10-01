import type { App } from 'obsidian';
import { componentRegistry, type RenderedSpecimen } from './component-registry';
import { captureComponents, captureManifest, captureTokens } from './snapshot';

const EXPORT_ROOT = 'ui-catalog-exports';

export async function captureCatalog(specimens: RenderedSpecimen[], capturedAt: string): Promise<{
  manifest: ReturnType<typeof captureManifest>;
  tokens: ReturnType<typeof captureTokens>;
  components: Awaited<ReturnType<typeof captureComponents>>;
}> {
  const expected = componentRegistry.reduce((total, definition) => total + definition.variants.length, 0);
  if (specimens.length !== expected) throw new Error(`Expected ${expected} catalog specimens, found ${specimens.length}`);
  if (specimens.some(({ root, activate }) => !activate && !root.isConnected)) {
    throw new Error('Open the catalog before exporting');
  }

  const doc = specimens[0]!.root.ownerDocument;
  // Capture all three outputs before any file operation so they describe one UI state.
  const manifest = captureManifest(doc, capturedAt);
  const tokens = captureTokens(doc);
  const components = await captureComponents(specimens);
  return { manifest, tokens, components };
}

export async function exportCatalog(app: App, specimens: RenderedSpecimen[]): Promise<string> {
  const capturedAt = new Date().toISOString();
  const { manifest, tokens, components } = await captureCatalog(specimens, capturedAt);

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
