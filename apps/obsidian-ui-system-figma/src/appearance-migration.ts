import type { AppearanceRun } from './appearance-lifecycle';

export interface AppearanceMigrationReport {
  rebound: number;
  removed: number;
  retained: number;
  unrecognized: number;
}

function aliases(value: unknown, ids: Set<string>): void {
  if (!value || typeof value !== 'object') return;
  if ('type' in value && value.type === 'VARIABLE_ALIAS' && 'id' in value &&
      typeof value.id === 'string') {
    ids.add(value.id);
    return;
  }
  for (const item of Object.values(value)) aliases(item, ids);
}

function isKitConsumer(node: SceneNode): boolean {
  let parent: BaseNode | null = node;
  while (parent && parent.type !== 'PAGE' && parent.type !== 'DOCUMENT') {
    if ('name' in parent && typeof parent.name === 'string' &&
        (parent.name.startsWith('Obsidian /') || parent.name.startsWith('Side Panel /'))) return true;
    parent = parent.parent;
  }
  return false;
}

function sameValue(a: unknown, b: unknown, tolerance: number): boolean {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < tolerance;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  if ('r' in a && 'r' in b && 'g' in a && 'g' in b && 'b' in a && 'b' in b) {
    return ['r', 'g', 'b', 'a'].every((channel) => Math.abs(
      ((a as Record<string, number>)[channel] ?? 1) -
      ((b as Record<string, number>)[channel] ?? 1)) < tolerance);
  }
  return false;
}

/** Resolve known local aliases by mode; an unknown chain is deliberately not migrated. */
function valueInMode(variable: Variable, mode: 'Dark' | 'Light',
  byId: Map<string, Variable>, collections: Map<string, VariableCollection>,
  seen = new Set<string>()): VariableValue | undefined {
  if (seen.has(variable.id)) return undefined;
  seen.add(variable.id);
  const collection = collections.get(variable.variableCollectionId);
  const modeId = collection?.modes.find((item) => item.name === mode)?.modeId;
  if (!modeId) return undefined;
  const value = variable.valuesByMode[modeId];
  if (value && typeof value === 'object' && 'type' in value &&
      value.type === 'VARIABLE_ALIAS') {
    const target = byId.get(value.id);
    return target && valueInMode(target, mode, byId, collections, seen);
  }
  return value;
}

function equivalent(oldVariable: Variable, canonical: Variable,
  byId: Map<string, Variable>, collections: Map<string, VariableCollection>): boolean {
  // The selected underlay was observed as Oklch and converted to near-white RGB.
  const tolerance = oldVariable.name === 'tree-row/background/selected' ? 1 / 255 : 1e-5;
  return oldVariable.resolvedType === canonical.resolvedType &&
    (['Dark', 'Light'] as const).every((mode) => sameValue(
      valueInMode(oldVariable, mode, byId, collections),
      valueInMode(canonical, mode, byId, collections), tolerance));
}

function modeName(collection: VariableCollection, modeId: string | undefined): string {
  return collection.modes.find((mode) => mode.modeId ===
    (modeId ?? collection.defaultModeId))?.name ?? '';
}

function transferMode(node: PageNode | SceneNode, old: VariableCollection,
  canonical: VariableCollection): void {
  const oldMode = node.explicitVariableModes[old.id];
  if (!oldMode || node.explicitVariableModes[canonical.id]) return;
  const name = modeName(old, oldMode);
  const target = canonical.modes.find((mode) => mode.name === name);
  if (target) node.setExplicitVariableModeForCollection(canonical, target.modeId);
}

function rebindNode(node: SceneNode, replacements: Map<string, Variable>): number {
  let rebound = 0;
  for (const field of ['fills', 'strokes'] as const) {
    if (!(field in node)) continue;
    const target = node as SceneNode & { fills?: readonly Paint[] | typeof figma.mixed;
      strokes?: readonly Paint[] | typeof figma.mixed };
    const paints = target[field];
    if (!Array.isArray(paints)) continue;
    let changed = false;
    const next = paints.map((paint) => {
      const variable = paint.type === 'SOLID' && paint.boundVariables?.color
        ? replacements.get(paint.boundVariables.color.id) : undefined;
      if (!variable || paint.type !== 'SOLID') return paint;
      changed = true;
      rebound++;
      const bound = figma.variables.setBoundVariableForPaint(paint, 'color', variable);
      return { ...bound,
        ...(paint.visible === undefined ? {} : { visible: paint.visible }),
        ...(paint.opacity === undefined ? {} : { opacity: paint.opacity }),
        ...(paint.blendMode === undefined ? {} : { blendMode: paint.blendMode }) };
    });
    if (changed) (target as unknown as Record<string, readonly Paint[]>)[field] = next;
  }
  for (const field of ['cornerRadius', 'topLeftRadius', 'topRightRadius',
    'bottomLeftRadius', 'bottomRightRadius'] as const) {
    const binding = node.boundVariables?.[field];
    const variable = binding && replacements.get(binding.id);
    if (!variable) continue;
    node.setBoundVariable(field, variable);
    rebound++;
  }
  return rebound;
}

function references(node: SceneNode, ids: Set<string>): boolean {
  const found = new Set<string>();
  aliases(node.boundVariables, found);
  for (const field of ['fills', 'strokes', 'effects', 'layoutGrids'] as const) {
    if (field in node) aliases((node as unknown as Record<string, unknown>)[field], found);
  }
  return [...found].some((id) => ids.has(id));
}

/** Only recognized plugin collections are candidates; remaining references keep a duplicate alive. */
export async function reconcileAppearanceCollections(run: AppearanceRun): Promise<AppearanceMigrationReport> {
  const report: AppearanceMigrationReport = { rebound: 0, removed: 0,
    retained: 0, unrecognized: run.unrecognizedNames };
  if (!run.duplicates.length) return report;
  await figma.loadAllPagesAsync();
  const pages = figma.root.children;
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const allVariables = await figma.variables.getLocalVariablesAsync();
  const byId = new Map(allVariables.map((variable) => [variable.id, variable]));
  const byCollection = new Map(collections.map((collection) => [collection.id, collection]));
  const canonicalByName = new Map(allVariables.filter((variable) =>
    variable.variableCollectionId === run.collection.id).map((variable) => [variable.name, variable]));
  const pageNodes = pages.map((page) => ({ page, nodes: page.findAll() }));
  const styles = await Promise.all([figma.getLocalPaintStylesAsync(),
    figma.getLocalEffectStylesAsync(), figma.getLocalGridStylesAsync(),
    figma.getLocalTextStylesAsync()]);
  const canonicalIds = new Set([...canonicalByName.values()].map((variable) => variable.id));
  for (const old of run.duplicates) {
    const own = allVariables.filter((variable) => variable.variableCollectionId === old.id);
    const ownIds = new Set(own.map((variable) => variable.id));
    const replacements = new Map(own.flatMap((variable) => {
      const target = canonicalByName.get(variable.name);
      return target && equivalent(variable, target, byId, byCollection)
        ? [[variable.id, target] as const] : [];
    }));
    for (const { page, nodes } of pageNodes) {
      const eligible = new Set(nodes.filter((node) => isKitConsumer(node) && references(node, ownIds)));
      if (eligible.size && !nodes.some((node) => references(node, canonicalIds))) {
        transferMode(page, old, run.collection);
      }
      for (const node of nodes) {
        if (!eligible.has(node)) continue;
        transferMode(node, old, run.collection);
        const oldMode = modeName(old, node.resolvedVariableModes[old.id]);
        const newMode = modeName(run.collection, node.resolvedVariableModes[run.collection.id]);
        if (oldMode === newMode) report.rebound += rebindNode(node, replacements);
      }
    }
    const remaining = new Set<string>();
    for (const { page, nodes } of pageNodes) {
      aliases(page.backgrounds, remaining);
      aliases(page.prototypeBackgrounds, remaining);
      for (const node of nodes) {
        aliases(node.boundVariables, remaining);
        for (const field of ['fills', 'strokes', 'effects', 'layoutGrids'] as const) {
          if (field in node) aliases((node as unknown as Record<string, unknown>)[field], remaining);
        }
      }
    }
    for (const styleGroup of styles) for (const style of styleGroup) {
      aliases(style.boundVariables, remaining);
      for (const field of ['paints', 'effects', 'layoutGrids'] as const) {
        if (field in style) aliases((style as unknown as Record<string, unknown>)[field], remaining);
      }
    }
    const currentVariables = await figma.variables.getLocalVariablesAsync();
    for (const variable of currentVariables) if (variable.variableCollectionId !== old.id) {
      aliases(variable.valuesByMode, remaining);
    }
    if ([...remaining].some((id) => ownIds.has(id))) { report.retained++; continue; }
    for (const { page, nodes } of pageNodes) {
      if (page.explicitVariableModes[old.id]) page.clearExplicitVariableModeForCollection(old);
      for (const node of nodes) if (node.explicitVariableModes[old.id]) {
        node.clearExplicitVariableModeForCollection(old);
      }
    }
    old.remove();
    report.removed++;
  }
  return report;
}
