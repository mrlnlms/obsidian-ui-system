import { fileExplorerBackgroundPaint } from './file-explorer-row-color';
import { readFileExplorerRowImport } from './file-explorer-row-data';
import { fontFailure, requiredFont } from './font-resolution';

/** One observed Active Dark row, independently of either Figma Package action. */
export async function generateFileExplorerRow(probe: unknown): Promise<{ component: ComponentNode; labelWidthPx: number }> {
  const model = readFileExplorerRowImport(probe);
  const background = fileExplorerBackgroundPaint(model.appearance.backgroundCss);
  const textColor = opaqueRgb(model.appearance.labelColorCss);
  const available = await figma.listAvailableFontsAsync();
  const font = requiredFont({ cssStack: model.typography.fontFamily, platform: model.typography.platform,
    weight: model.typography.fontWeight, style: model.typography.fontStyle },
  available.map((item) => item.fontName));
  try { await figma.loadFontAsync(font); }
  catch { throw fontFailure(font, `Required font could not be loaded: ${font.family} / ${font.style}.`); }

  const fontProbe = figma.createText();
  let baselineLabelWidthPx: number;
  let baselineLabelHeightPx: number;
  try {
    fontProbe.fontName = font;
    fontProbe.fontSize = model.typography.fontSize;
    fontProbe.lineHeight = { unit: 'PIXELS', value: model.typography.lineHeight };
    fontProbe.textAutoResize = 'WIDTH_AND_HEIGHT';
    fontProbe.characters = model.label;
    if (fontProbe.hasMissingFont || fontProbe.width <= 0 || fontProbe.height <= 0) {
      throw fontFailure(font, `Required font did not render: ${font.family} / ${font.style}.`);
    }
    baselineLabelWidthPx = fontProbe.width;
    baselineLabelHeightPx = fontProbe.height;
  } finally { fontProbe.remove(); }
  figma.ui.postMessage({ type: 'typography', text: `Typography: ${font.family} / ${font.style} ✓` });

  let preview: FrameNode | undefined;
  let component: ComponentNode | undefined;
  try {
    // Preview uses the observed Dark --background-secondary token (#282828).
    // It is a separate canvas surface, never a child of the ComponentNode.
    preview = figma.createFrame();
    preview.name = 'Dark preview surface / --background-secondary';
    preview.resize(model.sizePx.width + 24, model.sizePx.height + 48);
    preview.fills = [{ type: 'SOLID', color: { r: 40 / 255, g: 40 / 255, b: 40 / 255 } }];
    preview.clipsContent = false;

    component = figma.createComponent();
    component.name = 'Obsidian / File Explorer Row / Active';
    component.description = 'Active Dark. Largura acompanha o host; altura inicial observada.';
    preview.appendChild(component);
    component.layoutMode = 'NONE';
    component.resize(model.sizePx.width, model.sizePx.height);
    component.x = 12;
    component.y = 24;
    component.paddingTop = model.appearance.padding.top;
    component.paddingRight = model.appearance.padding.right;
    component.paddingBottom = model.appearance.padding.bottom;
    component.paddingLeft = model.appearance.padding.left;
    component.cornerRadius = model.appearance.radius;
    component.fills = [background];
    component.strokes = [];
    component.clipsContent = false;

    const label = figma.createText();
    label.name = 'Label';
    component.appendChild(label);
    label.fontName = font;
    label.fontSize = model.typography.fontSize;
    label.lineHeight = { unit: 'PIXELS', value: model.typography.lineHeight };
    label.fills = [{ type: 'SOLID', color: textColor, opacity: 1 }];
    label.characters = model.label;
    if (label.hasMissingFont || label.width <= 0 || label.height <= 0) {
      throw fontFailure(font, `File Explorer row: TextNode did not render: ${font.family} / ${font.style}.`);
    }
    const labelProperty = component.addComponentProperty('Label', 'TEXT', model.label);
    label.componentPropertyReferences = { characters: labelProperty };
    // The box keeps the observed left and right insets as the row resizes.
    // Apply resize behavior after binding the editable property, then inspect Figma's readback.
    label.textAutoResize = 'NONE';
    label.resize(model.sizePx.width - model.labelOffsetPx.x - model.appearance.padding.right,
      baselineLabelHeightPx);
    label.textTruncation = 'ENDING';
    label.x = model.labelOffsetPx.x;
    label.y = model.labelOffsetPx.y;
    label.constraints = { horizontal: 'STRETCH', vertical: 'MIN' };
    component.constraints = { horizontal: 'STRETCH', vertical: 'MIN' };
    const expectedLabelWidth = model.sizePx.width - model.labelOffsetPx.x - model.appearance.padding.right;
    const mismatches = [
      component.width !== model.sizePx.width ? `row.width=${component.width}` : null,
      component.height !== model.sizePx.height ? `row.height=${component.height}` : null,
      component.layoutMode !== 'NONE' ? `row.layoutMode=${component.layoutMode}` : null,
      component.constraints.horizontal !== 'STRETCH' ? `row.constraint=${component.constraints.horizontal}` : null,
      component.cornerRadius !== model.appearance.radius ? `row.radius=${component.cornerRadius}` : null,
      label.x !== model.labelOffsetPx.x ? `label.x=${label.x}` : null,
      label.y !== model.labelOffsetPx.y ? `label.y=${label.y}` : null,
      label.textAutoResize !== 'NONE' && label.textAutoResize !== 'TRUNCATE' ?
        `label.textAutoResize=${label.textAutoResize}` : null,
      label.textTruncation !== 'ENDING' ? `label.textTruncation=${label.textTruncation}` : null,
      label.height !== baselineLabelHeightPx ? `label.height=${label.height}` : null,
      label.constraints.horizontal !== 'STRETCH' ? `label.constraint=${label.constraints.horizontal}` : null,
      label.width !== expectedLabelWidth ? `label.width=${label.width} (expected ${expectedLabelWidth})` : null,
      label.characters !== model.label ? `label.characters=${label.characters}` : null,
      label.componentPropertyReferences?.characters !== labelProperty ? 'label.propertyReference' : null,
      component.componentPropertyDefinitions[labelProperty]?.defaultValue !== model.label ? 'label.propertyDefault' : null,
    ].filter((item): item is string => item !== null);
    if (mismatches.length) {
      throw new Error(`File Explorer row: Figma alterou ${mismatches.join('; ')}.`);
    }

    const bounds = figma.currentPage.children.filter((node) => node !== preview)
      .map((node) => node.absoluteBoundingBox).filter((box): box is Rect => box !== null);
    preview.x = bounds.reduce((right, box) => Math.max(right, box.x + box.width), 0) + 64;
    preview.y = 0;
    figma.currentPage.selection = [component];
    figma.viewport.scrollAndZoomIntoView([preview]);
    return { component, labelWidthPx: baselineLabelWidthPx };
  } catch (error) {
    if (preview && !preview.removed) preview.remove();
    else if (component && !component.removed) component.remove();
    throw error;
  }
}

function opaqueRgb(css: string): RGB {
  const match = /^rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)$/.exec(css);
  if (!match) throw new Error('File Explorer row: cor do label não suportada.');
  const channels = match.slice(1).map(Number);
  if (channels.some((channel) => channel > 255)) throw new Error('File Explorer row: cor do label inválida.');
  return { r: channels[0]! / 255, g: channels[1]! / 255, b: channels[2]! / 255 };
}
