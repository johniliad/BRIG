import type { DataQuality, DataStatus, MetricDefinition, MetricObservation } from '../types';
import { emptyObservation } from '../data/demo';

export const CSV_HEADERS = [
  'metric_key', 'metric_name', 'data_status', 'current_value', 'comparison_value', 'comparison_missing_reason',
  'earlier_history', 'target', 'threshold', 'lower_acceptable_limit', 'upper_acceptable_limit', 'data_quality',
  'benchmark', 'benchmark_source',
  'source_system', 'reporting_owner', 'extraction_date', 'methodology_note', 'note',
] as const;

function quote(value: unknown): string {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function observationsToCsv(metrics: MetricDefinition[], observations: Record<string, MetricObservation>): string {
  const rows = metrics.map((metric) => {
    const o = observations[metric.metric_key] ?? emptyObservation(metric.metric_key);
    return [
      metric.metric_key, metric.name, o.dataStatus, o.current ?? '', o.previous ?? '', o.comparisonMissingReason, o.history.join('|'),
      o.target ?? '', o.threshold ?? '', o.lowerThreshold ?? '', o.upperThreshold ?? '', o.dataQuality,
      o.benchmark ?? '', o.benchmarkSource ?? '',
      o.sourceSystem ?? '', o.reportingOwner ?? '', o.extractionDate ?? '', o.methodologyNote ?? '', o.note,
    ].map(quote).join(',');
  });
  return [CSV_HEADERS.join(','), ...rows].join('\r\n');
}

function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  row.push(cell.replace(/\r$/, ''));
  if (row.some((v) => v !== '')) rows.push(row);
  return rows;
}

const num = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
};

export interface CsvImportResult {
  observations: Record<string, MetricObservation>;
  selectedKeys: string[];
  errors: string[];
  imported: number;
}

export function importObservationsCsv(text: string, library: MetricDefinition[]): CsvImportResult {
  const rows = parseRows(text);
  if (rows.length === 0) return { observations: {}, selectedKeys: [], errors: ['The CSV is empty.'], imported: 0 };
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const indexes = new Map(headers.map((h, i) => [h, i]));
  if (!indexes.has('metric_key')) return { observations: {}, selectedKeys: [], errors: ['CSV must contain metric_key.'], imported: 0 };
  const byKey = new Map(library.map((m) => [m.metric_key, m]));
  const observations: Record<string, MetricObservation> = {};
  const selectedKeys: string[] = [];
  const errors: string[] = [];
  const value = (row: string[], key: string) => row[indexes.get(key) ?? -1] ?? '';
  rows.slice(1).forEach((row, offset) => {
    const line = offset + 2;
    const key = value(row, 'metric_key').trim();
    if (!key) return;
    if (!byKey.has(key)) { errors.push(`Line ${line}: unknown metric_key “${key}”.`); return; }
    if (observations[key]) { errors.push(`Line ${line}: duplicate metric_key “${key}”.`); return; }
    const statusRaw = value(row, 'data_status').trim().toLowerCase();
    const dataStatus = (statusRaw || (value(row, 'current_value').trim() ? 'available' : 'not_set')) as DataStatus;
    if (!['not_set', 'available', 'temporarily_unavailable', 'not_measured', 'not_applicable'].includes(dataStatus)) {
      errors.push(`Line ${line}: data_status is invalid.`); return;
    }
    const quality = value(row, 'data_quality').trim().toLowerCase();
    if (quality && !['high', 'medium', 'low'].includes(quality)) {
      errors.push(`Line ${line}: data_quality must be high, medium or low.`);
      return;
    }
    for (const field of ['current_value', 'comparison_value', 'target', 'threshold', 'lower_acceptable_limit', 'upper_acceptable_limit', 'benchmark']) {
      const raw = value(row, field);
      if (raw.trim() && num(raw) === null) { errors.push(`Line ${line}: ${field} is not numeric.`); return; }
    }
    observations[key] = {
      ...emptyObservation(key),
      dataStatus,
      applicable: dataStatus !== 'not_applicable',
      current: num(value(row, 'current_value')),
      previous: num(value(row, 'comparison_value')),
      history: value(row, 'earlier_history').trim()
        ? value(row, 'earlier_history').split('|').map((item) => Number(item.trim())).filter(Number.isFinite)
        : [],
      comparisonMissingReason: value(row, 'comparison_missing_reason').trim(),
      target: num(value(row, 'target')),
      threshold: num(value(row, 'threshold')),
      lowerThreshold: num(value(row, 'lower_acceptable_limit')),
      upperThreshold: num(value(row, 'upper_acceptable_limit')),
      benchmark: num(value(row, 'benchmark')),
      benchmarkSource: value(row, 'benchmark_source').trim(),
      dataQuality: (quality || 'medium') as DataQuality,
      sourceSystem: value(row, 'source_system').trim(),
      reportingOwner: value(row, 'reporting_owner').trim(),
      extractionDate: value(row, 'extraction_date').trim(),
      methodologyNote: value(row, 'methodology_note').trim(),
      note: value(row, 'note').trim(),
    };
    selectedKeys.push(key);
  });
  return { observations, selectedKeys, errors, imported: selectedKeys.length };
}