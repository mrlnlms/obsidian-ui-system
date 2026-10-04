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
| Workspace Tab | **Dark desktop Main/Sidedock Figma-validated**; bounded full-kit Dark/Light appearance accepted in Figma Desktop |
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

The previously validated Explorer rows remain closed. The user requested an incremental Files composition from the scene open in Obsidian on 2026-10-02. Its original version used separate Folder, Default File, and tagged JSON/ZIP Components in the validated Side Panel; the user accepted it in Figma Desktop on 2026-10-03. The consolidation projects the same bounded states into `Obsidian / Tree Navigation Row`: `Kind=Folder|File`, only observed depths/states, and editable optional metadata for JSON/ZIP. Files composes those variants. The user confirmed the new structure and the later bounded Dark/Light Variable projection in Figma Desktop on 2026-10-03.

The six Folder combinations are variants in that shared set (`State=Expanded|Collapsed`, `Depth=0|1|2`). File Default depths 0/2/3 and Selected depth 0 use the same anatomy. Do not invent unobserved states/depths merely to fill a matrix. The older individual generators remain available for diagnostics but are no longer called by full generation.

### 4.4 Search, Bookmarks, Outline and All Properties Views

These are hosted Views, not generic “sidebar rows”. Bookmarks is also a hosted left View: its validated tab and Side Panel slot previously lacked their own content composition.

- **Search:** the earlier internal inventory observed only one match inside a file-grouped result. A focused Dark Search View probe covers the query/control row, count/sort bar, and three file groups. The first hosted composition was confirmed in Figma Desktop. A reported reuse defect reopened only its internals: the revised generator now nests the existing `Obsidian / Search` Filled instance in a global-field component, uses component instances for the control row, toolbar, file groups and matches, and omits the unrelated collapsed `Outline probe` sample. The user accepted the revised unified generation on 2026-10-02.
- **Bookmarks:** the Dark left tab and host were already validated. The focused Bookmarks content adds its own four-action header and three observed rows; it reuses two identical action variants from Files. The user confirmed the hosted View in Figma Desktop on 2026-10-03.
- **Outline:** visual evidence already demonstrates a hierarchical list with wrapping/variable-height items. It is exploratory, not yet closed as a Figma family.
- **All Properties:** a separate `all-properties` View exists; the in-document `.metadata-property` observation does not define this View.

These should be built as **View content systems** placed inside the same workspace/sidedock hosting structure.

The Figma plugin offers one generation action on a blank page: select a Package v1 ZIP and click **Generate UI Kit**. The ZIP supplies Button/Search; versioned tracked probes supply the implemented internal Components. The action calls their existing generators in dependency order, passes new Components and the Side Panel host explicitly into Search, Files and Bookmarks View compositions, and places each View in a duplicate of the validated Dark Side Panel preview. No prior Component Set, standalone JSON selection, or individual generator click is required. The appearance collection is file-wide and reused across runs/pages; a failed run removes new page roots and only a collection created in that run, or restores reused Variable values. The bounded Package v2 Button normal action remains a separate regression diagnostic for causal token binding evidence, not a source for full-kit appearance. The user accepted the unified flow and Search component-reuse revision on 2026-10-02 and the Files and Bookmarks compositions on 2026-10-03. Each next Component should reuse finished pieces and be added to this full generation path.

Before the next sidebar/ribbon surface, the full action builds `Obsidian / Icon Button` and `Obsidian / Tree Navigation Row` from tracked evidence. Icon Button owns the observed 28×24 toolbar geometry, 28×39 Sidedock context and 24×20 Search Match case context, button `State`/`Tone`, and a swappable observed SVG. `Tone=Muted|Opaque` preserves the recorded glyph opacity. Files/Bookmarks header actions, View Header controls, Search settings/Match case and the Side Panel collapse control use instances. Tree Navigation Row owns the common File/Folder row geometry, selection, typography, ellipsis and indent; a trailing tag is optional metadata. The user validated this structure in Figma Desktop on 2026-10-03.

The bounded appearance pass captured these two primitives in real Obsidian Desktop Dark and Light modes; `tests/fixtures/primitive-theme-probe.json` is the focused tracked projection, and the raw runtime probe remains beside the Package ZIPs. One Figma Variable collection owns both modes for icon foreground, row default/selected text, selected background, disclosure and metadata colors, and the observed 8/4 px radii. The icon components retain one canonical observed SVG geometry each; only visible paints matching the observed glyph color bind to the icon Variable, preserving the SVG import's hidden paints and instance swap. State, Context, Kind, Depth, Label and metadata remain Component properties. Default rows and buttons stay transparent; selected background uses a separate bound underlay with 6.7% node opacity so its transparency survives paint binding. Unobserved hover is not added. The generated page explicitly starts in Dark; its Page variable mode controls both sets and their nested instances. The action performs a Dark → Light → Dark readback on the two sets and nested Files/Search previews, including structure and instance-property stability. The first Desktop run exposed opaque SVG bounds and selected fill; the next run stopped at a combined underlay assertion without per-property readback. That check now tolerates numeric opacity normalization, tests actual resize on a temporary selected instance at 200 and 300 px, and reports the measured value if it diverges. The user subsequently confirmed the apparent error was an operation mistake and that the mode switch worked in Figma Desktop. The other components and host backgrounds were Dark only at this primitive checkpoint; the subsequent full-kit pass is recorded below.

**Primitive appearance checkpoint (2026-10-03):** the user clarified that the reported error was their operation mistake, confirmed the result, and successfully switched the primitives to Light through the page Variable mode. The bounded Icon Button and Tree Navigation Row theme pass is closed.

**Full-kit appearance checkpoint (2026-10-03):** paired Obsidian Desktop CSS/DOM observations and Package v1 Dark/Light exports supply a focused `ui-kit-theme-probe.json`. The same Figma collection is extended and named `Obsidian UI / Appearance`; it binds the already generated Button, Search, Workspace Tab, View Header, Side Panel, Search, Files and Bookmarks parts and their preview surfaces. General theme binding runs on newly generated roots after composition, skips descendants of instances so their main Components own the visual, and preserves selected overlay opacity. Consumer-specific selected/faint glyph paints are the narrow exception: their canonical instances bind to the consumer role. The Dark structural fixtures, variants, text properties, icon swaps, hosted slots and resize remain the existing contracts. Both Dark and Light Package v1 inputs are accepted; Button/Search are classified using their input mode, while the page starts in Dark. Local readback checks Dark → Light → Dark for bound colors and structural stability. The user accepted the generated full-kit Dark/Light result in Figma Desktop. This closes the appearance pass for the currently generated components; it does not establish unobserved hover or new component families.

**Variables and glyph foundation review (user-accepted 2026-10-03):** the six primitive color roles now alias the matching global color Variables in the same `Obsidian UI / Appearance` collection after checking both observed modes: icon (`--icon-color`) and default row text follow `--text-muted` → `textMuted`; selected text follows `--text-normal` → `textNormal`; disclosure and metadata match `--text-faint` → `textFaint`; selected background follows `--background-modifier-hover` → `selectedOverlay`. This is a bounded semantic match, not a rule to merge future CSS roles merely because their RGB values coincide. Primitive radii remain separate. New generators can bind a known role when constructing a paint; Bookmarks row text and its selected underlay use that explicit path. The existing RGB classifier remains for previously generated/imported parts. Fixed SVG evidence in the current kit is indexed by geometry; one `Obsidian / Glyph / …` Component represents each distinct observed drawing, and Icon Button's `Icon` instance swap maps consumer actions to those glyphs. Names of actions remain on consumers. The fixture SVGs remain evidence; their original markup is preserved on the canonical glyph Component. The user accepted the foundation. The final cleanup routes Workspace Tab/Sidedock icons and Close, Search Disclosure/More, Bookmarks row icons, and Folder disclosure through instances of the same glyph Components. Active/Inactive appearance, the Folder disclosure rotation and opacity stay on consumers, without another SVG copy. The Search sort chevrons remain local because no matching observed SVG belongs to the fixed glyph evidence; the public Search input mask icons in the tracked Package v1 fixture have distinct observed geometry. The separate Package v2 Button normal action remains a regression diagnostic of causal CSS binding, while the Package v1 full kit uses its own Dark/Light appearance Variables. This cleanup adds no states or families. Code checks pass; the regenerated Figma Desktop result awaits user validation. Outline View content remains next in Phase B.

**Focused glyph/tree fidelity pass (prepared 2026-10-03; Figma Desktop visual check pending):** Obsidian Desktop still uses the observed 24 px SVG path with 2 px stroke but displays toolbar/navigation glyphs at 16 px and folder disclosure at 10 px. The canonical import and smaller instances now use proportional scale, preserving apparent stroke width; the same correction reaches Close and every canonical consumer. Collapsed folder disclosure now applies the observed CSS −90° turn as Figma's corresponding centered transform, so it points right; Expanded points down. Live Files DOM/CSS confirms `.nav-folder-children` draws a 1 px vertical border at each expanded depth, white/black at 12% in Dark/Light. `Obsidian / Tree Navigation Guide` owns that appearance and Files composes its instances from the existing row hierarchy, while rows remain the shared `Tree Navigation Row` instances. Local code tests and build can establish geometry and dependency structure; the user must compare optical weight, Close/Disclosure, guide continuity and resize in the regenerated Figma page. Once accepted, Outline View content remains the next Phase B surface.

**Appearance collection lifecycle fix (prepared 2026-10-03; Figma Desktop check pending):** `Generate UI Kit` now selects one compatible `Obsidian UI / Appearance` collection per Figma file and upserts its known Variables by name/type, retaining collection and Variable IDs across runs and pages. New files create that name directly; the plugin no longer creates a transient `Navigation primitives` collection. A legacy or duplicate collection is considered plugin-owned only if its Dark/Light modes and known Variable contract match. Collection selection uses the Variable contract and a deterministic ID tie-break; it does not use private plugin data, which the local manifest cannot access without a plugin ID. After successful generation, the plugin rebinds equivalent UI Kit consumers on all pages, preserves existing modes where possible, and removes a duplicate only after checking nodes, styles, and other Variable aliases for remaining references. Unknown homonyms and collections still needed by older designs stay intact and are reported. Failed generation restores a reused collection instead of deleting it. The dedicated lifecycle regression passes locally; same-file repeated generation and cross-page mode switching still require the user-operated Figma Desktop check. This does not change token values or visual component contracts, and Outline remains the next roadmap surface after validation.

**UI Kit node lifecycle (prepared 2026-10-03; Figma Desktop check pending):** the file now records one managed kit page, generation and root IDs in document shared plugin data; every generated root and descendant receives that generation marker. A later `Generate UI Kit`, even when invoked from another page, builds on the managed page with the old kit intact, checks Component/variant identities, swaps external user instances to the new canonical Components, and then removes only roots whose markers match the manifest. It restores the root positions and reuses the file-wide Appearance collection. A handled build or migration failure keeps the previous kit and rolls back newly created roots; unmarked user content nested inside a managed root blocks deletion. Names alone never grant ownership. The node lifecycle regression exercises two runs, cross-page user instances, foreign homonyms and failure rollback locally; the user-operated Figma Desktop check must confirm instance overrides and that the source Components, Glyphs and previews do not accumulate on repeated runs. No visual contract or new family changes here; Outline remains next after validation.

**Conservative legacy adoption (prepared 2026-10-03; Figma Desktop check pending):** `Generate UI Kit` now recognizes the last complete pre-ownership format from `3f4fd74` through a read-only preflight of the four canonical sets, their known property types, Glyph presence, and Search/Files/Bookmarks previews. It then compares every old complete generation with the staged current generation before touching an old master: full root sequence and node nesting, Component definitions and variants, text and geometry (including glyph paths/circles/rectangles), recognized Variable binding roles, and the internal host/instance reference graph. It adopts all complete matching generations across pages, maps external instance masters to the new sources, restores text/variant/icon property values by semantic property name, and removes old roots only after migration. A second run uses the normal manifest lifecycle. Modified glyph paths, altered binding roles, incomplete sets, foreign homonyms, or other unexplained differences abort with a concrete mismatch and preserve the old kit. Local tests cover legacy → adoption → regeneration, two legacy pages, override preservation, and rejection cases; Figma Desktop still needs to confirm actual Figma normalization and overrides. No visual component contract or new family was changed; Outline remains next after validation.

**Post-regeneration root retention correction (user accepted 2026-10-04):** the second `Generate UI Kit` reported `0` legacy adoptions and `58` roots replaced, although the new kit disappeared. The next run reported that the manifest points to missing roots, confirming an actual lifecycle failure. The likely mechanism is placing new roots over old Sections before deleting those Sections; the deletion can take newly contained nodes with it. Regeneration now removes the old owned roots before restoring the new roots' positions, checks that every new root remains directly on the managed page, and focuses the retained preview before reporting success. A conservative recovery of an incomplete manifest accepts only surviving roots with the expected ownership marks and no unexplained canonical sources; it migrates external instances of surviving Components, then replaces the stale generation. If any ownership check fails, the action stops without deleting the ambiguous content. Local regressions cover replacement order, complete and partial loss, and retained-root readback. The user reported that the rerun appeared to work and authorized commit/push; detailed external-instance override readback was not reported. No visual component contract changed.

**Search highlight legibility correction (prepared 2026-10-03; Figma Desktop check pending):** screenshots of the actual Obsidian Search and generated Figma Dark/Light Search revealed an overbright title highlight and low-contrast matched snippet text. The title now uses a separate `matchHighlight` underlay at the observed 30% node opacity, with the title text above it. Matched snippet text now binds its range fill to `textNormal` so it remains legible in both modes. The single editable, wrapping Snippet TextNode remains; inline span backgrounds inside it are not projected because a fixed Figma rectangle would drift when text or width changes. Search structure, sample content, Side Panel slots, and resize contract remain as before. Compare the regenerated Search preview in Dark and Light before closing this correction.

**Glyph tone binding correction (prepared 2026-10-03; Figma Desktop check pending):** the next Desktop generation stopped at `Glyph: cor Faint não vinculada em right-triangle`. The source Component already bound its SVG paint to `icon-button/foreground`; the instance tone switch now identifies that inherited Variable binding before falling back to observed RGB, including paint and node-level Figma readbacks. It then binds the same canonical geometry to `tree-row/disclosure`. A focused regression covers RGB normalization and inherited bindings; the Figma result must still confirm that the disclosure appears and switches modes. No glyph geometry, state, or token values changed.

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
Workspace Tab         Dark structure FIGMA-VALIDATED; bounded Dark/Light full-kit appearance USER-ACCEPTED
WorkspaceTabs         FIGMA-VALIDATED (three Dark left tabs)
Side Panel/Sidedock   FIGMA-VALIDATED (bounded Dark left host)

VIEW CONTENT
Search                 FIGMA-VALIDATED (bounded Dark Side Panel composition)
Bookmarks              FIGMA-VALIDATED (bounded Dark Side Panel composition)
Icon Button            FIGMA-VALIDATED (bounded Dark/Light modes and structure)
Tree Navigation Row    FIGMA-VALIDATED (bounded Dark/Light modes and structure)
Outline                exploratory evidence
All Properties         shallow evidence

DOCUMENT UI
Property Row           characterized, deferred
```

## 8. Execution strategy from here

The next work should optimize for **usable screen composition**, not evidence volume.

### Phase A — finish the host skeleton

1. **Workspace Tab — Dark desktop sample validated; bounded Dark/Light appearance accepted**
   - the reusable Figma Component Set covers Main/Sidedock and Active/Inactive;
   - paired Light appearance has been captured, bound and accepted in the generated full kit;
   - the three-tab left Sidedock group now composes instances of this Component Set.
2. **Side Panel / WorkspaceSidedock composition**
   - the first Dark left host and three-tab Sidedock group reuse the validated Workspace Tab set;
   - the panel resizes around a 40 px tab area and a replaceable hosted-View slot;
   - Files and Bookmarks have their own 40 px `nav-header`; Search places its controls directly in its View. The host therefore does not impose a toolbar height;
   - the user compared the corrected Dark composition side by side with Obsidian in Figma Desktop and confirmed the 16 px collapse glyph, spacing at the 200 px expanded minimum, and wider alignment. Right sidedock is outside this first projection; the bounded Dark/Light appearance was accepted with the full kit.
3. **Use the existing View Header** as the main-view chrome composition and keep its flexible action/breadcrumb contract useful for design.

At the end of Phase A, the Figma library should be able to draw a recognizable Obsidian shell with tabs, a main View Header and a hosted side panel.

### Phase B — compose other hosted Views

The validated File Explorer rows remain closed. The user requested a separate hosted Files View composition after that checkpoint.

1. **Search View content — closed for the bounded Dark composition and unified generation:** it reuses Search Filled, editable result Components and the validated Side Panel host. The user accepted the revision on 2026-10-02.
2. **Files View composition — closed for the bounded Dark excerpt:** its original Folder, Default File, tagged rows and Header Actions were accepted on 2026-10-03. The user also confirmed the primitive-based structure in Figma Desktop on 2026-10-03.
3. **Bookmarks View content — closed for the bounded Dark composition:** it uses the existing Bookmarks tab and Side Panel host. Its header reuses the Files action Components for the identical New group and Collapse all icons; its own action and row sets cover the observed Dark scene with a group, selected nested bookmark, and a multiline root bookmark. The user accepted the generated result on 2026-10-03.
4. **Next: Outline View content.** Build it from the already observed hierarchical/wrapping behavior, couple it to the validated Side Panel host, and add it to the one-action UI Kit generation.
5. Add **All Properties View content** only to the level needed to represent the real hosted View.

At the end of Phase B, the UI Kit should support drawing the common side-panel Views shown in Obsidian.

### Phase C — fill the mapped public inventory in batches

Move the already mapped `public-api` components into Figma using the mechanisms now proven by Button, Search, nested components, Auto Layout and responsive hosts.

Do not limit batches to arbitrary counts. Generate every family that fits existing capabilities; isolate only genuine technical outliers.

### Phase D — state/theme consolidation

After the useful component vocabulary exists in Figma:

- consolidate observed states into Component Sets;
- close important hover/active/disabled gaps;
- preserve the user-validated Dark/Light behavior of the currently generated UI Kit when adding later component families;
- expand Dark/Light Variables to later component families only when their visual evidence exists;
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
