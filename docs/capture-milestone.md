# Capture milestone: public API Atlas

Run `npm run dev`, open the development vault in Obsidian, and use **Open Obsidian UI Atlas**. The command opens or reveals the same scrollable workspace tab. This `ItemView` instantiates Obsidian's public `ButtonComponent`, `SearchComponent`, and `ToggleComponent` classes from the shared [component registry](component-registry.md). Press **Export snapshot** to save a timestamped folder under `dev-vault/ui-catalog-exports/`.

## Files

- `manifest.json`: schema version, Obsidian `apiVersion`, UTC capture time, platform, mode from the body's `theme-light` or `theme-dark` class, and theme name (currently `null`).
- `tokens.json`: CSS custom properties found in accessible document stylesheets and resolved with `getComputedStyle()` on `html` and `body`. Body values take precedence. Tokens are stored once, not repeated in components.
- `components.json`: seven snapshots of three component types. Each record has a stable type `id`, unique `variant` within that type, category, public API implementation name, current and known states, and a DOM tree. Each element records tag, classes, selected attributes and live form properties, direct text, rendered width/height, and selected computed styles.

Export recreates all declared variants just before capture, so manual interaction with a specimen does not change the meaning of its label. Every export uses a new folder. Its files are local test output and are ignored by Git.

## Observed example

An export from the development vault on 2026-09-30, with Obsidian API version 1.14.3 in dark mode on macOS, produced seven specimens and 945 resolved custom properties. These values describe that one environment, not a universal Obsidian default.

```text
// manifest.json (excerpt)
{"schemaVersion":"0.2.0","obsidianVersion":"1.14.3","capturedAt":"2026-09-30T18:58:42.296Z","platform":"macos","theme":null,"mode":"dark"}

// tokens.json (excerpt)
{"values":{"--background-primary":"#1C1C1C","--text-normal":"#dadada"}}

// components.json (excerpt; other fields omitted)
[
  {"id":"obsidian.button","variant":"normal","category":"Actions","states":{"current":"enabled"},"dom":{"tag":"button"}},
  {"id":"obsidian.button","variant":"disabled","category":"Actions","states":{"current":"disabled"},"dom":{"tag":"button"}},
  {"id":"obsidian.button","variant":"cta","category":"Actions","states":{"current":"enabled"},"dom":{"tag":"button","classes":["mod-cta"]}},
  {"id":"obsidian.search","variant":"empty","category":"Inputs","states":{"current":"empty"},"dom":{"tag":"div"}},
  {"id":"obsidian.search","variant":"filled","category":"Inputs","states":{"current":"filled"},"dom":{"tag":"div"}},
  {"id":"obsidian.toggle","variant":"off","category":"Inputs","states":{"current":"off"},"dom":{"tag":"label"}},
  {"id":"obsidian.toggle","variant":"on","category":"Inputs","states":{"current":"on"},"dom":{"tag":"label","classes":["checkbox-container","is-enabled"]}}
]
```

## Current limits

- This is one running Obsidian instance, theme mode, platform, and UI state. It does not prove how other versions, themes, or platforms render.
- `apiVersion` follows the app release cycle but is the public API version, not a separate installer build number.
- No public API used here reliably reports the active community theme name, so `theme` is `null`.
- Token collection only includes custom properties whose names occur in CSSOM-accessible stylesheets or inline styles and whose values resolve on `html` or `body`. It does not capture variables scoped only to a component subtree, and browser security may hide external stylesheet rules.
- The snapshot records selected computed styles, rendered dimensions and selected live form properties, not every CSS declaration, interaction, pseudo-element, or semantic meaning. `states.known` lists known state names; each declared variant is separately rendered and measured.
- In the observed Obsidian build, `ToggleComponent.setValue(true)` changes the component's public state and `is-enabled` class while its child input's native `checked` property remains `false`. The exported `states.current` comes from `ToggleComponent.getValue()`; `dom.properties.checked` reports the literal DOM property.
- Exports are three sequential writes. A storage failure can leave an incomplete folder; rerun the export to create a new one.
