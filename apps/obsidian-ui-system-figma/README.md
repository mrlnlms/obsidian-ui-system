# Obsidian UI System for Figma Design

This local Figma Design plugin generates the currently implemented UI Kit on a fresh page with one **Figma Package v1 ZIP** and one **Generate UI Kit** action. The ZIP supplies the observed Button and Search specimens. Versioned, tracked Dark probe fixtures supply the implemented File Explorer rows, Folder Rows, View Header, Workspace Tab, Side Panel, Search View, Files View, and Bookmarks View. The action calls their existing generators in dependency order, passes the newly generated components to their hosts, and creates separate Search, Files, and Bookmarks previews inside duplicates of the validated Side Panel resize preview. It does not generate all 26 mapped public API families yet.

Button, Search, the File Explorer rows, View Header, Workspace Tab, Side Panel, and the first hosted Search composition have been confirmed in Figma Desktop for their documented samples. The user also accepted the component reuse revision and unified one-action flow on 2026-10-02. [Component reconstruction rules](../../docs/obsidian-ui-system-figma/components/component-reconstruction.md) and the [UI system map](../../docs/ui-system-map.md) describe their scope.

## Build, install, and generate

1. From the repository root, run `npm ci` if dependencies are missing, then `npm run build --workspace @obsidian-ui-system/figma-plugin`.
2. In Figma Desktop, open a **Figma Design** file and import `apps/obsidian-ui-system-figma/manifest.json` through **Plugins → Development → Import new plugin from manifest…**. Reopen the development plugin after rebuilding. If a changed `src/ui.html` is not picked up, re-import the manifest.
3. In Obsidian Desktop, run **Export Obsidian UI Figma Package**. Its v1 ZIP is written to `dev-vault/obsidian-ui-exports/figma-packages/`. Existing v1 ZIPs in that folder are also suitable when they pass the plugin's importer checks.
4. In a blank Figma page, run **Obsidian UI System**, select that **Package v1 ZIP**, wait for the package summary, and click **Generate UI Kit** once. No standalone probe JSON is selected in Figma.

The action creates `Obsidian / Button`, `Obsidian / Search`, `Obsidian / Icon Button / Dark`, and `Obsidian / Tree Navigation Row / Dark` Component Sets, then the existing hosted Search, Files, and Bookmarks compositions. Icon Button has a swappable observed SVG and button Context/State/Tone variants. Files uses Tree Navigation Row variants for the observed Folder and File states/depths; JSON/ZIP are editable optional metadata in the File anatomy. Header actions, View Header, Search settings, and the Side Panel collapse control use Icon Button instances. The Views use the Side Panel's `Hosted View` and `Tab group` swaps at 242 and 200 px; temporary 300 px instances check further resize. The original Side Panel preview remains intact. The unrelated `Outline probe` sample is excluded from Search.

Each run adds fresh nodes to the current page; it does not update earlier Figma nodes. A handled failure removes the roots created by that run. The ZIP importer checks format, schema `0.4.0`, supported layout model, capture context, required tokens, and Button/Search evidence before enabling generation. The internal fixtures are checked before Figma nodes are created. The plugin does not read the local filesystem directly or access the network; its Custom UI reads the selected ZIP with `FileReader`.

SF Pro / Regular must be available and render in Figma Desktop for the current Dark components. If the plugin reports a font failure, select SF Pro on a Figma text layer, accept the activation prompt if shown, and run the plugin again. The importer checks `figma.listAvailableFontsAsync()`, loads the exact returned font, and tests a temporary TextNode. It does not substitute another font. Older Package schema `0.3.0` exports lack the typography evidence needed by the current importer.

## Component scope and confirmed behavior

- **Button and Search:** native Component Sets from Package v1, with editable Button `Label` and Search `Placeholder`/`Value` properties. Their first Figma Desktop projections were validated.
- **File Explorer:** the Active row truncates a single-line label when narrowed; JSON and ZIP tagged rows keep their tags at the right; Folder Rows cover Expanded and Collapsed at observed Dark depths 0–2. The user confirmed these bounded samples in Figma Desktop on 2026-10-02 and confirmed the Tree Navigation Row consolidation on 2026-10-03.
- **Files View:** a focused excerpt of the open Dark Files scene has five header actions and nine rows. It now uses Tree Navigation Row instances and Icon Button instances inside its existing Side Panel composition. The user confirmed the consolidation in Figma Desktop on 2026-10-03. The excerpt omits repeated JSON entries, not a rule or state.
- **Bookmarks View:** a focused Dark excerpt uses the existing Bookmarks tab and Side Panel host, reuses the identical New group and Collapse all action variants from Files, and adds two own header action variants. A three-variant Bookmarks Row set represents the observed expanded group, selected nested bookmark, and multiline root bookmark with editable labels. The user accepted the hosted composition in Figma Desktop on 2026-10-03.
- **View Header/Breadcrumb:** nested editable Breadcrumb Segment, Trail and Markdown View Header Components. The user accepted the Dark Markdown sample, including its documented narrow-width approximation, on 2026-10-02.
- **Workspace Tab:** a native `Context = Main | Sidedock`, `State = Active | Inactive` Component Set with editable title and swappable Sidedock icons. The first Dark version was confirmed on 2026-10-02; Light remains for a later phase.
- **Side Panel:** the left Dark `WorkspaceTabs / Sidedock` group and `Side Panel / Left / Dark` Component with a flexible Hosted View slot. The user confirmed the 200 px expanded minimum, 16 px collapse glyph, and wider alignment on 2026-10-02. Right and Light remain outside this sample.
- **Search View:** the hosted Dark composition and subsequent component reuse revision were accepted by the user. The current version reuses Search Filled and componentizes its content. Its two expanded result groups contain four visible snippets; query and note text are editable sample content. The settings panel is closed.
- **Primitive consolidation, Figma validated:** Icon Button centralizes observed 28×24 toolbar controls, the 28×39 Sidedock collapse control and the 24×20 Search Match case control; `Icon` is an instance swap backed by tracked SVGs. Tree Navigation Row centralizes row height, selection, radius, text, ellipsis, indent and optional trailing metadata. The user confirmed the generated result on 2026-10-03. No Light or hover states were inferred.

The focused probes in `tests/fixtures/` are projections of real Obsidian observations; the earlier full runtime captures remain ignored beside the Package ZIPs. They are evidence for these bounded Dark components, not new public API specimens. The plugin's normal UI does not expose separate probe pickers or generator buttons.

## Package v2 Button normal pilot

A selected **Package v2 ZIP** reveals the separate **Generate Button normal** action and Dark/Light diagnostic JSON inputs. This bounded, previously validated pilot creates one Button normal Component with bound `--button-radius`, `--interactive-normal`, and `--text-color` Variables. It requires the corresponding confirmed causal diagnostics and does not run the full UI Kit action. Package v2 assembly and diagnostic commands are described in [development.md](../../docs/development.md). The generated Component and binding IDs were checked through Dark → Light → Dark in Figma Desktop on 2026-10-01. The v1 full kit continues to use observed computed styles.

## Develop and verify

From the repository root:

```sh
npm run check --workspace @obsidian-ui-system/figma-plugin
npm run build --workspace @obsidian-ui-system/figma-plugin
npm run test:full-ui-kit --workspace @obsidian-ui-system/figma-plugin
npm run test:file-explorer-view --workspace @obsidian-ui-system/figma-plugin
npm run test:package --workspace @obsidian-ui-system/figma-plugin
```

The focused `test:search-view`, `test:side-panel`, `test:workspace-tab`, `test:view-header`, `test:folder-row`, `test:file-explorer-row`, `test:search`, `test:ui-kit`, and `test:variables` scripts cover their respective readers or model logic. Automated checks cannot establish the rendered Figma Desktop result. `dist/code.js` is ignored and regenerated locally. `src/code.ts` dispatches the plugin messages; `src/full-ui-kit-generation.ts` composes the one-action v1 flow from existing generators. `src/file-explorer-view-data.ts` reads the focused current scene and `src/file-explorer-view-generation.ts` creates its new components and hosted Files preview. `src/ui.html` presents the ZIP picker and the relevant action.
