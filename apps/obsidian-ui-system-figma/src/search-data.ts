/** Experimental Figma-ready model. It is deliberately separate from ui-schema. */
export interface SearchVariantModel {
  state: 'Empty' | 'Filled';
  text: string;
  placeholder: string;
  widthForCanvas: number;
  height: number;
  rootSizing: { mode: 'fill'; confidence: 'high'; evidence: string[] };
  anatomy: ['input', 'search-icon', 'clear-button'];
  inputSizing: { horizontal: 'fill'; confidence: 'medium'; evidence: string[] };
  input: {
    padding: { top: number; right: number; bottom: number; left: number };
    background: RGB;
    border: { width: number; color: RGB };
    radius: number;
    textColor: RGB;
    textOpacity: number;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    fontStyle: string;
    lineHeight: string;
    letterSpacing: string;
  };
  icons: {
    search: { svg: string; width: number; height: number; left: number; top: number; color: RGB };
    clear: { svg: string; width: number; height: number; boxWidth: number; boxHeight: number;
      right: number; top: number; color: RGB; visible: boolean };
  };
  platform: string;
  evidence: string[];
}

const SEARCH_ID = 'obsidian.search';

export function readSearchImport(components: unknown, layout: unknown): SearchVariantModel[] {
  if (!Array.isArray(components)) throw new Error('components.json inválido: lista do Atlas ausente.');
  const lab = record(layout, 'layout.json inválido.');
  if (lab.experimentalFormat !== 'atlas-layout-probes-2' || !Array.isArray(lab.observations) ||
      !Array.isArray(lab.inferences)) {
    throw new Error('Search precisa de layout.json do Layout Lab com observations e inferences.');
  }
  const environment = record(lab.environment, 'Search: environment ausente no Layout Lab.');
  const platform = string(environment.platform, 'Search: platform ausente.');
  const observations = lab.observations.map((item) => record(item, 'Search: observation inválida.'));
  const inferences = lab.inferences.map((item) => record(item, 'Search: inference inválida.'));

  return (['empty', 'filled'] as const).map((variant) => {
    const state = variant === 'empty' ? 'Empty' : 'Filled';
    const specimen = unique(components, variant, 'Atlas');
    if (specimen.origin !== 'public-api') throw new Error(`Search ${state}: origem public-api ausente.`);
    const dom = record(specimen.dom, `Search ${state}: DOM do Atlas ausente.`);
    if (dom.tag !== 'div' || !arrayHas(dom.classes, 'search-input-container')) {
      throw new Error(`Search ${state}: wrapper esperado ausente no Atlas.`);
    }
    const children = array(dom.children, `Search ${state}: filhos do Atlas ausentes.`);
    if (children.length !== 2) throw new Error(`Search ${state}: anatomia do Atlas mudou.`);
    const atlasInput = record(children[0], `Search ${state}: input do Atlas inválido.`);
    const atlasClear = record(children[1], `Search ${state}: clear do Atlas inválido.`);
    if (atlasInput.tag !== 'input' || record(atlasInput.attributes, 'Search: atributos do input ausentes.').type !== 'search' ||
        !arrayHas(atlasClear.classes, 'search-input-clear-button')) {
      throw new Error(`Search ${state}: input ou clear esperado não encontrado.`);
    }
    const inputAttrs = record(atlasInput.attributes, 'Search: placeholder ausente.');
    const inputProps = record(atlasInput.properties, 'Search: valor do input ausente.');
    const placeholder = string(inputAttrs.placeholder, `Search ${state}: placeholder ausente.`);
    const text = variant === 'empty' ? placeholder : string(inputProps.value, 'Search Filled: valor ausente.');
    if ((variant === 'empty' && inputProps.value !== '') || (variant === 'filled' && !inputProps.value)) {
      throw new Error(`Search ${state}: valor incompatível com a variant.`);
    }
    if (text.includes('\n') || placeholder.includes('\n')) {
      throw new Error(`Search ${state}: input de linha única recebeu texto multilinha.`);
    }
    const atlasStyles = record(atlasInput.styles, `Search ${state}: estilos do input ausentes.`);
    const rootAtlasStyles = record(dom.styles, `Search ${state}: estilos da raiz ausentes.`);
    const clearAtlasStyles = record(atlasClear.styles, `Search ${state}: estilos do clear ausentes.`);

    const inference = unique(inferences, variant, 'Layout inference');
    const horizontal = record(inference.horizontal, `Search ${state}: horizontal ausente.`);
    const vertical = record(inference.vertical, `Search ${state}: vertical ausente.`);
    if (horizontal.mode !== 'fill' || horizontal.confidence !== 'high' ||
        vertical.mode !== 'fixed' || vertical.confidence !== 'high' || !positive(vertical.observedPx)) {
      throw new Error(`Search ${state}: inferência Fill/high e altura fixa/high ausentes.`);
    }
    const model = record(inference.intermediateModel, `Search ${state}: modelo do Lab ausente.`);
    if (model.horizontalSizing !== 'fill' || model.verticalSizing !== 'fixed' ||
        model.heightPx !== vertical.observedPx || model.layoutDirection !== null) {
      throw new Error(`Search ${state}: modelo estrutural incompatível com raiz block/relative.`);
    }
    const inferredChildren = array(inference.children, `Search ${state}: inferência dos filhos ausente.`);
    const inputChild = record(inferredChildren[0], `Search ${state}: inferência do input ausente.`);
    const inputHorizontal = record(inputChild.horizontal, `Search ${state}: sizing do input ausente.`);
    if (inputChild.path !== '0' || inputChild.tag !== 'input' || inputHorizontal.mode !== 'fill' ||
        inputHorizontal.confidence !== 'medium') {
      throw new Error(`Search ${state}: input Fill/medium não comprovado pelo Lab.`);
    }
    const variantRows = observations.filter((row) => row.id === SEARCH_ID && row.variant === variant);
    const baselines = variantRows.filter((row) => record(row.contentContext, 'Search: conteúdo inválido.').id === 'baseline');
    if (baselines.length < 2 || new Set(baselines.map((row) => record(row.host, 'Search: host ausente.').requestedWidthPx)).size < 2 ||
        new Set(variantRows.map((row) => record(row.contentContext, 'Search: conteúdo inválido.').id)).size < 3) {
      throw new Error(`Search ${state}: probes de host/conteúdo incompletos.`);
    }

    const samples = variantRows.map((row) => {
      const context = record(row.contentContext, `Search ${state}: contexto de conteúdo ausente.`);
      const root = record(row.root, `Search ${state}: raiz observada ausente.`);
      const rect = record(root.rect, `Search ${state}: caixa da raiz ausente.`);
      const host = record(row.host, `Search ${state}: host ausente.`);
      const hostRect = record(host.rect, `Search ${state}: caixa do host ausente.`);
      const rootStyles = record(root.styles, `Search ${state}: CSS da raiz ausente.`);
      const nodes = array(root.children, `Search ${state}: filhos observados ausentes.`);
      if (nodes.length !== 2) throw new Error(`Search ${state}: anatomia do Lab mudou.`);
      const input = record(nodes[0], `Search ${state}: input observado inválido.`);
      const clear = record(nodes[1], `Search ${state}: clear observado inválido.`);
      const inputRect = record(input.relativeToParent, `Search ${state}: caixa do input ausente.`);
      const inputStyles = record(input.styles, `Search ${state}: CSS do input ausente.`);
      const clearStyles = record(clear.styles, `Search ${state}: CSS do clear ausente.`);
      const rootPseudo = record(root.pseudo, `Search ${state}: lupa ausente.`);
      const searchPseudo = record(rootPseudo['::before'], `Search ${state}: ::before ausente.`);
      const searchStyles = record(searchPseudo.styles, `Search ${state}: CSS da lupa ausente.`);
      const clearPseudo = record(clear.pseudo, `Search ${state}: ::after do clear ausente.`);
      const clearIcon = record(clearPseudo['::after'], `Search ${state}: ::after do clear ausente.`);
      const clearIconStyles = record(clearIcon.styles, `Search ${state}: CSS do ícone clear ausente.`);
      const inputPseudo = record(input.pseudo, `Search ${state}: ::placeholder ausente; exporte o Lab novamente.`);
      const placeholderPseudo = record(inputPseudo['::placeholder'],
        `Search ${state}: ::placeholder ausente; exporte o Lab novamente.`);
      const placeholderStyles = record(placeholderPseudo.styles, `Search ${state}: CSS do placeholder ausente.`);
      const expectedPlaceholder = variant === 'empty' && typeof context.text === 'string' ? context.text : placeholder;
      const expectedValue = variant === 'filled' && typeof context.text === 'string' ? context.text :
        (variant === 'filled' ? inputProps.value : '');
      const observedValue = record(input.properties, `Search ${state}: valor observado ausente.`).value;
      if (row.state !== variant || observedValue !== expectedValue ||
          placeholderPseudo.content !== expectedPlaceholder || input.tag !== 'input' ||
          record(input.attributes, `Search ${state}: atributos observados ausentes.`).type !== 'search' ||
          clear.tag !== 'div' ||
          !arrayHas(clear.classes, 'search-input-clear-button') || rootStyles.position !== 'relative' ||
          rootStyles.display !== 'block' || inputStyles.position !== 'static' ||
          inputStyles['box-sizing'] !== 'border-box' || rect.width !== hostRect.width ||
          rect.height !== vertical.observedPx || inputRect.x !== 0 || inputRect.y !== 0 ||
          inputRect.width !== rect.width || inputRect.height !== rect.height) {
        throw new Error(`Search ${state}: anatomia ou sizing diverge entre probes.`);
      }
      const clearRect = clear.relativeToParent === null ? null : record(clear.relativeToParent, 'Search: clear inválido.');
      if (variant === 'empty' ? clearStyles.display !== 'none' || clearRect !== null :
        clearStyles.display !== 'flex' || !clearRect ||
        clearRect.width !== px(clearStyles.width, 'Search: largura do clear') ||
        clearRect.height !== rect.height ||
        number(clearRect.x, 'Search: x do clear') + number(clearRect.width, 'Search: largura do clear') +
          px(clearStyles.right, 'Search: right do clear') !== rect.width ||
        clearRect.y !== px(clearStyles.top, 'Search: top do clear')) {
        throw new Error(`Search ${state}: visibilidade ou posição do clear diverge entre probes.`);
      }
      if (clearStyles.position !== 'absolute' || clearStyles['align-items'] !== 'center' ||
          clearStyles['justify-content'] !== 'center' || searchStyles.position !== 'absolute') {
        throw new Error(`Search ${state}: sobreposição e alinhamento não comprovados.`);
      }
      return { rootStyles, inputStyles, clearStyles, searchStyles, clearIconStyles, placeholderStyles,
        searchSvg: svg(searchStyles['mask-image'], `Search ${state}: SVG da lupa`),
        clearSvg: svg(clearIconStyles['mask-image'], `Search ${state}: SVG do clear`),
        hostWidth: number(host.requestedWidthPx, 'Search: largura do host inválida.') };
    });

    const sample = samples[0]!;
    const stable = (selector: (item: typeof sample) => unknown, label: string): void => {
      const first = selector(sample);
      if (samples.some((item) => selector(item) !== first)) throw new Error(`Search ${state}: ${label} varia entre probes.`);
    };
    for (const [label, select] of [
      ['padding', (s: typeof sample) => s.inputStyles.padding],
      ['placeholder color', (s: typeof sample) => s.placeholderStyles.color],
      ['placeholder opacity', (s: typeof sample) => s.placeholderStyles.opacity],
      ['search SVG', (s: typeof sample) => s.searchSvg],
      ['clear SVG', (s: typeof sample) => s.clearSvg],
      ['search x', (s: typeof sample) => s.searchStyles.left],
      ['search y', (s: typeof sample) => s.searchStyles.top],
      ['search width', (s: typeof sample) => s.searchStyles.width],
      ['search height', (s: typeof sample) => s.searchStyles.height],
      ['search color', (s: typeof sample) => s.searchStyles['background-color']],
      ['clear right', (s: typeof sample) => s.clearStyles.right],
      ['clear top', (s: typeof sample) => s.clearStyles.top],
      ['clear width', (s: typeof sample) => s.clearStyles.width],
      ['clear height', (s: typeof sample) => s.clearStyles.height],
      ['clear icon width', (s: typeof sample) => s.clearIconStyles.width],
      ['clear icon height', (s: typeof sample) => s.clearIconStyles.height],
      ['clear color', (s: typeof sample) => s.clearIconStyles['background-color']],
      ['input background', (s: typeof sample) => s.inputStyles['background-color']],
      ['input font', (s: typeof sample) => s.inputStyles['font-family']],
    ] as const) stable(select, label);

    for (const [labKey, atlasKey] of [
      ['background-color', 'background'], ['color', 'color'], ['font-family', 'fontFamily'],
      ['font-size', 'fontSize'], ['font-weight', 'fontWeight'], ['font-style', 'fontStyle'],
      ['line-height', 'lineHeight'], ['letter-spacing', 'letterSpacing'],
    ] as const) {
      if (sample.inputStyles[labKey] !== atlasStyles[atlasKey]) {
        throw new Error(`Search ${state}: ${labKey} diverge entre Atlas e Lab; use exports do mesmo ambiente.`);
      }
    }
    if (sample.rootStyles['background-color'] !== rootAtlasStyles.background ||
        sample.clearStyles.color !== clearAtlasStyles.color ||
        sample.clearStyles.display !== clearAtlasStyles.display ||
        sample.inputStyles.padding !== atlasStyles.padding ||
        vertical.observedPx !== record(dom.sizePx, 'Search: sizePx da raiz ausente.').height) {
      throw new Error(`Search ${state}: estilos ou altura divergem entre Atlas e Lab.`);
    }
    for (const key of ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing'] as const) {
      if (sample.placeholderStyles[key] !== sample.inputStyles[key]) {
        throw new Error(`Search ${state}: tipografia do placeholder difere do input; modelo ainda não suporta essa diferença.`);
      }
    }
    const padding = paddingOf(sample.inputStyles.padding, `Search ${state}: padding do input`);
    if (padding.top !== padding.bottom) throw new Error(`Search ${state}: alinhamento vertical do texto não comprovado.`);
    const widths = baselines.map((row) => number(record(row.host, 'Search: host inválido.').requestedWidthPx,
      'Search: largura do host inválida.')).sort((a, b) => a - b);
    const widthForCanvas = widths[Math.floor(widths.length / 2)]!; // Demonstration host, never intrinsic sizing.
    return {
      state, text, placeholder, widthForCanvas, height: vertical.observedPx,
      rootSizing: { mode: 'fill', confidence: 'high', evidence: array(horizontal.evidence, 'Search: evidência ausente.').map(String) },
      anatomy: ['input', 'search-icon', 'clear-button'],
      inputSizing: { horizontal: 'fill', confidence: 'medium',
        evidence: array(inputHorizontal.evidence, 'Search: evidência do input ausente.').map(String) },
      input: {
        padding,
        background: rgb(atlasStyles.background, `Search ${state}: fundo do input`),
        border: border(atlasStyles.border, `Search ${state}: borda do input`),
        radius: px(atlasStyles.borderRadius, `Search ${state}: raio do input`),
        textColor: rgb(variant === 'empty' ? sample.placeholderStyles.color : atlasStyles.color,
          `Search ${state}: cor do texto`),
        textOpacity: unit(variant === 'empty' ? sample.placeholderStyles.opacity : atlasStyles.opacity,
          `Search ${state}: opacidade do texto`),
        fontFamily: string(atlasStyles.fontFamily, `Search ${state}: fontFamily`),
        fontSize: px(atlasStyles.fontSize, `Search ${state}: fontSize`),
        fontWeight: number(atlasStyles.fontWeight, `Search ${state}: fontWeight`),
        fontStyle: string(atlasStyles.fontStyle, `Search ${state}: fontStyle`),
        lineHeight: string(atlasStyles.lineHeight, `Search ${state}: lineHeight`),
        letterSpacing: string(atlasStyles.letterSpacing, `Search ${state}: letterSpacing`),
      },
      icons: {
        search: { svg: sample.searchSvg, width: px(sample.searchStyles.width, 'Search: largura da lupa'),
          height: px(sample.searchStyles.height, 'Search: altura da lupa'),
          left: px(sample.searchStyles.left, 'Search: left da lupa'),
          top: px(sample.searchStyles.top, 'Search: top da lupa'),
          color: rgb(sample.searchStyles['background-color'], 'Search: cor da lupa') },
        clear: { svg: sample.clearSvg, width: px(sample.clearIconStyles.width, 'Search: largura do ícone clear'),
          height: px(sample.clearIconStyles.height, 'Search: altura do ícone clear'),
          boxWidth: px(sample.clearStyles.width, 'Search: largura do clear'),
          boxHeight: px(sample.clearStyles.height, 'Search: altura do clear'),
          right: px(sample.clearStyles.right, 'Search: right do clear'),
          top: px(sample.clearStyles.top, 'Search: top do clear'),
          color: rgb(sample.clearIconStyles['background-color'], 'Search: cor do clear'),
          visible: variant === 'filled' },
      },
      platform,
      evidence: [...new Set([
        ...array(horizontal.probes, 'Search: probes horizontais ausentes.').map(String),
        ...array(vertical.probes, 'Search: probes verticais ausentes.').map(String),
      ])],
    } satisfies SearchVariantModel;
  });
}

function unique(items: unknown[], variant: string, source: string): Record<string, unknown> {
  const found = items.filter((item) => item && typeof item === 'object' &&
    (item as Record<string, unknown>).id === SEARCH_ID && (item as Record<string, unknown>).variant === variant);
  if (found.length !== 1) throw new Error(`Search ${variant}: esperado um registro ${source}, encontrados ${found.length}.`);
  return record(found[0], `Search ${variant}: ${source} inválido.`);
}
function record(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(message);
  return value as Record<string, unknown>;
}
function array(value: unknown, message: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(message);
  return value;
}
function arrayHas(value: unknown, member: string): boolean {
  return Array.isArray(value) && value.includes(member);
}
function string(value: unknown, message: string): string {
  if (typeof value !== 'string' || !value) throw new Error(message);
  return value;
}
function number(value: unknown, message: string): number {
  if (typeof value !== 'number' && (typeof value !== 'string' || value.trim() === '')) throw new Error(message);
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) throw new Error(message);
  return n;
}
function positive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}
function px(value: unknown, message: string): number {
  const match = /^([0-9]+(?:\.[0-9]+)?)px$/.exec(string(value, message));
  if (!match) throw new Error(`${message}: esperado px.`);
  return Number(match[1]);
}
function paddingOf(value: unknown, message: string): SearchVariantModel['input']['padding'] {
  const match = /^(\d+(?:\.\d+)?)px (\d+(?:\.\d+)?)px (\d+(?:\.\d+)?)px (\d+(?:\.\d+)?)px$/.exec(string(value, message));
  if (!match) throw new Error(`${message}: formato inesperado.`);
  return { top: Number(match[1]), right: Number(match[2]), bottom: Number(match[3]), left: Number(match[4]) };
}
function rgb(value: unknown, message: string): RGB {
  const match = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(string(value, message));
  if (!match) throw new Error(`${message}: esperado rgb().`);
  const channels = match.slice(1).map(Number);
  if (channels.some((n) => n > 255)) throw new Error(`${message}: canal inválido.`);
  return { r: channels[0] / 255, g: channels[1] / 255, b: channels[2] / 255 };
}
function border(value: unknown, message: string): SearchVariantModel['input']['border'] {
  const match = /^(\d+(?:\.\d+)?)px solid (rgb\(\d+, \d+, \d+\))$/.exec(string(value, message));
  if (!match) throw new Error(`${message}: esperado border solid.`);
  return { width: Number(match[1]), color: rgb(match[2], message) };
}
function unit(value: unknown, message: string): number {
  const n = number(value, message);
  if (n < 0 || n > 1) throw new Error(`${message}: esperado 0–1.`);
  return n;
}
function svg(value: unknown, message: string): string {
  const match = /^url\("(data:image\/svg\+xml,.+)"\)$/.exec(string(value, message));
  if (!match) throw new Error(`${message}: máscara SVG inline ausente.`);
  let decoded: string;
  try { decoded = decodeURIComponent(match[1].slice('data:image/svg+xml,'.length)); }
  catch { throw new Error(`${message}: SVG URI inválido.`); }
  if (!decoded.startsWith('<svg ') || !decoded.endsWith('</svg>') || !decoded.includes('viewBox=') ||
      /<\/?(?:script|foreignObject|image)\b|\bhref\s*=|\bonload\s*=|<style\b/i.test(decoded) ||
      !decoded.includes('currentColor')) {
    throw new Error(`${message}: geometria vetorial não suportada.`);
  }
  return decoded;
}
