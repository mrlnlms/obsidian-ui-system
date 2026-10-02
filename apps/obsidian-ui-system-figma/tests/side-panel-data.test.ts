import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { readSidePanelModel } from '../src/side-panel-data';

function evidence(): any {
  return JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/side-panel-probe.json'), 'utf8'));
}

test('reads the observed Dark left Sidedock with three tabs', () => {
  const model = readSidePanelModel(evidence());
  assert.equal(model.width, 242.296875);
  assert.equal(model.headerHeight, 40);
  assert.equal(model.tabLeft, 44);
  assert.equal(model.tabGap, 3);
  assert.equal(model.minExpandedWidth, 200);
  assert.equal(model.toggleIconSize, 16);
  assert.equal(model.toggleIconOpacity, 0.85);
  assert.deepEqual(model.tabs.map((tab) => `${tab.title}/${tab.active}`),
    ['Files/true', 'Search/false', 'Bookmarks/false']);
  assert.equal(model.height, 880.109375);
});

test('rejects an unobserved theme, missing tab and unsafe icon', () => {
  const theme = evidence();
  theme.mode = 'Light';
  assert.throws(() => readSidePanelModel(theme), /Left \/ Dark/);
  const tabs = evidence();
  tabs.tabs.pop();
  assert.throws(() => readSidePanelModel(tabs), /três tabs/);
  const svg = evidence();
  svg.tabs[1].icon.svg = '<svg onload="alert(1)"></svg>';
  assert.throws(() => readSidePanelModel(svg), /SVG observado/);
});
