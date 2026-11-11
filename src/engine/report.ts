import type {
  AiMeta,
  AnalysisResult,
  BoardReportModel,
  Finding,
  MaterialityResult,
  MetricDefinition,
  MetricObservation,
  PrivacyMode,
  ReportFacts,
  TrendResult,
} from '../types';
import { LIBRARY_VERSION } from '../data/library';
import { formatMetricValue } from './format';

export const METHODOLOGY_VERSION = '1.0.0';
export const RULE_VERSION = '1.0.0';

/**
 * Build the ReportFacts object — the ONLY analytical contract passed to the
 * optional Executive Writing Layer (R9). It contains the approved evidence
 * boundary: facts, findings, relationships, contradictions, materiality and
 * approved numbers. It never contains the full 120-metric database dump.
 */
export function buildReportFacts(
  analysis: Omit<AnalysisResult, 'facts' | 'metadata'>,
  selected: Array<{ def: MetricDefinition; obs: MetricObservation }>,
  trends: Map<string, TrendResult>,
  materiality: Map<string, MaterialityResult>,
  currency: string,
): ReportFacts {
  const observed_metrics = selected.map(({ def, obs }) => ({
    metric_key: def.metric_key,
    name: def.name,
    unit: def.unit,
    current: obs.current,
    previous: obs.previous,
    target: obs.target,
  }));

  const calculated_metrics = Array.from(materiality.values()).map((m) => ({
    metric_key: m.metric_key,
    label: 'Materiality score',
    value: m.score,
    unit: 'score',
  }));

  const trend_results = Array.from(trends.values()).map((t) => ({
    metric_key: t.metric_key,
    direction: t.direction,
    band: t.band,
    interpretation: t.interpretation,
    percentageDelta: t.percentageDelta,
    percentagePointDelta: t.percentagePointDelta,
  }));

  const threshold_results = Array.from(trends.values()).map((t) => ({
    metric_key: t.metric_key,
    breached: t.thresholdBreached,
    targetGap: t.targetGap,
  }));

  const findings = analysis.findings.map((f: Finding) => ({
    metric_key: f.metric_key,
    kind: f.kind,
    headline: f.headline,
  }));

  const relationships = analysis.relationships
    .filter((r) => r.triggered)
    .map((r) => ({ rule_key: r.rule_key, interpretation: r.interpretation }));

  const contradictions = analysis.contradictions.map((c) => ({
    rule_key: c.rule_key,
    title: c.title,
    explanation: c.explanation,
  }));

  const matList = Array.from(materiality.values()).map((m) => ({ metric_key: m.metric_key, score: m.score, band: m.band }));

  const defByKey = new Map(selected.map((s) => [s.def.metric_key, s.def]));
  const approved_numbers = selected
    .filter((s) => s.obs.current !== null)
    .map((s) => ({
      metric_key: s.def.metric_key,
      label: s.def.name,
      value: formatMetricValue(s.obs.current, s.def.unit, currency),
    }));

  return {
    methodology_version: METHODOLOGY_VERSION,
    metric_library_version: LIBRARY_VERSION,
    rule_version: RULE_VERSION,
    executive_status: analysis.executivePosition.status,
    confidence: analysis.confidence.boardNarrativeConfidence,
    headline: analysis.narrative.headline,
    observed_metrics,
    calculated_metrics,
    trend_results,
    threshold_results,
    findings,
    relationships,
    contradictions,
    materiality: matList,
    confidence_detail: {
      level: analysis.confidence.level,
      board_narrative_confidence: analysis.confidence.boardNarrativeConfidence,
      drivers: analysis.confidence.drivers,
      note: analysis.confidence.note,
    },
    approved_numbers,
    approved_metric_keys: Array.from(defByKey.keys()),
    strategic_priorities: analysis.narrative.priorities,
    board_actions: analysis.narrative.boardActions.map((a) => ({
      category: a.category,
      title: a.title,
      rationale: a.rationale,
    })),
    unsupported_inferences: [],
  };
}

export function buildBoardReportModel(
  analysis: AnalysisResult,
  privacyMode: PrivacyMode,
  ai?: AiMeta,
): BoardReportModel {
  return {
    facts: analysis.facts,
    analysis: {
      findings: analysis.findings,
      relationships: analysis.relationships,
      contradictions: analysis.contradictions,
      materiality: analysis.materiality,
      confidence: analysis.confidence,
      executivePosition: analysis.executivePosition,
      storylines: analysis.storylines,
    },
    narrative: analysis.narrative,
    presentation: {
      charts: analysis.charts,
      audience: analysis.profile.audience,
      style: analysis.profile.style,
    },
    metadata: { ...analysis.metadata, privacy_mode: privacyMode },
    ai: ai ?? { enabled: false, provider: null, model: null, generated: false, validated: false },
  };
}
