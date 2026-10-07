import { requiredFont, fontFailure } from './font-resolution';
import { boundUiKitPaint, type UiKitColorRole,
  type UiKitThemeVariables } from './ui-kit-theme';
import { confirmationActions, publicDomFind, publicDomText, publicSpecimen,
  type PublicApiEvidence, type PublicApiId } from './public-api-batch-data';
import type { IconButtonLibrary } from './icon-button-generation';
import type { PublicControlsLibrary } from './public-controls-generation';

type Parent = ComponentNode | FrameNode;
type TextBinding = { node: TextNode; property: string; value: string };
type Built = { component: ComponentNode; texts: TextBinding[] };
type State = { name: string; build: () => Built };

export interface PublicApiBatch {
  sections: SectionNode[];
  sets: Map<PublicApiId, ComponentSetNode | ComponentNode>;
}

function fills(theme: UiKitThemeVariables, role: UiKitColorRole): SolidPaint[] {
  return [boundUiKitPaint(theme, role)];
}

function component(name: string, width: number, height: number,
  theme?: UiKitThemeVariables, fill?: UiKitColorRole): ComponentNode {
  const result = figma.createComponent();
  result.name = name;
  result.resize(width, height);
  result.fills = theme && fill ? fills(theme, fill) : [];
  result.strokes = [];
  return result;
}

function rect(parent: Parent, name: string, x: number, y: number,
  width: number, height: number, theme: UiKitThemeVariables,
  role: UiKitColorRole, radius = 0, opacity = 1): RectangleNode {
  const result = figma.createRectangle();
  result.name = name;
  parent.appendChild(result);
  result.resize(Math.max(0.1, width), Math.max(0.1, height));
  result.x = x; result.y = y;
  result.cornerRadius = radius;
  result.fills = fills(theme, role);
  result.strokes = [];
  result.opacity = opacity;
  result.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
  return result;
}

function label(parent: Parent, name: string, value: string, x: number, y: number,
  width: number, font: FontName, theme: UiKitThemeVariables,
  role: UiKitColorRole = 'textNormal', size = 13, lineHeight = size * 1.3): TextNode {
  const result = figma.createText();
  result.name = name;
  parent.appendChild(result);
  result.fontName = font;
  result.fontSize = size;
  result.lineHeight = { unit: 'PIXELS', value: lineHeight };
  result.fills = fills(theme, role);
  result.resize(Math.max(width, 1), Math.max(lineHeight, 1));
  result.textAutoResize = 'HEIGHT';
  result.characters = value;
  result.x = x; result.y = y;
  result.constraints = { horizontal: 'STRETCH', vertical: 'MIN' };
  if (result.hasMissingFont || result.width <= 0 || result.height <= 0) {
    throw fontFailure(font, `Public API: texto ${name} não renderizou.`);
  }
  return result;
}

function property(node: TextNode, name: string, value = node.characters): TextBinding {
  return { node, property: name, value };
}

/** A glyph or Toggle without nested properties must remain an ordinary instance. */
export function hasExposableChildren(children: readonly SceneNode[]): boolean {
  return children.some((node) =>
    (node.type === 'INSTANCE' && node.isExposedInstance) ||
    ('componentPropertyReferences' in node &&
      !!node.componentPropertyReferences &&
      Object.keys(node.componentPropertyReferences).length > 0));
}

function exposeIfSupported(instance: InstanceNode): void {
  if (hasExposableChildren(instance.findAll(() => true))) {
    instance.isExposedInstance = true;
  }
}

function variants(name: string, states: State[]): ComponentSetNode {
  const built = states.map(({ name: state, build }) => {
    const result = build();
    result.component.name = `State=${state}`;
    return result;
  });
  const set = figma.combineAsVariants(built.map((item) => item.component), figma.currentPage);
  set.name = name;
  set.description = 'Estados capturados no inventário public-api; conteúdo editável e aparência por Variables.';
  const names = new Map<string, string>();
  for (const item of built) for (const text of item.texts) {
    if (!names.has(text.property)) names.set(text.property, text.value);
  }
  for (const [name, initial] of names) {
    const key = set.addComponentProperty(name, 'TEXT', initial);
    for (const item of built) for (const text of item.texts) {
      if (text.property === name) text.node.componentPropertyReferences = { characters: key };
    }
  }
  let y = 20;
  let widest = 0;
  for (const { component: node } of built) {
    node.x = 20; node.y = y;
    y += node.height + 22;
    widest = Math.max(widest, node.width);
  }
  set.resizeWithoutConstraints(widest + 40, y);
  return set;
}

function stateComponent(set: ComponentSetNode, state: string): ComponentNode {
  const found = set.children.find((node): node is ComponentNode =>
    node.type === 'COMPONENT' && node.variantProperties?.State === state);
  if (!found) throw new Error(`${set.name}: State=${state} ausente.`);
  return found;
}

function nested(parent: Parent, source: ComponentNode, name: string,
  x: number, y: number): InstanceNode {
  const instance = source.createInstance();
  instance.name = name;
  parent.appendChild(instance);
  instance.x = x; instance.y = y;
  exposeIfSupported(instance);
  return instance;
}

function setNestedText(instance: InstanceNode, name: string, value: string): void {
  const key = Object.keys(instance.componentProperties).find((candidate) =>
    candidate.replace(/#.*$/, '') === name);
  if (!key) throw new Error(`Public API: propriedade ${name} ausente em ${instance.name}.`);
  instance.setProperties({ [key]: value });
}

function inputSet(evidence: PublicApiEvidence, id: 'obsidian.text' | 'obsidian.textarea',
  title: string, font: FontName, theme: UiKitThemeVariables): ComponentSetNode {
  return variants(`Obsidian / ${title}`, ['empty', 'filled', 'disabled'].map((state) => ({
    name: state,
    build: () => {
      const dom = publicSpecimen(evidence, id, state).dom;
      const root = component('Input', dom.sizePx.width, dom.sizePx.height, theme, 'formField');
      root.cornerRadius = 8;
      root.strokes = fills(theme, 'controlBorder');
      root.strokeWeight = 1;
      root.opacity = Number(dom.styles.opacity) || 1;
      const content = state === 'empty' ? dom.attributes?.placeholder ?? '' :
        String(dom.properties?.value ?? '');
      const text = label(root, state === 'empty' ? 'Placeholder' : 'Value', content,
        8, id === 'obsidian.textarea' ? 5 : 7, root.width - 16, font, theme,
        state === 'empty' ? 'textFaint' : 'textNormal');
      return { component: root, texts: [property(text,
        state === 'empty' ? 'Placeholder' : 'Value')] };
    },
  })));
}

function momentFormatSet(evidence: PublicApiEvidence, text: ComponentSetNode): ComponentSetNode {
  return variants('Obsidian / Moment Format', ['empty', 'filled', 'disabled'].map((state) => ({
    name: state,
    build: () => {
      const sample = publicSpecimen(evidence, 'obsidian.moment-format', state).dom;
      const root = component('Moment Format', sample.sizePx.width, sample.sizePx.height);
      const input = nested(root, stateComponent(text, state), 'TextComponent', 0, 0);
      setNestedText(input, state === 'empty' ? 'Placeholder' : 'Value',
        state === 'empty' ? sample.attributes?.placeholder ?? '' :
          String(sample.properties?.value ?? ''));
      return { component: root, texts: [] };
    },
  })));
}

function dropdownSet(evidence: PublicApiEvidence, font: FontName,
  theme: UiKitThemeVariables, icons: IconButtonLibrary): ComponentSetNode {
  return variants('Obsidian / Dropdown', ['default', 'selected', 'disabled'].map((state) => ({
    name: state,
    build: () => {
      const dom = publicSpecimen(evidence, 'obsidian.dropdown', state).dom;
      const root = component('Dropdown', dom.sizePx.width, dom.sizePx.height, theme, 'controlFill');
      root.cornerRadius = 8;
      root.opacity = Number(dom.styles.opacity) || 1;
      const selected = dom.children.find((option) => option.attributes?.value === dom.properties?.value);
      const value = selected?.text ?? dom.children[0]?.text ?? '';
      const text = label(root, 'Selected option', value, 9, 7, root.width - 33,
        font, theme);
      const glyph = icons.createGlyph('Search / Sort', 'Muted', 12);
      glyph.name = 'Observed dropdown chevrons';
      root.appendChild(glyph);
      glyph.x = root.width - 19; glyph.y = 9;
      return { component: root, texts: [property(text, 'Selected option')] };
    },
  })));
}

function colorSet(evidence: PublicApiEvidence, theme: UiKitThemeVariables): ComponentSetNode {
  return variants('Obsidian / Color', ['violet', 'red', 'disabled'].map((state) => ({
    name: state,
    build: () => {
      const dom = publicSpecimen(evidence, 'obsidian.color', state).dom;
      const root = component('Color', dom.sizePx.width, dom.sizePx.height);
      const swatch = figma.createRectangle();
      root.appendChild(swatch);
      swatch.name = 'Selected color';
      swatch.resize(root.width, root.height);
      swatch.cornerRadius = 4;
      const hex = String(dom.properties?.value ?? '#6750a4');
      const red = parseInt(hex.slice(1, 3), 16) / 255;
      const green = parseInt(hex.slice(3, 5), 16) / 255;
      const blue = parseInt(hex.slice(5, 7), 16) / 255;
      swatch.fills = [{ type: 'SOLID', color: { r: red, g: green, b: blue } }];
      swatch.strokes = fills(theme, 'controlBorder');
      swatch.strokeWeight = 1;
      root.opacity = state === 'disabled' ? 0.3 : 1;
      return { component: root, texts: [] };
    },
  })));
}

function sliderSet(evidence: PublicApiEvidence, font: FontName,
  theme: UiKitThemeVariables): ComponentSetNode {
  return variants('Obsidian / Slider', ['minimum', 'middle', 'maximum', 'disabled'].map((state) => ({
    name: state,
    build: () => {
      const dom = publicSpecimen(evidence, 'obsidian.slider', state).dom;
      const value = Number(dom.children.find((child) => child.tag === 'input')?.properties?.value ?? 0);
      const root = component('Slider', dom.sizePx.width, dom.sizePx.height);
      const number = label(root, 'Value', String(value), 0, 1, 32, font, theme);
      const trackX = 36;
      const track = rect(root, 'Track', trackX, 8, 100, 4, theme, 'sliderTrack', 4);
      track.constraints = { horizontal: 'SCALE', vertical: 'CENTER' };
      if (value > 0) {
        const filled = rect(root, 'Filled track', trackX, 8, value, 4,
          theme, 'accentFill', 4);
        filled.constraints = { horizontal: 'SCALE', vertical: 'CENTER' };
      }
      const thumb = figma.createEllipse();
      thumb.name = 'Thumb';
      root.appendChild(thumb);
      thumb.resize(18, 18);
      thumb.x = trackX - 9 + value; thumb.y = 1;
      thumb.fills = fills(theme, 'sliderThumb');
      thumb.strokes = [];
      thumb.constraints = { horizontal: 'SCALE', vertical: 'CENTER' };
      root.opacity = state === 'disabled' ? 0.5 : 1;
      return { component: root, texts: [property(number, 'Value')] };
    },
  })));
}

function progressSet(evidence: PublicApiEvidence,
  theme: UiKitThemeVariables): ComponentSetNode {
  return variants('Obsidian / Progress Bar', ['empty', 'half', 'complete'].map((state) => ({
    name: state,
    build: () => {
      const dom = publicSpecimen(evidence, 'obsidian.progress-bar', state).dom;
      const root = component('Progress Bar', dom.sizePx.width, dom.sizePx.height,
        theme, 'surfaceSecondary');
      root.cornerRadius = 4;
      const inner = publicDomFind(dom, 'setting-progress-bar-inner');
      if (inner && inner.sizePx.width > 0) {
        const progress = rect(root, 'Progress', 0, 0, inner.sizePx.width,
          root.height, theme, 'accentFill', 4);
        progress.constraints = { horizontal: 'SCALE', vertical: 'STRETCH' };
      }
      return { component: root, texts: [] };
    },
  })));
}

function extraButtonSet(evidence: PublicApiEvidence,
  icons: IconButtonLibrary): ComponentSetNode {
  return variants('Obsidian / Extra Button', ['normal', 'disabled'].map((state) => ({
    name: state,
    build: () => {
      const dom = publicSpecimen(evidence, 'obsidian.extra-button', state).dom;
      const root = component('Extra Button', dom.sizePx.width, dom.sizePx.height);
      const button = icons.create('Search / Settings', 'Toolbar',
        state === 'normal' ? 'Default' : 'Disabled', 'Muted');
      button.name = 'Icon Button';
      root.appendChild(button);
      button.x = 0; button.y = 0;
      exposeIfSupported(button);
      return { component: root, texts: [] };
    },
  })));
}

function settingSet(evidence: PublicApiEvidence, text: ComponentSetNode,
  font: FontName, theme: UiKitThemeVariables): ComponentSetNode {
  return variants('Obsidian / Setting', ['standard', 'heading', 'disabled', 'error'].map((state) => ({
    name: state,
    build: () => {
      const dom = publicSpecimen(evidence, 'obsidian.setting', state).dom;
      const root = component('Setting', dom.sizePx.width, dom.sizePx.height,
        theme, state === 'heading' ? undefined : 'surfacePrimaryAlt');
      root.cornerRadius = 12;
      const titleValue = publicDomFind(dom, 'setting-item-name')?.text ?? '';
      const title = label(root, 'Name', titleValue, state === 'heading' ? 0 : 16,
        state === 'heading' ? 0 : 16, state === 'heading' ? 450 : 300,
        font, theme, 'textNormal', state === 'heading' ? 15 : 13);
      const texts = [property(title, 'Name')];
      if (state !== 'heading') {
        const description = label(root, 'Description',
          publicDomFind(dom, 'setting-item-description')?.text ?? '',
          16, 36, 300, font, theme, 'textMuted', 12, 15.6);
        texts.push(property(description, 'Description'));
        const input = nested(root, stateComponent(text, state === 'disabled'
          ? 'disabled' : 'filled'), 'Text control', root.width - 180, 19);
        setNestedText(input, 'Value', String(publicDomFind(dom, 'setting-item-control')
          ?.children.find((child) => child.tag === 'input')?.properties?.value ?? ''));
        input.constraints = { horizontal: 'MAX', vertical: 'CENTER' };
        if (state === 'error') {
          const message = label(root, 'Error',
            publicDomFind(dom, 'setting-item-error')?.text ??
              publicDomText(dom).slice(-1)[0] ?? '',
            16, root.height - 20, root.width - 32, font, theme, 'textWarning', 12, 15.6);
          texts.push(property(message, 'Error'));
        }
      }
      return { component: root, texts };
    },
  })));
}

function displayValueSet(evidence: PublicApiEvidence, font: FontName,
  theme: UiKitThemeVariables): ComponentSetNode {
  return variants('Obsidian / Display Value', ['value', 'warning', 'empty'].map((state) => ({
    name: state,
    build: () => {
      const dom = publicSpecimen(evidence, 'obsidian.display-value', state).dom;
      const root = component('Display Value', dom.sizePx.width, dom.sizePx.height,
        theme, 'surfacePrimaryAlt');
      root.cornerRadius = 12;
      const title = label(root, 'Name', publicDomFind(dom, 'setting-item-name')?.text ?? '',
        16, 16, 300, font, theme);
      const value = publicDomFind(dom, 'setting-item-value')?.text;
      const texts = [property(title, 'Name')];
      if (value) {
        const field = label(root, 'Value', value, root.width - 282, 16,
          260, font, theme, 'textMuted');
        field.textAlignHorizontal = 'RIGHT';
        field.constraints = { horizontal: 'MAX', vertical: 'CENTER' };
        texts.push(property(field, 'Value'));
      }
      return { component: root, texts };
    },
  })));
}

function secretComponent(evidence: PublicApiEvidence, button: ComponentSetNode,
  font: FontName, theme: UiKitThemeVariables): ComponentNode {
  const dom = publicSpecimen(evidence, 'obsidian.secret', 'unselected').dom;
  const root = component('Obsidian / Secret', dom.sizePx.width, dom.sizePx.height,
    theme, 'surfacePrimaryAlt');
  root.cornerRadius = 12;
  const title = label(root, 'Name', publicDomFind(dom, 'setting-item-name')?.text ?? '',
    16, 21, 300, font, theme);
  title.componentPropertyReferences = { characters: root.addComponentProperty('Name',
    'TEXT', title.characters) };
  const action = nested(root, stateComponent(button, 'Normal'), 'Button',
    root.width - 92, 16);
  setNestedText(action, 'Label', publicDomText(dom).slice(-1)[0] ?? 'Link...');
  action.constraints = { horizontal: 'MAX', vertical: 'CENTER' };
  root.description = 'SecretComponent público sem segredo selecionado; ação usa Button.';
  return root;
}

function settingGroupSet(evidence: PublicApiEvidence, setting: ComponentSetNode,
  toggle: PublicControlsLibrary, search: ComponentSetNode,
  font: FontName, theme: UiKitThemeVariables): ComponentSetNode {
  return variants('Obsidian / Setting Group', ['standard', 'with-search'].map((state) => ({
    name: state,
    build: () => {
      const dom = publicSpecimen(evidence, 'obsidian.setting-group', state).dom;
      const root = component('Setting Group', dom.sizePx.width, dom.sizePx.height);
      const groupRows = publicDomFind(dom, 'setting-items')?.children ?? [];
      const firstName = groupRows[0] && publicDomFind(groupRows[0], 'setting-item-name')?.text;
      const secondName = groupRows[1] && publicDomFind(groupRows[1], 'setting-item-name')?.text;
      const title = label(root, 'Group name',
        publicDomFind(dom, 'setting-item-name')?.text ?? '', 0, 0,
        root.width - 16, font, theme, 'textNormal', 15);
      let y = 36;
      if (state === 'with-search') {
        const searchInstance = nested(root, stateComponent(search, 'Empty'),
          'SearchComponent', 16, y);
        searchInstance.constraints = { horizontal: 'MIN', vertical: 'MIN' };
        y += 66;
      }
      const first = nested(root, stateComponent(setting, 'standard'), 'Setting / toggle', 0, y);
      first.resize(root.width, 57);
      setNestedText(first, 'Name', firstName ?? '');
      const textControl = first.findOne((node) => node.type === 'INSTANCE' &&
        node.name === 'Text control');
      if (textControl) textControl.visible = false;
      const on = toggle.toggleState('On');
      root.appendChild(on);
      on.name = 'ToggleComponent';
      on.x = root.width - 52; on.y = y + 22;
      y += 57;
      const second = nested(root, stateComponent(setting, 'standard'), 'Setting / text', 0, y);
      second.resize(root.width, 76);
      setNestedText(second, 'Name', secondName ?? '');
      return { component: root, texts: [property(title, 'Group name')] };
    },
  })));
}

function simpleButtonWrapper(evidence: PublicApiEvidence, id: 'obsidian.set-tooltip',
  button: ComponentSetNode): ComponentNode {
  const dom = publicSpecimen(evidence, id, 'registered').dom;
  const root = component('Obsidian / Tooltip Target', dom.sizePx.width, dom.sizePx.height);
  const target = nested(root, stateComponent(button, 'Normal'), 'Button', 0, 0);
  setNestedText(target, 'Label', dom.text ?? 'Hover for tooltip');
  root.description = 'setTooltip registra o alvo; a superfície visível reutiliza Obsidian / Tooltip.';
  return root;
}

function iconSpecimen(evidence: PublicApiEvidence,
  icons: IconButtonLibrary): ComponentNode {
  const dom = publicSpecimen(evidence, 'obsidian.set-icon', 'settings').dom;
  const root = component('Obsidian / Icon Specimen',
    dom.sizePx.width, dom.sizePx.height);
  const glyph = icons.createGlyph('Search / Settings', 'Muted');
  glyph.name = 'Glyph';
  root.appendChild(glyph);
  glyph.x = 0; glyph.y = 2;
  root.description = 'setIcon público usa o mesmo glyph canônico observado; a ação pertence ao consumidor.';
  return root;
}

function modalSet(evidence: PublicApiEvidence, font: FontName,
  theme: UiKitThemeVariables, icons: IconButtonLibrary): ComponentSetNode {
  return variants('Obsidian / Modal', ['basic', 'with-content'].map((state) => ({
    name: state,
    build: () => {
      const dom = publicSpecimen(evidence, 'obsidian.modal', state).dom;
      const root = component('Modal', dom.sizePx.width, dom.sizePx.height,
        theme, 'surfacePrimary');
      root.cornerRadius = 24;
      root.strokes = fills(theme, 'modalBorder');
      root.strokeWeight = 1;
      const title = label(root, 'Title', publicDomFind(dom, 'modal-title')?.text ?? '',
        16, 16, root.width - 56, font, theme, 'textNormal', 17, 22);
      const glyph = icons.createGlyph('Workspace tab / Close', 'Muted');
      glyph.name = 'Close glyph';
      root.appendChild(glyph);
      glyph.x = root.width - 32; glyph.y = 16;
      const content = label(root, 'Content',
        publicDomFind(dom, 'modal-content')?.text ?? '',
        16, 50, root.width - 32, font, theme);
      return { component: root, texts: [property(title, 'Title'),
        property(content, 'Content')] };
    },
  })));
}

function confirmationSet(evidence: PublicApiEvidence, button: ComponentSetNode,
  font: FontName, theme: UiKitThemeVariables,
  icons: IconButtonLibrary): ComponentSetNode {
  return variants('Obsidian / Confirmation Modal',
    ['standard', 'with-checkbox'].map((state) => ({
      name: state,
      build: () => {
        const dom = publicSpecimen(evidence, 'obsidian.confirmation-modal', state).dom;
        const root = component('Confirmation Modal', dom.sizePx.width, dom.sizePx.height,
          theme, 'surfacePrimary');
        root.cornerRadius = 24;
        root.strokes = fills(theme, 'modalBorder'); root.strokeWeight = 1;
        const title = label(root, 'Title', publicDomFind(dom, 'modal-title')?.text ?? '',
          16, 16, root.width - 56, font, theme, 'textNormal', 17, 22);
        const glyph = icons.createGlyph('Workspace tab / Close', 'Muted');
        glyph.name = 'Close glyph'; root.appendChild(glyph);
        glyph.x = root.width - 32; glyph.y = 16;
        const content = label(root, 'Content',
          publicDomFind(dom, 'modal-content')?.text ?? '',
          16, 50, root.width - 32, font, theme);
        const actions = confirmationActions(dom);
        const confirm = nested(root, stateComponent(button, 'CTA'), 'Confirm Button',
          0, root.height - 46);
        setNestedText(confirm, 'Label', actions.confirm);
        const cancel = nested(root, stateComponent(button, 'Normal'), 'Cancel Button',
          0, root.height - 46);
        setNestedText(cancel, 'Label', actions.cancel);
        cancel.x = root.width - 16 - cancel.width;
        confirm.x = cancel.x - actions.gap - confirm.width;
        if (confirm.x < 16 || confirm.x + confirm.width + actions.gap > cancel.x + 0.5 ||
          cancel.x + cancel.width > root.width - 16 + 0.5) {
          throw new Error('Public API: botões do Confirmation Modal saíram da caixa.');
        }
        const texts = [property(title, 'Title'), property(content, 'Content')];
        if (state === 'with-checkbox') {
          const checkbox = rect(root, 'Checkbox', 18, root.height - 72, 16, 16,
            theme, 'controlFill', 4);
          checkbox.constraints = { horizontal: 'MIN', vertical: 'MAX' };
          const check = label(root, 'Checkbox label',
            actions.checkbox ?? '',
            42, root.height - 72, 310, font, theme);
          texts.push(property(check, 'Checkbox label'));
        }
        return { component: root, texts };
      },
    })));
}

function menuSet(evidence: PublicApiEvidence, font: FontName,
  theme: UiKitThemeVariables): ComponentSetNode {
  return variants('Obsidian / Menu', ['standard', 'checked'].map((state) => ({
    name: state,
    build: () => {
      const dom = publicSpecimen(evidence, 'obsidian.menu', state).dom;
      const root = component('Menu', dom.sizePx.width, dom.sizePx.height,
        theme, 'surfaceSecondary');
      root.cornerRadius = 8;
      root.strokes = fills(theme, 'menuBorder'); root.strokeWeight = 1;
      const items = publicDomText(dom).filter(Boolean).slice(0, 2);
      const first = label(root, 'First action', items[0] ?? '', 30, 10,
        root.width - 40, font, theme);
      rect(root, 'Separator', 6, 37, root.width - 12, 1,
        theme, 'menuBorder');
      const second = label(root, 'Second action', items[1] ?? '', 30, 48,
        root.width - 40, font, theme);
      root.description = state === 'checked'
        ? 'Checked state captured; check glyph pending exact canonical SVG evidence.'
        : 'Non-native public Menu surface and separator.';
      return { component: root, texts: [property(first, 'First action'),
        property(second, 'Second action')] };
    },
  })));
}

function noticeSet(evidence: PublicApiEvidence, font: FontName,
  theme: UiKitThemeVariables): ComponentSetNode {
  return variants('Obsidian / Notice', ['message', 'updated'].map((state) => ({
    name: state,
    build: () => {
      const dom = publicSpecimen(evidence, 'obsidian.notice', state).dom;
      const root = component('Notice', dom.sizePx.width, dom.sizePx.height);
      root.cornerRadius = 8;
      rect(root, 'Notice surface', 0, 0, root.width, root.height,
        theme, 'noticeSurface', 8, 0.9);
      const text = label(root, 'Message',
        publicDomFind(dom, 'notice-message')?.text ?? '',
        12, 8, root.width - 24, font, theme, 'noticeText');
      return { component: root, texts: [property(text, 'Message')] };
    },
  })));
}

function suggestionItemSet(font: FontName,
  theme: UiKitThemeVariables): ComponentSetNode {
  return variants('Obsidian / Suggestion Item', ['Default', 'Selected'].map((state) => ({
    name: state,
    build: () => {
      const root = component('Suggestion Item', 160, 32);
      root.cornerRadius = 4;
      if (state === 'Selected') rect(root, 'Selection background', 0, 0,
        root.width, root.height, theme, 'selectedOverlay', 4, 0.067);
      const text = label(root, 'Label', 'Mapping alpha', 8, 7,
        root.width - 16, font, theme);
      return { component: root, texts: [property(text, 'Label')] };
    },
  })));
}

function suggestionInstance(root: Parent, item: ComponentSetNode, state: string,
  content: string, x: number, y: number, width: number): InstanceNode {
  const instance = nested(root, stateComponent(item, state), 'Suggestion item', x, y);
  instance.resize(width, 32);
  setNestedText(instance, 'Label', content);
  return instance;
}

function suggestionSet(evidence: PublicApiEvidence,
  id: 'obsidian.abstract-input-suggest' | 'obsidian.popover-suggest',
  item: ComponentSetNode, theme: UiKitThemeVariables): ComponentSetNode {
  const states = id === 'obsidian.popover-suggest' ? ['empty-shell'] : ['all', 'filtered'];
  return variants(id === 'obsidian.popover-suggest'
    ? 'Obsidian / Popover Suggest' : 'Obsidian / Input Suggest', states.map((state) => ({
    name: state,
    build: () => {
      const dom = publicSpecimen(evidence, id, state).dom;
      const root = component('Suggestion container', dom.sizePx.width, dom.sizePx.height,
        theme, 'surfacePrimary');
      root.cornerRadius = 8;
      root.strokes = fills(theme, 'controlBorder'); root.strokeWeight = 1;
      const list = publicDomFind(dom, 'suggestion');
      const choices = list?.children.filter((node) => node.classes.includes('suggestion-item')) ?? [];
      choices.forEach((choice, index) => {
        suggestionInstance(root, item, index === 0 ? 'Selected' : 'Default',
          choice.text ?? '', 7, 7 + index * 32, root.width - 14);
      });
      root.description = id === 'obsidian.popover-suggest'
        ? 'Captured base class has an empty 14 px shell; no public item provider was observed.'
        : 'Public AbstractInputSuggest list; item uses the shared Suggestion Item source.';
      return { component: root, texts: [] };
    },
  })));
}

function promptInput(evidence: PublicApiEvidence, font: FontName,
  theme: UiKitThemeVariables, icons: IconButtonLibrary): ComponentNode {
  const dom = publicSpecimen(evidence, 'obsidian.suggest-modal', 'all').dom;
  const observed = publicDomFind(dom, 'prompt-input-container');
  if (!observed) throw new Error('Public API: prompt input ausente.');
  const root = component('Obsidian / Prompt Input', observed.sizePx.width,
    observed.sizePx.height, theme, 'surfacePrimary');
  const input = observed.children.find((node) => node.tag === 'input');
  const content = input?.attributes?.placeholder ?? '';
  const text = label(root, 'Query', content, 16, 16, root.width - 56,
    font, theme, 'textFaint', 15, 20);
  text.componentPropertyReferences = { characters: root.addComponentProperty('Query',
    'TEXT', content) };
  const clear = icons.createGlyph('Workspace tab / Close', 'Muted');
  clear.name = 'Clear glyph'; root.appendChild(clear);
  clear.x = root.width - 32; clear.y = 16;
  root.description = 'Shared public SuggestModal/FuzzySuggestModal prompt input.';
  return root;
}

function suggestModalSet(evidence: PublicApiEvidence,
  id: 'obsidian.suggest-modal' | 'obsidian.fuzzy-suggest-modal',
  item: ComponentSetNode, prompt: ComponentNode,
  theme: UiKitThemeVariables): ComponentSetNode {
  return variants(id === 'obsidian.suggest-modal'
    ? 'Obsidian / Suggest Modal' : 'Obsidian / Fuzzy Suggest Modal',
  ['all', 'filtered'].map((state) => ({
    name: state,
    build: () => {
      const dom = publicSpecimen(evidence, id, state).dom;
      const root = component('Suggest Modal', dom.sizePx.width, dom.sizePx.height,
        theme, 'surfacePrimary');
      root.cornerRadius = 8;
      root.strokes = fills(theme, 'modalBorder'); root.strokeWeight = 1;
      const input = nested(root, prompt, 'Prompt Input', 1, 1);
      if (state === 'filtered') setNestedText(input, 'Query',
        String(publicDomFind(dom, 'prompt-input')?.properties?.value ?? ''));
      const results = publicDomFind(dom, 'prompt-results');
      const choices = results?.children.filter((node) =>
        node.classes.includes('suggestion-item')) ?? [];
      choices.forEach((choice, index) => {
        suggestionInstance(root, item, index === 0 ? 'Selected' : 'Default',
          publicDomText(choice).join('') || choice.text || '',
          12, 61 + index * 32, root.width - 24);
      });
      return { component: root, texts: [] };
    },
  })));
}

function section(name: string, nodes: Array<ComponentSetNode | ComponentNode>,
  x: number, y: number, columns: number, width: number): SectionNode {
  const result = figma.createSection();
  result.name = name;
  result.x = x; result.y = y;
  const cell = Math.max(width / columns, ...nodes.map((node) => node.width + 64));
  const bottoms = Array(columns).fill(48) as number[];
  nodes.forEach((node, index) => {
    const column = index % columns;
    result.appendChild(node);
    node.x = 32 + column * cell;
    node.y = bottoms[column]!;
    bottoms[column] = node.y + node.height + 72;
  });
  result.resize(cell * columns + 64, Math.max(...bottoms) + 16);
  return result;
}

/** Public API breadth pass; the existing Button/Search/Toggle/Tooltip remain the sources. */
export async function generatePublicApiBatch(evidence: PublicApiEvidence,
  theme: UiKitThemeVariables, fontFamily: string, icons: IconButtonLibrary,
  publicControls: PublicControlsLibrary, button: ComponentSetNode,
  search: ComponentSetNode): Promise<PublicApiBatch> {
  const available = (await figma.listAvailableFontsAsync()).map((item) => item.fontName);
  const font = requiredFont({ cssStack: fontFamily, platform: 'macos', weight: 400,
    style: 'normal' }, available);
  try { await figma.loadFontAsync(font); }
  catch { throw fontFailure(font, 'Public API: SF Pro não carregou.'); }
  const batchX = Math.max(0, ...figma.currentPage.children.map((node) => {
    const box = node.absoluteBoundingBox;
    return box ? box.x + box.width : 0;
  })) + 240;
  const sets = new Map<PublicApiId, ComponentSetNode | ComponentNode>([
    ['obsidian.button', button], ['obsidian.search', search],
    ['obsidian.toggle', publicControls.toggle],
    ['obsidian.display-tooltip', publicControls.tooltip],
  ]);
  const add = (id: PublicApiId, set: ComponentSetNode | ComponentNode) => {
    if (sets.has(id)) throw new Error(`Public API: fonte paralela ${id}.`);
    sets.set(id, set);
    return set;
  };
  const text = add('obsidian.text', inputSet(evidence, 'obsidian.text', 'Text', font, theme)) as ComponentSetNode;
  add('obsidian.textarea', inputSet(evidence, 'obsidian.textarea', 'Text Area', font, theme));
  add('obsidian.moment-format', momentFormatSet(evidence, text));
  add('obsidian.dropdown', dropdownSet(evidence, font, theme, icons));
  add('obsidian.color', colorSet(evidence, theme));
  add('obsidian.slider', sliderSet(evidence, font, theme));
  add('obsidian.progress-bar', progressSet(evidence, theme));
  add('obsidian.extra-button', extraButtonSet(evidence, icons));
  const setting = add('obsidian.setting', settingSet(evidence, text, font, theme)) as ComponentSetNode;
  add('obsidian.display-value', displayValueSet(evidence, font, theme));
  add('obsidian.secret', secretComponent(evidence, button, font, theme));
  add('obsidian.setting-group', settingGroupSet(evidence, setting,
    publicControls, search, font, theme));
  add('obsidian.set-tooltip', simpleButtonWrapper(evidence, 'obsidian.set-tooltip', button));
  add('obsidian.set-icon', iconSpecimen(evidence, icons));
  add('obsidian.modal', modalSet(evidence, font, theme, icons));
  add('obsidian.confirmation-modal', confirmationSet(evidence, button, font, theme, icons));
  add('obsidian.menu', menuSet(evidence, font, theme));
  add('obsidian.notice', noticeSet(evidence, font, theme));
  const item = suggestionItemSet(font, theme);
  add('obsidian.popover-suggest', suggestionSet(evidence, 'obsidian.popover-suggest', item, theme));
  add('obsidian.abstract-input-suggest', suggestionSet(evidence,
    'obsidian.abstract-input-suggest', item, theme));
  const prompt = promptInput(evidence, font, theme, icons);
  add('obsidian.suggest-modal', suggestModalSet(evidence,
    'obsidian.suggest-modal', item, prompt, theme));
  add('obsidian.fuzzy-suggest-modal', suggestModalSet(evidence,
    'obsidian.fuzzy-suggest-modal', item, prompt, theme));
  if (sets.size !== 26) throw new Error(`Public API: ${sets.size}/26 famílias representadas.`);
  const controls = section('Public API / Controls', [
    sets.get('obsidian.extra-button')!, sets.get('obsidian.text')!,
    sets.get('obsidian.textarea')!, sets.get('obsidian.moment-format')!,
    sets.get('obsidian.dropdown')!, sets.get('obsidian.color')!,
    sets.get('obsidian.slider')!, sets.get('obsidian.progress-bar')!,
    sets.get('obsidian.set-tooltip')!, sets.get('obsidian.set-icon')!,
  ], batchX, 0, 4, 1600);
  const settings = section('Public API / Settings', [
    sets.get('obsidian.setting')!, sets.get('obsidian.setting-group')!,
    sets.get('obsidian.display-value')!, sets.get('obsidian.secret')!,
  ], batchX, controls.y + controls.height + 160, 2, 1520);
  const overlays = section('Public API / Overlays', [
    sets.get('obsidian.modal')!, sets.get('obsidian.confirmation-modal')!,
    sets.get('obsidian.menu')!, sets.get('obsidian.notice')!,
    item, sets.get('obsidian.popover-suggest')!,
    sets.get('obsidian.abstract-input-suggest')!, prompt,
    sets.get('obsidian.suggest-modal')!, sets.get('obsidian.fuzzy-suggest-modal')!,
  ], batchX, settings.y + settings.height + 160, 2, 1520);
  const sections = [controls, settings, overlays];
  return { sections, sets };
}
