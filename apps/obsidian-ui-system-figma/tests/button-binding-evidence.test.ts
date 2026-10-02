import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveButtonBindingEvidence } from '../src/button-binding-evidence';
import type { ButtonV2Package } from '../src/button-v2-package';

const PACKAGE_HASH = 'c'.repeat(64);
const DIAGNOSTIC_HASH = '7'.repeat(64);
const viewport = { widthPx: 1024, heightPx: 800, devicePixelRatio: 1 };

function source(): Pick<ButtonV2Package, 'manifest' | 'tokens'> {
  const mapping = (mode: string) => ({ environment: { capturedAt: `package-${mode}` } });
  return {
    manifest: {
      assembledAt: 'package-assembled',
      technicalContext: { status: 'verified', buildSha256: PACKAGE_HASH, viewport,
        obsidianVersion: '1.14.3', obsidianSdkVersion: '1.13.1', sourceSchemaVersion: '0.4.0', platform: 'macos' },
      sources: { dark: { mapping: mapping('dark') }, light: { mapping: mapping('light') } },
    },
    tokens: { tokens: {
      '--button-radius': { dark: { computed: { selected: '8px' } }, light: { computed: { selected: '8px' } } },
      '--interactive-normal': { dark: { computed: { selected: '#333333' } },
        light: { computed: { selected: '#e4e4e4' } } },
      '--text-color': { dark: { declarations: [{ selector: 'button', rawValue: 'var(--text-normal)' }] },
        light: { declarations: [{ selector: 'button', rawValue: 'var(--text-normal)' }] } },
    } },
  } as unknown as Pick<ButtonV2Package, 'manifest' | 'tokens'>;
}

function diagnostic(mode: 'dark' | 'light') {
  const capturedAt = `diagnostic-${mode}`;
  const result = (property: 'border-radius' | 'background-color' | 'color', token: string, value: string, witness: string) => ({
    specimen: 'obsidian.button', variant: 'normal', element: 'root', property, tokenCandidate: token,
    status: 'confirmed', originalComputed: value, unreadableSheets: [], competingProbes: [],
    candidates: [{ property, rawValue: `var(${token})`, applicable: 'yes',
      references: [{ name: token, role: 'whole-value', fallback: null }] }],
    verification: { original: value, witness, stimulated: witness, restored: value,
      matchedWitness: true, restoredExactly: true, inlineRestored: true },
    ...(property === 'color' ? { alias: { token: '--text-color', targetToken: '--text-normal',
      status: 'confirmed', unreadableSheets: [], candidates: [{ property: '--text-color',
        rawValue: 'var(--text-normal)', applicable: 'yes', references: [{ name: '--text-normal',
          role: 'whole-value', fallback: null }] }],
      verification: { original: value, witness, stimulated: witness, restored: value,
        matchedWitness: true, restoredExactly: true, inlineRestored: true } } } : {}),
  });
  return { filename: `${mode}.json`, data: {
    format: 'obsidian-ui-binding-diagnostic', version: 1, mode, capturedAt,
    context: { format: 'obsidian-ui-capture-context', version: 1, kind: 'mapping',
      environment: { schemaVersion: '0.4.0', obsidianVersion: '1.14.3', obsidianSdkVersion: '1.13.1',
        platform: 'macos', mode, capturedAt },
      pluginBuild: { algorithm: 'SHA-256', path: 'mapping/main.js', sha256: DIAGNOSTIC_HASH }, viewport: { ...viewport } },
    results: [result('border-radius', '--button-radius', '8px', '37px'),
      result('background-color', '--interactive-normal',
        mode === 'dark' ? 'rgb(51, 51, 51)' : 'rgb(228, 228, 228)', 'rgb(1, 253, 97)'),
      result('color', '--text-color', mode === 'dark' ? 'rgb(218, 218, 218)' : 'rgb(34, 34, 34)',
        'rgb(251, 37, 9)')],
  } };
}

function pair() { return [diagnostic('dark'), diagnostic('light')]; }

test('accepts causal evidence and retains distinct Package and diagnostic origins despite build hash difference', () => {
  const evidence = deriveButtonBindingEvidence(source(), pair());
  assert.equal(evidence.mappings.length, 6);
  assert.deepEqual(evidence.mappings.map(({ property, mode, token }) => ({ property, mode, token })), [
    { property: 'border-radius', mode: 'dark', token: '--button-radius' },
    { property: 'background-color', mode: 'dark', token: '--interactive-normal' },
    { property: 'color', mode: 'dark', token: '--text-color' },
    { property: 'border-radius', mode: 'light', token: '--button-radius' },
    { property: 'background-color', mode: 'light', token: '--interactive-normal' },
    { property: 'color', mode: 'light', token: '--text-color' },
  ]);
  assert.equal(evidence.origins.package.buildSha256, PACKAGE_HASH);
  assert.equal(evidence.origins.diagnostics.dark.buildSha256, DIAGNOSTIC_HASH);
  assert.equal(evidence.origins.package.assembledAt, 'package-assembled');
  assert.equal(evidence.origins.diagnostics.light.capturedAt, 'diagnostic-light');
});

test('unknown status, failed restoration, or value coincidence without CSSOM reference cannot bind', () => {
  const inputs = pair();
  const row = (inputs[0]!.data as ReturnType<typeof diagnostic>['data']).results[0]!;
  row.status = 'unknown';
  assert.throws(() => deriveButtonBindingEvidence(source(), inputs), /não confirmada/);
  row.status = 'confirmed';
  row.verification.restoredExactly = false;
  assert.throws(() => deriveButtonBindingEvidence(source(), inputs), /não confirmada/);
  row.verification.restoredExactly = true;
  row.candidates[0]!.rawValue = '8px';
  assert.throws(() => deriveButtonBindingEvidence(source(), inputs), /CSSOM direta ausente/);
});

test('rejects mismatched diagnostic context and repeated mode without comparing package values', () => {
  const inputs = pair();
  (inputs[1]!.data as ReturnType<typeof diagnostic>['data']).context.viewport.widthPx = 900;
  assert.throws(() => deriveButtonBindingEvidence(source(), inputs), /viewport/);
  const repeated = [diagnostic('dark'), diagnostic('dark')];
  assert.throws(() => deriveButtonBindingEvidence(source(), repeated), /Dark e um Light/);
  const values = pair();
  (values[1]!.data as ReturnType<typeof diagnostic>['data']).results[1]!.originalComputed = 'rgb(0, 0, 0)';
  (values[1]!.data as ReturnType<typeof diagnostic>['data']).results[1]!.verification.original = 'rgb(0, 0, 0)';
  (values[1]!.data as ReturnType<typeof diagnostic>['data']).results[1]!.verification.restored = 'rgb(0, 0, 0)';
  assert.equal(deriveButtonBindingEvidence(source(), values).mappings.length, 6);
});

test('requires both causal responses for the Button text color alias', () => {
  const inputs = pair();
  (inputs[1]!.data.results[2]!.alias as { status: string }).status = 'unknown';
  assert.throws(() => deriveButtonBindingEvidence(source(), inputs), /alias causal/);
});
