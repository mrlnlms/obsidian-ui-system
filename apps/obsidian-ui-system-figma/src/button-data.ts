import { isSupportedButtonLayoutModel, isTypographyLayoutModel } from './layout-model';

export interface ButtonData {
  state: 'Normal' | 'Disabled' | 'CTA';
  text: string;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
  justifyContent: 'MIN' | 'CENTER' | 'MAX';
  alignItems: 'MIN' | 'CENTER' | 'MAX';
  textAlign: 'LEFT' | 'CENTER' | 'RIGHT';
  textHeight: number;
  radius: number;
  background: RGB;
  border: { width: number; color: RGB } | null;
  color: RGB;
  opacity: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  platform: string;
  fontStyle: string | null;
  lineHeight: string;
  letterSpacing: string | null;
  typography: { cssVariables: Record<string, string>; fontFamilyDeclaration: string };
}

const STATES = [
  { variant: 'normal', state: 'Normal' },
  { variant: 'disabled', state: 'Disabled' },
  { variant: 'cta', state: 'CTA' },
] as const;

export function readButtonImport(components: unknown, layout: unknown): ButtonData[] {
  return STATES.map(({ variant }) => readButtonVariantImport(components, layout, variant));
}

export function readButtonVariantImport(
  components: unknown, layout: unknown, variant: 'normal' | 'disabled' | 'cta',
  options: { styleConsistency?: 'strict' | 'structural'; boundProperties?: boolean } = {},
): ButtonData {
  if (!Array.isArray(components)) throw new Error('components.json inválido: esperada uma lista de specimens do Mapping.');
  const lab = record(layout, 'layout.json inválido');
  if (!isSupportedButtonLayoutModel(lab.experimentalFormat)) {
    throw new Error('layout.json inválido: formato experimental do Layout Lab não reconhecido.');
  }
  if (!Array.isArray(lab.inferences) || !Array.isArray(lab.observations)) {
    throw new Error('layout.json inválido: faltam inferences ou observations.');
  }
  const inferences: unknown[] = lab.inferences;
  const observations: unknown[] = lab.observations;
  const environment = record(lab.environment, 'layout.json inválido: environment ausente');
  const platform = str(environment.platform, 'layout.json inválido: platform ausente');

  const state = STATES.find((item) => item.variant === variant)!.state;
  const specimen = unique(components, variant, 'specimen');
  if (!specimen) throw new Error(`Button não encontrado: obsidian.button / ${variant} em components.json.`);
  const source = record(specimen, `Button ${variant} inválido`);
  if (source.origin !== 'public-api') throw new Error(`Button ${variant} não é public-api.`);
  const dom = record(source.dom, `Button ${variant}: dom ausente`);
  if (dom.tag !== 'button' || typeof dom.text !== 'string' || !dom.text || dom.text.includes('\n')) {
    throw new Error(`Button ${variant}: texto direto de linha única ausente.`);
  }
  if (!Array.isArray(dom.children) || dom.children.length !== 0) {
    throw new Error(`Button ${variant}: anatomia com filhos ainda não suportada neste spike.`);
  }
  const styles = record(dom.styles, `Button ${variant}: styles ausentes`);
  const typography = dom.typography && typeof dom.typography === 'object'
    ? record(dom.typography, `Button ${variant}: contexto tipográfico inválido`)
    : null;
  if (isTypographyLayoutModel(lab.experimentalFormat) && !typography) {
    throw new Error(`Button ${variant}: contexto tipográfico do Mapping ausente; exporte novamente o Mapping.`);
  }
  const declaration = typography?.fontFamilyDeclaration && typeof typography.fontFamilyDeclaration === 'object'
    ? record(typography.fontFamilyDeclaration, `Button ${variant}: origem tipográfica inválida`)
    : null;
  const cssVariables = typography?.cssVariables && typeof typography.cssVariables === 'object'
    ? record(typography.cssVariables, `Button ${variant}: variáveis tipográficas inválidas`)
    : {};

  const inference = unique(inferences, variant, 'inference');
  if (!inference) throw new Error(`Layout inference ausente: obsidian.button / ${variant}.`);
  const inferred = record(inference, `Button ${variant}: inference inválida`);
  const model = record(inferred.intermediateModel, `Button ${variant}: intermediateModel ausente`);
  const horizontal = record(inferred.horizontal, `Button ${variant}: horizontal ausente`);
  if (model.horizontalSizing !== 'hug' || horizontal.mode !== 'hug' || horizontal.confidence !== 'high') {
    throw new Error(`Button ${variant}: inferência Hug de alta confiança ausente.`);
  }
  if (model.layoutDirection !== 'row' || model.whiteSpace !== 'nowrap') {
    throw new Error(`Button ${variant}: layout row/nowrap não comprovado pelo Lab.`);
  }
  if (!Array.isArray(inferred.children) || inferred.children.length !== 1) {
    throw new Error(`Button ${variant}: inferência do texto ausente.`);
  }
  const childHorizontal = record(record(inferred.children[0], `Button ${variant}: child inference ausente`).horizontal,
    `Button ${variant}: child horizontal ausente`);
  if (childHorizontal.mode !== 'hug' || childHorizontal.confidence !== 'high') {
    throw new Error(`Button ${variant}: inferência Hug do texto ausente.`);
  }
  const vertical = record(inferred.vertical, `Button ${variant}: vertical ausente`);
  if (model.verticalSizing !== 'fixed' || !positive(model.heightPx) ||
      vertical.mode !== 'fixed' || vertical.observedPx !== model.heightPx) {
    throw new Error(`Button ${variant}: altura observada ausente no modelo do Lab.`);
  }
  const padding = record(model.padding, `Button ${variant}: padding ausente`);
  const height = model.heightPx;
  const domSize = record(dom.sizePx, `Button ${variant}: sizePx ausente`);
  if (domSize.height !== height) throw new Error(`Button ${variant}: altura diverge entre Mapping e Lab.`);

  const observation = observations.find((item) => {
    if (!item || typeof item !== 'object') return false;
    const value = item as Record<string, unknown>;
    return value.id === 'obsidian.button' && value.variant === variant &&
      typeof value.contentContext === 'object' && value.contentContext !== null &&
      (value.contentContext as Record<string, unknown>).id === 'baseline';
  });
  if (!observation) throw new Error(`Button ${variant}: observação baseline ausente no Lab.`);
  const root = record(record(observation, 'observação inválida').root, `Button ${variant}: root ausente`);
  const labStyles = record(root.styles, `Button ${variant}: estilos de layout ausentes`);
  if (labStyles['white-space'] !== 'nowrap' || labStyles['flex-direction'] !== 'row') {
    throw new Error(`Button ${variant}: comportamento de linha única não confirmado.`);
  }
  if (options.styleConsistency !== 'structural' &&
      (labStyles['background-color'] !== styles.background || labStyles.color !== styles.color ||
       labStyles.opacity !== styles.opacity || labStyles['font-size'] !== styles.fontSize)) {
    throw new Error(`Button ${variant}: Mapping e Layout Lab têm estilos computados divergentes; selecione exports do mesmo ambiente/modo.`);
  }
  if (options.styleConsistency !== 'structural' && isTypographyLayoutModel(lab.experimentalFormat) &&
      (labStyles['font-family'] !== styles.fontFamily || labStyles['font-weight'] !== styles.fontWeight ||
       labStyles['font-style'] !== styles.fontStyle || labStyles['line-height'] !== styles.lineHeight ||
       labStyles['letter-spacing'] !== styles.letterSpacing)) {
    throw new Error(`Button ${variant}: tipografia diverge entre Mapping e Layout Lab.`);
  }
  const children = root.children;
  if (!Array.isArray(children) || children.length !== 1) throw new Error(`Button ${variant}: texto medido ausente.`);
  const textChild = record(children[0], `Button ${variant}: filho de texto inválido`);
  const textRect = record(textChild.rect, `Button ${variant}: retângulo do texto ausente`);
  if (textChild.kind !== 'text' || textChild.text !== dom.text || !positive(textRect.height)) {
    throw new Error(`Button ${variant}: texto ou altura diverge entre Mapping e Lab.`);
  }

  const parsedPadding = {
    top: px(padding.top, `Button ${variant}: padding top`),
    right: px(padding.right, `Button ${variant}: padding right`),
    bottom: px(padding.bottom, `Button ${variant}: padding bottom`),
    left: px(padding.left, `Button ${variant}: padding left`),
  };
  if (parsedPadding.top !== parsedPadding.bottom || parsedPadding.left !== parsedPadding.right ||
      (options.styleConsistency !== 'structural' && styles.padding !== `${parsedPadding.top}px ${parsedPadding.right}px`)) {
    throw new Error(`Button ${variant}: padding diverge entre Mapping e Lab.`);
  }
  if (height < parsedPadding.top + parsedPadding.bottom + textRect.height) {
    throw new Error(`Button ${variant}: texto e padding excedem a altura observada.`);
  }

  return {
    state,
    text: dom.text,
    height,
    padding: parsedPadding,
    justifyContent: alignment(labStyles['justify-content'], `Button ${variant}: justify-content`),
    alignItems: alignment(labStyles['align-items'], `Button ${variant}: align-items`),
    textAlign: textAlignment(labStyles['text-align'], `Button ${variant}: text-align`),
    textHeight: textRect.height,
    radius: options.boundProperties ? 0 : px(styles.borderRadius, `Button ${variant}: borderRadius`),
    background: options.boundProperties ? { r: 0, g: 0, b: 0 } :
      rgb(styles.background, `Button ${variant}: background`),
    border: border(styles.border, `Button ${variant}: border`),
    color: options.boundProperties ? { r: 0, g: 0, b: 0 } : rgb(styles.color, `Button ${variant}: color`),
    opacity: unit(styles.opacity, `Button ${variant}: opacity`),
    fontFamily: str(styles.fontFamily, `Button ${variant}: fontFamily`),
    fontSize: px(styles.fontSize, `Button ${variant}: fontSize`),
    fontWeight: Number(str(styles.fontWeight, `Button ${variant}: fontWeight`)),
    platform,
    fontStyle: typeof styles.fontStyle === 'string' ? styles.fontStyle : null,
    lineHeight: str(styles.lineHeight, `Button ${variant}: lineHeight`),
    letterSpacing: typeof styles.letterSpacing === 'string' ? styles.letterSpacing : null,
    typography: {
      cssVariables: Object.fromEntries(Object.entries(cssVariables).filter((entry): entry is [string, string] => typeof entry[1] === 'string')),
      fontFamilyDeclaration: declaration?.source === 'inline' && typeof declaration.value === 'string'
        ? `inline: ${declaration.value}` : 'unresolved',
    },
  };
}

function unique(items: unknown[], variant: string, kind: string): unknown {
  const found = items.filter((item) => item && typeof item === 'object' &&
    (item as Record<string, unknown>).id === 'obsidian.button' &&
    (item as Record<string, unknown>).variant === variant);
  if (found.length > 1) throw new Error(`Button ${variant}: ${kind} duplicado.`);
  return found[0];
}

function record(value: unknown, message: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(message);
  return value as Record<string, unknown>;
}

function str(value: unknown, message: string): string {
  if (typeof value !== 'string' || !value) throw new Error(message);
  return value;
}

function positive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function px(value: unknown, message: string): number {
  const match = /^([0-9]+(?:\.[0-9]+)?)px$/.exec(str(value, message));
  if (!match) throw new Error(`${message}: esperado valor em px.`);
  return Number(match[1]);
}

function unit(value: unknown, message: string): number {
  const number = Number(str(value, message));
  if (!Number.isFinite(number) || number < 0 || number > 1) throw new Error(`${message}: esperado 0–1.`);
  return number;
}

function rgb(value: unknown, message: string): RGB {
  const match = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(str(value, message));
  if (!match) throw new Error(`${message}: cor RGB não suportada.`);
  const channels = match.slice(1).map(Number);
  if (channels.some((channel) => channel > 255)) throw new Error(`${message}: canal RGB inválido.`);
  return { r: channels[0] / 255, g: channels[1] / 255, b: channels[2] / 255 };
}

function border(value: unknown, message: string): { width: number; color: RGB } | null {
  const css = str(value, message);
  if (/^0px none rgb\(\d+, \d+, \d+\)$/.test(css)) return null;
  const match = /^([0-9]+(?:\.[0-9]+)?)px solid (rgb\(\d+, \d+, \d+\))$/.exec(css);
  if (!match) throw new Error(`${message}: borda não suportada.`);
  return { width: Number(match[1]), color: rgb(match[2], message) };
}

function alignment(value: unknown, message: string): 'MIN' | 'CENTER' | 'MAX' {
  if (value === 'center') return 'CENTER';
  if (value === 'flex-start') return 'MIN';
  if (value === 'flex-end') return 'MAX';
  throw new Error(`${message}: alinhamento não suportado.`);
}

function textAlignment(value: unknown, message: string): 'LEFT' | 'CENTER' | 'RIGHT' {
  if (value === 'left' || value === 'start') return 'LEFT';
  if (value === 'center') return 'CENTER';
  if (value === 'right' || value === 'end') return 'RIGHT';
  throw new Error(`${message}: alinhamento não suportado.`);
}
