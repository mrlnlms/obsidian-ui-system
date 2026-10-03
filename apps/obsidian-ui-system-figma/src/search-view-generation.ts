import { fontFailure, requiredFont } from './font-resolution';
import { readSearchViewModel, type SearchViewGroup, type SearchViewModel } from './search-view-data';

const SEARCH_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
const CLEAR_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M6 12C9.31371 12 12 9.31371 12 6C12 2.68629 9.31371 0 6 0C2.68629 0 0 2.68629 0 6C0 9.31371 2.68629 12 6 12ZM3.8705 3.09766L6.00003 5.22718L8.12955 3.09766L8.9024 3.8705L6.77287 6.00003L8.9024 8.12955L8.12955 8.9024L6.00003 6.77287L3.8705 8.9024L3.09766 8.12955L5.22718 6.00003L3.09766 3.8705L3.8705 3.09766Z" fill="currentColor"/></svg>';
const SORT_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>';

/** Reuses the existing Search content and duplicates the validated Side Panel preview. */
export async function composeSearchInSidePanel(probe: unknown): Promise<{
  component: ComponentNode; preview: FrameNode; reusedComponent: boolean;
}> {
  const model = readSearchViewModel(probe);
  const target = await findSidePanelPreview();
  const existing = figma.currentPage.children.filter((node): node is ComponentNode =>
    node.type === 'COMPONENT' && node.name === 'Obsidian / Search View / Dark')
    .sort((a, b) => b.x - a.x)[0];
  const component = existing ?? await generateSearchView(probe);
  let restoreInput: (() => void) | undefined;
  let preview: FrameNode | undefined;
  try {
    restoreInput = repairQueryInput(component, model);
    const queryProperty = findProperty(component, 'Query', 'TEXT');
    const countProperty = findProperty(component, 'Result count', 'TEXT');
    verifyResize(component, model, queryProperty, countProperty);

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
    return { component, preview, reusedComponent: !!existing };
  } catch (error) {
    if (preview && !preview.removed) preview.remove();
    if (existing) restoreInput?.();
    else if (!component.removed) component.remove();
    throw error;
  }
}

async function findSidePanelPreview(): Promise<{
  preview: FrameNode; panel: ComponentNode; searchTab: ComponentNode;
  viewProperty: string; tabProperty: string;
}> {
  const preview = figma.currentPage.children.filter((node): node is FrameNode =>
    node.type === 'FRAME' && node.name === 'Side Panel / Dark resize preview')
    .sort((a, b) => b.x - a.x)[0];
  const instances = preview?.children.filter((node): node is InstanceNode => node.type === 'INSTANCE');
  if (!preview || instances?.length !== 2) {
    throw new Error('Search View: o Side Panel / Dark resize preview validado precisa estar nesta página.');
  }
  const panel = await instances[0]!.getMainComponentAsync();
  if (!panel || panel.name !== 'Obsidian / Side Panel / Left / Dark' ||
      (await instances[1]!.getMainComponentAsync())?.id !== panel.id) {
    throw new Error('Search View: as duas larguras não usam o mesmo Side Panel validado.');
  }
  const group = panel.findOne((node) => node.type === 'INSTANCE' && node.name === 'WorkspaceTabs');
  if (group?.type !== 'INSTANCE') throw new Error('Search View: Tab Group ausente no Side Panel.');
  const mainGroup = await group.getMainComponentAsync();
  const set = mainGroup?.parent;
  if (set?.type !== 'COMPONENT_SET' || set.name !== 'Obsidian / WorkspaceTabs / Sidedock') {
    throw new Error('Search View: WorkspaceTabs validado não encontrado.');
  }
  const searchTab = set.children.find((node): node is ComponentNode =>
    node.type === 'COMPONENT' && node.variantProperties?.Active === 'Search');
  if (!searchTab) throw new Error('Search View: variant Search ausente no Tab Group.');
  return { preview, panel, searchTab,
    viewProperty: findProperty(panel, 'Hosted View', 'INSTANCE_SWAP'),
    tabProperty: findProperty(panel, 'Tab group', 'INSTANCE_SWAP') };
}

function findProperty(component: ComponentNode, name: string, type: 'TEXT' | 'INSTANCE_SWAP'): string {
  const key = Object.keys(component.componentPropertyDefinitions).find((item) =>
    item.startsWith(`${name}#`) && component.componentPropertyDefinitions[item]?.type === type);
  if (!key) throw new Error(`Search View: propriedade ${name} ausente em ${component.name}.`);
  return key;
}

function repairQueryInput(component: ComponentNode, model: SearchViewModel): () => void {
  const input = component.findOne((node) => node.type === 'FRAME' && node.name === 'Global search input');
  const viewport = component.findOne((node) => node.type === 'FRAME' && node.name === 'Query viewport');
  const query = component.findOne((node) => node.type === 'TEXT' && node.name === 'Query');
  if (input?.type !== 'FRAME' || viewport?.type !== 'FRAME' || query?.type !== 'TEXT' ||
      viewport.parent?.id !== input.id || query.parent?.id !== viewport.id) {
    throw new Error('Search View: o campo de busca existente não tem a estrutura esperada.');
  }
  const old = { viewportX: viewport.x, viewportY: viewport.y, viewportWidth: viewport.width,
    viewportHeight: viewport.height, viewportConstraints: viewport.constraints,
    queryX: query.x, queryY: query.y, queryWidth: query.width, queryHeight: query.height,
    queryAutoResize: query.textAutoResize, queryConstraints: query.constraints,
    queryAlign: query.textAlignHorizontal };
  const width = input.width - model.geometry.inputTextLeft - model.geometry.inputTextRight;
  if (width < 1) throw new Error('Search View: espaço de texto insuficiente no campo de busca.');
  viewport.resize(width, 22);
  viewport.x = model.geometry.inputTextLeft;
  viewport.y = 4;
  viewport.constraints = { horizontal: 'STRETCH', vertical: 'CENTER' };
  query.textAutoResize = 'NONE';
  query.resize(width, 17);
  query.textAlignHorizontal = 'LEFT';
  query.x = 0;
  query.y = 2.5;
  query.constraints = { horizontal: 'STRETCH', vertical: 'CENTER' };
  return () => {
    viewport.resize(old.viewportWidth, old.viewportHeight);
    viewport.x = old.viewportX;
    viewport.y = old.viewportY;
    viewport.constraints = old.viewportConstraints;
    query.textAutoResize = old.queryAutoResize;
    query.resize(old.queryWidth, old.queryHeight);
    query.x = old.queryX;
    query.y = old.queryY;
    query.textAlignHorizontal = old.queryAlign;
    query.constraints = old.queryConstraints;
  };
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
  const viewport = hosted.findOne((node) => node.name === 'Query viewport');
  const query = hosted.findOne((node) => node.name === 'Query');
  const matchCase = hosted.findOne((node) => node.name === 'Match case');
  const expectedHeight = panelInstance.height - 40;
  if ((await hosted.getMainComponentAsync())?.id !== content.id ||
      (await tabs.getMainComponentAsync())?.id !== searchTab.id ||
      Math.abs(hosted.width - panelInstance.width) > 0.5 ||
      Math.abs(hosted.height - expectedHeight) > 0.5 ||
      Math.abs((controls?.width ?? 0) - hosted.width) > 0.5 ||
      Math.abs((results?.width ?? 0) - hosted.width) > 0.5 ||
      !viewport || !query || !matchCase ||
      Math.abs(viewport.x - model.geometry.inputTextLeft) > 0.5 ||
      Math.abs(query.x) > 0.5 || Math.abs(query.width - viewport.width) > 0.5 ||
      viewport.x + viewport.width > matchCase.x + 0.5) {
    throw new Error(`Search View: conteúdo não acompanhou o Side Panel em ${panelInstance.width} px.`);
  }
}

/** First bounded Dark Search View content; suitable for the Side Panel Hosted View slot. */
export async function generateSearchView(probe: unknown): Promise<ComponentNode> {
  const model = readSearchViewModel(probe);
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
  try {
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

    const query = addSearchRow(component, model, font);
    const count = addResultsInfo(component, model, font);
    const results = addResults(component, model, font);
    const queryProperty = component.addComponentProperty('Query', 'TEXT', model.query);
    const countProperty = component.addComponentProperty('Result count', 'TEXT', model.resultCount);
    query.componentPropertyReferences = { characters: queryProperty };
    count.componentPropertyReferences = { characters: countProperty };
    if (query.componentPropertyReferences.characters !== queryProperty ||
        count.componentPropertyReferences.characters !== countProperty ||
        component.width !== model.width || results.width !== model.width) {
      throw new Error('Search View: propriedades ou largura da composição divergentes.');
    }
    verifyResize(component, model, queryProperty, countProperty);
    const bounds = figma.currentPage.children.filter((node) => node !== component)
      .map((node) => node.absoluteBoundingBox).filter((box): box is Rect => box !== null);
    component.x = bounds.reduce((right, box) => Math.max(right, box.x + box.width), 0) + 64;
    component.y = 0;
    figma.currentPage.selection = [component];
    figma.viewport.scrollAndZoomIntoView([component]);
    return component;
  } catch (error) {
    if (component && !component.removed) component.remove();
    throw error;
  }
}

function addSearchRow(parent: ComponentNode, model: SearchViewModel, font: FontName): TextNode {
  const g = model.geometry;
  const row = frame(parent, 'Search controls', model.width, g.searchRowHeight + g.searchRowTop + g.searchRowBottom);
  row.layoutMode = 'HORIZONTAL';
  row.primaryAxisSizingMode = 'FIXED';
  row.counterAxisSizingMode = 'FIXED';
  row.counterAxisAlignItems = 'CENTER';
  row.paddingLeft = g.inset;
  row.paddingRight = g.inset;
  row.paddingTop = g.searchRowTop;
  row.paddingBottom = g.searchRowBottom;
  row.itemSpacing = g.searchRowGap;
  row.layoutSizingHorizontal = 'FILL';

  const input = frame(row, 'Global search input', model.width - 2 * g.inset - g.searchSettingsWidth - g.searchRowGap, 30);
  input.layoutGrow = 1;
  input.fills = [paint(model.colors.input)];
  input.strokes = [paint(model.colors.inputBorder)];
  input.strokeWeight = 1;
  input.strokeAlign = 'INSIDE';
  input.cornerRadius = 100;
  input.clipsContent = true;
  // Let the row settle before positioning children inside the growing input.
  const settings = frame(row, 'Search settings', g.searchSettingsWidth, 24);
  icon(settings, 'Settings icon', model.icons.settings, model.colors.muted, 16, 6, 4);
  icon(input, 'Search icon', SEARCH_ICON, model.colors.muted, 16, 8, 7);

  const viewport = frame(input, 'Query viewport', input.width - g.inputTextLeft - g.inputTextRight, 22);
  viewport.x = g.inputTextLeft;
  viewport.y = 4;
  viewport.constraints = { horizontal: 'STRETCH', vertical: 'CENTER' };
  viewport.clipsContent = true;
  const query = textNode(viewport, 'Query', model.query, font, 13, 17, model.colors.normal);
  query.textAutoResize = 'NONE';
  query.resize(viewport.width, 17);
  query.textAlignHorizontal = 'LEFT';
  query.x = 0;
  query.y = 2.5;
  query.constraints = { horizontal: 'STRETCH', vertical: 'CENTER' };

  const matchCase = frame(input, 'Match case', 24, 20);
  matchCase.x = input.width - 60;
  matchCase.y = 5;
  matchCase.constraints = { horizontal: 'MAX', vertical: 'CENTER' };
  icon(matchCase, 'Match case icon', model.icons.matchCase, model.colors.muted, 16, 4, 2);
  const clear = frame(input, 'Clear query', 28, 30);
  clear.x = input.width - 30;
  clear.y = 0;
  clear.constraints = { horizontal: 'MAX', vertical: 'CENTER' };
  icon(clear, 'Clear icon', CLEAR_ICON, model.colors.muted, 13, 7.5, 8.5);

  return query;
}

function addResultsInfo(parent: ComponentNode, model: SearchViewModel, font: FontName): TextNode {
  const g = model.geometry;
  const info = frame(parent, 'Results count and sort', model.width, g.resultsInfoHeight);
  info.layoutMode = 'HORIZONTAL';
  info.primaryAxisSizingMode = 'FIXED';
  info.counterAxisSizingMode = 'FIXED';
  info.counterAxisAlignItems = 'MIN';
  info.paddingLeft = g.inset;
  info.paddingRight = g.inset;
  info.paddingBottom = 8;
  info.layoutSizingHorizontal = 'FILL';
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
  icon(countButton, 'More options', model.icons.more, model.colors.muted, 16, 56, 4);

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
  return count;
}

function addResults(parent: ComponentNode, model: SearchViewModel, font: FontName): FrameNode {
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
  for (const group of model.groups) addGroup(results, model, group, font);
  return results;
}

function addGroup(parent: FrameNode, model: SearchViewModel, group: SearchViewGroup,
  font: FontName): void {
  const g = model.geometry;
  const node = frame(parent, `File group / ${group.title}`, model.width - 2 * g.inset, g.titleHeight);
  node.layoutMode = 'VERTICAL';
  node.primaryAxisSizingMode = 'AUTO';
  node.counterAxisSizingMode = 'FIXED';
  node.itemSpacing = g.matchTopGap;
  // The 2 px inter-group spacing below adds to the observed 8 px after matches.
  node.paddingBottom = group.collapsed ? 0 : g.matchBottomGap - 2;
  node.layoutSizingHorizontal = 'FILL';

  const title = frame(node, 'File title', node.width, g.titleHeight);
  title.layoutSizingHorizontal = 'FILL';
  title.cornerRadius = 8;
  if (!group.collapsed) {
    const triangle = icon(title, 'Disclosure', model.icons.disclosure, model.colors.muted, 10, 7, 7);
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
    textNode(labelView, 'Title', group.title, font, 13, 16.9, model.colors.normal);
  } else {
    const before = group.title.slice(0, matchAt);
    if (before) textNode(labelView, 'Title prefix', before, font, 13, 16.9, model.colors.normal);
    const mark = frame(labelView, 'Matched title text', 1, 17);
    mark.layoutMode = 'HORIZONTAL';
    mark.primaryAxisSizingMode = 'AUTO';
    mark.counterAxisSizingMode = 'AUTO';
    mark.fills = [{ type: 'SOLID', color: { r: 222 / 255, g: 222 / 255, b: 113 / 255 },
      opacity: 0.3 }];
    textNode(mark, 'Match', group.title.slice(matchAt, matchAt + model.query.length),
      font, 13, 16.9, model.colors.normal);
  }
  if (group.matches.length) {
    const flair = textNode(title, 'Match count', String(group.matches.length), font, 12, 12,
      model.colors.subtle);
    flair.x = title.width - 15;
    flair.y = 7;
    flair.constraints = { horizontal: 'MAX', vertical: 'CENTER' };
  }
  if (group.collapsed) return;
  const matchArea = frame(node, 'File matches', node.width, 1);
  matchArea.layoutMode = 'VERTICAL';
  matchArea.primaryAxisSizingMode = 'AUTO';
  matchArea.counterAxisSizingMode = 'FIXED';
  matchArea.layoutSizingHorizontal = 'FILL';
  matchArea.cornerRadius = 4;
  matchArea.fills = [paint(model.colors.matchBackground)];
  matchArea.clipsContent = true;
  for (const [index, match] of group.matches.entries()) {
    const row = frame(matchArea, `Match ${index + 1}`, matchArea.width, match.height);
    row.layoutMode = 'VERTICAL';
    row.primaryAxisSizingMode = 'AUTO';
    row.counterAxisSizingMode = 'FIXED';
    row.paddingLeft = g.matchHorizontalPadding;
    row.paddingRight = 20;
    row.paddingTop = g.matchVerticalPadding;
    row.paddingBottom = g.matchVerticalPadding + (index < group.matches.length - 1 ? 1 : 0);
    row.layoutSizingHorizontal = 'FILL';
    const label = textNode(row, 'Snippet', match.text, font, 12, 15.6, model.colors.muted);
    label.textAutoResize = 'HEIGHT';
    label.resize(Math.max(1, matchArea.width - g.matchHorizontalPadding - 20), 16);
    label.layoutSizingHorizontal = 'FILL';
    const matchIndex = match.text.toLowerCase().indexOf(model.query.toLowerCase());
    if (matchIndex >= 0) label.setRangeFills(matchIndex, matchIndex + model.query.length,
      [paint(model.colors.normal)]);
    if (index < group.matches.length - 1) {
      row.strokes = [paint(model.colors.inputBorder)];
      row.strokeBottomWeight = 1;
      row.strokeTopWeight = 0;
      row.strokeLeftWeight = 0;
      row.strokeRightWeight = 0;
    }
  }
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

function paint(css: string): SolidPaint {
  const channels = /^rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)$/.exec(css)?.slice(1).map(Number);
  if (!channels || channels.some((value) => value > 255)) {
    throw new Error(`Search View: cor inválida: ${css}.`);
  }
  return { type: 'SOLID', color: { r: channels[0]! / 255, g: channels[1]! / 255,
    b: channels[2]! / 255 } };
}

function verifyResize(component: ComponentNode, model: SearchViewModel,
  queryProperty: string, countProperty: string): void {
  const instance = component.createInstance();
  try {
    instance.setProperties({ [queryProperty]: 'sample', [countProperty]: '7 results' });
    instance.resize(242, 480);
    const controls = instance.findOne((node) => node.name === 'Search controls');
    const results = instance.findOne((node) => node.name === 'Grouped search results');
    const input = instance.findOne((node) => node.name === 'Global search input');
    const viewport = instance.findOne((node) => node.name === 'Query viewport');
    const matchCase = instance.findOne((node) => node.name === 'Match case');
    const query = instance.findOne((node) => node.name === 'Query') as TextNode | null;
    const count = instance.findOne((node) => node.name === 'Count') as TextNode | null;
    if (Math.abs(instance.width - 242) > 0.5 || Math.abs(instance.height - 480) > 0.5 ||
        Math.abs((controls?.width ?? 0) - 242) > 0.5 ||
        Math.abs((results?.width ?? 0) - 242) > 0.5 ||
        Math.abs((input?.width ?? 0) - (242 - 2 * model.geometry.inset -
          model.geometry.searchSettingsWidth - model.geometry.searchRowGap)) > 0.5 ||
        Math.abs((viewport?.x ?? 0) - model.geometry.inputTextLeft) > 0.5 ||
        Math.abs((viewport?.width ?? 0) - ((input?.width ?? 0) -
          model.geometry.inputTextLeft - model.geometry.inputTextRight)) > 0.5 ||
        Math.abs((query?.width ?? 0) - (viewport?.width ?? 0)) > 0.5 ||
        !matchCase || (viewport?.x ?? 0) + (viewport?.width ?? 0) > matchCase.x + 0.5 ||
        query?.characters !== 'sample' || count?.characters !== '7 results') {
      throw new Error('Search View: resize ou propriedades da instância divergentes.');
    }
  } finally { instance.remove(); }
}
