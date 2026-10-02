import { readSidePanelModel, type SidePanelModel, type SidePanelTab } from './side-panel-data';

type TabState = 'Active' | 'Inactive';

/** Composes the observed Dark left Sidedock from the already validated Workspace Tab set. */
export async function generateSidePanel(probe: unknown): Promise<{
  panel: ComponentNode; group: ComponentSetNode; preview: FrameNode;
}> {
  const model = readSidePanelModel(probe);
  const tabSet = findWorkspaceTabSet();
  const activeTab = findTabVariant(tabSet, 'Active');
  const inactiveTab = findTabVariant(tabSet, 'Inactive');
  const iconProperties = {
    Active: findProperty(tabSet, 'Icon / Active', 'INSTANCE_SWAP'),
    Inactive: findProperty(tabSet, 'Icon / Inactive', 'INSTANCE_SWAP'),
  };
  const sourceBounds = figma.currentPage.children.map((node) => node.absoluteBoundingBox)
    .filter((bounds): bounds is Rect => bounds !== null);
  const startX = sourceBounds.reduce((right, bounds) => Math.max(right, bounds.x + bounds.width), 0) + 64;

  const icons: ComponentNode[] = [];
  const groupVariants: ComponentNode[] = [];
  let group: ComponentSetNode | undefined;
  let slot: ComponentNode | undefined;
  let panel: ComponentNode | undefined;
  let preview: FrameNode | undefined;
  try {
    const iconByName = new Map<string, ComponentNode>();
    for (const tab of model.tabs.filter((item) => item.title !== 'Files')) {
      for (const state of ['Active', 'Inactive'] as const) {
        const icon = createIcon(tab, state);
        icons.push(icon);
        iconByName.set(`${tab.title}/${state}`, icon);
      }
    }

    for (const title of ['Files', 'Search', 'Bookmarks'] as const) {
      const variant = figma.createComponent();
      groupVariants.push(variant);
      variant.name = `Active=${title}`;
      variant.layoutMode = 'HORIZONTAL';
      variant.primaryAxisSizingMode = 'AUTO';
      variant.counterAxisSizingMode = 'FIXED';
      variant.itemSpacing = model.tabGap;
      variant.fills = [];
      variant.strokes = [];
      variant.resize(90, 25);
      for (const tab of model.tabs) {
        const state: TabState = tab.title === title ? 'Active' : 'Inactive';
        const instance = (state === 'Active' ? activeTab : inactiveTab).createInstance();
        instance.name = `${tab.title} tab`;
        variant.appendChild(instance);
        if (tab.title !== 'Files') {
          const icon = iconByName.get(`${tab.title}/${state}`)!;
          instance.setProperties({ [iconProperties[state]]: icon.id });
        }
      }
      if (variant.children.length !== 3 || Math.abs(variant.width - 90) > 0.1 ||
          variant.height !== 25) throw new Error(`Side Panel: grupo ${title} perdeu a geometria observada.`);
    }
    group = figma.combineAsVariants(groupVariants, figma.currentPage);
    group.name = 'Obsidian / WorkspaceTabs / Sidedock';
    group.description = 'Três tabs observadas no Sidedock esquerdo Dark. Active escolhe Files, Search ou Bookmarks; os ícones são conteúdo de cada View.';
    if (group.children.length !== 3 || group.componentPropertyDefinitions.Active?.type !== 'VARIANT') {
      throw new Error('Side Panel: o Figma não criou as três variants Active do Tab Group.');
    }
    groupVariants.forEach((variant, index) => { variant.x = 20; variant.y = 20 + index * 45; });
    group.resizeWithoutConstraints(130, 155);

    slot = figma.createComponent();
    slot.name = 'Obsidian / Side Panel / Hosted View Slot';
    slot.description = 'Slot visual vazio para a View hospedada. A própria View fornece seus controles e conteúdo: Files e Bookmarks têm nav-header de 40 px; Search não usa esse nav-header.';
    slot.resize(model.width, model.height - model.headerHeight);
    slot.fills = [];
    slot.strokes = [];

    panel = figma.createComponent();
    panel.name = 'Obsidian / Side Panel / Left / Dark';
    panel.description = 'WorkspaceSidedock esquerdo Dark: Tab Group de 40 px, toggle observado e slot flexível para a View. Altura inicial reproduz a área acima do perfil do vault; redimensione largura e altura no Figma.';
    panel.layoutMode = 'VERTICAL';
    panel.primaryAxisSizingMode = 'FIXED';
    panel.counterAxisSizingMode = 'FIXED';
    panel.itemSpacing = 0;
    panel.resize(model.width, model.height);
    panel.minWidth = model.minExpandedWidth;
    panel.fills = [paint(model.background)];
    panel.strokes = [];
    panel.clipsContent = true;

    const header = figma.createFrame();
    header.name = 'Tab header / 40 px';
    panel.appendChild(header);
    header.layoutMode = 'HORIZONTAL';
    header.primaryAxisSizingMode = 'FIXED';
    header.counterAxisSizingMode = 'FIXED';
    header.primaryAxisAlignItems = 'MIN';
    header.counterAxisAlignItems = 'MIN';
    header.itemSpacing = 0;
    header.paddingLeft = model.tabLeft;
    header.paddingRight = model.toggleRight;
    header.paddingTop = 0;
    header.paddingBottom = 0;
    header.resize(model.width, model.headerHeight);
    header.layoutSizingHorizontal = 'FILL';
    header.minWidth = 1;
    header.fills = [];
    header.strokes = [];
    header.clipsContent = true;
    const tabArea = figma.createFrame();
    tabArea.name = 'Tab group area';
    header.appendChild(tabArea);
    tabArea.resize(90, model.toggleHeight);
    tabArea.fills = [];
    tabArea.strokes = [];
    const groupInstance = groupVariants[0]!.createInstance();
    groupInstance.name = 'WorkspaceTabs';
    tabArea.appendChild(groupInstance);
    groupInstance.x = 0;
    groupInstance.y = model.tabTop;
    groupInstance.constraints = { horizontal: 'MIN', vertical: 'MIN' };
    const spacer = figma.createFrame();
    spacer.name = 'Flexible tab space';
    header.appendChild(spacer);
    spacer.resize(model.width - model.tabLeft - model.toggleRight - 90 - model.toggleWidth, 1);
    spacer.layoutGrow = 1;
    spacer.minWidth = 1;
    spacer.fills = [];
    spacer.strokes = [];
    const toggle = figma.createFrame();
    toggle.name = 'Collapse sidedock';
    header.appendChild(toggle);
    toggle.resize(model.toggleWidth, model.toggleHeight);
    toggle.fills = [];
    toggle.strokes = [];
    const toggleGlyph = figma.createNodeFromSvg(colorSvg(model.toggleSvg, model.toggleIconColor,
      model.toggleIconSize));
    toggleGlyph.name = 'Collapse icon';
    toggle.appendChild(toggleGlyph);
    toggleGlyph.resize(model.toggleIconSize, model.toggleIconSize);
    toggleGlyph.x = model.toggleIconX;
    toggleGlyph.y = model.toggleIconY;
    toggleGlyph.opacity = model.toggleIconOpacity;

    const viewInstance = slot.createInstance();
    viewInstance.name = 'Hosted View';
    panel.appendChild(viewInstance);
    viewInstance.layoutSizingHorizontal = 'FILL';
    viewInstance.minWidth = 1;
    viewInstance.layoutGrow = 1;
    const groupProperty = panel.addComponentProperty('Tab group', 'INSTANCE_SWAP', groupVariants[0]!.id);
    const viewProperty = panel.addComponentProperty('Hosted View', 'INSTANCE_SWAP', slot.id);
    groupInstance.componentPropertyReferences = { mainComponent: groupProperty };
    viewInstance.componentPropertyReferences = { mainComponent: viewProperty };
    if (panel.componentPropertyDefinitions[groupProperty]?.type !== 'INSTANCE_SWAP' ||
        panel.componentPropertyDefinitions[viewProperty]?.type !== 'INSTANCE_SWAP' ||
        (await groupInstance.getMainComponentAsync())?.id !== groupVariants[0]!.id ||
        (await viewInstance.getMainComponentAsync())?.id !== slot.id) {
      throw new Error('Side Panel: slots substituíveis não foram preservados.');
    }

    preview = figma.createFrame();
    preview.name = 'Side Panel / Dark resize preview';
    preview.resize(model.width + 264, 520);
    preview.fills = [paint('rgb(28, 28, 28)')];
    preview.clipsContent = false;
    const widths = [model.width, model.minExpandedWidth];
    let nextX = 20;
    for (const width of widths) {
      const instance = panel.createInstance();
      instance.name = `Side Panel / ${Math.round(width)} px`;
      preview.appendChild(instance);
      instance.resize(width, 480);
      instance.x = nextX;
      instance.y = 20;
      verifyPreview(instance, width, model);
      nextX += width + 24;
    }

    icons.forEach((node, index) => { node.x = startX + index * 32; node.y = 0; });
    slot.x = startX + 160;
    slot.y = 0;
    group.x = slot.x + slot.width + 64;
    group.y = 0;
    panel.x = group.x + group.width + 64;
    panel.y = 0;
    preview.x = panel.x + panel.width + 64;
    preview.y = 0;
    figma.currentPage.selection = [panel];
    figma.viewport.scrollAndZoomIntoView([panel, preview]);
    return { panel, group, preview };
  } catch (error) {
    if (preview && !preview.removed) preview.remove();
    if (panel && !panel.removed) panel.remove();
    if (slot && !slot.removed) slot.remove();
    if (group && !group.removed) group.remove();
    else groupVariants.forEach((node) => { if (!node.removed) node.remove(); });
    icons.forEach((node) => { if (!node.removed) node.remove(); });
    throw error;
  }
}

function findWorkspaceTabSet(): ComponentSetNode {
  const sets = figma.currentPage.findAll((node) => node.type === 'COMPONENT_SET' &&
    node.name === 'Obsidian / Workspace Tab') as ComponentSetNode[];
  const set = sets.sort((a, b) => (b.absoluteBoundingBox?.x ?? 0) - (a.absoluteBoundingBox?.x ?? 0))[0];
  if (!set || set.children.length !== 4 || set.componentPropertyDefinitions.Context?.type !== 'VARIANT' ||
      set.componentPropertyDefinitions.State?.type !== 'VARIANT') {
    throw new Error('Side Panel: gere primeiro o Workspace Tab Dark nesta página do Figma.');
  }
  return set;
}

function findTabVariant(set: ComponentSetNode, state: TabState): ComponentNode {
  const variant = set.children.find((child): child is ComponentNode => child.type === 'COMPONENT' &&
    child.variantProperties?.Context === 'Sidedock' && child.variantProperties?.State === state);
  if (!variant) throw new Error(`Side Panel: Workspace Tab Sidedock / ${state} não encontrado.`);
  return variant;
}

function findProperty(set: ComponentSetNode, name: string, type: 'INSTANCE_SWAP'): string {
  const key = Object.keys(set.componentPropertyDefinitions).find((item) => item.startsWith(`${name}#`) &&
    set.componentPropertyDefinitions[item]?.type === type);
  if (!key) throw new Error(`Side Panel: propriedade ${name} ausente no Workspace Tab.`);
  return key;
}

function createIcon(tab: SidePanelTab, state: TabState): ComponentNode {
  const component = figma.createComponent();
  try {
    component.name = `Obsidian / Workspace Tab Icon / ${tab.title} / ${state}`;
    component.description = `Glifo ${tab.title} observado no Sidedock Dark; cor e opacidade ${state}.`;
    component.resize(16, 16);
    component.fills = [];
    const color = state === 'Active' ? 'rgb(218, 218, 218)' : 'rgb(179, 179, 179)';
    const glyph = figma.createNodeFromSvg(colorSvg(tab.svg, color, 16));
    glyph.name = 'Glyph';
    component.appendChild(glyph);
    glyph.resize(16, 16);
    glyph.x = 0;
    glyph.y = 0;
    glyph.opacity = state === 'Active' ? 1 : 0.85;
    return component;
  } catch (error) {
    if (!component.removed) component.remove();
    throw error;
  }
}

function verifyPreview(instance: InstanceNode, width: number, model: SidePanelModel): void {
  const header = instance.findOne((node) => node.name === 'Tab header / 40 px');
  const toggle = instance.findOne((node) => node.name === 'Collapse sidedock');
  const view = instance.findOne((node) => node.name === 'Hosted View');
  const expectedToggleX = width - model.toggleRight - model.toggleWidth;
  const expectedViewHeight = instance.height - model.headerHeight;
  if (!header || !toggle || !view || Math.abs(header.width - width) > 0.5 ||
      Math.abs(toggle.x - expectedToggleX) > 0.5 ||
      Math.abs(view.width - width) > 0.5 ||
      Math.abs(view.height - expectedViewHeight) > 0.5) {
    throw new Error(`Side Panel: resize ${width} px divergiu; ` +
      `header=${header?.width ?? 'ausente'}, toggle.x=${toggle?.x ?? 'ausente'} ` +
      `(esperado ${expectedToggleX}), View=${view ? `${view.width}×${view.height}` : 'ausente'} ` +
      `(esperado ${width}×${expectedViewHeight}).`);
  }
}

function colorSvg(svg: string, color: string, size: number): string {
  return svg.replace('width="24"', `width="${size}"`)
    .replace('height="24"', `height="${size}"`).replace(/currentColor/g, color);
}

function paint(css: string): SolidPaint {
  const channels = /^rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)$/.exec(css)?.slice(1).map(Number);
  if (!channels || channels.some((value) => value > 255)) throw new Error(`Side Panel: cor inválida: ${css}.`);
  return { type: 'SOLID', color: { r: channels[0]! / 255, g: channels[1]! / 255,
    b: channels[2]! / 255 } };
}
