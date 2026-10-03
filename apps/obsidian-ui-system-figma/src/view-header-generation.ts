import { fontFailure, requiredFont } from './font-resolution';
import { readViewHeaderModel, type HeaderIcon, type HeaderRect, type HeaderText,
  type ViewHeaderModel } from './view-header-data';
import type { IconButtonLibrary } from './icon-button-generation';

/** Three bounded native components for the first visible Dark Markdown View Header. */
export async function generateViewHeader(probe: unknown, iconButtons: IconButtonLibrary): Promise<{
  component: ComponentNode; trail: ComponentNode; segment: ComponentNode; title: string;
}> {
  const model = readViewHeaderModel(probe);
  const available = (await figma.listAvailableFontsAsync()).map((item) => item.fontName);
  const font = requiredFont({ cssStack: model.typography.fontFamily, platform: model.typography.platform,
    weight: model.typography.fontWeight, style: model.typography.fontStyle }, available);
  try { await figma.loadFontAsync(font); }
  catch { throw fontFailure(font, `Required font could not be loaded: ${font.family} / ${font.style}.`); }
  figma.ui.postMessage({ type: 'typography', text: `Typography: ${font.family} / ${font.style} ✓` });

  let component: ComponentNode | undefined;
  let trail: ComponentNode | undefined;
  let segment: ComponentNode | undefined;
  try {
    const firstAncestor = model.breadcrumbs[0]!;
    const segmentResult = createSegment(firstAncestor, font, model.typography.fontSize,
      model.typography.lineHeight);
    segment = segmentResult.component;
    const trailResult = createTrail(model, segment, segmentResult.labelProperty, font);
    trail = trailResult.component;

    component = figma.createComponent();
    component.name = 'Obsidian / View Header / Markdown';
    component.description = 'Chrome compartilhado da View; primeira amostra visível Dark da Markdown View. Conteúdo e ações desta view.';
    component.layoutMode = 'HORIZONTAL';
    component.primaryAxisSizingMode = 'FIXED';
    component.counterAxisSizingMode = 'FIXED';
    component.primaryAxisAlignItems = 'MIN';
    component.counterAxisAlignItems = 'MIN';
    component.paddingLeft = model.sample.horizontalInset;
    component.paddingRight = model.sample.horizontalInset;
    component.paddingTop = 0;
    component.paddingBottom = model.sample.height - model.sample.contentHeight;
    component.itemSpacing = model.sample.gap;
    component.resize(model.sample.width, model.sample.height);
    component.fills = [{ type: 'SOLID', color: rgb(model.appearance.backgroundCss) }];
    component.strokes = [];
    component.clipsContent = true;

    const left = frame(component, 'Navigation', model.left);
    left.minWidth = model.left.width;
    left.maxWidth = model.left.width;
    model.navigation.forEach((icon) => addIcon(left, icon, model.left, iconButtons));

    const trailInstance = trail.createInstance();
    trailInstance.name = 'Breadcrumb Trail';
    component.appendChild(trailInstance);
    trailInstance.resize(model.titleArea.width, model.titleArea.height);
    trailInstance.layoutGrow = 1;
    trailInstance.minWidth = 1;
    trailInstance.isExposedInstance = true;

    const actions = frame(component, 'Actions', model.actionsArea);
    actions.minWidth = model.actionsArea.width;
    actions.maxWidth = model.actionsArea.width;
    model.actions.forEach((icon) => addIcon(actions, icon, model.actionsArea, iconButtons));

    const trailMain = await trailInstance.getMainComponentAsync();
    const mismatches = [
      component.width !== model.sample.width ? 'header.width' : null,
      component.height !== model.sample.height ? 'header.height' : null,
      component.layoutMode !== 'HORIZONTAL' ? 'header.layoutMode' : null,
      !component.clipsContent ? 'header.clipping' : null,
      trailInstance.layoutGrow !== 1 ? 'trail.layoutGrow' : null,
      left.minWidth !== model.left.width ? 'navigation.minWidth' : null,
      actions.minWidth !== model.actionsArea.width ? 'actions.minWidth' : null,
      !trailInstance.isExposedInstance ? 'trail.exposure' : null,
      trailMain?.id !== trail.id ? 'trail.mainComponent' : null,
      Math.abs(actions.x - model.actionsArea.x) > 0.5 ? 'actions.x' : null,
      trailResult.title.characters !== model.title.text ? 'title.characters' : null,
      component.findAll((node) => node.name.startsWith('Glyph / ')).length !==
        model.navigation.length + model.actions.length ? 'glyph.count' : null,
    ].filter((item): item is string => item !== null);
    if (mismatches.length) throw new Error(`View Header: Figma alterou ${mismatches.join(', ')}.`);

    verifyNestedProperties(component, trailResult.titleProperty, segmentResult.labelProperty, model);

    const bounds = figma.currentPage.children.filter((node) =>
      node !== component && node !== trail && node !== segment)
      .map((node) => node.absoluteBoundingBox).filter((box): box is Rect => box !== null);
    segment.x = bounds.reduce((right, box) => Math.max(right, box.x + box.width), 0) + 64;
    trail.x = segment.x + segment.width + 64;
    component.x = trail.x + trail.width + 64;
    segment.y = 0;
    trail.y = 0;
    component.y = 0;
    figma.currentPage.selection = [component];
    figma.viewport.scrollAndZoomIntoView([component]);
    return { component, trail, segment, title: model.title.text };
  } catch (error) {
    if (component && !component.removed) component.remove();
    if (trail && !trail.removed) trail.remove();
    if (segment && !segment.removed) segment.remove();
    throw error;
  }
}

function frame(parent: ComponentNode | FrameNode, name: string, rect: HeaderRect): FrameNode {
  const node = figma.createFrame();
  node.name = name;
  parent.appendChild(node);
  node.resize(rect.width, rect.height);
  node.x = rect.x;
  node.y = rect.y;
  node.layoutMode = 'NONE';
  node.fills = [];
  node.strokes = [];
  node.clipsContent = false;
  return node;
}

function createSegment(part: HeaderText, font: FontName, fontSize: number, lineHeight: number):
  { component: ComponentNode; labelProperty: string } {
  const component = figma.createComponent();
  try {
    component.name = 'Obsidian / Breadcrumb Segment / Dark';
    component.description = 'Segmento ancestral do View Header observado em Dark; Label editável e largura redimensionável.';
    component.layoutMode = 'HORIZONTAL';
    component.primaryAxisSizingMode = 'FIXED';
    component.counterAxisSizingMode = 'FIXED';
    component.counterAxisAlignItems = 'CENTER';
    component.paddingLeft = part.padding.left;
    component.paddingRight = part.padding.right;
    component.paddingTop = 0;
    component.paddingBottom = 0;
    component.fills = [];
    component.strokes = [];
    component.clipsContent = true;
    const label = figma.createText();
    label.name = 'Label';
    label.fontName = font;
    label.fontSize = fontSize;
    label.lineHeight = { unit: 'PIXELS', value: lineHeight };
    label.fills = [{ type: 'SOLID', color: rgb(part.colorCss) }];
    label.characters = part.text;
    if (label.hasMissingFont || label.width <= 0 || label.height <= 0) {
      throw fontFailure(font, 'View Header: Breadcrumb Segment não renderizou.');
    }
    const naturalWidth = label.width + part.padding.left + part.padding.right;
    component.appendChild(label);
    component.resize(naturalWidth, part.rect.height);
    const labelProperty = component.addComponentProperty('Label', 'TEXT', part.text);
    label.componentPropertyReferences = { characters: labelProperty };
    label.textAutoResize = 'NONE';
    label.resize(naturalWidth - part.padding.left - part.padding.right, lineHeight);
    label.layoutGrow = 1;
    label.textTruncation = 'ENDING';
    if (label.componentPropertyReferences?.characters !== labelProperty ||
        label.textTruncation !== 'ENDING' || component.layoutMode !== 'HORIZONTAL') {
      throw new Error('View Header: Breadcrumb Segment não preservou sua propriedade ou sizing.');
    }
    return { component, labelProperty };
  } catch (error) {
    if (!component.removed) component.remove();
    throw error;
  }
}

function createTrail(model: ViewHeaderModel, segment: ComponentNode,
  labelProperty: string, font: FontName): { component: ComponentNode; title: TextNode; titleProperty: string } {
  const component = figma.createComponent();
  try {
    component.name = 'Obsidian / Breadcrumb Trail / Markdown';
    component.description = 'Três ancestrais e título atual da amostra Markdown Dark; instâncias de Breadcrumb Segment.';
    component.resize(model.titleArea.width, model.titleArea.height);
    component.layoutMode = 'HORIZONTAL';
    component.primaryAxisSizingMode = 'FIXED';
    component.counterAxisSizingMode = 'FIXED';
    component.primaryAxisAlignItems = 'MIN';
    component.counterAxisAlignItems = 'CENTER';
    component.itemSpacing = model.title.rect.x - model.breadcrumbArea.x - model.breadcrumbArea.width;
    component.fills = [];
    component.strokes = [];
    component.clipsContent = true;

    const ancestors = frame(component, 'Ancestor trail', relative(model.breadcrumbArea, model.titleArea));
    ancestors.layoutMode = 'HORIZONTAL';
    ancestors.primaryAxisSizingMode = 'FIXED';
    ancestors.counterAxisSizingMode = 'FIXED';
    ancestors.counterAxisAlignItems = 'CENTER';
    ancestors.itemSpacing = 0;
    ancestors.layoutGrow = 1;
    ancestors.minWidth = 1;
    ancestors.clipsContent = true;
    let naturalWidth = 0;
    model.breadcrumbs.forEach((part, index) => {
      naturalWidth += index % 2 === 0 ?
        addSegmentInstance(ancestors, segment, labelProperty, part, Math.floor(index / 2) + 1,
          font, model.typography.fontSize, model.typography.lineHeight) :
        addSeparator(ancestors, part, Math.floor(index / 2) + 1, font,
          model.typography.fontSize, model.typography.lineHeight);
    });
    ancestors.maxWidth = naturalWidth;
    const { title, titleProperty } = addTitle(component, model.title, font,
      model.typography.fontSize, model.typography.lineHeight);
    if (naturalWidth <= model.breadcrumbArea.width || ancestors.layoutGrow !== 1 ||
        ancestors.maxWidth !== naturalWidth ||
        ancestors.children.filter((node) => node.type === 'INSTANCE').length !== 3) {
      throw new Error('View Header: composição do Breadcrumb Trail divergente.');
    }
    return { component, title, titleProperty };
  } catch (error) {
    if (!component.removed) component.remove();
    throw error;
  }
}

function addSegmentInstance(parent: FrameNode, segment: ComponentNode, labelProperty: string,
  part: HeaderText, position: number, font: FontName, fontSize: number, lineHeight: number): number {
  const naturalWidth = measureText(part.text, font, fontSize, lineHeight) +
    part.padding.left + part.padding.right;
  const instance = segment.createInstance();
  instance.name = `Breadcrumb Segment ${position}`;
  parent.appendChild(instance);
  instance.setProperties({ [labelProperty]: part.text });
  instance.resize(naturalWidth, part.rect.height);
  instance.minWidth = 1;
  instance.maxWidth = naturalWidth;
  instance.layoutGrow = 1;
  instance.isExposedInstance = true;
  if (instance.componentProperties[labelProperty]?.value !== part.text ||
      !instance.isExposedInstance || instance.layoutGrow !== 1) {
    throw new Error(`View Header: Breadcrumb Segment ${position} não ficou editável.`);
  }
  return naturalWidth;
}

function addSeparator(parent: FrameNode, part: HeaderText, position: number,
  font: FontName, fontSize: number, lineHeight: number): number {
  const width = measureText(part.text, font, fontSize, lineHeight) +
    part.padding.left + part.padding.right;
  const separator = frame(parent, `Separator ${position}`,
    { x: 0, y: 0, width, height: part.rect.height });
  separator.layoutMode = 'HORIZONTAL';
  separator.primaryAxisSizingMode = 'FIXED';
  separator.counterAxisSizingMode = 'FIXED';
  separator.counterAxisAlignItems = 'CENTER';
  separator.paddingLeft = part.padding.left;
  separator.paddingRight = part.padding.right;
  separator.minWidth = width;
  separator.maxWidth = width;
  const label = figma.createText();
  label.name = '/';
  separator.appendChild(label);
  label.fontName = font;
  label.fontSize = fontSize;
  label.lineHeight = { unit: 'PIXELS', value: lineHeight };
  label.fills = [{ type: 'SOLID', color: rgb(part.colorCss) }];
  label.characters = part.text;
  label.textAutoResize = 'WIDTH_AND_HEIGHT';
  return width;
}

function addTitle(parent: ComponentNode, part: HeaderText, font: FontName,
  fontSize: number, lineHeight: number): { title: TextNode; titleProperty: string } {
  const label = figma.createText();
  label.name = 'Current Title';
  parent.appendChild(label);
  label.fontName = font;
  label.fontSize = fontSize;
  label.lineHeight = { unit: 'PIXELS', value: lineHeight };
  label.fills = [{ type: 'SOLID', color: rgb(part.colorCss) }];
  label.characters = part.text;
  if (label.hasMissingFont || label.width <= 0 || label.height <= 0) {
    throw fontFailure(font, 'View Header: Title não renderizou.');
  }
  const naturalWidth = label.width;
  const titleProperty = parent.addComponentProperty('Title', 'TEXT', part.text);
  label.componentPropertyReferences = { characters: titleProperty };
  label.textAutoResize = 'NONE';
  label.resize(naturalWidth, lineHeight);
  label.minWidth = 1;
  label.maxWidth = naturalWidth;
  label.layoutGrow = 1;
  label.textTruncation = 'ENDING';
  label.maxLines = 1;
  return { title: label, titleProperty };
}

function measureText(value: string, font: FontName, fontSize: number, lineHeight: number): number {
  const label = figma.createText();
  try {
    label.fontName = font;
    label.fontSize = fontSize;
    label.lineHeight = { unit: 'PIXELS', value: lineHeight };
    label.characters = value;
    if (label.hasMissingFont || label.width <= 0) {
      throw fontFailure(font, 'View Header: texto do breadcrumb não renderizou.');
    }
    return label.width;
  } finally {
    label.remove();
  }
}

function verifyNestedProperties(component: ComponentNode, titleProperty: string,
  labelProperty: string, model: ViewHeaderModel): void {
  const instance = component.createInstance();
  try {
    const trail = instance.findOne((node) => node.type === 'INSTANCE' &&
      node.name === 'Breadcrumb Trail') as InstanceNode | null;
    const first = trail?.findOne((node) => node.type === 'INSTANCE' &&
      node.name === 'Breadcrumb Segment 1') as InstanceNode | null;
    if (!trail || !first || !instance.exposedInstances.some((node) => node.id === trail.id) ||
        !trail.exposedInstances.some((node) => node.id === first.id) ||
        trail.componentProperties[titleProperty]?.value !== model.title.text ||
        first.componentProperties[labelProperty]?.value !== model.breadcrumbs[0]!.text) {
      throw new Error('View Header: propriedades aninhadas não expostas na instance.');
    }
    trail.setProperties({ [titleProperty]: 'Edited title' });
    first.setProperties({ [labelProperty]: 'Edited ancestor' });
    const titleLabel = trail.findOne((node) => node.type === 'TEXT' &&
      node.name === 'Current Title') as TextNode | null;
    const ancestorText = first.findOne((node) => node.type === 'TEXT' &&
      node.name === 'Label') as TextNode | null;
    if (trail.componentProperties[titleProperty]?.value !== 'Edited title' ||
        first.componentProperties[labelProperty]?.value !== 'Edited ancestor' ||
        titleLabel?.characters !== 'Edited title' || ancestorText?.characters !== 'Edited ancestor') {
      throw new Error('View Header: edição das propriedades aninhadas falhou.');
    }
    instance.resize(133, component.height);
    const navigation = instance.findOne((node) => node.name === 'Navigation') as FrameNode | null;
    const actions = instance.findOne((node) => node.name === 'Actions') as FrameNode | null;
    if (Math.abs(instance.width - 133) > 0.5 || !instance.clipsContent || !navigation || !actions ||
        actions.x < navigation.x + navigation.width + model.sample.gap * 2 - 0.5 ||
        Math.abs(actions.width - model.actionsArea.width) > 0.5) {
      throw new Error('View Header: ações sobrepostas no resize estreito.');
    }
  } finally {
    instance.remove();
  }
}

function addIcon(parent: FrameNode, icon: HeaderIcon, parentRect: HeaderRect,
  iconButtons: IconButtonLibrary): void {
  const instance = iconButtons.create(`View Header / ${icon.name}`, 'Toolbar',
    icon.disabled ? 'Disabled' : 'Default');
  parent.appendChild(instance);
  instance.isExposedInstance = true;
  instance.x = icon.rect.x - parentRect.x;
  instance.y = icon.rect.y - parentRect.y;
  instance.name = `Glyph / ${icon.name}`;
  instance.constraints = { horizontal: 'MIN', vertical: 'MIN' };
  if (Math.abs(instance.width - icon.rect.width) > 0.05 ||
      Math.abs(instance.height - icon.rect.height) > 0.05) {
    throw new Error(`View Header: Icon Button ${icon.name} mudou de tamanho.`);
  }
}

function relative(rect: HeaderRect, parent: HeaderRect): HeaderRect {
  return { x: rect.x - parent.x, y: rect.y - parent.y, width: rect.width, height: rect.height };
}

function rgb(css: string): RGB {
  const match = /^rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)$/.exec(css);
  if (!match) throw new Error(`View Header: cor não suportada: ${css}.`);
  const channels = match.slice(1).map(Number);
  if (channels.some((value) => value > 255)) throw new Error('View Header: canal de cor inválido.');
  return { r: channels[0]! / 255, g: channels[1]! / 255, b: channels[2]! / 255 };
}
