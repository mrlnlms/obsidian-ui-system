# Obsidian UI Mapping

Obsidian UI Mapping is the Obsidian plugin that observes real Obsidian UI and records structured evidence. Its canonical capture covers specimens and states from the public component registry, resolved CSS tokens, environment metadata, and timestamped snapshots. The separate Layout Lab measures controlled fixtures and produces experimental sizing inferences. Semantic snapshot comparison tracks changes; Figma Package generation combines validated capture and Lab data for the Figma UI Kit.

Mapping is the evidence-producing surface of Obsidian UI System. The [Figma plugin](../obsidian-ui-system-figma/README.md) consumes a package to create editable design components. The future [Skill](../obsidian-ui-skill/README.md) is intended to support Obsidian implementation from structured design. Inference stays labeled as experimental and does not become canonical observed evidence by being packaged.

## Develop

From the repository root, run `npm ci` and `npm run build`. Open `dev-vault` as an Obsidian vault, enable **Obsidian UI Mapping**, and use **Open Obsidian UI Mapping** for canonical specimens or **Open Obsidian UI Layout Lab** for experiments. **Export Obsidian UI Figma Package** produces the transfer ZIP without opening either view. The vault plugin link points to this source tree; there is no second copy of the plugin.

See the [development guide](../../docs/development.md) for Hot Reload, export destinations and verification commands. The [snapshot guide](../../docs/obsidian-ui-mapping/capture/snapshot.md), [Layout Lab guide](../../docs/obsidian-ui-mapping/layout-lab/layout-lab.md), and [Figma Package contract](../../docs/integration/figma-package/figma-package.md) define the maintained behavior and limits.
