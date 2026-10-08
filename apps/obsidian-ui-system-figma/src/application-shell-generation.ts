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
  searchView: ComponentNode;
  searchTab: ComponentNode;
  bookmarksView: ComponentNode;
  bookmarksTab: ComponentNode;
  workspaceTab: ComponentSetNode;
  viewHeader: ComponentNode;
  viewHeaderTrail: ComponentNode;
  outlineView: ComponentNode;
  outlineTab: ComponentNode;
  iconButtons: IconButtonLibrary;
  sideModel: SidePanelModel;
  headerModel: ViewHeaderModel;
  workspaceModel: WorkspaceTabModel;
}

export const RIGHT_SIDEDOCK_VIEWS = [
  'Backlinks', 'Outgoing links', 'Tags', 'All properties', 'Outline', 'Plugin',
] as const;
type RightSidedockView = typeof RIGHT_SIDEDOCK_VIEWS[number];

export const MAIN_WORKSPACE_TAB_COUNTS = ['1', '2', '3', '4'] as const;
export const MAIN_WORKSPACE_ACTIVE_SIDES = ['Left', 'Right'] as const;
export const MAIN_TAB_LIST_RIGHT_INSET = 32;

export function assertMainWorkspaceTabsLayout(layout: { count: number;
  active: 'Left' | 'Right'; rowWidth: number; tabs: ReadonlyArray<{
    x: number; width: number; active: boolean }>;
  dividers: ReadonlyArray<{ x: number; tabIndex: number }>;
  shoulders: { left: number; right: number; size: number };
  newTabX: number; barWidth: number; paddingLeft: number; gap: number;
  newTabWidth: number; maxTabWidth: number;
  menu: { x: number; width: number; rightInset: number } }): void {
  const { count, active, rowWidth, tabs, shoulders, dividers } = layout;
  const activeIndex = active === 'Left' ? 0 : count - 1;
  if (count < 1 || count > 4 || tabs.length !== count || rowWidth < 1 ||
      tabs.filter((tab) => tab.active).length !== 1 ||
      !tabs[activeIndex]?.active ||
      Math.abs(tabs[0]!.x) > 1 ||
      tabs.some((tab, index) => tab.width < 1 ||
        Math.abs(tab.width - rowWidth / count) > 1 ||
        (index > 0 && Math.abs(tab.x - (tabs[index - 1]!.x +
          tabs[index - 1]!.width)) > 1)) ||
      dividers.length !== count - 1 ||
      dividers.some((divider) => divider.tabIndex === activeIndex ||
        Math.abs(divider.x - (tabs[divider.tabIndex]!.x +
          tabs[divider.tabIndex]!.width - 1)) > 1) ||
      Math.abs(tabs[count - 1]!.x + tabs[count - 1]!.width - rowWidth) > 1 ||
      Math.abs(shoulders.left - (tabs[activeIndex]!.x - shoulders.size)) > 1 ||
      Math.abs(shoulders.right - (tabs[activeIndex]!.x +
        tabs[activeIndex]!.width)) > 1 ||
      Math.abs(rowWidth - Math.min(count * layout.maxTabWidth,
        layout.menu.x - 2 * layout.gap - layout.newTabWidth -
        layout.paddingLeft)) > 1 ||
      Math.abs(layout.newTabX - (layout.paddingLeft + rowWidth + layout.gap)) > 1 ||
      layout.newTabX + layout.newTabWidth + layout.gap > layout.menu.x + 1 ||
      Math.abs(layout.menu.x + layout.menu.width + layout.menu.rightInset -
        layout.barWidth) > 1) {
    throw new Error('Application Shell Slot probe: composição das abas principais divergente.');
  }
}

export function rightSidedockProbeMinimumWidth(right: ApplicationShellEvidence['right']): number {
  return right.tabLeft + RIGHT_SIDEDOCK_VIEWS.length * 28 +
    (RIGHT_SIDEDOCK_VIEWS.length - 1) * right.tabGap + right.toggleWidth + 1;
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
      sources.searchView.name !== 'Obsidian / Search View / Dark' ||
      sources.bookmarksView.name !== 'Obsidian / Bookmarks View / Dark' ||
      sources.viewHeader.name !== 'Obsidian / View Header / Markdown' ||
      sources.filesTab.variantProperties?.Active !== 'Files' ||
      sources.searchTab.variantProperties?.Active !== 'Search' ||
      sources.bookmarksTab.variantProperties?.Active !== 'Bookmarks' ||
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
    const leftViews = createLeftSidedockViews(leftSource, sources);
    const rightViews = createRightSidedockViews(rightSlot, evidence, sources);
    const mainTabs = createMainWorkspaceTabVariants(shell, sources, evidence, theme);
    const mainHeader = createMainViewHeaderVariants(sources);
    const slotProbe = createSidedockSlotProbe(shell, leftViews.files, rightViews.outline,
      mainTabs.defaultVariant, mainHeader.markdown, sources, evidence);
    const probeLeft = slotProbe.findOne((node) => node.name === 'Left Sidedock / Files');
    const probeRight = slotProbe.findOne((node) => node.name === 'Right Sidedock');
    const probeMain = slotProbe.findOne((node) => node.name === 'Main Workspace');
    const probeSlots = Object.values(slotProbe.componentPropertyDefinitions)
      .filter((property) => property.type === 'SLOT');
    if (probeLeft?.type !== 'INSTANCE' || probeRight?.type !== 'INSTANCE' ||
        probeMain?.type !== 'SLOT' ||
        (await probeLeft.getMainComponentAsync())?.id !== leftViews.files.id ||
        (await probeRight.getMainComponentAsync())?.id !== rightViews.outline.id ||
        probeSlots.length !== 3) {
      throw new Error('Application Shell Slot probe: fontes canônicas ou Slots divergiram.');
    }
    const slotPreview = await createSidedockSlotPreview(slotProbe, evidence, sources,
      leftViews.pluginTabs, leftViews.panels, rightViews, mainTabs.set, mainHeader);
    const rightEdge = figma.currentPage.children.filter((node) =>
      node !== shell && node !== contentSlot && node !== rightSlot &&
      node !== ribbonSource && node !== statusSource && node !== profileSource &&
      node !== leftSource && node !== leftViews.set &&
      !Object.values(leftViews.panels).includes(node as ComponentNode) &&
      node !== leftViews.pluginTabs &&
      !leftViews.pluginIcons.includes(node as ComponentNode) &&
      node !== rightViews.set &&
      node !== mainTabs.set &&
      node !== mainHeader.set && node !== mainHeader.trails &&
      node !== mainHeader.pluginTitle &&
      !Object.values(rightViews.panels).includes(node as ComponentNode) &&
      !rightViews.placeholders.includes(node as ComponentNode) &&
      !rightViews.icons.includes(node as ComponentNode) &&
      node !== slotProbe && node !== slotPreview &&
      node !== preview)
      .map((node) => node.absoluteBoundingBox).filter((box): box is Rect => box !== null)
      .reduce((edge, box) => Math.max(edge, box.x + box.width), 0);
    contentSlot.x = rightEdge + 64;
    ribbonSource.x = contentSlot.x + contentSlot.width + 64;
    rightSlot.x = ribbonSource.x + ribbonSource.width + 64;
    statusSource.x = rightSlot.x + rightSlot.width + 64;
    profileSource.x = statusSource.x + statusSource.width + 64;
    leftSource.x = profileSource.x + profileSource.width + 64;
    leftViews.set.x = leftSource.x;
    leftViews.set.y = leftSource.y + leftSource.height + 64;
    Object.values(leftViews.panels).forEach((panel, index) => {
      panel.x = leftViews.set.x + index * (panel.width + 32);
      panel.y = leftViews.set.y + leftViews.set.height + 64;
    });
    leftViews.pluginTabs.x = leftViews.panels.Plugin.x + leftViews.panels.Plugin.width + 64;
    leftViews.pluginTabs.y = leftViews.panels.Plugin.y;
    leftViews.pluginIcons.forEach((icon, index) => {
      icon.x = leftViews.pluginTabs.x + leftViews.pluginTabs.width + 64 + index * 32;
      icon.y = leftViews.pluginTabs.y;
    });
    rightViews.set.x = rightSlot.x;
    rightViews.set.y = rightSlot.y + rightSlot.height + 64;
    Object.values(rightViews.panels).forEach((panel, index) => {
      panel.x = rightViews.set.x + rightViews.set.width + 64 + index * (panel.width + 32);
      panel.y = rightViews.set.y;
    });
    const placeholderStart = rightViews.panels.Plugin.x + rightViews.panels.Plugin.width + 64;
    rightViews.placeholders.forEach((placeholder, index) => {
      placeholder.x = placeholderStart + index * (placeholder.width + 32);
      placeholder.y = rightViews.set.y;
    });
    const iconStart = placeholderStart + rightViews.placeholders.length *
      (rightSlot.width + 32) + 32;
    rightViews.icons.forEach((icon, index) => {
      icon.x = iconStart + index * 24;
      icon.y = rightViews.set.y;
    });
    mainTabs.set.x = rightViews.set.x;
    mainTabs.set.y = rightViews.set.y + rightViews.set.height + 64;
    mainHeader.trails.x = mainTabs.set.x;
    mainHeader.trails.y = mainTabs.set.y + mainTabs.set.height + 64;
    mainHeader.set.x = mainHeader.trails.x + mainHeader.trails.width + 64;
    mainHeader.set.y = mainHeader.trails.y;
    mainHeader.pluginTitle.x = mainHeader.set.x + mainHeader.set.width + 64;
    mainHeader.pluginTitle.y = mainHeader.set.y;
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

/** One View choice on the Left Sidedock keeps its hosted content and active tab paired. */
export function leftSidedockViewChoices<T>(sources: {
  filesView: T; filesTab: T; searchView: T; searchTab: T;
  bookmarksView: T; bookmarksTab: T;
}): ReadonlyArray<{ name: 'Files' | 'Search' | 'Bookmarks'; view: T; tab: T }> {
  return [
    { name: 'Files', view: sources.filesView, tab: sources.filesTab },
    { name: 'Search', view: sources.searchView, tab: sources.searchTab },
    { name: 'Bookmarks', view: sources.bookmarksView, tab: sources.bookmarksTab },
  ];
}

export function assertLeftSidedockSelection(expected: { name: string; viewId: string;
  tabId: string }, actual: { selection: string | boolean | null;
  view: string | boolean | null; tab: string | boolean | null;
  hostedType: string | null; tabsType: string | null;
  linkedView: string | null; linkedTab: string | null;
  activeTab: string | boolean | null }): void {
  // Figma may return null for a nested tab's main component; the panel swap remains readable.
  if (actual.selection !== expected.name || actual.view !== expected.viewId ||
      actual.tab !== expected.tabId || actual.hostedType !== 'INSTANCE' ||
      actual.tabsType !== 'INSTANCE' ||
      (actual.linkedView && actual.linkedView !== expected.viewId) ||
      (actual.linkedTab && actual.linkedTab !== expected.tabId) ||
      (actual.activeTab && actual.activeTab !== expected.name)) {
    throw new Error(`Application Shell Slot probe: View ${expected.name} não atualizou conteúdo e tab ` +
      JSON.stringify({ expected, actual }));
  }
}

export function assertPluginHostedSlotLayout(layout: { panel: { width: number; height: number };
  header: { height: number }; slot: { width: number; height: number; y: number };
  profile: { y: number; height: number }; sidedock: { height: number } }): void {
  if (Math.abs(layout.slot.width - layout.panel.width) > 1 ||
      Math.abs(layout.slot.height - (layout.panel.height - layout.header.height)) > 1 ||
      Math.abs(layout.slot.y - layout.header.height) > 1 ||
      Math.abs(layout.profile.y - layout.panel.height) > 1 ||
      Math.abs(layout.profile.y + layout.profile.height - layout.sidedock.height) > 1) {
    throw new Error('Application Shell Slot probe: Plugin Slot não acompanha o Sidedock.');
  }
}

function createLeftSidedockViews(filesSource: ComponentNode,
  sources: Sources): { set: ComponentSetNode; files: ComponentNode;
    panels: Record<'Files' | 'Search' | 'Bookmarks' | 'Plugin', ComponentNode>;
    pluginTabs: ComponentSetNode;
    pluginIcons: ComponentNode[] } {
  const choices = leftSidedockViewChoices(sources);
  const { set: pluginTabs, groups, icons: pluginIcons } = createPluginTabGroups(sources);
  const panels = {} as Record<'Files' | 'Search' | 'Bookmarks' | 'Plugin', ComponentNode>;
  const variants: ComponentNode[] = [];
  for (const choice of choices) {
    const sourcePanel = createProbeSidePanel(sources.sidePanel,
      groups[choice.name], choice.name, choice.view);
    panels[choice.name] = sourcePanel;
    const variant = filesSource.clone();
    variant.name = `View=${choice.name}`;
    const panel = variant.findOne((node) => node.name === 'Side Panel / Files');
    if (panel?.type !== 'INSTANCE') {
      throw new Error(`Application Shell Slot probe: host ${choice.name} ausente.`);
    }
    panel.swapComponent(sourcePanel);
    const viewProperty = swapProperty(sourcePanel, 'Hosted View');
    const tabProperty = swapProperty(sourcePanel, 'Tab group');
    panel.setProperties({ [viewProperty]: choice.view.id,
      [tabProperty]: groups[choice.name].id });
    const tabArea = panel.findOne((node) => node.name === 'Tab group area');
    const tabGroup = tabArea?.type === 'FRAME' ? tabArea.children[0] : null;
    if (tabArea?.type !== 'FRAME' || tabGroup?.type !== 'INSTANCE') {
      throw new Error(`Application Shell Slot probe: grupo ${choice.name} ausente na variante.`);
    }
    tabArea.resize(groups[choice.name].width, tabArea.height);
    tabGroup.swapComponent(groups[choice.name]);
    tabGroup.resize(groups[choice.name].width, groups[choice.name].height);
    panel.isExposedInstance = false;
    const actualView = panel.componentProperties[viewProperty]?.value;
    const actualTab = panel.componentProperties[tabProperty]?.value;
    if (actualView !== choice.view.id || actualTab !== groups[choice.name].id) {
      throw new Error(`Application Shell Slot probe: propriedades ${choice.name} divergiram ` +
        JSON.stringify({ expectedView: choice.view.id, actualView,
          expectedTab: groups[choice.name].id, actualTab }));
    }
    variants.push(variant);
  }
  const pluginPanel = createPluginSidePanel(sources, groups.Plugin);
  panels.Plugin = pluginPanel;
  const plugin = filesSource.clone();
  plugin.name = 'View=Plugin';
  const panel = plugin.findOne((node) => node.name === 'Side Panel / Files');
  if (panel?.type !== 'INSTANCE') {
    throw new Error('Application Shell Slot probe: host Plugin ausente.');
  }
  panel.swapComponent(pluginPanel);
  panel.isExposedInstance = true;
  variants.push(plugin);
  const set = figma.combineAsVariants(variants, figma.currentPage);
  set.name = 'Obsidian / Left Sidedock / View (probe)';
  set.description = 'View seleciona Files, Search, Bookmarks ou uma área Plugin vazia. O Vault Profile permanece no Sidedock.';
  if (set.children.length !== 4 || set.componentPropertyDefinitions.View?.type !== 'VARIANT') {
    throw new Error('Application Shell Slot probe: propriedade View do Left Sidedock ausente.');
  }
  variants.forEach((variant, index) => {
    variant.x = 20;
    variant.y = 20 + index * (filesSource.height + 20);
  });
  set.resizeWithoutConstraints(filesSource.width + 40,
    variants.length * (filesSource.height + 20) + 20);
  return { set, files: variants[0]!, panels, pluginTabs, pluginIcons };
}

function createPluginTabGroups(sources: Sources): { set: ComponentSetNode;
  groups: Record<'Files' | 'Search' | 'Bookmarks' | 'Plugin', ComponentNode>;
  icons: ComponentNode[] } {
  const active = sources.workspaceTab.children.find((node): node is ComponentNode =>
    node.type === 'COMPONENT' && node.variantProperties?.Context === 'Sidedock' &&
    node.variantProperties?.State === 'Active');
  const inactive = sources.workspaceTab.children.find((node): node is ComponentNode =>
    node.type === 'COMPONENT' && node.variantProperties?.Context === 'Sidedock' &&
    node.variantProperties?.State === 'Inactive');
  const filesInactive = sources.searchTab.children[0];
  const searchInactive = sources.filesTab.children[1];
  const bookmarksInactive = sources.filesTab.children[2];
  if (!active || !inactive || filesInactive?.type !== 'INSTANCE' ||
      searchInactive?.type !== 'INSTANCE' || bookmarksInactive?.type !== 'INSTANCE') {
    throw new Error('Application Shell Slot probe: tabs inativas do Plugin ausentes.');
  }
  const icons = (['Active', 'Inactive'] as const).map((state) => {
    const icon = figma.createComponent();
    icon.name = `Obsidian / Workspace Tab Icon / Plugin / ${state} (probe)`;
    icon.resize(16, 16);
    icon.fills = [];
    icon.strokes = [];
    const glyph = sources.iconButtons.createGlyph('Ribbon / Create new canvas',
      state === 'Active' ? 'Selected' : 'Muted');
    glyph.name = 'Glyph / layout-dashboard';
    glyph.opacity = state === 'Active' ? 1 : 0.85;
    icon.appendChild(glyph);
    return icon;
  });
  const groups = {} as Record<'Files' | 'Search' | 'Bookmarks' | 'Plugin', ComponentNode>;
  for (const name of ['Files', 'Search', 'Bookmarks', 'Plugin'] as const) {
    const group = figma.createComponent();
    group.name = `Active=${name}`;
    group.layoutMode = 'HORIZONTAL';
    group.primaryAxisSizingMode = 'AUTO';
    group.counterAxisSizingMode = 'FIXED';
    group.itemSpacing = sources.sideModel.tabGap;
    group.fills = [];
    group.strokes = [];
    group.resize(4 * 28 + 3 * sources.sideModel.tabGap, 25);
    const source = name === 'Files' ? sources.filesTab :
      name === 'Search' ? sources.searchTab :
      name === 'Bookmarks' ? sources.bookmarksTab : null;
    for (const tab of source?.children ??
      [filesInactive, searchInactive, bookmarksInactive]) {
      if (tab.type !== 'INSTANCE') throw new Error(`Application Shell Slot probe: tab ${name} inválida.`);
      group.appendChild(tab.clone());
    }
    const state = name === 'Plugin' ? 'Active' : 'Inactive';
    const pluginTab = (state === 'Active' ? active : inactive).createInstance();
    pluginTab.name = 'Plugin tab';
    pluginTab.setProperties({ [swapProperty(sources.workspaceTab, `Icon / ${state}`)]:
      icons[state === 'Active' ? 0 : 1]!.id });
    group.appendChild(pluginTab);
    if (group.children.length !== 4 || Math.abs(group.width - (4 * 28 +
        3 * sources.sideModel.tabGap)) > 1) {
      throw new Error(`Application Shell Slot probe: tab Plugin no estado ${name} divergiu.`);
    }
    groups[name] = group;
  }
  const set = figma.combineAsVariants(Object.values(groups), figma.currentPage);
  set.name = 'Obsidian / WorkspaceTabs / Left with Plugin (probe)';
  if (set.componentPropertyDefinitions.Active?.type !== 'VARIANT') {
    throw new Error('Application Shell Slot probe: estados de tabs do Plugin ausentes.');
  }
  Object.values(groups).forEach((group, index) => {
    group.x = 20;
    group.y = 20 + index * 45;
  });
  set.resizeWithoutConstraints(4 * 28 + 3 * sources.sideModel.tabGap + 40, 200);
  return { set, groups, icons };
}

function createProbeSidePanel(source: ComponentNode, tabs: ComponentNode,
  name: 'Files' | 'Search' | 'Bookmarks' | 'Plugin',
  view?: ComponentNode): ComponentNode {
  const panel = source.clone();
  panel.name = `Obsidian / Side Panel / Left / ${name} (probe)`;
  const oldToggle = panel.findOne((node) => node.name === 'Collapse sidedock');
  if (oldToggle?.type !== 'FRAME') {
    throw new Error(`Application Shell Slot probe: controle esquerdo ${name} ausente.`);
  }
  oldToggle.remove();
  const tabArea = panel.findOne((node) => node.name === 'Tab group area');
  const tabGroup = tabArea?.type === 'FRAME' ? tabArea.children[0] : null;
  if (tabArea?.type !== 'FRAME' || tabGroup?.type !== 'INSTANCE') {
    throw new Error(`Application Shell Slot probe: Tab group de ${name} ausente.`);
  }
  tabArea.resize(tabs.width, tabArea.height);
  tabGroup.swapComponent(tabs);
  tabGroup.resize(tabs.width, tabs.height);
  if (tabGroup.children.length !== 4) {
    throw new Error(`Application Shell Slot probe: fonte ${name} sem quatro tabs.`);
  }
  panel.editComponentProperty(swapProperty(panel, 'Tab group'),
    { defaultValue: tabs.id });
  if (view) {
    const hosted = panel.findOne((node) => node.name === 'Hosted View');
    if (hosted?.type !== 'INSTANCE') {
      throw new Error(`Application Shell Slot probe: Hosted View de ${name} ausente.`);
    }
    hosted.swapComponent(view);
    hosted.name = 'Hosted View';
    panel.editComponentProperty(swapProperty(panel, 'Hosted View'),
      { defaultValue: view.id });
  }
  return panel;
}

function createPluginSidePanel(sources: Sources, pluginTabs: ComponentNode): ComponentNode {
  const panel = createProbeSidePanel(sources.sidePanel, pluginTabs, 'Plugin');
  panel.name = 'Obsidian / Side Panel / Left / Plugin Slot (probe)';
  panel.description = 'Estrutura do Side Panel esquerdo com área hospedada composicional vazia.';
  const hosted = panel.findOne((node) => node.name === 'Hosted View');
  if (hosted?.type !== 'INSTANCE') {
    throw new Error('Application Shell Slot probe: Hosted View do Plugin ausente.');
  }
  const index = panel.children.indexOf(hosted);
  const known = new Set(Object.keys(panel.componentPropertyDefinitions));
  const slot = panel.createSlot();
  const property = Object.keys(panel.componentPropertyDefinitions).find((key) =>
    !known.has(key) && panel.componentPropertyDefinitions[key]?.type === 'SLOT');
  if (!property) throw new Error('Application Shell Slot probe: Slot Plugin ausente.');
  panel.editComponentProperty(property, { name: 'Plugin View content',
    description: 'Insira Components nesta área da View do plugin.' });
  slot.name = 'Hosted View / Plugin Slot';
  panel.insertChild(index, slot);
  slot.resize(hosted.width, hosted.height);
  slot.layoutMode = 'VERTICAL';
  slot.itemSpacing = 0;
  slot.paddingLeft = 0;
  slot.paddingRight = 0;
  slot.paddingTop = 0;
  slot.paddingBottom = 0;
  slot.fills = panel.fills;
  slot.strokes = [];
  slot.layoutSizingHorizontal = 'FILL';
  slot.layoutGrow = 1;
  slot.minWidth = 1;
  hosted.remove();
  const oldProperty = swapProperty(panel, 'Hosted View');
  panel.deleteComponentProperty(oldProperty);
  return panel;
}

function createRightSidedockViews(source: ComponentNode,
  evidence: ApplicationShellEvidence, sources: Sources): {
    set: ComponentSetNode; outline: ComponentNode;
    panels: Record<RightSidedockView, ComponentNode>;
    placeholders: ComponentNode[]; icons: ComponentNode[] } {
  const tabVariants = Object.fromEntries((['Active', 'Inactive'] as const).map((state) => [
    state, sources.workspaceTab.children.find((node): node is ComponentNode =>
      node.type === 'COMPONENT' && node.variantProperties?.Context === 'Sidedock' &&
      node.variantProperties?.State === state),
  ])) as Record<'Active' | 'Inactive', ComponentNode | undefined>;
  if (!tabVariants.Active || !tabVariants.Inactive) {
    throw new Error('Application Shell Slot probe: Workspace Tabs direitos ausentes.');
  }
  const icons: ComponentNode[] = [];
  const iconFor = (name: RightSidedockView, state: 'Active' | 'Inactive'): ComponentNode => {
    const icon = figma.createComponent();
    icon.name = `Obsidian / Workspace Tab Icon / Right / ${name} / ${state} (probe)`;
    icon.resize(16, 16);
    icon.fills = [];
    icon.strokes = [];
    const use = name === 'Plugin' ? 'Ribbon / Create new canvas' :
      name === 'Outline' ? 'Outline / Tab' : `Right tab / ${name}`;
    const glyph = sources.iconButtons.createGlyph(use,
      state === 'Active' ? 'Selected' : 'Muted');
    glyph.name = 'Glyph';
    icon.appendChild(glyph);
    icons.push(icon);
    return icon;
  };
  const selectedIcons = new Map(RIGHT_SIDEDOCK_VIEWS.slice(0, 4).map((name) =>
    [name, iconFor(name, 'Active')] as const));
  const outlineInactive = iconFor('Outline', 'Inactive');
  const pluginActive = iconFor('Plugin', 'Active');
  const pluginInactive = iconFor('Plugin', 'Inactive');
  const placeholders: ComponentNode[] = [];
  const panels = {} as Record<RightSidedockView, ComponentNode>;
  const variants: ComponentNode[] = [];
  const rightMinWidth = rightSidedockProbeMinimumWidth(evidence.right);
  for (const name of RIGHT_SIDEDOCK_VIEWS) {
    const panel = source.clone();
    panel.name = `Obsidian / Side Panel / Right / ${name} (probe)`;
    panel.minWidth = rightMinWidth;
    const oldToggle = panel.findOne((node) => node.name === 'Collapse right sidedock');
    if (oldToggle?.type !== 'FRAME') {
      throw new Error(`Application Shell Slot probe: controle direito ${name} ausente.`);
    }
    oldToggle.remove();
    const tabs = panel.findOne((node) => node.name === 'Right WorkspaceTabs');
    const hosted = panel.findOne((node) => node.name === 'Hosted Outline View');
    if (tabs?.type !== 'FRAME' || hosted?.type !== 'INSTANCE' || tabs.children.length !== 5) {
      throw new Error(`Application Shell Slot probe: estrutura direita ${name} ausente.`);
    }
    tabs.resize(6 * 28 + 5 * evidence.right.tabGap, tabs.height);
    evidence.right.tabs.forEach((tab, index) => {
      const existing = tabs.children[index];
      if (existing?.type !== 'INSTANCE') {
        throw new Error(`Application Shell Slot probe: tab ${tab.name} ausente.`);
      }
      if (tab.name === name && name !== 'Outline') {
        existing.swapComponent(tabVariants.Active!);
        const icon = selectedIcons.get(name as Exclude<RightSidedockView, 'Outline' | 'Plugin'>)!;
        const iconProperty = swapProperty(sources.workspaceTab, 'Icon / Active');
        existing.setProperties({ [iconProperty]: icon.id });
        if (existing.componentProperties[iconProperty]?.value !== icon.id) {
          throw new Error(`Application Shell Slot probe: ícone ativo ${name} divergente.`);
        }
      } else if (tab.name === 'Outline' && name !== 'Outline') {
        existing.swapComponent(tabVariants.Inactive!);
        const iconProperty = swapProperty(sources.workspaceTab, 'Icon / Inactive');
        existing.setProperties({ [iconProperty]: outlineInactive.id });
        if (existing.componentProperties[iconProperty]?.value !== outlineInactive.id) {
          throw new Error('Application Shell Slot probe: ícone Outline inativo divergente.');
        }
      }
    });
    const pluginState = name === 'Plugin' ? 'Active' : 'Inactive';
    const pluginTab = tabVariants[pluginState]!.createInstance();
    pluginTab.name = 'Plugin tab';
    const pluginIconProperty = swapProperty(sources.workspaceTab, `Icon / ${pluginState}`);
    const pluginIcon = pluginState === 'Active' ? pluginActive : pluginInactive;
    pluginTab.setProperties({ [pluginIconProperty]: pluginIcon.id });
    if (pluginTab.componentProperties[pluginIconProperty]?.value !== pluginIcon.id) {
      throw new Error(`Application Shell Slot probe: ícone Plugin ${pluginState} divergente.`);
    }
    tabs.appendChild(pluginTab);
    if (tabs.children[5] !== pluginTab ||
        Math.abs(tabs.width - (6 * 28 + 5 * evidence.right.tabGap)) > 1) {
      throw new Error(`Application Shell Slot probe: seis tabs direitas em ${name} divergiram.`);
    }
    if (name === 'Plugin') {
      const index = panel.children.indexOf(hosted);
      const known = new Set(Object.keys(panel.componentPropertyDefinitions));
      const slot = panel.createSlot();
      const property = Object.keys(panel.componentPropertyDefinitions).find((key) =>
        !known.has(key) && panel.componentPropertyDefinitions[key]?.type === 'SLOT');
      if (!property) throw new Error('Application Shell Slot probe: Slot direito Plugin ausente.');
      panel.editComponentProperty(property, { name: 'Plugin View content',
        description: 'Insira Components nesta área da View do plugin.' });
      slot.name = 'Hosted View / Plugin Slot';
      panel.insertChild(index, slot);
      slot.resize(hosted.width, hosted.height);
      slot.layoutMode = 'VERTICAL';
      slot.itemSpacing = 0;
      slot.paddingLeft = 0;
      slot.paddingRight = 0;
      slot.paddingTop = 0;
      slot.paddingBottom = 0;
      slot.fills = panel.fills;
      slot.strokes = [];
      slot.layoutSizingHorizontal = 'FILL';
      slot.layoutGrow = 1;
      slot.minWidth = 1;
      hosted.remove();
      panel.deleteComponentProperty(swapProperty(panel, 'Hosted View'));
    } else if (name !== 'Outline') {
      const placeholder = figma.createComponent();
      placeholder.name = `Obsidian / Side Panel / Right / ${name} placeholder (probe)`;
      placeholder.description = 'Área hospedada vazia; esta View ainda não foi reconstruída.';
      placeholder.resize(source.width, source.height - evidence.right.headerHeight);
      placeholder.fills = panel.fills;
      placeholder.strokes = [];
      placeholders.push(placeholder);
      hosted.swapComponent(placeholder);
      hosted.name = 'Hosted View';
      panel.editComponentProperty(swapProperty(panel, 'Hosted View'),
        { defaultValue: placeholder.id });
    }
    panels[name] = panel;
    const variant = figma.createComponent();
    variant.name = `View=${name}`;
    variant.layoutMode = 'VERTICAL';
    variant.primaryAxisSizingMode = 'FIXED';
    variant.counterAxisSizingMode = 'FIXED';
    variant.itemSpacing = 0;
    variant.resize(source.width, source.height);
    variant.minWidth = rightMinWidth;
    variant.fills = [];
    variant.strokes = [];
    const panelInstance = panel.createInstance();
    panelInstance.name = 'Right Sidedock panel';
    variant.appendChild(panelInstance);
    panelInstance.layoutSizingHorizontal = 'FILL';
    panelInstance.layoutGrow = 1;
    panelInstance.minWidth = rightMinWidth;
    panelInstance.isExposedInstance = name === 'Plugin';
    variants.push(variant);
  }
  const set = figma.combineAsVariants(variants, figma.currentPage);
  set.name = 'Obsidian / Right Sidedock / View (probe)';
  set.description = 'Seleciona seis Views no Sidedock direito; quatro são placeholders vazios e Plugin contém um Slot.';
  if (set.children.length !== 6 || set.componentPropertyDefinitions.View?.type !== 'VARIANT') {
    throw new Error('Application Shell Slot probe: propriedade View do Right Sidedock ausente.');
  }
  variants.forEach((variant, index) => {
    variant.x = 20;
    variant.y = 20 + index * (source.height + 20);
  });
  set.resizeWithoutConstraints(source.width + 40, variants.length *
    (source.height + 20) + 20);
  return { set, outline: variants[4]!, panels, placeholders, icons };
}

function createMainWorkspaceTabVariants(shell: ComponentNode, sources: Sources,
  evidence: ApplicationShellEvidence, theme: UiKitThemeVariables): { set: ComponentSetNode;
    defaultVariant: ComponentNode } {
  const original = shell.findOne((node) => node.name === 'Workspace Tabs');
  if (original?.type !== 'FRAME') {
    throw new Error('Application Shell Slot probe: barra de abas principal ausente.');
  }
  const variants: ComponentNode[] = [];
  const shoulderSize = evidence.mainTabs.activeChrome.shoulderSize / 2;
  const titleProperty = Object.keys(sources.workspaceTab.componentPropertyDefinitions)
    .find((key) => key.startsWith('Title#') &&
      sources.workspaceTab.componentPropertyDefinitions[key]?.type === 'TEXT');
  if (!titleProperty) throw new Error('Application Shell Slot probe: título de aba ausente.');
  for (const count of MAIN_WORKSPACE_TAB_COUNTS) {
    for (const side of MAIN_WORKSPACE_ACTIVE_SIDES) {
      const clone = original.clone();
      figma.currentPage.appendChild(clone);
      const bar = figma.createComponentFromNode(clone);
      bar.name = `Count=${count}, Active=${side}`;
      // The tab-list control is absolute; reserve its width and an 8 px gap so
      // the tab row alone receives the remaining Auto Layout fill width.
      bar.paddingRight = MAIN_TAB_LIST_RIGHT_INSET + 28 + evidence.mainTabs.newTabGap;
      const oldRow = bar.findOne((node) =>
        node.name === 'Main tabs / two canonical instances');
      const inactive = oldRow?.type === 'FRAME' ? oldRow.children.find((node) =>
        node.name === 'Workspace Tab / previous note') : null;
      const selected = oldRow?.type === 'FRAME' ? oldRow.children.find((node) =>
        node.name === 'Workspace Tab / plugin context') : null;
      const leftShoulder = oldRow?.type === 'FRAME' ? oldRow.children.find((node) =>
        node.name === 'Active tab left shoulder') : null;
      const rightShoulder = oldRow?.type === 'FRAME' ? oldRow.children.find((node) =>
        node.name === 'Active tab right shoulder') : null;
      if (oldRow?.type !== 'FRAME' || inactive?.type !== 'INSTANCE' ||
          selected?.type !== 'INSTANCE' || leftShoulder?.type !== 'FRAME' ||
          rightShoulder?.type !== 'FRAME') {
        throw new Error('Application Shell Slot probe: fontes de aba principal ausentes.');
      }
      const inactiveSource = inactive.clone();
      const activeSource = selected.clone();
      const leftSource = leftShoulder.clone();
      const rightSource = rightShoulder.clone();
      for (const source of [inactiveSource, activeSource, leftSource, rightSource]) {
        figma.currentPage.appendChild(source);
      }
      oldRow.remove();
      const row = frame(bar, 'Main tabs', 'HORIZONTAL',
        Number(count) * evidence.mainTabs.tabWidth, evidence.mainTabs.headerHeight);
      bar.insertChild(1, row);
      const leftToggle = frame(bar, 'Toggle left sidedock', 'HORIZONTAL',
        sources.sideModel.toggleWidth, evidence.mainTabs.headerHeight);
      leftToggle.layoutMode = 'NONE';
      bar.insertChild(1, leftToggle);
      const leftGlyph = sources.iconButtons.createGlyph('Sidedock / Collapse');
      leftGlyph.name = 'Toggle left glyph';
      leftToggle.appendChild(leftGlyph);
      leftGlyph.x = sources.sideModel.toggleIconX;
      leftGlyph.y = sources.sideModel.toggleIconY;
      row.layoutGrow = 1;
      row.minWidth = 1;
      row.maxWidth = Number(count) * evidence.mainTabs.tabWidth;
      row.clipsContent = false;
      const activeIndex = side === 'Left' ? 0 : Number(count) - 1;
      for (let index = 0; index < Number(count); index += 1) {
        const cell = frame(row, `Tab ${index + 1}`, 'HORIZONTAL',
          evidence.mainTabs.tabWidth, evidence.mainTabs.headerHeight);
        cell.layoutGrow = 1;
        cell.minWidth = 1;
        cell.maxWidth = evidence.mainTabs.tabWidth;
        cell.paddingTop = evidence.mainTabs.headerHeight - 34;
        cell.clipsContent = false;
        const tab = (index === activeIndex ? activeSource : inactiveSource).clone();
        tab.name = `Workspace Tab / ${index + 1}`;
        cell.appendChild(tab);
        tab.layoutSizingHorizontal = 'FILL';
        tab.minWidth = 1;
        if (index !== activeIndex && index > 0) {
          tab.setProperties({ [titleProperty]: 'New tab' });
        }
        if (index === activeIndex) {
          for (const [source, x, constraint] of [
            [leftSource, -shoulderSize, 'MIN'],
            [rightSource, cell.width, 'MAX'],
          ] as const) {
            const shoulder = source.clone();
            cell.appendChild(shoulder);
            shoulder.layoutPositioning = 'ABSOLUTE';
            shoulder.constraints = { horizontal: constraint, vertical: 'MAX' };
            shoulder.x = x;
            shoulder.y = evidence.mainTabs.headerHeight - shoulderSize;
          }
        } else {
          const divider = frame(cell, 'Inactive tab divider', 'HORIZONTAL', 1, 14);
          divider.layoutPositioning = 'ABSOLUTE';
          divider.constraints = { horizontal: 'MAX', vertical: 'CENTER' };
          divider.fills = [boundUiKitPaint(theme, 'controlBorder')];
          divider.x = cell.width - 1;
          divider.y = 13;
        }
      }
      const menu = frame(bar, 'Tab list', 'HORIZONTAL', 28,
        evidence.mainTabs.headerHeight);
      menu.layoutMode = 'NONE';
      menu.layoutPositioning = 'ABSOLUTE';
      menu.constraints = { horizontal: 'MAX', vertical: 'MIN' };
      menu.x = bar.width - MAIN_TAB_LIST_RIGHT_INSET - menu.width;
      menu.y = 0;
      const glyph = sources.iconButtons.createGlyph('Search / Context down', 'Muted');
      glyph.name = 'Tab list glyph';
      menu.appendChild(glyph);
      glyph.x = 6;
      glyph.y = 12;
      inactiveSource.remove();
      activeSource.remove();
      leftSource.remove();
      rightSource.remove();
      variants.push(bar);
    }
  }
  const set = figma.combineAsVariants(variants, figma.currentPage);
  set.name = 'Obsidian / Main Workspace / Tabs (probe)';
  set.description = 'Count controla 1 a 4 abas; Active coloca a aba ativa à esquerda ou à direita. As demais abas permanecem inativas.';
  if (set.children.length !== 8 ||
      set.componentPropertyDefinitions.Count?.type !== 'VARIANT' ||
      set.componentPropertyDefinitions.Active?.type !== 'VARIANT') {
    throw new Error('Application Shell Slot probe: controles Count/Active ausentes.');
  }
  variants.forEach((variant, index) => {
    variant.x = 20;
    variant.y = 20 + index * (evidence.mainTabs.headerHeight + 20);
  });
  set.resizeWithoutConstraints(original.width + 40,
    variants.length * (evidence.mainTabs.headerHeight + 20) + 20);
  const defaultVariant = variants.find((variant) =>
    variant.variantProperties?.Count === '2' &&
    variant.variantProperties.Active === 'Right');
  if (!defaultVariant) throw new Error('Application Shell Slot probe: abas padrão ausentes.');
  return { set, defaultVariant };
}

export const MAIN_HEADER_LEVELS = ['0', '1', '2', '3'] as const;

export function mainHeaderAncestorPositions(levels: number, total: number): number[] {
  if (!Number.isInteger(levels) || !Number.isInteger(total) ||
      levels < 0 || levels > total || total < 1) {
    throw new Error('Application Shell Slot probe: quantidade de ancestrais inválida.');
  }
  return Array.from({ length: levels }, (_, index) => total - levels + index + 1);
}

export function mainHeaderNaturalAncestorWidth(children: ReadonlyArray<{
  width: number; maxWidth: number | null }>): number {
  return children.reduce((width, child) => width +
    (child.maxWidth ?? child.width), 0);
}

function createMainViewHeaderVariants(sources: Sources): { set: ComponentSetNode;
  trails: ComponentSetNode; markdown: ComponentNode; plugin: ComponentNode;
  pluginTitle: ComponentNode } {
  if (sources.viewHeaderTrail.name !== 'Obsidian / Breadcrumb Trail / Markdown') {
    throw new Error('Application Shell Slot probe: Breadcrumb Trail canônico ausente.');
  }
  const trailVariants = MAIN_HEADER_LEVELS.map((levels) => {
    const variant = sources.viewHeaderTrail.clone();
    variant.name = `Levels=${levels}`;
    const ancestors = variant.findOne((node) => node.name === 'Ancestor trail');
    const title = variant.findOne((node) => node.name === 'Current Title');
    if (ancestors?.type !== 'FRAME' || title?.type !== 'TEXT' ||
        ancestors.children.length !== 6) {
      throw new Error('Application Shell Slot probe: anatomia canônica do breadcrumb ausente.');
    }
    const visible = new Set(mainHeaderAncestorPositions(Number(levels), 3));
    for (const child of [...ancestors.children]) {
      const position = Number(child.name.match(/\d+$/)?.[0]);
      if (!visible.has(position)) child.remove();
    }
    if (levels === '0') {
      ancestors.remove();
      // A title without ancestors owns the flexible middle area, including a
      // Plugin title longer than the short Markdown fixture title.
      title.maxWidth = null;
    } else {
      ancestors.maxWidth = mainHeaderNaturalAncestorWidth(ancestors.children.map((child) => ({
        width: child.width,
        maxWidth: 'maxWidth' in child && typeof child.maxWidth === 'number'
          ? child.maxWidth : null,
      })));
    }
    return variant;
  });
  const trails = figma.combineAsVariants(trailVariants, figma.currentPage);
  trails.name = 'Obsidian / Main Workspace / Breadcrumb Levels (probe)';
  if (trails.componentPropertyDefinitions.Levels?.type !== 'VARIANT') {
    throw new Error('Application Shell Slot probe: níveis do breadcrumb ausentes.');
  }
  trailVariants.forEach((variant, index) => {
    variant.x = 20;
    variant.y = 20 + index * (variant.height + 20);
  });
  trails.resizeWithoutConstraints(sources.viewHeaderTrail.width + 40,
    trailVariants.length * (sources.viewHeaderTrail.height + 20) + 20);

  const markdown = sources.viewHeader.clone();
  markdown.name = 'Mode=Markdown';
  const markdownTrail = markdown.findOne((node) => node.name === 'Breadcrumb Trail');
  if (markdownTrail?.type !== 'INSTANCE') {
    throw new Error('Application Shell Slot probe: trail do header Markdown ausente.');
  }
  markdownTrail.swapComponent(trailVariants[3]!);
  markdownTrail.setProperties({ Levels: '3' });
  const markdownActions = markdown.findOne((node) => node.name === 'Actions');
  const markdownMore = markdownActions?.type === 'FRAME'
    ? markdownActions.children.find((node) => node.name === 'Glyph / More options') : null;
  if (markdownActions?.type !== 'FRAME' || markdownMore?.type !== 'INSTANCE') {
    throw new Error('Application Shell Slot probe: menu Markdown ausente.');
  }
  const horizontalMore = sources.iconButtons.create('Search / More', 'Toolbar');
  horizontalMore.name = markdownMore.name;
  markdownActions.insertChild(markdownActions.children.indexOf(markdownMore), horizontalMore);
  horizontalMore.x = markdownMore.x;
  horizontalMore.y = markdownMore.y;
  horizontalMore.constraints = markdownMore.constraints;
  horizontalMore.isExposedInstance = true;
  markdownMore.remove();

  const pluginTitle = sources.viewHeaderTrail.clone();
  pluginTitle.name = 'Obsidian / Main Workspace / Plugin Title (probe)';
  const pluginAncestors = pluginTitle.findOne((node) => node.name === 'Ancestor trail');
  const pluginTitleText = pluginTitle.findOne((node) => node.name === 'Current Title');
  if (pluginAncestors?.type !== 'FRAME' || pluginTitleText?.type !== 'TEXT') {
    throw new Error('Application Shell Slot probe: título canônico do Plugin ausente.');
  }
  pluginAncestors.remove();
  pluginTitleText.maxWidth = null;

  const plugin = markdown.clone();
  plugin.name = 'Mode=Plugin';
  const pluginTrail = plugin.findOne((node) => node.name === 'Breadcrumb Trail');
  const actions = plugin.findOne((node) => node.name === 'Actions');
  const navigation = plugin.findOne((node) => node.name === 'Navigation');
  if (pluginTrail?.type !== 'INSTANCE' || actions?.type !== 'FRAME' ||
      navigation?.type !== 'FRAME' || actions.children.length !== 2) {
    throw new Error('Application Shell Slot probe: estrutura do header Plugin ausente.');
  }
  pluginTrail.swapComponent(pluginTitle);
  const pluginTitleNode = pluginTrail.findOne((node) => node.name === 'Current Title');
  const titleProperty = pluginTitleNode?.type === 'TEXT'
    ? pluginTitleNode.componentPropertyReferences?.characters : null;
  const editableTitle = titleProperty ?? Object.keys(pluginTrail.componentProperties)
    .find((key) => key.startsWith('Title#') &&
      pluginTrail.componentProperties[key]?.type === 'TEXT');
  if (!editableTitle) {
    throw new Error('Application Shell Slot probe: título editável do Plugin ausente.');
  }
  pluginTrail.setProperties({ [editableTitle]: 'My Plugin' });
  const more = actions.children.find((node) => node.name === 'Glyph / More options');
  if (more?.type !== 'INSTANCE') {
    throw new Error('Application Shell Slot probe: menu de três pontos ausente.');
  }
  for (const child of [...actions.children]) if (child !== more) child.remove();
  actions.layoutMode = 'HORIZONTAL';
  actions.primaryAxisSizingMode = 'AUTO';
  actions.counterAxisSizingMode = 'FIXED';
  actions.counterAxisAlignItems = 'CENTER';
  actions.itemSpacing = 0;
  actions.maxWidth = null;
  actions.layoutSizingHorizontal = 'HUG';
  const known = new Set(Object.keys(plugin.componentPropertyDefinitions));
  const slot = plugin.createSlot();
  const slotProperty = Object.keys(plugin.componentPropertyDefinitions).find((key) =>
    !known.has(key) && plugin.componentPropertyDefinitions[key]?.type === 'SLOT');
  if (!slotProperty) throw new Error('Application Shell Slot probe: Slot de ações ausente.');
  plugin.editComponentProperty(slotProperty, { name: 'Plugin actions',
    description: 'Insira aqui Components de botões da View do plugin.' });
  slot.name = 'Plugin actions';
  actions.insertChild(0, slot);
  slot.layoutMode = 'HORIZONTAL';
  slot.itemSpacing = 0;
  slot.fills = [];
  slot.strokes = [];
  slot.resize(28, 24);
  slot.minWidth = 28;
  slot.layoutSizingHorizontal = 'HUG';
  slot.layoutSizingVertical = 'FIXED';

  const set = figma.combineAsVariants([markdown, plugin], figma.currentPage);
  set.name = 'Obsidian / Main Workspace / View Header (probe)';
  if (set.componentPropertyDefinitions.Mode?.type !== 'VARIANT') {
    throw new Error('Application Shell Slot probe: modos do View Header ausentes.');
  }
  markdown.x = 20;
  markdown.y = 20;
  plugin.x = 20;
  plugin.y = markdown.height + 40;
  set.resizeWithoutConstraints(markdown.width + 40,
    markdown.height + plugin.height + 60);
  return { set, trails, markdown, plugin, pluginTitle };
}

/** Linked-instance probe: sidedock slots resize, and the Main Workspace accepts content. */
function createSidedockSlotProbe(shell: ComponentNode,
  filesLeft: ComponentNode, outlineRight: ComponentNode,
  mainTabs: ComponentNode, mainHeader: ComponentNode,
  sources: Sources, evidence: ApplicationShellEvidence): ComponentNode {
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
  left.swapComponent(filesLeft);
  left.isExposedInstance = true;
  right.swapComponent(outlineRight);
  right.minWidth = outlineRight.minWidth;
  right.isExposedInstance = true;
  const rightSwap = Object.keys(probe.componentPropertyDefinitions).find((key) =>
    key.startsWith('Right Sidedock#') &&
    probe.componentPropertyDefinitions[key]?.type === 'INSTANCE_SWAP');
  if (rightSwap) probe.deleteComponentProperty(rightSwap);
  wrapSidedockInSlot(probe, body, left, 'Left Sidedock slot');
  wrapSidedockInSlot(probe, body, right, 'Right Sidedock slot');
  wrapMainWorkspaceInSlot(probe, body);
  const bar = probe.findOne((node) => node.name === 'Workspace Tabs');
  if (bar?.type !== 'FRAME' || bar.parent?.type !== 'SLOT') {
    throw new Error('Application Shell Slot probe: barra no Main Workspace ausente.');
  }
  const barInstance = mainTabs.createInstance();
  barInstance.name = 'Workspace Tabs';
  bar.parent.insertChild(bar.parent.children.indexOf(bar), barInstance);
  barInstance.layoutSizingHorizontal = 'FILL';
  bar.remove();
  const header = probe.findOne((node) => node.name === 'View Header / chrome');
  if (header?.type !== 'INSTANCE' || header.parent?.type !== 'SLOT') {
    throw new Error('Application Shell Slot probe: View Header no Main Workspace ausente.');
  }
  header.swapComponent(mainHeader);
  header.layoutSizingHorizontal = 'FILL';
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
  const rightToggle = frame(probe, 'Toggle right sidedock', 'HORIZONTAL',
    evidence.right.toggleWidth, evidence.right.toggleHeight);
  rightToggle.layoutPositioning = 'ABSOLUTE';
  rightToggle.constraints = { horizontal: 'MAX', vertical: 'MIN' };
  rightToggle.paddingTop = (evidence.right.toggleHeight - 16) / 2;
  rightToggle.x = probe.width - rightToggle.width;
  rightToggle.y = evidence.right.tabTop;
  const toggleGlyph = sources.iconButtons.createGlyph('Sidedock / Collapse');
  toggleGlyph.name = 'Toggle right glyph';
  rightToggle.appendChild(toggleGlyph);
  toggleGlyph.rotation = 180;
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

async function createSidedockSlotPreview(probe: ComponentNode,
  evidence: ApplicationShellEvidence, sources: Sources,
  probeTabSet: ComponentSetNode,
  probePanels: Record<'Files' | 'Search' | 'Bookmarks' | 'Plugin', ComponentNode>,
  rightViews: ReturnType<typeof createRightSidedockViews>,
  mainTabSet: ComponentSetNode,
  mainHeader: ReturnType<typeof createMainViewHeaderVariants>
): Promise<FrameNode> {
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
  const mainTabs = instance.findOne((node) => node.name === 'Workspace Tabs');
  const header = instance.findOne((node) => node.name === 'View Header / chrome');
  const rightToggle = instance.findOne((node) => node.name === 'Toggle right sidedock');
  const content = instance.findOne((node) => node.name === 'Main Content');
  const status = instance.findOne((node) => node.name === 'Status Bar');
  if (body?.type !== 'FRAME' || leftSlot?.type !== 'SLOT' ||
      rightSlot?.type !== 'SLOT' || left?.type !== 'INSTANCE' ||
      right?.type !== 'INSTANCE' || ribbon?.type !== 'INSTANCE' ||
      main?.type !== 'SLOT' || mainTabs?.type !== 'INSTANCE' ||
      header?.type !== 'INSTANCE' || rightToggle?.type !== 'FRAME' ||
      content?.type !== 'INSTANCE' || status?.type !== 'INSTANCE') {
    throw new Error('Application Shell Slot probe: composição inválida ' +
      JSON.stringify({ body: body?.type, leftSlot: leftSlot?.type,
        rightSlot: rightSlot?.type, left: left?.type, right: right?.type,
        ribbon: ribbon?.type, main: main?.type, tabs: mainTabs?.type,
        header: header?.type,
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
    const tabList = mainTabs.findOne((node) => node.name === 'Tab list');
    const leftToggle = mainTabs.findOne((node) => node.name === 'Toggle left sidedock');
    if (tabList?.type !== 'FRAME' || !rightToggle.visible ||
        Math.abs(rightToggle.x + rightToggle.width - instance.width) > 1 ||
        Math.abs(rightToggle.y - evidence.right.tabTop) > 1 ||
        (rightSlot.visible && rightToggle.x < rightSlot.x - 1) ||
        (!rightSlot.visible && (rightToggle.x < main.x - 1 ||
          main.x + tabList.x + tabList.width > rightToggle.x - 3))) {
      throw new Error('Application Shell Slot probe: toggle direito não acompanha o Shell.');
    }
    if (leftToggle?.type !== 'FRAME' || !leftToggle.visible ||
        Math.abs(leftToggle.x - mainTabs.paddingLeft) > 1 ||
        left.findOne((node) => node.name === 'Collapse sidedock') !== null) {
      throw new Error('Application Shell Slot probe: toggle esquerdo ausente ou duplicado.');
    }
    if (main.layoutMode !== 'VERTICAL' ||
        main.layoutSizingHorizontal !== 'FILL' ||
        mainTabs.layoutSizingHorizontal !== 'FILL' ||
        mainTabs.isExposedInstance ||
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
  if ((await header.getMainComponentAsync())?.id !== mainHeader.markdown.id) {
    throw new Error('Application Shell Slot probe: header Markdown canônico do probe ausente.');
  }
  const horizontalMoreGlyph = sources.iconButtons.icons.get('lucide-more-horizontal');
  if (!horizontalMoreGlyph) {
    throw new Error('Application Shell Slot probe: glifo horizontal de ações ausente.');
  }
  for (const count of MAIN_WORKSPACE_TAB_COUNTS) {
    for (const side of MAIN_WORKSPACE_ACTIVE_SIDES) {
      mainTabs.setProperties({ Count: count, Active: side });
      const row = mainTabs.findOne((node) => node.name === 'Main tabs');
      const leftToggle = mainTabs.findOne((node) => node.name === 'Toggle left sidedock');
      const newTab = mainTabs.findOne((node) => node.name === 'New tab');
      const menu = mainTabs.findOne((node) => node.name === 'Tab list');
      const menuGlyph = mainTabs.findOne((node) => node.name === 'Tab list glyph');
      const cells = row?.type === 'FRAME' ? row.children.filter((node): node is FrameNode =>
        node.type === 'FRAME' && node.name.startsWith('Tab ')) : [];
      const activeIndex = side === 'Left' ? 0 : Number(count) - 1;
      const activeCell = cells[activeIndex];
      const leftShoulder = activeCell?.type === 'FRAME' ? activeCell.children.find((node) =>
        node.name === 'Active tab left shoulder') : null;
      const rightShoulder = activeCell?.type === 'FRAME' ? activeCell.children.find((node) =>
        node.name === 'Active tab right shoulder') : null;
      const expected = mainTabSet.children.find((node): node is ComponentNode =>
        node.type === 'COMPONENT' && node.variantProperties?.Count === count &&
        node.variantProperties.Active === side);
      if (!expected || mainTabs.componentProperties.Count?.value !== count ||
          mainTabs.componentProperties.Active?.value !== side ||
          row?.type !== 'FRAME' || leftToggle?.type !== 'FRAME' ||
          newTab?.type !== 'FRAME' ||
          menu?.type !== 'FRAME' || menuGlyph?.type !== 'INSTANCE' ||
          menu.layoutPositioning !== 'ABSOLUTE' ||
          cells.length !== Number(count) || !leftShoulder || !rightShoulder) {
        throw new Error(`Application Shell Slot probe: Count=${count}, Active=${side} ausente.`);
      }
      const checkTabs = async (): Promise<void> => {
        if (Math.abs(leftToggle.x - mainTabs.paddingLeft) > 1 ||
            Math.abs(row.x - (leftToggle.x + leftToggle.width +
              evidence.mainTabs.newTabGap)) > 1) {
          throw new Error('Application Shell Slot probe: toggle esquerdo perdeu o espaço das abas.');
        }
        const tabs = await Promise.all(cells.map(async (cell, index) => {
          const tab = cell.children[0];
          const source = sources.workspaceTab.children.find((node): node is ComponentNode =>
            node.type === 'COMPONENT' &&
            node.variantProperties?.Context === 'Main' &&
            node.variantProperties.State === (index === activeIndex ? 'Active' : 'Inactive'));
          if (tab?.type !== 'INSTANCE' || !source ||
              (await tab.getMainComponentAsync())?.id !== source.id ||
              Math.abs(tab.width - cell.width) > 1) {
            throw new Error('Application Shell Slot probe: aba canônica divergente.');
          }
          return { x: cell.x, width: cell.width, active: index === activeIndex };
        }));
        const dividers = cells.flatMap((cell, index) => {
          const divider = cell.children.find((node) =>
            node.name === 'Inactive tab divider');
          if (index === activeIndex) {
            if (divider) throw new Error('Application Shell Slot probe: divisor sobre aba ativa.');
            return [];
          }
          if (divider?.type !== 'FRAME' || divider.height !== 14 ||
              Math.abs(divider.y - 13) > 1) {
            throw new Error('Application Shell Slot probe: divisor curto ausente.');
          }
          return [{ x: cell.x + divider.x, tabIndex: index }];
        });
        assertMainWorkspaceTabsLayout({ count: Number(count), active: side,
          rowWidth: row.width, tabs, dividers,
          shoulders: { left: activeCell.x + leftShoulder.x,
            right: activeCell.x + rightShoulder.x,
            size: evidence.mainTabs.activeChrome.shoulderSize / 2 },
          newTabX: newTab.x, barWidth: mainTabs.width,
          paddingLeft: row.x,
          gap: evidence.mainTabs.newTabGap, newTabWidth: newTab.width,
          maxTabWidth: evidence.mainTabs.tabWidth,
          menu: { x: menu.x, width: menu.width,
            rightInset: MAIN_TAB_LIST_RIGHT_INSET } });
        if (Math.abs(menuGlyph.x - 6) > 1 ||
            Math.abs(menuGlyph.y - 12) > 1) {
          throw new Error('Application Shell Slot probe: seta da lista de abas desalinhada.');
        }
        if (Math.abs(leftShoulder.y - (row.height -
            evidence.mainTabs.activeChrome.shoulderSize / 2)) > 1 ||
            Math.abs(rightShoulder.y - leftShoulder.y) > 1) {
          throw new Error('Application Shell Slot probe: ombros da aba ativa desalinhados.');
        }
        verify();
      };
      await checkTabs();
      instance.resize(probe.width + 160, probe.height + 80);
      await checkTabs();
      instance.resize(probe.width, probe.height);
      await checkTabs();
    }
  }
  mainTabs.setProperties({ Count: '2', Active: 'Right' });
  verify();
  header.setProperties({ Mode: 'Markdown' });
  for (const levels of MAIN_HEADER_LEVELS) {
    const trail = header.findOne((node) => node.name === 'Breadcrumb Trail');
    if (trail?.type !== 'INSTANCE') {
      throw new Error('Application Shell Slot probe: Breadcrumb Trail Markdown ausente.');
    }
    trail.setProperties({ Levels: levels });
    const ancestor = trail.findOne((node) => node.name === 'Ancestor trail');
    const segments = ancestor?.type === 'FRAME' ? ancestor.children.filter((node) =>
      node.name.startsWith('Breadcrumb Segment ')) : [];
    const separators = ancestor?.type === 'FRAME' ? ancestor.children.filter((node) =>
      node.name.startsWith('Separator ')) : [];
    const title = trail.findOne((node) => node.name === 'Current Title');
    const actions = header.findOne((node) => node.name === 'Actions');
    const markdownMore = actions?.type === 'FRAME'
      ? actions.children.find((node) => node.name === 'Glyph / More options') : null;
    const naturalAncestorWidth = ancestor?.type === 'FRAME'
      ? mainHeaderNaturalAncestorWidth(ancestor.children.map((child) => ({
        width: child.width,
        maxWidth: 'maxWidth' in child && typeof child.maxWidth === 'number'
          ? child.maxWidth : null,
      }))) : 0;
    if (header.componentProperties.Mode?.value !== 'Markdown' ||
        trail.componentProperties.Levels?.value !== levels ||
        segments.length !== Number(levels) ||
        separators.length !== Number(levels) ||
        (levels === '0' ? ancestor !== null : ancestor?.type !== 'FRAME') ||
        title?.type !== 'TEXT' || actions?.type !== 'FRAME' ||
        actions.children.length !== 2 ||
        markdownMore?.type !== 'INSTANCE' ||
        markdownMore.componentProperties[sources.iconButtons.iconProperty]?.value !==
          horizontalMoreGlyph.id ||
        !actions.children.some((node) =>
          node.name.startsWith('Glyph / Current view: editing')) ||
        (ancestor?.type === 'FRAME' &&
          Math.abs((ancestor.maxWidth ?? 0) - naturalAncestorWidth) > 1) ||
        Math.abs(header.width - main.width) > 1) {
      throw new Error(`Application Shell Slot probe: header Markdown Levels=${levels} divergente.`);
    }
    verify();
    instance.resize(probe.width + 400, probe.height + 80);
    verify();
    if (Math.abs(header.width - main.width) > 1 ||
        (ancestor?.type === 'FRAME' && title?.type === 'TEXT' &&
          trail.width > naturalAncestorWidth + title.width + trail.itemSpacing + 2 &&
          Math.abs(ancestor.width - naturalAncestorWidth) > 1)) {
      throw new Error('Application Shell Slot probe: resize do header Markdown divergente.');
    }
    instance.resize(probe.width, probe.height);
  }
  header.setProperties({ Mode: 'Plugin' });
  if ((await header.getMainComponentAsync())?.id !== mainHeader.plugin.id) {
    throw new Error('Application Shell Slot probe: header Plugin não foi selecionado.');
  }
  const pluginTrail = header.findOne((node) => node.name === 'Breadcrumb Trail');
  const pluginActions = header.findOne((node) => node.name === 'Actions');
  const pluginNav = header.findOne((node) => node.name === 'Navigation');
  const pluginMore = pluginActions?.type === 'FRAME'
    ? pluginActions.children.find((node) => node.name === 'Glyph / More options') : null;
  const headerActionSlot = pluginActions?.type === 'FRAME'
    ? pluginActions.children.find((node) => node.name === 'Plugin actions') : null;
  const pluginTitle = pluginTrail?.type === 'INSTANCE'
    ? pluginTrail.findOne((node) => node.name === 'Current Title') : null;
  if (header.componentProperties.Mode?.value !== 'Plugin' ||
      pluginTrail?.type !== 'INSTANCE' ||
      (await pluginTrail.getMainComponentAsync())?.id !== mainHeader.pluginTitle.id ||
      pluginTrail.componentProperties.Levels !== undefined ||
      pluginTrail.findOne((node) => node.name === 'Ancestor trail') !== null ||
      pluginTitle?.type !== 'TEXT' || pluginTitle.characters !== 'My Plugin' ||
      pluginTitle.width <= sources.headerModel.title.rect.width ||
      pluginNav?.type !== 'FRAME' || pluginNav.children.length !== 2 ||
      pluginActions?.type !== 'FRAME' || pluginActions.layoutSizingHorizontal !== 'HUG' ||
      headerActionSlot?.type !== 'SLOT' || headerActionSlot.children.length !== 0 ||
      pluginMore?.type !== 'INSTANCE' ||
      pluginMore.componentProperties[sources.iconButtons.iconProperty]?.value !==
        horizontalMoreGlyph.id ||
      pluginActions.children.length !== 2) {
    throw new Error('Application Shell Slot probe: header Plugin divergente.');
  }
  const actionSource = figma.createComponent();
  actionSource.name = 'Application Shell / temporary header action insertion check';
  actionSource.resize(28, 24);
  const firstAction = actionSource.createInstance();
  const secondAction = actionSource.createInstance();
  headerActionSlot.appendChild(firstAction);
  headerActionSlot.appendChild(secondAction);
  const verifyPluginHeader = (): void => {
    if (headerActionSlot.children.length !== 2 ||
        headerActionSlot.width < firstAction.width + secondAction.width - 1 ||
        Math.abs(pluginActions.x + pluginActions.width + header.paddingRight -
          header.width) > 1 ||
        Math.abs(header.width - main.width) > 1) {
      throw new Error('Application Shell Slot probe: ações Plugin não acompanham o resize.');
    }
    verify();
  };
  verifyPluginHeader();
  instance.resize(probe.width + 160, probe.height + 80);
  verifyPluginHeader();
  instance.resize(probe.width, probe.height);
  firstAction.remove();
  secondAction.remove();
  actionSource.remove();
  header.setProperties({ Mode: 'Markdown' });
  if ((await header.getMainComponentAsync())?.id !== mainHeader.markdown.id) {
    throw new Error('Application Shell Slot probe: header Markdown não restaurou.');
  }
  const restoredTrail = header.findOne((node) => node.name === 'Breadcrumb Trail');
  if (restoredTrail?.type !== 'INSTANCE') {
    throw new Error('Application Shell Slot probe: header Markdown não restaurou.');
  }
  restoredTrail.setProperties({ Levels: '3' });
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
  instance.setProperties({ [showRight]: false });
  header.setProperties({ Mode: 'Plugin' });
  const hiddenMore = header.findOne((node) => node.name === 'Glyph / More options');
  const hiddenMoreBox = hiddenMore?.absoluteBoundingBox;
  const hiddenHeaderBox = header.absoluteBoundingBox;
  if (hiddenMore?.type !== 'INSTANCE' || !hiddenMore.visible ||
      !hiddenMoreBox || !hiddenHeaderBox ||
      hiddenMoreBox.x + hiddenMoreBox.width >
        hiddenHeaderBox.x + hiddenHeaderBox.width + 1) {
    throw new Error('Application Shell Slot probe: menu horizontal Plugin oculto sem Right Sidedock.');
  }
  verify();
  header.setProperties({ Mode: 'Markdown' });
  instance.setProperties({ [showRibbon]: true, [showLeft]: true, [showRight]: true });
  verify();
  for (const choice of leftSidedockViewChoices(sources)) {
    const expectedTab = probeTabSet.children.find((node): node is ComponentNode =>
      node.type === 'COMPONENT' && node.variantProperties?.Active === choice.name);
    if (!expectedTab) throw new Error(`Application Shell Slot probe: tabs ${choice.name} ausentes.`);
    left.setProperties({ View: choice.name });
    const panel = left.findOne((node) => node.name === 'Side Panel / Files');
    const hosted = panel?.type === 'INSTANCE'
      ? panel.findOne((node) => node.name === 'Hosted View') : null;
    const tabArea = panel?.type === 'INSTANCE'
      ? panel.findOne((node) => node.name === 'Tab group area') : null;
    const tabs = tabArea?.type === 'FRAME'
      ? tabArea.children.find((node) => node.type === 'INSTANCE') : null;
    const actualView = panel?.type === 'INSTANCE'
      ? panel.componentProperties[swapProperty(probePanels[choice.name], 'Hosted View')]?.value : null;
    const actualTab = panel?.type === 'INSTANCE'
      ? panel.componentProperties[swapProperty(probePanels[choice.name], 'Tab group')]?.value : null;
    const linkedView = hosted?.type === 'INSTANCE'
      ? (await hosted.getMainComponentAsync())?.id : null;
    const linkedTab = tabs?.type === 'INSTANCE'
      ? (await tabs.getMainComponentAsync())?.id : null;
    const activeTab = tabs?.type === 'INSTANCE'
      ? tabs.componentProperties.Active?.value : null;
    if (tabs?.type !== 'INSTANCE' || tabs.children.length !== 4 ||
        Math.abs(tabs.width - expectedTab.width) > 1 ||
        tabArea?.type !== 'FRAME' ||
        Math.abs(tabArea.width - 4 * 28 - 3 * sources.sideModel.tabGap) > 1) {
      throw new Error(`Application Shell Slot probe: quarta tab ausente em ${choice.name} ` +
        JSON.stringify({ tabAreaWidth: tabArea?.width, tabType: tabs?.type,
          tabWidth: tabs?.width, tabChildren: tabs?.type === 'INSTANCE'
            ? tabs.children.length : null, expectedWidth: expectedTab.width,
          tabProperty: actualTab, expectedTab: expectedTab.id }));
    }
    assertLeftSidedockSelection({ name: choice.name,
      viewId: choice.view.id, tabId: expectedTab.id }, {
      selection: left.componentProperties.View?.value ?? null,
      view: actualView ?? null, tab: actualTab ?? null,
      hostedType: hosted?.type ?? null, tabsType: tabs?.type ?? null,
      linkedView: linkedView ?? null, linkedTab: linkedTab ?? null,
      activeTab: activeTab ?? null });
    verify();
    left.resize(left.width + 40, left.height);
    verify();
    left.resize(left.width - 40, left.height);
  }
  left.setProperties({ View: 'Plugin' });
  const pluginPanel = left.findOne((node) => node.name === 'Side Panel / Files');
  const pluginSlot = pluginPanel?.type === 'INSTANCE'
    ? pluginPanel.findOne((node) => node.name === 'Hosted View / Plugin Slot') : null;
  const pluginHeader = pluginPanel?.type === 'INSTANCE'
    ? pluginPanel.findOne((node) => node.name === 'Tab header / 40 px') : null;
  const pluginTabArea = pluginPanel?.type === 'INSTANCE'
    ? pluginPanel.findOne((node) => node.name === 'Tab group area') : null;
  const pluginTabs = pluginTabArea?.type === 'FRAME'
    ? pluginTabArea.children.find((node) => node.type === 'INSTANCE') : null;
  const pluginTabProperty = pluginPanel?.type === 'INSTANCE'
    ? Object.keys(pluginPanel.componentProperties).find((key) => key.startsWith('Tab group#'))
    : null;
  const pluginTabSource = probeTabSet.children.find((node): node is ComponentNode =>
    node.type === 'COMPONENT' && node.variantProperties?.Active === 'Plugin');
  const profile = left.findOne((node) => node.name === 'Vault Profile');
  if (left.componentProperties.View?.value !== 'Plugin' ||
      pluginPanel?.type !== 'INSTANCE' || pluginSlot?.type !== 'SLOT' ||
      pluginHeader?.type !== 'FRAME' || profile?.type !== 'INSTANCE' ||
      pluginTabArea?.type !== 'FRAME' || pluginTabs?.type !== 'INSTANCE' ||
      pluginTabs.children.length !== 4 ||
      pluginTabs.children[3]?.type !== 'INSTANCE' ||
      (pluginTabSource && Math.abs(pluginTabs.width - pluginTabSource.width) > 1) ||
      Math.abs(pluginTabArea.width - 4 * 28 - 3 * sources.sideModel.tabGap) > 1 ||
      !pluginTabProperty || !pluginTabSource ||
      pluginPanel.componentProperties[pluginTabProperty]?.value !== pluginTabSource.id ||
      pluginSlot.children.length !== 0 || pluginSlot.layoutMode !== 'VERTICAL' ||
      pluginSlot.layoutSizingHorizontal !== 'FILL' || pluginSlot.layoutGrow !== 1 ||
      JSON.stringify(pluginSlot.fills) !== JSON.stringify(pluginPanel.fills)) {
    throw new Error('Application Shell Slot probe: View Plugin não expôs um Slot vazio.');
  }
  const verifyPlugin = (): void => {
    assertPluginHostedSlotLayout({ panel: { width: pluginPanel.width, height: pluginPanel.height },
      header: { height: pluginHeader.height },
      slot: { width: pluginSlot.width, height: pluginSlot.height, y: pluginSlot.y },
      profile: { y: profile.y, height: profile.height },
      sidedock: { height: left.height } });
    verify();
  };
  verifyPlugin();
  const insertionProbe = figma.createComponent();
  insertionProbe.name = 'Application Shell / temporary Plugin Slot insertion check';
  insertionProbe.resize(16, 16);
  const inserted = insertionProbe.createInstance();
  pluginSlot.appendChild(inserted);
  if (inserted.parent !== pluginSlot || !pluginSlot.children.includes(inserted)) {
    throw new Error('Application Shell Slot probe: Plugin Slot não aceitou Component.');
  }
  left.resize(left.width + 40, left.height);
  verifyPlugin();
  left.resize(left.width - 40, left.height);
  instance.resize(instance.width, instance.height + 80);
  verifyPlugin();
  instance.resize(instance.width, instance.height - 80);
  verifyPlugin();
  inserted.remove();
  insertionProbe.remove();
  left.setProperties({ View: 'Files' });
  verify();
  const baseRightWidth = right.width;
  for (const name of RIGHT_SIDEDOCK_VIEWS) {
    right.setProperties({ View: name });
    const panel = right.findOne((node) => node.name === 'Right Sidedock panel');
    const rightHeader = panel?.type === 'INSTANCE'
      ? panel.findOne((node) => node.name === 'Right tab header') : null;
    const tabs = panel?.type === 'INSTANCE'
      ? panel.findOne((node) => node.name === 'Right WorkspaceTabs') : null;
    const oldToggle = panel?.type === 'INSTANCE'
      ? panel.findOne((node) => node.name === 'Collapse right sidedock') : null;
    const hosted = panel?.type === 'INSTANCE' ? panel.children[1] : null;
    const source = rightViews.panels[name];
    const placeholder = rightViews.placeholders.find((node) =>
      node.name === `Obsidian / Side Panel / Right / ${name} placeholder (probe)`);
    const expectedView = name === 'Outline' ? sources.outlineView.id : placeholder?.id;
    const actualView = panel?.type === 'INSTANCE' && name !== 'Plugin'
      ? panel.componentProperties[swapProperty(source, 'Hosted View')]?.value : null;
    const selected = tabs?.type === 'FRAME'
      ? tabs.children[RIGHT_SIDEDOCK_VIEWS.indexOf(name)] : null;
    if (right.componentProperties.View?.value !== name ||
        panel?.type !== 'INSTANCE' || rightHeader?.type !== 'FRAME' ||
        tabs?.type !== 'FRAME' || oldToggle !== null ||
        tabs.children.length !== 6 || selected?.type !== 'INSTANCE' ||
        (selected.componentProperties.State?.value &&
          selected.componentProperties.State.value !== 'Active') ||
        Math.abs(tabs.width - (6 * 28 + 5 * evidence.right.tabGap)) > 1 ||
        Math.abs(panel.width - right.width) > 1 ||
        Math.abs(rightHeader.width - right.width) > 1 ||
        tabs.x + tabs.width > rightHeader.width - rightToggle.width + 1 ||
        (name === 'Plugin' && (hosted?.type !== 'SLOT' || hosted.children.length !== 0)) ||
        (name !== 'Plugin' && (hosted?.type !== 'INSTANCE' ||
          actualView !== expectedView ||
          (name !== 'Outline' && hosted.children.length !== 0)))) {
      throw new Error(`Application Shell Slot probe: View direita ${name} divergente ` +
        JSON.stringify({ selection: right.componentProperties.View?.value,
          panel: panel?.type, tabs: tabs?.type === 'FRAME' ? tabs.children.length : null,
          tabWidth: tabs?.width, hosted: hosted?.type, actualView, expectedView }));
    }
    if (hosted?.type !== 'INSTANCE' && hosted?.type !== 'SLOT') {
      throw new Error(`Application Shell Slot probe: Hosted View direita ${name} ausente.`);
    }
    const checkRightSize = (): void => {
      if (Math.abs(panel.width - right.width) > 1 ||
          Math.abs(panel.height - right.height) > 1 ||
          Math.abs(hosted.width - panel.width) > 1 ||
          Math.abs(hosted.height - (panel.height - rightHeader.height)) > 1 ||
          Math.abs(hosted.y - rightHeader.height) > 1 ||
          tabs.x + tabs.width > rightHeader.width - rightToggle.width + 1) {
        throw new Error(`Application Shell Slot probe: resize direito ${name} divergente.`);
      }
      verify();
    };
    checkRightSize();
    if (name === 'Plugin' && hosted.type === 'SLOT') {
      const insertSource = figma.createComponent();
      insertSource.name = 'Application Shell / temporary Right Plugin Slot insertion check';
      insertSource.resize(16, 16);
      const contentInstance = insertSource.createInstance();
      hosted.appendChild(contentInstance);
      if (contentInstance.parent !== hosted || !hosted.children.includes(contentInstance)) {
        throw new Error('Application Shell Slot probe: Slot direito não aceitou Component.');
      }
      right.resize(right.width + 40, right.height);
      checkRightSize();
      instance.resize(instance.width, instance.height + 80);
      checkRightSize();
      instance.resize(instance.width, instance.height - 80);
      right.resize(right.width - 40, right.height);
      checkRightSize();
      contentInstance.remove();
      insertSource.remove();
    } else {
      right.resize(right.width + 40, right.height);
      checkRightSize();
      instance.resize(instance.width, instance.height + 80);
      checkRightSize();
      instance.resize(instance.width, instance.height - 80);
      right.resize(right.width - 40, right.height);
      checkRightSize();
    }
    right.resize(rightSidedockProbeMinimumWidth(evidence.right), right.height);
    checkRightSize();
    right.resize(baseRightWidth, right.height);
    checkRightSize();
    instance.setProperties({ [showRight]: false });
    verify();
    instance.setProperties({ [showRight]: true });
    checkRightSize();
  }
  right.setProperties({ View: 'Outline' });
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

function swapProperty(component: ComponentNode | ComponentSetNode, name: string): string {
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
