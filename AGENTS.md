# Project guidance

## Purpose and scope

This monorepo captures and describes the current Obsidian UI so that a future Figma library and a future coding-agent skill can use the same structured representation. The Obsidian UI Atlas workspace view renders public API specimens and exports a minimal structured snapshot.

## Directory roles

- `apps/obsidian-capture/` is the real source and build location for the TypeScript Obsidian UI Atlas plugin (`id: obsidian-ui-atlas`). The plugin's `manifest.json`, `styles.css`, and generated `main.js` live here.
- `apps/figma-plugin/` is reserved for a future Figma importer. Do not implement it yet.
- `packages/ui-schema/` holds the initial generic TypeScript snapshot contract. Refine it as capture evidence grows.
- `skills/obsidian-ui/` is reserved for the future coding-agent skill. Do not implement it yet.
- `dev-vault/` is only an Obsidian execution and test vault, not a source archive. Its plugin entry is a relative symlink to `apps/obsidian-capture/`; do not create a second code copy there. Timestamped `ui-catalog-exports/` outputs stay local and ignored by Git.
- `docs/` holds maintained project documentation.
- `scripts/` contains the standalone snapshot comparison CLI. It reads Atlas exports and writes local `snapshot-diffs/` reports; it does not run in the Obsidian plugin.

## Architecture rules

- Keep one Git repository at the root. Do not initialize nested repositories.
- Capture, Figma, and the future agent skill should eventually share the same versioned schema rather than separate interpretations.
- Keep the schema generic for Obsidian plugin interface development. Do not couple it to Qualia or any other individual plugin.
- Preserve the distinction between observed Obsidian UI, inferred abstractions, and generated outputs when designing future capture data.
- Follow the batches in `docs/public-ui-inventory.md`. Define specimens once in `component-registry.ts`; the Atlas renderer and capture both consume those definitions. Batch 6 is complete: three contextual API specimens were added, while `HoverPopover` remains limited by its public lifecycle. Do not add internal-observed APIs, Figma integration, or the agent skill without a new milestone request.
- The public API capture phase is closed in `docs/public-api-phase-complete.md`. `docs/figma-readiness.md` assesses six specimens against editable and responsive reconstruction. Treat its missing fields as evidence-gated capture candidates, not as authorization to change the schema or implement the Figma importer. The internal-observed backlog remains separate.
- `docs/layout-spike.md` records a bounded Button/Search experiment in 240px/480px hosts and a 160px long-label Button probe. Its separate `layout.json` export lives under ignored `dev-vault/layout-spike-exports/`; `docs/layout-spike-model.experimental.json` is not the public schema. Preserve unknown sizing decisions until content/viewport tests support them.
- `docs/layout-inference.md` documents the generalized experimental suite for Button, Search, Dropdown, Slider and Setting. The suite lives in `layout-probes.ts`, and the pure inference lives in `layout-inference.ts`; both remain separate from `ui-schema`. Preserve evidence/confidence and unknowns, and never add component-ID exceptions just to force classifications.
- Preserve every canonical public registry component and variant during experimental cleanup. Probe-only fixtures may be replaced when their evidence remains covered by tests or maintained documentation. In the next iteration, expose layout probes through a separate Obsidian command instead of tying that workflow to the main Atlas command.
- Compare exports by `(id, variant)` and token name in `scripts/snapshot-diff.ts`; keep the comparison format separate from the snapshot schema until there is evidence to merge them.
- Treat Obsidian-generated vault settings as local state. Keep only the relative plugin symlink under `dev-vault/.obsidian/` in Git.
- Keep the `.hotreload` marker in the Capture source. Hot-Reload itself is an ignored local development dependency inside `dev-vault/.obsidian/plugins/hot-reload/`.

## Obsidian UI validation workflow

- The user operates the Obsidian interface. Do not take focus or control of their Mac to open the Atlas or click Export unless they explicitly ask.
- After a build, tell the user when the Atlas is ready. Hot Reload may close its tab, so they may need to run **Open Obsidian UI Atlas** again.
- While the agent's turn is active, check `dev-vault/ui-catalog-exports/` for the new timestamped export and validate its files directly. Do not repeatedly ask the user to confirm a successful export when the files provide that evidence.
- If no new export appears or the UI reports an error that is not available in files, ask the user for the exact message or a screenshot.
- An export does not automatically wake the agent after its turn ends; there is no background folder monitoring between turns.
