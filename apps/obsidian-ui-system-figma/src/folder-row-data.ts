import { parseCssPx, record } from './reader-primitives';

export type FolderRowState = 'Expanded' | 'Collapsed';
export type FolderRowDepth = 0 | 1 | 2;

/** Dark folder title only. Depth is limited to the three measured rows. */
export interface FolderRowModel {
  state: FolderRowState;
  depth: FolderRowDepth;
  label: string;
  sample: {
    width: number;
    height: number;
    labelOffset: { x: number; y: number };
    disclosureOffset: { x: number; y: number };
    disclosureSize: { width: number; height: number };
    svgOffset: { x: number; y: number };
    svgSize: { width: number; height: number };
    rightInset: number;
  };
  typography: { platform: string; fontFamily: string; fontSize: number; fontWeight: number;
    fontStyle: string; lineHeight: number };
  appearance: { backgroundCss: string; radius: number; labelColorCss: string; disclosureColorCss: string };
  disclosure: { viewBox: '0 0 24 24'; path: 'M3 8L12 17L21 8';
    strokeWidth: 2; strokeLinecap: 'round'; strokeLinejoin: 'round'; rotationDeg: 0 | -90 };
}

const offsets: Record<FolderRowDepth, { disclosure: number; label: number; svg: number }> = {
  0: { disclosure: 4, label: 24, svg: 7 },
  1: { disclosure: 21, label: 41, svg: 24 },
  2: { disclosure: 38, label: 58, svg: 41 },
};

export function readFolderRowModels(probe: unknown): FolderRowModel[] {
  const source = record(probe, 'Folder row: probe inválido.');
  if (source.format !== 'obsidian-ui-internal-observed-probe' || source.version !== 1) {
    throw new Error('Folder row: selecione um internal-observed-probe-*.json.');
  }
  const context = record(source.context, 'Folder row: contexto ausente.');
  const environment = record(context.environment, 'Folder row: ambiente ausente.');
  if (environment.mode !== 'dark') throw new Error('Folder row: somente Dark foi observado.');
  const platform = nonempty(environment.platform, 'Folder row: plataforma ausente.');
  if (!Array.isArray(source.folderRows)) throw new Error('Folder row: amostras ausentes no probe.');
  const observed = source.folderRows.map((entry: unknown) => readObservedRow(entry, platform));
  const expanded = observed.find((row) => row.state === 'Expanded');
  const collapsed = observed.find((row) => row.state === 'Collapsed');
  if (!expanded || !collapsed) throw new Error('Folder row: estados expanded/collapsed ausentes.');
  const models: FolderRowModel[] = [];
  for (const depth of [0, 1, 2] as const) {
    const atDepth = observed.filter((row) => row.depth === depth);
    if (!atDepth.length) throw new Error(`Folder row: depth ${depth} ausente.`);
    const sample = atDepth[0]!;
    if (atDepth.some((row) => JSON.stringify(row.sample) !== JSON.stringify(sample.sample))) {
      throw new Error(`Folder row: geometria divergente no depth ${depth}.`);
    }
    for (const state of ['Expanded', 'Collapsed'] as const) {
      const stateReference = state === 'Expanded' ? expanded : collapsed;
      models.push({ ...sample, state, disclosure: stateReference.disclosure });
    }
  }
  const first = models[0]!;
  if (observed.some((row) => row.sample.width !== first.sample.width ||
      row.sample.height !== first.sample.height ||
      JSON.stringify(row.typography) !== JSON.stringify(first.typography) ||
      JSON.stringify(row.appearance) !== JSON.stringify(first.appearance) ||
      row.disclosure.path !== first.disclosure.path ||
      row.disclosure.viewBox !== first.disclosure.viewBox)) {
    throw new Error('Folder row: amostras não compartilham a aparência observada.');
  }
  return models;
}

function readObservedRow(value: unknown, platform: string): FolderRowModel {
  const row = record(value, 'Folder row: amostra inválida.');
  const depth = row.depth;
  if (depth !== 0 && depth !== 1 && depth !== 2) throw new Error('Folder row: depth não suportado.');
  const state = row.state === 'expanded' ? 'Expanded' : row.state === 'collapsed' ? 'Collapsed' : null;
  if (!state) throw new Error('Folder row: estado não suportado.');
  const specimen = record(row.specimen, 'Folder row: specimen ausente.');
  if (specimen.id !== 'obsidian.file-explorer-folder-row' || specimen.origin !== 'internal-observed' ||
      specimen.variant !== row.state) throw new Error('Folder row: identidade, origem ou variante não suportada.');
  const root = record(specimen.dom, 'Folder row: DOM ausente.');
  if (root.tag !== 'div' || !hasClass(root.classes, 'nav-folder-title') ||
      !hasClass(root.classes, 'mod-collapsible') || !Array.isArray(root.children) || root.children.length !== 2) {
    throw new Error('Folder row: raiz/anatomia não suportada.');
  }
  const icon = record(root.children[0], 'Folder row: disclosure ausente.');
  const label = record(root.children[1], 'Folder row: label ausente.');
  if (icon.tag !== 'div' || !hasClass(icon.classes, 'collapse-icon') ||
      hasClass(icon.classes, 'is-collapsed') !== (state === 'Collapsed') ||
      !Array.isArray(icon.children) || icon.children.length !== 1 ||
      label.tag !== 'div' || !hasClass(label.classes, 'nav-folder-title-content') ||
      !Array.isArray(label.children) || label.children.length !== 0) {
    throw new Error('Folder row: disclosure/label não suportados.');
  }
  const svg = record(icon.children[0], 'Folder row: SVG ausente.');
  if (svg.tag !== 'svg' || !hasClass(svg.classes, 'right-triangle') ||
      !Array.isArray(svg.children) || svg.children.length !== 1 ||
      record(svg.children[0], 'Folder row: path ausente.').tag !== 'path') {
    throw new Error('Folder row: SVG right-triangle não suportado.');
  }
  const text = nonempty(label.text, 'Folder row: texto ausente.');
  if (text.includes('\n')) throw new Error('Folder row: label multilinha não suportado.');
  const rootSize = size(root.sizePx, 'Folder row: tamanho da row inválido.');
  const iconSize = size(icon.sizePx, 'Folder row: tamanho do disclosure inválido.');
  const svgSize = size(svg.sizePx, 'Folder row: tamanho do SVG inválido.');
  const geometry = record(row.geometry, 'Folder row: geometria ausente.');
  const disclosureOffset = offset(geometry.disclosureOffsetPx);
  const labelOffset = offset(geometry.labelOffsetPx);
  const svgOffset = offset(geometry.svgOffsetPx);
  const expected = offsets[depth];
  if (disclosureOffset.x !== expected.disclosure || labelOffset.x !== expected.label ||
      svgOffset.x !== expected.svg || disclosureOffset.y !== 4 || labelOffset.y !== 4 ||
      svgOffset.y !== 7.4375 || iconSize.width !== 16 || iconSize.height !== 16.890625 ||
      svgSize.width !== 10 || svgSize.height !== 10 || rootSize.height !== 24.890625) {
    throw new Error(`Folder row: geometria observada do depth ${depth} divergiu.`);
  }
  const horizontal = record(row.horizontalCss, 'Folder row: CSS horizontal ausente.');
  const rootCss = record(root.styles, 'Folder row: CSS da row ausente.');
  const labelCss = record(label.styles, 'Folder row: CSS do label ausente.');
  const iconCss = record(icon.styles, 'Folder row: CSS do disclosure ausente.');
  if (rootCss.display !== 'flex' || rootCss.position !== 'relative' ||
      horizontal.flexShrink !== '1' || horizontal.whiteSpace !== 'pre' ||
      horizontal.overflow !== 'hidden' || horizontal.textOverflow !== 'ellipsis' ||
      iconCss.position !== 'absolute') {
    throw new Error('Folder row: comportamento horizontal não suportado.');
  }
  const padding = fourPx(rootCss.padding);
  if (padding[0] !== 4 || padding[1] !== 8 || padding[2] !== 4 || padding[3] !== expected.label) {
    throw new Error('Folder row: padding observado divergiu.');
  }
  const disclosure = record(row.disclosure, 'Folder row: SVG observado ausente.');
  if (disclosure.viewBox !== '0 0 24 24' || disclosure.path !== 'M3 8L12 17L21 8' ||
      disclosure.stroke !== 'currentColor' || disclosure.strokeWidth !== '2' ||
      disclosure.strokeLinecap !== 'round' || disclosure.strokeLinejoin !== 'round') {
    throw new Error('Folder row: SVG observado divergiu.');
  }
  const rotationDeg = state === 'Expanded' ? 0 : -90;
  if (disclosure.transform !== (state === 'Expanded' ? 'none' : 'matrix(0, -1, 1, 0, 0, 0)')) {
    throw new Error('Folder row: rotação observada divergiu.');
  }
  const weight = Number(labelCss.fontWeight);
  if (!Number.isInteger(weight) || weight <= 0) throw new Error('Folder row: peso da fonte inválido.');
  return { state, depth, label: text,
    sample: { width: rootSize.width, height: rootSize.height, labelOffset, disclosureOffset,
      disclosureSize: iconSize, svgOffset, svgSize, rightInset: padding[1] },
    typography: { platform, fontFamily: nonempty(labelCss.fontFamily, 'Folder row: fonte ausente.'),
      fontSize: px(labelCss.fontSize), fontWeight: weight,
      fontStyle: nonempty(labelCss.fontStyle, 'Folder row: estilo da fonte ausente.'),
      lineHeight: px(labelCss.lineHeight) },
    appearance: { backgroundCss: nonempty(rootCss.background, 'Folder row: background ausente.'),
      radius: px(rootCss.borderRadius), labelColorCss: nonempty(labelCss.color, 'Folder row: cor do label ausente.'),
      disclosureColorCss: nonempty(disclosure.colorCss, 'Folder row: cor do disclosure ausente.') },
    disclosure: { viewBox: '0 0 24 24', path: 'M3 8L12 17L21 8', strokeWidth: 2,
      strokeLinecap: 'round', strokeLinejoin: 'round', rotationDeg },
  };
}

function nonempty(value: unknown, message: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(message);
  return value;
}
function hasClass(value: unknown, name: string): boolean {
  return Array.isArray(value) && value.includes(name);
}
function size(value: unknown, message: string): { width: number; height: number } {
  const result = record(value, message);
  if (typeof result.width !== 'number' || !Number.isFinite(result.width) || result.width <= 0 ||
      typeof result.height !== 'number' || !Number.isFinite(result.height) || result.height <= 0) throw new Error(message);
  return { width: result.width, height: result.height };
}
function offset(value: unknown): { x: number; y: number } {
  const result = record(value, 'Folder row: offset ausente.');
  if (typeof result.x !== 'number' || !Number.isFinite(result.x) ||
      typeof result.y !== 'number' || !Number.isFinite(result.y)) throw new Error('Folder row: offset inválido.');
  return { x: result.x, y: result.y };
}
function px(value: unknown): number {
  const result = parseCssPx(nonempty(value, 'Folder row: valor CSS ausente.'));
  if (result === null) throw new Error('Folder row: valor CSS em px inválido.');
  return result;
}
function fourPx(value: unknown): [number, number, number, number] {
  const match = /^(\d+(?:\.\d+)?)px (\d+(?:\.\d+)?)px (\d+(?:\.\d+)?)px (\d+(?:\.\d+)?)px$/.exec(
    nonempty(value, 'Folder row: padding ausente.'));
  if (!match) throw new Error('Folder row: padding inválido.');
  return [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])];
}
