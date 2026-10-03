import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyUiKitPaint, readUiKitThemeEvidence } from '../src/ui-kit-theme';
import evidenceJson from './fixtures/ui-kit-theme-probe.json';

const evidence = readUiKitThemeEvidence(evidenceJson);

test('paired Desktop and Package evidence covers the current kit palette', () => {
  assert.deepEqual(evidence.roles.surfacePrimary.dark, { r: 28 / 255, g: 28 / 255, b: 28 / 255 });
  assert.deepEqual(evidence.roles.surfacePrimary.light, { r: 1, g: 1, b: 1 });
  assert.deepEqual(evidence.roles.surfaceSecondary.light,
    { r: 246 / 255, g: 246 / 255, b: 246 / 255 });
  assert.deepEqual(evidence.roles.accentFill.light,
    { r: 152 / 255, g: 115 / 255, b: 247 / 255 });
  assert.deepEqual(evidence.roles.matchHighlight.light,
    { r: 222 / 255, g: 172 / 255, b: 0 });
  assert.equal(evidence.roles.selectedOverlay.opacity, 0.067);
});

test('paint classification preserves semantic fill/stroke and selection transparency', () => {
  const neutral: SolidPaint = { type: 'SOLID', color: evidence.roles.controlFill.dark };
  assert.equal(classifyUiKitPaint(neutral, 'fills', evidence), 'controlFill');
  assert.equal(classifyUiKitPaint(neutral, 'strokes', evidence), 'controlBorder');
  const selected: SolidPaint = { type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 0.067 };
  assert.equal(classifyUiKitPaint(selected, 'fills', evidence), 'selectedOverlay');
  assert.equal(classifyUiKitPaint({ ...selected, opacity: 1 }, 'fills', evidence, 'dark',
    { name: 'Selection background', type: 'RECTANGLE' }), 'selectedOverlay');
  assert.equal(classifyUiKitPaint({ ...selected, opacity: 1 }, 'fills', evidence), undefined);
  assert.equal(classifyUiKitPaint({ ...neutral, visible: false }, 'fills', evidence), undefined);
  assert.equal(classifyUiKitPaint({ ...neutral, boundVariables: {
    color: { type: 'VARIABLE_ALIAS', id: 'existing' } } }, 'fills', evidence), undefined);
  const lightWhite: SolidPaint = { type: 'SOLID', color: { r: 1, g: 1, b: 1 } };
  assert.equal(classifyUiKitPaint(lightWhite, 'fills', evidence, 'light',
    { name: 'Input surface', type: 'RECTANGLE' }), 'formField');
  assert.equal(classifyUiKitPaint(lightWhite, 'fills', evidence, 'light',
    { name: 'Label', type: 'TEXT' }), undefined);
});

test('missing or unobserved values cannot silently create a Light mode', () => {
  const incomplete = structuredClone(evidenceJson) as {
    roles: Record<string, { lightCss: string; opacity?: number }>;
  };
  delete incomplete.roles.accentFill;
  assert.throws(() => readUiKitThemeEvidence(incomplete), /paleta Dark\/Light incompleta/);
  const wrongOpacity = structuredClone(evidenceJson);
  wrongOpacity.roles.selectedOverlay.opacity = 1;
  assert.throws(() => readUiKitThemeEvidence(wrongOpacity), /opacidade/);
});
