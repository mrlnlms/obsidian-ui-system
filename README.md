# Obsidian UI System

Obsidian UI System connects the UI people can observe in Obsidian with the components they design in Figma and, eventually, the interfaces coding agents implement. This monorepo develops three product surfaces around a shared, evidence-based representation of Obsidian UI.

## Why

Recreating an Obsidian interface from memory or screenshots leaves behavior, sizing, typography, and component states open to guesswork. The project captures public Obsidian UI specimens and keeps observations, layout inferences, and generated results distinct. That evidence gives design and implementation a common starting point.

## Products

- 🗺️ **[Obsidian UI Mapping](apps/obsidian-ui-mapping/)** → observe and map Obsidian UI into structured evidence.
- 🎨 **[Obsidian UI System Figma](apps/obsidian-ui-system-figma/)** → design with that evidence as an editable UI Kit.
- 🤖 **[Obsidian UI Skill](apps/obsidian-ui-skill/README.md)** → eventually help agents implement structured designs in Obsidian.

These are products developed in this repository. Skills installed to help an agent work on this repository belong to that agent's own configuration; they are separate from the Obsidian UI Skill product.

## Current status

The v0.1.0 scope demonstrates an end-to-end path from Obsidian capture to a Figma UI Kit:

- Mapping renders 59 specimens across 26 public API families and exports canonical observed evidence: specimens, states, tokens, environment, and snapshots. Its Layout Lab measures experimental sizing behavior and keeps inference separate.
- **Export Obsidian UI Figma Package** creates one validated ZIP from a consistent Mapping capture and Lab run.
- The Figma plugin imports that ZIP and generates native, editable Button and Search Component Sets. Those two components are the validated pilots; the broader library remains future work.
- Obsidian UI Skill has a product location and purpose, but no implemented skill yet.

## How it works

1. **Observe and map:** Mapping turns the real Obsidian UI into structured evidence. Layout Lab contributes separately labeled experimental measurements and inferences; semantic comparison tracks changes between snapshots.
2. **Design:** Mapping generates a Figma Package from the evidence. The Figma plugin turns it into an editable UI Kit and structured design; Button and Search are the currently validated components.
3. **Implement:** The future Skill is intended to help agents turn structured designs into Obsidian implementations.

`Obsidian UI → Mapping → structured evidence → Figma Package → Figma UI Kit → structured design → Skill → Obsidian implementation`. The Skill and the full implementation leg are future work.

The [snapshot schema](packages/ui-schema/README.md) defines the current canonical capture contract. The [Figma Package guide](docs/integration/figma-package/figma-package.md) describes the transfer format and its limits.

## Quick start

With Node.js 22+, npm 10+, Obsidian Desktop, and Figma Desktop installed, run from the repository root:

```sh
npm ci
npm run build
```

Open `<repository>/dev-vault` in Obsidian, enable **Obsidian UI Mapping**, and run **Export Obsidian UI Figma Package** from the Command Palette. In Figma Desktop, install the local plugin from `apps/obsidian-ui-system-figma/manifest.json`, select the exported ZIP in **Figma Package**, and click **Generate UI Kit**.

See [development setup](docs/development.md) for the vault and local workflow, and the [Figma plugin guide](apps/obsidian-ui-system-figma/README.md) for installation and font setup.

## Repository structure

| Directory | Role |
| --- | --- |
| `apps/` | The three independently developed product surfaces: Mapping, Figma, and the future Skill. |
| `packages/` | Shared contracts and code, currently the UI snapshot schema. |
| `scripts/` | Tooling for this monorepo, including semantic snapshot comparison. |
| `dev-vault/` | Local Obsidian development and test vault. |
| `docs/` | Public technical documentation for development, products, and integration. |
| `private/` | Local, Git-ignored plans and development evidence. |

## Documentation

- [Technical documentation index](docs/README.md)
- [Developing and testing the monorepo](docs/development.md)
- [Mapping inventory](docs/obsidian-ui-mapping/capture/public-ui-inventory.md) and [snapshot guide](docs/obsidian-ui-mapping/capture/snapshot.md)
- [Figma plugin setup](apps/obsidian-ui-system-figma/README.md) and [component reconstruction rules](docs/obsidian-ui-system-figma/components/component-reconstruction.md)
- [Figma Package workflow and format](docs/integration/figma-package/figma-package.md)
