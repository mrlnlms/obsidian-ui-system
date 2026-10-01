# Obsidian UI System

A monorepo that captures the public Obsidian UI and imports the validated Button and Search pilots into Figma Design. The **Obsidian UI Atlas** plugin renders 26 public API families and exports canonical snapshots.

## Current Figma workflow

In Obsidian Desktop, run **Export Obsidian UI Figma Package** from the Command Palette. The Atlas and Layout Lab tabs can remain closed. This creates one ZIP in `dev-vault/obsidian-ui-exports/figma-packages/` from a consistent Atlas capture and Layout Lab run.

The ZIP is ready when the command reports success. The export cleans its own staging files; no cleanup command is needed afterward. A failed run records a small diagnostic under `dev-vault/.obsidian-ui-system/package-failures/` and reports its path.

In Figma Desktop, run the local **Obsidian UI System** plugin, **Choose ZIP** in **Figma Package**, then click **Generate UI Kit**. It creates the validated `Obsidian / Button` and `Obsidian / Search` Component Sets in `Actions` and `Inputs` sections. See the [Figma plugin installation guide](apps/figma-plugin/README.md) and [package format](docs/figma-package.md).

To install the local importer, open a Figma Design file in **Figma Desktop**, choose **Plugins → Development → Import plugin from manifest** (or the equivalent **Import new plugin from manifest…** action), and select `<repository>/apps/figma-plugin/manifest.json`. On macOS, **SF Pro / Regular** must be available and render in Figma Desktop: choose it on a text layer and accept Apple's license prompt if shown. If absent, install SF Pro from Apple's official font distribution and restart Figma. The importer stops without generating if the font requirement fails; it does not substitute another family. Then run the development plugin, choose the exported ZIP and click **Generate UI Kit**.

## Requirements and installation

- macOS with [Obsidian](https://obsidian.md/) Desktop and Figma Desktop installed.
- Node.js 22 or newer and npm 10 or newer.
- Git.

From the repository root:

```sh
npm ci
npm run build
```

The build writes `apps/obsidian-capture/main.js`, `apps/figma-plugin/dist/code.js`, and the snapshot comparison CLI under `.build/snapshot-diff/`. These outputs are ignored by Git, so build after cloning and before opening either plugin.

## Open the development vault

In Obsidian, choose **Open folder as vault** and select exactly:

```text
<repository>/dev-vault
```

This vault is for development and tests only; Obsidian may generate local settings in `.obsidian/`, which are ignored.

## Develop the plugin

Run `npm run dev` at the repository root to rebuild `main.js` when `apps/obsidian-capture/src/` changes. For a one-time production build, run `npm run build`; `npm run check` runs TypeScript checks only. The development vault also has [Hot-Reload](https://github.com/pjeby/hot-reload) installed. Once you enable it in Obsidian, the tracked `.hotreload` marker in the Capture plugin makes Hot-Reload reload that plugin after each rebuild. Atlas and Lab tabs close during plugin reload because the views are detached on unload; run their commands again to reopen them. Changes to `manifest.json` may still require an Obsidian restart.

In the development vault, open **Settings → Community plugins**, allow community plugins if prompted, then enable **Obsidian UI Atlas**. Enable **Hot Reload** there only if it is installed locally. Run **Open Obsidian UI Atlas** from the Command Palette. It opens or reveals one scrollable workspace tab containing canonical registry specimens. Press **Export snapshot** for an individual Atlas export. The plugin requires Obsidian 1.13.1 or newer for `DisplayValueComponent` support.

Each export creates a timestamped folder at `dev-vault/.obsidian-ui-system/ui-catalog-exports/<UTC timestamp>/` with `manifest.json`, `tokens.json`, and `components.json`. The manifest distinguishes the runtime Obsidian API version from the installed `obsidian` SDK package version and the snapshot schema version. These local outputs are ignored by Git. The [schema package](packages/ui-schema/README.md) describes the contract; [snapshot guide](docs/atlas-snapshot.md) explains what the export measures and its current limits. See the [registry guide](docs/component-registry.md) to add a component or variant.

## Compare two exports

Run the semantic snapshot diff from the repository root:

```sh
npm run diff:snapshots -- <before-export-folder> <after-export-folder> [output-folder]
```

The command writes `diff.json` and `diff.md`. Without an output argument, it uses an ignored folder under `dev-vault/.obsidian-ui-system/snapshot-diffs/`. It compares specimens by `id + variant`, tokens by custom property name, and manifest fields separately. See the [comparison guide](docs/snapshot-diff.md) for an example using two real exports and an explanation of the categories.

The manifest records Light or Dark mode; specimen identity remains `id + variant`. Compare exports from matching environments when assessing component changes. The [public UI inventory](docs/public-ui-inventory.md) lists the 26 captured families and the current public API boundary.

The [Layout Probe Lab](docs/layout-lab.md) is a separate technical workspace view. Open it with **Open Obsidian UI Layout Lab**. It measures registry definitions for Button, Search, Dropdown, Slider and Setting in controlled hosts, displays experimental sizing classifications, and saves `layout.json` under ignored `dev-vault/.obsidian-ui-system/layout-lab-exports/<UTC timestamp>/`. The Lab has its own **Measure layout probes** and **Export layout probes** actions. Atlas **Export snapshot** does not run probes or write into the Lab export directory. The [inference analysis](docs/layout-inference.md) records current evidence and unknowns.

The individual Atlas and Lab exports above remain available for development and diagnosis; the ZIP is the normal Figma transfer artifact.

`dev-vault/obsidian-ui-exports/` contains final packages you may keep or delete. `dev-vault/.obsidian-ui-system/` contains hidden development captures, diff reports, package staging, and failure diagnostics. **Developer: Clean Obsidian UI Development Exports** is an optional maintenance command for individual Atlas/Lab exports and diff reports. It asks for confirmation and leaves both Figma Packages and failure diagnostics untouched. It is not part of package export; there is no automatic retention policy for deliberate development exports.

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
- `apps/figma-plugin/`: Figma Design importer for the Button and Search pilots; see its [local installation guide](apps/figma-plugin/README.md) and [component reconstruction reference](docs/figma-component-reconstruction.md).
- `packages/ui-schema/`: initial shared TypeScript snapshot contract.
- `skills/obsidian-ui/`: future agent skill placeholder.
- `dev-vault/`: isolated Obsidian test vault.
- `docs/`: maintained documentation for users and contributors; see the [index](docs/README.md).
- `private/`: local, Git-ignored plans, research notes, and experimental models.
- `scripts/`: standalone semantic snapshot comparison CLI and tests.

## Verification commands

From the repository root, run TypeScript checks, all builds and the existing test suites:

```sh
npm run check
npm run build
npm run test:diff
npm run test:layout
npm run test:typography --workspace @obsidian-ui-system/capture
npm run test:package --workspace @obsidian-ui-system/capture
npm run test:exports --workspace @obsidian-ui-system/capture
npm run test:lifecycle --workspace @obsidian-ui-system/capture
npm run test:font --workspace @obsidian-ui-system/figma-plugin
npm run test:search --workspace @obsidian-ui-system/figma-plugin
npm run test:ui-kit --workspace @obsidian-ui-system/figma-plugin
npm run test:package --workspace @obsidian-ui-system/figma-plugin
```
