# Project documentation

These documents describe the current open project: how to use it, what its exports contain, and the rules needed to extend it.

| Product and topic | Documentation |
| --- | --- |
| **Obsidian UI Atlas → Atlas** | [Public UI inventory](obsidian-ui-atlas/atlas/public-ui-inventory.md), [component registry](obsidian-ui-atlas/atlas/component-registry.md), [snapshot format and limits](obsidian-ui-atlas/atlas/snapshot.md) |
| **Obsidian UI Atlas → Layout Probe Lab** | [Lab guide](obsidian-ui-atlas/layout-lab/layout-lab.md), [inference rules and limits](obsidian-ui-atlas/layout-lab/layout-inference.md) |
| **Obsidian UI Atlas → Snapshot diff** | [Semantic comparison CLI](obsidian-ui-atlas/snapshot-diff/snapshot-diff.md) |
| **Obsidian UI System for Figma → Components** | [Component reconstruction rules](obsidian-ui-system-figma/components/component-reconstruction.md) |
| **Integration → Figma Package** | [ZIP format and workflow](integration/figma-package/figma-package.md) |

Implementation plans, completed investigations, dated validation records, and experimental JSON models belong under the local, Git-ignored `private/` directory, organized by the same subjects. Public documents must remain understandable without that directory. Generated Atlas and Lab exports stay under the ignored development vault paths described in the [project README](../README.md).

Place a new public guide under its named product and closest topic, then link it here. Use `integration/` only for a contract that connects the apps.
