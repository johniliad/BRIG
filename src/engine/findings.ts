import type { Finding, MaterialityResult, MetricDefinition, MetricObservation, TrendResult } from '../types';
import { formatDelta, formatMetricValue } from './format';

const FINDING_SIGNAL_LABELS = new Set(['Moderate', 'Significant', 'Material']);

function describeChange(trend: TrendResult, metric: MetricDefinition, currency: string): string {
  if (!trend.hasComparison) {
    const current = formatMetricValue(trend.current, metric.unit, currency);
    if (trend.thresholdBreached) return `${current}; supplied tolerance breached (current-position assessment only).`;
    if (trend.targetBreached) return `${current}; supplied target missed (current-position assessment only).`;
    return `${current}; current position only — no comparison period provided.`;
  }
  const cur = formatMetricValue(trend.current, metric.unit, currency);
  const prev = formatMetricValue(trend.previous, metric.unit, currency);
  const delta = formatDelta(trend.absoluteDelta, metric.unit, currency);
  let pct = '';
  if (trend.percentagePointDelta !== null) {
    pct = ` (${delta} pp)`;
  } else if (trend.percentageDelta !== null) {
    pct = ` (${trend.percentageDelta > 0 ? '+' : ''}${trend.percentageDelta.toFixed(1)}%)`;
  } else {
    pct = ` (${delta})`;
  }
  return `${prev} → ${cur}${pct}`;
}

/**
 * Produce evidence-eligible findings from the deterministic analysis. The
 * rule-based signal label is primary; the numeric detail and inherent
 * importance rank eligible findings without making evidence-free metrics eligible.
 */
export function generateFindings(
  library: Map<string, MetricDefinition>,
  observations: Map<string, MetricObservation>,
  trends: Map<string, TrendResult>,
  materiality: Map<string, MaterialityResult>,
  currency: string,
): Finding[] {
  const findings: Finding[] = [];

  for (const [key, trend] of trends) {
    const metric = library.get(key);
    const obs = observations.get(key);
    if (!metric || !obs) continue;
    if (obs.current === null && !obs.applicable) continue;

    const mat = materiality.get(key);
    const matScore = mat?.score ?? 0;

    if (!mat?.assessable || !FINDING_SIGNAL_LABELS.has(mat.signalStrength)) continue;

    let kind: Finding['kind'] = 'neutral';
    if (trend.thresholdBreached || trend.targetBreached) kind = 'concern';
    else if (trend.interpretation === 'improving') kind = 'positive';
    else if (trend.interpretation === 'deteriorating') kind = 'concern';
    else if (trend.interpretation === 'mixed') kind = 'neutral';

    const change = describeChange(trend, metric, currency);
    const targetPart =
      obs.target !== null && trend.targetGap !== null
        ? ` Target ${formatMetricValue(obs.target, metric.unit, currency)}; gap ${formatDelta(trend.targetGap, metric.unit, currency)}.`
        : '';
    const thresholdPart = trend.thresholdBreached ? ' Tolerance breached.' : '';
    const trajectoryPart = (trend.targetBreached || trend.thresholdBreached) && trend.hasComparison && trend.interpretation === 'improving'
      ? ' The trajectory is improving, but the current position remains outside the supplied target or tolerance.'
      : '';

    findings.push({
      metric_key: key,
      kind,
      direction: trend.direction,
      magnitude: trend.band,
      materiality: matScore,
      signalStrength: mat.signalStrength,
      inherentImportance: mat.inherentImportance,
      headline: `${metric.name}: ${change}`,
      evidence: `${metric.executive_meaning} ${metric.caveats[0] ?? ''}${targetPart}${thresholdPart}${trajectoryPart}`.trim(),
      dataQuality: obs.dataQuality,
    });
  }

  const rank = { 'Not assessable': 0, Low: 1, Moderate: 2, Significant: 3, Material: 4 } as const;
  // The rule-based label is primary; evidence detail and inherent importance break ties.
  findings.sort((a, b) =>
    rank[b.signalStrength] - rank[a.signalStrength] ||
    b.materiality - a.materiality ||
    b.inherentImportance - a.inherentImportance,
  );
  return findings;
}
