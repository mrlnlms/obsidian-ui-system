import { record } from './reader-primitives';

export interface BookmarkAction { name: string; svg?: string; reuse?: string }
export interface BookmarkRow {
  kind: 'Group' | 'File'; depth: 0 | 1; state: 'Default' | 'Selected';
  label: string; height: number; labelOffset: number;
}
export interface BookmarksViewModel {
  width: number; height: number; fontFamily: string;
  actions: BookmarkAction[]; rows: BookmarkRow[];
  icons: { group: string; file: string };
  body: { paddingTop: number; paddingX: number; paddingBottom: number;
    rowGap: number; fontSize: number; lineHeight: number; iconSize: number };
}

/** Bounded projection of the visible 200 px Dark Bookmarks scene. */
export function readBookmarksViewModel(input: unknown): BookmarksViewModel {
  const root = record(input, 'Bookmarks View: probe inválido.');
  const header = record(root.header, 'Bookmarks View: header ausente.');
  const body = record(root.body, 'Bookmarks View: body ausente.');
  const icons = record(body.icons, 'Bookmarks View: ícones ausentes.');
  if (root.format !== 'obsidian-bookmarks-view-probe' || root.version !== 1 ||
      root.mode !== 'Dark' || root.hostWidth !== 200 || header.height !== 40 ||
      typeof root.fontFamily !== 'string' || !root.fontFamily.includes('ui-sans-serif') ||
      body.paddingTop !== 4 || body.paddingX !== 12 || body.paddingBottom !== 32 ||
      body.rowGap !== 2 || body.fontSize !== 13 || body.lineHeight !== 16.9 ||
      body.iconSize !== 16) {
    throw new Error('Bookmarks View: apenas a cena Dark observada de 200 px é suportada.');
  }
  const safeSvg = (value: unknown): value is string => typeof value === 'string' &&
    value.startsWith('<svg ') && value.includes('viewBox="0 0 24 24"') &&
    value.includes('currentColor') &&
    !/<script|<foreignObject|\son\w+=|\shref=|\sxlink:href=/i.test(value);
  if (!safeSvg(icons.group) || !safeSvg(icons.file) ||
      !Array.isArray(header.actions) || header.actions.length !== 4 ||
      !Array.isArray(body.rows) || body.rows.length !== 3) {
    throw new Error('Bookmarks View: ações, ícones ou linhas ausentes.');
  }
  const names = ['Bookmark the active tab...', 'New group', 'Collapse all', 'Show search filter'];
  const reused = [undefined, 'New folder', 'Collapse all', undefined];
  const actions = header.actions.map((raw, index): BookmarkAction => {
    const item = record(raw, `Bookmarks View: ação ${index} inválida.`);
    if (item.name !== names[index] || item.reuse !== reused[index] ||
        (item.reuse ? item.svg !== undefined : !safeSvg(item.svg))) {
      throw new Error(`Bookmarks View: ação ${index} divergente.`);
    }
    return { name: names[index]!, ...(item.reuse ? { reuse: item.reuse as string } :
      { svg: item.svg as string }) };
  });
  const expected = [
    { kind: 'Group', depth: 0, state: 'Default', height: 24.890625, labelOffset: 24 },
    { kind: 'File', depth: 1, state: 'Selected', height: 24.890625, labelOffset: 41 },
    { kind: 'File', depth: 0, state: 'Default', height: 41.78125, labelOffset: 24 },
  ] as const;
  const rows = body.rows.map((raw, index): BookmarkRow => {
    const item = record(raw, `Bookmarks View: linha ${index} inválida.`);
    const sample = expected[index]!;
    if (item.kind !== sample.kind || item.depth !== sample.depth ||
        item.state !== sample.state || item.height !== sample.height ||
        item.labelOffset !== sample.labelOffset ||
        typeof item.label !== 'string' || !item.label.trim()) {
      throw new Error(`Bookmarks View: linha ${index} diverge da observação.`);
    }
    return { ...sample, label: item.label as string };
  });
  return { width: 200, height: 440, fontFamily: root.fontFamily,
    actions, rows, icons: { group: icons.group, file: icons.file },
    body: { paddingTop: 4, paddingX: 12, paddingBottom: 32, rowGap: 2,
      fontSize: 13, lineHeight: 16.9, iconSize: 16 } };
}
