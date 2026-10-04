/** File-wide ownership for the generated UI Kit. Names are presentation, never proof of ownership. */
import { legacyAnchors, preflightLegacyKits,
  recognizeLegacyKits } from './ui-kit-legacy-recognition';

const namespace = 'obsidianuisystem';
const manifestKey = 'uiKitManifest';
const nodeKey = 'uiKitGeneration';

interface Manifest {
  version: 1;
  pageId: string;
  generationId: string;
  rootIds: string[];
}

function readManifest(): Manifest | undefined {
  const raw = figma.root.getSharedPluginData(namespace, manifestKey);
  if (!raw) return undefined;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('UI Kit: manifesto de ownership inválido.'); }
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1 ||
      !('pageId' in value) || typeof value.pageId !== 'string' ||
      !('generationId' in value) || typeof value.generationId !== 'string' ||
      !('rootIds' in value) || !Array.isArray(value.rootIds) ||
      !value.rootIds.every((id) => typeof id === 'string')) {
    throw new Error('UI Kit: manifesto de ownership incompatível; nenhum node foi removido.');
  }
  return value as Manifest;
}

function descendants(root: SceneNode): SceneNode[] {
  return [root, ...('findAll' in root ? root.findAll(() => true) : [])];
}

function ownedRoots(page: PageNode, manifest: Manifest): SceneNode[] {
  const roots = manifest.rootIds.map((id) => page.children.find((node) => node.id === id));
  if (roots.some((node) => !node) || new Set(manifest.rootIds).size !== roots.length) {
    throw new Error('UI Kit: manifesto aponta para raízes ausentes; geração anterior preservada.');
  }
  for (const root of roots as SceneNode[]) {
    if (descendants(root).some((node) =>
      node.getSharedPluginData(namespace, nodeKey) !== manifest.generationId)) {
      throw new Error('UI Kit: conteúdo sem ownership dentro da geração anterior; nada foi removido.');
    }
  }
  return roots as SceneNode[];
}

function recoverStaleRoots(page: PageNode, manifest: Manifest,
  stagedRoots: readonly SceneNode[] = []): SceneNode[] {
  const expected = new Set(manifest.rootIds);
  const roots = page.children.filter((node) => expected.has(node.id));
  for (const root of roots) {
    if (descendants(root).some((node) =>
      node.getSharedPluginData(namespace, nodeKey) !== manifest.generationId)) {
      throw new Error(`UI Kit: raiz sobrevivente ${root.name} contém conteúdo sem ownership; ` +
        'recuperação interrompida.');
    }
  }
  for (const candidatePage of figma.root.children) {
    for (const node of candidatePage.findAll((item) =>
      item.getSharedPluginData(namespace, nodeKey) === manifest.generationId)) {
      if (node.getSharedPluginData(namespace, nodeKey) !== manifest.generationId) continue;
      let root: BaseNode | null = node;
      while (root?.parent && root.parent.type !== 'PAGE') root = root.parent;
      if (!root || candidatePage !== page || !expected.has(root.id)) {
        throw new Error(`UI Kit: node marcado ${node.name} (${node.id}) fora das raízes ` +
          'do manifesto; recuperação interrompida.');
      }
    }
  }
  const stagedIds = new Set(stagedRoots.flatMap(descendants).map((node) => node.id));
  const otherSources = legacyAnchors().filter(({ node }) => !stagedIds.has(node.id) &&
    node.getSharedPluginData(namespace, nodeKey) !== manifest.generationId);
  if (otherSources.length) {
    throw new Error(`UI Kit: ${otherSources[0]!.node.name} sem ownership junto a um ` +
      'manifesto incompleto; recuperação interrompida.');
  }
  return roots;
}

function componentIdentity(node: ComponentNode, root: SceneNode): string {
  // The first Search Match Component Set promotes the two earlier standalone
  // masters into Default/Short variants. Keep their source identities so user
  // instances and direct Snippet overrides migrate during this one transition.
  if (node.parent?.type === 'COMPONENT_SET' &&
      node.parent.name === 'Obsidian / Search / Match' &&
      node.variantProperties?.State === 'Default' &&
      node.variantProperties?.Context === 'Short' &&
      ['Yes', 'No'].includes(node.variantProperties?.Divider ?? '')) {
    return `Obsidian / Search / Match / ` +
      (node.variantProperties.Divider === 'Yes' ? 'Divider' : 'Last');
  }
  const path: string[] = [];
  let current: BaseNode | null = node;
  while (current && current !== root.parent) {
    if (current.type === 'COMPONENT') {
      path.unshift(current.parent?.type === 'COMPONENT_SET'
        ? JSON.stringify(current.variantProperties) : current.name);
    } else if (current.type !== 'PAGE') path.unshift(current.name);
    if (current === root) break;
    current = current.parent;
  }
  return path.join('\u001f');
}

function sourceComponents(roots: readonly SceneNode[]): Map<string, ComponentNode> {
  const result = new Map<string, ComponentNode>();
  for (const root of roots) for (const node of descendants(root)) {
    if (node.type !== 'COMPONENT') continue;
    const key = componentIdentity(node, root);
    if (result.has(key)) throw new Error(`UI Kit: identidade duplicada de Component: ${key}.`);
    result.set(key, node);
  }
  return result;
}

function rememberRootPlacement(oldRoots: readonly SceneNode[]): Map<string, Array<{ x: number; y: number }>> {
  const oldByIdentity = new Map<string, Array<{ x: number; y: number }>>();
  for (const root of oldRoots) {
    const key = `${root.type}\u001f${root.name}`;
    const matches = oldByIdentity.get(key) ?? [];
    if ('x' in root) matches.push({ x: root.x, y: root.y });
    oldByIdentity.set(key, matches);
  }
  return oldByIdentity;
}

function restoreRootPlacement(page: PageNode, oldByIdentity: Map<string,
  Array<{ x: number; y: number }>>, newRoots: readonly SceneNode[]): void {
  for (const root of newRoots) {
    const prior = oldByIdentity.get(`${root.type}\u001f${root.name}`)?.shift();
    if (prior && 'x' in root) {
      root.x = prior.x;
      root.y = prior.y;
      if (root.parent !== page && !root.removed) {
        page.appendChild(root);
        root.x = prior.x;
        root.y = prior.y;
      }
    }
  }
}

interface PropertySnapshot {
  name: string;
  type: ComponentPropertyType;
  value: string | boolean;
}

function propertiesOf(instance: InstanceNode): PropertySnapshot[] {
  return Object.entries(instance.componentProperties).map(([key, property]) => ({
    name: key.replace(/#.*$/, ''), type: property.type, value: property.value,
  }));
}

function restoreProperties(instance: InstanceNode, saved: readonly PropertySnapshot[],
  componentIds: ReadonlyMap<string, ComponentNode>): void {
  const current = Object.entries(instance.componentProperties);
  const values: Record<string, string | boolean> = {};
  for (const property of saved) {
    const matches = current.filter(([key, value]) =>
      key.replace(/#.*$/, '') === property.name && value.type === property.type);
    if (matches.length !== 1) {
      throw new Error(`UI Kit: override ${property.name} não encontrou propriedade equivalente.`);
    }
    if (property.type === 'SLOT') continue;
    values[matches[0]![0]] = property.type === 'INSTANCE_SWAP' &&
      typeof property.value === 'string' && componentIds.has(property.value)
      ? componentIds.get(property.value)!.id : property.value;
  }
  if (Object.keys(values).length) instance.setProperties(values);
  const after = Object.entries(instance.componentProperties);
  for (const property of saved) {
    const expected = property.type === 'INSTANCE_SWAP' && typeof property.value === 'string' &&
      componentIds.has(property.value) ? componentIds.get(property.value)!.id : property.value;
    const actual = after.find(([key, value]) =>
      key.replace(/#.*$/, '') === property.name && value.type === property.type)?.[1].value;
    if (actual !== expected) {
      throw new Error(`UI Kit: override ${property.name} não foi preservado na instância.`);
    }
  }
}

export interface UiKitNodeRun {
  page: PageNode;
  originalRootIds: Set<string>;
  /** True once the new manifest is written; staged roots must then be retained on errors. */
  committed: boolean;
  commit(newRoots: readonly SceneNode[]): Promise<{
    replaced: number; rebound: number; adopted: number }>;
}

export function verifyGeneratedRootsRetained(page: PageNode,
  roots: readonly SceneNode[]): void {
  const retained = new Set(page.children.map((node) => node.id));
  if (!roots.length || roots.some((node) =>
    node.removed || node.parent !== page || !retained.has(node.id))) {
    throw new Error('UI Kit: a nova geração não permaneceu na página após a substituição; ' +
      'o plugin não confirmou sucesso.');
  }
}

export async function beginUiKitNodeRun(): Promise<UiKitNodeRun> {
  await figma.loadAllPagesAsync();
  const previous = readManifest();
  const anchors = previous ? [] : legacyAnchors();
  let recovering = false;
  let page = figma.currentPage;
  if (previous) {
    const managed = figma.root.children.find((node) => node.id === previous.pageId);
    if (!managed) throw new Error('UI Kit: página gerenciada ausente; geração anterior preservada.');
    page = managed;
    try { ownedRoots(page, previous); }
    catch (error) {
      if (!(error instanceof Error) || !error.message.includes('raízes ausentes')) throw error;
      recoverStaleRoots(page, previous);
      recovering = true;
    }
    if (figma.currentPage !== page) await figma.setCurrentPageAsync(page);
  } else if (anchors.length) {
    preflightLegacyKits(anchors);
    page = anchors.find((anchor) => anchor.page === page)?.page ?? anchors[0]!.page;
    if (figma.currentPage !== page) await figma.setCurrentPageAsync(page);
  }
  const originalRootIds = new Set(page.children.map((node) => node.id));
  const run: UiKitNodeRun = {
    page, originalRootIds, committed: false,
    async commit(newRoots) {
      if (!newRoots.length || newRoots.some((node) => node.parent !== page ||
          originalRootIds.has(node.id))) {
        throw new Error('UI Kit: novas raízes inválidas; geração anterior preservada.');
      }
      const legacyGroups = previous ? [] : await recognizeLegacyKits(newRoots, anchors);
      const oldGroups = previous ? [recovering
        ? recoverStaleRoots(page, previous, newRoots) : ownedRoots(page, previous)] : legacyGroups;
      const oldRoots = oldGroups.flat();
      const newSources = sourceComponents(newRoots);
      const targets = new Map<string, ComponentNode>();
      for (const group of oldGroups) {
        const oldSources = sourceComponents(group);
        // A later kit may add new Component families. Every old source must still
        // have an equivalent target so external instances can migrate safely.
        if ([...oldSources.keys()].some((key) => !newSources.has(key))) {
          throw new Error('UI Kit: Components incompatíveis com a geração anterior; instâncias preservadas.');
        }
        for (const [key, old] of oldSources) targets.set(old.id, newSources.get(key)!);
      }
      const priorPlacement = rememberRootPlacement(oldGroups[0] ?? []);
      const excluded = new Set([...oldRoots, ...newRoots].flatMap(descendants).map((node) => node.id));
      const swaps: Array<{ instance: InstanceNode; source: ComponentNode;
        properties: PropertySnapshot[] }> = [];
      for (const otherPage of figma.root.children) for (const node of otherPage.findAll(
        (candidate) => candidate.type === 'INSTANCE')) {
        if (node.type !== 'INSTANCE') continue;
        if (excluded.has(node.id)) continue;
        const source = await node.getMainComponentAsync();
        if (source && targets.has(source.id)) swaps.push({ instance: node,
          source, properties: propertiesOf(node) });
      }
      const changed: typeof swaps = [];
      try {
        for (const swap of swaps) {
          changed.push(swap);
          swap.instance.swapComponent(targets.get(swap.source.id)!);
          restoreProperties(swap.instance, swap.properties, targets);
        }
        if (newRoots.some((node) => node.parent !== page || node.removed)) {
          throw new Error('UI Kit: raiz nova saiu da página antes da substituição; kit antigo preservado.');
        }
        const generationId = newRoots[0]!.id;
        for (const root of newRoots) for (const node of descendants(root)) {
          node.setSharedPluginData(namespace, nodeKey, generationId);
        }
        const next: Manifest = { version: 1, pageId: page.id, generationId,
          rootIds: newRoots.map((node) => node.id) };
        figma.root.setSharedPluginData(namespace, manifestKey, JSON.stringify(next));
        run.committed = true;
      } catch (error) {
        for (const swap of changed.reverse()) {
          swap.instance.swapComponent(swap.source);
          restoreProperties(swap.instance, swap.properties, new Map());
        }
        throw error;
      }
      for (const root of oldRoots) root.remove();
      restoreRootPlacement(page, priorPlacement, newRoots);
      return { replaced: oldRoots.length, rebound: swaps.length,
        adopted: legacyGroups.length };
    },
  };
  return run;
}
