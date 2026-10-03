import { strFromU8, unzipSync } from 'fflate';
import { readButtonImport } from './button-data';
import { readSearchImport } from './search-data';
import { isTypographyLayoutModel } from './layout-model';

const REQUIRED_FILES = [
  'package-manifest.json', 'manifest.json', 'components.json', 'tokens.json', 'layout.json',
] as const;
const MAX_ZIP_BYTES = 10 * 1024 * 1024;
const MAX_ENTRY_BYTES = 8 * 1024 * 1024;

export interface ImportedPackage {
  components: unknown;
  layout: unknown;
  mode: 'dark' | 'light';
  summary: { obsidianVersion: string; specimens: number; tokens: number };
}

export function readFigmaPackage(bytes: Uint8Array): ImportedPackage {
  if (!bytes.length || bytes.length > MAX_ZIP_BYTES) {
    throw new Error('Figma Package inválido ou maior que 10 MB. Selecione o ZIP exportado pelo Obsidian.');
  }

  let oversized = false;
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, {
      filter: (entry) => {
        if (entry.originalSize > MAX_ENTRY_BYTES) oversized = true;
        return REQUIRED_FILES.includes(entry.name as typeof REQUIRED_FILES[number]) &&
          entry.originalSize <= MAX_ENTRY_BYTES;
      },
    });
  } catch {
    throw new Error('Figma Package inválido: não foi possível descompactar o ZIP.');
  }
  if (oversized) throw new Error('Figma Package inválido: um arquivo excede 8 MB.');
  for (const name of REQUIRED_FILES) {
    if (!files[name]) throw new Error(`Figma Package incompleto: ${name} ausente.`);
  }

  const json = (name: typeof REQUIRED_FILES[number]): unknown => {
    try { return JSON.parse(strFromU8(files[name]!)); }
    catch { throw new Error(`Figma Package inválido: ${name} não contém JSON válido.`); }
  };
  const packageManifest = object(json('package-manifest.json'), 'package-manifest.json');
  if (packageManifest.format !== 'obsidian-ui-figma-package' || packageManifest.version !== 1) {
    throw new Error('Figma Package incompatível: formato ou versão do pacote não suportados.');
  }
  const manifest = object(json('manifest.json'), 'manifest.json');
  if (manifest.schemaVersion !== '0.4.0') {
    throw new Error(`Figma Package incompatível: schema ${String(manifest.schemaVersion)}; esperado 0.4.0.`);
  }
  for (const field of ['obsidianVersion', 'obsidianSdkVersion', 'capturedAt', 'platform'] as const) {
    if (typeof manifest[field] !== 'string' || !manifest[field]) {
      throw new Error(`Figma Package inválido: manifest.json sem ${field}.`);
    }
  }
  if (manifest.mode !== 'light' && manifest.mode !== 'dark') {
    throw new Error('Figma Package inválido: modo Light/Dark não identificado.');
  }
  if (manifest.theme !== null && typeof manifest.theme !== 'string') {
    throw new Error('Figma Package inválido: theme em manifest.json.');
  }

  const components = json('components.json');
  if (!Array.isArray(components) || components.length === 0) {
    throw new Error('Figma Package inválido: components.json não contém specimens.');
  }
  const keys = new Set<string>();
  for (const item of components) {
    const component = object(item, 'components.json');
    if (typeof component.id !== 'string' || !component.id ||
        typeof component.variant !== 'string' || !component.variant) {
      throw new Error('Figma Package inválido: specimen sem id/variant.');
    }
    const key = `${component.id}/${component.variant}`;
    if (keys.has(key)) throw new Error(`Figma Package inválido: specimen duplicado ${key}.`);
    keys.add(key);
  }

  const tokens = object(json('tokens.json'), 'tokens.json');
  const tokenValues = object(tokens.values, 'tokens.json: values');
  if (!Object.keys(tokenValues).length || Object.values(tokenValues).some((value) => typeof value !== 'string')) {
    throw new Error('Figma Package inválido: tokens.json sem valores válidos.');
  }
  if (!Array.isArray(tokens.scopes) || tokens.scopes.length !== 2 ||
      tokens.scopes[0] !== 'html' || tokens.scopes[1] !== 'body') {
    throw new Error('Figma Package inválido: scopes de tokens.json incompatíveis.');
  }

  const layout = object(json('layout.json'), 'layout.json');
  if (!isTypographyLayoutModel(packageManifest.layoutModel) ||
      layout.experimentalFormat !== packageManifest.layoutModel) {
    throw new Error('Figma Package incompatível: layout model ausente ou não suportado.');
  }
  const environment = object(layout.environment, 'layout.json: environment');
  for (const field of ['schemaVersion', 'obsidianVersion', 'obsidianSdkVersion',
    'capturedAt', 'platform', 'theme', 'mode'] as const) {
    if (environment[field] !== manifest[field]) {
      throw new Error(`Figma Package inconsistente: manifest.json e layout.json diferem em ${field}.`);
    }
  }
  if (!Array.isArray(layout.observations) || !layout.observations.length ||
      !Array.isArray(layout.inferences) || !layout.inferences.length) {
    throw new Error('Figma Package inválido: medições ou inferências do Layout Lab ausentes.');
  }
  const measured = new Set<string>();
  for (const item of layout.observations) {
    const row = object(item, 'layout.json: observation');
    const key = `${String(row.id)}/${String(row.variant)}`;
    if (!keys.has(key)) throw new Error(`Figma Package inconsistente: ${key} não está no Mapping.`);
    measured.add(key);
  }
  for (const item of layout.inferences) {
    const row = object(item, 'layout.json: inference');
    const key = `${String(row.id)}/${String(row.variant)}`;
    if (!measured.has(key)) throw new Error(`Figma Package inconsistente: inferência ${key} sem medição.`);
  }

  // The proven component readers are also the preflight for required evidence.
  readButtonImport(components, layout);
  readSearchImport(components, layout);
  return { components, layout, mode: manifest.mode as 'dark' | 'light', summary: {
    obsidianVersion: manifest.obsidianVersion as string,
    specimens: components.length,
    tokens: Object.keys(tokenValues).length,
  } };
}

function object(value: unknown, source: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Figma Package inválido: ${source} deve ser um objeto.`);
  }
  return value as Record<string, unknown>;
}
