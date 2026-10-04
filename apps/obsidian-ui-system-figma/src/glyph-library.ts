/** Fixture use identifies a consumer; glyph identity comes from observed SVG geometry. */
import type { BookmarksViewModel } from './bookmarks-view-data';
import type { FileExplorerViewModel } from './file-explorer-view-data';
import type { SearchViewModel } from './search-view-data';
import type { SidePanelModel } from './side-panel-data';
import type { ViewHeaderModel } from './view-header-data';
import type { WorkspaceTabModel } from './workspace-tab-data';

export interface IconSource {
  name: string;
  svg: string;
  color: string;
  glyphName?: string;
}

export interface CanonicalGlyphs {
  glyphs: Array<{ name: string; svg: string; color: string }>;
  byUse: Map<string, string>;
}

/** The already generated kit's fixed SVG evidence; names before the slash are uses. */
export function observedUiKitGlyphSources(models: {
  files: FileExplorerViewModel; bookmarks: BookmarksViewModel; header: ViewHeaderModel;
  search: SearchViewModel; side: SidePanelModel; workspace: WorkspaceTabModel;
}): IconSource[] {
  const { files, bookmarks, header, search, side, workspace } = models;
  const muted = 'rgb(179, 179, 179)';
  const anonymousActionGlyph: Record<string, string> = {
    'Bookmark the active tab...': 'bookmark-plus',
    'Show search filter': 'lucide-search',
  };
  return [
    ...files.header.actions.map((action) => ({ name: `Files / ${action.name}`,
      svg: action.svg, color: action.color })),
    ...side.tabs.map((tab) => ({ name: `Sidedock tab / ${tab.title}`,
      svg: tab.svg, color: muted })),
    ...workspace.variants.filter((variant) => variant.icon).map((variant) => ({
      name: `Workspace tab / ${variant.state}`, svg: variant.icon!.svg, color: muted })),
    { name: 'Workspace tab / Close', svg: workspace.variants[0]!.close!.svg, color: muted },
    { name: 'Search / Disclosure', svg: search.icons.disclosure, color: muted },
    { name: 'Search / More', svg: search.icons.more, color: muted },
    { name: 'Search / Sort', svg: search.icons.sort, color: muted,
      glyphName: 'search-sort' },
    { name: 'Search / Context up', svg: search.icons.contextUp, color: muted },
    { name: 'Search / Context down', svg: search.icons.contextDown, color: muted },
    { name: 'Bookmarks row / Disclosure', svg: bookmarks.icons.group,
      color: muted, glyphName: 'right-triangle' },
    { name: 'Bookmarks row / File', svg: bookmarks.icons.file,
      color: muted, glyphName: 'lucide-file' },
    ...bookmarks.actions.filter((action) => action.svg).map((action) => ({
      name: `Bookmarks / ${action.name}`, svg: action.svg!, color: muted,
      glyphName: anonymousActionGlyph[action.name] })),
    ...[...header.navigation, ...header.actions].map((icon) => ({
      name: `View Header / ${icon.name}`, svg: icon.svgMarkup, color: icon.colorCss })),
    { name: 'Search / Settings', svg: search.icons.settings, color: search.colors.muted },
    { name: 'Search / Match case', svg: search.icons.matchCase, color: search.colors.muted },
    { name: 'Sidedock / Collapse', svg: side.toggleSvg, color: side.toggleIconColor },
  ];
}

/** Ignore only root metadata and display size; retain paths, transforms and strokes. */
export function glyphGeometry(svg: string): string {
  const match = /^<svg\b([^>]*)>([\s\S]*)<\/svg>$/.exec(svg);
  if (!match || !svg.includes('viewBox="0 0 24 24"') || !svg.includes('currentColor') ||
      /<script|<foreignObject|\son\w+=|\shref=|\sxlink:href=/i.test(svg)) {
    throw new Error('Glyph: SVG observado ausente ou inseguro.');
  }
  const attributes = [...match[1]!.matchAll(/([\w:-]+)="([^"]*)"/g)]
    .filter((item) => !['class', 'width', 'height', 'xmlns'].includes(item[1]!))
    .map((item) => `${item[1]}="${item[2]}"`).sort();
  const children = match[2]!.replace(/>\s+</g, '><').trim()
    .replace(/<([a-z][\w:-]*)([^>]*)><\/\1>/g, '<$1$2/>');
  return `<svg ${attributes.join(' ')}>${children}</svg>`;
}

function glyphName(source: IconSource): string {
  const rootClass = /^<svg\b[^>]*\bclass="([^"]+)"/.exec(source.svg)?.[1] ?? '';
  const observed = rootClass.split(/\s+/).find((part) =>
    part.startsWith('lucide-') || ['right-triangle', 'uppercase-lowercase-a',
      'sidebar-toggle-button-icon'].includes(part));
  const name = observed ?? source.glyphName;
  if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
    throw new Error(`Glyph: nome canônico ausente para ${source.name}.`);
  }
  return name;
}

/** Identical observed geometry creates one glyph Component, regardless of actions using it. */
export function canonicalGlyphs(sources: readonly IconSource[]): CanonicalGlyphs {
  const glyphs: CanonicalGlyphs['glyphs'] = [];
  const byUse = new Map<string, string>();
  const byGeometry = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const source of sources) {
    const geometry = glyphGeometry(source.svg);
    if (byUse.has(source.name)) throw new Error(`Glyph: uso duplicado ${source.name}.`);
    let name = byGeometry.get(geometry);
    if (!name) {
      name = glyphName(source);
      if (byName.has(name) && byName.get(name) !== geometry) {
        throw new Error(`Glyph: ${name} identifica geometrias diferentes.`);
      }
      byGeometry.set(geometry, name);
      byName.set(name, geometry);
      glyphs.push({ name, svg: source.svg, color: source.color });
    }
    byUse.set(source.name, name);
  }
  return { glyphs, byUse };
}
