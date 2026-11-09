import type {
  ChallengeResult,
  ContradictionResult,
  MetricDefinition,
  StorylineResult,
  TrendResult,
} from '../types';

/**
 * Challenge the Story (spec §15 in requirements / §24.16 in plan). A purely
 * deterministic counter-analysis that deliberately searches for contradictory
 * or balancing evidence before the principal conclusion is finalised.
 */
export function challengeStory(
  primary: StorylineResult,
  contradictions: ContradictionResult[],
  trends: Map<string, TrendResult>,
  library: Map<string, MetricDefinition>,
): ChallengeResult {
  const counterSignals: ChallengeResult['counterSignals'] = [];

  // 1) Explicit contradictions are the strongest counter-signals.
  for (const c of contradictions) {
    counterSignals.push({
      rule_key: c.rule_key,
      signal: c.explanation,
      supportingMetrics: c.counterSignals,
      metricKeys: c.metricKeys,
    });
  }

  // 2) The storyline's own declared counter-signal metrics, if they worsened.
  for (const key of primary.storyline_key ? primary.counterSignals : []) {
    const t = trends.get(key);
    if (!t?.hasComparison) continue;
    const worsened = t.interpretation === 'deteriorating' || t.thresholdBreached;
    if (!worsened) continue;
    const name = library.get(key)?.name ?? key;
    if (counterSignals.some((s) => s.metricKeys.includes(key))) continue;
    counterSignals.push({
      rule_key: `counter_${key}`,
      signal: `${name} moved unfavourably, partially offsetting the principal conclusion.`,
      supportingMetrics: [name],
      metricKeys: [key],
    });
  }

  const softened = counterSignals.length > 0;
  const elevated = contradictions.some((c) => c.severity === 'elevated');

  let recommendation: string;
  if (!softened) {
    recommendation = 'No material counter-signals were found. The principal conclusion is supported by the available evidence.';
  } else if (elevated) {
    recommendation =
      'Material counter-signals were found. The conclusion should be softened and segmented: present the primary finding together with the balancing evidence rather than as a single clean message.';
  } else {
    recommendation =
      'Balancing counter-signals were found. Consider softening the conclusion and adding the counter-signal as a caveat or watch item.';
  }

  return {
    primaryConclusion: primary.title,
    counterSignals,
    softened,
    recommendation,
  };
}
