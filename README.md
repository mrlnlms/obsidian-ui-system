# Obsidian UI System

A monorepo for a structured representation of the Obsidian UI, a future Figma design system built from it, and a future coding-agent skill that uses the same representation. The **Obsidian UI Atlas** plugin currently renders 26 public API families in a workspace tab and exports an initial snapshot.

## Requirements and installation

- macOS with [Obsidian](https://obsidian.md/) installed.
- Node.js 22 or newer and npm 10 or newer.
- Git.

From the repository root:

```sh
npm ci
npm run build
```

The build writes `apps/obsidian-capture/main.js` and compiles the snapshot comparison CLI under `.build/snapshot-diff/`. Both outputs are ignored by Git, so build after cloning and before opening the plugin in Obsidian.

## Open the development vault

In Obsidian, choose **Open folder as vault** and select exactly:

```text
<repository>/dev-vault
```

For this checkout, that is `/Users/mosx/Desktop/obsidian-ui-system/dev-vault`. This vault is for development and tests only; Obsidian may generate local settings in `.obsidian/`, which are ignored.

## Develop the plugin

Run `npm run dev` at the repository root to rebuild `main.js` when `apps/obsidian-capture/src/` changes. For a one-time production build, run `npm run build`; `npm run check` runs TypeScript checks only. The development vault also has [Hot-Reload](https://github.com/pjeby/hot-reload) installed. Once you enable it in Obsidian, the tracked `.hotreload` marker in the Capture plugin makes Hot-Reload reload that plugin after each rebuild. The Atlas tab closes during plugin reload because the view is detached on unload; run the command again to reopen it. Changes to `manifest.json` may still require an Obsidian restart.

In the development vault, open **Settings → Community plugins**, allow community plugins if prompted, then enable **Obsidian UI Atlas** and **Hot Reload**. Run **Open Obsidian UI Atlas** from the command palette. It opens or reveals one scrollable workspace tab. The tab renders the public API families listed in the [inventory](docs/public-ui-inventory.md), grouped by category and labeled by variant. Direct overlays (`Modal`, `ConfirmationModal`, `Menu`, `Notice`) have **Open specimen** buttons; export opens and captures them one at a time. Press **Export snapshot** to recreate the declared variants and capture them. Running the command again reveals the existing tab. The plugin requires Obsidian 1.13.1 or newer for `DisplayValueComponent` support.

Each export creates a timestamped folder at `dev-vault/ui-catalog-exports/<UTC timestamp>/` with `manifest.json`, `tokens.json`, and `components.json`. The manifest distinguishes the runtime Obsidian API version from the installed `obsidian` SDK package version and the snapshot schema version. These local outputs are ignored by Git. The [schema package](packages/ui-schema/README.md) describes the contract; [capture notes](docs/capture-milestone.md) explain what the export measures and its current limits. See the [registry guide](docs/component-registry.md) to add a component or variant.

## Compare two exports

Run the semantic snapshot diff from the repository root:

```sh
npm run diff:snapshots -- <before-export-folder> <after-export-folder> [output-folder]
```

The command writes `diff.json` and `diff.md`. Without an output argument, it uses an ignored folder under `snapshot-diffs/`. It compares specimens by `id + variant`, tokens by custom property name, and manifest fields separately. See the [comparison guide](docs/snapshot-diff.md) for an example using two real exports and an explanation of the categories.

The [determinism check](docs/snapshot-determinism.md) records consecutive exports from the same Obsidian environment before batch 2 and classifies the observed manifest timestamp difference.

The [Light/Dark capture](docs/light-dark-capture.md) documents how to export the same Atlas under each base color scheme and the observed semantic diff for the default theme. Mode belongs to the manifest; specimen identity remains `id + variant`.

The [Settings batch notes](docs/settings-batch.md) document the four Settings APIs, their runtime quirks, and the comparison with the preceding Dark snapshot.

The [direct overlay notes](docs/overlays-batch.md) document batch 4, including opening and cleanup, capture roots, and the real export comparison.
The [suggestion notes](docs/suggestions-batch.md) document batch 5, including the limited base popover, concrete suggestion lists, and their runtime capture boundaries.
The [contextual API notes](docs/contextual-batch.md) document batch 6: registered and visible tooltips, an SVG icon, and the public-lifecycle limit of `HoverPopover`.

Hot-Reload is a local development dependency, installed at `dev-vault/.obsidian/plugins/hot-reload/` and ignored by Git. To reinstall the pinned version after cloning, run from the repository root:

```sh
mkdir -p dev-vault/.obsidian/plugins/hot-reload
curl -fL https://github.com/pjeby/hot-reload/releases/download/0.3.1/manifest.json -o dev-vault/.obsidian/plugins/hot-reload/manifest.json
curl -fL https://github.com/pjeby/hot-reload/releases/download/0.3.1/main.js -o dev-vault/.obsidian/plugins/hot-reload/main.js
```

## Why the plugin is a symlink

Obsidian loads local plugins from `<vault>/.obsidian/plugins/<plugin-id>/`. The tracked relative link at `dev-vault/.obsidian/plugins/obsidian-ui-atlas` points to `../../../apps/obsidian-capture` from its containing directory. Thus Obsidian sees `manifest.json`, `styles.css`, and the built `main.js` inside the vault, while the only source tree remains under `apps/`.

If the link is removed, recreate it from the repository root on macOS:

```sh
mkdir -p dev-vault/.obsidian/plugins
ln -s ../../../apps/obsidian-capture dev-vault/.obsidian/plugins/obsidian-ui-atlas
```

If a real directory occupies that path, inspect its contents before removing it; the command above intentionally will not overwrite it. The link is tracked by Git and normally returns with a clone or checkout.

## Project layout

- `apps/obsidian-capture/`: current plugin source and build configuration.
- `apps/figma-plugin/`: future Figma importer placeholder.
- `packages/ui-schema/`: initial shared TypeScript snapshot contract.
- `skills/obsidian-ui/`: future agent skill placeholder.
- `dev-vault/`: isolated Obsidian test vault.
- `docs/`: project documentation.
- `scripts/`: standalone semantic snapshot comparison CLI and tests.

The plugin ID matches the local folder name. Obsidian's current [manifest rules](https://docs.obsidian.md/Reference/Manifest) disallow `obsidian` in IDs submitted to the community directory; rename the ID and folder together if publication becomes a goal.
