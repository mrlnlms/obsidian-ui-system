/** Stable identities used to recognize this plugin's local appearance collections. */
export const appearanceCollectionName = 'Obsidian UI / Appearance';
export const legacyNavigationCollectionName = 'Obsidian UI / Navigation primitives';

export const primitiveColorNames = {
  icon: 'icon-button/foreground',
  rowDefaultText: 'tree-row/text/default',
  rowSelectedText: 'tree-row/text/selected',
  rowSelectedBackground: 'tree-row/background/selected',
  disclosure: 'tree-row/disclosure',
  metadata: 'tree-row/metadata/text',
  treeGuide: 'tree-row/guide',
} as const;

export const primitiveRadiusNames = {
  mediumRadius: 'radius/medium', metadataRadius: 'radius/metadata',
} as const;

export const uiKitColorRoles = ['surfacePrimary', 'surfaceSecondary', 'formField',
  'controlFill', 'controlBorder', 'textNormal', 'textMuted', 'textFaint',
  'accentFill', 'matchHighlight', 'selectedOverlay'] as const;

export type UiKitColorRole = typeof uiKitColorRoles[number];
export const uiKitVariableName = (role: UiKitColorRole): string => `ui-kit/${role}`;

export const uiKitWebSyntax: Record<UiKitColorRole, string> = {
  surfacePrimary: '--background-primary', surfaceSecondary: '--background-secondary',
  formField: '--background-modifier-form-field', controlFill: '--interactive-normal',
  controlBorder: '--background-modifier-border', textNormal: '--text-normal',
  textMuted: '--text-muted', textFaint: '--text-faint', accentFill: '--interactive-accent',
  matchHighlight: '--obsidian-ui-search-mark', selectedOverlay: '--background-modifier-hover',
};

/** The guide was added after the first full-kit checkpoint. */
export const requiredPrimitiveNames = [
  primitiveColorNames.icon, primitiveColorNames.rowDefaultText,
  primitiveColorNames.rowSelectedText, primitiveColorNames.rowSelectedBackground,
  primitiveColorNames.disclosure, primitiveColorNames.metadata,
  primitiveRadiusNames.mediumRadius, primitiveRadiusNames.metadataRadius,
] as const;

export const appearanceVariableTypes = new Map<string, VariableResolvedDataType>([
  ...Object.values(primitiveColorNames).map((name) => [name, 'COLOR'] as const),
  ...Object.values(primitiveRadiusNames).map((name) => [name, 'FLOAT'] as const),
  ...uiKitColorRoles.map((role) => [uiKitVariableName(role), 'COLOR'] as const),
]);
