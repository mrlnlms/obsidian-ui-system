import { apiVersion, Platform } from 'obsidian';
import type {
  ComponentSnapshot,
  DomSnapshot,
  SelectedStyles,
  SnapshotManifest,
  TokensSnapshot,
} from '@obsidian-ui-system/ui-schema';
import type { RenderedSpecimen } from './component-registry';

declare const __OBSIDIAN_SDK_VERSION__: string;

function selectedStyles(style: CSSStyleDeclaration): SelectedStyles {
  const value = (name: string): string => style.getPropertyValue(name).trim();
  return {
    width: value('width'),
    height: value('height'),
    display: value('display'),
    position: value('position'),
    padding: value('padding'),
    margin: value('margin'),
    gap: value('gap'),
    fontFamily: value('font-family'),
    fontSize: value('font-size'),
    fontWeight: value('font-weight'),
    lineHeight: value('line-height'),
    color: value('color'),
    background: value('background-color'),
    border: value('border'),
    borderRadius: value('border-radius'),
    opacity: value('opacity'),
  };
}

export function captureElement(element: Element): DomSnapshot {
  const view = element.ownerDocument.defaultView;
  if (!view) throw new Error('Cannot capture an element without a window');

  const rect = element.getBoundingClientRect();
  const attributes = Object.fromEntries(
    Array.from(element.attributes)
      .filter(({ name }) => ['type', 'placeholder', 'role', 'title', 'value', 'min', 'max', 'step'].includes(name) || name.startsWith('aria-'))
      .map(({ name, value }) => [name, value]),
  );
  const text = Array.from(element.childNodes)
    .filter((node): node is Text => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent?.trim() ?? '')
    .filter(Boolean)
    .join(' ');
  const properties = element instanceof HTMLInputElement
    ? {
        value: element.value,
        ...(['checkbox', 'radio'].includes(element.type) ? { checked: element.checked } : {}),
        disabled: element.disabled,
      }
    : element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement
      ? { value: element.value, disabled: element.disabled }
    : element instanceof HTMLButtonElement
      ? { disabled: element.disabled }
      : undefined;

  return {
    tag: element.tagName.toLowerCase(),
    classes: Array.from(element.classList),
    ...(Object.keys(attributes).length ? { attributes } : {}),
    ...(properties ? { properties } : {}),
    ...(text ? { text } : {}),
    sizePx: { width: rect.width, height: rect.height },
    styles: selectedStyles(view.getComputedStyle(element)),
    children: Array.from(element.children, captureElement),
  };
}

export function captureComponents(specimens: RenderedSpecimen[]): ComponentSnapshot[] {
  return specimens.map(({ definition, variant, root, getState }) => {
    const current = getState();
    if (current !== variant.state) {
      throw new Error(`${definition.id}/${variant.id}: expected ${variant.state}, found ${current}`);
    }
    return {
      id: definition.id,
      name: definition.name,
      category: definition.category,
      origin: definition.source,
      implementation: definition.implementation,
      variant: variant.id,
      states: {
        current,
        known: [...new Set(definition.variants.map((item) => item.state))],
      },
      dom: captureElement(root),
    };
  });
}

export function captureTokens(doc: Document): TokensSnapshot {
  const view = doc.defaultView;
  if (!view || !doc.body) throw new Error('Cannot capture tokens without a document body');

  const names = new Set<string>();
  const collectDeclarations = (style: CSSStyleDeclaration): void => {
    for (let index = 0; index < style.length; index++) {
      const name = style.item(index);
      if (name.startsWith('--')) names.add(name);
    }
  };
  const collectRules = (rules: CSSRuleList): void => {
    for (const rule of Array.from(rules)) {
      const declaration = (rule as CSSStyleRule).style;
      if (declaration) collectDeclarations(declaration);
      const children = (rule as CSSGroupingRule).cssRules;
      if (children) collectRules(children);
    }
  };
  for (const sheet of [...Array.from(doc.styleSheets), ...doc.adoptedStyleSheets]) {
    try {
      collectRules(sheet.cssRules);
    } catch {
      // Browser security blocks CSSOM access to some external sheets.
    }
  }
  collectDeclarations(doc.documentElement.style);
  collectDeclarations(doc.body.style);

  const values: Record<string, string> = {};
  for (const element of [doc.documentElement, doc.body]) {
    const style = view.getComputedStyle(element);
    for (const name of names) {
      const value = style.getPropertyValue(name).trim();
      if (value) values[name] = value;
    }
  }
  return {
    scopes: ['html', 'body'],
    values: Object.fromEntries(Object.entries(values).sort(([a], [b]) => a.localeCompare(b))),
  };
}

export function captureManifest(doc: Document, capturedAt: string): SnapshotManifest {
  const classes = doc.body.classList;
  const mode = classes.contains('theme-dark') ? 'dark' : classes.contains('theme-light') ? 'light' : 'unknown';
  const platform = Platform.isIosApp ? 'ios' : Platform.isAndroidApp ? 'android'
    : Platform.isMacOS ? 'macos' : Platform.isWin ? 'windows'
    : Platform.isLinux ? 'linux' : 'unknown';

  return {
    schemaVersion: '0.3.0',
    obsidianVersion: apiVersion,
    obsidianSdkVersion: __OBSIDIAN_SDK_VERSION__,
    capturedAt,
    platform,
    theme: null,
    mode,
  };
}
