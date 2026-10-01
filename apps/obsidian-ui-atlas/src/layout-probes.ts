import type { ComponentDefinition, ComponentVariant } from './component-registry';

/** Experimental measurement contexts, independent of component variants and the public schema. */
export interface LayoutContentProbe {
  id: string;
  text: string;
}

export interface LayoutHostProbe {
  id: string;
  widthPx: number;
}

export interface LayoutSpecimenProbe {
  id: string;
  /** Omit to use every canonical variant in the registry. */
  variants?: readonly string[];
  /** Omit to use the suite's default hosts. */
  hosts?: readonly LayoutHostProbe[];
  /** Omit to use default content when the registry factory supports it. */
  contents?: readonly LayoutContentProbe[];
}

export interface LayoutProbeSuite {
  defaultHosts: readonly LayoutHostProbe[];
  defaultContents: readonly LayoutContentProbe[];
  specimens: readonly LayoutSpecimenProbe[];
}

export const layoutProbeSuite: LayoutProbeSuite = {
  defaultHosts: [
    { id: 'constrained', widthPx: 160 },
    { id: 'narrow', widthPx: 240 },
    { id: 'wide', widthPx: 480 },
  ],
  defaultContents: [
    { id: 'short-content', text: 'OK' },
    { id: 'long-content', text: 'A longer label for layout measurement' },
  ],
  specimens: [
    { id: 'obsidian.button' },
    { id: 'obsidian.search' },
    { id: 'obsidian.dropdown' },
    { id: 'obsidian.slider' },
    { id: 'obsidian.setting' },
  ],
};

export interface ResolvedLayoutProbe {
  definition: ComponentDefinition;
  variant: ComponentVariant;
  content: { id: string; text?: string };
  host: LayoutHostProbe;
}

/** Expands declarative selections without changing registry variants or inference rules. */
export function resolveLayoutProbes(
  registry: readonly ComponentDefinition[],
  suite: LayoutProbeSuite = layoutProbeSuite,
): ResolvedLayoutProbe[] {
  const cases: ResolvedLayoutProbe[] = [];
  for (const specimen of suite.specimens) {
    const definition = registry.find((item) => item.id === specimen.id);
    if (!definition) throw new Error(`Registry component ${specimen.id} is unavailable`);
    const variants = specimen.variants
      ? specimen.variants.map((id) => {
        const variant = definition.variants.find((item) => item.id === id);
        if (!variant) throw new Error(`Registry variant ${specimen.id}/${id} is unavailable`);
        return variant;
      })
      : definition.variants;
    const hosts = specimen.hosts ?? suite.defaultHosts;
    const contents = specimen.contents ?? (definition.supportsLayoutContentProbe ? suite.defaultContents : []);
    if (contents.length && !definition.supportsLayoutContentProbe) {
      throw new Error(`${specimen.id} has content probes but no public-API content setter`);
    }
    for (const variant of variants) {
      for (const content of [{ id: 'baseline' }, ...contents]) {
        for (const host of hosts) cases.push({ definition, variant, content, host });
      }
    }
  }
  const keys = cases.map(({ definition, variant, content, host }) =>
    `${definition.id}/${variant.id}/${content.id}/${host.id}`);
  if (new Set(keys).size !== keys.length) throw new Error('Duplicate declarative layout probe keys');
  if (!cases.length) throw new Error('Layout probe suite has no cases');
  return cases;
}
