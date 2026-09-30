import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { compareExports, renderMarkdown, type AtlasExport, type DomNode, type Specimen } from './snapshot-diff.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === 'string');
}

function isProperties(value: unknown): value is Record<string, string | boolean> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === 'string' || typeof item === 'boolean');
}

async function readJson(directory: string, name: string): Promise<unknown> {
  const file = path.join(directory, name);
  try {
    return JSON.parse(await readFile(file, 'utf8')) as unknown;
  } catch (error) {
    throw new Error(`Cannot read ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function isDomNode(value: unknown): value is DomNode {
  return isRecord(value)
    && typeof value.tag === 'string'
    && Array.isArray(value.classes)
    && value.classes.every((item) => typeof item === 'string')
    && (value.attributes === undefined || isStringRecord(value.attributes))
    && (value.properties === undefined || isProperties(value.properties))
    && (value.text === undefined || typeof value.text === 'string')
    && isStringRecord(value.styles)
    && isRecord(value.sizePx)
    && typeof value.sizePx.width === 'number' && Number.isFinite(value.sizePx.width)
    && typeof value.sizePx.height === 'number' && Number.isFinite(value.sizePx.height)
    && Array.isArray(value.children)
    && value.children.every(isDomNode);
}

function isSpecimen(value: unknown): value is Specimen {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.variant === 'string'
    && typeof value.name === 'string'
    && typeof value.category === 'string'
    && typeof value.origin === 'string'
    && typeof value.implementation === 'string'
    && (value.states === undefined || (isRecord(value.states)
      && typeof value.states.current === 'string'
      && Array.isArray(value.states.known)
      && value.states.known.every((item) => typeof item === 'string')))
    && isDomNode(value.dom);
}

async function readExport(directory: string): Promise<AtlasExport> {
  const [manifest, tokens, components] = await Promise.all([
    readJson(directory, 'manifest.json'),
    readJson(directory, 'tokens.json'),
    readJson(directory, 'components.json'),
  ]);
  if (!isRecord(manifest) || typeof manifest.schemaVersion !== 'string' || typeof manifest.obsidianVersion !== 'string'
    || (manifest.obsidianSdkVersion !== undefined && typeof manifest.obsidianSdkVersion !== 'string')) {
    throw new Error(`${directory}/manifest.json must contain schemaVersion and obsidianVersion strings`);
  }
  if (!isRecord(tokens) || !isStringRecord(tokens.values)
    || Object.entries(tokens.values).some(([name, value]) => !name.startsWith('--') || typeof value !== 'string')) {
    throw new Error(`${directory}/tokens.json must contain a values map of CSS custom properties`);
  }
  if (!Array.isArray(components) || !components.every(isSpecimen)) {
    throw new Error(`${directory}/components.json must contain Atlas specimens with id, variant and DOM`);
  }
  return { directory, manifest, tokens: { values: tokens.values as Record<string, string> }, components };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) {
    console.log('Usage: npm run diff:snapshots -- <before-dir> <after-dir> [output-dir]');
    return;
  }
  if (args.length < 2 || args.length > 3) {
    throw new Error('Usage: npm run diff:snapshots -- <before-dir> <after-dir> [output-dir]');
  }
  const beforeDirectory = path.resolve(args[0]!);
  const afterDirectory = path.resolve(args[1]!);
  const outputDirectory = args[2]
    ? path.resolve(args[2])
    : path.resolve('snapshot-diffs', `${path.basename(beforeDirectory)}__${path.basename(afterDirectory)}`);

  const [before, after] = await Promise.all([readExport(beforeDirectory), readExport(afterDirectory)]);
  const report = compareExports(before, after);
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeFile(path.join(outputDirectory, 'diff.json'), `${JSON.stringify(report, null, 2)}\n`),
    writeFile(path.join(outputDirectory, 'diff.md'), renderMarkdown(report)),
  ]);
  console.log(`Wrote ${path.join(outputDirectory, 'diff.json')} and diff.md`);
  console.log(`Specimens: ${JSON.stringify(report.components.counts)}; tokens: ${JSON.stringify(report.tokens.counts)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
