import {
  type App,
  ButtonComponent,
  ColorComponent,
  ConfirmationModal,
  DropdownComponent,
  displayTooltip,
  ExtraButtonComponent,
  MomentFormatComponent,
  Menu,
  Modal,
  Notice,
  ProgressBarComponent,
  SearchComponent,
  setIcon,
  setTooltip,
  SecretComponent,
  Setting,
  SettingGroup,
  SliderComponent,
  TextAreaComponent,
  TextComponent,
  ToggleComponent,
} from 'obsidian';
import type { ComponentOrigin } from '@obsidian-ui-system/ui-schema';
import {
  AtlasFuzzySuggestModal,
  AtlasInputSuggest,
  AtlasPopoverSuggest,
  AtlasSuggestModal,
} from './suggestion-fixtures';

/** Only accept a suggestion container created by this fixture's own open call. */
function newSuggestionContainer(doc: Document, open: () => void): () => Element {
  const documents = [...new Set([doc, activeWindow.document])];
  const candidates = (): Element[] => documents.flatMap((document) =>
    Array.from(document.querySelectorAll('.suggestion-container')));
  const before = new Set(candidates());
  open();
  const created = candidates().filter((element) => !before.has(element));
  return () => {
    if (created.length !== 1) {
      throw new Error(`Expected one new suggestion container, found ${created.length}`);
    }
    return created[0]!;
  };
}

export interface ComponentVariant {
  id: string;
  name: string;
  state: string;
}

interface RenderedComponent {
  root: Element;
  getState: () => string;
  /** Optional public-API content mutation used only by experimental layout probes. */
  setContentForLayoutProbe?: (text: string) => void;
  /** Open a surface outside the Atlas before capture. */
  activate?: () => void;
  /** Return the opened surface, rather than the Atlas trigger host. */
  getCaptureRoot?: () => Element;
  deactivate?: () => void;
}

export interface ComponentDefinition {
  id: string;
  name: string;
  category: string;
  source: ComponentOrigin;
  implementation: string;
  variants: readonly ComponentVariant[];
  /** Declares support for the shared experimental content probes. */
  supportsLayoutContentProbe?: boolean;
  /** Surfaces opened by a specimen, outside its captured DOM root. */
  triggeredSurfaces?: readonly { id: string; trigger: string }[];
  render: (mount: HTMLElement, variant: ComponentVariant, app: App) => RenderedComponent;
}

export interface RenderedSpecimen extends RenderedComponent {
  definition: ComponentDefinition;
  variant: ComponentVariant;
}

export const componentRegistry: readonly ComponentDefinition[] = [
  {
    id: 'obsidian.modal',
    name: 'Modal',
    category: 'Overlays',
    source: 'public-api',
    implementation: 'obsidian.Modal',
    variants: [
      { id: 'basic', name: 'Basic dialog', state: 'open' },
      { id: 'with-content', name: 'Dialog with content', state: 'open' },
    ],
    render(mount, variant, app) {
      const modal = new Modal(app).setTitle('Atlas modal');
      modal.setContent(variant.id === 'with-content' ? 'Example dialog content.' : '');
      return {
        root: mount,
        activate: () => modal.open(),
        getCaptureRoot: () => modal.modalEl,
        getState: () => modal.containerEl.isConnected ? 'open' : 'closed',
        deactivate: () => modal.close(),
      };
    },
  },
  {
    id: 'obsidian.confirmation-modal',
    name: 'ConfirmationModal',
    category: 'Overlays',
    source: 'public-api',
    implementation: 'obsidian.ConfirmationModal',
    variants: [
      { id: 'standard', name: 'Confirmation', state: 'open' },
      { id: 'with-checkbox', name: 'Confirmation with checkbox', state: 'open' },
    ],
    render(mount, variant, app) {
      const modal = new ConfirmationModal(app).setTitle('Confirm example action');
      modal.setContent('This is a demonstration. No action is performed.');
      if (variant.id === 'with-checkbox') modal.addCheckbox('Remember example choice', () => {});
      modal.addButton((button) => button.setButtonText('Confirm').setCta());
      modal.addCancelButton('Cancel');
      return {
        root: mount,
        activate: () => modal.open(),
        getCaptureRoot: () => modal.modalEl,
        getState: () => modal.containerEl.isConnected ? 'open' : 'closed',
        deactivate: () => modal.close(),
      };
    },
  },
  {
    id: 'obsidian.menu',
    name: 'Menu',
    category: 'Overlays',
    source: 'public-api',
    implementation: 'obsidian.Menu',
    variants: [
      { id: 'standard', name: 'Standard menu', state: 'open' },
      { id: 'checked', name: 'Checked item', state: 'open' },
    ],
    render(mount, variant) {
      const menu = new Menu().setUseNativeMenu(false);
      menu.addItem((item) => item.setTitle('Atlas menu action').setIcon('check').setChecked(variant.id === 'checked'));
      menu.addSeparator();
      menu.addItem((item) => item.setTitle('Another example action'));
      const findMenu = (): Element => {
        const element = Array.from(mount.ownerDocument.querySelectorAll('.menu'))
          .find((candidate) => candidate.textContent?.includes('Atlas menu action'));
        if (!element) throw new Error('Obsidian Menu DOM was not found after opening');
        return element;
      };
      return {
        root: mount,
        activate: () => {
          const rect = mount.getBoundingClientRect();
          menu.showAtPosition({ x: rect.left, y: rect.bottom }, mount.ownerDocument);
        },
        getCaptureRoot: findMenu,
        getState: () => findMenu().isConnected ? 'open' : 'closed',
        deactivate: () => menu.hide(),
      };
    },
  },
  {
    id: 'obsidian.notice',
    name: 'Notice',
    category: 'Overlays',
    source: 'public-api',
    implementation: 'obsidian.Notice',
    variants: [
      { id: 'message', name: 'Message', state: 'visible' },
      { id: 'updated', name: 'Updated message', state: 'visible' },
    ],
    render(mount, variant) {
      let notice: Notice | null = null;
      return {
        root: mount,
        activate: () => {
          notice?.hide();
          notice = new Notice('Atlas notice', 0);
          if (variant.id === 'updated') notice.setMessage('Atlas notice updated');
        },
        getCaptureRoot: () => {
          if (!notice) throw new Error('Notice has not been opened');
          return notice.containerEl;
        },
        getState: () => notice?.containerEl.isConnected ? 'visible' : 'hidden',
        deactivate: () => {
          notice?.hide();
          notice = null;
        },
      };
    },
  },
  {
    id: 'obsidian.popover-suggest',
    name: 'PopoverSuggest',
    category: 'Suggestions',
    source: 'public-api',
    implementation: 'obsidian.PopoverSuggest',
    variants: [{ id: 'empty-shell', name: 'Open popover shell', state: 'open' }],
    render(mount, _variant, app) {
      const suggest = new AtlasPopoverSuggest(app);
      let findRoot: (() => Element) | null = null;
      return {
        root: mount,
        activate: () => { findRoot = newSuggestionContainer(mount.ownerDocument, () => suggest.open()); },
        getCaptureRoot: () => {
          if (!findRoot) throw new Error('PopoverSuggest has not been opened');
          return findRoot();
        },
        getState: () => findRoot?.().isConnected ? 'open' : 'closed',
        deactivate: () => { suggest.close(); findRoot = null; },
      };
    },
  },
  {
    id: 'obsidian.abstract-input-suggest',
    name: 'AbstractInputSuggest',
    category: 'Suggestions',
    source: 'public-api',
    implementation: 'obsidian.AbstractInputSuggest',
    variants: [
      { id: 'all', name: 'All suggestions', state: 'results' },
      { id: 'filtered', name: 'Filtered suggestions', state: 'results' },
    ],
    render(mount, variant, app) {
      const input = new TextComponent(mount).setPlaceholder('Search Atlas examples').inputEl;
      const suggest = new AtlasInputSuggest(app, input);
      const query = variant.id === 'filtered' ? 'beta' : 'Atlas';
      let findRoot: (() => Element) | null = null;
      const getRoot = (): Element => {
        if (!findRoot) throw new Error('AbstractInputSuggest has not been opened');
        const root = findRoot();
        if (!root.textContent?.includes('Atlas beta')) throw new Error('Fixture suggestions were not rendered');
        return root;
      };
      return {
        root: input,
        activate: () => {
          suggest.setValue(query);
          findRoot = newSuggestionContainer(input.ownerDocument, () => {
            input.focus();
            input.dispatchEvent(new Event('input', { bubbles: true }));
          });
        },
        getCaptureRoot: getRoot,
        getState: () => getRoot().isConnected ? 'results' : 'closed',
        deactivate: () => { suggest.close(); input.blur(); findRoot = null; },
      };
    },
  },
  {
    id: 'obsidian.suggest-modal',
    name: 'SuggestModal',
    category: 'Suggestions',
    source: 'public-api',
    implementation: 'obsidian.SuggestModal',
    variants: [
      { id: 'all', name: 'All suggestions', state: 'results' },
      { id: 'filtered', name: 'Filtered suggestions', state: 'results' },
    ],
    render(mount, variant, app) {
      const modal = new AtlasSuggestModal(app);
      return {
        root: mount,
        activate: () => {
          modal.open();
          modal.inputEl.value = variant.id === 'filtered' ? 'beta' : '';
          modal.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        },
        getCaptureRoot: () => modal.modalEl,
        getState: () => modal.modalEl.isConnected && modal.resultContainerEl.textContent?.includes('Atlas beta')
          ? 'results' : 'closed',
        deactivate: () => modal.close(),
      };
    },
  },
  {
    id: 'obsidian.fuzzy-suggest-modal',
    name: 'FuzzySuggestModal',
    category: 'Suggestions',
    source: 'public-api',
    implementation: 'obsidian.FuzzySuggestModal',
    variants: [
      { id: 'all', name: 'All fuzzy suggestions', state: 'results' },
      { id: 'filtered', name: 'Filtered fuzzy suggestions', state: 'results' },
    ],
    render(mount, variant, app) {
      const modal = new AtlasFuzzySuggestModal(app);
      return {
        root: mount,
        activate: () => {
          modal.open();
          modal.inputEl.value = variant.id === 'filtered' ? 'beta' : '';
          modal.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        },
        getCaptureRoot: () => modal.modalEl,
        getState: () => modal.modalEl.isConnected && modal.resultContainerEl.textContent?.includes('Atlas beta')
          ? 'results' : 'closed',
        deactivate: () => modal.close(),
      };
    },
  },
  {
    id: 'obsidian.button',
    name: 'ButtonComponent',
    category: 'Actions',
    source: 'public-api',
    implementation: 'obsidian.ButtonComponent',
    supportsLayoutContentProbe: true,
    variants: [
      { id: 'normal', name: 'Normal', state: 'enabled' },
      { id: 'disabled', name: 'Disabled', state: 'disabled' },
      { id: 'cta', name: 'CTA', state: 'enabled' },
    ],
    render(mount, variant) {
      const button = new ButtonComponent(mount).setButtonText('Example button');
      if (variant.id === 'disabled') button.setDisabled(true);
      if (variant.id === 'cta') button.setCta();
      return {
        root: button.buttonEl,
        getState: () => button.buttonEl.disabled ? 'disabled' : 'enabled',
        setContentForLayoutProbe: (text) => { button.setButtonText(text); },
      };
    },
  },
  {
    id: 'obsidian.extra-button',
    name: 'ExtraButtonComponent',
    category: 'Actions',
    source: 'public-api',
    implementation: 'obsidian.ExtraButtonComponent',
    variants: [
      { id: 'normal', name: 'Normal', state: 'enabled' },
      { id: 'disabled', name: 'Disabled', state: 'disabled' },
    ],
    render(mount, variant) {
      mount.addClass('obsidian-ui-atlas-inline-host');
      const button = new ExtraButtonComponent(mount)
        .setIcon('settings')
        .setTooltip('Atlas settings');
      if (variant.id === 'disabled') button.setDisabled(true);
      return {
        root: button.extraSettingsEl,
        getState: () => button.extraSettingsEl.classList.contains('is-disabled') ? 'disabled' : 'enabled',
      };
    },
  },
  {
    id: 'obsidian.search',
    name: 'SearchComponent',
    category: 'Inputs',
    source: 'public-api',
    implementation: 'obsidian.SearchComponent',
    supportsLayoutContentProbe: true,
    variants: [
      { id: 'empty', name: 'Empty', state: 'empty' },
      { id: 'filled', name: 'Filled', state: 'filled' },
    ],
    render(mount, variant) {
      const search = new SearchComponent(mount)
        .setPlaceholder('Search example')
        .setValue(variant.id === 'filled' ? 'Atlas query' : '');
      const wrapper = search.inputEl.parentElement;
      return {
        root: wrapper && mount.contains(wrapper) ? wrapper : search.inputEl,
        getState: () => search.getValue() ? 'filled' : 'empty',
        setContentForLayoutProbe: (text) => {
          if (variant.id === 'empty') search.setPlaceholder(text);
          else search.setValue(text);
        },
      };
    },
  },
  {
    id: 'obsidian.text',
    name: 'TextComponent',
    category: 'Inputs',
    source: 'public-api',
    implementation: 'obsidian.TextComponent',
    variants: [
      { id: 'empty', name: 'Empty', state: 'empty' },
      { id: 'filled', name: 'Filled', state: 'filled' },
      { id: 'disabled', name: 'Disabled', state: 'disabled' },
    ],
    render(mount, variant) {
      const text = new TextComponent(mount)
        .setPlaceholder('Enter text')
        .setValue(variant.id === 'empty' ? '' : 'Atlas example');
      if (variant.id === 'disabled') text.setDisabled(true);
      return {
        root: text.inputEl,
        getState: () => text.inputEl.disabled ? 'disabled' : text.getValue() ? 'filled' : 'empty',
      };
    },
  },
  {
    id: 'obsidian.textarea',
    name: 'TextAreaComponent',
    category: 'Inputs',
    source: 'public-api',
    implementation: 'obsidian.TextAreaComponent',
    variants: [
      { id: 'empty', name: 'Empty', state: 'empty' },
      { id: 'filled', name: 'Filled', state: 'filled' },
      { id: 'disabled', name: 'Disabled', state: 'disabled' },
    ],
    render(mount, variant) {
      const area = new TextAreaComponent(mount)
        .setPlaceholder('Enter multiple lines')
        .setValue(variant.id === 'empty' ? '' : 'Atlas example\nSecond line');
      if (variant.id === 'disabled') area.setDisabled(true);
      return {
        root: area.inputEl,
        getState: () => area.inputEl.disabled ? 'disabled' : area.getValue() ? 'filled' : 'empty',
      };
    },
  },
  {
    id: 'obsidian.dropdown',
    name: 'DropdownComponent',
    category: 'Inputs',
    source: 'public-api',
    implementation: 'obsidian.DropdownComponent',
    variants: [
      { id: 'default', name: 'Default option', state: 'default' },
      { id: 'selected', name: 'Selected option', state: 'selected' },
      { id: 'disabled', name: 'Disabled', state: 'disabled' },
    ],
    render(mount, variant) {
      const dropdown = new DropdownComponent(mount)
        .addOption('first', 'First option')
        .addOption('second', 'Second option')
        .setValue(variant.id === 'selected' ? 'second' : 'first');
      if (variant.id === 'disabled') dropdown.setDisabled(true);
      return {
        root: dropdown.selectEl,
        getState: () => dropdown.selectEl.disabled ? 'disabled'
          : dropdown.getValue() === 'second' ? 'selected'
            : dropdown.getValue() === 'first' ? 'default' : 'unknown',
      };
    },
  },
  {
    id: 'obsidian.color',
    name: 'ColorComponent',
    category: 'Inputs',
    source: 'public-api',
    implementation: 'obsidian.ColorComponent',
    variants: [
      { id: 'violet', name: 'Violet', state: 'violet' },
      { id: 'red', name: 'Red', state: 'red' },
      { id: 'disabled', name: 'Disabled violet', state: 'disabled' },
    ],
    render(mount, variant) {
      const color = new ColorComponent(mount)
        .setValue(variant.id === 'red' ? '#e5484d' : '#6750a4');
      if (variant.id === 'disabled') color.setDisabled(true);
      const root = mount.firstElementChild;
      if (!root) throw new Error('ColorComponent did not render a root element');
      return {
        root,
        getState: () => mount.querySelector('input')?.disabled ? 'disabled'
          : color.getValue().toLowerCase() === '#e5484d' ? 'red'
            : color.getValue().toLowerCase() === '#6750a4' ? 'violet' : 'unknown',
      };
    },
  },
  {
    id: 'obsidian.moment-format',
    name: 'MomentFormatComponent',
    category: 'Inputs',
    source: 'public-api',
    implementation: 'obsidian.MomentFormatComponent',
    variants: [
      { id: 'empty', name: 'Empty', state: 'empty' },
      { id: 'filled', name: 'Filled format', state: 'filled' },
      { id: 'disabled', name: 'Disabled format', state: 'disabled' },
    ],
    render(mount, variant) {
      const format = new MomentFormatComponent(mount)
        .setDefaultFormat('YYYY-MM-DD')
        .setValue(variant.id === 'empty' ? '' : 'YYYY-MM-DD');
      if (variant.id === 'disabled') format.setDisabled(true);
      return {
        root: format.inputEl,
        getState: () => format.inputEl.disabled ? 'disabled'
          : format.getValue() ? 'filled' : 'empty',
      };
    },
  },
  {
    id: 'obsidian.slider',
    name: 'SliderComponent',
    category: 'Inputs',
    source: 'public-api',
    implementation: 'obsidian.SliderComponent',
    variants: [
      { id: 'minimum', name: 'Minimum (0)', state: 'minimum' },
      { id: 'middle', name: 'Middle (50)', state: 'middle' },
      { id: 'maximum', name: 'Maximum (100)', state: 'maximum' },
      { id: 'disabled', name: 'Disabled (50)', state: 'disabled' },
    ],
    render(mount, variant) {
      const value = variant.id === 'minimum' ? 0 : variant.id === 'maximum' ? 100 : 50;
      const slider = new SliderComponent(mount).setLimits(0, 100, 1).setValue(value);
      if (variant.id === 'disabled') slider.setDisabled(true);
      const wrapper = slider.sliderEl.parentElement;
      return {
        root: wrapper && mount.contains(wrapper) ? wrapper : slider.sliderEl,
        getState: () => slider.sliderEl.disabled ? 'disabled'
          : slider.getValue() === 0 ? 'minimum'
            : slider.getValue() === 50 ? 'middle'
              : slider.getValue() === 100 ? 'maximum' : 'unknown',
      };
    },
  },
  {
    id: 'obsidian.progress-bar',
    name: 'ProgressBarComponent',
    category: 'Feedback',
    source: 'public-api',
    implementation: 'obsidian.ProgressBarComponent',
    variants: [
      { id: 'empty', name: '0%', state: 'empty' },
      { id: 'half', name: '50%', state: 'half' },
      { id: 'complete', name: '100%', state: 'complete' },
    ],
    render(mount, variant) {
      const value = variant.id === 'empty' ? 0 : variant.id === 'half' ? 50 : 100;
      const progress = new ProgressBarComponent(mount).setValue(value);
      const root = mount.firstElementChild;
      if (!root) throw new Error('ProgressBarComponent did not render a root element');
      return {
        root,
        getState: () => progress.getValue() === 0 ? 'empty'
          : progress.getValue() === 50 ? 'half'
            : progress.getValue() === 100 ? 'complete' : 'unknown',
      };
    },
  },
  {
    id: 'obsidian.setting',
    name: 'Setting',
    category: 'Settings',
    source: 'public-api',
    implementation: 'obsidian.Setting',
    supportsLayoutContentProbe: true,
    variants: [
      { id: 'standard', name: 'Standard row', state: 'standard' },
      { id: 'heading', name: 'Heading row', state: 'heading' },
      { id: 'disabled', name: 'Disabled row', state: 'disabled' },
      { id: 'error', name: 'Validation error', state: 'error' },
    ],
    render(mount, variant) {
      const setting = new Setting(mount).setName('Atlas setting');
      if (variant.id === 'heading') {
        setting.setHeading();
      } else {
        setting.setDesc('Example setting description');
        setting.addText((text) => text.setValue('Example value'));
        if (variant.id === 'disabled') setting.setDisabled(true);
        if (variant.id === 'error') setting.setErrorMessage('Example validation error');
      }
      return {
        root: setting.settingEl,
        setContentForLayoutProbe: (text) => { setting.setName(text); },
        getState: () => setting.errorEl?.textContent ? 'error'
          : variant.id === 'heading' ? 'heading'
            : variant.id === 'disabled' ? 'disabled' : 'standard',
      };
    },
  },
  {
    id: 'obsidian.setting-group',
    name: 'SettingGroup',
    category: 'Settings',
    source: 'public-api',
    implementation: 'obsidian.SettingGroup',
    variants: [
      { id: 'standard', name: 'Grouped settings', state: 'standard' },
      { id: 'with-search', name: 'Group with search', state: 'with-search' },
    ],
    render(mount, variant) {
      const group = new SettingGroup(mount).setHeading('Atlas group');
      if (variant.id === 'with-search') {
        group.addSearch((search) => search.setPlaceholder('Search group'));
      }
      group.addSetting((setting) => setting.setName('First option').addToggle((toggle) => toggle.setValue(true)));
      group.addSetting((setting) => setting.setName('Second option').setDesc('Example grouped setting'));
      const root = mount.firstElementChild;
      if (!root || (root !== group.listEl && !root.contains(group.listEl))) {
        throw new Error('SettingGroup did not render a root element');
      }
      return { root, getState: () => variant.id === 'with-search' ? 'with-search' : 'standard' };
    },
  },
  {
    id: 'obsidian.display-value',
    name: 'DisplayValueComponent',
    category: 'Settings',
    source: 'public-api',
    implementation: 'obsidian.DisplayValueComponent',
    variants: [
      { id: 'value', name: 'Value', state: 'value' },
      { id: 'warning', name: 'Warning', state: 'warning' },
      { id: 'empty', name: 'Empty value', state: 'empty' },
    ],
    render(mount, variant) {
      const setting = new Setting(mount).setName('Atlas display value');
      let valueEl: HTMLElement | null = null;
      setting.addDisplayValue((display) => {
        display.setValue(variant.id === 'empty' ? null : 'Example value');
        if (variant.id === 'warning') display.setStatus('warning');
        valueEl = display.valueEl;
      });
      if (!valueEl || !setting.settingEl.contains(valueEl)) {
        throw new Error('Setting.addDisplayValue did not render a display value');
      }
      return {
        root: setting.settingEl,
        getState: () => variant.id === 'warning' ? 'warning'
          : valueEl?.textContent ? 'value' : 'empty',
      };
    },
  },
  {
    id: 'obsidian.secret',
    name: 'SecretComponent',
    category: 'Settings',
    source: 'public-api',
    implementation: 'obsidian.SecretComponent',
    triggeredSurfaces: [
      { id: 'obsidian.secret-setup-dialog', trigger: 'Link… button' },
    ],
    variants: [
      { id: 'unselected', name: 'No secret selected', state: 'unselected' },
    ],
    render(mount, _variant, app) {
      const setting = new Setting(mount).setName('Atlas secret');
      setting.addComponent((container) => new SecretComponent(app, container).setValue(''));
      return { root: setting.settingEl, getState: () => 'unselected' };
    },
  },
  {
    id: 'obsidian.toggle',
    name: 'ToggleComponent',
    category: 'Inputs',
    source: 'public-api',
    implementation: 'obsidian.ToggleComponent',
    variants: [
      { id: 'off', name: 'Off', state: 'off' },
      { id: 'on', name: 'On', state: 'on' },
    ],
    render(mount, variant) {
      const toggle = new ToggleComponent(mount).setValue(variant.id === 'on');
      return {
        root: toggle.toggleEl,
        getState: () => toggle.getValue() ? 'on' : 'off',
      };
    },
  },
  {
    id: 'obsidian.set-tooltip',
    name: 'setTooltip',
    category: 'Contextual',
    source: 'public-api',
    implementation: 'obsidian.setTooltip',
    triggeredSurfaces: [{ id: 'obsidian.tooltip', trigger: 'Real pointer hover over registered target' }],
    variants: [{ id: 'registered', name: 'Registered tooltip', state: 'registered' }],
    render(mount) {
      const target = new ButtonComponent(mount).setButtonText('Hover for tooltip').buttonEl;
      setTooltip(target, 'Atlas registered tooltip', { placement: 'top' });
      return {
        root: target,
        getState: () => target.getAttribute('aria-label') === 'Atlas registered tooltip' ? 'registered' : 'unregistered',
      };
    },
  },
  {
    id: 'obsidian.display-tooltip',
    name: 'displayTooltip',
    category: 'Contextual',
    source: 'public-api',
    implementation: 'obsidian.displayTooltip',
    variants: [{ id: 'visible', name: 'Visible tooltip', state: 'visible' }],
    render(mount) {
      const target = new ButtonComponent(mount).setButtonText('Tooltip target').buttonEl;
      let tooltip: HTMLElement | null = null;
      const message = 'Atlas displayTooltip specimen';
      return {
        root: target,
        activate: () => {
          const doc = target.ownerDocument;
          displayTooltip(target, message, { placement: 'top', delay: 0 });
          const matches = Array.from(doc.querySelectorAll<HTMLElement>('.tooltip'))
            .filter((element) => element.textContent?.trim() === message);
          if (matches.length !== 1) throw new Error(`Expected one Atlas tooltip, found ${matches.length}`);
          tooltip = matches[0]!;
        },
        getCaptureRoot: () => {
          if (!tooltip) throw new Error('displayTooltip has not been opened');
          return tooltip;
        },
        getState: () => tooltip?.isConnected ? 'visible' : 'hidden',
        deactivate: () => {
          // The public API has no dismiss method; remove only the Atlas-labelled tooltip.
          if (tooltip?.textContent?.trim() === message) tooltip.remove();
          tooltip = null;
        },
      };
    },
  },
  {
    id: 'obsidian.set-icon',
    name: 'setIcon',
    category: 'Contextual',
    source: 'public-api',
    implementation: 'obsidian.setIcon',
    variants: [{ id: 'settings', name: 'Settings icon', state: 'rendered' }],
    render(mount) {
      const root = mount.createDiv();
      setIcon(root, 'settings');
      return {
        root,
        getState: () => root.querySelector('svg') ? 'rendered' : 'missing',
      };
    },
  },
];
