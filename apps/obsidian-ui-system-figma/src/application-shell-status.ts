import { requiredFont } from './font-resolution';
import { glyphGeometry, type IconSource } from './glyph-library';
import { rebindGlyphTone, type IconButtonLibrary } from './icon-button-generation';
import { boundUiKitPaint, type UiKitThemeVariables } from './ui-kit-theme';

interface StatusItem {
  name: 'Backlinks' | 'Editor status' | 'Word count' | 'Sync';
  width: number;
  text?: string;
  words?: string;
  characters?: string;
  wordWidth?: number;
  characterWidth?: number;
  segmentGap?: number;
  svg?: string;
}

export interface StatusBarEvidence {
  width: number;
  height: number;
  background: string;
  color: string;
  syncColor: string;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  itemGap: number;
  itemHeight: number;
  topLeftRadius: number;
  fontSize: number;
  items: StatusItem[];
}

export function readStatusBarEvidence(input: unknown): StatusBarEvidence {
  const value = input as StatusBarEvidence;
  if (!value || value.width !== 299.765625 || value.height !== 27 ||
      value.background !== 'rgb(40, 40, 40)' ||
      value.color !== 'rgb(179, 179, 179)' ||
      value.syncColor !== 'rgb(251, 70, 76)' ||
      value.paddingLeft !== 5 || value.paddingRight !== 8 ||
      value.paddingTop !== 5 || value.itemGap !== 4 ||
      value.itemHeight !== 18 || value.topLeftRadius !== 8 ||
      value.fontSize !== 12 || value.items?.length !== 4 ||
      value.items[0]?.name !== 'Backlinks' || value.items[0].text !== '0 backlinks' ||
      value.items[1]?.name !== 'Editor status' ||
      value.items[2]?.name !== 'Word count' || value.items[2].words !== '35 words' ||
      value.items[2].characters !== '233 characters' ||
      value.items[3]?.name !== 'Sync' ||
      !value.items[1].svg || !value.items[3].svg) {
    throw new Error('Application Shell: evidência da Status Bar incompleta.');
  }
  for (const item of value.items) {
    if (!Number.isFinite(item.width) || item.width <= 0) {
      throw new Error('Application Shell: largura de item da Status Bar inválida.');
    }
    if (item.svg) glyphGeometry(item.svg);
  }
  const total = value.paddingLeft + value.paddingRight +
    value.items.reduce((sum, item) => sum + item.width, 0) +
    value.itemGap * (value.items.length - 1);
  if (Math.abs(total - value.width) > 0.1) {
    throw new Error('Application Shell: itens da Status Bar não ocupam a largura observada.');
  }
  return value;
}

export function statusBarGlyphSources(evidence: StatusBarEvidence): IconSource[] {
  return evidence.items.filter((item) => item.svg).map((item) => ({
    name: `Status Bar / ${item.name}`, svg: item.svg!,
    color: 'rgb(179, 179, 179)',
    ...(item.name === 'Sync' ? { glyphName: 'refresh-cw-off' } : {}),
  }));
}

export async function createStatusBar(evidence: StatusBarEvidence,
  icons: IconButtonLibrary, cssFontFamily: string,
  theme: UiKitThemeVariables): Promise<ComponentNode> {
  const available = (await figma.listAvailableFontsAsync()).map((item) => item.fontName);
  const font = requiredFont({ cssStack: cssFontFamily, platform: 'macos',
    weight: 400, style: 'normal' }, available);
  await figma.loadFontAsync(font);
  const status = figma.createComponent();
  status.name = 'Obsidian / Status Bar';
  status.description = 'Amostra Dark observada: Backlinks, modo de edição, contagem e erro de sync. Textos são conteúdo editável da cena.';
  status.layoutMode = 'HORIZONTAL';
  status.primaryAxisSizingMode = 'FIXED';
  status.counterAxisSizingMode = 'FIXED';
  status.itemSpacing = evidence.itemGap;
  status.paddingLeft = evidence.paddingLeft;
  status.paddingRight = evidence.paddingRight;
  status.paddingTop = evidence.paddingTop;
  status.paddingBottom = evidence.height - evidence.paddingTop - evidence.itemHeight;
  status.resize(evidence.width, evidence.height);
  status.fills = [boundUiKitPaint(theme, 'surfaceSecondary')];
  status.strokes = [boundUiKitPaint(theme, 'controlBorder')];
  status.strokeTopWeight = 1;
  status.strokeLeftWeight = 1;
  status.strokeRightWeight = 0;
  status.strokeBottomWeight = 0;
  status.topLeftRadius = evidence.topLeftRadius;
  status.topRightRadius = 0;
  status.bottomLeftRadius = 0;
  status.bottomRightRadius = 0;

  for (const item of evidence.items) {
    const region = figma.createFrame();
    region.name = item.name;
    status.appendChild(region);
    region.resize(item.width, evidence.itemHeight);
    region.fills = [];
    region.strokes = [];
    if (item.name === 'Backlinks') {
      addText(status, region, 'Backlinks', item.text!, font, evidence, theme,
        item.width - 8, 4);
    } else if (item.name === 'Word count') {
      addText(status, region, 'Words', item.words!, font, evidence, theme,
        item.wordWidth!, 4);
      addText(status, region, 'Characters', item.characters!, font, evidence, theme,
        item.characterWidth!, 4 + item.wordWidth! + item.segmentGap!);
    } else {
      const glyph = icons.createGlyph(`Status Bar / ${item.name}`);
      glyph.name = `${item.name} glyph`;
      region.appendChild(glyph);
      glyph.x = 4;
      glyph.y = 1;
      if (item.name === 'Sync' && !rebindGlyphTone(glyph, theme.primitive.colors.icon,
        theme.colors.textError, theme.primitive.dark.colors.icon)) {
        throw new Error('Application Shell: traço visível do Sync não foi vinculado.');
      }
    }
  }
  // The observed item widths exactly account for the sample bar width. Figma may
  // normalize fractional Auto Layout coordinates, so verify the sizing contract
  // instead of requiring the last child's x to equal a fractional CSS coordinate.
  if (status.layoutMode !== 'HORIZONTAL' || status.children.length !== evidence.items.length ||
      status.children.some((node, index) =>
        Math.abs(node.width - evidence.items[index]!.width) > 0.5)) {
    throw new Error('Application Shell: Status Bar perdeu itens ou larguras observadas.');
  }
  return status;
}

function addText(parent: ComponentNode, region: FrameNode, propertyName: string,
  value: string, font: FontName, evidence: StatusBarEvidence,
  theme: UiKitThemeVariables, width: number, x: number): void {
  const node = figma.createText();
  node.name = propertyName;
  region.appendChild(node);
  node.fontName = font;
  node.fontSize = evidence.fontSize;
  node.lineHeight = { unit: 'PIXELS', value: 15.6 };
  node.textAutoResize = 'NONE';
  node.resize(width, evidence.itemHeight);
  node.characters = value;
  node.fills = [boundUiKitPaint(theme, 'textMuted')];
  node.x = x;
  node.y = 0;
  const property = parent.addComponentProperty(propertyName, 'TEXT', value);
  node.componentPropertyReferences = { characters: property };
}
