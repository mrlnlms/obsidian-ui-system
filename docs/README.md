# Technical documentation

Start with the [project overview](../README.md) to understand the products and current scope. Use this index for development instructions, product behavior, and integration contracts.

## Develop the monorepo

- [Development guide](development.md): local requirements, build, dev vault, Hot Reload, Mapping and Lab exports, snapshot diff, artifacts, and verification commands.

## Obsidian UI Mapping

| Topic | Documentation |
| --- | --- |
| Canonical observed evidence | [Public UI inventory](obsidian-ui-mapping/capture/public-ui-inventory.md), [component registry](obsidian-ui-mapping/capture/component-registry.md), [snapshot format and limits](obsidian-ui-mapping/capture/snapshot.md) |
| Layout Probe Lab | [Lab behavior and use](obsidian-ui-mapping/layout-lab/layout-lab.md), [inference rules and limits](obsidian-ui-mapping/layout-lab/layout-inference.md) |
| Snapshot diff | [Semantic comparison rules](obsidian-ui-mapping/snapshot-diff/snapshot-diff.md) |

## Obsidian UI System Figma

- [Figma plugin setup and use](../apps/obsidian-ui-system-figma/README.md)
- [Component reconstruction rules](obsidian-ui-system-figma/components/component-reconstruction.md)

## Integration

- [Figma Package workflow and ZIP contract](integration/figma-package/figma-package.md)

The [Obsidian UI Skill](../apps/obsidian-ui-skill/README.md) is a future product and has no technical guide yet.

Implementation plans belong in the local, Git-ignored `private/docs/plans/` directory. Completed investigations, dated validation records, and experimental JSON models belong in `private/docs/` under the matching product and topic. Public documents must remain understandable without that directory. Generated Mapping and Lab exports stay under the ignored development vault paths described in the [development guide](development.md).

Place a new public guide under its named product and closest topic, then link it here. Use `integration/` for contracts that connect product surfaces.
