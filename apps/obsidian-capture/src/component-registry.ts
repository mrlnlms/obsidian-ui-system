import {
  ButtonComponent,
  ColorComponent,
  DropdownComponent,
  ExtraButtonComponent,
  MomentFormatComponent,
  ProgressBarComponent,
  SearchComponent,
  SliderComponent,
  TextAreaComponent,
  TextComponent,
  ToggleComponent,
} from 'obsidian';
import type { ComponentOrigin } from '@obsidian-ui-system/ui-schema';

export interface ComponentVariant {
  id: string;
  name: string;
  state: string;
}

interface RenderedComponent {
  root: Element;
  getState: () => string;
}

export interface ComponentDefinition {
  id: string;
  name: string;
  category: string;
  source: ComponentOrigin;
  implementation: string;
  variants: readonly ComponentVariant[];
  render: (mount: HTMLElement, variant: ComponentVariant) => RenderedComponent;
}

export interface RenderedSpecimen extends RenderedComponent {
  definition: ComponentDefinition;
  variant: ComponentVariant;
}

export const componentRegistry: readonly ComponentDefinition[] = [
  {
    id: 'obsidian.button',
    name: 'ButtonComponent',
    category: 'Actions',
    source: 'public-api',
    implementation: 'obsidian.ButtonComponent',
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
];
