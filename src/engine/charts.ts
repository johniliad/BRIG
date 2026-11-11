import type {
  ChartDatum,
  ChartSpec,
  Finding,
  MaterialityResult,
  MetricDefinition,
  MetricObservation,
  MetricUnit,
  StorylineResult,
  TrendResult,
} from '../types';
import { formatMetricValue } from './format';

/**
 * Automatic chart selection (spec §20–21). Charts are chosen deterministically
 * from metric type, periods available, unit compatibility and the storyline's
 * preferred charts. Every chart answers an executive question; units are kept
 * consistent within a chart to avoid misleading comparison.
 *
 * The LLM never generates chart data (R10): all values here come from the
 * deterministic report model.
 */

function seriesOf(obs: MetricObservation): number[] {
  const raw = [...obs.history, obs.previous, obs.current].filter(
    (v): v is number => v !== null && v !== undefined && !Number.isNaN(v),
  );
  return raw;
}

function findPrimaryMetricKey(findings: Finding[], trends: Map<string, TrendResult>): string | null {
  for (const f of findings) {
    const t = trends.get(f.metric_key);
    if (t?.hasComparison) return f.metric_key;
  }
  return null;
}

export function buildCharts(
  library: Map<string, MetricDefinition>,
  observations: Map<string, MetricObservation>,
  trends: Map<string, TrendResult>,
  materiality: Map<string, MaterialityResult>,
  findings: Finding[],
  primaryStoryline: StorylineResult,
  reportingLabel: string,
  currency: string,
): ChartSpec[] {
  const charts: ChartSpec[] = [];

  // --- Chart 1: trajectory of the most material metric with comparison data ---
  const trajKey = findPrimaryMetricKey(findings, trends);
  if (trajKey) {
    const metric = library.get(trajKey)!;
    const obs = observations.get(trajKey)!;
    const series = seriesOf(obs);
    const labels =
      series.length >= 3
        ? series.map((_, i) => (i === series.length - 1 ? 'Current' : i === series.length - 2 ? 'Prev.' : `P-${series.length - 1 - i}`))
        : ['Previous', 'Current'];
    const data: ChartDatum[] = series.slice(-Math.max(2, series.length)).map((v, i) => ({
      label: labels[i] ?? `P${i}`,
      value: v,
    }));
    const type = series.length >= 3 ? 'line' : 'before_after';
    charts.push({
      id: `trajectory_${trajKey}`,
      type,
      title: `${metric.name} trajectory`,
      subtitle: `${metric.executive_meaning} · ${metric.data_type} · ${metric.directionality.replace(/_/g, ' ')}`,
      unit: metric.unit,
      period: reportingLabel,
      metricKeys: [trajKey],
      data,
      accessibilityText: `${metric.name} over ${series.length} periods: ${series.map((v) => formatMetricValue(v, metric.unit, currency)).join(', ')}.`,
      score: 100,
    });
  }

  // --- Chart 2: prioritised materiality ranking (unit-consistent: scores) ---
  const ranked = findings
    .map((f) => ({ f, m: materiality.get(f.metric_key)?.score ?? 0 }))
    .sort((a, b) => b.m - a.m)
    .slice(0, 6);
  if (ranked.length >= 2) {
    const data: ChartDatum[] = ranked.map(({ f, m }) => ({
      label: library.get(f.metric_key)?.name ?? f.metric_key,
      value: m,
    }));
    charts.push({
      id: 'materiality_ranking',
      type: 'horizontal_bar',
      title: 'Prioritised signals by materiality',
      subtitle: 'Application-derived materiality scores (0–100) for the selected findings',
      unit: 'score',
      period: reportingLabel,
      metricKeys: ranked.map(({ f }) => f.metric_key),
      data,
      accessibilityText: `Materiality ranking: ${ranked.map(({ f, m }) => `${library.get(f.metric_key)?.name ?? f.metric_key} (${m})`).join('; ')}.`,
      score: 90,
    });
  }

  // --- Chart 3: percentage metric comparison (unit-consistent: %) ---
  const percentPairs = findings
    .map((f) => ({ f, metric: library.get(f.metric_key), trend: trends.get(f.metric_key) }))
    .filter(
      (x): x is { f: Finding; metric: MetricDefinition; trend: TrendResult } =>
        Boolean(x.metric && x.trend?.hasComparison) && x.metric!.unit === 'percent' && x.trend!.current !== null,
    )
    .slice(0, 6);

  if (percentPairs.length >= 3) {
    const data: ChartDatum[] = percentPairs.map(({ metric, trend }) => ({
      label: metric.name,
      value: trend.current as number,
      previous: trend.previous ?? undefined,
    }));
    charts.push({
      id: 'percent_comparison',
      type: 'grouped_bar',
      title: 'Current vs comparison — coverage and control metrics',
      subtitle: 'Percentage-point comparison across comparable percentage metrics',
      unit: 'percent' as MetricUnit,
      period: reportingLabel,
      metricKeys: percentPairs.map(({ metric }) => metric.metric_key),
      data,
      accessibilityText: `Percentage comparison: ${percentPairs
        .map(({ metric, trend }) => `${metric.name} ${formatMetricValue(trend.current, 'percent')} from ${formatMetricValue(trend.previous, 'percent')}`)
        .join('; ')}.`,
      score: 70,
    });
  }

  // Boost charts that the primary storyline prefers.
  for (const c of charts) {
    if (primaryStoryline.preferredCharts.includes(c.type)) c.score += 10;
  }

  return charts.sort((a, b) => b.score - a.score).slice(0, 3);
}
