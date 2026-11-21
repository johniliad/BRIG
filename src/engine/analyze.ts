import type {
  AnalysisInput,
  AnalysisResult,
  BoardAction,
  ConfidenceResult,
  MaterialityResult,
  MetricDefinition,
  MetricObservation,
  ReportMetadata,
  TrendResult,
} from '../types';
import { computeTrend } from './trend';
import { evaluateRelationships } from './relationships';
import { computeMateriality } from './materiality';
import { generateFindings } from './findings';
import { evaluateContradictions } from './contradictions';
import { evaluateStoryRules } from './storyline';
import { computeConfidence, qualityWeight } from './confidence';
import { deriveExecutivePosition } from './position';
import { challengeStory } from './challenge';
import { buildCharts } from './charts';
import { generateNarrative } from './narrative';
import { APPLICATION_VERSION, buildReportFacts, METHODOLOGY_VERSION, REPORT_SCHEMA_VERSION, RULE_VERSION } from './report';
import { LIBRARY_VERSION } from '../data/library';
import { reportingWindow } from '../services/formatters';

/**
 * The CISO Intelligence Engine orchestrator. Fully deterministic and usable
 * with no external LLM (R1). Order of operations follows spec §Step 5.
 */
export function analyze(input: AnalysisInput): AnalysisResult {
  const { profile, library } = input;
  const observations = input.observations.map((observation) => ({
    ...observation,
    dataStatus: observation.dataStatus ?? (observation.applicable === false ? 'not_applicable' : observation.current !== null ? 'available' : 'not_set'),
    lowerThreshold: observation.lowerThreshold ?? null,
    upperThreshold: observation.upperThreshold ?? null,
    comparisonMissingReason: observation.comparisonMissingReason ?? '',
  }));
  const currency = profile.currency || 'EUR';

  const libraryMap = new Map<string, MetricDefinition>(library.map((m) => [m.metric_key, m]));
  const observationsMap = new Map<string, MetricObservation>();
  for (const o of observations) observationsMap.set(o.metric_key, o);

  const applicable = observations.filter((o) => o.applicable && o.dataStatus !== 'not_applicable');
  // Analysed = applicable metrics with an available, finite current value.
  const selected: Array<{ def: MetricDefinition; obs: MetricObservation }> = [];
  for (const o of applicable) {
    if (o.dataStatus !== 'available') continue;
    if (o.current === null || Number.isNaN(o.current)) continue;
    const def = libraryMap.get(o.metric_key);
    if (!def) continue;
    selected.push({ def, obs: o });
  }

  const trendsMap = new Map<string, TrendResult>();
  for (const { def, obs } of selected) {
    trendsMap.set(def.metric_key, computeTrend(def, obs));
  }

  const relationshipEval = evaluateRelationships(trendsMap);

  const materialityMap = new Map<string, MaterialityResult>();
  for (const { def } of selected) {
    const trend = trendsMap.get(def.metric_key)!;
    materialityMap.set(
      def.metric_key,
      computeMateriality(def, trend, { relationshipStrength: relationshipEval.strengthByMetric.get(def.metric_key) }),
    );
  }

  const findings = generateFindings(libraryMap, observationsMap, trendsMap, materialityMap, currency);
  const contradictions = evaluateContradictions(trendsMap, observationsMap);
  const metricCount = selected.length;
  const selectedMetricCount = applicable.length;

  const comparableCount = Array.from(trendsMap.values()).filter((t) => t.hasComparison).length;
  const periodCounts = selected.map(({ obs }) => [...obs.history, obs.previous, obs.current].filter((v) => v !== null && v !== undefined).length).sort((a, b) => a - b);
  const medianPeriods = periodCounts.length === 0 ? 0 : periodCounts[Math.floor((periodCounts.length - 1) / 2)];
  const qualityScore = metricCount > 0 ? selected.reduce((sum, { obs }) => sum + qualityWeight(obs.dataQuality), 0) / metricCount : 0;
  const provenanceShare = metricCount > 0
    ? selected.filter(({ obs }) => Boolean(obs.sourceSystem?.trim() && obs.reportingOwner?.trim() && obs.extractionDate?.trim())).length / metricCount
    : 0;

  const confidence: ConfidenceResult = computeConfidence({
    selectedMetricCount,
    currentValueCount: metricCount,
    comparableCount,
    medianPeriods,
    relationshipSupport: relationshipEval.supportCount,
    contradictionCount: contradictions.length,
    qualityScore,
    provenanceShare,
  });

  const storyEval = evaluateStoryRules(trendsMap, observationsMap, metricCount);
  const primary = storyEval.primary;

  const hasPositionEvidence = Array.from(trendsMap.values()).some((trend) => trend.hasTargetEvidence || trend.hasThresholdEvidence);
  const position = deriveExecutivePosition(primary, findings, confidence, comparableCount, metricCount, hasPositionEvidence);

  const challenge = challengeStory(primary, contradictions, trendsMap, libraryMap);

  const reportingLabel = reportingWindow(profile);
  const charts = buildCharts(libraryMap, observationsMap, trendsMap, materialityMap, findings, primary, reportingLabel, currency);

  const narrative = generateNarrative({
    profile,
    position,
    primary,
    findings,
    contradictions,
    confidence,
    challenge,
    library: libraryMap,
    comparability: comparableCount,
    metricCount,
  });

  const boardActions: BoardAction[] = narrative.boardActions;

  const metadata: ReportMetadata = {
    schema_version: REPORT_SCHEMA_VERSION,
    application_version: APPLICATION_VERSION,
    methodology_version: METHODOLOGY_VERSION,
    metric_library_version: LIBRARY_VERSION,
    rule_version: RULE_VERSION,
    generated_at: new Date().toISOString(),
    privacy_mode: 'deterministic',
  };

  const partial = {
    profile,
    executivePosition: position,
    trends: Array.from(trendsMap.values()),
    findings,
    positives: findings.filter((f) => f.kind === 'positive'),
    concerns: findings.filter((f) => f.kind === 'concern'),
    relationships: relationshipEval.results,
    contradictions,
    materiality: Array.from(materialityMap.values()),
    confidence,
    storylines: storyEval.ranked,
    primaryStoryline: primary,
    boardActions,
    charts,
    narrative,
    challenge,
    provenance: selected.map(({ def, obs }) => ({
      metric_key: def.metric_key,
      sourceSystem: obs.sourceSystem?.trim() ?? '',
      reportingOwner: obs.reportingOwner?.trim() ?? '',
      extractionDate: obs.extractionDate?.trim() ?? '',
      methodologyNote: obs.methodologyNote?.trim() ?? '',
      confidence: obs.provenanceConfidence ?? obs.dataQuality,
      benchmark: obs.benchmark,
      benchmarkSource: obs.benchmarkSource?.trim() ?? '',
    })),
  };

  const facts = buildReportFacts(partial, selected, trendsMap, materialityMap, currency);

  return { ...partial, facts, metadata };
}
