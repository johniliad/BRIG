import type { ConfidenceLevel, ConfidenceResult, DataQuality } from '../types';

export interface ConfidenceInput {
  selectedMetricCount: number;
  currentValueCount: number;
  comparableCount: number;
  medianPeriods: number;
  relationshipSupport: number;
  contradictionCount: number;
  qualityScore: number;
  provenanceShare: number;
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

export function computeConfidence(input: ConfidenceInput): ConfidenceResult {
  const {
    selectedMetricCount, currentValueCount, comparableCount, medianPeriods,
    relationshipSupport, contradictionCount, qualityScore, provenanceShare,
  } = input;
  const drivers: string[] = [];
  const completeness = selectedMetricCount > 0 ? currentValueCount / selectedMetricCount : 0;
  const comparisonCoverage = selectedMetricCount > 0 ? comparableCount / selectedMetricCount : 0;
  const historyDepth = Math.min(Math.max(medianPeriods - 1, 0) / 3, 1);
  const independentRelationshipSupport = Math.min(relationshipSupport / 4, 1);

  let score = completeness * 25 + comparisonCoverage * 25 + historyDepth * 15 + qualityScore * 20 + provenanceShare * 10 + independentRelationshipSupport * 5;
  if (contradictionCount > 0) score -= Math.min(contradictionCount * 5, 20);
  score = Math.max(0, Math.min(100, score));

  drivers.push(`${currentValueCount} of ${selectedMetricCount} selected applicable metrics have a current value`);
  drivers.push(`${comparableCount} of ${selectedMetricCount} selected applicable metrics have a comparison period`);
  drivers.push(`Median history depth is ${medianPeriods} period(s)`);
  drivers.push(`Data-quality score is ${Math.round(qualityScore * 100)}% across entered metrics`);
  if (provenanceShare > 0) drivers.push(`${Math.round(provenanceShare * 100)}% of entered metrics include core provenance`);
  if (relationshipSupport > 0) drivers.push(`${relationshipSupport} supporting cross-metric relationship signal(s)`);
  if (contradictionCount > 0) drivers.push(`${contradictionCount} contradictory signal(s) reduce confidence`);

  let level = levelFor(score);
  let boardNarrativeConfidence = capForContradictions(level, contradictionCount);
  if (currentValueCount === 0) boardNarrativeConfidence = 'Insufficient evidence';
  else if (comparableCount === 0 && boardNarrativeConfidence !== 'Insufficient evidence') boardNarrativeConfidence = 'Low';
  level = boardNarrativeConfidence;

  return {
    level,
    boardNarrativeConfidence,
    score: Math.round(score),
    drivers,
    note: `Confidence is ${boardNarrativeConfidence.toLowerCase()} based on current-value completeness, comparison coverage, median history depth, data quality and provenance; no external benchmark is assumed.`,
    comparablePeriods: medianPeriods,
    metricCount: currentValueCount,
    selectedMetricCount,
    currentValueCount,
    relationshipSupport,
    dataCompleteness: Math.round(completeness * 100) / 100,
    comparisonCoverage: Math.round(comparisonCoverage * 100) / 100,
    dataQualityScore: Math.round(qualityScore * 100) / 100,
    contradictionCount,
  };
}

export function qualityWeight(q: DataQuality): number {
  if (q === 'high') return 1;
  if (q === 'medium') return 0.7;
  return 0.4;
}