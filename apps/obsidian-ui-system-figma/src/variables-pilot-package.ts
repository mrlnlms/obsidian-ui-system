import { strFromU8, unzipSync } from 'fflate';
import type { MultiModePackageManifest, MultiModeTokens, TokenMode } from '@obsidian-ui-system/ui-schema';

export interface VariablesPilotPackage {
  manifest: MultiModePackageManifest;
  tokens: MultiModeTokens;
  ctaBackground: Record<TokenMode, string>;
}

const FILES = ['package-manifest.json', 'manifest.json', 'tokens.json', 'components.json'] as const;

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} inválido`);
  return value as Record<string, unknown>;
}

/** Independent v2 reader for the development pilot; the v1 importer is unchanged. */
export function readVariablesPilotPackage(bytes: Uint8Array): VariablesPilotPackage {
  if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw new Error('Package v2 inválido ou maior que 10 MB');
  let oversized = false;
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, { filter: (entry) => {
      if (entry.originalSize > 8 * 1024 * 1024) oversized = true;
      return FILES.includes(entry.name as typeof FILES[number]) && entry.originalSize <= 8 * 1024 * 1024;
    } });
  } catch { throw new Error('Não foi possível descompactar o Package v2'); }
  if (oversized) throw new Error('Arquivo do Package v2 excede 8 MB');
  for (const file of FILES) if (!files[file]) throw new Error(`Package v2 sem ${file}`);
  const parse = (file: typeof FILES[number]) => {
    try { return record(JSON.parse(strFromU8(files[file]!)), file); }
    catch { throw new Error(`${file} inválido`); }
  };
  const transport = parse('package-manifest.json');
  const manifest = parse('manifest.json');
  const tokens = parse('tokens.json');
  const components = parse('components.json');
  if (transport.format !== 'obsidian-ui-figma-package' || transport.version !== 2 ||
      transport.schemaVersion !== '0.5.0' || manifest.schemaVersion !== '0.5.0' ||
      JSON.stringify(manifest.modes) !== '["dark","light"]') {
    throw new Error('Esperado Package v2 multi-mode, schema 0.5.0');
  }
  const context = record(manifest.technicalContext, 'technicalContext');
  if (context.status !== 'verified' || typeof context.buildSha256 !== 'string' ||
      !/^[0-9a-f]{64}$/i.test(context.buildSha256)) throw new Error('Contexto técnico v2 não verificado');
  const sources = record(manifest.sources, 'sources');
  for (const mode of ['dark', 'light'] as const) {
    const mapping = record(record(sources[mode], `sources.${mode}`).mapping, `${mode}.mapping`);
    const environment = record(mapping.environment, `${mode}.mapping.environment`);
    const build = record(mapping.pluginBuild, `${mode}.mapping.pluginBuild`);
    if (environment.mode !== mode || environment.schemaVersion !== '0.4.0' ||
        typeof environment.capturedAt !== 'string' || build.sha256 !== context.buildSha256) {
      throw new Error(`Origem Mapping ${mode} incompatível com o contexto v2`);
    }
  }
  const tokenRows = record(tokens.tokens, 'tokens.json: tokens');
  if (!Array.isArray(tokens.scopes) || tokens.scopes[0] !== 'html' ||
      tokens.scopes[1] !== 'body' || !Object.keys(tokenRows).length) {
    throw new Error('Evidência de tokens v2 inválida');
  }
  const ctaBackground = {} as Record<TokenMode, string>;
  for (const mode of ['dark', 'light'] as const) {
    const snapshots = components[mode];
    if (!Array.isArray(snapshots)) throw new Error(`components.json sem ${mode}`);
    const cta = snapshots.find((item) => item?.id === 'obsidian.button' && item?.variant === 'cta');
    const styles = record(record(cta?.dom, `Button CTA ${mode}`).styles, `Button CTA styles ${mode}`);
    if (typeof styles.background !== 'string') throw new Error(`Button CTA ${mode} sem background`);
    ctaBackground[mode] = styles.background;
  }
  return { manifest: manifest as unknown as MultiModePackageManifest,
    tokens: tokens as unknown as MultiModeTokens, ctaBackground };
}
