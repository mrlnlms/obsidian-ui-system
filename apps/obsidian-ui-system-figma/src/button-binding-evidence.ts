import type { TokenMode } from '@obsidian-ui-system/ui-schema';
import type { ButtonV2Package } from './button-v2-package';

type Json = Record<string, unknown>;
type Property = 'border-radius' | 'background-color' | 'color';
const MODES = ['dark', 'light'] as const;
const TARGETS: ReadonlyArray<{ property: Property; token: string }> = [
  { property: 'border-radius', token: '--button-radius' },
  { property: 'background-color', token: '--interactive-normal' },
  { property: 'color', token: '--text-color' },
];

export interface DiagnosticInput { filename: string; data: unknown }
export interface ButtonBindingMapping {
  specimen: 'obsidian.button'; variant: 'normal'; element: 'root';
  property: Property; mode: TokenMode; token: string; status: 'confirmed';
  diagnosticOrigin: string;
}

function object(value: unknown, label: string): Json {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label}: objeto ausente ou inválido`);
  return value as Json;
}

function string(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value) throw new Error(`${label}: texto ausente`);
  return value;
}

function technicalContext(input: DiagnosticInput) {
  const diagnostic = object(input.data, input.filename);
  if (diagnostic.format !== 'obsidian-ui-binding-diagnostic' || diagnostic.version !== 1 ||
      !MODES.includes(diagnostic.mode as TokenMode)) throw new Error(`${input.filename}: formato ou mode inválido`);
  const mode = diagnostic.mode as TokenMode;
  const capturedAt = string(diagnostic.capturedAt, `${mode}.capturedAt`);
  const context = object(diagnostic.context, `${mode}.context`);
  const environment = object(context.environment, `${mode}.environment`);
  const build = object(context.pluginBuild, `${mode}.pluginBuild`);
  const buildSha256 = string(build.sha256, `${mode}.build.sha256`);
  const buildPath = string(build.path, `${mode}.build.path`);
  const viewport = object(context.viewport, `${mode}.viewport`);
  if (context.format !== 'obsidian-ui-capture-context' || context.version !== 1 || context.kind !== 'mapping' ||
      environment.mode !== mode || environment.capturedAt !== capturedAt || build.algorithm !== 'SHA-256' ||
      !/^[0-9a-f]{64}$/i.test(buildSha256)) {
    throw new Error(`${mode}: contexto do diagnóstico inválido`);
  }
  return { input, diagnostic, mode, capturedAt, environment, buildSha256, buildPath, viewport };
}

/** The generator reuses confirmed identities without requiring capture-specific computed values. */
export function deriveButtonBindingEvidence(
  source: Pick<ButtonV2Package, 'manifest' | 'tokens'>, inputs: DiagnosticInput[],
) {
  if (inputs.length !== 2) throw new Error('Selecione exatamente os diagnósticos Dark e Light');
  const diagnostics = inputs.map(technicalContext);
  const byMode = Object.fromEntries(diagnostics.map((item) => [item.mode, item])) as
    Record<TokenMode, ReturnType<typeof technicalContext>>;
  if (!byMode.dark || !byMode.light || diagnostics[0]!.mode === diagnostics[1]!.mode) {
    throw new Error('Diagnósticos devem conter um Dark e um Light');
  }
  const packageContext = source.manifest.technicalContext;
  const keys = ['schemaVersion', 'obsidianVersion', 'obsidianSdkVersion', 'platform'] as const;
  const viewportKeys = ['widthPx', 'heightPx', 'devicePixelRatio'] as const;
  for (const mode of MODES) {
    const current = byMode[mode];
    for (let index = 0; index < keys.length; index++) {
      const value = current.environment[keys[index]!];
      if (value === undefined || value !== byMode.dark.environment[keys[index]!]) {
        throw new Error(`${mode}: contexto técnico difere entre diagnósticos`);
      }
    }
    for (const key of viewportKeys) {
      const value = current.viewport[key];
      if (typeof value !== 'number' || value !== byMode.dark.viewport[key]) {
        throw new Error(`${mode}: viewport/DPR difere entre diagnósticos`);
      }
    }
    if (current.buildSha256 !== byMode.dark.buildSha256 || current.buildPath !== byMode.dark.buildPath) {
      throw new Error('Diagnósticos usam builds diferentes');
    }
  }
  const mappings: ButtonBindingMapping[] = [];
  for (const mode of MODES) {
    const { diagnostic, input } = byMode[mode];
    if (!Array.isArray(diagnostic.results)) throw new Error(`${mode}: resultados ausentes`);
    for (const { property, token } of TARGETS) {
      const matches = diagnostic.results.filter((value) => {
        if (!value || typeof value !== 'object') return false;
        const row = value as Json;
        return row.specimen === 'obsidian.button' && row.variant === 'normal' &&
          row.element === 'root' && row.property === property;
      });
      if (matches.length !== 1) throw new Error(`${mode}/${property}: resultado ausente ou duplicado`);
      const result = object(matches[0], `${mode}/${property}`);
      const verification = object(result.verification, `${mode}/${property}.verification`);
      if (result.status !== 'confirmed' || result.tokenCandidate !== token ||
          typeof result.originalComputed !== 'string' || !result.originalComputed ||
          verification.matchedWitness !== true || verification.restoredExactly !== true ||
          verification.original !== result.originalComputed || verification.restored !== result.originalComputed ||
          verification.inlineRestored !== true) throw new Error(`${mode}/${property}: testemunha ou restauração não confirmada`);
      if (!Array.isArray(result.candidates) || !Array.isArray(result.unreadableSheets) ||
          result.unreadableSheets.length || !Array.isArray(result.competingProbes) ||
          result.competingProbes.some((probe) => {
            const row = object(probe, 'competingProbe');
            return row.matchedWitness === true || row.restoredExactly !== true;
          })) {
        throw new Error(`${mode}/${property}: cobertura ou atribuição ambígua`);
      }
      const applicable = result.candidates.map((item) => object(item, 'candidate'))
        .filter((item) => item.applicable === 'yes');
      if (result.candidates.some((item) => object(item, 'candidate').applicable === 'unknown') ||
          !applicable.some((item) => (property === 'background-color'
            ? item.property === 'background-color' || item.property === 'background' : item.property === property) &&
            item.rawValue === `var(${token})` && Array.isArray(item.references) && item.references.length === 1 &&
            object(item.references[0], 'reference').name === token &&
            object(item.references[0], 'reference').role === 'whole-value' &&
            object(item.references[0], 'reference').fallback === null)) {
        throw new Error(`${mode}/${property}: referência CSSOM direta ausente ou ambígua`);
      }
      if (property === 'color') {
        const alias = object(result.alias, `${mode}/color.alias`);
        const response = object(alias.verification, `${mode}/color.alias.verification`);
        if (alias.status !== 'confirmed' || alias.token !== '--text-color' ||
            alias.targetToken !== '--text-normal' || response.matchedWitness !== true ||
            response.restoredExactly !== true || response.inlineRestored !== true ||
            response.original !== result.originalComputed || response.restored !== result.originalComputed ||
            !Array.isArray(alias.unreadableSheets) || alias.unreadableSheets.length ||
            !Array.isArray(alias.candidates) || alias.candidates.length === 0 ||
            alias.candidates.some((item) => {
              const row = object(item, 'alias candidate');
              return row.applicable !== 'yes' || row.property !== '--text-color' ||
                row.rawValue !== 'var(--text-normal)' || !Array.isArray(row.references) ||
                row.references.length !== 1 ||
                object(row.references[0], 'alias reference').name !== '--text-normal' ||
                object(row.references[0], 'alias reference').role !== 'whole-value' ||
                object(row.references[0], 'alias reference').fallback !== null;
            })) throw new Error(`${mode}/color: alias causal --text-color → --text-normal não confirmado`);
      }
      mappings.push({ specimen: 'obsidian.button', variant: 'normal', element: 'root',
        property, mode, token, status: 'confirmed', diagnosticOrigin: input.filename });
    }
  }
  return {
    mappings,
    origins: {
      package: { assembledAt: source.manifest.assembledAt,
        buildSha256: packageContext.buildSha256,
        mappingCapturedAt: Object.fromEntries(MODES.map((mode) =>
          [mode, source.manifest.sources[mode].mapping.environment.capturedAt])) },
      diagnostics: {
        dark: { filename: byMode.dark.input.filename, capturedAt: byMode.dark.capturedAt,
          buildSha256: byMode.dark.buildSha256 },
        light: { filename: byMode.light.input.filename, capturedAt: byMode.light.capturedAt,
          buildSha256: byMode.light.buildSha256 },
      },
    },
  };
}
