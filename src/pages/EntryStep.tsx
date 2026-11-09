import { useBrig } from '../state/BrigContext';
import type { DataQuality, MetricDefinition, MetricObservation } from '../types';
import { emptyObservation } from '../data/demo';
import { Button, SectionCard } from '../ui/components';

function toNum(raw: string): number | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

function unitHint(m: MetricDefinition): string {
  switch (m.unit) {
    case 'percent': return 'percentage (0–100)';
    case 'currency': return `currency amount`;
    case 'hours': return 'hours';
    case 'days': return 'days';
    case 'score': return 'score';
    case 'ratio': return 'ratio';
    default: return 'count';
  }
}

function MetricInputs({
  def,
  obs,
  reportingPeriod,
  comparisonPeriod,
}: {
  def: MetricDefinition;
  obs: MetricObservation;
  reportingPeriod: string;
  comparisonPeriod: string;
}) {
  const { dispatch } = useBrig();
  const patch = (p: Partial<MetricObservation>) => dispatch({ type: 'PATCH_OBSERVATION', key: def.metric_key, patch: p });
  const isPct = def.unit === 'percent';

  return (
    <div className="entry-row">
      <div className="entry-head">
        <div>
          <h3 className="entry-name">{def.name}</h3>
          <p className="entry-hint">{def.definition} · <em>{unitHint(def)}</em></p>
        </div>
        <button
          className={`toggle ${obs.applicable ? 'toggle-on' : ''}`}
          onClick={() => patch({ applicable: !obs.applicable })}
          aria-pressed={obs.applicable}
          title="Include this metric in the analysis"
        >
          {obs.applicable ? 'Included' : 'Excluded'}
        </button>
      </div>

      {obs.applicable && (
        <div className="entry-inputs">
          <label className="field">
            <span className="field-label">Current value{reportingPeriod ? ` — ${reportingPeriod}` : ''}</span>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              value={obs.current ?? ''}
              min={isPct ? 0 : undefined}
              max={isPct ? 100 : undefined}
              onChange={(e) => patch({ current: toNum(e.target.value) })}
            />
          </label>
          <label className="field">
            <span className="field-label">Comparison value{comparisonPeriod ? ` — ${comparisonPeriod}` : ''}</span>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              value={obs.previous ?? ''}
              min={isPct ? 0 : undefined}
              max={isPct ? 100 : undefined}
              onChange={(e) => patch({ previous: toNum(e.target.value) })}
            />
          </label>
          <label className="field">
            <span className="field-label">Target (optional)</span>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              value={obs.target ?? ''}
              onChange={(e) => patch({ target: toNum(e.target.value) })}
            />
          </label>
          <label className="field">
            <span className="field-label">Threshold (optional)</span>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              value={obs.threshold ?? ''}
              onChange={(e) => patch({ threshold: toNum(e.target.value) })}
            />
          </label>
          <label className="field">
            <span className="field-label">Data quality</span>
            <select className="input" value={obs.dataQuality} onChange={(e) => patch({ dataQuality: e.target.value as DataQuality })}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label className="field field-wide">
            <span className="field-label">Qualitative context / note (optional)</span>
            <textarea
              className="input"
              rows={2}
              value={obs.note}
              onChange={(e) => patch({ note: e.target.value })}
              placeholder="Any context the Board should know. Treated as untrusted text if AI is used."
            />
          </label>
        </div>
      )}
    </div>
  );
}

export function EntryStep() {
  const { state, dispatch, selectedMetrics, selectedCount, enteredCount } = useBrig();
  const { reportingPeriod, comparisonPeriod } = state.profile;
  const periodLabel = (v: string) => (v ?? '').trim() || '—';
  const periodsSet = Boolean((reportingPeriod ?? '').trim() || (comparisonPeriod ?? '').trim());

  return (
    <div className="page">
      <SectionCard
        title="Enter data"
        subtitle="Fields are generated from metric metadata. The reporting and comparison periods come from your Board profile and apply to every metric; only the metric values are entered here."
      >
        <div className="entry-periods" role="group" aria-label="Reporting periods from the Board profile">
          <label className="field">
            <span className="field-label">Reporting period</span>
            <input className="input" value={periodLabel(reportingPeriod)} readOnly aria-readonly="true" tabIndex={-1} />
          </label>
          <label className="field">
            <span className="field-label">Comparison period</span>
            <input className="input" value={periodLabel(comparisonPeriod)} readOnly aria-readonly="true" tabIndex={-1} />
          </label>
          <span className="muted small">Prefilled from your Board profile — not editable here.</span>
          <button className="link-btn" onClick={() => dispatch({ type: 'SET_STEP', step: 'profile' })}>
            {periodsSet ? 'Change in Board profile' : 'Set them in Board profile'}
          </button>
        </div>

        <p className="selected-count" aria-live="polite">
          <strong>{enteredCount}</strong> of {selectedCount} metrics have a current value.
        </p>

        <div className="entry-list">
          {selectedMetrics.map((def) => (
            <MetricInputs
              key={def.metric_key}
              def={def}
              obs={state.observations[def.metric_key] ?? emptyObservation(def.metric_key)}
              reportingPeriod={(reportingPeriod ?? '').trim()}
              comparisonPeriod={(comparisonPeriod ?? '').trim()}
            />
          ))}
          {selectedMetrics.length === 0 && <p className="empty-note">No metrics selected. Go back to select metrics.</p>}
        </div>

        <div className="form-actions">
          <Button variant="ghost" onClick={() => dispatch({ type: 'SET_STEP', step: 'select' })}>← Back</Button>
          <Button onClick={() => dispatch({ type: 'SET_STEP', step: 'review' })} disabled={enteredCount === 0}>
            Analyse &amp; review →
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
