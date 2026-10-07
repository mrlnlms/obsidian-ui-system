import type { IconButtonLibrary } from './icon-button-generation';
import { glyphGeometry, type IconSource } from './glyph-library';
import { requiredFont } from './font-resolution';

export interface VaultProfileEvidence {
  height: number;
  background: string;
  borderTop: string;
  paddingLeft: number;
  paddingRight: number;
  itemGap: number;
  switcher: { width: number; height: number; flex: string; icon: string };
  name: { text: string; width: number; fontSize: number; fontWeight: string;
    color: string; textOverflow: string };
  actions: Array<{ width: number; height: number; svg: string }>;
}

export function readVaultProfileEvidence(input: unknown): VaultProfileEvidence {
  const value = input as VaultProfileEvidence;
  if (value?.height !== 41.890625 || value.background !== 'rgb(40, 40, 40)' ||
      value.borderTop !== '1px solid rgb(51, 51, 51)' ||
      value.paddingLeft !== 8 || value.paddingRight !== 8 ||
      value.itemGap !== 4 ||
      value.switcher?.width !== 124 || value.switcher.height !== 24.890625 ||
      value.switcher.flex !== '1 1 auto' ||
      value.name?.fontSize !== 13 || value.name.fontWeight !== '500' ||
      value.name.textOverflow !== 'ellipsis' ||
      value.name.text !== 'dev-vault' || value.actions?.length !== 2 ||
      value.actions.some((action) => action.width !== 28 || action.height !== 24)) {
    throw new Error('Application Shell: evidência do Vault Profile incompleta.');
  }
  glyphGeometry(value.switcher.icon);
  value.actions.forEach((action) => glyphGeometry(action.svg));
  return value;
}

export function vaultProfileGlyphSources(evidence: VaultProfileEvidence): IconSource[] {
  return [
    { name: 'Vault / Switch', svg: evidence.switcher.icon,
      color: 'rgb(102, 102, 102)' },
    { name: 'Vault / Help', svg: evidence.actions[0]!.svg,
      color: 'rgb(179, 179, 179)', glyphName: 'help' },
    { name: 'Vault / Settings', svg: evidence.actions[1]!.svg,
      color: 'rgb(179, 179, 179)' },
  ];
}

export async function createVaultProfile(evidence: VaultProfileEvidence,
  icons: IconButtonLibrary, width: number, cssFontFamily: string): Promise<ComponentNode> {
  const available = (await figma.listAvailableFontsAsync()).map((item) => item.fontName);
  const font = requiredFont({ cssStack: cssFontFamily, platform: 'macos',
    weight: 500, style: 'normal' }, available);
  await figma.loadFontAsync(font);
  const profile = figma.createComponent();
  profile.name = 'Obsidian / Vault Profile';
  profile.description = 'Rodapé do sidedock esquerdo: nome do vault de exemplo, Help e Settings observados.';
  profile.layoutMode = 'HORIZONTAL';
  profile.primaryAxisSizingMode = 'FIXED';
  profile.counterAxisSizingMode = 'FIXED';
  profile.primaryAxisAlignItems = 'MIN';
  profile.counterAxisAlignItems = 'CENTER';
  profile.itemSpacing = evidence.itemGap;
  profile.resize(width, evidence.height);
  profile.paddingLeft = evidence.paddingLeft;
  profile.paddingRight = evidence.paddingRight;
  profile.fills = [paint(evidence.background)];
  profile.strokes = [paint('rgb(51, 51, 51)')];
  profile.strokeTopWeight = 1;
  profile.strokeBottomWeight = 0;
  profile.strokeLeftWeight = 0;
  profile.strokeRightWeight = 0;

  const switcher = figma.createFrame();
  switcher.name = 'Vault switcher';
  profile.appendChild(switcher);
  switcher.resize(evidence.switcher.width, evidence.switcher.height);
  switcher.layoutMode = 'HORIZONTAL';
  switcher.primaryAxisSizingMode = 'FIXED';
  switcher.counterAxisSizingMode = 'FIXED';
  switcher.counterAxisAlignItems = 'CENTER';
  switcher.itemSpacing = 8;
  switcher.paddingLeft = 8;
  switcher.paddingRight = 8;
  switcher.layoutGrow = 1;
  switcher.minWidth = 1;
  switcher.fills = [];
  switcher.strokes = [];
  switcher.clipsContent = true;
  const switchGlyph = icons.createGlyph('Vault / Switch', 'Faint');
  switcher.appendChild(switchGlyph);
  const name = figma.createText();
  name.name = 'Vault name';
  switcher.appendChild(name);
  name.fontName = font;
  name.fontSize = evidence.name.fontSize;
  name.lineHeight = { unit: 'PIXELS', value: 16.9 };
  name.characters = evidence.name.text;
  name.fills = [paint(evidence.name.color)];
  name.textAutoResize = 'NONE';
  name.textTruncation = 'ENDING';
  name.resize(Math.max(1, evidence.switcher.width - 16 - 8 - 16), 16.9);
  name.layoutGrow = 1;
  name.minWidth = 1;
  const nameProperty = profile.addComponentProperty('Vault name', 'TEXT', evidence.name.text);
  name.componentPropertyReferences = { characters: nameProperty };

  const actions = figma.createFrame();
  actions.name = 'Vault actions';
  profile.appendChild(actions);
  actions.layoutMode = 'HORIZONTAL';
  actions.primaryAxisSizingMode = 'FIXED';
  actions.counterAxisSizingMode = 'FIXED';
  actions.itemSpacing = 0;
  actions.resize(2 * evidence.actions[0]!.width, evidence.actions[0]!.height);
  actions.fills = [];
  actions.strokes = [];
  for (const action of ['Help', 'Settings']) {
    const button = icons.create(`Vault / ${action}`);
    button.name = action;
    actions.appendChild(button);
  }
  return profile;
}

function paint(css: string): SolidPaint {
  const channels = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(css);
  if (!channels) throw new Error(`Vault Profile: cor inválida ${css}.`);
  return { type: 'SOLID', color: { r: Number(channels[1]) / 255,
    g: Number(channels[2]) / 255, b: Number(channels[3]) / 255 } };
}
