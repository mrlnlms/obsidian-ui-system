import assert from 'node:assert/strict';
import test from 'node:test';
import { compareExports, renderMarkdown, type AtlasExport, type DomNode, type Specimen } from './snapshot-diff.js';

function node(tag = 'input'): DomNode {
  return {
    tag,
    classes: ['control'],
    properties: { value: 'before', disabled: false },
    sizePx: { width: 100, height: 20 },
    styles: { color: 'rgb(0, 0, 0)', display: 'block' },
    children: [],
  };
}

function specimen(id: string, variant: string): Specimen {
  return {
    id, variant, name: id, category: 'Inputs', origin: 'public-api',
    implementation: `obsidian.${id}`, states: { current: 'enabled', known: ['enabled', 'disabled'] },
    dom: node(),
  };
}

function exportData(directory: string, components: Specimen[], tokens: Record<string, string>): AtlasExport {
  return {
    directory,
    manifest: { obsidianVersion: '1.14.3', schemaVersion: '0.2.0', mode: 'dark' },
    tokens: { values: tokens },
    components,
  };
}

test('classifies specimens and tokens and separates the relevant changes', () => {
  const oldChanged = specimen('obsidian.text', 'filled');
  const newChanged = structuredClone(oldChanged);
  newChanged.dom.classes = ['control', 'is-filled'];
  newChanged.dom.properties = { value: 'after', disabled: false };
  newChanged.dom.styles.color = 'rgb(255, 255, 255)';
  newChanged.dom.sizePx.width = 120;
  newChanged.dom.children = [node('span')];
  newChanged.states!.current = 'disabled';

  const before = exportData('before', [oldChanged, specimen('obsidian.old', 'normal'), specimen('obsidian.same', 'normal')], {
    '--same': '#000', '--changed': '#111', '--removed': '#222',
  });
  const after = exportData('after', [newChanged, specimen('obsidian.new', 'normal'), specimen('obsidian.same', 'normal')], {
    '--same': '#000', '--changed': '#333', '--added': '#444',
  });
  after.manifest.schemaVersion = '0.3.0';
  after.manifest.obsidianSdkVersion = '1.13.1';

  const report = compareExports(before, after);
  assert.deepEqual(report.components.counts, { added: 1, removed: 1, changed: 1, unchanged: 1 });
  assert.deepEqual(report.tokens.counts, { added: 1, removed: 1, changed: 1, unchanged: 1 });
  const changed = report.components.entries.find((entry) => entry.id === 'obsidian.text');
  assert.equal(changed?.status, 'changed');
  assert.deepEqual(new Set(changed?.changes?.map((change) => change.kind)),
    new Set(['anatomy', 'classes', 'states', 'values', 'computed-styles', 'measurements']));
  assert.equal(changed?.changes?.find((change) => change.path === 'dom.properties.value')?.after, 'after');
  assert.equal(report.components.entries.find((entry) => entry.id === 'obsidian.new')?.after?.id, 'obsidian.new');
  assert.equal(report.components.entries.find((entry) => entry.id === 'obsidian.old')?.before?.id, 'obsidian.old');
  assert.equal(report.manifest.fields.find((field) => field.field === 'obsidianSdkVersion')?.status, 'added');
  assert.equal(report.manifest.fields.find((field) => field.field === 'schemaVersion')?.status, 'changed');
  assert.equal(report.manifest.fields.find((field) => field.field === 'obsidianVersion')?.status, 'unchanged');
  assert.match(renderMarkdown(report), /### Added \(1\)/);
  assert.match(renderMarkdown(report), /dom\.styles\.color/);
});

test('ignores CSS class and known-state ordering', () => {
  const beforeSpecimen = specimen('obsidian.text', 'normal');
  beforeSpecimen.dom.classes = ['a', 'b'];
  const afterSpecimen = structuredClone(beforeSpecimen);
  afterSpecimen.dom.classes = ['b', 'a'];
  afterSpecimen.states!.known = ['disabled', 'enabled'];
  const report = compareExports(
    exportData('before', [beforeSpecimen], { '--same': '#000' }),
    exportData('after', [afterSpecimen], { '--same': '#000' }),
  );
  assert.equal(report.components.counts.unchanged, 1);
  assert.equal(report.tokens.counts.unchanged, 1);
});

test('ignores Obsidian insertion marker and sub-millipixel geometry noise', () => {
  const beforeSpecimen = specimen('obsidian.dropdown', 'default');
  beforeSpecimen.dom.classes = ['dropdown', 'node-insert-event'];
  beforeSpecimen.dom.sizePx.height = 13.30938720703125;
  const afterSpecimen = structuredClone(beforeSpecimen);
  afterSpecimen.dom.classes = ['dropdown'];
  afterSpecimen.dom.sizePx.height = 13.3094482421875;
  const before = exportData('before', [beforeSpecimen], {});
  const after = exportData('after', [afterSpecimen], {});
  assert.equal(compareExports(before, after).components.counts.unchanged, 1);

  afterSpecimen.dom.sizePx.height = 13.32;
  assert.equal(compareExports(before, after).components.counts.changed, 1);
});

test('rejects duplicate stable specimen identities', () => {
  const duplicate = specimen('obsidian.text', 'normal');
  const before = exportData('before', [duplicate, structuredClone(duplicate)], {});
  const after = exportData('after', [], {});
  assert.throws(() => compareExports(before, after), /Duplicate specimen obsidian\.text\/normal/);
});
