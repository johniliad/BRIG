import { afterEach, describe, expect, it } from 'vitest';
import { METRICS } from '../src/data/library';
import { demoObservations, emptyObservation } from '../src/data/demo';
import { importObservationsCsv, observationsToCsv } from '../src/services/csv';
import { clearDraft, loadDraft, saveDraft } from '../src/services/draft';
import { reportFilename } from '../src/services/formatters';
import { completenessSummary } from '../src/services/validation';
import { analyze } from '../src/engine/analyze';
import { DEFAULT_PROFILE } from '../src/data/demo';
import { buildBoardReportModel } from '../src/engine/report';
import { normalizeSavedReport } from '../src/services/report-normalization';
import type { AnalysisResult } from '../src/types';

function installStorage() {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
      removeItem: (key: string) => data.delete(key),
    },
  });
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'localStorage');
});

describe('CSV workflow', () => {
  it('round-trips observations and provenance', () => {
    const metric = METRICS[0];
    const observation = {
      ...emptyObservation(metric.metric_key), dataStatus: 'available' as const, current: 92, previous: 88, sourceSystem: 'GRC, system',
      history: [80, 84], benchmark: 95, benchmarkSource: 'Approved internal standard',
      reportingOwner: 'Security Assurance', extractionDate: '2026-11-01', methodologyNote: 'Monthly extract',
    };
    const csv = observationsToCsv([metric], { [metric.metric_key]: observation });
    const result = importObservationsCsv(csv, METRICS);
    expect(result.errors).toEqual([]);
    expect(result.imported).toBe(1);
    expect(result.observations[metric.metric_key]).toMatchObject(observation);
  });

  it('rejects unknown metrics and invalid numeric values', () => {
    const csv = 'metric_key,current_value\nunknown_metric,10\n' + `${METRICS[0].metric_key},not-a-number\n`;
    const result = importObservationsCsv(csv, METRICS);
    expect(result.imported).toBe(0);
    expect(result.errors).toHaveLength(2);
  });

  it('rejects duplicate metric keys rather than overwriting data', () => {
    const key = METRICS[0].metric_key;
    const result = importObservationsCsv(`metric_key,data_status,current_value\n${key},available,10\n${key},available,20\n`, METRICS);
    expect(result.imported).toBe(1);
    expect(result.errors[0]).toContain('duplicate metric_key');
    expect(result.observations[key].current).toBe(10);
  });
});

describe('draft and report workflow', () => {
  it('keeps the complete fictional demo review-ready', () => {
    const rows = demoObservations();
    const observations = Object.fromEntries(rows.map((observation) => [observation.metric_key, observation]));
    const summary = completenessSummary(rows.map((observation) => observation.metric_key), observations, METRICS);
    expect(summary.analysed).toBe(rows.length);
    expect(summary.errors).toEqual([]);
  });

  it('saves, restores and clears a versioned local draft', () => {
    installStorage();
    const key = METRICS[0].metric_key;
    const savedAt = saveDraft({ profile: DEFAULT_PROFILE, selectedKeys: [key], observations: { [key]: emptyObservation(key) }, privacyMode: 'deterministic', demoActive: false });
    expect(savedAt).toBeTruthy();
    expect(loadDraft()?.selectedKeys).toEqual([key]);
    clearDraft();
    expect(loadDraft()).toBeNull();
  });

  it('uses deterministic professional export filenames', () => {
    expect(reportFilename({ ...DEFAULT_PROFILE, reportingPeriod: '2026 Q3' }, 'pdf')).toBe('CISO_Board_Report_2026-q3.pdf');
  });

  it('retains provenance in the analysis and BoardReportModel but not the AI facts boundary', () => {
    const metric = METRICS[0];
    const observation = { ...emptyObservation(metric.metric_key), dataStatus: 'available' as const, current: 10, comparisonMissingReason: 'New metric', sourceSystem: 'GRC', reportingOwner: 'CISO', extractionDate: '2026-11-01' };
    const analysis = analyze({ profile: DEFAULT_PROFILE, observations: [observation], library: METRICS });
    const model = buildBoardReportModel(analysis, 'deterministic');
    expect(model.provenance[0]).toMatchObject({ sourceSystem: 'GRC', reportingOwner: 'CISO' });
    expect(analysis.facts).not.toHaveProperty('provenance');
    expect(model).toMatchObject({ schema_version: 2, application_version: '1.1.2' });
  });

  it('normalizes compatible older saved reports and rejects future schemas', () => {
    const metric = METRICS[0];
    const analysis = analyze({ profile: DEFAULT_PROFILE, observations: [{ ...emptyObservation(metric.metric_key), dataStatus: 'available', current: 10, comparisonMissingReason: 'New metric' }], library: METRICS });
    const legacy = structuredClone(analysis) as AnalysisResult;
    delete (legacy.metadata as Partial<typeof legacy.metadata>).schema_version;
    delete (legacy.metadata as Partial<typeof legacy.metadata>).application_version;
    expect(normalizeSavedReport(legacy)?.metadata.schema_version).toBe(1);
    const future = structuredClone(analysis);
    future.metadata.schema_version = 999;
    expect(normalizeSavedReport(future)).toBeNull();
  });

  it('summarises completeness and warnings', () => {
    const metric = METRICS.find((m) => m.unit === 'percent') ?? METRICS[0];
    const observation = { ...emptyObservation(metric.metric_key), dataStatus: 'available' as const, current: 150, comparisonMissingReason: 'New metric', dataQuality: 'low' as const };
    const summary = completenessSummary([metric.metric_key], { [metric.metric_key]: observation }, METRICS);
    expect(summary.analysed).toBe(1);
    expect(summary.lowQuality).toBe(1);
    expect(summary.errors.length).toBeGreaterThan(0);
    expect(summary.warnings.length).toBeGreaterThan(0);
  });
});