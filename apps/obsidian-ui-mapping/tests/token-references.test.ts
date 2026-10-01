import assert from 'node:assert/strict';
import { test } from 'node:test';
import { directAliasName, parseVarReferences } from '../src/token-references';

test('direct var reference and alias are syntactic facts', () => {
  assert.deepEqual(parseVarReferences(' var(--background-primary) '), [
    { name: '--background-primary', fallback: null, role: 'whole-value' },
  ]);
  assert.equal(directAliasName(' var(--background-primary) '), '--background-primary');
  assert.deepEqual(parseVarReferences('var(--a, fallback)'), [
    { name: '--a', fallback: ' fallback', role: 'whole-value' },
  ]);
  assert.equal(directAliasName('var(--a, red)'), null);
});

test('fallback text survives functions and nested references', () => {
  assert.deepEqual(parseVarReferences('var(--a, color-mix(in srgb, var(--b) 40%, blue))'), [
    { name: '--a', fallback: ' color-mix(in srgb, var(--b) 40%, blue)', role: 'whole-value' },
    { name: '--b', fallback: null, role: 'embedded' },
  ]);
  assert.deepEqual(parseVarReferences('1px 2px var(--shadow-edges)'), [
    { name: '--shadow-edges', fallback: null, role: 'embedded' },
  ]);
});

test('quoted text, comments and malformed expressions do not become references', () => {
  assert.deepEqual(parseVarReferences('"var(--fake)" /* var(--also-fake) */ var(--real)'), [
    { name: '--real', fallback: null, role: 'embedded' },
  ]);
  assert.deepEqual(parseVarReferences('var(--broken'), []);
  assert.equal(directAliasName('var(--broken'), null);
});
