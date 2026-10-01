import { readSearchImport } from './search-data';
import { requiredFont, SF_PRO_SETUP_INSTRUCTIONS } from './font-resolution';

/** Search uses the observed positioned layers, not a horizontal Auto Layout. */
export async function generateSearch(componentsJson: unknown, layoutJson: unknown): Promise<void> {
  let set: ComponentSetNode | undefined;
  let fontProbe: TextNode | undefined;
  const components: ComponentNode[] = [];
  const textNodes: TextNode[] = [];
  try {
    const models = readSearchImport(componentsJson, layoutJson);
    const first = models[0]!;
    if (models.some((item) => item.input.fontFamily !== first.input.fontFamily ||
        item.input.fontWeight !== first.input.fontWeight || item.input.fontStyle !== first.input.fontStyle ||
        item.input.fontSize !== first.input.fontSize)) {
      throw new Error('Search: tipografia difere entre Empty e Filled; geração cancelada.');
    }
    const available = await figma.listAvailableFontsAsync();
    const font = requiredFont({ cssStack: first.input.fontFamily, platform: first.platform,
      weight: first.input.fontWeight, style: first.input.fontStyle },
    available.map((item) => item.fontName));
    try { await figma.loadFontAsync(font); }
    catch { throw fontFailure(font, `Required font could not be loaded: ${font.family} / ${font.style}.`); }
    fontProbe = figma.createText();
    fontProbe.fontName = font;
    fontProbe.fontSize = first.input.fontSize;
    fontProbe.textAutoResize = 'WIDTH_AND_HEIGHT';
    fontProbe.characters = first.text;
    if (fontProbe.hasMissingFont || fontProbe.width <= 0 || fontProbe.height <= 0) {
      throw fontFailure(font, `Required font did not render: ${font.family} / ${font.style}.`);
    }
    fontProbe.remove();
    fontProbe = undefined;
    figma.ui.postMessage({ type: 'typography', text: `Typography: ${font.family} / ${font.style} ✓` });

    for (const model of models) {
      const component = figma.createComponent();
      components.push(component);
      component.name = `State=${model.state}`;
      component.layoutMode = 'NONE';
      component.resize(model.widthForCanvas, model.height);
      component.fills = [];
      component.clipsContent = false;

      const surface = figma.createRectangle();
      surface.name = 'Input surface';
      component.appendChild(surface);
      surface.resize(model.widthForCanvas, model.height);
      surface.x = 0;
      surface.y = 0;
      surface.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
      surface.fills = [{ type: 'SOLID', color: model.input.background }];
      surface.strokes = [{ type: 'SOLID', color: model.input.border.color }];
      surface.strokeWeight = model.input.border.width;
      surface.strokeAlign = 'INSIDE';
      surface.cornerRadius = model.input.radius;

      const textViewport = figma.createFrame();
      textViewport.name = 'Text viewport';
      component.appendChild(textViewport);
      textViewport.resize(model.widthForCanvas - model.input.padding.left - model.input.padding.right,
        model.height - model.input.padding.top - model.input.padding.bottom);
      textViewport.x = model.input.padding.left;
      textViewport.y = model.input.padding.top;
      textViewport.fills = [];
      textViewport.clipsContent = true;
      textViewport.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };

      const label = figma.createText();
      label.name = model.state === 'Empty' ? 'Placeholder' : 'Query';
      textViewport.appendChild(label);
      label.fontName = font;
      label.fontSize = model.input.fontSize;
      if (model.input.lineHeight !== 'normal' || model.input.letterSpacing !== 'normal') {
        throw new Error(`Search ${model.state}: line-height/letter-spacing ainda não mapeados.`);
      }
      label.textAutoResize = 'WIDTH_AND_HEIGHT';
      label.textAlignHorizontal = 'LEFT';
      label.fills = [{ type: 'SOLID', color: model.input.textColor, opacity: model.input.textOpacity }];
      label.characters = model.text;
      textNodes.push(label);
      if (label.width <= 0 || label.height <= 0 || label.hasMissingFont) {
        throw new Error(`Search ${model.state}: TextNode não renderizou o texto.`);
      }
      label.x = 0;
      label.y = (textViewport.height - label.height) / 2;
      label.constraints = { horizontal: 'MIN', vertical: 'CENTER' };

      const search = figma.createNodeFromSvg(coloredSvg(model.icons.search.svg,
        model.icons.search.width, model.icons.search.height, model.icons.search.color));
      search.name = 'Search icon';
      search.fills = [];
      component.appendChild(search);
      search.x = model.icons.search.left;
      search.y = model.icons.search.top;
      search.constraints = { horizontal: 'MIN', vertical: 'MIN' };
      requireSize(search, model.icons.search.width, model.icons.search.height, 'Search icon');

      const clear = figma.createFrame();
      clear.name = 'Clear button';
      component.appendChild(clear);
      clear.resize(model.icons.clear.boxWidth, model.icons.clear.boxHeight);
      clear.x = model.widthForCanvas - model.icons.clear.right - model.icons.clear.boxWidth;
      clear.y = model.icons.clear.top;
      clear.fills = [];
      clear.clipsContent = false;
      clear.constraints = { horizontal: 'MAX', vertical: 'MIN' };
      const clearIcon = figma.createNodeFromSvg(coloredSvg(model.icons.clear.svg,
        model.icons.clear.width, model.icons.clear.height, model.icons.clear.color));
      clearIcon.name = 'Clear icon';
      clearIcon.fills = [];
      clear.appendChild(clearIcon);
      clearIcon.x = (clear.width - model.icons.clear.width) / 2;
      clearIcon.y = (clear.height - model.icons.clear.height) / 2;
      clearIcon.constraints = { horizontal: 'CENTER', vertical: 'CENTER' };
      requireSize(clearIcon, model.icons.clear.width, model.icons.clear.height, 'Clear icon');
      clear.visible = model.icons.clear.visible;

      if (component.layoutMode !== 'NONE' || component.width !== model.widthForCanvas ||
          component.height !== model.height || surface.width !== component.width ||
          textViewport.width !== component.width - model.input.padding.left - model.input.padding.right) {
        throw new Error(`Search ${model.state}: sizing inicial no Figma divergiu do modelo.`);
      }
    }

    set = figma.combineAsVariants(components, figma.currentPage);
    set.name = 'Obsidian / Search';
    set.description = [
      `Experimental Figma-ready model; Atlas + Layout Lab; ${models.length} variants.`,
      `Root sizing: ${first.rootSizing.mode} (${first.rootSizing.confidence}); canvas width ${first.widthForCanvas}px is only a demonstration host.`,
      `Typography requested (CSS): ${first.input.fontFamily}`,
      `Figma font used: ${font.family} / ${font.style}`,
      'Icons: native vector nodes imported from observed CSS mask SVG data URIs.',
    ].join('\n');
    if (set.children.length !== 2 || set.componentPropertyDefinitions.State?.type !== 'VARIANT') {
      throw new Error('Figma não criou as duas variants Search com State.');
    }
    const empty = models.find((model) => model.state === 'Empty');
    const filled = models.find((model) => model.state === 'Filled');
    if (!empty || !filled) throw new Error('Search: Empty ou Filled ausente no modelo.');
    const placeholderProperty = set.addComponentProperty('Placeholder', 'TEXT', empty.text);
    const valueProperty = set.addComponentProperty('Value', 'TEXT', filled.text);
    const textDefinitions = Object.entries(set.componentPropertyDefinitions)
      .filter(([, definition]) => definition.type === 'TEXT');
    if (!placeholderProperty.startsWith('Placeholder#') || !valueProperty.startsWith('Value#') ||
        textDefinitions.length !== 2 ||
        set.componentPropertyDefinitions[placeholderProperty]?.defaultValue !== empty.text ||
        set.componentPropertyDefinitions[valueProperty]?.defaultValue !== filled.text) {
      throw new Error(`Search: Figma não registrou Placeholder e Value ` +
        `(${placeholderProperty}, ${valueProperty}).`);
    }
    for (let index = 0; index < components.length; index++) {
      const label = textNodes[index]!;
      const model = models[index]!;
      const property = model.state === 'Empty' ? placeholderProperty : valueProperty;
      label.componentPropertyReferences = { characters: property };
      const viewport = label.parent;
      if (label.componentPropertyReferences?.characters !== property || label.characters !== model.text ||
          viewport?.type !== 'FRAME' || !viewport.clipsContent ||
          components[index]!.width !== model.widthForCanvas || components[index]!.height !== model.height) {
        throw new Error(`Search ${model.state}: Text alterou binding, conteúdo, clipping ou sizing da variant.`);
      }
    }
    // Both bindings must exist before an instance switches between variants.
    for (let index = 0; index < components.length; index++) {
      verifyInstanceText(components[index]!, models[index]!.state, empty, filled,
        placeholderProperty, valueProperty);
    }
    arrangeSet(set, components);
    figma.currentPage.selection = [set];
    figma.viewport.scrollAndZoomIntoView([set]);
    figma.ui.postMessage({ type: 'result', ok: true,
      text: 'Obsidian / Search criado com Empty e Filled. Edite Placeholder e Value na instance e alterne State para validar no Figma.' });
  } catch (error) {
    if (fontProbe && !fontProbe.removed) fontProbe.remove();
    if (set && !set.removed) set.remove();
    else for (const component of components) if (!component.removed) component.remove();
    figma.ui.postMessage({ type: 'result', ok: false,
      text: error instanceof Error ? error.message : String(error) });
  }
}

function verifyInstanceText(component: ComponentNode, initialState: 'Empty' | 'Filled',
  empty: ReturnType<typeof readSearchImport>[number], filled: ReturnType<typeof readSearchImport>[number],
  placeholderProperty: string, valueProperty: string): void {
  const instance = component.createInstance();
  try {
    const models = { Empty: empty, Filled: filled };
    const otherState = initialState === 'Empty' ? 'Filled' : 'Empty';
    const editedPlaceholder = 'Find notes';
    const editedValue = 'Saved query';
    assertInstance(initialState, empty.text, filled.text);
    instance.setProperties({ [placeholderProperty]: editedPlaceholder });
    assertInstance(initialState, editedPlaceholder, filled.text);
    instance.setProperties({ [valueProperty]: editedValue });
    assertInstance(initialState, editedPlaceholder, editedValue);
    instance.setProperties({ State: otherState });
    assertInstance(otherState, editedPlaceholder, editedValue);
    instance.setProperties({ State: initialState });
    assertInstance(initialState, editedPlaceholder, editedValue);

    const widerWidth = component.width + 80;
    instance.resize(widerWidth, component.height);
    assertInstance(initialState, editedPlaceholder, editedValue, widerWidth);
    instance.setProperties({ State: otherState });
    assertInstance(otherState, editedPlaceholder, editedValue, widerWidth);

    function assertInstance(state: 'Empty' | 'Filled', placeholder: string, value: string,
      expectedWidth = component.width): void {
      const properties = instance.componentProperties;
      const label = instance.findOne((node) => node.type === 'TEXT') as TextNode | null;
      const viewport = instance.findOne((node) => node.type === 'FRAME' && node.name === 'Text viewport') as FrameNode | null;
      const surface = instance.findOne((node) => node.name === 'Input surface') as RectangleNode | null;
      const search = instance.findOne((node) => node.name === 'Search icon') as FrameNode | null;
      const clear = instance.findOne((node) => node.name === 'Clear button') as FrameNode | null;
      const model = models[state];
      const expectedText = state === 'Empty' ? placeholder : value;
      const expectedClear = state === 'Filled';
      const close = (actual: number, expected: number): boolean => Math.abs(actual - expected) < 0.5;
      if (properties.State?.value !== state || properties[placeholderProperty]?.type !== 'TEXT' ||
          properties[placeholderProperty]?.value !== placeholder || properties[valueProperty]?.type !== 'TEXT' ||
          properties[valueProperty]?.value !== value || label?.characters !== expectedText ||
          label?.componentPropertyReferences?.characters !== (state === 'Empty' ? placeholderProperty : valueProperty) ||
          !viewport?.clipsContent || !surface || !search || !clear || clear.visible !== expectedClear ||
          !close(instance.width, expectedWidth) || !close(instance.height, model.height) ||
          !close(surface.width, expectedWidth) ||
          !close(viewport.width, expectedWidth - model.input.padding.left - model.input.padding.right) ||
          !close(search.x, model.icons.search.left) || !close(search.y, model.icons.search.top) ||
          (expectedClear && !close(clear.x, expectedWidth - model.icons.clear.right - model.icons.clear.boxWidth))) {
        throw new Error(`Search ${initialState} → ${state}: instance divergiu ` +
          `(properties=${JSON.stringify(properties)}, label=${label?.characters}, ` +
          `binding=${label?.componentPropertyReferences?.characters}, clear=${clear?.visible}, ` +
          `width=${instance.width}, viewport=${viewport?.width}, expectedText=${expectedText}).`);
      }
    }
  } finally {
    instance.remove();
  }
}

function coloredSvg(svg: string, width: number, height: number, color: RGB): string {
  const hex = (channel: number): string => Math.round(channel * 255).toString(16).padStart(2, '0');
  const fill = `#${hex(color.r)}${hex(color.g)}${hex(color.b)}`;
  return svg.replace('<svg ', `<svg width="${width}" height="${height}" `).replace(/currentColor/g, fill);
}

function requireSize(node: FrameNode, width: number, height: number, name: string): void {
  if (Math.abs(node.width - width) > 0.01 || Math.abs(node.height - height) > 0.01) {
    throw new Error(`${name}: Figma não preservou o tamanho SVG observado (${width} × ${height}).`);
  }
}

function arrangeSet(set: ComponentSetNode, components: ComponentNode[]): void {
  const inset = 20;
  const gap = 24;
  let y = inset;
  let maxWidth = 0;
  for (const component of components) {
    component.x = inset;
    component.y = y;
    y += component.height + gap;
    maxWidth = Math.max(maxWidth, component.width);
  }
  set.resizeWithoutConstraints(maxWidth + inset * 2, y - gap + inset);
  const center = figma.viewport.center;
  set.x = center.x - set.width / 2;
  set.y = center.y - set.height / 2;
}

function fontFailure(font: FontName, detail: string): Error {
  return new Error(font.family === 'SF Pro' ? `${detail}\n\n${SF_PRO_SETUP_INSTRUCTIONS}` : detail);
}
