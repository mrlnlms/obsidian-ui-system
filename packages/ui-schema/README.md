# UI snapshot schema v0.1.0

`src/index.ts` defines the first generic TypeScript contract shared by capture and future consumers. It has no runtime code and no dependency on Qualia or another plugin.

`manifest.json` contains environment metadata, `tokens.json` contains CSS custom properties from `html` and `body`, and `components.json` is an array of component snapshots. IDs identify component types, while `states.current` records the state visible at export time. The DOM tree stores selected computed styles and rendered dimensions at every element.

This is an observational snapshot contract, not a complete semantic model of Obsidian UI. It may change after more components and themes are sampled.
