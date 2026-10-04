import { boundColorPaint, type PrimitiveThemeEvidence,
  type PrimitiveVariables } from './primitive-theme';
import { uiKitColorRoles, uiKitVariableName, uiKitWebSyntax,
  type UiKitColorRole } from './appearance-contract';
import type { AppearanceRun } from './appearance-lifecycle';

const roleNames = uiKitColorRoles;
export type { UiKitColorRole } from './appearance-contract';
type PaintField = 'fills' | 'strokes';

export interface UiKitThemeRole { dark: RGB; light: RGB; opacity?: number; source: string }
export interface UiKitThemeEvidence { roles: Record<UiKitColorRole, UiKitThemeRole> }
export interface UiKitThemeVariables {
  primitive: PrimitiveVariables;
  evidence: UiKitThemeEvidence;
  colors: Record<UiKitColorRole, Variable>;
}

function rgb(css: unknown): RGB {
  const match = typeof css === 'string'
    ? /^rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)$/.exec(css) : null;
  if (!match) throw new Error(`UI Kit theme: cor observada inválida: ${String(css)}.`);
  const channels = match.slice(1).map(Number);
  if (channels.some((channel) => channel > 255)) {
    throw new Error(`UI Kit theme: canal de cor inválido: ${css}.`);
  }
  return { r: channels[0]! / 255, g: channels[1]! / 255, b: channels[2]! / 255 };
}

function sameColor(a: RGB, b: RGB): boolean {
  return Math.abs(a.r - b.r) < 1e-4 && Math.abs(a.g - b.g) < 1e-4 &&
    Math.abs(a.b - b.b) < 1e-4;
}

export function readUiKitThemeEvidence(input: unknown): UiKitThemeEvidence {
  if (!input || typeof input !== 'object' ||
      (input as { format?: unknown }).format !== 'obsidian-ui-kit-theme-evidence' ||
      (input as { version?: unknown }).version !== 1) {
    throw new Error('UI Kit theme: fixture inválido.');
  }
  const raw = (input as { roles?: Record<string, Record<string, unknown>> }).roles;
  if (!raw || Object.keys(raw).length !== roleNames.length) {
    throw new Error('UI Kit theme: paleta Dark/Light incompleta.');
  }
  const roles = {} as Record<UiKitColorRole, UiKitThemeRole>;
  for (const name of roleNames) {
    const source = raw[name];
    if (!source || typeof source.source !== 'string' || !source.source) {
      throw new Error(`UI Kit theme: origem de ${name} ausente.`);
    }
    const opacity = source.opacity;
    if ((name === 'selectedOverlay' && opacity !== 0.067) ||
        (name === 'matchHighlight' && opacity !== 0.3) ||
        (name !== 'selectedOverlay' && name !== 'matchHighlight' && opacity !== undefined)) {
      throw new Error(`UI Kit theme: opacidade de ${name} divergente.`);
    }
    roles[name] = { dark: rgb(source.darkCss), light: rgb(source.lightCss),
      source: source.source, ...(opacity === undefined ? {} : { opacity: opacity as number }) };
  }
  // A Dark color shared by a fill and stroke may have distinct semantics, but must
  // resolve to the same Light value for the bounded palette used by this projection.
  if (!sameColor(roles.controlFill.dark, roles.controlBorder.dark) ||
      !sameColor(roles.controlFill.light, roles.controlBorder.light)) {
    throw new Error('UI Kit theme: fill/border neutros divergiram; vincule-os por anatomia.');
  }
  return { roles };
}

const scopes: Record<UiKitColorRole, VariableScope[]> = {
  surfacePrimary: ['FRAME_FILL', 'SHAPE_FILL'],
  surfaceSecondary: ['FRAME_FILL', 'SHAPE_FILL'],
  formField: ['FRAME_FILL', 'SHAPE_FILL'],
  controlFill: ['FRAME_FILL', 'SHAPE_FILL'],
  controlBorder: ['STROKE_COLOR'],
  textNormal: ['TEXT_FILL', 'STROKE_COLOR', 'SHAPE_FILL'],
  textMuted: ['TEXT_FILL', 'STROKE_COLOR', 'SHAPE_FILL'],
  textFaint: ['TEXT_FILL', 'STROKE_COLOR', 'SHAPE_FILL'],
  accentFill: ['FRAME_FILL', 'SHAPE_FILL'],
  matchHighlight: ['FRAME_FILL', 'SHAPE_FILL'],
  selectedOverlay: ['FRAME_FILL', 'SHAPE_FILL'],
  iconActive: ['SHAPE_FILL', 'STROKE_COLOR'],
  toggleTrackOff: ['FRAME_FILL', 'SHAPE_FILL'],
  toggleThumb: ['SHAPE_FILL'],
  tooltipSurface: ['FRAME_FILL', 'SHAPE_FILL'],
  tooltipText: ['TEXT_FILL'],
  sortIcon: ['SHAPE_FILL', 'STROKE_COLOR'],
};

/** Paired values and bounded Obsidian roles justify these aliases; future divergence may split them. */
export const primitiveRoleAliases = {
  icon: 'textMuted', rowDefaultText: 'textMuted', rowSelectedText: 'textNormal',
  rowSelectedBackground: 'selectedOverlay', disclosure: 'textFaint',
  metadata: 'textFaint',
} as const satisfies Record<Exclude<keyof PrimitiveVariables['colors'], 'treeGuide'>,
  UiKitColorRole>;

export function assertPrimitiveRoleAliases(primitive: PrimitiveThemeEvidence,
  kit: UiKitThemeEvidence): void {
  for (const [key, role] of Object.entries(primitiveRoleAliases) as
    Array<[keyof PrimitiveVariables['colors'], UiKitColorRole]>) {
    for (const mode of ['dark', 'light'] as const) {
      const actual = primitive[mode].colors[key];
      const expected = kit.roles[role][mode];
      // The selected background came from computed Oklch; its near-white
      // conversion differs from the RGB overlay by less than one RGB step.
      const tolerance = key === 'rowSelectedBackground' ? 1 / 255 : 1e-6;
      if (Math.max(Math.abs(actual.r - expected.r), Math.abs(actual.g - expected.g),
        Math.abs(actual.b - expected.b)) > tolerance ||
        (key === 'rowSelectedBackground' &&
          primitive[mode].selectedOpacity !== kit.roles.selectedOverlay.opacity)) {
        throw new Error(`UI Kit theme: ${key} e ${role} divergem em ${mode}.`);
      }
    }
  }
}

/** Extends the already validated primitive collection; there is one page mode for the kit. */
export function extendUiKitThemeVariables(primitive: PrimitiveVariables,
  evidence: UiKitThemeEvidence, run: AppearanceRun): UiKitThemeVariables {
  assertPrimitiveRoleAliases({ dark: primitive.dark, light: primitive.light }, evidence);
  const colors = {} as Record<UiKitColorRole, Variable>;
  for (const role of roleNames) {
    const variable = run.upsertVariable(uiKitVariableName(role), 'COLOR');
    variable.scopes = scopes[role];
    variable.description = `Dark/Light appearance observed in Obsidian Desktop: ${evidence.roles[role].source}.`;
    variable.setVariableCodeSyntax('WEB', `var(${uiKitWebSyntax[role]})`);
    variable.setValueForMode(primitive.modeIds.dark, evidence.roles[role].dark);
    variable.setValueForMode(primitive.modeIds.light, evidence.roles[role].light);
    colors[role] = variable;
  }
  for (const [key, role] of Object.entries(primitiveRoleAliases) as
    Array<[keyof PrimitiveVariables['colors'], UiKitColorRole]>) {
    const alias: VariableAlias = { type: 'VARIABLE_ALIAS', id: colors[role].id };
    primitive.colors[key].description = `Primitive role; alias of ${colors[role].name}.`;
    primitive.colors[key].setValueForMode(primitive.modeIds.dark, alias);
    primitive.colors[key].setValueForMode(primitive.modeIds.light, alias);
    for (const modeId of [primitive.modeIds.dark, primitive.modeIds.light]) {
      const stored = primitive.colors[key].valuesByMode[modeId];
      if (!stored || typeof stored !== 'object' || !('type' in stored) ||
          stored.type !== 'VARIABLE_ALIAS' || stored.id !== colors[role].id) {
        throw new Error(`UI Kit theme: alias ${key} → ${role} não persistiu.`);
      }
    }
  }
  return { primitive, evidence, colors };
}

/** New generators name the visual role before creating the paint. */
export function boundUiKitPaint(theme: UiKitThemeVariables, role: UiKitColorRole,
  opacity = 1): SolidPaint {
  return boundColorPaint(theme.evidence.roles[role].dark, theme.colors[role], opacity);
}

/** Classifies only currently observed colors; hidden SVG bounds and already bound paints stay intact. */
export function classifyUiKitPaint(paint: Paint, field: PaintField,
  evidence: UiKitThemeEvidence, mode: 'dark' | 'light' = 'dark',
  node?: { name: string; type: string }): UiKitColorRole | undefined {
  if (paint.type !== 'SOLID' || paint.visible === false || (paint.opacity ?? 1) === 0 ||
      paint.boundVariables?.color) return undefined;
  const opacity = paint.opacity ?? 1;
  const overlay = evidence.roles.selectedOverlay;
  if (field === 'fills' && node?.name === 'Selection background' &&
      sameColor(paint.color, overlay[mode])) return 'selectedOverlay';
  if (field === 'fills' && Math.abs(opacity - overlay.opacity!) < 0.001 &&
      sameColor(paint.color, overlay[mode])) return 'selectedOverlay';
  if (opacity < 1 && sameColor(paint.color, overlay[mode])) return undefined;
  // Both the Light input surface and primary background are white; CTA text
  // is also white in both modes. These three anatomical roles stay distinct.
  if (mode === 'light' && sameColor(paint.color, evidence.roles.formField.light)) {
    if (node?.name === 'Input surface' && field === 'fills') return 'formField';
    if (node?.type === 'TEXT') return undefined;
  }
  for (const role of roleNames) {
    if (role === 'selectedOverlay' || role === 'controlFill' || role === 'controlBorder' ||
        role === 'iconActive' || role === 'toggleTrackOff' || role === 'toggleThumb' ||
        role === 'tooltipSurface' ||
        role === 'tooltipText' || role === 'sortIcon') continue;
    if (sameColor(paint.color, evidence.roles[role][mode])) return role;
  }
  if (sameColor(paint.color, evidence.roles.controlFill[mode])) {
    return field === 'fills' ? 'controlFill' : 'controlBorder';
  }
  return undefined;
}

export interface UiKitThemeBinding {
  role: UiKitColorRole;
  root: SceneNode;
  consumer: SceneNode;
}

/** Instance overrides are already bound by their consumer; read them without recoloring. */
export function explicitInstanceThemeBindings(roots: readonly SceneNode[],
  theme: UiKitThemeVariables, roles: readonly UiKitColorRole[]): UiKitThemeBinding[] {
  const wanted = new Map(roles.map((role) => [theme.colors[role].id, role]));
  const bindings: UiKitThemeBinding[] = [];
  const visit = (node: SceneNode, root: SceneNode, inInstance: boolean): void => {
    const nested = inInstance || node.type === 'INSTANCE';
    if (nested) for (const field of ['fills', 'strokes'] as const) {
      if (!(field in node)) continue;
      const paints = (node as SceneNode & { fills?: readonly Paint[];
        strokes?: readonly Paint[] })[field];
      if (!Array.isArray(paints)) continue;
      const nodeBindings = node.boundVariables?.[field];
      paints.forEach((paint, index) => {
        if (paint.type !== 'SOLID' || paint.visible === false) return;
        const binding = nodeBindings?.[index];
        const inheritedId = Array.isArray(binding) ? binding[0]?.id : binding?.id;
        const role = wanted.get(paint.boundVariables?.color?.id ?? inheritedId ?? '');
        if (role) bindings.push({ role, root, consumer: node });
      });
    }
    if ('children' in node) for (const child of node.children) visit(child, root, nested);
  };
  for (const root of roots) visit(root, root, false);
  return bindings;
}

/** Applies bindings only to new generator roots, never to pre-existing page content. */
export function bindUiKitTheme(roots: readonly SceneNode[], theme: UiKitThemeVariables,
  sourceMode: (root: SceneNode) => 'dark' | 'light'): UiKitThemeBinding[] {
  const bindings: UiKitThemeBinding[] = [];
  const visit = (node: SceneNode, root: SceneNode): void => {
    if (node.type === 'INSTANCE') return; // Its main Component owns its appearance.
    for (const field of ['fills', 'strokes'] as const) {
      if (!(field in node)) continue;
      const paintNode = node as unknown as Record<PaintField, readonly Paint[] | typeof figma.mixed>;
      if (paintNode[field] === figma.mixed) continue;
      const paints = paintNode[field] as readonly Paint[];
      let changed = false;
      const next = paints.map((paint) => {
        if (paint.type === 'SOLID' && paint.boundVariables?.color) {
          const role = roleNames.find((candidate) =>
            theme.colors[candidate].id === paint.boundVariables?.color?.id);
          if (role) bindings.push({ role, root, consumer: node });
          return paint;
        }
        const role = classifyUiKitPaint(paint, field, theme.evidence, sourceMode(root), node);
        if (!role || paint.type !== 'SOLID') return paint;
        changed = true;
        const variable = theme.colors[role];
        const bound = figma.variables.setBoundVariableForPaint(paint, 'color', variable);
        bindings.push({ role, root, consumer: node });
        return { ...bound,
          ...(paint.visible === undefined ? {} : { visible: paint.visible }),
          ...(paint.opacity === undefined ? {} : { opacity: paint.opacity }),
          ...(paint.blendMode === undefined ? {} : { blendMode: paint.blendMode }) };
      });
      if (changed) paintNode[field] = next;
    }
    if ('children' in node) for (const child of node.children) visit(child, root);
  };
  for (const root of roots) visit(root, root);
  const boundRoles = new Set(bindings.map((binding) => binding.role));
  const instanceOnlyRoles = roleNames.filter((role) => !boundRoles.has(role));
  bindings.push(...explicitInstanceThemeBindings(roots, theme, instanceOnlyRoles));
  for (const binding of bindings) boundRoles.add(binding.role);
  const missing = roleNames.filter((role) => !boundRoles.has(role));
  if (missing.length) throw new Error(`UI Kit theme: sem consumidor para ${missing.join(', ')}.`);
  return bindings;
}

/** Names describe Component identity; the page mode now describes appearance. */
export function renameThemedComponents(roots: readonly SceneNode[]): void {
  const visit = (node: SceneNode): void => {
    if (node.type === 'INSTANCE') return;
    if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET' || node.type === 'FRAME') {
      node.name = node.name.replace(/ \/ Dark/g, '').replace(/Dark resize preview/g, 'resize preview');
    }
    if ('children' in node) for (const child of node.children) visit(child);
  };
  for (const root of roots) visit(root);
}
