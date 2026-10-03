import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { canonicalGlyphs, glyphGeometry, observedUiKitGlyphSources } from '../src/glyph-library';
import { readBookmarksViewModel } from '../src/bookmarks-view-data';
import { readFileExplorerViewModel } from '../src/file-explorer-view-data';
import { readFolderRowModels } from '../src/folder-row-data';
import { readSearchViewModel } from '../src/search-view-data';
import { readSidePanelModel } from '../src/side-panel-data';
import { readViewHeaderModel } from '../src/view-header-data';
import { readWorkspaceTabModel } from '../src/workspace-tab-data';
import bookmarks from './fixtures/bookmarks-view-probe.json';
import sidePanel from './fixtures/side-panel-probe.json';
import search from './fixtures/search-view-probe.json';
import files from './fixtures/file-explorer-view-probe.json';
import folders from './fixtures/folder-rows-probe.json';
import header from './fixtures/view-header-probe.json';
import workspace from './fixtures/workspace-tab-probe.json';

test('the full generated kit has one canonical glyph per observed geometry', () => {
  const sources = observedUiKitGlyphSources({ files: readFileExplorerViewModel(files),
    bookmarks: readBookmarksViewModel(bookmarks), header: readViewHeaderModel(header),
    search: readSearchViewModel(search), side: readSidePanelModel(sidePanel),
    workspace: readWorkspaceTabModel(workspace) });
  const catalog = canonicalGlyphs(sources);
  assert.equal(catalog.byUse.size, sources.length);
  assert.equal(catalog.glyphs.length, new Set(sources.map((source) =>
    glyphGeometry(source.svg))).size);
  assert.equal(catalog.byUse.get('Bookmarks / Show search filter'),
    catalog.byUse.get('Sidedock tab / Search'));
  assert.equal(catalog.byUse.get('Workspace tab / Inactive'),
    catalog.byUse.get('Sidedock tab / Files'));
  assert.equal(catalog.byUse.get('Search / Disclosure'), 'right-triangle');
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
    'bookmarks-view-generation.ts', 'tree-navigation-row-generation.ts',
    'folder-row-generation.ts']) {
    assert.doesNotMatch(source(name), /createNodeFromSvg\(/, name);
    assert.match(source(name), /createGlyph\(/, name);
  }
  const searchView = source('search-view-generation.ts');
  assert.equal([...searchView.matchAll(/createNodeFromSvg\(/g)].length, 1,
    'only the uncatalogued Search sort chevrons keep their local SVG');
  assert.match(searchView, /'Search \/ More'/);
  assert.match(searchView, /'Search \/ Disclosure'/);
});

test('Folder row disclosure uses the observed shared path and consumer rotation', () => {
  const path = /<path d="([^"]+)"/.exec(search.icons.disclosure)?.[1];
  assert.ok(path);
  const rows = readFolderRowModels(folders);
  assert.ok(rows.every((row) => row.disclosure.path === path));
  assert.deepEqual(new Set(rows.map((row) => row.disclosure.rotationDeg)), new Set([0, -90]));
});
