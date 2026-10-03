import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { readTreeRowEvidence } from '../src/tree-navigation-row-data';

function fixture(name: string): any {
  return JSON.parse(readFileSync(join(process.cwd(), `tests/fixtures/${name}.json`), 'utf8'));
}

test('Folder, File and tagged File share the bounded Dark row contract', () => {
  const data = readTreeRowEvidence(fixture('folder-rows-probe'),
    fixture('file-explorer-active-row-probe'), fixture('file-explorer-tagged-rows-probe'),
    fixture('file-explorer-view-probe'));
  assert.equal(data.folders.length, 6);
  assert.deepEqual(data.tagged.map((row) => row.tag), ['JSON', 'ZIP']);
  assert.equal(data.active.labelOffsetPx.x, 24);
  assert.equal(data.files.body.rowHeight, 24.890625);
});

test('rejects a source row whose measured height no longer matches the shared anatomy', () => {
  const active = fixture('file-explorer-active-row-probe');
  active.specimen.dom.sizePx.height = 30;
  assert.throws(() => readTreeRowEvidence(fixture('folder-rows-probe'), active,
    fixture('file-explorer-tagged-rows-probe'), fixture('file-explorer-view-probe')),
  /anatomia observada diverge/);
});
