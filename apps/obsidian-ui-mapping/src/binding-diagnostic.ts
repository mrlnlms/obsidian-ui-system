import type { RenderedSpecimen } from './component-registry';
import { parseVarReferences } from './token-references';

type Truth = 'yes' | 'no' | 'unknown';
type Status = 'confirmed' | 'rejected' | 'unknown';
type DiagnosticCase = {
  specimen: string; variant: string; target: string; property: 'border-radius' | 'background-color';
  token: string; witness: string;
};

export const bindingDiagnosticCases: readonly DiagnosticCase[] = [
  { specimen: 'obsidian.button', variant: 'normal', target: 'root', property: 'border-radius', token: '--button-radius', witness: '37px' },
  { specimen: 'obsidian.button', variant: 'normal', target: 'root', property: 'background-color', token: '--interactive-normal', witness: 'rgb(1, 253, 97)' },
  { specimen: 'obsidian.button', variant: 'cta', target: 'root', property: 'background-color', token: '--interactive-accent', witness: 'rgb(251, 37, 9)' },
  { specimen: 'obsidian.search', variant: 'empty', target: 'input', property: 'background-color', token: '--background-modifier-form-field', witness: 'rgb(1, 253, 97)' },
];

interface Condition { kind: string; text: string; active: Truth }
interface Candidate {
  property: string; rawValue: string; priority: string; selector: string | null;
  source: { kind: 'stylesheet' | 'adopted-stylesheet' | 'inline'; sheetIndex?: number; href?: string | null; rulePath?: number[] };
  conditions: Condition[]; applicable: Truth;
  references: ReturnType<typeof parseVarReferences>;
}

function ruleCondition(rule: CSSRule, view: Window): Condition | null {
  const text = (rule as CSSConditionRule).conditionText;
  if (typeof text !== 'string') return null;
  const css = rule.cssText.trimStart();
  const kind = css.startsWith('@media') ? 'media' : css.startsWith('@supports') ? 'supports' : 'condition';
  try {
    if (kind === 'media') return { kind, text, active: view.matchMedia(text).matches ? 'yes' : 'no' };
    const supports = (view as Window & { CSS?: { supports?: (condition: string) => boolean } }).CSS?.supports;
    if (kind === 'supports' && supports) return { kind, text, active: supports(text) ? 'yes' : 'no' };
  } catch { /* Unrecognized condition stays unknown. */ }
  return { kind, text, active: 'unknown' };
}

function collectCandidates(element: HTMLElement, property: DiagnosticCase['property']): {
  candidates: Candidate[]; unreadableSheets: { kind: string; sheetIndex: number; href: string | null }[];
} {
  const doc = element.ownerDocument;
  const view = doc.defaultView;
  if (!view) throw new Error('Specimen has no window');
  const candidates: Candidate[] = [];
  const unreadableSheets: { kind: string; sheetIndex: number; href: string | null }[] = [];
  const wanted = property === 'background-color' ? ['background-color', 'background'] : ['border-radius'];
  const add = (style: CSSStyleDeclaration, selector: string | null, source: Candidate['source'], conditions: Condition[]) => {
    let applicable: Truth = 'yes';
    if (conditions.some(({ active }) => active === 'no')) applicable = 'no';
    else if (selector !== null) {
      try { if (!element.matches(selector)) applicable = 'no'; }
      catch { applicable = 'unknown'; }
    }
    if (applicable === 'yes' && conditions.some(({ active }) => active === 'unknown')) applicable = 'unknown';
    if (applicable === 'no') return;
    for (const name of wanted) {
      const rawValue = style.getPropertyValue(name);
      if (!rawValue) continue;
      candidates.push({ property: name, rawValue, priority: style.getPropertyPriority(name), selector,
        source, conditions: [...conditions], applicable, references: parseVarReferences(rawValue) });
    }
  };
  const visiting = new Set<CSSStyleSheet>();
  const visitSheet = (sheet: CSSStyleSheet, source: Candidate['source'], conditions: Condition[] = []) => {
    if (visiting.has(sheet)) return;
    visiting.add(sheet);
    try { visitRules(sheet.cssRules, source, conditions, source.rulePath ?? []); }
    catch { unreadableSheets.push({ kind: source.kind, sheetIndex: source.sheetIndex ?? -1, href: source.href ?? null }); }
    finally { visiting.delete(sheet); }
  };
  const visitRules = (rules: CSSRuleList, source: Candidate['source'], conditions: Condition[], path: number[]) => {
    for (let index = 0; index < rules.length; index++) {
      const rule = rules.item(index);
      if (!rule) continue;
      const rulePath = [...path, index];
      const selector = (rule as CSSStyleRule).selectorText;
      if (typeof selector === 'string' && (rule as CSSStyleRule).style) {
        add((rule as CSSStyleRule).style, selector, { ...source, rulePath }, conditions);
      }
      if (rule.type === CSSRule.IMPORT_RULE) {
        const imported = (rule as CSSImportRule).styleSheet;
        const media = (rule as CSSImportRule).media?.mediaText;
        const importCondition = media ? [{ kind: 'media', text: media,
          active: (() => { try { return view.matchMedia(media).matches ? 'yes' : 'no'; } catch { return 'unknown'; } })() as Truth }] : [];
        if (imported) visitSheet(imported, { ...source, href: imported.href, rulePath }, [...conditions, ...importCondition]);
        else unreadableSheets.push({ kind: source.kind, sheetIndex: source.sheetIndex ?? -1, href: source.href ?? null });
      }
      try {
        const children = (rule as CSSGroupingRule).cssRules;
        if (children) {
          const condition = ruleCondition(rule, view);
          visitRules(children, source, condition ? [...conditions, condition] : conditions, rulePath);
        }
      } catch {
        unreadableSheets.push({ kind: source.kind, sheetIndex: source.sheetIndex ?? -1, href: source.href ?? null });
      }
    }
  };
  Array.from(doc.styleSheets).forEach((sheet, sheetIndex) =>
    visitSheet(sheet, { kind: 'stylesheet', sheetIndex, href: sheet.href }));
  Array.from(doc.adoptedStyleSheets ?? []).forEach((sheet, sheetIndex) =>
    visitSheet(sheet, { kind: 'adopted-stylesheet', sheetIndex, href: sheet.href }));
  add(element.style, null, { kind: 'inline' }, []);
  return { candidates, unreadableSheets };
}

function probe(element: HTMLElement, property: DiagnosticCase['property'], token: string, witness: string) {
  const view = element.ownerDocument.defaultView!;
  const original = view.getComputedStyle(element).getPropertyValue(property).trim();
  const inline = element.style.getPropertyValue(token);
  const priority = element.style.getPropertyPriority(token);
  const hadInlineDeclaration = Array.from({ length: element.style.length }, (_, index) => element.style.item(index))
    .includes(token);
  let stimulated: string | null = null;
  let restored: string | null = null;
  try {
    element.style.setProperty(token, witness, 'important');
    stimulated = view.getComputedStyle(element).getPropertyValue(property).trim();
  } finally {
    if (hadInlineDeclaration) element.style.setProperty(token, inline, priority);
    else element.style.removeProperty(token);
    restored = view.getComputedStyle(element).getPropertyValue(property).trim();
  }
  const inlineRestored = element.style.getPropertyValue(token) === inline &&
    element.style.getPropertyPriority(token) === priority &&
    Array.from({ length: element.style.length }, (_, index) => element.style.item(index)).includes(token) === hadInlineDeclaration;
  const expected = property === 'background-color' ? witness.replaceAll(' ', '') : witness;
  return { original, witness, stimulated, restored, restoredExactly: restored === original && inlineRestored,
    inlineRestored,
    matchedWitness: stimulated?.replaceAll(' ', '') === expected && stimulated !== original };
}

function wholeValueToken(candidate: Candidate): string | null {
  const reference = candidate.references[0];
  return candidate.references.length === 1 && reference?.role === 'whole-value' &&
    reference.fallback === null && candidate.rawValue.trim() === `var(${reference.name})`
    ? reference.name : null;
}

export function diagnoseBinding(specimen: RenderedSpecimen, item: DiagnosticCase) {
  const target = item.target === 'input' ? specimen.root.querySelector('input') : specimen.root;
  if (!(target instanceof HTMLElement) || !target.isConnected) throw new Error(`${item.specimen}/${item.variant}: missing connected ${item.target}`);
  const { candidates, unreadableSheets } = collectCandidates(target, item.property);
  const applicable = candidates.filter((candidate) => candidate.applicable === 'yes');
  const directTokens = [...new Set(applicable.map(wholeValueToken).filter((name): name is string => name !== null))];
  const direct = directTokens.includes(item.token);
  const verification = direct ? probe(target, item.property, item.token, item.witness) : null;
  const competingProbes = direct && verification?.restoredExactly ? directTokens
    .filter((name) => name !== item.token)
    .map((name) => ({ token: name, ...probe(target, item.property, name, item.witness) })) : [];
  const ambiguous = unreadableSheets.length > 0 || candidates.some((candidate) => candidate.applicable === 'unknown') ||
    applicable.some((candidate) => candidate.references.length > 0 && wholeValueToken(candidate) === null) ||
    competingProbes.some((result) => !result.restoredExactly || (verification?.matchedWitness && result.matchedWitness));
  const status: Status = !verification || !verification.restoredExactly || ambiguous ? 'unknown'
    : verification.matchedWitness ? 'confirmed' : 'rejected';
  return {
    specimen: item.specimen, variant: item.variant, element: item.target, tag: target.tagName.toLowerCase(),
    classes: Array.from(target.classList), property: item.property, tokenCandidate: item.token,
    originalComputed: verification?.original ?? target.ownerDocument.defaultView!.getComputedStyle(target).getPropertyValue(item.property).trim(),
    candidates, unreadableSheets, competingProbes,
    method: verification ? 'CSSOM direct var reference + temporary element custom-property override' : 'CSSOM only',
    verification, status,
    reason: !direct ? 'No applicable direct var declaration for candidate'
      : !verification?.restoredExactly ? 'Original computed style did not restore'
      : ambiguous ? 'CSSOM coverage, applicability, or competing token response is ambiguous'
          : verification.matchedWitness ? 'Computed property followed the witness and restored' : 'Computed property did not follow the witness',
  };
}
