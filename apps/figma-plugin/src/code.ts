import { readButtonImport } from './button-data';
import { requiredFont, SF_PRO_SETUP_INSTRUCTIONS } from './font-resolution';
import { generateSearch } from './search-generation';
import { planUiKitPlacement } from './ui-kit-layout';

figma.showUI(__html__, { width: 380, height: 420 });

figma.ui.onmessage = async (message: unknown) => {
  if (!isGenerateUiKitMessage(message)) return;
  const sets: ComponentSetNode[] = [];
  const sections: SectionNode[] = [];
  try {
    sets.push(await generateButton(message.components, message.layout));
    sets.push(await generateSearch(message.components, message.layout));
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

async function generateButton(componentsJson: unknown, layoutJson: unknown): Promise<ComponentSetNode> {
  let set: ComponentSetNode | undefined;
  let fontProbe: TextNode | undefined;
  const components: ComponentNode[] = [];
  const textNodes: TextNode[] = [];
  try {
    const data = readButtonImport(componentsJson, layoutJson);
    validateSharedTypography(data);
    const available = await figma.listAvailableFontsAsync();
    const font = requiredFont({ cssStack: data[0].fontFamily, platform: data[0].platform,
      weight: data[0].fontWeight, style: data[0].fontStyle },
    available.map((item) => item.fontName));
    try {
      await figma.loadFontAsync(font);
    } catch {
      throw fontFailure(font, `Required font could not be loaded: ${font.family} / ${font.style}.`);
    }
    fontProbe = figma.createText();
    fontProbe.fontName = font;
    fontProbe.fontSize = data[0].fontSize;
    fontProbe.textAutoResize = 'WIDTH_AND_HEIGHT';
    fontProbe.characters = data[0].text;
    if (fontProbe.hasMissingFont) {
      throw fontFailure(font, `Required font unusable: ${font.family} / ${font.style}. ` +
        'Figma lists this font, but the TextNode reports it missing.');
    }
    if (fontProbe.width <= 0 || fontProbe.height <= 0) {
      throw fontFailure(font, `Required font did not render: ${font.family} / ${font.style} ` +
        `(width=${fontProbe.width}, height=${fontProbe.height}, chars=${fontProbe.characters.length}).`);
    }
    fontProbe.remove();
    fontProbe = undefined;
    figma.ui.postMessage({ type: 'typography', text: `Typography: ${font.family} / ${font.style} ✓` });

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
    if (fontProbe && !fontProbe.removed) fontProbe.remove();
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

function fontFailure(font: FontName, detail: string): Error {
  return new Error(font.family === 'SF Pro' ? `${detail}\n\n${SF_PRO_SETUP_INSTRUCTIONS}` : detail);
}

function isGenerateUiKitMessage(value: unknown): value is { type: 'generate-ui-kit'; components: unknown; layout: unknown } {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === 'generate-ui-kit' &&
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
