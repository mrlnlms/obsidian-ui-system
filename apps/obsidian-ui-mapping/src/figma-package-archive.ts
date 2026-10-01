import { strToU8, zipSync } from 'fflate';
import type { ComponentSnapshot, SnapshotManifest, TokensSnapshot } from '@obsidian-ui-system/ui-schema';
import type { LayoutObservation } from './layout-capture';
import type { LayoutInference } from './layout-inference';

export interface FigmaPackageInput {
  manifest: SnapshotManifest;
  components: ComponentSnapshot[];
  tokens: TokensSnapshot;
  layout: {
    experimentalFormat: string;
    environment: SnapshotManifest;
    observations: LayoutObservation[];
    inferences: LayoutInference[];
    [key: string]: unknown;
  };
}

const keyOf = (item: { id: string; variant: string }): string => `${item.id}/${item.variant}`;

/** Validate relationship and completeness before any bytes reach the vault. */
export function validateFigmaPackage(input: FigmaPackageInput, expectedComponents: readonly string[]): void {
  const { manifest, components, tokens, layout } = input;
  if (manifest.mode === 'unknown') throw new Error('Obsidian theme mode could not be determined');
  if (JSON.stringify(layout.environment) !== JSON.stringify(manifest)) {
    throw new Error('Mapping and Layout Lab environments differ; package was not created');
  }
  if (!layout.experimentalFormat || !layout.observations.length || !layout.inferences.length) {
    throw new Error('Layout Lab measurements or inference are missing');
  }
  if (!components.length || !Object.keys(tokens.values).length) {
    throw new Error('Mapping components or tokens are missing');
  }
  const actual = components.map(keyOf);
  const actualSet = new Set(actual);
  if (actualSet.size !== actual.length || actualSet.size !== expectedComponents.length
    || expectedComponents.some((key) => !actualSet.has(key))) {
    throw new Error('Mapping capture does not contain the complete canonical registry');
  }
  if (layout.observations.some((item) => !actualSet.has(keyOf(item)))) {
    throw new Error('Layout Lab contains a specimen absent from the Mapping capture');
  }
  const measured = new Set(layout.observations.map(keyOf));
  if (layout.inferences.some((item) => !measured.has(keyOf(item)))) {
    throw new Error('Layout inference has no matching measurement');
  }
}

export function buildFigmaPackageZip(input: FigmaPackageInput, expectedComponents: readonly string[]): Uint8Array {
  validateFigmaPackage(input, expectedComponents);
  const packageManifest = {
    format: 'obsidian-ui-figma-package',
    version: 1,
    layoutModel: input.layout.experimentalFormat,
    // Runtime, SDK, schema, mode and timestamp live in manifest.json only.
  };
  const json = (value: unknown): Uint8Array => strToU8(`${JSON.stringify(value, null, 2)}\n`);
  return zipSync({
    'manifest.json': json(input.manifest),
    'components.json': json(input.components),
    'tokens.json': json(input.tokens),
    'layout.json': json(input.layout),
    'package-manifest.json': json(packageManifest),
  }, { level: 6 });
}
