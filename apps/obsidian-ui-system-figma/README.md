# Obsidian UI System for Figma Design

This local Figma Design development plugin imports the validated Button and Search Component Sets from Package v1. Its Custom UI reads a local ZIP with `FileReader` and passes its bytes to the plugin code through `postMessage`. A restricted Package v2 action also generates one native Button normal Component with three bound Variables. The plugin does not read the local filesystem directly or access the network. The v1 Button and Search behavior and the three v2 Button normal bindings were validated in Figma Desktop.

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

## Files

- `src/code.ts`: Figma Component Set creation and font loading.
- `src/font-resolution.ts`: deterministic CSS stack to required Figma font mapping.
- `src/button-data.ts`: validates and maps Button evidence from Mapping and Layout Lab.
- `src/search-data.ts`: validates Search evidence and builds an experimental Figma-ready model.
- `src/search-generation.ts`: creates the Search Component Set from positioned native nodes and the captured SVG masks.
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
