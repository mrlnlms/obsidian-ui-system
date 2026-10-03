import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { readBookmarksViewModel } from '../src/bookmarks-view-data';

const fixture = JSON.parse(readFileSync(join(process.cwd(),
  'tests/fixtures/bookmarks-view-probe.json'), 'utf8'));

test('Bookmarks keeps the observed header, hierarchy and multiline row', () => {
  const model = readBookmarksViewModel(fixture);
  assert.equal(model.actions.length, 4);
  assert.equal(model.actions[1]?.reuse, 'New folder');
  assert.equal(model.actions[2]?.reuse, 'Collapse all');
  assert.deepEqual(model.rows.map(({ kind, depth, state }) => ({ kind, depth, state })), [
    { kind: 'Group', depth: 0, state: 'Default' },
    { kind: 'File', depth: 1, state: 'Selected' },
    { kind: 'File', depth: 0, state: 'Default' },
  ]);
  assert.ok(model.rows[2]!.height > model.rows[0]!.height);
});

test('Bookmarks rejects a row beyond the observed state', () => {
  const changed = structuredClone(fixture);
  changed.body.rows[1].depth = 2;
  assert.throws(() => readBookmarksViewModel(changed), /linha 1 diverge/);
});
