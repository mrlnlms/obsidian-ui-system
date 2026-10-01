import type { App } from 'obsidian';
import { componentRegistry, type RenderedSpecimen } from './component-registry';
import { captureComponents, captureManifest } from './snapshot';
import { captureTokenEvidence, projectLegacyTokens } from './token-evidence';
import { CATALOG_EXPORT_ROOT, ensureDirectory } from './export-paths';
import { assertCaptureContextMatches, assertCaptureContextStable, readCaptureContext } from './capture-context';

export async function captureCatalog(specimens: RenderedSpecimen[], capturedAt: string): Promise<{
  manifest: ReturnType<typeof captureManifest>;
  tokens: ReturnType<typeof projectLegacyTokens>;
  tokenEvidence: ReturnType<typeof captureTokenEvidence>;
  components: Awaited<ReturnType<typeof captureComponents>>;
}> {
  const expected = componentRegistry.reduce((total, definition) => total + definition.variants.length, 0);
  if (specimens.length !== expected) throw new Error(`Expected ${expected} catalog specimens, found ${specimens.length}`);
  if (specimens.some(({ root, activate }) => !activate && !root.isConnected)) {
    throw new Error('Open the catalog before exporting');
  }

  const doc = specimens[0]!.root.ownerDocument;
  // Capture before any file operation so all outputs describe one UI state.
  const manifest = captureManifest(doc, capturedAt);
  const tokenEvidence = captureTokenEvidence(doc, manifest);
  const tokens = projectLegacyTokens(tokenEvidence);
  const components = await captureComponents(specimens);
  return { manifest, tokens, tokenEvidence, components };
}

export async function exportCatalog(app: App, specimens: RenderedSpecimen[]): Promise<string> {
  const capturedAt = new Date().toISOString();
  const doc = specimens[0]?.root.ownerDocument;
  if (!doc) throw new Error('Open the catalog before exporting');
  const context = await readCaptureContext(app.vault.adapter, app.vault.configDir,
    doc, captureManifest(doc, capturedAt), 'mapping');
  const { manifest, tokens, tokenEvidence, components } = await captureCatalog(specimens, capturedAt);
  const after = await readCaptureContext(app.vault.adapter, app.vault.configDir,
    doc, captureManifest(doc, capturedAt), 'mapping');
  assertCaptureContextStable(context, after);
  assertCaptureContextMatches(context, 'mapping', manifest);

  const adapter = app.vault.adapter;
  await ensureDirectory(adapter, CATALOG_EXPORT_ROOT);
  const baseName = capturedAt.replace(/[:.]/g, '-');
  let folder = `${CATALOG_EXPORT_ROOT}/${baseName}`;
  for (let suffix = 2; await adapter.exists(folder); suffix++) {
    folder = `${CATALOG_EXPORT_ROOT}/${baseName}-${suffix}`;
  }
  await adapter.mkdir(folder);
  await adapter.write(`${folder}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
  await adapter.write(`${folder}/tokens.json`, JSON.stringify(tokens, null, 2) + '\n');
  await adapter.write(`${folder}/token-evidence.json`, JSON.stringify(tokenEvidence, null, 2) + '\n');
  await adapter.write(`${folder}/components.json`, JSON.stringify(components, null, 2) + '\n');
  await adapter.write(`${folder}/capture-context.json`, JSON.stringify(context, null, 2) + '\n');
  return folder;
}
