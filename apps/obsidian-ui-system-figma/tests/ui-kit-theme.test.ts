import assert from 'node:assert/strict';
import test from 'node:test';
import { assertPrimitiveRoleAliases, bindUiKitTheme, boundUiKitPaint, classifyUiKitPaint,
  readUiKitThemeEvidence, type UiKitThemeVariables } from '../src/ui-kit-theme';
import { uiKitColorRoles } from '../src/appearance-contract';
import { assertSelectedOverlayConsumers } from '../src/ui-kit-theme-validation';
import evidenceJson from './fixtures/ui-kit-theme-probe.json';
import primitiveJson from './fixtures/primitive-theme-probe.json';
import { readPrimitiveThemeEvidence } from '../src/primitive-theme';

const evidence = readUiKitThemeEvidence(evidenceJson);

test('primitive roles alias the same observed Dark/Light source values', () => {
  const primitive = readPrimitiveThemeEvidence(primitiveJson);
  assert.doesNotThrow(() => assertPrimitiveRoleAliases(primitive, evidence));
  const divergent = structuredClone(primitive);
  divergent.light.colors.metadata = { r: 1, g: 0, b: 0 };
  assert.throws(() => assertPrimitiveRoleAliases(divergent, evidence),
    /metadata e textFaint divergem em light/);
});

test('explicit paint binding keeps equal RGB roles distinct', () => {
  const original = globalThis.figma;
  const calls: string[] = [];
  globalThis.figma = { variables: { setBoundVariableForPaint(paint: SolidPaint,
    _field: string, variable: { id: string }) {
    calls.push(variable.id);
    return { ...paint, boundVariables: { color: { type: 'VARIABLE_ALIAS', id: variable.id } } };
  } } } as unknown as typeof figma;
  try {
    const equalRgb = structuredClone(evidence);
    equalRgb.roles.formField.dark = equalRgb.roles.surfacePrimary.dark;
    const theme = { evidence: equalRgb, colors: {
      surfacePrimary: { id: 'surface' }, formField: { id: 'input' },
    } } as unknown as UiKitThemeVariables;
    const surface = boundUiKitPaint(theme, 'surfacePrimary');
    const input = boundUiKitPaint(theme, 'formField');
    assert.deepEqual(calls, ['surface', 'input']);
    assert.deepEqual(surface.color, input.color);
    assert.notDeepEqual(surface.boundVariables, input.boundVariables);
  } finally { globalThis.figma = original; }
});

test('theme validation sees explicit glyph overrides nested in instances', () => {
  const original = globalThis.figma;
  globalThis.figma = { mixed: Symbol('mixed') } as unknown as typeof figma;
  try {
    const colors = Object.fromEntries(uiKitColorRoles.map((role) =>
      [role, { id: role }])) as unknown as UiKitThemeVariables['colors'];
    const theme = { colors, evidence } as UiKitThemeVariables;
    const paint = (role: string): SolidPaint => ({ type: 'SOLID', color: { r: 0, g: 0, b: 0 },
      boundVariables: { color: { type: 'VARIABLE_ALIAS', id: role } } });
    const plain = uiKitColorRoles.filter((role) => role !== 'iconActive' && role !== 'sortIcon')
      .map((role) => ({ type: 'RECTANGLE', name: role, fills: [paint(role)], strokes: [] }));
    const active = { type: 'VECTOR', name: 'Aa shape', fills: [paint('iconActive')], strokes: [] };
    const sort = { type: 'VECTOR', name: 'Sort shape', fills: [{ type: 'SOLID',
      color: { r: 0, g: 0, b: 0 } }], strokes: [], boundVariables: {
      fills: [{ type: 'VARIABLE_ALIAS', id: 'sortIcon' }] } };
    const root = { type: 'FRAME', name: 'Generated Search', children: [...plain,
      { type: 'INSTANCE', name: 'Match case', children: [active] },
      { type: 'INSTANCE', name: 'Sort', children: [sort] }] } as unknown as SceneNode;
    const before = JSON.stringify(root);
    const bindings = bindUiKitTheme([root], theme, () => 'dark');
    assert.deepEqual(new Set(bindings.map((binding) => binding.role)),
      new Set(uiKitColorRoles));
    assert.equal(bindings.find((binding) => binding.role === 'iconActive')?.consumer.name,
      'Aa shape');
    assert.equal(bindings.find((binding) => binding.role === 'sortIcon')?.consumer.name,
      'Sort shape');
    assert.equal(JSON.stringify(root), before);
  } finally { globalThis.figma = original; }
});

test('selection and compact Search hover share an overlay without losing geometry', () => {
  const overlay = (name: string, width: number, parentWidth: number,
    opacity = 0.067) => ({ role: 'selectedOverlay', root: {} as SceneNode,
      consumer: { type: 'RECTANGLE', name, width, opacity,
        parent: { type: 'COMPONENT', name: 'State=Hover', width: parentWidth } } }) as
      Parameters<typeof assertSelectedOverlayConsumers>[0][number];
  const bindings = [overlay('Selection background', 200, 200),
    overlay('Selection background', 242, 242),
    overlay('State background', 24, 24), overlay('State background', 28, 28)];
  assert.doesNotThrow(() => assertSelectedOverlayConsumers(bindings, 0.067));
  assert.throws(() => assertSelectedOverlayConsumers([
    ...bindings.slice(0, 3), overlay('State background', 27, 28)], 0.067),
  /seleção\/hover divergente/);
  assert.throws(() => assertSelectedOverlayConsumers([
    ...bindings.slice(0, 3), overlay('State background', 28, 28, 1)], 0.067),
  /seleção\/hover divergente/);
});

test('paired Desktop and Package evidence covers the current kit palette', () => {
  assert.deepEqual(evidence.roles.surfacePrimary.dark, { r: 28 / 255, g: 28 / 255, b: 28 / 255 });
  assert.deepEqual(evidence.roles.surfacePrimary.light, { r: 1, g: 1, b: 1 });
  assert.deepEqual(evidence.roles.surfaceSecondary.light,
    { r: 246 / 255, g: 246 / 255, b: 246 / 255 });
  assert.deepEqual(evidence.roles.accentFill.light,
    { r: 152 / 255, g: 115 / 255, b: 247 / 255 });
  assert.deepEqual(evidence.roles.matchHighlight.light,
    { r: 222 / 255, g: 172 / 255, b: 0 });
  assert.equal(evidence.roles.matchHighlight.opacity, 0.3);
  assert.equal(evidence.roles.selectedOverlay.opacity, 0.067);
  assert.deepEqual(evidence.roles.textError.dark,
    { r: 251 / 255, g: 70 / 255, b: 76 / 255 });
  assert.deepEqual(evidence.roles.textError.light,
    { r: 233 / 255, g: 49 / 255, b: 71 / 255 });
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
  wrongOpacity.roles.selectedOverlay.opacity = 0.067;
  wrongOpacity.roles.matchHighlight.opacity = 1;
  assert.throws(() => readUiKitThemeEvidence(wrongOpacity), /opacidade/);
});
