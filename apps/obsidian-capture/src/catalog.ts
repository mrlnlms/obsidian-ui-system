import { App, ButtonComponent, Modal, SearchComponent, ToggleComponent } from 'obsidian';
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

export class CatalogModal extends Modal {
  private entries: CatalogEntry[] = [];
  private exporting = false;

  constructor(app: App) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.empty();
    this.contentEl.createEl('h2', { text: 'Obsidian UI Catalog' });
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

  onClose(): void {
    this.entries = [];
    this.contentEl.empty();
  }

  private addSection(name: string): HTMLDivElement {
    const section = this.contentEl.createDiv();
    section.createEl('h3', { text: name });
    return section.createDiv();
  }
}
