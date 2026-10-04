import assert from 'node:assert/strict';
import test from 'node:test';
import { beginUiKitNodeRun, verifyGeneratedRootsRetained } from
  '../src/ui-kit-node-lifecycle';
import { appearanceVariableTypes, uiKitColorRoles, uiKitVariableName, uiKitWebSyntax } from
  '../src/appearance-contract';

function fakeFile() {
  let serial = 0;
  const makeNode = (type: string, name: string, children: any[] = []): any => {
    const data = new Map<string, string>();
    const node: any = { id: `node-${++serial}`, type, name, children, parent: null,
      visible: true, opacity: 1, x: 0, y: 0, width: 16, height: 16,
      componentPropertyDefinitions: {}, componentPropertyReferences: null,
      componentProperties: {},
      getSharedPluginData: (namespace: string, key: string) => data.get(`${namespace}/${key}`) ?? '',
      setSharedPluginData: (namespace: string, key: string, value: string) => {
        data.set(`${namespace}/${key}`, value);
      },
      findAll: (predicate: (value: any) => boolean) => {
        const result: any[] = [];
        const visit = (item: any) => {
          for (const child of item.children ?? []) {
            if (predicate(child)) result.push(child);
            visit(child);
          }
        };
        visit(node);
        return result;
      },
      remove() {
        node.parent.children.splice(node.parent.children.indexOf(node), 1);
        node.removed = true;
      },
    };
    for (const child of children) child.parent = node;
    return node;
  };
  const pageA = makeNode('PAGE', 'A');
  const pageB = makeNode('PAGE', 'B');
  const root = makeNode('DOCUMENT', 'Document', [pageA, pageB]);
  const api: any = { root, currentPage: pageA, loadAllPagesAsync: async () => {},
    variables: { getLocalVariableCollectionsAsync: async () => [],
      getLocalVariablesAsync: async () => [] },
    setCurrentPageAsync: async (page: any) => { api.currentPage = page; } };
  (globalThis as unknown as { figma: unknown }).figma = api;
  const add = (page: any, node: any) => { page.children.push(node); node.parent = page; return node; };
  const installAppearance = () => {
    const collection: any = { id: 'collection-appearance', name: 'Obsidian UI / Appearance',
      remote: false, isExtension: false, variableIds: [],
      modes: [{ modeId: 'dark', name: 'Dark' }, { modeId: 'light', name: 'Light' }] };
    const variables: any[] = [...appearanceVariableTypes].map(([name, resolvedType], index) => {
      const id = `variable-${index}`;
      collection.variableIds.push(id);
      const role = uiKitColorRoles.find((item) => uiKitVariableName(item) === name);
      return { id, name, variableCollectionId: collection.id, resolvedType, remote: false,
        valuesByMode: { dark: resolvedType === 'COLOR' ? { r: 0, g: 0, b: 0 } : 4,
          light: resolvedType === 'COLOR' ? { r: 1, g: 1, b: 1 } : 4 },
        codeSyntax: { WEB: role ? `var(${uiKitWebSyntax[role]})` :
          `var(--obsidian-ui-${name.replace(/\//g, '-')})` } };
    });
    api.variables.getLocalVariableCollectionsAsync = async () => [collection];
    api.variables.getLocalVariablesAsync = async () => variables;
    return { collection, variables, byName: new Map(variables.map((item) => [item.name, item])) };
  };
  const kit = (page: any) => {
    const button = makeNode('COMPONENT', 'State=Normal');
    button.variantProperties = { State: 'Normal' };
    const set = makeNode('COMPONENT_SET', 'Obsidian / Button', [button]);
    const glyph = makeNode('COMPONENT', 'Obsidian / Glyph / search');
    const preview = makeNode('FRAME', 'Side Panel resize preview / Search');
    return { roots: [add(page, set), add(page, glyph), add(page, preview)], button, glyph };
  };
  const instance = (page: any, source: any) => {
    const node = makeNode('INSTANCE', 'User button');
    node.main = source;
    node.overrides = { Label: 'My text' };
    node.getMainComponentAsync = async () => node.main;
    node.swapComponent = (next: any) => { node.main = next; };
    node.setProperties = (values: Record<string, string | boolean>) => {
      for (const [key, value] of Object.entries(values)) {
        if (node.componentProperties[key]) node.componentProperties[key].value = value;
      }
    };
    return add(page, node);
  };
  const legacyFullKit = (page: any) => {
    const glyph = makeNode('COMPONENT', 'Obsidian / Glyph / search', [
      makeNode('VECTOR', 'Observed SVG'),
    ]);
    glyph.children[0].vectorPaths = [{ data: 'M4 4 L20 20', windingRule: 'NONZERO' }];
    glyph.description = 'Geometria SVG observada; identidade do glyph independe da ação. Cor pelo papel de ícone.';
    const makeSet = (name: string, variantName: string, variant: Record<string, string>) => {
      const child = makeNode('COMPONENT', variantName);
      child.variantProperties = variant;
      const set = makeNode('COMPONENT_SET', name, [child]);
      for (const [key, value] of Object.entries(variant)) {
        set.componentPropertyDefinitions[key] = { type: 'VARIANT', defaultValue: value,
          variantOptions: [value] };
      }
      return { set, child };
    };
    const button = makeSet('Obsidian / Button', 'State=Normal', { State: 'Normal' });
    const search = makeSet('Obsidian / Search', 'State=Filled', { State: 'Filled' });
    const iconButton = makeSet('Obsidian / Icon Button',
      'Context=Toolbar, State=Default, Tone=Muted',
      { Context: 'Toolbar', State: 'Default', Tone: 'Muted' });
    const tree = makeSet('Obsidian / Tree Navigation Row', 'Kind=File, State=Default',
      { Kind: 'File', State: 'Default' });
    tree.set.componentPropertyDefinitions.Depth = { type: 'VARIANT', defaultValue: '0',
      variantOptions: ['0'] };
    for (const [set, name, type, value] of [
      [button.set, 'Label', 'TEXT', 'Example button'],
      [search.set, 'Placeholder', 'TEXT', 'Search'],
      [search.set, 'Value', 'TEXT', 'probe'],
      [iconButton.set, 'Icon', 'INSTANCE_SWAP', glyph.id],
      [tree.set, 'Label', 'TEXT', 'File'],
      [tree.set, 'Metadata', 'TEXT', 'JSON'],
      [tree.set, 'Show metadata', 'BOOLEAN', true],
    ] as const) {
      set.componentPropertyDefinitions[`${name}#${set.id}`] = { type, defaultValue: value };
    }
    const tab = makeSet('Obsidian / Workspace Tab', 'Context=Sidedock, State=Active',
      { Context: 'Sidedock', State: 'Active' });
    const titleKey = `Title#${tab.set.id}`;
    const iconKey = `Icon#${tab.set.id}`;
    tab.set.componentPropertyDefinitions[titleKey] = { type: 'TEXT', defaultValue: 'New tab' };
    tab.set.componentPropertyDefinitions[iconKey] = { type: 'INSTANCE_SWAP',
      defaultValue: glyph.id };
    const icon = makeNode('INSTANCE', 'Icon');
    icon.main = glyph;
    icon.getMainComponentAsync = async () => icon.main;
    icon.componentProperties = {};
    icon.componentPropertyReferences = { mainComponent: iconKey };
    tab.child.children.push(icon);
    icon.parent = tab.child;
    const host = makeNode('COMPONENT', 'Obsidian / Side Panel');
    host.componentPropertyDefinitions[`Hosted View#${host.id}`] = {
      type: 'INSTANCE_SWAP', defaultValue: search.child.id,
    };
    const preview = (name: string) => {
      const instance = makeNode('INSTANCE', 'Panel');
      instance.main = host;
      instance.getMainComponentAsync = async () => instance.main;
      instance.componentProperties = { [`Hosted View#${host.id}`]: {
        type: 'INSTANCE_SWAP', value: search.child.id,
      } };
      return makeNode('FRAME', `Side Panel resize preview / ${name}`, [instance]);
    };
    const roots = [glyph, iconButton.set, button.set, search.set, tree.set, tab.set,
      host, preview('Search'), preview('Files'), preview('Bookmarks')]
      .map((node) => add(page, node));
    return { roots, glyph, button, search, iconButton, tree, tab, host,
      titleKey, iconKey };
  };
  const tabInstance = (page: any, kit: ReturnType<typeof legacyFullKit>) => {
    const node = instance(page, kit.tab.child);
    node.name = 'User Workspace Tab';
    node.componentProperties = {
      State: { type: 'VARIANT', value: 'Active' },
      Context: { type: 'VARIANT', value: 'Sidedock' },
      [kit.titleKey]: { type: 'TEXT', value: 'My custom tab' },
      [kit.iconKey]: { type: 'INSTANCE_SWAP', value: kit.glyph.id },
    };
    node.swapComponent = (next: any) => {
      node.main = next;
      const definitions = next.parent.componentPropertyDefinitions;
      node.componentProperties = Object.fromEntries(Object.entries(definitions).map(
        ([key, definition]: [string, any]) => [key, { type: definition.type,
          value: definition.defaultValue }]));
    };
    return node;
  };
  return { api, pageA, pageB, makeNode, add, kit, instance, legacyFullKit,
    tabInstance, installAppearance };
}

test('two generations keep one managed Button/Glyph source and migrate user instances across pages', async () => {
  const file = fakeFile();
  const first = await beginUiKitNodeRun();
  const old = file.kit(file.pageA);
  old.roots[2].x = 180;
  await first.commit(old.roots);
  const user = file.instance(file.pageB, old.button);
  const glyphUser = file.instance(file.pageB, old.glyph);
  const foreign = file.add(file.pageA, file.makeNode('COMPONENT', 'Obsidian / Button'));
  file.api.currentPage = file.pageB;
  const second = await beginUiKitNodeRun();
  assert.equal(second.page, file.pageA);
  assert.equal(file.api.currentPage, file.pageA);
  const next = file.kit(file.pageA);
  next.roots[2].x = 900;
  assert.deepEqual(await second.commit(next.roots), { replaced: 3, rebound: 2, adopted: 0 });
  assert.equal(next.roots[2].x, 180);
  verifyGeneratedRootsRetained(file.pageA, next.roots);
  assert.equal(user.main, next.button);
  assert.equal(glyphUser.main, next.glyph);
  assert.deepEqual(user.overrides, { Label: 'My text' });
  assert.equal(file.pageA.findAll((node: any) => node.type === 'COMPONENT_SET').length, 1);
  assert.equal(file.pageA.findAll((node: any) => node.type === 'COMPONENT' &&
    node.name.startsWith('Obsidian / Glyph /')).length, 1);
  assert.equal(file.pageA.children.filter((node: any) =>
    node.name === 'Side Panel resize preview / Search').length, 1);
  assert.equal(foreign.parent, file.pageA);
  assert.equal(old.button.removed, undefined);
  assert.equal(old.roots.every((root: any) => root.removed), true);
});

test('a missing new root cannot be reported as successful regeneration', async () => {
  const file = fakeFile();
  const run = await beginUiKitNodeRun();
  const staged = file.kit(file.pageA);
  await run.commit(staged.roots);
  staged.roots[2].remove();
  assert.throws(() => verifyGeneratedRootsRetained(file.pageA, staged.roots),
    /não permaneceu na página/);
});

test('old Sections are removed before staged roots return to their coordinates', async () => {
  const file = fakeFile();
  const first = await beginUiKitNodeRun();
  const old = file.kit(file.pageA);
  old.roots[2].type = 'SECTION';
  old.roots[2].x = 180;
  await first.commit(old.roots);
  const second = await beginUiKitNodeRun();
  const next = file.kit(file.pageA);
  next.roots[2].type = 'SECTION';
  next.roots[2].x = 900;
  const removeOld = old.roots[2].remove;
  old.roots[2].remove = () => {
    assert.equal(next.roots[2].x, 900);
    assert.equal(next.roots[2].parent, file.pageA);
    removeOld();
  };
  await second.commit(next.roots);
  assert.equal(next.roots[2].x, 180);
  verifyGeneratedRootsRetained(file.pageA, next.roots);
});

test('a failure after the manifest changes retains the new managed roots', async () => {
  const file = fakeFile();
  const first = await beginUiKitNodeRun();
  const old = file.kit(file.pageA);
  await first.commit(old.roots);
  const second = await beginUiKitNodeRun();
  const next = file.kit(file.pageA);
  old.roots[2].remove = () => { throw new Error('section removal rejected'); };
  await assert.rejects(second.commit(next.roots), /section removal rejected/);
  assert.equal(second.committed, true);
  assert.equal(file.api.root.getSharedPluginData('obsidianuisystem', 'uiKitManifest')
    .includes(next.roots[0].id), true);
  verifyGeneratedRootsRetained(file.pageA, next.roots);
});

test('a stale manifest with deleted roots can rebuild one managed kit', async () => {
  const file = fakeFile();
  const first = await beginUiKitNodeRun();
  const lost = file.kit(file.pageA);
  await first.commit(lost.roots);
  for (const root of lost.roots) root.remove();
  file.api.currentPage = file.pageB;
  const recovery = await beginUiKitNodeRun();
  assert.equal(recovery.page, file.pageA);
  const next = file.kit(file.pageA);
  assert.deepEqual(await recovery.commit(next.roots), {
    replaced: 0, rebound: 0, adopted: 0,
  });
  verifyGeneratedRootsRetained(file.pageA, next.roots);
  assert.equal(file.pageA.children.filter((node: any) => node.type === 'COMPONENT_SET').length, 1);
});

test('partial stale generation migrates an external instance before removing surviving roots', async () => {
  const file = fakeFile();
  const first = await beginUiKitNodeRun();
  const old = file.kit(file.pageA);
  await first.commit(old.roots);
  const user = file.instance(file.pageB, old.button);
  old.roots[1].remove();
  const recovery = await beginUiKitNodeRun();
  const next = file.kit(file.pageA);
  assert.deepEqual(await recovery.commit(next.roots), {
    replaced: 2, rebound: 1, adopted: 0,
  });
  assert.equal(user.main, next.button);
  assert.equal(file.pageA.children.filter((node: any) => node.type === 'COMPONENT_SET').length, 1);
});

test('failed regeneration leaves the last generation and its user instances intact', async () => {
  const file = fakeFile();
  const first = await beginUiKitNodeRun();
  const old = file.kit(file.pageA);
  await first.commit(old.roots);
  const user = file.instance(file.pageB, old.button);
  const second = await beginUiKitNodeRun();
  const next = file.kit(file.pageA);
  next.button.variantProperties = { State: 'Changed' };
  await assert.rejects(second.commit(next.roots), /incompatíveis/);
  for (const root of next.roots) root.remove();
  assert.equal(user.main, old.button);
  assert.equal(old.roots.every((root: any) => !root.removed), true);
  assert.equal(file.api.root.getSharedPluginData('obsidianuisystem', 'uiKitManifest').includes(old.roots[0].id), true);
});

test('a swap error reverses earlier instance migrations before old roots are removed', async () => {
  const file = fakeFile();
  const first = await beginUiKitNodeRun();
  const old = file.kit(file.pageA);
  await first.commit(old.roots);
  const good = file.instance(file.pageB, old.button);
  const broken = file.instance(file.pageB, old.glyph);
  broken.swapComponent = (target: any) => {
    if (target !== old.glyph) throw new Error('swap rejected');
    broken.main = target;
  };
  const second = await beginUiKitNodeRun();
  const next = file.kit(file.pageA);
  await assert.rejects(second.commit(next.roots), /swap rejected/);
  for (const root of next.roots) root.remove();
  assert.equal(good.main, old.button);
  assert.equal(broken.main, old.glyph);
  assert.equal(old.roots.every((root: any) => !root.removed), true);
});

test('unmarked content inside a managed root blocks destructive regeneration', async () => {
  const file = fakeFile();
  const first = await beginUiKitNodeRun();
  const old = file.kit(file.pageA);
  await first.commit(old.roots);
  const extra = file.makeNode('FRAME', 'User content');
  old.roots[0].children.push(extra);
  extra.parent = old.roots[0];
  await assert.rejects(beginUiKitNodeRun(), /sem ownership/);
  assert.equal(old.roots[0].removed, undefined);
});

test('an unmarked legacy source blocks a first run instead of creating another canonical kit', async () => {
  const file = fakeFile();
  const legacy = file.kit(file.pageA);
  await assert.rejects(beginUiKitNodeRun(), /Component Sets incompletos/);
  assert.equal(legacy.roots.every((root: any) => !root.removed), true);
});

test('last pre-ownership kit is adopted, external text/state/icon overrides survive, then regeneration is idempotent', async () => {
  const file = fakeFile();
  const legacy = file.legacyFullKit(file.pageA);
  const manual = file.add(file.pageA, file.makeNode('COMPONENT', 'Obsidian / My own component'));
  const user = file.tabInstance(file.pageB, legacy);
  const first = await beginUiKitNodeRun();
  const staged = file.legacyFullKit(file.pageA);
  assert.deepEqual(await first.commit(staged.roots), {
    replaced: legacy.roots.length, rebound: 1, adopted: 1,
  });
  assert.equal(user.main, staged.tab.child);
  assert.equal(user.componentProperties[`Title#${staged.tab.set.id}`].value, 'My custom tab');
  assert.equal(user.componentProperties[`Icon#${staged.tab.set.id}`].value, staged.glyph.id);
  assert.equal(user.componentProperties.State.value, 'Active');
  assert.equal(legacy.roots.every((root: any) => root.removed), true);
  assert.equal(manual.removed, undefined);
  assert.equal(manual.parent, file.pageA);
  file.api.currentPage = file.pageB;
  const second = await beginUiKitNodeRun();
  assert.equal(second.page, file.pageA);
  const regenerated = file.legacyFullKit(file.pageA);
  assert.deepEqual(await second.commit(regenerated.roots), {
    replaced: staged.roots.length, rebound: 1, adopted: 0,
  });
  assert.equal(user.main, regenerated.tab.child);
  assert.equal(user.componentProperties[`Title#${regenerated.tab.set.id}`].value,
    'My custom tab');
  assert.equal(user.componentProperties[`Icon#${regenerated.tab.set.id}`].value,
    regenerated.glyph.id);
  assert.equal(file.pageA.children.filter((node: any) => node.type === 'COMPONENT_SET').length, 5);
  assert.equal(file.pageA.children.filter((node: any) =>
    node.name.startsWith('Obsidian / Glyph /')).length, 1);
  assert.equal(file.pageA.children.filter((node: any) =>
    node.name.startsWith('Side Panel resize preview')).length, 3);
});

test('modified glyph geometry in an unmarked generation aborts without deleting legacy masters', async () => {
  const file = fakeFile();
  const legacy = file.legacyFullKit(file.pageA);
  legacy.glyph.children[0].vectorPaths[0].data = 'M0 0 L12 12';
  const first = await beginUiKitNodeRun();
  const staged = file.legacyFullKit(file.pageA);
  await assert.rejects(first.commit(staged.roots), /vectorPaths\[0\]\.data/);
  for (const root of staged.roots) root.remove();
  assert.equal(legacy.roots.every((root: any) => !root.removed), true);
  assert.equal(file.api.root.getSharedPluginData('obsidianuisystem', 'uiKitManifest'), '');
});

test('legacy binding roles are compared, and an incompatible binding blocks adoption', async () => {
  const file = fakeFile();
  const appearance = file.installAppearance();
  const legacy = file.legacyFullKit(file.pageA);
  const paint = (variable: any) => [{ type: 'SOLID', visible: true,
    color: { r: 0, g: 0, b: 0 }, boundVariables: {
      color: { type: 'VARIABLE_ALIAS', id: variable.id },
  } }];
  legacy.glyph.children[0].fills = paint(appearance.byName.get('ui-kit/textNormal'));
  const run = await beginUiKitNodeRun();
  const staged = file.legacyFullKit(file.pageA);
  staged.glyph.children[0].fills = paint(appearance.byName.get('icon-button/foreground'));
  await assert.rejects(run.commit(staged.roots), /fills.*textNormal/);
  for (const root of staged.roots) root.remove();
  assert.equal(legacy.roots.every((root: any) => !root.removed), true);
});

test('two complete legacy generations on separate pages converge to one managed source', async () => {
  const file = fakeFile();
  const firstOld = file.legacyFullKit(file.pageA);
  const secondOld = file.legacyFullKit(file.pageB);
  const user = file.tabInstance(file.pageB, firstOld);
  const otherUser = file.tabInstance(file.pageA, secondOld);
  const run = await beginUiKitNodeRun();
  const next = file.legacyFullKit(file.pageA);
  assert.deepEqual(await run.commit(next.roots), {
    replaced: firstOld.roots.length + secondOld.roots.length, rebound: 2, adopted: 2,
  });
  assert.equal(user.main, next.tab.child);
  assert.equal(otherUser.main, next.tab.child);
  assert.equal(file.pageA.children.filter((node: any) => node.type === 'COMPONENT_SET').length, 5);
  assert.equal(file.pageB.children.filter((node: any) => node.type === 'COMPONENT_SET').length, 0);
});

test('two consecutive pre-ownership generations on one page are adopted together', async () => {
  const file = fakeFile();
  const oldA = file.legacyFullKit(file.pageA);
  const oldB = file.legacyFullKit(file.pageA);
  const run = await beginUiKitNodeRun();
  const next = file.legacyFullKit(file.pageA);
  assert.deepEqual(await run.commit(next.roots), {
    replaced: oldA.roots.length + oldB.roots.length, rebound: 0, adopted: 2,
  });
  assert.equal(file.pageA.children.filter((node: any) => node.type === 'COMPONENT_SET').length, 5);
  assert.equal(file.pageA.children.filter((node: any) =>
    node.name.startsWith('Side Panel resize preview')).length, 3);
});

test('a legacy preview hosted by a foreign master is rejected before deletion', async () => {
  const file = fakeFile();
  const legacy = file.legacyFullKit(file.pageA);
  const foreign = file.add(file.pageB, file.makeNode('COMPONENT', 'Foreign host'));
  legacy.roots.at(-1).children[0].main = foreign;
  const run = await beginUiKitNodeRun();
  const staged = file.legacyFullKit(file.pageA);
  await assert.rejects(run.commit(staged.roots), /instância aponta para Component fora da geração/);
  for (const root of staged.roots) root.remove();
  assert.equal(legacy.roots.every((root: any) => !root.removed), true);
  assert.equal(foreign.removed, undefined);
});
