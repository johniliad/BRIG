import type {
  MagnitudeBand,
  MaterialityContribution,
  MaterialityResult,
  MetricDefinition,
  SignalStrength,
  TrendResult,
} from '../types';

/** Methodology v2: evidence absence contributes zero, never a default score. */
export const MATERIALITY_WEIGHTS = {
  magnitude: 0.3,
  target_gap: 0.2,
  tolerance_breach: 0.25,
  persistence: 0.15,
  relationship_strength: 0.1,
} as const;

export const INHERENT_IMPORTANCE_WEIGHTS = {
  board_relevance: 0.35,
  risk_relevance: 0.35,
  business_impact: 0.2,
  regulatory_relevance: 0.1,
} as const;

export const MATERIALITY_VERSION = '2.0.0';

export interface MaterialityContext {
  relationshipStrength?: number;
  businessImpact?: number;
  regulatoryRelevance?: number;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function deriveBusinessImpact(metric: MetricDefinition): number {
  if (metric.story_tags.some((tag) => ['business_impact', 'availability', 'resilience', 'breach', 'ransomware'].includes(tag))) return 0.85;
  return clamp01((metric.board_relevance + metric.risk_relevance) / 10 * 0.8);
}

function deriveRegulatoryRelevance(metric: MetricDefinition): number {
  if (metric.story_tags.some((tag) => ['regulatory', 'compliance', 'breach'].includes(tag))) return 0.9;
  if (metric.category === 'governance_risk_assurance') return 0.6;
  return 0.2;
}

function inherentImportance(metric: MetricDefinition, ctx: MaterialityContext): number {
  const raw =
    clamp01(metric.board_relevance / 5) * INHERENT_IMPORTANCE_WEIGHTS.board_relevance +
    clamp01(metric.risk_relevance / 5) * INHERENT_IMPORTANCE_WEIGHTS.risk_relevance +
    clamp01(ctx.businessImpact ?? deriveBusinessImpact(metric)) * INHERENT_IMPORTANCE_WEIGHTS.business_impact +
    clamp01(ctx.regulatoryRelevance ?? deriveRegulatoryRelevance(metric)) * INHERENT_IMPORTANCE_WEIGHTS.regulatory_relevance;
  return Math.round(raw * 1000) / 10;
}

function targetGapStrength(metric: MetricDefinition, trend: TrendResult): number {
  if (!trend.hasTargetEvidence || !trend.targetBreached) return 0;
  if (trend.thresholdBreached) return 1;
  if (trend.targetGap === null || trend.current === null) return 0.4;
  const gap = Math.abs(trend.targetGap);
  const ratio = metric.unit === 'percent'
    ? gap
    : gap / Math.max(Math.abs(trend.current - trend.targetGap), 1) * 100;
  if (ratio <= 2) return 0.2;
  if (ratio <= 5) return 0.4;
  if (ratio <= 15) return 0.6;
  if (ratio <= 30) return 0.8;
  return 1;
}

const SIGNAL_ORDER: SignalStrength[] = ['Not assessable', 'Low', 'Moderate', 'Significant', 'Material'];

function stronger(a: SignalStrength, b: SignalStrength): SignalStrength {
  return SIGNAL_ORDER.indexOf(a) >= SIGNAL_ORDER.indexOf(b) ? a : b;
}

function labelFor(trend: TrendResult, relationship: number, assessable: boolean): SignalStrength {
  if (!assessable) return 'Not assessable';
  let label: SignalStrength = 'Low';
  if (trend.band === 'moderate') label = 'Moderate';
  if (trend.band === 'significant') label = 'Significant';
  if (trend.band === 'material') label = 'Material';
  if (trend.targetBreached) label = stronger(label, 'Moderate');
  if (trend.thresholdBreached) label = stronger(label, 'Significant');
  if (trend.persistencePeriods >= 2 && label !== 'Material') label = SIGNAL_ORDER[SIGNAL_ORDER.indexOf(label) + 1];
  if (relationship >= 0.7 && label !== 'Material') label = SIGNAL_ORDER[SIGNAL_ORDER.indexOf(label) + 1];
  return label;
}

function legacyBand(label: SignalStrength): MagnitudeBand {
  if (label === 'Low') return 'minor';
  if (label === 'Moderate') return 'moderate';
  if (label === 'Significant') return 'significant';
  if (label === 'Material') return 'material';
  return 'unknown';
}

export function computeMateriality(
  metric: MetricDefinition,
  trend: TrendResult,
  ctx: MaterialityContext = {},
): MaterialityResult {
  const relationship = clamp01(ctx.relationshipStrength ?? 0);
  const targetStrength = targetGapStrength(metric, trend);
  const hasMovementEvidence = trend.hasComparison && trend.band !== 'negligible' && trend.band !== 'unknown';
  const hasPositionException = trend.targetBreached || trend.thresholdBreached;
  const assessable = hasMovementEvidence || hasPositionException || relationship > 0;
  const factors: Array<{ factor: string; weight: number; value: number }> = [
    { factor: 'magnitude', weight: MATERIALITY_WEIGHTS.magnitude, value: hasMovementEvidence ? clamp01(trend.magnitudeScore) : 0 },
    { factor: 'target_gap', weight: MATERIALITY_WEIGHTS.target_gap, value: targetStrength },
    { factor: 'tolerance_breach', weight: MATERIALITY_WEIGHTS.tolerance_breach, value: trend.thresholdBreached ? 1 : 0 },
    { factor: 'persistence', weight: MATERIALITY_WEIGHTS.persistence, value: trend.hasComparison ? clamp01(trend.persistencePeriods / 3) : 0 },
    { factor: 'relationship_strength', weight: MATERIALITY_WEIGHTS.relationship_strength, value: relationship },
  ];

  const contributions: MaterialityContribution[] = factors.map((factor) => ({
    ...factor,
    weighted: factor.weight * factor.value,
  }));
  const raw = contributions.reduce((sum, contribution) => sum + contribution.weighted, 0);
  const score = assessable ? Math.round(clamp01(raw) * 1000) / 10 : 0;
  const signalStrength = labelFor(trend, relationship, assessable);

  return {
    metric_key: metric.metric_key,
    score,
    signalStrength,
    assessable,
    inherentImportance: inherentImportance(metric, ctx),
    contributions,
    band: legacyBand(signalStrength),
  };
}