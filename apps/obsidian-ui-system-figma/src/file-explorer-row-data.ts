import { parseCssPx, record } from './reader-primitives';

/** The single observed File Explorer file row, before any Figma translation. */
export interface FileExplorerRowModel {
  variant: 'visible-file';
  observedState: 'active';
  mode: 'dark';
  label: string;
  /** Initial size measured in the captured specimen, not a sizing rule. */
  sizePx: { width: number; height: number };
  /** Measured in this specimen; not a resizing or alignment rule. */
  labelOffsetPx: { x: number; y: number };
  /** Observed content box, retained only for comparison with the Figma rendering. */
  labelSizePx: { width: number; height: number };
  typography: {
    platform: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    fontStyle: string;
    lineHeight: number;
  };
  appearance: {
    padding: { top: number; right: number; bottom: number; left: number };
    radius: number;
    backgroundCss: string;
    labelColorCss: string;
  };
}

export function readFileExplorerRowImport(probe: unknown): FileExplorerRowModel {
  const source = record(probe, 'File Explorer row: probe inválido.');
  if (source.format !== 'obsidian-ui-internal-observed-probe' || source.version !== 1) {
    throw new Error('File Explorer row: selecione um internal-observed-probe-*.json; o relatório horizontal não é um probe.');
  }
  const context = record(source.context, 'File Explorer row: contexto ausente.');
  const environment = record(context.environment, 'File Explorer row: ambiente ausente.');
  if (environment.mode !== 'dark') throw new Error('File Explorer row: somente a aparência Dark foi observada.');
  const platform = nonempty(environment.platform, 'File Explorer row: plataforma ausente.');

  const specimen = record(source.specimen, 'File Explorer row: specimen ausente.');
  if (specimen.id !== 'obsidian.file-explorer-row' || specimen.variant !== 'visible-file' ||
      specimen.origin !== 'internal-observed') {
    throw new Error('File Explorer row: identidade, variante ou origem não suportada.');
  }
  const root = record(specimen.dom, 'File Explorer row: DOM ausente.');
  if (root.tag !== 'div' || !hasClass(root.classes, 'nav-file-title') ||
      !hasClass(root.classes, 'is-active')) {
    throw new Error('File Explorer row: raiz ativa .nav-file-title ausente.');
  }
  if (!Array.isArray(root.children) || root.children.length !== 1) {
    throw new Error('File Explorer row: anatomia da linha não suportada.');
  }
  const content = record(root.children[0], 'File Explorer row: conteúdo inválido.');
  if (content.tag !== 'div' || !hasClass(content.classes, 'nav-file-title-content') ||
      !Array.isArray(content.children) || content.children.length !== 0) {
    throw new Error('File Explorer row: .nav-file-title-content ausente ou alterado.');
  }
  const label = nonempty(content.text, 'File Explorer row: label ausente.');
  if (label.includes('\n')) throw new Error('File Explorer row: label multilinha não suportado.');
  const labelSize = record(content.sizePx, 'File Explorer row: tamanho observado do label ausente.');
  if (!positive(labelSize.width) || !positive(labelSize.height)) {
    throw new Error('File Explorer row: tamanho observado do label inválido.');
  }
  const size = record(root.sizePx, 'File Explorer row: tamanho observado ausente.');
  if (!positive(size.width) || !positive(size.height)) {
    throw new Error('File Explorer row: tamanho observado inválido.');
  }
  const offset = record(source.labelOffsetPx, 'File Explorer row: posição observada do label ausente.');
  if (typeof offset.x !== 'number' || !Number.isFinite(offset.x) ||
      typeof offset.y !== 'number' || !Number.isFinite(offset.y)) {
    throw new Error('File Explorer row: posição observada do label inválida.');
  }

  const rootStyles = record(root.styles, 'File Explorer row: estilos da raiz ausentes.');
  const contentStyles = record(content.styles, 'File Explorer row: estilos do conteúdo ausentes.');
  const fontWeight = Number(contentStyles.fontWeight);
  if (!Number.isInteger(fontWeight) || fontWeight <= 0) {
    throw new Error('File Explorer row: peso da fonte inválido.');
  }
  if (contentStyles.letterSpacing !== 'normal') {
    throw new Error('File Explorer row: letter-spacing não suportado.');
  }
  return {
    variant: 'visible-file',
    observedState: 'active',
    mode: 'dark',
    label,
    sizePx: { width: size.width, height: size.height },
    labelOffsetPx: { x: offset.x, y: offset.y },
    labelSizePx: { width: labelSize.width, height: labelSize.height },
    typography: {
      platform,
      fontFamily: nonempty(contentStyles.fontFamily, 'File Explorer row: família da fonte ausente.'),
      fontSize: px(contentStyles.fontSize, 'File Explorer row: tamanho da fonte inválido.'),
      fontWeight,
      fontStyle: nonempty(contentStyles.fontStyle, 'File Explorer row: estilo da fonte ausente.'),
      lineHeight: px(contentStyles.lineHeight, 'File Explorer row: line-height inválido.'),
    },
    appearance: {
      padding: padding(rootStyles.padding),
      radius: px(rootStyles.borderRadius, 'File Explorer row: radius inválido.'),
      backgroundCss: nonempty(rootStyles.background, 'File Explorer row: background ausente.'),
      labelColorCss: nonempty(contentStyles.color, 'File Explorer row: cor do label ausente.'),
    },
  };
}

function positive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function hasClass(value: unknown, name: string): boolean {
  return Array.isArray(value) && value.includes(name);
}

function nonempty(value: unknown, message: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(message);
  return value;
}

function px(value: unknown, message: string): number {
  const parsed = parseCssPx(nonempty(value, message));
  if (parsed === null) throw new Error(message);
  return parsed;
}

function padding(value: unknown): FileExplorerRowModel['appearance']['padding'] {
  const match = /^(\d+(?:\.\d+)?)px (\d+(?:\.\d+)?)px (\d+(?:\.\d+)?)px (\d+(?:\.\d+)?)px$/.exec(
    nonempty(value, 'File Explorer row: padding ausente.'),
  );
  if (!match) throw new Error('File Explorer row: padding não suportado.');
  return { top: Number(match[1]), right: Number(match[2]), bottom: Number(match[3]), left: Number(match[4]) };
}
