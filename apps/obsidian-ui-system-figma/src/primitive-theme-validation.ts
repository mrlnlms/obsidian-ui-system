import type { IconButtonLibrary } from './icon-button-generation';
import type { TreeRowLibrary } from './tree-navigation-row-generation';
import type { PrimitiveColorKey, PrimitiveVariables } from './primitive-theme';

type PrimitiveRoot = ComponentSetNode | FrameNode;

function sameColor(actual: VariableValue, expected: RGB, tolerance = 1e-6): boolean {
  return typeof actual === 'object' && actual !== null && 'r' in actual &&
    Math.abs(actual.r - expected.r) < tolerance && Math.abs(actual.g - expected.g) < tolerance &&
    Math.abs(actual.b - expected.b) < tolerance;
}

function boundText(root: PrimitiveRoot, variable: Variable): TextNode {
  const node = root.findOne((candidate) => candidate.type === 'TEXT' &&
    !!candidate.boundVariables?.fills?.some((binding) => binding.id === variable.id));
  if (node?.type !== 'TEXT') throw new Error(`Primitive theme: texto ${variable.name} não vinculado em ${root.name}.`);
  return node;
}

function boundGlyph(root: PrimitiveRoot, variable: Variable): SceneNode {
  const node = root.findOne((candidate) =>
    !!candidate.boundVariables?.strokes?.some((binding) => binding.id === variable.id) ||
    !!candidate.boundVariables?.fills?.some((binding) => binding.id === variable.id));
  if (!node) throw new Error(`Primitive theme: glyph não vinculado em ${root.name}.`);
  return node;
}

function boundFill(root: PrimitiveRoot, variable: Variable): SceneNode {
  const node = root.findOne((candidate) =>
    !!candidate.boundVariables?.fills?.some((binding) => binding.id === variable.id));
  if (!node) throw new Error(`Primitive theme: fill ${variable.name} não vinculado em ${root.name}.`);
  return node;
}

function structure(root: PrimitiveRoot): string {
  return JSON.stringify({ width: root.width, height: root.height,
    instances: root.findAll((node) => node.type === 'INSTANCE').map((node) => {
      const instance = node as InstanceNode;
      return { id: instance.id, width: instance.width, height: instance.height,
        properties: instance.componentProperties };
    }),
    labels: root.findAll((node) => node.type === 'TEXT' && node.name === 'Label')
      .map((node) => ({ id: node.id, text: (node as TextNode).characters })) });
}

/** In-plugin readback: variables resolve through existing nested instances without changing anatomy. */
export function verifyPrimitiveThemeModes(theme: PrimitiveVariables, icons: IconButtonLibrary,
  rows: TreeRowLibrary, filesPreview: FrameNode, searchPreview: FrameNode): void {
  const cases: Array<{ root: PrimitiveRoot; key: PrimitiveColorKey;
    variable: Variable; consumer: SceneNode }> = [
    { root: icons.set, key: 'icon', variable: theme.colors.icon,
      consumer: boundGlyph(icons.set, theme.colors.icon) },
    { root: rows.set, key: 'rowDefaultText', variable: theme.colors.rowDefaultText,
      consumer: boundText(rows.set, theme.colors.rowDefaultText) },
    { root: rows.set, key: 'rowSelectedText', variable: theme.colors.rowSelectedText,
      consumer: boundText(rows.set, theme.colors.rowSelectedText) },
    { root: rows.set, key: 'rowSelectedBackground', variable: theme.colors.rowSelectedBackground,
      consumer: boundFill(rows.set, theme.colors.rowSelectedBackground) },
    { root: rows.set, key: 'disclosure', variable: theme.colors.disclosure,
      consumer: boundGlyph(rows.set, theme.colors.disclosure) },
    { root: rows.set, key: 'metadata', variable: theme.colors.metadata,
      consumer: boundText(rows.set, theme.colors.metadata) },
    { root: filesPreview, key: 'icon', variable: theme.colors.icon,
      consumer: boundGlyph(filesPreview, theme.colors.icon) },
    { root: filesPreview, key: 'rowDefaultText', variable: theme.colors.rowDefaultText,
      consumer: boundText(filesPreview, theme.colors.rowDefaultText) },
    { root: searchPreview, key: 'icon', variable: theme.colors.icon,
      consumer: boundGlyph(searchPreview, theme.colors.icon) },
  ];
  const roots = [icons.set, rows.set, filesPreview, searchPreview];
  const selection = boundFill(rows.set, theme.colors.rowSelectedBackground);
  if (selection.type !== 'RECTANGLE') {
    throw new Error(`Primitive theme: fundo da seleção não é Rectangle (${selection.type}).`);
  }
  if (Math.abs(selection.opacity - theme.dark.selectedOpacity) > 0.001) {
    throw new Error('Primitive theme: transparência da seleção divergente: ' +
      JSON.stringify({ opacity: selection.opacity,
        expected: theme.dark.selectedOpacity }));
  }
  verifySelectionResize(rows, theme.dark.selectedOpacity);
  const before = roots.map(structure);
  const originalModes = roots.map((root) => root.explicitVariableModes[theme.collection.id]);
  roots.forEach((root, index) => {
    try {
      for (const mode of ['dark', 'light', 'dark'] as const) {
        root.setExplicitVariableModeForCollection(theme.collection, theme.modeIds[mode]);
        for (const item of cases.filter((candidate) => candidate.root === root)) {
          const actual = item.variable.resolveForConsumer(item.consumer).value;
          if (!sameColor(actual, theme[mode].colors[item.key],
            item.key === 'rowSelectedBackground' ? 1 / 255 : 1e-6) ||
              item.consumer.resolvedVariableModes[theme.collection.id] !== theme.modeIds[mode]) {
            throw new Error(`Primitive theme: ${item.root.name}/${item.variable.name} não propagou ${mode}.`);
          }
        }
        if (structure(root) !== before[index]) {
          throw new Error(`Primitive theme: estrutura, resize ou instance swaps mudaram em ${mode}.`);
        }
      }
    } finally {
      originalModes[index]
        ? root.setExplicitVariableModeForCollection(theme.collection, originalModes[index]!)
        : root.clearExplicitVariableModeForCollection(theme.collection);
    }
  });
}

function verifySelectionResize(rows: TreeRowLibrary, expectedOpacity: number): void {
  const selected = rows.set.children.find((node): node is ComponentNode =>
    node.type === 'COMPONENT' && node.variantProperties?.State === 'Selected');
  if (!selected) throw new Error('Primitive theme: variant Selected ausente.');
  const sample = selected.createInstance();
  try {
    for (const width of [200, 300]) {
      sample.resize(width, selected.height);
      const underlay = sample.findOne((node) => node.name === 'Selection background');
      if (underlay?.type !== 'RECTANGLE') {
        throw new Error(`Primitive theme: underlay ausente em ${width} px.`);
      }
      if (Math.abs(underlay.width - sample.width) > 0.5 ||
          Math.abs(underlay.height - sample.height) > 0.5 ||
          Math.abs(underlay.opacity - expectedOpacity) > 0.001) {
        throw new Error('Primitive theme: underlay não acompanhou resize: ' +
          JSON.stringify({ width, instance: [sample.width, sample.height],
            underlay: [underlay.width, underlay.height, underlay.opacity] }));
      }
    }
  } finally {
    sample.remove();
  }
}
