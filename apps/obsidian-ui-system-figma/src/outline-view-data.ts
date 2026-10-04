import { record } from './reader-primitives';

export interface OutlineRow {
  depth: 0 | 1 | 2; hasChildren: boolean; state: 'Default' | 'Selected'; label: string;
}
export interface OutlineViewModel {
  width: number; height: number; fontFamily: string;
  actions: Array<{ name: string; reuse?: string; active?: boolean; svg?: string }>;
  tab: { title: string; svg: string };
  body: { paddingTop: number; paddingX: number; paddingBottom: number; rowGap: number;
    fontSize: number; lineHeight: number; rowPaddingY: number; rowPaddingRight: number;
    depthStep: number; labelOffset: number; disclosureSize: number; disclosureSvg: string;
    rows: OutlineRow[] };
}

/** Focused projection of the visible Outline fixture, not a generic tree contract. */
export function readOutlineViewModel(input: unknown): OutlineViewModel {
  const root = record(input, 'Outline View: probe inválido.');
  const header = record(root.header, 'Outline View: header ausente.');
  const tab = record(root.tab, 'Outline View: tab ausente.');
  const body = record(root.body, 'Outline View: body ausente.');
  const guide = record(body.guide, 'Outline View: guia vertical ausente.');
  const safeSvg = (value: unknown): value is string => typeof value === 'string' &&
    value.startsWith('<svg ') && value.includes('viewBox="0 0 24 24"') &&
    value.includes('currentColor') &&
    !/<script|<foreignObject|\son\w+=|\shref=|\sxlink:href=/i.test(value);
  if (root.format !== 'obsidian-outline-view-probe' || root.version !== 1 ||
      root.mode !== 'Dark' || root.hostWidth !== 226.921875 ||
      typeof root.fontFamily !== 'string' || !root.fontFamily.includes('ui-sans-serif') ||
      header.height !== 40 || tab.title !== 'Outline' || !safeSvg(tab.svg) ||
      body.paddingTop !== 4 || body.paddingX !== 12 || body.paddingBottom !== 32 ||
      body.rowGap !== 2 || body.fontSize !== 13 || body.lineHeight !== 16.9 ||
      body.rowPaddingY !== 4 || body.rowPaddingRight !== 8 || body.depthStep !== 17 ||
      body.labelOffset !== 24 || body.disclosureSize !== 10 ||
      guide.width !== 1 || guide.inset !== 12 || guide.opacity !== 0.12 ||
      !safeSvg(body.disclosureSvg) || !Array.isArray(header.actions) ||
      header.actions.length !== 3 || !Array.isArray(body.rows) || body.rows.length !== 4) {
    throw new Error('Outline View: apenas a cena Dark observada é suportada.');
  }
  const actionNames = ['Show search filter', 'Auto-scroll to current section', 'Expand all'];
  const actions = header.actions.map((raw, index) => {
    const action = record(raw, `Outline View: ação ${index} inválida.`);
    if (action.name !== actionNames[index] || (index === 0
      ? action.reuse !== 'Show search filter' || action.svg !== undefined
      : !safeSvg(action.svg) || action.reuse !== undefined) ||
      action.active !== (index === 1 ? true : undefined)) {
      throw new Error(`Outline View: ação ${index} divergente.`);
    }
    return { name: action.name as string,
      ...(index === 0 ? { reuse: action.reuse as string } : { svg: action.svg as string }),
      ...(index === 1 ? { active: true } : {}) };
  });
  const specs = [
    { depth: 0, hasChildren: true, state: 'Default' },
    { depth: 1, hasChildren: true, state: 'Default' },
    { depth: 2, hasChildren: false, state: 'Default' },
    { depth: 1, hasChildren: false, state: 'Selected' },
  ] as const;
  const rows = body.rows.map((raw, index): OutlineRow => {
    const row = record(raw, `Outline View: linha ${index} inválida.`);
    const spec = specs[index]!;
    if (row.depth !== spec.depth || row.hasChildren !== spec.hasChildren ||
        row.state !== spec.state || typeof row.label !== 'string' || !row.label.trim()) {
      throw new Error(`Outline View: linha ${index} diverge da observação.`);
    }
    return { ...spec, label: row.label as string };
  });
  return { width: 200, height: 480, fontFamily: root.fontFamily, actions,
    tab: { title: 'Outline', svg: tab.svg as string },
    body: { paddingTop: 4, paddingX: 12, paddingBottom: 32, rowGap: 2,
      fontSize: 13, lineHeight: 16.9, rowPaddingY: 4, rowPaddingRight: 8,
      depthStep: 17, labelOffset: 24, disclosureSize: 10,
      disclosureSvg: body.disclosureSvg as string, rows } };
}
