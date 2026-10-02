# Internal UI observed in Obsidian

`internal-observed` covers reusable application and view chrome not represented by the public API catalog. The target includes navigation, tabs, pane headers, bars, and results. Note/editor content, Markdown, and CodeMirror DOM are outside this front. `origin: internal-observed` remains distinct from `origin: public-api`.

Fixtures expose real UI states. The note with YAML under `dev-vault/internal-observed-fixtures/` exposed Property rows and a breadcrumb; its keys, values, note text, and folder name are sample content and raw evidence, not component definitions. The same applies to file names and search results used to expose other patterns.

## Revised inventory

This inventory describes only UI patterns already located in the running app. File Explorer rows have standalone Mapping probes; Property rows and the breadcrumb have a separate structural DOM/CSSOM diagnostic. Evidence for the remaining patterns varies as noted below. The detailed samples are Dark; no Light appearance is implied.

| Pattern | Existing evidence | UI Kit status |
| --- | --- | --- |
| File Explorer file row | `.nav-file-title` with `.nav-file-title-content`; one supported, active row captured with structure, dimensions, and computed styles. | Concrete candidate for the observed active file row; filename is a content slot. |
| File Explorer folder row | `.nav-folder-title`, disclosure icon, states and depths 0–2 in the standalone probe. | Generated and validated in Figma for this phase; no functional tree is implied. |
| Workspace tab | `.workspace-tab-header` and inner container; active classes observed. | Located; needs detailed capture before promotion. |
| Pane/view header | Visible Dark Markdown header captured with navigation, title/breadcrumb area, actions, and horizontal geometry; a Bookmarks header has the same three areas but is hidden in its sidebar. | View Header, Breadcrumb Trail, and Breadcrumb Segment were reviewed and accepted in Figma for this phase; the middle resize transition remains approximate. |
| Property row | `.metadata-property` with key and value areas; text and checkbox controls captured inside `.metadata-container` under the Markdown View's editor. | Note/editor UI, outside the current application/view chrome front; it is not a row of the separate `all-properties` view. |
| Breadcrumb segment | `.view-header-breadcrumb` in a note header captured with dimensions and styles; horizontal priority checked at two widths. | Part of the View Header; its Figma instances are reusable, with a documented narrow-width transition difference. |
| Search result match | `.search-result-file-match` inside `.search-result-file-matches` under a file-grouped `.search-result`. | Part of a grouped Search result, not the complete Search result component. |
| Command palette row | `.suggestion-item` with title, auxiliary area, and one selected class observed. | Located; needs detailed capture before promotion. |
| Ribbon action | Repeated `.side-dock-ribbon-action` with SVG observed. | Located; needs detailed capture before promotion. |
| Status bar item | Repeated `.status-bar-item`, including a clickable modifier, observed. | Located; needs detailed capture before promotion. |

Sidebars and overlays are relevant UI contexts, but the current evidence does not define a reusable sidebar or internal overlay component. The public API catalog already covers its own modal specimens; this inventory does not relabel them as internal.

The View Header probe is a separate, single-scene `view-header-probe-2026-10-02.json` next to the Package ZIPs. Its tracked test copy is under the Figma plugin's `tests/fixtures/`. The observed Markdown title, breadcrumb labels, and action icons are content of that view; the three-area header structure is the reusable chrome. The hidden Bookmarks header is structural comparison only, not a second visual sample. See the [Figma plugin guide](../../../apps/obsidian-ui-system-figma/README.md#first-view-header-from-a-standalone-probe) for the bounded generation action.

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

At sidebar widths 374.359375 and 200 px, folder titles measured 350.359375 and 176 px respectively, while height stayed 24.890625 px. A long root label measured 159 px of scroll content within 144 px available at the narrow width, both open and closed. Its computed CSS is `flex-shrink: 1`, `white-space: pre`, `overflow: hidden`, `text-overflow: ellipsis`. Dark appearance is a transparent title with 8 px radius, 13 px / 400 label at 16.9 px line height in `rgb(179, 179, 179)`, and SVG stroke in `rgb(102, 102, 102)`. The Figma reader combines only the observed two state appearances and three depth geometries; it does not infer depth beyond 2 or a functional tree.
