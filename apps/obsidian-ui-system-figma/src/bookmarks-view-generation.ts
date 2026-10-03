import { fontFailure, requiredFont } from './font-resolution';
import { readBookmarksViewModel, type BookmarksViewModel, type BookmarkRow } from './bookmarks-view-data';
import type { IconButtonLibrary } from './icon-button-generation';
import { boundUiKitPaint, type UiKitThemeVariables } from './ui-kit-theme';

interface Host { panel: ComponentNode; group: ComponentSetNode; preview: FrameNode }

/** Adds Bookmarks content to a copy of the validated Side Panel preview. */
export async function composeBookmarksInSidePanel(probe: unknown, host: Host,
  fileActions: ComponentSetNode, iconButtons: IconButtonLibrary,
  theme: UiKitThemeVariables): Promise<{
    component: ComponentNode; preview: FrameNode }> {
  const model = readBookmarksViewModel(probe);
  const tab = host.group.children.find((node): node is ComponentNode =>
    node.type === 'COMPONENT' && node.variantProperties?.Active === 'Bookmarks');
  const hostInstances = host.preview.children.filter((node): node is InstanceNode =>
    node.type === 'INSTANCE');
  if (host.panel.name !== 'Obsidian / Side Panel / Left / Dark' ||
      host.group.name !== 'Obsidian / WorkspaceTabs / Sidedock' ||
      host.preview.name !== 'Side Panel / Dark resize preview' ||
      fileActions.name !== 'Obsidian / File Explorer / Header Action' || !tab ||
      hostInstances.length !== 2 ||
      (await hostInstances[0]!.getMainComponentAsync())?.id !== host.panel.id ||
      (await hostInstances[1]!.getMainComponentAsync())?.id !== host.panel.id) {
    throw new Error('Bookmarks View: host ou ações Files validadas ausentes.');
  }
  const roots = new Set(figma.currentPage.children.map((node) => node.id));
  try {
    const font = await loadFont(model);
    const actions = createNewActions(model, iconButtons);
    const rows = createRowSet(model, font, theme);
    const component = createView(model, actions, fileActions, rows);
    place([actions, rows, component]);
    const preview = host.preview.clone();
    preview.name = 'Side Panel / Dark resize preview / Bookmarks';
    preview.x = rightEdge(preview) + 64;
    preview.y = host.preview.y;
    const viewProperty = swapProperty(host.panel, 'Hosted View');
    const tabProperty = swapProperty(host.panel, 'Tab group');
    const instances = preview.children.filter((node): node is InstanceNode => node.type === 'INSTANCE');
    if (instances.length !== 2) throw new Error('Bookmarks View: preview perdeu as duas larguras.');
    for (const instance of instances) {
      instance.setProperties({ [viewProperty]: component.id, [tabProperty]: tab.id });
      await verifyHost(instance, component, tab, model);
    }
    const resized = host.panel.createInstance();
    try {
      resized.setProperties({ [viewProperty]: component.id, [tabProperty]: tab.id });
      resized.resize(300, 480);
      await verifyHost(resized, component, tab, model);
    } finally { resized.remove(); }
    figma.currentPage.selection = [preview];
    figma.viewport.scrollAndZoomIntoView([preview]);
    return { component, preview };
  } catch (error) {
    for (const node of figma.currentPage.children) {
      if (!roots.has(node.id) && !node.removed) node.remove();
    }
    throw error;
  }
}

async function loadFont(model: BookmarksViewModel): Promise<FontName> {
  const available = (await figma.listAvailableFontsAsync()).map((item) => item.fontName);
  const font = requiredFont({ cssStack: model.fontFamily, platform: 'macos',
    weight: 400, style: 'normal' }, available);
  try { await figma.loadFontAsync(font); }
  catch { throw fontFailure(font, `Required font could not be loaded: ${font.family} / ${font.style}.`); }
  const probe = figma.createText();
  try {
    probe.fontName = font;
    probe.characters = model.rows[2]!.label;
    if (probe.hasMissingFont || probe.width <= 0 || probe.height <= 0) {
      throw fontFailure(font, 'Bookmarks View: fonte não renderizou.');
    }
  } finally { probe.remove(); }
  return font;
}

function createNewActions(model: BookmarksViewModel, iconButtons: IconButtonLibrary): ComponentSetNode {
  const variants = model.actions.filter((action) => action.svg).map((action) => {
    const node = figma.createComponent();
    node.name = `Action=${action.name}`;
    node.resize(28, 24);
    node.fills = [];
    node.strokes = [];
    const button = iconButtons.create(`Bookmarks / ${action.name}`);
    node.appendChild(button);
    button.isExposedInstance = true;
    return node;
  });
  const set = figma.combineAsVariants(variants, figma.currentPage);
  set.name = 'Obsidian / Bookmarks / Header Action';
  set.description = 'Duas ações próprias de Bookmarks. New group e Collapse all reutilizam as ações Files observadas.';
  variants.forEach((variant, index) => { variant.x = 20; variant.y = 20 + 44 * index; });
  set.resizeWithoutConstraints(90, 20 + variants.length * 44);
  if (set.componentPropertyDefinitions.Action?.type !== 'VARIANT' || set.children.length !== 2) {
    throw new Error('Bookmarks View: Component Set de ações incompleto.');
  }
  return set;
}

function createRowSet(model: BookmarksViewModel, font: FontName,
  theme: UiKitThemeVariables): ComponentSetNode {
  const labels: TextNode[] = [];
  const variants = model.rows.map((row) => {
    const component = figma.createComponent();
    component.name = `Kind=${row.kind}, Depth=${row.depth}, State=${row.state}`;
    component.description = 'Linha Bookmarks Dark observada. Label editável; texto longo quebra linha e aumenta a altura.';
    component.resize(model.width - 2 * model.body.paddingX, row.height);
    component.layoutMode = 'HORIZONTAL';
    component.primaryAxisSizingMode = 'FIXED';
    component.counterAxisSizingMode = 'AUTO';
    component.paddingLeft = row.labelOffset - 20;
    component.paddingRight = 8;
    component.paddingTop = 4;
    component.paddingBottom = 4;
    component.itemSpacing = 4;
    component.counterAxisAlignItems = 'MIN';
    component.cornerRadius = 8;
    component.fills = [];
    component.strokes = [];
    if (row.state === 'Selected') {
      const selection = figma.createRectangle();
      selection.name = 'Selection background';
      component.appendChild(selection);
      selection.layoutPositioning = 'ABSOLUTE';
      selection.resize(component.width, component.height);
      selection.x = 0;
      selection.y = 0;
      selection.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
      selection.cornerRadius = 8;
      selection.fills = [boundUiKitPaint(theme, 'selectedOverlay')];
      selection.strokes = [];
      selection.opacity = 0.067;
    }
    const glyph = figma.createNodeFromSvg(
      (row.kind === 'Group' ? model.icons.group : model.icons.file)
        .replace(/currentColor/g, 'rgb(179, 179, 179)'));
    glyph.name = row.kind === 'Group' ? 'Disclosure' : 'File icon';
    component.appendChild(glyph);
    glyph.resize(model.body.iconSize, model.body.iconSize);
    glyph.opacity = 0.85;
    const label = figma.createText();
    label.name = 'Label';
    component.appendChild(label);
    label.fontName = font;
    label.fontSize = model.body.fontSize;
    label.lineHeight = { unit: 'PIXELS', value: model.body.lineHeight };
    label.fills = [boundUiKitPaint(theme,
      row.state === 'Selected' ? 'textNormal' : 'textMuted')];
    label.characters = row.label;
    label.textAutoResize = 'HEIGHT';
    label.resize(component.width - row.labelOffset - 8, model.body.lineHeight);
    label.layoutGrow = 1;
    label.minWidth = 1;
    if (label.hasMissingFont || label.width <= 0) {
      throw fontFailure(font, 'Bookmarks View: texto da linha não renderizou.');
    }
    labels.push(label);
    return component;
  });
  const set = figma.combineAsVariants(variants, figma.currentPage);
  set.name = 'Obsidian / Bookmarks Row / Dark';
  set.description = 'Grupo expandido e arquivos nos estados/profundidades observados; texto multiline editável.';
  const labelProperty = set.addComponentProperty('Label', 'TEXT', model.rows[0]!.label);
  labels.forEach((label) => { label.componentPropertyReferences = { characters: labelProperty }; });
  variants.forEach((variant, index) => { variant.x = 20; variant.y = 20 + index * 80; });
  set.resizeWithoutConstraints(model.width + 16, 20 + variants.length * 80);
  if (set.children.length !== 3 ||
      ['Kind', 'Depth', 'State'].some((key) => set.componentPropertyDefinitions[key]?.type !== 'VARIANT') ||
      set.componentPropertyDefinitions[labelProperty]?.type !== 'TEXT') {
    throw new Error('Bookmarks View: variants ou Label das linhas ausentes.');
  }
  return set;
}

function createView(model: BookmarksViewModel, actions: ComponentSetNode,
  fileActions: ComponentSetNode, rows: ComponentSetNode): ComponentNode {
  const view = figma.createComponent();
  view.name = 'Obsidian / Bookmarks View / Dark';
  view.description = 'Bookmarks Dark no Side Panel validado: quatro ações e três linhas observadas. Nomes são conteúdo de exemplo.';
  view.resize(model.width, model.height);
  view.layoutMode = 'VERTICAL';
  view.primaryAxisSizingMode = 'FIXED';
  view.counterAxisSizingMode = 'FIXED';
  view.fills = [paint('rgb(40, 40, 40)')];
  view.strokes = [];
  view.clipsContent = true;
  const header = figma.createComponent();
  header.name = 'Obsidian / Bookmarks / Header / Dark';
  header.description = 'Quatro ações observadas na barra Bookmarks de 40 px.';
  header.resize(model.width, 40);
  header.layoutMode = 'HORIZONTAL';
  header.primaryAxisSizingMode = 'FIXED';
  header.counterAxisSizingMode = 'FIXED';
  header.primaryAxisAlignItems = 'CENTER';
  header.counterAxisAlignItems = 'CENTER';
  header.itemSpacing = 2;
  header.fills = [];
  header.strokes = [];
  for (const action of model.actions) {
    const source = action.reuse ? fileActions : actions;
    const selectedName = action.reuse ?? action.name;
    const variant = source.children.find((node): node is ComponentNode =>
      node.type === 'COMPONENT' && node.variantProperties?.Action === selectedName);
    if (!variant) throw new Error(`Bookmarks View: ação reutilizável ${selectedName} ausente.`);
    const instance = variant.createInstance();
    instance.name = action.name;
    header.appendChild(instance);
    instance.isExposedInstance = true;
  }
  const headerInstance = header.createInstance();
  headerInstance.name = 'Bookmarks header';
  view.appendChild(headerInstance);
  headerInstance.layoutSizingHorizontal = 'FILL';
  headerInstance.isExposedInstance = true;
  const body = figma.createFrame();
  body.name = 'Bookmarks tree';
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
  for (const row of model.rows) addRow(body, rows, row);
  header.x = rightEdge(view) + 64;
  header.y = 0;
  if (headerInstance.height !== 40 || body.children.length !== 3) {
    throw new Error('Bookmarks View: composição incompleta.');
  }
  return view;
}

function addRow(body: FrameNode, set: ComponentSetNode, row: BookmarkRow): void {
  const variant = set.children.find((node): node is ComponentNode =>
    node.type === 'COMPONENT' && node.variantProperties?.Kind === row.kind &&
    node.variantProperties?.Depth === String(row.depth) &&
    node.variantProperties?.State === row.state);
  if (!variant) throw new Error(`Bookmarks View: linha ${row.kind}/${row.depth}/${row.state} ausente.`);
  const instance = variant.createInstance();
  instance.name = `${row.kind} / ${row.label}`;
  body.appendChild(instance);
  instance.layoutSizingHorizontal = 'FILL';
  instance.minWidth = 1;
  instance.isExposedInstance = true;
  const property = Object.keys(set.componentPropertyDefinitions).find((key) =>
    key.startsWith('Label#') && set.componentPropertyDefinitions[key]?.type === 'TEXT');
  if (!property) throw new Error('Bookmarks View: propriedade Label ausente.');
  instance.setProperties({ [property]: row.label });
}

async function verifyHost(panel: InstanceNode, content: ComponentNode, tab: ComponentNode,
  model: BookmarksViewModel): Promise<void> {
  const instances = panel.findAll((node) => node.type === 'INSTANCE')
    .filter((node): node is InstanceNode => node.type === 'INSTANCE');
  const linked = await Promise.all(instances.map(async (node) => ({
    node, id: (await node.getMainComponentAsync())?.id,
  })));
  const hosted = linked.find((item) => item.id === content.id)?.node;
  const tabs = linked.find((item) => item.id === tab.id)?.node;
  if (hosted) {
    hosted.layoutSizingHorizontal = 'FILL';
    hosted.layoutGrow = 1;
    hosted.minWidth = 1;
  }
  const header = hosted?.findOne((node) => node.name === 'Bookmarks header');
  const body = hosted?.findOne((node) => node.name === 'Bookmarks tree');
  const rowWidths = body?.type === 'FRAME' ? body.children.map((node) => node.width) : [];
  if (!hosted || !tabs || Math.abs(hosted.width - panel.width) > 0.5 ||
      Math.abs(hosted.height - (panel.height - 40)) > 0.5 ||
      Math.abs((header?.width ?? 0) - hosted.width) > 0.5 ||
      Math.abs((body?.width ?? 0) - hosted.width) > 0.5 ||
      rowWidths.length !== 3 ||
      rowWidths.some((width) => Math.abs(width - (panel.width - model.body.paddingX * 2)) > 0.5)) {
    throw new Error(`Bookmarks View: resize ou slots divergentes em ${panel.width} px. ` +
      JSON.stringify({ hosted: hosted && [hosted.width, hosted.height],
        header: header?.width, body: body?.width, rowWidths }));
  }
}

function swapProperty(component: ComponentNode, name: string): string {
  const property = Object.keys(component.componentPropertyDefinitions).find((key) =>
    key.startsWith(`${name}#`) && component.componentPropertyDefinitions[key]?.type === 'INSTANCE_SWAP');
  if (!property) throw new Error(`Bookmarks View: slot ${name} ausente.`);
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

function paint(css: string): SolidPaint {
  const channels = /^rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)$/.exec(css)?.slice(1).map(Number);
  if (!channels || channels.some((value) => value > 255)) throw new Error(`Bookmarks View: cor inválida: ${css}.`);
  return { type: 'SOLID', color: { r: channels[0]! / 255,
    g: channels[1]! / 255, b: channels[2]! / 255 } };
}
