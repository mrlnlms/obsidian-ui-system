import { projectFigmaVariableCandidates, pilotCandidates, type FigmaVariableCandidate,
  type ProjectedValue } from './variable-projection';
import { readVariablesPilotPackage, type VariablesPilotPackage } from './variables-pilot-package';

figma.showUI(__html__, { width: 460, height: 580 });

let selected: { source: VariablesPilotPackage; candidates: FigmaVariableCandidate[] } | undefined;

figma.ui.onmessage = async (message: unknown) => {
  if (!message || typeof message !== 'object' || !('type' in message)) return;
  if (message.type === 'load-v2') {
    selected = undefined;
    try {
      const bytes = 'bytes' in message && message.bytes instanceof Uint8Array ? message.bytes :
        'bytes' in message && message.bytes instanceof ArrayBuffer ? new Uint8Array(message.bytes) : null;
      if (!bytes) throw new Error('ZIP ausente');
      const source = readVariablesPilotPackage(bytes);
      const candidates = projectFigmaVariableCandidates(source.tokens);
      pilotCandidates(candidates);
      selected = { source, candidates };
      const counts = { direct: 0, 'needs-evaluation': 0, deferred: 0, omit: 0 };
      for (const entry of candidates) counts[entry.decision]++;
      const accent = candidates.find((entry) => entry.cssName === '--interactive-accent');
      figma.ui.postMessage({ type: 'v2-ready', counts, buildSha256: source.manifest.technicalContext.buildSha256,
        candidates: pilotCandidates(candidates),
        expression: accent?.decision === 'needs-evaluation' ? {
          cssName: accent.cssName, dark: accent.modes.dark.computedCss, light: accent.modes.light.computedCss,
          expected: source.ctaBackground,
        } : null });
    } catch (error) {
      figma.ui.postMessage({ type: 'pilot-error', text: error instanceof Error ? error.message : String(error) });
    }
  }
  if (message.type === 'create-pilot') {
    if (!selected) {
      figma.ui.postMessage({ type: 'pilot-error', text: 'Selecione um Package v2 válido.' });
      return;
    }
    try {
      const report = await createPilot(selected.source, pilotCandidates(selected.candidates));
      figma.ui.postMessage({ type: 'pilot-done', report });
    } catch (error) {
      figma.ui.postMessage({ type: 'pilot-error', text: error instanceof Error ? error.message : String(error) });
    }
  }
};

function sameValue(actual: VariableValue | undefined, expected: ProjectedValue, targetId?: string): boolean {
  if (expected.strategy === 'alias') {
    return !!actual && typeof actual === 'object' && 'type' in actual &&
      actual.type === 'VARIABLE_ALIAS' && actual.id === targetId;
  }
  if (typeof expected.value === 'number') return actual === expected.value;
  return !!actual && typeof actual === 'object' && 'r' in actual && 'g' in actual && 'b' in actual &&
    Math.abs(actual.r - expected.value.r) < 1e-6 &&
    Math.abs(actual.g - expected.value.g) < 1e-6 &&
    Math.abs(actual.b - expected.value.b) < 1e-6;
}

async function createPilot(source: VariablesPilotPackage, candidates: FigmaVariableCandidate[]) {
  const buildSha256 = source.manifest.technicalContext.buildSha256;
  const collection = figma.variables.createVariableCollection(`Obsidian UI / Variables Pilot ${buildSha256.slice(0, 8)} ${Date.now()}`);
  let probe: FrameNode | undefined;
  try {
    const darkId = collection.modes[0].modeId;
    collection.renameMode(darkId, 'Dark');
    const lightId = collection.addMode('Light');
    const modeIds = { dark: darkId, light: lightId };
    const byName = new Map<string, Variable>();
    const descriptions = new Map<string, string>();
    for (const entry of candidates) {
      if (!entry.figmaType) throw new Error(`Tipo ausente: ${entry.cssName}`);
      const variable = figma.variables.createVariable(entry.cssName, collection, entry.figmaType);
      const description = JSON.stringify({
        source: { cssName: entry.cssName, packageVersion: 2, schemaVersion: '0.5.0',
          buildSha256, assembledAt: source.manifest.assembledAt },
        projection: { decision: entry.decision, type: entry.figmaType, reason: entry.reason },
        modes: {
          dark: { css: entry.modes.dark.computedCss, projected: entry.modes.dark.projected,
            mappingCapturedAt: source.manifest.sources.dark.mapping.environment.capturedAt },
          light: { css: entry.modes.light.computedCss, projected: entry.modes.light.projected,
            mappingCapturedAt: source.manifest.sources.light.mapping.environment.capturedAt },
        },
      });
      variable.description = description;
      descriptions.set(entry.cssName, description);
      byName.set(entry.cssName, variable);
    }
    for (const entry of candidates) for (const mode of ['dark', 'light'] as const) {
      const projected = entry.modes[mode].projected!;
      const value: VariableValue = projected.strategy === 'alias'
        ? figma.variables.createVariableAlias(byName.get(projected.targetCssName)!) : projected.value;
      byName.get(entry.cssName)!.setValueForMode(modeIds[mode], value);
    }

    probe = figma.createFrame();
    probe.name = 'Variables Pilot Readback Probe';
    const report = [];
    for (const entry of candidates) {
      const variable = await figma.variables.getVariableByIdAsync(byName.get(entry.cssName)!.id);
      if (!variable || variable.name !== entry.cssName || variable.resolvedType !== entry.figmaType ||
          variable.description !== descriptions.get(entry.cssName)) {
        throw new Error(`Readback de identidade/tipo falhou: ${entry.cssName}`);
      }
      const modes = {} as Record<'dark' | 'light', unknown>;
      for (const mode of ['dark', 'light'] as const) {
        const expected = entry.modes[mode].projected!;
        const value = variable.valuesByMode[modeIds[mode]];
        const targetId = expected.strategy === 'alias' ? byName.get(expected.targetCssName)?.id : undefined;
        if (!sameValue(value, expected, targetId)) throw new Error(`Readback de valor falhou: ${entry.cssName}/${mode}`);
        probe.setExplicitVariableModeForCollection(collection, modeIds[mode]);
        const resolved = variable.resolveForConsumer(probe);
        const ultimate = expected.strategy === 'alias'
          ? candidates.find((item) => item.cssName === expected.targetCssName)?.modes[mode].projected : expected;
        if (!ultimate || ultimate.strategy !== 'literal' ||
            !sameValue(resolved.value, ultimate)) throw new Error(`Troca de mode/alias falhou: ${entry.cssName}/${mode}`);
        modes[mode] = { css: entry.modes[mode].computedCss, stored: value,
          resolved: resolved.value, strategy: expected.strategy, modeId: modeIds[mode] };
      }
      report.push({ cssName: entry.cssName, decision: entry.decision, type: variable.resolvedType,
        variableId: variable.id, reason: entry.reason, traceability: JSON.parse(variable.description), modes });
    }
    return { collectionId: collection.id, collectionName: collection.name,
      buildSha256, tokens: report };
  } catch (error) {
    collection.remove();
    throw error;
  } finally {
    if (probe && !probe.removed) probe.remove();
  }
}
