import type { DataAdapter } from 'obsidian';
import { ensureDirectory, FIGMA_PACKAGE_ROOT, PACKAGE_FAILURE_ROOT, PACKAGE_STAGING_ROOT } from './export-paths';

export type PackageStage = 'cleanup-orphans' | 'capture-mapping' | 'capture-layout' | 'validate-package' | 'publish-package';
export type PackageCapture = (capturedAt: string, setStage: (stage: PackageStage) => void) => Promise<Uint8Array>;

const OWN_STAGING_FILE = /^obsidian-ui-package-staging-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-z0-9]{8}\.zip\.partial$/;
const LEGACY_PARTIAL_FILE = /^obsidian-ui-package-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z(?:-\d+)?\.zip\.partial$/;

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function removeOwnedPartials(adapter: DataAdapter, root: string, pattern: RegExp): Promise<void> {
  if (!(await adapter.exists(root))) return;
  const { files } = await adapter.list(root);
  for (const path of files) {
    if (!path.startsWith(`${root}/`)) throw new Error(`Unexpected package staging path: ${path}`);
    if (pattern.test(path.slice(root.length + 1))) await adapter.remove(path);
  }
}

/** Only package-owned partial names are eligible; finished ZIPs and failure records remain intact. */
export async function removeOrphanedPackagePartials(adapter: DataAdapter): Promise<void> {
  await removeOwnedPartials(adapter, PACKAGE_STAGING_ROOT, OWN_STAGING_FILE);
  await removeOwnedPartials(adapter, FIGMA_PACKAGE_ROOT, LEGACY_PARTIAL_FILE);
}

async function recordFailure(
  adapter: DataAdapter, runId: string, stage: PackageStage, error: unknown, stagingCleanupError?: unknown,
): Promise<string> {
  await ensureDirectory(adapter, PACKAGE_FAILURE_ROOT);
  const path = `${PACKAGE_FAILURE_ROOT}/${runId}.json`;
  const diagnostic = {
    format: 'obsidian-ui-package-failure',
    version: 1,
    runId,
    failedAt: new Date().toISOString(),
    stage,
    error: {
      name: error instanceof Error ? error.name : 'Error',
      message: messageOf(error).slice(0, 1000),
      ...(error instanceof Error && error.stack ? { stack: error.stack.slice(0, 2000) } : {}),
    },
    ...(stagingCleanupError ? { stagingCleanupError: messageOf(stagingCleanupError).slice(0, 500) } : {}),
  };
  await adapter.write(path, `${JSON.stringify(diagnostic, null, 2)}\n`);
  return path;
}

/** One run owns its staging file, final ZIP and failure record. Capture data stays in memory. */
export async function runFigmaPackageLifecycle(adapter: DataAdapter, capture: PackageCapture): Promise<string> {
  const capturedAt = new Date().toISOString();
  const runId = `${capturedAt.replace(/[:.]/g, '-')}-${Math.random().toString(36).slice(2, 10).padEnd(8, '0')}`;
  const stagingPath = `${PACKAGE_STAGING_ROOT}/obsidian-ui-package-staging-${runId}.zip.partial`;
  let stage: PackageStage = 'cleanup-orphans';
  try {
    await removeOrphanedPackagePartials(adapter);
    stage = 'capture-mapping';
    const zip = await capture(capturedAt, (next) => { stage = next; });
    stage = 'publish-package';
    await ensureDirectory(adapter, PACKAGE_STAGING_ROOT);
    await ensureDirectory(adapter, FIGMA_PACKAGE_ROOT);
    const base = `obsidian-ui-package-${capturedAt.replace(/[:.]/g, '-')}`;
    let finalPath = `${FIGMA_PACKAGE_ROOT}/${base}.zip`;
    for (let suffix = 2; await adapter.exists(finalPath); suffix++) finalPath = `${FIGMA_PACKAGE_ROOT}/${base}-${suffix}.zip`;
    const binary = new Uint8Array(zip.length);
    binary.set(zip);
    await adapter.writeBinary(stagingPath, binary.buffer);
    await adapter.rename(stagingPath, finalPath);
    return finalPath;
  } catch (error) {
    let stagingCleanupError: unknown;
    try {
      if (await adapter.exists(stagingPath)) await adapter.remove(stagingPath);
    } catch (cleanupError) {
      stagingCleanupError = cleanupError;
    }
    let diagnosticPath: string;
    try {
      diagnosticPath = await recordFailure(adapter, runId, stage, error, stagingCleanupError);
    } catch (diagnosticError) {
      throw new Error(`${messageOf(error)}; could not save package failure diagnostic: ${messageOf(diagnosticError)}`);
    }
    throw new Error(`${messageOf(error)}. Package failure diagnostic: ${diagnosticPath}`);
  }
}
