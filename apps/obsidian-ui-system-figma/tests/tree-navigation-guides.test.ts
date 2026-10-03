import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileExplorerViewModel } from '../src/file-explorer-view-data';
import { treeGuideSegments } from '../src/tree-navigation-guides';
import fixture from './fixtures/file-explorer-view-probe.json';

test('expanded folder containers create only the three observed vertical guides', () => {
  const { body } = readFileExplorerViewModel(fixture);
  const guides = treeGuideSegments(body.rows, body.rowHeight, body.rowGap,
    body.paddingTop, body.paddingX);
  assert.deepEqual(guides.map(({ depth, x }) => [depth, x]),
    [[0, 24], [1, 41], [2, 58]]);
  assert.equal(guides[0]!.y, body.paddingTop + 2 * (body.rowHeight + body.rowGap));
  assert.equal(guides[0]!.height, 5 * body.rowHeight + 4 * body.rowGap);
  assert.equal(guides[2]!.height, body.rowHeight);
  assert.deepEqual(treeGuideSegments([
    { ...body.rows[0]!, state: 'Collapsed' }, body.rows[7]!, body.rows[8]!],
    body.rowHeight, body.rowGap, body.paddingTop, body.paddingX), []);
});
