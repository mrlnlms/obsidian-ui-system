import { fontFailure, requiredFont } from './font-resolution';
import { readSearchViewModel, type SearchViewGroup, type SearchViewModel } from './search-view-data';
import type { IconButtonLibrary } from './icon-button-generation';
import { boundUiKitPaint, type UiKitThemeVariables } from './ui-kit-theme';

// Sort chevrons belong only to this existing Search composition; no observed SVG
// for this drawing is present in the fixed canonical glyph evidence.
const SORT_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>';

/** Creates a new reusable Search composition and duplicates the validated Side Panel preview. */
export async function composeSearchInSidePanel(probe: unknown,
  searchSet: ComponentSetNode, host: {
    panel: ComponentNode; group: ComponentSetNode; preview: FrameNode;
  }, iconButtons: IconButtonLibrary, theme: UiKitThemeVariables): Promise<{
  component: ComponentNode; preview: FrameNode;
}> {
  const model = readSearchViewModel(probe);
  const target = await inspectSidePanelHost(host);
  const existingRoots = new Set(figma.currentPage.children.map((node) => node.id));
  let preview: FrameNode | undefined;
  try {
    const component = await generateSearchView(probe, searchSet, iconButtons, theme);

    preview = target.preview.clone();
    preview.name = 'Side Panel / Dark resize preview / Search';
    const bounds = figma.currentPage.children.filter((node) => node !== preview)
      .map((node) => node.absoluteBoundingBox).filter((box): box is Rect => box !== null);
    preview.x = bounds.reduce((right, box) => Math.max(right, box.x + box.width), 0) + 64;
    preview.y = target.preview.y;
    const instances = preview.children.filter((node): node is InstanceNode => node.type === 'INSTANCE');
    if (instances.length !== 2) throw new Error('Search View: a cópia do preview perdeu suas duas larguras.');
    for (const instance of instances) {
      instance.setProperties({ [target.viewProperty]: component.id,
        [target.tabProperty]: target.searchTab.id });
      await verifyHostedSearch(instance, component, target.searchTab, model);
    }
    const resizeProbe = target.panel.createInstance();
    try {
      resizeProbe.setProperties({ [target.viewProperty]: component.id,
        [target.tabProperty]: target.searchTab.id });
      resizeProbe.resize(300, 480);
      await verifyHostedSearch(resizeProbe, component, target.searchTab, model);
    } finally { resizeProbe.remove(); }
    figma.currentPage.selection = [preview];
    figma.viewport.scrollAndZoomIntoView([preview]);
    return { component, preview };
  } catch (error) {
    for (const node of figma.currentPage.children) {
      if (!existingRoots.has(node.id) && !node.removed) node.remove();
    }
    throw error;
  }
}

async function inspectSidePanelHost(host: {
  panel: ComponentNode; group: ComponentSetNode; preview: FrameNode;
}): Promise<{
  preview: FrameNode; panel: ComponentNode; searchTab: ComponentNode;
  viewProperty: string; tabProperty: string;
}> {
  const { preview, panel, group: set } = host;
  const instances = preview.children.filter((node): node is InstanceNode => node.type === 'INSTANCE');
  if (preview.name !== 'Side Panel / Dark resize preview' || instances.length !== 2) {
    throw new Error('Search View: preview validado do Side Panel incompatível.');
  }
  if (panel.name !== 'Obsidian / Side Panel / Left / Dark' ||
      (await instances[0]!.getMainComponentAsync())?.id !== panel.id ||
      (await instances[1]!.getMainComponentAsync())?.id !== panel.id) {
    throw new Error('Search View: as duas larguras não usam o mesmo Side Panel validado.');
  }
  const group = panel.findOne((node) => node.type === 'INSTANCE' && node.name === 'WorkspaceTabs');
  if (group?.type !== 'INSTANCE') throw new Error('Search View: Tab Group ausente no Side Panel.');
  const mainGroup = await group.getMainComponentAsync();
  if (mainGroup?.parent?.id !== set.id || set.name !== 'Obsidian / WorkspaceTabs / Sidedock') {
    throw new Error('Search View: WorkspaceTabs validado não encontrado.');
  }
  const searchTab = set.children.find((node): node is ComponentNode =>
    node.type === 'COMPONENT' && node.variantProperties?.Active === 'Search');
  if (!searchTab) throw new Error('Search View: variant Search ausente no Tab Group.');
  return { preview, panel, searchTab,
    viewProperty: findProperty(panel, 'Hosted View', 'INSTANCE_SWAP'),
    tabProperty: findProperty(panel, 'Tab group', 'INSTANCE_SWAP') };
}

function findProperty(component: ComponentNode | ComponentSetNode, name: string,
  type: 'TEXT' | 'INSTANCE_SWAP'): string {
  const key = Object.keys(component.componentPropertyDefinitions).find((item) =>
    item.startsWith(`${name}#`) && component.componentPropertyDefinitions[item]?.type === type);
  if (!key) throw new Error(`Search View: propriedade ${name} ausente em ${component.name}.`);
  return key;
}

async function verifyHostedSearch(panelInstance: InstanceNode, content: ComponentNode,
  searchTab: ComponentNode, model: SearchViewModel): Promise<void> {
  const hosted = panelInstance.findOne((node) => node.type === 'INSTANCE' &&
    node.name === 'Hosted View');
  const tabs = panelInstance.findOne((node) => node.type === 'INSTANCE' &&
    node.name === 'WorkspaceTabs');
  if (hosted?.type !== 'INSTANCE' || tabs?.type !== 'INSTANCE') {
    throw new Error('Search View: a cópia do Side Panel perdeu os slots hospedados.');
  }
  hosted.layoutSizingHorizontal = 'FILL';
  hosted.layoutGrow = 1;
  hosted.minWidth = 1;
  const controls = hosted.findOne((node) => node.name === 'Search controls');
  const results = hosted.findOne((node) => node.name === 'Grouped search results');
  const input = hosted.findOne((node) => node.name === 'Global search input');
  const viewport = hosted.findOne((node) => node.name === 'Text viewport');
  const query = hosted.findOne((node) => node.name === 'Query');
  const matchCase = hosted.findOne((node) => node.name === 'Match case');
  const count = hosted.findOne((node) => node.name === 'Count');
  const expectedHeight = panelInstance.height - 40;
  const expectedInputWidth = panelInstance.width - 2 * model.geometry.inset -
    model.geometry.searchSettingsWidth - model.geometry.searchRowGap;
  if ((await hosted.getMainComponentAsync())?.id !== content.id ||
      (await tabs.getMainComponentAsync())?.id !== searchTab.id ||
      Math.abs(hosted.width - panelInstance.width) > 0.5 ||
      Math.abs(hosted.height - expectedHeight) > 0.5 ||
      Math.abs((controls?.width ?? 0) - hosted.width) > 0.5 ||
      Math.abs((results?.width ?? 0) - hosted.width) > 0.5 ||
      Math.abs((input?.width ?? 0) - expectedInputWidth) > 0.5 ||
      !viewport || !matchCase ||
      query?.type !== 'TEXT' || query.characters !== model.query ||
      count?.type !== 'TEXT' || count.characters !== model.resultCount ||
      matchCase.x < 0 || matchCase.x + matchCase.width > (input?.width ?? 0) + 0.5) {
    throw new Error(`Search View: conteúdo não acompanhou o Side Panel em ${panelInstance.width} px. ` +
      JSON.stringify({ panel: [panelInstance.width, panelInstance.height],
        hosted: [hosted.width, hosted.height], controls: controls?.width,
        results: results?.width, input: input?.width, expectedInputWidth,
        viewport: viewport ? [viewport.x, viewport.width] : null,
        matchCase: matchCase ? [matchCase.x, matchCase.width] : null,
        query: query?.type === 'TEXT' ? query.characters : null,
        count: count?.type === 'TEXT' ? count.characters : null }));
  }
}

/** First bounded Dark Search View content; suitable for the Side Panel Hosted View slot. */
export async function generateSearchView(probe: unknown,
  searchSet: ComponentSetNode, iconButtons: IconButtonLibrary,
  theme: UiKitThemeVariables): Promise<ComponentNode> {
  const model = readSearchViewModel(probe);
  const search = findFilledSearch(searchSet);
  const available = (await figma.listAvailableFontsAsync()).map((item) => item.fontName);
  const font = requiredFont({ cssStack: model.fontFamily, platform: 'macos', weight: 400,
    style: 'normal' }, available);
  try { await figma.loadFontAsync(font); }
  catch { throw fontFailure(font, `Required font could not be loaded: ${font.family} / ${font.style}.`); }
  const fontProbe = figma.createText();
  try {
    fontProbe.fontName = font;
    fontProbe.characters = model.query;
    if (fontProbe.hasMissingFont || fontProbe.width <= 0 || fontProbe.height <= 0) {
      throw fontFailure(font, 'Search View: a fonte exigida não renderizou.');
    }
  } finally { fontProbe.remove(); }
  figma.ui.postMessage({ type: 'typography', text: `Typography: ${font.family} / ${font.style} ✓` });

  let component: ComponentNode | undefined;
  const parts: ComponentNode[] = [];
  try {
    const field = createGlobalSearchField(model, search, iconButtons);
    parts.push(field);
    component = figma.createComponent();
    component.name = 'Obsidian / Search View / Dark';
    component.description = 'Conteúdo da Search View hospedada no Sidedock Dark: consulta, controles, contagem/ordem e resultados agrupados por arquivo. Cena observada com a consulta probe; labels e trechos são exemplos editáveis.';
    component.resize(model.width, model.height);
    component.layoutMode = 'VERTICAL';
    component.primaryAxisSizingMode = 'FIXED';
    component.counterAxisSizingMode = 'FIXED';
    component.itemSpacing = 0;
    component.fills = [paint(model.colors.background)];
    component.strokes = [];
    component.clipsContent = true;

    addSearchRow(component, model, field, parts, iconButtons);
    addResultsInfo(component, model, font, parts, iconButtons);
    const results = addResults(component, model, font, parts, iconButtons, theme);
    if (component.width !== model.width || results.width !== model.width) {
      throw new Error('Search View: propriedades ou largura da composição divergentes.');
    }
    const bounds = figma.currentPage.children.filter((node) => node !== component)
      .map((node) => node.absoluteBoundingBox).filter((box): box is Rect => box !== null);
    const startX = bounds.reduce((right, box) => Math.max(right, box.x + box.width), 0) + 64;
    component.x = startX;
    component.y = 0;
    let nextX = startX + component.width + 64;
    for (const part of parts) {
      part.x = nextX;
      part.y = 0;
      nextX += part.width + 24;
    }
    figma.currentPage.selection = [component];
    figma.viewport.scrollAndZoomIntoView([component]);
    return component;
  } catch (error) {
    if (component && !component.removed) component.remove();
    for (const part of parts) if (!part.removed) part.remove();
    throw error;
  }
}

function findFilledSearch(set: ComponentSetNode): { variant: ComponentNode; valueProperty: string } {
  const variant = set.children.find((node): node is ComponentNode =>
    node.type === 'COMPONENT' && node.variantProperties?.State === 'Filled');
  if (set.name !== 'Obsidian / Search' || !variant) {
    throw new Error('Search View: Component Set Obsidian / Search incompatível.');
  }
  return { variant, valueProperty: findProperty(set, 'Value', 'TEXT') };
}

function createGlobalSearchField(model: SearchViewModel,
  search: ReturnType<typeof findFilledSearch>, iconButtons: IconButtonLibrary): ComponentNode {
  const g = model.geometry;
  const width = model.width - 2 * g.inset - g.searchSettingsWidth - g.searchRowGap;
  const field = figma.createComponent();
  field.name = 'Obsidian / Search / Global / Dark';
  field.description = 'Campo global da Search View. Reutiliza a variant Filled de Obsidian / Search e acrescenta Match case.';
  field.resize(width, g.searchRowHeight);
  field.fills = [];
  field.strokes = [];
  field.clipsContent = true;
  const base = search.variant.createInstance();
  base.name = 'Global search input';
  field.appendChild(base);
  base.resize(width, g.searchRowHeight);
  base.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
  base.setProperties({ [search.valueProperty]: model.query });
  base.isExposedInstance = true;
  const viewport = base.findOne((node) => node.name === 'Text viewport');
  if (viewport?.type !== 'FRAME') throw new Error('Search View: viewport da Search Filled ausente.');
  viewport.resize(width - g.inputTextLeft - g.inputTextRight, viewport.height);
  const matchCase = iconButtons.create('Search / Match case', 'Input', 'Default', 'Opaque');
  field.appendChild(matchCase);
  matchCase.isExposedInstance = true;
  matchCase.name = 'Match case';
  matchCase.x = width - 60;
  matchCase.y = 5;
  matchCase.constraints = { horizontal: 'MAX', vertical: 'CENTER' };
  return field;
}

function addSearchRow(parent: ComponentNode, model: SearchViewModel,
  field: ComponentNode, parts: ComponentNode[], iconButtons: IconButtonLibrary): void {
  const g = model.geometry;
  const row = figma.createComponent();
  row.name = 'Obsidian / Search / Controls / Dark';
  row.resize(model.width, g.searchRowHeight + g.searchRowTop + g.searchRowBottom);
  row.fills = [];
  row.strokes = [];
  parts.push(row);
  row.layoutMode = 'HORIZONTAL';
  row.primaryAxisSizingMode = 'FIXED';
  row.counterAxisSizingMode = 'FIXED';
  row.counterAxisAlignItems = 'CENTER';
  row.paddingLeft = g.inset;
  row.paddingRight = g.inset;
  row.paddingTop = g.searchRowTop;
  row.paddingBottom = g.searchRowBottom;
  row.itemSpacing = g.searchRowGap;
  const input = field.createInstance();
  input.name = 'Global search input';
  row.appendChild(input);
  input.layoutGrow = 1;
  input.minWidth = 1;
  input.isExposedInstance = true;
  const settings = iconButtons.create('Search / Settings', 'Toolbar', 'Default', 'Opaque');
  settings.name = 'Search settings';
  row.appendChild(settings);
  settings.isExposedInstance = true;
  const instance = row.createInstance();
  instance.name = 'Search controls';
  parent.appendChild(instance);
  instance.layoutSizingHorizontal = 'FILL';
  instance.isExposedInstance = true;
}

function addResultsInfo(parent: ComponentNode, model: SearchViewModel, font: FontName,
  parts: ComponentNode[], glyphs: IconButtonLibrary): void {
  const g = model.geometry;
  const info = figma.createComponent();
  info.name = 'Obsidian / Search / Results Toolbar / Dark';
  info.resize(model.width, g.resultsInfoHeight);
  info.fills = [];
  info.strokes = [];
  parts.push(info);
  info.layoutMode = 'HORIZONTAL';
  info.primaryAxisSizingMode = 'FIXED';
  info.counterAxisSizingMode = 'FIXED';
  info.counterAxisAlignItems = 'MIN';
  info.paddingLeft = g.inset;
  info.paddingRight = g.inset;
  info.paddingBottom = 8;
  info.strokes = [paint(model.colors.inputBorder)];
  info.strokeBottomWeight = 1;
  info.strokeTopWeight = 0;
  info.strokeLeftWeight = 0;
  info.strokeRightWeight = 0;

  const countButton = frame(info, 'Result count', 78, 24);
  countButton.cornerRadius = 8;
  const count = textNode(countButton, 'Count', model.resultCount, font, 12, 15.6, model.colors.muted);
  count.x = 6;
  count.y = 4;
  observedIcon(countButton, 'More options', 'Search / More', glyphs, 16, 56, 4);

  const sort = frame(info, 'Sort order', model.width - 2 * g.inset - 78, 24);
  sort.layoutGrow = 1;
  sort.cornerRadius = 8;
  const labelView = frame(sort, 'Sort label viewport', sort.width - 26, 18);
  labelView.x = 9;
  labelView.y = 3;
  labelView.constraints = { horizontal: 'STRETCH', vertical: 'CENTER' };
  labelView.clipsContent = true;
  const label = textNode(labelView, 'Sort label', model.sortLabel, font, 12, 15.6, model.colors.muted);
  label.textAutoResize = 'NONE';
  label.resize(labelView.width, 18);
  label.textTruncation = 'ENDING';
  label.x = 0;
  label.y = 1;
  label.constraints = { horizontal: 'STRETCH', vertical: 'CENTER' };
  const chevrons = icon(sort, 'Sort chevrons', SORT_ICON, model.colors.muted, 16, sort.width - 20, 4);
  chevrons.constraints = { horizontal: 'MAX', vertical: 'CENTER' };
  const property = info.addComponentProperty('Result count', 'TEXT', model.resultCount);
  count.componentPropertyReferences = { characters: property };
  const instance = info.createInstance();
  instance.name = 'Results count and sort';
  parent.appendChild(instance);
  instance.layoutSizingHorizontal = 'FILL';
  instance.isExposedInstance = true;
}

function addResults(parent: ComponentNode, model: SearchViewModel, font: FontName,
  parts: ComponentNode[], glyphs: IconButtonLibrary, theme: UiKitThemeVariables): FrameNode {
  const g = model.geometry;
  const results = frame(parent, 'Grouped search results', model.width,
    model.height - g.searchRowTop - g.searchRowHeight - g.searchRowBottom - g.resultsInfoHeight);
  results.layoutMode = 'VERTICAL';
  results.primaryAxisSizingMode = 'FIXED';
  results.counterAxisSizingMode = 'FIXED';
  results.paddingLeft = g.inset;
  results.paddingRight = g.inset;
  results.paddingTop = g.resultsTopPadding;
  results.paddingBottom = g.inset;
  results.itemSpacing = 2;
  results.layoutSizingHorizontal = 'FILL';
  results.layoutGrow = 1;
  results.clipsContent = true;
  const matches = {
    divider: createMatchComponent(model, font, true, parts),
    last: createMatchComponent(model, font, false, parts),
  };
  for (const group of model.groups) addGroup(results, model, group, font, parts, matches,
    glyphs, theme);
  return results;
}

function createMatchComponent(model: SearchViewModel, font: FontName, divider: boolean,
  parts: ComponentNode[]): { component: ComponentNode; snippetProperty: string } {
  const g = model.geometry;
  const row = figma.createComponent();
  row.name = `Obsidian / Search / Match / Dark / ${divider ? 'Divider' : 'Last'}`;
  row.description = 'Linha de resultado reutilizável; Snippet é editável em cada instância.';
  row.resize(model.width - 2 * g.inset, 32);
  row.fills = [];
  row.strokes = [];
  parts.push(row);
  row.layoutMode = 'VERTICAL';
  row.primaryAxisSizingMode = 'AUTO';
  row.counterAxisSizingMode = 'FIXED';
  row.paddingLeft = g.matchHorizontalPadding;
  row.paddingRight = 20;
  row.paddingTop = g.matchVerticalPadding;
  row.paddingBottom = g.matchVerticalPadding + (divider ? 1 : 0);
  const label = textNode(row, 'Snippet', model.query, font, 12, 15.6, model.colors.muted);
  label.textAutoResize = 'HEIGHT';
  label.resize(Math.max(1, row.width - g.matchHorizontalPadding - 20), 16);
  label.layoutSizingHorizontal = 'FILL';
  if (divider) {
    row.strokes = [paint(model.colors.inputBorder)];
    row.strokeBottomWeight = 1;
    row.strokeTopWeight = 0;
    row.strokeLeftWeight = 0;
    row.strokeRightWeight = 0;
  }
  const snippetProperty = row.addComponentProperty('Snippet', 'TEXT', model.query);
  label.componentPropertyReferences = { characters: snippetProperty };
  return { component: row, snippetProperty };
}

function addGroup(parent: FrameNode, model: SearchViewModel, group: SearchViewGroup,
  font: FontName, parts: ComponentNode[], matches: {
    divider: ReturnType<typeof createMatchComponent>;
    last: ReturnType<typeof createMatchComponent>;
  }, glyphs: IconButtonLibrary, theme: UiKitThemeVariables): void {
  const g = model.geometry;
  const node = figma.createComponent();
  node.name = `Obsidian / Search / File Group / Dark / ${group.title.toLowerCase().includes(model.query.toLowerCase()) ? 'Title match' : 'Plain title'}`;
  node.resize(model.width - 2 * g.inset, g.titleHeight);
  node.fills = [];
  node.strokes = [];
  parts.push(node);
  node.layoutMode = 'VERTICAL';
  node.primaryAxisSizingMode = 'AUTO';
  node.counterAxisSizingMode = 'FIXED';
  node.itemSpacing = g.matchTopGap;
  // The 2 px inter-group spacing below adds to the observed 8 px after matches.
  node.paddingBottom = group.collapsed ? 0 : g.matchBottomGap - 2;

  const title = frame(node, 'File title', node.width, g.titleHeight);
  title.layoutSizingHorizontal = 'FILL';
  title.cornerRadius = 8;
  if (!group.collapsed) {
    const triangle = observedIcon(title, 'Disclosure', 'Search / Disclosure', glyphs, 10, 7, 7);
    triangle.opacity = 0.85;
  }
  const labelView = frame(title, 'File name', title.width - g.titleTextLeft - (group.matches.length ? 24 : 8), 17);
  labelView.x = g.titleTextLeft;
  labelView.y = 4;
  labelView.constraints = { horizontal: 'STRETCH', vertical: 'CENTER' };
  labelView.clipsContent = true;
  labelView.layoutMode = 'HORIZONTAL';
  labelView.primaryAxisSizingMode = 'FIXED';
  labelView.counterAxisSizingMode = 'FIXED';
  const matchAt = group.title.toLowerCase().lastIndexOf(model.query.toLowerCase());
  if (matchAt < 0) {
    const label = textNode(labelView, 'Title', group.title, font, 13, 16.9, model.colors.normal);
    label.componentPropertyReferences = { characters:
      node.addComponentProperty('Title', 'TEXT', group.title) };
  } else {
    const before = group.title.slice(0, matchAt);
    if (before) {
      labelView.itemSpacing = before.endsWith(' ') ? 3 : 0;
      const prefix = textNode(labelView, 'Title prefix', before.trimEnd(), font, 13, 16.9,
        model.colors.normal);
      prefix.componentPropertyReferences = { characters:
        node.addComponentProperty('Title prefix', 'TEXT', before.trimEnd()) };
    }
    const mark = frame(labelView, 'Matched title text', 1, 17);
    mark.layoutMode = 'HORIZONTAL';
    mark.primaryAxisSizingMode = 'AUTO';
    mark.counterAxisSizingMode = 'AUTO';
    const term = group.title.slice(matchAt, matchAt + model.query.length);
    const matchLabel = textNode(mark, 'Match', term, font, 13, 16.9, model.colors.normal);
    matchLabel.componentPropertyReferences = { characters:
      node.addComponentProperty('Matched title text', 'TEXT', term) };
    const underlay = figma.createRectangle();
    underlay.name = 'Match highlight underlay';
    mark.insertChild(0, underlay);
    underlay.layoutPositioning = 'ABSOLUTE';
    underlay.resize(mark.width, mark.height);
    underlay.x = 0;
    underlay.y = 0;
    underlay.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
    underlay.fills = [boundUiKitPaint(theme, 'matchHighlight')];
    underlay.strokes = [];
    underlay.opacity = theme.evidence.roles.matchHighlight.opacity!;
  }
  if (group.matches.length) {
    const flair = textNode(title, 'Match count', String(group.matches.length), font, 12, 12,
      model.colors.subtle);
    flair.x = title.width - 15;
    flair.y = 7;
    flair.constraints = { horizontal: 'MAX', vertical: 'CENTER' };
    flair.componentPropertyReferences = { characters:
      node.addComponentProperty('Match count', 'TEXT', String(group.matches.length)) };
  }
  if (!group.collapsed) {
  const matchArea = frame(node, 'File matches', node.width, 1);
  matchArea.layoutMode = 'VERTICAL';
  matchArea.primaryAxisSizingMode = 'AUTO';
  matchArea.counterAxisSizingMode = 'FIXED';
  matchArea.layoutSizingHorizontal = 'FILL';
  matchArea.cornerRadius = 4;
  matchArea.fills = [paint(model.colors.matchBackground)];
  matchArea.clipsContent = true;
  for (const [index, match] of group.matches.entries()) {
    const template = index < group.matches.length - 1 ? matches.divider : matches.last;
    const matchInstance = template.component.createInstance();
    matchInstance.name = `Match ${index + 1}`;
    matchArea.appendChild(matchInstance);
    matchInstance.layoutSizingHorizontal = 'FILL';
    matchInstance.isExposedInstance = true;
    matchInstance.setProperties({ [template.snippetProperty]: match.text });
    const label = matchInstance.findOne((child) => child.type === 'TEXT' && child.name === 'Snippet');
    if (label?.type !== 'TEXT' || label.characters !== match.text) {
      throw new Error('Search View: texto da instância Match divergiu.');
    }
    const matchIndex = match.text.toLowerCase().indexOf(model.query.toLowerCase());
    if (matchIndex >= 0) {
      const end = matchIndex + model.query.length;
      label.setRangeFills(matchIndex, end, [boundUiKitPaint(theme, 'textNormal')]);
      const fills = label.getRangeFills(matchIndex, end);
      if (!Array.isArray(fills) || !fills.some((fill) => fill.type === 'SOLID' &&
          fill.boundVariables?.color?.id === theme.colors.textNormal.id)) {
        throw new Error('Search View: trecho destacado não manteve a Variable de texto.');
      }
    }
  }
  }
  const instance = node.createInstance();
  instance.name = `File group / ${group.title}`;
  parent.appendChild(instance);
  instance.layoutSizingHorizontal = 'FILL';
  instance.isExposedInstance = true;
}

function frame(parent: ComponentNode | FrameNode, name: string, width: number, height: number): FrameNode {
  const node = figma.createFrame();
  node.name = name;
  parent.appendChild(node);
  node.resize(width, height);
  node.fills = [];
  node.strokes = [];
  return node;
}

function textNode(parent: ComponentNode | FrameNode, name: string, value: string,
  font: FontName, size: number, lineHeight: number, color: string): TextNode {
  const node = figma.createText();
  node.name = name;
  parent.appendChild(node);
  node.fontName = font;
  node.fontSize = size;
  node.lineHeight = { unit: 'PIXELS', value: lineHeight };
  node.fills = [paint(color)];
  node.characters = value;
  if (node.hasMissingFont || node.width <= 0 || node.height <= 0) {
    throw fontFailure(font, `Search View: texto ${name} não renderizou.`);
  }
  return node;
}

function icon(parent: ComponentNode | FrameNode, name: string, svg: string,
  color: string, size: number, x: number, y: number): FrameNode {
  const recolored = svg.replace(/currentColor/g, color).replace(/width="24"/, `width="${size}"`)
    .replace(/height="24"/, `height="${size}"`).replace(/width="12"/, `width="${size}"`)
    .replace(/height="12"/, `height="${size}"`);
  const node = figma.createNodeFromSvg(recolored);
  node.name = name;
  parent.appendChild(node);
  node.resize(size, size);
  node.x = x;
  node.y = y;
  return node;
}

function observedIcon(parent: ComponentNode | FrameNode, name: string, use: string,
  glyphs: IconButtonLibrary, size: number, x: number, y: number): InstanceNode {
  const node = glyphs.createGlyph(use, 'Muted', size);
  node.name = name;
  parent.appendChild(node);
  node.x = x;
  node.y = y;
  return node;
}

function paint(css: string): SolidPaint {
  const channels = /^rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)$/.exec(css)?.slice(1).map(Number);
  if (!channels || channels.some((value) => value > 255)) {
    throw new Error(`Search View: cor inválida: ${css}.`);
  }
  return { type: 'SOLID', color: { r: channels[0]! / 255, g: channels[1]! / 255,
    b: channels[2]! / 255 } };
}
