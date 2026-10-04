import assert from 'node:assert/strict';
import test from 'node:test';
import { assertOutlineLayout, outlineHierarchy,
  type OutlineLayoutRow } from '../src/outline-view-layout';
import { readOutlineViewModel } from '../src/outline-view-data';
import fixture from './fixtures/outline-view-probe.json';

const rows: OutlineLayoutRow[] = [
  { y: 4, height: 24.9, labelHeight: 16.9, labelLength: 6 },
  { y: 30.9, height: 92.5, labelHeight: 84.5, labelLength: 102 },
  { y: 125.4, height: 92.5, labelHeight: 84.5, labelLength: 92 },
  { y: 219.9, height: 24.9, labelHeight: 16.9, labelLength: 5 },
];

test('Outline rows grow with wrapped labels and keep the observed gap', () => {
  assert.doesNotThrow(() => assertOutlineLayout(rows, 2, 16.9, 226.9));
});

test('Outline rejects the Figma overlap visible when instances retain a one-line height', () => {
  const broken = structuredClone(rows);
  broken[1]!.height = 24.9;
  broken[2]!.y = 57.8;
  assert.throws(() => assertOutlineLayout(broken, 2, 16.9, 200),
    /linhas não acompanham o texto/);
});

test('Outline rejects a long label whose text bounds never grow', () => {
  const broken = structuredClone(rows);
  broken[1]!.labelHeight = 16.9;
  assert.throws(() => assertOutlineLayout(broken, 2, 16.9, 242),
    /linhas não acompanham o texto/);
});

test('Outline children containers own the two shared guides and follow their wrapped rows', () => {
  const { body } = readOutlineViewModel(fixture);
  const roots = outlineHierarchy(body.rows);
  assert.equal(roots.length, 1);
  assert.equal(roots[0]!.children.length, 2);
  assert.equal(roots[0]!.children[0]!.children.length, 1);
  assert.equal(roots[0]!.children[1]!.children.length, 0);
});
