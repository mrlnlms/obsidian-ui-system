import { Plugin } from 'obsidian';
import { AtlasView, ATLAS_VIEW_TYPE } from './catalog';

export default class ObsidianUIAtlasPlugin extends Plugin {
  private openingAtlas: Promise<void> | null = null;

  onload(): void {
    this.registerView(ATLAS_VIEW_TYPE, (leaf) => new AtlasView(leaf));
    this.addCommand({
      id: 'open-ui-catalog',
      name: 'Open Obsidian UI Atlas',
      callback: () => this.openAtlas(),
    });
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(ATLAS_VIEW_TYPE);
  }

  private openAtlas(): Promise<void> {
    if (!this.openingAtlas) {
      this.openingAtlas = this.revealAtlas().finally(() => {
        this.openingAtlas = null;
      });
    }
    return this.openingAtlas;
  }

  private async revealAtlas(): Promise<void> {
    const workspace = this.app.workspace;
    let leaf = workspace.getLeavesOfType(ATLAS_VIEW_TYPE)[0];
    if (!leaf) {
      leaf = workspace.getLeaf('tab');
      await leaf.setViewState({ type: ATLAS_VIEW_TYPE, active: true });
    }
    await workspace.revealLeaf(leaf);
  }
}
