import { fileExplorerBackgroundPaint } from './file-explorer-row-color';
import { primitiveColorNames, primitiveRadiusNames } from './appearance-contract';
import type { AppearanceRun } from './appearance-lifecycle';

export type PrimitiveMode = 'dark' | 'light';
export type PrimitiveColorKey = 'icon' | 'rowDefaultText' | 'rowSelectedText' | 'rowSelectedBackground' |
  'disclosure' | 'metadata' | 'treeGuide';
type RadiusKey = 'mediumRadius' | 'metadataRadius';

export interface PrimitiveAppearance {
  colors: Record<PrimitiveColorKey, RGB>;
  radii: Record<RadiusKey, number>;
  selectedOpacity: number;
  mutedOpacity: number;
  treeGuideOpacity: number;
}

export interface PrimitiveThemeEvidence { dark: PrimitiveAppearance; light: PrimitiveAppearance }

export interface PrimitiveVariables {
  collection: VariableCollection;
  modeIds: Record<PrimitiveMode, string>;
  colors: Record<PrimitiveColorKey, Variable>;
  radii: Record<RadiusKey, Variable>;
  dark: PrimitiveAppearance;
  light: PrimitiveAppearance;
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
      treeGuide: rgb(raw.treeGuideColorCss),
    }, radii: { mediumRadius: rowRadius, metadataRadius: radius(raw.metadataRadiusCss) },
    selectedOpacity: selected.opacity ?? 1, mutedOpacity: opacity,
    treeGuideOpacity: Number(raw.treeGuideOpacity) };
  };
  const dark = parse('dark');
  const light = parse('light');
  if (dark.selectedOpacity !== light.selectedOpacity || dark.mutedOpacity !== light.mutedOpacity ||
      dark.treeGuideOpacity !== 0.12 || light.treeGuideOpacity !== 0.12 ||
      dark.radii.mediumRadius !== light.radii.mediumRadius ||
      dark.radii.metadataRadius !== light.radii.metadataRadius) {
    throw new Error('Primitive theme: geometria ou opacidade diverge entre modos.');
  }
  return { dark, light };
}

/** The primitive foundation; full generation extends this same collection for the kit. */
export function createPrimitiveVariables(evidence: PrimitiveThemeEvidence,
  run: AppearanceRun): PrimitiveVariables {
  const { collection, modeIds } = run;
  const dark = modeIds.dark;
  const colors = {} as Record<PrimitiveColorKey, Variable>;
  const radii = {} as Record<RadiusKey, Variable>;
  const colorNames: Record<PrimitiveColorKey, [string, VariableScope[]]> = {
    icon: [primitiveColorNames.icon, ['STROKE_COLOR', 'SHAPE_FILL']],
    rowDefaultText: [primitiveColorNames.rowDefaultText, ['TEXT_FILL']],
    rowSelectedText: [primitiveColorNames.rowSelectedText, ['TEXT_FILL']],
    rowSelectedBackground: [primitiveColorNames.rowSelectedBackground, ['FRAME_FILL']],
    disclosure: [primitiveColorNames.disclosure, ['STROKE_COLOR', 'SHAPE_FILL']],
    metadata: [primitiveColorNames.metadata, ['TEXT_FILL']],
    treeGuide: [primitiveColorNames.treeGuide, ['FRAME_FILL', 'SHAPE_FILL']],
  };
  for (const key of Object.keys(colorNames) as PrimitiveColorKey[]) {
    const [name, scopes] = colorNames[key];
    const variable = run.upsertVariable(name, 'COLOR');
    variable.scopes = scopes;
    variable.description = 'Computed visual value observed in Obsidian Desktop for the two navigation primitives.';
    variable.setVariableCodeSyntax('WEB', `var(--obsidian-ui-${name.replace(/\//g, '-')})`);
    variable.setValueForMode(dark, evidence.dark.colors[key]);
    variable.setValueForMode(modeIds.light, evidence.light.colors[key]);
    colors[key] = variable;
  }
  for (const [key, name] of [['mediumRadius', primitiveRadiusNames.mediumRadius],
    ['metadataRadius', primitiveRadiusNames.metadataRadius]] as const) {
    const variable = run.upsertVariable(name, 'FLOAT');
    variable.scopes = ['CORNER_RADIUS'];
    variable.description = 'Observed radius shared by the bounded navigation primitives.';
    variable.setVariableCodeSyntax('WEB', `var(--obsidian-ui-${name.replace(/\//g, '-')})`);
    variable.setValueForMode(dark, evidence.dark.radii[key]);
    variable.setValueForMode(modeIds.light, evidence.light.radii[key]);
    radii[key] = variable;
  }
  return { collection, modeIds, colors, radii, dark: evidence.dark, light: evidence.light };
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
