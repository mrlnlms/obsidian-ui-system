# Obsidian UI System for Figma Design

This is a local development plugin. Each run creates one text node containing `Obsidian UI System — plugin connected` on the current page, selects it, zooms to it, and closes. It has no custom UI, network access, or Atlas snapshot integration.

## Build and install

1. From the repository root, run `npm ci` and then `npm run build --workspace @obsidian-ui-system/figma-plugin`. The build creates `apps/figma-plugin/dist/code.js`. You can also run `npm run build` to build the monorepo.
2. Open a **Figma Design** file in the **Figma Desktop** app on macOS or Windows. Local plugin development requires the desktop app.
3. In the Figma menu, choose **Plugins → Development → Import new plugin from manifest…**. In some versions, right-click the canvas and choose **Plugins → Development → Import plugin from manifest**.
4. Select this exact file: `/Users/mosx/Desktop/obsidian-ui-system/apps/figma-plugin/manifest.json` (or `<repository>/apps/figma-plugin/manifest.json` in another checkout). Select the manifest, not `dist/code.js`.
5. Run **Obsidian UI System** under **Plugins → Development** (or from the Actions menu). Confirm that the text node appears selected on the canvas.

The manifest has no invented `id`. Figma assigns plugin IDs; its manifest documentation describes `id` as the ID used to publish updates. If Desktop requires an ID during import, use **Plugins → Development → New Plugin…** with the **Run once** template to obtain a Figma-issued ID, add that value as `"id"` in this manifest, then import this manifest. Keep `apps/figma-plugin/` as the source; the generated template is only for obtaining the ID. Publishing is outside this setup.

## Develop

From the repository root:

```sh
npm run check --workspace @obsidian-ui-system/figma-plugin
npm run build --workspace @obsidian-ui-system/figma-plugin
npm run dev --workspace @obsidian-ui-system/figma-plugin
```

`dev` watches `src/code.ts` and recompiles `dist/code.js` when it changes. After a rebuild, run the development plugin again in Figma Desktop. Each run adds another node. Re-run `check` when changing TypeScript; watch mode only builds. If you change the manifest, re-import it if the app does not pick up the change.

## Files

- `src/code.ts`: one-shot canvas write.
- `manifest.json`: Figma Design plugin registration, pointing to `dist/code.js`.
- `dist/code.js`: generated locally and ignored by Git.
- `package.json` and `tsconfig.json`: TypeScript checking and esbuild commands.

The [Figma manifest reference](https://developers.figma.com/docs/plugins/manifest/) describes the required fields and Figma-issued ID. The [Figma Help Center development guide](https://help.figma.com/hc/en-us/articles/360042786733-Create-a-classic-plugin-for-development) documents Desktop installation and manifest import.
