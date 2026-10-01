import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { SnapshotManifest, TokenEvidenceCapture } from '@obsidian-ui-system/ui-schema';
import { captureTokenEvidence, mergeTokenEvidence, projectLegacyTokens } from '../src/token-evidence';

type Decl = Record<string, string>;
type Rule = { selectorText?: string; style?: ReturnType<typeof style>; cssRules?: ReturnType<typeof rules>; cssText: string; conditionText?: string; type?: number };

function style(values: Decl = {}) {
  const names = Object.keys(values);
  return {
    length: names.length,
    item: (index: number) => names[index] ?? '',
    getPropertyValue: (name: string) => values[name] ?? '',
    getPropertyPriority: () => '',
  };
}
function rules(items: Rule[]) {
  return Object.assign(items, { item: (index: number) => items[index] ?? null });
}
function rule(selectorText: string, values: Decl): Rule {
  return { selectorText, style: style(values), cssText: `${selectorText} {}` };
}
function media(text: string, children: Rule[]): Rule {
  return { type: 4, cssText: `@media ${text} {}`, conditionText: text, cssRules: rules(children) };
}
function manifest(mode: 'light' | 'dark'): SnapshotManifest {
  return {
    schemaVersion: '0.4.0', obsidianVersion: '1.14.3', obsidianSdkVersion: '1.14.3',
    capturedAt: mode, platform: 'macos', theme: null, mode,
  };
}
function capture(
  mode: 'light' | 'dark', items: Rule[], computed: { html?: Decl; body?: Decl } = {},
  unreadable = false,
): TokenEvidenceCapture {
  const html = {
    style: style(), matches: (selector: string) => selector === 'html',
  };
  const body = {
    style: style(),
    matches: (selector: string) => selector === 'body' || selector === `.theme-${mode}`,
  };
  const sheet = { cssRules: rules(items), href: null };
  const blocked = { href: 'blocked.css', get cssRules(): never { throw new Error('SecurityError'); } };
  const doc = {
    documentElement: html, body,
    styleSheets: unreadable ? [sheet, blocked] : [sheet],
    adoptedStyleSheets: [],
    defaultView: {
      matchMedia: (query: string) => ({ matches: query === 'screen' }),
      CSS: { supports: () => true },
      getComputedStyle: (element: unknown) => style(element === body ? computed.body : computed.html),
    },
  };
  return captureTokenEvidence(doc as unknown as Document, manifest(mode));
}

test('dark-only declarations remain absent in light within complete CSSOM coverage', () => {
  const items = [rule('.theme-dark', { '--color-secondary-2': 'red' })];
  const dark = capture('dark', items, { body: { '--color-secondary-2': 'red' } });
  const light = capture('light', items);
  assert.equal(dark.tokens['--color-secondary-2']?.status, 'resolved');
  assert.equal(light.tokens['--color-secondary-2']?.status, 'no-applicable-declaration');
  assert.equal(light.tokens['--color-secondary-2']?.computed.selected, null);
  assert.equal(light.tokens['--color-secondary-2']?.declarations[0]?.selector, '.theme-dark');
});

test('unresolved Dark chain retains declarations and missing names', () => {
  const items = [
    rule('.theme-light', { '--shadow-edges': '0 0 1px red' }),
    media('print', [rule('.theme-dark', { '--shadow-edges': '0 0 1px blue' })]),
    rule('.theme-dark', { '--shadow-xs': '0 1px 2px var(--shadow-edges)' }),
    rule('body', { '--raised-shadow': 'var(--shadow-xs)' }),
  ];
  const dark = capture('dark', items);
  assert.equal(dark.tokens['--shadow-edges']?.status, 'no-applicable-declaration');
  assert.deepEqual(dark.tokens['--shadow-edges']?.declarations[1]?.conditions, [
    { kind: 'media', text: 'print', active: 'no' },
  ]);
  assert.equal(dark.tokens['--shadow-xs']?.status, 'unresolved');
  assert.deepEqual(dark.tokens['--shadow-xs']?.unresolvedReferences, ['--shadow-edges']);
  assert.deepEqual(dark.tokens['--raised-shadow']?.unresolvedReferences, ['--shadow-xs', '--shadow-edges']);
  assert.equal(dark.tokens['--shadow-xs']?.declarations[0]?.references[0]?.name, '--shadow-edges');
});

test('enclosing supports condition remains attached to its declaration', () => {
  const items: Rule[] = [{
    type: 12, cssText: '@supports (color: red) {}', conditionText: '(color: red)',
    cssRules: rules([rule('body', { '--supported': 'red' })]),
  }];
  const evidence = capture('light', items, { body: { '--supported': 'red' } });
  assert.deepEqual(evidence.tokens['--supported']?.declarations[0]?.conditions, [
    { kind: 'supports', text: '(color: red)', active: 'yes' },
  ]);
});

test('direct reference is preserved independently of equal computed values', () => {
  const evidence = capture('dark', [
    rule('body', { '--background-primary': 'black', '--modal-background': 'var(--background-primary)' }),
  ], { body: { '--background-primary': 'black', '--modal-background': 'black' } });
  const modal = evidence.tokens['--modal-background'];
  assert.equal(modal?.attribution.status, 'unique');
  assert.equal(modal?.declarations[0]?.rawValue, 'var(--background-primary)');
  assert.deepEqual(modal?.declarations[0]?.references, [
    { name: '--background-primary', fallback: null, role: 'whole-value' },
  ]);
});

test('competing declarations retain candidates without attributing a winner', () => {
  const evidence = capture('dark', [
    rule('body', { '--a': 'var(--b)' }), rule('.theme-dark', { '--a': 'red' }),
  ], { body: { '--a': 'red' } });
  assert.equal(evidence.tokens['--a']?.status, 'resolved');
  assert.deepEqual(evidence.tokens['--a']?.attribution, { status: 'unknown' });
  assert.equal(evidence.tokens['--a']?.declarations.length, 2);
  assert.equal(evidence.tokens['--a']?.declarations[0]?.references[0]?.name, '--b');
});

test('inaccessible stylesheet gives unknown coverage and absence state', () => {
  const evidence = capture('light', [rule('.theme-dark', { '--only-dark': 'red' })], {}, true);
  assert.equal(evidence.coverage.complete, false);
  assert.equal(evidence.coverage.unreadableSheets[0]?.href, 'blocked.css');
  assert.equal(evidence.tokens['--only-dark']?.status, 'unknown');
});

test('body-first legacy values are derived from separate computed observations', () => {
  const evidence = capture('dark', [rule('html', { '--a': 'red' }), rule('body', { '--b': 'blue' })], {
    html: { '--a': 'red', '--b': 'orange' }, body: { '--a': 'green', '--b': 'blue' },
  });
  assert.deepEqual(evidence.tokens['--a']?.computed, { html: 'red', body: 'green', selected: 'green' });
  assert.deepEqual(projectLegacyTokens(evidence), { scopes: ['html', 'body'], values: { '--a': 'green', '--b': 'blue' } });
});

test('merge keeps one identity and never fills a missing mode', () => {
  const dark = capture('dark', [rule('.theme-dark', { '--dark-only': 'red' })], {
    body: { '--dark-only': 'red' },
  });
  const light = capture('light', [rule('.theme-light', { '--light-only': 'blue' })], {
    body: { '--light-only': 'blue' },
  });
  const merged = mergeTokenEvidence(dark, light);
  assert.deepEqual(Object.keys(merged.tokens['--dark-only'] ?? {}), ['dark']);
  assert.deepEqual(Object.keys(merged.tokens['--light-only'] ?? {}), ['light']);
  assert.equal(merged.sourceEquality, 'unverified');
  assert.throws(() => mergeTokenEvidence(dark, dark), /one light and one dark/);
  const incompatible = structuredClone(light);
  incompatible.environment.platform = 'ios';
  assert.throws(() => mergeTokenEvidence(dark, incompatible), /platform/);
});
