# Development vault

This vault runs the Obsidian UI Mapping plugin, its separate Layout Lab view, and the **Export Obsidian UI Figma Package** command. Its Obsidian settings are local state; only the relative plugin symlink is tracked.

`internal-observed-fixtures/Properties probe.md` is a tracked test note: its YAML exposes real Properties rows, and its folder exposes a header breadcrumb. Its note text and YAML values are sample content, not component definitions or generated captures.

`obsidian-ui-exports/figma-packages/` holds final ZIP transfer artifacts for the Figma importer and standalone diagnostic JSONs, including the first `internal-observed` probe. Keep or delete these local artifacts when they are no longer needed.

The normal workflow is **Export Obsidian UI Figma Package → ZIP ready**. The Package Builder removes its own staging files on success or handled failure and checks for its orphaned partials before the next export. Handled failures leave a small record in `.obsidian-ui-system/package-failures/`. No cleanup command is needed after an export.

`.obsidian-ui-system/` is a hidden technical area with individual Mapping captures (`ui-catalog-exports/`), Layout Lab captures (`layout-lab-exports/`), semantic diff reports (`snapshot-diffs/`), package staging (`package-staging/`), and failure records (`package-failures/`). **Developer: Clean Obsidian UI Development Exports** is optional maintenance for the three deliberate development export types. It asks for confirmation and never touches Figma Packages or failure records. Both areas are ignored by Git; there is no automatic retention for deliberate development exports.
