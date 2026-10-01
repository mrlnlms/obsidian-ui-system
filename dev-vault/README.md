# Development vault

This vault runs the Obsidian UI Atlas plugin, its separate Layout Lab view, and the **Export Obsidian UI Figma Package** command. Its Obsidian settings are local state; only the relative plugin symlink is tracked.

`obsidian-ui-exports/figma-packages/` holds final ZIP transfer artifacts for the Figma importer. Keep or delete these packages when they are no longer needed.

`.obsidian-ui-system/` is a hidden technical area with individual Atlas captures (`ui-catalog-exports/`), Layout Lab captures (`layout-lab-exports/`), and semantic diff reports (`snapshot-diffs/`). Run **Clean Obsidian UI Development Exports** in the Obsidian Command Palette to inspect counts, confirm, and remove only these technical artifacts. The command never touches Figma Packages. Both areas are ignored by Git; there is no automatic retention.
