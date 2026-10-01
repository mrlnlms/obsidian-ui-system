import { strToU8, zipSync } from 'fflate';
import type {
  CaptureContext, ComponentSnapshot, MultiModeComponents, MultiModePackageManifest,
  MultiModeTokens, SnapshotManifest, TokenEvidenceCapture, TokenMode,
} from '@obsidian-ui-system/ui-schema';
import { assertCaptureContextMatches, verifyControlledCaptureSet } from './capture-context';
import type { LayoutObservation } from './layout-capture';
import type { LayoutInference } from './layout-inference';
import type { LayoutProbeSuite } from './layout-probes';

type Mode = TokenMode;
const MODES = ['dark', 'light'] as const;
const LAYOUT_MODEL = 'mapping-layout-probes-2';

export interface MappingV2Source {
  manifest: SnapshotManifest;
  tokenEvidence: TokenEvidenceCapture;
  components: ComponentSnapshot[];
  context: CaptureContext;
}

export interface LayoutV2Source {
  layout: {
    experimentalFormat: string;
    probeSuite: LayoutProbeSuite;
    environment: SnapshotManifest;
    viewport: CaptureContext['viewport'];
    observations: LayoutObservation[];
    inferences: LayoutInference[];
  };
  context: CaptureContext;
}

export interface FigmaPackageV2Input {
  dark: { mapping: MappingV2Source; layout: LayoutV2Source };
  light: { mapping: MappingV2Source; layout: LayoutV2Source };
  inferenceSourceMode: Mode;
  assembledAt: string;
}

export interface MultiModeLayout {
  experimentalFormat: typeof LAYOUT_MODEL;
  probeSuite: LayoutProbeSuite;
  observations: { dark: LayoutObservation[]; light: LayoutObservation[] };
  inferences: LayoutInference[];
  inferenceSource: MultiModePackageManifest['inferenceSource'];
}

export interface FigmaPackageV2 {
  packageManifest: {
    format: 'obsidian-ui-figma-package';
    version: 2;
    schemaVersion: '0.5.0';
    tokenModel: 'obsidian-ui-token-evidence-1';
    componentModel: 'obsidian-ui-component-snapshot-0.4.0';
    layoutModel: typeof LAYOUT_MODEL;
  };
  manifest: MultiModePackageManifest;
  tokens: MultiModeTokens;
  components: MultiModeComponents;
  layout: MultiModeLayout;
}

function componentKey(item: { id: string; variant: string }): string {
  if (!item || typeof item.id !== 'string' || !item.id
    || typeof item.variant !== 'string' || !item.variant) {
    throw new Error('Specimen or Layout identity is missing id/variant');
  }
  return `${item.id}/${item.variant}`;
}

function observationKey(item: LayoutObservation): string {
  if (!item.contentContext?.id || !item.host?.id
    || !Number.isFinite(item.host.requestedWidthPx) || item.host.requestedWidthPx <= 0) {
    throw new Error('Layout observation identity is incomplete');
  }
  return `${componentKey(item)}/${item.contentContext.id}/${item.host.id}/${item.host.requestedWidthPx}`;
}

function uniqueKeys<T>(items: T[], keyOf: (item: T) => string, label: string): Set<string> {
  if (!Array.isArray(items) || !items.length) throw new Error(`${label} is empty`);
  const keys = items.map(keyOf);
  if (new Set(keys).size !== keys.length) {
    throw new Error(`${label} contains duplicate identities`);
  }
  return new Set(keys);
}

function assertSameKeys(a: Set<string>, b: Set<string>, label: string): void {
  if (a.size !== b.size || [...a].some((key) => !b.has(key))) {
    throw new Error(`${label} differ between dark and light`);
  }
}

function validateSources(input: FigmaPackageV2Input): ReturnType<typeof verifyControlledCaptureSet> {
  const contexts = {
    dark: { mapping: input.dark.mapping.context, layout: input.dark.layout.context },
    light: { mapping: input.light.mapping.context, layout: input.light.layout.context },
  };
  const verified = verifyControlledCaptureSet(contexts, input.inferenceSourceMode);
  for (const mode of MODES) {
    const { mapping, layout } = input[mode];
    if (mapping.manifest.schemaVersion !== '0.4.0') {
      throw new Error(`${mode} Mapping schema must be 0.4.0`);
    }
    assertCaptureContextMatches(mapping.context, 'mapping', mapping.manifest);
    assertCaptureContextMatches(layout.context, 'layout', layout.layout.environment, layout.layout.viewport);
    if (mapping.tokenEvidence.format !== 'obsidian-ui-token-evidence' || mapping.tokenEvidence.version !== 1
      || mapping.tokenEvidence.mode !== mode
      || JSON.stringify(mapping.tokenEvidence.environment) !== JSON.stringify(mapping.manifest)) {
      throw new Error(`${mode} token evidence does not match its Mapping capture`);
    }
    if (!mapping.tokenEvidence.coverage || !Array.isArray(mapping.tokenEvidence.coverage.unreadableSheets)
      || !mapping.tokenEvidence.tokens || typeof mapping.tokenEvidence.tokens !== 'object') {
      throw new Error(`${mode} token evidence is incomplete`);
    }
    if (layout.layout.experimentalFormat !== LAYOUT_MODEL || !layout.layout.probeSuite) {
      throw new Error(`${mode} Layout Lab model or suite is unsupported`);
    }
  }
  return verified;
}

/** Validate four existing exports, then retain their evidence without resolving CSS or re-inferring layout. */
export function assembleFigmaPackageV2(input: FigmaPackageV2Input): FigmaPackageV2 {
  const verified = validateSources(input);
  if (!Number.isFinite(Date.parse(input.assembledAt)) || new Date(input.assembledAt).toISOString() !== input.assembledAt) {
    throw new Error('Package assembly time must be an ISO UTC timestamp');
  }
  const componentKeys = {} as Record<Mode, Set<string>>;
  const observationKeys = {} as Record<Mode, Set<string>>;
  for (const mode of MODES) {
    const { mapping, layout } = input[mode];
    componentKeys[mode] = uniqueKeys(mapping.components, componentKey, `${mode} Mapping specimens`);
    observationKeys[mode] = uniqueKeys(layout.layout.observations, observationKey, `${mode} Layout observations`);
    for (const observation of layout.layout.observations) {
      if (!componentKeys[mode].has(componentKey(observation))) {
        throw new Error(`${mode} Layout observation has no Mapping specimen: ${componentKey(observation)}`);
      }
    }
  }
  assertSameKeys(componentKeys.dark, componentKeys.light, 'Mapping specimen identities');
  assertSameKeys(observationKeys.dark, observationKeys.light, 'Layout observation identities');
  if (JSON.stringify(input.dark.layout.layout.probeSuite) !== JSON.stringify(input.light.layout.layout.probeSuite)) {
    throw new Error('Layout probe suites differ between dark and light');
  }
  const sourceLayout = input[input.inferenceSourceMode].layout.layout;
  const inferenceKeys = uniqueKeys(sourceLayout.inferences, componentKey, 'Selected Layout inferences');
  for (const key of inferenceKeys) {
    if (!componentKeys[input.inferenceSourceMode].has(key)
      || !sourceLayout.observations.some((observation) => componentKey(observation) === key)) {
      throw new Error(`Selected Layout inference has no matching observation: ${key}`);
    }
  }

  const first = input.dark.mapping.context.environment;
  const manifest: MultiModePackageManifest = {
    schemaVersion: '0.5.0', modes: ['dark', 'light'], assembledAt: input.assembledAt,
    sources: {
      dark: { mapping: input.dark.mapping.context, layout: input.dark.layout.context },
      light: { mapping: input.light.mapping.context, layout: input.light.layout.context },
    },
    technicalContext: {
      status: verified.technicalContext, buildSha256: verified.buildSha256,
      viewport: verified.viewport, obsidianVersion: first.obsidianVersion,
      obsidianSdkVersion: first.obsidianSdkVersion, sourceSchemaVersion: first.schemaVersion,
      platform: first.platform,
    },
    inferenceSource: verified.inferenceSource,
  };
  const names = [...new Set([
    ...Object.keys(input.dark.mapping.tokenEvidence.tokens),
    ...Object.keys(input.light.mapping.tokenEvidence.tokens),
  ])].sort((a, b) => a.localeCompare(b));
  const tokens: MultiModeTokens = {
    scopes: ['html', 'body'],
    coverage: {
      dark: input.dark.mapping.tokenEvidence.coverage,
      light: input.light.mapping.tokenEvidence.coverage,
    },
    tokens: Object.fromEntries(names.map((name) => [name, {
      ...(input.dark.mapping.tokenEvidence.tokens[name]
        ? { dark: input.dark.mapping.tokenEvidence.tokens[name] } : {}),
      ...(input.light.mapping.tokenEvidence.tokens[name]
        ? { light: input.light.mapping.tokenEvidence.tokens[name] } : {}),
    }])),
  };
  return {
    packageManifest: {
      format: 'obsidian-ui-figma-package', version: 2, schemaVersion: '0.5.0',
      tokenModel: 'obsidian-ui-token-evidence-1',
      componentModel: 'obsidian-ui-component-snapshot-0.4.0',
      layoutModel: LAYOUT_MODEL,
    },
    manifest,
    tokens,
    components: { dark: input.dark.mapping.components, light: input.light.mapping.components },
    layout: {
      experimentalFormat: LAYOUT_MODEL,
      probeSuite: sourceLayout.probeSuite,
      observations: {
        dark: input.dark.layout.layout.observations,
        light: input.light.layout.layout.observations,
      },
      inferences: sourceLayout.inferences,
      inferenceSource: verified.inferenceSource,
    },
  };
}

export function buildFigmaPackageV2Zip(input: FigmaPackageV2Input): Uint8Array {
  const result = assembleFigmaPackageV2(input);
  const json = (value: unknown): Uint8Array => strToU8(`${JSON.stringify(value, null, 2)}\n`);
  return zipSync({
    'package-manifest.json': json(result.packageManifest),
    'manifest.json': json(result.manifest),
    'tokens.json': json(result.tokens),
    'components.json': json(result.components),
    'layout.json': json(result.layout),
  }, { level: 6 });
}
