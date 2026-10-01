# UI snapshot schema v0.4.0

`src/index.ts` defines the generic TypeScript contract for canonical Mapping snapshots. It has no runtime code and no dependency on Qualia or another plugin. The Figma Package includes these snapshots; the importer validates its ZIP input independently.

`manifest.json` contains environment metadata, `tokens.json` contains CSS custom properties from `html` and `body`, and `components.json` is an array of component snapshots. The stable `id` identifies a component type; `variant` identifies one specimen of that type. The pair `(id, variant)` is unique within an export. `category` groups specimens in the Mapping, while `states.current` records the state that was rendered. Multiple variants may share the same state, such as normal and CTA buttons, both enabled. The DOM tree stores selected computed styles and rendered dimensions at every element.

Version 0.3.0 adds required `obsidianSdkVersion` to the manifest. `obsidianVersion` remains the running app's public `apiVersion`, while `obsidianSdkVersion` is read from the installed `obsidian` package at build time. These versions may differ. The manifest's `schemaVersion` identifies this JSON contract; the three output filenames and `(id, variant)` identity remain unchanged. DOM `properties` now records live value and disabled state for textareas and selects as well as inputs; it records button disabled state.

Version 0.4.0 adds computed `fontStyle` and `letterSpacing`. Text-bearing elements also record a bounded set of computed typography CSS variables and the direct inline `font-family` declaration when one exists. Otherwise the declaration source is `unresolved`. The computed family is a CSS stack; it does not identify the font that rendered each glyph in Electron.

Obsidian's `'??'` font is a no-override sentinel with `unicode-range: U+0`. The typography context filters exact sentinel entries from usable font-family variables and omits variables that contain only sentinels. `styles.fontFamily` and the separate `tokens.json` retain their literal computed values for provenance. Consumers must not interpret `??` as a font dependency.

This is an observational snapshot contract, not a complete semantic model of Obsidian UI. It may change after more components and themes are sampled.

## Technical token evidence

Individual Mapping exports also write `token-evidence.json` using the independent format `obsidian-ui-token-evidence`, version 1. It is not a new version of snapshot schema 0.4.0 or a Figma Package v1 member. The CSS custom-property name is the identity; each capture records one mode and its own result. `tokens.values` is derived from the non-empty, body-first computed values in this evidence. Existing 0.4.0 snapshots and ZIPs cannot be upgraded with declarations or aliases that they never recorded.

An observation separates `html` and `body` computed strings, retains all CSSOM-visible declaration candidates with selector, conditions, source, applicability, raw CSSOM value and parsed `var()` references, and marks attribution `unique` only when simple evidence permits it. The statuses are `resolved`, `no-applicable-declaration`, `unresolved`, and `unknown`. CSSOM coverage is explicit because an unreadable stylesheet can hide a declaration or an entire token name. References and their fallback text are syntax evidence; only a uniquely attributable whole-value `var(--name)` without fallback supports a direct alias interpretation. Identical computed strings alone never prove an alias.

The pure Light/Dark merger joins two technical captures by name with optional mode observations and keeps source equality `unverified`. It does not create a multi-mode package or supply absent values. See the [snapshot guide](../../docs/obsidian-ui-mapping/capture/snapshot.md) for capture limits.

`CaptureContext` is another independent technical format, `obsidian-ui-capture-context` version 1. Individual Mapping and Layout Lab folders each write one sidecar with their own 0.4.0 environment, SHA-256 of the installed compiled Mapping plugin, and window viewport. Comparing four sidecars can verify the recorded technical dimensions of a Dark/Light Mapping+Layout set; timestamps remain separate, and the chosen source of one layout inference layer is explicit. This does not change the five-file Figma Package v1.

## Aggregate Package v2

`MultiModePackageManifest`, `MultiModeTokens`, and `MultiModeComponents` describe the aggregate schema `0.5.0` used by the Package v2 builder. This schema joins two individual `0.4.0` Mapping captures and two separate Layout Lab captures. The aggregate manifest has `modes` instead of one `mode`, retains each source `CaptureContext` under its mode and capture kind, records the verified shared technical context, and identifies the Layout Lab capture that supplied the single inference layer. Different source timestamps are expected.

Token names remain the identities. Each name has an optional observation for each mode; observations and CSSOM coverage are copied from the individual token evidence without inventing missing values or inferring aliases. Component snapshots and raw layout observations stay complete and separate by mode. Layout inference stays a single selected layer. Package v1/schema `0.4.0` and its Figma importer remain unchanged; the importer does not yet support v2. See the [package guide](../../docs/integration/figma-package/figma-package.md) for the ZIP contract and CLI workflow.
