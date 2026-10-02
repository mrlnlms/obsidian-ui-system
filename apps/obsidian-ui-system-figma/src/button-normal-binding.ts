import type { TokenMode } from '@obsidian-ui-system/ui-schema';
import { deriveBindingPilotEvidence, type DiagnosticInput } from './binding-pilot-evidence';
import type { ButtonV2Package } from './button-v2-package';
import { projectFigmaVariableCandidates, type FigmaVariableCandidate, type ProjectedType } from './variable-projection';

type Property = 'border-radius' | 'background-color';
const MODES = ['dark', 'light'] as const;

export interface PreparedButtonBinding {
  source: ButtonV2Package;
  radius: FigmaVariableCandidate;
  background: FigmaVariableCandidate;
  evidence: ReturnType<typeof deriveBindingPilotEvidence>;
}

/** Selects only confirmed Button normal identities; values come from the chosen Package v2. */
export function prepareButtonNormalBinding(
  source: ButtonV2Package, diagnostics: DiagnosticInput[],
): PreparedButtonBinding {
  const evidence = deriveBindingPilotEvidence(source, diagnostics, 'structural');
  const candidates = new Map(projectFigmaVariableCandidates(source.tokens).map((item) => [item.cssName, item]));

  const select = (property: Property, figmaType: ProjectedType): FigmaVariableCandidate => {
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
    const candidate = candidates.get(token);
    if (!candidate || candidate.decision !== 'direct' || candidate.figmaType !== figmaType ||
        MODES.some((mode) => candidate.modes[mode].status !== 'resolved' ||
          candidate.modes[mode].projected?.strategy !== 'literal')) {
      throw new Error(`Button normal/${property}: ${token} não projeta ${figmaType} nos dois modes`);
    }
    return candidate;
  };

  return { source, evidence, radius: select('border-radius', 'FLOAT'),
    background: select('background-color', 'COLOR') };
}
