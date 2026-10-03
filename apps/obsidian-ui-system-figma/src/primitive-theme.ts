import { fileExplorerBackgroundPaint } from './file-explorer-row-color';

export type PrimitiveMode = 'dark' | 'light';
type ColorKey = 'icon' | 'rowDefaultText' | 'rowSelectedText' | 'rowSelectedBackground' |
  'disclosure' | 'metadata';
type RadiusKey = 'mediumRadius' | 'metadataRadius';

export interface PrimitiveAppearance {
  colors: Record<ColorKey, RGB>;
  radii: Record<RadiusKey, number>;
  selectedOpacity: number;
  mutedOpacity: number;
}

export interface PrimitiveThemeEvidence { dark: PrimitiveAppearance; light: PrimitiveAppearance }

export interface PrimitiveVariables {
  collection: VariableCollection;
  modeIds: Record<PrimitiveMode, string>;
  colors: Record<ColorKey, Variable>;
  radii: Record<RadiusKey, Variable>;
  dark: PrimitiveAppearance;
}

function rgb(css: unknown): RGB {
  if (typeof css !== 'string') throw new Error('Primitive theme: cor ausente.');
  const channels = /^rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)$/.exec(css)?.slice(1).map(Number);
  if (!channels || channels.some((value) => value > 255)) {
    throw new Error(`Primitive theme: cor não suportada: ${css}.`);
  }
  return { r: channels[0]! / 255, g: channels[1]! / 255, b: channels[2]! / 255 };
}

function radius(css: unknown): number {
  if (typeof css !== 'string' || !/^\d+(?:\.\d+)?px$/.test(css)) {
    throw new Error(`Primitive theme: radius não suportado: ${String(css)}.`);
  }
  return Number(css.slice(0, -2));
}

export function readPrimitiveThemeEvidence(input: unknown): PrimitiveThemeEvidence {
  if (!input || typeof input !== 'object' ||
      (input as { format?: unknown }).format !== 'obsidian-ui-primitive-theme-evidence' ||
      (input as { version?: unknown }).version !== 1) {
    throw new Error('Primitive theme: fixture inválido.');
  }
  const modes = (input as { modes?: Record<string, Record<string, unknown>> }).modes;
  if (!modes?.dark || !modes.light) throw new Error('Primitive theme: Dark/Light ausentes.');
  const parse = (mode: PrimitiveMode): PrimitiveAppearance => {
    const raw = modes[mode]!;
    const selected = fileExplorerBackgroundPaint(String(raw.rowSelectedBackgroundCss));
    const iconRadius = radius(raw.iconRadiusCss);
    const rowRadius = radius(raw.rowRadiusCss);
    if (iconRadius !== rowRadius) throw new Error(`Primitive theme: radius médio diverge em ${mode}.`);
    const opacity = raw.iconMutedOpacity;
    if (typeof opacity !== 'number' || opacity <= 0 || opacity > 1) {
      throw new Error(`Primitive theme: opacidade do glyph inválida em ${mode}.`);
    }
    return { colors: {
      icon: rgb(raw.iconColorCss),
      rowDefaultText: rgb(raw.rowDefaultTextCss),
      rowSelectedText: rgb(raw.rowSelectedTextCss),
      rowSelectedBackground: selected.color,
      disclosure: rgb(raw.disclosureColorCss),
      metadata: rgb(raw.metadataColorCss),
    }, radii: { mediumRadius: rowRadius, metadataRadius: radius(raw.metadataRadiusCss) },
    selectedOpacity: selected.opacity ?? 1, mutedOpacity: opacity };
  };
  const dark = parse('dark');
  const light = parse('light');
  if (dark.selectedOpacity !== light.selectedOpacity || dark.mutedOpacity !== light.mutedOpacity ||
      dark.radii.mediumRadius !== light.radii.mediumRadius ||
      dark.radii.metadataRadius !== light.radii.metadataRadius) {
    throw new Error('Primitive theme: geometria ou opacidade diverge entre modos.');
  }
  return { dark, light };
}

/** One collection shared by the two primitives; the kit's other components stay unthemed. */
export function createPrimitiveVariables(evidence: PrimitiveThemeEvidence): PrimitiveVariables {
  const collection = figma.variables.createVariableCollection('Obsidian UI / Navigation primitives');
  try {
    const dark = collection.modes[0]!.modeId;
    collection.renameMode(dark, 'Dark');
    const modeIds = { dark, light: collection.addMode('Light') };
    const colors = {} as Record<ColorKey, Variable>;
    const radii = {} as Record<RadiusKey, Variable>;
    const colorNames: Record<ColorKey, [string, VariableScope[]]> = {
      icon: ['icon-button/foreground', ['STROKE_COLOR', 'SHAPE_FILL']],
      rowDefaultText: ['tree-row/text/default', ['TEXT_FILL']],
      rowSelectedText: ['tree-row/text/selected', ['TEXT_FILL']],
      rowSelectedBackground: ['tree-row/background/selected', ['FRAME_FILL']],
      disclosure: ['tree-row/disclosure', ['STROKE_COLOR', 'SHAPE_FILL']],
      metadata: ['tree-row/metadata/text', ['TEXT_FILL']],
    };
    for (const key of Object.keys(colorNames) as ColorKey[]) {
      const [name, scopes] = colorNames[key];
      const variable = figma.variables.createVariable(name, collection, 'COLOR');
      variable.scopes = scopes;
      variable.description = 'Computed visual value observed in Obsidian Desktop for the two navigation primitives.';
      variable.setVariableCodeSyntax('WEB', `var(--obsidian-ui-${name.replace(/\//g, '-')})`);
      variable.setValueForMode(dark, evidence.dark.colors[key]);
      variable.setValueForMode(modeIds.light, evidence.light.colors[key]);
      colors[key] = variable;
    }
    for (const [key, name] of [['mediumRadius', 'radius/medium'],
      ['metadataRadius', 'radius/metadata']] as const) {
      const variable = figma.variables.createVariable(name, collection, 'FLOAT');
      variable.scopes = ['CORNER_RADIUS'];
      variable.description = 'Observed radius shared by the bounded navigation primitives.';
      variable.setVariableCodeSyntax('WEB', `var(--obsidian-ui-${name.replace(/\//g, '-')})`);
      variable.setValueForMode(dark, evidence.dark.radii[key]);
      variable.setValueForMode(modeIds.light, evidence.light.radii[key]);
      radii[key] = variable;
    }
    return { collection, modeIds, colors, radii, dark: evidence.dark };
  } catch (error) {
    collection.remove();
    throw error;
  }
}

export function boundColorPaint(color: RGB, variable: Variable, opacity = 1): SolidPaint {
  const bound = figma.variables.setBoundVariableForPaint({ type: 'SOLID', color, opacity },
    'color', variable);
  return { ...bound, opacity };
}

/** SVG imports may include hidden bounding-box paints; bind only the observed glyph paint. */
export function observedGlyphPaint(paint: Paint, observed: RGB): paint is SolidPaint {
  return paint.type === 'SOLID' && paint.visible !== false && (paint.opacity ?? 1) > 0 &&
    Math.abs(paint.color.r - observed.r) < 1e-4 &&
    Math.abs(paint.color.g - observed.g) < 1e-4 &&
    Math.abs(paint.color.b - observed.b) < 1e-4;
}

export function bindObservedGlyphPaint(paint: SolidPaint, variable: Variable): SolidPaint {
  const bound = figma.variables.setBoundVariableForPaint(paint, 'color', variable);
  return { ...bound,
    ...(paint.visible === undefined ? {} : { visible: paint.visible }),
    ...(paint.opacity === undefined ? {} : { opacity: paint.opacity }),
    ...(paint.blendMode === undefined ? {} : { blendMode: paint.blendMode }) };
}
