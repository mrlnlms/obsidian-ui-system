import type { TypographyContext } from '@obsidian-ui-system/ui-schema';

// Bounded, known Obsidian typography variables. Their presence is evidence;
// matching a value to font-family does not prove which declaration won the cascade.
const TYPOGRAPHY_VARIABLES = [
  '--font-interface', '--font-interface-override', '--font-interface-theme',
  '--font-default', '--font-ui-small', '--font-weight',
] as const;

export function captureTypographyContext(element: Element, computed: CSSStyleDeclaration): TypographyContext {
  const cssVariables: Record<string, string> = {};
  for (const name of TYPOGRAPHY_VARIABLES) {
    const value = computed.getPropertyValue(name).trim();
    if (value) cssVariables[name] = value;
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
