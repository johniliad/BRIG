import type { AnalysisResult, MetricDefinition } from '../types';
import { formatDelta, formatMetricValue } from '../engine/format';

export interface ReportKpi {
  key: string;
  name: string;
  current: string;
  delta: string;
  direction: string;
  classification: 'finding' | 'descriptive';
}

export function selectReportKpis(analysis: AnalysisResult, library: MetricDefinition[], limit = 4): ReportKpi[] {
  const byKey = new Map(library.map((metric) => [metric.metric_key, metric]));
  const findingKeys = analysis.findings.map((finding) => finding.metric_key);
  const remaining = analysis.trends
    .filter((trend) => trend.current !== null && !findingKeys.includes(trend.metric_key))
    .sort((a, b) => {
      const aImportance = analysis.materiality.find((item) => item.metric_key === a.metric_key)?.inherentImportance ?? 0;
      const bImportance = analysis.materiality.find((item) => item.metric_key === b.metric_key)?.inherentImportance ?? 0;
      return bImportance - aImportance;
    })
    .map((trend) => trend.metric_key);
  const ordered = [...findingKeys, ...remaining].slice(0, limit);

  return ordered.map((key) => {
    const metric = byKey.get(key);
    const trend = analysis.trends.find((item) => item.metric_key === key);
    return {
      key,
      name: metric?.name ?? key,
      current: formatMetricValue(trend?.current ?? null, metric?.unit ?? 'count', analysis.profile.currency),
      delta: trend?.hasComparison ? formatDelta(trend.absoluteDelta, metric?.unit ?? 'count', analysis.profile.currency) : 'Current position only',
      direction: trend?.direction ?? 'unknown',
      classification: findingKeys.includes(key) ? 'finding' : 'descriptive',
    };
  });
}