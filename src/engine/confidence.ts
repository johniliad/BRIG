import type { ConfidenceLevel, ConfidenceResult, DataQuality } from '../types';

export interface ConfidenceInput {
  metricCount: number;
  /** Number of selected metrics that have a valid current + previous comparison. */
  comparableCount: number;
  /** Longest history series available across metrics (>=2 when any comparison). */
  maxPeriods: number;
  /** 0–1 completeness of current values + quality weighting. */
  dataCompleteness: number;
  /** Count of triggered supportive relationships. */
  relationshipSupport: number;
  /** Count of triggered contradictions. */
  contradictionCount: number;
  /** Number of metrics entered with high data quality. */
  highQualityCount: number;
}

function levelFor(score: number): ConfidenceLevel {
  if (score >= 75) return 'High';
  if (score >= 50) return 'Medium';
  if (score >= 25) return 'Low';
  return 'Insufficient evidence';
}

function capForContradictions(level: ConfidenceLevel, contradictionCount: number): ConfidenceLevel {
  if (contradictionCount >= 2 && (level === 'High' || level === 'Medium')) return 'Medium';
  return level;
}

/**
 * Board Narrative Confidence is based on EVIDENCE QUALITY, not model
 * probability (spec §22.1). It is deterministic and explanatory.
 */
export function computeConfidence(input: ConfidenceInput): ConfidenceResult {
  const {
    metricCount,
    comparableCount,
    maxPeriods,
    dataCompleteness,
    relationshipSupport,
    contradictionCount,
    highQualityCount,
  } = input;

  const drivers: string[] = [];
  let score = 0;

  score += dataCompleteness * 40;
  drivers.push(`${Math.round(dataCompleteness * 100)}% data completeness across selected metrics`);

  const comparableShare = metricCount > 0 ? Math.min(comparableCount / metricCount, 1) : 0;
  score += comparableShare * 25;
  drivers.push(`${comparableCount} of ${metricCount} selected metrics have a comparison period`);

  const relScore = Math.min(relationshipSupport / 4, 1) * 20;
  score += relScore;
  if (relationshipSupport > 0) drivers.push(`${relationshipSupport} supporting cross-metric relationship signal(s)`);

  const qualityShare = metricCount > 0 ? Math.min(highQualityCount / metricCount, 1) : 0;
  score += qualityShare * 15;
  if (highQualityCount > 0) drivers.push(`${highQualityCount} metric(s) entered with high data quality`);

  if (contradictionCount > 0) {
    score -= Math.min(contradictionCount * 5, 20);
    drivers.push(`${contradictionCount} contradictory signal(s) reduce confidence`);
  }

  score = Math.max(0, Math.min(100, score));

  let level = levelFor(score);
  let boardNarrativeConfidence = capForContradictions(level, contradictionCount);

  // If there is no comparison data at all, trend-based conclusions cannot be strong.
  if (comparableCount === 0) {
    boardNarrativeConfidence = dataCompleteness > 0.2 ? 'Low' : 'Insufficient evidence';
    level = boardNarrativeConfidence;
  }

  const periodWord = maxPeriods <= 1 ? 'a single period' : `${maxPeriods} comparable reporting periods`;
  const benchmarkWord = 'no external benchmark';
  const note = `Confidence is ${boardNarrativeConfidence.toLowerCase()} because the analysis uses ${periodWord} and ${benchmarkWord}.`;

  return {
    level,
    boardNarrativeConfidence,
    score: Math.round(score),
    drivers,
    note,
    comparablePeriods: maxPeriods,
    metricCount,
    relationshipSupport,
    dataCompleteness: Math.round(dataCompleteness * 100) / 100,
    contradictionCount,
  };
}

export function qualityWeight(q: DataQuality): number {
  if (q === 'high') return 1;
  if (q === 'medium') return 0.7;
  return 0.4;
}
