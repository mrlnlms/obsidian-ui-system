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
  lineHeight: string;
  color: string;
  background: string;
  border: string;
  borderRadius: string;
  opacity: string;
}

export interface DomSnapshot {
  tag: string;
  classes: string[];
  attributes?: Record<string, string>;
  text?: string;
  sizePx: { width: number; height: number };
  styles: SelectedStyles;
  children: DomSnapshot[];
}

export interface ComponentSnapshot {
  id: string;
  name: string;
  origin: ComponentOrigin;
  implementation: string;
  states?: { current: string; known: string[] };
  dom: DomSnapshot;
}

export interface SnapshotManifest {
  schemaVersion: '0.1.0';
  obsidianVersion: string;
  capturedAt: string;
  platform: string;
  theme: string | null;
  mode: 'light' | 'dark' | 'unknown';
}

export interface TokensSnapshot {
  scopes: ['html', 'body'];
  values: Record<string, string>;
}
