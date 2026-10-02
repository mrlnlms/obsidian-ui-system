import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { readFolderRowModels } from '../src/folder-row-data';

function evidence(): any {
  return JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/folder-rows-probe.json'), 'utf8'));
}

test('normalizes only the observed Dark states and depths, preserving explicit offsets', () => {
  const models = readFolderRowModels(evidence());
  assert.equal(models.length, 6);
  assert.deepEqual(models.map((model) => [model.depth, model.state, model.sample.disclosureOffset.x,
    model.sample.labelOffset.x, model.disclosure.rotationDeg]), [
    [0, 'Expanded', 4, 24, 0], [0, 'Collapsed', 4, 24, -90],
    [1, 'Expanded', 21, 41, 0], [1, 'Collapsed', 21, 41, -90],
    [2, 'Expanded', 38, 58, 0], [2, 'Collapsed', 38, 58, -90],
  ]);
  assert.equal(models[0]!.sample.height, 24.890625);
  assert.equal(models[0]!.sample.rightInset, 8);
  assert.equal(models[0]!.disclosure.path, 'M3 8L12 17L21 8');
  assert.equal(models[0]!.typography.fontSize, 13);
  assert.equal(models[0]!.appearance.disclosureColorCss, 'rgb(102, 102, 102)');
  const changed = evidence();
  changed.folderRows[0].specimen.dom.children[1].text = 'Outro nome';
  assert.equal(readFolderRowModels(changed)[0]!.label, 'Outro nome');
});

test('rejects unsupported depth, anatomy, state evidence and overflow', () => {
  const depth = evidence();
  depth.folderRows[0].depth = 3;
  assert.throws(() => readFolderRowModels(depth), /depth não suportado/);
  const anatomy = evidence();
  anatomy.folderRows[0].specimen.dom.children[0].children = [];
  assert.throws(() => readFolderRowModels(anatomy), /disclosure\/label não suportados/);
  const state = evidence();
  state.folderRows[0].disclosure.transform = 'none';
  assert.throws(() => readFolderRowModels(state), /rotação observada divergiu/);
  const css = evidence();
  css.folderRows[0].horizontalCss.textOverflow = 'clip';
  assert.throws(() => readFolderRowModels(css), /comportamento horizontal não suportado/);
  const origin = evidence();
  origin.folderRows[0].specimen.origin = 'public-api';
  assert.throws(() => readFolderRowModels(origin), /identidade, origem ou variante não suportada/);
});
