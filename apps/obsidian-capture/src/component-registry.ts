import { ButtonComponent, SearchComponent, ToggleComponent } from 'obsidian';
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
