import type { TokenVarReference } from '@obsidian-ui-system/ui-schema';

function closingParen(input: string, open: number): number {
  let depth = 1;
  let quote: string | null = null;
  for (let i = open + 1; i < input.length; i++) {
    const char = input[i]!;
    if (quote) {
      if (char === '\\') i++;
      else if (char === quote) quote = null;
    } else if (char === '"' || char === "'") quote = char;
    else if (char === '/' && input[i + 1] === '*') {
      const end = input.indexOf('*/', i + 2);
      if (end < 0) return -1;
      i = end + 1;
    } else if (char === '(') depth++;
    else if (char === ')' && --depth === 0) return i;
  }
  return -1;
}

function topLevelComma(input: string): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < input.length; i++) {
    const char = input[i]!;
    if (quote) {
      if (char === '\\') i++;
      else if (char === quote) quote = null;
    } else if (char === '"' || char === "'") quote = char;
    else if (char === '/' && input[i + 1] === '*') {
      const end = input.indexOf('*/', i + 2);
      if (end < 0) return -1;
      i = end + 1;
    } else if (char === '(') depth++;
    else if (char === ')') depth--;
    else if (char === ',' && depth === 0) return i;
  }
  return -1;
}

/** Reads syntax, not CSS cascade or whether a fallback branch was used. */
export function parseVarReferences(rawValue: string): TokenVarReference[] {
  const references: TokenVarReference[] = [];
  const scan = (input: string, outer = false): void => {
    let quote: string | null = null;
    for (let i = 0; i < input.length; i++) {
      const char = input[i]!;
      if (quote) {
        if (char === '\\') i++;
        else if (char === quote) quote = null;
        continue;
      }
      if (char === '"' || char === "'") { quote = char; continue; }
      if (char === '/' && input[i + 1] === '*') {
        const end = input.indexOf('*/', i + 2);
        if (end < 0) return;
        i = end + 1;
        continue;
      }
      if (input.slice(i, i + 4).toLowerCase() !== 'var(' || (i > 0 && /[\w-]/.test(input[i - 1]!))) continue;
      const end = closingParen(input, i + 3);
      if (end < 0) continue;
      const content = input.slice(i + 4, end);
      const comma = topLevelComma(content);
      const name = (comma < 0 ? content : content.slice(0, comma)).trim();
      const fallback = comma < 0 ? null : content.slice(comma + 1);
      if (/^--[\w-]+$/.test(name)) {
        references.push({
          name,
          fallback,
          role: outer && input.trim() === input.slice(i, end + 1) ? 'whole-value' : 'embedded',
        });
      }
      // A nested reference is observable but the fallback may never be evaluated.
      if (fallback !== null) scan(fallback);
      i = end;
    }
  };
  scan(rawValue, true);
  return references;
}

export function directAliasName(rawValue: string): string | null {
  const refs = parseVarReferences(rawValue);
  return refs.length === 1 && refs[0]?.role === 'whole-value' && refs[0].fallback === null
    ? refs[0].name : null;
}
