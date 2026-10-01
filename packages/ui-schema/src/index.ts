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

/** Technical CSS evidence from one Mapping capture; separate from snapshot schema 0.4.0. */
export type TokenMode = 'light' | 'dark';
export type EvidenceTruth = 'yes' | 'no' | 'unknown';
export type TokenResolutionStatus = 'resolved' | 'no-applicable-declaration' | 'unresolved' | 'unknown';

export interface TokenVarReference {
  name: string;
  /** Raw text after the first top-level comma, or null when no fallback exists. */
  fallback: string | null;
  role: 'whole-value' | 'embedded';
}

export interface TokenDeclarationEvidence {
  rawValue: string;
  selector: string | null;
  source: {
    kind: 'stylesheet' | 'adopted-stylesheet' | 'inline';
    href?: string | null;
    sheetIndex?: number;
    rulePath?: number[];
    element?: 'html' | 'body';
  };
  priority: string;
  conditions: Array<{ kind: string; text: string; active: EvidenceTruth }>;
  appliesTo: { html: EvidenceTruth; body: EvidenceTruth };
  references: TokenVarReference[];
}

export interface TokenModeObservation {
  status: TokenResolutionStatus;
  computed: { html: string | null; body: string | null; selected: string | null };
  declarations: TokenDeclarationEvidence[];
  /** Only a simple, unambiguous applicable declaration can be attributed. */
  attribution: { status: 'unique'; declarationIndex: number; target: 'html' | 'body' } | { status: 'unknown' };
  /** Observed missing dependency names, never guessed replacement values. */
  unresolvedReferences?: string[];
}

export interface TokenEvidenceCapture {
  format: 'obsidian-ui-token-evidence';
  version: 1;
  mode: SnapshotManifest['mode'];
  environment: SnapshotManifest;
  coverage: {
    complete: boolean;
    unreadableSheets: Array<{ kind: 'stylesheet' | 'adopted-stylesheet'; sheetIndex: number; href?: string | null }>;
  };
  tokens: Record<string, TokenModeObservation>;
}

/** A read-only join for comparing two single-mode captures; it is not a package format. */
export interface MergedTokenEvidence {
  environments: { dark: SnapshotManifest; light: SnapshotManifest };
  sourceEquality: 'unverified';
  tokens: Record<string, { dark?: TokenModeObservation; light?: TokenModeObservation }>;
}

/** Independently versioned provenance for one individual Mapping or Layout Lab export. */
export interface CaptureContext {
  format: 'obsidian-ui-capture-context';
  version: 1;
  kind: 'mapping' | 'layout';
  environment: SnapshotManifest;
  pluginBuild: {
    algorithm: 'SHA-256';
    path: string;
    sha256: string;
  };
  viewport: { widthPx: number; heightPx: number; devicePixelRatio: number };
}

/** Package v2 joins individual 0.4.0 captures; it does not change their schema. */
export interface MultiModePackageManifest {
  schemaVersion: '0.5.0';
  modes: ['dark', 'light'];
  assembledAt: string;
  sources: {
    dark: { mapping: CaptureContext; layout: CaptureContext };
    light: { mapping: CaptureContext; layout: CaptureContext };
  };
  technicalContext: {
    status: 'verified';
    buildSha256: string;
    viewport: CaptureContext['viewport'];
    obsidianVersion: string;
    obsidianSdkVersion: string;
    sourceSchemaVersion: '0.4.0';
    platform: string;
  };
  inferenceSource: { mode: TokenMode; layoutCapturedAt: string };
}

export interface MultiModeTokens {
  scopes: ['html', 'body'];
  coverage: { dark: TokenEvidenceCapture['coverage']; light: TokenEvidenceCapture['coverage'] };
  tokens: Record<string, { dark?: TokenModeObservation; light?: TokenModeObservation }>;
}

export interface MultiModeComponents {
  dark: ComponentSnapshot[];
  light: ComponentSnapshot[];
}
