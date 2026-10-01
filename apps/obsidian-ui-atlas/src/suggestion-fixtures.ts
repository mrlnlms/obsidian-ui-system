import {
  AbstractInputSuggest,
  type App,
  FuzzySuggestModal,
  PopoverSuggest,
  SuggestModal,
} from 'obsidian';

const OPTIONS = ['Atlas alpha', 'Atlas beta', 'Atlas gamma'];

export class AtlasPopoverSuggest extends PopoverSuggest<string> {
  renderSuggestion(value: string, el: HTMLElement): void {
    el.setText(value);
  }

  selectSuggestion(): void {
    this.close();
  }
}

export class AtlasInputSuggest extends AbstractInputSuggest<string> {
  constructor(app: App, input: HTMLInputElement) {
    super(app, input);
  }

  protected getSuggestions(query: string): string[] {
    return OPTIONS.filter((value) => value.toLowerCase().includes(query.toLowerCase()));
  }

  renderSuggestion(value: string, el: HTMLElement): void {
    el.setText(value);
  }

  selectSuggestion(): void {
    this.close();
  }
}

export class AtlasSuggestModal extends SuggestModal<string> {
  constructor(app: App) {
    super(app);
    this.setPlaceholder('Search Atlas examples');
  }

  getSuggestions(query: string): string[] {
    return OPTIONS.filter((value) => value.toLowerCase().includes(query.toLowerCase()));
  }

  renderSuggestion(value: string, el: HTMLElement): void {
    el.setText(value);
  }

  onChooseSuggestion(): void {
    // The catalog only demonstrates selection; it does not change vault data.
  }
}

export class AtlasFuzzySuggestModal extends FuzzySuggestModal<string> {
  constructor(app: App) {
    super(app);
    this.setPlaceholder('Search Atlas examples');
  }

  getItems(): string[] {
    return OPTIONS;
  }

  getItemText(item: string): string {
    return item;
  }

  onChooseItem(): void {
    // The catalog only demonstrates selection; it does not change vault data.
  }
}
