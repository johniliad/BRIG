/**
 * BRIG — CISO Board Reporting Intelligence Generator
 * Canonical domain types shared by the deterministic engine, the UI and the
 * ReportFacts boundary sent to the optional Executive Writing Layer (LLM).
 *
 * Rule reminders encoded here:
 *  - The deterministic engine is authoritative (R1/R2/R3).
 *  - ReportFacts is the only analytical contract sent to an LLM (R9).
 *  - Charts/slides are deterministic; the LLM never produces numbers (R10).
 */

export type MetricCategoryKey =
  | 'incidents_threat'
  | 'detection_response'
  | 'vulnerability_exposure'
  | 'patch_configuration'
  | 'identity_access'
  | 'endpoint_network_cloud'
  | 'data_privacy'
  | 'resilience_recovery'
  | 'human_risk'
  | 'governance_risk_assurance'
  | 'third_party'
  | 'strategy_investment';

export interface MetricCategory {
  key: MetricCategoryKey;
  label: string;
  /** Letter used in the specification (A–L). */
  letter: string;
}

export type DataType =
  | 'integer'
  | 'decimal'
  | 'percentage'
  | 'percentage_point'
  | 'duration'
  | 'currency'
  | 'count'
  | 'ratio'
  | 'score'
  | 'maturity';

export type Directionality =
  | 'higher_is_better'
  | 'lower_is_better'
  | 'target_range'
  | 'target_value'
  | 'context_dependent'
  | 'not_directional';

export type MetricUnit =
  | 'count'
  | 'percent'
  | 'percentage_points'
  | 'hours'
  | 'days'
  | 'currency'
  | 'score'
  | 'ratio'
  | 'per_employee'
  | 'index';

export type VisualizationType =
  | 'kpi'
  | 'line'
  | 'bar'
  | 'grouped_bar'
  | 'stacked_bar'
  | 'horizontal_bar'
  | 'area'
  | 'donut'
  | 'radar'
  | 'quadrant'
  | 'target_bar'
  | 'before_after'
  | 'sparkline'
  | 'waterfall';

/** A single entry in the metric knowledge base. */
export interface MetricDefinition {
  metric_key: string;
  name: string;
  short_name?: string;
  category: MetricCategoryKey;
  definition: string;
  executive_meaning: string;
  board_question?: string;
  unit: MetricUnit;
  data_type: DataType;
  directionality: Directionality;
  /** 1–5 relevance for the Board. */
  board_relevance: number;
  trend_relevance: number;
  risk_relevance: number;
  /** Optional target range for target_range directionality. */
  target_range?: [number, number];
  recommended_visualizations: VisualizationType[];
  related_metrics: string[];
  story_tags: string[];
  caveats: string[];
  /** Member of the editable "Board Essentials" preset (12–20 metrics). */
  board_essential?: boolean;
  version: string;
  active: boolean;
}

// ---------------------------------------------------------------------------
// User input model
// ---------------------------------------------------------------------------

export type ReportingPeriodModel =
  | 'point_in_time'
  | 'monthly'
  | 'quarterly'
  | 'half_year'
  | 'year_on_year'
  | 'custom';

export type AudienceLens =
  | 'general_board'
  | 'audit_committee'
  | 'risk_committee'
  | 'ceo_exec'
  | 'cfo'
  | 'technology_committee';

export type ReportStyle = 'concise' | 'strategic' | 'analytical' | 'reassuring' | 'candid';

export type PrivacyMode = 'deterministic' | 'ai_assisted' | 'demo';

export type DataQuality = 'high' | 'medium' | 'low';

export interface BoardProfile {
  organisationLabel: string;
  reportingPeriod: string;
  comparisonPeriod: string;
  periodModel: ReportingPeriodModel;
  audience: AudienceLens;
  industry: string;
  sizeBand: string;
  objective: string;
  currency: string;
  language: 'en';
  style: ReportStyle;
}

/** A single metric observation entered by the user for one reporting period. */
export interface MetricObservation {
  metric_key: string;
  applicable: boolean;
  /** Current reporting-period value. */
  current: number | null;
  /** Immediately preceding comparison value. */
  previous: number | null;
  /** Optional earlier historical values (oldest→newest) for persistence. */
  history: number[];
  target: number | null;
  /** Acceptable threshold (e.g. breach limit) if the user supplies one. */
  threshold: number | null;
  /** Optional user-supplied, documented benchmark value. */
  benchmark: number | null;
  benchmarkSource?: string;
  /** Free-text note. Treated as untrusted content by the LLM layer. */
  note: string;
  dataQuality: DataQuality;
}

export type ReportStatus =
  | 'Improving'
  | 'Stable'
  | 'Watch'
  | 'Elevated'
  | 'Critical'
  | 'Insufficient evidence';

export type ConfidenceLevel = 'High' | 'Medium' | 'Low' | 'Insufficient evidence';

export type MagnitudeBand =
  | 'negligible'
  | 'minor'
  | 'moderate'
  | 'significant'
  | 'material'
  | 'unknown';

export type TrendDirection = 'up' | 'down' | 'flat' | 'unknown';

/** Per-metric trend computation. Pure, deterministic. */
export interface TrendResult {
  metric_key: string;
  hasComparison: boolean;
  current: number | null;
  previous: number | null;
  absoluteDelta: number | null;
  /** Percentage delta (guarded when previous is 0/null). */
  percentageDelta: number | null;
  /** Percentage-point delta (percent metrics only). */
  percentagePointDelta: number | null;
  direction: TrendDirection;
  band: MagnitudeBand;
  /** Directional interpretation: is change improvement/deterioration/neutral? */
  interpretation: 'improving' | 'deteriorating' | 'stable' | 'mixed' | 'unknown';
  targetGap: number | null;
  thresholdBreached: boolean;
  /** Count of consecutive periods moving in a consistent direction. */
  persistencePeriods: number;
  /** 0–1 strength of the movement normalised by magnitude band. */
  magnitudeScore: number;
}

export interface MaterialityContribution {
  factor: string;
  weight: number;
  value: number; // 0–1 normalised
  weighted: number;
}

export interface MaterialityResult {
  metric_key: string;
  score: number; // 0–100
  contributions: MaterialityContribution[];
  band: MagnitudeBand;
}

export interface Finding {
  metric_key: string;
  kind: 'positive' | 'concern' | 'neutral';
  direction: TrendDirection;
  magnitude: MagnitudeBand;
  materiality: number;
  headline: string;
  evidence: string;
  dataQuality: DataQuality;
}

export interface RelationshipResult {
  rule_key: string;
  metricKeys: string[];
  type: string;
  triggered: boolean;
  interpretation: string;
  strength: number; // 0–1 heuristic
  supportedBy: string[];
}

export interface ContradictionResult {
  rule_key: string;
  title: string;
  metricKeys: string[];
  triggered: boolean;
  explanation: string;
  severity: 'info' | 'watch' | 'elevated';
  counterSignals: string[];
}

export interface ConfidenceResult {
  level: ConfidenceLevel;
  /** Board Narrative Confidence (deterministic evidence quality). */
  boardNarrativeConfidence: ConfidenceLevel;
  score: number; // 0–100
  drivers: string[];
  note: string;
  comparablePeriods: number;
  metricCount: number;
  relationshipSupport: number;
  dataCompleteness: number; // 0–1
  contradictionCount: number;
}

export type BoardActionCategory =
  | 'maintain_course'
  | 'redirect_investment'
  | 'accelerate_remediation'
  | 'increase_assurance'
  | 'reduce_exposure'
  | 'investigate_data_quality'
  | 'review_risk_appetite'
  | 'request_management_action'
  | 'monitor';

export interface StorylineResult {
  storyline_key: string;
  title: string;
  primary: boolean;
  confidence: ConfidenceLevel;
  severity: 'positive' | 'info' | 'watch' | 'elevated' | 'critical';
  supportingMetrics: string[];
  counterSignals: string[];
  executiveExplanation: string;
  boardImplication: string;
  recommendedAction: BoardActionCategory;
  preferredCharts: VisualizationType[];
  variant: number;
}

export interface BoardAction {
  category: BoardActionCategory;
  title: string;
  rationale: string;
  priority: 'primary' | 'supporting';
  relatedMetrics: string[];
}

export interface ChartDatum {
  label: string;
  value: number;
  previous?: number;
  target?: number;
}

export interface ChartSpec {
  id: string;
  type: VisualizationType;
  title: string;
  subtitle: string;
  unit: MetricUnit;
  period: string;
  metricKeys: string[];
  data: ChartDatum[];
  accessibilityText: string;
  score: number; // selection score
}

export interface NarrativeSection {
  key: string;
  heading: string;
  body: string;
}

export interface NarrativeModel {
  headline: string;
  executiveMessage: string;
  positiveDevelopments: string[];
  keyRisks: string[];
  priorities: string[];
  boardActions: BoardAction[];
  managementNote: string;
  sections: NarrativeSection[];
}

// ---------------------------------------------------------------------------
// Analysis orchestration
// ---------------------------------------------------------------------------

export interface AnalysisInput {
  profile: BoardProfile;
  observations: MetricObservation[];
  library: MetricDefinition[];
}

export interface ExecutivePosition {
  status: ReportStatus;
  label: string;
  summary: string;
  score: number; // application-derived indicator, labelled as such
}

export interface ReportMetadata {
  methodology_version: string;
  metric_library_version: string;
  rule_version: string;
  generated_at: string;
  privacy_mode: PrivacyMode;
}

/**
 * ReportFacts — the immutable analytical boundary between the deterministic
 * engine and the optional Executive Writing Layer. The LLM may only write
 * language inside this evidence boundary (R9).
 */
export interface ReportFacts {
  methodology_version: string;
  metric_library_version: string;
  rule_version: string;
  executive_status: ReportStatus;
  confidence: ConfidenceLevel;
  headline: string;
  observed_metrics: Array<{
    metric_key: string;
    name: string;
    unit: MetricUnit;
    current: number | null;
    previous: number | null;
    target: number | null;
  }>;
  calculated_metrics: Array<{ metric_key: string; label: string; value: number | null; unit: string }>;
  trend_results: Array<{
    metric_key: string;
    direction: TrendDirection;
    band: MagnitudeBand;
    interpretation: string;
    percentageDelta: number | null;
    percentagePointDelta: number | null;
  }>;
  threshold_results: Array<{ metric_key: string; breached: boolean; targetGap: number | null }>;
  findings: Array<{ metric_key: string; kind: string; headline: string }>;
  relationships: Array<{ rule_key: string; interpretation: string }>;
  contradictions: Array<{ rule_key: string; title: string; explanation: string }>;
  materiality: Array<{ metric_key: string; score: number; band: MagnitudeBand }>;
  confidence_detail: {
    level: ConfidenceLevel;
    board_narrative_confidence: ConfidenceLevel;
    drivers: string[];
    note: string;
  };
  approved_numbers: Array<{ metric_key: string; label: string; value: string }>;
  approved_metric_keys: string[];
  strategic_priorities: string[];
  board_actions: Array<{ category: BoardActionCategory; title: string; rationale: string }>;
  unsupported_inferences: string[];
}

export interface AnalysisResult {
  profile: BoardProfile;
  executivePosition: ExecutivePosition;
  trends: TrendResult[];
  findings: Finding[];
  positives: Finding[];
  concerns: Finding[];
  relationships: RelationshipResult[];
  contradictions: ContradictionResult[];
  materiality: MaterialityResult[];
  confidence: ConfidenceResult;
  storylines: StorylineResult[];
  primaryStoryline: StorylineResult;
  boardActions: BoardAction[];
  charts: ChartSpec[];
  narrative: NarrativeModel;
  facts: ReportFacts;
  metadata: ReportMetadata;
  challenge: ChallengeResult;
}

export interface ChallengeResult {
  primaryConclusion: string;
  counterSignals: Array<{
    rule_key: string;
    signal: string;
    supportingMetrics: string[];
    metricKeys: string[];
  }>;
  softened: boolean;
  recommendation: string;
}

export interface AiMeta {
  enabled: boolean;
  provider: string | null;
  model: string | null;
  generated: boolean;
  validated: boolean;
}

export interface BoardReportModel {
  facts: ReportFacts;
  analysis: {
    findings: Finding[];
    relationships: RelationshipResult[];
    contradictions: ContradictionResult[];
    materiality: MaterialityResult[];
    confidence: ConfidenceResult;
    executivePosition: ExecutivePosition;
    storylines: StorylineResult[];
  };
  narrative: NarrativeModel;
  presentation: {
    charts: ChartSpec[];
    audience: AudienceLens;
    style: ReportStyle;
  };
  metadata: ReportMetadata;
  ai: AiMeta;
}


