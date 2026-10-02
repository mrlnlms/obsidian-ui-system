import type { TokenMode } from '@obsidian-ui-system/ui-schema';
import { deriveButtonBindingEvidence, type DiagnosticInput } from './button-binding-evidence';
import type { ButtonV2Package } from './button-v2-package';
import { projectFigmaVariableCandidates, type FigmaVariableCandidate, type ProjectedType } from './variable-projection';

type Property = 'border-radius' | 'background-color' | 'color';
const MODES = ['dark', 'light'] as const;

export interface PreparedButtonBinding {
  source: ButtonV2Package;
  radius: FigmaVariableCandidate;
  background: FigmaVariableCandidate;
  textColor: FigmaVariableCandidate;
  evidence: ReturnType<typeof deriveButtonBindingEvidence>;
}

/** Selects only confirmed Button normal identities; values come from the chosen Package v2. */
export function prepareButtonNormalBinding(
  source: ButtonV2Package, diagnostics: DiagnosticInput[],
): PreparedButtonBinding {
  const evidence = deriveButtonBindingEvidence(source, diagnostics);
  const candidates = new Map(projectFigmaVariableCandidates(source.tokens).map((item) => [item.cssName, item]));

  const identity = (property: Property): string => {
    const tokens = MODES.map((mode: TokenMode) => {
      const rows = evidence.mappings.filter((item) => item.specimen === 'obsidian.button' &&
        item.variant === 'normal' && item.element === 'root' && item.property === property &&
        item.mode === mode && item.status === 'confirmed');
      if (rows.length !== 1) throw new Error(`Button normal/${property}/${mode}: evidência confirmed ausente ou duplicada`);
      return rows[0]!.token;
    });
    if (tokens[0] !== tokens[1]) throw new Error(`Button normal/${property}: token difere entre modes`);
    const token = tokens[0]!;
    if (!source.tokens.tokens[token]) throw new Error(`Button normal/${property}: token ${token} ausente no Package v2`);
    return token;
  };

  const select = (property: Property, figmaType: ProjectedType): FigmaVariableCandidate => {
    const token = identity(property);
    const candidate = candidates.get(token);
    if (!candidate || candidate.decision !== 'direct' || candidate.figmaType !== figmaType ||
        MODES.some((mode) => candidate.modes[mode].status !== 'resolved' ||
          candidate.modes[mode].projected?.strategy !== 'literal')) {
      throw new Error(`Button normal/${property}: ${token} não projeta ${figmaType} nos dois modes`);
    }
    return candidate;
  };

  const textToken = identity('color');
  if (textToken !== '--text-color') throw new Error('Button normal/color: token direto inesperado');
  for (const mode of MODES) {
    const scoped = source.tokens.tokens[textToken]?.[mode];
    const buttonDeclarations = scoped?.declarations.filter((row) => row.selector === 'button') ?? [];
    if (buttonDeclarations.length !== 1 ||
        buttonDeclarations[0]?.rawValue.trim() !== 'var(--text-normal)') {
      throw new Error(`Button normal/color/${mode}: alias do Package v2 ausente`);
    }
  }
  const target = candidates.get('--text-normal');
  if (!target || target.decision !== 'direct' || target.figmaType !== 'COLOR' ||
      MODES.some((mode) => target.modes[mode].status !== 'resolved' ||
        target.modes[mode].projected?.strategy !== 'literal')) {
    throw new Error('Button normal/color: --text-normal não projeta COLOR nos dois modes');
  }
  const textColor: FigmaVariableCandidate = { cssName: textToken, decision: 'direct', figmaType: 'COLOR',
    reason: 'Scoped --text-color alias to --text-normal confirmed on Button normal in both modes',
    modes: target.modes };

  return { source, evidence, radius: select('border-radius', 'FLOAT'),
    background: select('background-color', 'COLOR'), textColor };
}
