# Project guidance

## Purpose and scope

This monorepo captures and describes the current Obsidian UI so that a future Figma library and a future coding-agent skill can use the same structured representation. The Obsidian UI Atlas workspace view renders public API specimens and exports a minimal structured snapshot.

## Directory roles

- `apps/obsidian-ui-atlas/` is the real source and build location for **Obsidian UI Atlas** (`id: obsidian-ui-atlas`). The plugin's `manifest.json`, `styles.css`, and generated `main.js` live here.
- `apps/obsidian-ui-system-figma/` contains **Obsidian UI System** for Figma Design. Its normal input is one ZIP exported by **Export Obsidian UI Figma Package**; Button and Search are the only authorized component pilots. Add another component only after a new milestone request.
- `packages/ui-schema/` holds the initial generic TypeScript snapshot contract. Refine it as capture evidence grows.
- `skills/obsidian-ui/` is reserved for the future coding-agent skill. Do not implement it yet.
- `dev-vault/` is only an Obsidian execution and test vault, not a source archive. Its plugin entry is a relative symlink to `apps/obsidian-ui-atlas/`; do not create a second code copy there. Final ZIPs live under `obsidian-ui-exports/figma-packages/`; technical captures and reports live under hidden `.obsidian-ui-system/`. Both are local and ignored by Git.
- `docs/` holds maintained public documentation. Keep `docs/README.md` as the index. Use `docs/obsidian-ui-atlas/atlas/` for registry, inventory, and snapshot guides; `docs/obsidian-ui-atlas/layout-lab/` for measurement and inference; `docs/obsidian-ui-atlas/snapshot-diff/` for the comparison CLI; `docs/obsidian-ui-system-figma/components/` for native Figma component reconstruction; and `docs/integration/figma-package/` for the cross-app ZIP contract.
- `private/` is local and ignored by Git. Keep implementation plans in `private/plans/`. Put investigations, dated validation records, and experimental models in `private/docs/` under the same product and topic structure as `docs/`. Cross-app checkpoints and transfer evidence belong under `private/docs/integration/`.
- `scripts/snapshot-diff/` contains the standalone snapshot comparison CLI and its tests. It reads Atlas exports and writes local `dev-vault/.obsidian-ui-system/snapshot-diffs/` reports; it does not run in the Obsidian plugin.

## Documentation organization

- Before adding a document, decide whether it is a maintained public guide or local development evidence. Public docs describe current behavior, contracts, methods, limits, and reusable rules. Plans, session notes, one-off probes, experimental JSON, and dated run reports go in `private/`.
- Choose both the named product and the narrow topic before writing: Atlas, Layout Lab, snapshot diff, Figma components, or integration. Put a cross-plugin ZIP or schema handoff in `integration/`. Add a new topic folder when its subject does not fit the existing ones; do not use a product root as a catch-all or duplicate a document across areas.
- Any planning workflow or skill, including Superpowers and `writing-plans`, must write implementation plans to `private/plans/` with a date and topic in the filename. Never create `docs/superpowers/plans/` or another tracked plans folder. Do not create a plan merely to record a small direct edit.
- Keep public navigation in `docs/README.md` and update links when moving files. Before committing, check that public links resolve, `private/` is ignored, and no plan or research artifact is staged.
- Paths recorded in dated private documents may describe an older checkout. Use the current source tree and public index for operational paths.
- Do not keep Git bundles or other temporary rollback files after a history operation has been verified unless the user explicitly asks to retain them.

## Generated artifacts

- Keep `scripts/` for maintained source, configuration, and tests. Do not put dated captures, comparison reports, or investigation output there. Commit a fixture only when an automated test consumes it and needs it to reproduce behavior.
- `.build/` is ignored, disposable build output. Regenerate it with the relevant build command; remove leftover investigative build files when work ends.
- Keep deliberate Atlas and Layout Lab exports and default snapshot diff reports under the ignored `dev-vault/.obsidian-ui-system/` area. They remain there until explicit cleanup. Every new command that writes a retained diagnostic artifact must state its destination and retention behavior to the user. For a custom output path, check Git tracking before committing.

## Architecture rules

- Keep one Git repository at the root. Do not initialize nested repositories.
- App directory names follow the names shown in Obsidian and Figma; plugin IDs and npm workspace names are separate stable identifiers. If an app directory moves, update the lockfile, root scripts, ignore rules, development-vault symlink, local workspace links, and documentation references together.
- Do not make a public document depend on a file under `private/`. When private evidence changes a durable project rule, summarize that rule and its limits in the relevant public document. Keep reproducible test fixtures and versioned contracts in their existing source/test locations rather than moving them to `private/` solely because they are JSON.
- Capture, Figma, and the future agent skill should eventually share the same versioned schema rather than separate interpretations.
- Keep the schema generic for Obsidian plugin interface development. Do not couple it to Qualia or any other individual plugin.
- Preserve the distinction between observed Obsidian UI, inferred abstractions, and generated outputs when designing future capture data.
- Follow the coverage in `docs/obsidian-ui-atlas/atlas/public-ui-inventory.md`. Define specimens once in `component-registry.ts`; the Atlas renderer and capture both consume those definitions. Batch 6 is complete: three contextual API specimens were added, while `HoverPopover` remains limited by its public lifecycle. Do not add internal-observed APIs, additional Figma components, or the agent skill without a new milestone request.
- The public API capture phase is closed at 26 families and 59 specimens. Button and Search are the two validated Figma pilots. Treat other missing fields as evidence-gated capture candidates, not as authorization for a full importer. The internal-observed backlog remains separate.
- The Obsidian Command Palette export builds a consistent Figma Package ZIP from Atlas and Layout Lab without opening either view. The Figma Custom UI imports that ZIP and offers one **Generate UI Kit** action. Individual Atlas/Lab exports remain for development and diagnosis, not the normal importer input.
- The Package Builder owns its staging and removes recognized orphaned partials before a new run. Handled failures write small records under `.obsidian-ui-system/package-failures/`. **Developer: Clean Obsidian UI Development Exports** is optional maintenance for explicit Atlas/Lab exports and diff reports; it must never remove final ZIPs or package failure diagnostics. No cleanup command belongs to the normal package workflow.
- Layout Lab writes its separate `layout.json` export under ignored `dev-vault/.obsidian-ui-system/layout-lab-exports/`. Experimental Figma-ready models are local research artifacts, not the public schema. Preserve unknown sizing decisions until content and viewport tests support them.
- `docs/obsidian-ui-atlas/layout-lab/layout-lab.md` explains the two workspace views: Atlas owns canonical specimens and official snapshots; Layout Probe Lab owns experimental fixtures, measurements, inference and `layout.json`. The Lab opens with **Open Obsidian UI Layout Lab** and never runs as part of Atlas export.
- Layout Lab code is split into `layout-lab.ts` (view), `layout-probes.ts` (declarations), `layout-capture.ts` (DOM/CSSOM and export) and `layout-inference.ts` (pure inference). Do not reintroduce probe imports into `catalog.ts`.
- `docs/obsidian-ui-atlas/layout-lab/layout-inference.md` documents the generalized experimental suite for Button, Search, Dropdown, Slider and Setting. The suite lives in `layout-probes.ts`, and the pure inference lives in `layout-inference.ts`; both remain separate from `ui-schema`. Preserve evidence/confidence and unknowns, and never add component-ID exceptions just to force classifications.
- Preserve every canonical public registry component and variant during experimental cleanup. Probe-only fixtures may be replaced when their evidence remains covered by tests or maintained documentation.
- Compare exports by `(id, variant)` and token name in `scripts/snapshot-diff/snapshot-diff.ts`; keep the comparison format separate from the snapshot schema until there is evidence to merge them.
- Treat Obsidian-generated vault settings as local state. Keep only the relative plugin symlink under `dev-vault/.obsidian/` in Git.
- Keep the `.hotreload` marker in the Capture source. Hot-Reload itself is an ignored local development dependency inside `dev-vault/.obsidian/plugins/hot-reload/`.

## Figma component reconstruction workflow

- Before changing the Figma importer or starting another component, read `docs/obsidian-ui-system-figma/components/component-reconstruction.md` alongside the relevant skills. Update that reference only when a new rule is reusable across components, not for conversation history or one-off probe results.
- Use `figma-generative-plugins` when changing the plugin. Also use `figma-use` for Figma Plugin API work, and `figma-generate-library` whenever creating or changing components, Component Sets, variants, component properties, bindings, Auto Layout, or resize behavior.
- Use local `@figma/plugin-typings` and those skills' API references as the primary sources. Search the web only for a real gap in those sources or to verify a recent API change.
- Keep observed Atlas data, Layout Lab inference, the experimental Figma-ready model, and generated Figma nodes distinct. Do not turn an unproven sizing or anatomy claim into a component rule. Preserve already validated Button and Search behavior when working on later components.
- Close a component only after TypeScript/build/tests and manual Figma Desktop checks for native nodes, variants, instance properties, resizing, clipping, icons, typography, and the intended text edit behavior. Record clearly which checks remain manual or pending.

## Obsidian UI validation workflow

- The user operates the Obsidian interface. Do not take focus or control of their Mac to open the Atlas or click Export unless they explicitly ask.
- After a build, tell the user when the Atlas or Layout Lab is ready. Hot Reload may close either tab, so they may need to run the matching command again.
- While the agent's turn is active, check `dev-vault/.obsidian-ui-system/ui-catalog-exports/` for a canonical snapshot and `dev-vault/.obsidian-ui-system/layout-lab-exports/` for a Lab measurement. Validate files directly. Do not repeatedly ask the user to confirm a successful export when the files provide that evidence.
- If no new export appears or the UI reports an error that is not available in files, ask the user for the exact message or a screenshot.
- An export does not automatically wake the agent after its turn ends; there is no background folder monitoring between turns.
