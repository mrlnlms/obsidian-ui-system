# Obsidian UI System — canonical map and production guide

This document is the operational source of truth for **what the Obsidian UI System contains, how the pieces belong together, what evidence is already sufficient, and what to build next**.

Its purpose is to keep the project moving toward the actual outcome: a Figma UI Kit that is structurally close to Obsidian and useful enough that an implementation agent can translate designs back into Obsidian using the same product concepts.

It is not a DOM inventory and it is not a requirement to reverse-engineer every implementation detail before drawing a component.

## 1. Evidence hierarchy

Use the strongest source already available. Do not re-prove the same fact at a weaker layer.

1. **Obsidian public API / code contract — semantic source.**
   If the API already defines a workspace concept, sidedock, tabs, leaf, view, ribbon, status bar, control or overlay, use that concept as the semantic basis of the UI Kit. Runtime DOM inspection is not required to prove that the concept exists.
2. **Observed UI / screenshots — behavioral source.**
   When a behavior is visually unambiguous — resize, wrapping, ellipsis, expansion, placement, recurring toolbar structure — treat it as sufficient evidence to reconstruct the behavior in Figma.
3. **DOM / CSSOM — implementation debugger.**
   Inspect exact DOM/CSS only when a concrete reconstruction decision cannot be made from API semantics + observed behavior, or when the Figma result visibly diverges.
4. **Figma Desktop — reconstruction validation.**
   Compare the generated component/composition with Obsidian and correct observable mismatches. Figma is a consumer of the evidence, not a new source of Obsidian semantics.

Default loop:

```text
API/code semantics + observed UI
        ↓
reconstruct in Figma
        ↓
compare
        ↓
inspect DOM/CSS only for the specific mismatch
```

Do **not** turn “prove it” into a mandatory phase before every component.

## 2. Two input inventories, one UI System

### `public-api`

The public plugin API inventory is already closed as a mapping universe.

- Canonical inventory: [`docs/obsidian-ui-mapping/capture/public-ui-inventory.md`](obsidian-ui-mapping/capture/public-ui-inventory.md)
- **26 API/families have captured specimens**; `HoverPopover` is a documented limited case.
- Figma production is still partial: Button and Search Component Sets are validated, and the bounded Button Normal Variables path is validated.

`public-api: closed` means **we know the public component universe**, not that all 26 families are already generated in Figma.

The public inventory includes controls and surfaces such as Button, Search, Toggle, Text, TextArea, Dropdown, Slider, Color, Settings, Modal, Menu, Notice and Suggest APIs. These should later move to Figma in batches whenever they use capabilities already proven by the importer.

### `internal-observed`

This covers reusable application UI that is part of Obsidian itself and is not already represented as an independent public specimen.

- Evidence: [`docs/obsidian-ui-mapping/capture/internal-observed.md`](obsidian-ui-mapping/capture/internal-observed.md)
- Figma implementation status: [`apps/obsidian-ui-system-figma/README.md`](../apps/obsidian-ui-system-figma/README.md)

The goal is to close the **useful internal UI vocabulary**, not to promote every DOM node into a component.

## 3. Product architecture: semantic backbone

The public Obsidian API already provides a useful structural vocabulary. In particular:

- `Workspace` exposes the workspace roots;
- `WorkspaceSidedock` is a public workspace construct and extends `WorkspaceSplit`;
- `WorkspaceTabs` is a public workspace parent;
- workspace leaves host Views;
- Ribbon and Status Bar are application-level integration surfaces.

That API vocabulary is the semantic backbone. Runtime observations refine how it looks and behaves.

```text
OBSIDIAN APPLICATION
│
├─ APPLICATION SHELL
│  ├─ Ribbon
│  │  └─ Ribbon Action
│  ├─ Workspace
│  │  ├─ Root workspace
│  │  ├─ Left WorkspaceSidedock
│  │  └─ Right WorkspaceSidedock
│  └─ Status Bar
│     └─ Status Bar Item
│
├─ WORKSPACE HOSTING
│  ├─ WorkspaceTabs / tab group
│  │  └─ Workspace Tab / tab header
│  └─ WorkspaceLeaf
│     └─ View
│        ├─ View Header
│        │  ├─ navigation
│        │  ├─ title / breadcrumb context
│        │  └─ actions
│        └─ View Content
│
├─ VIEW-SPECIFIC UI
│  ├─ File Explorer View
│  ├─ Search View
│  ├─ Outline View
│  ├─ All Properties View
│  └─ other hosted Views
│
├─ DOCUMENT / EDITOR-EMBEDDED UI
│  └─ Markdown View / editor surface
│     └─ in-document Properties
│
└─ TRANSIENT UI
   ├─ Command Palette
   ├─ Menus
   ├─ Modals
   ├─ Suggestions
   ├─ Tooltips
   └─ Notices / popovers
```

### Important semantic rule

A sidedock/sidebar is **hosting infrastructure**, not the same semantic level as File Explorer, Search or Outline. Those are Views hosted inside workspace infrastructure.

At the Figma layer we may still expose a convenient **Side Panel composition** based on this real workspace/sidedock behavior. The component boundary in Figma should help people design with Obsidian concepts; it does not need to mirror every internal DOM boundary one-to-one.

## 4. Canonical Figma building blocks

The UI Kit should be useful for composing screens, not only for displaying isolated specimens.

### 4.1 Application / workspace shell

Target building blocks:

```text
Workspace shell
├─ Ribbon
├─ Root workspace region
├─ Side Panel / Sidedock composition
└─ Status Bar
```

A Figma **Side Panel / Sidedock composition** should represent the reusable hosted-view shell seen across the application:

```text
Side Panel / Sidedock
├─ Tabs / tab header area
├─ View-specific controls / toolbar when present
└─ View Content slot
```

The exact controls inside the panel belong to the hosted View. The panel should be resizable and allow its content to adapt.

### 4.2 Workspace / View chrome

```text
WorkspaceTabs
└─ Workspace Tab

WorkspaceLeaf / View
├─ View Header
│  ├─ Navigation region
│  ├─ Breadcrumb Trail / current title
│  └─ Actions region
└─ View Content
```

Current state:

| Building block | State |
| --- | --- |
| Workspace Tab | located; still needs Figma componentization |
| View Header | **figma-validated for the bounded Markdown Dark sample** |
| Breadcrumb Segment | **native Figma Component**, editable `Label` |
| Breadcrumb Trail | **native Figma Component**, uses Segment instances + current title |

The View Header is intended to become a useful composition: adding/removing actions should consume or release horizontal space from the flexible middle region instead of requiring a new fixed specimen.

### 4.3 File Explorer View

Current internal family:

```text
File Explorer View
├─ Folder Row
├─ File Row
└─ File Row + Trailing Tag
```

Current Figma status:

- File Row: validated;
- Tagged File Row: validated;
- Folder Row: validated for observed Expanded/Collapsed appearances and depths 0–2;
- horizontal resize/ellipsis behavior: validated for the bounded observed cases.

The next useful step is not another isolated File Explorer specimen. It is a **composed File Explorer View** that can visually contain realistic folders/files, indentation and tree guides using the already known row components.

Known production debt: Folder Row currently exists as six independent Components (2 observed states × 3 observed depths). During UI Kit consolidation, evaluate a Component Set with `State = Expanded | Collapsed` and `Depth = 0 | 1 | 2`. Do not invent unobserved states/depths merely to make the set look complete.

### 4.4 Search, Outline and All Properties Views

These are hosted Views, not generic “sidebar rows”.

- **Search:** the existing internal observation is only a match inside a result grouped by file. Do not mistake it for the complete Search result composition.
- **Outline:** visual evidence already demonstrates a hierarchical list with wrapping/variable-height items. It is exploratory, not yet closed as a Figma family.
- **All Properties:** a separate `all-properties` View exists; the in-document `.metadata-property` observation does not define this View.

These should be built as **View content systems** placed inside the same workspace/sidedock hosting structure.

### 4.5 Document/editor-embedded UI

The captured Property Row belongs to in-document Properties inside the Markdown/editor surface. It is deferred from the current shell/workspace closure.

### 4.6 Transient UI

The public API inventory already captures many overlay/suggestion families. Internal transient work should not duplicate those by default.

The Command Palette observation is useful only where it adds product-specific composition not already covered by public Modal/Suggest primitives.

## 5. UI Kit componentization rule

A component does **not** need every possible hover/pressed/light state before it can exist as a Component.

Represent what is already known:

- editable content → Figma text properties;
- known states → Variants / Component Properties;
- reusable child units → Components / nested instances;
- flexible regions → Auto Layout / constraints;
- variable actions/content → exposed nested instances, instance swap or suitable properties when useful;
- unknown states → documented gaps, not invented variants.

Examples:

- Breadcrumb Segment is already a valid Component even though hover has not been characterized.
- Folder Row has enough evidence for Expanded/Collapsed; those should eventually be expressed as real state properties rather than six disconnected end-state specimens.

The standard for “done enough” is: **someone can use the piece to design a plausible Obsidian interface and its known behavior survives normal resizing/editing.**

## 6. Maturity vocabulary

Use these states:

- **located** — concept/surface identified and ownership known;
- **modeled** — component boundary and useful contract are clear enough to build;
- **figma-built** — native Figma component/composition exists;
- **figma-validated** — manually compared with Obsidian for the documented scope;
- **partial-state coverage** — valid component, but known states are not fully captured;
- **deferred** — valid UI intentionally outside the current front.

Do not use “not fully investigated” as a reason to block a component whose useful contract is already obvious.

## 7. Current strategic state

```text
PUBLIC API
inventory             CLOSED
Figma production      PARTIAL

INTERNAL / HOST UI
semantic architecture ESTABLISHED
File Explorer         STRUCTURALLY SUFFICIENT
View Header           FIGMA-VALIDATED (bounded sample)
Breadcrumb            BUILT as nested Components
Workspace Tab         NEXT host primitive
Side Panel/Sidedock   NEXT composition target

VIEW CONTENT
Search                 partial evidence
Outline                exploratory evidence
All Properties         shallow evidence

DOCUMENT UI
Property Row           characterized, deferred
```

## 8. Execution strategy from here

The next work should optimize for **usable screen composition**, not evidence volume.

### Phase A — finish the host skeleton

1. **Workspace Tab / tab group behavior**
   - build the reusable Figma tab component/composition;
   - use API/code semantics as the component boundary;
   - inspect DOM/CSS only if the Figma behavior cannot be matched from observation.
2. **Side Panel / WorkspaceSidedock composition**
   - resizable host;
   - tab area / top control region;
   - View Content slot;
   - compose it from existing/new host primitives rather than capturing another isolated screenshot.
3. **Use the existing View Header** as the main-view chrome composition and keep its flexible action/breadcrumb contract useful for design.

At the end of Phase A, the Figma library should be able to draw a recognizable Obsidian shell with tabs, a main View Header and a hosted side panel.

### Phase B — turn proven rows into actual View compositions

1. Compose a realistic **File Explorer View** from Folder/File/Tagged rows, including observed indentation/tree guides where visually necessary.
2. Build the useful **Search View content** (query/control surface + grouped results), not just the previously observed match fragment.
3. Build **Outline View content** from the already obvious hierarchical/wrapping behavior.
4. Add **All Properties View content** only to the level needed to represent the real hosted View.

At the end of Phase B, the UI Kit should support drawing the common side-panel Views shown in Obsidian.

### Phase C — fill the mapped public inventory in batches

Move the already mapped `public-api` components into Figma using the mechanisms now proven by Button, Search, nested components, Auto Layout and responsive hosts.

Do not limit batches to arbitrary counts. Generate every family that fits existing capabilities; isolate only genuine technical outliers.

### Phase D — state/theme consolidation

After the useful component vocabulary exists in Figma:

- consolidate observed states into Component Sets;
- close important hover/active/disabled gaps;
- project Dark/Light Variables where evidence exists;
- normalize naming/sections/properties;
- only then treat the library as publication-ready.

This ordering deliberately favors **breadth and usable composition first**, then systematic refinement. It avoids spending a day perfecting one state while the rest of the UI Kit does not yet exist.

## 9. Decision rules for agents

Before starting work, agents must ask only these questions:

1. **Does the API/code already establish the semantic component?** If yes, use it. Do not re-prove it in DOM.
2. **Is the required visual behavior already obvious in screenshots/runtime?** If yes, implement it.
3. **Is there a concrete mismatch or missing technical value that blocks implementation?** Only then inspect DOM/CSSOM.
4. **Does this work make the Figma UI Kit more composable?** Prefer screen-building capability over another isolated diagnostic specimen.

Do not open adjacent investigation merely because another class or state was noticed.

## 10. Canonical references

Repository:

- [`docs/obsidian-ui-mapping/capture/public-ui-inventory.md`](obsidian-ui-mapping/capture/public-ui-inventory.md)
- [`docs/obsidian-ui-mapping/capture/internal-observed.md`](obsidian-ui-mapping/capture/internal-observed.md)
- [`apps/obsidian-ui-system-figma/README.md`](../apps/obsidian-ui-system-figma/README.md)
- `apps/obsidian-ui-mapping/src/internal-observed-probe.ts`

Official semantics:

- Obsidian developer docs: https://docs.obsidian.md/
- Obsidian public API declarations: https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts
- Sidebar: https://help.obsidian.md/User%2Binterface/Sidebar
- Tabs: https://help.obsidian.md/User%2Binterface/Tabs
- Properties: https://help.obsidian.md/Editing%2Band%2Bformatting/Properties
- Search: https://help.obsidian.md/Plugins/Search
- Outline: https://help.obsidian.md/Plugins/Outline
- Command palette: https://help.obsidian.md/Plugins/Command%2Bpalette

The API/code provides semantic structure. Runtime observation provides visible behavior. DOM/CSSOM provides implementation detail only when needed. Figma is where those sources become a reusable design system.
