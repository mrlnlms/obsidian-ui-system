import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { readFigmaPackage } from '../src/package-data';
import { confirmationActions, publicApiVariants, publicDomFind, publicDomText,
  publicSpecimen, readPublicApiEvidence } from '../src/public-api-batch-data';
import { hasExposableChildren } from '../src/public-api-batch-generation';

const fixture = join(process.cwd(),
  'tests/fixtures/obsidian-ui-package-2026-10-01T12-12-18-735Z.zip');
const input = readFigmaPackage(new Uint8Array(readFileSync(fixture))).components;

test('the closed public inventory has one captured specimen for every observed variant', () => {
  const evidence = readPublicApiEvidence(input);
  const total = Object.values(publicApiVariants).reduce((sum, variants) =>
    sum + variants.length, 0);
  assert.equal(evidence.size, total);
  assert.equal(Object.keys(publicApiVariants).length, 26);
  assert.ok(publicSpecimen(evidence, 'obsidian.setting', 'error').dom.sizePx.width > 0);
  assert.equal(publicSpecimen(evidence, 'obsidian.popover-suggest', 'empty-shell')
    .dom.sizePx.width, 14);
  const group = publicSpecimen(evidence, 'obsidian.setting-group', 'with-search').dom;
  assert.ok(publicDomFind(group, 'setting-group-search'));
  assert.ok(publicDomText(group).length > 0);
});

test('confirmation actions distinguish the checkbox from the two footer buttons', () => {
  const evidence = readPublicApiEvidence(input);
  const standard = confirmationActions(publicSpecimen(evidence,
    'obsidian.confirmation-modal', 'standard').dom);
  const withCheckbox = confirmationActions(publicSpecimen(evidence,
    'obsidian.confirmation-modal', 'with-checkbox').dom);
  assert.deepEqual(standard, { confirm: 'Confirm', cancel: 'Cancel',
    checkbox: undefined, gap: 8 });
  assert.deepEqual(withCheckbox, { confirm: 'Confirm', cancel: 'Cancel',
    checkbox: 'Remember example choice', gap: 8 });
});

test('incomplete or duplicate public specimens fail before node generation', () => {
  const rows = input as Array<{ id: string; variant: string }>;
  assert.throws(() => readPublicApiEvidence(rows.filter((row) =>
    !(row.id === 'obsidian.menu' && row.variant === 'checked'))),
  /obsidian.menu\/checked/);
  assert.throws(() => readPublicApiEvidence([...rows, rows[0]]), /duplicado/);
});

test('bare Toggle and Glyph instances are not exposed as component properties', () => {
  const children = (items: unknown[]) => items as SceneNode[];
  assert.equal(hasExposableChildren(children([{ type: 'RECTANGLE' }])), false);
  assert.equal(hasExposableChildren(children([{ type: 'INSTANCE', isExposedInstance: false }])), false);
  assert.equal(hasExposableChildren(children([{
    type: 'TEXT', componentPropertyReferences: { characters: 'Label#1' },
  }])), true);
  assert.equal(hasExposableChildren(children([{ type: 'INSTANCE', isExposedInstance: true }])), true);
});
