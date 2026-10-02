# Developing Obsidian UI System

This guide covers the local monorepo workflow: build the plugins, work in the Obsidian test vault, inspect individual exports, compare captures, and run checks. For the normal Mapping-to-Figma transfer and its data contract, see the [Figma Package guide](integration/figma-package/figma-package.md).

## Local requirements and setup

- macOS with [Obsidian](https://obsidian.md/) Desktop and Figma Desktop installed for the current local workflow.
- Node.js 22 or newer, npm 10 or newer, and Git.
- Obsidian 1.13.1 or newer for the Mapping `DisplayValueComponent` specimens.
- For CLI-driven runtime checks, use the [Obsidian CLI](https://obsidian.md/help/cli) from a current macOS installer. Make sure `obsidian` resolves to the `obsidian-cli` binary, then verify with `obsidian vault=dev-vault version`.

From the repository root:

```sh
npm ci
npm run build
```

The build writes `apps/obsidian-ui-mapping/main.js`, `apps/obsidian-ui-system-figma/dist/code.js`, the snapshot comparison CLI under `.build/snapshot-diff/`, and the Package v2 CLI under `.build/figma-package-v2/`. These outputs are ignored by Git and can be regenerated. `npm run check` runs TypeScript checks without building.

## Obsidian development vault and Mapping

In Obsidian, choose **Open folder as vault** and select exactly `<repository>/dev-vault`. This vault is for execution and tests, not a source archive. Obsidian may generate local settings under `.obsidian/`; those settings are ignored by Git.

For CLI commands, put `vault=dev-vault` immediately after `obsidian` (for example, `obsidian vault=dev-vault commands`). Never open the repository root as a vault or rely on current-directory vault selection; the root and development vault are nested paths.

Open **Settings → Community plugins**, allow community plugins if prompted, and enable **Obsidian UI Mapping**. When migrating an existing vault, the new plugin ID requires enabling Mapping once. Run **Open Obsidian UI Mapping** from the Command Palette. The command opens or reveals one scrollable workspace tab with the canonical registry specimens. Press **Export snapshot** for an individual Mapping export.

Each export creates `dev-vault/.obsidian-ui-system/ui-catalog-exports/<UTC timestamp>/` with `manifest.json`, `tokens.json`, `token-evidence.json`, `components.json`, and `capture-context.json`. The manifest records the runtime Obsidian API version, the installed SDK package version used at build time, and the snapshot schema version separately. The versioned token evidence file preserves CSSOM declarations, references, computed values, and uncertainty for the captured mode; `tokens.json` is its compatibility projection. The technical context sidecar records the installed Mapping `main.js` SHA-256, window viewport, and that capture's manifest. Exports are local and ignored by Git. The [schema package](../packages/ui-schema/README.md), [snapshot guide](obsidian-ui-mapping/capture/snapshot.md), and [component registry guide](obsidian-ui-mapping/capture/component-registry.md) describe their contract and limits.

`ui-catalog-exports/` remains the stable technical directory for individual specimen exports, including existing local captures. It names that export type, not the Mapping product.

### Develop with Hot Reload

Run `npm run dev` from the repository root to rebuild `main.js` when `apps/obsidian-ui-mapping/src/` changes. The local [Hot Reload](https://github.com/pjeby/hot-reload) plugin watches the tracked `.hotreload` marker in the Mapping source. Enable Hot Reload under **Community plugins** when it is installed locally.

For the Button normal binding evidence, run **Developer: Diagnose Button and Search token bindings** in each appearance mode. The command opens Mapping, recreates its specimens, and writes one ignored `binding-diagnostic-<mode>-<timestamp>.json` per run alongside the ZIPs in `dev-vault/obsidian-ui-exports/figma-packages/`. It inspects applicable CSSOM property declarations, temporarily overrides only the proposed custom property on each target element, reads the computed property, and restores the original inline state. Inspect `verification.restoredExactly` and `status` for the three Button normal properties; for `color`, also inspect the `alias` response for `--text-color → --text-normal`. The command still records the previously established CTA and Search cases, which this Button action does not consume. These diagnostics are retained until manually removed; the development export cleanup command does not remove them. Each JSON remains an independent diagnostic capture, outside every Figma Package ZIP.

The validated first File Explorer row probe remains available as **Developer: Probe internal File Explorer row** (`vault=dev-vault command id=obsidian-ui-mapping:probe-internal-file-explorer-row`). It writes a standalone `internal-observed-probe-<UTC timestamp>.json` next to the ZIPs, outside the public API catalog and Figma Package. Probe files are ignored by Git and kept until manually removed. See [internal UI scope and inventory](obsidian-ui-mapping/capture/internal-observed.md) before extending this work.

The same probe includes visible Dark folder rows at observed depths 0–2 in `folderRows`. In the Figma plugin, use this probe JSON with **Generate folder rows (Dark, Depth 0–2)**; it does not use a Package ZIP. `npm run test:folder-row --workspace @obsidian-ui-system/figma-plugin` checks the specific folder reader.

The one-scene `view-header-probe-2026-10-02.json` is retained next to the ZIPs; a tracked copy in the Figma plugin's `tests/fixtures/` supports the bounded View Header reader test. Select this JSON in **View Header probe JSON** and click **Generate View Header** in the Figma plugin. It does not use a Package ZIP. The probe is development evidence retained until manual removal, not a public catalog or Package export.

A reload can close Mapping and Layout Lab tabs because the plugin detaches its views on unload; run the matching Command Palette action to reopen them. A change to `manifest.json` may still require an Obsidian restart. For a one-time production build, use `npm run build`.

Hot Reload is an ignored local dependency at `dev-vault/.obsidian/plugins/hot-reload/`. To reinstall the pinned version after cloning, run from the repository root:

```sh
mkdir -p dev-vault/.obsidian/plugins/hot-reload
curl -fL https://github.com/pjeby/hot-reload/releases/download/0.3.1/manifest.json -o dev-vault/.obsidian/plugins/hot-reload/manifest.json
curl -fL https://github.com/pjeby/hot-reload/releases/download/0.3.1/main.js -o dev-vault/.obsidian/plugins/hot-reload/main.js
```

### Why the vault uses a symlink

Obsidian loads local plugins from `<vault>/.obsidian/plugins/<plugin-id>/`. The tracked relative link at `dev-vault/.obsidian/plugins/obsidian-ui-mapping` points to `../../../apps/obsidian-ui-mapping` from its containing directory. Obsidian therefore loads `manifest.json`, `styles.css`, and the generated `main.js` from the one source tree under `apps/`.

If the link is missing, recreate it from the repository root on macOS:

```sh
mkdir -p dev-vault/.obsidian/plugins
ln -s ../../../apps/obsidian-ui-mapping dev-vault/.obsidian/plugins/obsidian-ui-mapping
```

Inspect a real directory at that path before removing it; the command does not overwrite an existing entry. The link is tracked by Git and normally returns with a clone or checkout. Keep only this relative plugin link under `dev-vault/.obsidian/` in Git.

## Layout Probe Lab and individual exports

**Open Obsidian UI Layout Lab** opens a separate workspace view. It measures Button, Search, Dropdown, Slider, and Setting registry definitions in controlled hosts, with experimental sizing classifications. Use **Measure layout probes** to inspect measurements in the view and **Export layout probes** to save `layout.json` under `dev-vault/.obsidian-ui-system/layout-lab-exports/<UTC timestamp>/`.

Mapping **Export snapshot** does not run the Lab or write to its export directory. The two individual export commands are for development and diagnosis; the Figma Package ZIP is the normal transfer artifact. The [Lab guide](obsidian-ui-mapping/layout-lab/layout-lab.md) explains the view and measurements, and the [inference guide](obsidian-ui-mapping/layout-lab/layout-inference.md) records the current evidence and unknowns.

For a controlled appearance pair, export Mapping and Layout Lab once in Dark and once in Light without rebuilding the plugin or resizing the Obsidian window. Each of the four timestamped folders contains `capture-context.json`; compare its build hash, viewport, runtime/SDK/schema versions, platform, and mode. The two Layout exports preserve raw visual observations separately. Select one Layout export as the inference source and record its mode and `environment.capturedAt`; this does not create two layout models. Restore the original appearance after capture. Community theme name is still `null`, so matching technical context does not prove that an unreported theme or snippet setting stayed unchanged.

## Semantic snapshot diff

Compare two complete Mapping export folders from the repository root:

```sh
npm run diff:snapshots -- \
  dev-vault/.obsidian-ui-system/ui-catalog-exports/BEFORE_TIMESTAMP \
  dev-vault/.obsidian-ui-system/ui-catalog-exports/AFTER_TIMESTAMP
```

Replace the timestamp names with two existing export folders. An optional third argument selects another output directory. By default the command writes `diff.json` and `diff.md` under the ignored `dev-vault/.obsidian-ui-system/snapshot-diffs/<before-folder>__<after-folder>/`. Default reports remain there until explicit cleanup or manual removal; a custom output path may be tracked by Git.

The CLI compares specimens by `id + variant`, tokens by CSS custom property name, and manifest fields separately. For a component comparison, use exports from matching environments: Light/Dark mode, viewport, and platform can change styles or measurements. The [snapshot diff guide](obsidian-ui-mapping/snapshot-diff/snapshot-diff.md) has the comparison rules and output details.

## Figma Package and local artifacts

Run **Export Obsidian UI Figma Package** in the Obsidian Command Palette to build one consistent ZIP from Mapping and Lab without opening either view. The completed ZIP goes to `dev-vault/obsidian-ui-exports/figma-packages/`; the command reports its path. The builder removes its own staging file after a successful transfer, so package generation needs no follow-up cleanup. A handled failure writes a small diagnostic under `dev-vault/.obsidian-ui-system/package-failures/` and reports that path. The [package guide](integration/figma-package/figma-package.md) describes the format and failure behavior.

To assemble a multi-mode Package v2 from four **existing** individual export folders, run from the repository root:

```sh
npm run package:v2 -- \
  --dark-mapping dev-vault/.obsidian-ui-system/ui-catalog-exports/DARK_MAPPING_TIMESTAMP \
  --dark-layout dev-vault/.obsidian-ui-system/layout-lab-exports/DARK_LAYOUT_TIMESTAMP \
  --light-mapping dev-vault/.obsidian-ui-system/ui-catalog-exports/LIGHT_MAPPING_TIMESTAMP \
  --light-layout dev-vault/.obsidian-ui-system/layout-lab-exports/LIGHT_LAYOUT_TIMESTAMP \
  --inference-source dark
```

The CLI validates the four `capture-context.json` files and their sibling artifacts, then writes an exclusively created `obsidian-ui-package-v2-<assembly timestamp>.zip` in the same ignored package directory. Mapping and Layout Lab timestamps may differ. `--inference-source` can be `dark` or `light` and defaults to `dark`; `--output PATH` optionally chooses another destination. Source folders and final ZIPs remain until manual removal. The main Figma plugin accepts v2 only for [generating Button normal with three bound Variables](../apps/obsidian-ui-system-figma/README.md#real-button-normal-from-package-v2); its full Button/Search UI Kit action still uses v1.

To install, configure, and run the local Figma importer, follow the [Figma plugin guide](../apps/obsidian-ui-system-figma/README.md). On macOS, SF Pro / Regular must be available and render in Figma Desktop; the importer stops if that requirement fails. The Figma guide contains the font activation and plugin installation steps.

`dev-vault/obsidian-ui-exports/figma-packages/` holds final ZIPs, standalone binding diagnostic JSONs, and the `internal-observed` probe JSON; keep or delete these manually. Hidden `dev-vault/.obsidian-ui-system/` holds the existing technical Mapping/Lab exports, diff reports, package staging, and failure diagnostics. Both areas are ignored by Git. **Developer: Clean Obsidian UI Development Exports** is optional maintenance: it shows counts, asks for confirmation, and removes individual Mapping/Lab exports and diff reports. It leaves final Figma Packages, standalone diagnostics, and failure diagnostics untouched. Deliberate development exports have no automatic retention policy.

## Verification commands

From the repository root:

```sh
npm run check
npm run build
npm run test:diff
npm run test:layout
npm run test:typography --workspace @obsidian-ui-system/mapping
npm run test:context --workspace @obsidian-ui-system/mapping
npm run test:tokens --workspace @obsidian-ui-system/mapping
npm run test:bindings --workspace @obsidian-ui-system/mapping
npm run test:package --workspace @obsidian-ui-system/mapping
npm run test:package:v2 --workspace @obsidian-ui-system/mapping
npm run test:exports --workspace @obsidian-ui-system/mapping
npm run test:lifecycle --workspace @obsidian-ui-system/mapping
npm run test:font --workspace @obsidian-ui-system/figma-plugin
npm run test:search --workspace @obsidian-ui-system/figma-plugin
npm run test:file-explorer-row --workspace @obsidian-ui-system/figma-plugin
npm run test:view-header --workspace @obsidian-ui-system/figma-plugin
npm run test:ui-kit --workspace @obsidian-ui-system/figma-plugin
npm run test:package --workspace @obsidian-ui-system/figma-plugin
npm run test:variables --workspace @obsidian-ui-system/figma-plugin
```

TypeScript checks and automated tests validate code paths. Mapping exports require Obsidian Desktop, and Figma component behavior still requires manual checks in Figma Desktop; see the [component reconstruction guide](obsidian-ui-system-figma/components/component-reconstruction.md).
