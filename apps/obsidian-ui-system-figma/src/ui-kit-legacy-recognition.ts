import { isPluginAppearanceCollection } from './appearance-lifecycle';

/** Only the complete, contiguous full-kit output from the last pre-ownership generator is adopted. */
const canonicalSetNames = new Set(['Obsidian / Button', 'Obsidian / Search',
  'Obsidian / Icon Button', 'Obsidian / Tree Navigation Row']);

export interface LegacyAnchor {
  page: PageNode;
  node: SceneNode;
}

export function legacyAnchors(): LegacyAnchor[] {
  const result: LegacyAnchor[] = [];
  for (const page of figma.root.children) for (const node of page.findAll(() => true)) {
    if ((node.type === 'COMPONENT_SET' && canonicalSetNames.has(node.name)) ||
        (node.type === 'COMPONENT' && node.name.startsWith('Obsidian / Glyph /'))) {
      result.push({ page, node });
    }
  }
  return result;
}

/** Read-only gate before the generator updates Variables or creates staging nodes. */
export function preflightLegacyKits(anchors: readonly LegacyAnchor[]): void {
  for (const page of new Set(anchors.map((anchor) => anchor.page))) {
    const nodes = page.findAll(() => true);
    const sets = nodes.filter((node): node is ComponentSetNode =>
      node.type === 'COMPONENT_SET' && canonicalSetNames.has(node.name));
    const counts = [...canonicalSetNames].map((name) =>
      sets.filter((set) => set.name === name).length);
    if (counts.some((count) => count !== counts[0] || count === 0)) {
      throw new Error(`UI Kit legado: ${page.name}: Component Sets incompletos; ` +
        [...canonicalSetNames].map((name, index) => `${name}=${counts[index]}`).join(', ') +
        '. Nenhum node foi alterado.');
    }
    const required = new Map<string, Record<string, ComponentPropertyType>>([
      ['Obsidian / Button', { State: 'VARIANT', Label: 'TEXT' }],
      ['Obsidian / Search', { State: 'VARIANT', Placeholder: 'TEXT', Value: 'TEXT' }],
      ['Obsidian / Icon Button', { Context: 'VARIANT', State: 'VARIANT',
        Tone: 'VARIANT', Icon: 'INSTANCE_SWAP' }],
      ['Obsidian / Tree Navigation Row', { Kind: 'VARIANT', Depth: 'VARIANT',
        State: 'VARIANT', Label: 'TEXT', Metadata: 'TEXT', 'Show metadata': 'BOOLEAN' }],
    ]);
    for (const set of sets) {
      const definitions = Object.entries(set.componentPropertyDefinitions).map(
        ([key, definition]) => [propertyName(key), definition.type] as const);
      for (const [name, type] of Object.entries(required.get(set.name)!)) {
        if (!definitions.some(([key, actual]) => key === name && actual === type)) {
          throw new Error(`UI Kit legado: ${page.name}: ${set.name} (${set.id}) sem ` +
            `${name}:${type}. Nenhum node foi alterado.`);
        }
      }
    }
    const glyphs = nodes.filter((node) => node.type === 'COMPONENT' &&
      node.name.startsWith('Obsidian / Glyph / '));
    if (!glyphs.length) {
      throw new Error(`UI Kit legado: ${page.name}: biblioteca Glyph ausente. ` +
        'Nenhum node foi alterado.');
    }
    for (const name of ['Search', 'Files', 'Bookmarks']) {
      if (!nodes.some((node) => node.type === 'FRAME' &&
          node.name.includes('resize preview') && node.name.includes(name))) {
        throw new Error(`UI Kit legado: ${page.name}: preview hospedado ${name} ausente. ` +
          'Nenhum node foi alterado.');
      }
    }
  }
}

function descendants(root: SceneNode): SceneNode[] {
  return [root, ...('findAll' in root ? root.findAll(() => true) : [])];
}

function sourceKey(node: ComponentNode, root: SceneNode): string {
  const parts: string[] = [];
  let current: BaseNode | null = node;
  while (current && current !== root.parent) {
    if (current.type === 'COMPONENT' && current.parent?.type === 'COMPONENT_SET') {
      parts.unshift(JSON.stringify(current.variantProperties));
    } else if (current.type !== 'PAGE') parts.unshift(current.name);
    if (current === root) break;
    current = current.parent;
  }
  return parts.join('\u001f');
}

function sources(roots: readonly SceneNode[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const root of roots) for (const node of descendants(root)) {
    if (node.type === 'COMPONENT') result.set(node.id, sourceKey(node, root));
  }
  return result;
}

function propertyName(value: string): string { return value.replace(/#.*$/, ''); }

function normalize(value: unknown, sourceIds: Map<string, string>,
  variableIds: Map<string, string>): unknown {
  if (typeof value === 'string') return sourceIds.get(value) ?? variableIds.get(value) ?? value;
  if (typeof value === 'number') return Math.round(value * 10000) / 10000;
  if (Array.isArray(value)) return value.map((item) => normalize(item, sourceIds, variableIds));
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    if (object.type === 'VARIABLE_ALIAS' && typeof object.id === 'string' &&
        !variableIds.has(object.id)) {
      throw new Error(`binding de Variable desconhecida: ${object.id}`);
    }
    return Object.fromEntries(Object.keys(object).sort().map((key) =>
      [key, normalize(object[key], sourceIds, variableIds)]));
  }
  return value;
}

function propertyMap(value: Record<string, unknown> | undefined, sourceIds: Map<string, string>,
  variableIds: Map<string, string>): unknown {
  if (!value) return null;
  const entries = Object.entries(value).map(([key, item]) =>
    [propertyName(key), normalize(item, sourceIds, variableIds)] as const);
  if (new Set(entries.map(([key]) => key)).size !== entries.length) {
    throw new Error('propriedades de Component com nomes ambíguos');
  }
  return Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b)));
}

function referenceMap(value: Record<string, string> | null,
  sourceIds: Map<string, string>, variableIds: Map<string, string>): unknown {
  if (!value) return null;
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => [key, typeof item === 'string' ? propertyName(item) :
      normalize(item, sourceIds, variableIds)]));
}

function nodeField(node: SceneNode, key: string): unknown {
  return (node as unknown as Record<string, unknown>)[key];
}

function paintFields(node: SceneNode, field: 'fills' | 'strokes',
  sourceIds: Map<string, string>, variableIds: Map<string, string>): unknown {
  const value = nodeField(node, field);
  if (!Array.isArray(value)) return null;
  return value.map((paint) => normalize(paint, sourceIds, variableIds));
}

async function fingerprint(node: SceneNode, root: SceneNode, sourceIds: Map<string, string>,
  variableIds: Map<string, string>): Promise<unknown> {
  const fields: Record<string, unknown> = { type: node.type, name: node.name,
    visible: node.visible, opacity: nodeField(node, 'opacity') };
  for (const key of ['description', 'width', 'height', 'layoutMode', 'primaryAxisSizingMode',
    'counterAxisSizingMode', 'layoutAlign', 'layoutGrow', 'clipsContent', 'cornerRadius',
    'constraints', 'textAutoResize', 'characters', 'fontName', 'fontSize', 'lineHeight',
    'letterSpacing', 'vectorPaths', 'vectorNetwork', 'arcData', 'pointCount', 'innerRadius',
    'strokeWeight', 'strokeCap', 'strokeJoin', 'strokeAlign', 'dashPattern', 'rotation']) {
    const value = nodeField(node, key);
    if (value !== undefined) fields[key] = normalize(value, sourceIds, variableIds);
  }
  if (node !== root) { fields.x = normalize(nodeField(node, 'x'), sourceIds, variableIds);
    fields.y = normalize(nodeField(node, 'y'), sourceIds, variableIds); }
  fields.fills = paintFields(node, 'fills', sourceIds, variableIds);
  fields.strokes = paintFields(node, 'strokes', sourceIds, variableIds);
  fields.boundVariables = normalize(node.boundVariables, sourceIds, variableIds) ?? null;
  fields.propertyReferences = referenceMap(node.componentPropertyReferences,
    sourceIds, variableIds);
  if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
    fields.definitions = propertyMap(node.componentPropertyDefinitions, sourceIds, variableIds);
  }
  if (node.type === 'COMPONENT') fields.variantProperties = normalize(node.variantProperties,
    sourceIds, variableIds);
  if (node.type === 'INSTANCE') {
    const main = await node.getMainComponentAsync();
    if (!main || !sourceIds.has(main.id)) {
      throw new Error(`${node.name}: instância aponta para Component fora da geração`);
    }
    fields.main = sourceIds.get(main.id);
    fields.properties = propertyMap(node.componentProperties, sourceIds, variableIds);
  }
  if (node.type === 'COMPONENT' && node.name.startsWith('Obsidian / Glyph / ')) {
    const geometry = descendants(node).filter((item) => ['VECTOR', 'ELLIPSE', 'RECTANGLE',
      'LINE', 'POLYGON', 'STAR', 'BOOLEAN_OPERATION'].includes(item.type));
    if (!geometry.length || geometry.some((item) =>
      item.type === 'VECTOR' && item.vectorPaths.length === 0)) {
      throw new Error(`${node.name}: geometria canônica ausente`);
    }
  }
  if ('children' in node) {
    fields.children = await Promise.all(node.children.map((child) =>
      fingerprint(child, root, sourceIds, variableIds)));
  }
  return fields;
}

async function variableNames(): Promise<Map<string, string>> {
  const [collections, variables] = await Promise.all([
    figma.variables.getLocalVariableCollectionsAsync(), figma.variables.getLocalVariablesAsync(),
  ]);
  const recognized = new Set(collections.filter((collection) =>
    isPluginAppearanceCollection(collection, variables)).map((collection) => collection.id));
  return new Map(variables.filter((variable) => recognized.has(variable.variableCollectionId))
    .map((variable) => [variable.id, `${variable.name}:${variable.resolvedType}`]));
}

function sameRootNames(a: readonly SceneNode[], b: readonly SceneNode[]): boolean {
  return a.length === b.length && a.every((node, index) =>
    node.type === b[index]!.type && node.name === b[index]!.name);
}

function firstDifference(actual: unknown, expected: unknown, path: string): string | undefined {
  if (JSON.stringify(actual) === JSON.stringify(expected)) return undefined;
  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) return `${path}.length: ${actual.length} != ${expected.length}`;
    for (let index = 0; index < actual.length; index++) {
      const difference = firstDifference(actual[index], expected[index], `${path}[${index}]`);
      if (difference) return difference;
    }
  }
  if (actual && expected && typeof actual === 'object' && typeof expected === 'object') {
    const a = actual as Record<string, unknown>;
    const b = expected as Record<string, unknown>;
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const difference = firstDifference(a[key], b[key], `${path}.${key}`);
      if (difference) return difference;
    }
  }
  const describe = (value: unknown) => JSON.stringify(value)?.slice(0, 100) ?? String(value);
  return `${path}: ${describe(actual)} != ${describe(expected)}`;
}

function rootSequenceMismatch(page: PageNode, template: readonly SceneNode[]): string {
  const roots = page.children.filter((node) => !template.includes(node));
  const first = roots.findIndex((node) => node.type === template[0]!.type &&
    node.name === template[0]!.name);
  if (first < 0) return `${page.name}: primeira raiz ${template[0]!.name} ausente`;
  for (let index = 0; index < template.length; index++) {
    const expected = template[index]!;
    const actual = roots[first + index];
    if (!actual || actual.type !== expected.type || actual.name !== expected.name) {
      return `${page.name}: raiz ${index + 1} esperada ${expected.type}/${expected.name}, ` +
        `encontrada ${actual ? `${actual.type}/${actual.name}` : 'nenhuma'}`;
    }
  }
  return `${page.name}: raiz canônica sem grupo completo reconhecido`;
}

/** Dry-run: no legacy node is changed here. Any unexplained source prevents adoption. */
export async function recognizeLegacyKits(template: readonly SceneNode[],
  anchors: readonly LegacyAnchor[]): Promise<SceneNode[][]> {
  if (!anchors.length) return [];
  const requiredSets = [...canonicalSetNames];
  const templateNodes = template.flatMap(descendants);
  if (!requiredSets.every((name) => templateNodes.some((node) =>
    node.type === 'COMPONENT_SET' && node.name === name)) ||
      !templateNodes.some((node) => node.type === 'COMPONENT' &&
        node.name.startsWith('Obsidian / Glyph / '))) {
    throw new Error('UI Kit legado: template atual não contém o contrato canônico completo.');
  }
  const variables = await variableNames();
  const templateSources = sources(template);
  const templateFingerprints = await Promise.all(template.map((root) =>
    fingerprint(root, root, templateSources, variables)));
  const groups: SceneNode[][] = [];
  const covered = new Set<string>();
  let mismatch: string | undefined;
  for (const page of figma.root.children) {
    const old = page.children.filter((node) => !template.includes(node));
    for (let index = 0; index <= old.length - template.length; index++) {
      const group = old.slice(index, index + template.length);
      if (!sameRootNames(group, template)) continue;
      try {
        const groupSources = sources(group);
        const actual = await Promise.all(group.map((root) =>
          fingerprint(root, root, groupSources, variables)));
        const different = actual.findIndex((item, at) =>
          JSON.stringify(item) !== JSON.stringify(templateFingerprints[at]));
        if (different >= 0) {
          mismatch = `${page.name}: ${firstDifference(actual[different],
            templateFingerprints[different], group[different]!.name)}`;
          continue;
        }
        groups.push(group);
        for (const root of group) for (const node of descendants(root)) covered.add(node.id);
        index += template.length - 1;
      } catch (error) {
        mismatch = `${page.name}: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  }
  const unresolved = anchors.find(({ node }) => !covered.has(node.id));
  if (unresolved) {
    throw new Error(`UI Kit legado: ${mismatch ?? rootSequenceMismatch(unresolved.page, template)}. ` +
      `Node não adotado: ${unresolved.node.name} (${unresolved.node.id}). ` +
      'Nenhum master antigo foi alterado.');
  }
  return groups;
}
