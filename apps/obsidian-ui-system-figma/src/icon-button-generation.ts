import { bindObservedGlyphPaint, observedGlyphPaint,
  type PrimitiveVariables } from './primitive-theme';
import { canonicalGlyphs, type IconSource } from './glyph-library';

export type { IconSource } from './glyph-library';

export interface IconButtonLibrary {
  set: ComponentSetNode;
  icons: Map<string, ComponentNode>;
  iconProperty: string;
  create(name: string, context?: 'Toolbar' | 'Sidedock' | 'Input',
    state?: 'Default' | 'Disabled', tone?: 'Muted' | 'Opaque'): InstanceNode;
}

export function createIconButtonLibrary(sources: IconSource[], theme: PrimitiveVariables): IconButtonLibrary {
  if (!sources.length) throw new Error('Icon Button: nenhum SVG observado.');
  const catalog = canonicalGlyphs(sources);
  const darkIconCss = `rgb(${Math.round(theme.dark.colors.icon.r * 255)}, ` +
    `${Math.round(theme.dark.colors.icon.g * 255)}, ${Math.round(theme.dark.colors.icon.b * 255)})`;
  const icons = new Map<string, ComponentNode>();
  for (const source of catalog.glyphs) {
    if (icons.has(source.name) || !source.svg.startsWith('<svg ') ||
        !source.svg.includes('viewBox="0 0 24 24"') || !source.svg.includes('currentColor') ||
        source.color !== darkIconCss ||
        [...source.svg.matchAll(/\b(?:stroke|fill)="([^"]+)"/g)]
          .some((match) => match[1] !== 'none' && match[1] !== 'currentColor') ||
        /<script|<foreignObject|\son\w+=|\shref=|\sxlink:href=/i.test(source.svg)) {
      throw new Error(`Icon Button: SVG inválido ou duplicado: ${source.name}.`);
    }
    const icon = figma.createComponent();
    icon.name = `Obsidian / Glyph / ${source.name}`;
    icon.description = 'Geometria SVG observada; identidade do glyph independe da ação. Cor pelo papel de ícone.';
    icon.resize(16, 16);
    icon.fills = [];
    icon.strokes = [];
    const vector = figma.createNodeFromSvg(source.svg.replace(/currentColor/g, source.color));
    vector.name = 'Observed SVG';
    icon.appendChild(vector);
    vector.resize(16, 16);
    vector.x = 0;
    vector.y = 0;
    let bindings = 0;
    for (const node of [vector, ...vector.findAll(() => true)]) {
      if ('fills' in node && node.fills !== figma.mixed) {
        const paints = node.fills as readonly Paint[];
        const count = paints.filter((paint) => observedGlyphPaint(paint, theme.dark.colors.icon)).length;
        if (count) {
          node.fills = paints.map((paint) => observedGlyphPaint(paint, theme.dark.colors.icon)
            ? bindObservedGlyphPaint(paint, theme.colors.icon) : paint);
          bindings += count;
        }
      }
      if ('strokes' in node) {
        const paints = node.strokes as readonly Paint[];
        const count = paints.filter((paint) => observedGlyphPaint(paint, theme.dark.colors.icon)).length;
        if (count) {
          node.strokes = paints.map((paint) => observedGlyphPaint(paint, theme.dark.colors.icon)
            ? bindObservedGlyphPaint(paint, theme.colors.icon) : paint);
          bindings += count;
        }
      }
    }
    if (!bindings) throw new Error(`Icon Button: glyph sem paint vinculável: ${source.name}.`);
    icons.set(source.name, icon);
  }
  const first = icons.get(catalog.byUse.get('Files / New note') ?? '') ??
    icons.values().next().value as ComponentNode;
  const specs = [
    { context: 'Toolbar', state: 'Default', tone: 'Muted', width: 28, height: 24, iconX: 6, iconY: 4 },
    { context: 'Toolbar', state: 'Disabled', tone: 'Muted', width: 28, height: 24, iconX: 6, iconY: 4 },
    { context: 'Toolbar', state: 'Default', tone: 'Opaque', width: 28, height: 24, iconX: 6, iconY: 4 },
    { context: 'Sidedock', state: 'Default', tone: 'Muted', width: 28, height: 39, iconX: 6, iconY: 12 },
    { context: 'Input', state: 'Default', tone: 'Opaque', width: 24, height: 20, iconX: 4, iconY: 2 },
  ] as const;
  const variants = specs.map((spec) => {
    const button = figma.createComponent();
    button.name = `Context=${spec.context}, State=${spec.state}, Tone=${spec.tone}`;
    button.resize(spec.width, spec.height);
    button.fills = [];
    button.strokes = [];
    if (spec.context !== 'Sidedock') button.setBoundVariable('cornerRadius', theme.radii.mediumRadius);
    const glyph = first.createInstance();
    glyph.name = 'Icon';
    button.appendChild(glyph);
    glyph.x = spec.iconX;
    glyph.y = spec.iconY;
    glyph.opacity = spec.tone === 'Muted' ? theme.dark.mutedOpacity : 1;
    glyph.constraints = { horizontal: 'CENTER', vertical: 'CENTER' };
    return { button, glyph };
  });
  const set = figma.combineAsVariants(variants.map((item) => item.button), figma.currentPage);
  set.name = 'Obsidian / Icon Button';
  set.description = 'Área clicável observada. Dark/Light por Variables; Context controla geometria; State/Tone controlam o botão; Icon troca um glyph canônico. A ação pertence ao consumidor.';
  const iconProperty = set.addComponentProperty('Icon', 'INSTANCE_SWAP', first.id);
  variants.forEach(({ button, glyph }, index) => {
    glyph.componentPropertyReferences = { mainComponent: iconProperty };
    button.x = 20;
    button.y = 20 + index * 59;
  });
  set.resizeWithoutConstraints(100, 20 + variants.length * 59);
  if (set.componentPropertyDefinitions.Context?.type !== 'VARIANT' ||
      set.componentPropertyDefinitions.State?.type !== 'VARIANT' ||
      set.componentPropertyDefinitions.Tone?.type !== 'VARIANT' ||
      set.componentPropertyDefinitions[iconProperty]?.type !== 'INSTANCE_SWAP') {
    throw new Error('Icon Button: propriedades de contexto, estado ou ícone ausentes.');
  }
  let x = set.x + set.width + 64;
  for (const icon of icons.values()) { icon.x = x; icon.y = 0; x += 48; }
  return { set, icons, iconProperty,
    create(name, context = 'Toolbar', state = 'Default', tone = 'Muted') {
      const icon = icons.get(catalog.byUse.get(name) ?? '');
      const variant = set.children.find((node): node is ComponentNode => node.type === 'COMPONENT' &&
        node.variantProperties?.Context === context && node.variantProperties?.State === state &&
        node.variantProperties?.Tone === tone);
      if (!icon || !variant) throw new Error(`Icon Button: ${name}/${context}/${state}/${tone} ausente.`);
      const instance = variant.createInstance();
      instance.setProperties({ [iconProperty]: icon.id });
      instance.name = name;
      return instance;
    } };
}
