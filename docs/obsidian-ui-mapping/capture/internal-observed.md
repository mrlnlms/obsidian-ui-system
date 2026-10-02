# Internal UI observed in Obsidian

`internal-observed` covers reusable application UI not represented by the public API catalog. The target is Obsidian chrome such as navigation, tabs, pane headers, bars, results, Properties, and related controls. Note/editor content, Markdown, and CodeMirror DOM are outside this scope. `origin: internal-observed` remains distinct from `origin: public-api`.

Fixtures expose real UI states. The note with YAML under `dev-vault/internal-observed-fixtures/` exposed Property rows and a breadcrumb; its keys, values, note text, and folder name are sample content and raw evidence, not component definitions. The same applies to file names and search results used to expose other patterns.

## Revised inventory

This inventory describes only UI patterns already located in the running app. The File Explorer file row has a Mapping `ComponentSnapshot`; Property rows and the breadcrumb have a separate structural DOM/CSSOM diagnostic. Other rows below have only shallow inventory evidence. All three detailed examples were observed in Dark; no Light appearance or additional states are implied.

| Pattern | Existing evidence | UI Kit status |
| --- | --- | --- |
| File Explorer file row | `.nav-file-title` with `.nav-file-title-content`; one supported, active row captured with structure, dimensions, and computed styles. | Concrete candidate for the observed active file row; filename is a content slot. |
| File Explorer folder row | `.nav-folder-title`, disclosure icon, and `mod-collapsible` observed. | Located; needs detailed capture before promotion. |
| Workspace tab | `.workspace-tab-header` and inner container; active classes observed. | Located; needs detailed capture before promotion. |
| Pane/view header | Title container and action area observed. | Located; needs detailed capture before promotion. |
| Property row | `.metadata-property` with key and value areas; text and checkbox controls captured. | Concrete candidate with key/value slots and the two observed control forms. |
| Breadcrumb segment | `.view-header-breadcrumb` in a note header captured with dimensions and styles. | Concrete candidate for one segment with a label slot; a full trail is not yet defined. |
| Search result row | Match inside result/file grouping, with highlighted text observed. | Located; needs detailed capture before promotion. |
| Command palette row | `.suggestion-item` with title, auxiliary area, and one selected class observed. | Located; needs detailed capture before promotion. |
| Ribbon action | Repeated `.side-dock-ribbon-action` with SVG observed. | Located; needs detailed capture before promotion. |
| Status bar item | Repeated `.status-bar-item`, including a clickable modifier, observed. | Located; needs detailed capture before promotion. |

Sidebars and overlays are relevant UI contexts, but the current evidence does not define a reusable sidebar or internal overlay component. The public API catalog already covers its own modal specimens; this inventory does not relabel them as internal.

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
