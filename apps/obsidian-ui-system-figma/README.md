# Obsidian UI System for Figma Design

This local Figma Design development plugin imports the validated Button and Search Component Sets from Package v1. Its Custom UI reads a local ZIP with `FileReader` and passes its bytes to the plugin code through `postMessage`. A restricted Package v2 action also generates one native Button normal Component with three bound Variables. Separate development actions use standalone internal-observed probes for File Explorer rows, View Header, Workspace Tab, Side Panel, and Search View content. The plugin does not read the local filesystem directly or access the network. The v1 Button and Search behavior, the three v2 Button normal bindings, and the File Explorer rows were validated in Figma Desktop. The first View Header was reviewed and accepted with the narrow-width difference documented below. Workspace Tab, Side Panel, and the corrected Search View preview were user-validated for their bounded Dark samples.

The [reconstruction reference](../../docs/obsidian-ui-system-figma/components/component-reconstruction.md) records the reusable rules demonstrated by the generated components.

## Build and install

1. From the repository root, run `npm ci` and then `npm run build --workspace @obsidian-ui-system/figma-plugin`. The build creates `apps/obsidian-ui-system-figma/dist/code.js`. You can also run `npm run build` to build the monorepo.
2. Open a **Figma Design** file in the **Figma Desktop** app on macOS or Windows. Local plugin development requires the desktop app.
3. In the Figma menu, choose **Plugins → Development → Import new plugin from manifest…**. In some versions, right-click the canvas and choose **Plugins → Development → Import plugin from manifest**.
4. Select `<repository>/apps/obsidian-ui-system-figma/manifest.json`. Select the manifest, not `dist/code.js`.
5. In Obsidian Desktop, run **Export Obsidian UI Figma Package** from the Command Palette. Mapping and Layout Lab may remain closed. The command writes one ZIP in `dev-vault/obsidian-ui-exports/figma-packages/`.
6. Run **Obsidian UI System** under **Plugins → Development** (or from the Actions menu). Choose that `.zip` in **Figma Package**. After the package summary appears, click **Generate UI Kit**. The plugin checks the required font and generates both Component Sets: `Obsidian / Button` in the `Actions` section and `Obsidian / Search` in the `Inputs` section.

The local export is ignored by Git; a copy of a real ZIP created before the Mapping rename is committed under `tests/fixtures/` for repeatable importer tests. The v1 ZIP must contain `package-manifest.json`, `manifest.json`, `components.json`, `tokens.json` and `layout.json`. Before enabling **Generate UI Kit**, the importer checks package format/version, schema `0.4.0`, current layout model `mapping-layout-probes-2` or historical `atlas-layout-probes-2`, matching Mapping/Layout Lab environment, JSON integrity, tokens, and the evidence required by Button and Search. Invalid or incompatible packages show an error and leave the canvas untouched. The v1 components continue using observed computed styles. The [component reconstruction reference](../../docs/obsidian-ui-system-figma/components/component-reconstruction.md) describes mapping rules and validation limits.

Each run creates a new pair of sections to the right of the page's existing content. It does not update earlier Component Sets. Button keeps its `Label` property; Search keeps separate `Placeholder` and `Value` properties, with clear visibility driven by `State`. The Search set's 240 px initial width is only a demonstration host measured by the Lab, not an intrinsic width.

## Typography prerequisite — macOS

The default Obsidian UI uses the macOS system UI font stack. The Figma importer resolves this stack to **SF Pro / Regular** for the current Button and Search. SF Pro must be available and activated in Figma Desktop before generation. This is a one-time environment setup:

1. Open Figma Desktop.
2. Create or select a text layer.
3. Choose **SF Pro**.
4. If Figma displays Apple's font license or activation prompt, accept it.
5. Confirm that the text renders normally.
6. Run **Obsidian UI System** again.

If SF Pro is still unavailable, install it from [Apple Fonts](https://developer.apple.com/fonts/) under Apple's terms, restart Figma Desktop, and run the plugin again. Do not add font files to this repository.

The plugin checks `figma.listAvailableFontsAsync()`, loads the exact `FontName` returned by Figma with `loadFontAsync()`, and tests a temporary TextNode before creating any component. If the font is absent or fails to render, it stops and displays the human setup steps. It does not activate fonts, alter the imported package, or substitute another family.

The checked package uses schema `0.4.0` and includes the Button's `fontStyle=normal`. Older `0.3.0` exports cannot satisfy automatic typography validation. Obsidian's `??` entries are a no-override sentinel, not a font family; Capture omits them from usable typography CSS variable values while `tokens.json` retains the literal raw CSS values. The plugin also filters sentinels during import.

The manifest has no invented `id`. Figma assigns plugin IDs; an ID is needed for private `pluginData` and publishing updates. The local importer does not use private `pluginData`. If a future version needs it, obtain a Figma-issued ID through **Plugins → Development → New Plugin…**; do not invent one.

## Develop

From the repository root:

```sh
npm run check --workspace @obsidian-ui-system/figma-plugin
npm run build --workspace @obsidian-ui-system/figma-plugin
npm run dev --workspace @obsidian-ui-system/figma-plugin
```

`dev` watches `src/*.ts` and recompiles `dist/code.js` when they change. After a rebuild, run the development plugin again in Figma Desktop. Each click on **Generate UI Kit** adds a new Button/Search pair in new `Actions` and `Inputs` sections without overlapping earlier runs. Re-run `check` when changing TypeScript; watch mode only builds. If you change the manifest or `src/ui.html`, re-import or restart the plugin if the app does not pick up the change. A prior Component Set is not changed by rebuilding or generating a new one.

Run `npm run test:package --workspace @obsidian-ui-system/figma-plugin` to check the real ZIP fixture and incompatibility paths. The existing `test:font`, `test:search`, and `test:ui-kit` scripts cover the unchanged component behavior.

### Real Button normal from Package v2

In the **main** Figma development plugin, choose a Package v2 ZIP. Select the standalone `binding-diagnostic-dark-*.json` and `binding-diagnostic-light-*.json` files produced by Mapping, then click **Generate Button normal**. Use diagnostic files that include the three confirmed Button normal properties. The action creates one native `Obsidian / Button / Normal` Component with an editable `Label` property. It creates one Dark/Light collection containing `--button-radius` (`FLOAT`, corner radius), `--interactive-normal` (`COLOR`, background fill), and `--text-color` (`COLOR`, Label fill). Repeated successful runs add another Component and collection. The v1 **Generate UI Kit** action remains separate.

The structural preflight requires causal `confirmed` evidence in both modes for `border-radius → --button-radius`, `background-color → --interactive-normal`, and `color → --text-color`. For text color it also requires a confirmed scoped alias `--text-color → --text-normal`; Package v2 records `--text-color: var(--text-normal)` on `button`, while the literal Dark/Light values come from the resolved `--text-normal` token. It checks CSSOM references, witness responses, restoration, token existence, and projectable values. It does not require diagnostic values, token values, and component snapshot styles to be equal. Package and diagnostic origins remain distinct in Variable descriptions. A rejected preflight leaves the canvas untouched; a handled generation failure removes its new Component and collection.

The generated Component starts in the Package's inference-source mode. The plugin checks binding IDs and Variable resolution through Dark → Light → Dark before restoring that mode. In Figma Desktop on 2026-10-01, the real Component retained the same radius, background and Label fill binding IDs through that sequence. The API resolved radius `8`, background `#333333 → #e4e4e4 → #333333`, and text `#dadada → #222222 → #dadada`; screenshots confirmed legible text in Dark and Light. `npm run test:variables --workspace @obsidian-ui-system/figma-plugin` covers the v2 reader, causal preflight, and selective projection. CTA, Search, and other specimens remain outside this v2 action.

### File Explorer row Active Dark from a standalone probe

Choose the latest `internal-observed-probe-*.json` under `dev-vault/obsidian-ui-exports/figma-packages/` in **Probe JSON**, then click **Generate File Explorer row**. This independent action accepts only `obsidian.file-explorer-row / visible-file`, active and Dark. It creates one native `Obsidian / File Explorer Row / Active` Component with an editable `Label` TextNode. The initial 276 × 24.890625 px root size and label position (24, 4) come from this sample. The observed label box 53.09375 × 16.890625 px remains comparison evidence; its width is not applied as a TextNode constraint. The action reports the natural width Figma renders for the baseline label. Evidence from the same Active row at two sidebar widths supports a resizable root and a label box that stretches between its 24 px left offset and 8 px right inset. The text remains on one line and truncates at the end when space runs out. The preview frame has 12 px horizontal gutters, matching the observed File Explorer host; it uses the observed Dark `--background-secondary` color `#282828` and is not part of the Component. The observed translucent fill retains its alpha as paint opacity. This action does not read or modify either Figma Package format.

The TypeScript build and `test:file-explorer-row` cover the reader and deterministic color conversion. On 2026-10-02, the user confirmed in Figma Desktop that the long label truncates with an ellipsis when the preview frame narrows, reveals more text when widened, stays on one line without changing row height, and that `README` remains intact.

This checkpoint covers only the Active Dark row. The standalone horizontal observation compared sidebar widths of 374.359375 and 230 px: row widths were 350.359375 and 206 px, and label widths were 318.359375 and 174 px. The JSON/ZIP tag, unsupported rows, folder indentation, Light, Variables, and Package integration remain outside this component action. The horizontal observation JSON is measurement evidence; only `internal-observed-probe-*.json` is input to **Generate File Explorer row**.

### File Explorer rows with trailing tags

Run **Developer: Probe internal File Explorer row** in Obsidian with the JSON and ZIP files visible in the Files sidebar. In the Figma plugin, select the newly generated `internal-observed-probe-*.json` in **Probe JSON** and click **Generate tagged rows (JSON + ZIP)**. No Package ZIP is needed. This separate action reads the two observed Dark `is-unsupported` rows and creates two standalone native Components, `Obsidian / File Explorer Row / Tagged JSON` and `... / Tagged ZIP`, on a separate Dark preview surface. Each has an editable `Label`, a trailing tag with observed typography and 4 px side padding, and a resizable row. Auto Layout assigns remaining width to the single-line ellipsis label while the tag hugs its content at the right edge. The initial 58 px label inset is the position in the nested sample; it does not define folder indentation or hierarchy.

The [internal-observed guide](../../docs/obsidian-ui-mapping/capture/internal-observed.md#file-row-with-trailing-tag) records the two sidebar-width measurements and CSS. Automated checks cover the reader and build. On 2026-10-02, the user compared the generated preview side by side with Obsidian in Figma Desktop, confirmed that horizontal resize works for the JSON and ZIP examples, and accepted the visual result. The wide and narrow captures show the labels truncating in one line while the tags remain at the right and the preview height stays at 106 px. The surrounding folder guides belong to the Obsidian scene and are not generated by these row Components. The earlier Active component remains a separate, already validated action.

### File Explorer folder rows

With the three observed folder depths visible in the Files sidebar, run **Developer: Probe internal File Explorer row** in Obsidian. Select that `internal-observed-probe-*.json` in the Figma plugin's **Probe JSON** input and click **Generate folder rows (Dark, Depth 0–2)**. No Package ZIP is used. The action reads `folderRows` and creates six separate native Components: Expanded and Collapsed at each measured depth. A separate Dark preview surface lets the rows stretch horizontally; each Component has an editable `Label`, a measured SVG disclosure, and a single-line ellipsis label. The two states describe only row appearance; the Components do not contain or open a file tree. Depths 0–2 use individually observed offsets, without a rule for deeper levels. The user confirmed this phase's Figma result on 2026-10-02.

### First View Header from a standalone probe

In **View Header probe JSON**, select `dev-vault/obsidian-ui-exports/figma-packages/view-header-probe-2026-10-02.json` (or its tracked copy at `tests/fixtures/view-header-probe.json`) and click **Generate View Header**. This is a standalone Dark Markdown View observation; **no Package ZIP is needed**. The action creates three native Components: `Obsidian / Breadcrumb Segment / Dark` with a `Label` text property; `Obsidian / Breadcrumb Trail / Markdown` with three exposed Segment instances, three separator layers, and a `Title` text property; and `Obsidian / View Header / Markdown` with an exposed Trail instance between Navigation and Actions layers. The observed labels remain editable through nested Component Properties. SVG paths come from the captured header. The names and icons are the content of this one Markdown view, not a catalog of view actions.

After rebuilding the plugin, generate a **new** set of Components: old nodes do not update. Resize the new View Header from roughly 650 px to 300 px; the ancestors truncate, separators and current title remain visible, and navigation/actions keep their places. At narrower widths the current title shows an ending ellipsis; below the space needed for both button groups, the header clips overflowing content instead of stacking the buttons. Inspect the nested `Label` and `Title` properties on the View Header instance.

The probe also records that the Bookmarks view has the same three header areas but hides its header in the sidebar. The reader accepts only the visible Markdown sample. `test:view-header` checks the reader; TypeScript and build compile the generation path. The generation action also checks nested instances and property edits before leaving Components on the canvas. Each run creates three new Components to the right of existing page content and leaves earlier Components untouched.

Figma Desktop screenshots from 2026-10-02 confirm that the generated View Header renders and resizes, including the narrow button-group clipping. They also show a remaining difference in the middle of the resize sequence: Figma keeps ellipses in the ancestor segments after Obsidian has begun dropping their visible content, and Figma shortens the current title while some ancestor remnants remain. Obsidian keeps the current title readable until the breadcrumb has nearly vanished. The user accepted this bounded Figma Design approximation and closed the View Header front on 2026-10-02. The nested property panel was not shown in those screenshots; the generation action verifies property overrides in a temporary instance.

### Workspace Tab, first Dark desktop version

In the Figma plugin, select `dev-vault/obsidian-ui-exports/figma-packages/workspace-tab-probe-2026-10-02.json` in **Workspace Tab probe JSON** and click **Generate Workspace Tab**. The tracked copy at `tests/fixtures/workspace-tab-probe.json` has the same content. **No Package ZIP is needed.** Rebuild the plugin before running this new action; earlier Figma nodes do not update automatically.

The action creates one native `Obsidian / Workspace Tab` Component Set with `Context = Main | Sidedock` and `State = Active | Inactive`, plus two swappable Files icon Components and a Dark resize preview. Main tabs are 34 px high, share available width when placed in horizontal Auto Layout, keep an editable `Title`, and use a one-line ending ellipsis. The active main tab shows its observed close control. The Auto Layout preview applies the observed 320 px maximum to each Main instance; a later tab-group host must apply that same maximum to its instances. Sidedock tabs are 28 × 25 px and show a 16 px icon. The `Icon / Active` and `Icon / Inactive` instance-swap properties let the matching state use another View glyph; the two defaults preserve their observed state paints. The icon components use the observed Files SVG with active/inactive paints measured from the sidedock; labels and icons are content slots, not new states. The preview shows four equally sized Main tabs, one active, and two Sidedock tabs with 3 px spacing.

On 2026-10-02, the user confirmed the first Desktop result as correct after checking the four variants, editable `Title`, Main resize and ellipsis, the matching Sidedock icon property, and Dark appearance. This closes the first Workspace Tab version; a WorkspaceTabs/tab-group host is a separate composition.

### Side Panel / WorkspaceSidedock, first Dark left composition

Run **Generate Workspace Tab** first in the same Figma page if its validated Component Set is not already there. Then click **Generate Side Panel**. The action bundles the tracked `tests/fixtures/side-panel-probe.json` observation at build time; its ignored runtime source is `dev-vault/obsidian-ui-exports/figma-packages/side-panel-probe-2026-10-02.json`. **No JSON selection or Package ZIP is needed for this action.** The action reuses the rightmost `Obsidian / Workspace Tab` set on the current page; it stops without changing the canvas if that set is missing or incompatible.

The action creates `Obsidian / WorkspaceTabs / Sidedock`, a three-variant Tab Group (`Active = Files | Search | Bookmarks`) from nested Workspace Tab instances and the observed Search/Bookmarks glyphs. It also creates `Obsidian / Side Panel / Left / Dark`, with the 40 px tab bar, observed collapse control and a flexible `Hosted View` instance-swap slot. The separate slot is visually empty on purpose: controls and content come from the hosted View. Files and Bookmarks have a 40 px View-owned header; Search does not. The panel's initial width and height are sample geometry, while the two-instance preview exercises widths 242 and 200 px at 480 px height. The expanded panel has a 200 px Figma minimum; in Obsidian, dragging narrower collapses the sidedock instead of crowding the three tabs into the right control. The collapse button's hit area is 28 × 39 px, but its SVG is 16 × 16 px with the observed muted paint. The `Tab group` property swaps the active-tab group variant; `Hosted View` accepts a later View Component. Right-sidedock and Light appearances are not represented by this first component.

The plugin build and `test:side-panel` cover input preflight and TypeScript structure. On 2026-10-02, the user compared the corrected composition side by side with Obsidian in Figma Desktop and confirmed the result. The 16 px collapse glyph matches the observed button, and the narrow preview keeps space between the three tabs and the right-anchored control. The expanded panel uses the observed 200 px minimum. The generation action checks the `Tab group` and `Hosted View` instance-swap property references and the preview resize readback. A real View content swap belongs to the later View-composition phase.

### Search View content, first Dark scene

With the validated `Side Panel / Dark resize preview` on the current Figma page, click **Generate Search in Side Panel**. The action uses the tracked `tests/fixtures/search-view-probe.json`, derived from the ignored Obsidian CLI readback `dev-vault/obsidian-ui-exports/figma-packages/search-view-probe-2026-10-02.json`. **No JSON selection or Package ZIP is needed.** It reuses an existing native `Obsidian / Search View / Dark` Component on the page when present, repairing its query-text viewport; otherwise it creates one. It duplicates the validated Side Panel preview into `Side Panel / Dark resize preview / Search`, swaps the existing `Hosted View` and `Tab group` properties to Search in both 242 and 200 px instances, and selects the new preview. The original Side Panel Component and preview remain intact.

The component contains the Search View's own query row, Match case and settings controls, a count/sort bar, and three file groups from the `probe` sample. One file group has only a title match; two expanded groups have two result snippets each. The query, file names, and snippets are sample content. `Query` and `Result count` are Component text properties; the other TextNodes remain directly editable. The root and result rows resize horizontally, while longer snippets wrap and increase their row heights. Match highlighting in file titles is a separate native Figma background behind the observed query word. In longer snippets, the query word uses the observed brighter text color; its inline background is not reproduced across wrapped lines in this first projection.

The generator checks required SF Pro rendering when creating the content Component, fixes the query TextNode to a left-aligned viewport, and verifies property overrides. The duplicated preview is checked at both existing widths, with a temporary 300 × 480 px panel instance checking further resize. TypeScript, build, and `test:search-view` verify the code and focused evidence reader. The user ran the corrected action in Figma Desktop on 2026-10-02 and confirmed that the Search content coupled to the duplicated Side Panel preview now looks right. This closes the first Dark Search composition in the confirmed scope. The observed default has the Search settings panel closed; Light, alternative query states, and settings-open appearance were not included.

## Files

- `src/code.ts`: Figma Component Set creation and font loading.
- `src/font-resolution.ts`: deterministic CSS stack to required Figma font mapping.
- `src/button-data.ts`: validates and maps Button evidence from Mapping and Layout Lab.
- `src/search-data.ts`: validates Search evidence and builds an experimental Figma-ready model.
- `src/search-generation.ts`: creates the Search Component Set from positioned native nodes and the captured SVG masks.
- `src/file-explorer-row-data.ts`, `src/file-explorer-row-color.ts`, `src/file-explorer-row-generation.ts`: read the standalone observed probe and generate the one Active Dark row.
- `src/file-explorer-row-tag-data.ts`, `src/file-explorer-row-tag-generation.ts`: read the two observed tagged rows and generate their separate Dark Components.
- `src/folder-row-data.ts`, `src/folder-row-generation.ts`: read the observed folder anatomy, states and depths and generate six separate Dark Components.
- `src/view-header-data.ts`, `src/view-header-generation.ts`: read the bounded View Header probe and generate the first native Dark Component.
- `src/workspace-tab-data.ts`, `src/workspace-tab-generation.ts`: read the four observed Dark Workspace Tab appearances and generate the Component Set and resize preview.
- `src/side-panel-data.ts`, `src/side-panel-generation.ts`: read the Dark left host sample and compose a three-state Sidedock Tab Group and resizable Side Panel.
- `src/search-view-data.ts`, `src/search-view-generation.ts`: read the bounded Dark Search scene and generate its hosted View content.
- `src/ui-kit-layout.ts`: calculates deterministic, non-overlapping section positions for each run.
- `src/package-data.ts`: ZIP decoding and input preflight before generation.
- `src/button-v2-package.ts`, `src/button-normal-binding.ts`: bounded v2 reader and structural confirmed-binding preflight.
- `src/button-component.ts`, `src/button-normal-generation.ts`: shared native Button construction and real bound Normal generation.
- `src/variable-projection.ts`: pure, selective Package v2 token decisions.
- `src/button-binding-evidence.ts`: causal diagnostic preflight and separate provenance mapping.
- `src/ui.html`: ZIP and Dark/Light diagnostic pickers, package summary and status messages.
- `tests/fixtures/`: real Obsidian ZIP used by the importer tests.
- `manifest.json`: Figma Design plugin registration, pointing to `dist/code.js` and `src/ui.html`.
- `dist/code.js`: generated locally and ignored by Git.
- `package.json` and `tsconfig.json`: TypeScript checking and esbuild commands.

The [Figma manifest reference](https://developers.figma.com/docs/plugins/manifest/) describes the required fields and Figma-issued ID. The [Figma Help Center development guide](https://help.figma.com/hc/en-us/articles/360042786733-Create-a-classic-plugin-for-development) documents Desktop installation and manifest import.
