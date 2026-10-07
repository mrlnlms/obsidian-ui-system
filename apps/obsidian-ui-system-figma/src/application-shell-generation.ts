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
  sources: Sources): Promise<{ component: ComponentNode; preview: FrameNode }> {
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
      sources.iconButtons, sources.headerModel.typography.fontFamily);
    const profileSource = await createVaultProfile(evidence.vaultProfile,
      sources.iconButtons, sources.sideModel.width,
      sources.headerModel.typography.fontFamily);

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
    const ribbon = ribbonSource.createInstance();
    ribbon.name = 'Ribbon';
    body.appendChild(ribbon);
    ribbon.layoutSizingVertical = 'FILL';

    const leftColumn = frame(body, 'Left Sidedock / Files', 'VERTICAL',
      sources.sideModel.width, shell.height);
    leftColumn.layoutSizingVertical = 'FILL';
    leftColumn.layoutSizingHorizontal = 'FIXED';
    leftColumn.minWidth = sources.sideModel.minExpandedWidth;
    leftColumn.strokes = [paint(evidence.borderColor)];
    leftColumn.strokeRightWeight = 1;
    leftColumn.strokeLeftWeight = 0;
    leftColumn.strokeTopWeight = 0;
    leftColumn.strokeBottomWeight = 0;
    const left = sources.sidePanel.createInstance();
    left.name = 'Side Panel / Files';
    leftColumn.appendChild(left);
    left.layoutSizingHorizontal = 'FILL';
    left.layoutGrow = 1;
    left.setProperties({
      [swapProperty(sources.sidePanel, 'Hosted View')]: sources.filesView.id,
      [swapProperty(sources.sidePanel, 'Tab group')]: sources.filesTab.id,
    });
    const leftHeader = left.findOne((node) => node.name === 'Tab header / 40 px');
    if (leftHeader?.type !== 'FRAME') throw new Error('Application Shell: header esquerdo ausente.');
    leftHeader.strokes = [paint(evidence.borderColor)];
    leftHeader.strokeBottomWeight = 1;
    leftHeader.strokeTopWeight = 0;
    leftHeader.strokeLeftWeight = 0;
    leftHeader.strokeRightWeight = 0;
    if (hasExposableChildren(left.findAll(() => true))) left.isExposedInstance = true;
    const profile = profileSource.createInstance();
    profile.name = 'Vault Profile';
    leftColumn.appendChild(profile);
    profile.layoutSizingHorizontal = 'FILL';

    const main = frame(body, 'Main Workspace', 'VERTICAL',
      sources.headerModel.sample.width, sources.sideModel.height);
    main.layoutGrow = 1;
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
    tab.strokes = [paint(evidence.borderColor)];
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
    right.strokes = [paint(evidence.borderColor)];
    edgeStroke(right, 'LEFT');
    if (hasExposableChildren(right.findAll(() => true))) right.isExposedInstance = true;
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
      profileSource, evidence);
    instance.resize(shell.width + 200, shell.height + 100);
    const adjustableLeft = instance.findOne((node) => node.name === 'Left Sidedock / Files');
    const adjustableRight = instance.findOne((node) => node.name === 'Right Sidedock');
    if (adjustableLeft?.type !== 'FRAME' || adjustableRight?.type !== 'INSTANCE') {
      throw new Error('Application Shell: painéis redimensionáveis ausentes.');
    }
    adjustableLeft.resize(sources.sideModel.minExpandedWidth, adjustableLeft.height);
    adjustableRight.resize(evidence.rightSampleWidth + 40, adjustableRight.height);
    await verifyShell(instance, sources, contentSlot, rightSlot, statusSource,
      profileSource, evidence);
    adjustableLeft.resize(sources.sideModel.width, adjustableLeft.height);
    adjustableRight.resize(evidence.rightSampleWidth, adjustableRight.height);
    instance.resize(shell.width - 300, shell.height);
    await verifyShell(instance, sources, contentSlot, rightSlot, statusSource,
      profileSource, evidence);
    instance.resize(shell.width, shell.height);
    const rightEdge = figma.currentPage.children.filter((node) =>
      node !== shell && node !== contentSlot && node !== rightSlot &&
      node !== ribbonSource && node !== statusSource && node !== profileSource &&
      node !== preview)
      .map((node) => node.absoluteBoundingBox).filter((box): box is Rect => box !== null)
      .reduce((edge, box) => Math.max(edge, box.x + box.width), 0);
    contentSlot.x = rightEdge + 64;
    ribbonSource.x = contentSlot.x + contentSlot.width + 64;
    rightSlot.x = ribbonSource.x + ribbonSource.width + 64;
    statusSource.x = rightSlot.x + rightSlot.width + 64;
    profileSource.x = statusSource.x + statusSource.width + 64;
    shell.x = profileSource.x + profileSource.width + 64;
    preview.x = shell.x + shell.width + 64;
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
  header.paddingRight = evidence.right.toggleRight;
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
  const toggleGlyph = sources.iconButtons.createGlyph('Sidedock / Collapse');
  toggleGlyph.name = 'Collapse right glyph';
  toggle.appendChild(toggleGlyph);
  toggleGlyph.x = 6;
  toggleGlyph.y = 4;
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
      panel.componentPropertyDefinitions[hostedProperty]?.type !== 'INSTANCE_SWAP') {
    throw new Error('Application Shell: host direito não preservou tabs ou slot.');
  }
  return panel;
}

async function verifyShell(instance: InstanceNode, sources: Sources,
  contentSlot: ComponentNode, rightSlot: ComponentNode, statusSource: ComponentNode,
  profileSource: ComponentNode,
  evidence: ApplicationShellEvidence): Promise<void> {
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
      left?.type !== 'FRAME' || leftPanel?.type !== 'INSTANCE' ||
      profile?.type !== 'INSTANCE' || tab?.type !== 'INSTANCE' ||
      inactiveTab?.type !== 'INSTANCE' || status?.type !== 'INSTANCE' ||
      header?.type !== 'INSTANCE' || content?.type !== 'INSTANCE' ||
      right?.type !== 'INSTANCE' ||
      !leftPanel.isExposedInstance || !right.isExposedInstance ||
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
        evidence.mainTabs.activeChrome.shoulderSize)) > 1 ||
      Math.abs(rightShoulder.x - tabsRow.width) > 1 ||
      Math.abs(leftShoulder.y - (tabsRow.height -
        evidence.mainTabs.activeChrome.shoulderSize)) > 1 ||
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
      Math.abs(right.height - body.height) > 1 ||
      Math.abs(rightOutline.width - right.width) > 1 ||
      Math.abs(rightOutline.height - (right.height - evidence.right.headerHeight)) > 1 ||
      Math.abs(status.width - evidence.statusSampleWidth) > 1 ||
      Math.abs(status.x - (instance.width - evidence.statusSampleWidth)) > 1 ||
      Math.abs((status.absoluteBoundingBox?.y ?? 0) -
        (instance.absoluteBoundingBox?.y ?? 0) - (instance.height - status.height)) > 1 ||
      Math.abs(content.height - (body.height - tabBar.height - header.height)) > 1) {
    throw new Error('Application Shell: fontes, slots ou resize divergiram.');
  }
  assertShellResize({ shell: instance.width, ribbon: ribbon.width, left: left.width,
    main: main.width, right: right.width, content: content.width, header: header.width },
  evidence);
}

function rightMinimumWidth(evidence: ApplicationShellEvidence): number {
  return evidence.right.tabLeft + evidence.right.tabs.length * 28 +
    (evidence.right.tabs.length - 1) * evidence.right.tabGap + 1 +
    evidence.right.toggleWidth + evidence.right.toggleRight;
}

/** The active tab's observed 20 px pseudo-elements join its sides to the header rule. */
function createTabShoulder(row: FrameNode, evidence: ApplicationShellEvidence,
  side: 'LEFT' | 'RIGHT'): void {
  const size = evidence.mainTabs.activeChrome.shoulderSize;
  const transform = side === 'RIGHT' ? ` transform="translate(${size} 0) scale(-1 1)"` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 ${size} ${size}"><g${transform}>` +
    `<path d="M20 0V20H0C11.046 20 20 11.046 20 0Z" fill="#1c1c1c"/>` +
    `<path d="M0 20C11.046 20 20 11.046 20 0" fill="none" ` +
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
