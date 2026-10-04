import { appearanceCollectionName,
  appearanceVariableTypes, legacyNavigationCollectionName,
  requiredPrimitiveNames, legacyUiKitColorRoles, uiKitColorRoles, uiKitVariableName,
  uiKitWebSyntax } from './appearance-contract';

export interface AppearanceRun {
  collection: VariableCollection;
  modeIds: { dark: string; light: string };
  duplicates: VariableCollection[];
  unrecognizedNames: number;
  upsertVariable(name: string, type: VariableResolvedDataType): Variable;
  rollback(): void;
}

interface VariableSnapshot {
  variable: Variable;
  dark: VariableValue;
  light: VariableValue;
  scopes: VariableScope[];
  description: string;
  webSyntax?: string;
}

/** A name alone never proves ownership. Older kits lack the marker, so use their exact schema. */
export function isPluginAppearanceCollection(collection: VariableCollection,
  variables: readonly Variable[]): boolean {
  if (collection.remote || collection.isExtension ||
      ![appearanceCollectionName, legacyNavigationCollectionName].includes(collection.name) ||
      collection.modes.length !== 2 ||
      collection.modes.filter((mode) => mode.name === 'Dark').length !== 1 ||
      collection.modes.filter((mode) => mode.name === 'Light').length !== 1) return false;
  const own = variables.filter((variable) => variable.variableCollectionId === collection.id);
  if (own.length !== collection.variableIds.length ||
      new Set(own.map((variable) => variable.name)).size !== own.length ||
      !requiredPrimitiveNames.every((name) => own.some((variable) => variable.name === name))) {
    return false;
  }
  const names = new Set(own.map((variable) => variable.name));
  const priorGlobals = legacyUiKitColorRoles.map(uiKitVariableName);
  const hasPriorGlobals = priorGlobals.every((name) => names.has(name));
  if (collection.name === appearanceCollectionName && !hasPriorGlobals) return false;
  if (uiKitColorRoles.some((role) => names.has(uiKitVariableName(role))) &&
      !hasPriorGlobals) return false;
  const [dark, light] = ['Dark', 'Light'].map((name) =>
    collection.modes.find((mode) => mode.name === name)!.modeId);
  return own.every((variable) => variable.remote === false &&
    appearanceVariableTypes.get(variable.name) === variable.resolvedType &&
    variable.valuesByMode[dark!] !== undefined && variable.valuesByMode[light!] !== undefined &&
    (variable.name.startsWith('ui-kit/')
      ? variable.codeSyntax.WEB === `var(${uiKitWebSyntax[
        variable.name.slice('ui-kit/'.length) as keyof typeof uiKitWebSyntax]})`
      : variable.codeSyntax.WEB ===
        `var(--obsidian-ui-${variable.name.replace(/\//g, '-')})`));
}

/** Selects one file-wide collection and snapshots existing Variables for failure rollback. */
export async function beginAppearanceRun(): Promise<AppearanceRun> {
  const [collections, allVariables] = await Promise.all([
    figma.variables.getLocalVariableCollectionsAsync(), figma.variables.getLocalVariablesAsync(),
  ]);
  const named = collections.filter((collection) => [appearanceCollectionName,
    legacyNavigationCollectionName].includes(collection.name));
  const recognized = named.filter((collection) =>
    isPluginAppearanceCollection(collection, allVariables));
  const canonical = recognized.filter((collection) => collection.name === appearanceCollectionName)
    .sort((a, b) => b.variableIds.length - a.variableIds.length ||
      a.id.localeCompare(b.id))[0];
  const legacy = recognized.filter((collection) =>
    collection.name === legacyNavigationCollectionName)
    .sort((a, b) => b.variableIds.length - a.variableIds.length ||
      a.id.localeCompare(b.id))[0];
  if (!canonical && !legacy && named.some((collection) =>
    collection.name === appearanceCollectionName)) {
    throw new Error('Appearance: existe uma collection homônima sem o contrato conhecido; ' +
      'nenhuma collection foi criada ou removida.');
  }
  const created = !canonical && !legacy;
  const collection = canonical ?? legacy ??
    figma.variables.createVariableCollection(appearanceCollectionName);
  const originalName = collection.name;
  if (created) {
    try {
      const initialMode = collection.modes[0]!.modeId;
      collection.renameMode(initialMode, 'Dark');
      collection.addMode('Light');
    } catch (error) { collection.remove(); throw error; }
  } else if (collection.name !== appearanceCollectionName) {
    collection.name = appearanceCollectionName;
  }
  const modeIds = {
    dark: collection.modes.find((mode) => mode.name === 'Dark')!.modeId,
    light: collection.modes.find((mode) => mode.name === 'Light')!.modeId,
  };
  const byName = new Map(allVariables.filter((variable) =>
    variable.variableCollectionId === collection.id).map((variable) => [variable.name, variable]));
  const createdVariables: Variable[] = [];
  const snapshots = new Map<string, VariableSnapshot>();
  return { collection, modeIds,
    duplicates: recognized.filter((candidate) => candidate.id !== collection.id),
    unrecognizedNames: named.length - recognized.length,
    upsertVariable(name, type) {
      if (appearanceVariableTypes.get(name) !== type) {
        throw new Error(`Appearance: Variable ${name} não pertence ao contrato.`);
      }
      let variable = byName.get(name);
      if (variable && variable.resolvedType !== type) {
        throw new Error(`Appearance: tipo de ${name} diverge da collection canônica.`);
      }
      if (!variable) {
        variable = figma.variables.createVariable(name, collection, type);
        byName.set(name, variable);
        createdVariables.push(variable);
      } else if (!snapshots.has(variable.id)) {
        snapshots.set(variable.id, { variable,
          dark: variable.valuesByMode[modeIds.dark]!,
          light: variable.valuesByMode[modeIds.light]!,
          scopes: [...variable.scopes], description: variable.description,
          webSyntax: variable.codeSyntax.WEB });
      }
      return variable;
    },
    rollback() {
      if (created) { collection.remove(); return; }
      for (const variable of createdVariables) variable.remove();
      for (const snapshot of snapshots.values()) {
        snapshot.variable.setValueForMode(modeIds.dark, snapshot.dark);
        snapshot.variable.setValueForMode(modeIds.light, snapshot.light);
        snapshot.variable.scopes = snapshot.scopes;
        snapshot.variable.description = snapshot.description;
        if (snapshot.webSyntax) snapshot.variable.setVariableCodeSyntax('WEB', snapshot.webSyntax);
        else snapshot.variable.removeVariableCodeSyntax('WEB');
      }
      collection.name = originalName;
    },
  };
}
