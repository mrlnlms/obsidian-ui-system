# Project guidance

## Project model

Obsidian UI System builds a shared, evidence-based representation of Obsidian UI that can support design in Figma and, eventually, implementation by coding agents.

This monorepo develops three first-class product surfaces:

- `apps/obsidian-ui-mapping/` — **Obsidian UI Mapping**, the Obsidian plugin that observes and maps real UI into structured evidence.
- `apps/obsidian-ui-system-figma/` — **Obsidian UI System Figma**, the Figma plugin that turns validated package data into an editable UI Kit.
- `apps/obsidian-ui-skill/` — **Obsidian UI Skill**, the agent-facing product that will eventually help translate structured designs into Obsidian implementations.

In this repository, `apps/` means independently developed and distributable product surfaces. It is not limited to traditional applications with a UI or process.

- `packages/` contains shared contracts and implementation used across products.
- `scripts/` contains repository tooling.
- `dev-vault/` is the local Obsidian execution and test environment.
- `docs/` contains maintained project and technical documentation.
- `private/` contains Git-ignored plans, investigations, validation records, and other development evidence.

The Skill developed under `apps/obsidian-ui-skill/` is distinct from skills installed for Codex, Claude, or another agent to help develop this repository. Installed skills follow the configuration convention of the consuming agent.

## Repository invariants

- Keep one Git repository at the root. Do not create nested repositories.
- Keep one source tree for each product. The development vault may reference product code but must not contain a second source copy.
- Treat `apps/` as product surfaces, `packages/` as shared infrastructure, `scripts/` as repository tooling, and `dev-vault/` as runtime/test state.
- When moving a product or shared package, update workspace configuration, scripts, ignore rules, symlinks, and documentation references together.
- Keep the shared UI representation generic to Obsidian interface development. Do not couple shared schemas or contracts to an individual downstream plugin.
- Preserve the distinction between:
  - observed Obsidian UI evidence;
  - inferred abstractions or layout behavior;
  - generated outputs such as the Figma UI Kit.
- Mapping owns canonical observed evidence: specimens, states, tokens, environment, and snapshots. Its Layout Lab owns experimental measurement and inference; experimental conclusions must not silently become canonical facts. Semantic comparison and Figma Package generation consume these distinct inputs.
- Preserve uncertainty when evidence is insufficient. `unknown` is a valid result; do not force a classification to make a downstream representation easier.
- Figma is a generated consumer of the shared representation, not the canonical source of Obsidian UI truth.
- Keep semantic identity stable where it already exists, including specimen identity by `id + variant` and token comparison by token name, unless an intentional contract change requires otherwise.

## Documentation and artifacts

Use each documentation surface for a distinct purpose:

- `README.md` introduces the project, current capabilities, and short path to try it.
- `docs/development.md` owns detailed local setup, vault operation, development exports, and verification commands.
- `docs/README.md` is the public technical documentation index.
- Product and integration guides under `docs/` describe maintained behavior, contracts, methods, limits, and reusable rules.
- `private/docs/plans/` contains implementation plans.
- Other investigations, dated validation records, experimental models, session evidence, and one-off probes belong under the matching area of `private/docs/`.

Before creating a new document, check whether its subject already has an established home. Extend the existing document when that is clearer than adding another file.

Public documentation must stand on its own and must not depend on files under `private/`. When private evidence produces a durable rule, summarize that rule and its limits in the appropriate maintained document.

Place deliverables according to their role:

- product code and tests with the relevant app or package;
- maintained tooling under `scripts/`;
- reproducible fixtures with the tests that consume them;
- runtime captures, generated reports, staging, and diagnostics in their defined ignored locations;
- disposable build output under `.build/`;
- plans and development evidence under `private/`.

Do not create a plan merely to record a small direct edit. When a plan is useful, keep it in `private/docs/plans/` after execution; its deliverables belong in their normal code, documentation, or evidence locations.

Any new command that persists generated artifacts must have a clear destination and retention policy.

Never write generated captures, inventories, diagnostics, or exports inside `dev-vault/.obsidian/`; that directory is for Obsidian configuration and plugin installation only. Put new Obsidian runtime evidence next to the Figma Package ZIPs in `dev-vault/obsidian-ui-exports/figma-packages/` unless the user explicitly chooses another destination. Do not create a hidden output directory for a new capture flow by default.

## Working rules

- Read the existing code and relevant documentation before adding a new rule, abstraction, document, or output location.
- Prefer extending an established structure over creating a parallel one.
- Keep changes scoped to the requested milestone. Do not expand capture coverage, Figma generation, or the future Skill simply because adjacent infrastructure makes it possible.
- Preserve already validated behavior when changing adjacent systems.
- Let evidence drive reconstruction and inference rather than visual guesswork.
- Update maintained documentation when a durable path, contract, workflow, or architectural rule changes.
- Avoid duplicating the same project rule across multiple documents. Keep the canonical explanation in the most appropriate place and link to it when needed.

## Proveniência: relevância antes de cautela

Use proveniência para detectar diferenças que possam alterar materialmente a evidência ou o resultado. Não trate diferenças técnicas conhecidas como problemas por padrão.

- Registre hashes, timestamps, versões e origens quando forem úteis para rastreabilidade.
- Uma diferença de hash, timestamp ou origem **não é incompatibilidade por si só**.
- Só bloqueie, recapture, remonte artefatos ou proponha trabalho adicional quando houver um mecanismo concreto pelo qual a diferença possa afetar a evidência relevante.
- Se a causa da diferença já é conhecida e não altera o objeto investigado — por exemplo, um novo build criado apenas para adicionar um comando diagnóstico — registre a origem e siga.
- Não exija simultaneidade perfeita entre capturas independentes.
- Não repita caveats de proveniência que já foram registrados e resolvidos, a menos que apareça nova evidência que mude sua relevância.
- Não reabra decisões já validadas apenas por excesso de precaução.
- Igualdade de valores nunca substitui evidência causal quando ela é necessária, mas também não repita esse alerta quando o vínculo já foi comprovado por um método causal.
- Prefira `unknown` quando realmente faltar evidência; não crie trabalho preventivo para eliminar incertezas que não afetam a decisão atual.

Princípio: **rastreabilidade deve preservar contexto, não criar burocracia.**

## Task references

For Mapping capture and registry work, use the maintained guides under:

- `docs/obsidian-ui-mapping/capture/`
- `docs/obsidian-ui-mapping/snapshot-diff/`

For Layout Lab measurement and inference, use:

- `docs/obsidian-ui-mapping/layout-lab/`

For Figma component generation, read:

- `docs/obsidian-ui-system-figma/components/component-reconstruction.md`

Use the relevant Figma development skills and local `@figma/plugin-typings` when changing the importer or generated components.

For the Obsidian-to-Figma transfer contract, use:

- `docs/integration/figma-package/figma-package.md`

For local setup, vault behavior, generated artifact locations, and verification commands, use:

- `docs/development.md`

## Validation and user interaction

- Run the relevant TypeScript checks, builds, and automated tests described in `docs/development.md` before closing implementation work.
- Automated tests do not replace runtime validation when behavior depends on Obsidian Desktop or Figma Desktop.
- The user normally operates the Obsidian and Figma interfaces. Do not take control of those interfaces unless explicitly asked.
- The repository root is never an Obsidian vault. Open only `<repository>/dev-vault` for this project. Always pass `vault=dev-vault` as the first Obsidian CLI argument; do not rely on the CLI's current-directory vault selection, which can select a registered parent vault.
- When runtime exports can provide evidence, inspect the generated files before asking the user to manually confirm information already available there.
- For Obsidian runtime work, first inspect the available command IDs and run plugin commands through the Obsidian CLI when it can do so. Request manual app interaction only after a concrete CLI limitation is established. Use DOM, attributes, states, and computed styles as structural evidence for UI patterns; do not use screenshots or computer use to catalog components.
- When a required result exists only in the UI, clearly identify the remaining manual check.
- There is no background monitoring between agent turns; do not imply that a future export will automatically resume the current task.
