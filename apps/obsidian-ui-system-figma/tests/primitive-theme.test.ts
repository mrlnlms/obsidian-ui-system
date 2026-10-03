import assert from 'node:assert/strict';
import test from 'node:test';
import fixture from './fixtures/primitive-theme-probe.json';
import { observedGlyphPaint, readPrimitiveThemeEvidence } from '../src/primitive-theme';
import { readTreeRowEvidence } from '../src/tree-navigation-row-data';
import folderProbe from './fixtures/folder-rows-probe.json';
import activeProbe from './fixtures/file-explorer-active-row-probe.json';
import taggedProbe from './fixtures/file-explorer-tagged-rows-probe.json';
import filesProbe from './fixtures/file-explorer-view-probe.json';

test('two observed modes share geometry but change primitive visual colors', () => {
  const { dark, light } = readPrimitiveThemeEvidence(fixture);
  assert.deepEqual(dark.radii, { mediumRadius: 8, metadataRadius: 4 });
  assert.deepEqual(light.radii, dark.radii);
  assert.equal(dark.selectedOpacity, 0.067);
  assert.equal(light.selectedOpacity, dark.selectedOpacity);
  assert.equal(dark.mutedOpacity, 0.85);
  assert.equal(light.mutedOpacity, dark.mutedOpacity);
  assert.deepEqual(dark.colors.icon, { r: 179 / 255, g: 179 / 255, b: 179 / 255 });
  assert.deepEqual(light.colors.icon, { r: 92 / 255, g: 92 / 255, b: 92 / 255 });
  assert.ok(dark.colors.rowSelectedBackground.r > 0.99);
  assert.deepEqual(light.colors.rowSelectedBackground, { r: 0, g: 0, b: 0 });
  assert.notDeepEqual(dark.colors.rowSelectedText, light.colors.rowSelectedText);
  assert.notDeepEqual(dark.colors.disclosure, light.colors.disclosure);
});

test('missing Light evidence is rejected instead of inventing a mode', () => {
  assert.throws(() => readPrimitiveThemeEvidence({ ...fixture, modes: { dark: fixture.modes.dark } }),
    /Dark\/Light ausentes/);
});

test('the new Dark values preserve the previously validated row appearance', () => {
  const { folders, active, tagged, files } = readTreeRowEvidence(folderProbe, activeProbe,
    taggedProbe, filesProbe);
  const dark = fixture.modes.dark;
  assert.equal(dark.rowDefaultTextCss, files.body.defaultColor);
  assert.equal(dark.rowSelectedTextCss, active.appearance.labelColorCss);
  assert.equal(dark.rowSelectedBackgroundCss, active.appearance.backgroundCss);
  assert.equal(dark.rowRadiusCss, `${active.appearance.radius}px`);
  assert.equal(dark.disclosureColorCss, folders[0]!.appearance.disclosureColorCss);
  assert.equal(dark.metadataColorCss, tagged[0]!.appearance.tagColorCss);
  assert.equal(dark.metadataRadiusCss, `${tagged[0]!.appearance.tagRadius}px`);
});

test('SVG binding selects only visible paints with the observed glyph color', () => {
  const color = readPrimitiveThemeEvidence(fixture).dark.colors.icon;
  const glyph: SolidPaint = { type: 'SOLID', color };
  assert.equal(observedGlyphPaint(glyph, color), true);
  assert.equal(observedGlyphPaint({ ...glyph, visible: false }, color), false);
  assert.equal(observedGlyphPaint({ ...glyph, opacity: 0 }, color), false);
  assert.equal(observedGlyphPaint({ ...glyph, color: { r: 1, g: 1, b: 1 } }, color), false);
});
