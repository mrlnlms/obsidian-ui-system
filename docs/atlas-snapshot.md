# Atlas snapshot

Run `npm run dev`, open the development vault in Obsidian, and use **Open Obsidian UI Atlas**. The command opens or reveals the same scrollable workspace tab. This `ItemView` instantiates 26 Obsidian public API families from the shared [component registry](component-registry.md). Press **Export snapshot** to save a timestamped folder under `dev-vault/.obsidian-ui-system/ui-catalog-exports/`.

## Files

- `manifest.json`: schema version, runtime Obsidian `apiVersion`, installed `obsidian` SDK package version embedded at build time, UTC capture time, platform, mode from the body's `theme-light` or `theme-dark` class, and theme name (currently `null`). The runtime and SDK versions are independent.
- `tokens.json`: CSS custom properties found in accessible document stylesheets and resolved with `getComputedStyle()` on `html` and `body`. Body values take precedence. Tokens are stored once, not repeated in components.
- `components.json`: 59 snapshots of 26 public API families. Each record has a stable type `id`, unique `variant` within that type, category, public API implementation name, current and known states, and a DOM tree. Each element records tag, classes, selected attributes and live form properties, direct text, rendered width/height, and selected computed styles.

Export recreates all declared variants just before capture, so manual interaction with a specimen does not change the meaning of its label. Every export uses a new folder. Its files are local test output and are ignored by Git.

## Current limits

- This is one running Obsidian instance, theme mode, platform, and UI state. It does not prove how other versions, themes, or platforms render.
- `obsidianVersion` is `apiVersion` from the running app. It follows the app release cycle but is the public API version, not a separate installer build number. `obsidianSdkVersion` comes from the `obsidian` package installed during build; it can differ from runtime.
- No public API used here reliably reports the active community theme name, so `theme` is `null`.
- Token collection only includes custom properties whose names occur in CSSOM-accessible stylesheets or inline styles and whose values resolve on `html` or `body`. It does not capture variables scoped only to a component subtree, and browser security may hide external stylesheet rules.
- The snapshot records selected computed styles, rendered dimensions and selected live form properties, not every CSS declaration, interaction, pseudo-element, or semantic meaning. `states.known` lists known state names; each declared variant is separately rendered and measured.
- Direct overlays are opened only during their own capture and closed afterward. Their roots live outside the Atlas tab. `Modal` and `ConfirmationModal` use public `modalEl`; `Notice` uses public `containerEl`; `Menu` uses a narrow DOM selector because the SDK exposes no menu root. Backdrops and platform-native menu UI are outside the captured roots.
- Suggestion popovers are located by the container created during their own activation; the two suggestion modal subclasses use public `modalEl`. The bare `PopoverSuggest` exposes an empty shell only, because its public API has no item provider. Popup dimensions depend on window context.
- `setTooltip` captures the registered target with its `aria-label`, but no hover tooltip; `displayTooltip` captures the real tooltip it opens, then removes the Atlas-labelled root because the SDK has no dismiss function. `setIcon` captures its SVG inside the fixture container. Tooltip placement and the icon container's width depend on the Atlas viewport. `HoverPopover` remains limited: its SDK contract exposes no public close operation.
- `TextAreaComponent` stores its live content in the `textarea.value` property; direct text nodes are empty in the observed runtime. `DropdownComponent` renders a native `select` with `option` children; the selected value is read from the `select`, with `default` meaning the first fixture option and `selected` the second. The option `value` attributes are captured. `SliderComponent` creates a wrapper containing `span.slider-value` followed by `input.slider`; capture uses that wrapper so the inline value is included. Its fixed range is 0–100 in steps of 1, the disabled specimen holds 50, and the input's `min`, `max`, and `step` attributes are captured.
- In the observed Obsidian build, `ToggleComponent.setValue(true)` changes the component's public state and `is-enabled` class while its child input's native `checked` property remains `false`. The exported `states.current` comes from `ToggleComponent.getValue()`; `dom.properties.checked` reports the literal DOM property.
- Exports are three sequential writes. A storage failure can leave an incomplete folder; rerun the export to create a new one.
