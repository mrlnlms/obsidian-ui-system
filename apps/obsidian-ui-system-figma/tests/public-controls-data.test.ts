import assert from 'node:assert/strict';
import test from 'node:test';
import { readPublicControlsEvidence } from '../src/public-controls-generation';
import fixture from './fixtures/public-toggle-tooltip-probe.json';

test('public Toggle and visible Tooltip retain their captured anatomy', () => {
  const evidence = readPublicControlsEvidence(fixture);
  assert.deepEqual(evidence.toggle, {
    width: 36, height: 16, thumbWidth: 20, thumbHeight: 12,
    thumbInset: 2, radius: 24,
  });
  assert.equal(evidence.tooltip.sampleText, 'Show more context');
  assert.equal(evidence.tooltip.lineHeight, 16.9);
});

test('an incompatible public control fixture stops before Figma generation', () => {
  const changed = structuredClone(fixture);
  changed.toggle.thumbWidth = 18;
  assert.throws(() => readPublicControlsEvidence(changed), /anatomia observada divergente/);
});
