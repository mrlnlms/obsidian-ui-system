# Technical documentation

Start with the [project overview](../README.md) to understand the products and current scope. Use this index for development instructions, product behavior, and integration contracts.

## Develop the monorepo

- [Development guide](development.md): local requirements, build, dev vault, Hot Reload, Atlas and Lab exports, snapshot diff, artifacts, and verification commands.

## Obsidian UI Atlas

| Topic | Documentation |
| --- | --- |
| Canonical Atlas | [Public UI inventory](obsidian-ui-atlas/atlas/public-ui-inventory.md), [component registry](obsidian-ui-atlas/atlas/component-registry.md), [snapshot format and limits](obsidian-ui-atlas/atlas/snapshot.md) |
| Layout Probe Lab | [Lab behavior and use](obsidian-ui-atlas/layout-lab/layout-lab.md), [inference rules and limits](obsidian-ui-atlas/layout-lab/layout-inference.md) |
| Snapshot diff | [Semantic comparison rules](obsidian-ui-atlas/snapshot-diff/snapshot-diff.md) |

## Obsidian UI System Figma

- [Figma plugin setup and use](../apps/obsidian-ui-system-figma/README.md)
- [Component reconstruction rules](obsidian-ui-system-figma/components/component-reconstruction.md)

## Integration

- [Figma Package workflow and ZIP contract](integration/figma-package/figma-package.md)

The [Obsidian UI Skill](../apps/obsidian-ui-skill/README.md) is a future product and has no technical guide yet.

Implementation plans belong in the local, Git-ignored `private/docs/plans/` directory. Completed investigations, dated validation records, and experimental JSON models belong in `private/docs/` under the matching product and topic. Public documents must remain understandable without that directory. Generated Atlas and Lab exports stay under the ignored development vault paths described in the [development guide](development.md).

Place a new public guide under its named product and closest topic, then link it here. Use `integration/` for contracts that connect product surfaces.
