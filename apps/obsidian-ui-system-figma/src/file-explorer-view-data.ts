import { record } from './reader-primitives';

export interface FilesAction {
  name: string;
  svg: string;
  color: string;
}

export interface FilesRow {
  kind: 'folder' | 'tagged' | 'file';
  state: 'Expanded' | 'Collapsed' | 'Default';
  depth: number;
  label: string;
  tag: 'json' | 'zip' | null;
  labelOffset: number;
}

export interface FileExplorerViewModel {
  width: number;
  height: number;
  header: { height: number; padding: number; gap: number; iconSize: number;
    iconX: number; iconY: number; iconOpacity: number; actions: FilesAction[] };
  body: { paddingTop: number; paddingX: number; paddingBottom: number; rowGap: number;
    rowHeight: number; fontFamily: string; fontSize: number; lineHeight: number;
    defaultColor: string; rightInset: number; rows: FilesRow[] };
}

/** Focused projection of the currently open Files scene, bounded to observed row depths. */
export function readFileExplorerViewModel(input: unknown): FileExplorerViewModel {
  const root = record(input, 'Files View: probe inválido.');
  if (root.format !== 'obsidian-file-explorer-view-probe' || root.version !== 1 ||
      root.mode !== 'Dark' || root.hostWidth !== 200) {
    throw new Error('Files View: apenas a cena Dark de 200 px é suportada.');
  }
  const header = record(root.header, 'Files View: header ausente.');
  const body = record(root.body, 'Files View: corpo ausente.');
  const defaultFile = record(body.defaultFile, 'Files View: arquivo comum ausente.');
  const names = ['New note', 'New folder', 'Change sort order',
    'Auto-reveal current file', 'Collapse all'];
  if (header.height !== 40 || header.padding !== 8 || header.gap !== 2 ||
      header.iconSize !== 16 || header.iconX !== 6 || header.iconY !== 4 ||
      header.iconOpacity !== 0.85 || !Array.isArray(header.actions) ||
      header.actions.length !== names.length) {
    throw new Error('Files View: geometria dos controles divergente.');
  }
  const actions = header.actions.map((raw, index): FilesAction => {
    const action = record(raw, `Files View: ação ${index} inválida.`);
    const size = record(action.size, `Files View: tamanho da ação ${index} ausente.`);
    const svg = action.svg;
    if (action.name !== names[index] || size.width !== 28 || size.height !== 24 ||
        action.color !== 'rgb(179, 179, 179)' ||
        typeof svg !== 'string' || !svg.startsWith('<svg ') ||
        !svg.includes('viewBox="0 0 24 24"') || !svg.includes('currentColor') ||
        /<script|<foreignObject|\son\w+=|\shref=|\sxlink:href=/i.test(svg)) {
      throw new Error(`Files View: ação ${index} diverge da cena observada.`);
    }
    return { name: names[index]!, svg, color: action.color as string };
  });
  if (body.paddingTop !== 4 || body.paddingX !== 12 || body.paddingBottom !== 24 ||
      body.rowGap !== 2 || body.background !== 'rgba(0, 0, 0, 0)' ||
      defaultFile.color !== 'rgb(179, 179, 179)' ||
      typeof defaultFile.fontFamily !== 'string' ||
      !defaultFile.fontFamily.includes('ui-sans-serif') ||
      defaultFile.fontSize !== 13 || defaultFile.lineHeight !== 16.9 ||
      defaultFile.rightInset !== 8 || !Array.isArray(body.rows) || body.rows.length !== 9) {
    throw new Error('Files View: corpo divergente da cena observada.');
  }
  const expected: Array<Pick<FilesRow, 'kind' | 'state' | 'depth' | 'tag'>> = [
    { kind: 'folder', state: 'Collapsed', depth: 0, tag: null },
    { kind: 'folder', state: 'Expanded', depth: 0, tag: null },
    { kind: 'folder', state: 'Expanded', depth: 1, tag: null },
    { kind: 'folder', state: 'Expanded', depth: 2, tag: null },
    { kind: 'file', state: 'Default', depth: 3, tag: null },
    { kind: 'tagged', state: 'Default', depth: 2, tag: 'json' },
    { kind: 'tagged', state: 'Default', depth: 2, tag: 'zip' },
    { kind: 'file', state: 'Default', depth: 0, tag: null },
    { kind: 'file', state: 'Default', depth: 0, tag: null },
  ];
  const rows = body.rows.map((raw, index): FilesRow => {
    const row = record(raw, `Files View: row ${index} inválida.`);
    const contract = expected[index]!;
    const offset = contract.depth === 3 ? 75 : contract.depth === 2 ? 58 :
      contract.depth === 1 ? 41 : 24;
    if (row.kind !== contract.kind || row.state !== contract.state ||
        row.depth !== contract.depth || row.tag !== contract.tag ||
        typeof row.label !== 'string' || !row.label.trim() ||
        row.labelOffset !== offset || row.width !== 176 || row.height !== 24.890625) {
      throw new Error(`Files View: row ${index} diverge da observação.`);
    }
    return { kind: contract.kind, state: contract.state, depth: contract.depth,
      tag: contract.tag, label: row.label, labelOffset: offset };
  });
  return { width: 200, height: 440,
    header: { height: 40, padding: 8, gap: 2, iconSize: 16,
      iconX: 6, iconY: 4, iconOpacity: 0.85, actions },
    body: { paddingTop: 4, paddingX: 12, paddingBottom: 24, rowGap: 2,
      rowHeight: 24.890625, fontFamily: defaultFile.fontFamily as string,
      fontSize: 13, lineHeight: 16.9, defaultColor: defaultFile.color as string,
      rightInset: 8, rows } };
}
