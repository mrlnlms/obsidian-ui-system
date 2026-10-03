import { readFileExplorerViewModel, type FileExplorerViewModel } from './file-explorer-view-data';
import type { IconButtonLibrary } from './icon-button-generation';
import type { TreeRowLibrary } from './tree-navigation-row-generation';

interface SidePanelHost { panel: ComponentNode; group: ComponentSetNode; preview: FrameNode }

/** Composes the observed Files excerpt from existing rows in the validated Side Panel. */
export async function composeFilesInSidePanel(probe: unknown, host: SidePanelHost,
  rows: TreeRowLibrary, iconButtons: IconButtonLibrary): Promise<{ component: ComponentNode; preview: FrameNode;
    actions: ComponentSetNode }> {
  const model = readFileExplorerViewModel(probe);
  const filesTab = host.group.children.find((node): node is ComponentNode =>
    node.type === 'COMPONENT' && node.variantProperties?.Active === 'Files');
  const hostInstances = host.preview.children.filter((node): node is InstanceNode => node.type === 'INSTANCE');
  if (host.panel.name !== 'Obsidian / Side Panel / Left / Dark' ||
      host.group.name !== 'Obsidian / WorkspaceTabs / Sidedock' ||
      host.preview.name !== 'Side Panel / Dark resize preview' ||
      !filesTab || hostInstances.length !== 2 ||
      (await hostInstances[0]!.getMainComponentAsync())?.id !== host.panel.id ||
      (await hostInstances[1]!.getMainComponentAsync())?.id !== host.panel.id) {
    throw new Error('Files View: Side Panel validado incompatível.');
  }
  const rootIds = new Set(figma.currentPage.children.map((node) => node.id));
  try {
    const actions = createActionSet(model, iconButtons);
    const component = createFilesView(model, actions, rows);
    placeComponents([actions, component]);

    const preview = host.preview.clone();
    preview.name = 'Side Panel / Dark resize preview / Files';
    preview.x = rightEdgeExcept(preview) + 64;
    preview.y = host.preview.y;
    const viewProperty = findSwapProperty(host.panel, 'Hosted View');
    const tabProperty = findSwapProperty(host.panel, 'Tab group');
    const instances = preview.children.filter((node): node is InstanceNode => node.type === 'INSTANCE');
    if (instances.length !== 2) throw new Error('Files View: preview perdeu suas duas larguras.');
    for (const instance of instances) {
      instance.setProperties({ [viewProperty]: component.id, [tabProperty]: filesTab.id });
      await verifyFilesHost(instance, component, filesTab, model);
    }
    const resizeProbe = host.panel.createInstance();
    try {
      resizeProbe.setProperties({ [viewProperty]: component.id, [tabProperty]: filesTab.id });
      resizeProbe.resize(300, 480);
      await verifyFilesHost(resizeProbe, component, filesTab, model);
    } finally { resizeProbe.remove(); }
    figma.currentPage.selection = [preview];
    figma.viewport.scrollAndZoomIntoView([preview]);
    return { component, preview, actions };
  } catch (error) {
    for (const node of figma.currentPage.children) {
      if (!rootIds.has(node.id) && !node.removed) node.remove();
    }
    throw error;
  }
}

function createActionSet(model: FileExplorerViewModel, iconButtons: IconButtonLibrary): ComponentSetNode {
  const variants = model.header.actions.map((action) => {
    const component = figma.createComponent();
    component.name = `Action=${action.name}`;
    component.resize(28, 24);
    component.fills = [];
    component.strokes = [];
    const button = iconButtons.create(`Files / ${action.name}`);
    component.appendChild(button);
    button.isExposedInstance = true;
    return component;
  });
  const set = figma.combineAsVariants(variants, figma.currentPage);
  set.name = 'Obsidian / File Explorer / Header Action';
  set.description = 'Cinco ações observadas na barra Files Dark; selecione pela propriedade Action.';
  variants.forEach((variant, index) => { variant.x = 20; variant.y = 20 + index * 44; });
  set.resizeWithoutConstraints(90, 20 + variants.length * 44);
  if (set.componentPropertyDefinitions.Action?.type !== 'VARIANT' || set.children.length !== 5) {
    throw new Error('Files View: variants de ação ausentes.');
  }
  return set;
}

function createFilesView(model: FileExplorerViewModel, actionSet: ComponentSetNode,
  rows: TreeRowLibrary): ComponentNode {
  const component = figma.createComponent();
  component.name = 'Obsidian / File Explorer View / Dark';
  component.description = 'Conteúdo Files Dark no Side Panel; ações e linhas usam Icon Button e Tree Navigation Row.';
  component.layoutMode = 'VERTICAL';
  component.primaryAxisSizingMode = 'FIXED';
  component.counterAxisSizingMode = 'FIXED';
  component.itemSpacing = 0;
  component.resize(model.width, model.height);
  component.fills = [paint('rgb(40, 40, 40)')];
  component.strokes = [];
  component.clipsContent = true;

  const header = figma.createComponent();
  header.name = 'Obsidian / File Explorer / Header / Dark';
  header.description = 'Barra de ações Files observada: 40 px, cinco ações centradas.';
  header.layoutMode = 'HORIZONTAL';
  header.primaryAxisSizingMode = 'FIXED';
  header.counterAxisSizingMode = 'FIXED';
  header.primaryAxisAlignItems = 'CENTER';
  header.counterAxisAlignItems = 'CENTER';
  header.itemSpacing = model.header.gap;
  header.paddingLeft = model.header.padding;
  header.paddingRight = model.header.padding;
  header.resize(model.width, model.header.height);
  header.fills = [];
  header.strokes = [];
  for (const action of model.header.actions) {
    const variant = actionSet.children.find((node): node is ComponentNode =>
      node.type === 'COMPONENT' && node.variantProperties?.Action === action.name);
    if (!variant) throw new Error(`Files View: ação ${action.name} ausente.`);
    const instance = variant.createInstance();
    instance.name = action.name;
    header.appendChild(instance);
    instance.isExposedInstance = true;
  }
  const headerInstance = header.createInstance();
  headerInstance.name = 'Files header';
  component.appendChild(headerInstance);
  headerInstance.layoutSizingHorizontal = 'FILL';
  headerInstance.isExposedInstance = true;

  const body = figma.createFrame();
  body.name = 'Files tree';
  component.appendChild(body);
  body.layoutMode = 'VERTICAL';
  body.primaryAxisSizingMode = 'FIXED';
  body.counterAxisSizingMode = 'FIXED';
  body.itemSpacing = model.body.rowGap;
  body.paddingTop = model.body.paddingTop;
  body.paddingRight = model.body.paddingX;
  body.paddingBottom = model.body.paddingBottom;
  body.paddingLeft = model.body.paddingX;
  body.resize(model.width, model.height - model.header.height);
  body.layoutSizingHorizontal = 'FILL';
  body.layoutGrow = 1;
  body.fills = [];
  body.strokes = [];
  body.clipsContent = true;
  for (const row of model.body.rows) {
    const instance = rows.create(row);
    body.appendChild(instance);
    instance.isExposedInstance = true;
    instance.layoutSizingHorizontal = 'FILL';
    instance.minWidth = 1;
    const label = instance.findOne((node) => node.type === 'TEXT' && node.name === 'Label');
    if (label?.type !== 'TEXT' || label.characters !== row.label) {
      throw new Error(`Files View: Label não aplicado em ${instance.name}.`);
    }
  }
  header.x = rightEdgeExcept(component) + 64;
  header.y = 0;
  if (body.children.length !== model.body.rows.length ||
      component.height !== model.height || headerInstance.height !== model.header.height) {
    throw new Error('Files View: composição inicial divergente.');
  }
  return component;
}

async function verifyFilesHost(panel: InstanceNode, content: ComponentNode, filesTab: ComponentNode,
  model: FileExplorerViewModel): Promise<void> {
  // Figma can rename a nested instance when its INSTANCE_SWAP uses the default
  // variant. Identify the actual linked component instead of its layer name.
  const candidates = panel.findAll((node) => node.type === 'INSTANCE')
    .filter((node): node is InstanceNode => node.type === 'INSTANCE');
  const linked = await Promise.all(candidates.map(async (node) => ({
    node, mainId: (await node.getMainComponentAsync())?.id,
  })));
  const hosted = linked.find((item) => item.mainId === content.id)?.node;
  const tabs = linked.find((item) => item.mainId === filesTab.id)?.node;
  if (!hosted || !tabs) {
    throw new Error('Files View: os slots trocados não aparecem na instância do Side Panel. ' +
      JSON.stringify({ expected: { view: content.id, tab: filesTab.id },
        found: linked.slice(0, 24).map(({ node, mainId }) => ({ name: node.name, mainId })) }));
  }
  hosted.layoutSizingHorizontal = 'FILL';
  hosted.layoutGrow = 1;
  hosted.minWidth = 1;
  const header = hosted.findOne((node) => node.name === 'Files header');
  const body = hosted.findOne((node) => node.name === 'Files tree');
  const rows = body?.type === 'FRAME' ? body.children : [];
  const expectedRowWidth = panel.width - 2 * model.body.paddingX;
  if (Math.abs(hosted.width - panel.width) > 0.5 ||
      Math.abs(hosted.height - (panel.height - 40)) > 0.5 ||
      Math.abs((header?.width ?? 0) - hosted.width) > 0.5 ||
      Math.abs((body?.width ?? 0) - hosted.width) > 0.5 ||
      rows.length !== model.body.rows.length ||
      rows.some((row) => Math.abs(row.width - expectedRowWidth) > 0.5)) {
    throw new Error(`Files View: resize ou slots divergentes em ${panel.width} px. ` +
      JSON.stringify({ hosted: [hosted.width, hosted.height], header: header?.width,
        body: body?.width, rowWidths: rows.map((row) => row.width), expectedRowWidth }));
  }
  for (const index of [5, 6]) {
    const row = rows[index];
    const metadata = row?.type === 'INSTANCE' ? row.findOne((node) => node.name === 'Metadata') : null;
    const text = row?.type === 'INSTANCE' ? row.findOne((node) => node.name === 'Metadata text') : null;
    if (!row || metadata?.type !== 'FRAME' || !metadata.visible ||
        text?.type !== 'TEXT' || text.characters !== model.body.rows[index]!.tag!.toUpperCase() ||
        Math.abs(row.width - metadata.x - metadata.width - model.body.rightInset) > 0.5) {
      throw new Error(`Files View: metadata ${model.body.rows[index]!.tag} perdeu o alinhamento em ${panel.width} px.`);
    }
  }
}

function findSwapProperty(component: ComponentNode, name: string): string {
  const key = Object.keys(component.componentPropertyDefinitions).find((item) =>
    item.startsWith(`${name}#`) && component.componentPropertyDefinitions[item]?.type === 'INSTANCE_SWAP');
  if (!key) throw new Error(`Files View: propriedade ${name} ausente.`);
  return key;
}

function placeComponents(nodes: SceneNode[]): void {
  let x = rightEdgeExcept(...nodes) + 64;
  for (const node of nodes) {
    node.x = x;
    node.y = 0;
    x += node.width + 64;
  }
}

function rightEdgeExcept(...excluded: SceneNode[]): number {
  return figma.currentPage.children.filter((node) => !excluded.includes(node))
    .map((node) => node.absoluteBoundingBox)
    .filter((box): box is Rect => box !== null)
    .reduce((right, box) => Math.max(right, box.x + box.width), 0);
}

function paint(css: string): SolidPaint {
  const channels = /^rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)$/.exec(css)?.slice(1).map(Number);
  if (!channels || channels.some((value) => value > 255)) {
    throw new Error(`Files View: cor inválida: ${css}.`);
  }
  return { type: 'SOLID', color: { r: channels[0]! / 255,
    g: channels[1]! / 255, b: channels[2]! / 255 } };
}
