import { readFolderRowModels, type FolderRowModel } from './folder-row-data';
import { fontFailure, requiredFont } from './font-resolution';
import type { IconButtonLibrary } from './icon-button-generation';

/** Six independent Dark examples: two observed disclosure states at depths 0, 1 and 2. */
export async function generateFolderRows(probe: unknown,
  glyphs: IconButtonLibrary): Promise<ComponentNode[]> {
  const models = readFolderRowModels(probe);
  const first = models[0]!;
  const available = (await figma.listAvailableFontsAsync()).map((item) => item.fontName);
  const font = requiredFont({ cssStack: first.typography.fontFamily, platform: first.typography.platform,
    weight: first.typography.fontWeight, style: first.typography.fontStyle }, available);
  try { await figma.loadFontAsync(font); }
  catch { throw fontFailure(font, `Required font could not be loaded: ${font.family} / ${font.style}.`); }
  figma.ui.postMessage({ type: 'typography', text: `Typography: ${font.family} / ${font.style} ✓` });

  let preview: FrameNode | undefined;
  try {
    preview = figma.createFrame();
    preview.name = 'Dark preview surface / folder rows';
    preview.resize(first.sample.width + 24, 48 + models.length * first.sample.height + (models.length - 1) * 8);
    preview.fills = [{ type: 'SOLID', color: { r: 40 / 255, g: 40 / 255, b: 40 / 255 } }];
    preview.clipsContent = false;
    const components = models.map((model, index) =>
      createFolderRow(model, font, preview!, 24 + index * (model.sample.height + 8), glyphs));
    const bounds = figma.currentPage.children.filter((node) => node !== preview)
      .map((node) => node.absoluteBoundingBox).filter((box): box is Rect => box !== null);
    preview.x = bounds.reduce((right, box) => Math.max(right, box.x + box.width), 0) + 64;
    preview.y = 0;
    figma.currentPage.selection = components;
    figma.viewport.scrollAndZoomIntoView([preview]);
    return components;
  } catch (error) {
    if (preview && !preview.removed) preview.remove();
    throw error;
  }
}

function createFolderRow(model: FolderRowModel, font: FontName, preview: FrameNode, y: number,
  glyphs: IconButtonLibrary): ComponentNode {
  if (model.appearance.backgroundCss !== 'rgba(0, 0, 0, 0)') {
    throw new Error('Folder row: background observado não suportado.');
  }
  const component = figma.createComponent();
  component.name = `Obsidian / Folder Row / ${model.state} / Depth ${model.depth}`;
  component.description = 'Dark; uma row observada, sem árvore funcional. Depth limitado a 0–2.';
  preview.appendChild(component);
  component.layoutMode = 'NONE';
  component.resize(model.sample.width, model.sample.height);
  component.x = 12;
  component.y = y;
  component.fills = [];
  component.strokes = [];
  component.cornerRadius = model.appearance.radius;
  component.clipsContent = false;
  component.constraints = { horizontal: 'STRETCH', vertical: 'MIN' };

  const disclosure = figma.createFrame();
  disclosure.name = 'Disclosure';
  component.appendChild(disclosure);
  disclosure.resize(model.sample.disclosureSize.width, model.sample.disclosureSize.height);
  disclosure.x = model.sample.disclosureOffset.x;
  disclosure.y = model.sample.disclosureOffset.y;
  disclosure.fills = [];
  disclosure.strokes = [];
  disclosure.clipsContent = false;
  disclosure.constraints = { horizontal: 'MIN', vertical: 'MIN' };
  const glyph = glyphs.createGlyph('right-triangle', 'Faint');
  glyph.name = 'Right triangle';
  disclosure.appendChild(glyph);
  glyph.resize(model.sample.svgSize.width, model.sample.svgSize.height);
  glyph.rotation = model.disclosure.rotationDeg;
  glyph.x = model.sample.svgOffset.x - model.sample.disclosureOffset.x;
  glyph.y = model.sample.svgOffset.y - model.sample.disclosureOffset.y;
  glyph.constraints = { horizontal: 'MIN', vertical: 'MIN' };

  const label = figma.createText();
  label.name = 'Label';
  component.appendChild(label);
  label.fontName = font;
  label.fontSize = model.typography.fontSize;
  label.lineHeight = { unit: 'PIXELS', value: model.typography.lineHeight };
  label.fills = [{ type: 'SOLID', color: opaqueRgb(model.appearance.labelColorCss) }];
  label.characters = model.label;
  if (label.hasMissingFont || label.width <= 0 || label.height <= 0) {
    throw fontFailure(font, 'Folder row: Label não renderizou.');
  }
  const labelProperty = component.addComponentProperty('Label', 'TEXT', model.label);
  label.componentPropertyReferences = { characters: labelProperty };
  label.textAutoResize = 'NONE';
  label.resize(model.sample.width - model.sample.labelOffset.x - model.sample.rightInset,
    model.typography.lineHeight);
  label.textTruncation = 'ENDING';
  label.x = model.sample.labelOffset.x;
  label.y = model.sample.labelOffset.y;
  label.constraints = { horizontal: 'STRETCH', vertical: 'MIN' };

  const mismatches = [
    component.width !== model.sample.width ? `row.width=${component.width}` : null,
    component.height !== model.sample.height ? `row.height=${component.height}` : null,
    component.layoutMode !== 'NONE' ? `row.layoutMode=${component.layoutMode}` : null,
    component.constraints.horizontal !== 'STRETCH' ? `row.constraint=${component.constraints.horizontal}` : null,
    disclosure.x !== model.sample.disclosureOffset.x ? `disclosure.x=${disclosure.x}` : null,
    disclosure.y !== model.sample.disclosureOffset.y ? `disclosure.y=${disclosure.y}` : null,
    Math.abs(glyph.width - model.sample.svgSize.width) > 0.05 ? `svg.width=${glyph.width}` : null,
    Math.abs(glyph.height - model.sample.svgSize.height) > 0.05 ? `svg.height=${glyph.height}` : null,
    label.x !== model.sample.labelOffset.x ? `label.x=${label.x}` : null,
    label.y !== model.sample.labelOffset.y ? `label.y=${label.y}` : null,
    label.width !== model.sample.width - model.sample.labelOffset.x - model.sample.rightInset ?
      `label.width=${label.width}` : null,
    label.textTruncation !== 'ENDING' ? `label.textTruncation=${label.textTruncation}` : null,
    label.textAutoResize !== 'NONE' && label.textAutoResize !== 'TRUNCATE' ?
      `label.textAutoResize=${label.textAutoResize}` : null,
    label.componentPropertyReferences?.characters !== labelProperty ? 'label.propertyReference' : null,
  ].filter((item): item is string => item !== null);
  if (mismatches.length) throw new Error(`Folder row: Figma alterou ${mismatches.join('; ')}.`);
  return component;
}

function opaqueRgb(css: string): RGB {
  const match = /^rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)$/.exec(css);
  if (!match) throw new Error('Folder row: cor não suportada.');
  const channels = match.slice(1).map(Number);
  if (channels.some((channel) => channel > 255)) throw new Error('Folder row: cor inválida.');
  return { r: channels[0]! / 255, g: channels[1]! / 255, b: channels[2]! / 255 };
}
