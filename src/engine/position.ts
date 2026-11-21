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
  hasPositionEvidence: boolean,
): ExecutivePosition {
  if (comparableCount === 0 && metricCount > 0 && !hasPositionEvidence) {
    return {
      status: 'Insufficient evidence',
      label: 'Insufficient evidence',
      summary:
        'The report records current values, but no comparison, target or tolerance evidence was supplied. No reliable trend or current-position conclusion is offered.',
      score: 0,
    };
  }

  let status = baseStatus(primary);

  if (comparableCount === 0 && hasPositionEvidence) {
    const hasConcern = findings.some((finding) => finding.kind === 'concern');
    status = hasConcern ? 'Watch' : 'Stable';
  }

  const signalPoints = (finding: Finding): number => {
    const strength = finding.signalStrength === 'Material' ? 4 : finding.signalStrength === 'Significant' ? 3 : finding.signalStrength === 'Moderate' ? 2 : 1;
    return strength * (0.5 + finding.inherentImportance / 200);
  };
  const posScore = findings.filter((f) => f.kind === 'positive').reduce((sum, finding) => sum + signalPoints(finding), 0);
  const conScore = findings.filter((f) => f.kind === 'concern').reduce((sum, finding) => sum + signalPoints(finding), 0);
  const net = posScore - conScore;

  // Adjust by net evidence-supported signal balance, but never soften a Critical storyline,
  // and never escalate beyond Elevated from signal balance alone (Critical is reserved for
  // critical storylines such as a rise in data breaches).
  if (status !== 'Critical') {
    if (net <= -6 && (status === 'Improving' || status === 'Stable' || status === 'Watch')) {
      status = bump(status, 1);
    } else if (net >= 5 && (status === 'Watch' || status === 'Stable')) {
      status = 'Improving';
    }
  }

  const score = Math.max(0, Math.min(100, Math.round(50 + net * 4)));

  const concernCount = findings.filter((f) => f.kind === 'concern').length;
  const positiveCount = findings.filter((f) => f.kind === 'positive').length;

  const evidenceQualifier = comparableCount === 0 && hasPositionEvidence
    ? ' Current position was assessed against supplied targets or tolerances; no trajectory is inferred.'
    : '';
  const summary = `${positiveCount} positive and ${concernCount} concern finding(s) across ${metricCount} analysed metrics; Board narrative confidence: ${confidence.boardNarrativeConfidence}.${evidenceQualifier} This status is an application-derived summary based on the supplied metrics, not an objective cyber-risk rating.`;

  return { status, label: status, summary, score };
}

