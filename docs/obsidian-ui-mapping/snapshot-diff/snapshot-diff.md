# Comparing Mapping snapshots

The CLI compares two complete Mapping export folders without using line-based JSON diffs. Run it from the repository root:

```sh
npm run diff:snapshots -- \
  dev-vault/.obsidian-ui-system/ui-catalog-exports/BEFORE_TIMESTAMP \
  dev-vault/.obsidian-ui-system/ui-catalog-exports/AFTER_TIMESTAMP
```

Each input folder must contain `manifest.json`, `tokens.json`, and `components.json`. The optional third argument chooses the output directory:

```sh
npm run diff:snapshots -- <before-dir> <after-dir> <output-dir>
```

Replace the two timestamp placeholders with existing Mapping export folders. Without a third argument, reports go to `dev-vault/.obsidian-ui-system/snapshot-diffs/<before-folder>__<after-folder>/`. The command writes `diff.json` and `diff.md`, replacing reports at that output path on a repeated run. Default reports and exports are ignored by Git and remain locally until the optional **Developer: Clean Obsidian UI Development Exports** command or manual removal. A custom output directory remains until manually removed and may be tracked by Git; check its location before committing. The CLI prints the output path and retention reminder. `npm run check` validates the CLI and plugin TypeScript; `npm run build` builds both; `npm run test:diff` runs focused comparison tests.

## Comparison rules

- Specimen identity is the pair `(id, variant)`. The output classifies every identity as `added`, `removed`, `changed`, or `unchanged`; duplicate identities in either input cause an error. Added and removed entries include their full specimen snapshot in `diff.json`.
- Changed specimens contain typed field changes. `anatomy` compares the ordered tree of DOM tags; `classes` compares class sets without regard to order; `states` compares current and known states; `values` covers direct text, selected attributes and live DOM properties; `computed-styles` covers the captured style fields; `measurements` covers rendered `sizePx`; `metadata` covers name, category, origin and implementation. Each change records its path, status and available before/after values.
- DOM paths use child indices such as `dom.children[0]`. If children are inserted or reordered, the full anatomy change is reported and details are compared only at positions whose tags still match. The tool does not infer that moved DOM nodes are the same node.
- CSS custom properties are keyed by name and classified as `added`, `removed`, `changed`, or `unchanged`. The comparison uses resolved names and values, not the `scopes` annotation. `diff.md` summarizes unchanged tokens; `diff.json` lists every token entry.
- Manifest fields are compared by name, including runtime `obsidianVersion`, build-time `obsidianSdkVersion`, and `schemaVersion`. A field absent from an older export is `added`, distinct from a field with JSON `null`. Capture timestamps are compared too, so they normally differ.
- Values and computed styles are compared exactly. Measured sizes within 0.001 px are treated as unchanged because repeated browser layout can vary by less than one thousandth of a pixel; larger changes remain visible. The transient Obsidian `node-insert-event` DOM insertion marker is ignored when comparing class sets. Both values remain in the raw snapshots. Viewport, theme or platform changes may produce style and measurement differences without a component API change. Markdown shortens values over 160 characters for reading; JSON retains complete values.
