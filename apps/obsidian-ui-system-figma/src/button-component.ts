import type { ButtonData } from './button-data';
import { fontFailure, requiredFont } from './font-resolution';

export async function loadButtonFont(button: ButtonData): Promise<FontName> {
  const available = await figma.listAvailableFontsAsync();
  const font = requiredFont({ cssStack: button.fontFamily, platform: button.platform,
    weight: button.fontWeight, style: button.fontStyle }, available.map((item) => item.fontName));
  try { await figma.loadFontAsync(font); }
  catch { throw fontFailure(font, `Required font could not be loaded: ${font.family} / ${font.style}.`); }

  const probe = figma.createText();
  try {
    probe.fontName = font;
    probe.fontSize = button.fontSize;
    probe.textAutoResize = 'WIDTH_AND_HEIGHT';
    probe.characters = button.text;
    if (probe.hasMissingFont) {
      throw fontFailure(font, `Required font unusable: ${font.family} / ${font.style}. ` +
        'Figma lists this font, but the TextNode reports it missing.');
    }
    if (probe.width <= 0 || probe.height <= 0) {
      throw fontFailure(font, `Required font did not render: ${font.family} / ${font.style} ` +
        `(width=${probe.width}, height=${probe.height}, chars=${probe.characters.length}).`);
    }
  } finally { if (!probe.removed) probe.remove(); }
  return font;
}

export function createButtonComponent(button: ButtonData, font: FontName): { component: ComponentNode; label: TextNode } {
  const component = figma.createComponent();
  let label: TextNode | undefined;
  try {
    component.name = `State=${button.state}`;
    component.resize(component.width, button.height);
    component.layoutMode = 'HORIZONTAL';
    component.layoutWrap = 'NO_WRAP';
    component.primaryAxisSizingMode = 'AUTO';
    component.counterAxisSizingMode = 'FIXED';
    component.primaryAxisAlignItems = button.justifyContent;
    component.counterAxisAlignItems = button.alignItems;
    component.paddingTop = button.padding.top;
    component.paddingRight = button.padding.right;
    component.paddingBottom = button.padding.bottom;
    component.paddingLeft = button.padding.left;
    component.cornerRadius = button.radius;
    component.clipsContent = false;
    component.fills = [{ type: 'SOLID', color: button.background }];
    component.strokes = button.border ? [{ type: 'SOLID', color: button.border.color }] : [];
    if (button.border) {
      component.strokeWeight = button.border.width;
      component.strokeAlign = 'INSIDE';
    }
    component.opacity = button.opacity;

    label = figma.createText();
    label.name = 'Label';
    label.fontName = font;
    label.fontSize = button.fontSize;
    label.lineHeight = { unit: 'PIXELS', value: button.textHeight };
    label.textAutoResize = 'WIDTH_AND_HEIGHT';
    label.textAlignHorizontal = button.textAlign;
    label.fills = [{ type: 'SOLID', color: button.color }];
    label.characters = button.text;
    if (label.width <= 0 || label.height <= 0) {
      throw new Error(`Button ${button.state}: TextNode não mediu o label ` +
        `(width=${label.width}, height=${label.height}, chars=${label.characters.length}, missingFont=${label.hasMissingFont}); geração cancelada.`);
    }
    component.appendChild(label);
    label.layoutSizingHorizontal = 'HUG';
    label.layoutSizingVertical = 'HUG';
    if (component.width < label.width + button.padding.left + button.padding.right - 0.5) {
      throw new Error(`Button ${button.state}: largura Hug colapsou após inserir o label; geração cancelada.`);
    }
    return { component, label };
  } catch (error) {
    if (label && !label.removed) label.remove();
    if (!component.removed) component.remove();
    throw error;
  }
}
