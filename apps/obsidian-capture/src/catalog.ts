import { ButtonComponent, ItemView, WorkspaceLeaf } from 'obsidian';
import { componentRegistry, type RenderedSpecimen } from './component-registry';
import { exportCatalog } from './export';

export const ATLAS_VIEW_TYPE = 'obsidian-ui-atlas-view';

export class AtlasView extends ItemView {
  private specimens: RenderedSpecimen[] = [];
  private exporting = false;
  private specimensEl: HTMLDivElement | null = null;

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
    this.specimensEl = this.contentEl.createDiv();
    this.renderSpecimens();

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
          // Recreate deterministic specimens if someone interacted with the examples.
          this.renderSpecimens();
          const folder = await exportCatalog(this.app, this.specimens);
          status.setText(`Saved manifest.json, tokens.json and components.json to ${folder}`);
        } catch (error) {
          status.setText(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
          this.exporting = false;
        }
      });
  }

  async onClose(): Promise<void> {
    this.specimens = [];
    this.specimensEl = null;
    this.contentEl.empty();
    this.contentEl.removeClass('obsidian-ui-atlas-content');
  }

  private renderSpecimens(): void {
    const host = this.specimensEl;
    if (!host) throw new Error('Atlas specimen container is unavailable');
    host.empty();
    this.specimens = [];

    const categories = new Map<string, HTMLDivElement>();
    for (const definition of componentRegistry) {
      let category = categories.get(definition.category);
      if (!category) {
        category = host.createDiv({ cls: 'obsidian-ui-atlas-category' });
        category.createEl('h3', { text: definition.category });
        categories.set(definition.category, category);
      }
      const component = category.createDiv({ cls: 'obsidian-ui-atlas-component' });
      component.createEl('h4', { text: definition.name });
      for (const variant of definition.variants) {
        const specimen = component.createDiv({ cls: 'obsidian-ui-atlas-specimen' });
        specimen.createEl('div', { cls: 'obsidian-ui-atlas-variant-name', text: variant.name });
        const rendered = definition.render(specimen.createDiv(), variant);
        this.specimens.push({ definition, variant, ...rendered });
      }
    }
  }
}
