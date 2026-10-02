import { parseCssPx, record } from './reader-primitives';

/** The observed Dark is-unsupported row with a trailing tag, separate from Active. */
export interface FileExplorerTaggedRowModel {
  variant: 'visible-file-with-tag';
  observedClass: 'is-unsupported';
  mode: 'dark';
  label: string;
  tag: string;
  /** One scene's initial geometry; the left inset includes that scene's tree depth. */
  sample: {
    width: number;
    height: number;
    labelInset: number;
    rightInset: number;
    topInset: number;
    bottomInset: number;
    observedTagWidth: number;
  };
  labelTypography: { platform: string; fontFamily: string; fontSize: number; fontWeight: number;
    fontStyle: string; lineHeight: number };
  tagTypography: { platform: string; fontFamily: string; fontSize: number; fontWeight: number;
    fontStyle: string; lineHeight: number; letterSpacing: number };
  appearance: {
    radius: number;
    backgroundCss: string;
    labelColorCss: string;
    tagColorCss: string;
    tagBackgroundCss: string;
    tagRadius: number;
    tagPaddingX: number;
  };
}

export function readFileExplorerTaggedRows(probe: unknown): FileExplorerTaggedRowModel[] {
  const source = record(probe, 'File Explorer tag: probe inválido.');
  if (source.format !== 'obsidian-ui-internal-observed-probe' || source.version !== 1) {
    throw new Error('File Explorer tag: selecione um internal-observed-probe-*.json.');
  }
  const context = record(source.context, 'File Explorer tag: contexto ausente.');
  const environment = record(context.environment, 'File Explorer tag: ambiente ausente.');
  if (environment.mode !== 'dark') throw new Error('File Explorer tag: somente Dark foi observado.');
  const platform = string(environment.platform, 'File Explorer tag: plataforma ausente.');
  const taggedRows = source.taggedRows;
  if (!Array.isArray(taggedRows)) throw new Error('File Explorer tag: amostras JSON/ZIP ausentes.');
  const rows = ['json', 'zip'].map((extension) => {
    const matches = taggedRows.filter((value: unknown) =>
      typeof value === 'object' && value !== null && 'extension' in value && value.extension === extension);
    if (matches.length !== 1) throw new Error(`File Explorer tag: amostra ${extension.toUpperCase()} ausente ou duplicada.`);
    return readTaggedRow(matches[0], platform, extension);
  });
  return rows;
}

function readTaggedRow(value: unknown, platform: string, extension: string): FileExplorerTaggedRowModel {
  const row = record(value, 'File Explorer tag: amostra inválida.');
  const specimen = record(row.specimen, 'File Explorer tag: specimen ausente.');
  if (specimen.id !== 'obsidian.file-explorer-row' || specimen.variant !== 'visible-file-with-tag' ||
      specimen.origin !== 'internal-observed') {
    throw new Error('File Explorer tag: identidade, variante ou origem não suportada.');
  }
  const root = record(specimen.dom, 'File Explorer tag: DOM ausente.');
  if (root.tag !== 'div' || !hasClass(root.classes, 'nav-file-title') ||
      !hasClass(root.classes, 'is-unsupported')) {
    throw new Error('File Explorer tag: raiz .nav-file-title is-unsupported ausente.');
  }
  if (!Array.isArray(root.children) || root.children.length !== 2) {
    throw new Error('File Explorer tag: anatomia da row não suportada.');
  }
  const label = record(root.children[0], 'File Explorer tag: label inválido.');
  const tag = record(root.children[1], 'File Explorer tag: tag inválida.');
  if (label.tag !== 'div' || !hasClass(label.classes, 'nav-file-title-content') ||
      !Array.isArray(label.children) || label.children.length !== 0 ||
      tag.tag !== 'div' || !hasClass(tag.classes, 'nav-file-tag') ||
      !Array.isArray(tag.children) || tag.children.length !== 0) {
    throw new Error('File Explorer tag: filhos label/tag não suportados.');
  }
  const labelText = string(label.text, 'File Explorer tag: texto do label ausente.');
  const tagText = string(tag.text, 'File Explorer tag: texto da tag ausente.');
  if (labelText.includes('\n') || tagText.toLowerCase() !== extension) {
    throw new Error('File Explorer tag: conteúdo observado não suportado.');
  }
  const size = record(root.sizePx, 'File Explorer tag: tamanho da row ausente.');
  const tagSize = record(tag.sizePx, 'File Explorer tag: tamanho da tag ausente.');
  if (!positive(size.width) || !positive(size.height) || !positive(tagSize.width) || !positive(tagSize.height)) {
    throw new Error('File Explorer tag: tamanho observado inválido.');
  }
  const rootCss = record(root.styles, 'File Explorer tag: estilos da row ausentes.');
  const labelCss = record(label.styles, 'File Explorer tag: estilos do label ausentes.');
  const tagCss = record(tag.styles, 'File Explorer tag: estilos da tag ausentes.');
  const horizontal = record(row.horizontalCss, 'File Explorer tag: CSS horizontal ausente.');
  const labelHorizontal = record(horizontal.label, 'File Explorer tag: CSS horizontal do label ausente.');
  const tagHorizontal = record(horizontal.tag, 'File Explorer tag: CSS horizontal da tag ausente.');
  if (rootCss.display !== 'flex' || labelHorizontal.flexShrink !== '1' ||
      labelHorizontal.overflow !== 'hidden' || labelHorizontal.whiteSpace !== 'pre' ||
      labelHorizontal.textOverflow !== 'ellipsis' || tagHorizontal.flexShrink !== '1' ||
      tagHorizontal.alignSelf !== 'center' ||
      tagHorizontal.textTransform !== 'uppercase') {
    throw new Error('File Explorer tag: comportamento horizontal não suportado.');
  }
  const padding = fourPx(rootCss.padding, 'File Explorer tag: padding da row inválido.');
  const tagPadding = twoPx(tagCss.padding, 'File Explorer tag: padding da tag inválido.');
  if (tagPadding[0] !== 0 || tagPadding[1] !== 4) {
    throw new Error('File Explorer tag: padding da tag não suportado.');
  }
  const letterSpacing = px(tagCss.letterSpacing, 'File Explorer tag: letter-spacing inválido.');
  if (labelCss.letterSpacing !== 'normal') {
    throw new Error('File Explorer tag: letter-spacing do label não suportado.');
  }
  return {
    variant: 'visible-file-with-tag', observedClass: 'is-unsupported', mode: 'dark',
    label: labelText, tag: tagText.toUpperCase(),
    sample: { width: size.width, height: size.height, labelInset: padding[3],
      rightInset: padding[1], topInset: padding[0], bottomInset: padding[2],
      observedTagWidth: tagSize.width },
    labelTypography: typography(labelCss, platform),
    tagTypography: { ...typography(tagCss, platform), letterSpacing },
    appearance: {
      radius: px(rootCss.borderRadius, 'File Explorer tag: radius da row inválido.'),
      backgroundCss: string(rootCss.background, 'File Explorer tag: background da row ausente.'),
      labelColorCss: string(labelCss.color, 'File Explorer tag: cor do label ausente.'),
      tagColorCss: string(tagCss.color, 'File Explorer tag: cor da tag ausente.'),
      tagBackgroundCss: string(tagCss.background, 'File Explorer tag: background da tag ausente.'),
      tagRadius: px(tagCss.borderRadius, 'File Explorer tag: radius da tag inválido.'),
      tagPaddingX: tagPadding[1],
    },
  };
}

function typography(styles: Record<string, unknown>, platform: string) {
  const weight = Number(styles.fontWeight);
  if (!Number.isInteger(weight) || weight <= 0) throw new Error('File Explorer tag: peso da fonte inválido.');
  return { platform, fontFamily: string(styles.fontFamily, 'File Explorer tag: família ausente.'),
    fontSize: px(styles.fontSize, 'File Explorer tag: font-size inválido.'), fontWeight: weight,
    fontStyle: string(styles.fontStyle, 'File Explorer tag: font-style ausente.'),
    lineHeight: px(styles.lineHeight, 'File Explorer tag: line-height inválido.') };
}

function string(value: unknown, message: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(message);
  return value;
}
function positive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}
function hasClass(value: unknown, name: string): boolean {
  return Array.isArray(value) && value.includes(name);
}
function px(value: unknown, message: string): number {
  const result = parseCssPx(string(value, message));
  if (result === null) throw new Error(message);
  return result;
}
function fourPx(value: unknown, message: string): [number, number, number, number] {
  const match = /^(\d+(?:\.\d+)?)px (\d+(?:\.\d+)?)px (\d+(?:\.\d+)?)px (\d+(?:\.\d+)?)px$/.exec(string(value, message));
  if (!match) throw new Error(message);
  return [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])];
}
function twoPx(value: unknown, message: string): [number, number] {
  const match = /^(\d+(?:\.\d+)?)px (\d+(?:\.\d+)?)px$/.exec(string(value, message));
  if (!match) throw new Error(message);
  return [Number(match[1]), Number(match[2])];
}
