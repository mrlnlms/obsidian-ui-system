/** Observed SVGs are content; geometry and visual state belong to the button. */
export interface IconSource { name: string; svg: string; color: string }

export interface IconButtonLibrary {
  set: ComponentSetNode;
  icons: Map<string, ComponentNode>;
  iconProperty: string;
  create(name: string, context?: 'Toolbar' | 'Sidedock' | 'Input',
    state?: 'Default' | 'Disabled', tone?: 'Muted' | 'Opaque'): InstanceNode;
}

export function createIconButtonLibrary(sources: IconSource[], inputBackground: string): IconButtonLibrary {
  if (!sources.length) throw new Error('Icon Button: nenhum SVG observado.');
  const icons = new Map<string, ComponentNode>();
  for (const source of sources) {
    if (icons.has(source.name) || !source.svg.startsWith('<svg ') ||
        !source.svg.includes('viewBox="0 0 24 24"') ||
        /<script|<foreignObject|\son\w+=|\shref=|\sxlink:href=/i.test(source.svg)) {
      throw new Error(`Icon Button: SVG inválido ou duplicado: ${source.name}.`);
    }
    const icon = figma.createComponent();
    icon.name = `Obsidian / Icon / ${source.name}`;
    icon.resize(16, 16);
    icon.fills = [];
    icon.strokes = [];
    const vector = figma.createNodeFromSvg(source.svg.replace(/currentColor/g, source.color));
    vector.name = 'Observed SVG';
    icon.appendChild(vector);
    vector.resize(16, 16);
    vector.x = 0;
    vector.y = 0;
    icons.set(source.name, icon);
  }
  const first = icons.values().next().value as ComponentNode;
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
    button.fills = spec.context === 'Input' ? [paint(inputBackground)] : [];
    button.strokes = [];
    const glyph = first.createInstance();
    glyph.name = 'Icon';
    button.appendChild(glyph);
    glyph.x = spec.iconX;
    glyph.y = spec.iconY;
    glyph.opacity = spec.tone === 'Muted' ? 0.85 : 1;
    glyph.constraints = { horizontal: 'CENTER', vertical: 'CENTER' };
    return { button, glyph };
  });
  const set = figma.combineAsVariants(variants.map((item) => item.button), figma.currentPage);
  set.name = 'Obsidian / Icon Button / Dark';
  set.description = 'Área clicável observada. Context controla geometria; State/Tone controlam o botão; Icon troca o SVG observado.';
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
      const icon = icons.get(name);
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

function paint(css: string): SolidPaint {
  const rgb = /^rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)$/.exec(css)?.slice(1).map(Number);
  if (!rgb || rgb.some((n) => n > 255)) throw new Error('Icon Button: cor de Input inválida.');
  return { type: 'SOLID', color: { r: rgb[0]! / 255, g: rgb[1]! / 255, b: rgb[2]! / 255 } };
}
