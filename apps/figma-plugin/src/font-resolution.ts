export interface FontRequest {
  cssStack: string;
  platform: string;
  weight: number;
  style: string | null;
}

/** The computed CSS stack is evidence; `??` is Obsidian's no-override sentinel. */
export function fontFamilies(stack: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let quote = '';
  for (let i = 0; i < stack.length; i++) {
    const char = stack[i];
    if (char === '\\') { i++; continue; }
    if (quote) { if (char === quote) quote = ''; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === ',') { parts.push(stack.slice(start, i)); start = i + 1; }
  }
  parts.push(stack.slice(start));
  return parts.map((part) => {
    const value = part.trim();
    return ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) ? value.slice(1, -1).trim() : value;
  }).filter((part) => part !== '' && part !== '??');
}

export function requiredFont(request: FontRequest, available: readonly FontName[]): FontName {
  const first = fontFamilies(request.cssStack)[0];
  if (!first) throw new Error('Typography requirement unresolved: a stack CSS não contém família utilizável.');
  if (request.style === null) {
    throw new Error('Typography requirement unresolved: fontStyle ausente. Exporte novamente o Atlas e o Layout Lab.');
  }
  const style = figmaStyle(request.weight, request.style);
  const generic = /^(ui-sans-serif|-apple-system|BlinkMacSystemFont|system-ui)$/i.test(first);
  let family = first;
  if (generic) {
    if (request.platform !== 'macos') {
      throw new Error(`Typography requirement unresolved: ${first} em ${request.platform} não possui mapeamento validado.`);
    }
    // Apple's default macOS system sans is SF Pro; the named instance is required in Figma.
    family = 'SF Pro';
  } else if (/^(sans-serif|serif|monospace|ui-serif|ui-monospace)$/i.test(first)) {
    throw new Error(`Typography requirement unresolved: família genérica ${first} sem mapeamento validado.`);
  }
  const match = available.find((font) => font.family === family && font.style === style);
  if (!match) {
    throw new Error(`Required font not available: ${family} / ${style}. Install the required font and restart Figma.`);
  }
  // Use the named instance advertised by Figma without overriding variable axes.
  return { family: match.family, style: match.style };
}

function figmaStyle(weight: number, style: string): string {
  const weights: Record<number, string> = {
    100: 'Thin', 200: 'Extra Light', 300: 'Light', 400: 'Regular',
    500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extra Bold', 900: 'Black',
  };
  const base = weights[weight];
  if (!base || (style !== 'normal' && style !== 'italic')) {
    throw new Error(`Typography requirement unresolved: estilo CSS ${weight} / ${style} não suportado.`);
  }
  if (style === 'normal') return base;
  return base === 'Regular' ? 'Italic' : `${base} Italic`;
}
