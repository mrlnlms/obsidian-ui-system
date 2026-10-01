import assert from 'node:assert/strict';
import test from 'node:test';
import { readSearchImport } from '../src/search-data';

const stack = '"??", ui-sans-serif, -apple-system, system-ui';
const searchSvg = 'url("data:image/svg+xml,<svg viewBox=%220 0 24 24%22><circle fill=%22currentColor%22/></svg>")';
const clearSvg = 'url("data:image/svg+xml,<svg viewBox=%220 0 12 12%22><path fill=%22currentColor%22/></svg>")';

function evidence(): { components: unknown[]; layout: Record<string, unknown> } {
  const variants = ['empty', 'filled'] as const;
  const components = variants.map((variant) => ({
    id: 'obsidian.search', variant, origin: 'public-api', dom: {
      tag: 'div', classes: ['search-input-container'], sizePx: { height: 30 },
      styles: { background: 'rgba(0, 0, 0, 0)' },
      children: [{
        tag: 'input', attributes: { type: 'search', placeholder: 'Search example' },
        properties: { value: variant === 'empty' ? '' : 'Mapping query' },
        styles: {
          padding: variant === 'empty' ? '4px 8px 4px 30px' : '4px 28px 4px 30px',
          background: 'rgb(46, 46, 46)', border: '1px solid rgb(51, 51, 51)', borderRadius: '100px',
          color: 'rgb(218, 218, 218)', opacity: '1', fontFamily: stack, fontSize: '13px',
          fontWeight: '400', fontStyle: 'normal', lineHeight: 'normal', letterSpacing: 'normal',
        },
      }, {
        tag: 'div', classes: ['search-input-clear-button'],
        styles: { display: variant === 'empty' ? 'none' : 'flex', color: 'rgb(179, 179, 179)' },
      }],
    },
  }));
  const observations = variants.flatMap((variant) =>
    ['baseline', 'short-content', 'long-content'].flatMap((context) =>
      [160, 240].map((width) => ({
        id: 'obsidian.search', variant,
        state: variant,
        contentContext: { id: context, ...(context === 'baseline' ? {} :
          { text: context === 'short-content' ? 'OK' : 'A longer label for layout measurement' }) },
        host: { requestedWidthPx: width, rect: { width } },
        root: {
          rect: { width, height: 30 },
          styles: { display: 'block', position: 'relative', 'background-color': 'rgba(0, 0, 0, 0)' },
          pseudo: { '::before': { styles: {
            position: 'absolute', left: '8px', top: '7px', width: '16px', height: '16px',
            'background-color': 'rgb(179, 179, 179)', 'mask-image': searchSvg,
          } } },
          children: [{
            tag: 'input', position: 'static', attributes: { type: 'search' },
            properties: { value: variant === 'empty' ? '' :
              context === 'baseline' ? 'Mapping query' :
                context === 'short-content' ? 'OK' : 'A longer label for layout measurement' },
            relativeToParent: { x: 0, y: 0, width, height: 30 },
            styles: {
              position: 'static', 'box-sizing': 'border-box',
              padding: variant === 'empty' ? '4px 8px 4px 30px' : '4px 28px 4px 30px',
              'background-color': 'rgb(46, 46, 46)', color: 'rgb(218, 218, 218)',
              'font-family': stack, 'font-size': '13px', 'font-weight': '400', 'font-style': 'normal',
              'line-height': 'normal', 'letter-spacing': 'normal',
            },
            pseudo: { '::placeholder': {
              content: variant === 'empty' && context !== 'baseline' ?
                (context === 'short-content' ? 'OK' : 'A longer label for layout measurement') : 'Search example',
              styles: { color: 'rgb(218, 218, 218)', opacity: '1', 'font-family': stack,
                'font-size': '13px', 'font-weight': '400', 'font-style': 'normal',
                'line-height': 'normal', 'letter-spacing': 'normal' },
            } },
          }, {
            tag: 'div', classes: ['search-input-clear-button'],
            relativeToParent: variant === 'empty' ? null : { x: width - 30, y: 0, width: 28, height: 30 },
            styles: { display: variant === 'empty' ? 'none' : 'flex', position: 'absolute',
              right: '2px', top: '0px', width: '28px', height: '30px',
              'align-items': 'center', 'justify-content': 'center', color: 'rgb(179, 179, 179)' },
            pseudo: { '::after': { styles: { width: '13px', height: '13px',
              'background-color': 'rgb(179, 179, 179)', 'mask-image': clearSvg } } },
          }],
        },
      }))));
  const inferences = variants.map((variant) => ({
    id: 'obsidian.search', variant,
    horizontal: { mode: 'fill', confidence: 'high', evidence: ['Root tracks host'], probes: ['160', '240'] },
    vertical: { mode: 'fixed', confidence: 'high', observedPx: 30, probes: ['160', '240'] },
    children: [{ path: '0', tag: 'input', horizontal: {
      mode: 'fill', confidence: 'medium', evidence: ['Input tracks parent'] } }],
    intermediateModel: { horizontalSizing: 'fill', verticalSizing: 'fixed', heightPx: 30, layoutDirection: null },
  }));
  return { components, layout: { experimentalFormat: 'mapping-layout-probes-2',
    environment: { platform: 'macos' }, observations, inferences } };
}

test('builds two positioned Search models from observed host and pseudo evidence', () => {
  const { components, layout } = evidence();
  const models = readSearchImport(components, layout);
  assert.deepEqual(models.map((item) => [item.state, item.rootSizing.mode, item.widthForCanvas,
    item.height, item.icons.clear.visible]), [
    ['Empty', 'fill', 240, 30, false], ['Filled', 'fill', 240, 30, true],
  ]);
  assert.equal(models[0]?.input.padding.right, 8);
  assert.equal(models[1]?.input.padding.right, 28);
  assert.equal(models[0]?.icons.search.svg.includes('<circle'), true);
  assert.equal(models[1]?.icons.clear.svg.includes('<path'), true);
});

test('refuses missing placeholder CSSOM or inconsistent clear position', () => {
  const source = evidence();
  const observations = source.layout.observations as Array<Record<string, unknown>>;
  const firstRoot = observations[0]?.root as Record<string, unknown>;
  const firstInput = (firstRoot.children as Array<Record<string, unknown>>)[0]!;
  delete firstInput.pseudo;
  assert.throws(() => readSearchImport(source.components, source.layout), /::placeholder ausente/);

  const moved = evidence();
  const filled = (moved.layout.observations as Array<Record<string, unknown>>).find((row) => row.variant === 'filled')!;
  const clear = ((filled.root as Record<string, unknown>).children as Array<Record<string, unknown>>)[1]!;
  (clear.relativeToParent as Record<string, unknown>).x = 0;
  assert.throws(() => readSearchImport(moved.components, moved.layout), /posição do clear diverge/);
});
