import { fontFailure, requiredFont } from './font-resolution';
import { readOutlineViewModel, type OutlineViewModel } from './outline-view-data';
import type { TreeRowLibrary } from './tree-navigation-row-generation';
import { rebindGlyphTone, type IconButtonLibrary } from './icon-button-generation';
import { boundUiKitPaint, type UiKitThemeVariables } from './ui-kit-theme';
import { assertOutlineLayout, outlineHierarchy, type OutlineBranch } from './outline-view-layout';
import { treeGuideInset } from './tree-navigation-guides';

interface Host { panel: ComponentNode; group: ComponentSetNode; preview: FrameNode }

/** Hosts the observed wrapping Outline rows in a copy of the validated Side Panel. */
export async function composeOutlineInSidePanel(probe: unknown, host: Host,
  workspaceTabs: ComponentSetNode, bookmarkActions: ComponentSetNode,
  rows: TreeRowLibrary, icons: IconButtonLibrary, theme: UiKitThemeVariables): Promise<{
    component: ComponentNode; preview: FrameNode; tab: ComponentNode }> {
  const model = readOutlineViewModel(probe);
  if (host.panel.name !== 'Obsidian / Side Panel / Left / Dark' ||
      host.group.name !== 'Obsidian / WorkspaceTabs / Sidedock' ||
      host.preview.name !== 'Side Panel / Dark resize preview' ||
      workspaceTabs.name !== 'Obsidian / Workspace Tab' ||
      bookmarkActions.name !== 'Obsidian / Bookmarks / Header Action') {
    throw new Error('Outline View: host ou Components reutilizáveis ausentes.');
  }
  const roots = new Set(figma.currentPage.children.map((node) => node.id));
  try {
    await loadFont(model);
    const actions = createActionSet(model, icons, theme);
    const tab = createOutlineTab(workspaceTabs, icons);
    const header = createHeader(model, actions, bookmarkActions);
    const component = createView(model, header, rows, theme);
    place([actions, tab.icon, tab.group, header, component]);
    const preview = host.preview.clone();
    preview.name = 'Side Panel / Dark resize preview / Outline';
    preview.x = rightEdge(preview) + 64;
    preview.y = host.preview.y;
    const viewProperty = swapProperty(host.panel, 'Hosted View');
    const tabProperty = swapProperty(host.panel, 'Tab group');
    const panels = preview.children.filter((node): node is InstanceNode => node.type === 'INSTANCE');
    if (panels.length !== 2) throw new Error('Outline View: preview perdeu as duas larguras.');
    for (const panel of panels) {
      panel.setProperties({ [viewProperty]: component.id, [tabProperty]: tab.group.id });
      await verifyHost(panel, component, tab.group, model);
    }
    const resized = host.panel.createInstance();
    try {
      resized.setProperties({ [viewProperty]: component.id, [tabProperty]: tab.group.id });
      resized.resize(300, 480);
      await verifyHost(resized, component, tab.group, model);
    } finally { resized.remove(); }
    return { component, preview, tab: tab.group };
  } catch (error) {
    for (const node of figma.currentPage.children) {
      if (!roots.has(node.id) && !node.removed) node.remove();
    }
    throw error;
  }
}

async function loadFont(model: OutlineViewModel): Promise<FontName> {
  const available = (await figma.listAvailableFontsAsync()).map((item) => item.fontName);
  const font = requiredFont({ cssStack: model.fontFamily, platform: 'macos',
    weight: 400, style: 'normal' }, available);
  try { await figma.loadFontAsync(font); }
  catch { throw fontFailure(font, `Required font could not be loaded: ${font.family} / ${font.style}.`); }
  return font;
}

function createActionSet(model: OutlineViewModel, icons: IconButtonLibrary,
  theme: UiKitThemeVariables): ComponentSetNode {
  const variants = model.actions.filter((action) => action.svg).map((action) => {
    const node = figma.createComponent();
    node.name = `Action=${action.name}`;
    node.resize(28, 24);
    node.fills = [];
    node.strokes = [];
    if (action.active) {
      const selection = figma.createRectangle();
      selection.name = 'Selection background';
      node.appendChild(selection);
      selection.resize(28, 24);
      selection.x = 0;
      selection.y = 0;
      selection.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
      selection.cornerRadius = theme.primitive.dark.radii.mediumRadius;
      selection.setBoundVariable('cornerRadius', theme.primitive.radii.mediumRadius);
      selection.fills = [boundUiKitPaint(theme, 'selectedOverlay')];
      selection.strokes = [];
      selection.opacity = theme.primitive.dark.selectedOpacity;
    }
    const button = icons.create(`Outline / ${action.name}`, 'Toolbar', 'Default',
      action.active ? 'Opaque' : 'Muted');
    node.appendChild(button);
    button.isExposedInstance = true;
    if (action.active) {
      if (!rebindGlyphTone(button,
        theme.primitive.colors.icon, theme.colors.iconActive,
        theme.primitive.dark.colors.icon)) {
        throw new Error('Outline View: cor do controle ativo não vinculada.');
      }
    }
    return node;
  });
  const set = figma.combineAsVariants(variants, figma.currentPage);
  set.name = 'Obsidian / Outline / Header Action';
  set.description = 'Auto-scroll ativo e Expand all observados; Show search filter reutiliza Bookmarks.';
  variants.forEach((variant, index) => { variant.x = 20; variant.y = 20 + index * 44; });
  set.resizeWithoutConstraints(90, 20 + variants.length * 44);
  if (set.componentPropertyDefinitions.Action?.type !== 'VARIANT' || set.children.length !== 2) {
    throw new Error('Outline View: ações incompletas.');
  }
  return set;
}

function createOutlineTab(workspaceTabs: ComponentSetNode,
  icons: IconButtonLibrary): { icon: ComponentNode; group: ComponentNode } {
  const source = workspaceTabs.children.find((node): node is ComponentNode =>
    node.type === 'COMPONENT' && node.variantProperties?.Context === 'Sidedock' &&
    node.variantProperties?.State === 'Active');
  const iconProperty = Object.keys(workspaceTabs.componentPropertyDefinitions).find((key) =>
    key.startsWith('Icon / Active#') &&
    workspaceTabs.componentPropertyDefinitions[key]?.type === 'INSTANCE_SWAP');
  if (!source || !iconProperty) throw new Error('Outline View: Workspace Tab ativa incompatível.');
  const icon = figma.createComponent();
  icon.name = 'Obsidian / Workspace Tab Icon / Outline / Active';
  icon.resize(16, 16);
  icon.fills = [];
  icon.strokes = [];
  const glyph = icons.createGlyph('Outline / Tab', 'Selected');
  icon.appendChild(glyph);
  glyph.x = 0;
  glyph.y = 0;
  const group = figma.createComponent();
  group.name = 'Obsidian / WorkspaceTabs / Outline';
  group.description = 'Um tab Outline ativo para o preview hospedado; usa Workspace Tab e glyph canônico.';
  group.resize(28, 25);
  group.fills = [];
  group.strokes = [];
  const tab = source.createInstance();
  group.appendChild(tab);
  tab.name = 'Outline tab';
  tab.setProperties({ [iconProperty]: icon.id });
  tab.isExposedInstance = true;
  return { icon, group };
}

function createHeader(model: OutlineViewModel, actions: ComponentSetNode,
  bookmarks: ComponentSetNode): ComponentNode {
  const header = figma.createComponent();
  header.name = 'Obsidian / Outline / Header';
  header.description = 'Barra de 40 px: busca reutilizada, auto-scroll ativo e Expand all.';
  header.resize(model.width, 40);
  header.layoutMode = 'HORIZONTAL';
  header.primaryAxisSizingMode = 'FIXED';
  header.counterAxisSizingMode = 'FIXED';
  header.primaryAxisAlignItems = 'CENTER';
  header.counterAxisAlignItems = 'CENTER';
  header.paddingLeft = 8;
  header.paddingRight = 8;
  header.itemSpacing = 2;
  header.fills = [];
  header.strokes = [];
  for (const action of model.actions) {
    const source = action.reuse ? bookmarks : actions;
    const variant = source.children.find((node): node is ComponentNode =>
      node.type === 'COMPONENT' && node.variantProperties?.Action === action.name);
    if (!variant) throw new Error(`Outline View: ação ${action.name} ausente.`);
    const instance = variant.createInstance();
    instance.name = action.name;
    header.appendChild(instance);
    instance.isExposedInstance = true;
  }
  return header;
}

function createView(model: OutlineViewModel, header: ComponentNode,
  rows: TreeRowLibrary, theme: UiKitThemeVariables): ComponentNode {
  const view = figma.createComponent();
  view.name = 'Obsidian / Outline View';
  view.description = 'Outline hospedado, com linhas Tree Navigation Row editáveis e altura por wrapping. Conteúdo do fixture é exemplo.';
  view.resize(model.width, model.height);
  view.layoutMode = 'VERTICAL';
  view.primaryAxisSizingMode = 'FIXED';
  view.counterAxisSizingMode = 'FIXED';
  view.fills = [boundUiKitPaint(theme, 'surfaceSecondary')];
  view.strokes = [];
  view.clipsContent = true;
  const headerInstance = header.createInstance();
  headerInstance.name = 'Outline header';
  view.appendChild(headerInstance);
  headerInstance.layoutSizingHorizontal = 'FILL';
  headerInstance.isExposedInstance = true;
  const body = figma.createFrame();
  body.name = 'Outline tree';
  view.appendChild(body);
  body.resize(model.width, model.height - 40);
  body.layoutMode = 'VERTICAL';
  body.primaryAxisSizingMode = 'FIXED';
  body.counterAxisSizingMode = 'FIXED';
  body.layoutSizingHorizontal = 'FILL';
  body.layoutGrow = 1;
  body.paddingTop = model.body.paddingTop;
  body.paddingRight = model.body.paddingX;
  body.paddingBottom = model.body.paddingBottom;
  body.paddingLeft = model.body.paddingX;
  body.itemSpacing = model.body.rowGap;
  body.fills = [];
  body.strokes = [];
  body.clipsContent = true;
  appendBranches(body, outlineHierarchy(model.body.rows), rows, model);
  if (body.children.length !== 2) throw new Error('Outline View: hierarquia incompleta.');
  return view;
}

function appendBranches(parent: FrameNode, branches: readonly OutlineBranch[],
  rows: TreeRowLibrary, model: OutlineViewModel): void {
  for (const branch of branches) {
    const instance = rows.createOutline(branch.row);
    parent.appendChild(instance);
    instance.layoutSizingHorizontal = 'FILL';
    instance.layoutSizingVertical = 'HUG';
    instance.minWidth = 1;
    instance.isExposedInstance = true;
    if (!branch.children.length) continue;
    const children = figma.createFrame();
    children.name = `Children / Depth ${branch.row.depth}`;
    parent.appendChild(children);
    children.resize(parent.width, 1);
    children.layoutMode = 'VERTICAL';
    children.primaryAxisSizingMode = 'AUTO';
    children.counterAxisSizingMode = 'FIXED';
    children.layoutSizingHorizontal = 'FILL';
    children.layoutSizingVertical = 'HUG';
    children.itemSpacing = model.body.rowGap;
    children.fills = [];
    children.strokes = [];
    appendBranches(children, branch.children, rows, model);
    const guide = rows.createGuide(children.height);
    guide.name = `Tree guide / Depth ${branch.row.depth}`;
    children.insertChild(0, guide);
    guide.layoutPositioning = 'ABSOLUTE';
    guide.x = treeGuideInset(branch.row.depth);
    guide.y = 0;
    guide.constraints = { horizontal: 'MIN', vertical: 'STRETCH' };
  }
}

async function verifyHost(panel: InstanceNode, content: ComponentNode,
  tab: ComponentNode, model: OutlineViewModel): Promise<void> {
  const linked = await Promise.all(panel.findAll((node) => node.type === 'INSTANCE')
    .filter((node): node is InstanceNode => node.type === 'INSTANCE')
    .map(async (node) => ({ node, id: (await node.getMainComponentAsync())?.id })));
  const hosted = linked.find((item) => item.id === content.id)?.node;
  const tabs = linked.find((item) => item.id === tab.id)?.node;
  if (hosted) { hosted.layoutSizingHorizontal = 'FILL'; hosted.layoutGrow = 1; hosted.minWidth = 1; }
  const header = hosted?.findOne((node) => node.name === 'Outline header');
  const body = hosted?.findOne((node) => node.name === 'Outline tree');
  const rowNodes = body?.type === 'FRAME' ? body.findAll((node) =>
    node.type === 'INSTANCE' && node.name.startsWith('Outline /'))
    .filter((node): node is InstanceNode => node.type === 'INSTANCE') : [];
  const widths = rowNodes.map((node) => node.width);
  if (!hosted || !tabs || Math.abs(hosted.width - panel.width) > 0.5 ||
      Math.abs(hosted.height - (panel.height - 40)) > 0.5 ||
      Math.abs((header?.width ?? 0) - hosted.width) > 0.5 ||
      Math.abs((body?.width ?? 0) - hosted.width) > 0.5 ||
      widths.length !== 4 || widths.some((width) =>
        Math.abs(width - (panel.width - model.body.paddingX * 2)) > 0.5)) {
    throw new Error(`Outline View: resize ou slots divergentes em ${panel.width} px.`);
  }
  if (!body || body.type !== 'FRAME') throw new Error('Outline View: árvore ausente.');
  const bodyBox = body.absoluteBoundingBox;
  assertOutlineLayout(rowNodes.map((row) => {
    const label = row.findOne((node) => node.type === 'TEXT' && node.name === 'Label');
    return { y: (row.absoluteBoundingBox?.y ?? 0) - (bodyBox?.y ?? 0),
      height: row.height, labelHeight: label?.height ?? 0,
      labelLength: label?.type === 'TEXT' ? label.characters.length : 0 };
  }), model.body.rowGap, model.body.lineHeight, panel.width);
  const guides = body.findAll((node) => node.type === 'INSTANCE' &&
    node.name.startsWith('Tree guide /')).filter((node): node is InstanceNode =>
      node.type === 'INSTANCE');
  if (guides.length !== 2 || guides.some((guide, index) =>
    guide.parent?.type !== 'FRAME' ||
    Math.abs(guide.x - treeGuideInset(index)) > 0.5 ||
    Math.abs(guide.y) > 0.5 || Math.abs(guide.width - 1) > 0.05 ||
    Math.abs(guide.height - guide.parent.height) > 0.5)) {
    throw new Error(`Outline View: guias verticais não acompanharam a árvore em ${panel.width} px.`);
  }
}

function swapProperty(component: ComponentNode, name: string): string {
  const property = Object.keys(component.componentPropertyDefinitions).find((key) =>
    key.startsWith(`${name}#`) && component.componentPropertyDefinitions[key]?.type === 'INSTANCE_SWAP');
  if (!property) throw new Error(`Outline View: slot ${name} ausente.`);
  return property;
}

function place(nodes: SceneNode[]): void {
  let x = rightEdge(...nodes) + 64;
  for (const node of nodes) { node.x = x; node.y = 0; x += node.width + 64; }
}

function rightEdge(...excluded: SceneNode[]): number {
  return figma.currentPage.children.filter((node) => !excluded.includes(node))
    .map((node) => node.absoluteBoundingBox).filter((box): box is Rect => box !== null)
    .reduce((max, box) => Math.max(max, box.x + box.width), 0);
}
