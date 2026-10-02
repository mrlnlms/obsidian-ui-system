import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { readWorkspaceTabModel } from '../src/workspace-tab-data';

function evidence(): any {
  return JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/workspace-tab-probe.json'), 'utf8'));
}

test('reads the four observed main and sidedock appearances', () => {
  const model = readWorkspaceTabModel(evidence());
  assert.deepEqual(model.variants.map((item) => `${item.context}/${item.state}`),
    ['Main/Active', 'Main/Inactive', 'Sidedock/Active', 'Sidedock/Inactive']);
  assert.equal(model.variants[0]!.size.height, 34);
  assert.equal(model.variants[0]!.close?.width, 20);
  assert.equal(model.variants[2]!.size.width, 28);
  assert.equal(model.variants[2]!.icon?.width, 16);
  assert.equal(model.variants[0]!.label.right, 29);
  assert.equal(model.variants[1]!.close, undefined);
});

test('rejects unsupported state, sizing and injected SVG', () => {
  const state = evidence();
  state.samples['main-active'].active = false;
  assert.throws(() => readWorkspaceTabModel(state), /estrutura ou estado/);
  const sizing = evidence();
  sizing.samples['main-active'].root.css.flex = '0 0 auto';
  assert.throws(() => readWorkspaceTabModel(sizing), /sizing ou anatomia/);
  const svg = evidence();
  svg.samples['sidedock-inactive'].iconSvg.svg = '<svg onload="alert(1)"></svg>';
  assert.throws(() => readWorkspaceTabModel(svg), /SVG observado/);
});
