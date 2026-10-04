import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { readOutlineViewModel } from '../src/outline-view-data';

const fixture = JSON.parse(readFileSync(join(process.cwd(),
  'tests/fixtures/outline-view-probe.json'), 'utf8'));

test('Outline retains observed hierarchy, active item, wrapping metrics and reusable actions', () => {
  const model = readOutlineViewModel(fixture);
  assert.deepEqual(model.body.rows.map(({ depth, hasChildren, state }) =>
    ({ depth, hasChildren, state })), [
      { depth: 0, hasChildren: true, state: 'Default' },
      { depth: 1, hasChildren: true, state: 'Default' },
      { depth: 2, hasChildren: false, state: 'Default' },
      { depth: 1, hasChildren: false, state: 'Selected' },
    ]);
  assert.equal(model.actions[0]?.reuse, 'Show search filter');
  assert.equal(model.actions[1]?.active, true);
  assert.equal(model.body.labelOffset + 2 * model.body.depthStep, 58);
  assert.ok(model.body.rows[1]!.label.length > 70);
});

test('Outline rejects invented row depths', () => {
  const changed = structuredClone(fixture);
  changed.body.rows[2].depth = 3;
  assert.throws(() => readOutlineViewModel(changed), /linha 2 diverge/);
});
