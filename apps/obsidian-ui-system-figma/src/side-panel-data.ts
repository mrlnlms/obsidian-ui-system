import { record } from './reader-primitives';

export interface SidePanelTab {
  title: 'Files' | 'Search' | 'Bookmarks';
  active: boolean;
  svg: string;
  color: string;
  opacity: number;
}

export interface SidePanelModel {
  width: number;
  height: number;
  minExpandedWidth: number;
  background: string;
  headerHeight: number;
  tabLeft: number;
  tabTop: number;
  tabGap: number;
  toggleRight: number;
  toggleWidth: number;
  toggleHeight: number;
  toggleSvg: string;
  toggleIconX: number;
  toggleIconY: number;
  toggleIconSize: number;
  toggleIconColor: string;
  toggleIconOpacity: number;
  tabs: SidePanelTab[];
}

/** One observed left Sidedock scene; View controls and content remain View-owned. */
export function readSidePanelModel(input: unknown): SidePanelModel {
  const root = record(input, 'Side Panel: probe inválido.');
  if (root.format !== 'obsidian-side-panel-probe' || root.version !== 1 ||
      root.mode !== 'Dark' || root.side !== 'Left') {
    throw new Error('Side Panel: apenas a observação Left / Dark é suportada.');
  }
  const host = box(root.host, 'host');
  const bar = box(root.tabBar, 'tabBar');
  const row = box(root.tabRow, 'tabRow');
  const profile = box(root.profile, 'profile');
  const controls = box(root.controls, 'controls');
  const toggle = record(root.toggle, 'Side Panel: toggle ausente.');
  const toggleBox = box(toggle.box, 'toggle');
  const toggleIcon = record(toggle.icon, 'Side Panel: glifo do toggle ausente.');
  const toggleIconOffset = record(toggleIcon.offset, 'Side Panel: offset do glifo ausente.');
  const toggleIconSize = record(toggleIcon.size, 'Side Panel: tamanho do glifo ausente.');
  const widthBehavior = record(root.widthBehavior, 'Side Panel: limite expandido ausente.');
  const tabs = root.tabs;
  if (!Array.isArray(tabs) || tabs.length !== 3) throw new Error('Side Panel: três tabs observadas são exigidas.');
  const titles = ['Files', 'Search', 'Bookmarks'] as const;
  const parsed = tabs.map((raw, index): SidePanelTab => {
    const tab = record(raw, `Side Panel: tab ${index} inválida.`);
    const geometry = box(tab.box, `tab ${index}`);
    const icon = record(tab.icon, `Side Panel: ícone ${index} ausente.`);
    if (tab.title !== titles[index] || tab.active !== (index === 0) ||
        geometry.rect.width !== 28 || geometry.rect.height !== 25 ||
        geometry.rect.x !== row.rect.x + index * 31 ||
        geometry.rect.y !== bar.rect.y + 7) {
      throw new Error(`Side Panel: tab ${index} diverge da cena observada.`);
    }
    const color = String(icon.color);
    const opacity = Number(icon.opacity);
    if (color !== (index === 0 ? 'rgb(218, 218, 218)' : 'rgb(179, 179, 179)') ||
        opacity !== (index === 0 ? 1 : 0.85)) {
      throw new Error(`Side Panel: aparência do ícone ${index} divergente.`);
    }
    return { title: titles[index]!, active: index === 0,
      svg: safeSvg(icon.svg), color, opacity };
  });
  const width = host.rect.width;
  const height = profile.rect.y - host.rect.y;
  if (host.background !== 'rgb(40, 40, 40)' || bar.background !== host.background ||
      bar.rect.width !== width || bar.rect.height !== 40 ||
      row.rect.x - bar.rect.x !== 44 || row.rect.y - bar.rect.y !== 6 ||
      row.rect.width !== 90 || controls.rect.y !== bar.rect.y + 40 ||
      controls.rect.height !== 40 ||
      toggleBox.rect.width !== 28 || toggleBox.rect.height !== 39 ||
      toggleIcon.observedAtPanelWidth !== 200 ||
      Number(toggleIconOffset.x) !== 6 || Number(toggleIconOffset.y) !== 12 ||
      Number(toggleIconSize.width) !== 16 || Number(toggleIconSize.height) !== 16 ||
      toggleIcon.color !== 'rgb(179, 179, 179)' || Number(toggleIcon.opacity) !== 0.85 ||
      widthBehavior.minExpandedWidth !== 200 || widthBehavior.belowMinimum !== 'collapses' ||
      Math.abs(bar.rect.x + width - toggleBox.rect.x - toggleBox.rect.width - 8) > 0.1 ||
      height <= bar.rect.height + controls.rect.height) {
    throw new Error('Side Panel: geometria do host divergente.');
  }
  return { width, height, minExpandedWidth: 200, background: host.background,
    headerHeight: 40, tabLeft: 44, tabTop: 7, tabGap: 3,
    toggleRight: 8, toggleWidth: 28, toggleHeight: 39,
    toggleSvg: safeSvg(toggle.svg),
    toggleIconX: 6, toggleIconY: 12, toggleIconSize: 16,
    toggleIconColor: String(toggleIcon.color), toggleIconOpacity: Number(toggleIcon.opacity),
    tabs: parsed };
}

interface Box { rect: { x: number; y: number; width: number; height: number }; background: string }
function box(value: unknown, name: string): Box {
  const data = record(value, `Side Panel: ${name} ausente.`);
  const raw = record(data.rect, `Side Panel: rect de ${name} ausente.`);
  const rect = { x: Number(raw.x), y: Number(raw.y), width: Number(raw.width), height: Number(raw.height) };
  if (Object.values(rect).some((number) => !Number.isFinite(number)) ||
      rect.width <= 0 || rect.height <= 0) throw new Error(`Side Panel: rect de ${name} inválido.`);
  return { rect, background: String(data.background) };
}

function safeSvg(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('<svg ') ||
      !value.includes('viewBox="0 0 24 24"') ||
      !value.includes('currentColor') ||
      /<script|<foreignObject|\son\w+=|\shref=|\sxlink:href=/i.test(value)) {
    throw new Error('Side Panel: SVG observado ausente ou inseguro.');
  }
  return value;
}
