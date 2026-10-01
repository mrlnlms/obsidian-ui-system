# Development vault

This vault runs the Obsidian UI Atlas plugin, its separate Layout Lab view, and the **Export Obsidian UI Figma Package** command. Its Obsidian settings are local state; only the relative plugin symlink is tracked.

`obsidian-ui-exports/figma-packages/` holds final ZIP transfer artifacts for the Figma importer. Keep or delete these packages when they are no longer needed.

The normal workflow is **Export Obsidian UI Figma Package → ZIP ready**. The Package Builder removes its own staging files on success or handled failure and checks for its orphaned partials before the next export. Handled failures leave a small record in `.obsidian-ui-system/package-failures/`. No cleanup command is needed after an export.

`.obsidian-ui-system/` is a hidden technical area with individual Atlas captures (`ui-catalog-exports/`), Layout Lab captures (`layout-lab-exports/`), semantic diff reports (`snapshot-diffs/`), package staging (`package-staging/`), and failure records (`package-failures/`). **Developer: Clean Obsidian UI Development Exports** is optional maintenance for the three deliberate development export types. It asks for confirmation and never touches Figma Packages or failure records. Both areas are ignored by Git; there is no automatic retention for deliberate development exports.
