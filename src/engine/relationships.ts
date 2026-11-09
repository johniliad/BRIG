import type { RelationshipResult, TrendResult } from '../types';
import { RELATIONSHIP_RULES, matchesPattern } from '../data/relationships';

export interface RelationshipEvaluation {
  results: RelationshipResult[];
  triggered: RelationshipResult[];
  /** Max relationship strength per metric key (feeds materiality). */
  strengthByMetric: Map<string, number>;
  /** Count of triggered supportive (non-contradiction) relationships. */
  supportCount: number;
}

/**
 * Evaluate the configured relationship heuristics against the computed trends.
 * Relationships are signals, never proof of causality (spec §10, §13).
 */
export function evaluateRelationships(trends: Map<string, TrendResult>): RelationshipEvaluation {
  const results: RelationshipResult[] = [];
  const strengthByMetric = new Map<string, number>();
  let supportCount = 0;

  for (const rule of RELATIONSHIP_RULES) {
    const a = trends.get(rule.metricA);
    const b = trends.get(rule.metricB);
    if (!a || !b) continue;
    if (!a.hasComparison || !b.hasComparison) continue;

    const triggered = matchesPattern(rule.pattern, a, b);
    const result: RelationshipResult = {
      rule_key: rule.rule_key,
      metricKeys: [rule.metricA, rule.metricB],
      type: rule.type,
      triggered,
      interpretation: rule.interpretation,
      strength: rule.strength,
      supportedBy: triggered ? [rule.metricA, rule.metricB] : [],
    };
    results.push(result);

    if (triggered) {
      if (rule.type !== 'contradiction') supportCount += 1;
      for (const key of [rule.metricA, rule.metricB]) {
        const current = strengthByMetric.get(key) ?? 0;
        if (rule.strength > current) strengthByMetric.set(key, rule.strength);
      }
    }
  }

  const triggered = results.filter((r) => r.triggered);
  return { results, triggered, strengthByMetric, supportCount };
}
