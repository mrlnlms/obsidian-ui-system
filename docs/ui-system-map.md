# Obsidian UI System — canonical map

This document is the operational map for deciding **what belongs in the Obsidian UI System, where it belongs, and what stage it is in**.

It exists to prevent two recurring failure modes:

1. treating every DOM pattern as an autonomous UI Kit component;
2. letting the current investigation path redefine the project scope.

Use this document as the default orientation before opening a new component front.

## 1. Sources of the UI System

The system has two distinct evidence origins.

### `public-api`

UI exposed through Obsidian's public plugin API and captured through the public Mapping catalog.

- Canonical inventory: [`docs/obsidian-ui-mapping/capture/public-ui-inventory.md`](obsidian-ui-mapping/capture/public-ui-inventory.md)
- Current mapping status: **closed as an inventory universe**.
- Current inventory: **26 captured API/families**, plus `HoverPopover` as a limited case without an independent safe specimen.
- Figma production status: **partial**. Button and Search Component Sets are validated; the bounded Button Normal v2/Variables path is also validated. The remaining public inventory has not yet been produced as a complete Figma UI Kit.

`public-api` being closed means **the public component universe is mapped**, not that the Figma library is complete.

### `internal-observed`

Reusable UI observed in the running Obsidian application that is not represented as an independent specimen in the public catalog.

- Detailed evidence: [`docs/obsidian-ui-mapping/capture/internal-observed.md`](obsidian-ui-mapping/capture/internal-observed.md)
- Current mapping status: **architecture established; component inventory still being closed**.
- Figma production status: **partial**. File Explorer rows are the first validated internal-observed family.

`internal-observed` is not a sweep of everything found in the DOM. An observed element is promoted only after its owner surface and role in the product are understood.

## 2. Semantic architecture of the application

This map combines two kinds of evidence:

- **observed runtime structure** from Mapping probes and targeted DOM ancestry checks;
- **official Obsidian semantics** from the public API/developer/help documentation.

Official documentation is used to name and understand concepts such as workspace, leaves, views, tabs, ribbon and editor surfaces. Runtime evidence remains the source for the exact DOM ownership observed in this project.

```text
body
├─ application shell
│  └─ .app-container
│     ├─ workspace
│     │  ├─ ribbon
│     │  └─ workspace splits / tab groups
│     │     ├─ tab headers
│     │     └─ workspace leaves
│     │        └─ views
│     │           ├─ view chrome
│     │           │  └─ view header
│     │           └─ view-specific content
│     └─ status bar
│
├─ document / editor-embedded UI
│  └─ markdown view
│     └─ editor surface
│        └─ in-document Properties
│
└─ transient UI
   └─ modal / prompt / suggestion surfaces
```

A **sidebar is a workspace region that hosts tabs/leaves/views**. It is not the semantic parent family of File Explorer, Search or Outline. Those are distinct views that may be hosted in a sidebar.

## 3. Canonical UI ownership map

### 3.1 Application shell

Persistent application-level surfaces.

```text
Application Shell
├─ Ribbon
│  └─ Ribbon Action
├─ Workspace
└─ Status Bar
   └─ Status Bar Item
```

Current candidates:

| Candidate | Ownership | Current state |
| --- | --- | --- |
| Ribbon Action | Ribbon / application shell | located |
| Status Bar Item | Status Bar / application shell | located |

### 3.2 Workspace / View chrome

Infrastructure around the content of a leaf/view.

```text
Workspace / View Chrome
├─ Workspace Tab
└─ View Header
   ├─ Title
   ├─ Breadcrumb / parent context, when present
   └─ Actions
```

Current candidates:

| Candidate | Ownership | Current state |
| --- | --- | --- |
| Workspace Tab | tab header container inside a workspace tab group | located |
| View Header | child of a workspace leaf/view | current front |
| Breadcrumb Segment | part of View Header; not an autonomous surface | characterized for one observed segment |

`Breadcrumb Segment` should not compete with `View Header` as an unrelated top-level component. The observed segment is evidence for a part of the header; a complete breadcrumb trail has not yet been defined.

### 3.3 View-specific UI

UI owned by a particular view.

```text
View-specific UI
├─ File Explorer View
│  ├─ File Row
│  ├─ File Row + Trailing Tag
│  └─ Folder Row
│
├─ Search View
│  └─ Search Result Group
│     ├─ File heading / group context
│     └─ Match
│
├─ Outline View
│  └─ Outline Item
│
└─ All Properties View
   └─ not yet characterized here
```

Current candidates:

| Candidate | Ownership | Current state |
| --- | --- | --- |
| File Row | File Explorer view | figma-validated |
| File Row + Trailing Tag | File Explorer view | figma-validated |
| Folder Row | File Explorer view | figma-validated |
| Search Match | Search view, inside a result grouped by file | located; incomplete as a Search component |
| Outline Item | Outline view | exploratory evidence only; not yet promoted to the canonical inventory |
| All Properties content | separate `all-properties` view observed | not characterized |

The item previously called **Search result row** is more precisely a **match inside a result grouped by file**. Do not model that match as if it were the complete Search result component.

File Explorer is **structurally sufficient for this phase**. Its current validated coverage includes a simple file row, a row with trailing JSON/ZIP tag, and folder rows with observed expanded/collapsed states and depths 0–2. Do not deepen File Explorer automatically when choosing the next internal front.

### 3.4 Document / editor-embedded UI

Obsidian UI inserted into a document/editor surface. This is distinct from workspace chrome and from a sidebar view.

```text
Document / Editor-embedded UI
└─ Markdown View
   └─ editor / note surface
      └─ Properties block
         └─ Property Row
```

Current candidate:

| Candidate | Ownership | Current state |
| --- | --- | --- |
| Property Row | in-document Properties inside the Markdown/editor surface | characterized, deferred from the current app/view-chrome front |

The captured `.metadata-property` belongs to the in-document Properties block inside the Markdown editor surface. It is **not evidence for the separate All Properties sidebar view**. The project may revisit document/editor-embedded UI later, but it should not enter the current chrome/view queue merely because its DOM was captured in detail.

### 3.5 Transient UI

Surfaces that are invoked and dismissed rather than persistently hosted as view content.

```text
Transient UI
└─ Command Palette
   └─ Suggestion Item
```

Current candidate:

| Candidate | Ownership | Current state |
| --- | --- | --- |
| Command Palette Suggestion Item | `body > .modal-container > .prompt > .prompt-results` | located |

The observed suggestion item does not define the whole Command Palette, and the Command Palette does not define every modal/suggestion surface in Obsidian.

The public API inventory already contains its own captured overlay families (`Modal`, `ConfirmationModal`, `Menu`, `Notice`, suggestion APIs, tooltips, etc.). Do not duplicate those automatically under `internal-observed`; internal overlay work must have a separate reason.

## 4. Status vocabulary

Use these states consistently.

- **located** — the pattern is known to exist and its owner surface is identified, but evidence is still shallow.
- **characterized** — structure/behavior is understood well enough to define a component-specific model or reconstruction without broad new investigation.
- **figma-validated** — a Figma reconstruction exists and has been manually compared/validated for the stated scope.
- **deferred** — valid UI, but intentionally outside the current front.

These states describe maturity, not importance.

## 5. Promotion rule: DOM pattern → UI Kit component

A DOM pattern does **not** automatically become a UI Kit component.

Before promotion, answer:

1. **Who owns it?** Application shell, workspace/view chrome, a specific view, document/editor surface, or transient UI?
2. **What role does it play?** Is it a reusable component, a subcomponent of a larger component, or only scene/content evidence?
3. **What is the correct component boundary?** For example, a Search match is not automatically the whole Search result; a breadcrumb segment is part of a View Header context.
4. **Is there enough evidence to reconstruct it?** Visual evidence may be sufficient to start. DOM/CSSOM investigation is required only when a concrete implementation decision depends on it.

The goal is a useful and faithful UI Kit, not an exhaustive reverse-engineering of Obsidian's DOM.

## 6. Reconstruction rule

Prefer this loop:

```text
observe → reconstruct → compare → investigate only the mismatch
```

Avoid turning evidence collection into a separate deliverable unless it answers an unresolved implementation or ownership question.

Known behavior may be used to start a spike when it is visually unambiguous. Exact DOM/CSSOM inspection should close blockers, not precede every implementation by default.

## 7. Current project phase

The project is intentionally separated into mapping and production phases.

```text
PUBLIC-API
inventory/mapping ───────────── closed
Figma production ────────────── partial

INTERNAL-OBSERVED
architecture ────────────────── established
component inventory ─────────── in progress
Figma production ────────────── partial

NEXT
close internal-observed inventory
        ↓
stop broad component discovery
        ↓
produce the Figma UI Kit from public-api + internal-observed
        ↓
interrupt batches only for genuinely new technical capabilities
```

Current internal front: **View Header / workspace-view chrome**.

After `internal-observed` is closed as an inventory universe, the default priority is no longer to discover adjacent DOM patterns. It is to move the already mapped public and internal components into the Figma UI Kit at scale, reusing proven reconstruction mechanisms and isolating only real outliers.

## 8. Canonical evidence references

Repository:

- [`docs/obsidian-ui-mapping/capture/public-ui-inventory.md`](obsidian-ui-mapping/capture/public-ui-inventory.md) — public API inventory and capture status.
- [`docs/obsidian-ui-mapping/capture/internal-observed.md`](obsidian-ui-mapping/capture/internal-observed.md) — internal observed evidence and File Explorer detail.
- [`apps/obsidian-ui-system-figma/README.md`](../apps/obsidian-ui-system-figma/README.md) — current Figma generation/validation status.
- `apps/obsidian-ui-mapping/src/internal-observed-probe.ts` — internal probe implementation.

Official semantic references:

- Obsidian Developer Documentation: https://docs.obsidian.md/
- Workspace/View API concepts: https://docs.obsidian.md/Reference/TypeScript%20API/Workspace
- Editor / Markdown view relationship: https://docs.obsidian.md/Plugins/Editor/Editor
- Sidebar: https://help.obsidian.md/User%2Binterface/Sidebar
- Tabs: https://help.obsidian.md/User%2Binterface/Tabs
- Properties: https://help.obsidian.md/Editing%2Band%2Bformatting/Properties
- Search: https://help.obsidian.md/Plugins/Search
- Outline: https://help.obsidian.md/Plugins/Outline
- Command palette: https://help.obsidian.md/Plugins/Command%2Bpalette

These external references provide product/API semantics. They do not replace runtime evidence for exact internal DOM structure, dimensions or styling.
