import { isDeepStrictEqual } from 'node:util';

export type DiffStatus = 'added' | 'removed' | 'changed' | 'unchanged';
export type ChangeKind = 'anatomy' | 'classes' | 'states' | 'values' | 'computed-styles' | 'measurements' | 'metadata';

export interface DomNode {
  tag: string;
  classes: string[];
  attributes?: Record<string, string>;
  properties?: Record<string, string | boolean>;
  text?: string;
  sizePx: { width: number; height: number };
  styles: Record<string, string>;
  children: DomNode[];
}

export interface Specimen {
  id: string;
  variant: string;
  name: string;
  category: string;
  origin: string;
  implementation: string;
  states?: { current: string; known: string[] };
  dom: DomNode;
}

export interface MappingExport {
  directory: string;
  manifest: Record<string, unknown>;
  tokens: { values: Record<string, string>; scopes?: string[] };
  components: Specimen[];
}

export interface FieldChange {
  kind: ChangeKind;
  path: string;
  status: Exclude<DiffStatus, 'unchanged'>;
  before?: unknown;
  after?: unknown;
}

export interface ManifestField {
  field: string;
  status: DiffStatus;
  before?: unknown;
  after?: unknown;
}

export interface SpecimenDiff {
  id: string;
  variant: string;
  name: string;
  status: DiffStatus;
  before?: Specimen;
  after?: Specimen;
  changes?: FieldChange[];
}

export interface TokenDiff {
  name: string;
  status: DiffStatus;
  value?: string;
  before?: string;
  after?: string;
}

export type Counts = Record<DiffStatus, number>;

export interface DiffReport {
  formatVersion: '1';
  generatedAt: string;
  baseline: string;
  target: string;
  manifest: { fields: ManifestField[] };
  components: { counts: Counts; entries: SpecimenDiff[] };
  tokens: { counts: Counts; entries: TokenDiff[] };
}

const manifestOrder = [
  'obsidianVersion', 'obsidianSdkVersion', 'schemaVersion',
  'capturedAt', 'platform', 'theme', 'mode',
];

function has(record: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function sortedUnion(before: object, after: object): string[] {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
}

function statusFor(beforeExists: boolean, afterExists: boolean, before: unknown, after: unknown): DiffStatus {
  if (!beforeExists && !afterExists) return 'unchanged';
  if (!beforeExists) return 'added';
  if (!afterExists) return 'removed';
  return isDeepStrictEqual(before, after) ? 'unchanged' : 'changed';
}

function countsOf(entries: readonly { status: DiffStatus }[]): Counts {
  const counts: Counts = { added: 0, removed: 0, changed: 0, unchanged: 0 };
  for (const entry of entries) counts[entry.status]++;
  return counts;
}

function recordChange(
  changes: FieldChange[], kind: ChangeKind, path: string,
  beforeExists: boolean, afterExists: boolean, before: unknown, after: unknown,
): void {
  const status = statusFor(beforeExists, afterExists, before, after);
  if (status === 'unchanged') return;
  changes.push({
    kind, path, status,
    ...(beforeExists ? { before } : {}),
    ...(afterExists ? { after } : {}),
  });
}

function compareFields(
  changes: FieldChange[], kind: ChangeKind, path: string,
  before: object, after: object,
): void {
  const old = before as Record<string, unknown>;
  const next = after as Record<string, unknown>;
  for (const key of sortedUnion(before, after)) {
    recordChange(changes, kind, `${path}.${key}`, has(before, key), has(after, key), old[key], next[key]);
  }
}

function compareMeasurements(changes: FieldChange[], path: string, before: DomNode['sizePx'], after: DomNode['sizePx']): void {
  // DOM geometry can differ by tiny floating-point amounts between identical renders.
  for (const key of ['width', 'height'] as const) {
    if (Math.abs(before[key] - after[key]) >= 0.001) {
      recordChange(changes, 'measurements', `${path}.${key}`, true, true, before[key], after[key]);
    }
  }
}

function anatomy(node: DomNode): { tag: string; children: ReturnType<typeof anatomy>[] } {
  return { tag: node.tag, children: node.children.map(anatomy) };
}

function compareNode(changes: FieldChange[], before: DomNode, after: DomNode, path: string): void {
  if (before.tag !== after.tag) return;

  // node-insert-event is an Obsidian lifecycle marker, not component styling.
  const relevantClasses = (classes: string[]): string[] =>
    [...new Set(classes.filter((name) => name !== 'node-insert-event'))].sort();
  recordChange(changes, 'classes', `${path}.classes`, true, true,
    relevantClasses(before.classes), relevantClasses(after.classes));
  compareFields(changes, 'values', `${path}.attributes`, before.attributes ?? {}, after.attributes ?? {});
  compareFields(changes, 'values', `${path}.properties`, before.properties ?? {}, after.properties ?? {});
  recordChange(changes, 'values', `${path}.text`, has(before, 'text'), has(after, 'text'), before.text, after.text);
  compareFields(changes, 'computed-styles', `${path}.styles`, before.styles, after.styles);
  compareMeasurements(changes, `${path}.sizePx`, before.sizePx, after.sizePx);

  for (let index = 0; index < Math.min(before.children.length, after.children.length); index++) {
    compareNode(changes, before.children[index]!, after.children[index]!, `${path}.children[${index}]`);
  }
}

function compareSpecimen(before: Specimen, after: Specimen): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const field of ['name', 'category', 'origin', 'implementation'] as const) {
    recordChange(changes, 'metadata', `specimen.${field}`, true, true, before[field], after[field]);
  }

  const beforeStates = before.states;
  const afterStates = after.states;
  recordChange(changes, 'states', 'states.current', !!beforeStates, !!afterStates,
    beforeStates?.current, afterStates?.current);
  recordChange(changes, 'states', 'states.known', !!beforeStates, !!afterStates,
    beforeStates ? [...new Set(beforeStates.known)].sort() : undefined,
    afterStates ? [...new Set(afterStates.known)].sort() : undefined);

  recordChange(changes, 'anatomy', 'dom', true, true, anatomy(before.dom), anatomy(after.dom));
  compareNode(changes, before.dom, after.dom, 'dom');
  return changes;
}

function specimenKey(specimen: Pick<Specimen, 'id' | 'variant'>): string {
  return JSON.stringify([specimen.id, specimen.variant]);
}

function indexSpecimens(specimens: Specimen[], directory: string): Map<string, Specimen> {
  const indexed = new Map<string, Specimen>();
  for (const specimen of specimens) {
    const key = specimenKey(specimen);
    if (indexed.has(key)) throw new Error(`Duplicate specimen ${specimen.id}/${specimen.variant} in ${directory}`);
    indexed.set(key, specimen);
  }
  return indexed;
}

export function compareExports(before: MappingExport, after: MappingExport): DiffReport {
  const manifestFields = [...new Set([...manifestOrder, ...sortedUnion(before.manifest, after.manifest)])];
  const fields: ManifestField[] = manifestFields
    .filter((field) => has(before.manifest, field) || has(after.manifest, field))
    .map((field) => {
      const beforeExists = has(before.manifest, field);
      const afterExists = has(after.manifest, field);
      return {
        field,
        status: statusFor(beforeExists, afterExists, before.manifest[field], after.manifest[field]),
        ...(beforeExists ? { before: before.manifest[field] } : {}),
        ...(afterExists ? { after: after.manifest[field] } : {}),
      };
    });

  const beforeSpecimens = indexSpecimens(before.components, before.directory);
  const afterSpecimens = indexSpecimens(after.components, after.directory);
  const allKeys = [...new Set([...beforeSpecimens.keys(), ...afterSpecimens.keys()])]
    .sort((left, right) => left.localeCompare(right));
  const componentEntries: SpecimenDiff[] = allKeys.map((key) => {
    const old = beforeSpecimens.get(key);
    const next = afterSpecimens.get(key);
    const specimen = next ?? old!;
    if (!old) return { id: specimen.id, variant: specimen.variant, name: specimen.name, status: 'added', after: next };
    if (!next) return { id: specimen.id, variant: specimen.variant, name: specimen.name, status: 'removed', before: old };
    const changes = compareSpecimen(old, next);
    return {
      id: specimen.id, variant: specimen.variant, name: specimen.name,
      status: changes.length ? 'changed' : 'unchanged',
      ...(changes.length ? { changes } : {}),
    };
  });

  const tokenEntries: TokenDiff[] = sortedUnion(before.tokens.values, after.tokens.values).map((name) => {
    const beforeExists = has(before.tokens.values, name);
    const afterExists = has(after.tokens.values, name);
    const old = before.tokens.values[name];
    const next = after.tokens.values[name];
    const status = statusFor(beforeExists, afterExists, old, next);
    return status === 'unchanged'
      ? { name, status, value: next }
      : {
          name, status,
          ...(beforeExists ? { before: old } : {}),
          ...(afterExists ? { after: next } : {}),
        };
  });

  return {
    formatVersion: '1',
    generatedAt: new Date().toISOString(),
    baseline: before.directory,
    target: after.directory,
    manifest: { fields },
    components: { counts: countsOf(componentEntries), entries: componentEntries },
    tokens: { counts: countsOf(tokenEntries), entries: tokenEntries },
  };
}

function inline(value: unknown): string {
  if (value === undefined) return '—';
  const raw = (typeof value === 'string' ? value : JSON.stringify(value) ?? String(value))
    .replaceAll('\n', '\\n').replaceAll('\r', '\\r').replaceAll('\t', '\\t');
  const shortened = raw.length > 160 ? `${raw.slice(0, 157)}…` : raw;
  const longestBacktickRun = Math.max(0, ...[...shortened.matchAll(/`+/g)].map((match) => match[0].length));
  const fence = '`'.repeat(longestBacktickRun + 1);
  return `${fence}${shortened.replaceAll('|', '\\|')}${fence}`;
}

function headingCount(counts: Counts): string {
  return `added **${counts.added}**, removed **${counts.removed}**, changed **${counts.changed}**, unchanged **${counts.unchanged}**`;
}

export function renderMarkdown(report: DiffReport): string {
  const lines = [
    '# Mapping snapshot diff', '',
    `- Baseline: ${inline(report.baseline)}`,
    `- Target: ${inline(report.target)}`,
    `- Generated: ${inline(report.generatedAt)}`, '',
    '## Summary', '',
    `- Specimens: ${headingCount(report.components.counts)}.`,
    `- Tokens: ${headingCount(report.tokens.counts)}.`, '',
    '## Manifest', '',
    '| Field | Status | Baseline | Target |',
    '| --- | --- | --- | --- |',
  ];
  for (const field of report.manifest.fields) {
    lines.push(`| ${inline(field.field)} | ${field.status} | ${inline(field.before)} | ${inline(field.after)} |`);
  }

  lines.push('', '## Specimens', '');
  for (const status of ['added', 'removed', 'changed', 'unchanged'] as const) {
    const entries = report.components.entries.filter((entry) => entry.status === status);
    lines.push(`### ${status[0]!.toUpperCase()}${status.slice(1)} (${entries.length})`, '');
    if (!entries.length) {
      lines.push('None.', '');
      continue;
    }
    if (status === 'changed') {
      for (const entry of entries) {
        lines.push(`#### ${inline(`${entry.id} / ${entry.variant}`)}`, '',
          '| Part | Path | Status | Baseline | Target |',
          '| --- | --- | --- | --- |');
        for (const change of entry.changes ?? []) {
          lines.push(`| ${change.kind} | ${inline(change.path)} | ${change.status} | ${inline(change.before)} | ${inline(change.after)} |`);
        }
        lines.push('');
      }
    } else {
      for (const entry of entries) lines.push(`- ${inline(`${entry.id} / ${entry.variant}`)} — ${entry.name}`);
      lines.push('');
    }
  }

  lines.push('## Tokens', '');
  const tokenChanges = report.tokens.entries.filter((entry) => entry.status !== 'unchanged');
  if (!tokenChanges.length) lines.push('All token names and values are unchanged.', '');
  else {
    lines.push('| Token | Status | Baseline | Target |', '| --- | --- | --- | --- |');
    for (const token of tokenChanges) {
      lines.push(`| ${inline(token.name)} | ${token.status} | ${inline(token.before)} | ${inline(token.after)} |`);
    }
    lines.push('');
  }
  lines.push(`Unchanged tokens: **${report.tokens.counts.unchanged}**.`, '',
    'Values longer than 160 characters are shortened in this Markdown report; `diff.json` retains complete values.', '');
  return lines.join('\n');
}
