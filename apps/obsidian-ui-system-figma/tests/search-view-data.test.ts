import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { readSearchViewModel } from '../src/search-view-data';

function evidence(): any {
  return JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/search-view-probe.json'), 'utf8'));
}

test('reads the observed query controls and file-grouped results', () => {
  const model = readSearchViewModel(evidence());
  assert.equal(model.width, 200);
  assert.equal(model.query, 'probe');
  assert.equal(model.resultCount, '4 results');
  assert.equal(model.geometry.resultsInfoHeight, 33);
  assert.deepEqual(model.groups.map((group) => [group.title, group.collapsed, group.matches.length]), [
    ['Properties probe', false, 2], ['README', false, 2],
  ]);
  assert.ok(model.groups[1]!.matches[0]!.height > model.groups[0]!.matches[0]!.height);
  assert.ok(model.groups[1]!.matches[0]!.expandedText!.length >
    model.groups[1]!.matches[0]!.text.length);
  assert.match(model.icons.sort, /m7 15 5 5 5-5/);
  assert.match(model.icons.contextUp, /lucide-chevron-up/);
  assert.match(model.icons.contextDown, /lucide-chevron-down/);
});

test('rejects a different theme, missing file group and unsafe SVG', () => {
  const theme = evidence();
  theme.mode = 'Light';
  assert.throws(() => readSearchViewModel(theme), /Dark v1/);
  const missing = evidence();
  missing.groups.pop();
  assert.throws(() => readSearchViewModel(missing), /dois grupos/);
  const unsafe = evidence();
  unsafe.icons.settings = '<svg viewBox="0 0 24 24" onload="alert(1)"></svg>';
  assert.throws(() => readSearchViewModel(unsafe), /SVG settings/);
});
