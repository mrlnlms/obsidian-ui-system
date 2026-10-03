import { readButtonImport } from './button-data';
import { createButtonComponent, loadButtonFont } from './button-component';
import { readPackageVersion, readButtonV2Package, type ButtonV2Package } from './button-v2-package';
import { prepareButtonNormalBinding } from './button-normal-binding';
import { generateBoundButtonNormal } from './button-normal-generation';
import type { DiagnosticInput } from './button-binding-evidence';
import { generateSearch } from './search-generation';
import { generateFileExplorerRow } from './file-explorer-row-generation';
import { generateFileExplorerTaggedRows } from './file-explorer-row-tag-generation';
import { generateFolderRows } from './folder-row-generation';
import { generateViewHeader } from './view-header-generation';
import { generateWorkspaceTab } from './workspace-tab-generation';
import { generateSidePanel } from './side-panel-generation';
import sidePanelProbe from '../tests/fixtures/side-panel-probe.json';
import { composeSearchInSidePanel } from './search-view-generation';
import searchViewProbe from '../tests/fixtures/search-view-probe.json';
import { planUiKitPlacement } from './ui-kit-layout';
import { readFigmaPackage, type ImportedPackage } from './package-data';

figma.showUI(__html__, { width: 400, height: 640 });

let importedPackage: ImportedPackage | undefined;
let importedButtonV2: ButtonV2Package | undefined;
let currentRequest = 0;

figma.ui.onmessage = async (message: unknown) => {
  if (isGenerateSearchViewMessage(message)) {
    try {
      const result = await composeSearchInSidePanel(searchViewProbe);
      figma.ui.postMessage({ type: 'result', ok: true,
        text: `Search View Dark ${result.reusedComponent ? 'reutilizada' : 'criada'}: ` +
          `${result.component.name} (${result.component.id}). ${result.preview.name} ` +
          `criado a partir do preview validado, com Search nas larguras 242 e 200 px.` });
    } catch (error) {
      figma.ui.postMessage({ type: 'result', ok: false,
        text: error instanceof Error ? error.message : String(error) });
    }
    return;
  }
  if (isGenerateSidePanelMessage(message)) {
    try {
      const result = await generateSidePanel(sidePanelProbe);
      figma.ui.postMessage({ type: 'result', ok: true,
        text: `Side Panel Left Dark criado: ${result.panel.name} (${result.panel.id}), ` +
          `Tab Group com Active=Files|Search|Bookmarks e preview de resize.` });
    } catch (error) {
      figma.ui.postMessage({ type: 'result', ok: false,
        text: error instanceof Error ? error.message : String(error) });
    }
    return;
  }
  if (isGenerateWorkspaceTabMessage(message)) {
    try {
      const result = await generateWorkspaceTab(message.probe);
      figma.ui.postMessage({ type: 'result', ok: true,
        text: `Workspace Tab Dark criado: 4 variants em ${result.set.name} (${result.set.id}), ` +
          `2 ícones Files substituíveis e preview de resize.` });
    } catch (error) {
      figma.ui.postMessage({ type: 'result', ok: false,
        text: error instanceof Error ? error.message : String(error) });
    }
    return;
  }
  if (isGenerateViewHeaderMessage(message)) {
    try {
      const result = await generateViewHeader(message.probe);
      figma.ui.postMessage({ type: 'result', ok: true,
        text: `3 Components criados: ${result.segment.name}, ${result.trail.name} e ` +
          `${result.component.name} (${result.component.id}); título ${result.title}.` });
    } catch (error) {
      figma.ui.postMessage({ type: 'result', ok: false,
        text: error instanceof Error ? error.message : String(error) });
    }
    return;
  }
  if (isGenerateFolderRowsMessage(message)) {
    try {
      const components = await generateFolderRows(message.probe);
      figma.ui.postMessage({ type: 'result', ok: true,
        text: `Folder rows Dark criadas: ${components.length} Components (Expanded/Collapsed × Depth 0–2).` });
    } catch (error) {
      figma.ui.postMessage({ type: 'result', ok: false,
        text: error instanceof Error ? error.message : String(error) });
    }
    return;
  }
  if (isGenerateFileExplorerTaggedRowsMessage(message)) {
    try {
      const result = await generateFileExplorerTaggedRows(message.probe);
      figma.ui.postMessage({ type: 'result', ok: true,
        text: `File Explorer tagged Dark criado: ${result.components.map((node) => node.name).join(', ')}. Larguras Figma: JSON ${result.tagWidthsPx.JSON} px; ZIP ${result.tagWidthsPx.ZIP} px.` });
    } catch (error) {
      figma.ui.postMessage({ type: 'result', ok: false,
        text: error instanceof Error ? error.message : String(error) });
    }
    return;
  }
  if (isGenerateFileExplorerRowMessage(message)) {
    try {
      const { component, labelWidthPx } = await generateFileExplorerRow(message.probe);
      figma.ui.postMessage({ type: 'result', ok: true,
        text: `File Explorer row Active Dark criado. Component ${component.id}; largura natural do label: ${labelWidthPx} px.` });
    } catch (error) {
      figma.ui.postMessage({ type: 'result', ok: false,
        text: error instanceof Error ? error.message : String(error) });
    }
    return;
  }
  if (isClearPackageMessage(message)) {
    if (message.requestId >= currentRequest) {
      currentRequest = message.requestId;
      importedPackage = undefined;
      importedButtonV2 = undefined;
    }
    return;
  }
  if (isLoadPackageMessage(message)) {
    if (message.requestId < currentRequest) return;
    currentRequest = message.requestId;
    importedPackage = undefined;
    importedButtonV2 = undefined;
    try {
      const bytes = message.bytes instanceof Uint8Array ? message.bytes :
        message.bytes instanceof ArrayBuffer ? new Uint8Array(message.bytes) : null;
      if (!bytes) throw new Error('Figma Package inválido: dados do ZIP ausentes.');
      const version = readPackageVersion(bytes);
      if (version === 1) importedPackage = readFigmaPackage(bytes);
      else importedButtonV2 = readButtonV2Package(bytes);
      figma.ui.postMessage({ type: 'package-ready', requestId: currentRequest,
        version, summary: (importedPackage ?? importedButtonV2)!.summary });
    } catch (error) {
      figma.ui.postMessage({ type: 'package-error', requestId: currentRequest,
        text: error instanceof Error ? error.message : String(error) });
    }
    return;
  }
  if (isGenerateBoundButtonMessage(message)) {
    if (!importedButtonV2) {
      figma.ui.postMessage({ type: 'result', ok: false, text: 'Selecione um Figma Package v2 válido.' });
      return;
    }
    try {
      const prepared = prepareButtonNormalBinding(importedButtonV2, message.diagnostics);
      const report = await generateBoundButtonNormal(prepared);
      figma.ui.postMessage({ type: 'result', ok: true,
        text: `Button normal criado com Variables vinculadas. Component ${report.componentId}; collection ${report.collectionId}.`,
        report });
    } catch (error) {
      figma.ui.postMessage({ type: 'result', ok: false,
        text: error instanceof Error ? error.message : String(error) });
    }
    return;
  }
  if (!isGenerateUiKitMessage(message)) return;
  if (!importedPackage) {
    figma.ui.postMessage({ type: 'result', ok: false, text: 'Selecione um Figma Package válido antes de gerar o UI Kit.' });
    return;
  }
  const sets: ComponentSetNode[] = [];
  const sections: SectionNode[] = [];
  try {
    sets.push(await generateButton(importedPackage.components, importedPackage.layout));
    sets.push(await generateSearch(importedPackage.components, importedPackage.layout));
    organizeUiKit(sets[0]!, sets[1]!, sections);
    figma.currentPage.selection = sets;
    figma.viewport.scrollAndZoomIntoView(sections);
    figma.ui.postMessage({ type: 'result', ok: true,
      text: 'UI Kit criado: Obsidian / Button em Actions e Obsidian / Search em Inputs.' });
  } catch (error) {
    for (const section of sections) if (!section.removed) section.remove();
    for (const set of sets) if (!set.removed) set.remove();
    figma.ui.postMessage({ type: 'result', ok: false,
      text: error instanceof Error ? error.message : String(error) });
  }
};

function isGenerateFileExplorerRowMessage(value: unknown): value is { type: 'generate-file-explorer-row'; probe: unknown } {
  return typeof value === 'object' && value !== null && 'type' in value &&
    value.type === 'generate-file-explorer-row' && 'probe' in value;
}

function isGenerateFileExplorerTaggedRowsMessage(value: unknown): value is { type: 'generate-file-explorer-tagged-rows'; probe: unknown } {
  return typeof value === 'object' && value !== null && 'type' in value &&
    value.type === 'generate-file-explorer-tagged-rows' && 'probe' in value;
}

function isGenerateFolderRowsMessage(value: unknown): value is { type: 'generate-folder-rows'; probe: unknown } {
  return typeof value === 'object' && value !== null && 'type' in value &&
    value.type === 'generate-folder-rows' && 'probe' in value;
}

function isGenerateViewHeaderMessage(value: unknown): value is { type: 'generate-view-header'; probe: unknown } {
  return typeof value === 'object' && value !== null && 'type' in value &&
    value.type === 'generate-view-header' && 'probe' in value;
}

function isGenerateWorkspaceTabMessage(value: unknown): value is { type: 'generate-workspace-tab'; probe: unknown } {
  return typeof value === 'object' && value !== null && 'type' in value &&
    value.type === 'generate-workspace-tab' && 'probe' in value;
}

function isGenerateSidePanelMessage(value: unknown): value is { type: 'generate-side-panel' } {
  return typeof value === 'object' && value !== null && 'type' in value &&
    value.type === 'generate-side-panel';
}

function isGenerateSearchViewMessage(value: unknown): value is { type: 'generate-search-view' } {
  return typeof value === 'object' && value !== null && 'type' in value &&
    value.type === 'generate-search-view';
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

    // combineAsVariants does not arrange the components inside the set.
    const inset = 20;
    const gutter = 24;
    let nextY = inset;
    let maxWidth = 0;
    for (const component of components) {
      component.x = inset;
      component.y = nextY;
      nextY += component.height + gutter;
      maxWidth = Math.max(maxWidth, component.width);
    }
    set.resizeWithoutConstraints(maxWidth + inset * 2, nextY - gutter + inset);

    return set;
  } catch (error) {
    if (set && !set.removed) set.remove();
    else for (const component of components) if (!component.removed) component.remove();
    for (const label of textNodes) if (!label.removed) label.remove();
    throw error;
  }
}

function organizeUiKit(button: ComponentSetNode, search: ComponentSetNode, sections: SectionNode[]): void {
  const existing = figma.currentPage.children.filter((node) => node !== button && node !== search)
    .map((node) => node.absoluteBoundingBox)
    .filter((bounds): bounds is Rect => bounds !== null);
  const placement = planUiKitPlacement(existing, button, search);
  for (const [name, set, bounds] of [
    ['Actions', button, placement.actions],
    ['Inputs', search, placement.inputs],
  ] as const) {
    const section = figma.createSection();
    sections.push(section);
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

function isGenerateUiKitMessage(value: unknown): value is { type: 'generate-ui-kit' } {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === 'generate-ui-kit';
}

function isGenerateBoundButtonMessage(value: unknown): value is {
  type: 'generate-bound-button'; diagnostics: DiagnosticInput[];
} {
  return typeof value === 'object' && value !== null && 'type' in value &&
    value.type === 'generate-bound-button' && 'diagnostics' in value && Array.isArray(value.diagnostics);
}

function isClearPackageMessage(value: unknown): value is { type: 'clear-package'; requestId: number } {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === 'clear-package' &&
    'requestId' in value && typeof value.requestId === 'number' &&
    Number.isSafeInteger(value.requestId) && value.requestId >= 0;
}

function isLoadPackageMessage(value: unknown): value is { type: 'load-package'; requestId: number; bytes: unknown } {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === 'load-package' &&
    'requestId' in value && typeof value.requestId === 'number' &&
    Number.isSafeInteger(value.requestId) && value.requestId >= 0 && 'bytes' in value;
}

function validateSharedTypography(data: ReturnType<typeof readButtonImport>): void {
  if (data.some((button) => button.text !== data[0].text ||
      button.fontFamily !== data[0].fontFamily || button.fontWeight !== data[0].fontWeight ||
      button.fontStyle !== data[0].fontStyle || button.lineHeight !== data[0].lineHeight ||
      button.letterSpacing !== data[0].letterSpacing)) {
    throw new Error('Button: texto ou tipografia diverge entre variants; o spike exige valores compartilhados.');
  }
}
