# Project guidance

## Purpose and scope

This monorepo captures and describes the current Obsidian UI so that a future Figma library and a future coding-agent skill can use the same structured representation. The current milestone is only a working development environment and a minimal capture plugin.

## Directory roles

- `apps/obsidian-capture/` is the real source and build location for the TypeScript Obsidian plugin. The plugin's `manifest.json` and generated `main.js` live here.
- `apps/figma-plugin/` is reserved for a future Figma importer. Do not implement it yet.
- `packages/ui-schema/` is reserved for the shared UI schema. Define it only when capture evidence supports a generic contract.
- `skills/obsidian-ui/` is reserved for the future coding-agent skill. Do not implement it yet.
- `dev-vault/` is only a disposable Obsidian execution and test vault, not a source or data archive. Its plugin entry is a relative symlink to `apps/obsidian-capture/`; do not create a second code copy there.
- `docs/` holds maintained project documentation.

## Architecture rules

- Keep one Git repository at the root. Do not initialize nested repositories.
- Capture, Figma, and the future agent skill should eventually share the same versioned schema rather than separate interpretations.
- Keep the schema generic for Obsidian plugin interface development. Do not couple it to Qualia or any other individual plugin.
- Preserve the distinction between observed Obsidian UI, inferred abstractions, and generated outputs when designing future capture data.
- Do not expand the current minimal command/modal into a full catalog or component extractor in this milestone.
- Treat Obsidian-generated vault settings as local state. Keep only the relative plugin symlink under `dev-vault/.obsidian/` in Git.
