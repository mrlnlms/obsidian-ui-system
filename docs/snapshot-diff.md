# Comparing Atlas snapshots

The CLI compares two complete Atlas export folders without using line-based JSON diffs. Run it from the repository root:

```sh
npm run diff:snapshots -- \
  scripts/fixtures/snapshot-diff/2026-09-30T18-58-42-296Z \
  scripts/fixtures/snapshot-diff/2026-09-30T19-24-30-063Z
```

Each input folder must contain `manifest.json`, `tokens.json`, and `components.json`. The optional third argument chooses the output directory:

```sh
npm run diff:snapshots -- <before-dir> <after-dir> <output-dir>
```

Without it, reports go to `dev-vault/.obsidian-ui-system/snapshot-diffs/<before-folder>__<after-folder>/`. The command writes `diff.json` and `diff.md`, replacing reports at that output path on a repeated run. Generated reports and exports are ignored by Git. `npm run check` validates the CLI and plugin TypeScript; `npm run build` builds both; `npm run test:diff` runs focused comparison tests.

## Comparison rules

- Specimen identity is the pair `(id, variant)`. The output classifies every identity as `added`, `removed`, `changed`, or `unchanged`; duplicate identities in either input cause an error. Added and removed entries include their full specimen snapshot in `diff.json`.
- Changed specimens contain typed field changes. `anatomy` compares the ordered tree of DOM tags; `classes` compares class sets without regard to order; `states` compares current and known states; `values` covers direct text, selected attributes and live DOM properties; `computed-styles` covers the captured style fields; `measurements` covers rendered `sizePx`; `metadata` covers name, category, origin and implementation. Each change records its path, status and available before/after values.
- DOM paths use child indices such as `dom.children[0]`. If children are inserted or reordered, the full anatomy change is reported and details are compared only at positions whose tags still match. The tool does not infer that moved DOM nodes are the same node.
- CSS custom properties are keyed by name and classified as `added`, `removed`, `changed`, or `unchanged`. The comparison uses resolved names and values, not the `scopes` annotation. `diff.md` summarizes unchanged tokens; `diff.json` lists every token entry.
- Manifest fields are compared by name, including runtime `obsidianVersion`, build-time `obsidianSdkVersion`, and `schemaVersion`. A field absent from an older export is `added`, distinct from a field with JSON `null`. Capture timestamps are compared too, so they normally differ.
- Values and computed styles are compared exactly. Measured sizes within 0.001 px are treated as unchanged because repeated browser layout can vary by less than one thousandth of a pixel; larger changes remain visible. The transient Obsidian `node-insert-event` DOM insertion marker is ignored when comparing class sets. Both values remain in the raw snapshots. Viewport, theme or platform changes may produce style and measurement differences without a component API change. Markdown shortens values over 160 characters for reading; JSON retains complete values.

## Historical validation with real exports

The versioned fixture pair in the command above preserves the seven-specimen export before input batch 1 with the 20-specimen export after it. The observed result is **13 added**, **0 removed**, **2 changed**, and **5 unchanged** specimens. The two changed records are Search `empty` and `filled`: their widths changed with the Atlas grid layout, and the newer capture stopped recording the irrelevant `checked: false` property on text inputs. All **945 tokens** were unchanged. The manifest reports runtime Obsidian `1.14.3` unchanged, SDK package `1.13.1` newly recorded, and schema `0.2.0 → 0.3.0`.
