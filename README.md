# Obsidian UI System

A monorepo for a future structured representation of the Obsidian UI, a Figma design system built from it, and a coding-agent skill that uses the same representation. This first milestone only prepares the workspace and a minimal TypeScript capture plugin.

## Requirements and installation

- macOS with [Obsidian](https://obsidian.md/) installed.
- Node.js 22 or newer and npm 10 or newer.
- Git.

From the repository root:

```sh
npm ci
npm run build
```

The build writes `apps/obsidian-capture/main.js`. It is ignored by Git, so build after cloning and before opening the plugin in Obsidian.

## Open the development vault

In Obsidian, choose **Open folder as vault** and select exactly:

```text
<repository>/dev-vault
```

For this checkout, that is `/Users/mosx/Desktop/obsidian-ui-system/dev-vault`. This vault is for development and tests only; Obsidian may generate local settings in `.obsidian/`, which are ignored.

## Develop the plugin

Run `npm run dev` at the repository root to rebuild `main.js` when `apps/obsidian-capture/src/` changes. For a one-time production build, run `npm run build`; `npm run check` runs TypeScript checks only. After rebuilding, reload the plugin in Obsidian by turning it off and on in **Settings → Community plugins**, or use **Reload app without saving** from the command palette. Changes to `manifest.json` require an Obsidian restart.

In the development vault, open **Settings → Community plugins**, allow community plugins if prompted, then enable **UI Capture**. Run **Open Obsidian UI Catalog** from the command palette. A short status modal confirms that the minimal plugin loaded. This does not capture UI data yet.

## Why the plugin is a symlink

Obsidian loads local plugins from `<vault>/.obsidian/plugins/<plugin-id>/`. The tracked relative link at `dev-vault/.obsidian/plugins/obsidian-ui-capture` points to `../../../apps/obsidian-capture` from its containing directory. Thus Obsidian sees `manifest.json` and the built `main.js` inside the vault, while the only source tree remains under `apps/`.

If the link is removed, recreate it from the repository root on macOS:

```sh
mkdir -p dev-vault/.obsidian/plugins
ln -s ../../../apps/obsidian-capture dev-vault/.obsidian/plugins/obsidian-ui-capture
```

If a real directory occupies that path, inspect its contents before removing it; the command above intentionally will not overwrite it. The link is tracked by Git and normally returns with a clone or checkout.

## Project layout

- `apps/obsidian-capture/`: current plugin source and build configuration.
- `apps/figma-plugin/`: future Figma importer placeholder.
- `packages/ui-schema/`: future shared schema placeholder.
- `skills/obsidian-ui/`: future agent skill placeholder.
- `dev-vault/`: isolated Obsidian test vault.
- `docs/`: project documentation.

The plugin ID matches the requested local folder name. Obsidian's current [manifest rules](https://docs.obsidian.md/Reference/Manifest) disallow `obsidian` in IDs submitted to the community directory; rename the ID and folder together if publication becomes a goal.
