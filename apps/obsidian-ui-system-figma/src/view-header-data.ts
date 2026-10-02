import { parseCssPx, record } from './reader-primitives';

export interface HeaderRect { x: number; y: number; width: number; height: number }
export interface HeaderText {
  text: string;
  rect: HeaderRect;
  colorCss: string;
  padding: { top: number; right: number; bottom: number; left: number };
}
export interface HeaderIcon {
  name: string;
  rect: HeaderRect;
  svgRect: HeaderRect;
  svgMarkup: string;
  colorCss: string;
  opacity: number;
  disabled: boolean;
}
export interface ViewHeaderModel {
  sourceView: 'markdown';
  sample: { width: number; height: number; contentHeight: number; horizontalInset: number; gap: number };
  left: HeaderRect;
  titleArea: HeaderRect;
  breadcrumbArea: HeaderRect;
  actionsArea: HeaderRect;
  appearance: { backgroundCss: string };
  typography: { platform: 'macos'; fontFamily: string; fontSize: number; fontWeight: number;
    fontStyle: string; lineHeight: number };
  breadcrumbs: HeaderText[];
  title: HeaderText;
  navigation: HeaderIcon[];
  actions: HeaderIcon[];
}

/** One visible Dark Markdown View Header, with a hidden Bookmarks header as structural comparison. */
export function readViewHeaderModel(probe: unknown): ViewHeaderModel {
  const root = record(probe, 'View Header: probe inválido.');
  if (root.format !== 'obsidian-ui-view-header-probe' || root.version !== 1) {
    throw new Error('View Header: selecione um view-header-probe-*.json.');
  }
  const environment = record(root.environment, 'View Header: ambiente ausente.');
  if (environment.mode !== 'dark' || environment.platform !== 'MacIntel') {
    throw new Error('View Header: somente a amostra Dark no macOS foi observada.');
  }
  const source = record(root.source, 'View Header: origem ausente.');
  if (source.viewType !== 'markdown') throw new Error('View Header: view de origem não suportada.');
  const comparison = record(root.comparison, 'View Header: comparação ausente.');
  if (comparison.viewType !== 'bookmarks' || comparison.headerDisplay !== 'none' ||
      JSON.stringify(comparison.headerChildren) !== JSON.stringify([
        ['view-header-left'], ['view-header-title-container', 'mod-at-start', 'mod-fade', 'mod-at-end'],
        ['view-actions', 'mod-raised'],
      ])) throw new Error('View Header: comparação estrutural inesperada.');

  const header = node(root.header, 'view-header');
  const left = node(root.left, 'view-header-left');
  const nav = node(root.nav, 'view-header-nav-buttons');
  const titleArea = node(root.titleContainer, 'view-header-title-container');
  const breadcrumbArea = node(root.titleParent, 'view-header-title-parent');
  const titleNode = node(root.title, 'view-header-title');
  const actionsArea = node(root.actions, 'view-actions');
  if (header.css.display !== 'flex' || titleArea.css.display !== 'flex' ||
      titleArea.css.flex !== '1 1 auto' || titleArea.css.overflow !== 'hidden' ||
      (titleArea.css.minWidth !== undefined && titleArea.css.minWidth !== '0px') ||
      breadcrumbArea.css.display !== 'flex' || breadcrumbArea.css.flex !== '0 100 auto' ||
      breadcrumbArea.css.overflow !== 'hidden' || breadcrumbArea.css.whiteSpace !== 'nowrap' ||
      titleNode.css.flex !== '0 0 auto' ||
      (titleNode.css.maxWidth !== undefined && titleNode.css.maxWidth !== '100%') ||
      actionsArea.css.display !== 'flex' || nav.css.display !== 'flex') {
    throw new Error('View Header: layout observado não suportado.');
  }
  const width = header.rect.width;
  const height = header.rect.height;
  if (typeof source.hostWidth !== 'number' || Math.abs(source.hostWidth - width) > 0.05 ||
      Math.abs(left.rect.x - 12) > 0.05 || Math.abs(titleArea.rect.x - left.rect.x - left.rect.width - 8) > 0.05 ||
      Math.abs(actionsArea.rect.x - titleArea.rect.x - titleArea.rect.width - 8) > 0.05 ||
      Math.abs(width - actionsArea.rect.x - actionsArea.rect.width - 12) > 0.05 ||
      Math.abs(left.rect.height - actionsArea.rect.height) > 0.05 ||
      Math.abs(height - left.rect.height - 1) > 0.05) {
    throw new Error('View Header: geometria horizontal ou altura divergente.');
  }
  if (nav.rect.x !== left.rect.x || nav.rect.width !== left.rect.width) {
    throw new Error('View Header: navegação fora da área esquerda.');
  }
  const title = text(titleNode);
  if (!title.text || titleNode.css.whiteSpace !== 'pre' || titleNode.css.textOverflow !== 'ellipsis') {
    throw new Error('View Header: título observado não suportado.');
  }
  if (!Array.isArray(root.titleParts) || !root.titleParts.length || root.titleParts.length % 2 !== 0) {
    throw new Error('View Header: breadcrumb observado ausente.');
  }
  const breadcrumbs = root.titleParts.map((part: unknown, index: number) => {
    const item = node(part, index % 2 === 0 ? 'view-header-breadcrumb' : 'view-header-breadcrumb-separator');
    if (index % 2 === 1 && item.text !== '/') throw new Error('View Header: separador inesperado.');
    if (item.css.flex !== '0 1 auto' || item.css.whiteSpace !== 'nowrap' ||
        (index % 2 === 0 && (item.css.overflow !== 'hidden' || item.css.textOverflow !== 'ellipsis')) ||
        (index % 2 === 1 && (item.css.overflow !== 'visible' || item.css.textOverflow !== 'clip'))) {
      throw new Error('View Header: prioridade horizontal do breadcrumb inesperada.');
    }
    if (item.css.fontFamily !== titleNode.css.fontFamily || item.css.fontSize !== titleNode.css.fontSize ||
        item.css.fontWeight !== titleNode.css.fontWeight || item.css.fontStyle !== titleNode.css.fontStyle ||
        item.css.lineHeight !== titleNode.css.lineHeight) {
      throw new Error('View Header: tipografia do breadcrumb divergente.');
    }
    return text(item);
  });
  const typography = titleNode.css;
  const fontSize = px(typography.fontSize);
  const lineHeight = px(typography.lineHeight);
  const fontWeight = Number(typography.fontWeight);
  if (!Number.isInteger(fontWeight) || fontWeight < 100 || !nonempty(typography.fontFamily) ||
      !nonempty(typography.fontStyle)) throw new Error('View Header: tipografia inválida.');
  const navigation = icons(root.navButtons, 'navigation');
  const actions = icons(root.actionButtons, 'actions');
  if (navigation.length !== 2 || actions.length !== 2 ||
      navigation.some((item) => item.rect.x < left.rect.x || item.rect.x + item.rect.width > left.rect.x + left.rect.width) ||
      actions.some((item) => item.rect.x < actionsArea.rect.x ||
        item.rect.x + item.rect.width > actionsArea.rect.x + actionsArea.rect.width)) {
    throw new Error('View Header: áreas de ícones divergentes.');
  }
  return {
    sourceView: 'markdown',
    sample: { width, height, contentHeight: left.rect.height, horizontalInset: 12, gap: 8 },
    left: left.rect, titleArea: titleArea.rect, breadcrumbArea: breadcrumbArea.rect,
    actionsArea: actionsArea.rect,
    appearance: { backgroundCss: nonempty(header.css.backgroundColor) },
    typography: { platform: 'macos', fontFamily: typography.fontFamily as string, fontSize,
      fontWeight, fontStyle: typography.fontStyle as string, lineHeight },
    breadcrumbs, title, navigation, actions,
  };
}

type ObservedNode = { tag: unknown; classes: unknown; text: unknown; rect: HeaderRect;
  css: Record<string, unknown> };
function node(value: unknown, className: string): ObservedNode {
  const item = record(value, `View Header: ${className} ausente.`);
  if (!Array.isArray(item.classes) || !item.classes.includes(className) ||
      typeof item.tag !== 'string') throw new Error(`View Header: ${className} inválido.`);
  return { tag: item.tag, classes: item.classes, text: item.text, rect: rect(item.rect),
    css: record(item.css, `View Header: CSS de ${className} ausente.`) };
}
function rect(value: unknown): HeaderRect {
  const r = record(value, 'View Header: rect ausente.');
  for (const key of ['x', 'y', 'width', 'height']) {
    if (typeof r[key] !== 'number' || !Number.isFinite(r[key])) throw new Error('View Header: rect inválido.');
  }
  if (typeof r.width !== 'number' || typeof r.height !== 'number' ||
      r.width <= 0 || r.height <= 0) throw new Error('View Header: rect vazio.');
  return r as unknown as HeaderRect;
}
function text(value: ObservedNode): HeaderText {
  if (typeof value.text !== 'string') throw new Error('View Header: texto ausente.');
  const padding = typeof value.css.padding === 'string' ? value.css.padding.split(' ').map(px) : null;
  if (!padding || (padding.length !== 1 && padding.length !== 2)) {
    throw new Error('View Header: padding de texto não suportado.');
  }
  return { text: value.text, rect: value.rect, colorCss: nonempty(value.css.color),
    padding: { top: padding[0]!, right: padding[1] ?? padding[0]!, bottom: padding[0]!,
      left: padding[1] ?? padding[0]! } };
}
function icons(value: unknown, area: string): HeaderIcon[] {
  if (!Array.isArray(value)) throw new Error(`View Header: ${area} ausente.`);
  return value.map((entry: unknown) => {
    const item = record(entry, 'View Header: botão inválido.');
    const button = node(item.button, 'clickable-icon');
    const svg = record(item.svg, 'View Header: SVG ausente.');
    const glyph = node(svg.node, 'svg-icon');
    if (button.tag !== 'button' || glyph.tag !== 'svg' || button.css.display !== 'flex' ||
        typeof svg.markup !== 'string' || !svg.markup.startsWith('<svg ') ||
        !svg.markup.includes('width="24" height="24" viewBox="0 0 24 24"') ||
        !svg.markup.includes('stroke="currentColor"') || /<script|<foreignObject|\son\w+=/i.test(svg.markup)) {
      throw new Error('View Header: ícone observado não suportado.');
    }
    const label = nonempty(item.ariaLabel).split('\n')[0]!;
    const buttonOpacity = Number(button.css.opacity);
    const svgOpacity = Number(glyph.css.opacity);
    if (![buttonOpacity, svgOpacity].every((n) => Number.isFinite(n) && n >= 0 && n <= 1)) {
      throw new Error('View Header: opacidade de ícone inválida.');
    }
    return { name: label, rect: button.rect, svgRect: glyph.rect, svgMarkup: svg.markup,
      colorCss: nonempty(glyph.css.color), opacity: buttonOpacity * svgOpacity,
      disabled: item.ariaDisabled === 'true' };
  });
}
function px(value: unknown): number {
  if (typeof value !== 'string') throw new Error('View Header: valor CSS ausente.');
  const result = parseCssPx(value);
  if (result === null) throw new Error(`View Header: px inválido: ${value}.`);
  return result;
}
function nonempty(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('View Header: valor ausente.');
  return value;
}
