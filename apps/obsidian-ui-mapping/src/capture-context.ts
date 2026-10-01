import type { DataAdapter } from 'obsidian';
import type { CaptureContext, SnapshotManifest } from '@obsidian-ui-system/ui-schema';

const PLUGIN_ID = 'obsidian-ui-mapping';
type Mode = 'dark' | 'light';
type CaptureSet = Record<Mode, { mapping: CaptureContext; layout: CaptureContext }>;

function viewportOf(doc: Document): CaptureContext['viewport'] {
  const view = doc.defaultView;
  if (!view) throw new Error('Cannot capture context without a window');
  const viewport = {
    widthPx: view.innerWidth, heightPx: view.innerHeight, devicePixelRatio: view.devicePixelRatio,
  };
  if (!Number.isFinite(viewport.widthPx) || viewport.widthPx <= 0
    || !Number.isFinite(viewport.heightPx) || viewport.heightPx <= 0
    || !Number.isFinite(viewport.devicePixelRatio) || viewport.devicePixelRatio <= 0) {
    throw new Error('Cannot capture an invalid viewport');
  }
  return viewport;
}

/** Hash the installed compiled bundle; a missing or unreadable bundle fails the export. */
export async function readCaptureContext(
  adapter: DataAdapter, configDir: string, doc: Document, environment: SnapshotManifest,
  kind: CaptureContext['kind'],
): Promise<CaptureContext> {
  const path = `${configDir.replace(/\/+$/, '')}/plugins/${PLUGIN_ID}/main.js`;
  const bytes = await adapter.readBinary(path);
  if (!bytes.byteLength) throw new Error(`Compiled plugin bundle is empty: ${path}`);
  if (!globalThis.crypto?.subtle) throw new Error('SHA-256 is unavailable in this Obsidian window');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  const sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return {
    format: 'obsidian-ui-capture-context', version: 1, kind,
    environment: { ...environment },
    pluginBuild: { algorithm: 'SHA-256', path, sha256 },
    viewport: viewportOf(doc),
  };
}

/** Guard a single export against changing mode, viewport, or installed bundle mid-capture. */
export function assertCaptureContextStable(before: CaptureContext, after: CaptureContext): void {
  if (JSON.stringify(before.environment) !== JSON.stringify(after.environment)) {
    throw new Error('Capture environment changed during export');
  }
  if (JSON.stringify(before.viewport) !== JSON.stringify(after.viewport)) {
    throw new Error('Capture viewport changed during export');
  }
  if (before.pluginBuild.sha256 !== after.pluginBuild.sha256
    || before.pluginBuild.path !== after.pluginBuild.path) {
    throw new Error('Compiled plugin build changed during export');
  }
}

/** Bind a sidecar to the manifest (and, for Layout Lab, viewport) in its sibling artifact. */
export function assertCaptureContextMatches(
  context: CaptureContext, kind: CaptureContext['kind'], environment: SnapshotManifest,
  viewport?: CaptureContext['viewport'],
): void {
  if (context.kind !== kind || JSON.stringify(context.environment) !== JSON.stringify(environment)) {
    throw new Error(`${kind} capture context does not match its artifact environment`);
  }
  if (viewport && JSON.stringify(context.viewport) !== JSON.stringify(viewport)) {
    throw new Error(`${kind} capture context does not match its artifact viewport`);
  }
}

function validateContext(context: CaptureContext, kind: CaptureContext['kind'], mode: Mode): void {
  if (context.format !== 'obsidian-ui-capture-context' || context.version !== 1) {
    throw new Error(`${mode} ${kind}: capture context format/version is unsupported`);
  }
  if (context.kind !== kind) throw new Error(`${mode} ${kind}: capture kind differs`);
  if (context.environment.mode !== mode) throw new Error(`${mode} ${kind}: capture mode differs`);
  if (context.pluginBuild.algorithm !== 'SHA-256' || !/^[a-f0-9]{64}$/.test(context.pluginBuild.sha256)) {
    throw new Error(`${mode} ${kind}: plugin build hash is invalid`);
  }
  const { widthPx, heightPx, devicePixelRatio } = context.viewport;
  if (![widthPx, heightPx, devicePixelRatio].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error(`${mode} ${kind}: viewport is invalid`);
  }
}

/** Verifies the technical dimensions that the four individual exports actually recorded. */
export function verifyControlledCaptureSet(
  captures: CaptureSet, inferenceSourceMode: Mode,
): {
  technicalContext: 'verified';
  buildSha256: string;
  viewport: CaptureContext['viewport'];
  inferenceSource: { mode: Mode; layoutCapturedAt: string };
  themeNameKnown: boolean;
} {
  const all: CaptureContext[] = [];
  for (const mode of ['dark', 'light'] as const) {
    const pair = captures[mode];
    if (!pair) throw new Error(`Missing ${mode} capture pair`);
    validateContext(pair.mapping, 'mapping', mode);
    validateContext(pair.layout, 'layout', mode);
    all.push(pair.mapping, pair.layout);
  }
  const first = captures.dark.mapping;
  for (const context of all.slice(1)) {
    for (const field of ['schemaVersion', 'obsidianVersion', 'obsidianSdkVersion', 'platform'] as const) {
      if (context.environment[field] !== first.environment[field]) {
        throw new Error(`Capture contexts differ: ${field}`);
      }
    }
    if (context.pluginBuild.sha256 !== first.pluginBuild.sha256) {
      throw new Error('Capture contexts differ: plugin build');
    }
    if (JSON.stringify(context.viewport) !== JSON.stringify(first.viewport)) {
      throw new Error('Capture contexts differ: viewport');
    }
  }
  const knownThemes = all.map(({ environment }) => environment.theme).filter((theme): theme is string => theme !== null);
  if (new Set(knownThemes).size > 1) throw new Error('Capture contexts differ: theme');
  if (inferenceSourceMode !== 'dark' && inferenceSourceMode !== 'light') {
    throw new Error('Inference source mode must be dark or light');
  }
  return {
    technicalContext: 'verified',
    buildSha256: first.pluginBuild.sha256,
    viewport: { ...first.viewport },
    inferenceSource: {
      mode: inferenceSourceMode,
      layoutCapturedAt: captures[inferenceSourceMode].layout.environment.capturedAt,
    },
    themeNameKnown: knownThemes.length === all.length,
  };
}
