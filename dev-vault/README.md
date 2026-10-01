# Development vault

This vault runs the Obsidian UI Atlas plugin, its separate Layout Lab view, and the **Export Obsidian UI Figma Package** command. Its Obsidian settings are local state; only the relative plugin symlink is tracked.

`figma-packages/` holds final ZIP transfer artifacts for the Figma importer. `ui-catalog-exports/` and `layout-spike-exports/` hold individual development captures. The semantic diff CLI writes diagnostic reports to the repository root's `snapshot-diffs/`. These generated directories are ignored by Git; see the [package guide](../docs/figma-package.md) before manual cleanup.
