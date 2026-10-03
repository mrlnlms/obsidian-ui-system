import { readButtonImport } from './button-data';
import { createButtonComponent, loadButtonFont } from './button-component';
import { generateSearch } from './search-generation';
import { generateFileExplorerRow } from './file-explorer-row-generation';
import { generateFileExplorerTaggedRows } from './file-explorer-row-tag-generation';
import { generateFolderRows } from './folder-row-generation';
import { generateViewHeader } from './view-header-generation';
import { generateWorkspaceTab } from './workspace-tab-generation';
import { generateSidePanel } from './side-panel-generation';
import { composeSearchInSidePanel } from './search-view-generation';
import { planUiKitPlacement } from './ui-kit-layout';
import type { ImportedPackage } from './package-data';
import { readFileExplorerRowImport } from './file-explorer-row-data';
import { readFileExplorerTaggedRows } from './file-explorer-row-tag-data';
import { readFolderRowModels } from './folder-row-data';
import { readViewHeaderModel } from './view-header-data';
import { readWorkspaceTabModel } from './workspace-tab-data';
import { readSidePanelModel } from './side-panel-data';
import { readSearchViewModel } from './search-view-data';
import activeRowProbe from '../tests/fixtures/file-explorer-active-row-probe.json';
import taggedRowsProbe from '../tests/fixtures/file-explorer-tagged-rows-probe.json';
import folderRowsProbe from '../tests/fixtures/folder-rows-probe.json';
import viewHeaderProbe from '../tests/fixtures/view-header-probe.json';
import workspaceTabProbe from '../tests/fixtures/workspace-tab-probe.json';
import sidePanelProbe from '../tests/fixtures/side-panel-probe.json';
import searchViewProbe from '../tests/fixtures/search-view-probe.json';

/** Checks every included observed fixture before a Figma node is created. */
export function validateIncludedEvidence(): void {
  readFileExplorerRowImport(activeRowProbe);
  readFileExplorerTaggedRows(taggedRowsProbe);
  readFolderRowModels(folderRowsProbe);
  readViewHeaderModel(viewHeaderProbe);
  readWorkspaceTabModel(workspaceTabProbe);
  readSidePanelModel(sidePanelProbe);
  readSearchViewModel(searchViewProbe);
}

/** One Package v1, one action, one fresh composition on the current page. */
export async function generateFullUiKit(input: ImportedPackage): Promise<{
  preview: FrameNode; searchView: ComponentNode;
}> {
  validateIncludedEvidence();
  const originalRoots = new Set(figma.currentPage.children.map((node) => node.id));
  try {
    const button = await generateButton(input.components, input.layout);
    const search = await generateSearch(input.components, input.layout);
    organizePublicSets(button, search);
    await generateFileExplorerRow(activeRowProbe);
    await generateFileExplorerTaggedRows(taggedRowsProbe);
    await generateFolderRows(folderRowsProbe);
    await generateViewHeader(viewHeaderProbe);
    const workspaceTab = await generateWorkspaceTab(workspaceTabProbe);
    const sidePanel = await generateSidePanel(sidePanelProbe, workspaceTab.set);
    const result = await composeSearchInSidePanel(searchViewProbe, search, sidePanel);
    figma.currentPage.selection = [result.preview];
    figma.viewport.scrollAndZoomIntoView([result.preview]);
    return { preview: result.preview, searchView: result.component };
  } catch (error) {
    for (const node of figma.currentPage.children) {
      if (!originalRoots.has(node.id) && !node.removed) node.remove();
    }
    throw error;
  }
}

async function generateButton(componentsJson: unknown, layoutJson: unknown): Promise<ComponentSetNode> {
  let set: ComponentSetNode | undefined;
  const components: ComponentNode[] = [];
  const textNodes: TextNode[] = [];
  try {
    const data = readButtonImport(componentsJson, layoutJson);
    validateSharedTypography(data);
    const font = await loadButtonFont(data[0]);
    figma.ui.postMessage({ type: 'typography', text: `Typography: ${font.family} / ${font.style} ✓` });
    for (const button of data) {
      const { component, label } = createButtonComponent(button, font);
      components.push(component);
      textNodes.push(label);
    }
    set = figma.combineAsVariants(components, figma.currentPage);
    set.name = 'Obsidian / Button';
    set.description = 'Button em estados Normal, Disabled e CTA.';
    if (set.children.length !== 3 || set.componentPropertyDefinitions.State?.type !== 'VARIANT') {
      throw new Error('O Figma não criou as três variants com a propriedade State.');
    }
    const labelProperty = set.addComponentProperty('Label', 'TEXT', data[0].text);
    for (const label of textNodes) label.componentPropertyReferences = { characters: labelProperty };
    if (textNodes.some((label, index) => label.characters !== data[index].text || label.width <= 0 ||
        components[index].width < label.width + data[index].padding.left + data[index].padding.right - 0.5)) {
      throw new Error('A propriedade Label alterou o texto ou colapsou a largura Hug; geração cancelada.');
    }
    if (components.some((component) => component.layoutMode !== 'HORIZONTAL' ||
        component.primaryAxisSizingMode !== 'AUTO' || component.counterAxisSizingMode !== 'FIXED')) {
      throw new Error('O Figma não preservou Auto Layout, Hug horizontal e altura fixa nas variants.');
    }
    let nextY = 20;
    let maxWidth = 0;
    for (const component of components) {
      component.x = 20;
      component.y = nextY;
      nextY += component.height + 24;
      maxWidth = Math.max(maxWidth, component.width);
    }
    set.resizeWithoutConstraints(maxWidth + 40, nextY - 4);
    return set;
  } catch (error) {
    if (set && !set.removed) set.remove();
    else for (const component of components) if (!component.removed) component.remove();
    for (const label of textNodes) if (!label.removed) label.remove();
    throw error;
  }
}

function organizePublicSets(button: ComponentSetNode, search: ComponentSetNode): void {
  const existing = figma.currentPage.children.filter((node) => node !== button && node !== search)
    .map((node) => node.absoluteBoundingBox)
    .filter((bounds): bounds is Rect => bounds !== null);
  const placement = planUiKitPlacement(existing, button, search);
  for (const [name, set, bounds] of [
    ['Actions', button, placement.actions],
    ['Inputs', search, placement.inputs],
  ] as const) {
    const section = figma.createSection();
    section.name = name;
    section.resize(bounds.width, bounds.height);
    section.x = bounds.x;
    section.y = bounds.y;
    section.appendChild(set);
    set.x = placement.inset;
    set.y = placement.inset;
    if (set.parent !== section || set.x + set.width > section.width ||
        set.y + set.height > section.height) {
      throw new Error(`UI Kit: ${name} não contém o Component Set corretamente.`);
    }
  }
}

function validateSharedTypography(data: ReturnType<typeof readButtonImport>): void {
  if (data.some((button) => button.text !== data[0].text ||
      button.fontFamily !== data[0].fontFamily || button.fontWeight !== data[0].fontWeight ||
      button.fontStyle !== data[0].fontStyle || button.lineHeight !== data[0].lineHeight ||
      button.letterSpacing !== data[0].letterSpacing)) {
    throw new Error('Button: texto ou tipografia diverge entre variants; o spike exige valores compartilhados.');
  }
}
