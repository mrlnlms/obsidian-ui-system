# Obsidian UI System for Figma Design

This local Figma Design development plugin imports the validated ButtonComponent and SearchComponent pilots. Its Custom UI reads one local ZIP with `FileReader` and passes its bytes to the plugin code through `postMessage`. The plugin validates and unpacks the ZIP locally, then creates native Component Sets. It does not read the local filesystem directly or access the network. Button and Search behavior was validated in Figma Desktop; the newer ZIP input has automated fixture coverage and still needs a manual Desktop run.

For the next component, follow the [reusable reconstruction reference](../../docs/figma-component-reconstruction.md) and the Figma workflow in the repository's `AGENTS.md`.

## Build and install

1. From the repository root, run `npm ci` and then `npm run build --workspace @obsidian-ui-system/figma-plugin`. The build creates `apps/figma-plugin/dist/code.js`. You can also run `npm run build` to build the monorepo.
2. Open a **Figma Design** file in the **Figma Desktop** app on macOS or Windows. Local plugin development requires the desktop app.
3. In the Figma menu, choose **Plugins → Development → Import new plugin from manifest…**. In some versions, right-click the canvas and choose **Plugins → Development → Import plugin from manifest**.
4. Select this exact file: `/Users/mosx/Desktop/obsidian-ui-system/apps/figma-plugin/manifest.json` (or `<repository>/apps/figma-plugin/manifest.json` in another checkout). Select the manifest, not `dist/code.js`.
5. In Obsidian Desktop, run **Export Obsidian UI Figma Package** from the Command Palette. Atlas and Layout Lab may remain closed. The command writes one ZIP in `dev-vault/obsidian-ui-exports/figma-packages/`.
6. Run **Obsidian UI System** under **Plugins → Development** (or from the Actions menu). Choose that `.zip` in **Figma Package**. After the package summary appears, click **Generate UI Kit**. The plugin checks the required font and generates both Component Sets: `Obsidian / Button` in the `Actions` section and `Obsidian / Search` in the `Inputs` section.

For this checkout, the package used in automated validation is:

- `dev-vault/obsidian-ui-exports/figma-packages/obsidian-ui-package-2026-10-01T12-12-18-735Z.zip`

The local export is ignored by Git; a copy of the real ZIP is committed under `tests/fixtures/` for repeatable importer tests. The ZIP must contain `package-manifest.json`, `manifest.json`, `components.json`, `tokens.json` and `layout.json`. Before enabling generation, the importer checks package format/version, schema `0.4.0`, layout model `atlas-layout-probes-2`, matching Atlas/Layout Lab environment, JSON integrity, tokens, and the evidence required by Button and Search. Invalid or incompatible packages show an error and leave the canvas untouched. `tokens.json` is validated but not yet used to assign Figma Variables; the components still use the observed computed styles. See [Button notes](../../docs/figma-button-spike.md) and [Search notes](../../docs/figma-search-spike.md) for mapping and limits.

Each run creates a new pair of sections to the right of the page's existing content. It does not update earlier Component Sets. Button keeps its `Label` property; Search keeps separate `Placeholder` and `Value` properties, with clear visibility driven by `State`. The Search set's 240 px initial width is only a demonstration host measured by the Lab, not an intrinsic width.

## Typography prerequisite — macOS

The default Obsidian UI uses the macOS system UI font stack. The Figma importer resolves this stack to **SF Pro / Regular** for the current Button and Search. SF Pro must be available and activated in Figma Desktop before generation. This is a one-time environment setup:

1. Open Figma Desktop.
2. Create or select a text layer.
3. Choose **SF Pro**.
4. If Figma displays Apple's font license or activation prompt, accept it.
5. Confirm that the text renders normally.
6. Run **Obsidian UI System** again.

If SF Pro is still unavailable, install it from [Apple Fonts](https://developer.apple.com/fonts/) under Apple's terms, restart Figma Desktop, and run the plugin again. Do not add font files to this repository. The historical `hasMissingFont=true` diagnosis and its resolution are recorded in the [Button investigation](../../docs/figma-button-spike.md).

The plugin checks `figma.listAvailableFontsAsync()`, loads the exact `FontName` returned by Figma with `loadFontAsync()`, and tests a temporary TextNode before creating any component. If the font is absent or fails to render, it stops and displays the human setup steps. It does not activate fonts, alter the imported package, or substitute another family.

The checked package uses schema `0.4.0` and includes the Button's `fontStyle=normal`. Older `0.3.0` exports cannot satisfy automatic typography validation. Obsidian's `??` entries are a no-override sentinel, not a font family; Capture omits them from usable typography CSS variable values while `tokens.json` retains the literal raw CSS values. The plugin also filters sentinels during import.

The manifest has no invented `id`. Figma assigns plugin IDs; its manifest documentation describes `id` as the ID used to publish updates. If Desktop requires an ID during import, use **Plugins → Development → New Plugin…** with the **Run once** template to obtain a Figma-issued ID, add that value as `"id"` in this manifest, then import this manifest. Keep `apps/figma-plugin/` as the source; the generated template is only for obtaining the ID. Publishing is outside this setup.

## Develop

From the repository root:

```sh
npm run check --workspace @obsidian-ui-system/figma-plugin
npm run build --workspace @obsidian-ui-system/figma-plugin
npm run dev --workspace @obsidian-ui-system/figma-plugin
```

`dev` watches `src/*.ts` and recompiles `dist/code.js` when they change. After a rebuild, run the development plugin again in Figma Desktop. Each click on **Generate UI Kit** adds a new Button/Search pair in new `Actions` and `Inputs` sections without overlapping earlier runs. Re-run `check` when changing TypeScript; watch mode only builds. If you change the manifest or `src/ui.html`, re-import or restart the plugin if the app does not pick up the change. A prior Component Set is not changed by rebuilding or generating a new one.

Run `npm run test:package --workspace @obsidian-ui-system/figma-plugin` to check the real ZIP fixture and incompatibility paths. The existing `test:font`, `test:search`, and `test:ui-kit` scripts cover the unchanged component behavior.

## Files

- `src/code.ts`: Figma Component Set creation and font loading.
- `src/font-resolution.ts`: deterministic CSS stack to required Figma font mapping.
- `src/button-data.ts`: validates and maps Button evidence from Atlas and Layout Lab.
- `src/search-data.ts`: validates Search evidence and builds an experimental Figma-ready model.
- `src/search-generation.ts`: creates the Search Component Set from positioned native nodes and the captured SVG masks.
- `src/ui-kit-layout.ts`: calculates deterministic, non-overlapping section positions for each run.
- `src/package-data.ts`: ZIP decoding and input preflight before generation.
- `src/ui.html`: single ZIP picker, package summary and status messages.
- `tests/fixtures/`: real Obsidian ZIP used by the importer tests.
- `manifest.json`: Figma Design plugin registration, pointing to `dist/code.js` and `src/ui.html`.
- `dist/code.js`: generated locally and ignored by Git.
- `package.json` and `tsconfig.json`: TypeScript checking and esbuild commands.

The [Figma manifest reference](https://developers.figma.com/docs/plugins/manifest/) describes the required fields and Figma-issued ID. The [Figma Help Center development guide](https://help.figma.com/hc/en-us/articles/360042786733-Create-a-classic-plugin-for-development) documents Desktop installation and manifest import.
