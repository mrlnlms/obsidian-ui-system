import assert from 'node:assert/strict';
import test from 'node:test';
import { inferLayout } from './layout-inference';
import { resolveLayoutProbes, type LayoutProbeSuite } from './layout-probes';
import type { LayoutObservation } from './layout-capture';
import type { ComponentDefinition } from './component-registry';

function observation(
  id: string, variant: string, content: string, hostWidth: number,
  rootWidth: number, rootHeight: number, textWidth?: number,
): LayoutObservation {
  return {
    id, variant, contentContext: { id: content }, state: 'enabled',
    host: {
      id: String(hostWidth), requestedWidthPx: hostWidth,
      rect: { x: 0, y: 0, width: hostWidth, height: 100 },
      boxMetrics: { clientWidth: hostWidth, scrollWidth: Math.ceil(Math.max(hostWidth, rootWidth)), clientHeight: 100, scrollHeight: 100 },
      styles: {},
    },
    root: {
      kind: 'element', tag: 'button', classes: [], rect: { x: 0, y: 0, width: rootWidth, height: rootHeight },
      relativeToParent: null,
      boxMetrics: { clientWidth: Math.floor(rootWidth), scrollWidth: Math.ceil(rootWidth), clientHeight: rootHeight, scrollHeight: rootHeight },
      styles: {
        display: 'inline-flex', 'flex-direction': 'row', 'padding-top': '4px', 'padding-right': '12px',
        'padding-bottom': '4px', 'padding-left': '12px', gap: 'normal', 'white-space': 'nowrap', overflow: 'visible',
      },
      children: textWidth === undefined ? [] : [{
        kind: 'text', text: content, rect: { x: 12, y: 7, width: textWidth, height: 16 }, relativeToParent: null,
      }],
    },
  } as unknown as LayoutObservation;
}

test('general rule recovers Button hug, fixed height and constrained overhang', () => {
  const rows: LayoutObservation[] = [];
  for (const [context, root, textWidth] of [
    ['baseline', 118.48, 94.48], ['short-content', 42.45, 18.45], ['long-content', 256.14, 232.14],
  ] as const) {
    for (const host of [160, 240, 480]) rows.push(observation('obsidian.button', 'normal', context, host, root, 30, textWidth));
  }
  const [result] = inferLayout(rows);
  assert.equal(result?.horizontal.mode, 'hug');
  assert.equal(result.horizontal.confidence, 'high');
  assert.equal(result.vertical.mode, 'fixed');
  assert.equal(result.vertical.observedPx, 30);
  assert.equal(result.intermediateModel.layoutDirection, 'row');
  assert.equal(result.intermediateModel.padding.left, '12px');
  assert.equal(result.children[0]?.horizontal.mode, 'hug');
  assert.ok(result.contextDependencies.some((item) => item.includes('overflows')));
  assert.equal(result.horizontal.probes.length, 9);
});

test('host tracking gives fill without a component-specific rule', () => {
  const rows = [160, 240, 480].map((host) => observation('obsidian.search', 'empty', 'baseline', host, host, 30));
  const [result] = inferLayout(rows);
  assert.equal(result?.horizontal.mode, 'fill');
  assert.equal(result.horizontal.confidence, 'high');
  assert.equal(result.vertical.mode, 'fixed');
  assert.equal(result.vertical.confidence, 'medium');
});

test('child sizing is independent from the root sizing claim', () => {
  const rows = [160, 240, 480].map((host) => {
    const row = observation('obsidian.slider', 'middle', 'baseline', host, host, 19.5);
    row.root.children.push({
      kind: 'element', tag: 'input', classes: [], rect: { x: 0, y: 0, width: 100, height: 4 },
      relativeToParent: null, boxMetrics: { clientWidth: 100, scrollWidth: 100, clientHeight: 4, scrollHeight: 4 },
      styles: row.root.styles, children: [],
    });
    return row;
  });
  const [result] = inferLayout(rows);
  assert.equal(result?.horizontal.mode, 'fill');
  assert.equal(result.children[0]?.horizontal.mode, 'unknown');
  assert.ok(result.unknowns.some((item) => item.includes('child sizing')));
});

test('stable width without content change remains unknown', () => {
  const rows = [160, 240, 480].map((host) => observation('obsidian.dropdown', 'default', 'baseline', host, 150, 30));
  assert.equal(inferLayout(rows)[0]?.horizontal.mode, 'unknown');
});

test('content change with stable root width supports fixed, and variants remain separate', () => {
  const rows = [
    ...[160, 480].flatMap((host) => [
      observation('example', 'normal', 'baseline', host, 150, 30, 80),
      observation('example', 'normal', 'short-content', host, 150, 30, 20),
    ]),
    ...[160, 480].map((host) => observation('example', 'disabled', 'baseline', host, host, 30)),
  ];
  const results = inferLayout(rows);
  assert.equal(results.find((item) => item.variant === 'normal')?.horizontal.mode, 'fixed');
  assert.equal(results.find((item) => item.variant === 'disabled')?.horizontal.mode, 'fill');
});

test('missing width variation does not create a sizing claim', () => {
  const [result] = inferLayout([observation('example', 'normal', 'baseline', 240, 100, 30)]);
  assert.equal(result?.horizontal.mode, 'unknown');
  assert.equal(result.vertical.mode, 'unknown');
});

test('Setting root fills hosts while height stays unresolved', () => {
  const rows = [
    observation('obsidian.setting', 'standard', 'baseline', 160, 160, 116.56),
    observation('obsidian.setting', 'standard', 'baseline', 240, 240, 116.56),
    observation('obsidian.setting', 'standard', 'baseline', 480, 480, 68.48),
  ];
  const [result] = inferLayout(rows);
  assert.equal(result?.horizontal.mode, 'fill');
  assert.equal(result.horizontal.confidence, 'high');
  assert.equal(result.vertical.mode, 'unknown');
});

test('declarative specimen selection resolves variants, hosts and content', () => {
  const definition: ComponentDefinition = {
    id: 'example', name: 'Example', category: 'Test', source: 'public-api',
    implementation: 'example', supportsLayoutContentProbe: true,
    variants: [
      { id: 'normal', name: 'Normal', state: 'enabled' },
      { id: 'selected', name: 'Selected', state: 'selected' },
    ],
    render: () => { throw new Error('The resolver must not render specimens'); },
  };
  const suite: LayoutProbeSuite = {
    defaultHosts: [{ id: 'default', widthPx: 240 }],
    defaultContents: [{ id: 'default-content', text: 'Atlas' }],
    specimens: [{
      id: 'example', variants: ['selected'],
      hosts: [{ id: 'small', widthPx: 160 }, { id: 'large', widthPx: 480 }],
      contents: [{ id: 'short', text: 'OK' }],
    }],
  };
  const cases = resolveLayoutProbes([definition], suite);
  assert.deepEqual(cases.map((item) => [item.variant.id, item.content.id, item.host.widthPx]), [
    ['selected', 'baseline', 160], ['selected', 'baseline', 480],
    ['selected', 'short', 160], ['selected', 'short', 480],
  ]);
});
