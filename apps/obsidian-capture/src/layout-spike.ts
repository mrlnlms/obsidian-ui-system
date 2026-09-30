import type { App } from 'obsidian';
import { componentRegistry, type ComponentDefinition, type ComponentVariant } from './component-registry';
import { captureManifest } from './snapshot';

const EXPORT_ROOT = 'layout-spike-exports';
const HOSTS = [
  { id: 'narrow', widthPx: 240 },
  { id: 'wide', widthPx: 480 },
] as const;
const COMPONENT_IDS = ['obsidian.button', 'obsidian.search'] as const;
const BUTTON_CONTENT_CONTEXTS = [
  { id: 'baseline', label: 'Example button' },
  { id: 'short-label', label: 'OK' },
] as const;

/** Explicit experimental CSSOM selection; this does not change ui-schema. */
const LAYOUT_PROPERTIES = [
  'display', 'box-sizing',
  'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis',
  'justify-content', 'align-items', 'align-self',
  'gap', 'row-gap', 'column-gap',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
  'overflow', 'overflow-x', 'overflow-y',
  'position', 'top', 'right', 'bottom', 'left',
  'white-space', 'text-overflow', 'text-align',
  'font-family', 'font-size', 'font-weight', 'line-height',
  'color', 'background-color', 'opacity',
  'background-image', 'mask-image', '-webkit-mask-image',
] as const;

type LayoutProperty = typeof LAYOUT_PROPERTIES[number];
type LayoutStyles = Record<LayoutProperty, string>;

interface RectSnapshot {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TextNodeSnapshot {
  kind: 'text';
  text: string;
  rect: RectSnapshot | null;
  relativeToParent: RectSnapshot | null;
}

interface ElementNodeSnapshot {
  kind: 'element';
  tag: string;
  classes: string[];
  attributes?: Record<string, string>;
  properties?: { value?: string; disabled?: boolean };
  rect: RectSnapshot | null;
  relativeToParent: RectSnapshot | null;
  styles: LayoutStyles;
  pseudo?: Record<string, { content: string; styles: LayoutStyles }>;
  children: Array<ElementNodeSnapshot | TextNodeSnapshot>;
}

export interface LayoutFixture {
  definition: ComponentDefinition;
  variant: ComponentVariant;
  contentContext: { id: string; label?: string };
  hostId: string;
  requestedWidthPx: number;
  host: HTMLElement;
  root: Element;
  getState: () => string;
}

export interface LayoutObservation {
  id: string;
  variant: string;
  contentContext: { id: string; label?: string };
  state: string;
  host: {
    id: string;
    requestedWidthPx: number;
    rect: RectSnapshot;
    styles: LayoutStyles;
  };
  root: ElementNodeSnapshot;
}

function rectOf(rect: DOMRect): RectSnapshot {
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
}

function relativeTo(rect: RectSnapshot, parent: RectSnapshot): RectSnapshot {
  return { x: rect.x - parent.x, y: rect.y - parent.y, width: rect.width, height: rect.height };
}

function stylesOf(style: CSSStyleDeclaration): LayoutStyles {
  return Object.fromEntries(LAYOUT_PROPERTIES.map((name) => [name, style.getPropertyValue(name).trim()])) as LayoutStyles;
}

function pseudoOf(element: Element, view: Window): ElementNodeSnapshot['pseudo'] {
  const result: NonNullable<ElementNodeSnapshot['pseudo']> = {};
  for (const pseudo of ['::before', '::after'] as const) {
    const style = view.getComputedStyle(element, pseudo);
    const content = style.getPropertyValue('content').trim();
    const image = ['background-image', 'mask-image', '-webkit-mask-image']
      .some((name) => !['', 'none'].includes(style.getPropertyValue(name).trim()));
    if ((content && !['normal', 'none'].includes(content)) || image) {
      result[pseudo] = { content, styles: stylesOf(style) };
    }
  }
  return Object.keys(result).length ? result : undefined;
}

function captureLayoutNode(element: Element, parent: RectSnapshot | null, view: Window): ElementNodeSnapshot {
  const styles = view.getComputedStyle(element);
  // A display:none node has no layout box; its 0×0 viewport-origin rect is not a position.
  const rect = styles.display === 'none' || parent === null ? null : rectOf(element.getBoundingClientRect());
  const attributes = Object.fromEntries(Array.from(element.attributes)
    .filter(({ name }) => ['type', 'placeholder', 'role', 'aria-label'].includes(name))
    .map(({ name, value }) => [name, value]));
  const properties = element instanceof HTMLInputElement
    ? { value: element.value, disabled: element.disabled }
    : element instanceof HTMLButtonElement
      ? { disabled: element.disabled }
      : undefined;
  const children: ElementNodeSnapshot['children'] = [];
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      children.push(captureLayoutNode(child as Element, rect, view));
    } else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
      const range = element.ownerDocument.createRange();
      range.selectNodeContents(child);
      const textRect = rect === null ? null : rectOf(range.getBoundingClientRect());
      children.push({
        kind: 'text',
        text: child.textContent.trim(),
        rect: textRect,
        relativeToParent: textRect && rect ? relativeTo(textRect, rect) : null,
      });
    }
  }
  const pseudo = pseudoOf(element, view);
  return {
    kind: 'element',
    tag: element.tagName.toLowerCase(),
    classes: Array.from(element.classList),
    ...(Object.keys(attributes).length ? { attributes } : {}),
    ...(properties ? { properties } : {}),
    rect,
    relativeToParent: rect && parent ? relativeTo(rect, parent) : null,
    styles: stylesOf(styles),
    ...(pseudo ? { pseudo } : {}),
    children,
  };
}

/** The existing registry creates every specimen; only its containing host changes. */
export function renderLayoutFixtures(mount: HTMLElement, app: App): LayoutFixture[] {
  mount.empty();
  const fixtures: LayoutFixture[] = [];
  for (const id of COMPONENT_IDS) {
    const definition = componentRegistry.find((item) => item.id === id);
    if (!definition) throw new Error(`Registry component ${id} is unavailable`);
    const group = mount.createDiv({ cls: 'obsidian-ui-atlas-layout-group' });
    group.createEl('h4', { text: definition.name });
    for (const variant of definition.variants) {
      const contentContexts: readonly { id: string; label?: string }[] = id === 'obsidian.button'
        ? BUTTON_CONTENT_CONTEXTS : [{ id: 'baseline' }];
      for (const contentContext of contentContexts) {
        for (const context of HOSTS) {
          const card = group.createDiv({ cls: 'obsidian-ui-atlas-layout-card' });
          card.createEl('div', {
            cls: 'obsidian-ui-atlas-variant-name',
            text: `${variant.name} · ${contentContext.id} · ${context.id} (${context.widthPx}px host)`,
          });
          const host = card.createDiv({ cls: 'obsidian-ui-atlas-layout-host' });
          host.style.width = `${context.widthPx}px`;
          const rendered = definition.render(host, variant, app);
          if (rendered.activate || rendered.getCaptureRoot || rendered.deactivate) {
            throw new Error(`${id}/${variant.id} unexpectedly requires an overlay lifecycle`);
          }
          if (contentContext.label) {
            if (!rendered.setLabelForLayoutProbe) throw new Error(`${id} cannot change its label through the registry`);
            rendered.setLabelForLayoutProbe(contentContext.label);
          }
          if (!host.contains(rendered.root)) throw new Error(`${id}/${variant.id} rendered outside its host`);
          fixtures.push({
            definition,
            variant,
            contentContext,
            hostId: context.id,
            requestedWidthPx: context.widthPx,
            host,
            root: rendered.root,
            getState: rendered.getState,
          });
        }
      }
    }
  }
  return fixtures;
}

export async function measureLayoutFixtures(fixtures: LayoutFixture[]): Promise<LayoutObservation[]> {
  const expected = COMPONENT_IDS.reduce((count, id) => {
    const definition = componentRegistry.find((item) => item.id === id);
    return count + (definition?.variants.length ?? 0) * HOSTS.length
      * (id === 'obsidian.button' ? BUTTON_CONTENT_CONTEXTS.length : 1);
  }, 0);
  if (fixtures.length !== expected) throw new Error(`Expected ${expected} layout observations, found ${fixtures.length}`);
  const doc = fixtures[0]?.host.ownerDocument;
  const view = doc?.defaultView;
  if (!doc || !view) throw new Error('Layout fixtures need a connected document');
  await new Promise<void>((resolve) => view.requestAnimationFrame(() => view.requestAnimationFrame(() => resolve())));

  return fixtures.map((fixture): LayoutObservation => {
    if (!fixture.host.isConnected || !fixture.root.isConnected) {
      throw new Error(`${fixture.definition.id}/${fixture.variant.id}: detached layout fixture`);
    }
    const state = fixture.getState();
    if (state !== fixture.variant.state) {
      throw new Error(`${fixture.definition.id}/${fixture.variant.id}: expected ${fixture.variant.state}, found ${state}`);
    }
    const hostRect = rectOf(fixture.host.getBoundingClientRect());
    if (Math.abs(hostRect.width - fixture.requestedWidthPx) > 0.01) {
      throw new Error(`${fixture.hostId} host measured ${hostRect.width}px, expected ${fixture.requestedWidthPx}px`);
    }
    return {
      id: fixture.definition.id,
      variant: fixture.variant.id,
      contentContext: fixture.contentContext,
      state,
      host: {
        id: fixture.hostId,
        requestedWidthPx: fixture.requestedWidthPx,
        rect: hostRect,
        styles: stylesOf(view.getComputedStyle(fixture.host)),
      },
      root: captureLayoutNode(fixture.root, hostRect, view),
    };
  });
}

export async function exportLayoutSpike(app: App, fixtures: LayoutFixture[]): Promise<{ folder: string; observations: LayoutObservation[] }> {
  const observations = await measureLayoutFixtures(fixtures);
  const doc = fixtures[0]!.host.ownerDocument;
  const view = doc.defaultView;
  if (!view) throw new Error('Layout fixtures need a connected window');
  const capturedAt = new Date().toISOString();
  const result = {
    experimentalFormat: 'atlas-layout-spike-1',
    environment: captureManifest(doc, capturedAt),
    viewport: { widthPx: view.innerWidth, heightPx: view.innerHeight, devicePixelRatio: view.devicePixelRatio },
    observations,
  };
  const adapter = app.vault.adapter;
  if (!(await adapter.exists(EXPORT_ROOT))) await adapter.mkdir(EXPORT_ROOT);
  const baseName = capturedAt.replace(/[:.]/g, '-');
  let folder = `${EXPORT_ROOT}/${baseName}`;
  for (let suffix = 2; await adapter.exists(folder); suffix++) folder = `${EXPORT_ROOT}/${baseName}-${suffix}`;
  await adapter.mkdir(folder);
  await adapter.write(`${folder}/layout.json`, JSON.stringify(result, null, 2) + '\n');
  return { folder, observations };
}
