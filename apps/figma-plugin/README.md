# Obsidian UI System for Figma Design

This local Figma Design development plugin runs a bounded ButtonComponent spike. Its Custom UI reads two local JSON files with `FileReader`; the plugin code receives their parsed contents through `postMessage` and creates one native Component Set with Normal, Disabled and CTA variants. It does not read the local filesystem directly or access the network.

## Build and install

1. From the repository root, run `npm ci` and then `npm run build --workspace @obsidian-ui-system/figma-plugin`. The build creates `apps/figma-plugin/dist/code.js`. You can also run `npm run build` to build the monorepo.
2. Open a **Figma Design** file in the **Figma Desktop** app on macOS or Windows. Local plugin development requires the desktop app.
3. In the Figma menu, choose **Plugins → Development → Import new plugin from manifest…**. In some versions, right-click the canvas and choose **Plugins → Development → Import plugin from manifest**.
4. Select this exact file: `/Users/mosx/Desktop/obsidian-ui-system/apps/figma-plugin/manifest.json` (or `<repository>/apps/figma-plugin/manifest.json` in another checkout). Select the manifest, not `dist/code.js`.
5. Run **Obsidian UI System** under **Plugins → Development** (or from the Actions menu). Choose `components.json` from an Atlas export and `layout.json` from a Layout Lab export made in the same Obsidian environment. For the structural spike, select **Lab — Inter / Regular placeholder** and click **Generate Button [Lab]**. The selected `Obsidian / Button [Lab]` Component Set should appear on the canvas.

For this checkout, the latest locally checked pair is:

- `dev-vault/ui-catalog-exports/2026-09-30T23-41-12-506Z/components.json`
- `dev-vault/layout-spike-exports/2026-09-30T23-42-18-726Z/layout.json`

These exports are ignored local evidence and may not exist in another checkout. `tokens.json` is not required: the Atlas already exports computed Button colors, and it does not record which token produced each color. See [the Button spike notes](../../docs/figma-button-spike.md) for the mapping and limits.

## Typography modes

- **Strict** is the default and remains the production path. For the current macOS stack, it requires `SF Pro / Regular` from `figma.listAvailableFontsAsync()` and verifies a temporary TextNode actually renders. Missing or unusable font stops generation. It never silently substitutes another family.
- **Lab** is an explicit structural test. It requires `Inter / Regular` to be available and renderable in Figma, then uses it as a **placeholder**, regardless of whether SF Pro appears in the font list. Lab output is named `Obsidian / Button [Lab]` and its description starts with a warning. Inter is not claimed to be the font seen in Obsidian and is not a production fallback.

The Component Set description records `typography.mode`, `status`, `requested` (the unchanged Atlas CSS stack and related values), `resolved` and `rendered`. In Lab, `status` is `lab-placeholder`, `resolved` is `null`, and `rendered` identifies the placeholder and its render check. The imported Atlas and Layout Lab files are not modified. Exact system-font resolution remains a backlog item before a faithful UI Kit. This round does not require investigating SF Pro installation or licensing. No font files are distributed in the repository.

The checked pair above uses schema `0.4.0` and includes the Button's `fontStyle=normal`. Older `0.3.0` exports cannot satisfy strict typography validation. Obsidian's `??` entries are a no-override sentinel, not a font family; the current Capture build omits them from usable typography CSS variable values while `tokens.json` retains the literal raw CSS values. Re-export from Obsidian to see that normalization in the artifacts; the plugin also filters sentinels when importing the checked pair.

The manifest has no invented `id`. Figma assigns plugin IDs; its manifest documentation describes `id` as the ID used to publish updates. If Desktop requires an ID during import, use **Plugins → Development → New Plugin…** with the **Run once** template to obtain a Figma-issued ID, add that value as `"id"` in this manifest, then import this manifest. Keep `apps/figma-plugin/` as the source; the generated template is only for obtaining the ID. Publishing is outside this setup.

## Develop

From the repository root:

```sh
npm run check --workspace @obsidian-ui-system/figma-plugin
npm run build --workspace @obsidian-ui-system/figma-plugin
npm run dev --workspace @obsidian-ui-system/figma-plugin
```

`dev` watches `src/*.ts` and recompiles `dist/code.js` when they change. After a rebuild, run the development plugin again in Figma Desktop. Each click on **Generate Button** adds another Component Set. Re-run `check` when changing TypeScript; watch mode only builds. If you change the manifest or `src/ui.html`, re-import or restart the plugin if the app does not pick up the change. A prior Component Set is not changed by rebuilding or generating a new one. For the Lab check, create an instance, change its **Label** property from `Example button` to `OK`, and check that the width hugs the new text.

## Files

- `src/code.ts`: Figma Component Set creation and font loading.
- `src/font-resolution.ts`: strict CSS stack mapping and the explicitly declared Lab placeholder.
- `src/button-data.ts`: validates and maps Button evidence from Atlas and Layout Lab.
- `src/ui.html`: local file picker and status messages.
- `manifest.json`: Figma Design plugin registration, pointing to `dist/code.js` and `src/ui.html`.
- `dist/code.js`: generated locally and ignored by Git.
- `package.json` and `tsconfig.json`: TypeScript checking and esbuild commands.

The [Figma manifest reference](https://developers.figma.com/docs/plugins/manifest/) describes the required fields and Figma-issued ID. The [Figma Help Center development guide](https://help.figma.com/hc/en-us/articles/360042786733-Create-a-classic-plugin-for-development) documents Desktop installation and manifest import.
