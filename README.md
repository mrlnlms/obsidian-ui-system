# Obsidian UI System

Obsidian UI System connects the UI people can observe in Obsidian with the components they design in Figma and, eventually, the interfaces coding agents implement. This monorepo develops three product surfaces around a shared, evidence-based representation of Obsidian UI.

## Why

Recreating an Obsidian interface from memory or screenshots leaves behavior, sizing, typography, and component states open to guesswork. The project captures public Obsidian UI specimens and keeps observations, layout inferences, and generated results distinct. That evidence gives design and implementation a common starting point.

## Products

- 🗺️ **[Obsidian UI Atlas](apps/obsidian-ui-atlas/)** → observe and capture the real Obsidian UI in an Obsidian plugin.
- 🎨 **[Obsidian UI System Figma](apps/obsidian-ui-system-figma/)** → turn an exported Figma Package into editable Figma components.
- 🤖 **[Obsidian UI Skill](apps/obsidian-ui-skill/README.md)** → help coding agents interpret the system and, in a future milestone, turn structured designs into Obsidian implementations.

These are products developed in this repository. Skills installed to help an agent work on this repository belong to that agent's own configuration; they are separate from the Obsidian UI Skill product.

## Current status

The v0.1.0 scope demonstrates an end-to-end path from Obsidian capture to a Figma UI Kit:

- Atlas renders 59 specimens across 26 public API families and exports canonical snapshots. Its separate Layout Probe Lab measures experimental sizing behavior.
- **Export Obsidian UI Figma Package** creates one validated ZIP from a consistent Atlas capture and Lab run.
- The Figma plugin imports that ZIP and generates native, editable Button and Search Component Sets. Those two components are the validated pilots; the broader library remains future work.
- Obsidian UI Skill has a product location and purpose, but no implemented skill yet.

## How it works

1. **Observe:** Atlas records public UI specimens, tokens, and environment information. Layout Lab adds separately labeled measurements and inferences.
2. **Design:** A Figma Package carries the capture and layout evidence to the Figma plugin, which generates the currently validated components.
3. **Implement:** The future Skill is intended to help agents use the shared representation and structured designs when building Obsidian interfaces.

The [snapshot schema](packages/ui-schema/README.md) defines the current canonical capture contract. The [Figma Package guide](docs/integration/figma-package/figma-package.md) describes the transfer format and its limits.

## Quick start

With Node.js 22+, npm 10+, Obsidian Desktop, and Figma Desktop installed, run from the repository root:

```sh
npm ci
npm run build
```

Open `<repository>/dev-vault` in Obsidian, enable **Obsidian UI Atlas**, and run **Export Obsidian UI Figma Package** from the Command Palette. In Figma Desktop, install the local plugin from `apps/obsidian-ui-system-figma/manifest.json`, select the exported ZIP in **Figma Package**, and click **Generate UI Kit**.

See [development setup](docs/development.md) for the vault and local workflow, and the [Figma plugin guide](apps/obsidian-ui-system-figma/README.md) for installation and font setup.

## Repository structure

| Directory | Role |
| --- | --- |
| `apps/` | The three independently developed product surfaces: Atlas, Figma, and the future Skill. |
| `packages/` | Shared contracts and code, currently the UI snapshot schema. |
| `scripts/` | Tooling for this monorepo, including semantic snapshot comparison. |
| `dev-vault/` | Local Obsidian development and test vault. |
| `docs/` | Public technical documentation for development, products, and integration. |
| `private/` | Local, Git-ignored plans and development evidence. |

## Documentation

- [Technical documentation index](docs/README.md)
- [Developing and testing the monorepo](docs/development.md)
- [Atlas inventory](docs/obsidian-ui-atlas/atlas/public-ui-inventory.md) and [snapshot guide](docs/obsidian-ui-atlas/atlas/snapshot.md)
- [Figma plugin setup](apps/obsidian-ui-system-figma/README.md) and [component reconstruction rules](docs/obsidian-ui-system-figma/components/component-reconstruction.md)
- [Figma Package workflow and format](docs/integration/figma-package/figma-package.md)
