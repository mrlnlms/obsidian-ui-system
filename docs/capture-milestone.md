# Capture milestone: public API Atlas

Run `npm run dev`, open the development vault in Obsidian, and use **Open Obsidian UI Atlas**. The command opens or reveals the same scrollable workspace tab. This `ItemView` instantiates 26 Obsidian public API families from the shared [component registry](component-registry.md), including the contextual APIs in [batch 6](contextual-batch.md). Press **Export snapshot** to save a timestamped folder under `dev-vault/ui-catalog-exports/`.

## Files

- `manifest.json`: schema version, runtime Obsidian `apiVersion`, installed `obsidian` SDK package version embedded at build time, UTC capture time, platform, mode from the body's `theme-light` or `theme-dark` class, and theme name (currently `null`). The runtime and SDK versions are independent.
- `tokens.json`: CSS custom properties found in accessible document stylesheets and resolved with `getComputedStyle()` on `html` and `body`. Body values take precedence. Tokens are stored once, not repeated in components.
- `components.json`: 59 snapshots of 26 public API families. Each record has a stable type `id`, unique `variant` within that type, category, public API implementation name, current and known states, and a DOM tree. Each element records tag, classes, selected attributes and live form properties, direct text, rendered width/height, and selected computed styles.

Export recreates all declared variants just before capture, so manual interaction with a specimen does not change the meaning of its label. Every export uses a new folder. Its files are local test output and are ignored by Git.

## Observed example

An earlier seven-component export from the development vault on 2026-09-30, with runtime Obsidian API version 1.14.3, installed SDK package version 1.13.1, dark mode and macOS, produced 20 specimens and 945 resolved custom properties. The current batch 6 result is recorded in [contextual notes](contextual-batch.md). These values describe one environment, not a universal Obsidian default.

```text
// manifest.json (excerpt)
{"schemaVersion":"0.3.0","obsidianVersion":"1.14.3","obsidianSdkVersion":"1.13.1","capturedAt":"2026-09-30T19:24:30.063Z","platform":"macos","theme":null,"mode":"dark"}

// tokens.json (excerpt)
{"values":{"--background-primary":"#1C1C1C","--text-normal":"#dadada"}}

// components.json (excerpt; other fields omitted)
[
  {"id":"obsidian.button","variant":"normal","category":"Actions","states":{"current":"enabled"},"dom":{"tag":"button"}},
  {"id":"obsidian.button","variant":"disabled","category":"Actions","states":{"current":"disabled"},"dom":{"tag":"button"}},
  {"id":"obsidian.button","variant":"cta","category":"Actions","states":{"current":"enabled"},"dom":{"tag":"button","classes":["mod-cta"]}},
  {"id":"obsidian.search","variant":"empty","category":"Inputs","states":{"current":"empty"},"dom":{"tag":"div"}},
  {"id":"obsidian.search","variant":"filled","category":"Inputs","states":{"current":"filled"},"dom":{"tag":"div"}},
  {"id":"obsidian.text","variant":"filled","category":"Inputs","states":{"current":"filled"},"dom":{"tag":"input","properties":{"value":"Atlas example","disabled":false}}},
  {"id":"obsidian.textarea","variant":"disabled","category":"Inputs","states":{"current":"disabled"},"dom":{"tag":"textarea","properties":{"value":"Atlas example\nSecond line","disabled":true}}},
  {"id":"obsidian.dropdown","variant":"selected","category":"Inputs","states":{"current":"selected"},"dom":{"tag":"select","properties":{"value":"second","disabled":false}}},
  {"id":"obsidian.slider","variant":"maximum","category":"Inputs","states":{"current":"maximum"},"dom":{"tag":"div","children":[{"tag":"span","classes":["slider-value"],"text":"100"},{"tag":"input","properties":{"value":"100","disabled":false}}]}},
  {"id":"obsidian.toggle","variant":"on","category":"Inputs","states":{"current":"on"},"dom":{"tag":"label","classes":["checkbox-container","is-enabled"]}}
]
```

## Current limits

- This is one running Obsidian instance, theme mode, platform, and UI state. It does not prove how other versions, themes, or platforms render.
- `obsidianVersion` is `apiVersion` from the running app. It follows the app release cycle but is the public API version, not a separate installer build number. `obsidianSdkVersion` comes from the `obsidian` package installed during build; it can differ from runtime.
- No public API used here reliably reports the active community theme name, so `theme` is `null`.
- Token collection only includes custom properties whose names occur in CSSOM-accessible stylesheets or inline styles and whose values resolve on `html` or `body`. It does not capture variables scoped only to a component subtree, and browser security may hide external stylesheet rules.
- The snapshot records selected computed styles, rendered dimensions and selected live form properties, not every CSS declaration, interaction, pseudo-element, or semantic meaning. `states.known` lists known state names; each declared variant is separately rendered and measured.
- Direct overlays are opened only during their own capture and closed afterward. Their roots live outside the Atlas tab. `Modal` and `ConfirmationModal` use public `modalEl`; `Notice` uses public `containerEl`; `Menu` uses a narrow DOM selector because the SDK exposes no menu root. Backdrops and platform-native menu UI are outside the captured roots.
- Suggestion popovers are located by the container created during their own activation; the two suggestion modal subclasses use public `modalEl`. The bare `PopoverSuggest` exposes an empty shell only, because its public API has no item provider. Popup dimensions depend on window context. See [batch 5](suggestions-batch.md).
- `setTooltip` captures the registered target with its `aria-label`, but no hover tooltip; `displayTooltip` captures the real tooltip it opens, then removes the Atlas-labelled root because the SDK has no dismiss function. `setIcon` captures its SVG inside the fixture container. Tooltip placement and the icon container's width depend on the Atlas viewport. `HoverPopover` remains limited: its SDK contract exposes no public close operation. See [batch 6](contextual-batch.md).
- `TextAreaComponent` stores its live content in the `textarea.value` property; direct text nodes are empty in the observed runtime. `DropdownComponent` renders a native `select` with `option` children; the selected value is read from the `select`, with `default` meaning the first fixture option and `selected` the second. The option `value` attributes are captured. `SliderComponent` creates a wrapper containing `span.slider-value` followed by `input.slider`; capture uses that wrapper so the inline value is included. Its fixed range is 0–100 in steps of 1, the disabled specimen holds 50, and the input's `min`, `max`, and `step` attributes are captured.
- In the observed Obsidian build, `ToggleComponent.setValue(true)` changes the component's public state and `is-enabled` class while its child input's native `checked` property remains `false`. The exported `states.current` comes from `ToggleComponent.getValue()`; `dom.properties.checked` reports the literal DOM property.
- Exports are three sequential writes. A storage failure can leave an incomplete folder; rerun the export to create a new one.
