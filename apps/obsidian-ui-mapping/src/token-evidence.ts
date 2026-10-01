import type {
  EvidenceTruth, MergedTokenEvidence, SnapshotManifest, TokenDeclarationEvidence,
  TokenEvidenceCapture, TokenModeObservation, TokensSnapshot,
} from '@obsidian-ui-system/ui-schema';
import { parseVarReferences } from './token-references';

type Scope = 'html' | 'body';
type Condition = TokenDeclarationEvidence['conditions'][number];
type Source = TokenDeclarationEvidence['source'];

function conditionFor(rule: CSSRule, view: Window): Condition | null {
  let text: string;
  let css: string;
  try {
    text = (rule as CSSConditionRule).conditionText;
    if (typeof text !== 'string') return null;
    css = rule.cssText.trimStart();
  } catch { return { kind: 'condition', text: '<unreadable>', active: 'unknown' }; }
  const kind = css.startsWith('@media') ? 'media' : css.startsWith('@supports') ? 'supports'
    : css.startsWith('@container') ? 'container' : 'condition';
  try {
    if (kind === 'media') return { kind, text, active: view.matchMedia(text).matches ? 'yes' : 'no' };
    if (kind === 'supports') {
      const supports = (view as Window & { CSS?: { supports?: (condition: string) => boolean } }).CSS?.supports;
      return { kind, text, active: supports ? (supports(text) ? 'yes' : 'no') : 'unknown' };
    }
  } catch {
    // Unsupported syntax or API means applicability cannot be inferred.
  }
  return { kind, text, active: 'unknown' };
}

function applicability(selector: string, element: Element, conditions: Condition[]): EvidenceTruth {
  if (conditions.some(({ active }) => active === 'no')) return 'no';
  let matches: boolean;
  try { matches = element.matches(selector); }
  catch { return 'unknown'; }
  if (!matches) return 'no';
  return conditions.some(({ active }) => active === 'unknown') ? 'unknown' : 'yes';
}

function collectStyle(
  style: CSSStyleDeclaration, selector: string | null, source: Source,
  conditions: Condition[], html: Element, body: Element,
  add: (name: string, evidence: TokenDeclarationEvidence) => void,
): void {
  const appliesTo = selector === null
    ? { html: source.element === 'html' ? 'yes' : 'no', body: source.element === 'body' ? 'yes' : 'no' } as const
    : {
        html: applicability(selector, html, conditions),
        body: applicability(selector, body, conditions),
      };
  for (let index = 0; index < style.length; index++) {
    const name = style.item(index);
    if (!name.startsWith('--')) continue;
    const rawValue = style.getPropertyValue(name);
    add(name, {
      rawValue, selector, source, priority: style.getPropertyPriority(name),
      conditions: [...conditions], appliesTo, references: parseVarReferences(rawValue),
    });
  }
}

function attribution(declarations: TokenDeclarationEvidence[], complete: boolean): TokenModeObservation['attribution'] {
  if (!complete) return { status: 'unknown' };
  const target: Scope = declarations.some((item) => item.appliesTo.body === 'yes') ? 'body' : 'html';
  if (target === 'html' && declarations.some((item) => item.appliesTo.body === 'unknown')) {
    return { status: 'unknown' };
  }
  if (declarations.some((item) => item.appliesTo[target] === 'unknown')) return { status: 'unknown' };
  const indexes = declarations.flatMap((item, index) => item.appliesTo[target] === 'yes' ? [index] : []);
  return indexes.length === 1 ? { status: 'unique', target, declarationIndex: indexes[0]! } : { status: 'unknown' };
}

/** CSSOM observations plus browser-computed values for one current mode. */
export function captureTokenEvidence(doc: Document, environment: SnapshotManifest): TokenEvidenceCapture {
  const view = doc.defaultView;
  const html = doc.documentElement;
  const body = doc.body;
  if (!view || !body) throw new Error('Cannot capture tokens without a document body');

  const declarations = new Map<string, TokenDeclarationEvidence[]>();
  const names = new Set<string>();
  const add = (name: string, evidence: TokenDeclarationEvidence): void => {
    names.add(name);
    for (const reference of evidence.references) names.add(reference.name);
    const list = declarations.get(name) ?? [];
    list.push(evidence);
    declarations.set(name, list);
  };
  const unreadableSheets: TokenEvidenceCapture['coverage']['unreadableSheets'] = [];
  const visiting = new Set<CSSStyleSheet>();

  const visitSheet = (sheet: CSSStyleSheet, source: Source, inherited: Condition[] = []): void => {
    if (visiting.has(sheet)) {
      unreadableSheets.push({ kind: source.kind === 'adopted-stylesheet' ? source.kind : 'stylesheet',
        sheetIndex: source.sheetIndex ?? -1, href: source.href });
      return;
    }
    visiting.add(sheet);
    try {
      visitRules(sheet.cssRules, source, inherited, source.rulePath ?? []);
    } catch {
      unreadableSheets.push({ kind: source.kind === 'adopted-stylesheet' ? source.kind : 'stylesheet',
        sheetIndex: source.sheetIndex ?? -1, href: source.href });
    } finally {
      visiting.delete(sheet);
    }
  };
  const visitRules = (rules: CSSRuleList, source: Source, conditions: Condition[], path: number[]): void => {
    for (let index = 0; index < rules.length; index++) {
      const rule = rules.item(index);
      if (!rule) continue;
      const rulePath = [...path, index];
      const selector = (rule as CSSStyleRule).selectorText;
      if (typeof selector === 'string' && (rule as CSSStyleRule).style) {
        collectStyle((rule as CSSStyleRule).style, selector, { ...source, rulePath },
          conditions, html, body, add);
      }
      const imported = (rule as CSSImportRule).styleSheet;
      if (rule.type === 3 && !imported) {
        unreadableSheets.push({ kind: source.kind === 'adopted-stylesheet' ? source.kind : 'stylesheet',
          sheetIndex: source.sheetIndex ?? -1, href: source.href });
      }
      if (rule.type === 3 && imported) {
        const media = (rule as CSSImportRule).media?.mediaText;
        let active: EvidenceTruth = 'unknown';
        if (media) {
          try { active = view.matchMedia(media).matches ? 'yes' : 'no'; }
          catch { /* Preserve unknown applicability. */ }
        }
        const importCondition: Condition[] = media ? [{ kind: 'media', text: media, active }] : [];
        visitSheet(imported, { ...source, href: imported.href, rulePath }, [...conditions, ...importCondition]);
      }
      try {
        const children = (rule as CSSGroupingRule).cssRules;
        if (children) {
          const condition = conditionFor(rule, view);
          visitRules(children, source, condition ? [...conditions, condition] : conditions, rulePath);
        }
      } catch {
        unreadableSheets.push({ kind: source.kind === 'adopted-stylesheet' ? source.kind : 'stylesheet',
          sheetIndex: source.sheetIndex ?? -1, href: source.href });
      }
    }
  };
  Array.from(doc.styleSheets).forEach((sheet, sheetIndex) =>
    visitSheet(sheet, { kind: 'stylesheet', sheetIndex, href: sheet.href }));
  Array.from(doc.adoptedStyleSheets ?? []).forEach((sheet, sheetIndex) =>
    visitSheet(sheet, { kind: 'adopted-stylesheet', sheetIndex, href: sheet.href }));
  collectStyle(html.style, null, { kind: 'inline', element: 'html' }, [], html, body, add);
  collectStyle(body.style, null, { kind: 'inline', element: 'body' }, [], html, body, add);

  const complete = unreadableSheets.length === 0;
  const htmlStyle = view.getComputedStyle(html);
  const bodyStyle = view.getComputedStyle(body);
  const computedValue = (style: CSSStyleDeclaration, name: string): string | null =>
    style.getPropertyValue(name).trim() || null;
  const tokens: Record<string, TokenModeObservation> = {};
  for (const name of [...names].sort((a, b) => a.localeCompare(b))) {
    const own = declarations.get(name) ?? [];
    const htmlValue = computedValue(htmlStyle, name);
    const bodyValue = computedValue(bodyStyle, name);
    const selected = bodyValue ?? htmlValue;
    const hasApplicable = own.some((item) => item.appliesTo.html === 'yes' || item.appliesTo.body === 'yes');
    const hasUnknown = own.some((item) => item.appliesTo.html === 'unknown' || item.appliesTo.body === 'unknown');
    tokens[name] = {
      status: selected ? 'resolved' : hasApplicable ? 'unresolved'
        : !complete || hasUnknown ? 'unknown' : 'no-applicable-declaration',
      computed: { html: htmlValue, body: bodyValue, selected },
      declarations: own,
      attribution: attribution(own, complete),
    };
  }

  // Diagnostic only: follow uniquely attributable, unfallbacked references; never resolve CSS ourselves.
  const missing = (name: string, scope: Scope, visited: Set<string>): string[] => {
    const key = `${name}:${scope}`;
    if (visited.has(key)) return [];
    visited.add(key);
    const observation = tokens[name];
    if (!observation || observation.computed[scope]) return [];
    const chosen = observation.attribution;
    if (chosen.status !== 'unique') return [];
    const declaration = observation.declarations[chosen.declarationIndex];
    if (!declaration) return [];
    const result: string[] = [];
    for (const reference of declaration.references) {
      if (reference.fallback !== null) continue;
      if (!tokens[reference.name]?.computed[chosen.target]) {
        result.push(reference.name, ...missing(reference.name, chosen.target, visited));
      }
    }
    return result;
  };
  for (const [name, observation] of Object.entries(tokens)) {
    if (observation.status !== 'unresolved') continue;
    const scope = observation.attribution.status === 'unique' ? observation.attribution.target : 'body';
    const unresolvedReferences = [...new Set(missing(name, scope, new Set()))];
    if (unresolvedReferences.length) observation.unresolvedReferences = unresolvedReferences;
  }
  return {
    format: 'obsidian-ui-token-evidence', version: 1, mode: environment.mode, environment,
    coverage: { complete, unreadableSheets }, tokens,
  };
}

/** The legacy snapshot is a projection of the same observations, not a second collector. */
export function projectLegacyTokens(capture: TokenEvidenceCapture): TokensSnapshot {
  const values: Record<string, string> = {};
  for (const [name, observation] of Object.entries(capture.tokens)) {
    if (observation.computed.selected !== null) values[name] = observation.computed.selected;
  }
  return { scopes: ['html', 'body'], values: Object.fromEntries(
    Object.entries(values).sort(([a], [b]) => a.localeCompare(b))) };
}

/** Joins evidence by CSS name only; a missing mode stays absent. */
export function mergeTokenEvidence(a: TokenEvidenceCapture, b: TokenEvidenceCapture): MergedTokenEvidence {
  if (a.mode === b.mode || !['light', 'dark'].includes(a.mode) || !['light', 'dark'].includes(b.mode)) {
    throw new Error('Merge requires one light and one dark capture');
  }
  for (const field of ['schemaVersion', 'obsidianVersion', 'obsidianSdkVersion', 'platform'] as const) {
    if (a.environment[field] !== b.environment[field]) throw new Error(`Capture environments differ: ${field}`);
  }
  if (a.environment.theme !== null && b.environment.theme !== null && a.environment.theme !== b.environment.theme) {
    throw new Error('Capture themes differ');
  }
  const dark = a.mode === 'dark' ? a : b;
  const light = a.mode === 'light' ? a : b;
  const tokens: MergedTokenEvidence['tokens'] = {};
  for (const name of [...new Set([...Object.keys(dark.tokens), ...Object.keys(light.tokens)])]
    .sort((x, y) => x.localeCompare(y))) {
    tokens[name] = {
      ...(dark.tokens[name] ? { dark: dark.tokens[name] } : {}),
      ...(light.tokens[name] ? { light: light.tokens[name] } : {}),
    };
  }
  return { environments: { dark: dark.environment, light: light.environment }, sourceEquality: 'unverified', tokens };
}
