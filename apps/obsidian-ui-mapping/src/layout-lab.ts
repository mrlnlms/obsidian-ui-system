import { ButtonComponent, ItemView, WorkspaceLeaf } from 'obsidian';
import { exportLayoutProbes, measureLayoutFixtures, renderLayoutFixtures, type LayoutFixture, type LayoutObservation } from './layout-capture';
import { inferLayout, type LayoutInference } from './layout-inference';

export const LAYOUT_LAB_VIEW_TYPE = 'obsidian-ui-layout-lab-view';

/** Experimental workspace surface; the canonical Mapping never creates these fixtures. */
export class LayoutLabView extends ItemView {
  private fixtures: LayoutFixture[] = [];
  private fixturesEl: HTMLDivElement | null = null;
  private resultsEl: HTMLDivElement | null = null;
  private measuring = false;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return LAYOUT_LAB_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Obsidian UI Layout Lab';
  }

  getIcon(): string {
    return 'ruler';
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass('obsidian-ui-layout-lab-content');
    this.contentEl.createEl('h2', { text: 'Obsidian UI Layout Lab' });
    this.contentEl.createEl('p', { text: 'Experimental registry specimens in controlled hosts. Hosts and content samples are measurement contexts, not canonical variants.' });
    const actions = this.contentEl.createDiv({ cls: 'obsidian-ui-layout-lab-actions' });
    const status = this.contentEl.createEl('p');
    this.resultsEl = this.contentEl.createDiv({ cls: 'obsidian-ui-layout-lab-results' });
    this.contentEl.createEl('h3', { text: 'Probe fixtures' });
    this.fixturesEl = this.contentEl.createDiv({ cls: 'obsidian-ui-layout-lab-fixtures' });
    this.fixtures = renderLayoutFixtures(this.fixturesEl, this.app);

    new ButtonComponent(actions)
      .setButtonText('Measure layout probes')
      .onClick(() => { void this.runProbes(false, status); });
    new ButtonComponent(actions)
      .setButtonText('Export layout probes')
      .setCta()
      .onClick(() => { void this.runProbes(true, status); });
  }

  async onClose(): Promise<void> {
    this.fixtures = [];
    this.fixturesEl = null;
    this.resultsEl = null;
    this.contentEl.empty();
    this.contentEl.removeClass('obsidian-ui-layout-lab-content');
  }

  private async runProbes(save: boolean, status: HTMLElement): Promise<void> {
    if (this.measuring) return;
    this.measuring = true;
    status.setText(save ? 'Exporting layout measurements…' : 'Measuring layout…');
    try {
      if (!this.fixturesEl) throw new Error('Layout fixture container is unavailable');
      this.fixtures = renderLayoutFixtures(this.fixturesEl, this.app);
      if (save) {
        const { folder, observations, inferences } = await exportLayoutProbes(this.app, this.fixtures);
        this.renderResults(observations, inferences);
        status.setText(`Saved layout.json to ${folder}`);
      } else {
        const observations = await measureLayoutFixtures(this.fixtures);
        this.renderResults(observations, inferLayout(observations));
        status.setText('Layout probes measured in the current Obsidian view.');
      }
      this.resultsEl?.scrollIntoView({ block: 'start' });
    } catch (error) {
      status.setText(`Layout probes failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.measuring = false;
    }
  }

  private renderResults(observations: LayoutObservation[], inferences: LayoutInference[]): void {
    const host = this.resultsEl;
    if (!host) throw new Error('Layout result container is unavailable');
    host.empty();
    host.createEl('p', { text: `${observations.length} measurements; ${inferences.length} specimens. Labels are experimental inferences with evidence and confidence.` });
    const inferenceTable = host.createEl('table');
    const inferenceHeader = inferenceTable.createEl('thead').createEl('tr');
    for (const label of ['Specimen', 'Width', 'Height', 'Evidence / limits']) inferenceHeader.createEl('th', { text: label });
    const inferenceBody = inferenceTable.createEl('tbody');
    for (const inference of inferences) {
      const row = inferenceBody.createEl('tr');
      row.createEl('td', { text: `${inference.id}/${inference.variant}` });
      row.createEl('td', { text: `${inference.horizontal.mode} (${inference.horizontal.confidence})` });
      row.createEl('td', { text: `${inference.vertical.mode} (${inference.vertical.confidence})` });
      row.createEl('td', { text: [...inference.horizontal.evidence, ...inference.contextDependencies, ...inference.unknowns].join(' ') });
    }

    const measurements = host.createEl('details');
    measurements.createEl('summary', { text: 'Measured root boxes by host and content' });
    const measurementTable = measurements.createEl('table');
    const header = measurementTable.createEl('thead').createEl('tr');
    for (const label of ['Specimen', 'Content', 'Host', 'Root (px)', 'Host scroll/client (px)']) header.createEl('th', { text: label });
    const body = measurementTable.createEl('tbody');
    for (const observation of observations) {
      const row = body.createEl('tr');
      row.createEl('td', { text: `${observation.id}/${observation.variant}` });
      row.createEl('td', { text: observation.contentContext.id });
      row.createEl('td', { text: `${observation.host.id} (${observation.host.requestedWidthPx}px)` });
      row.createEl('td', { text: observation.root.rect
        ? `${observation.root.rect.width.toFixed(2)} × ${observation.root.rect.height.toFixed(2)}` : 'hidden' });
      row.createEl('td', { text: `${observation.host.boxMetrics.scrollWidth}/${observation.host.boxMetrics.clientWidth}` });
    }
  }
}
