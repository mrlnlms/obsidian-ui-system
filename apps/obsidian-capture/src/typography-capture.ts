import type { TypographyContext } from '@obsidian-ui-system/ui-schema';

// Bounded, known Obsidian typography variables. Their presence is evidence;
// matching a value to font-family does not prove which declaration won the cascade.
const TYPOGRAPHY_VARIABLES = [
  '--font-interface', '--font-interface-override', '--font-interface-theme',
  '--font-default', '--font-ui-small', '--font-weight',
] as const;
const FAMILY_VARIABLES = new Set(['--font-interface', '--font-interface-override',
  '--font-interface-theme', '--font-default']);

export function withoutObsidianSentinel(value: string): string {
  // Obsidian defines @font-face '??' with unicode-range U+0 as a no-override marker.
  // Keep the raw computed font-family in styles; exclude this marker from usable variables.
  return value.split(',').map((part) => part.trim())
    .filter((part) => !/^(?:\?\?|['"]\?\?['"])$/.test(part)).join(', ');
}

export function captureTypographyContext(element: Element, computed: CSSStyleDeclaration): TypographyContext {
  const cssVariables: Record<string, string> = {};
  for (const name of TYPOGRAPHY_VARIABLES) {
    const value = computed.getPropertyValue(name).trim();
    const usable = FAMILY_VARIABLES.has(name) ? withoutObsidianSentinel(value) : value;
    if (usable) cssVariables[name] = usable;
  }
  const inline = element instanceof HTMLElement || element instanceof SVGElement
    ? element.style.getPropertyValue('font-family').trim()
    : '';
  return {
    cssVariables,
    fontFamilyDeclaration: inline
      ? { source: 'inline', value: inline }
      : { source: 'unresolved' },
  };
}
