# Project guidance

## Purpose and scope

This monorepo captures and describes the current Obsidian UI so that a future Figma library and a future coding-agent skill can use the same structured representation. The Obsidian UI Atlas workspace view renders three public API components and exports a minimal structured snapshot.

## Directory roles

- `apps/obsidian-capture/` is the real source and build location for the TypeScript Obsidian UI Atlas plugin (`id: obsidian-ui-atlas`). The plugin's `manifest.json`, `styles.css`, and generated `main.js` live here.
- `apps/figma-plugin/` is reserved for a future Figma importer. Do not implement it yet.
- `packages/ui-schema/` holds the initial generic TypeScript snapshot contract. Refine it as capture evidence grows.
- `skills/obsidian-ui/` is reserved for the future coding-agent skill. Do not implement it yet.
- `dev-vault/` is only an Obsidian execution and test vault, not a source archive. Its plugin entry is a relative symlink to `apps/obsidian-capture/`; do not create a second code copy there. Timestamped `ui-catalog-exports/` outputs stay local and ignored by Git.
- `docs/` holds maintained project documentation.

## Architecture rules

- Keep one Git repository at the root. Do not initialize nested repositories.
- Capture, Figma, and the future agent skill should eventually share the same versioned schema rather than separate interpretations.
- Keep the schema generic for Obsidian plugin interface development. Do not couple it to Qualia or any other individual plugin.
- Preserve the distinction between observed Obsidian UI, inferred abstractions, and generated outputs when designing future capture data.
- Keep the Atlas limited to public API Button, Search, and Toggle components in this milestone. Do not add Figma integration or the agent skill yet.
- Treat Obsidian-generated vault settings as local state. Keep only the relative plugin symlink under `dev-vault/.obsidian/` in Git.
- Keep the `.hotreload` marker in the Capture source. Hot-Reload itself is an ignored local development dependency inside `dev-vault/.obsidian/plugins/hot-reload/`.
