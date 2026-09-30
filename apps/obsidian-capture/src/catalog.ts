import { ButtonComponent, ItemView, SearchComponent, ToggleComponent, WorkspaceLeaf } from 'obsidian';
import type { ComponentOrigin } from '@obsidian-ui-system/ui-schema';
import { exportCatalog } from './export';

export interface CatalogEntry {
  id: string;
  name: string;
  origin: ComponentOrigin;
  implementation: string;
  root: Element;
  getState: () => { current: string; known: string[] };
}

export const ATLAS_VIEW_TYPE = 'obsidian-ui-atlas-view';

export class AtlasView extends ItemView {
  private entries: CatalogEntry[] = [];
  private exporting = false;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return ATLAS_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Obsidian UI Atlas';
  }

  getIcon(): string {
    return 'layout-grid';
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass('obsidian-ui-atlas-content');
    this.contentEl.createEl('h2', { text: 'Obsidian UI Atlas' });
    this.contentEl.createEl('p', { text: 'Public API components rendered in the current theme.' });

    const buttonMount = this.addSection('ButtonComponent');
    const button = new ButtonComponent(buttonMount).setButtonText('Example button');

    const searchMount = this.addSection('SearchComponent');
    const search = new SearchComponent(searchMount).setPlaceholder('Search example');
    const searchRoot = search.inputEl.parentElement;

    const toggleMount = this.addSection('ToggleComponent');
    const toggle = new ToggleComponent(toggleMount).setValue(false);

    this.entries = [
      {
        id: 'obsidian.button',
        name: 'ButtonComponent',
        origin: 'public-api',
        implementation: 'obsidian.ButtonComponent',
        root: button.buttonEl,
        getState: () => ({
          current: button.buttonEl.disabled ? 'disabled' : 'enabled',
          known: ['enabled', 'disabled'],
        }),
      },
      {
        id: 'obsidian.search',
        name: 'SearchComponent',
        origin: 'public-api',
        implementation: 'obsidian.SearchComponent',
        root: searchRoot && searchMount.contains(searchRoot) ? searchRoot : search.inputEl,
        getState: () => ({
          current: search.getValue() ? 'filled' : 'empty',
          known: ['empty', 'filled'],
        }),
      },
      {
        id: 'obsidian.toggle',
        name: 'ToggleComponent',
        origin: 'public-api',
        implementation: 'obsidian.ToggleComponent',
        root: toggle.toggleEl,
        getState: () => ({
          current: toggle.getValue() ? 'on' : 'off',
          known: ['off', 'on'],
        }),
      },
    ];

    const actions = this.contentEl.createDiv();
    const status = this.contentEl.createEl('p');
    new ButtonComponent(actions)
      .setButtonText('Export snapshot')
      .setCta()
      .onClick(async () => {
        if (this.exporting) return;
        this.exporting = true;
        status.setText('Exporting…');
        try {
          const folder = await exportCatalog(this.app, this.entries);
          status.setText(`Saved manifest.json, tokens.json and components.json to ${folder}`);
        } catch (error) {
          status.setText(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
          this.exporting = false;
        }
      });
  }

  async onClose(): Promise<void> {
    this.entries = [];
    this.contentEl.empty();
    this.contentEl.removeClass('obsidian-ui-atlas-content');
  }

  private addSection(name: string): HTMLDivElement {
    const section = this.contentEl.createDiv({ cls: 'obsidian-ui-atlas-specimen' });
    section.createEl('h3', { text: name });
    return section.createDiv();
  }
}
