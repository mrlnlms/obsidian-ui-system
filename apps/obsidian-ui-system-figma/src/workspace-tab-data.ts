import { record } from './reader-primitives';

export interface TabRect { x: number; y: number; width: number; height: number }
export interface TabVariant {
  context: 'Main' | 'Sidedock';
  state: 'Active' | 'Inactive';
  title: string;
  size: { width: number; height: number };
  label: { x: number; y: number; width: number; height: number; right: number; color: string };
  icon?: { svg: string; x: number; y: number; width: number; height: number; color: string; opacity: number };
  close?: { svg: string; x: number; y: number; width: number; height: number; color: string };
  background: string;
  radius: number;
}
export interface WorkspaceTabModel {
  variants: TabVariant[];
  hostBackground: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  mainGap: number;
  sidedockGap: number;
}

type Observed = { rect: TabRect; css: Record<string, unknown>; svg?: string };

/** Only the four Dark appearances already visible in the bounded Desktop scene. */
export function readWorkspaceTabModel(input: unknown): WorkspaceTabModel {
  const root = record(input, 'Workspace Tab: probe inválido.');
  const environment = record(root.environment, 'Workspace Tab: ambiente ausente.');
  if (root.format !== 'obsidian-ui-workspace-tab-probe' || root.version !== 1 ||
      environment.mode !== 'dark' || environment.platform !== 'macos') {
    throw new Error('Workspace Tab: selecione o probe Dark do macOS.');
  }
  const samples = record(root.samples, 'Workspace Tab: amostras ausentes.');
  const entries = [
    ['main-active', 'Main', 'Active'], ['main-inactive', 'Main', 'Inactive'],
    ['sidedock-active', 'Sidedock', 'Active'], ['sidedock-inactive', 'Sidedock', 'Inactive'],
  ] as const;
  const variants = entries.map(([key, context, state]): TabVariant => {
    const sample = record(samples[key], `Workspace Tab: ${key} ausente.`);
    const tab = observed(sample.root, `${key}.root`);
    const inner = observed(sample.inner, `${key}.inner`);
    const label = observed(sample.label, `${key}.label`);
    const icon = observed(sample.icon, `${key}.icon`);
    const iconSvg = observed(sample.iconSvg, `${key}.iconSvg`);
    const close = observed(sample.close, `${key}.close`);
    const closeSvg = observed(sample.closeSvg, `${key}.closeSvg`);
    const active = state === 'Active';
    if (sample.active !== active || sample.modActive !== (context === 'Main' && active) ||
        typeof sample.title !== 'string' || !sample.title ||
        tab.css.display !== 'flex' || inner.css.display !== 'flex' ||
        inner.css.overflow !== 'hidden' ||
        label.css.textOverflow !== 'ellipsis' || label.css.whiteSpace !== 'nowrap' ||
        sample.hostBackground !== 'rgb(40, 40, 40)') {
      throw new Error(`Workspace Tab: estrutura ou estado de ${key} divergente.`);
    }
    const main = context === 'Main';
    if (main ? tab.css.flex !== '1 1 0px' || tab.css.minWidth !== '0px' ||
        tab.css.maxWidth !== '320px' || tab.rect.height !== 34 ||
        icon.css.display !== 'none' || close.css.display !== (active ? 'flex' : 'none') :
        tab.css.flex !== '0 1 auto' || tab.rect.width !== 28 || tab.rect.height !== 25 ||
        icon.css.display !== 'flex' || label.css.display !== 'none' || close.css.display !== 'none') {
      throw new Error(`Workspace Tab: sizing ou anatomia de ${key} divergente.`);
    }
    const labelX = label.rect.x - tab.rect.x;
    const labelY = label.rect.y - tab.rect.y;
    const background = String(tab.css.backgroundColor);
    const expectedBackground = main ? (active ? 'rgb(28, 28, 28)' : 'rgba(0, 0, 0, 0)') :
      (active ? 'oklch(0.999994 0.0000497986 none / 0.067)' : 'rgba(0, 0, 0, 0)');
    if (background !== expectedBackground || label.css.fontSize !== '13px' ||
        label.css.fontWeight !== '400' || label.css.lineHeight !== '16.9px') {
      throw new Error(`Workspace Tab: aparência de ${key} divergente.`);
    }
    const model: TabVariant = {
      context, state, title: sample.title,
      size: { width: tab.rect.width, height: tab.rect.height },
      label: { x: labelX, y: labelY, width: label.rect.width, height: label.rect.height,
        right: tab.rect.width - labelX - label.rect.width, color: String(label.css.color) },
      background, radius: main ? 10 : 8,
    };
    if (!main) {
      model.icon = { svg: safeSvg(iconSvg.svg), x: iconSvg.rect.x - tab.rect.x,
        y: iconSvg.rect.y - tab.rect.y, width: iconSvg.rect.width,
        height: iconSvg.rect.height, color: String(iconSvg.css.color),
        opacity: Number(icon.css.opacity) };
    }
    if (main && active) {
      model.close = { svg: safeSvg(closeSvg.svg), x: close.rect.x - tab.rect.x,
        y: close.rect.y - tab.rect.y, width: close.rect.width,
        height: close.rect.height, color: String(closeSvg.css.color) };
    }
    return model;
  });
  const main = variants[0]!;
  const side = variants[2]!;
  if (Math.abs(main.size.width - variants[1]!.size.width) > 0.1 ||
      variants[3]!.size.width !== side.size.width ||
      main.label.x !== variants[1]!.label.x ||
      variants[0]!.close?.width !== 20 ||
      side.icon?.width !== 16 || side.icon?.height !== 16) {
    throw new Error('Workspace Tab: medidas entre estados inconsistentes.');
  }
  return { variants, hostBackground: 'rgb(40, 40, 40)',
    fontFamily: String(observed(record(samples['main-active'], '').label, '').css.fontFamily),
    fontSize: 13, fontWeight: 400, lineHeight: 16.9, mainGap: 0, sidedockGap: 3 };
}

function observed(value: unknown, name: string): Observed {
  const item = record(value, `Workspace Tab: ${name} ausente.`);
  const rect = record(item.rect, `Workspace Tab: rect de ${name} ausente.`);
  const x = Number(rect.x), y = Number(rect.y), width = Number(rect.w), height = Number(rect.h);
  if (![x, y, width, height].every(Number.isFinite) || width < 0 || height < 0) {
    throw new Error(`Workspace Tab: rect de ${name} inválido.`);
  }
  return { rect: { x, y, width, height }, css: record(item.css, `Workspace Tab: CSS de ${name} ausente.`),
    svg: typeof item.svg === 'string' ? item.svg : undefined };
}

function safeSvg(value: string | undefined): string {
  if (!value || !value.startsWith('<svg ') ||
      !value.includes('viewBox="0 0 24 24"') || !value.includes('stroke="currentColor"') ||
      /<script|<foreignObject|\son\w+=/i.test(value)) {
    throw new Error('Workspace Tab: SVG observado ausente ou inseguro.');
  }
  return value;
}
