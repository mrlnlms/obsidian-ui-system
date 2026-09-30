import { readButtonImport } from './button-data';
import { requiredFont } from './font-resolution';

figma.showUI(__html__, { width: 380, height: 330 });

figma.ui.onmessage = async (message: unknown) => {
  if (!isGenerateMessage(message)) return;

  let set: ComponentSetNode | undefined;
  const components: ComponentNode[] = [];
  try {
    const data = readButtonImport(message.components, message.layout);
    validateSharedTypography(data);
    const available = await figma.listAvailableFontsAsync();
    const font = requiredFont({ cssStack: data[0].fontFamily, platform: data[0].platform,
      size: data[0].fontSize, weight: data[0].fontWeight, style: data[0].fontStyle },
    available.map((item) => item.fontName));
    await figma.loadFontAsync(font);
    figma.ui.postMessage({ type: 'typography', text: `Typography: ${font.family} / ${font.style} ✓` });

    const textNodes: TextNode[] = [];
    for (const button of data) {
      const component = figma.createComponent();
      components.push(component);
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

      const label = figma.createText();
      component.appendChild(label);
      label.name = 'Label';
      label.fontName = font;
      label.fontSize = button.fontSize;
      label.lineHeight = { unit: 'PIXELS', value: button.textHeight };
      label.textAutoResize = 'WIDTH_AND_HEIGHT';
      label.textAlignHorizontal = button.textAlign;
      label.fills = [{ type: 'SOLID', color: button.color }];
      label.characters = button.text;
      textNodes.push(label);
    }

    set = figma.combineAsVariants(components, figma.currentPage);
    set.name = 'Obsidian / Button';
    const fontRecord = { requestedCssStack: data[0].fontFamily,
      requestedCssVariables: data[0].typography.cssVariables,
      requestedDeclaration: data[0].typography.fontFamilyDeclaration,
      usedFigmaFont: font };
    set.setPluginData('obsidian-ui-typography', JSON.stringify(fontRecord));
    set.description = `Typography requested (CSS): ${data[0].fontFamily}\nFigma font used: ${font.family} / ${font.style}`;
    if (set.children.length !== 3 || set.componentPropertyDefinitions.State?.type !== 'VARIANT') {
      throw new Error('O Figma não criou as três variants com a propriedade State.');
    }
    const labelProperty = set.addComponentProperty('Label', 'TEXT', data[0].text);
    for (const label of textNodes) label.componentPropertyReferences = { characters: labelProperty };
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

    const center = figma.viewport.center;
    set.x = center.x - set.width / 2;
    set.y = center.y - set.height / 2;
    figma.currentPage.selection = [set];
    figma.viewport.scrollAndZoomIntoView([set]);
    figma.ui.postMessage({ type: 'result', ok: true, text: `Obsidian / Button criado com 3 variants. Crie uma instance e altere Label para OK.` });
  } catch (error) {
    if (set && !set.removed) set.remove();
    else for (const component of components) if (!component.removed) component.remove();
    const detail = error instanceof Error ? error.message : String(error);
    figma.ui.postMessage({ type: 'result', ok: false, text: detail });
  }
};

function isGenerateMessage(value: unknown): value is { type: 'generate-button'; components: unknown; layout: unknown } {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === 'generate-button' &&
    'components' in value && 'layout' in value;
}

function validateSharedTypography(data: ReturnType<typeof readButtonImport>): void {
  if (data.some((button) => button.text !== data[0].text ||
      button.fontFamily !== data[0].fontFamily || button.fontWeight !== data[0].fontWeight ||
      button.fontStyle !== data[0].fontStyle || button.lineHeight !== data[0].lineHeight ||
      button.letterSpacing !== data[0].letterSpacing)) {
    throw new Error('Button: texto ou tipografia diverge entre variants; o spike exige valores compartilhados.');
  }
}
