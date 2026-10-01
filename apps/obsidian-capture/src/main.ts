import { FileSystemAdapter, Modal, Notice, Plugin } from 'obsidian';
import { AtlasView, ATLAS_VIEW_TYPE } from './catalog';
import { LayoutLabView, LAYOUT_LAB_VIEW_TYPE } from './layout-lab';
import { exportFigmaPackage } from './figma-package';
import { cleanDevelopmentExports, inspectDevelopmentExports } from './development-exports';

export default class ObsidianUIAtlasPlugin extends Plugin {
  private openingViews = new Map<string, Promise<void>>();
  private exportingPackage = false;
  private cleaningExports = false;

  onload(): void {
    this.registerView(ATLAS_VIEW_TYPE, (leaf) => new AtlasView(leaf));
    this.registerView(LAYOUT_LAB_VIEW_TYPE, (leaf) => new LayoutLabView(leaf));
    this.addCommand({
      id: 'open-ui-catalog',
      name: 'Open Obsidian UI Atlas',
      callback: () => this.openView(ATLAS_VIEW_TYPE),
    });
    this.addCommand({
      id: 'open-ui-layout-lab',
      name: 'Open Obsidian UI Layout Lab',
      callback: () => this.openView(LAYOUT_LAB_VIEW_TYPE),
    });
    this.addCommand({
      id: 'export-figma-package',
      name: 'Export Obsidian UI Figma Package',
      callback: () => { void this.runPackageExport(); },
    });
    this.addCommand({
      id: 'clean-development-exports',
      name: 'Clean Obsidian UI Development Exports',
      callback: () => { void this.confirmDevelopmentExportCleanup(); },
    });
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(ATLAS_VIEW_TYPE);
    this.app.workspace.detachLeavesOfType(LAYOUT_LAB_VIEW_TYPE);
  }

  private openView(viewType: string): Promise<void> {
    let opening = this.openingViews.get(viewType);
    if (!opening) {
      opening = this.revealView(viewType).finally(() => {
        this.openingViews.delete(viewType);
      });
      this.openingViews.set(viewType, opening);
    }
    return opening;
  }

  private async revealView(viewType: string): Promise<void> {
    const workspace = this.app.workspace;
    let leaf = workspace.getLeavesOfType(viewType)[0];
    if (!leaf) {
      leaf = workspace.getLeaf('tab');
      await leaf.setViewState({ type: viewType, active: true });
    }
    await workspace.revealLeaf(leaf);
  }

  private async runPackageExport(): Promise<void> {
    if (this.exportingPackage) return;
    this.exportingPackage = true;
    const notice = new Notice('Exporting Obsidian UI Figma Package…', 0);
    try {
      const path = await exportFigmaPackage(this.app);
      const basePath = this.app.vault.adapter instanceof FileSystemAdapter
        ? this.app.vault.adapter.getBasePath() : this.app.vault.getName();
      notice.setMessage(`Figma package saved: ${basePath}/${path}`);
      setTimeout(() => notice.hide(), 10000);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      notice.setMessage(`Figma package export failed: ${message}`);
      setTimeout(() => notice.hide(), 15000);
      console.error('Obsidian UI Figma Package export failed', error);
    } finally {
      this.exportingPackage = false;
    }
  }

  private async confirmDevelopmentExportCleanup(): Promise<void> {
    if (this.cleaningExports) return;
    this.cleaningExports = true;
    try {
      const adapter = this.app.vault.adapter;
      const inventory = await inspectDevelopmentExports(adapter);
      if (inventory.fileCount === 0 && inventory.folderCount === 0) {
        new Notice('No Obsidian UI development exports to clean. Figma Packages were not touched.');
        this.cleaningExports = false;
        return;
      }
      const modal = new Modal(this.app);
      modal.setTitle('Clean Obsidian UI Development Exports');
      modal.contentEl.createEl('p', {
        text: `Remove ${inventory.fileCount} files in ${inventory.folderCount} folders from these technical export directories?`,
      });
      for (const root of inventory.roots) {
        modal.contentEl.createEl('p', { text: `${root.path}: ${root.files.length} files, ${root.folders.length} folders` });
      }
      modal.contentEl.createEl('p', { text: 'Figma Packages will not be removed.' });
      const actions = modal.contentEl.createDiv();
      actions.createEl('button', { text: 'Cancel' }).addEventListener('click', () => modal.close());
      const remove = actions.createEl('button', { text: 'Remove development exports', cls: 'mod-warning' });
      remove.addEventListener('click', () => {
        remove.disabled = true;
        void cleanDevelopmentExports(adapter, inventory).then(() => {
          modal.close();
          new Notice(`Removed ${inventory.fileCount} development export files and ${inventory.folderCount} folders. Figma Packages were not touched.`, 10000);
        }).catch((error: unknown) => {
          modal.close();
          new Notice(`Development export cleanup failed: ${error instanceof Error ? error.message : String(error)}`, 15000);
        });
      });
      modal.onClose = () => { this.cleaningExports = false; };
      modal.open();
    } catch (error) {
      this.cleaningExports = false;
      new Notice(`Cannot inspect development exports: ${error instanceof Error ? error.message : String(error)}`, 15000);
    }
  }
}
