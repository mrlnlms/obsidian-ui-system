import { fontFailure, requiredFont } from './font-resolution';
import { boundUiKitPaint, type UiKitThemeVariables } from './ui-kit-theme';

export interface PublicControlsEvidence {
  toggle: { width: number; height: number; thumbWidth: number; thumbHeight: number;
    thumbInset: number; radius: number };
  tooltip: { paddingHorizontal: number; paddingVertical: number; radius: number;
    fontSize: number; lineHeight: number; sampleText: string };
}

/** A bounded projection of the captured public Toggle and visible Tooltip specimens. */
export function readPublicControlsEvidence(input: unknown): PublicControlsEvidence {
  const raw = input as { format?: unknown; version?: unknown;
    toggle?: Record<string, unknown>; tooltip?: Record<string, unknown> };
  if (!raw || raw.format !== 'obsidian-public-controls-probe' || raw.version !== 1 ||
      !raw.toggle || !raw.tooltip) throw new Error('Public controls: fixture ausente.');
  const t = raw.toggle;
  const p = raw.tooltip;
  if (t.width !== 36 || t.height !== 16 || t.thumbWidth !== 20 ||
      t.thumbHeight !== 12 || t.thumbInset !== 2 || t.radius !== 24 ||
      p.paddingHorizontal !== 12 || p.paddingVertical !== 8 || p.radius !== 12 ||
      p.fontSize !== 13 || p.lineHeight !== 16.9 ||
      typeof p.sampleText !== 'string' || !p.sampleText.trim()) {
    throw new Error('Public controls: anatomia observada divergente.');
  }
  return { toggle: t as unknown as PublicControlsEvidence['toggle'],
    tooltip: p as unknown as PublicControlsEvidence['tooltip'] };
}

export interface PublicControlsLibrary {
  toggle: ComponentSetNode;
  toggleState(state: 'Off' | 'On'): InstanceNode;
  tooltip: ComponentNode;
  tooltipText: string;
}

export async function createPublicControls(evidence: PublicControlsEvidence,
  theme: UiKitThemeVariables, fontFamily: string): Promise<PublicControlsLibrary> {
  const available = (await figma.listAvailableFontsAsync()).map((item) => item.fontName);
  const font = requiredFont({ cssStack: fontFamily, platform: 'macos', weight: 400,
    style: 'normal' }, available);
  try { await figma.loadFontAsync(font); }
  catch { throw fontFailure(font, 'Public controls: SF Pro não carregou.'); }

  const variants = (['Off', 'On'] as const).map((state) => {
    const component = figma.createComponent();
    component.name = `State=${state}`;
    component.resize(evidence.toggle.width, evidence.toggle.height);
    component.fills = [boundUiKitPaint(theme,
      state === 'Off' ? 'toggleTrackOff' : 'accentFill')];
    component.strokes = [];
    component.cornerRadius = evidence.toggle.radius;
    const thumb = figma.createEllipse();
    thumb.name = 'Thumb';
    component.appendChild(thumb);
    thumb.resize(evidence.toggle.thumbWidth, evidence.toggle.thumbHeight);
    thumb.x = state === 'Off' ? evidence.toggle.thumbInset :
      evidence.toggle.width - evidence.toggle.thumbWidth - evidence.toggle.thumbInset;
    thumb.y = evidence.toggle.thumbInset;
    thumb.fills = [boundUiKitPaint(theme, 'toggleThumb')];
    thumb.strokes = [];
    return component;
  });
  const toggle = figma.combineAsVariants(variants, figma.currentPage);
  toggle.name = 'Obsidian / Toggle';
  toggle.description = 'ToggleComponent público observado: State=Off/On. A opção ou ação pertence ao consumidor.';
  variants.forEach((variant, index) => { variant.x = 16; variant.y = 16 + index * 48; });

  const tooltip = figma.createComponent();
  tooltip.name = 'Obsidian / Tooltip';
  tooltip.description = 'Tooltip visível do contrato público displayTooltip; texto editável e aparência compartilhada. Posicionamento é responsabilidade do consumidor.';
  tooltip.layoutMode = 'HORIZONTAL';
  tooltip.primaryAxisSizingMode = 'AUTO';
  tooltip.counterAxisSizingMode = 'AUTO';
  tooltip.paddingLeft = tooltip.paddingRight = evidence.tooltip.paddingHorizontal;
  tooltip.paddingTop = tooltip.paddingBottom = evidence.tooltip.paddingVertical;
  tooltip.cornerRadius = evidence.tooltip.radius;
  tooltip.fills = [];
  tooltip.strokes = [];
  tooltip.clipsContent = false;
  const surface = figma.createRectangle();
  surface.name = 'Tooltip surface';
  tooltip.appendChild(surface);
  surface.layoutPositioning = 'ABSOLUTE';
  surface.resize(tooltip.width, tooltip.height);
  surface.x = 0;
  surface.y = 0;
  surface.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
  surface.cornerRadius = evidence.tooltip.radius;
  surface.fills = [boundUiKitPaint(theme, 'tooltipSurface')];
  surface.strokes = [];
  surface.opacity = 0.9;
  const label = figma.createText();
  label.name = 'Text';
  tooltip.appendChild(label);
  label.fontName = font;
  label.fontSize = evidence.tooltip.fontSize;
  label.lineHeight = { unit: 'PIXELS', value: evidence.tooltip.lineHeight };
  label.fills = [boundUiKitPaint(theme, 'tooltipText')];
  label.characters = evidence.tooltip.sampleText;
  if (label.hasMissingFont || label.width <= 0 || label.height <= 0) {
    throw fontFailure(font, 'Public controls: Tooltip não renderizou.');
  }
  const tooltipText = tooltip.addComponentProperty('Text', 'TEXT', evidence.tooltip.sampleText);
  label.componentPropertyReferences = { characters: tooltipText };
  const arrow = figma.createPolygon();
  arrow.name = 'Tooltip arrow';
  tooltip.appendChild(arrow);
  arrow.layoutPositioning = 'ABSOLUTE';
  arrow.pointCount = 3;
  arrow.resize(10, 5);
  arrow.rotation = 180;
  arrow.x = (tooltip.width - 10) / 2;
  arrow.y = tooltip.height - 1;
  arrow.constraints = { horizontal: 'CENTER', vertical: 'MAX' };
  arrow.fills = [boundUiKitPaint(theme, 'tooltipSurface')];
  arrow.strokes = [];
  arrow.opacity = 0.9;
  tooltip.x = toggle.x + toggle.width + 48;
  tooltip.y = toggle.y;
  return { toggle, tooltip, tooltipText,
    toggleState(state) {
      const variant = toggle.children.find((node): node is ComponentNode =>
        node.type === 'COMPONENT' && node.variantProperties?.State === state);
      if (!variant) throw new Error(`Toggle: variant ${state} ausente.`);
      return variant.createInstance();
    } };
}
