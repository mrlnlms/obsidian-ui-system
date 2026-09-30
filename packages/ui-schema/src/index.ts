export type ComponentOrigin = 'public-api' | 'internal-observed';

export interface SelectedStyles {
  width: string;
  height: string;
  display: string;
  position: string;
  padding: string;
  margin: string;
  gap: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  fontStyle: string;
  lineHeight: string;
  letterSpacing: string;
  color: string;
  background: string;
  border: string;
  borderRadius: string;
  opacity: string;
}

/** Computed variables on a text-bearing element, without guessing the winning CSS rule. */
export interface TypographyContext {
  cssVariables: Record<string, string>;
  fontFamilyDeclaration: { source: 'inline'; value: string } | { source: 'unresolved' };
}

export interface DomSnapshot {
  tag: string;
  classes: string[];
  attributes?: Record<string, string>;
  properties?: { value?: string; checked?: boolean; disabled?: boolean };
  text?: string;
  sizePx: { width: number; height: number };
  styles: SelectedStyles;
  typography?: TypographyContext;
  children: DomSnapshot[];
}

export interface ComponentSnapshot {
  id: string;
  name: string;
  category: string;
  origin: ComponentOrigin;
  implementation: string;
  variant: string;
  states?: { current: string; known: string[] };
  dom: DomSnapshot;
}

export interface SnapshotManifest {
  schemaVersion: '0.4.0';
  /** Obsidian's public API version reported by the running app. */
  obsidianVersion: string;
  /** Version of the installed `obsidian` SDK package used to build Capture. */
  obsidianSdkVersion: string;
  capturedAt: string;
  platform: string;
  theme: string | null;
  mode: 'light' | 'dark' | 'unknown';
}

export interface TokensSnapshot {
  scopes: ['html', 'body'];
  values: Record<string, string>;
}
