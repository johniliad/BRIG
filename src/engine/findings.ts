import type { Finding, MaterialityResult, MetricDefinition, MetricObservation, TrendResult } from '../types';
import { formatDelta, formatMetricValue } from './format';

const MATERIAL_FINDING_THRESHOLD = 20; // materiality score floor for inclusion

function describeChange(trend: TrendResult, metric: MetricDefinition, currency: string): string {
  if (!trend.hasComparison) return 'No comparison period provided.';
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
 * Produce material findings from the deterministic analysis. A finding is
 * surfaced only when it is material (magnitude, threshold breach or materiality
 * score), to avoid a long list that dilutes the Board message.
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

    const isMaterialMagnitude = trend.band === 'moderate' || trend.band === 'significant' || trend.band === 'material';
    const isMaterial = isMaterialMagnitude || trend.thresholdBreached || matScore >= MATERIAL_FINDING_THRESHOLD;
    if (!isMaterial) continue;

    let kind: Finding['kind'] = 'neutral';
    if (trend.thresholdBreached) kind = 'concern';
    else if (trend.interpretation === 'improving') kind = 'positive';
    else if (trend.interpretation === 'deteriorating') kind = 'concern';
    else if (trend.interpretation === 'mixed') kind = 'neutral';

    const change = describeChange(trend, metric, currency);
    const targetPart =
      obs.target !== null && trend.targetGap !== null
        ? ` Target ${formatMetricValue(obs.target, metric.unit, currency)}; gap ${formatDelta(trend.targetGap, metric.unit, currency)}.`
        : '';
    const thresholdPart = trend.thresholdBreached ? ' Threshold breached.' : '';

    findings.push({
      metric_key: key,
      kind,
      direction: trend.direction,
      magnitude: trend.band,
      materiality: matScore,
      headline: `${metric.name}: ${change}`,
      evidence: `${metric.executive_meaning} ${metric.caveats[0] ?? ''}${targetPart}${thresholdPart}`.trim(),
      dataQuality: obs.dataQuality,
    });
  }

  // Order by materiality then magnitude.
  findings.sort((a, b) => b.materiality - a.materiality);
  return findings;
}
