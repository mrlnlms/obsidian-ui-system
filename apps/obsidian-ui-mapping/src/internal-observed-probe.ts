import type { App } from 'obsidian';
import type { ComponentSnapshot } from '@obsidian-ui-system/ui-schema';
import { assertCaptureContextStable, readCaptureContext } from './capture-context';
import { FIGMA_PACKAGE_ROOT, ensureDirectory } from './export-paths';
import { captureElement, captureManifest } from './snapshot';

const ROOT = FIGMA_PACKAGE_ROOT;

const patterns = [
  { name: 'File Explorer file row', where: 'Files sidebar', selector: '.workspace-leaf-content[data-type="file-explorer"] .nav-file-title' },
  { name: 'File Explorer folder row', where: 'Files sidebar', selector: '.workspace-leaf-content[data-type="file-explorer"] .nav-folder-title' },
  { name: 'Workspace tab', where: 'Pane tab strip', selector: '.workspace-tab-header' },
  { name: 'Pane header', where: 'Top of a workspace pane', selector: '.view-header' },
  { name: 'Properties row', where: 'Note properties', selector: '.metadata-property' },
  { name: 'Breadcrumb', where: 'Note pane header', selector: '.view-header-breadcrumb' },
  { name: 'Search result row', where: 'Search sidebar', selector: '.search-result-file-match' },
  { name: 'Command palette row', where: 'Command palette overlay', selector: '.prompt .suggestion-item' },
  { name: 'Ribbon action', where: 'Left ribbon', selector: '.side-dock-ribbon-action' },
  { name: 'Status bar item', where: 'Bottom status bar', selector: '.status-bar-item' },
] as const;

function visible(element: Element): boolean {
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return !!style && style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
}

function shape(element: Element) {
  return {
    tag: element.tagName.toLowerCase(),
    classes: Array.from(element.classList),
    children: Array.from(element.children).slice(0, 8).map((child) => ({
      tag: child.tagName.toLowerCase(), classes: Array.from(child.classList),
    })),
  };
}

/** One live-DOM inventory and one read-only File Explorer row specimen. */
export async function exportInternalObservedProbe(app: App): Promise<string> {
  const doc = activeWindow.document;
  const capturedAt = new Date().toISOString();
  const manifest = captureManifest(doc, capturedAt);
  const before = await readCaptureContext(app.vault.adapter, app.vault.configDir, doc, manifest, 'mapping');
  const inventory = patterns.map(({ name, where, selector }) => {
    const matches = Array.from(doc.querySelectorAll(selector));
    const displayed = matches.filter(visible);
    return {
      name, where, selector, count: matches.length, visibleCount: displayed.length,
      ...(displayed[0] ? { sample: shape(displayed[0]) } : {}),
      stateSignals: [...new Set(displayed.flatMap((element) => [
        ...Array.from(element.classList).filter((value) => value.startsWith('is-') || value.startsWith('mod-')),
        ...['aria-selected', 'aria-expanded'].flatMap((name) => element.hasAttribute(name)
          ? [`${name}=${element.getAttribute(name)}`] : []),
      ]))].sort(),
    };
  });
  const row = Array.from(doc.querySelectorAll('.workspace-leaf-content[data-type="file-explorer"] .nav-file-title'))
    .find((element) => visible(element) && element.classList.contains('is-active') &&
      !element.classList.contains('is-unsupported'));
  const label = row?.querySelector(':scope > .nav-file-title-content');
  if (row && !label) throw new Error('File Explorer row ativa sem .nav-file-title-content.');
  const rowRect = row?.getBoundingClientRect();
  const labelRect = label?.getBoundingClientRect();
  const labelOffsetPx = rowRect && labelRect
    ? { x: labelRect.left - rowRect.left, y: labelRect.top - rowRect.top } : null;
  const specimen: ComponentSnapshot | null = row ? {
    id: 'obsidian.file-explorer-row', name: 'File Explorer file row', category: 'Navigation',
    origin: 'internal-observed', implementation: 'Obsidian core DOM: .nav-file-title',
    variant: 'visible-file', dom: captureElement(row),
  } : null;
  const workspaceViewTypes = [...new Set(Array.from(doc.querySelectorAll('.workspace-leaf-content[data-type]'))
    .map((element) => element.getAttribute('data-type')).filter((value): value is string => !!value))].sort();
  const after = await readCaptureContext(app.vault.adapter, app.vault.configDir, doc, manifest, 'mapping');
  assertCaptureContextStable(before, after);

  await ensureDirectory(app.vault.adapter, ROOT);
  const baseName = capturedAt.replace(/[:.]/g, '-');
  let path = `${ROOT}/internal-observed-probe-${baseName}.json`;
  for (let suffix = 2; await app.vault.adapter.exists(path); suffix++) {
    path = `${ROOT}/internal-observed-probe-${baseName}-${suffix}.json`;
  }
  await app.vault.adapter.write(path, JSON.stringify({
    format: 'obsidian-ui-internal-observed-probe', version: 1, capturedAt,
    context: before, workspaceViewTypes, inventory,
    sourceAttributes: row ? { dataPath: row.getAttribute('data-path'), draggable: row.getAttribute('draggable') } : null,
    labelOffsetPx,
    specimen,
  }, null, 2) + '\n');
  return path;
}
