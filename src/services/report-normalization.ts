import type { AnalysisResult, ConfidenceResult, MaterialityResult, TrendResult } from '../types';
import { APPLICATION_VERSION, REPORT_SCHEMA_VERSION } from '../engine/report';

function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeSavedReport(raw: unknown): AnalysisResult | null {
  if (!object(raw) || !object(raw.profile) || !object(raw.executivePosition) || !object(raw.narrative) || !object(raw.metadata)) return null;
  const requiredArrays = ['trends', 'findings', 'relationships', 'contradictions', 'materiality', 'storylines', 'boardActions', 'charts'];
  if (requiredArrays.some((key) => !Array.isArray(raw[key]))) return null;

  const model = raw as unknown as AnalysisResult;
  if ((model.metadata.schema_version ?? 1) > REPORT_SCHEMA_VERSION) return null;
  model.metadata = {
    ...model.metadata,
    schema_version: model.metadata.schema_version ?? 1,
    application_version: model.metadata.application_version ?? 'pre-1.1.2',
  };
  model.trends = model.trends.map((trend) => ({
    ...trend,
    hasTargetEvidence: trend.hasTargetEvidence ?? trend.targetGap !== null,
    targetBreached: trend.targetBreached ?? false,
    hasThresholdEvidence: trend.hasThresholdEvidence ?? trend.thresholdBreached,
  } satisfies TrendResult));
  model.materiality = model.materiality.map((item) => ({
    ...item,
    signalStrength: item.signalStrength ?? (item.score >= 75 ? 'Material' : item.score >= 50 ? 'Significant' : item.score >= 25 ? 'Moderate' : 'Low'),
    assessable: item.assessable ?? item.score > 0,
    inherentImportance: item.inherentImportance ?? 0,
  } satisfies MaterialityResult));
  const materialityByKey = new Map(model.materiality.map((item) => [item.metric_key, item]));
  model.findings = model.findings.map((finding) => {
    const materiality = materialityByKey.get(finding.metric_key);
    return {
      ...finding,
      signalStrength: finding.signalStrength ?? materiality?.signalStrength ?? 'Low',
      inherentImportance: finding.inherentImportance ?? materiality?.inherentImportance ?? 0,
    };
  });
  model.confidence = {
    ...model.confidence,
    selectedMetricCount: model.confidence.selectedMetricCount ?? model.confidence.metricCount,
    currentValueCount: model.confidence.currentValueCount ?? model.confidence.metricCount,
    comparisonCoverage: model.confidence.comparisonCoverage ?? 0,
    dataQualityScore: model.confidence.dataQualityScore ?? model.confidence.dataCompleteness,
  } satisfies ConfidenceResult;
  model.provenance = Array.isArray(model.provenance) ? model.provenance : [];
  model.positives = Array.isArray(model.positives) ? model.positives : model.findings.filter((finding) => finding.kind === 'positive');
  model.concerns = Array.isArray(model.concerns) ? model.concerns : model.findings.filter((finding) => finding.kind === 'concern');
  model.metadata.application_version ||= APPLICATION_VERSION;
  return model;
}