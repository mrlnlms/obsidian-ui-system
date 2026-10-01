import { readButtonImport } from './button-data';
import { selectTypography, type TypographyMode } from './font-resolution';

figma.showUI(__html__, { width: 400, height: 500 });

figma.ui.onmessage = async (message: unknown) => {
  if (!isGenerateMessage(message)) return;

  let set: ComponentSetNode | undefined;
  let fontProbe: TextNode | undefined;
  const components: ComponentNode[] = [];
  const textNodes: TextNode[] = [];
  try {
    const mode: TypographyMode = message.mode === 'lab' ? 'lab' : 'strict';
    const data = readButtonImport(message.components, message.layout);
    validateSharedTypography(data);
    const available = await figma.listAvailableFontsAsync();
    const typography = selectTypography({ cssStack: data[0].fontFamily, platform: data[0].platform,
      weight: data[0].fontWeight, style: data[0].fontStyle },
    available.map((item) => item.fontName), mode);
    const font = typography.rendered;
    await figma.loadFontAsync(font);
    fontProbe = figma.createText();
    fontProbe.fontName = font;
    fontProbe.fontSize = data[0].fontSize;
    fontProbe.textAutoResize = 'WIDTH_AND_HEIGHT';
    fontProbe.characters = data[0].text;
    if (fontProbe.hasMissingFont) {
      if (mode === 'lab') throw new Error(`Lab placeholder unusable: ${font.family} / ${font.style}. TextNode reports this placeholder missing.`);
      throw new Error(`Required font unusable: ${font.family} / ${font.style}. ` +
        'Figma lists this font, but the TextNode reports it missing.');
    }
    if (fontProbe.width <= 0 || fontProbe.height <= 0) {
      throw new Error(`${mode === 'lab' ? 'Lab placeholder' : 'Required font'} did not render: ${font.family} / ${font.style} ` +
        `(width=${fontProbe.width}, height=${fontProbe.height}, chars=${fontProbe.characters.length}).`);
    }
    const renderCheck = { hasMissingFont: false, sampleWidthPx: fontProbe.width, sampleHeightPx: fontProbe.height };
    fontProbe.remove();
    fontProbe = undefined;
    figma.ui.postMessage({ type: 'typography', text: mode === 'lab'
      ? `Typography: ${font.family} / ${font.style} — LAB PLACEHOLDER (Obsidian unresolved)`
      : `Typography: ${font.family} / ${font.style} ✓` });

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
      textNodes.push(label);
      label.name = 'Label';
      label.fontName = font;
      label.fontSize = button.fontSize;
      label.lineHeight = { unit: 'PIXELS', value: button.textHeight };
      label.textAutoResize = 'WIDTH_AND_HEIGHT';
      label.textAlignHorizontal = button.textAlign;
      label.fills = [{ type: 'SOLID', color: button.color }];
      label.characters = button.text;
      // Measure populated text before adding it to the hugging component.
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
    }

    set = figma.combineAsVariants(components, figma.currentPage);
    set.name = mode === 'lab' ? 'Obsidian / Button [Lab]' : 'Obsidian / Button';
    // Development manifests can have no Figma-issued plugin ID; private plugin data requires one.
    // Component descriptions are native, inspectable, and work for an imported development plugin.
    set.description = `${mode === 'lab' ? 'LAB OUTPUT — typography placeholder, not faithful to Obsidian.\n' : ''}` +
      JSON.stringify({
        typography: {
          mode,
          status: typography.status,
          requested: { cssStack: data[0].fontFamily, fontSizePx: data[0].fontSize,
            fontWeight: data[0].fontWeight, fontStyle: data[0].fontStyle,
            lineHeight: data[0].lineHeight, letterSpacing: data[0].letterSpacing,
            declaration: data[0].typography.fontFamilyDeclaration,
            cssVariables: data[0].typography.cssVariables },
          resolved: typography.resolved,
          rendered: { fontName: typography.rendered, ...renderCheck,
            role: mode === 'lab' ? 'placeholder' : 'required-font' },
        },
      }, null, 2);
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

    const center = figma.viewport.center;
    set.x = center.x - set.width / 2;
    set.y = center.y - set.height / 2;
    figma.currentPage.selection = [set];
    figma.viewport.scrollAndZoomIntoView([set]);
    figma.ui.postMessage({ type: 'result', ok: true, text: `${set.name} criado com 3 variants. ` +
      `${mode === 'lab' ? 'Tipografia placeholder; valide apenas a estrutura. ' : ''}Crie uma instance e altere Label para OK.` });
  } catch (error) {
    if (fontProbe && !fontProbe.removed) fontProbe.remove();
    if (set && !set.removed) set.remove();
    else for (const component of components) if (!component.removed) component.remove();
    for (const label of textNodes) if (!label.removed) label.remove();
    const detail = error instanceof Error ? error.message : String(error);
    figma.ui.postMessage({ type: 'result', ok: false, text: detail });
  }
};

function isGenerateMessage(value: unknown): value is { type: 'generate-button'; components: unknown; layout: unknown; mode?: TypographyMode } {
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
