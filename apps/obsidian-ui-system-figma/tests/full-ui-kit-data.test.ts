import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { readFigmaPackage } from '../src/package-data';
import { validateIncludedEvidence } from '../src/full-ui-kit-generation';
import { readPublicApiEvidence } from '../src/public-api-batch-data';

test('one Package v1 and the included probes preflight the complete Dark kit', () => {
  const bytes = readFileSync(join(process.cwd(),
    'tests/fixtures/obsidian-ui-package-2026-10-01T12-12-18-735Z.zip'));
  const input = readFigmaPackage(bytes);
  assert.ok(input.summary.specimens >= 2);
  assert.doesNotThrow(validateIncludedEvidence);
  assert.equal(readPublicApiEvidence(input.components).size, 59);
});
