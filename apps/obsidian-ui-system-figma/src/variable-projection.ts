import type { MultiModeTokens, TokenMode, TokenModeObservation } from '@obsidian-ui-system/ui-schema';

export type ProjectionDecision = 'direct' | 'needs-evaluation' | 'deferred' | 'omit';
export type ProjectedType = 'COLOR' | 'FLOAT';
export type ProjectedValue =
  | { strategy: 'literal'; value: { r: number; g: number; b: number } | number }
  | { strategy: 'alias'; targetCssName: string };

export interface FigmaVariableCandidate {
  cssName: string;
  decision: ProjectionDecision;
  reason: string;
  figmaType?: ProjectedType;
  modes: Record<TokenMode, {
    status: string;
    computedCss: string | null;
    attribution: string;
    declaration?: { rawValue: string; selector: string | null };
    projected?: ProjectedValue;
  }>;
}

const MODES = ['dark', 'light'] as const;
const PILOT = ['--background-primary', '--modal-background', '--button-radius'] as const;
const BINDING_PILOT = ['--button-radius', '--interactive-normal'] as const;

function wholeFunction(value: string, name: string): boolean {
  if (!value.startsWith(`${name}(`)) return false;
  let depth = 0;
  for (let index = name.length; index < value.length; index++) {
    if (value[index] === '(') depth++;
    if (value[index] === ')' && --depth === 0) return index === value.length - 1;
  }
  return false;
}

function colorExpression(value: string): boolean {
  return wholeFunction(value, 'color-mix') ||
    (wholeFunction(value, 'hsl') && value.includes('calc('));
}

function directColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value) || /^hsl\([^()]+\)$/.test(value) ||
    /^(?:white|black|transparent)$/.test(value);
}

function hexRgb(value: string): { r: number; g: number; b: number } | null {
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) return null;
  return { r: parseInt(value.slice(1, 3), 16) / 255,
    g: parseInt(value.slice(3, 5), 16) / 255,
    b: parseInt(value.slice(5, 7), 16) / 255 };
}

function selectedDeclaration(observation: TokenModeObservation) {
  return observation.attribution.status === 'unique'
    ? observation.declarations[observation.attribution.declarationIndex] : undefined;
}

function candidate(name: string, tokens: MultiModeTokens['tokens']): FigmaVariableCandidate {
  const observations = tokens[name]!;
  const modes = Object.fromEntries(MODES.map((mode) => {
    const observation = observations[mode];
    const declaration = observation && selectedDeclaration(observation);
    return [mode, {
      status: observation?.status ?? 'not-observed',
      computedCss: observation?.computed.selected ?? null,
      attribution: observation?.attribution.status ?? 'unknown',
      ...(declaration ? { declaration: { rawValue: declaration.rawValue, selector: declaration.selector } } : {}),
    }];
  })) as FigmaVariableCandidate['modes'];
  const result: FigmaVariableCandidate = { cssName: name, decision: 'omit',
    reason: 'No selected UI Kit use in this pilot', modes };

  if (/^--anim-duration-/.test(name) || name === '--loading-icon-delay' || /^--anim-motion-/.test(name)) {
    result.decision = 'deferred';
    result.reason = 'Native TIMING/EASING round-trip requires a separate evaluation';
    return result;
  }
  if (MODES.some((mode) => modes[mode].status !== 'resolved' || !modes[mode].computedCss)) {
    result.reason = 'No faithful resolved value in both modes';
    return result;
  }
  const dark = modes.dark.computedCss!;
  const light = modes.light.computedCss!;
  if (MODES.every((mode) => colorExpression(modes[mode].computedCss!) || directColor(modes[mode].computedCss!)) &&
    (colorExpression(dark) || colorExpression(light))) {
    result.decision = 'needs-evaluation';
    result.reason = 'Color expression needs typed CSS evaluation and visual verification';
    return result;
  }
  if (!(PILOT as readonly string[]).includes(name) && !(BINDING_PILOT as readonly string[]).includes(name)) return result;

  if (name === '--button-radius') {
    const values = {} as Record<TokenMode, number>;
    for (const mode of MODES) {
      const match = /^([0-9]+(?:\.[0-9]+)?)px$/.exec(modes[mode].computedCss!);
      if (!match) { result.reason = 'Radius is not a simple px scalar in both modes'; return result; }
      values[mode] = Number(match[1]);
    }
    for (const mode of MODES) modes[mode].projected = { strategy: 'literal', value: values[mode] };
    result.figmaType = 'FLOAT';
  } else if (name === '--background-primary' || name === '--interactive-normal') {
    const values = {} as Record<TokenMode, { r: number; g: number; b: number }>;
    for (const mode of MODES) {
      const value = hexRgb(modes[mode].computedCss!);
      if (!value) { result.reason = 'Background is not a direct six-digit hex color in both modes'; return result; }
      values[mode] = value;
    }
    for (const mode of MODES) modes[mode].projected = { strategy: 'literal', value: values[mode] };
    result.figmaType = 'COLOR';
  } else {
    for (const mode of MODES) {
      const observation = observations[mode]!;
      const declaration = selectedDeclaration(observation);
      const target = tokens['--background-primary']?.[mode];
      if (!declaration || declaration.rawValue.trim() !== 'var(--background-primary)' ||
          target?.status !== 'resolved' || !hexRgb(target.computed.selected ?? '') ||
          target.computed.selected !== observation.computed.selected) {
        result.reason = 'Pure, attributed alias to projected background is not proven in both modes';
        return result;
      }
    }
    for (const mode of MODES) modes[mode].projected = { strategy: 'alias', targetCssName: '--background-primary' };
    result.figmaType = 'COLOR';
  }
  result.decision = 'direct';
  result.reason = 'Selected visual token with a faithful value or proven alias in both modes';
  return result;
}

/** Pure, deliberately narrow projection: every package identity receives a decision. */
export function projectFigmaVariableCandidates(tokens: MultiModeTokens): FigmaVariableCandidate[] {
  if (tokens.scopes?.[0] !== 'html' || tokens.scopes?.[1] !== 'body' || !tokens.tokens) {
    throw new Error('Package v2 token evidence is invalid');
  }
  return Object.keys(tokens.tokens).sort().map((name) => candidate(name, tokens.tokens));
}

export function pilotCandidates(candidates: FigmaVariableCandidate[]): FigmaVariableCandidate[] {
  return PILOT.map((name) => {
    const entry = candidates.find((item) => item.cssName === name);
    if (!entry || entry.decision !== 'direct') throw new Error(`Pilot token is not directly projectable: ${name}`);
    return entry;
  });
}

export function bindingPilotCandidates(candidates: FigmaVariableCandidate[]): FigmaVariableCandidate[] {
  return BINDING_PILOT.map((name) => {
    const entry = candidates.find((item) => item.cssName === name);
    if (!entry || entry.decision !== 'direct') throw new Error(`Binding pilot token is not directly projectable: ${name}`);
    return entry;
  });
}
