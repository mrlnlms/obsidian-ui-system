import type { FigmaVariableCandidate, ProjectedValue } from './variable-projection';
import type { deriveBindingPilotEvidence } from './binding-pilot-evidence';

type Evidence = ReturnType<typeof deriveBindingPilotEvidence>;
const MODES = ['dark', 'light'] as const;

function literal(candidate: FigmaVariableCandidate, mode: 'dark' | 'light'): number | RGB {
  const projected = candidate.modes[mode].projected;
  if (!projected || projected.strategy !== 'literal') throw new Error(`Valor literal ausente: ${candidate.cssName}/${mode}`);
  return projected.value;
}

function sameValue(actual: VariableValue, expected: ProjectedValue): boolean {
  if (expected.strategy !== 'literal') return false;
  if (typeof expected.value === 'number') return actual === expected.value;
  return typeof actual === 'object' && actual !== null && 'r' in actual && 'g' in actual && 'b' in actual &&
    Math.abs(actual.r - expected.value.r) < 1e-6 &&
    Math.abs(actual.g - expected.value.g) < 1e-6 &&
    Math.abs(actual.b - expected.value.b) < 1e-6;
}

function bindingIds(frame: FrameNode, radiusId: string, colorId: string) {
  const bindings = frame.boundVariables ?? {};
  const radius = bindings.cornerRadius?.id;
  const corners = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'] as const;
  const cornerIds = Object.fromEntries(corners.map((corner) => [corner, bindings[corner]?.id ?? null]));
  const hasCornerEntries = corners.some((corner) => cornerIds[corner] !== null);
  if ((hasCornerEntries && !corners.every((corner) => cornerIds[corner] === radiusId)) ||
      (!hasCornerEntries && radius !== radiusId)) {
    throw new Error('Binding de cornerRadius não foi lido no frame');
  }
  const fills = frame.fills;
  if (fills === figma.mixed || fills.length !== 1 || fills[0]?.type !== 'SOLID') {
    throw new Error('Fill sólido do Button probe ausente');
  }
  const paintColor = fills[0].boundVariables?.color?.id ?? null;
  if (paintColor !== colorId) throw new Error('Binding de cor não foi lido no paint');
  const nodeFills = bindings.fills?.map((alias) => alias.id) ?? null;
  return { cornerRadius: radius ?? null, corners: cornerIds, paintColor, nodeFills };
}

/** Creates one disposable probe after all evidence has passed the pure preflight. */
export async function createBoundButtonPilot(
  candidates: FigmaVariableCandidate[], evidence: Evidence, packageFilename: string) {
  if (candidates.length !== 2 || candidates[0]?.cssName !== '--button-radius' ||
      candidates[1]?.cssName !== '--interactive-normal') throw new Error('Seleção de dois tokens inválida');
  const packageOrigin = { filename: packageFilename, ...evidence.origins.package };
  const collection = figma.variables.createVariableCollection(`Obsidian UI / Button Binding Pilot ${Date.now()}`);
  let frame: FrameNode | undefined;
  try {
    const darkId = collection.modes[0].modeId;
    collection.renameMode(darkId, 'Dark');
    const lightId = collection.addMode('Light');
    const ids = { dark: darkId, light: lightId };
    const variables = {} as Record<string, Variable>;
    const descriptions = {} as Record<string, string>;
    for (const entry of candidates) {
      if (!entry.figmaType) throw new Error(`Tipo ausente: ${entry.cssName}`);
      const variable = figma.variables.createVariable(entry.cssName, collection, entry.figmaType);
      const description = JSON.stringify({ packageOrigin, diagnosticOrigins: evidence.origins.diagnostics,
        binding: evidence.mappings.filter((mapping) => mapping.token === entry.cssName),
        cssByMode: { dark: entry.modes.dark.computedCss, light: entry.modes.light.computedCss } });
      variable.description = description;
      for (const mode of MODES) variable.setValueForMode(ids[mode], literal(entry, mode));
      variables[entry.cssName] = variable;
      descriptions[entry.cssName] = description;
    }
    const radius = variables['--button-radius']!;
    const background = variables['--interactive-normal']!;
    frame = figma.createFrame();
    frame.name = `Button normal binding probe / pkg ${packageOrigin.buildSha256.slice(0, 8)} / diag ${evidence.origins.diagnostics.dark.buildSha256.slice(0, 8)}`;
    frame.resize(120, 32);
    frame.cornerRadius = 8;
    frame.setBoundVariable('cornerRadius', radius);
    const color = literal(candidates[1]!, 'dark') as RGB;
    const paint = figma.variables.setBoundVariableForPaint({ type: 'SOLID', color }, 'color', background);
    frame.fills = [paint];
    figma.currentPage.selection = [frame];
    figma.viewport.scrollAndZoomIntoView([frame]);

    const radiusReadback = await figma.variables.getVariableByIdAsync(radius.id);
    const colorReadback = await figma.variables.getVariableByIdAsync(background.id);
    if (!radiusReadback || radiusReadback.resolvedType !== 'FLOAT' ||
        radiusReadback.description !== descriptions['--button-radius'] ||
        !colorReadback || colorReadback.resolvedType !== 'COLOR' ||
        colorReadback.description !== descriptions['--interactive-normal']) {
      throw new Error('Readback de identidade, tipo ou descrição das Variables falhou');
    }

    const readback = [];
    for (const mode of ['dark', 'light', 'dark'] as const) {
      frame.setExplicitVariableModeForCollection(collection, ids[mode]);
      const resolvedModeId = frame.resolvedVariableModes[collection.id];
      if (resolvedModeId !== ids[mode]) throw new Error(`Mode não aplicado no frame: ${mode}`);
      const bindings = bindingIds(frame, radius.id, background.id);
      const resolvedRadius = radiusReadback.resolveForConsumer(frame);
      const resolvedColor = colorReadback.resolveForConsumer(frame);
      if (!sameValue(resolvedRadius.value, candidates[0]!.modes[mode].projected!) ||
          !sameValue(resolvedColor.value, candidates[1]!.modes[mode].projected!)) {
        throw new Error(`Resolução de Variable divergente: ${mode}`);
      }
      readback.push({ mode, resolvedModeId, storedBindings: bindings,
        storedValues: { radius: radiusReadback.valuesByMode[ids[mode]], background: colorReadback.valuesByMode[ids[mode]] },
        resolvedValues: { radius: resolvedRadius.value, background: resolvedColor.value },
        visualObservation: 'Confirmar no Figma Desktop; a API não expõe a cor final rasterizada do fill' });
    }
    return { collectionId: collection.id, collectionName: collection.name, frameId: frame.id,
      frameName: frame.name, variableIds: { radius: radius.id, background: background.id },
      origins: { package: packageOrigin, diagnostics: evidence.origins.diagnostics },
      mappings: evidence.mappings, readback };
  } catch (error) {
    if (frame && !frame.removed) frame.remove();
    collection.remove();
    throw error;
  }
}
