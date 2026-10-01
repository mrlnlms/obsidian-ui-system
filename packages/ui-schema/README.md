# UI snapshot schema v0.4.0

`src/index.ts` defines the generic TypeScript contract for canonical Atlas snapshots. It has no runtime code and no dependency on Qualia or another plugin. The Figma Package includes these snapshots; the importer validates its ZIP input independently.

`manifest.json` contains environment metadata, `tokens.json` contains CSS custom properties from `html` and `body`, and `components.json` is an array of component snapshots. The stable `id` identifies a component type; `variant` identifies one specimen of that type. The pair `(id, variant)` is unique within an export. `category` groups specimens in the Atlas, while `states.current` records the state that was rendered. Multiple variants may share the same state, such as normal and CTA buttons, both enabled. The DOM tree stores selected computed styles and rendered dimensions at every element.

Version 0.3.0 adds required `obsidianSdkVersion` to the manifest. `obsidianVersion` remains the running app's public `apiVersion`, while `obsidianSdkVersion` is read from the installed `obsidian` package at build time. These versions may differ. The manifest's `schemaVersion` identifies this JSON contract; the three output filenames and `(id, variant)` identity remain unchanged. DOM `properties` now records live value and disabled state for textareas and selects as well as inputs; it records button disabled state.

Version 0.4.0 adds computed `fontStyle` and `letterSpacing`. Text-bearing elements also record a bounded set of computed typography CSS variables and the direct inline `font-family` declaration when one exists. Otherwise the declaration source is `unresolved`. The computed family is a CSS stack; it does not identify the font that rendered each glyph in Electron.

Obsidian's `'??'` font is a no-override sentinel with `unicode-range: U+0`. The typography context filters exact sentinel entries from usable font-family variables and omits variables that contain only sentinels. `styles.fontFamily` and the separate `tokens.json` retain their literal computed values for provenance. Consumers must not interpret `??` as a font dependency.

This is an observational snapshot contract, not a complete semantic model of Obsidian UI. It may change after more components and themes are sampled.
