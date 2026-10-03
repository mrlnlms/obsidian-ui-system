import { fontFailure, requiredFont } from './font-resolution';
import { readWorkspaceTabModel, type TabVariant } from './workspace-tab-data';
import type { IconButtonLibrary } from './icon-button-generation';

/** A bounded Dark Workspace Tab set, using the observed main and sidedock anatomy. */
export async function generateWorkspaceTab(probe: unknown, glyphs: IconButtonLibrary): Promise<{
  set: ComponentSetNode; preview: FrameNode; icons: ComponentNode[];
}> {
  const model = readWorkspaceTabModel(probe);
  const available = (await figma.listAvailableFontsAsync()).map((item) => item.fontName);
  const font = requiredFont({ cssStack: model.fontFamily, platform: 'macos',
    weight: model.fontWeight, style: 'normal' }, available);
  try { await figma.loadFontAsync(font); }
  catch { throw fontFailure(font, `Required font could not be loaded: ${font.family} / ${font.style}.`); }
  figma.ui.postMessage({ type: 'typography', text: `Typography: ${font.family} / ${font.style} ✓` });

  let set: ComponentSetNode | undefined;
  let preview: FrameNode | undefined;
  const components: ComponentNode[] = [];
  const icons: ComponentNode[] = [];
  try {
    const sideActive = model.variants.find((item) => item.context === 'Sidedock' && item.state === 'Active')!;
    const sideInactive = model.variants.find((item) => item.context === 'Sidedock' && item.state === 'Inactive')!;
    // State stays on the consumer; both wrappers contain an instance of one Files glyph.
    icons.push(createIcon('Active', sideActive.icon!, glyphs));
    icons.push(createIcon('Inactive', sideInactive.icon!, glyphs));
    const labels: TextNode[] = [];
    const sideIcons: InstanceNode[] = [];
    for (const variant of model.variants) {
      const { component, label, iconInstance } = createTab(variant, font, model.lineHeight,
        variant.state === 'Active' ? icons[0]! : icons[1]!, glyphs);
      components.push(component);
      labels.push(label);
      if (iconInstance) sideIcons.push(iconInstance);
    }
    set = figma.combineAsVariants(components, figma.currentPage);
    set.name = 'Obsidian / Workspace Tab';
    set.description = 'Dark desktop. Context = Main ou Sidedock; State = Active ou Inactive. Em Auto Layout, configure a instância Main para Fill com máximo de 320 px; o título trunca. Sidedock usa ícone de 28 × 25 px; troque a instância Icon pelo ícone da View.';
    if (set.children.length !== 4 || set.componentPropertyDefinitions.Context?.type !== 'VARIANT' ||
        set.componentPropertyDefinitions.State?.type !== 'VARIANT') {
      throw new Error('Workspace Tab: Figma não criou as quatro variants Context × State.');
    }
    const titleProperty = set.addComponentProperty('Title', 'TEXT', 'New tab');
    labels.forEach((label) => { label.componentPropertyReferences = { characters: titleProperty }; });
    if (sideIcons.length !== 2) throw new Error('Workspace Tab: ícones Sidedock ausentes.');
    const activeIconProperty = set.addComponentProperty('Icon / Active', 'INSTANCE_SWAP', icons[0]!.id);
    const inactiveIconProperty = set.addComponentProperty('Icon / Inactive', 'INSTANCE_SWAP', icons[1]!.id);
    sideIcons[0]!.componentPropertyReferences = { mainComponent: activeIconProperty };
    sideIcons[1]!.componentPropertyReferences = { mainComponent: inactiveIconProperty };
    if (labels.some((label) => label.componentPropertyReferences?.characters !== titleProperty)) {
      throw new Error('Workspace Tab: Title não ficou editável.');
    }
    if (set.componentPropertyDefinitions[activeIconProperty]?.type !== 'INSTANCE_SWAP' ||
        set.componentPropertyDefinitions[inactiveIconProperty]?.type !== 'INSTANCE_SWAP' ||
        sideIcons[0]!.componentPropertyReferences?.mainComponent !== activeIconProperty ||
        sideIcons[1]!.componentPropertyReferences?.mainComponent !== inactiveIconProperty ||
        (await sideIcons[0]!.getMainComponentAsync())?.id !== icons[0]!.id ||
        (await sideIcons[1]!.getMainComponentAsync())?.id !== icons[1]!.id) {
      throw new Error('Workspace Tab: propriedades de troca de ícone divergentes.');
    }
    // combineAsVariants does not arrange children on the canvas.
    components.forEach((component, index) => {
      component.x = index < 2 ? 20 : 160;
      component.y = index % 2 === 0 ? 20 : 78;
    });
    set.resizeWithoutConstraints(320, 132);

    preview = figma.createFrame();
    preview.name = 'Workspace Tab / Dark resize preview';
    preview.resize(440, 136);
    preview.fills = [paint(model.hostBackground)];
    preview.clipsContent = false;
    const mainRow = figma.createFrame();
    mainRow.name = 'Main tabs / equal share';
    preview.appendChild(mainRow);
    mainRow.layoutMode = 'HORIZONTAL';
    mainRow.primaryAxisSizingMode = 'FIXED';
    mainRow.counterAxisSizingMode = 'FIXED';
    mainRow.itemSpacing = model.mainGap;
    mainRow.fills = [];
    mainRow.resize(396, 34);
    mainRow.x = 20;
    mainRow.y = 20;
    const activeMain = components[0]!.createInstance();
    const inactiveMain = [components[1]!.createInstance(), components[1]!.createInstance(),
      components[1]!.createInstance()];
    for (const instance of [activeMain, ...inactiveMain]) {
      mainRow.appendChild(instance);
      instance.layoutGrow = 1;
      instance.minWidth = 1;
      instance.maxWidth = 320;
    }
    activeMain.setProperties({ [titleProperty]: model.variants[0]!.title });
    inactiveMain.forEach((instance) => instance.setProperties({ [titleProperty]: 'New tab' }));
    const sideRow = figma.createFrame();
    sideRow.name = 'Sidedock tabs / icon only';
    preview.appendChild(sideRow);
    sideRow.layoutMode = 'HORIZONTAL';
    sideRow.primaryAxisSizingMode = 'FIXED';
    sideRow.counterAxisSizingMode = 'FIXED';
    sideRow.itemSpacing = model.sidedockGap;
    sideRow.fills = [];
    sideRow.resize(59, 25);
    sideRow.x = 20;
    sideRow.y = 80;
    for (const component of components.slice(2)) sideRow.appendChild(component.createInstance());
    const previewTitle = activeMain.findOne((node) => node.type === 'TEXT' &&
      node.name === 'Title') as TextNode | null;
    const wideTitleWidth = previewTitle?.width ?? 0;
    mainRow.resize(240, 34);
    const narrowTitleWidth = previewTitle?.width ?? 0;
    mainRow.resize(396, 34);
    const sideInstance = sideRow.children[0] as InstanceNode;
    const swappableIcon = sideInstance.findOne((node) => node.type === 'INSTANCE' &&
      node.name === 'Icon') as InstanceNode | null;
    if (activeMain.layoutGrow !== 1 || inactiveMain.some((instance) => instance.layoutGrow !== 1) ||
        activeMain.componentProperties[titleProperty]?.value !== model.variants[0]!.title ||
        !previewTitle || narrowTitleWidth >= wideTitleWidth ||
        Math.abs(previewTitle.width - wideTitleWidth) > 0.5 ||
        !swappableIcon ||
        swappableIcon.componentPropertyReferences?.mainComponent !== activeIconProperty ||
        mainRow.children.length !== 4 || sideRow.children.length !== 2 ||
        sideRow.width !== 59) {
      throw new Error('Workspace Tab: preview ou propriedade Title divergente.');
    }
    const bounds = figma.currentPage.children.filter((node) =>
      node !== set && node !== preview && !icons.includes(node as ComponentNode))
      .map((node) => node.absoluteBoundingBox).filter((box): box is Rect => box !== null);
    const x = bounds.reduce((right, box) => Math.max(right, box.x + box.width), 0) + 64;
    icons[0]!.x = x;
    icons[0]!.y = 0;
    icons[1]!.x = x + 32;
    icons[1]!.y = 0;
    set.x = x + 80;
    set.y = 0;
    preview.x = set.x + set.width + 64;
    preview.y = 0;
    figma.currentPage.selection = [set];
    figma.viewport.scrollAndZoomIntoView([set, preview]);
    return { set, preview, icons };
  } catch (error) {
    if (preview && !preview.removed) preview.remove();
    if (set && !set.removed) set.remove();
    else for (const component of components) if (!component.removed) component.remove();
    for (const icon of icons) if (!icon.removed) icon.remove();
    throw error;
  }
}

function createTab(model: TabVariant, font: FontName, lineHeight: number,
  icon: ComponentNode, glyphs: IconButtonLibrary): {
    component: ComponentNode; label: TextNode; iconInstance?: InstanceNode } {
  const component = figma.createComponent();
  try {
    component.name = `Context=${model.context}, State=${model.state}`;
    component.description = `${model.context} ${model.state}; Dark desktop observation.`;
    component.resize(model.size.width, model.size.height);
    component.layoutMode = 'NONE';
    component.fills = model.background === 'rgba(0, 0, 0, 0)' ||
      model.background.startsWith('oklch(') ? [] : [paint(model.background)];
    component.strokes = [];
    if (model.context === 'Main') {
      component.topLeftRadius = model.radius;
      component.topRightRadius = model.radius;
      component.bottomLeftRadius = 0;
      component.bottomRightRadius = 0;
      // minWidth/maxWidth are valid only on Auto Layout nodes and their direct children.
      // The Main tab keeps absolute children for observed right-anchored Close and title stretch;
      // its Auto Layout host applies the observed 320 px maximum to each instance.
    } else component.cornerRadius = model.radius;

    if (model.background.startsWith('oklch(')) {
      const selection = figma.createRectangle();
      selection.name = 'Selection background';
      component.appendChild(selection);
      selection.resize(component.width, component.height);
      selection.x = 0;
      selection.y = 0;
      selection.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
      selection.cornerRadius = model.radius;
      selection.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      selection.strokes = [];
      selection.opacity = 0.067;
    }

    const label = figma.createText();
    label.name = 'Title';
    component.appendChild(label);
    label.fontName = font;
    label.fontSize = 13;
    label.lineHeight = { unit: 'PIXELS', value: lineHeight };
    label.fills = [paint(model.label.color)];
    label.characters = model.title;
    if (label.hasMissingFont || label.width <= 0) throw fontFailure(font, 'Workspace Tab: Title não renderizou.');
    label.textAutoResize = 'NONE';
    label.resize(model.context === 'Main' ? model.label.width : 1, lineHeight);
    label.textTruncation = 'ENDING';
    label.maxLines = 1;
    label.x = model.context === 'Main' ? model.label.x : 0;
    label.y = model.context === 'Main' ? model.label.y : 0;
    label.constraints = { horizontal: model.context === 'Main' ? 'STRETCH' : 'MIN', vertical: 'MIN' };
    label.visible = model.context === 'Main';

    let iconInstance: InstanceNode | undefined;
    if (model.context === 'Sidedock' && model.icon) {
      iconInstance = icon.createInstance();
      iconInstance.name = 'Icon';
      component.appendChild(iconInstance);
      iconInstance.x = model.icon.x;
      iconInstance.y = model.icon.y;
      iconInstance.constraints = { horizontal: 'MIN', vertical: 'MIN' };
      if (Math.abs(iconInstance.width - 16) > 0.05) {
        throw new Error('Workspace Tab: ícone mudou de tamanho.');
      }
    }
    if (model.close) {
      const close = figma.createFrame();
      close.name = 'Close';
      component.appendChild(close);
      close.resize(model.close.width, model.close.height);
      close.x = model.close.x;
      close.y = model.close.y;
      close.fills = [];
      close.cornerRadius = 8;
      close.constraints = { horizontal: 'MAX', vertical: 'MIN' };
      const glyph = glyphs.createGlyph('Workspace tab / Close');
      glyph.name = 'Close icon';
      close.appendChild(glyph);
      glyph.resize(16, 16);
      glyph.x = 2;
      glyph.y = 2;
    }
    if (component.height !== model.size.height ||
        label.textTruncation !== 'ENDING' ||
        (model.context === 'Main' && label.constraints.horizontal !== 'STRETCH')) {
      throw new Error('Workspace Tab: sizing ou ellipsis não preservados.');
    }
    return { component, label, iconInstance };
  } catch (error) {
    if (!component.removed) component.remove();
    throw error;
  }
}

function createIcon(state: 'Active' | 'Inactive',
  model: NonNullable<TabVariant['icon']>, glyphs: IconButtonLibrary): ComponentNode {
  const component = figma.createComponent();
  try {
    component.name = `Obsidian / Workspace Tab Icon / Files / ${state}`;
    component.description = `Ícone Files observado; cor e opacidade ${state} no sidedock Dark.`;
    component.resize(16, 16);
    component.fills = [];
    const glyph = glyphs.createGlyph(`Workspace tab / ${state}`,
      state === 'Active' ? 'Selected' : 'Muted');
    glyph.name = 'Glyph';
    component.appendChild(glyph);
    glyph.resize(16, 16);
    glyph.x = 0;
    glyph.y = 0;
    glyph.opacity = model.opacity;
    return component;
  } catch (error) {
    if (!component.removed) component.remove();
    throw error;
  }
}

function paint(css: string): SolidPaint {
  const match = /^rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)$/.exec(css);
  if (!match) throw new Error(`Workspace Tab: cor não suportada: ${css}.`);
  const channels = match.slice(1).map(Number);
  if (channels.some((value) => value > 255)) throw new Error('Workspace Tab: canal de cor inválido.');
  return { type: 'SOLID', color: { r: channels[0]! / 255, g: channels[1]! / 255,
    b: channels[2]! / 255 } };
}
