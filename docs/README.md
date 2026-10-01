# Project documentation

These documents describe the current open project: how to use it, what its exports contain, and the rules needed to extend it.

| Area | Documentation |
| --- | --- |
| Atlas capture | [Public UI inventory](public-ui-inventory.md), [component registry](component-registry.md), [snapshot format and limits](atlas-snapshot.md) |
| Comparing captures | [Semantic snapshot diff](snapshot-diff.md) |
| Layout measurement | [Layout Probe Lab](layout-lab.md), [inference rules and limits](layout-inference.md) |
| Figma transfer | [Figma Package format](figma-package.md), [component reconstruction rules](figma-component-reconstruction.md) |

Implementation plans, completed investigations, dated validation records, and experimental JSON models belong under the local, Git-ignored `private/` directory. Public documents must remain understandable without that directory. Generated Atlas and Lab exports stay under the ignored development vault paths described in the [project README](../README.md).
