import type { App } from 'obsidian';
import type { RenderedSpecimen } from './component-registry';
import { bindingDiagnosticCases, diagnoseBinding } from './binding-diagnostic';
import { captureManifest } from './snapshot';
import { readCaptureContext, assertCaptureContextStable } from './capture-context';
import { ensureDirectory, FIGMA_PACKAGE_ROOT } from './export-paths';

export async function exportBindingDiagnostic(app: App, specimens: RenderedSpecimen[]): Promise<string> {
  const capturedAt = new Date().toISOString();
  const doc = specimens[0]?.root.ownerDocument;
  if (!doc) throw new Error('Mapping specimens are unavailable');
  const manifest = captureManifest(doc, capturedAt);
  if (manifest.mode !== 'dark' && manifest.mode !== 'light') throw new Error('Select Dark or Light appearance before the diagnostic');
  const before = await readCaptureContext(app.vault.adapter, app.vault.configDir, doc, manifest, 'mapping');
  const results = bindingDiagnosticCases.map((item) => {
    const specimen = specimens.find(({ definition, variant }) => definition.id === item.specimen && variant.id === item.variant);
    if (!specimen) throw new Error(`Missing ${item.specimen}/${item.variant}`);
    return diagnoseBinding(specimen, item);
  });
  const after = await readCaptureContext(app.vault.adapter, app.vault.configDir, doc, manifest, 'mapping');
  assertCaptureContextStable(before, after);
  const root = FIGMA_PACKAGE_ROOT;
  await ensureDirectory(app.vault.adapter, root);
  const baseName = capturedAt.replace(/[:.]/g, '-');
  let path = `${root}/binding-diagnostic-${manifest.mode}-${baseName}.json`;
  for (let suffix = 2; await app.vault.adapter.exists(path); suffix++) path = `${root}/binding-diagnostic-${manifest.mode}-${baseName}-${suffix}.json`;
  await app.vault.adapter.write(path, JSON.stringify({ format: 'obsidian-ui-binding-diagnostic', version: 1,
    capturedAt, mode: manifest.mode, context: before, results }, null, 2) + '\n');
  return path;
}
