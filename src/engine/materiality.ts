import type { MagnitudeBand, MaterialityContribution, MaterialityResult, MetricDefinition, TrendResult } from '../types';

/**
 * Materiality scoring (spec §14). Weights are VERSIONED methodology data, not
 * buried in UI components. Sum = 1.0.
 */
export const MATERIALITY_WEIGHTS = {
  board_relevance: 0.2,
  severity: 0.2,
  magnitude: 0.15,
  target_breach: 0.1,
  persistence: 0.1,
  relationship_strength: 0.1,
  business_impact: 0.1,
  regulatory_relevance: 0.05,
} as const;

export const MATERIALITY_VERSION = '1.0.0';

export interface MaterialityContext {
  relationshipStrength?: number; // 0–1, supplied by the relationship engine
  businessImpact?: number; // 0–1 override
  regulatoryRelevance?: number; // 0–1 override
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function bandForScore(score: number): MagnitudeBand {
  if (score < 20) return 'negligible';
  if (score < 40) return 'minor';
  if (score < 60) return 'moderate';
  if (score < 75) return 'significant';
  return 'material';
}

function deriveBusinessImpact(metric: MetricDefinition): number {
  const tags = metric.story_tags;
  if (tags.some((t) => ['business_impact', 'availability', 'resilience', 'breach', 'ransomware'].includes(t))) return 0.85;
  return clamp01((metric.board_relevance + metric.risk_relevance) / 10 * 0.8);
}

function deriveRegulatoryRelevance(metric: MetricDefinition): number {
  const tags = metric.story_tags;
  if (tags.some((t) => ['regulatory', 'compliance', 'breach'].includes(t))) return 0.9;
  if (metric.category === 'governance_risk_assurance') return 0.6;
  return 0.2;
}

export function computeMateriality(
  metric: MetricDefinition,
  trend: TrendResult,
  ctx: MaterialityContext = {},
): MaterialityResult {
  const factors: Array<{ factor: string; weight: number; value: number }> = [
    { factor: 'board_relevance', weight: MATERIALITY_WEIGHTS.board_relevance, value: clamp01(metric.board_relevance / 5) },
    { factor: 'severity', weight: MATERIALITY_WEIGHTS.severity, value: clamp01(metric.risk_relevance / 5) },
    { factor: 'magnitude', weight: MATERIALITY_WEIGHTS.magnitude, value: clamp01(trend.magnitudeScore) },
    { factor: 'target_breach', weight: MATERIALITY_WEIGHTS.target_breach, value: trend.thresholdBreached ? 1 : 0.15 },
    { factor: 'persistence', weight: MATERIALITY_WEIGHTS.persistence, value: clamp01(trend.persistencePeriods / 3) },
    {
      factor: 'relationship_strength',
      weight: MATERIALITY_WEIGHTS.relationship_strength,
      value: clamp01(ctx.relationshipStrength ?? 0.3),
    },
    {
      factor: 'business_impact',
      weight: MATERIALITY_WEIGHTS.business_impact,
      value: clamp01(ctx.businessImpact ?? deriveBusinessImpact(metric)),
    },
    {
      factor: 'regulatory_relevance',
      weight: MATERIALITY_WEIGHTS.regulatory_relevance,
      value: clamp01(ctx.regulatoryRelevance ?? deriveRegulatoryRelevance(metric)),
    },
  ];

  const contributions: MaterialityContribution[] = factors.map((f) => ({
    factor: f.factor,
    weight: f.weight,
    value: f.value,
    weighted: f.value * f.weight,
  }));

  const raw = contributions.reduce((sum, c) => sum + c.weighted, 0);
  const score = Math.round(clamp01(raw) * 1000) / 10; // 0–100 to one decimal

  return {
    metric_key: metric.metric_key,
    score,
    contributions,
    band: bandForScore(score),
  };
}
