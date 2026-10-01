# Contributing to Obsidian UI System

Thanks for your interest in Obsidian UI System.

The project is still evolving, so contributions are most useful when they stay close to an existing problem, documented behavior, or clearly scoped proposal.

## Before contributing

Start with:

- [README.md](README.md) for the project overview and current status.
- [docs/README.md](docs/README.md) for the technical documentation index.
- [docs/development.md](docs/development.md) for local setup, development workflow, and verification commands.

## Project structure

Obsidian UI System currently develops three product surfaces:

- 🗺️ **Obsidian UI Atlas** — observes and captures Obsidian UI.
- 🎨 **Obsidian UI System Figma** — turns validated package data into editable Figma components.
- 🤖 **Obsidian UI Skill** — the future agent-facing implementation layer.

Shared contracts live under `packages/`, repository tooling under `scripts/`, and maintained technical documentation under `docs/`.

## Development principles

The project is evidence-driven.

When changing capture, inference, or generated output:

- keep observed UI evidence distinct from inferred behavior;
- preserve uncertainty when the available evidence is insufficient;
- avoid turning experimental findings into canonical rules without validation;
- extend established structures before introducing parallel ones.

## Making a change

Keep changes focused and update relevant documentation when behavior, contracts, paths, or workflows change.

Before submitting a change, run the relevant checks described in [docs/development.md](docs/development.md).

Some behavior can only be validated inside Obsidian Desktop or Figma Desktop. When that applies, describe what was manually verified.

## Issues and proposals

Issues are welcome for bugs, gaps in captured behavior, documentation problems, and scoped feature proposals.

For security-sensitive reports, follow the [security policy](.github/SECURITY.md) rather than opening a public issue.
