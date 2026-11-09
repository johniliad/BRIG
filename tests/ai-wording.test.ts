import { describe, it, expect } from 'vitest';
import { aiMeta, withAiWording } from '../src/engine/ai-wording';
import type { AnalysisResult } from '../src/types';
import type { EnhancedNarrative } from '../src/services/llm';

function baseAnalysis(): AnalysisResult {
  return {
    profile: { organisationLabel: 'Org' },
    facts: { marker: 'FACTS' },
    narrative: {
      headline: 'Deterministic headline',
      executiveMessage: 'Deterministic message',
      positiveDevelopments: ['det-pos'],
      keyRisks: ['det-risk'],
      priorities: ['det-prio'],
      boardActions: [
        { category: 'maintain_course', title: 'Det action', rationale: 'r', priority: 'primary', relatedMetrics: [] },
      ],
      managementNote: 'note',
      sections: [],
    },
  } as unknown as AnalysisResult;
}

const enhanced: EnhancedNarrative = {
  executive_headline: 'AI headline',
  executive_summary: 'AI message',
  key_risks: ['ai-risk'],
  key_achievements: ['ai-pos'],
  strategic_priorities: ['ai-prio'],
  board_actions: ['AI action'],
};

describe('withAiWording', () => {
  it('replaces narrative wording but leaves facts untouched', () => {
    const a = baseAnalysis();
    const out = withAiWording(a, enhanced, 'OpenRouter', 'openai/gpt-4o-mini');
    expect(out.narrative.headline).toBe('AI headline');
    expect(out.narrative.executiveMessage).toBe('AI message');
    expect(out.narrative.keyRisks).toEqual(['ai-risk']);
    expect(out.narrative.positiveDevelopments).toEqual(['ai-pos']);
    expect(out.narrative.priorities).toEqual(['ai-prio']);
    expect(out.narrative.boardActions[0].title).toBe('AI action');
    // facts object is the SAME reference — never recomputed or altered
    expect(out.facts).toBe(a.facts);
    // the original analysis is not mutated
    expect(a.narrative.headline).toBe('Deterministic headline');
  });

  it('falls back to deterministic arrays when the AI returns an empty list', () => {
    const out = withAiWording(baseAnalysis(), { ...enhanced, key_risks: [], board_actions: [] }, 'X', 'Y');
    expect(out.narrative.keyRisks).toEqual(['det-risk']);
    expect(out.narrative.boardActions[0].title).toBe('Det action');
  });

  it('aiMeta enables disclosure metadata', () => {
    expect(aiMeta('OpenRouter', 'openai/gpt-4o-mini')).toEqual({
      enabled: true,
      provider: 'OpenRouter',
      model: 'openai/gpt-4o-mini',
      generated: true,
      validated: true,
    });
  });
});
