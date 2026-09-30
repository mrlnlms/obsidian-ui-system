import { ButtonComponent, ItemView, WorkspaceLeaf } from 'obsidian';
import { componentRegistry, type RenderedSpecimen } from './component-registry';
import { exportCatalog } from './export';
import { exportLayoutSpike, measureLayoutFixtures, renderLayoutFixtures, type LayoutFixture, type LayoutObservation } from './layout-spike';
import { inferLayout, type LayoutInference } from './layout-inference';
import { layoutProbeSuite } from './layout-probes';

export const ATLAS_VIEW_TYPE = 'obsidian-ui-atlas-view';

export class AtlasView extends ItemView {
  private specimens: RenderedSpecimen[] = [];
  private exporting = false;
  private specimensEl: HTMLDivElement | null = null;
  private layoutDetailsEl: HTMLDetailsElement | null = null;
  private layoutResultsEl: HTMLDivElement | null = null;
  private layoutFixturesEl: HTMLDivElement | null = null;
  private layoutFixtures: LayoutFixture[] = [];

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
    const layoutStatus = this.contentEl.createEl('p');
    const layoutSection = this.contentEl.createEl('details', { cls: 'obsidian-ui-atlas-layout-spike' });
    layoutSection.createEl('summary', { text: 'Experimental layout probes' });
    layoutSection.createEl('p', { text: 'Registry specimens in 160px, 240px and 480px hosts. Components with a public content setter also use short and long text. These are measurement contexts, not variants.' });
    this.layoutDetailsEl = layoutSection;
    this.layoutResultsEl = layoutSection.createDiv({ cls: 'obsidian-ui-atlas-layout-results' });
    this.layoutFixturesEl = layoutSection.createDiv({ cls: 'obsidian-ui-atlas-layout-fixtures' });
    this.layoutFixtures = renderLayoutFixtures(this.layoutFixturesEl, this.app);
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
    const showLayout = async (save: boolean): Promise<void> => {
      if (this.exporting) return;
      this.exporting = true;
      layoutStatus.setText(save ? 'Exporting layout measurements…' : 'Measuring layout…');
      try {
        if (!this.layoutDetailsEl || !this.layoutFixturesEl) throw new Error('Layout fixture container is unavailable');
        this.layoutDetailsEl.open = true;
        this.layoutFixtures = renderLayoutFixtures(this.layoutFixturesEl, this.app);
        if (save) {
          const { folder, observations, inferences } = await exportLayoutSpike(this.app, this.layoutFixtures);
          this.renderLayoutResults(observations, inferences);
          layoutStatus.setText(`Saved layout.json to ${folder}`);
        } else {
          const observations = await measureLayoutFixtures(this.layoutFixtures);
          this.renderLayoutResults(observations, inferLayout(observations));
          layoutStatus.setText('Layout comparison measured in the current Obsidian view.');
        }
        this.layoutDetailsEl.scrollIntoView({ block: 'start' });
      } catch (error) {
        layoutStatus.setText(`Layout comparison failed: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        this.exporting = false;
      }
    };
    new ButtonComponent(actions)
      .setButtonText('View layout comparison')
      .onClick(() => { void showLayout(false); });
    new ButtonComponent(actions)
      .setButtonText('Export layout probes')
      .onClick(() => { void showLayout(true); });
  }

  async onClose(): Promise<void> {
    this.closeSurfaces();
    this.specimens = [];
    this.specimensEl = null;
    this.layoutDetailsEl = null;
    this.layoutResultsEl = null;
    this.layoutFixtures = [];
    this.layoutFixturesEl = null;
    this.contentEl.empty();
    this.contentEl.removeClass('obsidian-ui-atlas-content');
  }

  private renderSpecimens(): void {
    const host = this.specimensEl;
    if (!host) throw new Error('Atlas specimen container is unavailable');
    this.closeSurfaces();
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
      if (definition.category === 'Settings') component.addClass('obsidian-ui-atlas-composite');
      component.createEl('h4', { text: definition.name });
      for (const variant of definition.variants) {
        const specimen = component.createDiv({ cls: 'obsidian-ui-atlas-specimen' });
        specimen.createEl('div', { cls: 'obsidian-ui-atlas-variant-name', text: variant.name });
        const rendered = definition.render(specimen.createDiv(), variant, this.app);
        if (rendered.activate) {
          new ButtonComponent(specimen)
            .setButtonText('Open specimen')
            .onClick(() => {
              this.closeSurfaces();
              rendered.activate?.();
            });
        }
        this.specimens.push({ definition, variant, ...rendered });
      }
    }
  }

  private renderLayoutResults(observations: LayoutObservation[], inferences: LayoutInference[]): void {
    const host = this.layoutResultsEl;
    if (!host) throw new Error('Layout comparison container is unavailable');
    host.empty();
    host.createEl('p', { text: `${observations.length} measurements; ${inferences.length} specimens. Sizing labels are experimental inferences with recorded evidence.` });
    const table = host.createEl('table');
    const header = table.createEl('thead').createEl('tr');
    for (const label of ['Specimen', ...layoutProbeSuite.hostWidths.map((item) => `${item.widthPx}px baseline`), 'Width', 'Height', 'Evidence / limits']) {
      header.createEl('th', { text: label });
    }
    const body = table.createEl('tbody');
    const size = (width: number | undefined, height: number | undefined): string =>
      width === undefined || height === undefined ? 'hidden' : `${width.toFixed(2)} × ${height.toFixed(2)}`;
    for (const inference of inferences) {
      const pair = observations.filter((item) => item.id === inference.id && item.variant === inference.variant && item.contentContext.id === 'baseline');
      const row = body.createEl('tr');
      row.createEl('td', { text: `${inference.id}/${inference.variant}` });
      for (const width of layoutProbeSuite.hostWidths) {
        const observation = pair.find((item) => item.host.id === width.id);
        row.createEl('td', { text: size(observation?.root.rect?.width, observation?.root.rect?.height) });
      }
      row.createEl('td', { text: `${inference.horizontal.mode} (${inference.horizontal.confidence})` });
      row.createEl('td', { text: `${inference.vertical.mode} (${inference.vertical.confidence})` });
      row.createEl('td', { text: [...inference.horizontal.evidence, ...inference.contextDependencies, ...inference.unknowns].join(' ') });
    }
  }

  private closeSurfaces(): void {
    for (const specimen of this.specimens) specimen.deactivate?.();
  }
}
