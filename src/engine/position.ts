import type { ConfidenceResult, ExecutivePosition, Finding, ReportStatus, StorylineResult } from '../types';

/**
 * Derive the executive status from the analytical evidence (spec §55). This is
 * an APPLICATION-DERIVED summary, not an objective universal cyber-risk grade.
 */

const ORDER: ReportStatus[] = ['Improving', 'Stable', 'Watch', 'Elevated', 'Critical'];

function bump(status: ReportStatus, delta: number): ReportStatus {
  const idx = ORDER.indexOf(status);
  if (idx < 0) return status;
  const next = Math.max(0, Math.min(ORDER.length - 1, idx + delta));
  return ORDER[next];
}

function baseStatus(primary: StorylineResult): ReportStatus {
  switch (primary.severity) {
    case 'critical':
      return 'Critical';
    case 'elevated':
      return 'Elevated';
    case 'watch':
      return 'Watch';
    case 'positive':
      return 'Improving';
    case 'info':
    default:
      return 'Stable';
  }
}

export function deriveExecutivePosition(
  primary: StorylineResult,
  findings: Finding[],
  confidence: ConfidenceResult,
  comparableCount: number,
  metricCount: number,
): ExecutivePosition {
  if (comparableCount === 0 && metricCount > 0) {
    return {
      status: 'Insufficient evidence',
      label: 'Insufficient evidence',
      summary:
        'The report describes the current position. Without a comparison period or target, no reliable trend or trajectory conclusion is offered.',
      score: 0,
    };
  }

  let status = baseStatus(primary);

  const posScore = findings.filter((f) => f.kind === 'positive').reduce((s, f) => s + f.materiality, 0);
  const conScore = findings.filter((f) => f.kind === 'concern').reduce((s, f) => s + f.materiality, 0);
  const net = posScore - conScore;

  // Adjust by net materiality balance, but never soften a Critical (data-breach) storyline,
  // and never escalate beyond Elevated from materiality alone (Critical is reserved for
  // critical storylines such as a rise in data breaches).
  if (status !== 'Critical') {
    if (net <= -60 && (status === 'Improving' || status === 'Stable' || status === 'Watch')) {
      status = bump(status, 1);
    } else if (net >= 45 && (status === 'Watch' || status === 'Stable')) {
      status = 'Improving';
    }
  }

  const score = Math.max(0, Math.min(100, Math.round(50 + net / 4)));

  const concernCount = findings.filter((f) => f.kind === 'concern').length;
  const positiveCount = findings.filter((f) => f.kind === 'positive').length;

  const summary = `${positiveCount} positive and ${concernCount} concern finding(s) across ${metricCount} metrics; Board narrative confidence: ${confidence.boardNarrativeConfidence}. This status is an application-derived summary based on the supplied metrics, not an objective cyber-risk rating.`;

  return { status, label: status, summary, score };
}

