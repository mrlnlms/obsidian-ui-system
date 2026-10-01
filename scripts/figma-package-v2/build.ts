import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { CaptureContext, ComponentSnapshot, SnapshotManifest, TokenEvidenceCapture } from '@obsidian-ui-system/ui-schema';
import {
  buildFigmaPackageV2Zip, type FigmaPackageV2Input, type LayoutV2Source, type MappingV2Source,
} from '../../apps/obsidian-ui-mapping/src/figma-package-v2';

type Mode = 'dark' | 'light';
const REQUIRED = ['dark-mapping', 'dark-layout', 'light-mapping', 'light-layout'] as const;

function options(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!flag?.startsWith('--') || !value || value.startsWith('--')) {
      throw new Error('Expected --dark-mapping, --dark-layout, --light-mapping, --light-layout and optional --inference-source/--output');
    }
    const name = flag.slice(2);
    if (![...REQUIRED, 'inference-source', 'output'].includes(name) || result[name]) {
      throw new Error(`Unknown or repeated option: ${flag}`);
    }
    result[name] = value;
  }
  for (const name of REQUIRED) if (!result[name]) throw new Error(`Missing --${name}`);
  return result;
}

async function json<T>(folder: string, name: string): Promise<T> {
  const path = join(folder, name);
  try { return JSON.parse(await readFile(path, 'utf8')) as T; }
  catch (error) { throw new Error(`Cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`); }
}

async function mapping(folder: string): Promise<MappingV2Source> {
  const [manifest, tokenEvidence, components, context] = await Promise.all([
    json<SnapshotManifest>(folder, 'manifest.json'),
    json<TokenEvidenceCapture>(folder, 'token-evidence.json'),
    json<ComponentSnapshot[]>(folder, 'components.json'),
    json<CaptureContext>(folder, 'capture-context.json'),
  ]);
  return { manifest, tokenEvidence, components, context };
}

async function layout(folder: string): Promise<LayoutV2Source> {
  const [capture, context] = await Promise.all([
    json<LayoutV2Source['layout']>(folder, 'layout.json'),
    json<CaptureContext>(folder, 'capture-context.json'),
  ]);
  return { layout: capture, context };
}

async function main(): Promise<void> {
  const args = options(process.argv.slice(2));
  const inferenceSourceMode = args['inference-source'] ?? 'dark';
  if (inferenceSourceMode !== 'dark' && inferenceSourceMode !== 'light') {
    throw new Error('--inference-source must be dark or light');
  }
  const modes = {} as Pick<FigmaPackageV2Input, Mode>;
  for (const mode of ['dark', 'light'] as const) {
    modes[mode] = {
      mapping: await mapping(args[`${mode}-mapping`]!),
      layout: await layout(args[`${mode}-layout`]!),
    };
  }
  const assembledAt = new Date().toISOString();
  const zip = buildFigmaPackageV2Zip({ ...modes, inferenceSourceMode, assembledAt });
  const output = args.output ?? join('dev-vault', 'obsidian-ui-exports', 'figma-packages',
    `obsidian-ui-package-v2-${assembledAt.replace(/[:.]/g, '-')}.zip`);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, zip, { flag: 'wx' });
  process.stdout.write(`${output}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
