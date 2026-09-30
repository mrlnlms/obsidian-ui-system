# Capture milestone: public API catalog

Run `npm run dev`, open the development vault in Obsidian, and use **Open Obsidian UI Catalog**. The modal instantiates Obsidian's public `ButtonComponent`, `SearchComponent`, and `ToggleComponent` classes. Press **Export snapshot** to save a timestamped folder under `dev-vault/ui-catalog-exports/`.

## Files

- `manifest.json`: schema version, Obsidian `apiVersion`, UTC capture time, platform, mode from the body's `theme-light` or `theme-dark` class, and theme name (currently `null`).
- `tokens.json`: CSS custom properties found in accessible document stylesheets and resolved with `getComputedStyle()` on `html` and `body`. Body values take precedence. Tokens are stored once, not repeated in components.
- `components.json`: three snapshots with stable type IDs, public API implementation names, current and known states, and a DOM tree. Each element records tag, classes, selected attributes and direct text, rendered width/height, and the selected computed styles in the schema.

The export captures the state visible when the button is pressed. Search and Toggle can be changed before export. Every export uses a new folder. Its files are local test output and are ignored by Git.

## Observed example

An export from the development vault on 2026-09-30, with Obsidian API version 1.14.3 in dark mode on macOS, produced three components and 945 resolved custom properties. These values describe that one environment, not a universal Obsidian default.

```text
// manifest.json (excerpt)
{"schemaVersion":"0.1.0","obsidianVersion":"1.14.3","capturedAt":"2026-09-30T18:31:13.988Z","platform":"macos","theme":null,"mode":"dark"}

// tokens.json (excerpt)
{"values":{"--background-primary":"#1C1C1C","--text-normal":"#dadada"}}

// components.json (excerpt; other fields omitted)
[
  {"id":"obsidian.button","implementation":"obsidian.ButtonComponent","states":{"current":"enabled"},"dom":{"tag":"button","sizePx":{"width":118.484375,"height":30}}},
  {"id":"obsidian.search","implementation":"obsidian.SearchComponent","states":{"current":"empty"},"dom":{"tag":"div","classes":["search-input-container"]}},
  {"id":"obsidian.toggle","implementation":"obsidian.ToggleComponent","states":{"current":"off"},"dom":{"tag":"label","classes":["checkbox-container"]}}
]
```

## Current limits

- This is one running Obsidian instance, theme mode, platform, and UI state. It does not prove how other versions, themes, or platforms render.
- `apiVersion` follows the app release cycle but is the public API version, not a separate installer build number.
- No public API used here reliably reports the active community theme name, so `theme` is `null`.
- Token collection only includes custom properties whose names occur in CSSOM-accessible stylesheets or inline styles and whose values resolve on `html` or `body`. It does not capture variables scoped only to a component subtree, and browser security may hide external stylesheet rules.
- The snapshot records selected computed styles and rendered dimensions, not every CSS declaration, interaction, pseudo-element, or semantic meaning. `states.known` lists variants; only `states.current` is rendered and measured in an export.
- Exports are three sequential writes. A storage failure can leave an incomplete folder; rerun the export to create a new one.
