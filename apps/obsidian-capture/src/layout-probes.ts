/** Experimental measurement contexts, independent of component variants and the public schema. */
export interface LayoutContentProbe {
  id: string;
  text: string;
}

export interface LayoutProbeSuite {
  componentIds: readonly string[];
  hostWidths: readonly { id: string; widthPx: number }[];
  /** Applied to any registry specimen exposing setContentForLayoutProbe. */
  contentProbes: readonly LayoutContentProbe[];
}

export const layoutProbeSuite: LayoutProbeSuite = {
  componentIds: [
    'obsidian.button',
    'obsidian.search',
    'obsidian.dropdown',
    'obsidian.slider',
    'obsidian.setting',
  ],
  hostWidths: [
    { id: 'constrained', widthPx: 160 },
    { id: 'narrow', widthPx: 240 },
    { id: 'wide', widthPx: 480 },
  ],
  contentProbes: [
    { id: 'short-content', text: 'OK' },
    { id: 'long-content', text: 'A longer label for layout measurement' },
  ],
};
