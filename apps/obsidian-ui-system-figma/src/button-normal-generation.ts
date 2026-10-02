import { createButtonComponent, loadButtonFont } from './button-component';
import type { PreparedButtonBinding } from './button-normal-binding';
import type { FigmaVariableCandidate } from './variable-projection';

type Mode = 'dark' | 'light';
const MODES = ['dark', 'light'] as const;

function literal(candidate: FigmaVariableCandidate, mode: Mode): number | RGB {
  const projected = candidate.modes[mode].projected;
  if (!projected || projected.strategy !== 'literal') throw new Error(`${candidate.cssName}/${mode}: valor ausente`);
  return projected.value;
}

function matches(actual: VariableValue, expected: number | RGB): boolean {
  if (typeof expected === 'number') return actual === expected;
  return typeof actual === 'object' && actual !== null && 'r' in actual && 'g' in actual && 'b' in actual &&
    Math.abs(actual.r - expected.r) < 1e-6 && Math.abs(actual.g - expected.g) < 1e-6 &&
    Math.abs(actual.b - expected.b) < 1e-6;
}

function checkBindings(component: ComponentNode, label: TextNode, radiusId: string,
  backgroundId: string, textColorId: string) {
  const bound = component.boundVariables ?? {};
  const corners = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'] as const;
  const cornerIds = corners.map((name) => bound[name]?.id ?? null);
  if (cornerIds.some(Boolean) ? cornerIds.some((id) => id !== radiusId) : bound.cornerRadius?.id !== radiusId) {
    throw new Error('Button normal: binding de cornerRadius ausente ou divergente');
  }
  const fills = component.fills;
  if (fills === figma.mixed || fills.length !== 1 || fills[0]?.type !== 'SOLID' ||
      fills[0].boundVariables?.color?.id !== backgroundId ||
      bound.fills?.length !== 1 || bound.fills[0]?.id !== backgroundId) {
    throw new Error('Button normal: binding do paint sólido ausente ou divergente');
  }
  const textFills = label.fills;
  if (textFills === figma.mixed || textFills.length !== 1 || textFills[0]?.type !== 'SOLID' ||
      textFills[0].boundVariables?.color?.id !== textColorId ||
      label.boundVariables?.fills?.length !== 1 ||
      label.boundVariables.fills[0]?.id !== textColorId) {
    throw new Error('Button normal: binding da cor do Label ausente ou divergente');
  }
  return { cornerRadius: bound.cornerRadius?.id ?? null,
    corners: Object.fromEntries(corners.map((name, index) => [name, cornerIds[index]])),
    paintColor: fills[0].boundVariables.color.id,
    nodeFills: bound.fills?.map((item) => item.id) ?? null,
    textPaintColor: textFills[0].boundVariables.color.id,
    textNodeFills: label.boundVariables?.fills?.map((item) => item.id) ?? null };
}

/** Creates one native Button Component, with only its confirmed normal-state bindings. */
export async function generateBoundButtonNormal(prepared: PreparedButtonBinding) {
  const { source, radius, background, textColor, evidence } = prepared;
  const font = await loadButtonFont(source.button);
  figma.ui.postMessage({ type: 'typography', text: `Typography: ${font.family} / ${font.style} ✓` });
  const collection = figma.variables.createVariableCollection(`Obsidian UI / Button Normal ${Date.now()}`);
  let component: ComponentNode | undefined;
  try {
    const darkId = collection.modes[0].modeId;
    collection.renameMode(darkId, 'Dark');
    const modeIds = { dark: darkId, light: collection.addMode('Light') };
    const radiusVariable = figma.variables.createVariable(radius.cssName, collection, 'FLOAT');
    const backgroundVariable = figma.variables.createVariable(background.cssName, collection, 'COLOR');
    const textColorVariable = figma.variables.createVariable(textColor.cssName, collection, 'COLOR');
    radiusVariable.scopes = ['CORNER_RADIUS'];
    backgroundVariable.scopes = ['FRAME_FILL'];
    textColorVariable.scopes = ['TEXT_FILL'];
    for (const [variable, candidate] of [[radiusVariable, radius], [backgroundVariable, background],
      [textColorVariable, textColor]] as const) {
      variable.description = JSON.stringify({ source: 'Package v2 + confirmed Mapping diagnostics',
        packageOrigin: evidence.origins.package,
        diagnosticOrigins: evidence.origins.diagnostics,
        binding: evidence.mappings.filter((item) => item.token === candidate.cssName),
        ...(candidate === textColor ? { projectedFrom: '--text-normal',
          reason: 'Confirmed scoped alias --text-color: var(--text-normal)' } : {}) });
      for (const mode of MODES) variable.setValueForMode(modeIds[mode], literal(candidate, mode));
    }
    const radiusReadback = await figma.variables.getVariableByIdAsync(radiusVariable.id);
    const backgroundReadback = await figma.variables.getVariableByIdAsync(backgroundVariable.id);
    const textColorReadback = await figma.variables.getVariableByIdAsync(textColorVariable.id);
    if (!radiusReadback || radiusReadback.resolvedType !== 'FLOAT' ||
        !backgroundReadback || backgroundReadback.resolvedType !== 'COLOR' ||
        !textColorReadback || textColorReadback.resolvedType !== 'COLOR') {
      throw new Error('Button normal: readback de identidade ou tipo das Variables falhou');
    }

    const baseMode = source.baseMode;
    const baseButton = { ...source.button, radius: literal(radius, baseMode) as number,
      background: literal(background, baseMode) as RGB,
      color: literal(textColor, baseMode) as RGB };
    const created = createButtonComponent(baseButton, font);
    component = created.component;
    component.name = 'Obsidian / Button / Normal';
    component.description = 'Button normal do Obsidian. Usa Variables para raio, fundo e texto, com modos Light e Dark.';
    const labelProperty = component.addComponentProperty('Label', 'TEXT', source.button.text);
    created.label.componentPropertyReferences = { characters: labelProperty };
    if (created.label.characters !== source.button.text || created.label.width <= 0 ||
        component.width < created.label.width + source.button.padding.left + source.button.padding.right - 0.5) {
      throw new Error('Button normal: a propriedade Label alterou o texto ou colapsou a largura Hug');
    }
    component.setBoundVariable('cornerRadius', radiusVariable);
    component.fills = [figma.variables.setBoundVariableForPaint(
      { type: 'SOLID', color: literal(background, baseMode) as RGB }, 'color', backgroundVariable)];
    created.label.fills = [figma.variables.setBoundVariableForPaint(
      { type: 'SOLID', color: literal(textColor, baseMode) as RGB }, 'color', textColorVariable)];
    component.setExplicitVariableModeForCollection(collection, modeIds[baseMode]);
    checkBindings(component, created.label, radiusVariable.id, backgroundVariable.id, textColorVariable.id);

    const nextX = figma.currentPage.children.filter((node) => node !== component)
      .map((node) => node.absoluteBoundingBox).filter((bounds): bounds is Rect => bounds !== null)
      .reduce((right, bounds) => Math.max(right, bounds.x + bounds.width), 0);
    component.x = nextX + 64;
    component.y = 0;

    const readback = [];
    for (const mode of ['dark', 'light', 'dark'] as const) {
      component.setExplicitVariableModeForCollection(collection, modeIds[mode]);
      if (component.resolvedVariableModes[collection.id] !== modeIds[mode]) {
        throw new Error(`Button normal: mode ${mode} não aplicado`);
      }
      const bindings = checkBindings(component, created.label, radiusVariable.id,
        backgroundVariable.id, textColorVariable.id);
      const radiusValue = radiusReadback.resolveForConsumer(component).value;
      const backgroundValue = backgroundReadback.resolveForConsumer(component).value;
      const textColorValue = textColorReadback.resolveForConsumer(created.label).value;
      if (!matches(radiusValue, literal(radius, mode)) ||
          !matches(backgroundValue, literal(background, mode)) ||
          !matches(textColorValue, literal(textColor, mode))) {
        throw new Error(`Button normal: resolução de Variables divergente no mode ${mode}`);
      }
      readback.push({ mode, bindings, radius: radiusValue, background: backgroundValue,
        textColor: textColorValue });
    }
    component.setExplicitVariableModeForCollection(collection, modeIds[baseMode]);
    figma.currentPage.selection = [component];
    figma.viewport.scrollAndZoomIntoView([component]);
    return { componentId: component.id, collectionId: collection.id,
      variableIds: { radius: radiusVariable.id, background: backgroundVariable.id,
        textColor: textColorVariable.id },
      baseMode, readback };
  } catch (error) {
    if (component && !component.removed) component.remove();
    collection.remove();
    throw error;
  }
}
