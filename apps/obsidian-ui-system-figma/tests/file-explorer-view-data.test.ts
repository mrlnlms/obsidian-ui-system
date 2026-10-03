import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { readFileExplorerViewModel } from '../src/file-explorer-view-data';

function evidence(): Record<string, any> {
  return JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/file-explorer-view-probe.json'),
    'utf8')) as Record<string, any>;
}

test('reads the current Files excerpt as rows backed by known component depths', () => {
  const model = readFileExplorerViewModel(evidence());
  assert.equal(model.header.actions.length, 5);
  assert.deepEqual(model.body.rows.map((row) => [row.kind, row.depth, row.tag]), [
    ['folder', 0, null], ['folder', 0, null], ['folder', 1, null], ['folder', 2, null],
    ['file', 3, null], ['tagged', 2, 'json'], ['tagged', 2, 'zip'],
    ['file', 0, null], ['file', 0, null],
  ]);
});

test('rejects unsupported depth, changed row anatomy, and unsafe header icon', () => {
  const depth = evidence();
  depth.body.rows[4].depth = 4;
  assert.throws(() => readFileExplorerViewModel(depth), /row 4/);
  const tag = evidence();
  tag.body.rows[5].tag = 'md';
  assert.throws(() => readFileExplorerViewModel(tag), /row 5/);
  const icon = evidence();
  icon.header.actions[0].svg = '<svg onload="alert(1)"></svg>';
  assert.throws(() => readFileExplorerViewModel(icon), /ação 0/);
});
