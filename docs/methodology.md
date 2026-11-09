# BRIG Methodology

This document mirrors the in-app **Methodology** page and records the analysis approach for the
CISO Board Reporting Intelligence Generator. Methodology, metric-library and rule versions are recorded
in every generated report.

## 1. Purpose

Convert selected cybersecurity and business-risk metrics into an evidence-based Board narrative,
supported by appropriate graphics. It is a deterministic, explainable executive-communication aid — not
a dashboard, audit or certification.

## 2. Deterministic analysis pipeline

1. Data validation (types, ranges, units).
2. Trend calculation: absolute delta, relative percentage delta, percentage-point delta for percentage
   metrics.
3. Directionality: `higher_is_better`, `lower_is_better`, `target_range`, `target_value`,
   `context_dependent`, `not_directional`. No blanket "up is bad".
4. Magnitude bands (defaults, configurable): negligible ≤2%, minor ≤5%, moderate ≤15%, significant
   ≤30%, material >30% (percentage metrics use percentage points).
5. Target / threshold comparison.
6. Cross-metric relationships (analytical heuristics, never causal proof).
7. Contradiction / nuance detection.
8. Materiality scoring (versioned weighted formula).
9. Confidence and Board Narrative Confidence (evidence quality, not model probability).
10. Storyline selection via story rules.
11. Findings, executive position and Board actions.
12. Deterministic chart selection.
13. Challenge the Story (counter-analysis).

## 3. Materiality weights (methodology v1.0.0)

board_relevance 0.20 · severity 0.20 · magnitude 0.15 · target_breach 0.10 · persistence 0.10 ·
relationship_strength 0.10 · business_impact 0.10 · regulatory_relevance 0.05

These are versioned methodology data, not UI constants.

## 4. Confidence

Board Narrative Confidence is derived from data completeness, comparability, relationship support and
the number of contradictions. It is reported with its drivers (e.g. "two comparable reporting periods
and no external benchmark").

## 5. Optional AI writing layer

AI may improve wording only. It receives a minimal `ReportFacts` payload (never the full metric
library), and its output is schema- and fact-validated. If AI is unavailable or fails validation, the
deterministic narrative is used. AI never produces numbers, charts or slide facts.

## 6. Limitations

- Results depend on user-supplied data quality and completeness.
- Relationships and storylines are heuristics, not proof of causality.
- No industry benchmarks are invented.
- The tool does not assert security, compliance or certification.
- Framework references (NIST, ISO/IEC 27001, CIS) do not imply certification or endorsement.
