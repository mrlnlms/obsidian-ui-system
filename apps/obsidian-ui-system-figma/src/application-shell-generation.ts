import type { SidePanelModel } from './side-panel-data';
import type { ViewHeaderModel } from './view-header-data';
import type { WorkspaceTabModel } from './workspace-tab-data';
import type { IconButtonLibrary } from './icon-button-generation';
import { glyphGeometry, type IconSource } from './glyph-library';
import { createStatusBar, readStatusBarEvidence, statusBarGlyphSources,
  type StatusBarEvidence } from './application-shell-status';
import { hasExposableChildren } from './public-api-batch-generation';
import { createVaultProfile, readVaultProfileEvidence, vaultProfileGlyphSources,
  type VaultProfileEvidence } from './application-shell-profile';
import { boundUiKitPaint, type UiKitThemeVariables } from './ui-kit-theme';

export interface ApplicationShellEvidence {
  ribbonWidth: number;
  rightSampleWidth: number;
  statusHeight: number;
  statusSampleWidth: number;
  status: StatusBarEvidence;
  vaultProfile: VaultProfileEvidence;
  mainTabs: { headerHeight: number; tabWidth: number; newTabGap: number;
    activeChrome: { outline: string; shoulderSize: number; shoulderTop: number };
    newTab: { width: number; height: number; iconX: number; iconY: number;
      iconSize: number; svg: string } };
  borderColor: string;
  ribbon: { actionX: number; actionTop: number; actionWidth: number;
    actionHeight: number; actionStep: number; actions: Array<{ name: string; svg: string }> };
  right: { headerHeight: number; tabLeft: number; tabTop: number; tabGap: number;
    toggleRight: number; toggleWidth: number; toggleHeight: number;
    tabs: Array<{ name: string; glyph: string; svg?: string }> };
}

/** Focused runtime geometry; right width and status width are scene samples. */
export function readApplicationShellEvidence(input: unknown): ApplicationShellEvidence {
  const value = input as { format?: string; version?: number;
    ribbon?: ApplicationShellEvidence['ribbon'] & { width?: number };
    rightSidedock?: ApplicationShellEvidence['right'] & { width?: number };
    statusBar?: unknown;
    vaultProfile?: unknown;
    mainTabs?: ApplicationShellEvidence['mainTabs'];
    borders?: Record<string, string> };
  const ribbon = value?.ribbon;
  const right = value?.rightSidedock;
  const status = readStatusBarEvidence(value?.statusBar);
  const vaultProfile = readVaultProfileEvidence(value?.vaultProfile);
  const mainTabs = value?.mainTabs;
  if (value?.format !== 'obsidian-application-shell-probe' || value.version !== 1 ||
      ribbon?.width !== 44 || status.height !== 27 ||
      !Number.isFinite(right?.width) ||
      !Number.isFinite(status.width) ||
      ribbon.actionX !== 7.5 || ribbon.actionTop !== 8 ||
      ribbon.actionWidth !== 28 || ribbon.actionHeight !== 24 ||
      ribbon.actionStep !== 30 || ribbon.actions?.length !== 7 ||
      right?.headerHeight !== 40 || right.tabLeft !== 8 ||
      right.tabTop !== 7 || right.tabGap !== 3 ||
      right.toggleRight !== 8 || right.toggleWidth !== 28 ||
      right.toggleHeight !== 24 || right.tabs?.length !== 5 ||
      mainTabs?.headerHeight !== 40 || mainTabs.tabWidth !== 200 ||
      mainTabs.newTabGap !== 8 || mainTabs.newTab?.width !== 24 ||
      mainTabs.activeChrome?.outline !== 'rgb(51, 51, 51) 0px 0px 0px 1px' ||
      mainTabs.activeChrome.shoulderSize !== 20 ||
      mainTabs.activeChrome.shoulderTop !== 14 ||
      mainTabs.newTab.height !== 39 || mainTabs.newTab.iconX !== 4 ||
      mainTabs.newTab.iconY !== 12.5 || mainTabs.newTab.iconSize !== 16 ||
      right.tabs[4]?.name !== 'Outline' ||
      !value.borders || Object.keys(value.borders).length !== 6 ||
      Object.values(value.borders).some((border) =>
        border !== '1px solid rgb(51, 51, 51)')) {
    throw new Error('Application Shell: evidência estrutural incompleta.');
  }
  for (const action of ribbon.actions) {
    if (!action.name || !action.svg) throw new Error('Application Shell: ação Ribbon inválida.');
    glyphGeometry(action.svg);
  }
  for (const tab of right.tabs) {
    if (!tab.name || !tab.glyph || (tab.name !== 'Outline' && !tab.svg)) {
      throw new Error('Application Shell: tab direito inválido.');
    }
    if (tab.svg) glyphGeometry(tab.svg);
  }
  glyphGeometry(mainTabs.newTab.svg);
  return { ribbonWidth: 44, rightSampleWidth: right.width!,
    statusHeight: 27, statusSampleWidth: status.width,
    status, vaultProfile, mainTabs, borderColor: 'rgb(51, 51, 51)', ribbon, right };
}

export function applicationShellGlyphSources(evidence: ApplicationShellEvidence): IconSource[] {
  return [
    ...evidence.ribbon.actions.map((action) => ({ name: `Ribbon / ${action.name}`,
      svg: action.svg, color: 'rgb(179, 179, 179)' })),
    ...evidence.right.tabs.filter((tab) => tab.svg).map((tab) => ({
      name: `Right tab / ${tab.name}`, svg: tab.svg!, color: 'rgb(179, 179, 179)',
      glyphName: tab.glyph })),
    ...statusBarGlyphSources(evidence.status),
    ...vaultProfileGlyphSources(evidence.vaultProfile),
    { name: 'Main tabs / New tab', svg: evidence.mainTabs.newTab.svg,
      color: 'rgb(179, 179, 179)' },
  ];
}

/** Main is the only region that changes when the shell grows horizontally. */
export function assertShellResize(widths: { shell: number; ribbon: number; left: number;
  main: number; right: number; content: number; header: number },
  evidence: ApplicationShellEvidence): void {
  if (Math.abs(widths.ribbon - evidence.ribbonWidth) > 1 ||
      widths.left < 200 - 1 || widths.right < rightMinimumWidth(evidence) - 1 ||
      Math.abs(widths.main - (widths.shell - widths.ribbon - widths.left - widths.right)) > 1 ||
      Math.abs(widths.content - widths.main) > 1 ||
      Math.abs(widths.header - widths.main) > 1) {
    throw new Error('Application Shell: distribuição horizontal divergente.');
  }
}

export function assertShellAdjacency(width: number, regions: ReadonlyArray<{
  x: number; width: number }>): void {
  let edge = 0;
  for (const region of regions) {
    if (Math.abs(region.x - edge) > 1) {
      throw new Error(`Application Shell: gap entre regiões (${region.x - edge} px).`);
    }
    edge = region.x + region.width;
  }
  if (Math.abs(edge - width) > 1) {
    throw new Error(`Application Shell: borda final deslocada (${width - edge} px).`);
  }
}

export function assertSidedockProbeLayout(layout: {
  shell: number; main: { x: number; width: number; header: number; content: number };
  ribbon: { visible: boolean; x: number; width: number };
  left: { visible: boolean; x: number; width: number };
  right: { visible: boolean; x: number; width: number };
  status: { x: number; width: number };
}): void {
  const regions = [layout.ribbon, layout.left, layout.main, layout.right]
    .filter((region) => !('visible' in region) || region.visible);
  assertShellAdjacency(layout.shell, regions);
  const sideWidth = [layout.ribbon, layout.left, layout.right]
    .reduce((width, region) => width + (region.visible ? region.width : 0), 0);
  if (layout.main.width < 1 ||
      Math.abs(layout.main.width - (layout.shell - sideWidth)) > 1 ||
      Math.abs(layout.main.header - layout.main.width) > 1 ||
      Math.abs(layout.main.content - layout.main.width) > 1 ||
      Math.abs(layout.status.x + layout.status.width - layout.shell) > 1) {
    throw new Error('Application Shell Slot probe: reflow horizontal divergente.');
  }
}

interface Sources {
  sidePanel: ComponentNode;
  filesView: ComponentNode;
  filesTab: ComponentNode;
  workspaceTab: ComponentSetNode;
  viewHeader: ComponentNode;
  outlineView: ComponentNode;
  outlineTab: ComponentNode;
  iconButtons: IconButtonLibrary;
  sideModel: SidePanelModel;
  headerModel: ViewHeaderModel;
  workspaceModel: WorkspaceTabModel;
}

export async function generateApplicationShell(evidence: ApplicationShellEvidence,
  sources: Sources, theme: UiKitThemeVariables): Promise<{ component: ComponentNode; preview: FrameNode }> {
  const mainTab = sources.workspaceTab.children.find((node): node is ComponentNode =>
    node.type === 'COMPONENT' && node.variantProperties?.Context === 'Main' &&
    node.variantProperties?.State === 'Active');
  const inactiveMainTab = sources.workspaceTab.children.find((node): node is ComponentNode =>
    node.type === 'COMPONENT' && node.variantProperties?.Context === 'Main' &&
    node.variantProperties?.State === 'Inactive');
  if (!mainTab || !inactiveMainTab ||
      sources.sidePanel.name !== 'Obsidian / Side Panel / Left / Dark' ||
      sources.filesView.name !== 'Obsidian / File Explorer View / Dark' ||
      sources.viewHeader.name !== 'Obsidian / View Header / Markdown' ||
      sources.filesTab.variantProperties?.Active !== 'Files' ||
      sources.outlineView.name !== 'Obsidian / Outline View' ||
      sources.outlineTab.name !== 'Obsidian / WorkspaceTabs / Outline') {
    throw new Error('Application Shell: fontes canônicas incompatíveis.');
  }
  const originalRoots = new Set(figma.currentPage.children.map((node) => node.id));
  try {
    const contentSlot = figma.createComponent();
    contentSlot.name = 'Obsidian / Application Shell / Main Content Slot';
    contentSlot.description = 'Troque esta instância por uma interface de plugin. O slot preenche a área abaixo do View Header.';
    contentSlot.resize(sources.headerModel.sample.width, 480);
    contentSlot.fills = [paint('rgb(28, 28, 28)')];
    contentSlot.strokes = [];

    const ribbonSource = createRibbon(evidence, sources.iconButtons,
      sources.sideModel.height + evidence.vaultProfile.height,
      sources.sideModel.headerHeight, sources.sideModel.background);
    const rightSlot = createRightSidedock(evidence, sources);
    const statusSource = await createStatusBar(evidence.status,
      sources.iconButtons, sources.headerModel.typography.fontFamily, theme);
    const profileSource = await createVaultProfile(evidence.vaultProfile,
      sources.iconButtons, sources.sideModel.width,
      sources.headerModel.typography.fontFamily);
    const leftSource = createLeftSidedock(evidence, sources, profileSource, theme);

    const shell = figma.createComponent();
    shell.name = 'Obsidian / Application Shell';
    shell.description = 'Contexto desktop Dark: Files à esquerda, Main Workspace editável, Outline hospedado à direita, Ribbon, Vault Profile e Status Bar. As larguras da região direita e do status são amostras de cena.';
    shell.layoutMode = 'VERTICAL';
    shell.primaryAxisSizingMode = 'FIXED';
    shell.counterAxisSizingMode = 'FIXED';
    shell.itemSpacing = 0;
    shell.resize(evidence.ribbonWidth + sources.sideModel.width +
      sources.headerModel.sample.width + evidence.rightSampleWidth,
    sources.sideModel.height + evidence.vaultProfile.height);
    shell.minWidth = evidence.ribbonWidth + sources.sideModel.minExpandedWidth +
      rightMinimumWidth(evidence) + 1;
    shell.fills = [paint('rgb(28, 28, 28)')];
    shell.strokes = [];
    shell.clipsContent = true;

    const body = frame(shell, 'Workspace regions', 'HORIZONTAL', shell.width,
      shell.height);
    body.layoutGrow = 1;
    body.layoutSizingHorizontal = 'FILL';
    body.primaryAxisAlignItems = 'MIN';
    body.counterAxisAlignItems = 'MIN';
    body.itemSpacing = 0;
    const ribbon = ribbonSource.createInstance();
    ribbon.name = 'Ribbon';
    body.appendChild(ribbon);
    ribbon.layoutSizingVertical = 'FILL';

    const leftColumn = leftSource.createInstance();
    leftColumn.name = 'Left Sidedock / Files';
    body.appendChild(leftColumn);
    leftColumn.layoutSizingVertical = 'FILL';
    leftColumn.layoutSizingHorizontal = 'FIXED';
    leftColumn.minWidth = sources.sideModel.minExpandedWidth;
    if (hasExposableChildren(leftColumn.findAll(() => true))) {
      leftColumn.isExposedInstance = true;
    }

    const main = frame(body, 'Main Workspace', 'VERTICAL',
      sources.headerModel.sample.width, sources.sideModel.height);
    main.layoutSizingHorizontal = 'FILL';
    main.minWidth = 1;
    main.layoutSizingVertical = 'FILL';
    main.fills = [paint('rgb(28, 28, 28)')];
    const tabBar = frame(main, 'Workspace Tabs', 'HORIZONTAL',
      sources.headerModel.sample.width, sources.sideModel.headerHeight);
    tabBar.layoutSizingHorizontal = 'FILL';
    tabBar.paddingLeft = 8;
    tabBar.itemSpacing = evidence.mainTabs.newTabGap;
    tabBar.fills = [paint(sources.sideModel.background)];
    tabBar.clipsContent = false;
    const bottomRule = frame(tabBar, 'Tab header bottom rule', 'HORIZONTAL',
      tabBar.width, 1);
    bottomRule.layoutPositioning = 'ABSOLUTE';
    bottomRule.constraints = { horizontal: 'STRETCH', vertical: 'MAX' };
    bottomRule.fills = [paint(evidence.borderColor)];
    bottomRule.x = 0;
    bottomRule.y = evidence.mainTabs.headerHeight - 1;
    const tabsRow = frame(tabBar, 'Main tabs / two canonical instances', 'HORIZONTAL',
      evidence.mainTabs.tabWidth * 2, evidence.mainTabs.headerHeight);
    tabsRow.itemSpacing = sources.workspaceModel.mainGap;
    tabsRow.paddingTop = evidence.mainTabs.headerHeight - 34;
    tabsRow.layoutGrow = 1;
    tabsRow.minWidth = 1;
    tabsRow.maxWidth = evidence.mainTabs.tabWidth * 2;
    tabsRow.clipsContent = false;
    const inactiveTab = inactiveMainTab.createInstance();
    inactiveTab.name = 'Workspace Tab / previous note';
    tabsRow.appendChild(inactiveTab);
    inactiveTab.layoutGrow = 1;
    inactiveTab.maxWidth = 320;
    inactiveTab.minWidth = 1;
    const tab = mainTab.createInstance();
    tab.name = 'Workspace Tab / plugin context';
    tabsRow.appendChild(tab);
    tab.layoutGrow = 1;
    tab.minWidth = 1;
    tab.maxWidth = 320;
    tab.strokes = [boundUiKitPaint(theme, 'controlBorder')];
    tab.strokeAlign = 'OUTSIDE';
    tab.strokeTopWeight = 1;
    tab.strokeLeftWeight = 1;
    tab.strokeRightWeight = 1;
    tab.strokeBottomWeight = 0;
    const titleProperty = Object.keys(sources.workspaceTab.componentPropertyDefinitions)
      .find((key) => key.startsWith('Title#') &&
        sources.workspaceTab.componentPropertyDefinitions[key]?.type === 'TEXT');
    if (!titleProperty) throw new Error('Application Shell: propriedade Title da Workspace Tab ausente.');
    inactiveTab.setProperties({ [titleProperty]: sources.workspaceModel.variants[0]!.title });
    tab.setProperties({ [titleProperty]: 'My Plugin' });
    createTabShoulder(tabsRow, evidence, 'LEFT');
    createTabShoulder(tabsRow, evidence, 'RIGHT');
    const newTab = frame(tabBar, 'New tab', 'HORIZONTAL',
      evidence.mainTabs.newTab.width, evidence.mainTabs.newTab.height);
    newTab.layoutMode = 'NONE';
    const plus = sources.iconButtons.createGlyph('Main tabs / New tab', 'Selected');
    plus.name = 'New tab glyph';
    newTab.appendChild(plus);
    plus.x = evidence.mainTabs.newTab.iconX;
    plus.y = evidence.mainTabs.newTab.iconY;

    const header = sources.viewHeader.createInstance();
    header.name = 'View Header / chrome';
    main.appendChild(header);
    header.layoutSizingHorizontal = 'FILL';
    const content = contentSlot.createInstance();
    content.name = 'Main Content';
    main.appendChild(content);
    content.layoutSizingHorizontal = 'FILL';
    content.layoutGrow = 1;
    content.minWidth = 1;

    const right = rightSlot.createInstance();
    right.name = 'Right Sidedock';
    body.appendChild(right);
    right.layoutSizingVertical = 'FILL';
    right.layoutSizingHorizontal = 'FIXED';
    right.minWidth = rightMinimumWidth(evidence);
    right.strokes = [boundUiKitPaint(theme, 'controlBorder')];
    edgeStroke(right, 'LEFT');
    if (hasExposableChildren(right.findAll(() => true))) right.isExposedInstance = true;
    body.primaryAxisAlignItems = 'MIN';
    body.itemSpacing = 0;
    const contentProperty = shell.addComponentProperty('Main Content', 'INSTANCE_SWAP',
      contentSlot.id);
    const rightProperty = shell.addComponentProperty('Right Sidedock', 'INSTANCE_SWAP',
      rightSlot.id);
    content.componentPropertyReferences = { mainComponent: contentProperty };
    right.componentPropertyReferences = { mainComponent: rightProperty };
    if (shell.componentPropertyDefinitions[contentProperty]?.type !== 'INSTANCE_SWAP' ||
        shell.componentPropertyDefinitions[rightProperty]?.type !== 'INSTANCE_SWAP' ||
        (await content.getMainComponentAsync())?.id !== contentSlot.id ||
        (await right.getMainComponentAsync())?.id !== rightSlot.id) {
      throw new Error('Application Shell: slots substituíveis não foram preservados.');
    }

    const status = statusSource.createInstance();
    status.name = 'Status Bar';
    shell.appendChild(status);
    status.layoutPositioning = 'ABSOLUTE';
    status.constraints = { horizontal: 'MAX', vertical: 'MAX' };
    status.x = shell.width - status.width;
    status.y = shell.height - status.height;

    const preview = figma.createFrame();
    preview.name = 'Application Shell / Dark resize preview';
    preview.resize(shell.width + 40, shell.height + 40);
    preview.fills = [];
    const instance = shell.createInstance();
    instance.name = 'Application Shell / sample';
    preview.appendChild(instance);
    instance.x = 20;
    instance.y = 20;
    await verifyShell(instance, sources, contentSlot, rightSlot, statusSource,
      profileSource, leftSource, evidence, 'initial');
    instance.resize(shell.width + 200, shell.height + 100);
    const adjustableLeft = instance.findOne((node) => node.name === 'Left Sidedock / Files');
    const adjustableRight = instance.findOne((node) => node.name === 'Right Sidedock');
    if (adjustableLeft?.type !== 'INSTANCE' || adjustableRight?.type !== 'INSTANCE') {
      throw new Error('Application Shell: painéis redimensionáveis ausentes.');
    }
    adjustableLeft.resize(sources.sideModel.minExpandedWidth, adjustableLeft.height);
    adjustableRight.resize(evidence.rightSampleWidth + 40, adjustableRight.height);
    await verifyShell(instance, sources, contentSlot, rightSlot, statusSource,
      profileSource, leftSource, evidence, 'panels resized');
    adjustableLeft.resize(sources.sideModel.width, adjustableLeft.height);
    adjustableRight.resize(evidence.rightSampleWidth, adjustableRight.height);
    instance.resize(shell.width - 300, shell.height);
    await verifyShell(instance, sources, contentSlot, rightSlot, statusSource,
      profileSource, leftSource, evidence, 'shell narrowed');
    instance.resize(shell.width, shell.height);
    await verifyShell(instance, sources, contentSlot, rightSlot, statusSource,
      profileSource, leftSource, evidence, 'restored');
    const slotProbe = createSidedockSlotProbe(shell);
    const probeLeft = slotProbe.findOne((node) => node.name === 'Left Sidedock / Files');
    const probeRight = slotProbe.findOne((node) => node.name === 'Right Sidedock');
    const probeMain = slotProbe.findOne((node) => node.name === 'Main Workspace');
    const probeSlots = Object.values(slotProbe.componentPropertyDefinitions)
      .filter((property) => property.type === 'SLOT');
    if (probeLeft?.type !== 'INSTANCE' || probeRight?.type !== 'INSTANCE' ||
        probeMain?.type !== 'SLOT' ||
        (await probeLeft.getMainComponentAsync())?.id !== leftSource.id ||
        (await probeRight.getMainComponentAsync())?.id !== rightSlot.id ||
        probeSlots.length !== 3) {
      throw new Error('Application Shell Slot probe: fontes canônicas ou Slots divergiram.');
    }
    const slotPreview = createSidedockSlotPreview(slotProbe, evidence);
    const rightEdge = figma.currentPage.children.filter((node) =>
      node !== shell && node !== contentSlot && node !== rightSlot &&
      node !== ribbonSource && node !== statusSource && node !== profileSource &&
      node !== leftSource && node !== slotProbe && node !== slotPreview &&
      node !== preview)
      .map((node) => node.absoluteBoundingBox).filter((box): box is Rect => box !== null)
      .reduce((edge, box) => Math.max(edge, box.x + box.width), 0);
    contentSlot.x = rightEdge + 64;
    ribbonSource.x = contentSlot.x + contentSlot.width + 64;
    rightSlot.x = ribbonSource.x + ribbonSource.width + 64;
    statusSource.x = rightSlot.x + rightSlot.width + 64;
    profileSource.x = statusSource.x + statusSource.width + 64;
    leftSource.x = profileSource.x + profileSource.width + 64;
    shell.x = leftSource.x + leftSource.width + 64;
    preview.x = shell.x + shell.width + 64;
    slotProbe.x = preview.x + preview.width + 64;
    slotPreview.x = slotProbe.x + slotProbe.width + 64;
    figma.currentPage.children.filter((node) => !originalRoots.has(node.id) &&
      node.type === 'COMPONENT' &&
      evidence.right.tabs.some((tab) => node.name ===
        `Obsidian / Workspace Tab Icon / ${tab.name} / Inactive`))
      .forEach((node, index) => { node.x = preview!.x + preview!.width + 64 + index * 32; });
    figma.currentPage.selection = [preview];
    figma.viewport.scrollAndZoomIntoView([preview]);
    return { component: shell, preview };
  } catch (error) {
    for (const node of figma.currentPage.children) {
      if (!originalRoots.has(node.id) && !node.removed) node.remove();
    }
    throw error;
  }
}

/** Linked-instance probe: sidedock slots resize, and the Main Workspace accepts content. */
function createSidedockSlotProbe(shell: ComponentNode): ComponentNode {
  const probe = shell.clone();
  probe.name = 'Obsidian / Application Shell / Sidedock Slots (probe)';
  probe.description = 'Shell com Sidedocks redimensionáveis, Main Workspace editável e controles de visibilidade estrutural na instância.';
  const status = probe.findOne((node) => node.name === 'Status Bar');
  if (status?.type !== 'INSTANCE') throw new Error('Application Shell Slot probe: Status Bar ausente.');
  probe.minWidth = status.width;
  const body = probe.findOne((node) => node.name === 'Workspace regions');
  if (body?.type !== 'FRAME') throw new Error('Application Shell Slot probe: regiões ausentes.');
  const left = body.children.find((node) => node.name === 'Left Sidedock / Files');
  const right = body.children.find((node) => node.name === 'Right Sidedock');
  if (left?.type !== 'INSTANCE' || right?.type !== 'INSTANCE') {
    throw new Error('Application Shell Slot probe: fontes laterais ausentes.');
  }
  const rightSwap = Object.keys(probe.componentPropertyDefinitions).find((key) =>
    key.startsWith('Right Sidedock#') &&
    probe.componentPropertyDefinitions[key]?.type === 'INSTANCE_SWAP');
  if (rightSwap) probe.deleteComponentProperty(rightSwap);
  wrapSidedockInSlot(probe, body, left, 'Left Sidedock slot');
  wrapSidedockInSlot(probe, body, right, 'Right Sidedock slot');
  wrapMainWorkspaceInSlot(probe, body);
  const ribbon = body.children.find((node) => node.name === 'Ribbon');
  const leftSlot = body.children.find((node) => node.name === 'Left Sidedock slot');
  const rightSlot = body.children.find((node) => node.name === 'Right Sidedock slot');
  if (ribbon?.type !== 'INSTANCE' || leftSlot?.type !== 'SLOT' ||
      rightSlot?.type !== 'SLOT') {
    throw new Error('Application Shell Slot probe: regiões configuráveis ausentes.');
  }
  for (const [name, node] of [
    ['Show Ribbon', ribbon], ['Show Left Sidedock', leftSlot],
    ['Show Right Sidedock', rightSlot],
  ] as const) {
    const property = probe.addComponentProperty(name, 'BOOLEAN', true);
    node.componentPropertyReferences = { ...node.componentPropertyReferences, visible: property };
  }
  return probe;
}

function wrapMainWorkspaceInSlot(component: ComponentNode, body: FrameNode): void {
  const main = body.children.find((node) => node.name === 'Main Workspace');
  if (main?.type !== 'FRAME') {
    throw new Error('Application Shell Slot probe: Main Workspace ausente.');
  }
  const index = body.children.indexOf(main);
  const known = new Set(Object.keys(component.componentPropertyDefinitions));
  const slot = component.createSlot();
  const property = Object.keys(component.componentPropertyDefinitions).find((key) =>
    !known.has(key) && component.componentPropertyDefinitions[key]?.type === 'SLOT');
  if (!property) throw new Error('Application Shell Slot probe: propriedade Main Workspace ausente.');
  component.editComponentProperty(property, { name: 'Main Workspace content',
    description: 'Área central para inserir Components na instância do Shell.' });
  slot.name = 'Main Workspace';
  body.insertChild(index, slot);
  slot.resize(main.width, main.height);
  slot.layoutMode = 'VERTICAL';
  slot.itemSpacing = 0;
  slot.paddingLeft = 0;
  slot.paddingRight = 0;
  slot.paddingTop = 0;
  slot.paddingBottom = 0;
  slot.fills = main.fills;
  for (const child of [...main.children]) slot.appendChild(child);
  slot.layoutSizingHorizontal = 'FILL';
  slot.layoutSizingVertical = 'FILL';
  slot.minWidth = main.minWidth;
  main.remove();
}

function wrapSidedockInSlot(component: ComponentNode, body: FrameNode,
  child: InstanceNode, name: string): void {
  const index = body.children.indexOf(child);
  if (index < 0) throw new Error(`Application Shell Slot probe: ${name} fora do body.`);
  const known = new Set(Object.keys(component.componentPropertyDefinitions));
  const slot = component.createSlot();
  const property = Object.keys(component.componentPropertyDefinitions).find((key) =>
    !known.has(key) && component.componentPropertyDefinitions[key]?.type === 'SLOT');
  if (!property) throw new Error(`Application Shell Slot probe: propriedade ${name} ausente.`);
  component.editComponentProperty(property, { name,
    description: 'Contém uma instância canônica; teste o resize horizontal nesta cópia.' });
  slot.name = name;
  body.insertChild(index, slot);
  slot.layoutMode = 'HORIZONTAL';
  slot.itemSpacing = 0;
  slot.paddingLeft = 0;
  slot.paddingRight = 0;
  slot.paddingTop = 0;
  slot.paddingBottom = 0;
  slot.fills = [];
  slot.strokes = [];
  slot.resize(child.width, body.height);
  slot.appendChild(child);
  child.layoutSizingHorizontal = 'FIXED';
  child.layoutSizingVertical = 'FILL';
  slot.layoutSizingHorizontal = 'HUG';
  slot.layoutSizingVertical = 'FILL';
  slot.minWidth = child.minWidth;
}

function createSidedockSlotPreview(probe: ComponentNode,
  evidence: ApplicationShellEvidence): FrameNode {
  const preview = figma.createFrame();
  preview.name = 'Application Shell / Sidedock Slots resize probe';
  preview.resize(probe.width + 40, probe.height + 40);
  preview.fills = [];
  const instance = probe.createInstance();
  instance.name = 'Application Shell / Slot resize sample';
  preview.appendChild(instance);
  instance.x = 20;
  instance.y = 20;
  const body = instance.findOne((node) => node.name === 'Workspace regions');
  const leftSlot = instance.findOne((node) => node.name === 'Left Sidedock slot');
  const rightSlot = instance.findOne((node) => node.name === 'Right Sidedock slot');
  const left = leftSlot?.type === 'SLOT' ? leftSlot.children[0] : null;
  const right = rightSlot?.type === 'SLOT' ? rightSlot.children[0] : null;
  const ribbon = instance.findOne((node) => node.name === 'Ribbon');
  const main = instance.findOne((node) => node.name === 'Main Workspace');
  const header = instance.findOne((node) => node.name === 'View Header / chrome');
  const content = instance.findOne((node) => node.name === 'Main Content');
  const status = instance.findOne((node) => node.name === 'Status Bar');
  if (body?.type !== 'FRAME' || leftSlot?.type !== 'SLOT' ||
      rightSlot?.type !== 'SLOT' || left?.type !== 'INSTANCE' ||
      right?.type !== 'INSTANCE' || ribbon?.type !== 'INSTANCE' ||
      main?.type !== 'SLOT' || header?.type !== 'INSTANCE' ||
      content?.type !== 'INSTANCE' || status?.type !== 'INSTANCE') {
    throw new Error('Application Shell Slot probe: composição inválida ' +
      JSON.stringify({ body: body?.type, leftSlot: leftSlot?.type,
        rightSlot: rightSlot?.type, left: left?.type, right: right?.type,
        ribbon: ribbon?.type, main: main?.type, header: header?.type,
        content: content?.type, status: status?.type }));
  }
  const property = (name: string): string => {
    const key = Object.keys(probe.componentPropertyDefinitions).find((candidate) =>
      candidate.startsWith(`${name}#`) &&
      probe.componentPropertyDefinitions[candidate]?.type === 'BOOLEAN');
    if (!key) throw new Error(`Application Shell Slot probe: propriedade ${name} ausente.`);
    return key;
  };
  const showRibbon = property('Show Ribbon');
  const showLeft = property('Show Left Sidedock');
  const showRight = property('Show Right Sidedock');
  if (ribbon.componentPropertyReferences?.visible !== showRibbon ||
      leftSlot.componentPropertyReferences?.visible !== showLeft ||
      rightSlot.componentPropertyReferences?.visible !== showRight) {
    throw new Error('Application Shell Slot probe: controles de visibilidade desconectados.');
  }
  const verify = (): void => {
    if (main.layoutMode !== 'VERTICAL' ||
        main.layoutSizingHorizontal !== 'FILL' ||
        main.children.map((child) => child.name).join('|') !==
          'Workspace Tabs|View Header / chrome|Main Content') {
      throw new Error('Application Shell Slot probe: Main Workspace perdeu conteúdo ou layout.');
    }
    if (leftSlot.layoutSizingHorizontal !== 'HUG' ||
        rightSlot.layoutSizingHorizontal !== 'HUG' ||
        (leftSlot.visible && Math.abs(leftSlot.width - left.width) > 1) ||
        (rightSlot.visible && Math.abs(rightSlot.width - right.width) > 1)) {
      throw new Error('Application Shell Slot probe: Slots não seguem os painéis.');
    }
    if ((ribbon.visible && Math.abs(ribbon.width - evidence.ribbonWidth) > 1) ||
        (leftSlot.visible && leftSlot.width < 199) ||
        (rightSlot.visible && rightSlot.width < rightMinimumWidth(evidence) - 1)) {
      throw new Error('Application Shell Slot probe: largura de região visível divergente.');
    }
    assertSidedockProbeLayout({ shell: body.width,
      ribbon: { visible: ribbon.visible, x: ribbon.x, width: ribbon.width },
      left: { visible: leftSlot.visible, x: leftSlot.x, width: leftSlot.width },
      main: { x: main.x, width: main.width, header: header.width,
        content: content.width },
      right: { visible: rightSlot.visible, x: rightSlot.x, width: rightSlot.width },
      status: { x: status.x, width: status.width } });
    if (ribbon.visible && leftSlot.visible && rightSlot.visible) {
      assertShellResize({ shell: instance.width, ribbon: ribbon.width,
        left: leftSlot.width, main: main.width, right: rightSlot.width,
        content: content.width, header: header.width }, evidence);
    }
  };
  verify();
  left.resize(left.width + 40, left.height);
  verify();
  right.resize(right.width + 40, right.height);
  verify();
  left.resize(left.width - 40, left.height);
  right.resize(right.width - 40, right.height);
  verify();
  for (let mask = 0; mask < 8; mask += 1) {
    const show = [Boolean(mask & 1), Boolean(mask & 2), Boolean(mask & 4)];
    instance.setProperties({ [showRibbon]: show[0]!,
      [showLeft]: show[1]!, [showRight]: show[2]! });
    if (ribbon.visible !== show[0] || leftSlot.visible !== show[1] ||
        rightSlot.visible !== show[2]) {
      throw new Error('Application Shell Slot probe: controles não alteraram a visibilidade.');
    }
    verify();
    instance.resize(probe.width + 160, probe.height);
    verify();
    instance.resize(probe.width, probe.height);
    if (mask === 0) {
      instance.resize(status.width + 1, probe.height);
      if (Math.abs(instance.width - (status.width + 1)) > 1) {
        throw new Error('Application Shell Slot probe: largura mínima das regiões ocultas persistiu.');
      }
      verify();
      instance.resize(probe.width, probe.height);
    }
  }
  instance.setProperties({ [showRibbon]: true, [showLeft]: true, [showRight]: true });
  verify();
  return preview;
}

function createRibbon(evidence: ApplicationShellEvidence, icons: IconButtonLibrary,
  height: number, headerHeight: number, background: string): ComponentNode {
  const ribbon = figma.createComponent();
  ribbon.name = 'Obsidian / Ribbon';
  ribbon.description = 'Sete ações visíveis na cena Dark, com Icon Button e glyphs canônicos observados.';
  ribbon.layoutMode = 'VERTICAL';
  ribbon.primaryAxisSizingMode = 'FIXED';
  ribbon.counterAxisSizingMode = 'FIXED';
  ribbon.itemSpacing = evidence.ribbon.actionStep - evidence.ribbon.actionHeight;
  ribbon.paddingLeft = evidence.ribbon.actionX;
  ribbon.paddingTop = headerHeight + evidence.ribbon.actionTop;
  ribbon.resize(evidence.ribbonWidth, height);
  ribbon.fills = [paint(background)];
  ribbon.strokes = [paint('rgb(51, 51, 51)')];
  edgeStroke(ribbon, 'RIGHT');
  const top = frame(ribbon, 'Mac window controls region / partial', 'HORIZONTAL',
    evidence.ribbonWidth, headerHeight);
  top.layoutPositioning = 'ABSOLUTE';
  top.x = 0;
  top.y = 0;
  top.strokes = [paint('rgb(51, 51, 51)')];
  top.strokeBottomWeight = 1;
  top.strokeTopWeight = 0;
  top.strokeLeftWeight = 0;
  top.strokeRightWeight = 0;
  for (const action of evidence.ribbon.actions) {
    const button = icons.create(`Ribbon / ${action.name}`);
    button.name = action.name;
    ribbon.appendChild(button);
  }
  if (ribbon.children.length !== 8 ||
      ribbon.children.slice(1).some((node, index) => node.type !== 'INSTANCE' ||
        Math.abs(node.x - evidence.ribbon.actionX) > 0.5 ||
        Math.abs(node.y - (headerHeight + evidence.ribbon.actionTop +
          index * evidence.ribbon.actionStep)) > 0.5)) {
    throw new Error('Application Shell: Ribbon perdeu ações ou alinhamento observados.');
  }
  return ribbon;
}

function createLeftSidedock(evidence: ApplicationShellEvidence, sources: Sources,
  profileSource: ComponentNode, theme: UiKitThemeVariables): ComponentNode {
  const host = figma.createComponent();
  host.name = 'Obsidian / Side Panel / Left / Files + Vault Profile';
  host.description = 'Instância redimensionável do Side Panel canônico com Files e rodapé do vault.';
  host.layoutMode = 'VERTICAL';
  host.primaryAxisSizingMode = 'FIXED';
  host.counterAxisSizingMode = 'FIXED';
  host.itemSpacing = 0;
  host.resize(sources.sideModel.width,
    sources.sideModel.height + evidence.vaultProfile.height);
  host.minWidth = sources.sideModel.minExpandedWidth;
  host.fills = [paint(sources.sideModel.background)];
  host.strokes = [paint(evidence.borderColor)];
  edgeStroke(host, 'RIGHT');

  const panel = sources.sidePanel.createInstance();
  panel.name = 'Side Panel / Files';
  host.appendChild(panel);
  panel.layoutSizingHorizontal = 'FILL';
  panel.layoutGrow = 1;
  panel.setProperties({
    [swapProperty(sources.sidePanel, 'Hosted View')]: sources.filesView.id,
    [swapProperty(sources.sidePanel, 'Tab group')]: sources.filesTab.id,
  });
  const header = panel.findOne((node) => node.name === 'Tab header / 40 px');
  if (header?.type !== 'FRAME') throw new Error('Application Shell: header esquerdo ausente.');
  header.strokes = [boundUiKitPaint(theme, 'controlBorder')];
  header.strokeBottomWeight = 1;
  header.strokeTopWeight = 0;
  header.strokeLeftWeight = 0;
  header.strokeRightWeight = 0;
  if (hasExposableChildren(panel.findAll(() => true))) panel.isExposedInstance = true;

  const profile = profileSource.createInstance();
  profile.name = 'Vault Profile';
  host.appendChild(profile);
  profile.layoutSizingHorizontal = 'FILL';
  return host;
}

function createRightSidedock(evidence: ApplicationShellEvidence, sources: Sources): ComponentNode {
  const inactive = sources.workspaceTab.children.find((node): node is ComponentNode =>
    node.type === 'COMPONENT' && node.variantProperties?.Context === 'Sidedock' &&
    node.variantProperties?.State === 'Inactive');
  const inactiveIconProperty = Object.keys(sources.workspaceTab.componentPropertyDefinitions)
    .find((key) => key.startsWith('Icon / Inactive#') &&
      sources.workspaceTab.componentPropertyDefinitions[key]?.type === 'INSTANCE_SWAP');
  if (!inactive || !inactiveIconProperty) {
    throw new Error('Application Shell: Workspace Tab inativa ausente para o lado direito.');
  }
  const panel = figma.createComponent();
  panel.name = 'Obsidian / Side Panel / Right / Outline';
  panel.description = 'Host direito Dark observado: cinco tabs, Outline ativo nesta composição e View hospedada substituível.';
  panel.layoutMode = 'VERTICAL';
  panel.primaryAxisSizingMode = 'FIXED';
  panel.counterAxisSizingMode = 'FIXED';
  panel.itemSpacing = 0;
  panel.resize(evidence.rightSampleWidth, sources.sideModel.height);
  panel.fills = [paint(sources.sideModel.background)];
  panel.strokes = [];
  panel.clipsContent = true;
  const header = frame(panel, 'Right tab header', 'HORIZONTAL',
    evidence.rightSampleWidth, evidence.right.headerHeight);
  header.layoutSizingHorizontal = 'FILL';
  header.paddingLeft = evidence.right.tabLeft;
  // The Desktop crop places the collapse glyph about 8 px closer to the panel edge
  // than the first projection; keep the tab strip anchored at its observed left inset.
  header.paddingRight = 0;
  header.paddingTop = evidence.right.tabTop;
  header.strokes = [paint(evidence.borderColor)];
  header.strokeBottomWeight = 1;
  header.strokeTopWeight = 0;
  header.strokeLeftWeight = 0;
  header.strokeRightWeight = 0;
  const tabs = frame(header, 'Right WorkspaceTabs', 'HORIZONTAL',
    evidence.right.tabs.length * 28 + (evidence.right.tabs.length - 1) * evidence.right.tabGap,
    25);
  tabs.itemSpacing = evidence.right.tabGap;
  for (const tab of evidence.right.tabs) {
    let instance: InstanceNode;
    if (tab.name === 'Outline') {
      instance = sources.outlineTab.createInstance();
    } else {
      const icon = figma.createComponent();
      icon.name = `Obsidian / Workspace Tab Icon / ${tab.name} / Inactive`;
      icon.resize(16, 16);
      icon.fills = [];
      icon.strokes = [];
      icon.appendChild(sources.iconButtons.createGlyph(`Right tab / ${tab.name}`));
      instance = inactive.createInstance();
      instance.setProperties({ [inactiveIconProperty]: icon.id });
    }
    instance.name = `${tab.name} tab`;
    tabs.appendChild(instance);
  }
  const spacer = frame(header, 'Flexible right tab space', 'HORIZONTAL', 1, 1);
  spacer.layoutGrow = 1;
  spacer.minWidth = 1;
  const toggle = frame(header, 'Collapse right sidedock', 'HORIZONTAL',
    evidence.right.toggleWidth, evidence.right.toggleHeight);
  toggle.paddingTop = (evidence.right.toggleHeight - 16) / 2;
  toggle.paddingBottom = toggle.paddingTop;
  const toggleGlyph = sources.iconButtons.createGlyph('Sidedock / Collapse');
  toggleGlyph.name = 'Collapse right glyph';
  toggle.appendChild(toggleGlyph);
  toggleGlyph.rotation = 180;

  const outline = sources.outlineView.createInstance();
  outline.name = 'Hosted Outline View';
  panel.appendChild(outline);
  outline.layoutSizingHorizontal = 'FILL';
  outline.layoutGrow = 1;
  outline.minWidth = 1;
  const hostedProperty = panel.addComponentProperty('Hosted View', 'INSTANCE_SWAP',
    sources.outlineView.id);
  outline.componentPropertyReferences = { mainComponent: hostedProperty };
  if (tabs.children.length !== 5 ||
      Math.abs(tabs.width - 152) > 0.5 ||
      Math.abs(toggle.x + toggle.width - header.width) > 1 ||
      panel.componentPropertyDefinitions[hostedProperty]?.type !== 'INSTANCE_SWAP') {
    throw new Error('Application Shell: host direito não preservou tabs ou slot.');
  }
  return panel;
}

async function verifyShell(instance: InstanceNode, sources: Sources,
  contentSlot: ComponentNode, rightSlot: ComponentNode, statusSource: ComponentNode,
  profileSource: ComponentNode, leftSource: ComponentNode,
  evidence: ApplicationShellEvidence, stage: string): Promise<void> {
  const body = instance.findOne((node) => node.name === 'Workspace regions');
  const main = instance.findOne((node) => node.name === 'Main Workspace');
  const tabBar = instance.findOne((node) => node.name === 'Workspace Tabs');
  const tabsRow = instance.findOne((node) => node.name === 'Main tabs / two canonical instances');
  const bottomRule = instance.findOne((node) => node.name === 'Tab header bottom rule');
  const leftShoulder = instance.findOne((node) => node.name === 'Active tab left shoulder');
  const rightShoulder = instance.findOne((node) => node.name === 'Active tab right shoulder');
  const newTab = instance.findOne((node) => node.name === 'New tab');
  const newTabGlyph = instance.findOne((node) => node.name === 'New tab glyph');
  const left = instance.findOne((node) => node.name === 'Left Sidedock / Files');
  const leftPanel = instance.findOne((node) => node.name === 'Side Panel / Files');
  const profile = instance.findOne((node) => node.name === 'Vault Profile');
  const vaultSwitcher = profile?.type === 'INSTANCE'
    ? profile.findOne((node) => node.name === 'Vault switcher') : null;
  const vaultName = profile?.type === 'INSTANCE'
    ? profile.findOne((node) => node.name === 'Vault name') : null;
  const ribbon = instance.findOne((node) => node.name === 'Ribbon');
  const tab = instance.findOne((node) => node.name === 'Workspace Tab / plugin context');
  const inactiveTab = instance.findOne((node) => node.name === 'Workspace Tab / previous note');
  const header = instance.findOne((node) => node.name === 'View Header / chrome');
  const content = instance.findOne((node) => node.name === 'Main Content');
  const right = instance.findOne((node) => node.name === 'Right Sidedock');
  const status = instance.findOne((node) => node.name === 'Status Bar');
  const hostedFiles = leftPanel?.type === 'INSTANCE'
    ? leftPanel.findOne((node) => node.name === 'Hosted View') : null;
  const rightOutline = right?.type === 'INSTANCE'
    ? right.findOne((node) => node.name === 'Hosted Outline View') : null;
  const rightTabs = right?.type === 'INSTANCE'
    ? right.findOne((node) => node.name === 'Right WorkspaceTabs') : null;
  if (body?.type !== 'FRAME' || main?.type !== 'FRAME' || ribbon?.type !== 'INSTANCE' ||
      tabBar?.type !== 'FRAME' || tabsRow?.type !== 'FRAME' ||
      bottomRule?.type !== 'FRAME' ||
      leftShoulder?.type !== 'FRAME' || rightShoulder?.type !== 'FRAME' ||
      newTab?.type !== 'FRAME' || newTabGlyph?.type !== 'INSTANCE' ||
      left?.type !== 'INSTANCE' || leftPanel?.type !== 'INSTANCE' ||
      profile?.type !== 'INSTANCE' || vaultSwitcher?.type !== 'FRAME' ||
      vaultName?.type !== 'TEXT' || tab?.type !== 'INSTANCE' ||
      inactiveTab?.type !== 'INSTANCE' || status?.type !== 'INSTANCE' ||
      header?.type !== 'INSTANCE' || content?.type !== 'INSTANCE' ||
      right?.type !== 'INSTANCE' ||
      !leftPanel.isExposedInstance || !right.isExposedInstance ||
      (await left.getMainComponentAsync())?.id !== leftSource.id ||
      (await leftPanel.getMainComponentAsync())?.id !== sources.sidePanel.id ||
      hostedFiles?.type !== 'INSTANCE' ||
      (await hostedFiles.getMainComponentAsync())?.id !== sources.filesView.id ||
      (await tab.getMainComponentAsync())?.id !==
        sources.workspaceTab.children.find((node) => node.type === 'COMPONENT' &&
          node.variantProperties?.Context === 'Main' &&
          node.variantProperties?.State === 'Active')?.id ||
      (await inactiveTab.getMainComponentAsync())?.id !==
        sources.workspaceTab.children.find((node) => node.type === 'COMPONENT' &&
          node.variantProperties?.Context === 'Main' &&
          node.variantProperties?.State === 'Inactive')?.id ||
      (await header.getMainComponentAsync())?.id !== sources.viewHeader.id ||
      (await content.getMainComponentAsync())?.id !== contentSlot.id ||
      (await right.getMainComponentAsync())?.id !== rightSlot.id ||
      (await status.getMainComponentAsync())?.id !== statusSource.id ||
      (await profile.getMainComponentAsync())?.id !== profileSource.id ||
      rightOutline?.type !== 'INSTANCE' ||
      (await rightOutline.getMainComponentAsync())?.id !== sources.outlineView.id ||
      rightTabs?.type !== 'FRAME' || rightTabs.children.length !== 5 ||
      ribbon.children.length !== 8 ||
      Math.abs(newTab.width - evidence.mainTabs.newTab.width) > 1 ||
      Math.abs(newTab.x - (tabBar.paddingLeft + tabsRow.width +
        evidence.mainTabs.newTabGap)) > 1 ||
      Math.abs(newTabGlyph.x - evidence.mainTabs.newTab.iconX) > 1 ||
      Math.abs(newTabGlyph.y - evidence.mainTabs.newTab.iconY) > 1 ||
      bottomRule.layoutPositioning !== 'ABSOLUTE' ||
      Math.abs(bottomRule.width - tabBar.width) > 1 ||
      Math.abs(bottomRule.y - (tabBar.height - 1)) > 1 ||
      Math.abs(leftShoulder.x - (tabsRow.width / 2 -
        evidence.mainTabs.activeChrome.shoulderSize / 2)) > 1 ||
      Math.abs(rightShoulder.x - tabsRow.width) > 1 ||
      Math.abs(leftShoulder.y - (tabsRow.height -
        evidence.mainTabs.activeChrome.shoulderSize / 2)) > 1 ||
      tab.strokeBottomWeight !== 0 ||
      Math.abs(tab.width - Math.min(evidence.mainTabs.tabWidth,
        (main.width - tabBar.paddingLeft - evidence.mainTabs.newTabGap -
          evidence.mainTabs.newTab.width) / 2)) > 1 ||
      Math.abs(inactiveTab.width - tab.width) > 1 ||
      Math.abs(body.height - instance.height) > 1 ||
      Math.abs(left.height - body.height) > 1 ||
      Math.abs(leftPanel.height - (left.height - evidence.vaultProfile.height)) > 1 ||
      Math.abs(profile.width - left.width) > 1 ||
      Math.abs(profile.y - leftPanel.height) > 1 ||
      Math.abs(vaultSwitcher.width - (profile.width -
        evidence.vaultProfile.paddingLeft - evidence.vaultProfile.paddingRight -
        evidence.vaultProfile.itemGap - 2 * evidence.vaultProfile.actions[0]!.width)) > 1 ||
      Math.abs(vaultName.width - (vaultSwitcher.width - 40)) > 1 ||
      (vaultName.textAutoResize !== 'NONE' &&
        vaultName.textAutoResize !== 'TRUNCATE') ||
      vaultName.textTruncation !== 'ENDING' ||
      Math.abs(right.height - body.height) > 1 ||
      Math.abs(rightOutline.width - right.width) > 1 ||
      Math.abs(rightOutline.height - (right.height - evidence.right.headerHeight)) > 1 ||
      Math.abs(status.width - evidence.statusSampleWidth) > 1 ||
      Math.abs(status.x - (instance.width - evidence.statusSampleWidth)) > 1 ||
      Math.abs((status.absoluteBoundingBox?.y ?? 0) -
        (instance.absoluteBoundingBox?.y ?? 0) - (instance.height - status.height)) > 1 ||
      Math.abs(content.height - (body.height - tabBar.height - header.height)) > 1) {
    const diagnostics: Array<[string, boolean]> = [
      ['left instance', left?.type === 'INSTANCE'],
      ['left source', left?.type === 'INSTANCE' &&
        (await left.getMainComponentAsync())?.id === leftSource.id],
      ['nested Side Panel', leftPanel?.type === 'INSTANCE'],
      ['nested Side Panel exposure', leftPanel?.type === 'INSTANCE' &&
        leftPanel.isExposedInstance],
      ['Vault Profile', profile?.type === 'INSTANCE'],
      ['vault switcher', vaultSwitcher?.type === 'FRAME'],
      ['vault name', vaultName?.type === 'TEXT'],
      ['left height', left?.type === 'INSTANCE' &&
        Math.abs(left.height - (body?.height ?? NaN)) <= 1],
      ['left content height', left?.type === 'INSTANCE' &&
        leftPanel?.type === 'INSTANCE' &&
        Math.abs(leftPanel.height - (left.height - evidence.vaultProfile.height)) <= 1],
      ['profile width', profile?.type === 'INSTANCE' && left?.type === 'INSTANCE' &&
        Math.abs(profile.width - left.width) <= 1],
      ['profile position', profile?.type === 'INSTANCE' &&
        leftPanel?.type === 'INSTANCE' && Math.abs(profile.y - leftPanel.height) <= 1],
      ['switcher width', vaultSwitcher?.type === 'FRAME' &&
        profile?.type === 'INSTANCE' && Math.abs(vaultSwitcher.width -
          (profile.width - 76)) <= 1],
      ['name width', vaultName?.type === 'TEXT' && vaultSwitcher?.type === 'FRAME' &&
        Math.abs(vaultName.width - (vaultSwitcher.width - 40)) <= 1],
      ['name truncation', vaultName?.type === 'TEXT' &&
        (vaultName.textAutoResize === 'NONE' ||
          vaultName.textAutoResize === 'TRUNCATE') &&
        vaultName.textTruncation === 'ENDING'],
      ['left shoulder', leftShoulder?.type === 'FRAME' && tabsRow?.type === 'FRAME' &&
        Math.abs(leftShoulder.x - (tabsRow.width / 2 -
          evidence.mainTabs.activeChrome.shoulderSize / 2)) <= 1],
    ];
    const first = diagnostics.find(([, valid]) => !valid)?.[0] ?? 'another invariant';
    throw new Error(`Application Shell: ${first} divergiu (${stage}); ` +
      `left=${left?.width ?? 'missing'}, panel=${leftPanel?.width ?? 'missing'}, ` +
      `profile=${profile?.width ?? 'missing'}, switcher=${vaultSwitcher?.width ?? 'missing'}, ` +
      `name=${vaultName?.width ?? 'missing'}, ` +
      `autoResize=${vaultName?.type === 'TEXT' ? vaultName.textAutoResize : 'missing'}, ` +
      `truncation=${vaultName?.type === 'TEXT' ? vaultName.textTruncation : 'missing'}.`);
  }
  if (body.primaryAxisAlignItems !== 'MIN' || Math.abs(body.itemSpacing) > 0.5 ||
      main.layoutSizingHorizontal !== 'FILL') {
    throw new Error(`Application Shell: Auto Layout distribuiu espaço (${stage}): ` +
      `align=${body.primaryAxisAlignItems}, gap=${body.itemSpacing}, ` +
      `main=${main.layoutSizingHorizontal}.`);
  }
  assertShellAdjacency(body.width, [ribbon, left, main, right]);
  assertShellResize({ shell: instance.width, ribbon: ribbon.width, left: left.width,
    main: main.width, right: right.width, content: content.width, header: header.width },
  evidence);
}

function rightMinimumWidth(evidence: ApplicationShellEvidence): number {
  return evidence.right.tabLeft + evidence.right.tabs.length * 28 +
    (evidence.right.tabs.length - 1) * evidence.right.tabGap + 1 +
    evidence.right.toggleWidth + evidence.right.toggleRight;
}

/** The clipped 20 px pseudo-elements leave a 10 px visible lower corner. */
function createTabShoulder(row: FrameNode, evidence: ApplicationShellEvidence,
  side: 'LEFT' | 'RIGHT'): void {
  const size = evidence.mainTabs.activeChrome.shoulderSize / 2;
  const transform = side === 'RIGHT' ? ` transform="translate(${size} 0) scale(-1 1)"` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 ${size} ${size}"><g${transform}>` +
    `<path d="M10 0V10H0C5.523 10 10 5.523 10 0Z" fill="#1c1c1c"/>` +
    `<path d="M0 10C5.523 10 10 5.523 10 0" fill="none" ` +
    `stroke="#333333" stroke-width="1"/></g></svg>`;
  const shoulder = figma.createNodeFromSvg(svg);
  shoulder.name = `Active tab ${side.toLowerCase()} shoulder`;
  row.appendChild(shoulder);
  shoulder.layoutPositioning = 'ABSOLUTE';
  shoulder.constraints = { horizontal: side === 'LEFT' ? 'CENTER' : 'MAX',
    vertical: 'MAX' };
  shoulder.x = side === 'LEFT' ? row.width / 2 - size : row.width;
  shoulder.y = evidence.mainTabs.headerHeight - size;
}

function edgeStroke(node: ComponentNode | InstanceNode, edge: 'LEFT' | 'RIGHT'): void {
  node.strokeTopWeight = 0;
  node.strokeBottomWeight = 0;
  node.strokeLeftWeight = edge === 'LEFT' ? 1 : 0;
  node.strokeRightWeight = edge === 'RIGHT' ? 1 : 0;
}

function swapProperty(component: ComponentNode, name: string): string {
  const property = Object.keys(component.componentPropertyDefinitions).find((key) =>
    key.startsWith(`${name}#`) && component.componentPropertyDefinitions[key]?.type === 'INSTANCE_SWAP');
  if (!property) throw new Error(`Application Shell: slot ${name} ausente.`);
  return property;
}

function frame(parent: ComponentNode | FrameNode, name: string,
  layout: 'HORIZONTAL' | 'VERTICAL', width: number, height: number): FrameNode {
  const node = figma.createFrame();
  node.name = name;
  parent.appendChild(node);
  node.layoutMode = layout;
  node.primaryAxisSizingMode = 'FIXED';
  node.counterAxisSizingMode = 'FIXED';
  node.itemSpacing = 0;
  node.resize(width, height);
  node.fills = [];
  node.strokes = [];
  return node;
}

function paint(css: string): SolidPaint {
  const channels = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(css);
  if (!channels) throw new Error(`Application Shell: cor inválida ${css}.`);
  return { type: 'SOLID', color: { r: Number(channels[1]) / 255,
    g: Number(channels[2]) / 255, b: Number(channels[3]) / 255 } };
}
