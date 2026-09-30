# UI snapshot schema v0.2.0

`src/index.ts` defines the first generic TypeScript contract shared by capture and future consumers. It has no runtime code and no dependency on Qualia or another plugin.

`manifest.json` contains environment metadata, `tokens.json` contains CSS custom properties from `html` and `body`, and `components.json` is an array of component snapshots. The stable `id` identifies a component type; `variant` identifies one specimen of that type. The pair `(id, variant)` is unique within an export. `category` groups specimens in the Atlas, while `states.current` records the state that was rendered. Multiple variants may share the same state, such as normal and CTA buttons, both enabled. The DOM tree stores selected computed styles and rendered dimensions at every element.

Version 0.2.0 adds required `category` and `variant` fields to each component snapshot and optional live `properties` on DOM elements, currently for input value/checked/disabled and button disabled. Existing field names and the three output filenames remain unchanged. Consumers of v0.1.0 must account for multiple records with the same `id`.

This is an observational snapshot contract, not a complete semantic model of Obsidian UI. It may change after more components and themes are sampled.
