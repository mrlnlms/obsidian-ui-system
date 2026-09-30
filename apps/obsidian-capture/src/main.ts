import { Plugin } from 'obsidian';
import { CatalogModal } from './catalog';

export default class UICapturePlugin extends Plugin {
  onload(): void {
    this.addCommand({
      id: 'open-ui-catalog',
      name: 'Open Obsidian UI Catalog',
      callback: () => new CatalogModal(this.app).open(),
    });
  }
}
