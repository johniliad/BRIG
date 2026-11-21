# BRIG Methodology

This document mirrors the in-app **Methodology** page. Methodology, metric-library and rule versions are
recorded in every generated report. The current analytical methodology is **2.0.0**.

## 1. Purpose

BRIG converts selected cybersecurity and business-risk metrics into an evidence-based Board narrative. It
is a deterministic, explainable executive-communication aid—not a dashboard, audit, certification or
objective cyber-risk rating.

## 2. Required input contract

Every selected metric requires an explicit data status:

- `available`;
- `temporarily_unavailable`;
- `not_measured`;
- `not_applicable`.

An available metric requires a current value. An unavailable/not-measured metric requires an explanation.
Low-quality data requires a methodology or quality explanation. A changed context-dependent metric requires
a context note because its direction cannot be interpreted automatically.

If an available metric has no comparison value, the user must state why. BRIG never asks the user to invent
historical evidence.

Earlier historical values are optional and entered oldest-to-newest. They exclude the immediately preceding
comparison value because BRIG appends `previous` and `current` itself. History affects persistence and confidence.

## 3. Directionality-specific fields

- **Higher is better:** current value required; comparison recommended; target and minimum acceptable value
  optional where organisation-approved.
- **Lower is better:** current value required; comparison recommended; target and maximum acceptable value
  optional where organisation-approved.
- **Target value:** current and target value required; lower and upper acceptable limits required; comparison
  recommended.
- **Target range:** current value and lower/upper acceptable limits required; comparison recommended. Any value
  inside the range has zero distance from the range; movement within the range is stable.
- **Context dependent:** current value required; comparison strongly recommended; context required when the
  value changes.
- **Not directional:** values can be reported, but movement is not labelled improving/deteriorating without a
  separate rule.

The current metric library uses higher-is-better, lower-is-better and context-dependent definitions. The
engine and UI implement target-value/range behavior for future governed library entries.

## 4. Current position versus trajectory

A comparison value enables trend and trajectory conclusions. A target or tolerance can support a current-
position conclusion without comparison data, but BRIG explicitly states that no trajectory is inferred.

A current value with no comparison, target, tolerance or configured relationship is a **descriptive KPI**. It
cannot become a positive or concern finding.

## 5. Deterministic analysis pipeline

1. Validate data status and directionality-specific required fields.
2. Calculate absolute, relative-percentage and percentage-point movement where comparison data exists.
3. Apply directionality and magnitude bands.
4. Evaluate target position and tolerance breaches.
5. Calculate persistence from earlier history, previous value and current value. `history` contains only
   periods earlier than `previous`; it must not duplicate the previous period structurally.
6. Evaluate configured cross-metric relationships and contradictions.
7. Separate inherent importance, observed signal strength and evidence confidence.
8. Generate eligible findings and select a dominant storyline.
9. Derive the executive position and Board actions.
10. Select charts and run Challenge the Story counter-analysis.

## 6. Inherent importance

Inherent importance is stable metric-library context. It does not prove that anything happened in the current
period and cannot make an evidence-free metric into a finding.

Weights:

- Board relevance: 0.35;
- risk relevance: 0.35;
- business impact: 0.20;
- regulatory relevance: 0.10.

## 7. Observed signal strength

The primary output is a rule-based label: **Not assessable**, **Low**, **Moderate**, **Significant** or
**Material**. Meaningful movement, target misses, tolerance breaches, persistence and relationships can
strengthen the label. Missing evidence contributes zero.

A detailed 0–100 evidence score is retained for transparent ranking and explanation, using:

- magnitude: 0.30;
- target gap: 0.20;
- tolerance breach: 0.25;
- persistence: 0.15;
- relationship strength: 0.10.

The label, not the numeric score, determines finding eligibility. Moderate, Significant and Material signals
can become findings. A tolerance breach is at least Significant; a target miss without comparison is at least
Moderate. With comparison data, movement interpretation remains primary unless tolerance is breached—for
example, a metric can be improving while still below target.

## 8. Evidence confidence

Board Narrative Confidence reflects evidence quality, not model probability. It uses separate factors:

- current-value completeness across all selected applicable metrics: 25%;
- comparison coverage: 25%;
- median history depth: 15%;
- data quality: 20%;
- core provenance (source, owner and extraction date): 10%;
- relationship corroboration: 5%;
- contradiction penalties.

No-comparison reports are capped at Low confidence even where targets/tolerances support a current-position
assessment.

Relationship support is counted by unique supporting metric pair so overlapping rules cannot repeatedly inflate
confidence from the same evidence.

## 9. Profile fields

- The reporting-period label is required. The comparison-period label is required only when one or more
  comparison values are entered; it then labels those values consistently.
- Board audience affects deterministic narrative framing, not findings.
- Currency affects formatting only.
- Report style affects presentation/optional AI tone only, never facts or findings.
- Organisation label, industry, size band, objective and period model are report metadata unless explicitly
  stated otherwise in the UI.
- A documented benchmark and its source are optional report context. Methodology 2.0 does not use that benchmark
  to change signal labels, findings or executive status.

## 10. Storyline ranking and report compatibility

Configured rule priority remains the principal governance control for storyline selection. When priorities are
equal, BRIG uses supporting movement, target/tolerance and persistence evidence before condition count. Saved
reports carry report-schema and application versions; compatible older reports are normalized before rendering,
while future or structurally incomplete schemas are rejected with a compatibility message.

## 11. Optional AI writing layer

AI may improve wording only. It receives a minimal `ReportFacts` payload, never the full metric library. Its
output is schema- and fact-validated. Failure falls back to deterministic text. AI does not change numbers,
findings, signal labels, charts or executive status.

When AI rewrites Board-action titles, BRIG preserves the deterministic action category, rationale, priority and
related-metric mapping. Surplus AI action strings are ignored rather than assigned invented analytical metadata.

## 12. Limitations

- Results depend on user-supplied evidence and organisation-approved targets/tolerances.
- Relationships and storylines are heuristics, not causal proof.
- No industry benchmark is invented.
- A target is not the same as a tolerance boundary.
- The tool does not assert security, compliance or certification.
- Framework references do not imply certification or endorsement.