import assert from 'node:assert/strict';
import test from 'node:test';
import { applicationShellGlyphSources, assertShellAdjacency, assertShellResize,
  assertSidedockProbeLayout, assertLeftSidedockSelection, assertPluginHostedSlotLayout,
  leftSidedockViewChoices,
  readApplicationShellEvidence } from
  '../src/application-shell-generation';
import { canonicalGlyphs, observedUiKitGlyphSources } from '../src/glyph-library';
import { readFileExplorerViewModel } from '../src/file-explorer-view-data';
import { readBookmarksViewModel } from '../src/bookmarks-view-data';
import { readSearchViewModel } from '../src/search-view-data';
import { readWorkspaceTabModel } from '../src/workspace-tab-data';
import { readOutlineViewModel } from '../src/outline-view-data';
import probe from './fixtures/application-shell-probe.json';
import sideProbe from './fixtures/side-panel-probe.json';
import headerProbe from './fixtures/view-header-probe.json';
import filesProbe from './fixtures/file-explorer-view-probe.json';
import bookmarksProbe from './fixtures/bookmarks-view-probe.json';
import searchProbe from './fixtures/search-view-probe.json';
import workspaceProbe from './fixtures/workspace-tab-probe.json';
import outlineProbe from './fixtures/outline-view-probe.json';
import { readSidePanelModel } from '../src/side-panel-data';
import { readViewHeaderModel } from '../src/view-header-data';

test('shell sample uses measured application chrome and canonical host sizes', () => {
  const evidence = readApplicationShellEvidence(probe);
  const side = readSidePanelModel(sideProbe);
  const header = readViewHeaderModel(headerProbe);
  const width = evidence.ribbonWidth + side.width + header.sample.width +
    evidence.rightSampleWidth;
  assert.equal(evidence.ribbonWidth, 44);
  assert.equal(evidence.statusHeight, 27);
  assert.equal(evidence.vaultProfile.height, sideProbe.profile.rect.height);
  assert.equal(evidence.vaultProfile.borderTop, probe.borders.tabHeadersBottom);
  assert.equal(evidence.vaultProfile.actions.length, 2);
  assert.equal(evidence.vaultProfile.switcher.flex, '1 1 auto');
  assert.equal(evidence.vaultProfile.name.textOverflow, 'ellipsis');
  assert.equal(evidence.mainTabs.tabWidth, 200);
  assert.equal(evidence.mainTabs.newTab.width, 24);
  assert.equal(evidence.mainTabs.activeChrome.shoulderSize, 20);
  assert.match(evidence.mainTabs.activeChrome.outline, /rgb\(51, 51, 51\)/);
  assert.doesNotThrow(() => assertShellResize({ shell: width,
    ribbon: evidence.ribbonWidth, left: side.width, main: header.sample.width,
    right: evidence.rightSampleWidth, content: header.sample.width,
    header: header.sample.width }, evidence));
  assert.doesNotThrow(() => assertShellResize({ shell: width + 200,
    ribbon: evidence.ribbonWidth, left: side.width, main: header.sample.width + 200,
    right: evidence.rightSampleWidth, content: header.sample.width + 200,
    header: header.sample.width + 200 }, evidence));
  assert.doesNotThrow(() => assertShellResize({ shell: width + 200,
    ribbon: evidence.ribbonWidth, left: side.minExpandedWidth,
    main: header.sample.width + 200 + side.width - side.minExpandedWidth - 40,
    right: evidence.rightSampleWidth + 40,
    content: header.sample.width + 200 + side.width - side.minExpandedWidth - 40,
    header: header.sample.width + 200 + side.width - side.minExpandedWidth - 40 }, evidence));
  assert.throws(() => assertShellResize({ shell: width + 200,
    ribbon: evidence.ribbonWidth, left: side.minExpandedWidth - 2,
    main: header.sample.width + 200 + side.width - side.minExpandedWidth + 2,
    right: evidence.rightSampleWidth,
    content: header.sample.width + 200 + side.width - side.minExpandedWidth + 2,
    header: header.sample.width + 200 + side.width - side.minExpandedWidth + 2 }, evidence),
  /distribuição horizontal/);
  assert.throws(() => assertShellResize({ shell: width + 200,
    ribbon: evidence.ribbonWidth, left: side.width, main: header.sample.width + 200,
    right: evidence.rightSampleWidth, content: header.sample.width,
    header: header.sample.width + 200 }, evidence), /distribuição horizontal/);
});

test('Ribbon, sidedocks and Main Workspace stay adjacent when a panel grows', () => {
  assert.doesNotThrow(() => assertShellAdjacency(1000, [
    { x: 0, width: 44 }, { x: 44, width: 300 },
    { x: 344, width: 456 }, { x: 800, width: 200 },
  ]));
  assert.throws(() => assertShellAdjacency(1000, [
    { x: 0, width: 44 }, { x: 95, width: 300 },
    { x: 395, width: 405 }, { x: 800, width: 200 },
  ]), /gap entre regiões \(51 px\)/);
});

test('Sidedock probe reflows every visibility combination at two shell widths', () => {
  const ribbon = 44;
  const left = 242;
  const right = 227;
  const status = 300;
  for (const shell of [1100, 1300]) {
    for (let mask = 0; mask < 8; mask += 1) {
      const showRibbon = Boolean(mask & 1);
      const showLeft = Boolean(mask & 2);
      const showRight = Boolean(mask & 4);
      const ribbonWidth = showRibbon ? ribbon : 0;
      const leftWidth = showLeft ? left : 0;
      const rightWidth = showRight ? right : 0;
      const main = shell - ribbonWidth - leftWidth - rightWidth;
      assert.doesNotThrow(() => assertSidedockProbeLayout({ shell,
        ribbon: { visible: showRibbon, x: 0, width: ribbon },
        left: { visible: showLeft, x: ribbonWidth, width: left },
        main: { x: ribbonWidth + leftWidth, width: main,
          header: main, content: main },
        right: { visible: showRight, x: shell - rightWidth, width: right },
        status: { x: shell - status, width: status },
      }), `mask=${mask}, shell=${shell}`);
    }
  }
  assert.doesNotThrow(() => assertSidedockProbeLayout({ shell: status,
    ribbon: { visible: false, x: 0, width: ribbon },
    left: { visible: false, x: ribbon, width: left },
    main: { x: 0, width: status, header: status, content: status },
    right: { visible: false, x: status, width: right },
    status: { x: 0, width: status },
  }));
});

test('Sidedock probe rejects gaps, stale content widths and detached Status Bar', () => {
  const layout = {
    shell: 900,
    ribbon: { visible: false, x: 0, width: 44 },
    left: { visible: true, x: 0, width: 242 },
    main: { x: 242, width: 658, header: 658, content: 658 },
    right: { visible: false, x: 900, width: 227 },
    status: { x: 600, width: 300 },
  };
  assert.doesNotThrow(() => assertSidedockProbeLayout(layout));
  assert.throws(() => assertSidedockProbeLayout({ ...layout,
    main: { ...layout.main, x: 244 } }), /gap entre regiões/);
  assert.throws(() => assertSidedockProbeLayout({ ...layout,
    main: { ...layout.main, content: 656 } }), /reflow horizontal/);
  assert.throws(() => assertSidedockProbeLayout({ ...layout,
    status: { ...layout.status, x: 598 } }), /reflow horizontal/);
});

test('Left Sidedock View pairs each canonical content with its active tab', () => {
  const choices = leftSidedockViewChoices({ filesView: 'File Explorer', filesTab: 'Files',
    searchView: 'Search View', searchTab: 'Search',
    bookmarksView: 'Bookmarks View', bookmarksTab: 'Bookmarks' });
  assert.deepEqual(choices, [
    { name: 'Files', view: 'File Explorer', tab: 'Files' },
    { name: 'Search', view: 'Search View', tab: 'Search' },
    { name: 'Bookmarks', view: 'Bookmarks View', tab: 'Bookmarks' },
  ]);
  assert.deepEqual(readSidePanelModel(sideProbe).tabs.map((tab) => tab.title),
    choices.map((choice) => choice.name));
});

test('Left Sidedock accepts a null nested tab link when its swap and tab state agree', () => {
  const expected = { name: 'Files', viewId: 'view-files', tabId: 'tab-files' };
  const actual = { selection: 'Files', view: 'view-files', tab: 'tab-files',
    hostedType: 'INSTANCE', tabsType: 'INSTANCE', linkedView: 'view-files',
    linkedTab: null, activeTab: 'Files' };
  assert.doesNotThrow(() => assertLeftSidedockSelection(expected, actual));
  assert.throws(() => assertLeftSidedockSelection(expected,
    { ...actual, tab: 'tab-search' }), /não atualizou conteúdo e tab/);
  assert.throws(() => assertLeftSidedockSelection(expected,
    { ...actual, tabsType: null }), /não atualizou conteúdo e tab/);
  assert.throws(() => assertLeftSidedockSelection(expected,
    { ...actual, activeTab: 'Search' }), /não atualizou conteúdo e tab/);
});

test('Plugin Hosted View fills the sidedock and leaves Vault Profile at the bottom', () => {
  for (const width of [200, 242, 320]) {
    for (const height of [420, 600, 740]) {
      const panelHeight = height - 40;
      const layout = { panel: { width, height: panelHeight },
        header: { height: 40 },
        slot: { width, height: panelHeight - 40, y: 40 },
        profile: { y: panelHeight, height: 40 }, sidedock: { height } };
      assert.doesNotThrow(() => assertPluginHostedSlotLayout(layout));
      assert.throws(() => assertPluginHostedSlotLayout({ ...layout,
        slot: { ...layout.slot, height: layout.slot.height - 2 } }),
      /Plugin Slot não acompanha/);
    }
  }
});

test('incomplete chrome probe cannot enter full generation', () => {
  assert.throws(() => readApplicationShellEvidence({ ...probe, statusBar: { height: 27 } }),
    /evidência da Status Bar/);
});

test('Ribbon and right tabs resolve through the shared canonical glyph catalog', () => {
  const evidence = readApplicationShellEvidence(probe);
  const catalog = canonicalGlyphs([
    ...observedUiKitGlyphSources({
      files: readFileExplorerViewModel(filesProbe),
      bookmarks: readBookmarksViewModel(bookmarksProbe),
      header: readViewHeaderModel(headerProbe),
      search: readSearchViewModel(searchProbe),
      side: readSidePanelModel(sideProbe),
      workspace: readWorkspaceTabModel(workspaceProbe),
      outline: readOutlineViewModel(outlineProbe),
    }),
    ...applicationShellGlyphSources(evidence),
  ]);
  assert.equal(evidence.ribbon.actions.length, 7);
  assert.equal(evidence.right.tabs.length, 5);
  assert.equal(evidence.status.items.length, 4);
  for (const action of evidence.ribbon.actions) {
    assert.ok(catalog.byUse.has(`Ribbon / ${action.name}`));
  }
  for (const tab of evidence.right.tabs.slice(0, 4)) {
    assert.ok(catalog.byUse.has(`Right tab / ${tab.name}`));
  }
  assert.equal(catalog.byUse.get('Right tab / All properties'), 'lucide-archive');
  assert.equal(catalog.byUse.get('Status Bar / Editor status'), 'lucide-edit-3');
  assert.equal(catalog.byUse.get('Status Bar / Sync'), 'refresh-cw-off');
  assert.equal(catalog.byUse.get('Vault / Switch'), catalog.byUse.get('Search / Sort'));
  assert.equal(catalog.byUse.get('Vault / Help'), 'help');
  assert.equal(catalog.byUse.get('Vault / Settings'), 'lucide-settings');
  assert.equal(catalog.byUse.get('Main tabs / New tab'), 'lucide-plus');
  assert.equal(catalog.byUse.get('Ribbon / Create new canvas'), 'lucide-layout-dashboard');
  for (const title of ['Files', 'Search', 'Bookmarks']) {
    assert.notEqual(catalog.byUse.get('Ribbon / Create new canvas'),
      catalog.byUse.get(`Sidedock tab / ${title}`));
  }
  assert.equal(catalog.glyphs.find((glyph) => glyph.name === 'lucide-plus')?.color,
    'rgb(179, 179, 179)');
  assert.ok(catalog.glyphs.every((glyph) => glyph.color === 'rgb(179, 179, 179)'),
    'a biblioteca Icon Button importa glyphs no tom canônico antes dos overrides');
});
