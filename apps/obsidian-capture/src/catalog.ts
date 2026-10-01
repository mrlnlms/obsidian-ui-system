import { type App, ButtonComponent, ItemView, WorkspaceLeaf } from 'obsidian';
import { componentRegistry, type RenderedSpecimen } from './component-registry';
import { exportCatalog } from './export';

export const ATLAS_VIEW_TYPE = 'obsidian-ui-atlas-view';

/** Shared registry renderer for the Atlas view and one-shot package capture. */
export function renderCatalogSpecimens(host: HTMLElement, app: App, onActivate?: () => void): RenderedSpecimen[] {
  host.empty();
  const specimens: RenderedSpecimen[] = [];
  const categories = new Map<string, HTMLDivElement>();
  for (const definition of componentRegistry) {
    let category = categories.get(definition.category);
    if (!category) {
      category = host.createDiv({ cls: 'obsidian-ui-atlas-category' });
      category.createEl('h3', { text: definition.category });
      categories.set(definition.category, category);
    }
    const component = category.createDiv({ cls: 'obsidian-ui-atlas-component' });
    if (definition.category === 'Settings') component.addClass('obsidian-ui-atlas-composite');
    component.createEl('h4', { text: definition.name });
    for (const variant of definition.variants) {
      const specimen = component.createDiv({ cls: 'obsidian-ui-atlas-specimen' });
      specimen.createEl('div', { cls: 'obsidian-ui-atlas-variant-name', text: variant.name });
      const rendered = definition.render(specimen.createDiv(), variant, app);
      if (rendered.activate && onActivate) {
        new ButtonComponent(specimen)
          .setButtonText('Open specimen')
          .onClick(() => {
            onActivate();
            rendered.activate?.();
          });
      }
      specimens.push({ definition, variant, ...rendered });
    }
  }
  return specimens;
}

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
    const actions = this.contentEl.createDiv({ cls: 'obsidian-ui-atlas-actions' });
    const status = this.contentEl.createEl('p');
    this.specimensEl = this.contentEl.createDiv();
    this.renderSpecimens();

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
    this.closeSurfaces();
    this.specimens = [];
    this.specimensEl = null;
    this.contentEl.empty();
    this.contentEl.removeClass('obsidian-ui-atlas-content');
  }

  private renderSpecimens(): void {
    const host = this.specimensEl;
    if (!host) throw new Error('Atlas specimen container is unavailable');
    this.closeSurfaces();
    host.empty();
    this.specimens = [];

    this.specimens = renderCatalogSpecimens(host, this.app, () => this.closeSurfaces());
  }

  private closeSurfaces(): void {
    for (const specimen of this.specimens) specimen.deactivate?.();
  }
}
