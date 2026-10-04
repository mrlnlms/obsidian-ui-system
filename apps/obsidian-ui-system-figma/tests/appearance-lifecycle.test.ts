import assert from 'node:assert/strict';
import test from 'node:test';
import { appearanceCollectionName, legacyNavigationCollectionName,
  primitiveColorNames, primitiveRadiusNames, legacyUiKitColorRoles,
  uiKitColorRoles, uiKitVariableName } from '../src/appearance-contract';
import { beginAppearanceRun, isPluginAppearanceCollection } from '../src/appearance-lifecycle';
import { reconcileAppearanceCollections } from '../src/appearance-migration';
import { createPrimitiveVariables, readPrimitiveThemeEvidence } from '../src/primitive-theme';
import { extendUiKitThemeVariables, readUiKitThemeEvidence } from '../src/ui-kit-theme';
import primitiveFixture from './fixtures/primitive-theme-probe.json';
import kitFixture from './fixtures/ui-kit-theme-probe.json';

function fakeFigma() {
  let nextId = 0;
  const collections: any[] = [];
  const variables: any[] = [];
  const pages: any[] = [];
  const createCollection = (name: string) => {
    const id = `collection-${++nextId}`;
    const first = `mode-${++nextId}`;
    const collection: any = { id, name, remote: false, isExtension: false,
      modes: [{ modeId: first, name: 'Mode 1' }], defaultModeId: first, variableIds: [],
      getPluginData: () => { throw new Error('Plugin data requires a manifest ID'); },
      setPluginData: () => { throw new Error('Plugin data requires a manifest ID'); },
      renameMode(modeId: string, newName: string) {
        collection.modes.find((mode: any) => mode.modeId === modeId).name = newName;
      },
      addMode(modeName: string) {
        const modeId = `mode-${++nextId}`;
        collection.modes.push({ modeId, name: modeName });
        return modeId;
      },
      remove() {
        collections.splice(collections.indexOf(collection), 1);
        for (const variable of [...variables]) if (variable.variableCollectionId === id) variable.remove();
      },
    };
    collections.push(collection);
    return collection;
  };
  const createVariable = (name: string, collection: any, type: string) => {
    const id = `variable-${++nextId}`;
    const variable: any = { id, name, variableCollectionId: collection.id,
      resolvedType: type, remote: false, valuesByMode: {}, scopes: [],
      description: '', codeSyntax: {},
      setValueForMode(modeId: string, value: unknown) { variable.valuesByMode[modeId] = value; },
      resolveForConsumer(node: any) {
        const modeId = node.explicitVariableModes[collection.id] ?? collection.defaultModeId;
        const value = variable.valuesByMode[modeId];
        if (value?.type === 'VARIABLE_ALIAS') {
          return variables.find((item) => item.id === value.id).resolveForConsumer(node);
        }
        return { value, resolvedType: type };
      },
      setVariableCodeSyntax(platform: string, value: string) { variable.codeSyntax[platform] = value; },
      removeVariableCodeSyntax(platform: string) { delete variable.codeSyntax[platform]; },
      remove() {
        variables.splice(variables.indexOf(variable), 1);
        collection.variableIds.splice(collection.variableIds.indexOf(id), 1);
      },
    };
    variables.push(variable);
    collection.variableIds.push(id);
    return variable;
  };
  const api: any = {
    variables: {
      getLocalVariableCollectionsAsync: async () => collections,
      getLocalVariablesAsync: async () => variables,
      createVariableCollection: createCollection,
      createVariable,
      setBoundVariableForPaint: (paint: any, _field: string, variable: any) => ({
        ...paint, boundVariables: { ...paint.boundVariables,
          color: { type: 'VARIABLE_ALIAS', id: variable.id } },
      }),
    },
    loadAllPagesAsync: async () => {},
    root: { children: pages },
    getLocalPaintStylesAsync: async () => [],
    getLocalEffectStylesAsync: async () => [],
    getLocalGridStylesAsync: async () => [],
    getLocalTextStylesAsync: async () => [],
  };
  (globalThis as unknown as { figma: unknown }).figma = api;
  return { api, collections, variables, pages, createCollection, createVariable };
}

async function buildAppearance() {
  const run = await beginAppearanceRun();
  const primitive = createPrimitiveVariables(readPrimitiveThemeEvidence(primitiveFixture), run);
  extendUiKitThemeVariables(primitive, readUiKitThemeEvidence(kitFixture), run);
  return run;
}

test('the prior Appearance palette extends in place with observed Search and public control roles', async () => {
  const fake = fakeFigma();
  const first = await buildAppearance();
  const collectionId = first.collection.id;
  const mutedId = fake.variables.find((item) => item.name === uiKitVariableName('textMuted')).id;
  const added = uiKitColorRoles.filter((role) =>
    !(legacyUiKitColorRoles as readonly string[]).includes(role));
  for (const variable of [...fake.variables]) {
    if (added.some((role) => variable.name === uiKitVariableName(role))) variable.remove();
  }
  assert.equal(isPluginAppearanceCollection(first.collection, fake.variables), true);
  const second = await buildAppearance();
  assert.equal(second.collection.id, collectionId);
  assert.equal(fake.collections.length, 1);
  assert.equal(fake.variables.find((item) => item.name === uiKitVariableName('textMuted')).id,
    mutedId);
  for (const role of added) {
    assert.ok(fake.variables.some((item) => item.name === uiKitVariableName(role) &&
      item.variableCollectionId === collectionId));
  }
});

function addOldPrimitiveCollection(fake: ReturnType<typeof fakeFigma>) {
  const old = fake.createCollection(legacyNavigationCollectionName);
  old.renameMode(old.defaultModeId, 'Dark');
  old.addMode('Light');
  const evidence = readPrimitiveThemeEvidence(primitiveFixture);
  for (const [key, name] of Object.entries(primitiveColorNames)) {
    if (key === 'treeGuide') continue; // prior successful kits did not include the guide
    const variable = fake.createVariable(name, old, 'COLOR');
    variable.setVariableCodeSyntax('WEB', `var(--obsidian-ui-${name.replace(/\//g, '-')})`);
    variable.setValueForMode(old.modes[0].modeId, evidence.dark.colors[key as keyof typeof evidence.dark.colors]);
    variable.setValueForMode(old.modes[1].modeId, evidence.light.colors[key as keyof typeof evidence.light.colors]);
  }
  for (const [key, name] of Object.entries(primitiveRadiusNames)) {
    const variable = fake.createVariable(name, old, 'FLOAT');
    variable.setVariableCodeSyntax('WEB', `var(--obsidian-ui-${name.replace(/\//g, '-')})`);
    variable.setValueForMode(old.modes[0].modeId, evidence.dark.radii[key as keyof typeof evidence.dark.radii]);
    variable.setValueForMode(old.modes[1].modeId, evidence.light.radii[key as keyof typeof evidence.light.radii]);
  }
  return old;
}

function addOldAppearanceCollection(fake: ReturnType<typeof fakeFigma>, canonical: any) {
  const old = fake.createCollection(appearanceCollectionName);
  old.renameMode(old.defaultModeId, 'Dark');
  old.addMode('Light');
  const originals = fake.variables.filter((variable) =>
    variable.variableCollectionId === canonical.id);
  const clones = new Map(originals.map((variable) => {
    const clone = fake.createVariable(variable.name, old, variable.resolvedType);
    clone.setVariableCodeSyntax('WEB', variable.codeSyntax.WEB);
    return [variable.id, clone];
  }));
  for (const original of originals) {
    const clone = clones.get(original.id)!;
    for (const [index, mode] of canonical.modes.entries()) {
      const value = original.valuesByMode[mode.modeId];
      clone.setValueForMode(old.modes[index].modeId,
        value?.type === 'VARIABLE_ALIAS'
          ? { type: 'VARIABLE_ALIAS', id: clones.get(value.id)!.id } : value);
    }
  }
  return old;
}

function kitPage(fake: ReturnType<typeof fakeFigma>, name: string, old: any, variable: any) {
  const page: any = { type: 'PAGE', name, explicitVariableModes: {},
    setExplicitVariableModeForCollection(collection: any, modeId: string) {
      page.explicitVariableModes[collection.id] = modeId;
    },
    clearExplicitVariableModeForCollection(collection: any) {
      delete page.explicitVariableModes[collection.id];
    },
    findAll: () => [component, label],
  };
  page.explicitVariableModes[old.id] = old.modes[0].modeId;
  const component: any = { type: 'COMPONENT', name: 'Obsidian / Button', parent: page,
    explicitVariableModes: {}, boundVariables: undefined,
    resolvedVariableModes: {} };
  const label: any = { type: 'TEXT', name: 'Label', parent: component,
    explicitVariableModes: {}, fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 },
      boundVariables: { color: { type: 'VARIABLE_ALIAS', id: variable.id } } }],
    get boundVariables() { return { fills: label.fills.map((paint: any) => paint.boundVariables.color) }; },
    get resolvedVariableModes() { return { ...page.explicitVariableModes }; },
  };
  fake.pages.push(page);
  return { page, label };
}

test('Generate UI Kit appearance keeps one collection and Variable IDs across runs and pages', async () => {
  const fake = fakeFigma();
  const first = await buildAppearance();
  const id = first.collection.id;
  const variableIds = [...first.collection.variableIds];
  const pageA = { explicitVariableModes: {} as Record<string, string> };
  pageA.explicitVariableModes[id] = first.modeIds.dark;
  const second = await buildAppearance();
  const pageB = { explicitVariableModes: {} as Record<string, string> };
  pageB.explicitVariableModes[id] = second.modeIds.light;
  assert.equal(second.collection.id, id);
  assert.deepEqual(second.collection.variableIds, variableIds);
  assert.equal(fake.collections.filter((collection) => collection.name === appearanceCollectionName).length, 1);
  assert.equal(fake.collections.filter((collection) =>
    collection.name === legacyNavigationCollectionName).length, 0);
  assert.equal(pageA.explicitVariableModes[id], first.modeIds.dark);
  assert.equal(pageB.explicitVariableModes[id], first.modeIds.light);
  assert.equal(second.collection.modes.length, 2);
  const text = fake.variables.find((variable) => variable.variableCollectionId === id &&
    variable.name === 'ui-kit/textMuted');
  assert.deepEqual(text.resolveForConsumer(pageA).value,
    readUiKitThemeEvidence(kitFixture).roles.textMuted.dark);
  assert.deepEqual(text.resolveForConsumer(pageB).value,
    readUiKitThemeEvidence(kitFixture).roles.textMuted.light);
});

test('a compatible legacy Navigation collection becomes the canonical Appearance', async () => {
  const fake = fakeFigma();
  const old = addOldPrimitiveCollection(fake);
  const originalIds = [...old.variableIds];
  const run = await buildAppearance();
  assert.equal(run.collection.id, old.id);
  assert.deepEqual(run.collection.variableIds.slice(0, originalIds.length), originalIds);
  assert.equal(fake.collections.filter((collection) => collection.name === appearanceCollectionName).length, 1);
  assert.equal(fake.collections.filter((collection) =>
    collection.name === legacyNavigationCollectionName).length, 0);
});

test('recognized legacy bindings on two kit pages migrate before the old collection is removed', async () => {
  const fake = fakeFigma();
  const canonical = await buildAppearance();
  const old = addOldPrimitiveCollection(fake);
  const oldIcon = fake.variables.find((variable) => variable.variableCollectionId === old.id &&
    variable.name === primitiveColorNames.icon);
  const a = kitPage(fake, 'first kit', old, oldIcon);
  const b = kitPage(fake, 'second kit', old, oldIcon);
  const run = await beginAppearanceRun();
  createPrimitiveVariables(readPrimitiveThemeEvidence(primitiveFixture), run);
  const report = await reconcileAppearanceCollections(run);
  assert.equal(run.collection.id, canonical.collection.id);
  assert.deepEqual(report, { rebound: 2, removed: 1, retained: 0, unrecognized: 0 });
  const canonicalIcon = fake.variables.find((variable) => variable.variableCollectionId ===
    canonical.collection.id && variable.name === primitiveColorNames.icon);
  for (const item of [a, b]) {
    assert.equal(item.label.fills[0].boundVariables.color.id, canonicalIcon.id);
    assert.equal(item.page.explicitVariableModes[canonical.collection.id], canonical.modeIds.dark);
    assert.equal(item.page.explicitVariableModes[old.id], undefined);
  }
  assert.equal(fake.collections.length, 1);
});

test('a second plugin Appearance collection is rebound and removed without changing token IDs', async () => {
  const fake = fakeFigma();
  const canonical = await buildAppearance();
  const old = addOldAppearanceCollection(fake, canonical.collection);
  const oldText = fake.variables.find((variable) => variable.variableCollectionId === old.id &&
    variable.name === 'ui-kit/textMuted');
  const { label } = kitPage(fake, 'older kit', old, oldText);
  const run = await beginAppearanceRun();
  const report = await reconcileAppearanceCollections(run);
  assert.equal(run.collection.id, canonical.collection.id);
  assert.deepEqual(report, { rebound: 1, removed: 1, retained: 0, unrecognized: 0 });
  assert.equal(label.fills[0].boundVariables.color.id, fake.variables.find((variable) =>
    variable.variableCollectionId === canonical.collection.id &&
    variable.name === 'ui-kit/textMuted').id);
  assert.equal(fake.collections.length, 1);
});

test('a failed repeat restores values and never deletes the reused collection', async () => {
  const fake = fakeFigma();
  const initial = await buildAppearance();
  const icon = fake.variables.find((variable) => variable.variableCollectionId ===
    initial.collection.id && variable.name === primitiveColorNames.icon);
  const before = icon.valuesByMode[initial.modeIds.dark];
  const repeat = await beginAppearanceRun();
  const evidence = readPrimitiveThemeEvidence(primitiveFixture);
  evidence.dark.colors.icon = { r: 0, g: 0, b: 0 };
  createPrimitiveVariables(evidence, repeat);
  assert.notDeepEqual(icon.valuesByMode[initial.modeIds.dark], before);
  repeat.rollback();
  assert.deepEqual(icon.valuesByMode[initial.modeIds.dark], before);
  assert.equal(fake.collections.length, 1);
  assert.equal(fake.collections[0].id, initial.collection.id);
});

test('unknown homonyms and still-referenced plugin collections are preserved', async () => {
  const fake = fakeFigma();
  const canonical = await buildAppearance();
  const unknown = fake.createCollection(appearanceCollectionName);
  unknown.renameMode(unknown.defaultModeId, 'Dark');
  unknown.addMode('Light');
  assert.equal(isPluginAppearanceCollection(unknown, fake.variables), false);
  const old = addOldPrimitiveCollection(fake);
  const oldIcon = fake.variables.find((variable) => variable.variableCollectionId === old.id &&
    variable.name === primitiveColorNames.icon);
  const page = kitPage(fake, 'user binding', old, oldIcon);
  page.label.parent.name = 'User-owned frame';
  const run = await beginAppearanceRun();
  const report = await reconcileAppearanceCollections(run);
  assert.equal(run.collection.id, canonical.collection.id);
  assert.deepEqual(report, { rebound: 0, removed: 0, retained: 1, unrecognized: 1 });
  assert.ok(fake.collections.includes(old));
  assert.ok(fake.collections.includes(unknown));
});

test('a duplicate stays when another collection aliases one of its Variables', async () => {
  const fake = fakeFigma();
  const canonical = await buildAppearance();
  const old = addOldPrimitiveCollection(fake);
  const oldIcon = fake.variables.find((variable) => variable.variableCollectionId === old.id &&
    variable.name === primitiveColorNames.icon);
  const { label } = kitPage(fake, 'older kit', old, oldIcon);
  const userCollection = fake.createCollection('User colors');
  const userVariable = fake.createVariable('my icon', userCollection, 'COLOR');
  userVariable.setValueForMode(userCollection.defaultModeId,
    { type: 'VARIABLE_ALIAS', id: oldIcon.id });
  const run = await beginAppearanceRun();
  const report = await reconcileAppearanceCollections(run);
  assert.deepEqual(report, { rebound: 1, removed: 0, retained: 1, unrecognized: 0 });
  assert.ok(fake.collections.includes(old));
  assert.equal(label.fills[0].boundVariables.color.id, fake.variables.find((variable) =>
    variable.variableCollectionId === canonical.collection.id &&
    variable.name === primitiveColorNames.icon).id);
});

test('a conflicting canonical mode keeps old bindings and their collection', async () => {
  const fake = fakeFigma();
  const canonical = await buildAppearance();
  const old = addOldPrimitiveCollection(fake);
  const oldIcon = fake.variables.find((variable) => variable.variableCollectionId === old.id &&
    variable.name === primitiveColorNames.icon);
  const { page, label } = kitPage(fake, 'mixed modes', old, oldIcon);
  page.explicitVariableModes[old.id] = old.modes[1].modeId;
  page.explicitVariableModes[canonical.collection.id] = canonical.modeIds.dark;
  const run = await beginAppearanceRun();
  const report = await reconcileAppearanceCollections(run);
  assert.deepEqual(report, { rebound: 0, removed: 0, retained: 1, unrecognized: 0 });
  assert.ok(fake.collections.includes(old));
  assert.equal(label.fills[0].boundVariables.color.id, oldIcon.id);
});

test('an unrecognized Appearance homonym cannot trigger another collection creation', async () => {
  const fake = fakeFigma();
  fake.createCollection(appearanceCollectionName);
  await assert.rejects(beginAppearanceRun(), /homônima sem o contrato conhecido/);
  assert.equal(fake.collections.length, 1);
});
