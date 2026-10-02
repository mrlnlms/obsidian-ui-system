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

The validated File Explorer probe writes `internal-observed-probe-<timestamp>.json` under `dev-vault/obsidian-ui-exports/figma-packages/`, with `origin: internal-observed` and its capture context. The existing Properties/breadcrumb diagnostic is `internal-observed-fixtures-<timestamp>.json` in the same ignored directory. Neither enters the public API catalog or Package v2. The File Explorer probe command and the tracked fixture remain for reproducibility; no new capture is needed for this inventory.

Keep raw DOM, classes, attributes, scene content, dimensions, and computed styles in the evidence. A reusable component would select only supported structure, content slots, useful evidenced states, and visual properties, with references back to that evidence. Observed dimensions are not automatically layout rules. The next front is the minimum normalization needed for reusable components, using these candidates rather than expanding the inventory now.
