import { Modal, Plugin } from 'obsidian';

export default class UICapturePlugin extends Plugin {
  onload(): void {
    this.addCommand({
      id: 'open-ui-catalog',
      name: 'Open Obsidian UI Catalog',
      callback: () => new CatalogStatusModal(this.app).open(),
    });
  }
}

class CatalogStatusModal extends Modal {
  onOpen(): void {
    this.contentEl.setText('Obsidian UI Capture is working. The catalog is not implemented yet.');
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
