# Internal UI observed in Obsidian

`internal-observed` covers reusable application and view chrome not represented by the public API catalog. The target includes navigation, tabs, pane headers, bars, and results. Note/editor content, Markdown, and CodeMirror DOM are outside this front. `origin: internal-observed` remains distinct from `origin: public-api`.

Fixtures expose real UI states. The note with YAML under `dev-vault/internal-observed-fixtures/` exposed Property rows and a breadcrumb; its keys, values, note text, and folder name are sample content and raw evidence, not component definitions. The same applies to file names and search results used to expose other patterns.

## Revised inventory

This inventory describes only UI patterns already located in the running app. File Explorer rows have standalone Mapping probes; Property rows and the breadcrumb have a separate structural DOM/CSSOM diagnostic. Evidence for the remaining patterns varies as noted below. The detailed samples are Dark; no Light appearance is implied.

| Pattern | Existing evidence | UI Kit status |
| --- | --- | --- |
| File Explorer file row | `.nav-file-title` with `.nav-file-title-content`; active and common unselected rows observed. | Active row validated; new Default File depth 0/3 variants in the hosted Files composition await Desktop validation. Filename is a content slot. |
| File Explorer folder row | `.nav-folder-title`, disclosure icon, states and depths 0–2 in the standalone probe. | Generated and validated in Figma for this phase; no functional tree is implied. |
| Workspace tab | `WorkspaceTabs`/`WorkspaceLeaf` semantics from the public API; four Dark tab appearances measured in the main group and sidedock, with active/inactive states. | First Component Set validated in Figma Desktop for this bounded sample. |
| Sidedock host | `WorkspaceSidedock` semantics from the public API; Dark left host measured with Files, Search and Bookmarks tabs. | First Tab Group and Side Panel composition generated and confirmed in Figma Desktop for this bounded Dark left sample. |
| Pane/view header | Visible Dark Markdown header captured with navigation, title/breadcrumb area, actions, and horizontal geometry; a Bookmarks header has the same three areas but is hidden in its sidebar. | View Header, Breadcrumb Trail, and Breadcrumb Segment were reviewed and accepted in Figma for this phase; the middle resize transition remains approximate. |
| Property row | `.metadata-property` with key and value areas; text and checkbox controls captured inside `.metadata-container` under the Markdown View's editor. | Note/editor UI, outside the current application/view chrome front; it is not a row of the separate `all-properties` view. |
| Breadcrumb segment | `.view-header-breadcrumb` in a note header captured with dimensions and styles; horizontal priority checked at two widths. | Part of the View Header; its Figma instances are reusable, with a documented narrow-width transition difference. |
| Search result match | `.search-result-file-match` inside `.search-result-file-matches` under a file-grouped `.search-result`. | Part of a grouped Search result, not the complete Search result component. |
| Command palette row | `.suggestion-item` with title, auxiliary area, and one selected class observed. | Located; needs detailed capture before promotion. |
| Ribbon action | Repeated `.side-dock-ribbon-action` with SVG observed. | Located; needs detailed capture before promotion. |
| Status bar item | Repeated `.status-bar-item`, including a clickable modifier, observed. | Located; needs detailed capture before promotion. |

Sidebars and overlays are relevant UI contexts, but the current evidence does not define a reusable sidebar or internal overlay component. The public API catalog already covers its own modal specimens; this inventory does not relabel them as internal.

## Workspace Tab, Dark desktop

The public API establishes `WorkspaceTabs` as the desktop parent of `WorkspaceLeaf`; runtime measurements below concern only the tab header's appearance and sizing. A targeted Obsidian CLI `eval` on 2026-10-02 measured visible main and sidedock tabs without changing the app. The full raw diagnostic and the focused `workspace-tab-probe-2026-10-02.json` are ignored local evidence next to the Figma Package ZIPs; the Figma plugin tracks a copy of the focused probe in `tests/fixtures/`.

| Context | Active | Inactive | Sizing and content |
| --- | --- | --- | --- |
| Main tab group | 34 px high, `#1c1c1c` background, 10 px top corners, visible 20 px close control | 34 px high, transparent, close control hidden | Tabs use `flex: 1 1 0px`, `min-width: 0`, `max-width: 320px`; title is 13 px / 400 / 16.9 px, one line with ending ellipsis. The measured four-tab scene gave each tab about 99 px. |
| Sidedock tab group | 28 × 25 px, white at 0.067 opacity over `#282828`, 8 px radius, 16 px icon | 28 × 25 px, transparent, 16 px icon | Icon only; titles and close controls are hidden. Visible icons have 3 px between tabs. |

The active main sample used a long Markdown note title; the inactive sample used `New tab`. Sidedock active and inactive samples were Bookmarks and Files. These labels and glyph identities are scene content. The Figma translation uses one editable title slot and a swappable nested icon; the same Files glyph is used in both sidedock states with their separately observed colors and opacities. This does not add a new Obsidian state. The initial Main width is sample geometry; equal sharing and the 320 px maximum come from the observed flex behavior. Light and hover appearances were not measured.

## Side Panel / left WorkspaceSidedock, Dark desktop

A focused Obsidian CLI read measured the visible left host at 242.296875 px wide. Its tab area is 40 px high with three 28 × 25 px tabs at 3 px gaps, starting 44 px from the host's left edge and 7 px from the top. The collapse control's clickable area is 28 × 39 px, 8 px from the right edge; its rendered SVG is only 16 × 16 px, offset 6 px right and 12 px down inside that area, with `rgb(179, 179, 179)` at 0.85 opacity. The host background is `rgb(40, 40, 40)`. Its sample height above the vault-profile region is 880.109375 px; that height is a scene size, not an intrinsic panel rule. The ignored readback is `side-panel-probe-2026-10-02.json` next to the Figma Package ZIPs, with a tracked copy under the Figma plugin's `tests/fixtures/`.

At the user's narrower Obsidian scene the expanded left host measured 200 px. The tab group stayed at its 44 px left inset and the collapse control stayed 8 px from the right, leaving 30 px between the tab group and the control. The user observed that dragging narrower collapses the Sidedock instead of pushing these elements together. This supports a 200 px minimum for the first expanded Figma sample; it does not define a collapsed visual variant or a universal minimum across platforms/themes.

The corrected Figma composition was compared side by side with Obsidian in Desktop on 2026-10-02. The user confirmed the smaller collapse glyph and the spacing in the narrow preview.

## Search View content, Dark desktop

The Search View is hosted under the left Sidedock without a separate `nav-header`. With the normal query `probe`, the Obsidian CLI exposed the visible Dark View at 200 px wide. The ignored full DOM/style readback is `search-view-probe-2026-10-02.json` next to the Figma Package ZIPs; a focused projection is tracked under the Figma plugin's `tests/fixtures/`. The query and note text are scene content. The view has a 30 px search input inside a control row with 12 px horizontal inset, Match case and settings controls, followed by a 33 px count/sort bar and grouped results. At this width, the first title-only group is collapsed and two further file groups expose two matches each. File titles are 24.890625 px high; short snippets are about 32 px high, while longer snippets wrap to taller rows. The results have a 12 px horizontal inset and the expanded match surfaces use `rgb(28, 28, 28)` over the `rgb(40, 40, 40)` host.

The first Figma projection covered this visible Search state with the settings panel closed and was placed through the validated Side Panel's `Hosted View` swap in a duplicated resize preview. The user's Figma Desktop confirmation on 2026-10-02 closed that composition for its observed scope. The later component-reuse revision curates two expanded groups from the same probe and leaves the unrelated collapsed `Outline probe` group out of the demonstration. The public `SearchComponent` specimen supplies the search-field base; it does not define the Search View's count bar or file-grouped results. The user accepted the revised unified generation on 2026-10-02.

All three observed tabs were activated in turn and Files was restored. The active tab uses `rgb(218, 218, 218)` at opacity 1 over the known active tab fill; inactive icons use `rgb(179, 179, 179)` at opacity 0.85. Files and Bookmarks each place a 40 px `nav-header` inside their own hosted View; Search instead starts with its search controls directly below the tab area. File Explorer uses `.nav-files-container` for its body, while Bookmarks uses `.view-content`. These are View-specific interiors, so the Side Panel composition provides one flexible hosted-View slot below the tab area rather than forcing a common toolbar or DOM class. The first Figma projection covers this left Dark host and its three observed tab labels; Right and Light were not projected.

The later Bookmarks content readback used the visible Dark left View at 200 px. Its own 40 px header has four 28 × 24 px actions with 2 px gaps, centered in the View. New group and Collapse all use the same observed SVGs as the existing Files header actions, so the Figma composition reuses those Components. The `.view-content` has 12 px horizontal and 4 px top padding. The focused excerpt contains an expanded group, a selected child bookmark, and a root bookmark whose long label wraps to a 41.78125 px row; short rows measure 24.890625 px. This is a visual sample rather than a functional bookmark tree. The user accepted its Figma composition on 2026-10-03.

The View Header probe is a separate, single-scene `view-header-probe-2026-10-02.json` next to the Package ZIPs. Its tracked test copy is under the Figma plugin's `tests/fixtures/` and is bundled into **Generate UI Kit**. The observed Markdown title, breadcrumb labels, and action icons are content of that view; the three-area header structure is the reusable chrome. The hidden Bookmarks header is structural comparison only, not a second visual sample. See the [Figma plugin guide](../../../apps/obsidian-ui-system-figma/README.md#component-scope-and-confirmed-behavior) for the bounded component scope.

### View Header breadcrumb width priority

The same visible Markdown header was measured with a temporary inline header width, restored immediately after each measurement. The active note then had the title `teste grave`; its ancestor labels matched the earlier probe. These are layout measurements, not new component states.

| Header width | Title area | Ancestor trail | Current title | Ancestor widths | Separator widths |
| --- | --- | --- | --- | --- | --- |
| 300 px | 148 px | 76.3125 px | 67.6875 px, full | 21.65625 / 19.203125 / 17.78125 px | 5.890625 px each |
| 650 px | 498 px | 344.5 px | 67.6875 px, full | 127.34375 / 105.96875 / 93.515625 px | 5.890625 px each |

The `.view-header-title-container` is the immediate flex parent (`flex: 1 1 auto`, `min-width: 0`, `overflow: hidden`). Its `.view-header-title-parent` trail uses `flex: 0 100 auto`, `overflow: hidden`, `white-space: nowrap`; the current `.view-header-title` uses `flex: 0 0 auto`, `max-width: 100%`, `overflow: hidden`, `white-space: pre`, and ellipsis. Ancestor `.view-header-breadcrumb` elements use `flex: 0 1 auto` and ellipsis. Separators also compute to `flex: 0 1 auto`, but their intrinsic minimum plus `overflow: visible` keeps their measured width fixed. Navigation and actions remain 56 px each. The trail therefore absorbs the shortage before the current title; when there is room, the ancestors return to their natural widths.

The bounded Figma translation uses a Breadcrumb Segment Component for each ancestor, a Breadcrumb Trail Component composed of three Segment instances plus separator and current-title layers, and a Trail instance inside the View Header Component. Horizontal Auto Layout makes the ancestor group fill only the remaining width up to its natural text width; Segment instances fill and truncate inside that group; separators keep their natural widths. The current-title text can narrow and show an ending ellipsis once space is restricted. The View Header uses fixed-width Navigation and Actions groups and clips their overflow at the extreme narrow limit. Desktop screenshots confirm the overall resize but show that Figma retains ancestor ellipses longer and truncates the title earlier than Obsidian in the middle of the sequence. The user accepted this scoped approximation on 2026-10-02; no additional View Header investigation is part of this closed phase.

## Evidence boundary and next step

The validated File Explorer probe writes `internal-observed-probe-<timestamp>.json` under `dev-vault/obsidian-ui-exports/figma-packages/`, with `origin: internal-observed` and its capture context. Its top-level `labelOffsetPx` records the active file row label's observed `{ x, y }` relative to the row from their bounding rectangles; it is sample geometry, not a layout rule. The existing Properties/breadcrumb diagnostic is `internal-observed-fixtures-<timestamp>.json` in the same ignored directory. Neither enters the public API catalog or Package v2. The File Explorer probe command and the tracked fixture remain for reproducibility; no new capture is needed for this inventory.

Keep raw DOM, classes, attributes, scene content, dimensions, and computed styles in the evidence. The component-specific `FileExplorerRowModel` reader selects only the observed active Dark file row, its label slot and observed offset, padding, radius, and CSS colors from this standalone probe. The reader itself does not establish sizing or overflow. Separate measurements of the same row at two sidebar widths support the horizontal behavior translated by the Figma plugin; they do not establish other states or Light appearance. Observed dimensions are not automatically layout rules.

## File row with trailing tag

The same probe command now also records two Dark `is-unsupported` file rows with the separate anatomy `.nav-file-title > .nav-file-title-content + .nav-file-tag`. The observed JSON and ZIP files already exist in the development vault; their names and parent folders are scene content. The probe keeps each raw DOM snapshot and the computed horizontal CSS needed by the reader in `taggedRows`, without changing `ComponentSnapshot` or the Figma Package.

Direct DOM/CSSOM measurement with the sidebar at two actual widths gave:

| Sidebar | Row | JSON label / tag | ZIP label / tag |
| --- | --- | --- | --- |
| 374.359375 px | 350.359375 px | 247.28125 / 35.53125 px | 259.8125 / 24.546875 px |
| 230 px | 206 px | 104.46875 / 35.53125 px | 115.453125 / 24.546875 px |

The label starts 58 px from the row's left edge in this nested scene; the tag ends 8 px before the right edge. The label has `flex-shrink: 1`, `overflow: hidden`, `white-space: pre`, and `text-overflow: ellipsis`. The tag is a separate flex child with `margin-inline-start: auto` in the author CSS; its computed `flex-shrink` is also `1`, but its measured width remains constant while the label shrinks. The computed label-to-tag gap is 1.546875 px for the wide JSON sample and zero when narrow; ZIP has zero in both measurements. The tag stays visible.

The row is 24.890625 px tall, with transparent background, 8 px radius, and label color `rgb(179, 179, 179)`. The tag is 13.5 px tall, vertically centered, transparent, with 4 px horizontal padding, 4 px radius, `rgb(102, 102, 102)` text, 9 px / 600 type, 13.5 px line height, 0.45 px letter spacing, and `text-transform: uppercase`. The label uses 13 px / 400 type and 16.9 px line height. These values describe only the observed Dark `is-unsupported` samples. The 58 px inset is their tree position, not a rule of trailing tags or a hierarchy model.

## Folder row, Dark

The standalone probe also records visible folder titles at depths 0–2 in `folderRows`. Each entry contains the `.nav-folder-title` DOM snapshot, the measured disclosure/SVG/label offsets, computed horizontal CSS, and the observed SVG path, color and transform. This field remains outside the public `ComponentSnapshot` schema and Figma Package. Folder names and `data-path` identify the scene only; they are not component definitions.

The row has direct children `.collapse-icon > svg.right-triangle > path` and `.nav-folder-title-content`. Expanded and collapsed are observed through `is-collapsed` on the surrounding `.nav-folder` and disclosure, with SVG transforms `none` and `matrix(0, -1, 1, 0, 0, 0)` respectively. The SVG transform origin is its measured center (`5px 5px`). The root title itself retains `mod-collapsible`; after collapse settles, the descendant folder rows leave the DOM. The measured offsets from title left edge are disclosure/label 4/24 px at depth 0, 21/41 px at depth 1, and 38/58 px at depth 2. SVG offsets are 7, 24 and 41 px; the rendered SVG is 10 × 10 px inside a 16 × 16.890625 px disclosure box. The measured 17 px differences are limited to these three levels.

A focused 2026-10-03 CLI CSS read found `1px solid var(--nav-indentation-guide-color)` on each visible `.nav-folder-children` container. The three nested containers in the Files scene begin 12 px to the right of their owning folder rows and follow the descendant block, rather than appearing on a standalone row. The token resolves to white at 12% opacity in Dark and black at 12% in Light; the Light value was read by temporarily applying `theme-light` to the body and immediately restoring its original classes. The generated Files excerpt may therefore use one reusable guide instance per observed expanded folder container; it should not invent branch connectors or guides for collapsed folders.

At sidebar widths 374.359375 and 200 px, folder titles measured 350.359375 and 176 px respectively, while height stayed 24.890625 px. A long root label measured 159 px of scroll content within 144 px available at the narrow width, both open and closed. Its computed CSS is `flex-shrink: 1`, `white-space: pre`, `overflow: hidden`, `text-overflow: ellipsis`. Dark appearance is a transparent title with 8 px radius, 13 px / 400 label at 16.9 px line height in `rgb(179, 179, 179)`, and SVG stroke in `rgb(102, 102, 102)`. The Figma reader combines only the observed two state appearances and three depth geometries; it does not infer depth beyond 2 or a functional tree.

The later Files View projection uses a focused CLI readback from the visible Dark left sidedock at 200 px. Its 40 px `nav-header` has 8 px padding and five centered 28 × 24 px actions, with 16 px muted icons. The `.nav-files-container` has 12 px horizontal and 4 px top padding; visible row titles are 176 × 24.890625 px, separated by about 2 px. The tracked `file-explorer-view-probe.json` contains a nine-row excerpt: existing Folder Row depths 0–2, existing tagged JSON/ZIP rows at depth 2, and common unselected files at root and depth 3. The latter have label offsets 24 and 75 px and the same single-line ending ellipsis behavior. The omitted repeated JSON rows are scene content. This projection adds a hosted Files composition without changing the validated row components or claiming a functional tree. The user accepted the Figma Desktop result on 2026-10-03.
