import assert from 'node:assert/strict';
import test from 'node:test';
import { bindingDiagnosticCases, diagnoseBinding } from '../src/binding-diagnostic';

class FakeStyle {
  values = new Map<string, { value: string; priority: string }>();
  get length(): number { return this.values.size; }
  item(index: number): string { return [...this.values.keys()][index] ?? ''; }
  getPropertyValue(name: string): string { return this.values.get(name)?.value ?? ''; }
  getPropertyPriority(name: string): string { return this.values.get(name)?.priority ?? ''; }
  setProperty(name: string, value: string, priority = ''): void { this.values.set(name, { value, priority }); }
  removeProperty(name: string): void { this.values.delete(name); }
}

class FakeElement {
  style = new FakeStyle();
  isConnected = true;
  tagName: string;
  classList: string[];
  ownerDocument!: ReturnType<typeof fixture>['doc'];
  constructor(tagName: string, classes: string[] = []) { this.tagName = tagName; this.classList = classes; }
  matches(selector: string): boolean { return selector === this.tagName.toLowerCase() || selector === `.${this.classList[0]}`; }
  querySelector(selector: string): FakeElement | null { return selector === 'input' ? (this as FakeElement & { input?: FakeElement }).input ?? null : null; }
}

(globalThis as { HTMLElement?: typeof FakeElement }).HTMLElement = FakeElement;
(globalThis as { CSSRule?: { IMPORT_RULE: number } }).CSSRule = { IMPORT_RULE: 3 };

function fixture(options: {
  property?: 'border-radius' | 'background-color'; token?: string; cssValue?: string;
  original?: string; ruleSelector?: string; unreadable?: boolean; follows?: boolean;
  competingToken?: string; activeToken?: string;
} = {}) {
  const property = options.property ?? 'background-color';
  const token = options.token ?? '--interactive-normal';
  const original = options.original ?? 'rgb(51, 51, 51)';
  const target = new FakeElement('BUTTON');
  const sheetStyle = new FakeStyle();
  sheetStyle.setProperty(property, options.cssValue ?? `var(${token})`);
  const rule = { selectorText: options.ruleSelector ?? 'button', style: sheetStyle };
  const otherStyle = new FakeStyle();
  if (options.competingToken) otherStyle.setProperty(property, `var(${options.competingToken})`);
  const rules = [rule, ...(options.competingToken ? [{ selectorText: 'button', style: otherStyle }] : [])];
  const sheet = options.unreadable ? { href: null, get cssRules(): never { throw new Error('blocked'); } }
    : { href: 'app://obsidian.md/app.css', cssRules: { length: rules.length, item: (index: number) => rules[index] ?? null } };
  const doc = {
    styleSheets: [sheet], adoptedStyleSheets: [],
    defaultView: { getComputedStyle: (element: FakeElement) => ({ getPropertyValue: (name: string) => {
      if (name !== property) return '';
      return options.follows === false ? original : element.style.getPropertyValue(options.activeToken ?? token) || original;
    } }) },
  };
  target.ownerDocument = doc;
  const specimen = { root: target, definition: { id: 'obsidian.button' }, variant: { id: 'normal' } };
  return { doc, target, specimen };
}

function run(setup: ReturnType<typeof fixture>, overrides: Record<string, string> = {}) {
  return diagnoseBinding(setup.specimen as never, { ...bindingDiagnosticCases[1]!, ...overrides } as never);
}

test('direct CSSOM reference and causal witness confirm the first token and restore inline state', () => {
  const setup = fixture();
  setup.target.style.setProperty('--interactive-normal', 'rgb(51, 51, 51)', 'important');
  const result = run(setup);
  assert.equal(result.status, 'confirmed');
  assert.equal(result.candidates[0]?.selector, 'button');
  assert.equal(result.candidates[0]?.references[0]?.name, '--interactive-normal');
  assert.equal(result.verification?.stimulated, 'rgb(1, 253, 97)');
  assert.equal(result.verification?.restoredExactly, true);
  assert.equal(setup.target.style.getPropertyValue('--interactive-normal'), 'rgb(51, 51, 51)');
  assert.equal(setup.target.style.getPropertyPriority('--interactive-normal'), 'important');
});

test('same computed value alone never confirms a token', () => {
  const setup = fixture({ cssValue: 'rgb(51, 51, 51)' });
  const result = run(setup);
  assert.equal(result.status, 'unknown');
  assert.equal(result.verification, null);
});

test('a direct candidate that does not affect the property is rejected', () => {
  const setup = fixture({ follows: false });
  const result = run(setup);
  assert.equal(result.status, 'rejected');
  assert.equal(result.verification?.restoredExactly, true);
  assert.equal(setup.target.style.getPropertyValue('--interactive-normal'), '');
});

test('inaccessible stylesheet leaves attribution unknown even if a witness could otherwise match', () => {
  const setup = fixture({ unreadable: true });
  const result = run(setup);
  assert.equal(result.status, 'unknown');
  assert.equal(result.unreadableSheets.length, 1);
});

test('dimension witness confirms border radius without retaining the override', () => {
  const setup = fixture({ property: 'border-radius', token: '--button-radius', original: '8px' });
  const result = run(setup, { property: 'border-radius', token: '--button-radius', witness: '37px' });
  assert.equal(result.status, 'confirmed');
  assert.equal(result.verification?.stimulated, '37px');
  assert.equal(result.verification?.restored, '8px');
});

test('an originally empty inline custom property remains declared after the probe', () => {
  const setup = fixture();
  setup.target.style.setProperty('--interactive-normal', '');
  const result = run(setup);
  assert.equal(result.verification?.restoredExactly, true);
  assert.equal(setup.target.style.length, 1);
  assert.equal(setup.target.style.item(0), '--interactive-normal');
});

test('competing direct rule is probed separately and does not become a false first-hop binding', () => {
  const setup = fixture({ competingToken: '--interactive-accent', activeToken: '--interactive-accent' });
  const result = run(setup);
  assert.equal(result.status, 'rejected');
  assert.equal(result.competingProbes[0]?.token, '--interactive-accent');
  assert.equal(result.competingProbes[0]?.matchedWitness, true);
  assert.equal(result.competingProbes[0]?.restoredExactly, true);
});

test('CTA-like winning token is confirmed while the generic competitor has no effect', () => {
  const setup = fixture({ token: '--interactive-normal', competingToken: '--interactive-accent', activeToken: '--interactive-accent' });
  const result = run(setup, { token: '--interactive-accent', witness: 'rgb(251, 37, 9)' });
  assert.equal(result.status, 'confirmed');
  assert.equal(result.competingProbes[0]?.token, '--interactive-normal');
  assert.equal(result.competingProbes[0]?.matchedWitness, false);
  assert.equal(result.competingProbes[0]?.restoredExactly, true);
});
