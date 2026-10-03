import { record } from './reader-primitives';

export interface SearchViewGroup {
  title: string;
  collapsed: boolean;
  matches: { text: string; height: number }[];
}

export interface SearchViewModel {
  width: number;
  height: number;
  query: string;
  resultCount: string;
  sortLabel: string;
  fontFamily: string;
  geometry: {
    inset: number; searchRowHeight: number; searchRowTop: number; searchRowBottom: number;
    searchRowGap: number; searchSettingsWidth: number; inputTextLeft: number;
    inputTextRight: number; resultsInfoHeight: number; resultsTopPadding: number;
    titleHeight: number; titleTextLeft: number; matchTopGap: number;
    matchBottomGap: number; matchHorizontalPadding: number; matchVerticalPadding: number;
  };
  colors: Record<'background' | 'input' | 'inputBorder' | 'normal' | 'muted' |
    'subtle' | 'matchBackground', string>;
  icons: Record<'matchCase' | 'settings' | 'disclosure' | 'more', string>;
  groups: SearchViewGroup[];
}

/** Bounded Dark Search scene: controls, count/sort bar and selected file-grouped matches. */
export function readSearchViewModel(input: unknown): SearchViewModel {
  const root = record(input, 'Search View: probe inválido.');
  if (root.format !== 'obsidian-search-view-probe' || root.version !== 1 || root.mode !== 'Dark') {
    throw new Error('Search View: apenas o probe Dark v1 é suportado.');
  }
  const geometry = record(root.geometry, 'Search View: geometria ausente.');
  const colors = record(root.colors, 'Search View: cores ausentes.');
  const icons = record(root.icons, 'Search View: ícones ausentes.');
  const requiredGeometry = [
    'inset', 'searchRowHeight', 'searchRowTop', 'searchRowBottom', 'searchRowGap',
    'searchSettingsWidth', 'inputTextLeft', 'inputTextRight', 'resultsInfoHeight',
    'resultsTopPadding', 'titleHeight', 'titleTextLeft', 'matchTopGap',
    'matchBottomGap', 'matchHorizontalPadding', 'matchVerticalPadding',
  ] as const;
  const parsedGeometry = Object.fromEntries(requiredGeometry.map((key) => {
    const value = Number(geometry[key]);
    if (!Number.isFinite(value) || value < 0) throw new Error(`Search View: ${key} inválido.`);
    return [key, value];
  })) as unknown as SearchViewModel['geometry'];
  const requiredColors = ['background', 'input', 'inputBorder', 'normal', 'muted',
    'subtle', 'matchBackground'] as const;
  const parsedColors = Object.fromEntries(requiredColors.map((key) => {
    const value = String(colors[key]);
    const channels = /^rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)$/.exec(value)?.slice(1).map(Number);
    if (!channels || channels.some((channel) => channel > 255)) {
      throw new Error(`Search View: cor ${key} inválida.`);
    }
    return [key, value];
  })) as SearchViewModel['colors'];
  const requiredIcons = ['matchCase', 'settings', 'disclosure', 'more'] as const;
  const parsedIcons = Object.fromEntries(requiredIcons.map((key) => {
    const value = String(icons[key]);
    if (!value.startsWith('<svg ') || !value.includes('</svg>') ||
        !value.includes('viewBox="0 0 24 24"') ||
        /<script|<foreignObject|\son\w+=|\shref=|\sxlink:href=/i.test(value)) {
      throw new Error(`Search View: SVG ${key} inválido.`);
    }
    return [key, value];
  })) as SearchViewModel['icons'];
  if (!Array.isArray(root.groups) || root.groups.length !== 2) {
    throw new Error('Search View: os dois grupos selecionados são exigidos.');
  }
  const groups = root.groups.map((raw, index): SearchViewGroup => {
    const group = record(raw, `Search View: grupo ${index} inválido.`);
    if (typeof group.title !== 'string' || !group.title.trim() ||
        typeof group.collapsed !== 'boolean' || !Array.isArray(group.matches)) {
      throw new Error(`Search View: grupo ${index} incompleto.`);
    }
    const matches = group.matches.map((rawMatch, matchIndex) => {
      const match = record(rawMatch, `Search View: match ${index}/${matchIndex} inválido.`);
      const height = Number(match.height);
      if (typeof match.text !== 'string' || !match.text.trim() ||
          !Number.isFinite(height) || height < 24) {
        throw new Error(`Search View: match ${index}/${matchIndex} incompleto.`);
      }
      return { text: match.text, height };
    });
    if (group.collapsed || matches.length !== 2) {
      throw new Error(`Search View: anatomia observada do grupo ${index} mudou.`);
    }
    return { title: group.title, collapsed: group.collapsed, matches };
  });
  const width = Number(root.width);
  const height = Number(root.height);
  if (width !== 200 || !Number.isFinite(height) || height < 500 ||
      typeof root.query !== 'string' || !root.query ||
      typeof root.resultCount !== 'string' || !root.resultCount ||
      typeof root.sortLabel !== 'string' || !root.sortLabel ||
      typeof root.fontFamily !== 'string' || !root.fontFamily) {
    throw new Error('Search View: cena observada incompleta.');
  }
  return { width, height, query: root.query, resultCount: root.resultCount,
    sortLabel: root.sortLabel, fontFamily: root.fontFamily,
    geometry: parsedGeometry, colors: parsedColors, icons: parsedIcons, groups };
}
