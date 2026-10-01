import type { App } from 'obsidian';
import { componentRegistry, type RenderedSpecimen } from './component-registry';
import { renderCatalogSpecimens } from './catalog';
import { captureCatalog } from './export';
import { renderLayoutFixtures, captureLayoutProbes } from './layout-capture';
import { captureManifest } from './snapshot';
import { buildFigmaPackageZip } from './figma-package-archive';
import { runFigmaPackageLifecycle } from './figma-package-lifecycle';

function assertSameEnvironment(doc: Document, capturedAt: string, expected: ReturnType<typeof captureManifest>): void {
  if (JSON.stringify(captureManifest(doc, capturedAt)) !== JSON.stringify(expected)) {
    throw new Error('Obsidian environment changed during capture; package was not created');
  }
}

/** Temporary connected DOM preserves real CSSOM/layout without requiring either workspace view. */
export async function exportFigmaPackage(app: App): Promise<string> {
  return runFigmaPackageLifecycle(app.vault.adapter, async (capturedAt, setStage) => {
    const doc = activeWindow.document;
    const view = doc.defaultView;
    if (!view || !doc.body) throw new Error('An active Obsidian document is required');
    const initial = captureManifest(doc, capturedAt);
    const mount = doc.createElement('div');
    const width = doc.querySelector<HTMLElement>('.workspace-leaf.mod-active .view-content')?.clientWidth || view.innerWidth;
    mount.style.cssText = `position:fixed;left:0;top:0;width:${width}px;opacity:0;pointer-events:none;z-index:-1;`;
    doc.body.appendChild(mount);
    let specimens: RenderedSpecimen[] = [];
    try {
      const atlas = mount.createDiv({ cls: 'obsidian-ui-atlas-content' });
      specimens = renderCatalogSpecimens(atlas, app);
      const canonical = await captureCatalog(specimens, capturedAt);
      assertSameEnvironment(doc, capturedAt, initial);

      setStage('capture-layout');
      const lab = mount.createDiv({ cls: 'obsidian-ui-layout-lab-content' });
      const fixtures = renderLayoutFixtures(lab.createDiv({ cls: 'obsidian-ui-layout-lab-fixtures' }), app);
      const { layout } = await captureLayoutProbes(fixtures, capturedAt);
      assertSameEnvironment(doc, capturedAt, initial);

      setStage('validate-package');
      const expected = componentRegistry.flatMap((definition) =>
        definition.variants.map((variant) => `${definition.id}/${variant.id}`));
      return buildFigmaPackageZip({ ...canonical, layout }, expected);
    } finally {
      for (const specimen of specimens) specimen.deactivate?.();
      mount.remove();
    }
  });
}
