import { useMemo, useRef, useState } from 'react';
import { useBrig } from '../state/BrigContext';
import type { DataQuality, DataStatus, MetricDefinition, MetricObservation } from '../types';
import { emptyObservation } from '../data/demo';
import { CATEGORIES } from '../data/library';
import { importObservationsCsv, observationsToCsv } from '../services/csv';
import { completenessSummary, validateObservation } from '../services/validation';
import { Button, Callout, SectionCard } from '../ui/components';

function toNum(raw: string): number | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function unitHint(m: MetricDefinition): string {
  if (m.unit === 'percent') return 'percentage (normally 0–100)';
  if (m.unit === 'currency') return 'currency amount';
  return m.unit;
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function thresholdLabel(def: MetricDefinition): string {
  if (def.directionality === 'higher_is_better') return 'Minimum acceptable value (optional)';
  if (def.directionality === 'lower_is_better') return 'Maximum acceptable value (optional)';
  return 'Tolerance threshold (optional)';
}

function parseHistory(raw: string): number[] | null {
  if (!raw.trim()) return [];
  const values = raw.split('|').map((item) => Number(item.trim()));
  return values.every(Number.isFinite) ? values : null;
}

function MetricInputs({ def, obs, reportingPeriod, comparisonPeriod }: {
  def: MetricDefinition; obs: MetricObservation; reportingPeriod: string; comparisonPeriod: string;
}) {
  const { dispatch } = useBrig();
  const patch = (p: Partial<MetricObservation>) => dispatch({ type: 'PATCH_OBSERVATION', key: def.metric_key, patch: p });
  const validation = validateObservation(def, obs);
  const available = obs.dataStatus === 'available';
  const twoSided = def.directionality === 'target_value' || def.directionality === 'target_range';
  const onStatus = (dataStatus: DataStatus) => patch({
    dataStatus,
    applicable: dataStatus !== 'not_applicable',
    ...(dataStatus !== 'available' ? {
      current: null,
      previous: null,
      history: [],
      target: null,
      threshold: null,
      lowerThreshold: null,
      upperThreshold: null,
      comparisonMissingReason: '',
    } : {}),
  });

  return <div className={`entry-row ${validation.errors.length ? 'entry-row-error' : ''}`} id={`metric-${def.metric_key}`}>
    <div className="entry-head"><div><h3 className="entry-name">{def.name}</h3><p className="entry-hint">{def.definition} · <em>{unitHint(def)}</em></p></div></div>
    <div className="entry-inputs">
      <label className="field field-wide"><span className="field-label">Data status <span className="required-label">required</span></span><select className="input" required value={obs.dataStatus} onChange={(e) => onStatus(e.target.value as DataStatus)}>
        <option value="not_set">Choose status…</option><option value="available">Available</option><option value="temporarily_unavailable">Temporarily unavailable</option><option value="not_measured">Not measured this period</option><option value="not_applicable">Not applicable</option>
      </select></label>
      {available && <>
        <label className="field"><span className="field-label">Current value{reportingPeriod ? ` — ${reportingPeriod}` : ''} <span className="required-label">required</span></span><input className="input" required type="number" inputMode="decimal" value={obs.current ?? ''} min={def.unit === 'percent' ? 0 : undefined} max={def.unit === 'percent' ? 100 : undefined} onChange={(e) => patch({ current: toNum(e.target.value) })} /></label>
        <label className="field"><span className="field-label">Comparison value{comparisonPeriod ? ` — ${comparisonPeriod}` : ''} <span className="field-purpose">recommended; affects trend</span></span><input className="input" type="number" inputMode="decimal" value={obs.previous ?? ''} min={def.unit === 'percent' ? 0 : undefined} max={def.unit === 'percent' ? 100 : undefined} onChange={(e) => patch({ previous: toNum(e.target.value), comparisonMissingReason: e.target.value ? '' : obs.comparisonMissingReason })} /></label>
        {obs.previous === null && <label className="field field-wide"><span className="field-label">Why is comparison data unavailable? <span className="required-label">required</span></span><select className="input" required value={obs.comparisonMissingReason} onChange={(e) => patch({ comparisonMissingReason: e.target.value })}><option value="">Choose reason…</option><option value="New metric">New metric</option><option value="Methodology changed">Methodology changed</option><option value="Source system changed">Source system changed</option><option value="Historical data unavailable">Historical data unavailable</option><option value="First reporting cycle">First reporting cycle</option></select></label>}
        <label className="field"><span className="field-label">Target {def.directionality === 'target_value' ? <span className="required-label">required</span> : <span className="field-purpose">optional; affects position</span>}</span><input className="input" required={def.directionality === 'target_value'} type="number" inputMode="decimal" value={obs.target ?? ''} onChange={(e) => patch({ target: toNum(e.target.value) })} /></label>
        {!twoSided && <label className="field"><span className="field-label">{thresholdLabel(def)} <span className="field-purpose">affects tolerance assessment</span></span><input className="input" type="number" inputMode="decimal" value={obs.threshold ?? ''} onChange={(e) => patch({ threshold: toNum(e.target.value) })} /></label>}
        {twoSided && <><label className="field"><span className="field-label">Lower acceptable limit <span className="required-label">required</span></span><input className="input" required type="number" inputMode="decimal" value={obs.lowerThreshold ?? ''} onChange={(e) => patch({ lowerThreshold: toNum(e.target.value) })} /></label><label className="field"><span className="field-label">Upper acceptable limit <span className="required-label">required</span></span><input className="input" required type="number" inputMode="decimal" value={obs.upperThreshold ?? ''} onChange={(e) => patch({ upperThreshold: toNum(e.target.value) })} /></label></>}
        <label className="field"><span className="field-label">Data quality <span className="required-label">required; affects confidence</span></span><select className="input" value={obs.dataQuality} onChange={(e) => patch({ dataQuality: e.target.value as DataQuality })}><option value="high">High — verified/controlled</option><option value="medium">Medium — reasonable limitations</option><option value="low">Low — material limitations</option></select></label>
        <label className="field field-wide"><span className="field-label">Operational context {def.directionality === 'context_dependent' ? <span className="required-label">required when changed</span> : <span className="field-purpose">report context; may qualify interpretation</span>}</span><textarea className="input" rows={2} value={obs.note} onChange={(e) => patch({ note: e.target.value })} /></label>
      </>}
      {obs.dataStatus !== 'not_set' && obs.dataStatus !== 'not_applicable' && <label className="field field-wide"><span className="field-label">Methodology / availability note {(obs.dataStatus !== 'available' || obs.dataQuality === 'low') && <span className="required-label">required</span>}</span><textarea className="input" rows={2} value={obs.methodologyNote ?? ''} onChange={(e) => patch({ methodologyNote: e.target.value })} /></label>}
    </div>
    {available && <details className="provenance-panel"><summary>Advanced evidence and provenance</summary><div className="entry-inputs"><label className="field field-wide"><span className="field-label">Earlier history <span className="field-purpose">optional; affects persistence and confidence</span></span><input className="input" value={obs.history.join('|')} placeholder="Oldest to newest, e.g. 80|85|90" onChange={(e) => { const history = parseHistory(e.target.value); if (history) patch({ history }); }} aria-describedby={`history-help-${def.metric_key}`} /><span className="muted small" id={`history-help-${def.metric_key}`}>Do not repeat the comparison value; separate earlier values with |.</span></label><label className="field"><span className="field-label">Benchmark <span className="field-purpose">optional report context only; does not affect findings</span></span><input className="input" type="number" inputMode="decimal" value={obs.benchmark ?? ''} onChange={(e) => patch({ benchmark: toNum(e.target.value) })} /></label><label className="field"><span className="field-label">Benchmark source {obs.benchmark !== null && <span className="required-label">required</span>}</span><input className="input" required={obs.benchmark !== null} value={obs.benchmarkSource ?? ''} onChange={(e) => patch({ benchmarkSource: e.target.value })} /></label><label className="field"><span className="field-label">Source system <span className="field-purpose">affects confidence and appendix</span></span><input className="input" value={obs.sourceSystem ?? ''} onChange={(e) => patch({ sourceSystem: e.target.value })} /></label><label className="field"><span className="field-label">Reporting owner <span className="field-purpose">affects confidence and appendix</span></span><input className="input" value={obs.reportingOwner ?? ''} onChange={(e) => patch({ reportingOwner: e.target.value })} /></label><label className="field"><span className="field-label">Extraction date <span className="field-purpose">affects confidence and appendix</span></span><input className="input" type="date" value={obs.extractionDate ?? ''} onChange={(e) => patch({ extractionDate: e.target.value })} /></label></div></details>}
    {(validation.errors.length > 0 || validation.warnings.length > 0) && <ul className="validation-list">{validation.errors.map((message) => <li className="validation-error" key={`e-${message}`}>{message}</li>)}{validation.warnings.map((message) => <li key={`w-${message}`}>{message}</li>)}</ul>}
  </div>;
}

export function EntryStep() {
  const { state, dispatch, selectedMetrics, selectedCount, enteredCount, library } = useBrig();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'incomplete' | 'warnings'>('all');
  const [importMessage, setImportMessage] = useState<{ tone: 'info' | 'warn'; text: string } | null>(null);
  const [provenance, setProvenance] = useState({ sourceSystem: '', reportingOwner: '', extractionDate: '', methodologyNote: '' });
  const fileInput = useRef<HTMLInputElement>(null);
  const summary = useMemo(() => completenessSummary(state.selectedKeys, state.observations, selectedMetrics), [state.selectedKeys, state.observations, selectedMetrics]);
  const reportingPeriod = state.profile.reportingPeriod.trim();
  const comparisonPeriod = state.profile.comparisonPeriod.trim();
  const needsComparisonLabel = state.selectedKeys.some((key) => state.observations[key]?.previous !== null && state.observations[key]?.previous !== undefined);
  const blockingIssueCount = summary.errors.length + (needsComparisonLabel && !comparisonPeriod ? 1 : 0);
  const visible = selectedMetrics.filter((def) => {
    const obs = state.observations[def.metric_key] ?? emptyObservation(def.metric_key);
    const matches = `${def.name} ${def.metric_key}`.toLowerCase().includes(search.toLowerCase());
    if (!matches) return false;
    const validation = validateObservation(def, obs);
    if (filter === 'incomplete') return validation.errors.length > 0;
    if (filter === 'warnings') return validation.warnings.length > 0 || validation.errors.length > 0;
    return true;
  });
  const groups = CATEGORIES.map((category) => ({ category, metrics: visible.filter((metric) => metric.category === category.key) })).filter((group) => group.metrics.length > 0);
  const onImport = async (file?: File) => {
    if (!file) return;
    const imported = importObservationsCsv(await file.text(), library);
    if (imported.imported > 0) dispatch({ type: 'IMPORT_OBSERVATIONS', keys: imported.selectedKeys, observations: imported.observations });
    setImportMessage({ tone: imported.errors.length ? 'warn' : 'info', text: `Imported ${imported.imported} metric(s).${imported.errors.length ? ` ${imported.errors.join(' ')}` : ''}` });
    if (fileInput.current) fileInput.current.value = '';
  };

  return <div className="page"><SectionCard title="Enter metric data" subtitle="Fields marked required are necessary for deterministic analysis. Optional fields state whether they affect analytical position, confidence, or report presentation.">
    <Callout tone="info" title="Evidence rules"><p>An available metric needs a current value. To become a positive or concern finding it also needs comparison, target, tolerance or supported cross-metric evidence. A current value by itself remains a descriptive KPI.</p></Callout>
    <div className="data-tools"><Button variant="secondary" onClick={() => downloadText('BRIG_metric_template.csv', observationsToCsv(selectedMetrics, {}))}>Download CSV template</Button><Button variant="secondary" onClick={() => downloadText('BRIG_metric_data.csv', observationsToCsv(selectedMetrics, state.observations))}>Export current data</Button><Button variant="secondary" onClick={() => fileInput.current?.click()}>Import CSV</Button><input ref={fileInput} className="visually-hidden" type="file" accept=".csv,text/csv" onChange={(e) => void onImport(e.target.files?.[0])} /></div>
    {importMessage && <Callout tone={importMessage.tone}>{importMessage.text}</Callout>}
    <details className="bulk-provenance"><summary>Apply common provenance to all selected metrics <span className="field-purpose">affects confidence and appendix</span></summary><div className="form-grid"><label className="field"><span className="field-label">Source system</span><input className="input" value={provenance.sourceSystem} onChange={(e) => setProvenance({ ...provenance, sourceSystem: e.target.value })} /></label><label className="field"><span className="field-label">Reporting owner</span><input className="input" value={provenance.reportingOwner} onChange={(e) => setProvenance({ ...provenance, reportingOwner: e.target.value })} /></label><label className="field"><span className="field-label">Extraction date</span><input className="input" type="date" value={provenance.extractionDate} onChange={(e) => setProvenance({ ...provenance, extractionDate: e.target.value })} /></label><label className="field field-wide"><span className="field-label">Methodology note</span><textarea className="input" rows={2} value={provenance.methodologyNote} onChange={(e) => setProvenance({ ...provenance, methodologyNote: e.target.value })} /></label></div><Button variant="secondary" onClick={() => dispatch({ type: 'APPLY_PROVENANCE', patch: { ...provenance, provenanceConfidence: 'medium' } })}>Apply to selected metrics</Button></details>
    <div className="completeness-grid" aria-label="Data completeness summary"><span><strong>{summary.analysed}</strong> analysed</span><span><strong>{summary.errors.length}</strong> required fixes</span><span><strong>{summary.missingComparison}</strong> no comparison</span><span><strong>{summary.unavailable}</strong> unavailable</span><span><strong>{summary.notApplicable}</strong> not applicable</span><span><strong>{summary.withReferences}</strong> with analytical reference</span></div>
    <div className="entry-filterbar"><input className="input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter selected metrics…" aria-label="Filter selected metrics" /><select className="input" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Filter entry status"><option value="all">All selected</option><option value="incomplete">Required fixes only</option><option value="warnings">Warnings and fixes</option></select><span className="selected-count" aria-live="polite"><strong>{enteredCount}</strong> of {selectedCount} have a current value.</span></div>
    <div className="entry-list">{groups.map(({ category, metrics }) => <details className="entry-category" open key={category.key}><summary>{category.letter}. {category.label} <span className="cat-count">{metrics.length}</span></summary>{metrics.map((def) => <MetricInputs key={def.metric_key} def={def} obs={state.observations[def.metric_key] ?? emptyObservation(def.metric_key)} reportingPeriod={reportingPeriod} comparisonPeriod={comparisonPeriod} />)}</details>)}{visible.length === 0 && <p className="empty-note">No selected metrics match this filter.</p>}</div>
    {needsComparisonLabel && !comparisonPeriod && <Callout tone="danger" title="Comparison-period label required"><p>Return to the Board profile and label the comparison period because one or more comparison values were supplied.</p></Callout>}
    {summary.errors.length > 0 && <Callout tone="danger" title={`${summary.errors.length} required field issue(s) must be resolved`}><p>Analysis is blocked so the engine does not infer meaning from incomplete analytical inputs.</p><ul className="validation-summary-list">{summary.errors.slice(0, 12).map((issue, index) => { const metric = selectedMetrics.find((item) => item.metric_key === issue.metricKey); return <li key={`${issue.metricKey}-${index}`}><a href={`#metric-${issue.metricKey}`}>{metric?.name ?? issue.metricKey}</a>: {issue.message}</li>; })}</ul>{summary.errors.length > 12 && <p className="small">Use “Required fixes only” to review the remaining issues.</p>}</Callout>}
    {summary.errors.length === 0 && summary.warnings.length > 0 && <Callout tone="warn" title={`${summary.warnings.length} analytical limitation(s)`}><p>These do not block analysis, but the report will state the resulting limits.</p></Callout>}
    <div className="form-actions"><Button variant="ghost" onClick={() => dispatch({ type: 'SET_STEP', step: 'select' })}>← Back</Button><Button onClick={() => dispatch({ type: 'SET_STEP', step: 'review' })} disabled={enteredCount === 0 || blockingIssueCount > 0}>Analyse &amp; review →</Button></div>
  </SectionCard></div>;
}