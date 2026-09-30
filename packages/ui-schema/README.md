# UI snapshot schema v0.3.0

`src/index.ts` defines the first generic TypeScript contract shared by capture and future consumers. It has no runtime code and no dependency on Qualia or another plugin.

`manifest.json` contains environment metadata, `tokens.json` contains CSS custom properties from `html` and `body`, and `components.json` is an array of component snapshots. The stable `id` identifies a component type; `variant` identifies one specimen of that type. The pair `(id, variant)` is unique within an export. `category` groups specimens in the Atlas, while `states.current` records the state that was rendered. Multiple variants may share the same state, such as normal and CTA buttons, both enabled. The DOM tree stores selected computed styles and rendered dimensions at every element.

Version 0.3.0 adds required `obsidianSdkVersion` to the manifest. `obsidianVersion` remains the running app's public `apiVersion`, while `obsidianSdkVersion` is read from the installed `obsidian` package at build time. These versions may differ. The manifest's `schemaVersion` identifies this JSON contract; the three output filenames and `(id, variant)` identity remain unchanged. DOM `properties` now records live value and disabled state for textareas and selects as well as inputs; it records button disabled state.

This is an observational snapshot contract, not a complete semantic model of Obsidian UI. It may change after more components and themes are sampled.
