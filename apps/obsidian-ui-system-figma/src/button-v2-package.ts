import { strFromU8, unzipSync } from 'fflate';
import type { MultiModePackageManifest, MultiModeTokens, TokenMode } from '@obsidian-ui-system/ui-schema';
import { readButtonVariantImport, type ButtonData } from './button-data';

const FILES = ['package-manifest.json', 'manifest.json', 'components.json', 'tokens.json', 'layout.json'] as const;
type FileName = typeof FILES[number];
type Json = Record<string, unknown>;

export interface ButtonV2Package {
  manifest: MultiModePackageManifest;
  tokens: MultiModeTokens;
  button: ButtonData;
  baseMode: TokenMode;
  summary: { obsidianVersion: string; specimens: number; tokens: number };
}

function object(value: unknown, label: string): Json {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} inválido`);
  return value as Json;
}

function entries(bytes: Uint8Array): Record<string, Uint8Array> {
  if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw new Error('Package inválido ou maior que 10 MB');
  let oversized = false;
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, { filter: (entry) => {
      if (entry.originalSize > 8 * 1024 * 1024) oversized = true;
      return FILES.includes(entry.name as FileName) && entry.originalSize <= 8 * 1024 * 1024;
    } });
  } catch { throw new Error('Não foi possível descompactar o Figma Package'); }
  if (oversized) throw new Error('Arquivo do Package excede 8 MB');
  return files;
}

function json(files: Record<string, Uint8Array>, name: FileName): Json {
  if (!files[name]) throw new Error(`Package sem ${name}`);
  try { return object(JSON.parse(strFromU8(files[name]!)), name); }
  catch { throw new Error(`${name} inválido`); }
}

export function readPackageVersion(bytes: Uint8Array): 1 | 2 {
  const transport = json(entries(bytes), 'package-manifest.json');
  if (transport.format !== 'obsidian-ui-figma-package' ||
      (transport.version !== 1 && transport.version !== 2)) throw new Error('Versão do Figma Package não suportada');
  return transport.version;
}

/** A v2 reader limited to the evidence needed to generate the real Button normal. */
export function readButtonV2Package(bytes: Uint8Array): ButtonV2Package {
  const files = entries(bytes);
  const transport = json(files, 'package-manifest.json');
  const rawManifest = json(files, 'manifest.json');
  const components = json(files, 'components.json');
  const rawTokens = json(files, 'tokens.json');
  const layout = json(files, 'layout.json');
  if (transport.format !== 'obsidian-ui-figma-package' || transport.version !== 2 ||
      transport.schemaVersion !== '0.5.0' || transport.layoutModel !== 'mapping-layout-probes-2' ||
      transport.tokenModel !== 'obsidian-ui-token-evidence-1' ||
      transport.componentModel !== 'obsidian-ui-component-snapshot-0.4.0' ||
      rawManifest.schemaVersion !== '0.5.0' || JSON.stringify(rawManifest.modes) !== '["dark","light"]') {
    throw new Error('Esperado Package v2 multi-mode, schema 0.5.0');
  }
  const technical = object(rawManifest.technicalContext, 'technicalContext');
  if (technical.status !== 'verified' || typeof technical.buildSha256 !== 'string' ||
      !/^[0-9a-f]{64}$/i.test(technical.buildSha256) ||
      typeof technical.obsidianVersion !== 'string' || typeof technical.platform !== 'string') {
    throw new Error('Contexto técnico v2 não verificado');
  }
  const inference = object(rawManifest.inferenceSource, 'inferenceSource');
  const mode = inference.mode;
  const layoutInference = object(layout.inferenceSource, 'layout.inferenceSource');
  if ((mode !== 'dark' && mode !== 'light') ||
      layoutInference.mode !== mode || layoutInference.layoutCapturedAt !== inference.layoutCapturedAt ||
      layout.experimentalFormat !== transport.layoutModel) {
    throw new Error('Fonte de inferência do Layout Lab incompatível');
  }
  const sources = object(rawManifest.sources, 'sources');
  const source = object(sources[mode], `sources.${mode}`);
  const layoutContext = object(source.layout, `${mode}.layout`);
  const environment = object(layoutContext.environment, `${mode}.layout.environment`);
  if (environment.mode !== mode || environment.platform !== technical.platform ||
      environment.capturedAt !== inference.layoutCapturedAt) {
    throw new Error('Contexto do Layout Lab incompatível');
  }
  const tokenRows = object(rawTokens.tokens, 'tokens.json: tokens');
  if (JSON.stringify(rawTokens.scopes) !== '["html","body"]') throw new Error('Escopos de tokens incompatíveis');
  for (const appearance of ['dark', 'light'] as const) {
    const rows = components[appearance];
    if (!Array.isArray(rows) || rows.filter((item) => item && item.id === 'obsidian.button' &&
        item.variant === 'normal').length !== 1) {
      throw new Error(`Button normal: specimen ${appearance} ausente ou duplicado`);
    }
  }
  const specimens = components[mode];
  const observations = object(layout.observations, 'layout.observations')[mode];
  if (!Array.isArray(specimens) || !Array.isArray(observations) || !Array.isArray(layout.inferences)) {
    throw new Error('Button normal: specimens ou Layout Lab ausentes');
  }
  const button = readButtonVariantImport(specimens, {
    experimentalFormat: layout.experimentalFormat, environment,
    observations, inferences: layout.inferences,
  }, 'normal', { styleConsistency: 'structural', boundProperties: true });
  return {
    manifest: rawManifest as unknown as MultiModePackageManifest,
    tokens: rawTokens as unknown as MultiModeTokens,
    button, baseMode: mode,
    summary: { obsidianVersion: technical.obsidianVersion, specimens: specimens.length,
      tokens: Object.keys(tokenRows).length },
  };
}
