/** The closed public inventory, projected from the existing Package v1 specimens. */
export const publicApiVariants = {
  'obsidian.button': ['normal', 'disabled', 'cta'],
  'obsidian.search': ['empty', 'filled'],
  'obsidian.toggle': ['off', 'on'],
  'obsidian.display-tooltip': ['visible'],
  'obsidian.extra-button': ['normal', 'disabled'],
  'obsidian.text': ['empty', 'filled', 'disabled'],
  'obsidian.textarea': ['empty', 'filled', 'disabled'],
  'obsidian.dropdown': ['default', 'selected', 'disabled'],
  'obsidian.color': ['violet', 'red', 'disabled'],
  'obsidian.moment-format': ['empty', 'filled', 'disabled'],
  'obsidian.slider': ['minimum', 'middle', 'maximum', 'disabled'],
  'obsidian.progress-bar': ['empty', 'half', 'complete'],
  'obsidian.setting': ['standard', 'heading', 'disabled', 'error'],
  'obsidian.setting-group': ['standard', 'with-search'],
  'obsidian.display-value': ['value', 'warning', 'empty'],
  'obsidian.secret': ['unselected'],
  'obsidian.modal': ['basic', 'with-content'],
  'obsidian.confirmation-modal': ['standard', 'with-checkbox'],
  'obsidian.menu': ['standard', 'checked'],
  'obsidian.notice': ['message', 'updated'],
  'obsidian.popover-suggest': ['empty-shell'],
  'obsidian.abstract-input-suggest': ['all', 'filtered'],
  'obsidian.suggest-modal': ['all', 'filtered'],
  'obsidian.fuzzy-suggest-modal': ['all', 'filtered'],
  'obsidian.set-tooltip': ['registered'],
  'obsidian.set-icon': ['settings'],
} as const;

export type PublicApiId = keyof typeof publicApiVariants;

export interface PublicDom {
  tag: string;
  classes: string[];
  text?: string;
  attributes?: Record<string, string>;
  properties?: Record<string, string | boolean>;
  sizePx: { width: number; height: number };
  styles: Record<string, string>;
  children: PublicDom[];
}

export interface PublicSpecimen {
  id: PublicApiId;
  variant: string;
  dom: PublicDom;
}

export type PublicApiEvidence = Map<string, PublicSpecimen>;
export const publicSpecimenKey = (id: string, variant: string): string => `${id}/${variant}`;

function validDom(input: unknown): input is PublicDom {
  if (!input || typeof input !== 'object') return false;
  const node = input as Partial<PublicDom>;
  return typeof node.tag === 'string' && Array.isArray(node.classes) &&
    node.classes.every((part) => typeof part === 'string') &&
    !!node.sizePx && Number.isFinite(node.sizePx.width) &&
    Number.isFinite(node.sizePx.height) && !!node.styles &&
    typeof node.styles === 'object' && Array.isArray(node.children) &&
    node.children.every(validDom);
}

/** Reject incomplete/ambiguous batches before any Figma node is created. */
export function readPublicApiEvidence(input: unknown): PublicApiEvidence {
  if (!Array.isArray(input)) throw new Error('Public API: components.json ausente.');
  const result: PublicApiEvidence = new Map();
  for (const item of input) {
    if (!item || typeof item !== 'object') throw new Error('Public API: specimen inválido.');
    const row = item as Partial<PublicSpecimen>;
    if (!(row.id && row.id in publicApiVariants)) continue;
    const allowed = publicApiVariants[row.id];
    if (!row.variant || !(allowed as readonly string[]).includes(row.variant) ||
        !validDom(row.dom) || row.dom.sizePx.width <= 0 || row.dom.sizePx.height <= 0) {
      throw new Error(`Public API: ${row.id}/${String(row.variant)} sem anatomia observada.`);
    }
    const key = publicSpecimenKey(row.id, row.variant);
    if (result.has(key)) throw new Error(`Public API: specimen duplicado ${key}.`);
    result.set(key, row as PublicSpecimen);
  }
  for (const [id, variants] of Object.entries(publicApiVariants)) {
    for (const variant of variants) {
      if (!result.has(publicSpecimenKey(id, variant))) {
        throw new Error(`Public API: specimen ausente ${id}/${variant}.`);
      }
    }
  }
  return result;
}

export function publicSpecimen(evidence: PublicApiEvidence, id: PublicApiId,
  variant: string): PublicSpecimen {
  const result = evidence.get(publicSpecimenKey(id, variant));
  if (!result) throw new Error(`Public API: specimen ausente ${id}/${variant}.`);
  return result;
}

export function publicDomFind(root: PublicDom, className: string): PublicDom | undefined {
  if (root.classes.includes(className)) return root;
  for (const child of root.children) {
    const found = publicDomFind(child, className);
    if (found) return found;
  }
  return undefined;
}

export function publicDomText(root: PublicDom): string[] {
  const own = root.text ?? (typeof root.properties?.value === 'string' &&
    root.tag !== 'input' ? root.properties.value : undefined);
  return [...(own ? [own] : []), ...root.children.flatMap(publicDomText)];
}
