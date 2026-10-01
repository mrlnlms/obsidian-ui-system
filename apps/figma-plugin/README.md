# Obsidian UI System for Figma Design

This local Figma Design development plugin runs a bounded ButtonComponent spike. Its Custom UI reads two local JSON files with `FileReader`; the plugin code receives their parsed contents through `postMessage` and creates one native `Obsidian / Button` Component Set with Normal, Disabled and CTA variants. It does not read the local filesystem directly or access the network.

## Build and install

1. From the repository root, run `npm ci` and then `npm run build --workspace @obsidian-ui-system/figma-plugin`. The build creates `apps/figma-plugin/dist/code.js`. You can also run `npm run build` to build the monorepo.
2. Open a **Figma Design** file in the **Figma Desktop** app on macOS or Windows. Local plugin development requires the desktop app.
3. In the Figma menu, choose **Plugins → Development → Import new plugin from manifest…**. In some versions, right-click the canvas and choose **Plugins → Development → Import plugin from manifest**.
4. Select this exact file: `/Users/mosx/Desktop/obsidian-ui-system/apps/figma-plugin/manifest.json` (or `<repository>/apps/figma-plugin/manifest.json` in another checkout). Select the manifest, not `dist/code.js`.
5. Run **Obsidian UI System** under **Plugins → Development** (or from the Actions menu). Choose `components.json` from an Atlas export and `layout.json` from a Layout Lab export made in the same Obsidian environment. Click **Generate Button**. The plugin checks the required font automatically before creating any node. The selected Component Set should appear on the canvas.

For this checkout, the latest locally checked pair is:

- `dev-vault/ui-catalog-exports/2026-09-30T23-41-12-506Z/components.json`
- `dev-vault/layout-spike-exports/2026-09-30T23-42-18-726Z/layout.json`

These exports are ignored local evidence and may not exist in another checkout. `tokens.json` is not required: the Atlas already exports computed Button colors, and it does not record which token produced each color. See [the Button spike notes](../../docs/figma-button-spike.md) for the mapping and limits.

## Typography prerequisite — macOS

The default Obsidian UI uses the macOS system UI font stack. The Figma importer resolves this stack to **SF Pro / Regular** for the current Button. SF Pro must be available and activated in Figma Desktop before generation. This is a one-time environment setup:

1. Open Figma Desktop.
2. Create or select a text layer.
3. Choose **SF Pro**.
4. If Figma displays Apple's font license or activation prompt, accept it.
5. Confirm that the text renders normally.
6. Run **Obsidian UI System** again.

If SF Pro is still unavailable, install it from [Apple Fonts](https://developer.apple.com/fonts/) under Apple's terms, restart Figma Desktop, and run the plugin again. Do not add font files to this repository. The license has already been accepted manually in the development Figma Desktop, and the user confirmed that SF Pro now renders correctly. The earlier `hasMissingFont=true` result was an unmet Figma environment prerequisite.

The plugin checks `figma.listAvailableFontsAsync()`, loads the exact `FontName` returned by Figma with `loadFontAsync()`, and tests a temporary TextNode before creating any component. If the font is absent or fails to render, it stops and displays the human setup steps. It does not activate fonts, alter the imported JSON, or substitute another family.

The checked pair above uses schema `0.4.0` and includes the Button's `fontStyle=normal`. Older `0.3.0` exports cannot satisfy automatic typography validation. Obsidian's `??` entries are a no-override sentinel, not a font family; the current Capture build omits them from usable typography CSS variable values while `tokens.json` retains the literal raw CSS values. Re-export from Obsidian to see that normalization in the artifacts; the plugin also filters sentinels when importing the checked pair.

The manifest has no invented `id`. Figma assigns plugin IDs; its manifest documentation describes `id` as the ID used to publish updates. If Desktop requires an ID during import, use **Plugins → Development → New Plugin…** with the **Run once** template to obtain a Figma-issued ID, add that value as `"id"` in this manifest, then import this manifest. Keep `apps/figma-plugin/` as the source; the generated template is only for obtaining the ID. Publishing is outside this setup.

## Develop

From the repository root:

```sh
npm run check --workspace @obsidian-ui-system/figma-plugin
npm run build --workspace @obsidian-ui-system/figma-plugin
npm run dev --workspace @obsidian-ui-system/figma-plugin
```

`dev` watches `src/*.ts` and recompiles `dist/code.js` when they change. After a rebuild, run the development plugin again in Figma Desktop. Each click on **Generate Button** adds another Component Set. Re-run `check` when changing TypeScript; watch mode only builds. If you change the manifest or `src/ui.html`, re-import or restart the plugin if the app does not pick up the change. A prior Component Set is not changed by rebuilding or generating a new one.

## Files

- `src/code.ts`: Figma Component Set creation and font loading.
- `src/font-resolution.ts`: deterministic CSS stack to required Figma font mapping.
- `src/button-data.ts`: validates and maps Button evidence from Atlas and Layout Lab.
- `src/ui.html`: local file picker and status messages.
- `manifest.json`: Figma Design plugin registration, pointing to `dist/code.js` and `src/ui.html`.
- `dist/code.js`: generated locally and ignored by Git.
- `package.json` and `tsconfig.json`: TypeScript checking and esbuild commands.

The [Figma manifest reference](https://developers.figma.com/docs/plugins/manifest/) describes the required fields and Figma-issued ID. The [Figma Help Center development guide](https://help.figma.com/hc/en-us/articles/360042786733-Create-a-classic-plugin-for-development) documents Desktop installation and manifest import.
