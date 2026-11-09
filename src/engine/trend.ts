import type { MagnitudeBand, MetricDefinition, MetricObservation, TrendResult } from '../types';
import { interpretMovement, isThresholdBreached, targetGap } from './directionality';

/**
 * Default magnitude bands (spec §12). These are DEFAULTS ONLY and must not be
 * presented as universal industry benchmarks. Configurable via the argument.
 */
export interface MagnitudeBands {
  minor: number; // > this % → minor
  moderate: number; // > % → moderate
  significant: number; // > % → significant
  material: number; // > % → material
}

export const DEFAULT_BANDS: MagnitudeBands = {
  minor: 2,
  moderate: 5,
  significant: 15,
  material: 30,
};

export function bandForMagnitude(absPercent: number, bands: MagnitudeBands = DEFAULT_BANDS): MagnitudeBand {
  if (absPercent <= bands.minor) return 'negligible';
  if (absPercent <= bands.moderate) return 'minor';
  if (absPercent <= bands.significant) return 'moderate';
  if (absPercent <= bands.material) return 'significant';
  return 'material';
}

export function magnitudeScoreForBand(band: MagnitudeBand): number {
  switch (band) {
    case 'negligible':
      return 0.1;
    case 'minor':
      return 0.3;
    case 'moderate':
      return 0.6;
    case 'significant':
      return 0.8;
    case 'material':
      return 1.0;
    default:
      return 0.2;
  }
}

function isPercentMetric(metric: MetricDefinition): boolean {
  return metric.data_type === 'percentage' || metric.data_type === 'percentage_point';
}

/** Count consecutive periods moving in the most-recent direction. */
function persistence(series: number[]): number {
  if (series.length < 2) return 0;
  let count = 0;
  for (let i = series.length - 1; i > 0; i--) {
    const delta = series[i] - series[i - 1];
    const prevDelta = i - 1 > 0 ? series[i - 1] - series[i - 2] : Math.sign(delta);
    if (Math.sign(delta) === Math.sign(prevDelta) && delta !== 0) count++;
    else break;
  }
  return count;
}

export function computeTrend(
  metric: MetricDefinition,
  obs: MetricObservation,
  bands: MagnitudeBands = DEFAULT_BANDS,
): TrendResult {
  const current = obs.current;
  const previous = obs.previous;
  const hasComparison = current !== null && previous !== null;

  const absoluteDelta = hasComparison ? (current as number) - (previous as number) : null;
  const direction: TrendResult['direction'] =
    absoluteDelta === null ? 'unknown' : absoluteDelta > 0 ? 'up' : absoluteDelta < 0 ? 'down' : 'flat';

  // Relative percentage delta (only meaningful when previous != 0).
  let percentageDelta: number | null = null;
  if (hasComparison && previous !== 0) {
    percentageDelta = ((current as number) - (previous as number)) / Math.abs(previous as number) * 100;
  }

  // Percentage-point delta for percentage metrics.
  const percentagePointDelta = hasComparison && isPercentMetric(metric) ? absoluteDelta : null;

  // Magnitude basis: percentage points for percentage metrics, otherwise relative %.
  let magnitudeBasis: number | null = null;
  if (hasComparison) {
    if (isPercentMetric(metric)) magnitudeBasis = percentagePointDelta === null ? null : Math.abs(percentagePointDelta);
    else magnitudeBasis = percentageDelta === null ? null : Math.abs(percentageDelta);
  }

  let band: MagnitudeBand = 'unknown';
  if (hasComparison) {
    if (magnitudeBasis !== null) band = bandForMagnitude(magnitudeBasis, bands);
    else if (absoluteDelta === 0) band = 'negligible';
    else band = 'moderate'; // non-zero change with undefined relative baseline
  }

  const interpretation = interpretMovement(metric, current, previous, obs.target);
  const gap = targetGap(current, obs.target);
  const breached = isThresholdBreached(metric, current, obs.threshold);

  const series: number[] = [...obs.history, previous, current].filter(
    (v): v is number => v !== null && v !== undefined && !Number.isNaN(v),
  );
  const persistencePeriods = hasComparison ? persistence(series) : 0;

  return {
    metric_key: metric.metric_key,
    hasComparison,
    current,
    previous,
    absoluteDelta,
    percentageDelta,
    percentagePointDelta,
    direction,
    band,
    interpretation,
    targetGap: gap,
    thresholdBreached: breached,
    persistencePeriods,
    magnitudeScore: magnitudeScoreForBand(band),
  };
}
