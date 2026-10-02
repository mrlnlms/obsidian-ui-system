import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readFileExplorerRowImport } from '../src/file-explorer-row-data';
import { readFileExplorerTaggedRows } from '../src/file-explorer-row-tag-data';
import { fileExplorerBackgroundPaint } from '../src/file-explorer-row-color';

function evidence() {
  return {
    format: 'obsidian-ui-internal-observed-probe', version: 1,
    context: { environment: { mode: 'dark', platform: 'macos' } },
    sourceAttributes: { dataPath: 'README.md', draggable: 'true' },
    labelOffsetPx: { x: 24, y: 4 },
    specimen: {
      id: 'obsidian.file-explorer-row', variant: 'visible-file', origin: 'internal-observed',
      dom: {
        tag: 'div', classes: ['tree-item-self', 'nav-file-title', 'is-active'],
        sizePx: { width: 276, height: 24.890625 },
        styles: { display: 'flex', padding: '4px 8px 4px 24px', borderRadius: '8px',
          background: 'oklch(0.999994 0.0000497986 none / 0.067)' },
        children: [{ tag: 'div', classes: ['tree-item-inner', 'nav-file-title-content'],
          text: 'README', sizePx: { width: 53.09375, height: 16.890625 },
          styles: { color: 'rgb(218, 218, 218)', fontFamily: '"??", ui-sans-serif',
            fontSize: '13px', fontWeight: '400', fontStyle: 'normal', lineHeight: '16.9px',
            letterSpacing: 'normal' },
          children: [] }],
      },
    },
  };
}

test('selects the observed active Dark row without turning scene details into component fields', () => {
  const source = evidence();
  assert.deepEqual(readFileExplorerRowImport(source), {
    variant: 'visible-file', observedState: 'active', mode: 'dark', label: 'README',
    sizePx: { width: 276, height: 24.890625 },
    labelOffsetPx: { x: 24, y: 4 },
    labelSizePx: { width: 53.09375, height: 16.890625 },
    typography: { platform: 'macos', fontFamily: '"??", ui-sans-serif',
      fontSize: 13, fontWeight: 400, fontStyle: 'normal', lineHeight: 16.9 },
    appearance: { padding: { top: 4, right: 8, bottom: 4, left: 24 }, radius: 8,
      backgroundCss: 'oklch(0.999994 0.0000497986 none / 0.067)',
      labelColorCss: 'rgb(218, 218, 218)' },
  });
  source.specimen.dom.children[0]!.text = 'Another file';
  assert.equal(readFileExplorerRowImport(source).label, 'Another file');
  source.labelOffsetPx = { x: 22.5, y: 3.25 };
  assert.deepEqual(readFileExplorerRowImport(source).labelOffsetPx, { x: 22.5, y: 3.25 });
});

test('keeps the observed transparent OKLCH fill as paint opacity', () => {
  const paint = fileExplorerBackgroundPaint('oklch(0.999994 0.0000497986 none / 0.067)');
  assert.equal(paint.type, 'SOLID');
  assert.equal(paint.opacity, 0.067);
  assert.ok(paint.color.r > 0.999 && paint.color.g > 0.999 && paint.color.b > 0.999);
  assert.throws(() => fileExplorerBackgroundPaint('oklch(0.5 0.2 120 / 0.5)'), /não suportado/);
});

test('refuses another origin, mode, state, or anatomy', () => {
  const wrongOrigin = evidence();
  wrongOrigin.specimen.origin = 'public-api';
  assert.throws(() => readFileExplorerRowImport(wrongOrigin), /origem não suportada/);

  const light = evidence();
  light.context.environment.mode = 'light';
  assert.throws(() => readFileExplorerRowImport(light), /somente a aparência Dark/);

  const inactive = evidence();
  inactive.specimen.dom.classes = ['nav-file-title'];
  assert.throws(() => readFileExplorerRowImport(inactive), /raiz ativa/);

  const extraChild = evidence();
  extraChild.specimen.dom.children.push({ ...extraChild.specimen.dom.children[0]!,
    classes: ['nav-file-tag'] });
  assert.throws(() => readFileExplorerRowImport(extraChild), /anatomia da linha/);

  const missingOffset = evidence();
  (missingOffset as { labelOffsetPx?: unknown }).labelOffsetPx = undefined;
  assert.throws(() => readFileExplorerRowImport(missingOffset), /posição observada do label ausente/);
});

function taggedEvidence(): any {
  return JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/file-explorer-tagged-rows-probe.json'), 'utf8'));
}

test('reads the two observed tagged rows without treating sample filenames as tag rules', () => {
  const models = readFileExplorerTaggedRows(taggedEvidence());
  assert.deepEqual(models.map((model) => ({
    variant: model.variant, observedClass: model.observedClass, mode: model.mode,
    tag: model.tag, sample: model.sample,
  })), [
    { variant: 'visible-file-with-tag', observedClass: 'is-unsupported', mode: 'dark',
      tag: 'JSON', sample: { width: 350.359375, height: 24.890625, labelInset: 58,
        rightInset: 8, topInset: 4, bottomInset: 4, observedTagWidth: 35.53125 } },
    { variant: 'visible-file-with-tag', observedClass: 'is-unsupported', mode: 'dark',
      tag: 'ZIP', sample: { width: 350.359375, height: 24.890625, labelInset: 58,
        rightInset: 8, topInset: 4, bottomInset: 4, observedTagWidth: 24.546875 } },
  ]);
  assert.equal(models[0]!.appearance.tagPaddingX, 4);
  assert.equal(models[0]!.appearance.tagColorCss, 'rgb(102, 102, 102)');
  assert.equal(models[0]!.tagTypography.letterSpacing, 0.45);
  assert.equal(models[0]!.tagTypography.fontWeight, 600);
  assert.equal(models[0]!.labelTypography.fontWeight, 400);
  const source = taggedEvidence();
  source.taggedRows[0].specimen.dom.children[0].text = 'Outro nome longo';
  assert.equal(readFileExplorerTaggedRows(source)[0]!.label, 'Outro nome longo');
});

test('tagged reader rejects a missing tag, other origin, or unproved horizontal CSS', () => {
  const withoutTag = taggedEvidence();
  withoutTag.taggedRows[0].specimen.dom.children.pop();
  assert.throws(() => readFileExplorerTaggedRows(withoutTag), /anatomia da row/);
  const otherOrigin = taggedEvidence();
  otherOrigin.taggedRows[0].specimen.origin = 'public-api';
  assert.throws(() => readFileExplorerTaggedRows(otherOrigin), /origem não suportada/);
  const otherCss = taggedEvidence();
  otherCss.taggedRows[0].horizontalCss.label.textOverflow = 'clip';
  assert.throws(() => readFileExplorerTaggedRows(otherCss), /comportamento horizontal/);
});
