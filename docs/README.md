# Project documentation

These documents describe the current open project: how to use it, what its exports contain, and the rules needed to extend it.

| Area | Scope | Documentation |
| --- | --- | --- |
| `obsidian/` | Atlas, Layout Lab, and comparison CLI | [Public UI inventory](obsidian/public-ui-inventory.md), [component registry](obsidian/component-registry.md), [snapshot format and limits](obsidian/atlas-snapshot.md), [semantic snapshot diff](obsidian/snapshot-diff.md), [Layout Probe Lab](obsidian/layout-lab.md), [inference rules and limits](obsidian/layout-inference.md) |
| `figma/` | Figma reconstruction | [Component reconstruction rules](figma/figma-component-reconstruction.md) |
| `integration/` | Contracts between the Obsidian and Figma plugins | [Figma Package format](integration/figma-package.md) |

Implementation plans, completed investigations, dated validation records, and experimental JSON models belong under the local, Git-ignored `private/` directory, organized by the same subjects. Public documents must remain understandable without that directory. Generated Atlas and Lab exports stay under the ignored development vault paths described in the [project README](../README.md).
