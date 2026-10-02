import { readFileExplorerTaggedRows, type FileExplorerTaggedRowModel } from './file-explorer-row-tag-data';
import { fontFailure, requiredFont } from './font-resolution';

/** Two observed Dark samples; their inset is scene geometry, not a hierarchy model. */
export async function generateFileExplorerTaggedRows(probe: unknown): Promise<{
  components: ComponentNode[];
  tagWidthsPx: Record<string, number>;
}> {
  const models = readFileExplorerTaggedRows(probe);
  const available = (await figma.listAvailableFontsAsync()).map((item) => item.fontName);
  const fonts = models.map((model) => ({
    label: requiredFont({ cssStack: model.labelTypography.fontFamily, platform: model.labelTypography.platform,
      weight: model.labelTypography.fontWeight, style: model.labelTypography.fontStyle }, available),
    tag: requiredFont({ cssStack: model.tagTypography.fontFamily, platform: model.tagTypography.platform,
      weight: model.tagTypography.fontWeight, style: model.tagTypography.fontStyle }, available),
  }));
  for (const font of fonts.flatMap((pair) => [pair.label, pair.tag])) {
    try { await figma.loadFontAsync(font); }
    catch { throw fontFailure(font, `Required font could not be loaded: ${font.family} / ${font.style}.`); }
  }
  figma.ui.postMessage({ type: 'typography', text: `Typography: ${fonts[0]!.label.family} / ${fonts[0]!.label.style} + ${fonts[0]!.tag.style} ✓` });

  let preview: FrameNode | undefined;
  try {
    preview = figma.createFrame();
    preview.name = 'Dark preview surface / tagged file rows';
    preview.resize(models[0]!.sample.width + 24, models[0]!.sample.height * 2 + 56);
    preview.fills = [{ type: 'SOLID', color: { r: 40 / 255, g: 40 / 255, b: 40 / 255 } }];
    preview.clipsContent = false;
    const components = models.map((model, index) =>
      createTaggedRow(model, fonts[index]!, preview!, 24 + index * (model.sample.height + 8)));
    const bounds = figma.currentPage.children.filter((node) => node !== preview)
      .map((node) => node.absoluteBoundingBox).filter((box): box is Rect => box !== null);
    preview.x = bounds.reduce((right, box) => Math.max(right, box.x + box.width), 0) + 64;
    preview.y = 0;
    figma.currentPage.selection = components;
    figma.viewport.scrollAndZoomIntoView([preview]);
    return { components, tagWidthsPx: Object.fromEntries(components.map((component, index) =>
      [models[index]!.tag, (component.findOne((node) => node.name === 'Tag') as FrameNode).width])) };
  } catch (error) {
    if (preview && !preview.removed) preview.remove();
    throw error;
  }
}

function createTaggedRow(model: FileExplorerTaggedRowModel, fonts: { label: FontName; tag: FontName },
  preview: FrameNode, y: number): ComponentNode {
  if (model.appearance.backgroundCss !== 'rgba(0, 0, 0, 0)' ||
      model.appearance.tagBackgroundCss !== 'rgba(0, 0, 0, 0)') {
    throw new Error('File Explorer tag: background observado não suportado.');
  }
  const component = figma.createComponent();
  component.name = `Obsidian / File Explorer Row / Tagged ${model.tag}`;
  component.description = 'Dark, is-unsupported observado. Inset inicial da cena; sem modelo de hierarquia.';
  preview.appendChild(component);
  component.layoutMode = 'HORIZONTAL';
  component.primaryAxisSizingMode = 'FIXED';
  component.counterAxisSizingMode = 'FIXED';
  component.primaryAxisAlignItems = 'MIN';
  component.counterAxisAlignItems = 'CENTER';
  component.itemSpacing = 0;
  component.resize(model.sample.width, model.sample.height);
  component.x = 12;
  component.y = y;
  component.paddingLeft = model.sample.labelInset;
  component.paddingRight = model.sample.rightInset;
  component.paddingTop = model.sample.topInset;
  component.paddingBottom = model.sample.bottomInset;
  component.cornerRadius = model.appearance.radius;
  component.fills = [];
  component.strokes = [];
  component.clipsContent = false;
  component.constraints = { horizontal: 'STRETCH', vertical: 'MIN' };

  const label = figma.createText();
  label.name = 'Label';
  component.appendChild(label);
  label.fontName = fonts.label;
  label.fontSize = model.labelTypography.fontSize;
  label.lineHeight = { unit: 'PIXELS', value: model.labelTypography.lineHeight };
  label.fills = [{ type: 'SOLID', color: opaqueRgb(model.appearance.labelColorCss) }];
  label.characters = model.label;
  if (label.hasMissingFont || label.width <= 0 || label.height <= 0) {
    throw fontFailure(fonts.label, 'File Explorer tag: Label não renderizou.');
  }
  const labelProperty = component.addComponentProperty('Label', 'TEXT', model.label);
  label.componentPropertyReferences = { characters: labelProperty };
  label.textAutoResize = 'NONE';
  label.resize(label.width, model.labelTypography.lineHeight);
  label.textTruncation = 'ENDING';
  label.layoutGrow = 1;

  const tag = figma.createFrame();
  tag.name = 'Tag';
  component.appendChild(tag);
  tag.layoutMode = 'HORIZONTAL';
  tag.primaryAxisSizingMode = 'AUTO';
  tag.counterAxisSizingMode = 'AUTO';
  tag.counterAxisAlignItems = 'CENTER';
  tag.paddingLeft = model.appearance.tagPaddingX;
  tag.paddingRight = model.appearance.tagPaddingX;
  tag.paddingTop = 0;
  tag.paddingBottom = 0;
  tag.itemSpacing = 0;
  tag.cornerRadius = model.appearance.tagRadius;
  tag.fills = [];
  tag.strokes = [];
  tag.clipsContent = false;
  const tagText = figma.createText();
  tagText.name = 'Tag text';
  tag.appendChild(tagText);
  tagText.fontName = fonts.tag;
  tagText.fontSize = model.tagTypography.fontSize;
  tagText.lineHeight = { unit: 'PIXELS', value: model.tagTypography.lineHeight };
  tagText.letterSpacing = { unit: 'PIXELS', value: model.tagTypography.letterSpacing };
  tagText.fills = [{ type: 'SOLID', color: opaqueRgb(model.appearance.tagColorCss) }];
  tagText.characters = model.tag;
  tagText.textAutoResize = 'WIDTH_AND_HEIGHT';
  if (tagText.hasMissingFont || tagText.width <= 0 || tagText.height <= 0) {
    throw fontFailure(fonts.tag, 'File Explorer tag: Tag não renderizou.');
  }

  const mismatches = [
    component.width !== model.sample.width ? `row.width=${component.width}` : null,
    component.height !== model.sample.height ? `row.height=${component.height}` : null,
    component.layoutMode !== 'HORIZONTAL' ? `row.layoutMode=${component.layoutMode}` : null,
    component.constraints.horizontal !== 'STRETCH' ? `row.constraint=${component.constraints.horizontal}` : null,
    label.layoutGrow !== 1 ? `label.layoutGrow=${label.layoutGrow}` : null,
    label.textTruncation !== 'ENDING' ? `label.textTruncation=${label.textTruncation}` : null,
    label.textAutoResize !== 'NONE' && label.textAutoResize !== 'TRUNCATE' ?
      `label.textAutoResize=${label.textAutoResize}` : null,
    Math.abs(tag.x + tag.width - (component.width - model.sample.rightInset)) > 0.05 ?
      `tag.right=${component.width - tag.x - tag.width}` : null,
    tagText.characters !== model.tag ? `tag.text=${tagText.characters}` : null,
    label.componentPropertyReferences?.characters !== labelProperty ? 'label.propertyReference' : null,
  ].filter((item): item is string => item !== null);
  if (mismatches.length) throw new Error(`File Explorer tag: Figma alterou ${mismatches.join('; ')}.`);
  return component;
}

function opaqueRgb(css: string): RGB {
  const match = /^rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)$/.exec(css);
  if (!match) throw new Error('File Explorer tag: cor não suportada.');
  const channels = match.slice(1).map(Number);
  if (channels.some((channel) => channel > 255)) throw new Error('File Explorer tag: cor inválida.');
  return { r: channels[0]! / 255, g: channels[1]! / 255, b: channels[2]! / 255 };
}
