import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { canonicalGlyphs, glyphGeometry, observedUiKitGlyphSources } from '../src/glyph-library';
import { readBookmarksViewModel } from '../src/bookmarks-view-data';
import { readFileExplorerViewModel } from '../src/file-explorer-view-data';
import { readFolderRowModels } from '../src/folder-row-data';
import { disclosureTransform } from '../src/disclosure-rendering';
import { rebindGlyphTone } from '../src/icon-button-generation';
import { readSearchViewModel } from '../src/search-view-data';
import { readSidePanelModel } from '../src/side-panel-data';
import { readViewHeaderModel } from '../src/view-header-data';
import { readWorkspaceTabModel } from '../src/workspace-tab-data';
import { readOutlineViewModel } from '../src/outline-view-data';
import bookmarks from './fixtures/bookmarks-view-probe.json';
import sidePanel from './fixtures/side-panel-probe.json';
import search from './fixtures/search-view-probe.json';
import files from './fixtures/file-explorer-view-probe.json';
import folders from './fixtures/folder-rows-probe.json';
import header from './fixtures/view-header-probe.json';
import workspace from './fixtures/workspace-tab-probe.json';
import outline from './fixtures/outline-view-probe.json';

test('the full generated kit has one canonical glyph per observed geometry', () => {
  const sources = observedUiKitGlyphSources({ files: readFileExplorerViewModel(files),
    bookmarks: readBookmarksViewModel(bookmarks), header: readViewHeaderModel(header),
    search: readSearchViewModel(search), side: readSidePanelModel(sidePanel),
    workspace: readWorkspaceTabModel(workspace), outline: readOutlineViewModel(outline) });
  const catalog = canonicalGlyphs(sources);
  assert.equal(catalog.byUse.size, sources.length);
  assert.equal(catalog.glyphs.length, new Set(sources.map((source) =>
    glyphGeometry(source.svg))).size);
  assert.equal(catalog.byUse.get('Bookmarks / Show search filter'),
    catalog.byUse.get('Sidedock tab / Search'));
  assert.equal(catalog.byUse.get('Workspace tab / Inactive'),
    catalog.byUse.get('Sidedock tab / Files'));
  assert.equal(catalog.byUse.get('Search / Disclosure'), 'right-triangle');
  assert.equal(catalog.byUse.get('Outline / Disclosure'), 'right-triangle');
  assert.equal(catalog.byUse.get('Outline / Tab'), 'lucide-list');
});

test('observed SVG geometry is shared across unrelated consumer actions', () => {
  const sources = [
    { name: 'Sidedock tab / Search', svg: sidePanel.tabs[1]!.icon.svg,
      color: 'rgb(179, 179, 179)' },
    { name: 'Bookmarks / Show search filter', svg: bookmarks.header.actions[3]!.svg!,
      color: 'rgb(179, 179, 179)', glyphName: 'lucide-search' },
    { name: 'Search / Disclosure', svg: search.icons.disclosure,
      color: 'rgb(179, 179, 179)' },
    { name: 'Bookmarks row / Disclosure', svg: bookmarks.body.icons.group,
      color: 'rgb(179, 179, 179)', glyphName: 'right-triangle' },
  ];
  const catalog = canonicalGlyphs(sources);
  assert.equal(catalog.glyphs.length, 2);
  assert.equal(catalog.byUse.get(sources[0]!.name), catalog.byUse.get(sources[1]!.name));
  assert.equal(catalog.byUse.get(sources[2]!.name), catalog.byUse.get(sources[3]!.name));
  assert.equal(catalog.glyphs[0]!.svg, sidePanel.tabs[1]!.icon.svg);
});

test('different observed paths keep distinct glyph identities', () => {
  const sources = files.header.actions.slice(0, 2).map((action) => ({
    name: action.name, svg: action.svg, color: action.color,
  }));
  const catalog = canonicalGlyphs(sources);
  assert.equal(catalog.glyphs.length, 2);
  assert.notEqual(catalog.byUse.get(sources[0]!.name), catalog.byUse.get(sources[1]!.name));
  assert.notEqual(glyphGeometry(sources[0]!.svg), glyphGeometry(sources[1]!.svg));
  const altered = { ...sources[0]!, name: 'Altered path',
    svg: sources[0]!.svg.replace('d="', 'd="M0 0 ') };
  assert.throws(() => canonicalGlyphs([sources[0]!, altered]),
    /identifica geometrias diferentes/);
});

test('fixed glyph consumers do not recreate the catalogued SVG locally', () => {
  const source = (name: string): string => readFileSync(
    join(__dirname, '../apps/obsidian-ui-system-figma/src', name), 'utf8');
  for (const name of ['workspace-tab-generation.ts', 'side-panel-generation.ts',
    'bookmarks-view-generation.ts', 'outline-view-generation.ts', 'tree-navigation-row-generation.ts',
    'folder-row-generation.ts']) {
    assert.doesNotMatch(source(name), /createNodeFromSvg\(/, name);
    assert.match(source(name), /createGlyph\(/, name);
  }
  const searchView = source('search-view-generation.ts');
  assert.equal([...searchView.matchAll(/createNodeFromSvg\(/g)].length, 0,
    'Search sort and context chevrons now consume observed canonical glyphs');
  assert.match(searchView, /'Search \/ More'/);
  assert.match(searchView, /'Search \/ Disclosure'/);
  assert.match(searchView, /'Search \/ Sort'/);
  assert.match(searchView, /'Search \/ Context up'/);
});

test('Folder row disclosure uses the observed shared path and consumer rotation', () => {
  const path = /<path d="([^"]+)"/.exec(search.icons.disclosure)?.[1];
  assert.ok(path);
  const rows = readFolderRowModels(folders);
  assert.ok(rows.every((row) => row.disclosure.path === path));
  assert.deepEqual(new Set(rows.map((row) => row.disclosure.rotationDeg)), new Set([0, -90]));
  const open = disclosureTransform(7, 7.4375, 10, 0);
  const closed = disclosureTransform(7, 7.4375, 10, -90);
  assert.deepEqual(open, [[1, 0, 7], [0, 1, 7.4375]]);
  assert.deepEqual(closed, [[0, 1, 7], [-1, 0, 17.4375]]);
  const place = (point: [number, number]): [number, number] => [
    closed[0][0] * point[0] + closed[0][1] * point[1] + closed[0][2],
    closed[1][0] * point[0] + closed[1][1] * point[1] + closed[1][2],
  ];
  const [left, tip, right] = [[3, 8], [12, 17], [21, 8]]
    .map(([x, y]) => place([x * 10 / 24, y * 10 / 24]));
  assert.ok(tip![0] > left![0] && tip![0] > right![0],
    'collapsed chevron points right');
  assert.ok(Math.abs(tip![1] - (left![1] + right![1]) / 2) < 0.001,
    'collapsed chevron remains centered');
});

test('Faint glyph tone replaces an inherited Variable binding after RGB normalization', () => {
  const original = globalThis.figma;
  globalThis.figma = { variables: { setBoundVariableForPaint(paint: SolidPaint,
    _field: string, variable: Variable) {
    return { ...paint, boundVariables: { color: { type: 'VARIABLE_ALIAS', id: variable.id } } };
  } } } as unknown as typeof figma;
  try {
    const source = { id: 'icon-muted' } as Variable;
    const faint = { id: 'disclosure-faint' } as Variable;
    const vector = { strokes: [
      { type: 'SOLID', color: { r: 0, g: 0, b: 0 },
        boundVariables: { color: { type: 'VARIABLE_ALIAS', id: source.id } } },
      { type: 'SOLID', color: { r: 1, g: 1, b: 1 }, visible: false },
    ] } as unknown as VectorNode;
    const instance = { findAll: () => [vector] } as unknown as InstanceNode;
    assert.equal(rebindGlyphTone(instance, source, faint,
      { r: 179 / 255, g: 179 / 255, b: 179 / 255 }), 1);
    assert.equal((vector.strokes[0] as SolidPaint).boundVariables?.color?.id, faint.id);
    assert.equal((vector.strokes[1] as SolidPaint).visible, false);
    vector.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
    (vector as VectorNode & { boundVariables: unknown }).boundVariables = {
      strokes: [[{ type: 'VARIABLE_ALIAS', id: source.id }]],
    };
    assert.equal(rebindGlyphTone(instance, source, faint,
      { r: 179 / 255, g: 179 / 255, b: 179 / 255 }), 1);
    assert.equal((vector.strokes[0] as SolidPaint).boundVariables?.color?.id, faint.id);
  } finally { globalThis.figma = original; }
});
