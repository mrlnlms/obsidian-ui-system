import type { UiKitThemeBinding, UiKitThemeVariables } from './ui-kit-theme';

function sameColor(actual: VariableValue, expected: RGB): boolean {
  return typeof actual === 'object' && actual !== null && 'r' in actual &&
    Math.abs(actual.r - expected.r) < 1e-6 && Math.abs(actual.g - expected.g) < 1e-6 &&
    Math.abs(actual.b - expected.b) < 1e-6;
}

function structure(root: SceneNode): string {
  const descendants = 'findAll' in root ? root.findAll(() => true) : [];
  return JSON.stringify({ size: [root.width, root.height],
    instances: descendants.filter((node): node is InstanceNode => node.type === 'INSTANCE')
      .map((node) => [node.id, node.width, node.height, node.componentProperties]),
    texts: descendants.filter((node): node is TextNode => node.type === 'TEXT')
      .map((node) => [node.id, node.characters, node.width, node.height]) });
}

/** In-plugin readback of the generated Component roots and hosted previews. */
export function verifyUiKitThemeModes(theme: UiKitThemeVariables,
  bindings: readonly UiKitThemeBinding[], hostedPreviews: readonly FrameNode[]): void {
  const overlays = bindings.filter((binding) => binding.role === 'selectedOverlay');
  if (overlays.length < 2 || overlays.some(({ consumer }) =>
    consumer.type !== 'RECTANGLE' || consumer.name !== 'Selection background' ||
    Math.abs(consumer.opacity - theme.evidence.roles.selectedOverlay.opacity!) > 0.001 ||
    !consumer.parent || !('width' in consumer.parent) ||
    Math.abs(consumer.width - consumer.parent.width) > 0.5)) {
    throw new Error('UI Kit theme: transparência ou largura da seleção divergente.');
  }
  const highlights = bindings.filter((binding) => binding.role === 'matchHighlight');
  if (!highlights.length || highlights.some(({ consumer }) =>
    consumer.type !== 'RECTANGLE' || consumer.name !== 'Match highlight underlay' ||
    consumer.parent?.name !== 'Matched title text' ||
    Math.abs(consumer.opacity - theme.evidence.roles.matchHighlight.opacity!) > 0.001 ||
    !consumer.parent || !('width' in consumer.parent) ||
    Math.abs(consumer.width - consumer.parent.width) > 0.5)) {
    throw new Error('UI Kit theme: transparência ou largura do destaque Search divergente.');
  }
  const roots = [...new Set(bindings.map((binding) => binding.root))];
  for (const root of roots) {
    const before = structure(root);
    const previous = root.explicitVariableModes[theme.primitive.collection.id];
    try {
      for (const mode of ['dark', 'light', 'dark'] as const) {
        root.setExplicitVariableModeForCollection(theme.primitive.collection,
          theme.primitive.modeIds[mode]);
        for (const binding of bindings.filter((candidate) => candidate.root === root)) {
          const expected = theme.evidence.roles[binding.role][mode];
          const actual = theme.colors[binding.role].resolveForConsumer(binding.consumer).value;
          if (!sameColor(actual, expected)) {
            throw new Error(`UI Kit theme: ${root.name}/${binding.role} não propagou ${mode}.`);
          }
        }
        if (structure(root) !== before) {
          throw new Error(`UI Kit theme: estrutura ou instâncias mudaram em ${root.name}/${mode}.`);
        }
      }
    } finally {
      previous
        ? root.setExplicitVariableModeForCollection(theme.primitive.collection, previous)
        : root.clearExplicitVariableModeForCollection(theme.primitive.collection);
    }
  }
  for (const preview of hostedPreviews) {
    if (!preview.boundVariables?.fills?.some((binding) =>
      binding.id === theme.colors.surfacePrimary.id)) {
      throw new Error(`UI Kit theme: fundo do preview ${preview.name} não vinculado.`);
    }
    const previous = preview.explicitVariableModes[theme.primitive.collection.id];
    const before = structure(preview);
    try {
      for (const mode of ['dark', 'light', 'dark'] as const) {
        preview.setExplicitVariableModeForCollection(theme.primitive.collection,
          theme.primitive.modeIds[mode]);
        const actual = theme.colors.surfacePrimary.resolveForConsumer(preview).value;
        if (!sameColor(actual, theme.evidence.roles.surfacePrimary[mode]) ||
            structure(preview) !== before) {
          throw new Error(`UI Kit theme: preview ${preview.name} divergiu em ${mode}.`);
        }
      }
    } finally {
      previous
        ? preview.setExplicitVariableModeForCollection(theme.primitive.collection, previous)
        : preview.clearExplicitVariableModeForCollection(theme.primitive.collection);
    }
  }
}
