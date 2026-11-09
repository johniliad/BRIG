import type { AiMeta, AnalysisResult, BoardAction } from '../types';
import type { EnhancedNarrative } from '../services/llm';

/** AI metadata block included in exports (used for disclosure). */
export function aiMeta(providerLabel: string, providerModel: string): AiMeta {
  return {
    enabled: true,
    provider: providerLabel || null,
    model: providerModel || null,
    generated: true,
    validated: true,
  };
}

function boardActionsFromAi(items: string[]): BoardAction[] {
  return items.map((title) => ({
    category: 'request_management_action',
    title,
    rationale: '',
    priority: 'primary',
    relatedMetrics: [],
  }));
}

/**
 * Return a copy of the analysis whose narrative WORDING is replaced by the
 * validated AI output. Figures, findings, trends, relationships and all other
 * analytical fields are untouched — only language changes. Empty AI arrays fall
 * back to the deterministic text so sections are never blanked.
 */
export function withAiWording(
  analysis: AnalysisResult,
  enhanced: EnhancedNarrative,
  providerLabel: string,
  providerModel: string,
): AnalysisResult {
  void providerLabel;
  void providerModel;
  const n = analysis.narrative;
  const pick = <T,>(ai: T[] | undefined, fallback: T[]): T[] => (ai && ai.length > 0 ? ai : fallback);
  return {
    ...analysis,
    narrative: {
      ...n,
      headline: enhanced.executive_headline?.trim() || n.headline,
      executiveMessage: enhanced.executive_summary?.trim() || n.executiveMessage,
      positiveDevelopments: pick(enhanced.key_achievements, n.positiveDevelopments),
      keyRisks: pick(enhanced.key_risks, n.keyRisks),
      priorities: pick(enhanced.strategic_priorities, n.priorities),
      boardActions:
        enhanced.board_actions && enhanced.board_actions.length > 0
          ? boardActionsFromAi(enhanced.board_actions)
          : n.boardActions,
    },
  };
}
