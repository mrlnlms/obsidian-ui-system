import type { ElementNodeSnapshot, LayoutObservation, TextNodeSnapshot } from './layout-spike';

export type SizingMode = 'hug' | 'fill' | 'fixed' | 'unknown';
export type Confidence = 'high' | 'medium' | 'low' | 'none';

export interface SizingInference {
  mode: SizingMode;
  confidence: Confidence;
  evidence: string[];
  probes: string[];
  observedPx?: number;
}

export interface LayoutInference {
  id: string;
  variant: string;
  horizontal: SizingInference;
  vertical: SizingInference;
  contextDependencies: string[];
  unknowns: string[];
  children: Array<{
    path: string;
    kind: 'element' | 'text';
    tag?: string;
    horizontal: SizingInference;
  }>;
  intermediateModel: {
    experimental: true;
    horizontalSizing: SizingMode;
    verticalSizing: SizingMode;
    heightPx?: number;
    layoutDirection: string | null;
    padding: { top: string; right: string; bottom: string; left: string };
    gap: string;
    whiteSpace: string;
    overflow: string;
    confidence: { horizontal: Confidence; vertical: Confidence };
  };
}

const EPS = 1.25;
const near = (a: number, b: number): boolean => Math.abs(a - b) <= EPS;
const probeKey = (item: LayoutObservation): string =>
  `${item.id}/${item.variant}/${item.contentContext.id}/${item.host.id}:${item.host.requestedWidthPx}px`;
const unknown = (reason: string, rows: LayoutObservation[]): SizingInference => ({
  mode: 'unknown', confidence: 'none', evidence: [reason], probes: rows.map(probeKey),
});
const rootSize = (item: LayoutObservation, axis: 'width' | 'height'): number | null => item.root.rect?.[axis] ?? null;

type LayoutNode = ElementNodeSnapshot | TextNodeSnapshot;
interface ChildMeasurement { row: LayoutObservation; node: LayoutNode; parent: ElementNodeSnapshot }

function collectChildren(row: LayoutObservation): Map<string, ChildMeasurement> {
  const result = new Map<string, ChildMeasurement>();
  const walk = (parent: ElementNodeSnapshot, prefix: string): void => {
    parent.children.forEach((node, index) => {
      const path = prefix ? `${prefix}.${index}` : String(index);
      result.set(path, { row, node, parent });
      if (node.kind === 'element') walk(node, path);
    });
  };
  walk(row.root, '');
  return result;
}

function childSizing(samples: ChildMeasurement[]): SizingInference {
  const rendered = samples.filter(({ node }) => node.rect && node.rect.width > EPS);
  const rows = samples.map(({ row }) => row);
  const baseline = rendered.filter(({ row, parent }) => row.contentContext.id === 'baseline' && parent.rect);
  if (baseline.length >= 2) {
    const first = baseline[0]!;
    const parentVaries = baseline.some(({ parent }) => !near(parent.rect!.width, first.parent.rect!.width));
    if (parentVaries && baseline.every(({ node, parent }) =>
      near(node.rect!.width - first.node.rect!.width, parent.rect!.width - first.parent.rect!.width))) {
      return {
        mode: 'fill', confidence: 'medium',
        evidence: ['Child width changes by the same amount as its parent across host widths; relative offset is stable.'],
        probes: baseline.map(({ row }) => probeKey(row)),
      };
    }
  }
  const textSamples = rendered.filter(({ node }) => node.kind === 'text');
  const contexts = new Set(textSamples.map(({ row }) => row.contentContext.id));
  if (contexts.size >= 2 && textSamples.length === samples.length) {
    const first = textSamples[0]!;
    const changesWithContent = textSamples.some(({ node }) => !near(node.rect!.width, first.node.rect!.width));
    const stablePerContent = [...contexts].every((context) => {
      const group = textSamples.filter(({ row }) => row.contentContext.id === context);
      return group.length >= 2 && group.every(({ node }) => near(node.rect!.width, group[0]!.node.rect!.width));
    });
    if (changesWithContent && stablePerContent) {
      return {
        mode: 'hug', confidence: 'high',
        evidence: ['Text width changes with content while staying stable across host widths.'],
        probes: textSamples.map(({ row }) => probeKey(row)),
      };
    }
  }
  return unknown(rendered.length === 0
    ? 'No rendered box was measured for this child.'
    : 'These probes do not distinguish fixed from intrinsic sizing for this child.', rows);
}

function inferChildren(rows: LayoutObservation[]): LayoutInference['children'] {
  const groups = new Map<string, ChildMeasurement[]>();
  for (const row of rows) {
    for (const [path, sample] of collectChildren(row)) {
      const group = groups.get(path) ?? [];
      group.push(sample);
      groups.set(path, group);
    }
  }
  return [...groups].map(([path, samples]) => {
    const node = samples[0]!.node;
    const complete = samples.length === rows.length;
    return {
      path,
      kind: node.kind,
      ...(node.kind === 'element' ? { tag: node.tag } : {}),
      horizontal: complete ? childSizing(samples)
        : unknown('Child anatomy differs across probe contexts; stable identity is unproven.', samples.map(({ row }) => row)),
    };
  });
}

function directTextWidth(root: ElementNodeSnapshot): number | null {
  const text = root.children.filter((child) => child.kind === 'text' && child.rect);
  return text.length === 1 ? text[0]?.rect?.width ?? null : null;
}

function horizontalSizing(rows: LayoutObservation[]): SizingInference {
  const baseline = rows.filter((row) => row.contentContext.id === 'baseline' && row.root.rect);
  const widths = new Set(baseline.map((row) => row.host.requestedWidthPx));
  if (widths.size < 2) return unknown('At least two distinct host widths with rendered roots are required.', rows);

  const first = baseline[0]!;
  const varyingHost = baseline.some((row) => !near(row.host.requestedWidthPx, first.host.requestedWidthPx));
  const tracksHost = varyingHost && baseline.every((row) => {
    const root = rootSize(row, 'width');
    const baseRoot = rootSize(first, 'width');
    return root !== null && baseRoot !== null && near(root - baseRoot, row.host.rect.width - first.host.rect.width);
  });
  if (tracksHost) {
    const fitsHost = baseline.every((row) => near(row.root.rect!.width, row.host.rect.width));
    return {
      mode: 'fill', confidence: fitsHost ? 'high' : 'medium',
      evidence: [fitsHost
        ? 'Root width equals host width at each tested width.'
        : 'Root width changes by the same amount as host width; a stable offset remains.'],
      probes: baseline.map(probeKey),
    };
  }

  const contexts = new Map<string, LayoutObservation[]>();
  for (const row of rows.filter((item) => item.root.rect)) {
    const group = contexts.get(row.contentContext.id) ?? [];
    group.push(row);
    contexts.set(row.contentContext.id, group);
  }
  const stableWithinContext = [...contexts.values()].every((group) =>
    group.length >= 2 && group.every((row) => near(row.root.rect!.width, group[0]!.root.rect!.width)));
  const contentSamples = [...contexts.values()].map((group) => group[0]!).filter((row) => directTextWidth(row.root) !== null);
  if (stableWithinContext && contentSamples.length >= 2) {
    const firstSample = contentSamples[0]!;
    const firstText = directTextWidth(firstSample.root)!;
    const changesWithContent = contentSamples.some((row) => !near(directTextWidth(row.root)!, firstText));
    const rootFollowsText = contentSamples.every((row) =>
      near(row.root.rect!.width - firstSample.root.rect!.width, directTextWidth(row.root)! - firstText));
    if (changesWithContent && rootFollowsText) {
      const overhang = rows.some((row) => row.root.rect && row.root.rect.width > row.host.rect.width + EPS);
      return {
        mode: 'hug', confidence: overhang ? 'high' : 'medium',
        evidence: [
          'Root width is stable across host widths for each content sample.',
          'Root width change matches direct text width change across content samples.',
          ...(overhang ? ['A root wider than its host keeps its measured width.'] : []),
        ],
        probes: rows.map(probeKey),
      };
    }
    if (changesWithContent && !rootFollowsText && contentSamples.every((row) => near(row.root.rect!.width, firstSample.root.rect!.width))) {
      return {
        mode: 'fixed', confidence: 'medium',
        evidence: ['Root width stays constant while direct text width changes and host widths vary.'],
        probes: rows.map(probeKey), observedPx: firstSample.root.rect!.width,
      };
    }
  }
  return unknown('Host probes alone cannot distinguish intrinsic/hug width from fixed width, or the response is inconsistent.', rows);
}

function verticalSizing(rows: LayoutObservation[]): SizingInference {
  const measured = rows.filter((row) => rootSize(row, 'height') !== null);
  if (measured.length < 2 || new Set(measured.map((row) => row.host.requestedWidthPx)).size < 2) {
    return unknown('Height needs rendered measurements in at least two host widths.', rows);
  }
  const heights = measured.map((row) => row.root.rect!.height);
  const constant = heights.every((height) => near(height, heights[0]!));
  if (!constant) return unknown('Root height changes across the tested contexts; its cause needs another probe.', rows);
  const hasContentChange = new Set(measured.map((row) => row.contentContext.id)).size > 1;
  return {
    mode: 'fixed', confidence: hasContentChange ? 'high' : 'medium',
    evidence: [hasContentChange
      ? 'Root height stays constant across host widths and distinct content samples.'
      : 'Root height stays constant across tested host widths; content and host height were not varied.'],
    probes: measured.map(probeKey), observedPx: heights[0],
  };
}

export function inferLayout(observations: LayoutObservation[]): LayoutInference[] {
  const groups = new Map<string, LayoutObservation[]>();
  for (const row of observations) {
    const key = JSON.stringify([row.id, row.variant]);
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return [...groups.values()].map((rows) => {
    const sample = rows.find((row) => row.contentContext.id === 'baseline') ?? rows[0]!;
    const horizontal = horizontalSizing(rows);
    const vertical = verticalSizing(rows);
    const children = inferChildren(rows);
    const styles = sample.root.styles;
    const contextDependencies: string[] = [];
    if (rows.some((row) => row.root.rect && row.root.rect.width > row.host.rect.width + EPS)) {
      contextDependencies.push('Root overflows at least one measured host width.');
    }
    if (rows.some((row) => row.host.boxMetrics.scrollWidth > row.host.boxMetrics.clientWidth + EPS)) {
      contextDependencies.push('Host scroll width exceeds its client width.');
    }
    if (rows.some((row) => row.root.rect && !near(row.root.rect.height, sample.root.rect?.height ?? 0))) {
      contextDependencies.push('Root height depends on the tested host or content context.');
    }
    const unknowns: string[] = [];
    if (horizontal.mode === 'unknown') unknowns.push('Horizontal sizing rule');
    if (vertical.mode === 'unknown') unknowns.push('Vertical sizing rule');
    if (children.some((child) => child.horizontal.mode === 'unknown')) {
      unknowns.push('One or more child sizing rules remain unknown.');
    }
    if (sample.root.children.some((child) => child.kind === 'element')) {
      unknowns.push('Editable internal layout is not established by root sizing alone.');
    }
    return {
      id: sample.id,
      variant: sample.variant,
      horizontal,
      vertical,
      contextDependencies,
      unknowns,
      children,
      intermediateModel: {
        experimental: true,
        horizontalSizing: horizontal.mode,
        verticalSizing: vertical.mode,
        ...(vertical.mode === 'fixed' ? { heightPx: vertical.observedPx } : {}),
        layoutDirection: ['flex', 'inline-flex'].includes(styles.display) ? styles['flex-direction'] : null,
        padding: {
          top: styles['padding-top'], right: styles['padding-right'],
          bottom: styles['padding-bottom'], left: styles['padding-left'],
        },
        gap: styles.gap,
        whiteSpace: styles['white-space'],
        overflow: styles.overflow,
        confidence: { horizontal: horizontal.confidence, vertical: vertical.confidence },
      },
    };
  });
}
