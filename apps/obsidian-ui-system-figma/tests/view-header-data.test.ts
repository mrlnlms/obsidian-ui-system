import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { readViewHeaderModel } from '../src/view-header-data';

function evidence(): any {
  return JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/view-header-probe.json'), 'utf8'));
}

test('reads the visible Markdown header as one shared frame with content slots', () => {
  const model = readViewHeaderModel(evidence());
  assert.equal(model.sample.width, 491.21875);
  assert.equal(model.sample.height, 38.046875);
  assert.equal(model.titleArea.width, 339.21875);
  assert.equal(model.title.text, 'teste');
  assert.deepEqual(model.breadcrumbs.map((part) => part.text),
    ['obsidian-ui-exports', '/', 'figma-packages', '/', 'pasta fechada', '/']);
  assert.equal(model.navigation.length, 2);
  assert.equal(model.actions.length, 2);
  assert.equal(model.navigation[1]!.disabled, true);
  assert.equal(model.appearance.backgroundCss, 'rgb(28, 28, 28)');
});

test('rejects a hidden source, altered layout, or SVG without observed geometry', () => {
  const hidden = evidence();
  hidden.header.css.display = 'none';
  assert.throws(() => readViewHeaderModel(hidden), /layout observado/);
  const layout = evidence();
  layout.titleContainer.css.flex = '0 0 auto';
  assert.throws(() => readViewHeaderModel(layout), /layout observado/);
  const icon = evidence();
  icon.actionButtons[0].svg.markup = '<svg onload="alert(1)"></svg>';
  assert.throws(() => readViewHeaderModel(icon), /ícone observado/);
  const priority = evidence();
  priority.title.css.flex = '0 1 auto';
  assert.throws(() => readViewHeaderModel(priority), /layout observado/);
  const ancestor = evidence();
  ancestor.titleParts[0].css.textOverflow = 'clip';
  assert.throws(() => readViewHeaderModel(ancestor), /prioridade horizontal/);
});
