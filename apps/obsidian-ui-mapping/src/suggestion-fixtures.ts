import {
  AbstractInputSuggest,
  type App,
  FuzzySuggestModal,
  PopoverSuggest,
  SuggestModal,
} from 'obsidian';

const OPTIONS = ['Mapping alpha', 'Mapping beta', 'Mapping gamma'];

export class MappingPopoverSuggest extends PopoverSuggest<string> {
  renderSuggestion(value: string, el: HTMLElement): void {
    el.setText(value);
  }

  selectSuggestion(): void {
    this.close();
  }
}

export class MappingInputSuggest extends AbstractInputSuggest<string> {
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

export class MappingSuggestModal extends SuggestModal<string> {
  constructor(app: App) {
    super(app);
    this.setPlaceholder('Search Mapping examples');
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

export class MappingFuzzySuggestModal extends FuzzySuggestModal<string> {
  constructor(app: App) {
    super(app);
    this.setPlaceholder('Search Mapping examples');
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
