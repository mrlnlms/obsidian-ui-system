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
└─ Hosted View slot
   ├─ View-specific controls / toolbar when present
   └─ View Content
```

The exact controls inside the panel belong to the hosted View. The panel should be resizable and allow its content to adapt.

For the observed **Dark left Sidedock**, keep the three-tab group at its left inset and the collapse control at its right inset. Extra width belongs to the space between them. At the observed 200 px expanded width, that space is still 30 px; dragging the Obsidian panel narrower collapses it instead of squeezing the controls together. The Figma expanded component uses 200 px as its minimum width. Collapse is an application action, not another width of this expanded component. See the [focused observation](obsidian-ui-mapping/capture/internal-observed.md#side-panel--left-workspacesidedock-dark-desktop).

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
| Workspace Tab | **Dark desktop Main/Sidedock Figma-validated**; Light appearance has not been captured or implemented |
| WorkspaceTabs / Sidedock | **Figma-validated for three observed Dark left tabs** (`Active = Files | Search | Bookmarks`) in the first Desktop composition |
| Side Panel / WorkspaceSidedock | **Figma-validated for the bounded Dark left host**, including the 16 px collapse glyph and 200 px expanded minimum width. View contents remain a separate composition. |
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

The previously validated Explorer rows remain closed. The user requested an incremental Files composition from the scene open in Obsidian on 2026-10-02. Its original version used separate Folder, Default File, and tagged JSON/ZIP Components in the validated Side Panel; the user accepted it in Figma Desktop on 2026-10-03. The consolidation projects the same bounded states into `Obsidian / Tree Navigation Row`: `Kind=Folder|File`, only observed depths/states, and editable optional metadata for JSON/ZIP. Files composes those variants. The user confirmed the new structure in Figma Desktop on 2026-10-03. A later focused Dark/Light Variable projection is prepared but awaits Desktop mode-switch validation.

The six Folder combinations are variants in that shared set (`State=Expanded|Collapsed`, `Depth=0|1|2`). File Default depths 0/2/3 and Selected depth 0 use the same anatomy. Do not invent unobserved states/depths merely to fill a matrix. The older individual generators remain available for diagnostics but are no longer called by full generation.

### 4.4 Search, Bookmarks, Outline and All Properties Views

These are hosted Views, not generic “sidebar rows”. Bookmarks is also a hosted left View: its validated tab and Side Panel slot previously lacked their own content composition.

- **Search:** the earlier internal inventory observed only one match inside a file-grouped result. A focused Dark Search View probe covers the query/control row, count/sort bar, and three file groups. The first hosted composition was confirmed in Figma Desktop. A reported reuse defect reopened only its internals: the revised generator now nests the existing `Obsidian / Search` Filled instance in a global-field component, uses component instances for the control row, toolbar, file groups and matches, and omits the unrelated collapsed `Outline probe` sample. The user accepted the revised unified generation on 2026-10-02.
- **Bookmarks:** the Dark left tab and host were already validated. The focused Bookmarks content adds its own four-action header and three observed rows; it reuses two identical action variants from Files. The user confirmed the hosted View in Figma Desktop on 2026-10-03.
- **Outline:** visual evidence already demonstrates a hierarchical list with wrapping/variable-height items. It is exploratory, not yet closed as a Figma family.
- **All Properties:** a separate `all-properties` View exists; the in-document `.metadata-property` observation does not define this View.

These should be built as **View content systems** placed inside the same workspace/sidedock hosting structure.

The Figma plugin offers one generation action on a blank page: select a Package v1 ZIP and click **Generate UI Kit**. The ZIP supplies Button/Search; versioned tracked probes supply the implemented internal Components. The action calls their existing generators in dependency order, passes new Components and the Side Panel host explicitly into Search, Files and Bookmarks View compositions, and places each View in a duplicate of the validated Dark Side Panel preview. No prior Component Set, standalone JSON selection, or individual generator click is required. A failed run removes the new page roots and the newly created primitive Variable collection. The bounded Package v2 Button normal Variables pilot keeps its distinct diagnostic inputs. The user accepted the unified flow and Search component-reuse revision on 2026-10-02 and the Files and Bookmarks compositions on 2026-10-03. Each next Component should reuse finished pieces and be added to this full generation path.

Before the next sidebar/ribbon surface, the full action builds `Obsidian / Icon Button` and `Obsidian / Tree Navigation Row` from tracked evidence. Icon Button owns the observed 28×24 toolbar geometry, 28×39 Sidedock context and 24×20 Search Match case context, button `State`/`Tone`, and a swappable observed SVG. `Tone=Muted|Opaque` preserves the recorded glyph opacity. Files/Bookmarks header actions, View Header controls, Search settings/Match case and the Side Panel collapse control use instances. Tree Navigation Row owns the common File/Folder row geometry, selection, typography, ellipsis and indent; a trailing tag is optional metadata. The user validated this structure in Figma Desktop on 2026-10-03.

The bounded appearance pass captured these two primitives in real Obsidian Desktop Dark and Light modes; `tests/fixtures/primitive-theme-probe.json` is the focused tracked projection, and the raw runtime probe remains beside the Package ZIPs. One Figma Variable collection owns both modes for icon foreground, row default/selected text, selected background, disclosure and metadata colors, and the observed 8/4 px radii. The icon components retain one canonical observed SVG geometry each; only visible paints matching the observed glyph color bind to the icon Variable, preserving the SVG import's hidden paints and instance swap. State, Context, Kind, Depth, Label and metadata remain Component properties. Default rows and buttons stay transparent; selected background uses a separate bound underlay with 6.7% node opacity so its transparency survives paint binding. Unobserved hover is not added. The generated page explicitly starts in Dark; its Page variable mode controls both sets and their nested instances. The action performs a Dark → Light → Dark readback on the two sets and nested Files/Search previews, including structure and instance-property stability. The first Desktop run exposed opaque SVG bounds and selected fill; the next run stopped at a combined underlay assertion without per-property readback. That check now tolerates numeric opacity normalization, tests actual resize on a temporary selected instance at 200 and 300 px, and reports the measured value if it diverges. **Desktop visual revalidation is pending**. Other components and host backgrounds remain the validated Dark projection.

**Session handoff (2026-10-03):** the Dark structure of both primitives and its reuse in existing Views remain user-validated. The Variable-enabled version is a code checkpoint, not a Figma-validated closure: the latest underlay assertion change has passed local checks but has not been rerun in Figma Desktop. The user reports further errors without details yet; record their exact message or readback at the next run before changing code. Resume with the current **Generate UI Kit** action and a Package v1 ZIP on a blank page; inspect the two Component Sets and Files/Search previews in Dark, switch the page mode to Light and back to Dark, then check selected-row transparency, resize and icon geometry. Resolve only concrete primitive-theme defects found there before starting Outline.

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
- Folder Row's observed Expanded/Collapsed and depths 0–2 are now properties in the Figma-validated Tree Navigation Row set.

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
File Explorer         USER-CONFIRMED COMPLETE for current scope
View Header           FIGMA-VALIDATED (bounded sample)
Breadcrumb            BUILT as nested Components
Workspace Tab         FIGMA-VALIDATED (Dark only; Light pending)
WorkspaceTabs         FIGMA-VALIDATED (three Dark left tabs)
Side Panel/Sidedock   FIGMA-VALIDATED (bounded Dark left host)

VIEW CONTENT
Search                 FIGMA-VALIDATED (bounded Dark Side Panel composition)
Bookmarks              FIGMA-VALIDATED (bounded Dark Side Panel composition)
Icon Button            Dark structure FIGMA-VALIDATED; Dark/Light Variables awaiting Desktop check
Tree Navigation Row    Dark structure FIGMA-VALIDATED; Dark/Light Variables awaiting Desktop check
Outline                exploratory evidence
All Properties         shallow evidence

DOCUMENT UI
Property Row           characterized, deferred
```

## 8. Execution strategy from here

The next work should optimize for **usable screen composition**, not evidence volume.

### Phase A — finish the host skeleton

1. **Workspace Tab — completed only for the bounded Dark desktop sample**
   - the reusable Figma Component Set covers Main/Sidedock and Active/Inactive in Dark;
   - Light still needs its own appearance evidence and Figma projection in the theme phase;
   - the three-tab left Sidedock group now composes instances of this Component Set.
2. **Side Panel / WorkspaceSidedock composition**
   - the first Dark left host and three-tab Sidedock group reuse the validated Workspace Tab set;
   - the panel resizes around a 40 px tab area and a replaceable hosted-View slot;
   - Files and Bookmarks have their own 40 px `nav-header`; Search places its controls directly in its View. The host therefore does not impose a toolbar height;
   - the user compared the corrected composition side by side with Obsidian in Figma Desktop and confirmed the 16 px collapse glyph, spacing at the 200 px expanded minimum, and wider alignment. Right sidedock and Light appearance are outside this first projection.
3. **Use the existing View Header** as the main-view chrome composition and keep its flexible action/breadcrumb contract useful for design.

At the end of Phase A, the Figma library should be able to draw a recognizable Obsidian shell with tabs, a main View Header and a hosted side panel.

### Phase B — compose other hosted Views

The validated File Explorer rows remain closed. The user requested a separate hosted Files View composition after that checkpoint.

1. **Search View content — closed for the bounded Dark composition and unified generation:** it reuses Search Filled, editable result Components and the validated Side Panel host. The user accepted the revision on 2026-10-02.
2. **Files View composition — closed for the bounded Dark excerpt:** its original Folder, Default File, tagged rows and Header Actions were accepted on 2026-10-03. The user also confirmed the primitive-based structure in Figma Desktop on 2026-10-03.
3. **Bookmarks View content — closed for the bounded Dark composition:** it uses the existing Bookmarks tab and Side Panel host. Its header reuses the Files action Components for the identical New group and Collapse all icons; its own action and row sets cover the observed Dark scene with a group, selected nested bookmark, and a multiline root bookmark. The user accepted the generated result on 2026-10-03.
4. **Next after primitive mode validation: Outline View content.** Build it from the already obvious hierarchical/wrapping behavior, couple it to the validated Side Panel host, and add it to the one-action UI Kit generation.
5. Add **All Properties View content** only to the level needed to represent the real hosted View.

At the end of Phase B, the UI Kit should support drawing the common side-panel Views shown in Obsidian.

### Phase C — fill the mapped public inventory in batches

Move the already mapped `public-api` components into Figma using the mechanisms now proven by Button, Search, nested components, Auto Layout and responsive hosts.

Do not limit batches to arbitrary counts. Generate every family that fits existing capabilities; isolate only genuine technical outliers.

### Phase D — state/theme consolidation

After the useful component vocabulary exists in Figma:

- consolidate observed states into Component Sets;
- close important hover/active/disabled gaps;
- project Dark/Light Variables where evidence exists (the Icon Button and Tree Navigation Row subset is prepared; Desktop validation is pending);
- capture and implement the Workspace Tab Light appearance; the validated Dark set does not establish Light colors or states;
- normalize naming/sections/properties;
- only then treat the library as publication-ready.

This ordering deliberately favors **breadth and usable composition first**, then systematic refinement. It avoids spending a day perfecting one state while the rest of the UI Kit does not yet exist.

## 9. Decision rules for agents

Before starting work, agents must ask only these questions:

1. **Has the user already confirmed this front is complete?** That confirmation overrides a stale "next" marker. Correct the map and stop that front unless the user requests a new deliverable or identifies a concrete defect.
2. **Does the API/code already establish the semantic component?** If yes, use it. Do not re-prove it in DOM.
3. **Is the required visual behavior already obvious in screenshots/runtime?** If yes, implement it.
4. **Is there a concrete mismatch or missing technical value that blocks implementation?** Only then inspect DOM/CSSOM.
5. **Does this work make the Figma UI Kit more composable?** Prefer screen-building capability over another isolated diagnostic specimen.

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
